import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { boot } from './helpers.mjs';
import { PREVIEW_LIMITS } from '../server/provider-preview.mjs';

test('provider preview HTTP contract, bounds, authentication and unchanged runtime', async () => {
  const ctx = await boot();
  const requests = [];
  const secret = 'synthetic-preview-secret';
  let finishByteStream;
  const byteStreamClosed = new Promise(resolve => { finishByteStream = resolve; });
  const upstream = http.createServer((req, res) => {
    requests.push({ url: req.url, authorization: req.headers.authorization });
    const mode = req.url.split('/')[1];
    if (mode === 'bytes') {
      // No Content-Length, and never naturally ends: the client must stop reading.
      const interval = setInterval(() => res.write('x'.repeat(16384)), 2);
      res.on('close', () => { clearInterval(interval); finishByteStream(); });
      return;
    }
    if (mode === 'timeout') return;
    if (mode === 'slowbody') { res.writeHead(200); res.write('{'); return; }
    if (mode === 'redirect') { res.writeHead(302, { location: '/trap/models' }); res.end(secret); return; }
    if (/^status\d+$/.test(mode)) { res.writeHead(Number(mode.slice(6))); res.end(secret); return; }
    const payload = {
      valid: { data: [{ id: 'model-a', contextWindow: 123, reasoning: true, name: secret }] },
      empty: { data: [] },
      malformed: { models: [] },
      count: { data: Array.from({length: PREVIEW_LIMITS.models + 1}, (_, i) => ({ id: `m${i}` })) },
      field: { data: [{ id: 'x'.repeat(PREVIEW_LIMITS.modelId + 1) }] },
      echo: { data: [{ id: secret }] },
      duplicate: { data: [{ id: 'same' }, { id: 'same' }] },
      control: { data: [{ id: 'bad\nname' }] },
      nonstring: { data: [{ id: 12 }] },
    }[mode];
    res.end(mode === 'json' ? '{' : JSON.stringify(payload));
  });
  await new Promise(r => upstream.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${upstream.address().port}`;
  const session = await ctx.createSession();
  const started = await ctx.api('POST', `/sessions/${session.id}/runs`, {input: 'hello', commandId: 'preview-existing-run'});
  assert.equal((await ctx.pollRun(started.json.run.id)).status, 'completed');
  const snapshot = async () => ({
    config: await ctx.api('GET', '/provider-config'),
    catalog: await ctx.api('GET', '/provider-models'),
    session: await ctx.api('GET', `/sessions/${session.id}`),
    runs: ctx.runtime.store.listRuns(),
    credentials: await readFile(path.join(ctx.dataDir, 'credentials.json'), 'utf8'),
    state: await readFile(path.join(ctx.dataDir, 'runtime-state.json'), 'utf8'),
    generation: ctx.runtime.service.credentialGeneration,
    models: ctx.runtime.modelRuntime.getModels(),
  });
  const before = await snapshot();
  const input = mode => ({ protocol: 'openai-compatible', baseUrl: `${origin}/${mode}/v1/`, apiKey: secret });
  try {
    for (const endpoint of ['/provider-models/discover', '/provider-connection/test']) {
      const denied = await fetch(ctx.runtime.url + '/api/v5' + endpoint, { method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(input('valid')) });
      assert.equal(denied.status, 401);
      assert.equal(requests.length, 0);
    }
    const discovered = await ctx.api('POST', '/provider-models/discover', input('valid'));
    assert.equal(discovered.status, 200);
    assert.deepEqual(discovered.json.models, [{id: 'model-a'}]);
    assert.equal(discovered.json.status, 'ok');
    assert.deepEqual(requests[0], {url: '/valid/v1/models', authorization: `Bearer ${secret}`});
    const handshake = await ctx.api('POST', '/provider-connection/test', input('valid'));
    assert.equal(handshake.json.check, 'model-directory');
    assert.deepEqual(handshake.json.models, []);
    assert.equal(handshake.json.operation, 'test');
    for (const [mode, expected] of Object.entries({empty:'ok',status401:'authentication_failed',status403:'authentication_failed',status404:'unsupported',status405:'unsupported',status501:'unsupported',status500:'http_error',redirect:'redirect_rejected',malformed:'malformed_directory',json:'malformed_directory',count:'malformed_directory',field:'malformed_directory',echo:'malformed_directory',duplicate:'malformed_directory',control:'malformed_directory',nonstring:'malformed_directory',bytes:'response_too_large',timeout:'timeout',slowbody:'timeout'})) {
      const reply = await ctx.api('POST', '/provider-models/discover', input(mode));
      assert.equal(reply.status, 200, mode);
      assert.equal(reply.json.status, expected, mode);
      assert.ok(!JSON.stringify(reply).includes(secret), mode);
      assert.ok(!JSON.stringify(reply).includes(origin), mode);
    }
    await byteStreamClosed;
    assert.ok(!requests.some(r => r.url.startsWith('/trap')));
    const countBeforeInvalid = requests.length;
    for (const invalid of [null, [], {}, {...input('valid'), protocol:'ollama'}, {...input('valid'), extra:true}, {...input('valid'), apiKey:null}, {...input('valid'), apiKey:''}, {...input('valid'), apiKey:'bad\nkey'}, {...input('valid'), apiKey:'x'.repeat(4097)}, ...['ftp://example.com', `${origin}/?secret=x`, `${origin}/#secret`, `${origin}/?`, `http://u:p@127.0.0.1`, ' http://example.com', 'http:\\example.com', 'http://@example.com', `${origin}/x y`].map(baseUrl => ({...input('valid'), baseUrl}))]) {
      const reply = await ctx.api('POST', '/provider-models/discover', invalid);
      assert.equal(reply.status, 400);
      assert.ok(!JSON.stringify(reply).includes(secret));
    }
    assert.equal(requests.length, countBeforeInvalid);
    const noKey = input('valid'); delete noKey.apiKey; noKey.baseUrl = `${origin}/valid/v1`;
    assert.equal((await ctx.api('POST', '/provider-models/discover', noKey)).json.status, 'ok');
    assert.equal(requests.at(-1).authorization, undefined, 'saved credential never becomes probe auth');
    upstream.closeAllConnections();
    await new Promise(r => upstream.close(r));
    assert.equal((await ctx.api('POST', '/provider-connection/test', input('valid'))).json.status, 'unreachable');
    assert.deepEqual(await snapshot(), before, 'preview must not mutate durable or in-memory bindings/catalog');
    assert.ok(!JSON.stringify(ctx.logs).includes(secret));
  } finally {
    upstream.closeAllConnections();
    if (upstream.listening) await new Promise(r => upstream.close(r));
    await ctx.runtime.close();
    await rm(ctx.dataDir, {recursive:true, force:true});
  }
});
