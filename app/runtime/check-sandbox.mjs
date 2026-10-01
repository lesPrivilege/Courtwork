// Execution identity of a check (RD-009 check containment). A check runs
// model-written candidate code, so its process is confined by an OS sandbox
// from @anthropic-ai/sandbox-runtime (macOS Seatbelt through
// /usr/bin/sandbox-exec, Linux bubblewrap), with the policy fixed here:
// read everything except the user's home and the Host data directory, minus
// the candidate being checked, the check's own temporary directory, the Node
// installation and, on Linux, the directory of the library's seccomp helper;
// write only that temporary directory; no network; no
// Apple Events or Launch Services. There is no unsandboxed fallback: when the
// mechanism is missing or does not start, this throws `sandbox_unavailable`
// and the runner starts no child.
//
// Only the library's per-call wrapper is used. SandboxManager.initialize()
// is never called, because it starts the library's network proxy (and socat
// bridges on Linux) even when no domain is allowed; without it no proxy port
// exists, so the generated policy has no network allowance at all.
import { SandboxManager } from "@anthropic-ai/sandbox-runtime";
import { getApplySeccompBinaryPath } from "@anthropic-ai/sandbox-runtime/dist/sandbox/generate-seccomp-filter.js";
import { spawn } from "node:child_process";
import { accessSync, constants, realpathSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

// The binary whose absence alone makes the mechanism unavailable. The library
// runs /usr/bin/sandbox-exec by absolute path and does not check for it; it
// looks bubblewrap up on PATH and checks for it (with socat and ripgrep) in
// checkDependencies(). Tests inject a missing path here, like `gitBinary`.
const PLATFORM_BINARY = { darwin: "/usr/bin/sandbox-exec", linux: "bwrap" }[process.platform] ?? null;
const PREFLIGHT_TIMEOUT_MS = 10000;

function unavailable(reason) {
  const error = new Error("check sandbox unavailable: " + reason);
  error.code = "sandbox_unavailable";
  return error;
}

// Every interpolated value is Host-produced (a recipe constant or a Host
// path); single quotes make each one a single literal word for /bin/sh.
const shellWord = value => `'${String(value).replaceAll("'", `'"'"'`)}'`;

function executable(file) {
  const candidates = path.isAbsolute(file)
    ? [file]
    : (process.env.PATH ?? "").split(path.delimiter).filter(Boolean).map(dir => path.join(dir, file));
  return candidates.some(candidate => { try { accessSync(candidate, constants.X_OK); return true; } catch { return false; } });
}

function hostPath(value, what) {
  let resolved;
  try { resolved = realpathSync(value); } catch { throw unavailable(`${what} cannot be resolved`); }
  // The library reads *, ?, [ and ] in a path as a glob.
  if (/[*?[\]]/.test(resolved)) throw unavailable(`${what} contains a glob character`);
  return resolved;
}

const encloses = (outer, inner) => {
  const relative = path.relative(outer, inner);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

// On Linux the library starts the command through its bundled apply-seccomp
// binary inside bubblewrap, by the path this same lookup returns, and binds
// nothing for it (linux-sandbox-utils.js, resolveApplySeccompPrefix). An
// install under the home directory is hidden by the home deny, so the
// directory that holds that one binary is re-allowed, read-only like the Node
// installation. Seatbelt runs no helper.
function seccompHelperDir(platform) {
  if (platform !== "linux") return [];
  const helper = getApplySeccompBinaryPath();
  if (!helper) throw unavailable("the seccomp helper was not found");
  return [hostPath(path.dirname(helper), "seccomp helper directory")];
}

/** The fixed policy for one check. `platform` is a parameter so the Linux policy can be asserted on another Host. */
export function checkSandboxPolicy({ cwd, tempDir, dataDir, nodePrefix }, platform = process.platform) {
  const home = hostPath(homedir(), "home directory");
  const allowRead = [cwd, tempDir, nodePrefix, ...seccompHelperDir(platform)];
  // A re-allowed path wins over a denied one, so none may cover what R1 denies.
  for (const allowed of allowRead) {
    if (encloses(allowed, home) || encloses(allowed, dataDir)) throw unavailable(`${allowed} would re-open the home or data directory`);
  }
  return {
    network: { allowedDomains: [], deniedDomains: [] },
    filesystem: {
      denyRead: [home, dataDir],
      allowRead,
      allowWrite: [tempDir],
      // The library always adds /tmp/claude to the writable set; take it back.
      denyWrite: ["/tmp/claude", "/private/tmp/claude"],
    },
  };
}

async function wrap(command, config) {
  try { return await SandboxManager.wrapWithSandbox(command, "/bin/sh", config); }
  catch (error) { throw unavailable(error.message); }
}

// Run `exit 0` under the same policy before any recipe code. A profile the
// kernel rejects (sandbox-exec exit 65/71) or a bubblewrap that cannot create
// its namespaces would otherwise look like an ordinary failing check.
async function preflight(config, cwd, env) {
  const wrapped = await wrap("exit 0", config);
  try {
    const { code, stderr } = await new Promise(resolve => {
      let stderr = "";
      const child = spawn("/bin/sh", ["-c", wrapped], { cwd, env, shell: false, detached: true, stdio: ["ignore", "ignore", "pipe"] });
      const timer = setTimeout(() => { try { process.kill(-child.pid, "SIGKILL"); } catch { /* gone */ } }, PREFLIGHT_TIMEOUT_MS);
      child.stderr.on("data", chunk => { stderr += chunk; });
      child.on("error", error => { clearTimeout(timer); resolve({ code: null, stderr: error.message }); });
      child.on("close", code => { clearTimeout(timer); resolve({ code, stderr }); });
    });
    if (code !== 0) throw unavailable(`sandbox did not start (exit ${code}): ${stderr.trim().slice(0, 500)}`);
  } finally {
    SandboxManager.cleanupAfterCommand();
  }
}

/**
 * Turn a recipe command into the sandboxed spawn description, or throw
 * `sandbox_unavailable`. `release()` must be called once the spawned process
 * has closed (it removes Linux bubblewrap mount points; no-op on macOS).
 */
export async function prepareCheckSandbox({
  command, argv, cwd, tempDir, dataDir, env,
  nodePrefix = path.dirname(path.dirname(realpathSync(process.execPath))),
  platformBinary = PLATFORM_BINARY,
} = {}) {
  if (!platformBinary || !SandboxManager.isSupportedPlatform()) throw unavailable(`platform ${process.platform} is not supported`);
  if (!executable(platformBinary)) throw unavailable(`${platformBinary} is not available`);
  const { errors } = SandboxManager.checkDependencies();
  if (errors.length) throw unavailable(errors.join("; "));
  if (typeof dataDir !== "string" || !dataDir) throw unavailable("the Host data directory was not provided");
  const paths = {
    cwd: hostPath(cwd, "check directory"),
    tempDir: hostPath(tempDir, "check temporary directory"),
    dataDir: hostPath(dataDir, "Host data directory"),
    nodePrefix: hostPath(nodePrefix, "Node installation"),
  };
  const config = checkSandboxPolicy(paths);
  await preflight(config, paths.cwd, env);
  const inner = `HOME=${shellWord(paths.tempDir)} TMPDIR=${shellWord(paths.tempDir)} exec ${[command, ...argv].map(shellWord).join(" ")}`;
  const wrapped = await wrap(inner, config);
  let released = false;
  return {
    command: "/bin/sh",
    argv: ["-c", wrapped],
    release() { if (!released) { released = true; SandboxManager.cleanupAfterCommand(); } },
  };
}
