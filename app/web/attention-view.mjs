import { el, icon, setRequestLabel } from './ui-controls.mjs';
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
const SOURCE_ROLE_WORDS = { supports: 'Supports', reports: 'Reports', contradicts: 'Contradicts' };
/* UI02 · the one consequence that belongs beside a submit rather than in a
 * disclosure: resolving is a judgment recorded on this object and nothing else
 * (attention.md §HTTP: "These actions affect Attention only"). */
const ACTION_CONSEQUENCE = {
  resolve: 'Records your decision on this item only. Nothing outside Courtwork is approved or changed.',
};
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

/* ── UI02 · motion ──────────────────────────────────────────────────────────
 * Motion here states a relationship the DOM has already committed: which object
 * is now being read, which pane replaced which on a narrow screen, that an
 * editor opened under its choice, and that a receipt changed a recorded fact.
 * It never gates focus, input or a state change, and nothing waits for it to
 * finish. Durations and the curve are read from the existing tokens
 * (--duration-fast, --duration, --ease-out); a missing token means no motion,
 * not a local literal. Both reduce paths — the system query and the explicit
 * `data-motion="reduce"` — skip every animation. Only opacity and transform
 * move. A re-render replaces nodes, which ends any running animation at its
 * final state; that is the interruption rule for every entry below. */
