import { mkdir, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const CORE_DIR = MODULE_DIR;
const BRIDGE_PATH = join(CORE_DIR, 'bridge.py');
const MAX_WIRE_LINE = 1_500_000;

export class CoreClientError extends Error {
  constructor(code, detail = '', operation = null) {
    super(`${code}${detail ? `: ${detail}` : ''}`);
    this.name = 'CoreClientError';
    this.code = code;
    this.detail = detail;
    this.operation = operation;
    this.source = 'core_bridge';
  }
}

function safeError(error) {
  if (error instanceof CoreClientError) return { code: error.code, message: error.detail || error.message };
  return { code: error?.code ?? error?.name ?? 'CORE_UNAVAILABLE', message: error?.message ?? String(error) };
}

function regularFile(pathValue) {
  return stat(pathValue).then((value) => value.isFile()).catch(() => false);
}

/**
 * Bounded JSONL transport for the private Python Core worker. The worker is
 * never exposed to the browser; correlation IDs bind concurrent callers to
 * one process generation while Core retains transaction ownership.
 */
export class CoreClient {
  constructor({ dataDir, dbPath = join(dataDir, 'state.db'), python = process.env.WORK_AGENT_PYTHON ?? 'python3',
    readyTimeoutMs = 5000, requestTimeoutMs = 30000, closeTimeoutMs = 1000, maxPending = 256 } = {}) {
    if (!dataDir) throw new TypeError('dataDir is required');
    for (const value of [readyTimeoutMs, requestTimeoutMs, closeTimeoutMs, maxPending]) {
      if (!Number.isSafeInteger(value) || value < 1) throw new TypeError('Core lifecycle limits must be positive integers');
    }
    Object.assign(this, { dataDir: resolve(dataDir), dbPath: resolve(dbPath), python,
      readyTimeoutMs, requestTimeoutMs, closeTimeoutMs, maxPending });
    this.process = null;
    this.ready = false;
    this.closed = false;
    this.closing = false;
    this.admissionEpoch = 0;
    this.sequence = 0;
    this.pending = new Map();
    this.stderr = '';
    this.startPromise = null;
    this.closePromise = null;
    this.transport = null;
  }

  async start() {
    if (this.closing) throw new CoreClientError('CORE_UNAVAILABLE', 'bridge is closing');
    if (this.closed) { this.closed = false; this.closePromise = null; }
    if (this.ready) return this.readyInfo;
    if (this.startPromise) return this.startPromise;
    this.startPromise = this.#start();
    try { return await this.startPromise; }
    finally { this.startPromise = null; }
  }

  async #start() {
    // A replacement may only acquire the database after the old process is reaped.
    if (this.transport) await this.transport.exited;
    await mkdir(this.dataDir, { recursive: true });
    if (!(await regularFile(BRIDGE_PATH))) throw new CoreClientError('CORE_UNAVAILABLE', 'bridge.py is missing');
    if (this.closed) throw new CoreClientError('CORE_UNAVAILABLE', 'bridge is closed');
    const child = spawn(this.python, ['-u', BRIDGE_PATH, '--db', this.dbPath, '--mode', 'b0'], {
      cwd: CORE_DIR,
      env: { PATH: process.env.PATH ?? '/usr/bin:/bin', PYTHONNOUSERSITE: '1',
        PYTHONHASHSEED: '0', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const transport = { child, failed: false, buffer: '', pending: new Map(), ready: false };
    this.transport = transport;
    this.process = child;
    this.pending = transport.pending;
    this.stderr = '';
    transport.exited = new Promise((resolveExit) => {
      child.once('close', () => {
        this.#invalidate(transport, new CoreClientError('CORE_UNAVAILABLE', 'bridge closed'));
        clearTimeout(transport.killTimer);
        if (this.transport === transport) {
          this.process = null;
          this.ready = false;
        }
        resolveExit();
      });
    });
    const ready = new Promise((resolveReady, rejectReady) => {
      transport.readyResolve = resolveReady;
      transport.readyReject = rejectReady;
      transport.readyTimer = setTimeout(() => this.#invalidate(transport,
        new CoreClientError('CORE_UNAVAILABLE', 'bridge ready timeout')), this.readyTimeoutMs);
    });
    child.on('error', (error) => this.#invalidate(transport, new CoreClientError('CORE_UNAVAILABLE', error.message)));
    child.stdin.on('error', (error) => this.#invalidate(transport, new CoreClientError('CORE_UNAVAILABLE', error.message)));
    child.stdout.on('error', (error) => this.#invalidate(transport, new CoreClientError('CORE_UNAVAILABLE', error.message)));
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => this.#onData(transport, chunk));
    child.stdout.on('end', () => this.#invalidate(transport, new CoreClientError('CORE_UNAVAILABLE', 'bridge stdout closed')));
    child.stderr.on('error', (error) => this.#invalidate(transport, new CoreClientError('CORE_UNAVAILABLE', error.message)));
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      if (this.transport === transport) this.stderr = (this.stderr + chunk).slice(-65536);
    });
    try {
      const info = await ready;
      if (this.closed || transport.failed) throw new CoreClientError('CORE_UNAVAILABLE', 'bridge closed during startup');
      this.ready = true;
      this.readyInfo = info;
      return info;
    } catch (error) {
      this.#invalidate(transport, error);
      await transport.exited;
      throw error;
    }
  }

  #onData(transport, chunk) {
    if (transport.failed || this.transport !== transport) return;
    // Enforce the bound before retaining an unterminated frame (readline cannot do this).
    for (const part of chunk.split(/(?<=\n)/)) {
      transport.buffer += part;
      if (Buffer.byteLength(transport.buffer) > MAX_WIRE_LINE) {
        this.#invalidate(transport, new CoreClientError('INVALID', 'bridge response exceeded size limit'));
        return;
      }
      if (!part.endsWith('\n')) continue;
      const line = transport.buffer;
      transport.buffer = '';
      this.#onLine(transport, line);
      if (transport.failed) return;
    }
  }

  #onLine(transport, line) {
    let message;
    try { message = JSON.parse(line); }
    catch {
      this.#invalidate(transport, new CoreClientError('CORE_UNAVAILABLE', 'invalid bridge JSON'));
      return;
    }
    if (!message || typeof message !== 'object' || Array.isArray(message)) {
      this.#invalidate(transport, new CoreClientError('CORE_UNAVAILABLE', 'invalid bridge envelope'));
      return;
    }
    if (!transport.ready) {
      if (message.ready !== true) {
        this.#invalidate(transport, new CoreClientError(message.error?.code ?? 'CORE_UNAVAILABLE', message.error?.detail ?? 'bridge not ready'));
        return;
      }
      transport.ready = true;
      clearTimeout(transport.readyTimer);
      transport.readyResolve(message);
      transport.readyResolve = transport.readyReject = null;
      return;
    }
    if (typeof message.id !== 'string' || typeof message.ok !== 'boolean') {
      this.#invalidate(transport, new CoreClientError('CORE_UNAVAILABLE', 'invalid bridge response'));
      return;
    }
    const waiter = transport.pending.get(message.id);
    if (!waiter) return; // Duplicate or late response cannot settle a different request.
    transport.pending.delete(message.id);
    clearTimeout(waiter.timer);
    if (message.ok !== true) waiter.reject(new CoreClientError(message.error?.code ?? 'CORE_ERROR', message.error?.detail ?? '', waiter.operation));
    else waiter.resolve(message.result);
  }

  #invalidate(transport, error) {
    if (transport.failed) return;
    transport.failed = true;
    transport.buffer = '';
    if (this.transport === transport) this.ready = false;
    clearTimeout(transport.readyTimer);
    transport.readyReject?.(error);
    transport.readyResolve = transport.readyReject = null;
    for (const waiter of transport.pending.values()) {
      clearTimeout(waiter.timer);
      const failure = new CoreClientError(error.code ?? 'CORE_UNAVAILABLE', error.detail ?? error.message, waiter.operation);
      // A transport failure cannot prove whether a sent mutation committed.
      failure.outcome = 'unknown';
      waiter.reject(failure);
    }
    transport.pending.clear();
    try { transport.child.kill('SIGTERM'); } catch { /* already reaped */ }
    transport.killTimer = setTimeout(() => {
      try { transport.child.kill('SIGKILL'); } catch { /* already reaped */ }
    }, this.closeTimeoutMs);
    transport.killTimer.unref();
  }

  async call(op, payload = {}) {
    const admissionEpoch = this.admissionEpoch;
    await this.start();
    const transport = this.transport;
    if (admissionEpoch !== this.admissionEpoch || this.closed || transport.failed || !transport.child.stdin.writable) throw new CoreClientError('CORE_UNAVAILABLE', 'bridge is closed', op);
    if (Object.hasOwn(payload, 'id') || Object.hasOwn(payload, 'op')) throw new CoreClientError('INVALID', 'wire identity is reserved', op);
    if (transport.pending.size >= this.maxPending) throw new CoreClientError('CORE_BUSY', 'pending request limit', op);
    const id = `core-${++this.sequence}-${randomUUID()}`;
    const text = `${JSON.stringify({ id, op, ...payload })}\n`;
    if (['initialize_file_run','mark_file_input','save_file_candidate','file_query'].includes(op) && Buffer.byteLength(text) > 1_000_000) throw new CoreClientError('FILE_LIMIT', 'file request wire limit', op);
    if (Buffer.byteLength(text) > MAX_WIRE_LINE) throw new CoreClientError('INVALID', 'Core request exceeds size limit', op);
    return new Promise((resolveResponse, rejectResponse) => {
      const timer = setTimeout(() => this.#invalidate(transport,
        new CoreClientError('CORE_TIMEOUT', 'bridge request deadline exceeded', op)), this.requestTimeoutMs);
      transport.pending.set(id, { resolve: resolveResponse, reject: rejectResponse, operation: op, timer });
      try {
        transport.child.stdin.write(text, (error) => {
          if (error) this.#invalidate(transport, new CoreClientError('CORE_UNAVAILABLE', error.message, op));
        });
      } catch (error) { this.#invalidate(transport, new CoreClientError('CORE_UNAVAILABLE', error.message, op)); }
    });
  }

  listMatters() { return this.call('list_matters'); }

  getMatter(matterId) { return this.call('get_matter', { matter_id: matterId }); }

  createMatter({ matterId, title, source, contractVersion = 'contract-1', draft = '', domain = null }) {
    return this.call('create_matter', {
      matter_id: matterId,
      title,
      source,
      contract_version: contractVersion,
      draft,
      domain,
    });
  }

  saveDraft(matterId, text) { return this.call('save_draft', { matter_id: matterId, text }); }

  createRun({ runId, matterId, baseVersion, sourceVersion, contractVersion, presetVersion = 'preset-1', sessionRef = null, instruction, provider = null, model = null, providerConfig = {}, workContext = null }) {
    return this.call('create_run', {
      run_id: runId,
      matter_id: matterId,
      base_version: baseVersion,
      source_version: sourceVersion,
      contract_version: contractVersion,
      preset_version: presetVersion,
      session_ref: sessionRef,
      instruction,
      provider,
      model,
      provider_config: providerConfig,
      work_context: workContext,
    });
  }

  getRun(runId) { return this.call('get_run', { run_id: runId }); }

  updateRun({ runId, status, admissionOpen, error = null, candidateId = null, endedAt = null }) {
    return this.call('update_run', {
      run_id: runId,
      status,
      admission_open: admissionOpen,
      error,
      candidate_id: candidateId,
      ended_at: endedAt,
    });
  }

  readSource({ matterId, runId, sourceId, version }) {
    return this.call('read_source', {
      source_id: sourceId,
      version,
      context: { matter_id: matterId, run_id: runId },
    });
  }

  saveCandidate({ matterId, runId, payload }) {
    return this.call('save_candidate', {
      payload,
      context: { matter_id: matterId, run_id: runId },
    });
  }

  readArtifact({matterId,runId,artifactId,offset=0,limit=4000}) {
    return this.call('read_artifact',{artifact_id:artifactId,offset,limit,context:{matter_id:matterId,run_id:runId}});
  }

  decide(request) { return this.call('trusted_decide', { request }); }

  queryRequest(requestId) { return this.call('query_request', { request_id: requestId }); }

  snapshot(matterId = null) {
    return matterId === null ? this.call('snapshot') : this.call('snapshot', { matter_id: matterId });
  }

  async close() {
    if (this.closePromise) return this.closePromise;
    this.closed = true;
    this.closing = true;
    this.admissionEpoch++;
    this.closePromise = (async () => {
      // Seal admission before waiting for startup, a response, or process exit.
      const transport = this.transport;
      if (transport) {
        this.#invalidate(transport, new CoreClientError('CORE_UNAVAILABLE', 'bridge closed'));
        await transport.exited;
      }
      await this.startPromise?.catch(() => {});
      this.ready = false;
    })().finally(() => { this.closing = false; });
    return this.closePromise;
  }

}

export { BRIDGE_PATH, CORE_DIR, safeError };
