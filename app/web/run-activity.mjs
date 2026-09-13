import { el } from './ui-controls.mjs';
import { normalizedType } from './thread-projection.mjs';

// Received local phrase fixture; not a provider thinking signal or progress estimate.
export const THINKING_PHRASES = Object.freeze(['Thinking', 'Pondering', 'Musing', 'Considering', 'Reflecting']);
const ambientWords = ['Working', ...THINKING_PHRASES];
export const PROCESS_PHRASES = Object.freeze({
  working: ambientWords,
  tools: ['Running tools', 'Working with tools'],
  reading: ['Reading files', 'Looking through files'],
  writing: ['Updating files', 'Writing changes'],
  searching: ['Searching files', 'Looking for matches'],
  response: ['Writing response', 'Composing response'],
  compaction: ['Summarizing context', 'Compacting history'],
  retry: ['Retrying request', 'Retry in progress'],
});
const labels = { created: 'Starting', running: 'Working', waiting_user: 'Waiting for you', stopping: 'Stopping',
  completed: 'Completed', cancelled: 'Cancelled', failed: 'Failed' };

export function projectRunProcess(events = [], run) {
  if (!run?.id || run.status !== 'running') return 'working';
  const calls = new Map();
  let compacting = false, retrying = false, response = false;
  for (const event of events) {
    if (event.runId !== run.id || (event.sessionId && event.sessionId !== run.sessionId)) continue;
    const type = normalizedType(event.type), data = event.data || {};
    if (type === 'tool/start' || type === 'tool/update') {
      if (typeof data.callId === 'string' && data.callId) calls.set(data.callId, data.name);
      response = false;
    } else if (type === 'tool/result') { calls.delete(data.callId); response = false; }
    else if (type === 'assistant/delta') response = typeof (data.text ?? data.delta) === 'string' && Boolean((data.text ?? data.delta).trim());
    else if (type === 'assistant/final') response = false;
    else if (type === 'run/notice') {
      if (data.kind === 'compaction_start') { compacting = true; response = false; }
      if (['compaction_end', 'compaction_limit_reached'].includes(data.kind)) compacting = false;
      if (data.kind === 'auto_retry_start') { retrying = true; response = false; }
      if (data.kind === 'auto_retry_end') retrying = false;
    }
  }
  if (compacting) return 'compaction';
  if (retrying) return 'retry';
  if (calls.size) {
    const names = [...calls.values()];
    if (names.every(name => name === 'ws_read' || name === 'ws_list')) return 'reading';
    if (names.every(name => name === 'ws_write')) return 'writing';
    if (names.every(name => name === 'ws_grep')) return 'searching';
    return 'tools';
  }
  return response ? 'response' : 'working';
}

export function projectRunActivity({ run, events = [], connected = true, pendingCancel = false, visible = true } = {}) {
  if (!visible || !run?.id) return { visible: false, moving: false, key: '', label: '' };
  const active = ['created', 'running', 'waiting_user', 'stopping'].includes(run.status);
  const stale = active && !connected;
  const process = projectRunProcess(events, run);
  return {
    visible: true,
    key: JSON.stringify([run.sessionId, run.id, run.status, stale, pendingCancel, process]),
    label: stale ? 'Connection lost' : run.status === 'running' ? PROCESS_PHRASES[process][0] : labels[run.status] || 'Status unavailable',
    words: PROCESS_PHRASES[process],
    moving: run.status === 'running' && !stale && !pendingCancel,
    // A cancellation command freezes decoration but does not change the Run state.
    pending: active && !stale && !['waiting_user'].includes(run.status),
  };
}

export function createRunActivity({ onInspect, now = Date.now, schedule = setTimeout, cancel = clearTimeout,
  media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') } = {}) {
  const glyph = el(onInspect ? 'button' : 'span', {
    className: 'run-activity-glyph',
    attrs: onInspect ? { type: 'button', 'aria-label': 'Measurement details', 'data-tooltip': 'Measurement details',
      'aria-haspopup': 'dialog', 'aria-expanded': 'false' } : { 'aria-hidden': 'true' },
  }, el('span', { className: 'run-activity-bars', attrs: { 'aria-hidden': 'true' } },
    ...Array.from({ length: 7 }, () => el('i'))));
  const phrase = el('span', { className: 'run-activity-phrase', attrs: { 'aria-hidden': 'true' } });
  const live = el('span', { className: 'sr-only', attrs: { role: 'status' } });
  const root = el('div', { className: 'run-activity' }, glyph, phrase, live);
  root.hidden = true;
  if (onInspect) glyph.addEventListener('click', event => onInspect(glyph, event));
  let projection = projectRunActivity(), started = now(), pausedAt = null, timer = null, generation = 0, destroyed = false;
  function paint() {
    cancel(timer); timer = null;
    const own = ++generation;
    const moving = projection.moving && !media?.matches && document.documentElement?.getAttribute('data-motion') !== 'reduce' && !document.hidden;
    if (!moving && pausedAt === null) pausedAt = now();
    else if (moving && pausedAt !== null) { started += now() - pausedAt; pausedAt = null; }
    root.classList.toggle('is-moving', moving);
    const words = projection.words || ambientWords;
    const index = moving ? Math.floor(Math.max(0, now() - started) / 3500) % words.length : 0;
    const next = projection.moving ? `${words[index]}…` : `${projection.label}${projection.pending ? '…' : ''}`;
    // Ambient words are not live announcements. Fact changes below are announced once.
    if (phrase.textContent !== next) phrase.textContent = next;
    if (moving) timer = schedule(() => { if (!destroyed && own === generation) paint(); },
      3500 - (Math.max(0, now() - started) % 3500));
  }
  const wake = () => { if (!destroyed) paint(); };
  const preferenceObserver = globalThis.MutationObserver && document.documentElement
    ? new MutationObserver(wake) : null;
  preferenceObserver?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
  document.addEventListener?.('visibilitychange', wake);
  media?.addEventListener?.('change', wake);
  function update(facts) {
    const next = projectRunActivity(facts);
    if (next.key !== projection.key) { started = now(); pausedAt = null; }
    if (next.label !== projection.label) live.textContent = next.label;
    projection = next;
    root.hidden = !next.visible;
    paint();
  }
  function deactivate() { update({ visible: false }); }
  function destroy() {
    destroyed = true; generation++; cancel(timer); timer = null;
    preferenceObserver?.disconnect();
    document.removeEventListener?.('visibilitychange', wake);
    media?.removeEventListener?.('change', wake);
  }
  return { root, glyph, update, deactivate, destroy };
}
