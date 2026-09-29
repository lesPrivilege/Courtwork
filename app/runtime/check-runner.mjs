// DF-04 check recipe runner (RD-009). Spawns a Host-owned recipe as a normal
// child process with the Host user's own rights -- this is not a sandbox. The
// recipe runs under check-guard.mjs, so its process group dies with the Host.
// `shell:false` and a minimal, explicit environment keep the child from
// inheriting provider credentials or ambient NODE_OPTIONS/PYTHONPATH.
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Every check runs under check-guard.mjs, the leader of its process group,
// which kills the group when the recipe's own process exits or when this Host
// dies without stopping the check.
const GUARD = fileURLToPath(new URL("./check-guard.mjs", import.meta.url));

const KILL_GRACE_MS = 500;
const GROUP_POLL_MS = 25;
const GROUP_GONE_TIMEOUT_MS = 2000;

function groupExists(pid) {
  try { process.kill(-pid, 0); return true; } catch (error) { return error.code === "EPERM"; }
}

// After a stop, the leader closing does not mean the group is gone: a
// descendant may ignore SIGTERM and have detached its stdio. SIGKILL the group
// and wait (bounded) until it is confirmed gone. Returns true when confirmed.
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
 * failure. A process-start failure uses "spawn_failed"; a synchronous Host
 * beforeSpawn validation failure preserves its own code and starts no child.
 */
export async function runCheckRecipe({ recipe, cwd, signal, onOutput, beforeSpawn } = {}) {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const cancelledBeforeSpawn = () => ({
    exitCode: null, signal: null, durationMs: Date.now() - startedAtMs,
    stdout: "", stderr: "", truncated: { stdout: false, stderr: false },
    timedOut: false, cancelled: true, startedAt, endedAt: new Date().toISOString(),
  });
  if (signal?.aborted) return cancelledBeforeSpawn();
  const homeDir = await mkdtemp(path.join(tmpdir(), "cw-check-home-"));
  try {
    const env = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: homeDir, LANG: "C" };
    return await new Promise((resolve, reject) => {
      // Internal synchronous Host fence; no await may separate it from spawn.
      if (signal?.aborted) { resolve(cancelledBeforeSpawn()); return; }
      beforeSpawn?.();
      if (signal?.aborted) { resolve(cancelledBeforeSpawn()); return; }
      let child;
      try {
        // stdin is the guard's life line: held open here, closed by the OS
        // if this process dies. fd 3 reports whether the command started.
        child = spawn(process.execPath, [GUARD, recipe.command, ...recipe.argv], {
          cwd, shell: false, detached: true, stdio: ["pipe", "pipe", "pipe", "pipe"], env,
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
      let control = "";
      child.stdio[3].on("data", chunk => { control += chunk; });
      child.stdin.on("error", () => {});

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
        const startFailure = /^failed (.*)$/m.exec(control);
        if (startFailure) {
          const failure = new Error("check recipe failed to start: " + startFailure[1]);
          failure.code = "spawn_failed";
          reject(failure);
          return;
        }
        // The guard reports the recipe's own exit status, then kills the
        // group (itself included); without a report (the guard was killed by
        // a stop), the guard's own close status is the recipe's.
        const exited = /^exit (\d*) ([A-Z0-9]*)$/m.exec(control);
        // Every exit path confirms the group is gone.
        const groupGone = await reapGroup(child.pid);
        const endedAtMs = Date.now();
        resolve({
          ...(groupGone ? {} : { groupLingered: true }),
          exitCode: exited ? (exited[1] === "" ? null : Number(exited[1])) : code,
          signal: exited ? (exited[2] || null) : closeSignal,
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
