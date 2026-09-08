import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {CoreClient} from '../../app/core/client.mjs';

const source = (text, version) => ({id:'source', text, version, digest:createHash('sha256').update(text).digest('hex')});
export async function execute(spec, task) {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-benchmark-'));
  let core = new CoreClient({dataDir});
  const observations = [], trace = [];
  let error = null;
  try {
    const s = source(spec.source, 1);
    await core.createMatter({matterId:'matter',title:'Synthetic continuity probe',source:s,contractVersion:'se-contract-v5.0'});
    await core.createRun({runId:'run',matterId:'matter',baseVersion:0,sourceVersion:1,contractVersion:'se-contract-v5.0',instruction:'Synthetic probe'});
    await core.saveCandidate({matterId:'matter',runId:'run',payload:{id:'candidate',matter_id:'matter',run_id:'run',base_version:0,source_version:1,contract_version:'se-contract-v5.0',artifact_text:spec.artifact,
      evidence:[{source_id:s.id,source_version:1,start:0,end:Array.from(s.text).length,quote:s.text,digest:s.digest}],
      obligations:[{id:'confirm-owner',text:'Confirm owner separately',status:'open',blocking:false,evidence_refs:[]}]}});
    await core.updateRun({runId:'run',status:'completed',admissionOpen:false});
    const decision = {request_id:'review',matter_id:'matter',candidate_id:'candidate',base_version:0,action:'accept',reason:'Synthetic authorized review'};
    for (const step of task.steps) {
      let accepted = null, operationError = null;
      if (['accept','changed-request','spoof'].includes(step)) {
        try {
          await core.decide({...decision,...(step === 'changed-request' ? {reason:'Changed receipt content'} : {}),...(step === 'spoof' ? {actor:'local-user'} : {})});
          accepted = true;
        } catch (e) {
          // Transport/setup failures must not masquerade as successful rejection.
          if (!['INVALID','STALE_INPUT','IDEMPOTENCY_CONFLICT','VERSION_CONFLICT'].includes(e.code)) throw e;
          accepted = false; operationError = {code:e.code,message:e.message};
        }
      } else if (step === 'replace') {
        await core.call('replace_sources',{matter_id:'matter',sources:[source(spec.replacement,2)],revision:2});
      } else if (step === 'restart') {
        await core.close(); core = new CoreClient({dataDir});
      } else if (step !== 'observe') throw new Error(`Unknown step: ${step}`);
      const state = await core.snapshot('matter');
      const old = await core.call('historical_source',{matter_id:'matter',candidate_id:'candidate',source_id:'source',version:1});
      observations.push({accepted,version:state.matter.version,sourceVersion:state.matter.source_version,artifact:state.artifact?.content ?? null,
        decisions:state.decisions.length,audits:state.audits.length,openObligations:state.matter.obligations.filter(o => o.status === 'open').map(o => o.id).sort(),historicalSource:old.text});
      trace.push({step,operationError,state});
    }
  } catch (e) { error = {code:e.code ?? e.name,message:e.message}; }
  finally {
    try { await core.close(); } catch (e) { error ??= {code:'CLEANUP',message:e.message}; }
    await rm(dataDir,{recursive:true,force:true});
  }
  return {observations,trace,error};
}
