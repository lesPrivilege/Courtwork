// Bounded one-shot process transport for Pi's JSONL modes. This module owns
// process IO and lifecycle observations only; callers decide what the events
// mean for a Pi turn or for CourtWork business state.
import { spawn } from "node:child_process";
import path from "node:path";

const DEFAULT_LIMITS = Object.freeze({
  maxInputBytes: 2 * 1024 * 1024,
  maxFrameBytes: 2 * 1024 * 1024,
  maxStdoutBytes: 8 * 1024 * 1024,
  maxStderrBytes: 16 * 1024,
  timeoutMs: 60_000,
  killGraceMs: 500,
});

// These ceilings keep a caller mistake from silently turning this bounded
// adapter into an unbounded process runner. They are deliberately above the
// defaults while remaining small enough for one-shot consultation.
const LIMIT_CEILINGS = Object.freeze({
  maxInputBytes: 16 * 1024 * 1024,
  maxFrameBytes: 16 * 1024 * 1024,
  maxStdoutBytes: 64 * 1024 * 1024,
  maxStderrBytes: 1024 * 1024,
  timeoutMs: 10 * 60_000,
  killGraceMs: 60_000,
});

const SUPPORTED_PLATFORMS = new Set(["darwin", "linux"]);

function emptyResult(overrides = {}) {
  return {
    pid: null,
    exitCode: null,
    signal: null,
    spawned: false,
    inputComplete: false,
    timedOut: false,
    cancelled: false,
    escalated: false,
    fault: null,
    stderr: "",
    stderrTruncated: false,
    stdoutBytes: 0,
    eventCount: 0,
    ...overrides,
  };
}

function invalid(message) {
  const error = new TypeError(message);
  error.code = "invalid_arguments";
  return error;
}

function checkedLimits(overrides) {
  if (overrides === undefined) return { ...DEFAULT_LIMITS };
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    throw invalid("limits must be an object");
  }
  for (const key of Object.keys(overrides)) {
    if (!(key in DEFAULT_LIMITS)) throw invalid(`unknown process limit: ${key}`);
  }
  const limits = { ...DEFAULT_LIMITS, ...overrides };
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0 || value > LIMIT_CEILINGS[key]) {
      throw invalid(`${key} must be a positive bounded integer`);
    }
  }
  return limits;
}

function checkedInput(input) {
  if (input === undefined || input === null) return Buffer.alloc(0);
  if (typeof input === "string") return Buffer.from(input, "utf8");
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  }
  throw invalid("input must be a string, Buffer, or Uint8Array");
}

function checkedOptions(options) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw invalid("process options are required");
  }
  const { executable, args = [], cwd, env = {}, signal, onEvent, onSpawn } = options;
  if (typeof executable !== "string" || !path.isAbsolute(executable)) {
    throw invalid("executable must be an absolute path");
  }
  if (!Array.isArray(args) || args.some(value => typeof value !== "string")) {
    throw invalid("args must be an array of strings");
  }
  if (cwd !== undefined && (typeof cwd !== "string" || !path.isAbsolute(cwd))) {
    throw invalid("cwd must be an absolute path");
  }
  if (!env || typeof env !== "object" || Array.isArray(env)) {
    throw invalid("env must be an explicit object");
  }
  const explicitEnv = Object.create(null);
  for (const [key, value] of Object.entries(env)) {
    if (!key || key.includes("=") || typeof value !== "string") {
      throw invalid("env keys and values must be strings");
    }
    explicitEnv[key] = value;
  }
  if (signal !== undefined && (!signal || typeof signal.aborted !== "boolean" || typeof signal.addEventListener !== "function")) {
    throw invalid("signal must be an AbortSignal");
  }
  if (onEvent !== undefined && typeof onEvent !== "function") throw invalid("onEvent must be a function");
  if (onSpawn !== undefined && typeof onSpawn !== "function") throw invalid("onSpawn must be a function");
  return { executable, args: [...args], cwd, env: explicitEnv, signal, onEvent, onSpawn };
}

function killOwnedGroup(pid, closeSignal) {
  try {
    process.kill(-pid, closeSignal);
  } catch {
    // ESRCH is the expected race when the group exits between observation and
    // signalling. No raw platform error belongs in the transport result.
  }
}

function waitForWritable(stream, closedPromise) {
  return Promise.race([
    new Promise(resolve => stream.once("drain", () => resolve(true))),
    closedPromise.then(() => false),
  ]);
}

function endWritable(stream, closedPromise) {
  return Promise.race([
    new Promise(resolve => stream.end(() => resolve(true))),
    closedPromise.then(() => false),
  ]);
}

