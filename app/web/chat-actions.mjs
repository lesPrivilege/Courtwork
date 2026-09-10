import { semanticPresentation } from './semantic-controls.mjs';
import { el, action, setAction, anchorPopover } from './ui-controls.mjs';

// Presentation intents. These names confer no backend capability or authority.
export const CHAT_ACTIONS = Object.freeze(Object.fromEntries(["copy", "edit", "read-aloud", "stop-reading", "like", "dislike", "regenerate", "fork", "share", "pin", "copy-path", "copy-hash", "download", "open-with", "reveal"].map(intent => {
  const {glyph, label} = semanticPresentation(`message.${intent}`);
  return [intent, Object.freeze({icon:glyph, label})];
})));
const REASONS = Object.freeze({
  'read-aloud': 'Read aloud is not available in this app yet.',
  'stop-reading': 'There is no active reading to stop.',
  like: 'Response feedback is not available in this app yet.',
  dislike: 'Response feedback is not available in this app yet.',
  regenerate: 'Regenerating this response is not available yet. The original response is unchanged.',
  fork: 'Forking from a message is not available yet. This chat is unchanged.',
  share: 'Message sharing is not available yet. Nothing has been published.',
  pin: 'Pinning individual messages is not available yet.',
  download: 'Saving a copy of this recorded version is not available here yet.',
  'open-with': 'Choosing a local app is not available from this view.',
  reveal: 'Showing this file in a local folder is not available from this view.',
});

/** Production admits only a supplied, existing handler. No endpoint guessing,
 * browser speech service, local feedback store, optimistic pin, or fake result. */
export function createProductionActionAdapter(handlers = {}) {
  return {
    availability(intent) {
      return typeof handlers[intent] === 'function'
        ? { available: true }
        : { available: false, reason: REASONS[intent] || 'This action is not available here.' };
    },
    async invoke(intent, target, context) {
      if (typeof handlers[intent] !== 'function') throw new Error(REASONS[intent] || 'Action unavailable.');
      const result = await handlers[intent](target, context);
      if (result === false) throw new Error('The action could not be completed.');
      return { state: 'success', message: intent.startsWith('copy') ? 'Copied.' : '' };
    },
  };
}

const sameTarget = (a, b) => Boolean(a && b && a.key === b.key && a.role === b.role &&
  a.text === b.text && a.pending === b.pending && a.path === b.path && a.sha256 === b.sha256);
let nextMenu = 0;

/** The adapter owns results. This component owns transient controls, pending
 * UI and focus only; its captured message bytes never follow another message. */
