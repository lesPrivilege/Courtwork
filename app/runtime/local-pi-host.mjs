import { createLocalPiBinding, executeLocalPi, localPiPacket, LOCAL_PI_ADAPTER } from './local-pi-process.mjs';
import { localPiReceipt } from './local-pi-state.mjs';
import path from 'node:path';

const fail = code => { throw Object.assign(new Error(code), { code }); };
const processFields = ['pid', 'spawned', 'inputComplete', 'exitCode', 'signal', 'cancelled', 'timedOut', 'escalated', 'fault'];

// No separate scheduler/ledger: this is the existing Host Run's process branch.
export async function executeLocalPiChild(service, run, entry) {
  const { store, subagents, artifactHistory } = service;
  const assignment = subagents.forSession(run.sessionId);
  const attempt = assignment?.attempts.at(-1);
  if (!assignment || attempt?.runId !== run.id) fail('local_pi_attempt');
  const identity = { assignmentId: assignment.id, attempt: attempt.number, dispatchId: run.id };
  const record = (kind, data) => store.recordLocalPiEvent(run.id, 'local_pi.' + kind, { ...identity, ...data });
  const controller = new AbortController();
  entry.abort = () => controller.abort();
  if (entry.cancelRequested || !store.getRun(run.id)?.admissionOpen) controller.abort();
  let dispatched = false;
  try {
    const binding = service.localPiBinding;
    if (!binding || JSON.stringify(binding) !== JSON.stringify(createLocalPiBinding({ baseUrl: service.fakeProvider.baseUrl }))
      || run.provider.provider !== binding.provider || run.provider.model !== binding.model || run.provider.baseUrl !== binding.baseUrl) fail('local_pi_provider_binding');
    const revisions = () => assignment.sources.map(s => s.kind === 'material' ? service.intake.versions(assignment.parentSessionId, s.sourceId).latestRevision : null);
    const sourceRevisions = revisions();
    const assertCurrent = () => {
      const state = store.snapshot(), a = subagents.find(state, assignment.id), current = state.runs.find(r => r.id === run.id);
      if (!current?.admissionOpen || a.cancelRequested || a.status !== 'active' || a.attempts.at(-1)?.runId !== run.id
        || state.subagents.agents[0].status !== 'active' || store.getProviderConfigVersion() !== a.providerSelection.configVersion) fail('local_pi_admission_closed');
      subagents.authorized(state, a);
      for (const source of a.sources) subagents.checkSourcePolicy(state, a, source);
      if (JSON.stringify(revisions()) !== JSON.stringify(sourceRevisions)) fail('local_pi_source_changed');
    };
    assertCurrent();
    const sources = [];
    for (let i = 0; i < assignment.sources.length; i++) {
      const value = await subagents.readSource(assignment.id, i, run.id, { record: false });
      sources.push({ ref: assignment.sources[i], text: value.text });
    }
    assertCurrent();
    const packet = localPiPacket({ executionId: run.id, brief: assignment.brief, sources });
    await artifactHistory.save(run.sessionId, Buffer.from(packet.input), packet.sha256);
    const packetRef = { sha256: packet.sha256, bytes: packet.bytes, sourceCount: packet.sourceCount, sources: structuredClone(assignment.sources), sourceRevisions };
    const outcome = await executeLocalPi({
      binding, executionId: run.id, brief: assignment.brief, sources, signal: controller.signal,
      scratchDir: path.join(service.dataDir, 'local-pi-scratch'),
      timeoutMs: Math.max(1, Math.floor(subagents.remainingBudget(assignment).deadlineMs)),
      async beforeSpawn({ packet: observed }) {
        assertCurrent();
        if (observed.sha256 !== packet.sha256 || observed.bytes !== packet.bytes || localPiReceipt(store.snapshot(), run.id).dispatch) fail('local_pi_dispatch_conflict');
        // ArtifactHistory read proves the exact packet still exists before intent.
        await artifactHistory.read(run.sessionId, packet.sha256, packet.bytes);
        assertCurrent();
        const saved = await record('dispatch', { binding: { ...structuredClone(binding), executable: process.execPath, configVersion: assignment.providerSelection.configVersion }, packet: packetRef });
        if (!saved.recorded) fail('local_pi_dispatch_replay');
        dispatched = true;
      },
      onSpawn: ({ pid }) => record('spawn', { pid }),
      onNative: ({ sessionId }) => record('native', { sessionId }),
    });
    if (outcome.status === 'completed') {
      // Recheck immutable source access and freshness after the process closes.
      for (let i = 0; i < assignment.sources.length; i++) await subagents.readSource(assignment.id, i, run.id, { record: false });
      assertCurrent();
      await artifactHistory.save(run.sessionId, Buffer.from(outcome.result.text), outcome.result.sha256);
      await artifactHistory.read(run.sessionId, outcome.result.sha256, outcome.result.bytes);
      assertCurrent();
      await record('result', { sha256: outcome.result.sha256, bytes: outcome.result.bytes, packetSha256: packet.sha256, nativeSessionId: outcome.native.sessionId });
    }
    const receipt = localPiReceipt(store.snapshot(), run.id);
    // A failed durable callback must never be papered over by an invented
    // native observation. Leave the existing intent fenced for recovery.
    if (outcome.process?.spawned && receipt.spawn?.pid !== outcome.process.pid) return { status: 'unknown', reason: 'local_pi_spawn_receipt_missing' };
    const processObservation = outcome.process ? Object.fromEntries(processFields.map(key => [key, outcome.process[key]])) : null;
    await record('terminal', {
      status: outcome.status, reason: outcome.reason, process: processObservation,
      nativeSessionId: receipt.native?.sessionId ?? null,
      settled: outcome.terminal?.settled ?? false, turns: outcome.terminal?.turns ?? 0,
    });
    if (outcome.status === 'completed') {
      assertCurrent();
      // Existing settlement reads this event but now verifies the typed retained
      // receipt too. This message is a projection, not a second result owner.
      await store.appendEvent({ runId: run.id, type: 'assistant.message', data: { text: outcome.result.text } });
    }
    return { status: outcome.status, reason: outcome.reason };
  } catch (error) {
    const receipt = localPiReceipt(store.snapshot(), run.id);
    if (!dispatched && !receipt.dispatch && !receipt.terminal) {
      try { await record('terminal', { status: controller.signal.aborted ? 'cancelled' : 'refused', reason: 'before_dispatch', process: null, nativeSessionId: null, settled: false, turns: 0 }); }
      catch { return { status: 'unknown', reason: 'local_pi_receipt_failed' }; }
      return { status: controller.signal.aborted ? 'cancelled' : 'refused', reason: error.code ?? 'local_pi_refused' };
    }
    // Includes source revocation and result-retention/publication failures.
    // Never rerun a native request to recover missing publication.
    return { status: 'unknown', reason: 'local_pi_publication_unknown' };
  }
}
