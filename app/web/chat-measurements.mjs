import { el, action, anchorPopover } from './ui-controls.mjs';
import { requestMeasurements, requestDuration, renderRequestMeasurements } from './telemetry-view.mjs';
import { createRunActivity } from './run-activity.mjs';

export function projectContextReading(events = [], runId) {
  // No Run identity means no request observation, even if other session events exist.
  const latest = runId ? requestMeasurements(events, runId).at(-1) : null;
  return { latest, estimate: latest?.context?.estimatedTokens ?? null,
    characters: latest?.context?.characters ?? null, declaredWindow: latest?.contextWindow ?? null,
    capacity: projectContextCapacity(latest) };
}

export function projectContextCapacity(latest) {
  const value = latest?.contextCapacity;
  const valid = value?.version === 1 && value.scope === 'request-input' && value.source === 'provider-reported'
    && ['model-declared', 'default-registration'].includes(value.windowSource)
    && Number.isSafeInteger(value.contextWindow) && value.contextWindow > 0;
  if (!valid) return null;
  const known = latest.phase === 'completed' && Number.isSafeInteger(value.usedTokens) && value.usedTokens >= 0;
  return { ...value, usedTokens: known ? value.usedTokens : null,
    ratio: known ? value.usedTokens / value.contextWindow : null };
}
let nextRingId = 0;
export function contextRing(capacity = null) {
  const make = (tag, attrs) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    return node;
  };
  const svg = make('svg', { viewBox: '0 0 20 20', width: '14', height: '14',
    'aria-hidden': 'true', focusable: 'false', class: 'context-capacity-ring' });
  const known = Number.isFinite(capacity?.ratio) && capacity.ratio >= 0;
  svg.setAttribute('data-capacity', known ? 'known' : 'unknown');
  svg.append(make('circle', { cx: '10', cy: '10', r: '7', class: 'context-ring-track' }));
  if (known && capacity.ratio > 0) {
    const id = `context-ring-gradient-${++nextRingId}`;
    const defs = make('defs', {}), gradient = make('linearGradient', { id, x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
    gradient.append(make('stop', { offset: '0%', class: 'context-ring-start' }), make('stop', { offset: '100%', class: 'context-ring-end' }));
    defs.append(gradient); svg.append(defs);
    svg.append(make('circle', { cx: '10', cy: '10', r: '7', class: 'context-ring-value',
      stroke: `url(#${id})`, 'stroke-dasharray': `${Math.min(1, capacity.ratio) * 2 * Math.PI * 7} ${2 * Math.PI * 7}`,
      transform: 'rotate(-90 10 10)' }));
  }
  return svg;
}
const percentage = value => value > 0 && value < .001 ? '<0.1%' : new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 }).format(value);
function capacityLabel(capacity) {
  if (capacity?.ratio === null || !capacity) return 'Context details, capacity usage unknown';
  return `Context: ${capacity.usedTokens.toLocaleString()} of ${capacity.contextWindow.toLocaleString()} tokens, ${percentage(capacity.ratio)}${capacity.windowSource === 'default-registration' ? ', default window' : ''}, latest completed request input`;
}

export function renderCacheDiagnostic(cache) {
  if (cache?.status !== 'available' || cache.scope !== 'request' || !['provider', 'runtime', 'estimated'].includes(cache.source)) return null;
  const valid = value => Number.isSafeInteger(value) && value >= 0;
  const hit = valid(cache.hit_tokens) ? cache.hit_tokens : null;
  const miss = valid(cache.miss_tokens) ? cache.miss_tokens : null;
  const write = valid(cache.write_tokens) ? cache.write_tokens : null;
  if (hit === null && miss === null && write === null) return null;
  const comparable = hit !== null && miss !== null && valid(cache.total_tokens) && cache.total_tokens > 0
    && hit + miss === cache.total_tokens && cache.denominator === 'request-input'
    && Number.isFinite(cache.hit_rate) && Math.abs(cache.hit_rate - hit / cache.total_tokens) < 1e-9;
  const box = el('section', { className: 'context-cache-diagnostic', attrs: { 'aria-label': 'Runtime diagnostics · latest completed request' } });
  box.append(el('h4', { text: 'Runtime diagnostics' }), el('p', { className: 'form-help', text: 'Latest completed request' }));
  if (comparable) {
    const label = `Cache hit ${percentage(cache.hit_rate)} · Hit ${hit.toLocaleString()} · Miss ${miss.toLocaleString()} tokens`;
    const bar = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (const [key, value] of Object.entries({ class: 'context-cache-bar', viewBox: '0 0 100 6', preserveAspectRatio: 'none', role: 'img', 'aria-label': label })) bar.setAttribute(key, value);
    const fill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    for (const [key, value] of Object.entries({ class: 'context-cache-hit', width: cache.hit_rate * 100, height: 6, 'aria-hidden': 'true' })) fill.setAttribute(key, value);
    bar.append(fill);
    box.append(el('div', { className: 'context-cache-heading' }, el('span', { text: 'Cache hit' }), el('span', { text: percentage(cache.hit_rate) })), bar,
      el('div', { className: 'context-cache-counts' }, el('span', { text: `Hit ${hit.toLocaleString()}` }), el('span', { text: `Miss ${miss.toLocaleString()}` })));
  } else {
    const counts = el('dl', { className: 'data-list' });
    if (hit !== null) counts.append(el('dt', { text: 'Cache hit' }), el('dd', { text: `${hit.toLocaleString()} tokens` }));
    if (miss !== null) counts.append(el('dt', { text: 'Cache miss' }), el('dd', { text: `${miss.toLocaleString()} tokens` }));
    box.append(counts);
  }
  if (write !== null) box.append(el('p', { className: 'form-help', text: `Cache write · ${write.toLocaleString()} tokens` }));
  box.append(el('p', { className: 'form-help', text: cache.source === 'estimated' ? 'Estimated locally' : cache.source === 'runtime' ? 'Runtime reported' : 'Provider-reported counts' }));
  return box;
}

