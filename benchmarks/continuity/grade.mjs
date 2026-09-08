import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
const digest = text => createHash('sha256').update(text).digest('hex');

// Independent protocol oracle: check complete semantic state at EVERY checkpoint.
export function grade(spec, task, observations, identities, error = null) {
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
    check(i,'proposal',o.proposal?.id === identities.proposalId && o.proposal.workspaceId === identities.workspaceId &&
      o.proposal.sourceVersion === o.historicalSource?.version && o.proposal.content === spec.artifact);
    const obligations = [{id:identities.obligationId,text:spec.obligation.text,status:'open',blocking:false,evidence_refs:[]}];
    check(i,'proposal_obligation_semantics',isDeepStrictEqual(o.proposal?.obligations,obligations));
    check(i,'obligation_semantics',isDeepStrictEqual(o.obligations,committed ? obligations : []));
    check(i,'effect_counts',[o.decisions,o.audits,o.receipts].every(a=>Array.isArray(a) && a.length === (committed ? 1 : 0)));
    if (committed) {
      const a = o.artifact;
      check(i,'artifact_content',typeof a?.id === 'string' && a.id.length > 0 && a.proposalId === identities.proposalId && a.content === spec.artifact && a.digest === digest(spec.artifact));
      for (const [kind,rows] of Object.entries({decisions:o.decisions,audits:o.audits,receipts:o.receipts})) {
        const row = rows?.[0];
        check(i,kind+'_binding',row?.requestId === identities.requestId && row.workspaceId === identities.workspaceId && row.proposalId === identities.proposalId && row.artifactId === a?.id && row.action === 'accept');
        if (kind !== 'receipts') check(i,kind+'_authority',row?.actorId === identities.reviewerId && row.scope?.workspaceId === identities.workspaceId && row.scope.proposalId === identities.proposalId);
      }
      const effect = {revision:o.revision,artifact:o.artifact,obligations:o.obligations,decisions:o.decisions,audits:o.audits,receipts:o.receipts};
      if (firstCommit === null) firstCommit = structuredClone(effect);
      check(i,'unique_immutable_effect',isDeepStrictEqual(effect,firstCommit));
    } else check(i,'no_premature_artifact',o.artifact === null);
    if (previous && ['stale_source','request_conflict','authority_rejected','version_conflict','restarted'].includes(outcome)) {
      const state = ({operation,...rest}) => rest;
      check(i,'refusal_or_restart_preserves_state',isDeepStrictEqual(state(o),state(previous)));
    }
    previous = o;
  }
  const complete = observations.length === task.steps.length && task.outcomes.length === task.steps.length;
  return {pass:!error && complete && checks.length > 0 && checks.every(c=>c.pass),complete,checks,error};
}
