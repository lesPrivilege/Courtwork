import {execFileSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {observeStandard} from './observe.mjs';
import {identitiesFor} from './fixture-identities.mjs';
import {seal} from './trace.mjs';

export async function execute(spec, task) {
  const dataDir = await mkdtemp(path.join(tmpdir(),'cw-standard-benchmark-'));
  const identities = identitiesFor('S');
  const observations = [], trace = [];
  let error = null;
  const call = step => JSON.parse(execFileSync(process.env.WORK_AGENT_PYTHON ?? 'python3',
    [fileURLToPath(new URL('./standard.py',import.meta.url)),path.join(dataDir,'ordinary.sqlite'),step],
    {input:JSON.stringify({identities,spec,task,replacement:spec.replacement}),encoding:'utf8',timeout:10000}));
  try {
    call('seed');
    for (const step of task.steps) {
      const result = call(step);
      const entry=seal({step,...result});
      observations.push({...observeStandard(result.raw,result.operation),rawRef:entry.sha256});
      trace.push(entry);
    }
  } catch(e) {error = {code:e.code ?? e.name,message:e.message};}
  finally {await rm(dataDir,{recursive:true,force:true});}
  return {identities,observations,trace,error};
}