export function renderChatMeasurementBody(kind, { events = [], run } = {}) {
  const { latest, estimate, characters, declaredWindow, capacity } = projectContextReading(events, run?.id);
  const body = el('div', { className: 'chat-measurement-body' });
  const fields = el('dl', { className: 'data-list' });
  const add = (label, value) => fields.append(el('dt', { text: label }), el('dd', { text: value }));
  if (kind === 'context') {
    const known = capacity?.ratio !== null && capacity?.ratio !== undefined;
    body.append(el('p', { className: 'chat-measurement-reading', text: known
      ? `${capacity.usedTokens.toLocaleString()} / ${capacity.contextWindow.toLocaleString()} tokens · ${percentage(capacity.ratio)}` : 'Usage not reported' }));
    add('Request', latest ? String(latest.requestId) : 'Not recorded');
    add('Context window', capacity ? `${capacity.contextWindow.toLocaleString()} tokens`
      : declaredWindow ? `${declaredWindow.toLocaleString()} tokens` : '1,000,000 tokens · default');
    if (capacity) add('Window source', capacity.windowSource === 'default-registration' ? 'Default registration' : 'Model declaration');
    if (known) {
      add('Usage source', 'Provider-reported request input');
      body.append(fields, el('p', { className: 'form-help', text: 'Latest completed request input, including cached tokens once. Output and later edits are not included.' }));
      if (capacity.ratio > 1) body.append(el('p', { className: 'form-help', text: 'Reported input exceeds the registered window.' }));
    } else {
      if (estimate !== null) add('Request estimate', `~${estimate.toLocaleString()} tokens`);
      add('Serialized characters', characters === null ? 'Not recorded' : characters.toLocaleString());
      body.append(fields, el('p', { className: 'form-help', text: 'Request estimate: serialized UTF-16 characters ÷ 4. This is not remaining model capacity.' }));
    }
  } else {
    body.append(el('p', { className: 'chat-measurement-reading', text: '—' }),
      el('p', { className: 'form-help', text: 'Decode TPS is not measured. No token timing was reported.' }));
    add('Host first output', requestDuration(latest?.firstOutputMs));
    add('Host elapsed', requestDuration(latest?.elapsedMs));
    body.append(fields);
  }
  if (kind === 'context' && latest?.phase === 'completed') {
    const cache = renderCacheDiagnostic(latest.cache);
    if (cache) body.append(cache);
  }
  if (run?.id) body.append(renderRequestMeasurements(events, run.id, { compact: true }));
  body.append(el('p', { className: 'form-help chat-measurement-snapshot', text: 'Latest retained request when opened. Refresh to update.' }));
  return body;
}

export function createChatMeasurements({ host = document.body, onOpenRun } = {}) {
  let snapshot = {}, anchor = null, kind = 'context', cleanup = null, identity = '';
  const popover = el('section', { className: 'chat-measurement-popover', attrs: { popover: 'auto', role: 'dialog', 'aria-label': 'Request context' } });
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
    'aria-label': 'Context details, capacity usage unknown', 'data-tooltip': 'Context details', 'aria-haspopup': 'dialog', 'aria-expanded': 'false' } }, contextRing());
  context.addEventListener('click', event => open('context', context, event.detail === 0));
  const activity = createRunActivity({ onInspect: (target, event) => open('throughput', target, event.detail === 0) });
  function update(facts) {
    const nextIdentity = JSON.stringify([facts.session?.id, facts.run?.id]);
    if (nextIdentity !== identity || !facts.visible) close();
    identity = nextIdentity; snapshot = facts;
    const { capacity } = projectContextReading(facts.events, facts.run?.id);
    context.replaceChildren(contextRing(capacity));
    context.setAttribute('aria-label', capacityLabel(capacity));
    context.setAttribute('data-tooltip', capacity?.ratio === null || !capacity ? 'Context · usage unknown'
      : `Context · ${percentage(capacity.ratio)}${capacity.windowSource === 'default-registration' ? ' · default window' : ''}`);
    context.hidden = !facts.visible || !facts.session;
    activity.update(facts);
  }
  function destroy() { close(); activity.destroy(); popover.remove(); }
  return { context, activity: activity.root, update, destroy };
}
