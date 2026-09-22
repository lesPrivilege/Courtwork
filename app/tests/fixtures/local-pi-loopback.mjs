import http from 'node:http';

// Deterministic model wire fixture. This is never real-model evidence.
export async function localPiLoopback(respond = () => ({ text: 'Finding from supplied source [0]. Coverage is unverified.' })) {
  const requests = [], responses = new Set();
  const server = http.createServer(async (req, res) => {
    responses.add(res); res.on('close', () => responses.delete(res));
    try {
      let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 3 * 1024 * 1024) throw Error('request limit'); }
      const request = { url: req.url, body: JSON.parse(body) }; requests.push(request);
      const reply = await respond(request, requests.length, res);
      if (res.destroyed || reply === null) return;
      if (reply.status) { res.writeHead(reply.status, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: { message: 'synthetic failure' } })); return; }
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const chunks = reply.tool
        ? [{ role: 'assistant', tool_calls: [{ index: 0, id: 'synthetic-call', type: 'function', function: { name: reply.tool.name, arguments: JSON.stringify(reply.tool.args) } }] }]
        : [{ role: 'assistant', content: reply.text ?? 'synthetic reply' }];
      for (const delta of chunks) res.write('data: ' + JSON.stringify({ id: 'synthetic-completion', object: 'chat.completion.chunk', created: 1, model: 'fixture', choices: [{ index: 0, delta, finish_reason: null }] }) + '\n\n');
      res.write('data: ' + JSON.stringify({ id: 'synthetic-completion', object: 'chat.completion.chunk', created: 1, model: 'fixture', choices: [{ index: 0, delta: {}, finish_reason: reply.tool ? 'tool_calls' : 'stop' }] }) + '\n\n');
      res.end('data: [DONE]\n\n');
    } catch { if (!res.destroyed) { res.writeHead(500); res.end(); } }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { requests, baseUrl: `http://127.0.0.1:${server.address().port}/v1`, async close() {
    for (const response of responses) response.destroy();
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  } };
}
