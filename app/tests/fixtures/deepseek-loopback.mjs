import http from 'node:http';

export const MODEL = 'deepseek-v4-flash'; // Installed Pi 0.85.1 catalog, not a live alias claim.
export const output = 'Written after exact approval through the DeepSeek protocol fixture.';
export async function fixture({ mode = 'conversation', responseModel = MODEL } = {}) {
  const requests = [];
  let arrived;
  const firstRequest = new Promise(resolve => { arrived = resolve; });
  const server = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    requests.push({ path: req.url, body }); arrived();
    const n = requests.length;
    if (mode === 'error' || (mode === 'missing-metadata' && n > 1)) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'synthetic required protocol metadata missing', type: 'invalid_request_error', code: 'invalid_request' } })); return;
    }
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    const send = (delta, finish_reason = null, usage) => res.write(`data: ${JSON.stringify({ id: `ds-${n}`, object: 'chat.completion.chunk', created: 1, model: responseModel, choices: [{ index: 0, delta, finish_reason }], ...(usage ? { usage } : {}) })}\n\n`);
    if (mode !== 'missing-metadata') send({ role: 'assistant', reasoning_content: `protocol-r${n}` });
    if (mode === 'cancel') { send({ content: 'partial response' }); return; }
    if ((mode === 'conversation' && [2, 4].includes(n)) || (mode === 'missing-metadata' && n === 1)) {
      const args = JSON.stringify({ path: 'out/deepseek.md', text: output }), half = Math.floor(args.length / 2);
      send({ tool_calls: [{ index: 0, id: `ds-call-${n}`, type: 'function', function: { name: 'ws_write', arguments: args.slice(0, half) } }] });
      send({ tool_calls: [{ index: 0, function: { arguments: args.slice(half) } }] });
      send({}, 'tool_calls', { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110, prompt_cache_hit_tokens: 20, prompt_cache_miss_tokens: 80 });
    } else {
      send({ content: `Reply ${n}: ` }); send({ content: 'complete.' });
      send({}, 'stop', { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110, prompt_cache_hit_tokens: 20, prompt_cache_miss_tokens: 80 });
    }
    res.end('data: [DONE]\n\n');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { requests, firstRequest, baseUrl: `http://127.0.0.1:${server.address().port}/v1`,
    close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}
