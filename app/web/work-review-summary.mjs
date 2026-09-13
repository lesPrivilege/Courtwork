import {action, el, flowRow, icon} from './ui-controls.mjs';

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
  }, icon('chevron-right', {size: 16}));
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
    pending.textContent = summary.pendingCount === 0 ? 'No pending review' : `${summary.pendingCount} pending`;
    const facts = [];
    if (summary.stalePendingCount > 0)
      facts.push(`${summary.stalePendingCount} based on an earlier version.`);
    if (summary.readOnly)
      facts.push('Review actions are read-only right now.');
    if (facts.length) note.replaceChildren(el('p', {className: 'form-help', text: facts.join(' ')}));
    else note.replaceChildren();
    controls.replaceChildren(open, refresh);
  }

  async function load() {
    if (destroyed || !isCurrent()) return;
    const own = ++generation;
    refresh.disabled = true;
    controls.replaceChildren(refresh);
    // Unknown while the read is in flight: old counts must not survive as if
    // they described the new state.
    renderMessage('Reading work review summary…');
    try {
      const response = readSummary(await request(`/sessions/${encodeURIComponent(session.id)}/review-summary`), session);
      if (!live(own)) return;
      if (response.status === 'unbound') renderMessage('No work review is bound to this chat.');
      else if (response.status === 'unavailable') renderMessage('Work review summary is unavailable.');
      else renderAvailable(response.summary);
    } catch (error) {
      if (live(own)) renderMessage(`Work review summary unavailable: ${error.message}`, {alert: true});
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
