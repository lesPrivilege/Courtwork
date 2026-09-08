import {execFileSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {observeStandard} from './observe.mjs';

export async function execute(spec, task) {
  const dataDir = await mkdtemp(path.join(tmpdir(),'cw-standard-benchmark-'));
  const identities = {workspaceId:'job-19',sourceId:'file-27',proposalId:'submission-32',obligationId:'task-81',requestId:'approval-23',reviewerId:'staff-91',initialRevision:'41'};
  const observations = [], trace = [];
  let error = null;
  const call = step => JSON.parse(execFileSync(process.env.WORK_AGENT_PYTHON ?? 'python3',
    [fileURLToPath(new URL('./standard.py',import.meta.url)),path.join(dataDir,'ordinary.sqlite'),step],
    {input:JSON.stringify({identities,spec,replacement:spec.replacement}),encoding:'utf8',timeout:10000}));
  try {
    call('seed');
    for (const step of task.steps) {
      const result = call(step);
      observations.push(observeStandard(result.raw,result.operation));
      trace.push({step,...result});
    }
  } catch(e) {error = {code:e.code ?? e.name,message:e.message};}
  finally {await rm(dataDir,{recursive:true,force:true});}
  return {identities,observations,trace,error};
}
