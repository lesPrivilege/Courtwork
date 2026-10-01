import { captureChatReading, restoreChatReading } from "./chat-reading.mjs";
import { createChatActions, createProductionActionAdapter, restoreChatActionFocus } from "./chat-actions.mjs";
import { renderUserMessage, renderAnswerFooter } from "./user-message.mjs";
import { renderRequestMeasurements } from "./telemetry-view.mjs";
import { createRunActivity } from "./run-activity.mjs";
import { el, action, flowRow } from './ui-controls.mjs';
import { projectThread, toolStateWord, canAnswer, validPermission, unfinishedToolWord } from './thread-projection.mjs';
import { runBinding, openApprovalBasis, recordedApprovalBasis } from './approval-basis.mjs';
import { growsTextOnly } from './session-events.mjs';
import { createBodyRegistry } from './stream-body.mjs';
import {
  executionDisclosureMemberId,
  executionDisclosureStateKey,
  projectExecutionDisclosures,
} from './execution-disclosure.mjs';
import { createDraftAttachments } from './draft-attachments.mjs';
import { createAttentionConversation } from './attention-conversation.mjs';
import { runLabels } from './inspector.mjs';
import { createCoordinationView } from './coordination-view.mjs';
import { renderToolRow } from './run-rows.mjs';

/* One approval request in the Attention assistant. What is being approved is
 * the shared approval basis, the same nodes the Chat card shows, so this
 * surface never offers Approve on less: recipe, command and arguments, the
 * candidate and its revision, and the files the model wrote. If that basis
 * cannot be built the request is answered from the full conversation instead.
 * The buttons, their wiring and the row's own words stay here. */
export function renderAttentionApproval(row, { run, events, disabled = false, expanded = new Set(), onAnswer }) {
  const payload = row.payload, open = canAnswer(row, run);
  const heading = () => [el('strong', { text: 'Approval request' }), el('p', { text: row.prompt })];
  let basis = null;
  if (validPermission(payload)) {
    try {
      const binding = runBinding(events, row.runId);
      basis = open ? openApprovalBasis(payload, events, binding) : recordedApprovalBasis(payload, events, binding, row.decision);
    } catch { basis = null; }
  }
  if (open) {
    if (!basis) return [...heading(), el('p', { text: 'Permission details are unavailable. Open the full conversation to inspect this request.' })];
    // The shared title names the request; the disclosure inside keeps its place across rebuilds.
    const details = basis.nodes.find(node => String(node.tagName).toLowerCase() === 'details');
    if (details) { details.setAttribute('data-row', `${row.id}:details`); details.open = expanded.has(`${row.id}:details`); }
    // Focus on the disclosure or its Copy survives a rebuild of the stream, like the answer buttons.
    details?.querySelector('summary')?.setAttribute('data-agent-focus', `${row.id}:basis`);
    details?.querySelector('button')?.setAttribute('data-agent-focus', `${row.id}:copy`);
    // The Chat card's words and controls: the answer names what it answers (a check, a write, an action).
    const actions = el('div', { className: 'question-actions' });
    for (const [label, decision] of [[`Deny this ${basis.display.noun}`,'deny'],[`Approve this ${basis.display.noun}`,'allow']]) {
      const button = el('button', { className: decision === 'allow' ? 'primary-button' : 'secondary-button', text: label, attrs: { type: 'button', 'data-agent-focus': `${row.id}:${decision}` } });
      button.disabled = disabled;
      button.addEventListener('click', () => onAnswer(decision)); actions.append(button);
    }
    // The shared title is the card's heading; the Host's generic prompt would only repeat it.
    return [el('div', { className: 'attention-approval-basis' }, ...basis.nodes), actions];
  }
  if (!basis) {
    const decision = row.decision === 'allow' ? 'approved' : row.decision === 'deny' ? 'denied' : row.questionStatus === 'pending' ? 'closed' : row.questionStatus;
    return [...heading(), el('p', { className: 'form-help', text: row.decision
      ? `Approval ${decision} for this exact tool action. Review acceptance is not recorded here.`
      : row.questionStatus === 'pending' ? 'This Run is no longer accepting answers.' : `Request ${row.questionStatus}` })];
  }
  // A decided request states what was recorded, as the Chat record does.
  const record = el('details', {},
    el('summary', { text: `${basis.display.target} · ${basis.meta}` }), el('div', { className: 'attention-approval-basis' }, ...basis.nodes));
  record.setAttribute('data-row', row.id); record.open = expanded.has(row.id);
  record.querySelector('summary')?.setAttribute('data-agent-focus', `${row.id}:record`);
  return [el('strong', { text: 'Approval request' }), record];
}

