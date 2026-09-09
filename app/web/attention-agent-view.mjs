import { createCoordinationView } from './coordination-view.mjs';
import { el, action, markdown, copyAction } from './ui-controls.mjs';
import { projectThread, canAnswer, validPermission } from './thread-projection.mjs';
import { createAttentionConversation } from './attention-conversation.mjs';

export function createAttentionAgent(dialog, { request, onItems, onOpenSession, onConfigure, getProvider }) {
  let visible = false, timer = null, opener = null, signature = '', openingEpoch = 0;
  const answers = new Map();
  const controller = createAttentionConversation({ request, changed: render });
  const header = el('header', { className: 'attention-agent-header' },
    el('div', {}, el('h2', { text: 'Attention', attrs: { id: 'attention-agent-title' } }), el('p', { className: 'form-help', text: 'Your global assistant' })),
    action('x', 'Close Attention', close));
  const history = el('select', { attrs: { 'aria-label': 'Attention conversation' } });
  history.addEventListener('change', () => { signature = ''; void controller.choose(history.value); });
  const refresh = action('refresh-cw', 'Refresh Attention', () => controller.refresh());
  const items = el('button', { text: 'Attention items', className: 'text-button', attrs: { type: 'button' } });
  items.addEventListener('click', () => { close(); onItems(); });
  const full = el('button', { text: 'Open conversation', className: 'text-button', attrs: { type: 'button' } });
  full.addEventListener('click', () => { const id = controller.state.session?.id; if (id) { close(); onOpenSession(id); } });
  const configure = action('settings-2', 'Configure Attention Runtime', async () => { const own = openingEpoch; const id = await controller.ensureConversation(); if (id && visible && own === openingEpoch) { close(); onConfigure(id); } });
  const toolbar = el('div', { className: 'attention-agent-toolbar' }, history, refresh, items, full, configure);
  const coordination = createCoordinationView({request,onOpenSession: id=>{close();onOpenSession(id);}});
  const stream = el('div', { className: 'attention-agent-stream', attrs: { 'aria-label': 'Attention conversation messages', tabindex: '0' } });
  const feedback = el('p', { className: 'form-help', attrs: { role: 'status' } });
  const input = el('input', { attrs: { type: 'text', maxlength: '100000', placeholder: 'What needs your attention?', 'aria-label': 'Message Attention' } });
  input.addEventListener('input', () => { controller.setDraft(input.value); updateControls(); });
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); if (!send.disabled) void controller.send(); } });
  const send = action('arrow-up', 'Send to Attention', () => controller.send(), { className: 'primary-button' });
  const stop = action('square', 'Cancel Attention run', () => controller.cancel());
  const runtime = el('details', { className: 'attention-agent-runtime' }, el('summary', { text: 'Runtime & memory' }));
  const runtimeBody = el('div'); runtime.append(runtimeBody);
  const composer = el('div', { className: 'attention-agent-composer' }, input, stop, send);
  const status = el('div', { className: 'attention-agent-status' }, feedback, runtime);
  dialog.append(header, toolbar, coordination.root, stream, status, composer);
  dialog.addEventListener('close', deactivate);
  dialog.addEventListener('cancel', event => { if (event.isComposing) event.preventDefault(); });
  dialog.addEventListener('keydown', event => { if (event.key === 'Escape' && event.isComposing) event.preventDefault(); });
  function deactivate() {
    coordination.deactivate(); visible = false; openingEpoch++; clearTimeout(timer); timer = null; controller.deactivate();
    if (opener?.isConnected) opener.focus();
  }
  function close() { dialog.close(); }
  function updateControls() {
    const state = controller.state, active = controller.active();
    input.readOnly = state.busy || Boolean(state.command);
    send.disabled = state.busy || Boolean(active) || !state.draft.trim();
    send.setAttribute('aria-label', state.command ? 'Retry the same Attention message' : 'Send to Attention');
    stop.hidden = !active; stop.disabled = state.busy || active?.status === 'stopping';
    refresh.disabled = state.busy || state.loading;
    history.disabled = state.busy || Boolean(state.command);
    full.hidden = !state.session; configure.disabled = state.busy || Boolean(state.command);
  }
  function render() {
    if (!visible) return;
    const state = controller.state;
    if (input.value !== state.draft) input.value = state.draft;
    const options = JSON.stringify(state.conversations.map(s => [s.id, s.title]));
    if (history.dataset.signature !== options) {
      history.replaceChildren(el('option', { text: 'New conversation', attrs: { value: '' } }),
        ...state.conversations.map(s => el('option', { text: `${s.title} · ${new Date(s.createdAt).toLocaleString()}`, attrs: { value: s.id } })));
      history.dataset.signature = options;
    }
    history.value = state.conversationId || '';
    updateControls();
    const run = controller.active() || state.runs.at(-1);
    feedback.textContent = state.error || state.readError || (state.busy ? 'Sending request…' : state.loading && !state.session ? 'Loading…' : run ? `Run ${run.status}` : '');
    feedback.hidden = !feedback.textContent;
    const provider = getProvider?.();
    const config = run?.provider || provider?.config;
    runtimeBody.replaceChildren(el('p', { text: config ? `${config.provider} · ${config.model}${run ? ' · recorded for this Run' : ' · configured for the next Run'}` : 'Model configuration unavailable' }),
      el('p', { text: provider?.execution?.mode === 'local-fake' ? 'Local simulation. Replies are generated by the test adapter.' : 'Runs use the configured provider.' }),
      el('p', { text: 'Memory source: retained conversation messages, loaded on demand. Other memory providers and email/meeting connectors are not implied by this view.' }),
      el('p', { text: 'Tool exposure and permissions come from Runtime. Project Attention items require their own disclosure. Closing this panel does not cancel a Run.' }));
    if (run?.usage) runtimeBody.append(el('p', { text: `Run usage${run.usage.missing ? ' (incomplete; lower bounds)' : ''}: ${run.usage.input} input · ${run.usage.output} output. Cache accounting is separate; this is not billing.` }));
    const nextSignature = JSON.stringify([state.events, state.runs, state.busy, state.readError]);
    if (nextSignature !== signature) {
      signature = nextSignature;
      const oldTop = stream.scrollTop, nearBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 80;
      const focused = stream.contains(document.activeElement) ? document.activeElement?.dataset.agentFocus : null;
      const selection = focused ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
      const expanded = new Set([...stream.querySelectorAll('details[open]')].map(node => node.dataset.row));
      stream.replaceChildren();
      const rows = projectThread(state.events, state.runs, state.session?.id).rows;
      if (!rows.length) stream.append(el('div', { className: 'attention-agent-empty' }, el('h3', { text: 'What matters next?' }),
        el('p', { text: 'Bring a question, find context from earlier work, or ask for a next step.' }),
        el('small', { className: 'attention-easter-egg', text: 'Attention is all you need!' })));
      for (const row of rows) {
        if (row.kind === "assistant" && !row.text?.trim()) continue;
        const block = el('section', { className: `attention-agent-message is-${row.kind}` });
        if (['user','assistant'].includes(row.kind)) {
          block.append(el('div', { className: 'attention-agent-message-heading' }, el('strong', { text: row.kind === 'user' ? 'You' : 'Attention' }),
            copyAction(row.text, 'Copy message', row.id)), markdown(row.text, { key: `attention:${state.session?.id}:${row.id}` }));
        } else if (row.kind === 'tool') {
          const detail = el('details', { attrs: { 'data-row': row.id } }, el('summary', { text: `${row.name} · ${row.phase}${row.isError ? ' · failed' : ''}` }),
            el('pre', { text: JSON.stringify({ request: row.request, result: row.result }, null, 2) }));
          detail.open = expanded.has(row.id); block.append(detail);
        } else if (row.kind === 'question' || row.kind === 'permission') {
          const run = state.runs.find(run => run.id === row.runId);
          block.append(el('p', { text: row.prompt }));
          if (canAnswer(row, run)) {
            if (row.kind === 'permission') {
              if (validPermission(row.payload)) {
                block.append(el('pre', { text: `${row.payload.tool} · ${row.payload.path}\n${row.payload.bytes} bytes · ${row.payload.contentSha256}\n${row.payload.preview}` }));
                for (const [label, decision] of [['Deny','deny'],['Allow this action','allow']]) {
                  const button = el('button', { text: label, attrs: { type: 'button', 'data-agent-focus': `${row.id}:${decision}` } });
                  button.disabled = state.busy || Boolean(state.readError);
                  button.addEventListener('click', () => controller.answer(row.runId, row.id, { decision })); block.append(button);
                }
              } else block.append(el('p', { text: 'Permission details are unavailable. Open the full conversation to inspect this request.' }));
            } else {
              const answer = el('textarea', { attrs: { rows: '2', maxlength: '4000', 'aria-label': 'Answer Attention', 'data-agent-focus': row.id } });
              answer.value = answers.get(row.id) || '';
              const button = el('button', { text: 'Send answer', attrs: { type: 'button', 'data-agent-focus': `${row.id}:send` } });
              button.disabled = state.busy || Boolean(state.readError) || !answer.value.trim();
              answer.addEventListener('input', () => { answers.set(row.id, answer.value); button.disabled = state.busy || Boolean(state.readError) || !answer.value.trim(); });
              button.addEventListener('click', () => controller.answer(row.runId, row.id, { answer: answer.value })); block.append(answer, button);
            }
          } else block.append(el('p', { className: 'form-help', text: row.questionStatus === 'pending' ? 'This Run is no longer accepting answers.' : `Request ${row.questionStatus}` }));
        } else if (row.kind === 'run-status') block.append(el('p', { className: 'form-help', text: `Run ${row.status || 'unknown'}` }));
        else if (row.kind === 'error') block.append(el('p', { text: row.text }));
        else if (row.kind === 'artifact') block.append(el('p', { text: `Recorded file: ${row.file.path}. Open the conversation to inspect this version.` }));
        else if (row.kind === 'notice') block.append(el('p', { className: 'form-help', text: row.data.message || row.data.code || 'Runtime notice' }));
        stream.append(block);
      }
      if (focused) { let target = stream.querySelector(`[data-agent-focus="${CSS.escape(focused)}"]`); if (target?.disabled) target = stream.querySelector(`[data-agent-focus="${CSS.escape(focused.replace(/:send$/, ''))}"]`); (target && !target.disabled ? target : input).focus(); if (target?.setSelectionRange && selection) target.setSelectionRange(...selection); }
      stream.scrollTop = nearBottom ? stream.scrollHeight : oldTop;
    }
    clearTimeout(timer);
    if (!state.busy && !state.loading && (controller.active() || state.command)) timer = setTimeout(() => { if (visible) void controller.refresh(); }, 1500);
  }
  return { controller, open() {
    opener = document.activeElement; visible = true; openingEpoch++; signature = '';
    if (!dialog.open) dialog.showModal();
    render(); input.focus(); void controller.refresh();
  }, close };
}
