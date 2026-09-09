import { renderUserMessage } from "./user-message.mjs";
import { renderRequestMeasurements } from "./telemetry-view.mjs";
import { el, action, markdown, copyAction } from './ui-controls.mjs';
import { projectThread, toolStateWord, canAnswer, validPermission } from './thread-projection.mjs';
import { createAttentionConversation } from './attention-conversation.mjs';
import { runLabels } from './inspector.mjs';
import { createCoordinationView } from './coordination-view.mjs';

export function createAttentionAgent(dialog, { request, onItems, onOpenSession, onConfigure, getProvider, onChooseModel }) {
  let visible = false, timer = null, opener = null, signature = '', openingEpoch = 0;
  const answers = new Map(), messageViews = new Map();
  let managing = false, recentSignature = "";
  const controller = createAttentionConversation({ request, changed: render });
  const header = el('header', { className: 'attention-agent-header' },
    el('div', {}, el('h2', { text: 'Attention', attrs: { id: 'attention-agent-title' } }), el('p', { className: 'form-help', text: 'Your global assistant' })),
    action('x', 'Close Attention', close));
  const history = el('select', { attrs: { 'aria-label': 'Attention conversation' } });
  history.addEventListener('change', () => { managing = false; signature = ''; void controller.choose(history.value); });
  const refresh = action('refresh-cw', 'Refresh Attention', () => controller.refresh());
  const items = el('button', { text: 'Attention items', className: 'text-button', attrs: { type: 'button' } });
  items.addEventListener('click', () => { close(); onItems(); });
  const full = el('button', { text: 'Open conversation', className: 'text-button', attrs: { type: 'button' } });
  full.addEventListener('click', () => { const id = controller.state.session?.id; if (id) { close(); onOpenSession(id); } });
  const configure = action('settings-2', 'Configure Attention Runtime', async () => { const own = openingEpoch; const id = await controller.ensureConversation(); if (id && visible && own === openingEpoch) { close(); onConfigure(id); } });
  const manage = el('button', { text: 'Conversations', className: 'text-button', attrs: { type: 'button' } });
  manage.addEventListener('click', () => { managing = !managing; render(); });
  const toolbar = el('div', { className: 'attention-agent-toolbar' }, history, refresh, manage, items, full, configure);
  const search = el('input', { attrs: { type: 'search', placeholder: 'Search conversations', 'aria-label': 'Search Attention conversations' } });
  const recentList = el('div', { className: 'attention-recent-list' });
  const newConversation = el('button', { text: 'New conversation', attrs: { type: 'button' } });
  newConversation.addEventListener('click', () => { managing = false; signature = ''; void controller.choose(''); });
  const recent = el('section', { className: 'attention-recents', attrs: { 'aria-label': 'Manage Attention conversations' } },
    el('div', { className: 'attention-recents-heading' }, el('h3', { text: 'Conversations' }), newConversation), search, recentList);
  search.addEventListener('input', renderRecent);
  function renderRecent() {
    recentList.replaceChildren();
    const state = controller.state;
    const sessions = state.conversations.filter(session => session.title.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase()));
    if (!sessions.length) recentList.append(el('p', { className: 'form-help', text: search.value ? 'No matching conversations.' : 'Your conversations will appear here.' }));
    for (const session of sessions) {
      const open = el('button', { className: 'text-button', text: session.title, attrs: { type: 'button' } });
      open.disabled = state.busy || Boolean(state.command);
      open.addEventListener('click', () => { managing = false; signature = ''; void controller.choose(session.id); });
      const rename = el('button', { className: 'text-button', text: 'Rename', attrs: { type: 'button', 'aria-label': `Rename ${session.title}` } });
      rename.disabled = open.disabled;
      const row = el('div', { className: 'attention-recent-row' }, open, el('time', { className: 'form-help', text: new Date(session.createdAt).toLocaleDateString(), attrs: { datetime: session.createdAt } }), rename);
      rename.addEventListener('click', () => {
        const name = el('input', { attrs: { 'aria-label': 'Conversation name', maxlength: '200', required: '' } }); name.value = session.title;
        const save = el('button', { text: 'Save', attrs: { type: 'submit' } });
        const cancel = el('button', { text: 'Cancel', attrs: { type: 'button' } }); cancel.addEventListener('click', renderRecent);
        const form = el('form', { className: 'attention-rename-form' }, name, save, cancel);
        form.addEventListener('submit', async event => { event.preventDefault(); if (name.value.trim()) { const title = name.value.trim(); await controller.rename(session.id, title); } });
        row.replaceChildren(form); name.focus(); name.select();
      });
      recentList.append(row);
    }
  }
  const stream = el('div', { className: 'attention-agent-stream', attrs: { 'aria-label': 'Attention conversation messages', tabindex: '0' } });
  const feedback = el('p', { className: 'form-help', attrs: { role: 'status' } });
  const input = el('input', { attrs: { type: 'text', maxlength: '100000', placeholder: 'What needs your attention?', 'aria-label': 'Message Attention' } });
  input.addEventListener('input', () => { controller.setDraft(input.value); updateControls(); });
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); if (!send.disabled) void controller.send(); } });
  const modelChoice = el('button', {className:'attention-model-choice',text:'Model',attrs:{type:'button','aria-label':'Choose model and effort'}});
  modelChoice.addEventListener('click', () => onChooseModel?.());
  const send = action('arrow-up', 'Send to Attention', () => controller.send(), { className: 'primary-button' });
  const stop = action('square', 'Cancel Attention run', () => controller.cancel());
  const runtime = el('details', { className: 'attention-agent-runtime' }, el('summary', { text: 'Runtime & memory' }));
  const runtimeBody = el('div'); runtime.append(runtimeBody);
  const composer = el('div', { className: 'attention-agent-composer' }, input, modelChoice, stop, send);
  const status = el('div', { className: 'attention-agent-status' }, feedback, runtime);
  /* WO-MA2-02 · the Thread consumer panel. It is collapsed by default, fetches
   * only while expanded, and does not compete with the composer for focus. */
  const coordination = createCoordinationView({ request });
  dialog.append(header, toolbar, recent, coordination.root, stream, status, composer);
  dialog.addEventListener('close', deactivate);
  dialog.addEventListener('cancel', event => { if (event.isComposing) event.preventDefault(); });
  dialog.addEventListener('keydown', event => { if (event.key === 'Escape' && event.isComposing) event.preventDefault(); });
  function deactivate() {
    visible = false; openingEpoch++; clearTimeout(timer); timer = null; controller.deactivate(); coordination.deactivate();
    if (opener?.isConnected) opener.focus();
  }
  function close() { dialog.close(); }
  function updateControls() {
    const state = controller.state, active = controller.active();
    input.readOnly = state.busy || Boolean(state.command);
    send.disabled = state.busy || Boolean(active) || !state.draft.trim();
    send.setAttribute('aria-label', state.command ? 'Retry the same Attention message' : 'Send to Attention');
    send.hidden = Boolean(active);
    stop.hidden = !active; stop.disabled = state.busy || active?.status === 'stopping';
    refresh.disabled = state.busy || state.loading;
    history.disabled = state.busy || Boolean(state.command);
    manage.disabled = state.busy || Boolean(state.command);
    newConversation.disabled = state.busy || Boolean(state.command);
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
    recent.hidden = Boolean(state.conversationId) && !managing;
    stream.hidden = managing;
    const recentKey = JSON.stringify([state.conversations, state.busy, Boolean(state.command)]);
    if (recentSignature !== recentKey) { recentSignature = recentKey; renderRecent(); }
    const run = controller.active() || state.runs.at(-1);
    feedback.textContent = state.error || state.readError || (state.busy ? 'Sending request…' : state.loading && !state.session ? 'Loading…' : controller.active() ? (runLabels[run.status] || runLabels.unknown) : '');
    feedback.hidden = !feedback.textContent;
    const provider = getProvider?.();
    modelChoice.textContent = provider?.config?.provider === "fake-openai-loopback" ? "Local test" : provider?.config?.model || "Model";
    modelChoice.title = `${modelChoice.textContent} · ${provider?.config?.reasoningEffort || "default effort"}`;
    const config = run?.provider || provider?.config;
    runtimeBody.replaceChildren(el('p', { text: config ? `${config.provider} · ${config.model}${run ? ' · recorded for this Run' : ' · configured for the next Run'}` : 'Model configuration unavailable' }),
      el('p', { text: provider?.execution?.mode === 'local-fake' ? 'Local simulation. Replies are generated by the test adapter.' : 'Runs use the configured provider.' }),
      el('p', { text: 'Memory: saved conversation messages, loaded on demand.' }),
      el('p', { text: 'Tool access follows Runtime permissions. Closing this panel keeps the Run active.' }));
    if (run) runtimeBody.append(renderRequestMeasurements(state.events, run.id, {compact:true}));
    if (run?.usage) runtimeBody.append(el('p', { text: `Run usage${run.usage.missing ? ' (incomplete; lower bounds)' : ''}: ${run.usage.input} input · ${run.usage.output} output. Cache accounting is separate; this is not billing.` }));
    const nextSignature = JSON.stringify([state.events, state.runs, state.busy, state.readError]);
    if (nextSignature !== signature) {
      signature = nextSignature;
      const oldTop = stream.scrollTop, nearBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 80;
      const focusAttribute = document.activeElement?.hasAttribute('data-agent-focus') ? 'data-agent-focus' : 'data-focus-key';
      const focused = stream.contains(document.activeElement) ? document.activeElement?.getAttribute(focusAttribute) : null;
      const selection = focused ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
      const expanded = new Set([...stream.querySelectorAll('details[open]')].map(node => node.dataset.row));
      stream.replaceChildren();
      const { rows, statuses: runStatuses } = projectThread(state.events, state.runs, state.session?.id);
      if (!rows.length) stream.append(el('div', { className: 'attention-agent-empty' }, el('h3', { text: 'What matters next?' }),
        el('p', { text: 'Bring a question, find context from earlier work, or ask for a next step.' }),
        el('small', { className: 'attention-easter-egg', text: 'Attention is all you need!' })));
      let responseGroup = null, responseRun = null, activityGroup = null;
      for (const row of rows) {
        if (row.kind === "assistant" && !row.text?.trim()) continue;
        if (row.kind === 'user') { responseGroup = null; responseRun = null; activityGroup = null; }
        else if (!responseGroup || responseRun !== row.runId) {
          responseGroup = el('section', { className: 'attention-response-group', attrs: { 'aria-label': 'Agent run' } });
          stream.append(responseGroup); responseRun = row.runId; activityGroup = null;
        }
        if (row.kind !== 'tool') activityGroup = null;
        const block = el('section', { className: `attention-agent-message is-${row.kind}` });
        if (row.kind === 'user') {
          block.className = 'attention-authored-message';
          block.append(renderUserMessage(row, { key: `${state.session?.id}:${row.id}`, viewState: messageViews,
            editDisabled: state.busy || Boolean(state.command),
            onCopy: async text => { try { await navigator.clipboard.writeText(text); feedback.textContent = 'Message copied.'; } catch { feedback.textContent = 'Copy is unavailable.'; } feedback.hidden = false; },
            onEdit: () => { controller.setDraft(row.text); input.value = row.text; updateControls(); input.focus(); }
          }));
        } else if (row.kind === 'assistant') {
          block.append(el('div', { className: 'attention-agent-message-heading' }, el('span', { className: 'message-role', text: 'Attention' })),
            markdown(row.text, { key: `attention:${state.session?.id}:${row.id}` }));
          if (!row.pending) block.append(el('footer', { className: 'assistant-message-actions' }, copyAction(row.text, 'Copy response', row.id)));
        } else if (row.kind === 'tool') {
          const word = toolStateWord(row, runStatuses.get(row.runId) || state.runs.find(run => run.id === row.runId)?.status);
          const summary = el('summary', { text: row.name });
          if (word) summary.append(el('span', { className: 'attention-tool-state', text: word }));
          const detail = el('details', { attrs: { 'data-row': row.id } }, summary,
            el('pre', { text: JSON.stringify({ request: row.request, result: row.result }, null, 2) }));
          detail.open = expanded.has(row.id); block.append(detail);
        } else if (row.kind === 'question' || row.kind === 'permission') {
          const run = state.runs.find(run => run.id === row.runId);
          block.append(el('strong', { text: row.kind === 'permission' ? 'Permission request' : 'Question' }), el('p', { text: row.prompt }));
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
        } else if (row.kind === 'run-status') block.append(el('p', { className: 'form-help', text: runLabels[row.status] || runLabels.unknown }));
        else if (row.kind === 'error') block.append(el('p', { text: row.text }));
        else if (row.kind === 'artifact') block.append(el('p', { text: `Recorded file: ${row.file.path}. Open the conversation to inspect this version.` }));
        else if (row.kind === 'notice') block.append(el('p', { className: 'form-help', text: row.data.message || row.data.code || 'Runtime notice' }));
        if (row.kind === 'tool') {
          if (!activityGroup) {
            activityGroup = el('details', { className: 'attention-activity-group', attrs: { 'data-row': `activity:${row.id}` } }, el('summary', { text: 'Tool activity' }));
            activityGroup.open = expanded.has(`activity:${row.id}`); responseGroup.append(activityGroup);
          }
          activityGroup.append(block);
        } else (responseGroup || stream).append(block);
      }
      if (focused) { let target = stream.querySelector(`[${focusAttribute}="${CSS.escape(focused)}"]`); if (target?.disabled) target = stream.querySelector(`[data-agent-focus="${CSS.escape(focused.replace(/:send$/, ''))}"]`); (target && !target.disabled ? target : input).focus(); if (target?.setSelectionRange && selection) target.setSelectionRange(...selection); }
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
