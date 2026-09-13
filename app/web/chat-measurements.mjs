import { el, action, anchorPopover } from './ui-controls.mjs';
import { requestMeasurements, requestDuration, renderRequestMeasurements } from './telemetry-view.mjs';
import { createRunActivity } from './run-activity.mjs';

export function projectContextReading(events = [], runId) {
  // No Run identity means no request observation, even if other session events exist.
  const latest = runId ? requestMeasurements(events, runId).at(-1) : null;
  return { latest, estimate: latest?.context?.estimatedTokens ?? null,
    characters: latest?.context?.characters ?? null, declaredWindow: latest?.contextWindow ?? null };
}

export function contextRing() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [name, value] of Object.entries({ viewBox: '0 0 20 20', width: '18', height: '18',
    'aria-hidden': 'true', focusable: 'false', class: 'context-capacity-ring' })) svg.setAttribute(name, value);
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  for (const [name, value] of Object.entries({ cx: '10', cy: '10', r: '7' })) circle.setAttribute(name, value);
  svg.append(circle);
  return svg;
}

export function renderChatMeasurementBody(kind, { events = [], run } = {}) {
  const { latest, estimate, characters, declaredWindow } = projectContextReading(events, run?.id);
  const body = el('div', { className: 'chat-measurement-body' });
  const fields = el('dl', { className: 'data-list' });
  const add = (label, value) => fields.append(el('dt', { text: label }), el('dd', { text: value }));
  if (kind === 'context') {
    body.append(el('p', { className: 'chat-measurement-reading', text: estimate === null ? 'Not recorded' : `~${estimate.toLocaleString()} tokens` }));
    add('Request', latest ? String(latest.requestId) : 'Not recorded');
    add('Serialized characters', characters === null ? 'Not recorded' : characters.toLocaleString());
    add('Declared context window', declaredWindow === null ? 'Not reported' : `${declaredWindow.toLocaleString()} tokens`);
    body.append(fields, el('p', { className: 'form-help', text: 'Request estimate: serialized UTF-16 characters ÷ 4. This is not remaining model capacity.' }));
  } else {
    body.append(el('p', { className: 'chat-measurement-reading', text: '—' }),
      el('p', { className: 'form-help', text: 'Decode TPS is not measured. No token timing was reported.' }));
    add('Host first output', requestDuration(latest?.firstOutputMs));
    add('Host elapsed', requestDuration(latest?.elapsedMs));
    body.append(fields);
  }
  if (run?.id) body.append(renderRequestMeasurements(events, run.id, { compact: true }));
  body.append(el('p', { className: 'form-help chat-measurement-snapshot', text: 'Latest retained request when opened. Refresh to update.' }));
  return body;
}

export function createChatMeasurements({ host = document.body, onOpenRun } = {}) {
  let snapshot = {}, anchor = null, kind = 'context', cleanup = null, identity = '';
  const popover = el('section', { className: 'chat-measurement-popover', attrs: { popover: 'auto', 'aria-label': 'Request context' } });
  function close({ restore = false } = {}) {
    if (popover.matches(':popover-open')) popover.hidePopover();
    cleanup?.(); cleanup = null;
    anchor?.setAttribute('aria-expanded', 'false');
    if (restore && anchor?.isConnected) anchor.focus();
  }
  const heading = el('h3');
  const content = el('div');
  const refresh = action('refresh-cw', 'Refresh measurements', () => renderBody());
  const dismiss = action('x', 'Close measurements', () => close({ restore: true }));
  popover.append(el('header', { className: 'chat-measurement-heading' }, heading,
    el('div', { className: 'chat-measurement-actions' }, refresh, dismiss)), content);
  host.append(popover);
  function renderBody() {
    content.replaceChildren(renderChatMeasurementBody(kind, snapshot));
    if (snapshot.run?.id && onOpenRun) {
      const id = snapshot.run.id;
      const inspect = el('button', {className:'text-button', text:'Inspect run', attrs:{type:'button'}});
      inspect.addEventListener('click', () => { close(); onOpenRun(id); });
      content.append(inspect);
    }
  }
  function open(type, target, instant = false) {
    if (popover.matches(':popover-open') && anchor === target) { close({ restore: true }); return; }
    close(); anchor = target; kind = type;
    popover.classList.toggle('is-keyboard', instant);
    heading.textContent = kind === 'context' ? 'Request context' : 'Measurements';
    popover.setAttribute('aria-label', heading.textContent);
    renderBody(); popover.showPopover();
    target.setAttribute('aria-expanded', 'true');
    cleanup = anchorPopover(target, popover, { placement: 'top-start' });
    dismiss.focus();
  }
  popover.addEventListener('toggle', event => {
    if (event.newState === 'closed') { cleanup?.(); cleanup = null; anchor?.setAttribute('aria-expanded', 'false'); }
  });
  popover.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !event.isComposing) { event.preventDefault(); event.stopPropagation(); popover.classList.add('is-keyboard'); close({ restore: true }); }
  });
  const context = el('button', { className: 'context-capacity-button', attrs: { type: 'button',
    'aria-label': 'Context details, capacity usage unknown', 'data-tooltip': 'Context details', 'aria-haspopup': 'true', 'aria-expanded': 'false' } }, contextRing());
  context.addEventListener('click', event => open('context', context, event.detail === 0));
  const activity = createRunActivity({ onInspect: (target, event) => open('throughput', target, event.detail === 0) });
  function update(facts) {
    const nextIdentity = JSON.stringify([facts.session?.id, facts.run?.id]);
    if (nextIdentity !== identity || !facts.visible) close();
    identity = nextIdentity; snapshot = facts;
    context.hidden = !facts.visible || !facts.session;
    activity.update(facts);
  }
  function destroy() { close(); activity.destroy(); popover.remove(); }
  return { context, activity: activity.root, update, destroy };
}
