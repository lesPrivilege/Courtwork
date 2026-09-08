// Raw-to-semantic mapping only: never fabricate audit, receipt or actor facts.
export function observeCourtwork(state, historicalSource, operation) {
  const source = s => s ? {id:s.id,version:String(s.version),text:s.text,digest:s.digest} : null;
  const result = r => ({requestId:r.request_id,workspaceId:r.matter_id,proposalId:r.candidate_id,artifactId:r.active_artifact,action:r.action});
  const record = r => ({...result({...r,active_artifact:r.result?.active_artifact}),actorId:r.actor?.id,
    scope:{workspaceId:r.scope?.matter_id,proposalId:r.scope?.candidate_id}});
  const candidate = state.candidates[0];
  return {schemaVersion:2,operation,revision:String(state.matter.version),workspaceId:state.matter.id,source:source(state.sources[0]),historicalSource:source(historicalSource),
    proposal:candidate ? {id:candidate.id,workspaceId:candidate.matter_id,sourceVersion:String(candidate.source_version),content:candidate.artifact_text,obligations:candidate.obligations} : null,
    artifact:state.artifact ? {id:state.artifact.id,proposalId:state.artifact.candidate_id,content:state.artifact.content,digest:state.artifact.content_digest} : null,
    obligations:state.matter.obligations,decisions:state.decisions.map(record),audits:state.audits.map(record),
    receipts:state.request_results.map(r=>result(JSON.parse(r.result_json)))};
}
export function observeStandard(raw, operation) {
  return {schemaVersion:2,operation,revision:String(raw.job.revision),workspaceId:raw.job.key,source:raw.source,historicalSource:raw.original,
    proposal:raw.submission,artifact:raw.document,obligations:raw.tasks,decisions:raw.approvals,audits:raw.auditLog,receipts:raw.receipts};
}
