// Test-environment assignments fixed BEFORE adapters execute. Adapters do not
// define which work, proposal or reviewer the oracle should consider correct.
const assignments = {
  E:{workspaceId:'matter',sourceId:'source',proposalId:'candidate',peerProposalId:'other-candidate',obligationId:'confirm-owner',requestId:'review',reviewerId:'reviewer-1',initialRevision:'0',contractVersion:'se-contract-v5.0'},
  S:{workspaceId:'job-19',sourceId:'file-27',proposalId:'submission-32',peerProposalId:'submission-33',obligationId:'task-81',requestId:'approval-23',reviewerId:'staff-91',initialRevision:'41',contractVersion:'ordinary-review-v1'},
};
export function identitiesFor(condition) {
  if (!Object.hasOwn(assignments,condition)) throw new Error('Unknown condition');
  return structuredClone(assignments[condition]);
}

// Published request encodings for these two fixture drivers; no production
// hashing/validation imports. Each implementation may use its own encoding.
export function acceptedRequestPayload(condition) {
  const i=identitiesFor(condition);
  if(condition==='S') return {key:i.requestId,submission:i.proposalId,job:i.workspaceId,base:41,reason:'reviewed'};
  return {request:{request_id:i.requestId,matter_id:i.workspaceId,candidate_id:i.proposalId,base_version:0,action:'accept',reason:'Synthetic authorized review'},
    actor:{kind:'local_reviewer',id:i.reviewerId},scope:{matter_id:i.workspaceId,run_id:'run',candidate_id:i.proposalId,base_version:0}};
}
