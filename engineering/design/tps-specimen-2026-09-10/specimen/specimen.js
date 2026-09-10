/* WO-TPS-01 · specimen renderer + player. Every number shown comes from synthetic.js.
 * Rendering is a pure function of (scenario, owner time t): a card only re-renders when
 * a sample with tMs <= t has newly arrived, so nothing moves between samples. The player
 * schedules exactly one timeout, for the next sample, and never runs an animation loop.
 */
(function () {
  'use strict';
  const S = globalThis.TPSSynthetic;
  const PITCH = 4, BAR = 3, HEIGHT = 12;
  const runs = Object.fromEntries(Object.keys(S.SCENARIOS).map(name => [name, S.generate(name)]));
  const fmtRate = v => (v === null || v === undefined) ? '—' : `${Math.round(v)} tok/s`;
  const fmtRate1 = v => v.toFixed(1);
  const fmtSec = ms => `${(ms / 1000).toFixed(2)} s`;
  const el = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === 'text') n.textContent = v;
      else if (k === 'className') n.className = v;
      else n.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) n.append(kid);
    return n;
  };
  const svgEl = (tag, attrs = {}) => {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };

  /* ── pure state derivations ─────────────────────────────────────────────── */
  function perRequestState(run, t) {
    const done = run.requests.filter(r => r.terminal.tMs <= t);
    const inFlight = run.requests.find(r => r.dispatchMs <= t && r.terminal.tMs > t) || null;
    const marks = done.map(r => ({ id: r.requestId, phase: r.phase, value: S.rateOf(r.terminal) }));
    const values = marks.filter(m => m.value !== null).map(m => m.value);
    const last = done.at(-1) || null;
    const ended = t >= run.endMs;
    let phase, current = null;
    if (inFlight) phase = 'streaming';
    else if (!last) phase = 'waiting';
    else if (ended) phase = last.phase === 'completed' ? 'idle' : last.phase;
    else phase = last.phase; // completed (frozen until the next request) / failed / cancelled
    if (!inFlight && last) current = last;
    return { mode: 'request', run, t, marks, values, inFlight, current, last, phase, ended,
      outputTokens: done.reduce((a, r) => a + r.terminal.outputTokens, 0) };
  }

  function intervalState(run, t) {
    const req = [...run.requests].reverse().find(r => r.dispatchMs <= t) || null;
    if (!req) return { mode: 'interval', run, t, marks: [], values: [], req: null, phase: 'waiting' };
    const got = req.interval.filter(s => s.tMs <= t);
    const marks = [];
    for (let i = 1; i < got.length; i++) {
      const dt = got[i].tMs - got[i - 1].tMs;
      marks.push({ id: got[i].seq, phase: 'completed', value: dt > 0 ? (got[i].outputTokensCumulative - got[i - 1].outputTokensCumulative) / (dt / 1000) : 0 });
    }
    const open = req.terminal.tMs > t;
    const soFar = got.length >= 2 ? (got.at(-1).outputTokensCumulative - got[0].outputTokensCumulative) / ((got.at(-1).tMs - got[0].tMs) / 1000) : null;
    return { mode: 'interval', run, t, marks, values: marks.map(m => m.value), req, samples: got, soFar,
      phase: open ? 'streaming' : (t >= run.endMs ? 'idle' : req.phase) };
  }

  /* ── sparkline: zero baseline, fixed 4px pitch, newest on the right ───────── */
  function spark(marks, width, { latest = false, label, prevCount = null } = {}) {
    const slots = Math.floor(width / PITCH);
    const shown = marks.slice(-slots);
    const svg = svgEl('svg', { class: 'spark', width, height: HEIGHT, viewBox: `0 0 ${width} ${HEIGHT}`, role: 'img', 'aria-label': label, 'data-collapsible': '' });
    const title = svgEl('title'); title.textContent = label; svg.append(title);
    const top = Math.max(1, ...shown.filter(m => m.value !== null).map(m => m.value));
    const offset = width - shown.length * PITCH; // right-aligned
    const firstFresh = prevCount === null ? Infinity : prevCount - (marks.length - shown.length);
    shown.forEach((m, i) => {
      const x = offset + i * PITCH;
      if (m.value === null) { // failed / cancelled: a floating dash, never a zero-height bar
        svg.append(svgEl('rect', { class: 'slot-void' + (i >= firstFresh ? ' bar fresh' : ''), x, y: HEIGHT / 2 - 0.5, width: BAR, height: 1 }));
        return;
      }
      const h = m.value > 0 ? Math.max(1, Math.round((m.value / top) * HEIGHT)) : 0;
      const cls = ['bar'];
      if (latest && i === shown.length - 1) cls.push('latest');
      if (i >= firstFresh) cls.push('fresh');
      svg.append(svgEl('rect', { class: cls.join(' '), x, y: HEIGHT - h, width: BAR, height: h, 'data-value': m.value.toFixed(2) }));
    });
    if (prevCount === 0 && marks.length > 0) svg.classList.add('entering');
    return svg;
  }

  function stats(values) {
    if (!values.length) return '—';
    return `${fmtRate1(Math.min(...values))} · ${fmtRate1(S.median(values))} · ${fmtRate1(Math.max(...values))} tok/s`;
  }
  function sparkLabel(state, what) {
    const v = state.values;
    const base = v.length ? `${what}, ${state.marks.length} ${state.mode === 'request' ? 'requests' : 'intervals'}; min ${Math.round(Math.min(...v))}, median ${Math.round(S.median(v))}, max ${Math.round(Math.max(...v))} tokens per second` : `${what}, no values yet`;
    const voids = state.marks.filter(m => m.value === null).length;
    return `${base}${voids ? `; ${voids} request${voids > 1 ? 's' : ''} without a rate` : ''}. Synthetic data.`;
  }

  /* ── disclosure: interval, count, definitions, clock, min/median/max ─────── */
  function method(state, { width = 40 } = {}) {
    const rows = [];
    const add = (k, v) => rows.push(el('dt', { text: k }), el('dd', { text: v }));
    if (state.mode === 'request') {
      const voids = state.marks.filter(m => m.value === null);
      add('Sample', 'One per completed request in this Run');
      add('Samples', `${state.values.length} with a rate${voids.length ? ` · ${voids.length} ${voids.map(v => v.phase).join(', ')} (no rate)` : ''}${state.inFlight ? ' · 1 in flight' : ''}`);
      add('Shown', `Last ${Math.floor(width / PITCH)} at most (${PITCH}px each)`);
      add('Numerator', 'Output tokens after the first token sample');
      add('Denominator', 'Owner-clock time, first to last token sample; time to first token excluded');
    } else {
      add('Sample', `Owner sample every ${state.run.intervalMs} ms of request ${state.req ? state.req.requestId : '—'}`);
      add('Samples', `${state.samples ? state.samples.length : 0} (${state.marks.length} intervals)`);
      add('Shown', `Last ${Math.floor(width / PITCH)} intervals at most`);
      add('Numerator', 'Token delta between consecutive samples');
      add('Denominator', `Owner-clock interval (${state.run.intervalMs} ms; the closing one is shorter)`);
    }
    add('Clock', 'Owner monotonic clock (hypothetical — no owner reports one today)');
    add('Min · median · max', stats(state.values));
    add('Scale', 'Bars start at zero; top = largest shown value');
    add('Source', `synthetic.js · scenario ${state.run.name} · seed ${state.run.seed}`);
    const list = state.marks.map(m => `${state.mode === 'request' ? '#' + m.id : m.id} ${m.value === null ? m.phase : fmtRate1(m.value)}`).join(', ');
    return el('details', { className: 'method' },
      el('summary', { text: 'Samples and method' }),
      el('dl', { className: 'data-list' }, rows),
      el('p', { className: 'values', text: `Values, oldest → newest (tok/s, synthetic): ${list || 'none yet'}` }));
  }

  /* ── the locus row (Decode TPS) ─────────────────────────────────────────── */
  function locusRow(state, { width = 40, form = 'spark', prevCount = null, label = 'Decode TPS' } = {}) {
    let number, note = null, latest = false, sparkWhat = 'Decode TPS per completed request';
    if (state.mode === 'request') {
      if (state.phase === 'idle') { number = fmtRate(S.median(state.values)); sparkWhat = 'Decode TPS per request in the ended run'; }
      else if (state.inFlight) { number = '—'; note = 'in flight'; }
      else if (state.current && state.current.phase !== 'completed') { number = '—'; note = state.current.phase; }
      else if (state.current) { number = fmtRate(S.rateOf(state.current.terminal)); latest = true; }
      else { number = '—'; note = 'no request yet'; }
    } else {
      sparkWhat = `Decode TPS per ${state.run.intervalMs} ms interval`;
      number = state.soFar === null ? '—' : fmtRate(state.soFar);
      if (state.soFar === null) note = state.req ? 'awaiting samples' : 'no request yet';
      latest = state.marks.length > 0;
    }
    const kids = [];
    if (form === 'spark' && state.marks.length) kids.push(spark(state.marks, width, { latest, label: sparkLabel(state, sparkWhat), prevCount }));
    kids.push(el('span', { className: 'num', text: number }));
    // PV-81: a dash is the whole statement and the source slot carries the state word;
    // a number carries its source word, which on this page is always "synthetic".
    const prov = note || 'synthetic';
    return [el('dt', { text: label }), el('dd', {}, el('span', { className: 'locus' }, kids), el('span', { className: 'prov', text: prov }))];
  }

  function headline(state) {
    if (state.mode === 'request') {
      if (state.phase === 'idle') return `Run ended · ${state.run.requests.length} requests`;
      const r = state.inFlight || state.current;
      return r ? `Request ${r.requestId} · agent · ${state.inFlight ? 'streaming' : r.phase}` : 'Run started · waiting for first request';
    }
    return state.req ? `Request ${state.req.requestId} · agent · ${state.phase === 'streaming' ? 'streaming' : state.req.phase}` : 'Run started';
  }

  function candidateCard(state, opts = {}) {
    // Idle states a statistic of the ended run, not a current reading; the label says so.
    const idle = state.mode === 'request' && state.phase === 'idle';
    const rows = [...locusRow(state, idle ? { ...opts, label: 'Decode TPS · median' } : opts)];
    if (idle)
      rows.push(el('dt', { text: 'Output tokens' }), el('dd', {}, el('span', { className: 'num', text: state.outputTokens.toLocaleString('en-US') }), el('span', { className: 'prov', text: 'synthetic' })));
    const help = opts.help ?? helpFor(state);
    return el('section', { className: 'popover-frame' },
      el('div', { className: 'section-heading' }, el('h3', { text: 'Connection' }), el('span', { className: 'stamp', text: 'Synthetic data' })),
      el('section', { className: 'request-measurements' },
        el('h4', { text: headline(state) }),
        el('dl', { className: 'data-list' }, rows),
        help ? el('p', { className: 'form-help', text: help }) : null,
        method(state, opts)));
  }

  function helpFor(state) {
    if (state.mode !== 'request') return 'Updates only when an owner sample arrives.';
    switch (state.phase) {
      case 'streaming': return 'No rate for a request until it completes. Bars are earlier requests.';
      case 'completed': return 'Frozen: this request’s rate will not change.';
      case 'idle': return 'Nothing is running. Shown: median of the ended run; no current rate.';
      case 'failed': return 'Request ended failed: no decode rate is reported for it.';
      case 'cancelled': return 'Request was cancelled: no decode rate is reported for it.';
      default: return null;
    }
  }

  /* ── static cards ───────────────────────────────────────────────────────── */
  const live = runs.live;
  const req5 = live.requests[4];
  const at = {
    streaming: Math.round((req5.firstTokenMs + req5.terminal.tMs) / 2),
    completed: req5.terminal.tMs + 200,
    idle: live.endMs + 1,
  };

  // Re-mount only when the rendered card actually differs; keep the disclosure's open
  // state and keyboard focus across a sample arrival.
  function mount(id, node) {
    const host = document.getElementById(id); if (!host) return false;
    const sig = node.outerHTML.replace(/ (?:fresh|entering)\b/g, ''); // motion classes are not content
    if (host.dataset.sig === sig) return false;
    const wasOpen = host.querySelector('details')?.open;
    const hadFocus = host.contains(document.activeElement) && document.activeElement.tagName === 'SUMMARY';
    host.replaceChildren(node);
    host.dataset.sig = sig;
    // Motion classes are one-shot: drop them when the animation ends (or never starts,
    // e.g. reduced motion sets animation:none and no animationend fires).
    for (const n of host.querySelectorAll('.fresh, .entering')) {
      const done = () => n.classList.remove('fresh', 'entering');
      if (getComputedStyle(n).animationName === 'none') done(); else n.addEventListener('animationend', done, { once: true });
    }
    const d = host.querySelector('details');
    if (d && wasOpen) d.open = true;
    if (d && hadFocus) d.querySelector('summary').focus();
    return true;
  }

  function renderStatic() {
    mount('state-streaming', candidateCard(perRequestState(live, at.streaming)));
    mount('state-completed', candidateCard(perRequestState(live, at.completed)));
    mount('state-idle', candidateCard(perRequestState(live, at.idle)));
    mount('state-failed', candidateCard(perRequestState(runs.failed, runs.failed.endMs)));
    mount('state-cancelled', candidateCard(perRequestState(runs.cancelled, runs.cancelled.endMs)));
    const long = perRequestState(runs.long, runs.long.requests[15].dispatchMs - 1); // request 15 just completed, frozen: 15 bars
    for (const w of [40, 48, 60]) mount(`width-${w}`, candidateCard(long, { width: w, help: `${w}px = last ${w / PITCH} requests.` }));
    mount('form-spark', candidateCard(long, { width: 40, help: 'Sparkline + number; stats in the disclosure.' }));
    mount('form-number', candidateCard(long, { width: 40, form: 'number', help: 'Number only; the series lives in the disclosure as text.' }));
    const collapsed = candidateCard(long, { width: 40, help: 'Same markup as the sparkline form; ≤767px removes the bars.' });
    collapsed.classList.add('force-collapse');
    mount('form-collapsed', collapsed);
    // Today vs candidate: the candidate row sits beside the PV-79 row, it does not replace it.
    const r = live.requests[4];
    const observed = r.terminal.outputTokens / ((r.terminal.tMs - r.firstTokenMs) / 1000);
    const pvRow = [el('dt', { text: 'Observed stream rate' }), el('dd', {}, el('span', { className: 'num', text: fmtRate(observed) }), el('span', { className: 'prov', text: 'host clock · synthetic' }))];
    const cand = candidateCard(perRequestState(live, at.completed), { help: 'Observed stream rate (host clock, PV-82) and Decode TPS (owner clock) are different facts and stay separate rows.' });
    cand.querySelector('.data-list').prepend(...pvRow);
    mount('today-candidate', cand);
    const pvCard = document.querySelector('#today-pv79 .num');
    if (pvCard) pvCard.textContent = fmtRate(observed);
  }

  /* ── live player: per-request vs interval, same synthetic stream ─────────── */
  const eventTimes = [...new Set(live.requests.flatMap(r => [r.dispatchMs, r.terminal.tMs, ...r.interval.map(s => s.tMs)]).concat([live.endMs + 1]))].sort((a, b) => a - b);
  const player = { t: -1, idx: 0, timer: null, startedAt: 0, base: 0, playing: false, prev: { request: 0, interval: 0, intervalReq: null }, renders: { request: 0, interval: 0 } };

  function renderLive(animate = true) {
    const rs = perRequestState(live, player.t), is = intervalState(live, player.t);
    const reqPrev = animate ? player.prev.request : null;
    const intPrev = !animate ? null : (is.req && is.req.requestId === player.prev.intervalReq ? player.prev.interval : 0);
    if (mount('live-request', candidateCard(rs, { prevCount: reqPrev }))) player.renders.request++;
    if (mount('live-interval', candidateCard(is, { prevCount: intPrev }))) player.renders.interval++;
    player.prev = { request: rs.marks.length, interval: is.marks.length, intervalReq: is.req ? is.req.requestId : null };
    const clock = document.getElementById('live-clock');
    if (clock) clock.textContent = `Owner clock ${fmtSec(Math.max(0, player.t))} of ${fmtSec(live.endMs)} · ${player.idx}/${eventTimes.length} samples delivered${player.t >= live.endMs ? ' · run ended (frozen)' : ''}`;
  }
  function deliverThrough(t, animate = true) {
    player.t = t;
    while (player.idx < eventTimes.length && eventTimes[player.idx] <= t) player.idx++;
    renderLive(animate);
  }
  function schedule() {
    clearTimeout(player.timer);
    if (!player.playing || player.idx >= eventTimes.length) { player.playing = false; syncPlayButtons(); return; }
    const next = eventTimes[player.idx];
    const wait = Math.max(0, next - (performance.now() - player.startedAt + player.base));
    player.timer = setTimeout(() => { deliverThrough(next); schedule(); }, wait);
  }
  function play() { if (player.idx >= eventTimes.length) return replay(); player.playing = true; player.base = Math.max(0, player.t); player.startedAt = performance.now(); schedule(); syncPlayButtons(); }
  function pause() { player.playing = false; clearTimeout(player.timer); syncPlayButtons(); }
  function replay() { pause(); player.idx = 0; player.prev = { request: 0, interval: 0, intervalReq: null }; deliverThrough(0); play(); }
  function step() { pause(); if (player.idx < eventTimes.length) deliverThrough(eventTimes[player.idx]); }
  function setTime(t) { pause(); player.idx = 0; deliverThrough(t, false); } // jump without motion
  function syncPlayButtons() { const b = document.getElementById('btn-play'); if (b) b.textContent = player.playing ? 'Pause' : (player.idx >= eventTimes.length ? 'Replay' : 'Play'); }

  /* ── page controls: theme and motion use the product's own attributes ─────── */
  function bindToggle(groupId, attr) {
    const group = document.getElementById(groupId);
    group.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.dataset.value;
      if (v === 'system') document.documentElement.removeAttribute(attr); else document.documentElement.setAttribute(attr, v);
      for (const x of group.querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderStatic();
    bindToggle('ctl-theme', 'data-theme');
    bindToggle('ctl-motion', 'data-motion');
    document.getElementById('btn-play').addEventListener('click', () => player.playing ? pause() : play());
    document.getElementById('btn-step').addEventListener('click', step);
    document.getElementById('btn-replay').addEventListener('click', replay);
    const params = new URLSearchParams(location.search);
    deliverThrough(0);
    if (params.get('autoplay') !== '0') play();
  });

  globalThis.__specimen = { runs, at, eventTimes, player, play, pause, replay, step, setTime, perRequestState, intervalState };
})();
