// Request-input occupancy. The default is a display registration, never a
// provider capability, compaction threshold, or permission to send more input.
export const DEFAULT_CONTEXT_WINDOW = 1_000_000;
const tokens = value => Number.isSafeInteger(value) && value >= 0;
export function contextCapacitySnapshot(model, usedTokens = null) {
  const declared = Number.isSafeInteger(model?.contextWindow) && model.contextWindow > 0;
  return { version: 1, scope: 'request-input', source: 'provider-reported',
    usedTokens: tokens(usedTokens) ? usedTokens : null,
    contextWindow: declared ? model.contextWindow : DEFAULT_CONTEXT_WINDOW,
    windowSource: declared ? 'model-declared' : 'default-registration' };
}

// Read the protocol's inclusive input total directly. Pi's normalized input
// excludes caches; adding overlapping raw cache fields would count twice.
export function reportedInputTokens(api, event) {
  const value = api === 'openai-completions'
    ? (event?.usage ?? event?.choices?.[0]?.usage)?.prompt_tokens
    : api === 'openai-responses' && ['response.completed', 'response.incomplete'].includes(event?.type)
      ? event?.response?.usage?.input_tokens : null;
  return tokens(value) ? value : null;
}

// Thin canonical request diagnostic. Cache reuse is an attribute of input,
// never another resident-context segment. Missing raw fields remain absent.
export function reportedCache(api, event) {
  const raw = api === 'openai-completions' ? event?.usage ?? event?.choices?.[0]?.usage
    : api === 'openai-responses' && ['response.completed', 'response.incomplete'].includes(event?.type) ? event?.response?.usage : null;
  const result = { status: 'unavailable', source: 'provider', scope: 'request' };
  if (!raw) return result;
  const response = api === 'openai-responses';
  const details = response ? raw.input_tokens_details : raw.prompt_tokens_details;
  const hit = details?.cached_tokens ?? (!response ? raw.prompt_cache_hit_tokens ?? raw.cached_tokens : undefined);
  const miss = !response ? raw.prompt_cache_miss_tokens : undefined;
  const write = details?.cache_write_tokens;
  for (const [key, value] of [['hit_tokens', hit], ['miss_tokens', miss], ['write_tokens', write]])
    if (tokens(value)) result[key] = value;
  if (!['hit_tokens', 'miss_tokens', 'write_tokens'].some(key => key in result)) return result;
  result.status = 'available';
  const total = reportedInputTokens(api, event);
  if (tokens(hit) && tokens(miss) && !Number.isSafeInteger(hit + miss)) return result;
  const sum = tokens(hit) && tokens(miss) && Number.isSafeInteger(hit + miss) ? hit + miss : null;
  // Reject inconsistent denominators instead of silently rescaling them.
  if ((sum !== null && total !== null && sum !== total) || (tokens(hit) && total !== null && hit > total)) return result;
  const denominator = sum ?? total;
  if (denominator !== null) {
    result.total_tokens = denominator;
    if (tokens(hit)) {
      result.miss_tokens = denominator - hit;
      if (denominator > 0) {
        result.hit_rate = hit / denominator;
        result.rate_source = 'adapter-calculated';
        result.denominator = 'request-input';
      }
    }
  }
  return result;
}

// Public fetch seam for installed SSE adapters. Bytes, backpressure, abort and
// errors still belong to the SDK. Retain only a bounded event and numeric usage;
// no response text, headers, credentials or second reader are persisted.
export function createContextUsageObserver(api, fetcher = globalThis.fetch) {
  let usedTokens = null, cache = { status: 'unavailable', source: 'provider', scope: 'request' };
  return {
    read: () => usedTokens,
    readCache: () => structuredClone(cache),
    fetch: async (...args) => {
      cache = { status: 'unavailable', source: 'provider', scope: 'request' };
      usedTokens = null; // A retry must not inherit an earlier HTTP attempt.
      const response = await fetcher(...args);
      if (!['openai-completions', 'openai-responses'].includes(api) || !response.ok || !response.body || !response.headers.get('content-type')?.includes('text/event-stream')) return response;
      const decoder = new TextDecoder();
      let buffer = '', oversized = false;
      const inspect = frame => {
        const data = frame.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n');
        if (!data || data === '[DONE]') return;
        try {
          const event = JSON.parse(data);
          const nextCache = reportedCache(api, event);
          if (nextCache.status === 'available') cache = nextCache;
          const value = reportedInputTokens(api, event);
          if (value !== null) usedTokens = value;
        } catch { /* Malformed or unrelated events remain the SDK's concern. */ }
      };
      const consume = text => {
        buffer += text;
        let boundary;
        while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
          const frame = buffer.slice(0, boundary.index);
          if (!oversized && frame.length <= 1_048_576) inspect(frame);
          buffer = buffer.slice(boundary.index + boundary[0].length); oversized = false;
        }
        if (buffer.length > 1_048_576) { buffer = buffer.slice(-3); oversized = true; }
      };
      const body = response.body.pipeThrough(new TransformStream({
        transform(chunk, controller) { consume(decoder.decode(chunk, { stream: true })); controller.enqueue(chunk); },
        flush() { consume(decoder.decode()); buffer = ''; },
      }));
      return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
    },
  };
}