const cssToken = name => {
  try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch { return ''; }
};
function motionAllowed() {
  const root = globalThis.document?.documentElement;
  if (!root || typeof globalThis.matchMedia !== 'function') return false;
  if (root.getAttribute('data-motion') === 'reduce') return false;
  return !globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function play(node, keyframes, { duration = '--duration', delay = 0, fill = 'none' } = {}) {
  if (!node || typeof node.animate !== 'function' || !motionAllowed()) return null;
  const ms = Number.parseFloat(cssToken(duration));
  const easing = cssToken('--ease-out');
  if (!Number.isFinite(ms) || !easing) return null;
  const delayMs = typeof delay === 'string' ? Number.parseFloat(cssToken(delay)) || 0 : delay;
  return node.animate(keyframes, { duration: ms, delay: delayMs, easing, fill });
}
const NARROW = '(max-width: 767px)';
const isNarrow = () => typeof globalThis.matchMedia === 'function' && globalThis.matchMedia(NARROW).matches;
const rect = node => typeof node?.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : null;

export function createAttentionWorkspace(container, { request, onBack, onOpenAssistant }) {
  const state = { projects: [], projectId: null, view: 'all', data: null, detail: null,
    selectedId: null, cursorId: null, returnFocusKey: null, loading: false, error: null,
    detailError: null, detailLoading: false, generation: 0, detailGeneration: 0,
    editor: null, mutationError: null, receipt: null, conflict: null, departed: null, refreshing: false };
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

  /* Motion cues are one-shot: set where the transition happens, consumed by the
   * next render that draws its result. `shown` remembers which object the
   * reading pane last drew, so a re-inspect of the same object never replays
   * the entrance. The narrow list keeps its own scroll offset across the
   * list → detail → list round trip. */
  const motion = { cue: null, shown: null, previousIndex: -1, listScroll: 0, alert: null, departed: null, hold: false };

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
    const narrow = isNarrow();
    state.selectedId = null; state.detail = null; state.detailLoading = false;
    state.detailError = null; state.detailGeneration++;
    state.editor = null; state.mutationError = null; state.receipt = null; state.conflict = null;
    if (narrow) motion.cue = 'list-return';
    render();
    if (narrow) container.scrollTop = motion.listScroll;
    restoreFocus();
  }

  function render() {
    const focused = container.contains(document.activeElement) ? document.activeElement?.dataset.attentionFocus : null;
    const previousReading = container.querySelector?.('.attention-reading-body');
    const readingScroll = previousReading?.scrollTop ?? 0;
    const root = el('div',{className:`attention-workspace-inner${state.selectedId?' is-reading':''}`});
    root.addEventListener('keydown', onKeyDown);
    root.append(heading(), queryBar());
    const columns=el('div',{className:`attention-columns ${state.selectedId?'has-selection':''}`});
    const list = registry();
    const reading = readingPane();
    columns.append(list, reading);
    root.append(columns);
    container.replaceChildren(root);
    let target = focused ? container.querySelector(`[data-attention-focus="${CSS.escape(focused)}"]`) : null;
    /* A disabled control cannot hold focus in a browser. While a request is in
     * flight the focus stays inside the action region that owns it instead of
     * dropping to the document. */
    if (target?.disabled) target = target.closest?.('[data-attention-focus="actions"]') ?? null;
    if (focused) (target ?? container.querySelector('[data-attention-focus="project"]'))?.focus();
    const body = reading.querySelector('.attention-reading-body');
    if (body && motion.shown === state.selectedId && typeof readingScroll === 'number') body.scrollTop = readingScroll;
    runMotion(list, reading);
  }

  function heading() {
    const actions = el('div',{className:'attention-heading-actions'});
    /* The assistant is a global conversation, so its entry sits with the
     * workspace, not inside an item's detail where it would read as attached. */
    if (onOpenAssistant) {
      const open = button('', onOpenAssistant, 'open-assistant', 'quiet-button attention-open-assistant');
      open.append(icon('attention', { size: 18 }), el('span', { text: 'Open Attention' }));
      actions.append(open);
    }
    actions.append(button('Back to workspace',onBack,'back','quiet-button'));
    return el('div',{className:'attention-workspace-heading'}, el('h1',{text:'Attention items'}), actions);
  }

  function queryBar() {
    const scope = el('select',{attrs:{'aria-label':'Attention workspace project','data-attention-focus':'project'}});
    scope.append(...state.projects.map(p=>el('option',{text:p.name,attrs:{value:p.id}})));scope.value=state.projectId??'';
    scope.disabled=!state.projects.length;
    scope.addEventListener('change',()=>{state.projectId=scope.value;void load();});
    /* Text, not the refresh glyph: refresh-cw is a guarded semantic consumer
     * (product-semantics raw-consumers), and a word needs no ledger entry. */
    const refresh = button('Refresh', () => load(), 'refresh', 'quiet-button attention-refresh');
    /* The state views are buttons in a group, not ARIA tabs: there is one panel
     * and each choice re-queries the server, which is a filter, not a tab. */
    const views = el('div',{className:'attention-views',attrs:{role:'group','aria-label':'Attention views'}});
    for (const [value, label] of VIEWS) {
      const choice = button(label, () => selectView(value), `view-${value}`, `attention-view-choice${state.view===value?' is-current':''}`);
      choice.setAttribute('aria-pressed', String(state.view === value));
      views.append(choice);
    }
    const page = toHomeAttention(state.data);
    const count = page
      ? el('p',{className:'attention-count',text:`${page.count} ${page.count===1?'item':'items'} · ${state.view==='all'?'all states':attentionLabels[state.view]}`,attrs:{'aria-live':'polite'}})
      : null;
    return el('div',{className:'attention-query'},
      el('div',{className:'attention-toolbar'},scope,refresh),
      el('div',{className:'attention-query-views'},views,count,
        state.departed ? el('p',{className:'attention-departed',text:`${state.departed.title} · now ${attentionLabels[state.departed.status]}, not in this view`,attrs:{role:'status'}}) : null));
  }

  function registry() {
    const list=el('section',{className:'attention-registry',attrs:{'aria-label':'Attention items','aria-busy':String(state.loading)}});
    if(state.loading){
      list.append(el('p',{className:'form-help attention-loading',text:'Loading items…',attrs:{role:'status'}}));
      /* Placeholder geometry only: three quiet bands that hold the list's place so
       * the reading pane does not jump. They carry no text, no count and no
       * progress. */
      list.append(el('div',{className:'attention-placeholder',attrs:{'aria-hidden':'true'}},
        el('span'),el('span'),el('span')));
    }
    if(state.error)list.append(el('div',{className:'attention-list-error',attrs:{role:'status'}},
      el('p',{text:state.error}), button('Retry',()=>load(toHomeAttention(state.data)?.offset ?? 0),'list-retry','quiet-button')));
    const page=toHomeAttention(state.data);
    if(page){
      if(!page.items.length)list.append(el('div',{className:'attention-empty'},el('h3',{text:'Nothing in this view'}),el('p',{text:'Recorded attention items matching this project and state will appear here.'})));
      const rows=el('div',{className:'attention-rows',attrs:{role:'list'}});
      for(const item of page.items){
        const selected = state.selectedId===item.id;
        const row=button('',()=>select(item.id),`item-${item.id}`,'attention-registry-row');
        row.setAttribute('aria-pressed',String(selected));
        row.setAttribute('data-attention-row', item.id);
        const relative=relativeUpdated(item.updatedAt);
        row.append(el('span',{className:'attention-row-title',text:item.title}),
          el('span',{className:'attention-row-meta'},
            el('span',{className:`attention-row-state home-attention-state ${item.status==='needs_you'?'is-review':''}`,text:item.label}),
            relative?el('time',{className:'attention-row-time',text:`Updated ${relative}`,attrs:{datetime:item.updatedAt,title:time(item.updatedAt)}}):null));
        rows.append(el('div',{attrs:{role:'listitem'}},row));
      }
      list.append(rows);
      if(page.offset>0||page.nextOffset!==null){
        const pages=el('div',{className:'attention-pagination'});
        pages.append(page.offset>0?button('Previous',()=>load(Math.max(0,page.offset-PAGE)),'previous','quiet-button'):el('span'));
        pages.append(el('span',{className:'form-help',text:`${page.items.length? page.offset+1:0}–${page.offset+page.items.length} of ${page.count}`}));
        pages.append(page.nextOffset!==null?button('Next',()=>load(page.nextOffset),'next','quiet-button'):el('span'));
        list.append(pages);
      }
    }else if(!state.projectId)list.append(el('p',{className:'form-help',text:'Create a project to begin.'}));
    return list;
  }

  function readingPane() {
    /* With nothing to choose (loading, empty, unavailable) the pane is not drawn:
     * an invitation to choose an item that does not exist would be a false offer. */
    const idle = !state.selectedId && !toHomeAttention(state.data)?.items.length;
    const detail=el('section',{className:`attention-reading${idle?' is-idle':''}`,attrs:{'aria-label':'Attention details'}});
    const body = el('div',{className:'attention-reading-body'});
    detail.append(body);
    if(state.selectedId)body.append(button('Back to items',()=>backToList(),'list-back','quiet-button attention-list-back'));
    if(state.detailLoading)body.append(el('p',{className:'form-help attention-detail-loading',text:'Loading item…',attrs:{role:'status'}}));
    if(state.detailError)body.append(el('div',{className:'attention-list-error',attrs:{role:'status'}},
      el('p',{text:state.detailError}),button('Retry item',()=>select(state.selectedId),'detail-retry','quiet-button')));
    const d=toHomeAttentionDetail(state.detail);
    if(d){
      const article = el('article',{className:'attention-detail'});
      article.append(detailHead(d), decision(d), actionSurface(d), recordedContext(d));
      body.append(article);
    }else if(!state.selectedId && toHomeAttention(state.data)?.items.length)body.append(el('div',{className:'attention-empty attention-reading-empty'},
      icon('attention',{size:20}), el('p',{text:'Choose an item to read its reason, recorded next step and sources.'})));
    return detail;
  }

  /* L1 · what it is and where it stands. Status and seen are two facts and are
   * drawn as two: acknowledging changes the second and never the first. */
  function detailHead(d) {
    const seen = typeof state.detail.seen === 'boolean' ? state.detail.seen : null;
    const relative = relativeUpdated(d.updated_at);
    const meta = el('p',{className:'attention-detail-meta'},
      el('span',{className:`attention-detail-state ${d.status==='needs_you'?'is-review':''}`,text:attentionLabels[d.status]}),
      seen === null ? null : el('span',{className:`attention-seen ${seen?'is-seen':''}`,text:seen?'Seen':'Not seen'}),
      relative ? el('time',{className:'attention-detail-time',text:`Updated ${relative}`,attrs:{datetime:d.updated_at,title:time(d.updated_at)}}) : null);
    return el('header',{className:'attention-detail-head'}, meta,
      el('h2',{text:d.descriptor.title}), d.descriptor.summary?el('p',{className:'attention-summary',text:d.descriptor.summary}):null);
  }

  /* L1 · why, and what is recorded as next. The trigger word is what the next
   * step waits on; a due time is a recorded instant, never a reminder. */
  function decision(d) {
    const next = d.next_action;
    const nextLine = el('p',{className:'attention-next'},
      next && next.kind !== 'none' ? el('span',{className:'attention-next-kind',text:NEXT_KIND_WORDS[next.kind]}) : null,
      el('span',{className:'attention-next-label',text:next?.label??'Not recorded'}));
    const conditions = next?.due_at
      ? el('p',{className:'attention-next-trigger form-help',text:`Recorded due time: ${time(next.due_at)}. Nothing is delivered at this time.`})
      : next && next.kind !== 'none' && next.trigger !== 'manual'
        ? el('p',{className:'attention-next-trigger form-help',text:TRIGGER_WORDS[next.trigger]}) : null;
    return el('div',{className:'attention-decision'},
      el('section',{},el('h3',{text:'Why this needs attention'}),el('p',{className:'attention-reason',text:d.reason})),
      el('section',{},el('h3',{text:'Next step'}),nextLine,conditions));
  }

  /* L3 · version, provenance and the recorded grant, on request. */
  function recordedContext(d) {
    const refs=el('details',{className:'attention-basis'},el('summary',{},
      icon('chevron-right',{size:16}), el('span',{text:'Recorded context'})));
    const list = el('div',{className:'attention-basis-body'});
    const freshness = state.detail.freshness === 'unknown' ? ' · Freshness unknown' : '';
    list.append(el('p',{text:`Revision ${d.revision}${freshness} · Updated ${time(d.updated_at)}`}),
      el('p',{text:'This view reads the recorded item. Opening it does not acknowledge or resolve it.'}));
    const sources = el('ul',{className:'attention-sources'});
    for(const ref of (Array.isArray(state.detail.source_refs)?state.detail.source_refs:[]).filter(ref=>ref && typeof ref.locator==='string'))
      sources.append(el('li',{},
        el('span',{className:'attention-source-kind',text:[SOURCE_ROLE_WORDS[ref.role], ref.kind==='core'?'Retained source':'External reference'].filter(Boolean).join(' · ')}),
        el('span',{className:'attention-source-locator',text:ref.locator})));
    if (sources.children.length) list.append(sources);
    if (Array.isArray(state.detail.source_refs) && !state.detail.source_refs.length) list.append(el('p',{text:'No source references recorded.'}));
    else if (!Array.isArray(state.detail.source_refs)) list.append(el('p',{text:'Source references are not available in this view.'}));
    /* WK-158 §25 · the recorded Runtime grant is readable here and editable
     * nowhere: the policy editor is a separate authority (CC-P). No Revoke,
     * no synthesized "Active" badge and no countdown. */
    if (state.detail.policy) {
      const grant = state.detail.policy.grant;
      list.append(el('p',{text: grant && typeof grant.expires_at === 'string'
        ? `Runtime disclosure until ${time(grant.expires_at)} · recorded fields: ${(Array.isArray(grant.fields)?grant.fields:[]).join(', ') || 'none'}`
        : 'Runtime disclosure: None'}));
    }
    const basis = state.detail.basis;
    if (basis && Number.isSafeInteger(basis.revision) && typeof basis.event_id === 'string') list.append(el('p',{text:`Recorded basis: revision ${basis.revision} · Event ${basis.event_id}. External availability is unconfirmed; execution references describe historical observations.`}));
    for (const ref of (Array.isArray(state.detail.relation_refs)?state.detail.relation_refs:[])) {
      if (ref && typeof ref.kind === 'string' && typeof ref.id === 'string') list.append(el('p',{text:`Related ${ref.kind}: ${ref.id}`}));
    }
    refs.append(list);
    return refs;
  }

  /* ── WK-158 · the disposition layer ───────────────────────────────────────
   * A control exists here for exactly one reason: the object advertised the
   * action and `toAttentionActionDescriptors` recognized its payload schema. A
   * visible button still confers no authority — the server may refuse — and an
   * advertised action this app does not understand renders nothing at all. */
  function actionSurface(d) {
    const surface = el('section',{className:'attention-actions',attrs:{'aria-label':'Attention actions','data-attention-focus':'actions',tabindex:'-1'}});
    surface.append(el('h3',{text:'Actions'}));
    const descriptors = toAttentionActionDescriptors(state.detail);
    if (!descriptors) {
      surface.append(el('p',{className:'form-help',text:'This item advertises no action for you.'}));
      return surface;
    }
    if (!descriptors.actions.length) surface.append(el('p',{className:'form-help',text:'No action is available on this item right now.'}));
    const waiting = currentPending();
    const choices = el('div',{className:'attention-action-choices'});
    for (const descriptor of descriptors.actions) {
      const word = ACTION_WORDS[descriptor.action];
      const open = state.editor?.action === descriptor.action;
      const immediate = !Object.keys(descriptor.fields).length;
      const choice = button('', () => chooseAction(descriptor), `action-${descriptor.action}`,
        `secondary-button attention-action-choice${open?' is-current':''}`);
      /* `acknowledge` is the action itself, so its own control says `Sending…`
       * in place while it is out; every other choice only opens an editor. */
      if (immediate) setRequestLabel(choice, word, waiting?.phase === 'sending' && waiting.action === descriptor.action);
      else choice.textContent = word;
      choice.setAttribute('aria-label', `${word} · ${d.descriptor.title}`);
      if (!immediate) choice.setAttribute('aria-expanded', String(open));
      if ((waiting && immediate) || state.refreshing) choice.disabled = true;
      choices.append(choice);
    }
    surface.append(choices);
    const chosen = descriptors.actions.find(descriptor => descriptor.action === state.editor?.action);
    if (chosen) surface.append(actionEditor(chosen, d));
    if (state.mutationError) surface.append(el('p',{className:'inline-notice attention-action-alert',text:state.mutationError,attrs:{role:'alert'}}));
    /* A conflict re-reads the object; this line says what the re-read found, so
     * the kept draft is re-decided against the version now on screen. */
    if (state.conflict && state.conflict.attentionId === state.selectedId && state.conflict.revision !== d.revision) {
      const was = state.conflict.status !== d.status ? ` (was ${attentionLabels[state.conflict.status]})` : '';
      surface.append(el('p',{className:'attention-conflict-now form-help',text:`Now ${attentionLabels[d.status]}${was} · revision ${d.revision}. Your draft is kept.`}));
    }
    /* An unknown transport result is neither a failure nor a completion. The
     * same stored request — same identity, same payload — is what gets sent
     * again, so a retry can never become a second recorded action. */
    if (waiting?.phase === 'uncertain') {
      const notice = el('div',{className:'inline-notice attention-action-alert attention-uncertain',attrs:{role:'alert'}},
        el('p',{text:waiting.message}));
      notice.append(button('Retry sending', () => void send(waiting), 'retry-mutation', 'secondary-button'));
      surface.append(notice);
    }
    /* The receipt line is drawn only from a receipt that matched this request
     * and after the object was read again: it is the committed fact, stated
     * once, beside the control that asked for it. */
    const receipt = state.receipt;
    if (receipt && receipt.attentionId === state.selectedId && d.revision >= receipt.revision && !waiting)
      surface.append(el('p',{className:'attention-receipt',text:`Recorded · ${ACTION_WORDS[receipt.action]} · revision ${receipt.revision}`,attrs:{role:'status'}}));
    return surface;
  }
  function chooseAction(descriptor) {
    state.mutationError = null;
    /* `acknowledge` carries an empty payload, so it is the action itself, not a
     * form. It is not a toggle: seen does not come back. */
    if (!Object.keys(descriptor.fields).length) {
      if (currentPending()) return;
      state.editor = null; void mutate(descriptor, {}); return;
    }
    const opening = state.editor?.action !== descriptor.action;
    state.editor = opening
      ? { action: descriptor.action, draft: { ...DEFAULT_DRAFT }, fieldError: null }
      : null;
    if (opening) motion.cue = 'editor-open';
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
    /* A field error sits under the control it names, where focus lands. */
    const fieldError = name => fail?.field === name
      ? el('p',{className:'inline-error attention-field-error',text:fail.message,attrs:{id:errorId,role:'alert'}}) : null;
    const field = (label, control, help = null, name = null) =>
      el('div',{className:'attention-field'}, el('label',{className:'attention-field-control'},
        el('span',{className:'attention-field-label',text:label}), control),
        help ? el('span',{className:'form-help',text:help}) : null, name ? fieldError(name) : null);
    if (descriptor.fields.reason) {
      const box = el('textarea',{attrs:{rows:3,maxlength:descriptor.fields.reason.maxLength,
        'data-attention-focus':'field-reason','aria-describedby':describe('reason'),'aria-invalid':fail?.field==='reason'?'true':null}});
      box.value = draft.reason;
      form.append(field('Reason', bind(box,'reason'), null, 'reason'));
    }
    if (descriptor.fields.nextAction) {
      const next = descriptor.fields.nextAction;
      const group = el('fieldset',{className:'attention-next-action'}, el('legend',{text:'Next action'}));
      const pair = el('div',{className:'attention-field-pair'});
      pair.append(field('Kind', choose('kind', next.kinds.map(kind=>[kind,NEXT_KIND_WORDS[kind]]), draft.kind, 'field-kind')));
      pair.append(field('Trigger', choose('trigger', next.triggers.map(trigger=>[trigger,TRIGGER_WORDS[trigger]]), draft.trigger, 'field-trigger', () => render())));
      group.append(pair);
      const label = el('input',{attrs:{type:'text',maxlength:next.labelMaxLength,
        'data-attention-focus':'field-label','aria-describedby':describe('label'),'aria-invalid':fail?.field==='label'?'true':null}});
      label.value = draft.label;
      group.append(field('Label', bind(label,'label'), null, 'label'));
      /* A recorded due time, and nothing else: no countdown, no timer, no
       * delivery promise. The contract says a due time is not a scheduler. */
      if (draft.trigger === 'at') {
        const due = el('input',{attrs:{type:'datetime-local','data-attention-focus':'field-due','aria-describedby':describe('due'),'aria-invalid':fail?.field==='due'?'true':null}});
        due.value = draft.dueLocal;
        group.append(field('Due time', bind(due,'dueLocal'), 'Recorded on the item. Nothing is delivered at this time.', 'due'));
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
    const waiting = currentPending();
    const sending = waiting?.phase === 'sending' && waiting.action === descriptor.action;
    const submit = button('', () => submitAction(descriptor), `submit-${descriptor.action}`,
      'primary-button attention-action-submit');
    setRequestLabel(submit, word, sending);
    submit.setAttribute('aria-label', `${word} · ${d.descriptor.title}`);
    submit.disabled = Boolean(waiting) || state.refreshing;
    const consequence = ACTION_CONSEQUENCE[descriptor.action];
    form.append(el('div',{className:'attention-submit-row'}, submit,
      consequence ? el('p',{className:'form-help attention-consequence',text:consequence}) : null));
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
      before: { status: state.detail?.status ?? null, seen: state.detail?.seen ?? null, revision: descriptor.expectedRevision },
      request: { schema_version: 1, request_id: crypto.randomUUID(), attention_id: attentionId,
        expected_revision: descriptor.expectedRevision, action: descriptor.action, payload } };
    pending.set(key, entry);
    state.receipt = null; state.conflict = null;
    return send(entry);
  }
  async function send(entry) {
    const { projectId, attentionId } = entry;
    const key = pendingKey(projectId, attentionId);
    const wasUncertain = entry.phase === 'uncertain';
    entry.phase = 'sending'; entry.message = null; state.mutationError = null;
    render();
    if (wasUncertain) focusKey('actions')?.focus();
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
    committed(entry, receipt);
    return settle(entry);
  }
  function committed(entry, receipt) {
    if (Number.isSafeInteger(receipt?.revision))
      state.receipt = { attentionId: entry.attentionId, action: entry.action, revision: receipt.revision, before: entry.before, played: false };
  }
  async function refuse(entry, error) {
    pending.delete(pendingKey(entry.projectId, entry.attentionId));
    const code = error.body?.error?.code ?? null;
    state.mutationError = refusalText(error);
    /* The human-authored draft is kept: a conflict means the decision must be
     * made again against new canonical state, not that the words were wrong.
     * The next submit is a new decision and takes a new identity and a new
     * expected revision — this client never silently replays. */
    if (code === 'VERSION_CONFLICT') state.conflict = { attentionId: entry.attentionId, status: entry.before.status, revision: entry.before.revision };
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
        committed(entry, found.result);
        return settle(entry);
      }
      entry.phase = 'uncertain';
      entry.message = 'No committed result was found for this request. It can be sent again unchanged.';
    } catch {
      entry.phase = 'uncertain';
      entry.message = 'The result of this request is not known yet. It can be sent again unchanged.';
    }
    render();
    if (state.selectedId === attentionId) focusKey('retry-mutation')?.focus();
  }
  /* Re-inspect, then re-read the current registry page. */
  /* The re-inspect and the registry re-read each render; feedback motion is held
   * until both have landed, so the one render that states the settled facts is
   * the one that animates them and no later render cuts the animation short. */
  async function settle(entry) {
    const { projectId, attentionId } = entry;
    if (projectId !== state.projectId) { render(); return; }
    const before = rowIds();
    const positions = rowPositions();
    motion.hold = true;
    try {
      if (state.selectedId === attentionId) await select(attentionId, { keepFocus: true });
      if (!await refreshRegistry()) return;
    } finally { motion.hold = false; }
    const departed = !rowIds().includes(attentionId) && before.includes(attentionId);
    if (departed && state.detail?.attention_id === attentionId && state.detail.status)
      state.departed = { id: attentionId, title: state.detail.descriptor?.title, status: state.detail.status };
    render();
    if (departed) {
      closeGap(positions);
      state.returnFocusKey = `item-${attentionId}`;
      restoreFocus(before);
    }
  }
  const registryQuery = offset => ({ schema_version: 1, kind: state.view === 'all' ? 'registry' : 'exact',
    limit: PAGE, offset, ...(state.view === 'all' ? {} : { field: 'status', value: state.view }) });
  /* Re-reads the current page after a committed action. The registry is the
   * server's answer, so nothing here filters or reorders what comes back. It
   * does not render; the caller draws the settled state once. Returns false when
   * a newer load has taken over. */
  async function refreshRegistry() {
    const own = state.generation, projectId = state.projectId;
    let offset = toHomeAttention(state.data)?.offset ?? 0;
    try {
      for (;;) {
        const data = await request('/attention/query',{method:'POST',body:{projectId,query:registryQuery(offset)}});
        if (own !== state.generation || projectId !== state.projectId) return false;
        const page = toHomeAttention(data);
        if (!page) break;
        state.data = data; state.error = null;
        /* The last row of the last page can leave. Backing up one page is the
         * only way the count and the visible rows stay the same fact. */
        if (page.items.length || offset === 0) break;
        offset = Math.max(0, offset - PAGE);
      }
    } catch (error) {
      if (own !== state.generation) return false;
      state.error = refusalText(error);
    }
    return true;
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
    state.receipt=null;state.conflict=null;state.departed=null;motion.shown=null;
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
    if(!keepFocus){
      const narrow = isNarrow();
      if (narrow && !state.selectedId) { motion.listScroll = container.scrollTop ?? 0; motion.cue = 'detail-push'; }
      const ids = rowIds();
      motion.previousIndex = ids.indexOf(state.selectedId);
      if (state.selectedId !== id) { state.receipt=null; state.conflict=null; }
      state.departed=null;
    }
    state.selectedId=id;state.returnFocusKey=`item-${id}`;state.cursorId=id;
    if(!keepFocus){state.editor=null;state.mutationError=null;}
    /* A re-inspect keeps the object on screen until the new read arrives, so the
     * decision the human is looking at does not blank out under a receipt. */
    if(!keepFocus){state.detail=null;motion.shown=null;}
    state.detailError=null;state.detailLoading=!keepFocus;state.refreshing=keepFocus&&Boolean(state.detail);render();
    if(!keepFocus){
      if (isNarrow()) container.scrollTop = 0;
      container.querySelector('[data-attention-focus="list-back"]')?.focus();
    }
    try{const data=await request(`/attention/${encodeURIComponent(id)}?${new URLSearchParams({projectId})}`);if(!toHomeAttentionDetail(data)||data.attention_id!==id)throw new Error("Unsupported attention item.");if(own===state.detailGeneration&&projectId===state.projectId)state.detail=data;}
    catch(error){if(own===state.detailGeneration){state.detailError=refusalText(error);if(keepFocus)state.detail=null;}}
    finally{if(own===state.detailGeneration){state.detailLoading=false;state.refreshing=false;render();}}
  }

  /* ── UI02 · motion, applied after a render has committed its DOM ───────── */
  function runMotion(list, reading) {
    const cue = motion.cue;
    motion.cue = null;
    const narrow = isNarrow();
    /* Narrow round trip: the pane that replaced the other enters from the side
     * it logically sits on — detail from the right, the list back from the left. */
    if (cue === 'detail-push' && narrow) play(reading, [{ opacity: 0, transform: 'translateX(24px)' }, { opacity: 1, transform: 'none' }]);
    if (cue === 'list-return' && narrow) play(list, [{ opacity: 0, transform: 'translateX(-24px)' }, { opacity: 1, transform: 'none' }]);
    /* A slow read shows its status line only if it is still loading after the
     * short duration, so a fast read never flashes "Loading item…". The node is
     * in the DOM (and announced) immediately; only its paint is delayed. */
    const slow = reading.querySelector('.attention-detail-loading');
    if (slow) play(slow, [{ opacity: 0 }, { opacity: 1 }], { duration: '--duration-fast', delay: '--duration', fill: 'backwards' });
    const listLoading = list.querySelector('.attention-placeholder');
    if (listLoading) play(listLoading, [{ opacity: 0 }, { opacity: 1 }], { duration: '--duration', delay: '--duration-fast', fill: 'backwards' });
    const article = reading.querySelector('.attention-detail');
    if (article && motion.shown !== state.selectedId) {
      /* A different object is now being read. On a wide screen the text rises
       * from the direction of the row that was chosen relative to the last one,
       * so the eye can tell "the next item" from "an earlier item". */
      if (!narrow || cue !== 'detail-push') {
        const ids = rowIds();
        const index = ids.indexOf(state.selectedId);
        const offset = motion.previousIndex >= 0 && index >= 0 && index < motion.previousIndex ? -6 : 6;
        play(article, [{ opacity: 0, transform: `translateY(${offset}px)` }, { opacity: 1, transform: 'none' }]);
      }
      motion.shown = state.selectedId;
    }
    if (cue === 'editor-open') {
      const editor = reading.querySelector('.attention-action-editor');
      play(editor, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: '--duration-fast' });
    }
    /* Feedback: a changed recorded fact settles into place once, after the
     * receipt matched and the object was read again. An unchanged fact does not
     * move, and nothing here runs for a refusal or an unknown result. */
    if (motion.hold) return;
    const receipt = state.receipt;
    if (receipt && !receipt.played && state.detail?.attention_id === receipt.attentionId && state.detail.revision >= receipt.revision) {
      receipt.played = true;
      const settleIn = [{ opacity: 0.35, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }];
      if (receipt.before.status !== state.detail.status) {
        play(reading.querySelector('.attention-detail-state'), settleIn);
        play(list.querySelector(`[data-attention-row="${CSS.escape(receipt.attentionId)}"] .attention-row-state`), settleIn);
      }
      if (receipt.before.seen !== state.detail.seen) play(reading.querySelector('.attention-seen'), settleIn);
      play(reading.querySelector('.attention-receipt'), [{ opacity: 0 }, { opacity: 1 }]);
    }
    /* A refusal, a conflict or an unknown result appears without travel: it
     * fades in once when its sentence is new, and a later re-render of the same
     * sentence does not replay it. */
    const alerts = [...reading.querySelectorAll('.attention-action-alert, .attention-conflict-now')];
    const alertKey = alerts.map(node => node.textContent).join('|');
    if (alertKey && alertKey !== motion.alert) for (const alert of alerts) play(alert, [{ opacity: 0 }, { opacity: 1 }], { duration: '--duration-fast' });
    motion.alert = alertKey || null;
    const departed = container.querySelector('.attention-departed');
    if (departed && motion.departed !== state.departed) play(departed, [{ opacity: 0 }, { opacity: 1 }]);
    motion.departed = state.departed;
  }
  function rowPositions() {
    const positions = new Map();
    for (const row of container.querySelectorAll('[data-attention-row]')) {
      const box = rect(row);
      if (box) positions.set(row.getAttribute('data-attention-row'), box.top);
    }
    return positions;
  }
  /* When a committed action moves a row out of this view, the rows beneath it
   * close the gap from where they were, so the list does not appear to jump. */
  function closeGap(positions) {
    if (!positions.size) return;
    for (const row of container.querySelectorAll('[data-attention-row]')) {
      const was = positions.get(row.getAttribute('data-attention-row'));
      const box = rect(row);
      if (was === undefined || !box || Math.abs(was - box.top) < 1) continue;
      play(row, [{ transform: `translateY(${was - box.top}px)` }, { transform: 'none' }]);
    }
  }

  return {
    open({projects,projectId,attentionId=null}){state.projects=projects;state.projectId=projects.find(p=>p.id===projectId)?.id??projects[0]?.id??null;state.view='all';return load(0,attentionId);},
    deactivate(){state.generation++;state.detailGeneration++;},
  };
}
