// DF-04 check recipe runner (RD-009). Spawns a Host-owned recipe inside the
// check sandbox (check-sandbox.mjs): the candidate is read-only, the only
// writable place is the check's own temporary directory, and there is no
// network. `shell:false` and a minimal, explicit environment keep the child
// from inheriting provider credentials or ambient NODE_OPTIONS/PYTHONPATH.
import { spawn } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prepareCheckSandbox } from "./check-sandbox.mjs";

const KILL_GRACE_MS = 500;
const GROUP_POLL_MS = 25;
const GROUP_GONE_TIMEOUT_MS = 2000;

function groupExists(pid) {
  try { process.kill(-pid, 0); return true; } catch (error) { return error.code === "EPERM"; }
}

// The leader closing does not mean the group is gone: a descendant may
// outlive a normal exit, or ignore SIGTERM and detach its stdio after a stop.
// SIGKILL the group and wait (bounded) until it is confirmed gone. Returns
// true when confirmed.
async function reapGroup(pid) {
  if (!groupExists(pid)) return true;
  killGroup(pid, "SIGKILL");
  for (let waited = 0; waited < GROUP_GONE_TIMEOUT_MS; waited += GROUP_POLL_MS) {
    await new Promise(resolve => setTimeout(resolve, GROUP_POLL_MS));
    if (!groupExists(pid)) return true;
  }
  return !groupExists(pid);
}

function killGroup(pid, signal) {
  // The child is spawned detached, so its pid is also its process group id;
  // signalling -pid reaches the whole group (any children it spawned too).
  try { process.kill(-pid, signal); } catch { /* already gone */ }
}

/**
 * Run one check recipe to completion and report exactly what happened. Never
 * throws for a non-zero exit -- that is a normal check outcome, not a Host
 * failure. A process-start failure uses "spawn_failed"; a sandbox that is
 * missing or does not start uses "sandbox_unavailable"; a synchronous Host
 * beforeSpawn validation failure preserves its own code. None starts a child.
 * `dataDir` is the Host data directory the sandbox denies; `sandbox` passes
 * test-only options to prepareCheckSandbox (like `gitBinary`).
 */
export async function runCheckRecipe({ recipe, cwd, dataDir, signal, onOutput, beforeSpawn, sandbox } = {}) {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const cancelledBeforeSpawn = () => ({
    exitCode: null, signal: null, durationMs: Date.now() - startedAtMs,
    stdout: "", stderr: "", truncated: { stdout: false, stderr: false },
    timedOut: false, cancelled: true, startedAt, endedAt: new Date().toISOString(),
  });
  if (signal?.aborted) return cancelledBeforeSpawn();
  // HOME and TMPDIR of the child: the only directory it may write.
  const homeDir = await mkdtemp(path.join(tmpdir(), "cw-check-home-"));
  let execution = null;
  try {
    const env = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: homeDir, TMPDIR: homeDir, LANG: "C" };
    let unavailable = null;
    try {
      execution = await prepareCheckSandbox({ command: recipe.command, argv: recipe.argv, cwd, tempDir: homeDir, dataDir, env, ...sandbox });
    } catch (error) {
      if (error.code !== "sandbox_unavailable") throw error;
      unavailable = error;
    }
    return await new Promise((resolve, reject) => {
      // Internal synchronous Host fence; no await may separate it from spawn.
      if (signal?.aborted) { resolve(cancelledBeforeSpawn()); return; }
      beforeSpawn?.();
      if (signal?.aborted) { resolve(cancelledBeforeSpawn()); return; }
      // Cancellation and the Host fence take precedence: with either, no
      // child would start whatever the sandbox's state.
      if (unavailable) { reject(unavailable); return; }
      let child;
      try {
        // The sandbox starts /bin/sh, so a missing recipe command would
        // otherwise surface as exit 127 rather than a failed start.
        accessSync(recipe.command, constants.X_OK);
        child = spawn(execution.command, execution.argv, {
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

      child.on("close", async (code, closeSignal) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutTimer);
        clearTimeout(killTimer);
        signal?.removeEventListener("abort", onAbort);
        // Every exit path reaps the group. A descendant that started its own
        // session is outside it; it stays inside the sandbox.
        const groupGone = await reapGroup(child.pid);
        const endedAtMs = Date.now();
        resolve({
          ...(groupGone ? {} : { groupLingered: true }),
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
    execution?.release();
    await rm(homeDir, { recursive: true, force: true }).catch(() => {});
  }
}
