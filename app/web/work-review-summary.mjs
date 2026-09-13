import {action, el, flowRow} from './ui-controls.mjs';

const STATUSES = new Set(['unbound', 'unavailable', 'available']);

function nonnegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function readSummary(response, session) {
  if (!response || response.schemaVersion !== 1 || response.sessionId !== session.id
    || !STATUSES.has(response.status)) throw new Error('The work review summary response is invalid.');
  const expectedExtension = session.extensionBinding?.extensionId ?? null;
  if (response.extensionId !== expectedExtension) throw new Error('The work review summary binding changed.');
  if (response.status !== 'available') {
    if (response.summary !== null) throw new Error('The work review summary response is invalid.');
    return response;
  }
  const summary = response.summary;
  const expectedMatter = session.extensionBinding?.binding?.matterId;
  if (!summary || typeof summary.matterId !== 'string' || typeof summary.title !== 'string'
    || (typeof expectedMatter === 'string' && summary.matterId !== expectedMatter)
    || !nonnegativeInteger(summary.version) || !nonnegativeInteger(summary.sourceVersion)
    || typeof summary.contractVersion !== 'string' || typeof summary.stateVersion !== 'string'
    || typeof summary.readOnly !== 'boolean' || !nonnegativeInteger(summary.pendingCount)
    || !nonnegativeInteger(summary.stalePendingCount) || !nonnegativeInteger(summary.reviewableCount)
    || summary.stalePendingCount > summary.pendingCount || summary.reviewableCount > summary.pendingCount
    || !(summary.acceptedArtifactId === null || typeof summary.acceptedArtifactId === 'string'))
    throw new Error('The work review summary response is invalid.');
  return response;
}

// A compact read of Core-owned review state. It never derives review state
// from Run presentation and never sends a Work command.
export function createWorkReviewSummary({session, request, isCurrent, onOpenWork}) {
  let generation = 0, destroyed = false;
  const root = el('section', {
    className: 'surface-block work-review-summary',
    attrs: {
      'aria-label': 'Work review summary',
      'data-reading-key': JSON.stringify([session.id, 'work-review-summary']),
    },
  });
  const open = flowRow('button', {
    title: 'Work review',
    meta: 'No pending review',
    className: 'work-review-open',
    attrs: {type: 'button'},
  }, el('span', {className: 'work-review-verb', text: 'Review'}));
  const title = open.querySelector('.flow-title');
  const pending = open.querySelector('.flow-meta');
  const refresh = action('refresh-cw', 'Refresh work review', () => void load());
  const controls = el('div', {className: 'work-review-summary-controls'}, refresh);
  const note = el('div', {className: 'work-review-summary-note'});
  const live = own => !destroyed && own === generation && isCurrent();
  open.addEventListener('click', () => {
    if (!destroyed && isCurrent() && controls.contains(open)) onOpenWork(open);
  });

  function renderMessage(text, {alert = false} = {}) {
    note.replaceChildren(el('p', {
      className: 'form-help', text,
      attrs: alert ? {role: 'alert'} : {role: 'status'},
    }));
  }

  function renderAvailable(summary) {
    title.textContent = summary.title || 'Untitled work';
    title.title = title.textContent;
    const facts = [summary.pendingCount === 0 ? 'No pending review' : `${summary.pendingCount} pending`];
    if (summary.stalePendingCount > 0) facts.push(`${summary.stalePendingCount} earlier version`);
    if (summary.readOnly) facts.push('Read-only');
    pending.textContent = facts.join(' · ');
    open.setAttribute('aria-label', `Work review: ${title.textContent}. ${facts.join('. ')}.`);
    root.classList.toggle('is-quiet', summary.pendingCount === 0);
    note.replaceChildren();
    controls.replaceChildren(open);
  }

  async function load() {
    if (destroyed || !isCurrent()) return;
    const own = ++generation;
    refresh.disabled = true;
    controls.replaceChildren();
    root.classList.remove('is-quiet');
    // Unknown while the read is in flight: old counts must not survive as if
    // they described the new state.
    renderMessage('Reading work review summary…');
    try {
      const response = readSummary(await request(`/sessions/${encodeURIComponent(session.id)}/review-summary`), session);
      if (!live(own)) return;
      if (response.status === 'unbound') renderMessage('No work review is bound to this chat.');
      else if (response.status === 'unavailable') {
        renderMessage('Work review summary is unavailable.');
        controls.replaceChildren(refresh);
      }
      else renderAvailable(response.summary);
    } catch (error) {
      if (live(own)) {
        renderMessage(`Work review summary unavailable: ${error.message}`, {alert: true});
        controls.replaceChildren(refresh);
      }
    } finally {
      if (live(own)) refresh.disabled = false;
    }
  }

  root.append(controls, note);
  void load();
  return {
    root,
    refresh: load,
    destroy() { destroyed = true; ++generation; },
  };
}
