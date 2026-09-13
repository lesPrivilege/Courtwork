import {el} from './ui-controls.mjs';

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

function candidates(count) {
  return `${count} candidate${count === 1 ? '' : 's'}`;
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
  const heading = el('strong', {text: 'Work review'});
  const body = el('div', {className: 'surface-block'});
  const refresh = el('button', {className: 'text-button', text: 'Refresh work review', attrs: {type: 'button'}});
  const open = el('button', {className: 'text-button', text: 'Open work review', attrs: {type: 'button'}});
  const actions = el('div', {className: 'work-actions'}, refresh);
  const live = own => !destroyed && own === generation && isCurrent();
  open.addEventListener('click', () => {
    if (!destroyed && isCurrent() && actions.contains(open)) onOpenWork(open);
  });

  function renderMessage(text, {alert = false} = {}) {
    body.replaceChildren(el('p', {
      className: 'form-help', text,
      attrs: alert ? {role: 'alert'} : {role: 'status'},
    }));
  }

  function renderAvailable(summary) {
    const facts = [];
    facts.push(el('p', {
      className: 'form-help',
      text: summary.pendingCount === 0
        ? 'No candidates pending review.'
        : `${candidates(summary.pendingCount)} pending review.`,
    }));
    if (!summary.readOnly && summary.reviewableCount > 0 && summary.reviewableCount < summary.pendingCount)
      facts.push(el('p', {className: 'form-help', text: `${candidates(summary.reviewableCount)} ready to review.`}));
    if (summary.stalePendingCount > 0)
      facts.push(el('p', {className: 'form-help', text: `${candidates(summary.stalePendingCount)} based on an earlier work version.`}));
    if (summary.readOnly)
      facts.push(el('p', {className: 'form-help', text: 'Review actions are read-only right now.'}));
    if (summary.acceptedArtifactId)
      facts.push(el('p', {className: 'form-help', text: 'Accepted artifact available.'}));
    body.replaceChildren(...facts);
    actions.replaceChildren(open, refresh);
  }

  async function load() {
    if (destroyed || !isCurrent()) return;
    const own = ++generation;
    refresh.disabled = true;
    actions.replaceChildren(refresh);
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

  refresh.addEventListener('click', () => void load());
  root.append(heading, body, actions);
  void load();
  return {
    root,
    refresh: load,
    destroy() { destroyed = true; ++generation; },
  };
}
