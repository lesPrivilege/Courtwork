// A host-created capability seam, with no second store or orchestration loop.
// Only trusted host code may construct it. Model arguments cannot set context.
export function createAttentionAdapter({ core, getExecution }) {
  async function context() {
    const execution = await getExecution();
    if (!execution || !execution.admissionOpen) throw Object.assign(new Error('Attention execution is closed'), {code:'CANDIDATE_CLOSED'});
    return {actor:'runtime',project_id:execution.projectId,purpose:'attention-runtime',execution:{adapter_id:execution.adapterId,session_id:execution.sessionId,run_id:execution.runId}};
  }
  return Object.freeze({
    schemaVersion:1,
    async query(query) { return core.call('attention_query',{context:await context(),query}); },
    async recordSignal(request) {
      if (!request || request.action !== 'record_signal') throw Object.assign(new Error('Runtime may only record signals'),{code:'DISCLOSURE_DENIED'});
      return core.call('attention_action',{context:await context(),request,provenance:[]});
    },
  });
}
