import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const R = new URL('../../../../app', import.meta.url).pathname;
const { boot } = await import(R + '/tests/helpers.mjs');
const { createSyntheticRepository } = await import(R + '/tests/fixtures/synthetic-repo/create-synthetic-repo.mjs');
const h = await boot();
try {
  const sourceDir = await mkdtemp(path.join(tmpdir(), 'cw-probe-src-'));
  const source = await createSyntheticRepository(sourceDir);
  const session = await h.createSession({ permissionMode: 'draft' });
  await h.api('PUT', `/sessions/${session.id}/repository-binding`, { operation:'bind', requestId:'b', expectedRevision:0, rootPath: sourceDir });
  await h.api('PUT', `/sessions/${session.id}/repository-candidate`, { operation:'create', requestId:'c', expectedRevision:0, expectedBindingRevision:1, candidateId:'923e4567-e89b-42d3-a456-426614174222', baseCommit: source.head });
  // slow test that prints its pid, and a grandchild that ignores SIGTERM
  const slow = `import {test} from 'node:test'; import {spawn} from 'node:child_process';
test('slow', async()=>{ const c=spawn('/bin/sh',['-c','trap "" TERM; sleep 25'],{stdio:'ignore'}); console.log('GCPID',c.pid); await new Promise(r=>setTimeout(r,20000)); });\n`;
  const run = await h.api('POST', `/sessions/${session.id}/runs`, { commandId:'r1', input: h.scriptInput([
    { name:'repo_write', arguments:{ path:'test/slow.test.mjs', text: slow } }, { name:'check_run', arguments:{ recipeId:'node-test' } } ]) });
  const runId = run.json.run.id;
  const ev = () => h.runtime.store.snapshot().events.filter(e=>e.runId===runId);
  for (let i=0;i<400 && !ev().some(e=>e.type==='permission.open');i++) await new Promise(r=>setTimeout(r,25));
  const open = ev().find(e=>e.type==='permission.open');
  await h.api('POST', `/runs/${runId}/questions/${open.data.id}`, { decision:'allow' });
  for (let i=0;i<400 && !ev().some(e=>e.type==='check.started');i++) await new Promise(r=>setTimeout(r,25));
  await new Promise(r=>setTimeout(r,2500)); // let node test runner spawn the file
  const t0 = Date.now();
  const cancelled = await h.api('POST', `/runs/${runId}/cancel`, {});
  const atReturn = ev();
  console.log('cancel HTTP returned after', Date.now()-t0, 'ms; run.status =', cancelled.json.run.status,
    '| check.settled present at return:', atReturn.some(e=>e.type==='check.settled'));
  await new Promise(r=>setTimeout(r,800));
  const settledEvents = ev().filter(e=>e.type==='check.settled');
  console.log('settled count', settledEvents.length, settledEvents.map(e=>[e.data.status,e.data.exitCode,e.data.signal,e.data.durationMs]), 'stdout:', JSON.stringify(settledEvents[0]?.data.stdout).slice(0,120));
  const m = (settledEvents[0]?.data.stdout ?? '').match(/GCPID (\d+)/);
  if (m) { let alive=true; try{process.kill(Number(m[1]),0)}catch{alive=false}; console.log('grandchild', m[1], 'alive after cancel settled:', alive); try{process.kill(Number(m[1]),'SIGKILL')}catch{} }
  else console.log('no GCPID in captured stdout (node test runner buffers child stdout until test completes)');
  console.log('run terminal status:', h.runtime.store.getRun(runId).status);
} finally { await h.runtime.close(); }
