// Host-only capability. A ref/version is never a credential or execution identity.
export function createGovernanceAdapter({ core, getExecution }) {
  async function capture() {
    const value = await getExecution();
    if (!value?.admissionOpen) throw Object.assign(new Error('Governance execution is closed'), { code: 'CANDIDATE_CLOSED' });
    return { actor: 'runtime', project_id: value.projectId, purpose: 'attention-runtime',
      execution: { adapter_id: value.adapterId, session_id: value.sessionId, run_id: value.runId } };
  }
  return Object.freeze({ schemaVersion: 1, async query(query) {
    const context = await capture();
    const result = await core.call('governance_query', { context, query });
    const current = await capture();
    if (JSON.stringify(current) !== JSON.stringify(context)) throw Object.assign(new Error('Governance execution changed'), { code: 'CANDIDATE_CLOSED' });
    return result;
  } });
}
