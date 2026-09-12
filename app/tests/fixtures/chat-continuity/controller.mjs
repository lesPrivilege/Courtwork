import { createSpecimenAdapter, scopeKey, SCENES, CHANNELS, VARIANTS } from './adapter.mjs';
const closed = () => ({ status: 'closed' });
const idleSearch = () => ({ query: '', status: 'idle', hits: [] });
const clone = value => structuredClone(value);

// Page-state experiment only: identity and evidence still belong to the
// synthetic adapter. No persistence, production navigation or formal decisions.
export function createSpecimenController({ adapter = createSpecimenAdapter() } = {}) {
  let scope = { scene: 'discussion', channel: 'hosted', account: 'account-a', session: 'session-a' };
  let entries = new Map(), detailEpoch = 0, searchEpoch = 0, judgmentEpoch = 0, serial = 0;
  let source = closed(), search = idleSearch(), judgment = closed(), slowRead = false, notice = '', modelScope;
  const listeners = new Set();
  const entry = () => {
    const key = scopeKey(scope);
    if (!entries.has(key)) entries.set(key, { variant: 'normal', draft: '', messages: adapter.initialMessages(scope), run: { status: 'idle' }, reading: { scrollTop: 0, expandedIds: [] } });
    return entries.get(key);
  };
  function getState() {
    const data = entry();
    return clone({ scope, variant: data.variant, channel: adapter.capabilities(scope), draft: data.draft,
      messages: data.messages, run: data.run, reading: data.reading, search, source, judgment, slowRead, notice, modelLabel: adapter.modelLabel(scope) });
  }
  const emit = kind => { const state = getState(); for (const listener of listeners) listener(state, { kind }); };
  function invalidate() { detailEpoch++; searchEpoch++; judgmentEpoch++; source = closed(); search = idleSearch(); judgment = closed(); }
  const active = (captured, epoch, current) => scopeKey(scope) === scopeKey(captured) && epoch === current;
  const errorState = error => ({ status: 'error', error: error.message, code: error.code || 'UNAVAILABLE' });
  const api = {
    getState,
    subscribe(listener) { listeners.add(listener); listener(getState(), { kind: 'scope' }); return () => listeners.delete(listener); },
    choose(patch) {
      const next = { ...scope, ...patch };
      if (!SCENES.includes(next.scene) || !CHANNELS.includes(next.channel) || !['account-a', 'account-b'].includes(next.account) || !['session-a', 'session-b'].includes(next.session)) throw new Error('Unknown specimen scope.');
      if (scopeKey(next) === scopeKey(scope)) return;
      invalidate(); scope = next; adapter.configure(scope, entry().variant); notice = ''; emit('scope');
    },
    setVariant(value) {
      if (!VARIANTS.includes(value)) throw new Error('Unknown specimen state.');
      entry().variant = value; adapter.configure(scope, value);
      const previous = source.ref; invalidate(); notice = '';
      if (previous && value === 'denied' && scope.scene === 'sources') source = { ...errorState(Object.assign(new Error('Access was revoked. No cached source passage is shown.'), { code: 'ACCESS_REVOKED' })), ref: previous };
      emit('controls');
    },
    setNotice(message) { notice = String(message); emit('notice'); },
    setDraft(text) { entry().draft = String(text).slice(0, 100000); emit('draft'); },
    setReading({ scrollTop, expandedIds } = {}) {
      const current = entry().reading;
      if (Number.isFinite(scrollTop)) current.scrollTop = Math.max(0, scrollTop);
      if (Array.isArray(expandedIds)) current.expandedIds = [...new Set(expandedIds.filter(x => typeof x === 'string'))];
      // The DOM already owns this immediate reading change. Avoid scroll loops.
    },
    setSlowRead(value) { slowRead = Boolean(value); emit('controls'); },
    async send() {
      const data = entry(), text = data.draft.trim(), captured = clone(scope), key = scopeKey(captured);
      if (!text || data.run.status === 'running') return false;
      const channel = adapter.capabilities(captured);
      if (!channel.canSend) { notice = channel.reason; emit('notice'); return false; }
      const id = `synthetic-run-${++serial}`;
      data.run = { status: 'running', id }; data.draft = '';
      data.messages.push({ id: `${id}:user`, role: 'user', origin: 'authored', text, startedAt: '2026-09-12T12:00:00.000Z', refs: [] });
      notice = ''; emit('messages');
      try {
        const result = await adapter.send(captured, text);
        if (data.run.id !== id || data.run.status !== 'running' || entries.get(key) !== data) return false;
        data.messages.push({ id: `${id}:assistant`, role: 'assistant', origin: 'authored', text: result.text, startedAt: '2026-09-12T12:00:01.000Z', refs: [] });
        data.run = { status: 'completed', id };
      } catch (error) {
        if (data.run.id !== id || data.run.status !== 'running' || entries.get(key) !== data) return false;
        data.run = { status: 'failed', id, error: error.message }; if (!data.draft) data.draft = text;
      }
      if (scopeKey(scope) === key) emit('messages');
      return data.run.status === 'completed';
    },
    stop() {
      const data = entry(); if (scope.channel !== 'hosted' || data.run.status !== 'running') return;
      data.run = { ...data.run, status: 'cancelled' }; notice = 'Synthetic response stopped. The submitted message remains in the conversation.'; emit('messages');
    },
    async search(query) {
      const captured = clone(scope), own = ++searchEpoch;
      search = { query: String(query), status: 'loading', hits: [] }; emit('search');
      try {
        const hits = await adapter.search(captured, String(query));
        if (!active(captured, own, searchEpoch)) return;
        search = { query: String(query), status: 'ready', hits };
      } catch (error) {
        if (!active(captured, own, searchEpoch)) return;
        search = { ...errorState(error), query: String(query), hits: [] };
      }
      emit('search');
    },
    async openSource(ref) {
      judgmentEpoch++; judgment = closed();
      const captured = clone(scope), exact = clone(ref), own = ++detailEpoch;
      source = { status: 'loading', ref: exact }; emit('source');
      try {
        const record = await adapter.read(captured, exact, { slow: slowRead });
        if (!active(captured, own, detailEpoch)) return;
        if (record.id !== exact.id || record.revision !== exact.revision || record.account !== captured.account) throw new Error('The source response did not match its requested identity and version.');
        source = { status: 'ready', ref: exact, record };
      } catch (error) {
        if (!active(captured, own, detailEpoch)) return;
        source = { ...errorState(error), ref: exact };
      }
      emit('source');
    },
    closeSource() { detailEpoch++; source = closed(); emit('source'); },
    async openJudgment(refreshed = false) {
      detailEpoch++; source = closed();
      const captured = clone(scope), own = ++judgmentEpoch;
      judgment = { status: 'loading' }; emit('judgment');
      try {
        const record = await adapter.preview(captured, { refreshed });
        if (!active(captured, own, judgmentEpoch)) return;
        judgment = { status: 'ready', record };
      } catch (error) {
        if (!active(captured, own, judgmentEpoch)) return;
        judgment = errorState(error);
      }
      emit('judgment');
    },
    closeJudgment() { judgmentEpoch++; judgment = closed(); emit('judgment'); },
    refreshJudgment() { return api.openJudgment(true); },
    async modelRequest(path, options) {
      if (path === '/provider-models') modelScope = clone(scope);
      const captured = modelScope || clone(scope);
      if (scopeKey(captured) !== scopeKey(scope)) throw new Error('The discussion scope changed. Reopen the model picker.');
      return adapter.modelRequest(captured, path, options);
    },
    modelSaved() { if (modelScope && scopeKey(modelScope) === scopeKey(scope)) emit('controls'); },
    reset() {
      invalidate(); entries = new Map(); adapter.reset?.(); adapter.configure(scope, 'normal'); notice = ''; slowRead = false; emit('scope');
    },
  };
  return api;
}
