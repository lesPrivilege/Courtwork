import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const port = Number(process.env.MARKDOWN_READER_PORT ?? 8978);
const types = new Map([
  ['.css', 'text/css; charset=utf-8'], ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.mjs', 'text/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'],
]);
function fileFor(pathname) {
  const relative = pathname.startsWith('/web/')
    ? path.join('app', 'web', pathname.slice('/web/'.length))
    : `.${pathname}`;
  const file = path.resolve(root, relative);
  return file === root || file.startsWith(`${root}${path.sep}`) ? file : null;
}
const server = createServer(async (request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host ?? 'localhost'}`).pathname); } catch { response.writeHead(400).end(); return; }
  const file = fileFor(pathname);
  if (!file) { response.writeHead(403).end(); return; }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not_file');
    response.writeHead(200, {'content-type': types.get(path.extname(file)) ?? 'application/octet-stream', 'content-length': info.size});
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end();
  }
});
server.listen(port, '127.0.0.1', () => console.log(`markdown-reader static server http://127.0.0.1:${port}`));
