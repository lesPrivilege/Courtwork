// A live, read-only Git fact for the Connect UI strip (RD-006: unknown Git
// state is shown as unknown, never guessed as "main"). This is deliberately
// separate from the security-hardened repository-fs helper: it never grants
// tool access and is not persisted. `git` is spawned directly with a fixed
// argv, shell:false and a minimal environment -- no hooks, no user-controlled
// arguments beyond the working directory.
import { spawn } from "node:child_process";

const GIT_BINARY = "/usr/bin/git";
const DEFAULT_TIMEOUT_MS = 5000;
const MAX_OUTPUT_BYTES = 4096;

function safeEnv() {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: process.env.HOME ?? "",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
  };
}

function runGit(args, cwd, timeoutMs) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(GIT_BINARY, args, { cwd, env: safeEnv(), shell: false, stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      resolve(null);
      return;
    }
    let stdout = "";
    let settled = false;
    let killTimer = null;
    const timeout = setTimeout(() => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      try { child.kill("SIGTERM"); } catch { /* already exited */ }
      killTimer = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          try { child.kill("SIGKILL"); } catch { /* already exited */ }
        }
      }, 300);
      killTimer.unref?.();
    }, timeoutMs);
    timeout.unref?.();
    const finish = (fn) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (killTimer) clearTimeout(killTimer);
      fn();
    };
    child.stdout.on("data", (chunk) => {
      if (stdout.length < MAX_OUTPUT_BYTES) stdout += chunk.toString("utf8");
    });
    child.on("error", () => finish(() => resolve(null)));
    child.on("close", (code) => finish(() => resolve(code === 0 ? stdout.trim() : null)));
  });
}

/**
 * Reads the Git branch/HEAD of `rootPath` with two bounded `git rev-parse`
 * calls. Returns null when the directory is not a Git repository or has no
 * commits yet (rev-parse HEAD fails in both cases) -- never throws.
 */
export async function inspectRepositoryGitStatus(rootPath, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const [branchRaw, head] = await Promise.all([
    runGit(["rev-parse", "--abbrev-ref", "HEAD"], rootPath, timeoutMs),
    runGit(["rev-parse", "HEAD"], rootPath, timeoutMs),
  ]);
  if (head === null) return null;
  const detached = branchRaw === null || branchRaw === "HEAD";
  return { branch: detached ? null : branchRaw, head, detached };
}
