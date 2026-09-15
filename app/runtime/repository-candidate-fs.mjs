import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const HELPER = path.join(MODULE_DIR, "repository-candidate-fs-helper.py");
const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const MAX_ERROR_BYTES = 8 * 1024;

export class RepositoryCandidateFsError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RepositoryCandidateFsError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new RepositoryCandidateFsError(code, message);
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

/** Calls one fixed standard-library helper. The caller builds the request
 * from Host-held candidate identity; model text is never a command or root. */
export async function runRepositoryCandidateFs(request, { signal, timeoutMs = 10_000 } = {}) {
  if (signal?.aborted) fail("cancelled", "candidate operation was cancelled");
  const serialized = `${JSON.stringify(request)}\n`;
  if (Buffer.byteLength(serialized, "utf8") > MAX_REQUEST_BYTES) fail("request_too_large", "candidate request exceeds the Host limit");
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
    let killTimer;
    const timeout = setTimeout(() => { timedOut = true; stopChild(); }, timeoutMs);

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
      const code = error?.code === "ENOENT" ? "python_unavailable" : "candidate_unavailable";
      finish(new RepositoryCandidateFsError(code, code === "python_unavailable"
        ? "repository candidate operations require the configured Python 3 runtime"
        : "candidate helper could not start"));
    });
    child.once("close", code => {
      if (tooLarge) return finish(new RepositoryCandidateFsError("result_too_large", "candidate result exceeded the Host limit"));
      if (aborting || signal?.aborted) return finish(new RepositoryCandidateFsError("cancelled", "candidate operation was cancelled"));
      if (timedOut) return finish(new RepositoryCandidateFsError("operation_timeout", "candidate operation exceeded its time limit"));
      if (code !== 0 && !stdout.length) return finish(new RepositoryCandidateFsError("candidate_unavailable", "candidate helper failed"));
      let response;
      try { response = JSON.parse(stdout.toString("utf8")); }
      catch { return finish(new RepositoryCandidateFsError("invalid_helper_response", stderr ? "candidate helper returned an invalid response" : "candidate helper returned an invalid response")); }
      if (response?.ok !== true) {
        const item = response?.error;
        return finish(new RepositoryCandidateFsError(typeof item?.code === "string" ? item.code : "candidate_unavailable",
          typeof item?.message === "string" ? item.message : "candidate operation failed"));
      }
      finish(null, response.result);
    });
    child.stdin.on("error", () => { /* close reports the authoritative outcome */ });
    child.stdin.end(serialized);
  });
}
