// Synthetic owners for an isolated specimen. No network, credential, disk or
// product-state access. These shapes are a UI experiment, not production DTOs.
export const SCENES = ['discussion', 'sources', 'changes'];
export const CHANNELS = ['hosted', 'native', 'retained'];
export const VARIANTS = ['normal', 'missing', 'denied'];
export const scopeKey = s => JSON.stringify([s.account, s.channel, s.session, s.scene]);
const copy = x => structuredClone(x);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const refs = {
  r1: { id: 'release-brief', revision: 'r1', label: 'Release brief · r1' },
  r2: { id: 'release-brief', revision: 'r2', label: 'Release brief · r2' },
};
const fixedTime = '2026-09-12T12:00:00.000Z';
function fail(code, message) { throw Object.assign(new Error(message), { code }); }

export function initialMessages(scope) {
  if (scope.scene === 'discussion') return [];
  const longInput = 'Compare the release brief with the discussion we retained. Keep the exact version and the missing attachment visible.\n\n' +
    ('A later revision should not silently replace the source behind an earlier reference. We need a clear way back to this passage after inspecting its source.\n\n').repeat(8);
  return [
    { id: 'retained-user', origin: 'retained', role: 'user', text: longInput, startedAt: fixedTime, refs: [] },
    { id: 'retained-response', origin: 'retained', role: 'assistant', text: scope.scene === 'sources'
      ? 'The retained passage refers to **revision r1**. Search the source, inspect the exact passage, then return here. This is a partial record; it does not establish what an upstream model used.'
      : 'The review deadline changed between **r1 and r2**. The linked work still depends on r1. Inspect both versions before opening a judgment preview; this discussion cannot close the work.',
      startedAt: fixedTime, refs: scope.scene === 'sources' ? [copy(refs.r1)] : [copy(refs.r1), copy(refs.r2)] },
  ];
}

