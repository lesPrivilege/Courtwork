// DF-04 check recipe runner (RD-009). Spawns a Host-owned recipe as a normal
// child process with the Host user's own rights -- this is not a sandbox.
// `shell:false` and a minimal, explicit environment keep the child from
// inheriting provider credentials or ambient NODE_OPTIONS/PYTHONPATH.
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const KILL_GRACE_MS = 500;

function killGroup(pid, signal) {
  // The child is spawned detached, so its pid is also its process group id;
  // signalling -pid reaches the whole group (any children it spawned too).
  try { process.kill(-pid, signal); } catch { /* already gone */ }
}

/**
 * Run one check recipe to completion and report exactly what happened. Never
 * throws for a non-zero exit -- that is a normal check outcome, not a Host
 * failure. Throws (error.code === "spawn_failed") only when the child process
 * itself could not be started.
 */
export async function runCheckRecipe({ recipe, cwd, signal, onOutput } = {}) {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const homeDir = await mkdtemp(path.join(tmpdir(), "cw-check-home-"));
  try {
    const env = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: homeDir, LANG: "C" };
    return await new Promise((resolve, reject) => {
      let child;
      try {
        child = spawn(recipe.command, recipe.argv, {
          cwd, shell: false, detached: true, stdio: ["ignore", "pipe", "pipe"], env,
        });
      } catch (error) {
        const failure = new Error("check recipe failed to start: " + error.message);
        failure.code = "spawn_failed";
        reject(failure);
        return;
      }

      let settled = false;
      let timedOut = false;
      let cancelled = false;
      let terminating = false;
      let killTimer = null;
      const outputLimit = recipe.outputLimitBytes;

      const stdoutChunks = [];
      let stdoutBytes = 0;
      let stdoutTruncated = false;
      const stderrChunks = [];
      let stderrBytes = 0;
      let stderrTruncated = false;

      function collect(stream, chunks, name) {
        stream.on("data", chunk => {
          onOutput?.({ stream: name, bytes: chunk.length });
          const bytesSoFar = name === "stdout" ? stdoutBytes : stderrBytes;
          if (bytesSoFar >= outputLimit) {
            if (name === "stdout") stdoutTruncated = true; else stderrTruncated = true;
            return;
          }
          const remaining = outputLimit - bytesSoFar;
          if (chunk.length > remaining) {
            chunks.push(chunk.subarray(0, remaining));
            if (name === "stdout") { stdoutBytes += remaining; stdoutTruncated = true; }
            else { stderrBytes += remaining; stderrTruncated = true; }
          } else {
            chunks.push(chunk);
            if (name === "stdout") stdoutBytes += chunk.length; else stderrBytes += chunk.length;
          }
        });
      }
      collect(child.stdout, stdoutChunks, "stdout");
      collect(child.stderr, stderrChunks, "stderr");

      function terminate() {
        if (terminating) return;
        terminating = true;
        killGroup(child.pid, "SIGTERM");
        killTimer = setTimeout(() => killGroup(child.pid, "SIGKILL"), KILL_GRACE_MS);
      }

      const timeoutTimer = setTimeout(() => { timedOut = true; terminate(); }, recipe.timeoutMs);

      const onAbort = () => { cancelled = true; terminate(); };
      if (signal) {
        if (signal.aborted) onAbort();
        else signal.addEventListener("abort", onAbort, { once: true });
      }

      child.on("error", error => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutTimer);
        clearTimeout(killTimer);
        signal?.removeEventListener("abort", onAbort);
        const failure = new Error("check recipe failed to start: " + error.message);
        failure.code = "spawn_failed";
        reject(failure);
      });

      child.on("close", (code, closeSignal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutTimer);
        clearTimeout(killTimer);
        signal?.removeEventListener("abort", onAbort);
        const endedAtMs = Date.now();
        resolve({
          exitCode: code,
          signal: closeSignal,
          durationMs: endedAtMs - startedAtMs,
          stdout: Buffer.concat(stdoutChunks).toString("utf8"),
          stderr: Buffer.concat(stderrChunks).toString("utf8"),
          truncated: { stdout: stdoutTruncated, stderr: stderrTruncated },
          timedOut,
          cancelled,
          startedAt,
          endedAt: new Date(endedAtMs).toISOString(),
        });
      });
    });
  } finally {
    await rm(homeDir, { recursive: true, force: true }).catch(() => {});
  }
}
