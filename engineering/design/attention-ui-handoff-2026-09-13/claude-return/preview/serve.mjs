#!/usr/bin/env node
/* WO-ATT-UI02 · static server for the synthetic Attention preview.
 *
 *   node serve.mjs [--port 8871] [--ref <git-sha>]
 *
 * `/preview/*` is this directory. `/web/*` is the product's app/web: from the
 * working tree by default, or byte-for-byte from `git show <ref>:app/web/…` when
 * `--ref` is given, so a before/after pair renders the same fixture through two
 * fixed product versions. There is no `/api/v5` route; nothing is proxied. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = normalize(join(here, '../../../../..'));
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const port = Number(arg('port', 8871));
const ref = arg('ref', null);
const TYPES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

async function webFile(rel) {
  if (!ref) return readFile(join(repo, 'app/web', rel));
  return execFileSync('git', ['-C', repo, 'show', `${ref}:app/web/${rel}`], { maxBuffer: 64 * 1024 * 1024 });
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') { res.writeHead(302, { Location: '/preview/index.html' }); return res.end(); }
  const safe = normalize(path).replace(/^(\.\.[/\\])+/, '');
  try {
    let body;
    if (safe.startsWith('/web/')) body = await webFile(safe.slice(5));
    else if (safe.startsWith('/preview/')) body = await readFile(join(here, safe.slice(9)));
    else throw new Error('not found');
    res.writeHead(200, { 'Content-Type': TYPES[extname(safe)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Attention preview · http://127.0.0.1:${port}/  (web: ${ref ?? 'working tree'})`));
