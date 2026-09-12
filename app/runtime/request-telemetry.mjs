// Measurements at the host's semantic-stream boundary. No provider token clock
// or tokenizer is inferred from a text chunk. This observer leaves the Pi stream
// and its final result under their original owner.
export function estimateRequestContext(context) {
  try {
    const characters = JSON.stringify({systemPrompt: context.systemPrompt || '', messages: context.messages || [], tools: context.tools || []}).length;
    return { method: 'serialized-request-utf16-chars-divided-by-4', characters, estimatedTokens: Math.ceil(characters / 4), exact: false };
  } catch { return null; }
}

// These are opaque identifiers, not headers or arbitrary provider metadata.
// Do not substitute message.model: Pi keeps the requested runtime identity
// there and may supply a different responseModel for a provider alias.
const responseIdentifier = value => typeof value === 'string' && value.length > 0
  && value.length <= 256 && value.trim() === value && !/[\u0000-\u001f\u007f-\u009f]/u.test(value) ? value : null;

const effortValues = new Set(['off','minimal','low','medium','high','xhigh','max']);
const capabilityKinds = new Set(['enum','unsupported','unknown']);
const capabilitySources = new Set(['runtime-catalog','user-declared','unknown']);

/** Copy only the small public capability binding needed to interpret request
 * effort fields later. Do not persist notices, arbitrary provider metadata, or
 * model descriptions in every request measurement. */
export function reasoningCapabilitySnapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const values = Array.isArray(value.values)
    ? [...new Set(value.values.filter(item => effortValues.has(item)))].sort((a, b) => [...effortValues].indexOf(a) - [...effortValues].indexOf(b))
    : [];
  return {
    kind: capabilityKinds.has(value.kind) ? value.kind : 'unknown',
    source: capabilitySources.has(value.source) ? value.source : 'unknown',
    values,
    defaultMode: value.defaultMode === 'omit' ? 'omit' : 'unknown',
    adapterVersion: typeof value.adapterVersion === 'string' && value.adapterVersion.length <= 120 ? value.adapterVersion : null,
    configVersion: Number.isSafeInteger(value.configVersion) && value.configVersion >= 0 ? value.configVersion : null,
  };
}

export async function observeRequestStream({ start, model, context, requestId, purpose = 'agent', requestedEffort = null,
  effectiveEffort = null, sdkEffectiveEffort = undefined, reasoningCapability = null,
  record = () => {}, now = () => performance.now(), wallNow = () => new Date().toISOString() }) {
  const began = now();
  const sdkEffort = sdkEffectiveEffort === undefined ? effectiveEffort : sdkEffectiveEffort;
  const identity = { schemaVersion: 1, requestId, source: 'host-semantic-stream', purpose,
    requestedModel: {provider:model.provider, model:model.id, api:model.api}, requestedEffort,
    // `effectiveEffort` remains as a historical v1 alias while consumers move
    // to the provenance-explicit field. It has always been Pi's session level,
    // never confirmation of a provider-applied setting.
    effectiveEffort: sdkEffort, sdkEffectiveEffort: sdkEffort,
    effectiveEffortSource: 'sdk-setting', providerEffectiveEffort: null,
    reasoningCapability: reasoningCapabilitySnapshot(reasoningCapability),
    startedAt: wallNow(), context: estimateRequestContext(context), contextWindow: Number.isSafeInteger(model.contextWindow) ? model.contextWindow : null };
  let firstOutputMs = null, firstTextMs = null, finalized = false;
  const elapsed = () => Math.max(0, Math.round((now() - began) * 1000) / 1000);
  const emit = (phase, extra = {}) => record({...identity, phase, elapsedMs: elapsed(), firstOutputMs, firstTextMs,
    providerTtftMs: null, decodeTokensPerSecond: null, missing: ['provider_token_timing', 'token_deltas'], ...extra});
  const finish = (type, message) => {
    if (finalized) return;
    finalized = true;
    const success = type === 'done';
    const usage = success && message?.usage
      ? Object.fromEntries(['input','output','cacheRead','cacheWrite'].map(key => [key, Number.isSafeInteger(message.usage[key]) && message.usage[key] >= 0 ? message.usage[key] : null]))
      : null;
    emit(success ? 'completed' : message?.stopReason === 'aborted' ? 'cancelled' : 'failed', {
      usage, observedModel: message?.model ? {provider:message.provider || null, model:message.model, api:message.api || null} : null,
      providerResponse: { source: 'sdk-response-metadata', model: responseIdentifier(message?.responseModel), id: responseIdentifier(message?.responseId) },
      finishedAt: wallNow(),
    });
  };
  const failResult = error => {
    if (finalized) return;
    finalized = true;
    emit(error?.name === 'AbortError' ? 'cancelled' : 'failed', {
      usage: null, observedModel: null, finishedAt: wallNow(),
    });
  };
  const finishResult = message => {
    finish(message?.stopReason === 'error' || message?.stopReason === 'aborted' ? 'error' : 'done', message);
    return message;
  };
  emit('started');
  let stream;
  try { stream = await start(); }
  catch (error) { emit('failed', { usage:null, observedModel:null }); throw error; }
  return {
    result() {
      let result;
      try {
        result = stream.result();
      } catch (error) {
        failResult(error);
        throw error;
      }
      return result && typeof result.then === 'function'
        ? result.then(finishResult, error => { failResult(error); throw error; })
        : finishResult(result);
    },
    async *[Symbol.asyncIterator]() {
      try {
        for await (const event of stream) {
          if (['text_delta','thinking_delta','toolcall_delta'].includes(event.type) && typeof event.delta === 'string' && event.delta.length) {
            let changed = false;
            if (firstOutputMs === null) { firstOutputMs = elapsed(); changed = true; }
            if (event.type === 'text_delta' && firstTextMs === null) { firstTextMs = elapsed(); changed = true; }
            if (changed) emit('streaming');
          }
          if (event.type === 'done' || event.type === 'error') {
            const message = event.type === 'done' ? event.message : event.error;
            finish(event.type, message);
          }
          yield event;
        }
      } finally {
        if (!finalized) {
          finalized = true;
          emit('interrupted', {usage:null, observedModel:null, finishedAt:wallNow()});
        }
      }
    },
  };
}
