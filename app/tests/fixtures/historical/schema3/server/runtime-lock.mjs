import { createInterface } from 'node:readline';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const LOCK_HOLDER = join(MODULE_DIR, 'runtime-lock.py');
const MAX_LINE = 128 * 1024;
const HANDSHAKE_TIMEOUT_MS = 5_000;

function lockError(code, message, cause = undefined) {
  const error = new Error(message);
  error.name = 'RuntimeLockError';
  error.code = code;
  if (cause !== undefined) error.cause = cause;
  return error;
}

function safeEnv() {
  return {
    PATH: process.env.PATH ?? '/usr/bin:/bin',
    PYTHONNOUSERSITE: '1',
    PYTHONHASHSEED: '0',
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
  };
}

function validateDataDir(dataDir) {
  if (typeof dataDir !== 'string' || dataDir.trim() === '') {
    throw lockError('INVALID_INPUT', 'dataDir is required');
  }
  return resolve(dataDir);
}

/**
 * Acquire the host-wide runtime lock for one data directory.
 *
 * The Python child owns the open descriptor and POSIX flock.  Keeping the
 * descriptor in another process makes an owner SIGKILL release the OS lock;
 * the lock inode itself is never removed.  This adapter is intentionally
 * POSIX-only and has no marker-file fallback.
 */
export async function acquireRuntimeLock(dataDir) {
  const resolvedDir = validateDataDir(dataDir);
  await mkdir(resolvedDir, { recursive: true });
  const lockPath = join(resolvedDir, 'runtime.lock');
  const python = process.env.WORK_AGENT_PYTHON ?? 'python3';
  const child = spawn(python, [LOCK_HOLDER, '--lock-path', lockPath, '--parent-pid', String(process.pid)], {
    cwd: MODULE_DIR,
    env: safeEnv(),
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-8_192);
  });

  let ready = false;
  let released = false;
  let lost = false;
  let releasePromise = null;
  let releaseResolve = null;
  let releaseReject = null;
  let handshakeResolve;
  let handshakeReject;
  let handshakeSettled = false;
  let handshakeError = null;
  const lossHandlers = new Set();
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });

  const settleHandshake = (error, value = undefined) => {
    if (handshakeSettled) return;
    handshakeSettled = true;
    if (error) handshakeReject(error);
    else handshakeResolve(value);
  };

  const notifyLost = (error) => {
    if (lost || released) return;
    lost = true;
    const failure = error instanceof Error ? error : lockError('LOCK_LOST', String(error));
    for (const handler of lossHandlers) {
      queueMicrotask(() => {
        try { handler(failure); } catch { /* observers cannot break lock cleanup */ }
      });
    }
    if (releaseReject) {
      releaseReject(failure);
      releaseResolve = null;
      releaseReject = null;
    }
    // A protocol/transport failure must not leave the holder alive with the
    // flock.  A normal child exit has already released it; kill is harmless
    // in that case and makes the failure path fail-closed.
    try { child.kill('SIGTERM'); } catch { /* already exited */ }
  };

  lines.on('line', (line) => {
    if (line.length > MAX_LINE) {
      const failure = lockError('LOCK_PROTOCOL', 'lock holder response exceeded size limit');
      if (!ready) settleHandshake(failure);
      else notifyLost(failure);
      return;
    }
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      const failure = lockError('LOCK_PROTOCOL', 'invalid lock holder response', error);
      if (!ready) settleHandshake(failure);
      else notifyLost(failure);
      return;
    }
    if (!ready) {
      if (message?.ready === true && Number.isInteger(message.pid)) {
        ready = true;
        settleHandshake(null, message);
      } else {
        const code = message?.error?.code ?? 'LOCK_UNAVAILABLE';
        const detail = message?.error?.message ?? 'lock holder rejected acquisition';
        const failure = lockError(code, detail);
        handshakeError = failure;
        settleHandshake(failure);
      }
      return;
    }
    if (message?.released === true) {
      released = true;
      releaseResolve?.();
      releaseResolve = null;
      releaseReject = null;
      return;
    }
    if (message?.error) notifyLost(lockError(message.error.code ?? 'LOCK_PROTOCOL', message.error.message ?? 'lock holder error'));
  });

  child.on('error', (error) => {
    // A missing interpreter is the one spawn failure with an actionable
    // answer, and it must not be mistaken for a busy lock or degrade into
    // running without one: the flock holder has to be a separate process, so
    // there is no in-process fallback to fall back to.
    const failure = error?.code === 'ENOENT'
      ? lockError('LOCK_NO_PYTHON', `the runtime lock holder could not be started: ${python} was not found on PATH. This server requires a POSIX python3 to hold the flock on the data directory; set WORK_AGENT_PYTHON to an interpreter path or install python3. There is no fallback and the server will not start without it.`, error)
      : lockError('LOCK_UNAVAILABLE', error.message, error);
    if (!ready) settleHandshake(failure);
    else notifyLost(failure);
  });

  child.on('exit', (code, signal) => {
    if (!ready) {
      const failure = handshakeError
        ?? (code === 3 ? lockError('LOCK_BUSY', 'runtime lock is held')
          : lockError('LOCK_UNAVAILABLE', `lock holder exited code=${code} signal=${signal}${stderr ? `: ${stderr}` : ''}`));
      settleHandshake(failure);
      return;
    }
    if (!released) {
      notifyLost(lockError('LOCK_LOST', `lock holder exited code=${code} signal=${signal}`));
    }
  });

  const handshake = new Promise((resolveHandshake, rejectHandshake) => {
    handshakeResolve = resolveHandshake;
    handshakeReject = rejectHandshake;
    setTimeout(() => settleHandshake(lockError('LOCK_TIMEOUT', 'runtime lock acquisition timed out')), HANDSHAKE_TIMEOUT_MS).unref?.();
  });

  let holderInfo;
  try {
    holderInfo = await handshake;
  } catch (error) {
    try { child.kill('SIGTERM'); } catch { /* already exited */ }
    lines.close();
    if (error?.code === 'LOCK_BUSY') throw error;
    throw error?.code ? error : lockError('LOCK_UNAVAILABLE', error?.message ?? String(error), error);
  }

  const release = async () => {
    if (released) return;
    if (lost) return;
    if (releasePromise) return releasePromise;
    releasePromise = new Promise((resolveRelease, rejectRelease) => {
      releaseResolve = resolveRelease;
      releaseReject = rejectRelease;
      try {
        child.stdin.write('{"op":"release"}\n', (error) => {
          if (error) notifyLost(lockError('LOCK_LOST', error.message, error));
        });
      } catch (error) {
        notifyLost(lockError('LOCK_LOST', error?.message ?? String(error), error));
      }
    });
    return releasePromise;
  };

  const onLost = (handler) => {
    if (typeof handler !== 'function') throw new TypeError('onLost handler must be a function');
    if (lost) {
      queueMicrotask(() => handler(lockError('LOCK_LOST', 'runtime lock was lost')));
      return () => undefined;
    }
    lossHandlers.add(handler);
    return () => lossHandlers.delete(handler);
  };

  // Keep these non-enumerable diagnostics out of the public contract while
  // making black-box POSIX fixture debugging possible without a second API.
  const handle = { release, onLost };
  Object.defineProperty(handle, 'lockPath', { value: lockPath, enumerable: false });
  Object.defineProperty(handle, 'holderPid', { value: holderInfo.pid, enumerable: false });
  return handle;
}

export { LOCK_HOLDER };
