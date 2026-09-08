import { createHash, randomUUID } from 'node:crypto';
import { workProjection, compileWorkContext } from '../core/owner.mjs';
import { CoreClient, CoreClientError } from '../core/client.mjs';

const MAX_TITLE = 120;
const MAX_SOURCE = 100_000;
const MAX_ARTIFACT = 100_000;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expected, label) {
  if (!isRecord(value)) throw extensionError('INVALID_INPUT', `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw extensionError('INVALID_INPUT', `${label} has unsupported fields`);
  }
}

function keysWithin(value, allowed, label) {
  if (!isRecord(value)) throw extensionError('INVALID_INPUT', `${label} must be an object`);
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw extensionError('INVALID_INPUT', `${label} has unsupported fields`);
  }
}

function extensionError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function nonEmptyText(value, field, maxLength) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > maxLength || value.includes('\u0000')) {
    throw extensionError('INVALID_INPUT', `${field} is invalid`);
  }
  return value;
}

function identifier(value, field) {
  return nonEmptyText(value, field, 256).trim();
}

function nonNegativeInteger(value, field) {
  if (!Number.isInteger(value) || value < 0) throw extensionError('INVALID_INPUT', `${field} is invalid`);
  return value;
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function codePointSlice(text, start, end) {
  return Array.from(text).slice(start, end).join('');
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function bindingOf(value) {
  exactKeys(value, ['matterId'], 'binding');
  return { matterId: identifier(value.matterId, 'binding.matterId') };
}

function providerOf(value) {
  if (!isRecord(value)) throw extensionError('INVALID_INPUT', 'provider must be an object');
  const allowed = ['provider', 'model', 'api', 'baseUrl', 'executionMode', 'credentialStatus'];
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw extensionError('INVALID_INPUT', 'provider has unsupported fields');
  }
  if (typeof value.provider !== 'string' || typeof value.model !== 'string' || typeof value.api !== 'string') {
    throw extensionError('INVALID_INPUT', 'provider descriptor is incomplete');
  }
  const descriptor = {
    provider: identifier(value.provider, 'provider.provider'),
    model: identifier(value.model, 'provider.model'),
    api: identifier(value.api, 'provider.api'),
  };
  if (value.baseUrl !== undefined) descriptor.baseUrl = identifier(value.baseUrl, 'provider.baseUrl');
  descriptor.executionMode = value.executionMode ?? "simulation";
  descriptor.credentialStatus = value.credentialStatus ?? "not_configured";
  return descriptor;
}

function beginInputOf(value) {
  if (!isRecord(value)) throw extensionError('INVALID_INPUT', 'begin input must be an object');
  const allowed = ['runId', 'sessionId', 'binding', 'provider', 'instruction', 'projectId', 'runtimeProfile'];
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw extensionError('INVALID_INPUT', 'begin input has unsupported fields');
  }
  return {
    runId: identifier(value.runId, 'runId'),
    sessionId: identifier(value.sessionId, 'sessionId'),
    binding: bindingOf(value.binding),
    provider: providerOf(value.provider),
    instruction: nonEmptyText(value.instruction, 'instruction', 100_000),
    runtimeProfile: value.runtimeProfile ?? null,
  };
}

function sourceView(value) {
  if (!isRecord(value)) throw extensionError('CORE_INVALID', 'Core returned an invalid source');
  return {
    id: identifier(value.id, 'source.id'),
    version: nonNegativeInteger(value.version, 'source.version'),
    text: nonEmptyText(value.text, 'source.text', MAX_SOURCE),
    digest: identifier(value.digest, 'source.digest'),
  };
}

function currentSource(view, sourceId, version) {
  if (!Array.isArray(view?.sources)) throw extensionError('CORE_INVALID', 'Core returned no source set');
  const source = view.sources.find((item) => item?.id === sourceId && (version === undefined || item?.version === version));
  if (!source) throw extensionError('BINDING_MISMATCH', 'source is outside the bound Matter');
  return sourceView(source);
}

function normalizeRevision(value) {
  if (value === undefined) return undefined;
  if (Number.isInteger(value)) return nonNegativeInteger(value, 'revision');
  if (typeof value === 'string' && /^\d{1,9}$/u.test(value)) return Number(value);
  throw extensionError('INVALID_INPUT', 'revision is invalid');
}

function normalizeEvidence(item, view) {
  exactKeys(item, ['source_id', 'source_version', 'start', 'end', 'quote', 'digest'], 'evidence');
  const sourceId = identifier(item.source_id, 'evidence.source_id');
  const sourceVersion = nonNegativeInteger(item.source_version, 'evidence.source_version');
  const start = nonNegativeInteger(item.start, 'evidence.start');
  const end = nonNegativeInteger(item.end, 'evidence.end');
  if (end < start) throw extensionError('INVALID_INPUT', 'evidence range is reversed');
  const quote = nonEmptyText(item.quote, 'evidence.quote', MAX_SOURCE);
  const digest = identifier(item.digest, 'evidence.digest');
  const source = currentSource(view, sourceId, sourceVersion);
  if (digest !== source.digest || codePointSlice(source.text, start, end) !== quote) {
    throw extensionError('EVIDENCE_INVALID', 'evidence does not match the approved source');
  }
  return { source_id: sourceId, source_version: sourceVersion, start, end, quote, digest };
}

function normalizeObligation(item, view) {
  exactKeys(item, ['id', 'text', 'status', 'blocking', 'evidence_refs'], 'obligation');
  const result = {
    id: identifier(item.id, 'obligation.id'),
    text: nonEmptyText(item.text, 'obligation.text', MAX_SOURCE),
    status: identifier(item.status, 'obligation.status'),
    blocking: item.blocking,
    evidence_refs: item.evidence_refs,
  };
  if (typeof result.blocking !== 'boolean' || !Array.isArray(result.evidence_refs)) {
    throw extensionError('INVALID_INPUT', 'obligation is invalid');
  }
  result.evidence_refs = result.evidence_refs.map((evidence) => normalizeEvidence(evidence, view));
  return result;
}

function normalizeCandidateInput(value, view) {
  exactKeys(value, ['artifact_text', 'evidence', 'obligations'], 'candidate proposal');
  const artifactText = nonEmptyText(value.artifact_text, 'artifact_text', MAX_ARTIFACT);
  if (artifactText.startsWith('/') || artifactText.includes('../') || artifactText.includes('..\\') || artifactText.includes('://')) {
    throw extensionError('INVALID_INPUT', 'artifact_text cannot reference an external path');
  }
  if (!Array.isArray(value.evidence) || !Array.isArray(value.obligations)) {
    throw extensionError('INVALID_INPUT', 'candidate evidence and obligations must be arrays');
  }
  return {
    artifact_text: artifactText,
    evidence: value.evidence.map((item) => normalizeEvidence(item, view)),
    obligations: value.obligations.map((item) => normalizeObligation(item, view)),
  };
}



function coreProviderConfig(provider) {
  const config = {
    provider: provider.provider,
    model: provider.model,
    api: provider.api,
    credentialStatus: provider.credentialStatus,
    executionMode: provider.executionMode,
  };
  if (provider.baseUrl !== undefined) config.baseUrl = provider.baseUrl;
  return config;
}

function safeError(error, fallback = 'EXTENSION_ERROR') {
  const code = typeof error?.code === 'string' ? error.code : fallback;
  return { code, message: typeof error?.message === 'string' ? error.message : String(error) };
}

export class WorkExtension {
  constructor({ dataDir, core, manifest, contractVersion, presetVersion, domain = null }) {
    if (typeof dataDir !== 'string' || dataDir.trim() === '') throw new TypeError('dataDir is required');
    this.dataDir = dataDir;
    this.descriptor = manifest;
    this.contractVersion = contractVersion;
    this.presetVersion = presetVersion;
    this.domain = domain;
    this.ownsCore = !core;
    this.core = core ?? new CoreClient({ dataDir });
    this.started = false;
    this.disposed = false;
    this.activeRuns = new Map();
  }

  get manifest() {
    return this.descriptor;
  }

  async start() {
    if (this.disposed) throw extensionError('EXTENSION_DISPOSED', 'extension is disposed');
    if (!this.started) {
      await this.core.start();
      this.started = true;
    }
    return this.manifest;
  }

  async createBinding(input) {
    exactKeys(input, this.domain ? ['title','sourceText','facts'] : ['title', 'sourceText'], 'binding input');
    const title = nonEmptyText(input.title, 'title', MAX_TITLE).trim();
    const sourceText = nonEmptyText(input.sourceText, 'sourceText', MAX_SOURCE);
    const domain = this.domain?.bindingData(input) ?? null;
    await this.start();
    const matterId = `matter-${randomUUID()}`;
    const sourceId = `source-${randomUUID()}`;
    await this.core.createMatter({
      matterId,
      title,
      source: { id: sourceId, version: 1, text: sourceText, digest: sha256(sourceText) },
      contractVersion: this.contractVersion,
      domain,
      draft: '',
    });
    return { matterId };
  }

  async projection(binding) {
    const safeBinding = bindingOf(binding);
    await this.start();
    const view = await this.core.snapshot(safeBinding.matterId);
    const projected = workProjection(view,{extension:{id:this.manifest.id,version:this.manifest.version,releaseStatus:this.manifest.releaseStatus},contractVersion:this.contractVersion,writable:view.matter.contract_version===this.contractVersion});
    return this.domain?.project ? this.domain.project(projected,view) : projected;
  }

  async begin(input) {
    const context = beginInputOf(input);
    await this.start();
    if (this.activeRuns.has(context.runId)) throw extensionError('CONFLICT', 'Run is already bound');
    const view = await this.core.snapshot(context.binding.matterId);
    const matter = view.matter;
    if (matter.contract_version !== this.contractVersion) throw extensionError("CONTRACT_UNSUPPORTED", "bound work contract is not supported");
    const compiledContext = compileWorkContext(view);
    compiledContext.provenance.runtimeProfile = context.runtimeProfile;
    const domainContext = this.domain?.context(view) ?? "";
    if (domainContext.length + JSON.stringify(compiledContext).length > 90000) throw extensionError("CONTEXT_BUDGET","domain context exceeds budget");
    const run = await this.core.createRun({
      runId: context.runId,
      matterId: context.binding.matterId,
      baseVersion: matter.version,
      sourceVersion: matter.source_version,
      contractVersion: matter.contract_version,
      presetVersion: this.presetVersion,
      sessionRef: context.sessionId,
      instruction: context.instruction,
      provider: context.provider.provider,
      model: context.provider.model,
      providerConfig: coreProviderConfig(context.provider),
      workContext: compiledContext,
    });
    const state = {
      runId: context.runId,
      sessionId: context.sessionId,
      binding: context.binding,
      matter,
      provider: context.provider,
      instruction: context.instruction,
      admissionOpen: true,
      closed: false,
      closePromise: null,
      finished: false,
      finishResult: null,
      candidateRefs: [],
    };
    this.activeRuns.set(context.runId, state);
    const readSource = async (args) => this.#readSource(state, args);
    const submitCandidate = async (args, execution) => this.#submitCandidate(state, args, execution);
    const close = async (reason = 'cancel') => this.#closeRun(state, reason);
    const finish = async (result) => this.#finishRun(state, result);
    return {
      context: [
        JSON.stringify(compiledContext),
        `This is the ${this.manifest.title} development extension.`,
        domainContext,
        `Matter: ${context.binding.matterId}.`,
        'Use se_read_source to inspect the approved source and se_submit_candidate to propose a memo.',
        'Candidate submission is pending human Review; it never accepts or publishes an Artifact.',
      ].join(' '),
      tools: [
        {
          name: 'se_read_source',
          description: 'Read one source from the current approved Matter source set.',
          parameters: {
            type: 'object',
            additionalProperties: false,
            required: ['sourceId'],
            properties: {
              sourceId: { type: 'string', minLength: 1 },
              revision: { anyOf: [{ type: 'integer', minimum: 0 }, { type: 'string', pattern: '^[0-9]{1,9}$' }] },
            },
          },
          execute: readSource,
        },
        {
          name: 'se_submit_candidate',
          description: 'Submit a source-backed memo Candidate for human Review.',
          parameters: this.domain?.proposalSchema ?? {
            type: 'object',
            additionalProperties: false,
            required: ['artifact_text', 'evidence', 'obligations'],
            properties: {
              artifact_text: { type: 'string', minLength: 1, maxLength: MAX_ARTIFACT },
              evidence: { type: 'array' },
              obligations: { type: 'array' },
            },
          },
          execute: submitCandidate,
        },
      ],
      close,
      finish,
      reconcile: () => this.#reconcileRun(state),
    };
  }

  async #readSource(state, input) {
    if (!state.admissionOpen || state.closed) throw extensionError('CANDIDATE_CLOSED', 'Run admission is closed');
    keysWithin(input, ['sourceId', 'revision'], 'se_read_source input');
    if (!Object.prototype.hasOwnProperty.call(input, 'sourceId')) throw extensionError('INVALID_INPUT', 'sourceId is required');
    const sourceId = identifier(input.sourceId, 'sourceId');
    const revision = normalizeRevision(input.revision);
    const view = await this.core.snapshot(state.binding.matterId);
    const source = currentSource(view, sourceId, revision);
    const result = await this.core.readSource({
      matterId: state.binding.matterId,
      runId: state.runId,
      sourceId: source.id,
      version: source.version,
    });
    return sourceView(result);
  }

  async #submitCandidate(state, input, execution = {}) {
    if (!state.admissionOpen || state.closed) throw extensionError('CANDIDATE_CLOSED', 'Run admission is closed');
    const view = await this.core.snapshot(state.binding.matterId);
    const proposal = this.domain ? this.domain.normalizeProposal(input,view) : normalizeCandidateInput(input, view);
    const candidate = {
      id: execution.toolCallId ? `candidate-${sha256(`${state.runId}:${identifier(execution.toolCallId,"toolCallId")}`)}` : `candidate-${randomUUID()}`,
      matter_id: state.binding.matterId,
      run_id: state.runId,
      base_version: state.matter.version,
      contract_version: state.matter.contract_version,
      source_version: state.matter.source_version,
      ...proposal,
    };
    const result = await this.core.saveCandidate({
      matterId: state.binding.matterId,
      runId: state.runId,
      payload: candidate,
    });
    if (!state.candidateRefs.includes(result.candidate_id)) state.candidateRefs.push(result.candidate_id);
    return { candidateId: result.candidate_id, status: result.status };
  }

  async #closeRun(state, reason) {
    if (state.finished) return { closed: true };
    if (state.closePromise) return state.closePromise;
    if (!['cancel', 'session_closed', 'reload'].includes(reason)) throw extensionError('INVALID_INPUT', 'close reason is invalid');
    state.admissionOpen = false;
    state.closed = true;
    state.closePromise = (async () => {
      await this.core.updateRun({
        runId: state.runId,
        status: 'stopping',
        admissionOpen: false,
        error: null,
        candidateId: null,
        endedAt: null,
      });
      return { closed: true };
    })();
    try {
      return await state.closePromise;
    } catch (error) {
      state.closePromise = null;
      throw error;
    }
  }

  async #reconcileRun(state) {
    // A finish acknowledgement may be lost. Inspect durable state, never
    // replay the finisher or overwrite a terminal outcome already committed.
    let run = await this.core.getRun(state.runId);
    if (!['completed', 'failed', 'cancelled', 'unknown'].includes(run.status)) {
      run = await this.core.updateRun({ runId: state.runId, status: 'unknown',
        admissionOpen: false, error: { code: 'extension_finish_failed' } });
    }
    state.admissionOpen = false;
    state.closed = true;
    state.finished = true;
    state.finishResult = { status: 'unknown', candidateRefs: [...state.candidateRefs], run };
    this.activeRuns.delete(state.runId);
    return clone(state.finishResult);
  }

  async #finishRun(state, result) {
    if (state.finished) return clone(state.finishResult);
    keysWithin(result, ['status', 'candidateRefs', 'errorCode'], 'finish result');
    if (!Object.prototype.hasOwnProperty.call(result, 'status')) throw extensionError('INVALID_INPUT', 'finish status is required');
    if (!['succeeded', 'failed', 'canceled', 'unknown'].includes(result.status)) {
      throw extensionError('INVALID_INPUT', 'finish status is invalid');
    }
    if (result.candidateRefs !== undefined && (!Array.isArray(result.candidateRefs) || result.candidateRefs.some((id) => typeof id !== 'string'))) {
      throw extensionError('INVALID_INPUT', 'candidateRefs is invalid');
    }
    if (result.errorCode !== undefined) identifier(result.errorCode, 'errorCode');
    if (!state.closePromise && result.status !== 'succeeded') await this.#closeRun(state, result.status === 'canceled' ? 'cancel' : 'session_closed');
    if (state.closePromise) await state.closePromise;
    const refs = result.candidateRefs ?? state.candidateRefs;
    const coreStatus = result.status === 'succeeded' ? 'completed' : result.status === 'canceled' ? 'cancelled' : result.status;
    const updated = await this.core.updateRun({
      runId: state.runId,
      status: coreStatus,
      admissionOpen: false,
      error: result.errorCode ? { code: result.errorCode } : null,
      candidateId: refs[0] ?? null,
      endedAt: null,
    });
    state.finished = true;
    state.finishResult = { status: result.status, candidateRefs: [...refs], run: updated };
    this.activeRuns.delete(state.runId);
    return clone(state.finishResult);
  }

  async humanAction(input) {
    exactKeys(input, ['binding', 'actor', 'action', 'payload'], 'human action');
    const binding = bindingOf(input.binding);
    if (input.actor !== 'local-user') throw extensionError('ACTOR_DENIED', 'only local-user may Review');
    await this.start();
    if (['save_draft','revise_candidate','replace_sources'].includes(input.action)) {
      const view = await this.core.snapshot(binding.matterId);
      if (view.matter.contract_version !== this.contractVersion || (view.domain && view.domain.schemaVersion !== 1)) throw extensionError('CONTRACT_UNSUPPORTED','bound work contract is not supported');
    }
    if (input.action === 'save_draft') {
      exactKeys(input.payload, ['text'], 'save_draft payload');
      if (typeof input.payload.text !== 'string' || input.payload.text.length > MAX_SOURCE || input.payload.text.includes('\u0000')) {
        throw extensionError('INVALID_INPUT', 'draft is invalid');
      }
      return this.core.saveDraft(binding.matterId, input.payload.text);
    }
    if (input.action === 'revise_candidate') {
      exactKeys(input.payload, ['candidate_id','new_candidate_id','base_version','proposal'], 'revision');
      const view = await this.core.snapshot(binding.matterId);
      const proposal = this.domain ? this.domain.normalizeProposal(input.payload.proposal,view) : normalizeCandidateInput(input.payload.proposal, view);
      return this.core.call('revise_candidate',{matter_id:binding.matterId,...input.payload,proposal});
    }
    if (input.action === 'query_request') {
      exactKeys(input.payload, ['request_id'], 'query request');
      const result = await this.core.queryRequest(input.payload.request_id);
      if (result && result.matter_id !== binding.matterId) throw extensionError('BINDING_MISMATCH', 'request belongs to another Matter');
      return result;
    }
    if (input.action === 'read_source_history') {
      exactKeys(input.payload, ['candidate_id','source_id','version'], 'historical source');
      return this.core.call('historical_source', {matter_id:binding.matterId,...input.payload});
    }
    if (input.action === 'replace_sources') {
      exactKeys(input.payload, ['sources','revision'], 'source replacement');
      return this.core.call('replace_sources', {matter_id:binding.matterId,...input.payload});
    }
    if (input.action === 'decide') {
      const view = await this.core.snapshot(binding.matterId);
      const receipt = await this.core.queryRequest(input.payload.request_id);
      if (!receipt) {
        if (view.matter.contract_version !== this.contractVersion) throw extensionError('CONTRACT_UNSUPPORTED','bound work contract is not supported');
        await this.domain?.validateDecision?.(input.payload,view);
      }

      exactKeys(input.payload, ['request_id', 'candidate_id', 'base_version', 'action', 'reason'], 'decide payload');
      const request = {
        ...input.payload,
        matter_id: binding.matterId,
      };
      return this.core.decide(request);
    }
    throw extensionError('UNSUPPORTED_ACTION', 'human action is unsupported');
  }

  async dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const state of this.activeRuns.values()) {
      try { await this.#closeRun(state, 'reload'); } catch { /* host records unknown when close cannot be made durable */ }
    }
    if (this.ownsCore) await this.core.close();
    this.activeRuns.clear();
    this.started = false;
  }
}

export { CoreClientError };
