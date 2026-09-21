/* Reply-loss proxy, the review's method, aimed at the Chat create this time:
 * forward everything, log every create with the Host's real status, and replace
 * exactly one successful POST /sessions reply with a synthetic 503. */
import http from 'node:http';
import fs from 'node:fs/promises';
const HOST = 'http://127.0.0.1:8924';
const LOG = process.argv[2];
let dropped = false;
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const headers = { ...req.headers, host: '127.0.0.1:8924' };
  if (headers.origin) headers.origin = HOST;
  delete headers['content-length'];
  const r = await fetch(HOST + req.url, { method: req.method, headers, body: body.length ? body : undefined });
  const bytes = Buffer.from(await r.arrayBuffer());
  const create = req.method === 'POST' && req.url.endsWith('/api/v5/sessions');
  if (create) await fs.appendFile(LOG, JSON.stringify({ path: req.url, body: JSON.parse(body), hostStatus: r.status }) + '\n');
  if (create && !dropped && r.ok) {
    dropped = true;
    res.writeHead(503, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'synthetic reply loss after Host commit' }));
    return;
  }
  const out = {}; r.headers.forEach((v, k) => { if (!['content-length', 'content-encoding', 'transfer-encoding'].includes(k)) out[k] = v; });
  res.writeHead(r.status, out); res.end(bytes);
}).listen(8925, '127.0.0.1', () => console.log('reply-loss proxy 8925 → Host 8924'));
