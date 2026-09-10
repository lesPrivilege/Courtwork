import { el, icon } from './ui-controls.mjs';
import { attentionLabels, toAttentionActionDescriptors, toHomeAttention, toHomeAttentionDetail } from './presentation-adapters.mjs';

/* The Attention items workspace. It reads the same Core queries Home reads and,
 * from WK-158 on, submits the typed human actions the object itself advertises.
 * Reading never starts a Run; the independent assistant is opened explicitly.
 *
 * Two boundaries are load-bearing here and are restated where they bind:
 *   · the registry is the minimal view (id / title / status / freshness /
 *     revision / time). A row therefore carries no reason, no next action and
 *     no source — those are per-object `inspect` facts (attention.md §Queries).
 *   · `All` renders the server's own order. Registry ordering is not written
 *     into the contract yet, so a client-side sort would be a fabricated
 *     guarantee that breaks across page boundaries. The explicit state views
 *     give direct access instead. */

const PAGE = 20;
/* WK-156 · five contract states, six views. A view is a query, not a state:
 * there is no sixth status and no renaming (ui-state-vocabulary §6). */
const VIEWS = [['all', 'All'], ...Object.entries(attentionLabels)];

/* WK-157 · the clock lives here and only here. `presentation-adapters.mjs` is
 * explicitly clock-free, so the immutable `updated_at` instant is projected to
 * relative words at render time and never written back. The row describes when
 * the record was updated; it does not tick and does not run a clock service. */
