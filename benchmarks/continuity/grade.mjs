import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {identitiesFor,acceptedRequestPayload} from './fixture-identities.mjs';
import {observeCourtwork,observeStandard} from './observe.mjs';
import {traceHash} from './trace.mjs';
const canonical = x => JSON.stringify(x && typeof x==='object' ? Object.fromEntries(Object.keys(x).sort().map(k=>[k,JSON.parse(canonical(x[k]))])) : x);
const digest = text => createHash('sha256').update(text).digest('hex');

// Independent protocol oracle: check complete semantic state at EVERY checkpoint.
function gradeState(spec, task, observations, condition, trace, error = null) {
  const identities = identitiesFor(condition);
  const checks = [];
  const check = (checkpoint, field, pass) => checks.push({checkpoint,field,pass:pass === true});
  let committed = false, replaced = false, firstCommit = null, previous = null;
  for (let i=0;i<task.steps.length;i++) {
    const o = observations[i];
    const outcome = task.outcomes[i];
    if (outcome === 'accepted') committed = true;
    if (outcome === 'source_replaced') replaced = true;
    check(i,'observation_present',!!o);
    if (!o) continue;
    const raw=trace?.[i];
    check(i,'raw_reference',!!raw && raw.sha256 === traceHash(raw) && o.rawRef === raw.sha256 && raw.step === task.steps[i]);
    try {
      const mapped=condition === 'E' ? observeCourtwork(raw.state,raw.historicalSource,raw.operation) : observeStandard(raw.raw,raw.operation);
      const {rawRef,...actual}=o;
      check(i,'raw_mapping',isDeepStrictEqual(actual,mapped));
    } catch {check(i,'raw_mapping',false);}
    check(i,'schema',o.schemaVersion === 2);
    check(i,'operation',o.operation === outcome);
    check(i,'workspace',o.workspaceId === identities.workspaceId);
    check(i,'revision',typeof o.revision === 'string' && o.revision.length > 0 && (committed ? o.revision !== identities.initialRevision : o.revision === identities.initialRevision));
    const expectedSource = replaced ? spec.replacement : spec.source;
    check(i,'current_source',o.source?.id === identities.sourceId && o.source.text === expectedSource && o.source.digest === digest(expectedSource));
    check(i,'historical_source',o.historicalSource?.id === identities.sourceId && o.historicalSource.text === spec.source && o.historicalSource.digest === digest(spec.source));
    check(i,'source_versions',typeof o.source?.version === 'string' && o.source.version.length > 0 &&
      typeof o.historicalSource?.version === 'string' && o.historicalSource.version.length > 0 &&
      (replaced ? o.source.version !== o.historicalSource.version : o.source.version === o.historicalSource.version));
    const expectedIds = [identities.proposalId,...(task.steps.includes('stale-base') ? [identities.peerProposalId] : [])].sort();
    check(i,'proposal_membership',Array.isArray(o.proposals) && isDeepStrictEqual(o.proposals.map(p=>p.id).sort(),expectedIds));
    const obligations = [{id:identities.obligationId,text:spec.obligation.text,status:'open',blocking:false,evidence_refs:[]}];
    for(const p of o.proposals ?? []) {
      check(i,'proposal_basis_'+p.id,p.workspaceId === identities.workspaceId && p.sourceVersion === o.historicalSource?.version &&
        p.baseVersion === identities.initialRevision && p.contractVersion === identities.contractVersion && p.content === spec.artifact);
      check(i,'proposal_status_'+p.id,p.status === (p.id === identities.proposalId && committed ? 'accepted' : 'pending'));
      check(i,'proposal_obligation_semantics_'+p.id,isDeepStrictEqual(p.obligations,obligations));
    }
    check(i,'obligation_semantics',isDeepStrictEqual(o.obligations,committed ? obligations : []));
    check(i,'effect_counts',[o.decisions,o.audits,o.receipts].every(a=>Array.isArray(a) && a.length === (committed ? 1 : 0)));
    if (committed) {
      const a = o.artifact;
      check(i,'artifact_content',typeof a?.id === 'string' && a.id.length > 0 && a.proposalId === identities.proposalId && a.content === spec.artifact && a.digest === digest(spec.artifact));
      for (const [kind,rows] of Object.entries({decisions:o.decisions,audits:o.audits,receipts:o.receipts})) {
        const row = rows?.[0];
        check(i,kind+'_binding',row?.requestId === identities.requestId && row.workspaceId === identities.workspaceId && row.proposalId === identities.proposalId && row.artifactId === a?.id && row.action === 'accept');
        if (kind !== 'receipts') check(i,kind+'_authority',row?.actorId === identities.reviewerId && row.scope?.workspaceId === identities.workspaceId && row.scope.proposalId === identities.proposalId);
        else check(i,'receipt_payload_binding',row?.requestDigest === digest(canonical(acceptedRequestPayload(condition))));
      }
      const effect = {revision:o.revision,artifact:o.artifact,obligations:o.obligations,decisions:o.decisions,audits:o.audits,receipts:o.receipts};
      if (firstCommit === null) firstCommit = structuredClone(effect);
      check(i,'unique_immutable_effect',isDeepStrictEqual(effect,firstCommit));
    } else check(i,'no_premature_artifact',o.artifact === null);
    if (previous && ['stale_source','request_conflict','authority_rejected','version_conflict','restarted'].includes(outcome)) {
      const state = ({operation,rawRef,...rest}) => rest;
      check(i,'refusal_or_restart_preserves_state',isDeepStrictEqual(state(o),state(previous)));
    }
    previous = o;
  }
  const complete = observations.length === task.steps.length && trace?.length === task.steps.length && task.outcomes.length === task.steps.length;
  return {pass:!error && complete && checks.length > 0 && checks.every(c=>c.pass),complete,checks,error};
}

export function grade(...args) {
  try {return gradeState(...args);}
  catch (error) {return {pass:false,complete:false,checks:[],error:{code:'OBSERVATION_INVALID',message:error.message}};}
}
