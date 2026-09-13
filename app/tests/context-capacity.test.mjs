import test from 'node:test';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { contextCapacitySnapshot, createContextUsageObserver, reportedInputTokens, reportedCache } from '../runtime/context-capacity.mjs';
import { observeRequestStream } from '../runtime/request-telemetry.mjs';
import { projectContextCapacity, contextRing, renderCacheDiagnostic, renderChatMeasurementBody } from '../web/chat-measurements.mjs';
import { withTinyDom } from './tiny-dom.mjs';
import { boot } from './helpers.mjs';
const encoder = new TextEncoder();
const sse = (events, eol = '\r\n') => events.map(event => `data: ${JSON.stringify(event)}${eol}${eol}`).join('');
function response(text, chunkSize = 7) {
  const bytes = encoder.encode(text); let offset = 0;
  return new Response(new ReadableStream({ pull(controller) {
    if (offset >= bytes.length) { controller.close(); return; }
    controller.enqueue(bytes.slice(offset, offset += chunkSize));
  } }), { headers: { 'content-type': 'text/event-stream' } });
}

test('adapter reads inclusive input once, preserves explicit zero, and never uses output/cache/estimated totals', () => {
  assert.equal(reportedInputTokens('openai-completions', { usage: { prompt_tokens: 120, completion_tokens: 30, prompt_cache_hit_tokens: 100 } }), 120);
  assert.equal(reportedInputTokens('openai-responses', { type: 'response.completed', response: { usage: { input_tokens: 120, input_tokens_details: { cached_tokens: 100 }, output_tokens: 30 } } }), 120);
  assert.equal(reportedInputTokens('openai-completions', { choices: [{ usage: { prompt_tokens: 0 } }] }), 0);
  for (const value of [undefined, null, -1, 1.5, '100', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
    assert.equal(reportedInputTokens('openai-completions', { usage: { prompt_tokens: value, completion_tokens: 20 } }), null);
  assert.equal(reportedInputTokens('unknown-api', { usage: { prompt_tokens: 100 } }), null);
  assert.equal(contextCapacitySnapshot({}).contextWindow, 1_000_000);
  assert.equal(contextCapacitySnapshot({}).windowSource, 'default-registration');
  assert.equal(contextCapacitySnapshot({ contextWindow: 32_768 }, 8_192).windowSource, 'model-declared');
});

test('SSE adapter preserves bytes across chunk boundaries and clears usage for each retry', async () => {
  let body = sse([{ choices: [{ delta: { content: 'private fixture text' } }] }, { usage: { prompt_tokens: 250_000 } }]);
  const observer = createContextUsageObserver('openai-completions', async () => response(body));
  assert.equal(await (await observer.fetch('local')).text(), body);
  assert.equal(observer.read(), 250_000);
  body = 'data: {broken}\n\ndata: [DONE]\n\n';
  assert.equal(await (await observer.fetch('local')).text(), body);
  assert.equal(observer.read(), null);
  body = sse([{ usage: { prompt_tokens: 0 } }], '\n');
  await (await observer.fetch('local')).text(); assert.equal(observer.read(), 0);
});

test('bounded observer recovers after oversized frames and forwards stream errors', async () => {
  const text = sse([{ content: 'x'.repeat(1_100_000) }, { usage: { prompt_tokens: 9 } }], '\n');
  const observer = createContextUsageObserver('openai-completions', async () => response(text, 8192));
  assert.equal(await (await observer.fetch('local')).text(), text);
  assert.equal(observer.read(), 9);
  const error = new Error('fixture stream failure');
  const broken = createContextUsageObserver('openai-completions', async () => new Response(new ReadableStream({ pull(controller) { controller.error(error); } }), { headers: { 'content-type': 'text/event-stream' } }));
  await assert.rejects((await broken.fetch('local')).text(), /fixture stream failure/);
});

test('request binding exposes measured capacity only when completed, with no normalized-zero fallback', async () => {
  for (const phase of ['done', 'error']) {
    const rows = [], message = { stopReason: phase === 'done' ? 'stop' : 'error', usage: { input: 0, output: 1 } };
    const stream = await observeRequestStream({ model: { id: 'm', provider: 'p', api: 'openai-completions' }, context: {}, requestId: 1,
      readContextUsage: () => 250_000, record: value => rows.push(value),
      start: () => ({ result: () => message, async *[Symbol.asyncIterator]() { yield phase === 'done' ? { type: phase, message } : { type: phase, error: message }; } }) });
    await Array.fromAsync(stream);
    assert.equal(rows[0].contextCapacity.usedTokens, null);
    assert.equal(rows.at(-1).contextCapacity.usedTokens, phase === 'done' ? 250_000 : null);
    assert.equal(rows.at(-1).contextCapacity.contextWindow, 1_000_000);
  }
});

test('ring projects completed request scope, zero, overflow and unknown without using heuristics', () => withTinyDom(() => {
  const row = { phase: 'completed', contextCapacity: contextCapacitySnapshot({}, 250_000) };
  assert.equal(projectContextCapacity(row).ratio, .25);
  const ring = contextRing(projectContextCapacity(row));
  assert.equal(ring.querySelectorAll('circle').length, 2);
  assert.ok(ring.querySelector('[stroke-dasharray]'));
  assert.equal(contextRing().querySelector('[stroke-dasharray]'), null);
  assert.equal(projectContextCapacity({ ...row, phase: 'streaming' }).ratio, null);
  assert.equal(projectContextCapacity({ phase: 'completed', context: { estimatedTokens: 250000 }, usage: { input: 250000 } }), null);
  assert.equal(projectContextCapacity({ ...row, contextCapacity: contextCapacitySnapshot({}, 0) }).ratio, 0);
  assert.equal(projectContextCapacity({ ...row, contextCapacity: contextCapacitySnapshot({}, 1_500_000) }).ratio, 1.5);
  assert.equal(projectContextCapacity({ ...row, contextCapacity: { ...row.contextCapacity, scope: 'session-total' } }), null);
}));

test('real local SDK transport persists request-input capacity with the recorded model window', async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const result = await h.api('POST', `/sessions/${session.id}/runs`, { input: 'context capacity fixture', commandId: randomUUID() });
    assert.equal(result.status, 200);
    await h.pollRun(result.json.run.id);
    const events = (await h.api('GET', `/sessions/${session.id}/events`)).json.events;
    const row = events.filter(event => event.type === 'runtime.request.telemetry' && event.data.phase === 'completed').at(-1)?.data;
    assert.ok(row, 'completed telemetry reached the store');
    assert.equal(row.contextCapacity.scope, 'request-input');
    assert.equal(row.contextCapacity.windowSource, 'model-declared');
    assert.equal(row.contextCapacity.contextWindow, row.contextWindow);
    assert.ok(Number.isSafeInteger(row.contextCapacity.usedTokens));
  } finally { await h.runtime.close(); }
});

