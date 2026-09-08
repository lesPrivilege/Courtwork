import { createInterface } from 'node:readline';
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
 * Serialized JSONL client for the private Python Core worker.  The worker is
 * never exposed to the browser; every request receives a wire correlation id
 * so a future bridge can safely support concurrent callers.
 */
export class CoreClient {
  constructor({ dataDir, dbPath = join(dataDir, 'state.db'), python = process.env.WORK_AGENT_PYTHON ?? 'python3' } = {}) {
    if (!dataDir) throw new TypeError('dataDir is required');
    this.dataDir = resolve(dataDir);
    this.dbPath = resolve(dbPath);
    this.python = python;
    this.process = null;
    this.lines = null;
    this.ready = false;
    this.closed = false;
    this.sequence = 0;
    this.pending = new Map();
    this.stderr = '';
    this.startPromise = null;
  }

  async start() {
    if (this.ready) return this.readyInfo;
    if (this.startPromise) return this.startPromise;
    this.startPromise = this.#start();
    try {
      return await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  async #start() {
    await mkdir(this.dataDir, { recursive: true });
    if (!(await regularFile(BRIDGE_PATH))) throw new CoreClientError('CORE_UNAVAILABLE', 'bridge.py is missing');
    this.closed = false;
    const safeEnv = {
      PATH: process.env.PATH ?? '/usr/bin:/bin',
      PYTHONNOUSERSITE: '1',
      PYTHONHASHSEED: '0',
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
    };
    this.process = spawn(this.python, ['-u', BRIDGE_PATH, '--db', this.dbPath, '--mode', 'b0'], {
      cwd: CORE_DIR,
      env: safeEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.process.stderr.setEncoding('utf8');
    this.process.stderr.on('data', (chunk) => { this.stderr += chunk; });
    this.process.on('error', (error) => this.#failAll(error));
    this.process.on('exit', (code, signal) => {
      if (!this.closed || code !== 0) {
        this.#failAll(new CoreClientError('CORE_UNAVAILABLE', `bridge exited code=${code} signal=${signal}`));
      }
      this.ready = false;
      this.process = null;
    });
    this.lines = createInterface({ input: this.process.stdout, crlfDelay: Infinity });
    this.lines.on('line', (line) => this.#onLine(line));
    this.lines.on('close', () => {
      if (!this.closed) this.#failAll(new CoreClientError('CORE_UNAVAILABLE', 'bridge stdout closed'));
    });
    const ready = await new Promise((resolveReady, rejectReady) => {
      this.readyResolve = resolveReady;
      this.readyReject = rejectReady;
      this.readyTimer = setTimeout(() => rejectReady(new CoreClientError('CORE_UNAVAILABLE', 'bridge ready timeout')), 5000);
    }).finally(() => clearTimeout(this.readyTimer));
    if (!ready?.ready) {
      throw new CoreClientError(ready?.error?.code ?? 'CORE_UNAVAILABLE', ready?.error?.detail ?? 'bridge not ready');
    }
    this.ready = true;
    this.readyInfo = ready;
    return ready;
  }

  #onLine(line) {
    if (line.length > MAX_WIRE_LINE) {
      this.#failAll(new CoreClientError('INVALID', 'bridge response exceeded size limit'));
      return;
    }
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      this.#failAll(new CoreClientError('CORE_UNAVAILABLE', `invalid bridge JSON: ${error.message}`));
      return;
    }
    if (!this.ready) {
      clearTimeout(this.readyTimer);
      this.readyResolve?.(message);
      this.readyResolve = null;
      this.readyReject = null;
      return;
    }
    const waiter = this.pending.get(message?.id);
    if (!waiter) return;
    this.pending.delete(message.id);
    if (message.ok !== true) {
      waiter.reject(new CoreClientError(message.error?.code ?? 'CORE_ERROR', message.error?.detail ?? '', waiter.operation));
      return;
    }
    waiter.resolve(message.result);
  }

  #failAll(error) {
    this.readyReject?.(error);
    this.readyResolve = null;
    this.readyReject = null;
    clearTimeout(this.readyTimer);
    for (const waiter of this.pending.values()) waiter.reject(error);
    this.pending.clear();
  }

  async call(op, payload = {}) {
    await this.start();
    if (this.closed || !this.process?.stdin?.writable) throw new CoreClientError('CORE_UNAVAILABLE', 'bridge is closed', op);
    if (Object.hasOwn(payload, 'id') || Object.hasOwn(payload, 'op')) throw new CoreClientError('INVALID', 'wire identity is reserved', op);
    const id = `core-${++this.sequence}-${randomUUID()}`;
    const request = { id, op, ...payload };
    const text = `${JSON.stringify(request)}\n`;
    if (text.length > MAX_WIRE_LINE) throw new CoreClientError('INVALID', 'Core request exceeds size limit', op);
    const response = new Promise((resolveResponse, rejectResponse) => {
      this.pending.set(id, { resolve: resolveResponse, reject: rejectResponse, operation: op });
    });
    try {
      await new Promise((resolveWrite, rejectWrite) => {
        this.process.stdin.write(text, (error) => error ? rejectWrite(error) : resolveWrite());
      });
    } catch (error) {
      this.pending.delete(id);
      throw new CoreClientError('CORE_UNAVAILABLE', error.message, op);
    }
    return response;
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
    if (this.closed) return;
    try {
      if (this.process?.stdin?.writable && this.ready) await this.call('close');
    } catch {
      // The process may already have exited.  Closing is idempotent.
    }
    this.closed = true;
    try { this.process?.stdin?.end(); } catch { /* process already gone */ }
    await new Promise((resolveClose) => {
      if (!this.process) return resolveClose();
      const timer = setTimeout(resolveClose, 1000);
      this.process.once('exit', () => { clearTimeout(timer); resolveClose(); });
    });
    this.#failAll(new CoreClientError('CORE_UNAVAILABLE', 'bridge closed'));
    try { this.lines?.close(); } catch { /* already closed */ }
    this.ready = false;
    this.process = null;
  }
}

export { BRIDGE_PATH, CORE_DIR, safeError };
