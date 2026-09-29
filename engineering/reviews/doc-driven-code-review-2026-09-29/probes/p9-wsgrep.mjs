import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const R = new URL('../../../../app', import.meta.url).pathname;
const { boot } = await import(R + '/tests/helpers.mjs');
const h = await boot();
try {
  const session = await h.createSession();
  const ws = h.runtime.store.getSession(session.id).workspaceDir;
  await mkdir(path.join(ws, 'materials'), { recursive: true });
  await writeFile(path.join(ws, 'materials', 'secret.txt'), 'WS-SECRET-SENTINEL\n');
  const control = (await h.api('GET', `/runtime-control?sessionId=${session.id}`)).json;
  const pol = await h.api('PUT', `/runtime-control?sessionId=${session.id}`, { revision: control.revision, operation:'policy', scope:{type:'session', id: session.id}, rules:[{ action:'ws_read', resource:'materials/secret.txt', effect:'deny' }] });
  console.log('policy', pol.status);
  const run = await h.api('POST', `/sessions/${session.id}/runs`, { commandId:'r', input: h.scriptInput([
    { name:'ws_read', arguments:{ path:'materials/secret.txt' } }, { name:'ws_grep', arguments:{ pattern:'WS-SECRET' } } ]) });
  await h.pollRun(run.json.run.id);
  const ev = h.runtime.store.snapshot().events.filter(e=>e.runId===run.json.run.id && e.type==='tool.result');
  for (const e of ev) console.log(e.data.name, 'isError:', e.data.isError, '| leaks sentinel:', JSON.stringify(e.data).includes('WS-SECRET-SENTINEL'));
} finally { await h.runtime.close(); }
