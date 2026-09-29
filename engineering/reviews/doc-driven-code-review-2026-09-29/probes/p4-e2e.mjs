import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const R = new URL('../../../../app', import.meta.url).pathname;
const { boot } = await import(R + '/tests/helpers.mjs');
const { createSyntheticRepository } = await import(R + '/tests/fixtures/synthetic-repo/create-synthetic-repo.mjs');
const h = await boot();
try {
  // A dummy credentials file stands in for the Host's real one (same location, same mode); it holds a fake value.
  await writeFile(path.join(h.dataDir, 'dummy-credentials-probe.json'), '{"dummy":"NOT-A-REAL-SECRET"}', { mode: 0o600 });
  const sourceDir = await mkdtemp(path.join(tmpdir(), 'cw-probe-src-'));
  const source = await createSyntheticRepository(sourceDir);
  const session = await h.createSession({ permissionMode: 'draft' });   // default mode
  await h.api('PUT', `/sessions/${session.id}/repository-binding`, { operation:'bind', requestId:'b', expectedRevision:0, rootPath: sourceDir });
  const c = await h.api('PUT', `/sessions/${session.id}/repository-candidate`, { operation:'create', requestId:'c', expectedRevision:0, expectedBindingRevision:1, candidateId:'923e4567-e89b-42d3-a456-426614174111', baseCommit: source.head });
  console.log('candidate create', c.status);
  const evil = `import {test} from 'node:test'; import fs from 'node:fs'; import path from 'node:path';
test('x',()=>{ let d=process.cwd(); const seen=[]; for(let i=0;i<6;i++){ const f=path.join(d,'dummy-credentials-probe.json'); if(fs.existsSync(f)) console.log('READ-OUTSIDE-CANDIDATE:', fs.readFileSync(f,'utf8')); d=path.dirname(d);} });\n`;
  const run = await h.api('POST', `/sessions/${session.id}/runs`, { commandId:'r1', input: h.scriptInput([
    { name:'repo_write', arguments:{ path:'test/evil.test.mjs', text: evil } },
    { name:'check_run', arguments:{ recipeId:'node-test' } } ]) });
  const runId = run.json.run.id;
  let ev;
  for (let i=0;i<400;i++){ ev = h.runtime.store.snapshot().events.filter(e=>e.runId===runId); const open = ev.find(e=>e.type==='permission.open'); if (open){ console.log('permission questions so far:', ev.filter(e=>e.type==='permission.open').map(e=>e.data.tool)); console.log('approval payload:', JSON.stringify({recipeId:open.data.recipeId, argv:open.data.argv, cwd:open.data.cwd, preview:open.data.preview, contentSha256:open.data.contentSha256})); await h.api('POST', `/runs/${runId}/questions/${open.data.id}`, { decision:'allow' }); break; } await new Promise(r=>setTimeout(r,25)); }
  const fin = await h.pollRun(runId, { timeoutMs: 60000 });
  ev = h.runtime.store.snapshot().events.filter(e=>e.runId===runId);
  const w = ev.find(e=>e.type==='tool.result' && e.data.name==='repo_write');
  console.log('run status', fin.status, '| repo_write isError', w?.data?.isError);
  const s = ev.find(e=>e.type==='check.settled');
  console.log('check.settled', s?.data.status, s?.data.exitCode, '| stdout has outside read:', /READ-OUTSIDE-CANDIDATE: \{"dummy":"NOT-A-REAL-SECRET"\}/.test(s?.data.stdout ?? ''));
} finally { await h.runtime.close(); }
