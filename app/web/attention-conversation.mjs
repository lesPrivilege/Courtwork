// A global conversation is still owned by Session/Run. This controller owns
// only presentation, drafts and request receipts; it never runs an agent loop.
export function createAttentionConversation({ request, changed = () => {}, uuid = () => crypto.randomUUID() }) {
  const state = { session: null, events: [], runs: [], lastSeq: 0, draft: '', conversations: [],
    busy: false, loading: false, error: '', readError: '', command: null, conversationId: null, generation: 0 };
  const active = () => state.runs.find(run => ['running','waiting_user','stopping'].includes(run.status));
  function emit() { changed(state); }
  async function refresh() {
    const own = ++state.generation, id = state.conversationId;
    state.loading = true; state.readError = ''; emit();
    try {
      const list = await request('/attention/conversations');
      if (own !== state.generation) return;
      if (list.schemaVersion !== 1 || list.scope !== 'global' || !Array.isArray(list.sessions) || list.sessions.some(s => s.scope !== 'global' || s.projectId !== null)) throw new Error('Unsupported Attention conversations');
      state.conversations = list.sessions;
      if (id) {
        const data = await request(`/sessions/${encodeURIComponent(id)}`);
        if (own !== state.generation || id !== state.conversationId) return;
        if (data.session?.id !== id || data.session.scope !== 'global' || data.session.projectId !== null || !Array.isArray(data.events) || !Array.isArray(data.runs) || !Number.isSafeInteger(data.lastSeq)) throw new Error('Unsupported Attention conversation');
        if (data.lastSeq < state.lastSeq) throw new Error('Older conversation snapshot');
        state.session = data.session; state.events = data.events; state.runs = data.runs; state.lastSeq = data.lastSeq;
        if (state.command && data.runs.some(run => run.commandId === state.command.commandId)) {
          if (state.draft === state.command.input) { state.draft = ''; drafts.delete(id); }
          state.command = null; state.error = '';
        }
      }
    } catch (error) { if (own === state.generation) state.readError = error.message; }
    finally { if (own === state.generation) { state.loading = false; emit(); } }
  }
  async function choose(id) {
    if (state.busy || state.command) return;
    state.generation++; state.session = null; state.events = []; state.runs = []; state.lastSeq = 0;
    state.conversationId = id || null; state.error = ''; state.draft = drafts.get(id || 'new') || '';
    await refresh();
    if (state.conversationId !== (id || null)) return;
    if (state.session && !drafts.has(id)) state.draft = state.session.draft || '';
    emit();
  }
  const drafts = new Map();
  function setDraft(text) { state.draft = text; drafts.set(state.conversationId || 'new', text); }
  async function send() {
    if (state.busy || active() || !state.draft.trim()) return;
    const operation = state.command || { input: state.draft, commandId: uuid() };
    state.command = operation;
    // Client-assigned global conversation identity makes creation replay safe.
    const id = state.conversationId || uuid();
    if (!state.conversationId) { drafts.set(id, state.draft); drafts.delete('new'); }
    state.conversationId = id;
    state.busy = true; state.error = ''; state.generation++; emit();
    try {
      if (!state.session) {
        const created = await request('/attention/conversations', { method: 'POST', body: { conversationId: id } });
        if (created.session?.id !== id || created.session.scope !== 'global') throw new Error('Conversation receipt is unavailable');
        state.session = created.session;
      }
      await request(`/sessions/${encodeURIComponent(id)}/draft`, { method: 'PUT', body: { text: operation.input } });
      const receipt = await request(`/sessions/${encodeURIComponent(id)}/runs`, { method: 'POST', body: operation });
      if (receipt.run?.sessionId !== id || receipt.run.commandId !== operation.commandId) throw new Error('Run receipt is unavailable');
      state.command = null;
      if (state.draft === operation.input) { state.draft = ''; drafts.delete(id); drafts.delete('new'); }
    } catch (error) {
      // Only a confirmed 4xx can release the exact command for editing. A lost
      // response keeps the original input + command ID for reconciliation.
      if (Number.isFinite(error.status) && error.status >= 400 && error.status < 500) state.command = null;
      state.error = error.message;
    } finally { state.busy = false; await refresh(); emit(); }
  }
  async function action(path, body) {
    if (state.busy) return;
    state.busy = true; state.error = ''; state.generation++; emit();
    try { await request(path, { method: 'POST', body }); }
    catch (error) { state.error = error.message; }
    finally { state.busy = false; await refresh(); emit(); }
  }
  async function ensureConversation() {
    if (state.busy) return null;
    if (state.session) return state.session.id;
    const id = state.conversationId || uuid();
    if (!state.conversationId) { drafts.set(id, state.draft); drafts.delete('new'); }
    state.conversationId = id; state.busy = true; emit();
    try {
      const response = await request('/attention/conversations', {method:'POST',body:{conversationId:id}});
      if (response.session?.id !== id || response.session.scope !== 'global') throw new Error('Conversation receipt is unavailable');
      state.session = response.session;
      return id;
    } catch (error) { state.error = error.message; return null; }
    finally { state.busy = false; emit(); }
  }
  async function rename(id, title) {
    if (state.busy || state.command) return false;
    state.busy = true; state.error = ''; state.generation++; emit();
    let saved = false;
    try {
      const result = await request(`/sessions/${encodeURIComponent(id)}`, { method: 'PATCH', body: { title } });
      if (result.session?.id !== id || result.session.scope !== 'global') throw new Error('Rename receipt is unavailable');
      saved = true;
    } catch (error) { state.error = error.message; }
    finally { state.busy = false; await refresh(); }
    return saved;
  }
  return { state, active, refresh, choose, setDraft, send, ensureConversation, rename,
    cancel() { const run = active(); return run && action(`/runs/${encodeURIComponent(run.id)}/cancel`, {}); },
    answer(runId, questionId, body) { return action(`/runs/${encodeURIComponent(runId)}/questions/${encodeURIComponent(questionId)}`, body); },
    deactivate() { state.generation++; state.loading = false; },
  };
}