test('cache diagnostics separate hit/miss from capacity and preserve missing versus zero', () => withTinyDom(() => {
  const read = raw => reportedCache('openai-completions', { usage: raw });
  assert.equal(renderCacheDiagnostic(read({ prompt_tokens: 1000 })), null);
  const full = read({ prompt_tokens: 224500, prompt_cache_hit_tokens: 182400, prompt_cache_miss_tokens: 42100, prompt_tokens_details: { cache_write_tokens: 12000 } });
  assert.equal(full.total_tokens, 224500);
  assert.equal(full.hit_rate, 182400 / 224500);
  assert.equal(full.miss_tokens, 42100, 'cache writes stay orthogonal to cache-read hit/miss');
  const rendered = renderCacheDiagnostic(full);
  assert.ok(rendered.querySelector('svg'));
  assert.match(rendered.textContent, /Hit 182,400.*Miss 42,100/);
  const zero = read({ prompt_tokens: 100, prompt_tokens_details: { cached_tokens: 0 } });
  assert.equal(zero.hit_rate, 0); assert.match(renderCacheDiagnostic(zero).textContent, /0%/);
  const partial = read({ prompt_cache_hit_tokens: 20 });
  assert.equal(partial.hit_rate, undefined);
  assert.equal(renderCacheDiagnostic(partial).querySelector('svg'), null);
  assert.match(renderCacheDiagnostic(partial).textContent, /20 tokens/);
  const mismatch = read({ prompt_tokens: 10, prompt_cache_hit_tokens: 9, prompt_cache_miss_tokens: 8 });
  assert.equal(mismatch.hit_rate, undefined);
  assert.equal(renderCacheDiagnostic(mismatch).querySelector('svg'), null);
  assert.equal(renderCacheDiagnostic({ ...full, scope: 'session' }), null);
  assert.equal(read({ prompt_tokens: 0, prompt_cache_hit_tokens: 0 }).hit_rate, undefined);
  const responses = reportedCache('openai-responses', { type: 'response.completed', response: { usage: { input_tokens: 100, input_tokens_details: { cached_tokens: 80 } } } });
  assert.equal(responses.miss_tokens, 20); assert.equal(responses.hit_rate, .8);
}));


test('Context disclosure uses raw request diagnostics once; normalized request history stays in the measurement view', () => withTinyDom(async () => {
  const create = document.createElement.bind(document);
  document.createElement = tag => Object.assign(create(tag), { style: {} });
  const rows = [];
  const message = { stopReason: 'stop', usage: { input: 375000, output: 12, cacheRead: 375000, cacheWrite: 0 } };
  const stream = await observeRequestStream({ model: { id: 'fixture', provider: 'local', api: 'openai-completions' }, context: {}, requestId: 1,
    readContextUsage: () => 750000,
    readCache: () => reportedCache('openai-completions', { usage: { prompt_tokens: 750000, prompt_tokens_details: { cached_tokens: 375000 } } }),
    record: data => rows.push({ type: 'runtime.request.telemetry', runId: 'r', data }),
    start: () => ({ result: () => message, async *[Symbol.asyncIterator]() { yield { type: 'done', message }; } }) });
  await Array.fromAsync(stream);
  const facts = { events: rows, run: { id: 'r' } };
  const context = renderChatMeasurementBody('context', facts);
  assert.match(context.textContent, /750,000 \/ 1,000,000 tokens/);
  assert.match(context.textContent, /Cache hit.*50%/);
  assert.doesNotMatch(context.textContent, /Cache read|Cache write|Latest request ·/);
  assert.equal(context.querySelectorAll('[data-section="request-measurements"]').length, 0);
  const measurements = renderChatMeasurementBody('activity', facts);
  assert.match(measurements.textContent, /Cache read/);
  assert.match(measurements.textContent, /Input tokens/);
  rows.at(-1).data.cache = { status: 'unavailable', source: 'provider', scope: 'request' };
  assert.doesNotMatch(renderChatMeasurementBody('context', facts).textContent, /Cache hit|Cache read|Cache write|Runtime diagnostics/);
}));
