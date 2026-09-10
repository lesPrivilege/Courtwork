// Read-only regression probe. Uses a synthetic worker and temporary data only.
// Usage: node core-client-lifecycle.mjs /absolute/path/to/app/core/client.mjs
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, chmod, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
const source = resolve(process.argv[2] || 'app/core/client.mjs');
const bytes = await readFile(source);
const gitBlob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const { CoreClient } = await import(pathToFileURL(source).href);
const root = await mkdtemp(join(tmpdir(), 'cw-core-lifecycle-probe-'));
const reports = [];
function alive(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return false;
  try { process.kill(child.pid, 0); return true; } catch { return false; }
}
async function reap(child) {
  if (!alive(child)) return;
  const done = new Promise(resolve => child.once('exit', resolve));
  child.kill('SIGKILL');
  await Promise.race([done, sleep(1000)]);
}
try {
  for (const mode of ['close-no-ack', 'startup-no-ready']) {
    const executable = join(root, `worker-${mode}`);
    const program = '#!/usr/bin/env python3\nimport time,sys\n' +
      (mode === 'close-no-ack' ? 'print(\'{"ready":true}\',flush=True)\n' : '') +
      'while True: time.sleep(1)\n';
    await writeFile(executable, program, {mode:0o700});
    await chmod(executable, 0o700);
    const client = new CoreClient({dataDir:join(root,mode), python:executable});
    let child;
    let closing;
    try {
      if (mode === 'close-no-ack') {
        await client.start(); child = client.process;
        const start = performance.now();
        closing = client.close();
        const outcome = await Promise.race([closing.then(()=>'closed'),sleep(1500).then(()=>'deadline-exceeded')]);
        reports.push({case:mode,outcome,observedMs:Math.round(performance.now()-start),workerAlive:alive(child),pending:client.pending.size});
        assert.equal(outcome,'deadline-exceeded','Baseline defect no longer reproduces; review fix rather than weaken test');
      } else {
        const starting = client.start();
        // Attach rejection handler immediately, then capture the test worker.
        const rejected = starting.then(()=>({ready:true}),e=>({ready:false,code:e.code,message:e.message}));
        await sleep(100); child = client.process;
        const result = await rejected;
        reports.push({case:mode,...result,workerAliveAfterFailure:alive(child)});
        assert.equal(result.ready,false);
        assert.equal(alive(child),true,'Baseline orphan defect no longer reproduces; review fix');
      }
    } finally {
      await reap(child || client.process);
      if (closing) await closing.catch(()=>{});
      await client.close().catch(()=>{});
    }
  }
} finally { await rm(root,{recursive:true,force:true}); }
console.log(JSON.stringify({source,gitBlob,node:process.version,scope:'Exact CoreClient code; synthetic workers; no real Core database, provider, or full-suite run',reports},null,2));
