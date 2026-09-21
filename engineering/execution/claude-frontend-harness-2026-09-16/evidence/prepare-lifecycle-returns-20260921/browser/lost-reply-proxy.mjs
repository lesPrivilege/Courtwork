/* Reply-loss proxy, the method from the review packet: forward everything to
 * the Host, log every candidate-create with the Host's real status, and replace
 * exactly one successful create reply with a synthetic 503. No product code is
 * touched. */
import http from 'node:http';
import fs from 'node:fs/promises';
const HOST = 'http://127.0.0.1:8920';
const LOG = process.argv[2];
let dropped = false;
http.createServer(async (req, res) => {
  const chunks = []; for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const headers = { ...req.headers, host: '127.0.0.1:8920' };
  if (headers.origin) headers.origin = HOST;
  delete headers['content-length'];
  const r = await fetch(HOST + req.url, { method: req.method, headers, body: body.length ? body : undefined });
  const bytes = Buffer.from(await r.arrayBuffer());
  const create = req.method === 'PUT' && req.url.endsWith('/repository-candidate') && JSON.parse(body).operation === 'create';
  if (create) await fs.appendFile(LOG, JSON.stringify({ path: req.url, body: JSON.parse(body), hostStatus: r.status }) + '\n');
  if (create && !dropped && r.ok) {
    dropped = true;
    res.writeHead(503, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'synthetic reply loss after Host commit' }));
    return;
  }
  const out = {}; r.headers.forEach((v, k) => { if (!['content-length', 'content-encoding', 'transfer-encoding'].includes(k)) out[k] = v; });
  res.writeHead(r.status, out); res.end(bytes);
}).listen(8921, '127.0.0.1', () => console.log('reply-loss proxy 8921 → Host 8920'));
