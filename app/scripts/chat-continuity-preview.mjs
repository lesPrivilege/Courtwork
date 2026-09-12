import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, realpath } from 'node:fs/promises';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mounts = { '/web/': path.join(app, 'web'), '/brand/': path.resolve(app, '../brand'), '/': path.join(app, 'tests/fixtures/chat-continuity') };
const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' };

// Read-only fixture host. Deliberately imports no Runtime, store or API router.
export async function startChatContinuityPreview({ port = 0 } = {}) {
  const server = http.createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (pathname.startsWith('/api/') || pathname.includes('\0')) { res.writeHead(404); res.end(); return; }
      const prefix = Object.keys(mounts).find(p => p !== '/' && pathname.startsWith(p)) || '/';
      const root = await realpath(mounts[prefix]);
      const target = await realpath(path.resolve(root, pathname === '/' ? 'index.html' : pathname.slice(prefix.length)));
      if (!target.startsWith(root + path.sep)) { res.writeHead(404); res.end(); return; }
      const data = await readFile(target);
      res.writeHead(200, { 'Content-Type': `${types[path.extname(target)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { url } = await startChatContinuityPreview({ port: Number(process.env.CW_SPECIMEN_PORT || 8898) });
  console.log(`Chat continuity · synthetic preview: ${url}`);
}
