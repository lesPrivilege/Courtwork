import { el, action, anchorPopover } from './ui-controls.mjs';

/* UX-11 (S3) · adding files to a chat that has started is one popover from the
 * composer's paperclip, like Home's draft attachments (draft-attachments.mjs),
 * instead of a modal, a collapsed disclosure and a single-file form. The scope
 * differs and is said: these files are saved to this chat now, not attached to
 * one message. Saving goes through the Files view's own command
 * (`materialsView.addFiles`), so revisions, same-command retries and conflicts
 * behave as in the Files form; managing and reviewing files stays in Files.
 *
 * A batch belongs to the chat it started in. If that chat is left, or the
 * popover is dismissed before the batch ends, anything that did not save is
 * said once as a toast, and unresolved outcomes stay until they are seen. */
export function createChatFilesAttach({ trigger, addFiles, openFiles, getSessionId, notify }) {
  let stopFollowing = null, busy = false, outcomes = [], owner = null, pressedWhileOpen = false;
  const popover = el('div', { className: 'draft-attachments-popover chat-files-popover', attrs: { id: 'chat-files-popover', popover: 'auto', role: 'dialog', 'aria-label': 'Add files to this chat' } });
  const upload = el('input', { attrs: { type: 'file', multiple: '', accept: '.txt,.md,.csv,.json,.html,.xml,.yaml,.yml,text/*', 'aria-label': 'Choose text files' } });
  const status = el('p', { className: 'form-help', attrs: { role: 'status', tabindex: '-1' } });
  const list = el('ul', { className: 'chat-files-outcomes' });
  const close = action('x', 'Close add files', () => dismiss());
  const files = action('chevron-right', 'Open chat files', () => { dismiss({ refocus: false }); openFiles(); }, { visible: true, trailing: true, className: 'context-row' });
  popover.append(
    el('div', { className: 'section-heading' }, el('h3', { text: 'Add to this chat' }), close),
    el('p', { className: 'form-help', text: "UTF-8 text files, up to 1 MB each. They are saved to this chat's files now and kept as versions." }),
    upload, status, list, files);
  trigger.after(popover);
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'chat-files-popover');
  // A press on the paperclip while open light-dismisses first; the click must not reopen.
  trigger.addEventListener('pointerdown', () => { pressedWhileOpen = popover.matches(':popover-open'); });

  const isOpen = () => popover.matches(':popover-open');
  const unresolved = () => outcomes.some((entry) => entry.outcome !== 'written');
  function summary() {
    const saved = outcomes.filter((entry) => entry.outcome === 'written').length;
    if (!outcomes.length) return '';
    return saved === outcomes.length ? `Saved ${saved} file${saved === 1 ? '' : 's'} to this chat.` : `Saved ${saved} of ${outcomes.length}.`;
  }
  function dismiss({ refocus = true } = {}) {
    if (isOpen()) popover.hidePopover();
    if (refocus) trigger.focus();
  }
  function render() {
    const hadFocus = popover.contains(document.activeElement);
    upload.disabled = busy;
    list.replaceChildren(...outcomes.map((entry) => {
      // Retry resends the same upload command; it keeps visible text (IC-1).
      const retry = entry.retry ? el('button', { className: 'text-button', text: 'Retry', attrs: { type: 'button', 'aria-label': `Retry ${entry.name}` } }) : null;
      retry?.addEventListener('click', async () => {
        if (busy) return;
        busy = true; status.textContent = `Retrying ${entry.name}…`; render();
        const again = await entry.retry();
        outcomes = outcomes.map((item) => (item === entry ? again : item));
        busy = false; status.textContent = summary(); render();
      });
      return el('li', { className: `chat-files-outcome is-${entry.outcome}` },
        el('span', { className: 'chat-files-outcome-name', text: entry.name }),
        el('span', { className: 'context-meta', text: entry.message }),
        retry);
    }));
    list.hidden = !outcomes.length;
    // Redrawn or disabled controls do not strand focus on the page body.
    if (hadFocus && isOpen() && !popover.contains(document.activeElement)) (busy ? status : upload).focus();
  }

  upload.addEventListener('change', async () => {
    const chosen = [...(upload.files || [])];
    upload.value = '';
    if (!chosen.length || busy) return;
    busy = true;
    owner = getSessionId();
    status.textContent = `Saving ${chosen.length} file${chosen.length === 1 ? '' : 's'}…`;
    render();
    let result = [];
    try { result = await addFiles(chosen); }
    catch (error) { result = chosen.map((file) => ({ name: file.name, outcome: 'failed', message: error.message || 'The file could not be added.' })); }
    busy = false;
    const stillHere = getSessionId() === owner;
    const failed = result.filter((entry) => entry.outcome !== 'written');
    if (!stillHere || !isOpen()) {
      // Said once where the person is; the chat's Files view holds the detail.
      if (failed.length) notify(`${failed.length} of ${result.length} file${result.length === 1 ? '' : 's'} did not save to the chat you added them to. Open its files to review.`, 'error');
      else if (result.length) notify(`Saved ${result.length} file${result.length === 1 ? '' : 's'} to the chat.`);
    }
    outcomes = stillHere ? result : [];
    status.textContent = stillHere ? summary() : '';
    render();
  });
  popover.addEventListener('toggle', (event) => {
    stopFollowing?.(); stopFollowing = null;
    const open = event.newState === 'open';
    trigger.setAttribute('aria-expanded', String(open));
    if (open) stopFollowing = anchorPopover(trigger, popover, { placement: 'top-start' });
  });
  popover.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss(); } });

  return {
    open() {
      if (pressedWhileOpen) { pressedWhileOpen = false; return; }
      if (isOpen()) { dismiss(); return; }
      // Outcomes that did not save stay until they have been seen once more.
      if (!busy && !unresolved()) { outcomes = []; status.textContent = ''; }
      render();
      popover.showPopover();
      upload.focus();
    },
    /** A chat switch clears what the last chat reported; a batch still saving reports by toast. */
    reset() {
      if (!busy) { outcomes = []; status.textContent = ''; render(); }
      dismiss({ refocus: false });
    },
  };
}
