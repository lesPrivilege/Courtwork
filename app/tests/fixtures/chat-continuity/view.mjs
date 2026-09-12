import { createSpecimenController } from './controller.mjs';
import { el, action, markdown, installTooltips } from '/web/ui-controls.mjs';
import { renderUserMessage } from '/web/user-message.mjs';
import { createChatActions } from '/web/chat-actions.mjs';
import { createModelPicker } from '/web/model-picker.mjs';
import { installComposerGrowth } from '/web/composer-field.mjs';

const controller = createSpecimenController();
const $ = (selector) => document.querySelector(selector);
const thread = $('#thread'), composer = $('#composer-input'), main = $('#continuity-main'), overlay = $('#source-dialog');
const expanded = new Map();
let state = controller.getState(), sourceReturn = null, overlayMode = null, restoringReading = false;
const picker = createModelPicker({ request: (path, options) => controller.modelRequest(path, options), onSaved: result => controller.modelSaved(result) });

installTooltips();
const fitComposer = installComposerGrowth(composer);

const clock = () => new Date('2026-09-12T03:00:00.000Z').toISOString();
function actionAdapter(record) {
  return {
    availability(intent) {
      if (intent === 'copy') return { available: true };
      if (intent === 'edit' && record.role === 'user' && record.origin === 'authored' && state.channel?.canSend) return { available: true };
      return { available: false, reason: 'This specimen does not provide that action.' };
    },
    async invoke(intent, target) {
      if (intent === 'edit') { controller.setDraft(target.text); composer.focus(); return { state: 'success', message: 'The original stays unchanged; its text is now a draft.' }; }
      if (intent === 'copy') {
        try { if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable in this browser context.'); await navigator.clipboard.writeText(target.text); return { state: 'success', message: 'Copied synthetic message text.' }; }
        catch (error) { throw new Error(error.message || 'Clipboard copy failed.'); }
      }
    },
  };
}
function messageActions(record) {
  const target = { key: `specimen:${state.scope.account}:${state.scope.channel}:${state.scope.scene}:${state.scope.session}:${record.id}`, role: record.role, text: record.text, sessionId: state.scope.session, runId: 'synthetic-run', projectionId: 'synthetic-chat', pending: false };
  const root = createChatActions({ target, adapter: actionAdapter(record), getTarget: () => target });
  if (record.origin === 'retained') {
    const label = state.scope.channel === 'hosted' ? 'Cite to draft' : 'Cite to hosted draft';
    const provenance = `${record.id} · ${state.scope.account} · ${state.scope.session}${record.refs?.length ? ' · ' + record.refs.map(ref => `${ref.id}@${ref.revision}`).join(', ') : ''}`;
    root.querySelector('.chat-action-row')?.append(action('copy', label, () => {
      if (state.scope.channel !== 'hosted') controller.choose({ channel: 'hosted' });
      const draft = controller.getState().draft || '';
      controller.setDraft(`${draft}${draft ? '\n\n' : ''}> ${record.text.split('\n').join('\n> ')}\n\nRetained citation: ${provenance}\n`);
      controller.setNotice('Retained text was cited in a new hosted draft. The original remains unchanged.');
      composer.focus();
    }, { visible: label, attrs: { 'data-testid': 'cite-to-draft' } }));
  }
  return root;
}
function refButton(ref) {
  const button = action('file-text', ref.label || `Source · ${ref.revision}`, () => {
    sourceReturn = { focus: button, scrollTop: main.scrollTop };
    controller.setReading({ scrollTop: main.scrollTop, expandedIds: [...expanded].filter(([, open]) => open).map(([id]) => id) });
    controller.openSource(ref);
  }, { visible: ref.label || `Source · ${ref.revision}`, size: 16, attrs: { 'data-testid': 'reference-link', 'data-ref-id': ref.id, 'data-revision': ref.revision } });
  return button;
}
function renderMessage(record) {
  const messageScope = JSON.stringify(state.scope);
  const viewState = { get: key => expanded.get(key), set: (key, value) => { if (messageScope !== JSON.stringify(state.scope)) return; expanded.set(key, value); controller.setReading({ expandedIds: [...expanded].filter(([, open]) => open).map(([id]) => id) }); } };
  const node = record.role === 'user'
    ? renderUserMessage({ ...record, startedAt: record.startedAt || clock() }, { key: `${state.scope.account}:${state.scope.channel}:${state.scope.scene}:${state.scope.session}:${record.id}`, viewState, actions: messageActions(record), onCopy: () => {}, onEdit: () => {} })
    : el('article', { className: 'message assistant', attrs: { 'aria-label': 'Assistant message', 'data-message-id': record.id } },
        el('div', { className: 'message-header' }, el('span', { className: 'message-role', text: 'Assistant' })),
        el('div', { className: 'message-content' }, markdown(record.text, { key: `${state.scope.account}:${state.scope.session}:${record.id}` })),
        el('footer', { className: 'assistant-message-actions' }, messageActions(record)));
  if (record.refs?.length) node.append(el('div', { className: 'continuity-citations', attrs: { 'aria-label': 'Referenced sources' } }, ...record.refs.map(refButton)));
  return node;
}
function renderMessages() {
  thread.replaceChildren(...(state.messages || []).map(renderMessage));
  main.scrollTop = Number(state.reading?.scrollTop) || 0;
}
function renderSearch() {
  const section = $('#search-section'), results = $('#search-results'), status = $('#search-status');
  section.hidden = state.scope.scene === 'discussion';
  status.textContent = state.search?.status === 'loading' ? 'Searching permitted synthetic sources…' : state.search?.error || (state.search?.status === 'ready' ? `${state.search.hits.length} matching source${state.search.hits.length === 1 ? '' : 's'}` : '');
  results.replaceChildren(...(state.search?.hits || []).map(hit => {
    const row = el('article', { className: 'continuity-hit' }, el('div', {}, el('h3', { text: hit.label }), el('p', { className: 'form-help', text: `${hit.revision} · ${hit.excerpt}` })), action('chevron-right', 'Open exact source', () => {
      const button = document.activeElement;
      sourceReturn = { focus: button, scrollTop: main.scrollTop };
      controller.setReading({ scrollTop: main.scrollTop, expandedIds: [...expanded].filter(([, open]) => open).map(([id]) => id) });
      controller.openSource(hit);
    }));
    return row;
  }));
}
function renderJudgmentCard() {
  const host = $('#judgment-preview');
  host.hidden = state.scope.scene !== 'changes';
  if (host.childElementCount) return;
  host.replaceChildren(
    el('div', { className: 'continuity-card-heading' }, el('div', {}, el('p', { className: 'eyebrow', text: 'Work owner projection · synthetic' }), el('h3', { text: 'Related work' })),
      action('book-open', 'Open judgment preview', event => { overlayKind = 'judgment'; sourceReturn = { focus: event.currentTarget, scrollTop: main.scrollTop }; controller.openJudgment(); }, { visible: 'Preview', attrs: { 'data-testid': 'judgment-open' } })),
    el('p', { className: 'form-help', text: 'Inspect the current decision basis and evidence in a read-only preview.' }),
  );
}
let overlayKind = 'source';
function overlayIsOpen() { return state.source?.status !== 'closed' && Boolean(state.source?.ref) || state.judgment?.status !== 'closed'; }
function syncOverlayMode() {
  const open = overlayIsOpen();
  if (!open) {
    if (overlay.open) overlay.close();
    overlayMode = null;
    return;
  }
  overlayKind = state.judgment?.status !== 'closed' ? 'judgment' : 'source';
  const modal = matchMedia('(max-width: 760px)').matches;
  if (!overlay.open || modal !== overlayMode) {
    if (overlay.open) overlay.close();
    if (modal) overlay.showModal(); else overlay.show();
    overlayMode = modal;
    overlay.setAttribute('aria-modal', String(modal));
    $('#close-source').focus();
  }
  $('#source-content').hidden = overlayKind !== 'source';
  $('#judgment-content').hidden = overlayKind !== 'judgment';
  renderOverlayContent();
}
function renderOverlayContent() {
  const source = state.source || {}, record = source.record;
  if (overlayKind === 'source') {
    $('#overlay-kicker').textContent = 'Exact source · synthetic';
    $('#source-dialog-title').textContent = record?.title || source.ref?.label || 'Source detail';
    const content = $('#source-content');
    content.replaceChildren();
    if (source.status === 'loading') content.append(el('p', { className: 'form-help', text: 'Reading the selected revision…' }));
    else if (source.status === 'error') content.append(el('p', { className: 'continuity-error', text: source.error || 'This source is unavailable.' }));
    else if (record) content.append(...[
      el('div', { className: 'continuity-source-meta' },
        el('span', { text: `${record.revision} · ${record.representation}` }),
        el('span', { text: `Coverage: ${record.coverage}` }),
        el('span', { text: `Account: ${record.account}` }),
      el('span', { text: `Range: ${record.range?.start ?? 'unknown'}–${record.range?.end ?? 'unknown'} ${record.rangeUnit || ''}` }),
      el('span', { text: record.disclosed || 'Disclosure unavailable.' })),
      record.missing?.length ? el('p', { className: 'continuity-error', text: record.missing.join(' ') }) : null,
      el('article', { className: 'continuity-source-text' }, markdown(record.text || '', { key: `source:${record.id}:${record.revision}` }))].filter(Boolean));
    else content.append(el('p', { className: 'form-help', text: 'No source body is available.' }));
  } else {
    const judgment = state.judgment || {}, item = judgment.record;
    $('#overlay-kicker').textContent = 'Read-only judgment preview';
    $('#source-dialog-title').textContent = item?.title || 'Work judgment';
    $('#judgment-content').replaceChildren(...[
      judgment.status === 'loading' ? el('p', { className: 'form-help', text: 'Refreshing the synthetic work projection…' }) : null,
      judgment.error ? el('p', { className: 'continuity-error', text: judgment.error }) : null,
      item ? el('section', { className: 'continuity-judgment-record' },
        el('p', { text: item.summary }),
        el('dl', {}, el('dt', { text: 'Work version' }), el('dd', { text: item.version }), el('dt', { text: 'Decision basis' }), el('dd', { text: item.basedOn }), el('dt', { text: 'Latest source' }), el('dd', { text: item.latestRevision }), el('dt', { text: 'Status' }), el('dd', { text: item.status })),
        action('refresh-cw', 'Refresh preview', () => controller.refreshJudgment(), { visible: 'Refresh preview', attrs: { 'data-testid': 'refresh-judgment' } })) : null,
      !item ? action('refresh-cw', 'Refresh preview', () => controller.refreshJudgment(), { visible: 'Refresh preview', attrs: { 'data-testid': 'refresh-judgment' } }) : null,
    ].filter(Boolean));
  }
}
function closeOverlay() {
  if (overlayKind === 'judgment') controller.closeJudgment(); else controller.closeSource();
}
function syncControls() {
  $('#variant-select').value = state.variant;
  const variantLabels = state.scope.scene === 'discussion'
    ? ['Normal', 'No connection', 'Cannot send']
    : state.scope.scene === 'sources' ? ['Normal', 'Attachment missing', 'Source revoked']
      : ['Normal', 'Evidence missing', 'Stale basis'];
  [...$('#variant-select').options].forEach((option, index) => { option.textContent = variantLabels[index]; });
  $('#channel-select').value = state.scope.channel;
  $('#account-select').value = state.scope.account;
  $('#session-select').value = state.scope.session;
  $('#slow-read').checked = Boolean(state.slowRead);
  $('#channel-label').textContent = state.channel?.label || state.scope.channel;
  $('#scene-title').textContent = ({ discussion: 'No-source discussion', sources: 'Partial sources and exact citations', changes: 'r1 / r2 · awaiting judgment' })[state.scope.scene];
  $('#scene-kicker').textContent = `${state.scope.account} · ${state.scope.session} · synthetic`;
  for (const button of document.querySelectorAll('[data-scene]')) button.setAttribute('aria-current', String(button.dataset.scene === state.scope.scene));
  const hosted = state.scope.channel === 'hosted';
  $('#composer-form').hidden = !hosted;
  $('#channel-unavailable').hidden = hosted;
  if ($('#channel-unavailable').dataset.channel !== state.scope.channel) $('#channel-unavailable').replaceChildren(...(!hosted ? [el('p', { text: state.scope.channel === 'native' ? 'Native provider entry. This fixture does not sign in, embed a provider, or expose CW Run controls.' : 'Read-only retained view. Choose a hosted conversation explicitly to continue.' }), action('message-square', 'Continue in hosted conversation', () => controller.choose({ channel: 'hosted' }), { visible: 'Continue in hosted conversation' })] : []));
  $('#channel-unavailable').dataset.channel = state.scope.channel;
  $('#model-button').hidden = !hosted || !state.channel?.canChooseModel;
  $('#stop-button').hidden = !hosted || !state.channel?.canStop || state.run?.status !== 'running';
  $('#composer-hint').textContent = !hosted ? '' : state.channel?.reason || (state.channel?.canSend ? `Synthetic channel · ${state.modelLabel || 'Model A'}` : 'Sending is unavailable for this identity; your draft is kept.');
  $('#send-button').disabled = !composer.value.trim() || !state.channel?.canSend || state.run?.status === 'running';
  $('#send-button').title = state.channel?.canSend ? '' : state.channel?.reason || 'Sending is unavailable in this channel.';
  $('#theme-select').value = document.documentElement.dataset.theme || 'light';
}
function renderSceneSummary() {
  const text = state.scope.scene === 'discussion'
    ? 'A conversation can start without sources. A refused send keeps the draft and its current account/session; nothing silently switches.'
    : state.scope.scene === 'sources'
      ? 'Search is a bounded synthetic query. Open a hit to inspect its exact revision, representation, coverage, and range; a revoked read clears its body.'
      : 'Source revisions remain exact. The work owner supplies a read-only judgment preview; refresh can reveal a stale basis but cannot submit or close work.';
  $('#scene-summary').textContent = text;
}
function render(stateNext, event = {}) {
  state = stateNext;
  if (event.kind === 'scope') {
    sourceReturn = null;
    $('#source-search').value = state.search?.query || '';
    expanded.clear();
    for (const id of state.reading?.expandedIds || []) expanded.set(id, true);
  }
  if (composer.value !== (state.draft || '')) { composer.value = state.draft || ''; fitComposer(); }
  syncControls();
  if (['scope', 'search', 'controls', undefined].includes(event.kind)) { renderSceneSummary(); renderSearch(); renderJudgmentCard(); }
  if (['source','judgment','scope','controls'].includes(event.kind) || event.kind === undefined) syncOverlayMode();
  if (['scope', 'messages'].includes(event.kind) || event.kind === undefined) {
    restoringReading = true;
    renderMessages();
    requestAnimationFrame(() => { restoringReading = false; });
  }
  $('#conversation-feedback').textContent = state.notice || '';
}

$('#composer-form').addEventListener('submit', event => { event.preventDefault(); controller.setDraft(composer.value); void controller.send(); });
composer.addEventListener('input', () => controller.setDraft(composer.value));
$('#stop-button').addEventListener('click', () => controller.stop());
$('#model-button').addEventListener('click', () => void picker.open());
$('#variant-select').addEventListener('change', event => controller.setVariant(event.target.value));
$('#channel-select').addEventListener('change', event => controller.choose({ channel: event.target.value }));
$('#account-select').addEventListener('change', event => controller.choose({ account: event.target.value }));
$('#session-select').addEventListener('change', event => controller.choose({ session: event.target.value }));
$('#slow-read').addEventListener('change', event => controller.setSlowRead(event.target.checked));
$('#reset-specimen').addEventListener('click', () => { expanded.clear(); sourceReturn = null; controller.reset(); });
document.querySelectorAll('[data-scene]').forEach(button => button.addEventListener('click', () => controller.choose({ scene: button.dataset.scene })));
$('#source-search').addEventListener('input', event => controller.search(event.target.value));
$('#close-source').addEventListener('click', closeOverlay);
overlay.addEventListener('close', () => {
  if (overlay.open) return;
  const returned = sourceReturn; sourceReturn = null;
  if (returned) { main.scrollTop = returned.scrollTop; (returned.focus?.isConnected ? returned.focus : main).focus({ preventScroll: true }); }
});
overlay.addEventListener('keydown', event => {
  if (event.key !== 'Tab' || !overlayMode) return;
  const items = [...overlay.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]')].filter(node => node.getClientRects().length);
  const first = items[0], last = items.at(-1);
  if (event.shiftKey && document.activeElement === first || !event.shiftKey && document.activeElement === last) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
});
overlay.addEventListener('cancel', event => { event.preventDefault(); closeOverlay(); });
overlay.addEventListener('click', event => { const rect = overlay.getBoundingClientRect(); if (event.target === overlay && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeOverlay(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && overlay.open && !overlayMode && !document.querySelector('dialog:modal, [popover]:popover-open')) { event.preventDefault(); closeOverlay(); } });
main.addEventListener('scroll', () => { if (!restoringReading) controller.setReading({ scrollTop: main.scrollTop }); }, { passive: true });
window.addEventListener('resize', () => syncOverlayMode());
$('#theme-select').addEventListener('change', event => { document.documentElement.dataset.theme = event.target.value; });
controller.subscribe(render);
