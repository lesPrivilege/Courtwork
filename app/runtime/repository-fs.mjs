import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const HELPER = path.join(MODULE_DIR, "repository-fs-helper.py");
const MAX_OUTPUT_BYTES = 12 * 1024 * 1024;
const MAX_ERROR_BYTES = 8 * 1024;

export class RepositoryFsError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RepositoryFsError";
    this.code = code;
  }
}

function safeEnv() {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    PYTHONNOUSERSITE: "1",
    PYTHONHASHSEED: "0",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
  };
}

/** Calls one fixed standard-library helper. No model argument is used as a
 * command, cwd, environment key, or filesystem root. The helper accepts only
 * a JSON operation and walks descendants relative to O_NOFOLLOW directory fds. */
export async function runRepositoryFs(request, { signal, timeoutMs = 10_000 } = {}) {
  if (signal?.aborted) throw new RepositoryFsError("cancelled", "repository operation was cancelled");
  const python = process.env.WORK_AGENT_PYTHON ?? "python3";
  const child = spawn(python, [HELPER], {
    cwd: MODULE_DIR,
    env: safeEnv(),
    shell: false,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return await new Promise((resolve, reject) => {
    let stdout = Buffer.alloc(0);
    let stderr = "";
    let settled = false;
    let aborting = false;
    let timedOut = false;
    let tooLarge = false;
    let killTimer = null;
    const timeout = setTimeout(() => {
      timedOut = true;
      stopChild();
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeout);
      if (killTimer) clearTimeout(killTimer);
      signal?.removeEventListener("abort", abort);
    };
    const stopChild = () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      try { child.kill("SIGTERM"); } catch { /* child already closed */ }
      killTimer ??= setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          try { child.kill("SIGKILL"); } catch { /* child already closed */ }
        }
      }, 300);
      killTimer.unref?.();
    };
    const abort = () => { aborting = true; stopChild(); };
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      error ? reject(error) : resolve(value);
    };

    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    child.stdout.on("data", chunk => {
      if (stdout.length + chunk.length > MAX_OUTPUT_BYTES) {
        tooLarge = true;
        stopChild();
        return;
      }
      stdout = Buffer.concat([stdout, chunk]);
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", chunk => { stderr = (stderr + chunk).slice(-MAX_ERROR_BYTES); });
    child.once("error", error => {
      const code = error?.code === "ENOENT" ? "python_unavailable" : "repository_unavailable";
      finish(new RepositoryFsError(code, code === "python_unavailable" ? "repository reads require the configured Python 3 runtime" : "repository helper could not start"));
    });
    child.once("close", (code) => {
      if (tooLarge) return finish(new RepositoryFsError("result_too_large", "repository result exceeded the host limit"));
      if (aborting || signal?.aborted) return finish(new RepositoryFsError("cancelled", "repository operation was cancelled"));
      if (timedOut) return finish(new RepositoryFsError("operation_timeout", "repository operation exceeded its time limit"));
      if (code !== 0 && !stdout.length) return finish(new RepositoryFsError("repository_unavailable", "repository operation failed"));
      let response;
      try { response = JSON.parse(stdout.toString("utf8")); }
      catch { return finish(new RepositoryFsError("invalid_helper_response", stderr ? "repository helper returned an invalid response" : "repository helper returned an invalid response")); }
      if (response?.ok !== true) {
        const item = response?.error;
        return finish(new RepositoryFsError(typeof item?.code === "string" ? item.code : "repository_unavailable", typeof item?.message === "string" ? item.message : "repository operation failed"));
      }
      finish(null, response.result);
    });
    child.stdin.on("error", () => { /* close reports the authoritative outcome */ });
    child.stdin.end(JSON.stringify(request) + "\n");
  });
}

export async function inspectRepositoryRoot(rootPath, options = {}) {
  return await runRepositoryFs({ operation: "bind", rootPath }, options);
}
