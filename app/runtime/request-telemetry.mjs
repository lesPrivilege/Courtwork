// Measurements at the host's semantic-stream boundary. No provider token clock
// or tokenizer is inferred from a text chunk. This observer leaves the Pi stream
// and its final result under their original owner.
export function estimateRequestContext(context) {
  try {
    const characters = JSON.stringify({systemPrompt: context.systemPrompt || '', messages: context.messages || [], tools: context.tools || []}).length;
    return { method: 'serialized-request-utf16-chars-divided-by-4', characters, estimatedTokens: Math.ceil(characters / 4), exact: false };
  } catch { return null; }
}

export async function observeRequestStream({ start, model, context, requestId, purpose = 'agent', requestedEffort = null,
  effectiveEffort = null, record = () => {}, now = () => performance.now(), wallNow = () => new Date().toISOString() }) {
  const began = now();
  const identity = { schemaVersion: 1, requestId, source: 'host-semantic-stream', purpose,
    requestedModel: {provider:model.provider, model:model.id, api:model.api}, requestedEffort, effectiveEffort,
    startedAt: wallNow(), context: estimateRequestContext(context), contextWindow: Number.isSafeInteger(model.contextWindow) ? model.contextWindow : null };
  let firstOutputMs = null, firstTextMs = null, finalized = false;
  const elapsed = () => Math.max(0, Math.round((now() - began) * 1000) / 1000);
  const emit = (phase, extra = {}) => record({...identity, phase, elapsedMs: elapsed(), firstOutputMs, firstTextMs,
    providerTtftMs: null, decodeTokensPerSecond: null, missing: ['provider_token_timing', 'token_deltas'], ...extra});
  emit('started');
  let stream;
  try { stream = await start(); }
  catch (error) { emit('failed', { usage:null, observedModel:null }); throw error; }
  return {
    result: () => stream.result(),
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
            finalized = true;
            const message = event.type === 'done' ? event.message : event.error;
            const usage = event.type === 'done' && message?.usage ? Object.fromEntries(['input','output','cacheRead','cacheWrite'].map(key => [key, Number.isSafeInteger(message.usage[key]) && message.usage[key] >= 0 ? message.usage[key] : null])) : null;
            emit(event.type === 'done' ? 'completed' : message?.stopReason === 'aborted' ? 'cancelled' : 'failed', {
              usage, observedModel: message?.model ? {provider:message.provider || null, model:message.model, api:message.api || null} : null,
              finishedAt: wallNow(),
            });
          }
          yield event;
        }
      } finally {
        if (!finalized) emit('interrupted', {usage:null, observedModel:null, finishedAt:wallNow()});
      }
    },
  };
}