const MINUTE = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
export function relativeUpdated(iso, now = Date.now()) {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  const elapsed = now - at;
  if (elapsed < 0) return new Date(at).toLocaleDateString();
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`;
  return new Date(at).toLocaleDateString();
}

/* copy-convention §3.8 · one contract action, one button word. No synonym, no
 * "Done", no "Archive", and no word for an action the object did not advertise. */
const ACTION_WORDS = { acknowledge: 'Mark as seen', resume: 'Resume', set_waiting: 'Set waiting',
  snooze: 'Snooze', resolve: 'Resolve', reopen: 'Reopen' };
const NEXT_KIND_WORDS = { inspect: 'Inspect', decide: 'Decide', wait: 'Wait', follow_up: 'Follow up' };
/* The trigger says what the recorded next action waits on. None of these start a
 * timer: the contract is explicit that a recorded due time is not a scheduler. */
const TRIGGER_WORDS = { manual: 'Manual', at: 'At a recorded time', after: 'After something else', external: 'External' };
/* M-3 · the visible sentence for each refusal the Core can return. These are
 * read from the structured `error.code`; no English message is ever parsed, and
 * `NOT_FOUND` says only that the item is unavailable — the contract returns one
 * uniform unavailable result and the UI must not infer existence from it. */
const ERROR_COPY = {
  VERSION_CONFLICT: 'This item changed while you were deciding. Reload it and try again.',
  IDEMPOTENCY_CONFLICT: 'A different request already used this identity. Reload the item before retrying.',
  NOT_FOUND: 'This item is unavailable.',
  DISCLOSURE_DENIED: 'You do not have access to this field.',
  INVALID_TRANSITION: 'That action is not available from the current state.',
  INVALID: 'The request was refused. Check the required fields and try again.',
  ATTENTION_LIMIT: 'This project has reached its recorded item limit.',
  INTEGRITY_REFUSAL: 'The recorded bytes did not match. This item was not changed.',
  CONTRACT_UNSUPPORTED: 'This app does not support the recorded schema.',
};
/* A refusal that re-reads the object: the human's next move needs canonical
 * state in front of them, not the state they were deciding against. */
/* One place turns a refusal into a sentence: the structured code first, and the
 * transport's own message only when there is no code to read. A raw
 * `NOT_FOUND: …` from the wire is never shown to a person. */
const refusalText = error => ERROR_COPY[error?.body?.error?.code] ?? error?.message ?? 'The request was refused.';
const REINSPECT_AFTER = new Set(['VERSION_CONFLICT', 'IDEMPOTENCY_CONFLICT', 'NOT_FOUND']);

const DEFAULT_DRAFT = { reason: '', label: '', kind: 'inspect', trigger: 'manual', dueLocal: '', status: 'investigating' };

const TEXT_ENTRY = new Set(['input', 'textarea', 'select']);
const isTextEntry = node => Boolean(node) &&
  (TEXT_ENTRY.has(String(node.tagName || '').toLowerCase()) || node.isContentEditable === true);

export function createAttentionWorkspace(container, { request, onBack, onOpenAssistant }) {
  const state = { projects: [], projectId: null, view: 'all', data: null, detail: null,
    selectedId: null, cursorId: null, returnFocusKey: null, loading: false, error: null,
    detailError: null, detailLoading: false, generation: 0, detailGeneration: 0,
    editor: null, mutationError: null };
  /* One human submit is one request identity until its outcome is known. The
   * entry survives re-renders and selection changes — a lost response is not a
   * reason to mint a second identity for the same decision. */
  const pending = new Map();
  const pendingKey = (projectId, attentionId) => `${projectId}\u0000${attentionId}`;
  const currentPending = () => state.projectId && state.selectedId
    ? pending.get(pendingKey(state.projectId, state.selectedId)) ?? null : null;
  const time = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : 'Not available';
  function button(text, fn, key, className='text-button') {
    const node = el('button', { text, className, attrs: {type:'button','data-attention-focus':key} });
    node.addEventListener('click',fn); return node;
  }
  const rowIds = () => toHomeAttention(state.data)?.items.map(item => item.id) ?? [];
  const focusKey = key => container.querySelector(`[data-attention-focus="${CSS.escape(key)}"]`);
  function focusRow(id) { state.cursorId = id; focusKey(`item-${id}`)?.focus(); }

  /* WK-157 · the list's own keys. `J`/`K` never fire while a text control has
   * focus, and the cursor clamps at both ends instead of wrapping — a wrap makes
   * "I am at the last item" unreadable. Rows stay ordinary buttons, so `Enter`
   * keeps its native activation and needs no handler here. */
  function onKeyDown(event) {
    const key = event.key;
    if (key === 'Escape') {
      event.preventDefault?.();
      if (state.editor) closeEditor();
      else if (state.selectedId) backToList();
      return;
    }
    if (isTextEntry(event.target)) return;
    const down = key === 'j' || key === 'J' || key === 'ArrowDown';
    const up = key === 'k' || key === 'K' || key === 'ArrowUp';
    if (!down && !up) return;
    const ids = rowIds();
    if (!ids.length) return;
    event.preventDefault?.();
    const current = ids.indexOf(state.cursorId ?? state.selectedId);
    const next = down ? Math.min(current + 1, ids.length - 1) : Math.max(current - 1, 0);
    focusRow(ids[next]);
  }

  /* WK-158 §11 · returning from a detail lands on the row it was opened from.
   * If that row is gone (a status-changing action moved it out of this view) the
   * focus falls to the nearest surviving row, and only then to the state view —
   * never to the project selector. */
  function restoreFocus(previousIds = null) {
    const key = state.returnFocusKey;
    state.returnFocusKey = null;
    const ids = rowIds();
    const target = key && focusKey(key);
    if (target) { state.cursorId = key.startsWith('item-') ? key.slice(5) : state.cursorId; target.focus(); return; }
    if (ids.length) {
      const previous = previousIds ?? [];
      const index = key ? previous.indexOf(key.slice(5)) : -1;
      focusRow(ids[Math.min(Math.max(index, 0), ids.length - 1)]);
      return;
    }
    focusKey(`view-${state.view}`)?.focus();
  }
  function backToList() {
    state.selectedId = null; state.detail = null; state.detailLoading = false;
    state.detailError = null; state.detailGeneration++;
    state.editor = null; state.mutationError = null;
    render();
    restoreFocus();
  }

  function render() {
    const focused = container.contains(document.activeElement) ? document.activeElement?.dataset.attentionFocus : null;
    const root = el('div',{className:'attention-workspace-inner'});
    root.addEventListener('keydown', onKeyDown);
    root.append(el('div',{className:'attention-workspace-heading'},
      el('div',{},el('p',{className:'attention-eyebrow',text:'YOUR WORKSPACE'}),el('h1',{text:'Attention items'}),
        el('p',{className:'form-help',text:'Keep the next human decision in view.'})),
      button('Back to workspace',onBack,'back')));
    const scope = el('select',{attrs:{'aria-label':'Attention workspace project','data-attention-focus':'project'}});
    scope.append(...state.projects.map(p=>el('option',{text:p.name,attrs:{value:p.id}})));scope.value=state.projectId??'';
    scope.disabled=!state.projects.length;
    scope.addEventListener('change',()=>{state.projectId=scope.value;void load();});
    root.append(el('div',{className:'attention-toolbar'},scope,button('Refresh',()=>load(),'refresh')));
    /* The state views are buttons in a group, not ARIA tabs: there is one panel
     * and each choice re-queries the server, which is a filter, not a tab. */
    const views = el('div',{className:'attention-views',attrs:{role:'group','aria-label':'Attention views'}});
    for (const [value, label] of VIEWS) {
      const choice = button(label, () => selectView(value), `view-${value}`, `attention-view-choice${state.view===value?' is-current':''}`);
      choice.setAttribute('aria-pressed', String(state.view === value));
      views.append(choice);
    }
    root.append(views);
    const columns=el('div',{className:`attention-columns ${state.selectedId?'has-selection':''}`});
    const list=el('section',{className:'attention-registry',attrs:{'aria-label':'Attention items'}});
    if(state.loading)list.append(el('p',{className:'form-help',text:'Loading items…',attrs:{role:'status'}}));
    if(state.error)list.append(el('p',{className:'form-help',text:state.error,attrs:{role:'status'}}));
    const page=toHomeAttention(state.data);
    if(page){
      list.append(el('p',{className:'attention-count',text:`${page.count} ${page.count===1?'item':'items'} · ${state.view==='all'?'all states':attentionLabels[state.view]}`}));
      if(!page.items.length)list.append(el('div',{className:'attention-empty'},el('h3',{text:'Nothing in this view'}),el('p',{text:'Recorded attention items matching this project and state will appear here.'})));
      const rows=el('div',{attrs:{role:'list'}});
      for(const item of page.items){
        const row=button('',()=>select(item.id),`item-${item.id}`,'attention-registry-row');
        row.setAttribute('aria-pressed',String(state.selectedId===item.id));
        const relative=relativeUpdated(item.updatedAt);
        row.append(el('span',{className:'attention-row-title',text:item.title}),
          el('span',{className:'attention-row-meta'},
            el('span',{className:`home-attention-state ${item.status==='needs_you'?'is-review':''}`,text:item.label}),
            relative?el('time',{className:'attention-row-time',text:`Updated ${relative}`,attrs:{datetime:item.updatedAt,title:time(item.updatedAt)}}):null));
        rows.append(el('div',{attrs:{role:'listitem'}},row));
      }
      list.append(rows);
      if(page.offset>0||page.nextOffset!==null){
        const pages=el('div',{className:'attention-pagination'});
        if(page.offset>0)pages.append(button('Previous',()=>load(Math.max(0,page.offset-PAGE)),'previous'));
        pages.append(el('span',{className:'form-help',text:`${page.items.length? page.offset+1:0}–${page.offset+page.items.length} of ${page.count}`}));
        if(page.nextOffset!==null)pages.append(button('Next',()=>load(page.nextOffset),'next'));
        list.append(pages);
      }
    }else if(!state.projectId)list.append(el('p',{className:'form-help',text:'Create a project to begin.'}));
    const detail=el('section',{className:'attention-reading',attrs:{'aria-label':'Attention details'}});
    if(state.selectedId)detail.append(button('Back to items',()=>backToList(),'list-back','text-button attention-list-back'));
    if(state.detailLoading)detail.append(el('p',{className:'form-help',text:'Loading item…',attrs:{role:'status'}}));
    if(state.detailError)detail.append(el('p',{className:'form-help',text:state.detailError,attrs:{role:'status'}}),button('Retry item',()=>select(state.selectedId),'detail-retry'));
    const d=toHomeAttentionDetail(state.detail);
    if(d){
      detail.append(el('div',{className:'attention-detail-head'},
        el('span',{className:`attention-detail-state ${d.status==='needs_you'?'is-review':''}`,text:attentionLabels[d.status]}),
        el('h2',{text:d.descriptor.title}),d.descriptor.summary?el('p',{text:d.descriptor.summary}):null));
      detail.append(el('div',{className:'attention-decision'},
        el('h3',{text:'Why this needs attention'}),el('p',{text:d.reason}),
        el('h3',{text:'Next step'}),el('p',{text:d.next_action?.label??'Not recorded'}),
        d.next_action?.due_at?el('p',{className:'form-help',text:`Recorded due time: ${time(d.next_action.due_at)}`}):null));
      const refs=el('details',{className:'attention-basis'},el('summary',{text:'Recorded context'}));
      refs.append(el('p',{text:`Revision ${d.revision} · Updated ${time(d.updated_at)}`}),
        el('p',{text:'This view reads the recorded item. Opening it does not acknowledge or resolve it.'}));
      for(const ref of (Array.isArray(state.detail.source_refs)?state.detail.source_refs:[]).filter(ref=>ref && typeof ref.locator==='string'))refs.append(el('p',{text:`${ref.kind==='core'?'Retained source':'External reference'} · ${ref.locator}`}));
      if (Array.isArray(state.detail.source_refs) && !state.detail.source_refs.length) refs.append(el('p',{text:'No source references recorded.'}));
      else if (!Array.isArray(state.detail.source_refs)) refs.append(el('p',{text:'Source references are not available in this view.'}));
      /* WK-158 §25 · the recorded Runtime grant is readable here and editable
       * nowhere: the policy editor is a separate authority (CC-P). No Revoke,
       * no synthesized "Active" badge and no countdown. */
      if (state.detail.policy) {
        const grant = state.detail.policy.grant;
        refs.append(el('p',{text: grant && typeof grant.expires_at === 'string'
          ? `Runtime disclosure until ${time(grant.expires_at)} · recorded fields: ${(Array.isArray(grant.fields)?grant.fields:[]).join(', ') || 'none'}`
          : 'Runtime disclosure: None'}));
      }
      const basis = state.detail.basis;
      if (basis && Number.isSafeInteger(basis.revision) && typeof basis.event_id === 'string') refs.append(el('p',{text:`Recorded basis: revision ${basis.revision} · Event ${basis.event_id}. External availability is unconfirmed; execution references describe historical observations.`}));
      for (const ref of (Array.isArray(state.detail.relation_refs)?state.detail.relation_refs:[])) {
        if (ref && typeof ref.kind === 'string' && typeof ref.id === 'string') refs.append(el('p',{text:`Related ${ref.kind}: ${ref.id}`}));
      }
      detail.append(refs);
      detail.append(actionSurface(d));
    }else if(!state.selectedId)detail.append(el('div',{className:'attention-empty'},el('h2',{text:'A little context, before the next step.'}),el('p',{text:'Choose an item to read its reason, recorded next step and sources.'})));
    if (onOpenAssistant) detail.append(button('Open Attention', onOpenAssistant, 'open-assistant'));
    columns.append(list,detail);root.append(columns);container.replaceChildren(root);
    if(focused)(container.querySelector(`[data-attention-focus="${CSS.escape(focused)}"]`)??container.querySelector('[data-attention-focus="project"]'))?.focus();
  }

  /* ── WK-158 · the disposition layer ───────────────────────────────────────
   * A control exists here for exactly one reason: the object advertised the
   * action and `toAttentionActionDescriptors` recognized its payload schema. A
   * visible button still confers no authority — the server may refuse — and an
   * advertised action this app does not understand renders nothing at all. */
  function actionSurface(d) {
    const surface = el('section',{className:'attention-actions',attrs:{'aria-label':'Attention actions'}});
    surface.append(el('h3',{text:'Actions'}));
    const descriptors = toAttentionActionDescriptors(state.detail);
    if (!descriptors) {
      surface.append(el('p',{className:'form-help',text:'This item advertises no action for you.'}));
      return surface;
    }
    if (!descriptors.actions.length) surface.append(el('p',{className:'form-help',text:'No action is available on this item right now.'}));
    const choices = el('div',{className:'attention-action-choices'});
    for (const descriptor of descriptors.actions) {
      const word = ACTION_WORDS[descriptor.action];
      const open = state.editor?.action === descriptor.action;
      const choice = button(word, () => chooseAction(descriptor), `action-${descriptor.action}`,
        `text-button attention-action-choice${open?' is-current':''}`);
      if (Object.keys(descriptor.fields).length) choice.setAttribute('aria-expanded', String(open));
      choices.append(choice);
    }
    surface.append(choices);
    const chosen = descriptors.actions.find(descriptor => descriptor.action === state.editor?.action);
    if (chosen) surface.append(actionEditor(chosen, d));
    if (state.mutationError) surface.append(el('p',{className:'inline-notice attention-action-alert',text:state.mutationError,attrs:{role:'alert'}}));
    /* An unknown transport result is neither a failure nor a completion. The
     * same stored request — same identity, same payload — is what gets sent
     * again, so a retry can never become a second recorded action. */
    const waiting = currentPending();
    if (waiting?.phase === 'uncertain') {
      const notice = el('div',{className:'inline-notice attention-action-alert',attrs:{role:'alert'}},
        el('p',{text:waiting.message}));
      notice.append(button('Retry sending', () => void send(waiting), 'retry-mutation'));
      surface.append(notice);
    }
    return surface;
  }
  function chooseAction(descriptor) {
    state.mutationError = null;
    /* `acknowledge` carries an empty payload, so it is the action itself, not a
     * form. It is not a toggle: seen does not come back. */
    if (!Object.keys(descriptor.fields).length) { state.editor = null; void mutate(descriptor, {}); return; }
    state.editor = state.editor?.action === descriptor.action
      ? null
      : { action: descriptor.action, draft: { ...DEFAULT_DRAFT }, fieldError: null };
    render();
    (focusKey('field-reason') ?? focusKey(`action-${descriptor.action}`))?.focus();
  }
  function closeEditor() {
    const action = state.editor?.action;
    state.editor = null;
    render();
    if (action) focusKey(`action-${action}`)?.focus();
  }
  function actionEditor(descriptor, d) {
    const draft = state.editor.draft;
    const fail = state.editor.fieldError;
    const errorId = `attention-field-error-${descriptor.action}`;
    const word = ACTION_WORDS[descriptor.action];
    const form = el('div',{className:'attention-action-editor',attrs:{'data-attention-editor':descriptor.action}});
    const describe = name => fail?.field === name ? errorId : null;
    const bind = (node, key, onChange) => {
      const read = () => { draft[key] = node.value; onChange?.(); };
      node.addEventListener('input', read); node.addEventListener('change', read);
      return node;
    };
    const choose = (key, options, value, focus, onChange) => {
      const node = el('select',{attrs:{'data-attention-focus':focus}});
      node.append(...options.map(([option, label]) => el('option',{text:label,attrs:{value:option}})));
      node.value = value;
      return bind(node, key, onChange);
    };
    const field = (label, control, help = null) =>
      el('label',{className:'attention-field'}, el('span',{className:'attention-field-label',text:label}), control,
        help ? el('span',{className:'form-help',text:help}) : null);
    if (descriptor.fields.reason) {
      const box = el('textarea',{attrs:{rows:3,maxlength:descriptor.fields.reason.maxLength,
        'data-attention-focus':'field-reason','aria-describedby':describe('reason')}});
      box.value = draft.reason;
      form.append(field('Reason', bind(box,'reason')));
    }
    if (descriptor.fields.nextAction) {
      const next = descriptor.fields.nextAction;
      const group = el('fieldset',{className:'attention-next-action'}, el('legend',{text:'Next action'}));
      group.append(field('Kind', choose('kind', next.kinds.map(kind=>[kind,NEXT_KIND_WORDS[kind]]), draft.kind, 'field-kind')));
      const label = el('input',{attrs:{type:'text',maxlength:next.labelMaxLength,
        'data-attention-focus':'field-label','aria-describedby':describe('label')}});
      label.value = draft.label;
      group.append(field('Label', bind(label,'label')));
      group.append(field('Trigger', choose('trigger', next.triggers.map(trigger=>[trigger,TRIGGER_WORDS[trigger]]), draft.trigger, 'field-trigger', () => render())));
      /* A recorded due time, and nothing else: no countdown, no timer, no
       * delivery promise. The contract says a due time is not a scheduler. */
      if (draft.trigger === 'at') {
        const due = el('input',{attrs:{type:'datetime-local','data-attention-focus':'field-due','aria-describedby':describe('due')}});
        due.value = draft.dueLocal;
        group.append(field('Due time', bind(due,'dueLocal'), 'Recorded on the item. Nothing is delivered at this time.'));
      }
      form.append(group);
    }
    if (descriptor.fields.status) {
      const group = el('fieldset',{className:'attention-status-target'}, el('legend',{text:`${word} as`}));
      for (const option of descriptor.fields.status.options) {
        const radio = el('input',{attrs:{type:'radio',name:`attention-status-${descriptor.action}`,value:option,
          'data-attention-focus':`field-status-${option}`}});
        radio.value = option;
        radio.checked = draft.status === option;
        if (draft.status === option) radio.setAttribute('checked','checked');
        radio.addEventListener('change',()=>{draft.status = option;});
        group.append(el('label',{className:'attention-field attention-field-inline'}, radio, el('span',{text:attentionLabels[option]})));
      }
      form.append(group);
    }
    if (fail) form.append(el('p',{className:'inline-error attention-field-error',text:fail.message,attrs:{id:errorId,role:'alert'}}));
    const waiting = currentPending();
    const sending = waiting?.phase === 'sending' && waiting.action === descriptor.action;
    const submit = button(sending ? 'Sending…' : word, () => submitAction(descriptor), `submit-${descriptor.action}`,
      'primary-button attention-action-submit');
    submit.setAttribute('aria-label', `${word} · ${d.descriptor.title}`);
    submit.disabled = Boolean(waiting);
    form.append(submit);
    return form;
  }
  /* The payload is built from the draft and checked against the descriptor's own
   * limits before anything is sent; a refusal from the server remains possible. */
  function draftPayload(descriptor) {
    const draft = state.editor.draft;
    const payload = {};
    if (descriptor.fields.reason) {
      const reason = draft.reason.trim();
      if (!reason) return { field: 'reason', message: 'A reason is required.' };
      if (reason.length > descriptor.fields.reason.maxLength)
        return { field: 'reason', message: `A reason is at most ${descriptor.fields.reason.maxLength} characters.` };
      payload.reason = reason;
    }
    if (descriptor.fields.nextAction) {
      const next = descriptor.fields.nextAction;
      const label = draft.label.trim();
      if (!label) return { field: 'label', message: 'A next action label is required.' };
      if (label.length > next.labelMaxLength)
        return { field: 'label', message: `A label is at most ${next.labelMaxLength} characters.` };
      let due = null;
      if (draft.trigger === 'at') {
        const at = Date.parse(draft.dueLocal);
        if (!Number.isFinite(at)) return { field: 'due', message: 'A due time is required when the trigger is a recorded time.' };
        due = new Date(at).toISOString();
      }
      payload.next_action = { kind: draft.kind, label, trigger: draft.trigger, due_at: due };
    }
    if (descriptor.fields.status) payload.status = draft.status;
    return { payload };
  }
  function submitAction(descriptor) {
    if (currentPending()) return;
    const built = draftPayload(descriptor);
    if (built.field) {
      state.editor.fieldError = built;
      render();
      focusKey(`field-${built.field}`)?.focus();
      return;
    }
    state.editor.fieldError = null;
    void mutate(descriptor, built.payload);
  }
  /* ── The mutation protocol ────────────────────────────────────────────────
   * inspect revision R → the human authors a payload → one request identity →
   * POST with `expected_revision: R` → receipt, refusal or an unknown transport
   * → recover if required → re-inspect → render canonical state.
   *
   * Nothing is optimistic. Until the receipt has been read and the object
   * re-inspected, the row and the detail keep the status the server last
   * confirmed; only the submit control says `Sending…`, because a request that
   * was sent is not a state that was committed. */
  function mutate(descriptor, payload) {
    const projectId = state.projectId, attentionId = state.selectedId;
    const key = pendingKey(projectId, attentionId);
    const entry = { projectId, attentionId, action: descriptor.action, phase: 'sending', message: null,
      request: { schema_version: 1, request_id: crypto.randomUUID(), attention_id: attentionId,
        expected_revision: descriptor.expectedRevision, action: descriptor.action, payload } };
    pending.set(key, entry);
    return send(entry);
  }
  async function send(entry) {
    const { projectId, attentionId } = entry;
    const key = pendingKey(projectId, attentionId);
    entry.phase = 'sending'; entry.message = null; state.mutationError = null;
    render();
    let receipt;
    try {
      receipt = await request(`/attention/${encodeURIComponent(attentionId)}/actions`,
        { method: 'POST', body: { projectId, request: entry.request } });
    } catch (error) {
      /* A refusal carries an HTTP status and a structured code. Anything else is
       * a transport whose result this client does not know — which is not the
       * same as a failure, and is never reported as one. */
      if (error?.status) return refuse(entry, error);
      return recover(entry);
    }
    if (receipt?.attention_id !== attentionId || receipt?.request_id !== entry.request.request_id) {
      pending.delete(key);
      state.mutationError = 'The recorded receipt did not match this request.';
      return settle(entry);
    }
    /* The receipt describes the action that committed, not necessarily the
     * newest state, so the canonical object is read again before anything is
     * rendered from it. */
    pending.delete(key);
    state.editor = null;
    return settle(entry);
  }
  async function refuse(entry, error) {
    pending.delete(pendingKey(entry.projectId, entry.attentionId));
    const code = error.body?.error?.code ?? null;
    state.mutationError = refusalText(error);
    /* The human-authored draft is kept: a conflict means the decision must be
     * made again against new canonical state, not that the words were wrong.
     * The next submit is a new decision and takes a new identity and a new
     * expected revision — this client never silently replays. */
    if (code && REINSPECT_AFTER.has(code)) return settle(entry);
    render();
  }
  async function recover(entry) {
    const { projectId, attentionId } = entry;
    try {
      const found = await request('/attention/query', { method: 'POST', body: { projectId, query: {
        schema_version: 1, kind: 'request', attention_id: attentionId, request_id: entry.request.request_id } } });
      if (found?.result) {
        pending.delete(pendingKey(projectId, attentionId));
        state.editor = null; state.mutationError = null;
        return settle(entry);
      }
      entry.phase = 'uncertain';
      entry.message = 'No committed result was found for this request. It can be sent again unchanged.';
    } catch {
      entry.phase = 'uncertain';
      entry.message = 'The result of this request is not known yet. It can be sent again unchanged.';
    }
    render();
  }
  /* Re-inspect, then re-read the current registry page. */
  async function settle(entry) {
    const { projectId, attentionId } = entry;
    if (projectId !== state.projectId) { render(); return; }
    const before = rowIds();
    if (state.selectedId === attentionId) await select(attentionId, { keepFocus: true });
    await refreshRegistry();
    if (!rowIds().includes(attentionId) && before.includes(attentionId)) {
      state.returnFocusKey = `item-${attentionId}`;
      restoreFocus(before);
    }
  }
  const registryQuery = offset => ({ schema_version: 1, kind: state.view === 'all' ? 'registry' : 'exact',
    limit: PAGE, offset, ...(state.view === 'all' ? {} : { field: 'status', value: state.view }) });
  /* Re-reads the current page after a committed action. The registry is the
   * server's answer, so nothing here filters or reorders what comes back. */
  async function refreshRegistry() {
    const own = state.generation, projectId = state.projectId;
    let offset = toHomeAttention(state.data)?.offset ?? 0;
    try {
      for (;;) {
        const data = await request('/attention/query',{method:'POST',body:{projectId,query:registryQuery(offset)}});
        if (own !== state.generation || projectId !== state.projectId) return;
        const page = toHomeAttention(data);
        if (!page) break;
        state.data = data; state.error = null;
        /* The last row of the last page can leave. Backing up one page is the
         * only way the count and the visible rows stay the same fact. */
        if (page.items.length || offset === 0) break;
        offset = Math.max(0, offset - PAGE);
      }
    } catch (error) {
      if (own === state.generation) state.error = refusalText(error);
    }
    render();
  }
  /* A view change is a new query, not a filter over the loaded page: offset,
   * selection and detail all reset, and the server's order is preserved. */
  function selectView(value) {
    if (state.view === value) return;
    state.view = value; state.cursorId = null;
    void load();
  }
  async function load(offset=0, selectedId=null){
    const own=++state.generation;state.detailGeneration++;state.selectedId=null;state.detail=null;state.detailError=null;state.detailLoading=false;
    state.cursorId=null;state.data=null;state.error=null;state.editor=null;state.mutationError=null;
    state.loading=Boolean(state.projectId);render();
    if(!state.projectId)return;
    const projectId=state.projectId;
    const query=registryQuery(offset);
    try{const data=await request('/attention/query',{method:'POST',body:{projectId,query}});if(own!==state.generation)return;if(!toHomeAttention(data))throw new Error("Unsupported attention records.");state.data=data;}
    catch(error){if(own===state.generation)state.error=refusalText(error);}
    finally{if(own===state.generation){state.loading=false;render();}}
    if(own===state.generation&&selectedId)void select(selectedId);
  }
  async function select(id,{keepFocus=false}={}){
    const own=++state.detailGeneration;const projectId=state.projectId;
    state.selectedId=id;state.returnFocusKey=`item-${id}`;state.cursorId=id;
    if(!keepFocus){state.editor=null;state.mutationError=null;}
    state.detail=null;state.detailError=null;state.detailLoading=true;render();
    if(!keepFocus)container.querySelector('[data-attention-focus="list-back"]')?.focus();
    try{const data=await request(`/attention/${encodeURIComponent(id)}?${new URLSearchParams({projectId})}`);if(!toHomeAttentionDetail(data)||data.attention_id!==id)throw new Error("Unsupported attention item.");if(own===state.detailGeneration&&projectId===state.projectId)state.detail=data;}
    catch(error){if(own===state.detailGeneration)state.detailError=refusalText(error);}
    finally{if(own===state.detailGeneration){state.detailLoading=false;render();}}
  }
  return {
    open({projects,projectId,attentionId=null}){state.projects=projects;state.projectId=projects.find(p=>p.id===projectId)?.id??projects[0]?.id??null;state.view='all';return load(0,attentionId);},
    deactivate(){state.generation++;state.detailGeneration++;},
  };
}