export function createChatActions({ target, adapter, getTarget = () => target,
  positionPopover = anchorPopover }) {
  const captured = Object.freeze({ ...target });
  const root = el('div', { className: 'chat-actions', attrs: { 'data-chat-target': captured.key } });
  const bar = el('div', { className: 'chat-action-row', attrs: {
    role: 'group', 'aria-label': captured.role === 'file' ? 'Recorded file actions' : captured.role === 'user' ? 'Message actions' : 'Response actions',
  } });
  const status = el('p', { className: 'chat-action-status', attrs: { role: 'status', 'aria-live': 'polite' } });
  status.hidden = true;
  const confirm = el('div', { className: 'chat-action-confirm' }); confirm.hidden = true;
  const menuId = `chat-actions-menu-${++nextMenu}`;
  const menu = el('div', { className: 'chat-actions-menu', attrs: { id: menuId, popover: 'auto', role: 'menu', 'aria-label': 'More actions' } });
  const buttons = new Map(), states = new Map(), locks = new Set();
  let cleanup = null, audio = 'idle', feedback = null, pinned = false, audioAbort = null;
  const key = intent => `chat-action:${encodeURIComponent(captured.key)}:${intent}`;
  const current = () => root.isConnected && sameTarget(captured, getTarget());
  function notice(message, state = '') {
    status.textContent = message || ''; status.hidden = !message;
    status.dataset.state = state;
  }
  function availability(intent) {
    if (captured.pending && intent !== 'copy') return { available: false, reason: 'Available after this response finishes.' };
    if (intent === 'edit' && captured.editDisabled) return { available: false, reason: 'Editing a new draft is unavailable while this chat is busy.' };
    return adapter.availability(intent, captured) || { available: false, reason: 'This action is not available here.' };
  }
  function labelFor(intent) {
    if (intent === 'copy') return captured.role === 'user' ? 'Copy message' : captured.pending ? 'Copy current text' : 'Copy response';
    if (intent === 'read-aloud') return audio === 'playing' ? 'Pause reading' : audio === 'paused' ? 'Resume reading' : 'Read aloud';
    if (intent === 'pin' && pinned) return 'Unpin message';
    return CHAT_ACTIONS[intent].label;
  }
  function paint() {
    for (const [intent, button] of buttons) {
      const state = states.get(intent) || 'idle';
      const available = availability(intent);
      const busy = locks.has(intent === 'like' || intent === 'dislike' ? 'feedback' : intent);
      const selected = intent === 'like' ? feedback === 'like' : intent === 'dislike' ? feedback === 'dislike' : intent === 'pin' ? pinned : false;
      const displayKey = intent === 'read-aloud' && audio !== 'idle' ? audio === 'playing' ? 'message.pause-reading' : 'message.resume-reading' : `message.${intent}`;
      const name = semanticPresentation(displayKey).glyph;
      button.setAttribute('data-semantic-key', displayKey);
      const label = labelFor(intent);
      setAction(button, name, label, { visible: button.dataset.inMenu === 'true', size: 18 });
      button.dataset.actionState = busy ? 'busy' : !available.available ? 'unavailable' : selected ? 'selected' : state;
      button.setAttribute('aria-busy', String(busy));
      button.setAttribute('aria-disabled', String(!available.available || busy));
      if (intent === 'pin') button.setAttribute('aria-checked', String(selected));
      else if (['like', 'dislike'].includes(intent)) button.setAttribute('aria-pressed', String(selected));
      if (!available.available) button.dataset.tooltip = `${label} — unavailable`;
      if (intent === 'stop-reading') button.hidden = audio === 'idle' && !locks.has('read-aloud');
    }
  }
  function closeMenu(restore = false) {
    if (menu.matches(':popover-open')) menu.hidePopover();
    cleanup?.(); cleanup = null;
    more.setAttribute('aria-expanded', 'false');
    if (restore && more.isConnected) more.focus();
  }
  async function invoke(intent, confirmed = false) {
    if (!current()) return;
    const available = availability(intent);
    if (!available.available) { notice(available.reason || 'This action is not available here.', 'unavailable'); return; }
    const lock = intent === 'like' || intent === 'dislike' ? 'feedback' : intent;
    if (locks.has(lock)) return;
    if (intent === 'regenerate' && !confirmed) {
      confirm.hidden = false;
      confirm.replaceChildren(el('p', { text: 'Regenerate this response? The original stays available; this creates another attempt.' }),
        action('x', 'Cancel regeneration', () => { confirm.hidden = true; buttons.get(intent)?.focus(); }, { visible: 'Cancel', size: 18 }),
        action('rotate-ccw', 'Confirm regeneration', () => { confirm.hidden = true; buttons.get(intent)?.focus(); void invoke(intent, true); }, { visible: 'Regenerate', size: 18 }));
      confirm.querySelector('button')?.focus(); return;
    }
    if (intent === 'stop-reading') audioAbort?.abort();
    const controller = new AbortController();
    if (intent === 'read-aloud') audioAbort = controller;
    locks.add(lock); states.set(intent, 'busy'); paint(); notice(`${labelFor(intent)}…`, 'busy');
    const operation = intent === 'read-aloud' ? audio === 'playing' ? 'pause' : audio === 'paused' ? 'resume' : 'play' : undefined;
    try {
      const result = await adapter.invoke(intent, captured, { signal: controller.signal, operation, selection: feedback, pinned });
      if (!current() || controller.signal.aborted) return;
      if (!result || !['success', 'selected', 'playing', 'paused', 'idle'].includes(result.state)) throw new Error('The action did not return a result.');
      if (intent === 'read-aloud') audio = result.state === 'playing' || result.state === 'paused' ? result.state : 'idle';
      if (intent === 'stop-reading') audio = 'idle';
      if (intent === 'like' || intent === 'dislike') {
        if (![null, 'like', 'dislike'].includes(result.selection)) throw new Error('The feedback result was not recognised.');
        feedback = result.selection;
      }
      if (intent === 'pin') {
        if (typeof result.pinned !== 'boolean') throw new Error('The pin result was not recognised.');
        pinned = result.pinned;
      }
      states.set(intent, result.state); notice(result.message || '', result.state);
    } catch (error) {
      if (current() && !controller.signal.aborted) { states.set(intent, 'error'); notice(error.message || 'The action failed. Try again.', 'error'); }
    } finally {
      locks.delete(lock);
      if (current()) paint();
    }
  }
  function control(intent, inMenu = false) {
    const button = action(CHAT_ACTIONS[intent].icon, labelFor(intent), () => {
      if (inMenu) closeMenu(true);
      void invoke(intent);
    }, { visible: inMenu, size: 18, attrs: {
      'data-chat-action': intent, 'data-semantic-key': `message.${intent}`, 'data-focus-key': key(intent),
      ...(inMenu ? { role: intent === 'pin' ? 'menuitemcheckbox' : 'menuitem', 'data-in-menu': 'true' } : {}),
    } });
    buttons.set(intent, button); return button;
  }
  const primary = captured.role === 'file' ? [] : captured.role === 'user' ? ['copy', 'edit'] : ['copy', 'read-aloud', 'stop-reading', 'like', 'dislike', 'regenerate'];
  const secondary = captured.role === 'file' ? ['copy-path', 'copy-hash', 'download', 'open-with', 'reveal'] : ['fork', 'share', 'pin'];
  primary.forEach(intent => bar.append(control(intent)));
  secondary.forEach(intent => menu.append(control(intent, true)));
  const morePresentation = semanticPresentation('menu.more', {values:{target:captured.role === 'file' ? 'file' : 'message'}});
  const more = action(morePresentation.glyph, morePresentation.label, () => {
    if (menu.matches(':popover-open')) { closeMenu(true); return; }
    if (!current()) return;
    menu.showPopover(); more.setAttribute('aria-expanded', 'true');
    cleanup = positionPopover(more, menu);
    menu.querySelector('button')?.focus();
  }, { size: 18, attrs: { 'aria-haspopup': 'menu', 'aria-controls': menuId, 'aria-expanded': 'false', 'data-chat-more': '', 'data-semantic-key': 'menu.more', 'data-focus-key': key('more') } });
  more.addEventListener('keydown', event => { if (event.key === 'ArrowDown') { event.preventDefault(); more.click(); } });
  menu.addEventListener('toggle', event => {
    if (event.newState === 'closed') { cleanup?.(); cleanup = null; more.setAttribute('aria-expanded', 'false'); }
  });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMenu(true); return; }
    if (event.key === 'Tab') { closeMenu(false); return; }
    const items = [...menu.querySelectorAll('button')];
    const index = items.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (index + 1) % items.length : event.key === 'ArrowUp' ? (index + items.length - 1) % items.length : null;
    if (next !== null) { event.preventDefault(); items[next]?.focus(); }
  });
  confirm.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); confirm.hidden = true; buttons.get('regenerate')?.focus(); } });
  bar.append(more); root.append(bar, status, confirm, menu); paint();
  return root;
}


// A stream repaint may dismiss a native menu. Restore its same-message More
// control instead of trying to focus a now-hidden menu item.
export function restoreChatActionFocus(scope, focusKey) {
  let target = [...scope.querySelectorAll('[data-focus-key]')].find(n => n.dataset.focusKey === focusKey);
  if (target?.closest('.chat-actions-menu') && !target.closest('.chat-actions-menu').matches(':popover-open'))
    target = target.closest('.chat-actions')?.querySelector('[data-chat-more]');
  if (!target || target.disabled) return false;
  target.focus(); return true;
}
