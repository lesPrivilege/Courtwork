/**
 * Synthetic Agents API endpoint for transport tests: a real loopback HTTP
 * server, so the official SDK runs unmodified over real sockets. It records
 * every attempt that reaches it and answers from a per-test script. It knows
 * nothing about the transport under test and holds no credential.
 */
import http from 'node:http';

const json = (status, body) => ({ status, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

/** One SSE frame, as the service frames events. */
export const sseFrame = (event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;

export async function createWireFixture() {
  const attempts = [];
  const open = new Set();
  let script = () => json(500, { error: { message: 'unscripted' } });

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const attempt = { method: req.method, path: req.url, headers: { ...req.headers }, body: raw ? JSON.parse(raw) : null };
      attempts.push(attempt);
      const live = { attempt, closed: false };
      open.add(live);
      res.on('close', () => { live.closed = true; open.delete(live); });
      const reply = await script(attempt, { req, res });
      if (!reply || reply.handled) return;
      if (reply.destroy) { req.socket.destroy(); return; }
      res.writeHead(reply.status, reply.headers);
      res.end(reply.body);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

  return {
    baseURL: `http://127.0.0.1:${server.address().port}/v1`,
    attempts,
    /** Requests the server is still answering. */
    inFlight: () => open.size,
    respond(next) { script = next; },
    json,
    /** Stream `chunks` (strings) as one SSE response, then end unless `hold`. */
    sse(res, chunks, { hold = false, gapMs = 1 } = {}) {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      (async () => {
        for (const chunk of chunks) {
          if (res.destroyed) return;
          res.write(chunk);
          await new Promise(resolve => setTimeout(resolve, gapMs));
        }
        if (!hold) res.end();
      })();
      return { handled: true };
    },
    /** Only what identifies a request on the wire; never the authorization value. */
    wire: (attempt) => ({
      method: attempt.method, path: attempt.path,
      headers: Object.fromEntries(Object.entries(attempt.headers)
        .filter(([name]) => !['host', 'connection', 'content-length', 'accept-encoding', 'accept-language', 'sec-fetch-mode'].includes(name))
        .map(([name, value]) => [name, name === 'authorization' ? value.replace(/ .*/, ' <synthetic>') : value])
        .sort(([a], [b]) => a.localeCompare(b))),
      body: attempt.body,
    }),
    async close() {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    },
  };
}