export function createAttentionAgent(dialog, { request, onItems, onOpenSession, onConfigure, getProvider, onChooseModel, itemsSummary = () => null }) {
  let visible = false, timer = null, opener = null, signature = '', openingEpoch = 0;
  // Order 3 · bodies by segment key, the structure the thread was last built
  // from, and the newest event it shows.
  const assistantBodies = createBodyRegistry();
  let renderedStructure = '', renderedSeq = 0;
  const answers = new Map(), messageViews = new Map(), measurementViews = new Map();
  const executionOpenByRun = new Map();
  let managing = false, recentSignature = "";
  let attachments = null, attachmentOwner = null;
  const attachmentDrafts = new Map();
  const controller = createAttentionConversation({ request, changed: render, beforeSend: id => attachments.flush(request,id) });
  const header = el('header', { className: 'attention-agent-header' },
    el('div', {}, el('h2', { text: 'Attention', attrs: { id: 'attention-agent-title' } }), el('p', { className: 'form-help', text: 'Your global assistant' })),
    action('x', 'Close Attention', close));
  const history = el('select', { attrs: { 'aria-label': 'Attention conversation' } });
  history.addEventListener('change', () => { managing = false; signature = ''; void controller.choose(history.value); });
  const refresh = action('refresh-cw', 'Refresh Attention', () => controller.refresh());
  const items = el('button', { text: 'Attention items', className: 'text-button', attrs: { type: 'button' } });
  items.addEventListener('click', () => { close(); onItems(); });
  /* S4 · the way to the item queue says what the rail's Attention count says:
   * how many items need the person in the working project. */
  function renderItemsSummary() {
    const summary = itemsSummary();
    items.textContent = summary ? `Attention items · ${summary}` : 'Attention items';
  }
  renderItemsSummary();
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
  const recent = el('section', { className: 'attention-recents', attrs: { 'aria-label': 'Manage Attention conversations', id:'attention-conversations' } },
    el('div', { className: 'attention-recents-heading' }, el('h3', { text: 'Conversations' }), newConversation), search, recentList);
  search.addEventListener('input', renderRecent);
  function messageActionRow(row, state) {
    const sessionId = state.session?.id, own = openingEpoch;
    const target = {key: JSON.stringify([sessionId, own, row.kind, row.id]), role: row.kind,
      sessionId, runId: row.runId, projectionId: row.id, text: row.text, pending: Boolean(row.pending),
      editDisabled: state.busy || Boolean(state.command)};
    return createChatActions({target,
      getTarget: () => visible && openingEpoch === own && controller.state.session?.id === sessionId ? target : null,
      adapter: createProductionActionAdapter({
        copy: ({text}) => navigator.clipboard.writeText(text),
        ...(row.kind === 'user' ? {edit: () => {controller.setDraft(row.text); input.value=row.text; updateControls(); input.focus();}} : {}),
      }),
    });
  }
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
  modelChoice.addEventListener('click', () => onChooseModel?.(modelChoice));
  const send = action('arrow-up', 'Send to Attention', () => controller.send(), { className: 'primary-button' });
  const stop = action('square', 'Cancel Attention run', () => controller.cancel());
  const runtime = el('details', { className: 'attention-agent-runtime' }, el('summary', { text: 'Runtime & memory' }));
  const runtimeBody = el('div'); runtime.append(runtimeBody);
  attachments = createDraftAttachments({locked:()=>controller.state.busy || Boolean(controller.state.command)});
  const composer = el('div', { className: 'attention-agent-composer' }, input, attachments.trigger, modelChoice, stop, send);
  composer.append(attachments.popover);
  // Attention subtracts the Chat measurement controls: one noninteractive state line.
  const activity = createRunActivity();
  const status = el('div', { className: 'attention-agent-status' }, activity.root, feedback, runtime);
  /* WO-MA2-02 · the Thread consumer panel. It is collapsed by default, fetches
   * only while expanded, and does not compete with the composer for focus. */
  const coordination = createCoordinationView({ request });
  dialog.append(header, toolbar, recent, coordination.root, stream, status, composer);
  dialog.addEventListener('close', deactivate);
  dialog.addEventListener('cancel', event => { if (event.isComposing) event.preventDefault(); });
  dialog.addEventListener('keydown', event => { if (event.key === 'Escape' && event.isComposing) event.preventDefault(); });
  function deactivate() {
    visible = false; openingEpoch++; clearTimeout(timer); timer = null; controller.deactivate(); coordination.deactivate(); activity.deactivate();
    if (opener?.isConnected) opener.focus();
  }
  function close() { dialog.close(); }
  function updateControls() {
    attachments?.render();
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
    const nextOwner = controller.state.conversationId;
    if (nextOwner !== attachmentOwner) {
      // Assigning the first ID continues the new draft. Selecting another ID
      // restores that conversation's own pending attachments.
      if (attachmentOwner !== null || !nextOwner || !controller.state.busy) {
        attachmentDrafts.set(attachmentOwner, attachments.snapshot());
        attachments.restore(attachmentDrafts.get(nextOwner) || []);
      }
      attachmentOwner = nextOwner;
    }
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
    recent.hidden = !managing;
    manage.setAttribute('aria-expanded', String(managing));
    manage.setAttribute('aria-controls', 'attention-conversations');
    stream.hidden = managing;
    const recentKey = JSON.stringify([state.conversations, state.busy, Boolean(state.command)]);
    if (recentSignature !== recentKey) { recentSignature = recentKey; renderRecent(); }
    const run = controller.active() || state.runs.at(-1);
    activity.update({ run: controller.active(), events: state.events, connected: !state.readError, pendingCancel: state.busy, visible: visible && !managing });
    feedback.textContent = state.error || state.readError || (state.busy ? 'Sending request…' : state.loading && !state.session ? 'Loading…' : '');
    feedback.hidden = !feedback.textContent;
    const provider = getProvider?.();
    modelChoice.textContent = provider?.config?.provider === "fake-openai-loopback" ? "Local test" : provider?.config?.model || "Model";
    modelChoice.title = `${modelChoice.textContent} · ${provider?.config?.reasoningEffort || "default effort"}`;
    const config = run?.provider || provider?.config;
    runtimeBody.replaceChildren(el('p', { text: config ? `${config.provider} · ${config.model}${run ? ' · recorded for this Run' : ' · configured for the next Run'}` : 'Model configuration unavailable' }),
      el('p', { text: provider?.execution?.mode === 'local-fake' ? 'Local simulation. Replies are generated by the test adapter.' : 'Runs use the configured provider.' }),
      el('p', { text: 'Memory: saved conversation messages, loaded on demand.' }),
      el('p', { text: 'Tool access follows Runtime permissions. Closing this panel keeps the Run active.' }));
    if (run) {
      const key = JSON.stringify([state.session?.id, run.id]);
      if (!measurementViews.has(key)) measurementViews.set(key,new Set());
      runtimeBody.append(renderRequestMeasurements(state.events, run.id, {compact:true,opened:measurementViews.get(key)}));
    }
    if (run?.usage) runtimeBody.append(el('p', { text: `Usage${run.usage.missing ? ' (incomplete; lower bounds)' : ''}: ${run.usage.input} input · ${run.usage.output} output. Cache accounting is separate; this is not billing.` }));
    const structure = JSON.stringify([state.session?.id, state.runs, state.busy, state.readError]);
    const nextSignature = `${structure}|${state.lastSeq}|${state.events.length}`;
    // Order 3 · events that only grow assistant text update those bodies in
    // place; anything else builds the thread from the projection again.
    if (nextSignature !== signature && signature && structure === renderedStructure && patchGrowingBodies()) signature = nextSignature;
    else if (nextSignature !== signature) {
      signature = nextSignature;
      renderedStructure = structure;
      renderedSeq = state.lastSeq;
      const readingSnapshot = captureChatReading(stream);
      const focusedReadingKey = document.activeElement?.closest?.('[data-reading-key]')?.dataset?.readingKey || null;
      const oldTop = stream.scrollTop, nearBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 80;
      const focusAttribute = document.activeElement?.hasAttribute('data-agent-focus') ? 'data-agent-focus' : 'data-focus-key';
      const focused = stream.contains(document.activeElement) ? document.activeElement?.getAttribute(focusAttribute) : null;
      const selection = focused ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
      const expanded = new Set([...stream.querySelectorAll('details[open]')].map(node => node.dataset.row));
      assistantBodies.holdSelection(); // D2(a) across this rebuild
      stream.replaceChildren();
      const { rows, statuses: runStatuses } = projectThread(state.events, state.runs, state.session?.id);
      const executionDisclosures = projectExecutionDisclosures(rows, runStatuses);
      const executionMembers = new Map(), executionOpen = new Map();
      const readingIndices = new Map(rows.map((row, index) => [
        JSON.stringify([state.session?.id, row.runId, row.kind, row.id]),
        index,
      ]));
      const selectionIndices = [readingSnapshot.selection?.start?.key, readingSnapshot.selection?.end?.key]
        .map(key => readingIndices.get(key)).filter(Number.isInteger);
      const selectionSpan = selectionIndices.length
        ? [Math.min(...selectionIndices), Math.max(...selectionIndices)]
        : null;
      const continuityKeys = new Set([
        readingSnapshot.anchor?.key,
        readingSnapshot.selection?.start?.key,
        readingSnapshot.selection?.end?.key,
      ].filter(Boolean));
      if (!rows.length) stream.append(el('div', { className: 'attention-agent-empty' }, el('p', { text: 'Ask a question or find context from earlier work.' })));
      let responseGroup = null, responseRun = null;
      for (const row of rows) {
        if (row.kind === "assistant" && !row.text?.trim()) continue;
        if (row.kind === 'user') { responseGroup = null; responseRun = null; }
        else if (!responseGroup || responseRun !== row.runId) {
          responseGroup = el('section', { className: 'attention-response-group', attrs: { 'aria-label': 'Agent run' } });
          stream.append(responseGroup); responseRun = row.runId;
        }
        const executionMember = executionDisclosures.members.get(row);
        if (executionMember && executionMember.index === executionMember.plan.firstIndex) {
          const plan = executionMember.plan;
          const groupKey = executionDisclosureStateKey(state.session?.id, plan.runId);
          const selectionTouchesGroup = plan.items.some(({ row: member, index }) => {
            const key = JSON.stringify([state.session?.id, member.runId, member.kind, member.id]);
            return continuityKeys.has(key) || focusedReadingKey === key ||
              (selectionSpan && index >= selectionSpan[0] && index <= selectionSpan[1]);
          });
          const groupOpen = executionOpenByRun.has(groupKey)
            ? Boolean(executionOpenByRun.get(groupKey))
            : selectionTouchesGroup || plan.items.some(({ row: member }) => member.kind === 'tool' && expanded.has(member.id));
          const ids = plan.items.map(({ row: member }) =>
            executionDisclosureMemberId('attention', state.session?.id, plan.runId, `${member.kind}:${member.id}`),
          );
          const button = flowRow('button', {
            glyph: 'activity',
            title: 'Execution',
            meta: `${plan.callCount} successful ${plan.callCount === 1 ? 'tool action' : 'tool actions'}`,
            className: 'execution-disclosure-summary',
            attrs: { type: 'button', 'aria-expanded': String(groupOpen), 'aria-controls': ids.join(' ') },
          });
          button.dataset.readingKey = JSON.stringify([state.session?.id, plan.runId, 'execution', plan.runId]);
          button.addEventListener('click', () => {
            const nextOpen = button.getAttribute('aria-expanded') !== 'true';
            button.setAttribute('aria-expanded', String(nextOpen));
            executionOpenByRun.set(groupKey, nextOpen);
            for (const node of executionMembers.get(plan) || []) node.hidden = !nextOpen;
          });
          executionMembers.set(plan, []);
          executionOpen.set(plan, groupOpen);
          responseGroup.append(button);
        }
        const block = el('section', { className: `attention-agent-message is-${row.kind}`, attrs: {'data-reading-key': JSON.stringify([state.session?.id, row.runId, row.kind, row.id])} });
        if (executionMember) {
          block.id = executionDisclosureMemberId('attention', state.session?.id, row.runId, `${row.kind}:${row.id}`);
          block.hidden = !executionOpen.get(executionMember.plan);
          executionMembers.get(executionMember.plan)?.push(block);
        }
        if (row.kind === 'user') {
          block.className = 'attention-authored-message';
          block.append(renderUserMessage(row, { key: `${state.session?.id}:${row.id}`, viewState: messageViews,
            actions: messageActionRow(row, state),
            editDisabled: state.busy || Boolean(state.command),
            onCopy: async text => { try { await navigator.clipboard.writeText(text); feedback.textContent = 'Message copied.'; } catch { feedback.textContent = 'Copy is unavailable.'; } feedback.hidden = false; },
            onEdit: () => { controller.setDraft(row.text); input.value = row.text; updateControls(); input.focus(); }
          }));
        } else if (row.kind === 'assistant') {
          const body = assistantBodies.body(`attention:${state.session?.id}:${row.id}`, row.text, { settled: !row.pending });
          block.append(body.root, body.hint);
          // Text the Run stopped before finishing reads as such (WK-57 words).
          if (row.partial) block.append(el('p', { className: 'form-help message-state', text: unfinishedToolWord(runStatuses.get(row.runId)) }));
          const footer = renderAnswerFooter(row, () => messageActionRow(row, state));
          if (footer) block.append(footer);
        } else if (row.kind === 'tool') {
          const word = toolStateWord(row, runStatuses.get(row.runId) || state.runs.find(run => run.id === row.runId)?.status);
          const detail = renderToolRow(row, { toolState: word, open: expanded.has(row.id), onToggle: () => {} });
          detail.dataset.row = row.id;
          block.append(detail);
        } else if (row.kind === 'permission') {
          block.append(...renderAttentionApproval(row, {
            run: state.runs.find(run => run.id === row.runId), events: state.events, expanded,
            disabled: state.busy || Boolean(state.readError),
            onAnswer: decision => controller.answer(row.runId, row.id, { decision }),
          }));
        } else if (row.kind === 'question') {
          const run = state.runs.find(run => run.id === row.runId);
          block.append(el('strong', { text: 'Question' }), el('p', { text: row.prompt }));
          if (canAnswer(row, run)) {
            const answer = el('textarea', { attrs: { rows: '2', maxlength: '4000', 'aria-label': 'Answer Attention', 'data-agent-focus': row.id } });
            answer.value = answers.get(row.id) || '';
            const button = el('button', { text: 'Send answer', attrs: { type: 'button', 'data-agent-focus': `${row.id}:send` } });
            button.disabled = state.busy || Boolean(state.readError) || !answer.value.trim();
            answer.addEventListener('input', () => { answers.set(row.id, answer.value); button.disabled = state.busy || Boolean(state.readError) || !answer.value.trim(); });
            button.addEventListener('click', () => controller.answer(row.runId, row.id, { answer: answer.value })); block.append(answer, button);
          } else block.append(el('p', { className: 'form-help', text: row.questionStatus === 'pending' ? 'This Run is no longer accepting answers.' : `Request ${row.questionStatus}` }));
        } else if (row.kind === 'run-status') block.append(el('p', { className: 'form-help', text: runLabels[row.status] || runLabels.unknown }));
        else if (row.kind === 'error') block.append(el('p', { text: row.text }));
        else if (row.kind === 'artifact') block.append(el('p', { text: `Recorded file: ${row.file.path}. Open the conversation to inspect this version.` }));
        else if (row.kind === 'notice') block.append(el('p', { className: 'form-help', text: row.data.message || row.data.code || 'Runtime notice' }));
        (responseGroup || stream).append(block);
      }
      assistantBodies.sweep();
      if (focused?.startsWith('chat-action:')) restoreChatActionFocus(stream, focused);
      else if (focused) { let target = stream.querySelector(`[${focusAttribute}="${CSS.escape(focused)}"]`); if (target?.disabled) target = stream.querySelector(`[data-agent-focus="${CSS.escape(focused.replace(/:send$/, ''))}"]`); (target && !target.disabled ? target : input).focus(); if (target?.setSelectionRange && selection) target.setSelectionRange(...selection); }
      stream.scrollTop = nearBottom && !readingSnapshot.selection ? stream.scrollHeight : oldTop;
      restoreChatReading(stream, readingSnapshot, {followLatest: nearBottom && !readingSnapshot.selection});
      // An open approval is read from its top (UX-02): when its card is taller than
      // the stream, following the latest shows where the card starts, not only its buttons.
      const approval = nearBottom && !readingSnapshot.selection ? stream.querySelector('.question-actions')?.parentElement : null;
      if (approval && approval.offsetHeight > stream.clientHeight) stream.scrollTop += approval.getBoundingClientRect().top - stream.getBoundingClientRect().top;
    }
    clearTimeout(timer);
    if (!state.busy && !state.loading && (controller.active() || state.command)) timer = setTimeout(() => { if (visible) void controller.refresh({ follow: true }); }, 1500);
  }
  function patchGrowingBodies() {
    const state = controller.state;
    if (!growsTextOnly(state.events.filter(event => event.seq > renderedSeq))) return false;
    const growing = projectThread(state.events, state.runs, state.session?.id).rows
      .filter(row => row.kind === 'assistant' && row.pending && row.text?.trim());
    const bodies = growing.map(row => assistantBodies.get(`attention:${state.session?.id}:${row.id}`));
    if (!growing.length || bodies.some(body => !body?.root.isConnected)) return false;
    const nearBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 80;
    const selected = !document.getSelection?.()?.isCollapsed;
    growing.forEach((row, index) => bodies[index].update(row.text));
    if (nearBottom && !selected) stream.scrollTop = stream.scrollHeight;
    renderedSeq = state.lastSeq;
    return true;
  }
  return { controller, renderItemsSummary, open() {
    opener = document.activeElement; visible = true; openingEpoch++; signature = '';
    renderItemsSummary();
    if (!dialog.open) dialog.showModal();
    render(); input.focus(); void controller.refresh();
  }, close };
}
