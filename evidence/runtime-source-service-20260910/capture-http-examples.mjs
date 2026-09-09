// BE-5 evidence capture: real HTTP transcript for POST /api/v5/runtime-sources/resolve.
// Runs the actual production startServer on a synthetic temp data dir (port 0,
// fake loopback provider, no credentials beyond the per-boot random token).
// Prints a compact request/response transcript to stdout.
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../../app/server/index.mjs';

const appRoot = path.resolve(fileURLToPath(new URL('../../app/', import.meta.url)));
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { createHash } = await import('node:crypto');
const sha = value => createHash('sha256').update(value, 'utf8').digest('hex');

const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-be5-http-example-'));
const runtime = await startServer({ dataDir, port: 0, logger: () => {} });
const base = runtime.url + '/api/v5';
const token = runtime.token;

async function show(label, { p = '/runtime-sources/resolve', method = 'POST', tokenValue = token, headers = {}, body } = {}) {
  console.log('\n### ' + label);
  console.log(`curl -sS -X ${method} '${base}${p}' \\`);
  console.log(`  -H 'content-type: application/json' ${tokenValue !== null ? `\\\n  -H 'x-work-token: <boot token>'` : ''}${Object.entries(headers).map(([k, v]) => `\\\n  -H '${k}: ${v}'`).join('')}${body !== undefined ? `\\\n  -d '${body.replace(/'/g, "\\'")}'` : ''}`);
  const res = await fetch(base + p, {
    method,
    headers: { 'content-type': 'application/json', ...(tokenValue === null ? {} : { 'x-work-token': tokenValue }), ...headers },
    body: body !== undefined ? body : undefined,
  });
  const text = await res.text();
  let pretty = text;
  try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch { /* raw */ }
  console.log(`--> HTTP ${res.status}`);
  console.log(pretty);
}

console.log(`BE-5 runtime-sources HTTP transcript`);
console.log(`code SHA 9cbae87, server booted on ${runtime.url} (data dir removed afterwards; synthetic, no real provider)`);
console.log(`fixed code: ${root} (main baseline 85693a6 + BE-5 commit)`);

const content = 'Exact source bytes 条款 🙂\r\n';
await show('1. inline reference resolves with exact UTF-8 identity', {
  body: JSON.stringify({ type: 'inline', kind: 'reference', title: 'Synthetic reference', content, origin: { uri: 'https://example.invalid/declared', version: 'v1' } }),
});
console.log(`\n[sha256(${JSON.stringify(content)}) = ${sha(content)}]`);

await show('2. inline skill (frontmatter) resolves, declared metadata only', {
  body: JSON.stringify({ type: 'inline', kind: 'skill', title: 'Synthetic skill', content: '---\nname: test-skill\ndescription: Synthetic\nallowed-tools: ws_write\n---\nBody with scripts/run.sh\n' }),
});

await show('3. locator stays explicit unsupported (no acquisition)', {
  body: JSON.stringify({ type: 'locator', locator: 'url', value: 'https://example.invalid/never-fetched' }),
});

await show('4. wrong work token -> 401', { tokenValue: 'wrong-token', body: JSON.stringify({ type: 'inline', kind: 'reference', title: 't', content: 'x' }) });

await show('5. disallowed Origin -> 403', { headers: { origin: 'http://attacker.invalid' }, body: JSON.stringify({ type: 'inline', kind: 'reference', title: 't', content: 'x' }) });

await show('6. extra envelope field -> 400 invalid_runtime_source', { body: JSON.stringify({ type: 'inline', kind: 'reference', title: 't', content: 'x', scope: { type: 'user', id: 'local' } }) });

await show('7. unsupported inline kind -> 400 invalid_runtime_config', { body: JSON.stringify({ type: 'inline', kind: 'plugin', title: 't', content: 'export default {}' }) });

await show('8. malformed skill YAML -> 400 invalid_runtime_config', { body: JSON.stringify({ type: 'inline', kind: 'skill', title: 't', content: '---\nname: [\ndescription: x\n---\nbody' }) });

await show('9. mcp_server stdio transport -> 400 invalid_runtime_config', { body: JSON.stringify({ type: 'inline', kind: 'mcp_server', title: 't', content: JSON.stringify({ transport: 'stdio', command: 'echo' }) }) });

await show('10. absent token -> 401', { tokenValue: null, body: JSON.stringify({ type: 'inline', kind: 'reference', title: 't', content: 'x' }) });

await runtime.close();
await rm(dataDir, { recursive: true, force: true });
console.log('\n(done; temp data dir removed)');
