import { el } from './ui-controls.mjs';

/* UX-11 / UX-10 (S4) · the ambient answers to "does anything need me?", read
 * from the owner facts Home already reads; no unread state is invented.
 *
 * - A chat waits on the person when one of its runs has an open, actionable
 *   question: `/work-summary` pendingItems, across all projects. Its rail row
 *   carries the hollow ring of a run waiting on a person (as on a Preview tab)
 *   and one word for what is waited for, so status is not shape or colour
 *   alone (IC-1).
 * - The Attention entry carries the number of Attention items that need the
 *   person in the working project: the Core registry's `needs_you` status, the
 *   same registry the item queue reads. A run waiting in a chat is not an
 *   Attention item (sidebar product model: run counts and Attention counts stay
 *   apart), so the two never add up.
 *
 * Unknown is not zero: a failed read shows no count rather than none, and a
 * failed waiting read keeps the last marks until a read succeeds. */

export const WAIT_WORD = { permission: 'Approval', ask_user: 'Answer' };
const WAIT_SENTENCE = { permission: 'Waiting for your approval', ask_user: 'Waiting for your answer' };
const OPEN_RUN = new Set(['created', 'running', 'stopping', 'waiting_user']);

/** sessionId → the kind of that chat's oldest actionable question. Pure. */
export function waitingBySession(items) {
  const bySession = new Map();
  for (const item of items || []) if (WAIT_WORD[item?.kind] && !bySession.has(item.sessionId)) bySession.set(item.sessionId, item.kind);
  return bySession;
}

/** The mark of a waiting chat row; null when the chat is not waiting. The
 * visible word is short; the sentence is what a screen reader hears. */
export function waitMark(kind) {
  if (!WAIT_WORD[kind]) return null;
  return el('span', { className: 'session-wait', attrs: { 'data-kind': kind } },
    el('span', { className: 'tab-activity waiting_user', attrs: { 'aria-hidden': 'true' } }),
    el('span', { text: WAIT_WORD[kind], attrs: { 'aria-hidden': 'true' } }),
    el('span', { className: 'sr-only', text: ` · ${WAIT_SENTENCE[kind]}` }));
}

/** "2 need you" for a known positive count; null otherwise. */
export function needsYouWords(count) {
  return Number.isSafeInteger(count) && count > 0 ? `${count} need${count === 1 ? 's' : ''} you` : null;
}

/* One reader for both facts. `refresh()` reads now; while the page is visible
 * and some run is open or some chat is waiting, it reads again every
 * `interval` ms, because a run in another chat can start waiting at any time.
 * With nothing open, the next read comes from navigation or a sent message. */
export function createShellSignals({ request, requestOptions = () => undefined, attentionScope, onChange, interval = 15_000 }) {
  let waiting = new Map(), open = false, attention = { projectId: null, count: null };
  let waitingEpoch = 0, attentionEpoch = 0, timer = null, requestedScope, shown = '';

  async function readWaiting() {
    const own = ++waitingEpoch;
    try {
      const items = [];
      let offset = 0, anyOpen = false;
      for (let pages = 0; pages < 20; pages++) {
        const data = await request(`/work-summary?limit=100&pendingOffset=${offset}`, requestOptions());
        items.push(...(data?.pendingItems?.items || []));
        if (pages === 0) anyOpen = (data?.sessionCandidates?.items || []).some((item) => OPEN_RUN.has(item.latestRun?.status));
        if (!data?.pendingItems?.hasMore) break;
        offset = data.pendingItems.nextOffset;
      }
      if (own !== waitingEpoch) return;
      waiting = waitingBySession(items);
      open = anyOpen || items.length > 0;
    } catch {
      // The last marks stay until a read succeeds.
    }
  }

  async function readAttention() {
    const own = ++attentionEpoch;
    const projectId = attentionScope();
    requestedScope = projectId;
    if (!projectId) { attention = { projectId: null, count: null }; return; }
    try {
      const data = await request('/attention/query', { method: 'POST', body: { projectId, query: { schema_version: 1, kind: 'exact', field: 'status', value: 'needs_you', limit: 1, offset: 0 } } });
      if (own === attentionEpoch) attention = { projectId, count: Number.isSafeInteger(data?.count) ? data.count : null };
    } catch {
      if (own === attentionEpoch) attention = { projectId, count: null };
    }
  }

  // Views redraw only when what they show changed.
  function settle() {
    const next = JSON.stringify([[...waiting], attention]);
    if (next === shown) return;
    shown = next;
    onChange();
  }
  async function refresh() {
    await Promise.all([readWaiting(), readAttention()]);
    settle();
  }
  function tick() {
    if (open && globalThis.document?.visibilityState !== 'hidden') void refresh();
  }

  return {
    refresh,
    /** Called on render: when the working project has changed since the last
     * read, the count is read again for the new one. */
    followScope() {
      if (attentionScope() !== requestedScope) void readAttention().then(settle);
    },
    start() {
      if (timer) return;
      timer = setInterval(tick, interval);
      globalThis.document?.addEventListener?.('visibilitychange', () => { if (document.visibilityState === 'visible') void refresh(); });
    },
    waitingKind: (sessionId) => waiting.get(sessionId) ?? null,
    attention: () => ({ ...attention }),
  };
}