export function createSpecimenAdapter({ pause = wait, readDelay = 180, sendDelay = 450 } = {}) {
  const variants = new Map(), configs = new Map(), operations = [];
  const variantOf = s => {
    if (!s || !SCENES.includes(s.scene) || !CHANNELS.includes(s.channel) || !['account-a', 'account-b'].includes(s.account) || !['session-a', 'session-b'].includes(s.session)) fail('SCOPE_UNSUPPORTED', 'This scope is not part of the fixed synthetic dataset.');
    return variants.get(scopeKey(s)) || 'normal';
  };
  const configure = (scope, variant) => { if (!VARIANTS.includes(variant)) fail('INVALID_VARIANT', 'Unknown specimen state.'); variantOf(scope); variants.set(scopeKey(scope), variant); };
  const catalog = { models: [
    { provider: 'synthetic', id: 'discussion', name: 'Discussion · synthetic', api: 'fixture', supportedEfforts: ['off'], contextWindow: 8192 },
    { provider: 'synthetic', id: 'comparison', name: 'Comparison · synthetic', api: 'fixture', supportedEfforts: ['off'], contextWindow: 8192 },
  ] };
  const configOf = s => configs.get(scopeKey(s)) || { provider: 'synthetic', model: 'discussion', api: 'fixture', reasoningEffort: 'off' };
  function capabilities(scope) {
    const variant = variantOf(scope), hosted = scope.channel === 'hosted';
    const reason = !hosted ? scope.channel === 'native' ? 'Use the native channel to talk. CourtWork has no send or stop interface here.' : 'This is a retained record. Choose a discussion channel before continuing.'
      : variant === 'missing' && scope.scene === 'discussion' ? 'No connection is available in this specimen state. Your draft is kept.'
      : variant === 'denied' && scope.scene === 'discussion' ? 'This identity cannot send in the selected session. Your draft is kept.' : '';
    return { label: hosted ? 'CourtWork · synthetic hosted' : scope.channel === 'native' ? 'Native provider entrance · synthetic' : 'Retained conversation · read only',
      canSend: hosted && !reason, canStop: hosted, canChooseModel: hosted && !reason, reason };
  }
  function assertRead(scope) {
    variantOf(scope);
    if (scope.scene === 'discussion') fail('NO_SOURCES', 'There are no retained sources in this discussion.');
    if (scope.scene === 'sources' && variantOf(scope) === 'denied') fail('ACCESS_REVOKED', 'Access was revoked. The current scope cannot read this source. No cached passage is shown.');
  }
  function record(scope, ref) {
    assertRead(scope);
    if (ref.id !== 'release-brief' || !['r1', 'r2'].includes(ref.revision)) fail('SOURCE_MISSING', 'That exact source revision is unavailable.');
    const day = ref.revision === 'r1' ? '18' : '22';
    const text = `# Release brief — ${ref.revision}\n\nReview deadline（期限）: ${day} September.\n\n${ref.revision === 'r1' ? 'The prior decision remains in effect until a person reviews the new evidence.' : 'The revised deadline needs a fresh review; importing this version does not accept it.'}\n\nSource account: ${scope.account}.\n\nThe discussion was retained as a partial excerpt. No upstream private memory or complete tool history was captured.`;
    return { id: ref.id, revision: ref.revision, title: 'Release brief', text, account: scope.account,
      representation: 'plain-text-v1', range: { start: 0, end: text.length }, rangeUnit: 'UTF-16 code units',
      coverage: variantOf(scope) === 'missing' ? 'partial — attachment unavailable' : 'retained excerpt only',
      missing: variantOf(scope) === 'missing' ? ['review-notes.pdf was not included in the retained source.'] : [], disclosed: 'Returned to this local specimen. Model use is unknown.' };
  }
  return {
    configure, capabilities, initialMessages,
    reset() { variants.clear(); configs.clear(); operations.length = 0; },
    operations: () => copy(operations),
    async search(scope, query) {
      const captured = copy(scope); await pause(readDelay); assertRead(captured);
      const q = String(query).trim();
      if (!q) return [];
      if (q.length > 200) fail('QUERY_TOO_LONG', 'Keep the query within 200 characters.');
      const candidates = captured.scene === 'changes' ? [refs.r1, refs.r2] : [refs.r1];
      return candidates.map(ref => ({ ref, source: record(captured, ref) }))
        .filter(({ source }) => source.text.toLocaleLowerCase().includes(q.toLocaleLowerCase()))
        .map(({ ref, source }) => ({ ...copy(ref), excerpt: source.text.split('\n').find(line => line.toLocaleLowerCase().includes(q.toLocaleLowerCase())) }));
    },
    async read(scope, ref, { slow = false } = {}) {
      const captured = copy(scope), exact = copy(ref);
      await pause(slow ? 1400 : readDelay);
      const result = record(captured, exact); // Recheck at return, not only at search.
      operations.push({ kind: 'read', scope: captured, id: exact.id, revision: exact.revision });
      return result;
    },
    async send(scope, text) {
      const captured = copy(scope); await pause(sendDelay);
      const cap = capabilities(captured); if (!cap.canSend) fail('SEND_DENIED', cap.reason);
      operations.push({ kind: 'send', scope: captured, text });
      return { text: 'Your message is kept in this synthetic discussion. No source was selected, no provider was called, and no work was started.' };
    },
    async preview(scope, { refreshed = false } = {}) {
      const captured = copy(scope); await pause(readDelay);
      if (captured.scene !== 'changes') fail('NO_WORK_PREVIEW', 'There is no linked work in this scene.');
      if (variantOf(captured) === 'missing') fail('EVIDENCE_MISSING', 'The comparison evidence is incomplete. Keep this work open and inspect the sources.');
      if (variantOf(captured) === 'denied' && !refreshed) fail('STALE_VERSION', 'The preview was based on r1. Refresh the version facts before judging; no decision was submitted.');
      return { id: 'release-review', version: refreshed ? 2 : 1, basedOn: 'r1', latestRevision: 'r2',
        status: 'Needs human judgment', summary: 'The deadline moved from 18 to 22 September. The existing decision still refers to r1. This preview neither accepts r2 nor resolves the linked work.' };
    },
    async modelRequest(scope, path, options = {}) {
      if (!capabilities(scope).canChooseModel) fail('CHANNEL_UNSUPPORTED', 'This channel cannot change a CourtWork model.');
      if (path === '/provider-models' && !options.method) return copy(catalog);
      if (path === '/provider-connections' && !options.method) return { connections: [] };
      if (path === '/provider-config' && !options.method) return { config: copy(configOf(scope)) };
      if (path === '/provider-config' && options.method === 'PUT') {
        const input = options.body;
        if (!catalog.models.some(m => m.provider === input?.provider && m.id === input.model) || input.api !== 'fixture' || input.baseUrl) fail('MODEL_UNSUPPORTED', 'Only the two synthetic catalog entries are available.');
        configs.set(scopeKey(scope), copy(input)); return { config: copy(input) };
      }
      fail('CHANNEL_UNSUPPORTED', 'This operation is not part of the isolated specimen.');
    },
    modelLabel: scope => catalog.models.find(m => m.id === configOf(scope).model)?.name,
  };
}