/**
 * Run one Pi JSONL process. A resolved result is an observation of the native
 * process only. In particular, exitCode 0 is not a claim that a Pi turn
 * completed or that CourtWork accepted its output.
 */
export async function runLocalPiProcess(options) {
  const limits = checkedLimits(options?.limits);
  const input = checkedInput(options?.input);
  const config = checkedOptions(options);

  if (!SUPPORTED_PLATFORMS.has(process.platform)) {
    return emptyResult({ fault: "platform_unsupported" });
  }
  if (input.byteLength > limits.maxInputBytes) {
    return emptyResult({ fault: "input_too_large" });
  }
  if (config.signal?.aborted) {
    return emptyResult({ cancelled: true });
  }

  let child;
  try {
    child = spawn(config.executable, config.args, {
      cwd: config.cwd,
      env: config.env,
      shell: false,
      detached: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return emptyResult({ fault: "spawn_failed" });
  }

  let pid = Number.isSafeInteger(child.pid) ? child.pid : null;
  let spawned = false;
  let closed = false;
  let exitCode = null;
  let closeSignal = null;
  let inputComplete = false;
  let timedOut = false;
  let cancelled = false;
  let escalated = false;
  let fault = null;
  let stdoutBytes = 0;
  let eventCount = 0;
  let terminating = false;
  let terminationSignalled = false;
  let deadlineTimer;
  let killTimer;
  let releaseCallbacks;

  const callbacksReleased = new Promise(resolve => { releaseCallbacks = resolve; });
  const setFault = code => {
    if (fault === null) fault = code;
  };

  let resolveClosed;
  const closedPromise = new Promise(resolve => { resolveClosed = resolve; });

  const stderrChunks = [];
  let stderrBytes = 0;
  let stderrTruncated = false;
  child.stderr.on("data", chunk => {
    if (!Buffer.isBuffer(chunk)) chunk = Buffer.from(chunk);
    const remaining = limits.maxStderrBytes - stderrBytes;
    if (remaining > 0) {
      const kept = chunk.subarray(0, remaining);
      stderrChunks.push(kept);
      stderrBytes += kept.byteLength;
    }
    if (chunk.byteLength > remaining) stderrTruncated = true;
  });
  child.stderr.on("error", () => setFault("stderr_failed"));
  // All three streams receive error listeners before any callback or write so
  // an early child exit cannot surface as an unhandled EPIPE/stream error.
  child.stdin.on("error", () => {
    if (!closed && !terminating) setFault("input_failed");
  });
  child.stdout.on("error", () => {
    if (!closed && !terminating) setFault("stdout_failed");
  });

  function signalTermination() {
    if (terminationSignalled || !spawned || pid === null || closed) return;
    terminationSignalled = true;
    killOwnedGroup(pid, "SIGTERM");
    killTimer = setTimeout(() => {
      if (closed) return;
      escalated = true;
      killOwnedGroup(pid, "SIGKILL");
    }, limits.killGraceMs);
  }

  function terminate() {
    if (!terminating) {
      terminating = true;
      releaseCallbacks();
      child.stdin.destroy();
    }
    // spawn() returns before its success event. Cancellation in that window is
    // remembered here and the spawn listener below signals the newly owned
    // group immediately; it must never become an unkillable pre-spawn race.
    signalTermination();
  }

  function deadline() {
    timedOut = true;
    terminate();
  }

  const onAbort = () => {
    if (terminating || closed) return;
    cancelled = true;
    terminate();
  };

  child.once("spawn", () => {
    spawned = true;
    pid = Number.isSafeInteger(child.pid) ? child.pid : pid;
    if (terminating) signalTermination();
  });
  child.once("error", () => {
    setFault(spawned ? "process_error" : "spawn_failed");
    terminate();
  });
  child.once("close", (code, signalName) => {
    closed = true;
    exitCode = code;
    closeSignal = signalName;
    clearTimeout(killTimer);
    resolveClosed();
  });

  deadlineTimer = setTimeout(deadline, limits.timeoutMs);
  if (config.signal) {
    if (config.signal.aborted) onAbort();
    else config.signal.addEventListener("abort", onAbort, { once: true });
  }

  async function invoke(callback, value) {
    if (!callback) return true;
    let completed;
    // Attach both branches immediately so a callback abandoned at the total
    // deadline can never produce an unhandled rejection later.
    const callbackResult = Promise.resolve().then(() => callback(value)).then(
      () => (completed = { kind: "done" }),
      () => (completed = { kind: "failed" }),
    );
    const outcome = await Promise.race([
      callbackResult,
      callbacksReleased.then(() => ({ kind: "released" })),
    ]);
    if (outcome.kind === "released") {
      // A callback may itself synchronously request cancellation and then
      // return. Let that fulfilled microtask settle; an actually abandoned
      // Host receipt is an uncertainty, not a confirmed cancellation.
      await Promise.resolve();
      if (!completed) { setFault("callback_interrupted"); return false; }
    }
    const final = completed ?? outcome;
    if (final.kind === "failed") {
      setFault("callback_failed");
      terminate();
      return false;
    }
    return final.kind === "done";
  }

  async function writeInput() {
    if (terminating || closed) return;
    const chunkBytes = 64 * 1024;
    for (let offset = 0; offset < input.byteLength; offset += chunkBytes) {
      if (terminating || closed || child.stdin.destroyed) return;
      const accepted = child.stdin.write(input.subarray(offset, Math.min(offset + chunkBytes, input.byteLength)));
      if (!accepted && !(await waitForWritable(child.stdin, closedPromise))) return;
    }
    if (terminating || closed || child.stdin.destroyed) return;
    inputComplete = await endWritable(child.stdin, closedPromise);
  }

  async function consumeStdout() {
    let pending = Buffer.alloc(0);
    let discard = false;
    try {
      for await (let chunk of child.stdout) {
        if (!Buffer.isBuffer(chunk)) chunk = Buffer.from(chunk);
        stdoutBytes += chunk.byteLength;
        if (stdoutBytes > limits.maxStdoutBytes && fault === null) {
          setFault("stdout_too_large");
          discard = true;
          terminate();
        }
        if (discard || terminating) continue;

        pending = pending.byteLength === 0 ? chunk : Buffer.concat([pending, chunk]);
        for (;;) {
          const newline = pending.indexOf(0x0a);
          if (newline === -1) {
            if (pending.byteLength > limits.maxFrameBytes) {
              setFault("frame_too_large");
              discard = true;
              pending = Buffer.alloc(0);
              terminate();
            }
            break;
          }
          if (newline > limits.maxFrameBytes) {
            setFault("frame_too_large");
            discard = true;
            pending = Buffer.alloc(0);
            terminate();
            break;
          }
          const frame = pending.subarray(0, newline);
          pending = pending.subarray(newline + 1);
          let text;
          try {
            text = new TextDecoder("utf-8", { fatal: true }).decode(frame);
          } catch {
            setFault("invalid_utf8");
            discard = true;
            pending = Buffer.alloc(0);
            terminate();
            break;
          }
          let event;
          try {
            event = JSON.parse(text);
          } catch {
            setFault("malformed_json");
            discard = true;
            pending = Buffer.alloc(0);
            terminate();
            break;
          }
          if (event === null || typeof event !== "object" || Array.isArray(event)) {
            setFault("non_object_event");
            discard = true;
            pending = Buffer.alloc(0);
            terminate();
            break;
          }
          eventCount += 1;
          if (!(await invoke(config.onEvent, event))) {
            discard = true;
            pending = Buffer.alloc(0);
            break;
          }
        }
      }
    } catch {
      if (!terminating) setFault("stdout_failed");
    }
    if (!discard && pending.byteLength > 0 && fault === null) {
      setFault("partial_frame");
      terminate();
    }
  }

  let stdoutTask = Promise.resolve();
  let inputTask = Promise.resolve();
  try {
    // Wait for either a confirmed spawn or the spawn error/close path. The
    // native pid is only observable to the Host after the spawn event.
    if (!spawned && fault === null && !closed) {
      await Promise.race([
        new Promise(resolve => child.once("spawn", resolve)),
        closedPromise,
      ]);
    }
    if (spawned) {
      const observed = !terminating && await invoke(config.onSpawn, { pid });
      // Always drain the pipe after onSpawn settles or is released by the
      // deadline. A callback can stall while the child fills stdout; draining
      // after termination lets the close observation complete without ever
      // delivering pre-observation events.
      stdoutTask = consumeStdout();
      if (observed && !terminating && !closed) {
        inputTask = writeInput();
      }
    }
    await closedPromise;
    await Promise.all([stdoutTask, inputTask]);
  } finally {
    clearTimeout(deadlineTimer);
    clearTimeout(killTimer);
    config.signal?.removeEventListener("abort", onAbort);
    releaseCallbacks();
  }

  if (spawned && !inputComplete && input.byteLength > 0 && fault === null && !timedOut && !cancelled) {
    fault = "input_incomplete";
  }

  return {
    pid,
    exitCode,
    signal: closeSignal,
    spawned,
    inputComplete,
    timedOut,
    cancelled,
    escalated,
    fault,
    stderr: Buffer.concat(stderrChunks).toString("utf8"),
    stderrTruncated,
    stdoutBytes,
    eventCount,
  };
}
