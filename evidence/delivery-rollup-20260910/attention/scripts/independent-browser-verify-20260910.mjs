import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { cdp, close, evaluate, key, observations, ORIGIN, sleep, waitFor } from './browser.mjs';

const OUT = new URL('../', import.meta.url).pathname.replace(/\/$/, '');
const SHOTS = `${OUT}/screenshots`;
await mkdir(SHOTS, { recursive: true });
const result = {
  candidate: '1097fd453a6da0d0302cb64a881b48c583dc06d1',
  origin: ORIGIN,
  viewport: {},
  views: {},
  rows: {},
  keyboard: {},
  actions: {},
  recovery: {},
  concurrency: {},
  narrow: {},
  network: {},
  checks: [],
  overall: 'RUNNING',
};
let failure = null;

function check(ok, name, details = undefined) {
  if (!ok) {
    const extra = details === undefined ? '' : `: ${JSON.stringify(details)}`;
    throw new Error(`${name}${extra}`);
  }
  result.checks.push({ name, status: 'PASS', ...(details === undefined ? {} : { details }) });
}
function equal(actual, expected, name) {
  try { assert.deepEqual(actual, expected); }
  catch (error) { throw new Error(`${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
  result.checks.push({ name, status: 'PASS', details: actual });
}
function includes(array, value, name) {
  check(Array.isArray(array) && array.includes(value), name, { value, array });
}

const boot = await (await fetch(`${ORIGIN}/api/v5/bootstrap`)).json();
const token = boot.sessionToken;
async function api(path, init = {}) {
  const response = await fetch(`${ORIGIN}/api/v5${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-work-token': token, ...(init.headers || {}) },
  });
  const raw = await response.text();
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
  return { status: response.status, body };
}
async function apiOk(path, init = {}) {
  const response = await api(path, init);
  check(response.status === 200, `HTTP 200 ${path}`, response.body);
  return response.body;
}
const projects = await apiOk('/projects');
const projectId = projects.projects[0].id;
result.projectId = projectId;

async function shot(name) {
  const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${SHOTS}/${name}.png`, Buffer.from(data, 'base64'));
}
async function viewport(width, height = width < 700 ? 780 : 900) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
  result.viewport.last = { width, height };
}
async function theme(scheme) {
  await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });
  result.viewport.theme = scheme;
}
async function click(selector) {
  await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node) throw new Error('missing ${selector}'); node.click(); return true; })()`);
}
async function text(selector) {
  return evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`);
}
async function value(selector) {
  return evaluate(`document.querySelector(${JSON.stringify(selector)})?.value ?? null`);
}
async function focusKey() {
  return evaluate('document.activeElement?.dataset?.attentionFocus ?? null');
}
const CODES = { Escape: 27, Enter: 13, KeyJ: 74, KeyK: 75, ArrowUp: 38, ArrowDown: 40 };
async function press(code) {
  await key({ code, keyCode: CODES[code] ?? 0, text: code.startsWith('Key') ? code.slice(3).toLowerCase() : '' });
}
async function enter() {
  const base = { code: 'Enter', key: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
  await cdp('Input.dispatchKeyEvent', { ...base, type: 'keyDown', text: '\r', unmodifiedText: '\r' });
  await cdp('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
}
async function openWorkspace(width = 1440, scheme = 'light') {
  await viewport(width);
  await theme(scheme);
  await cdp('Page.navigate', { url: ORIGIN });
  await waitFor('Boolean(document.getElementById("attention-button"))');
  await sleep(700);
  await click('#attention-button');
  await waitFor(`[...document.querySelectorAll('button')].some(b => b.textContent === 'Attention items')`);
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Attention items').click(), true`);
  await waitFor('document.querySelectorAll(".attention-registry-row").length >= 1');
  await sleep(250);
}
async function openRow(id) {
  await waitFor(`Boolean(document.querySelector('[data-attention-focus="item-${id}"]'))`);
  await click(`[data-attention-focus="item-${id}"]`);
  await waitFor('Boolean(document.querySelector(".attention-detail-head"))');
  await waitFor('Boolean(document.querySelector(".attention-actions"))');
  await sleep(150);
}
async function fill(keyName, value) {
  await evaluate(`(() => { const node = document.querySelector('[data-attention-focus=${JSON.stringify(keyName)}]'); if (!node) throw new Error('missing field ${keyName}'); node.value = ${JSON.stringify(value)}; node.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
}
async function change(keyName, value) {
  await evaluate(`(() => { const node = document.querySelector('[data-attention-focus=${JSON.stringify(keyName)}]'); if (!node) throw new Error('missing field ${keyName}'); node.value = ${JSON.stringify(value)}; node.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
}
async function installTrace(mode = 'normal') {
  await evaluate(`(() => {
    const real = window.fetch;
    window.__attTrace = [];
    window.__attMode = ${JSON.stringify(mode)};
    window.__attLost = false;
    window.fetch = (input, init) => {
      const url = String(input);
      let body = init?.body ?? null;
      try { body = body && JSON.parse(body); } catch {}
      if (url.includes('/api/v5')) window.__attTrace.push({ url, method: init?.method ?? 'GET', body });
      if (window.__attLostTarget && url.includes('/attention/' + window.__attLostTarget + '/actions') && window.__attMode === 'drop-first' && !window.__attLost) {
        window.__attLost = true;
        return Promise.reject(new TypeError('simulated transport drop before request'));
      }
      const response = real(input, init);
      if (window.__attLostTarget && url.includes('/attention/' + window.__attLostTarget + '/actions') && window.__attMode === 'lose-after' && !window.__attLost) {
        window.__attLost = true;
        return response.then(() => Promise.reject(new TypeError('simulated response loss')));
      }
      return response;
    };
    return true;
  })()`);
}
async function setTraceTarget(id, mode = 'normal') {
  await evaluate(`window.__attLostTarget = ${JSON.stringify(id)}; window.__attMode = ${JSON.stringify(mode)}; window.__attLost = false; true`);
}
async function trace() {
  return evaluate('window.__attTrace ?? []');
}
async function detail(id) {
  return apiOk(`/attention/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`);
}
async function action(id, request) {
  return api(`/attention/${encodeURIComponent(id)}/actions`, { method: 'POST', body: JSON.stringify({ projectId, request }) });
}
async function events(id) {
  return (await apiOk('/attention/query', { method: 'POST', body: JSON.stringify({ projectId, query: { schema_version: 1, kind: 'events', attention_id: id } }) })).events;
}

try {
  await cdp('Network.enable');
  await cdp('Runtime.enable');

  // Initial registry and six explicit views, before any mutations.
  await openWorkspace(1440, 'light');
  result.views.labels = await evaluate(`[...document.querySelectorAll('.attention-view-choice')].map(n => n.textContent)`);
  result.views.pressed = await evaluate(`[...document.querySelectorAll('.attention-view-choice')].filter(n => n.getAttribute('aria-pressed') === 'true').map(n => n.textContent)`);
  result.views.group = await evaluate('document.querySelector(".attention-views")?.getAttribute("aria-label") ?? null');
  equal(result.views.labels, ['All', 'Investigating', 'Needs you', 'Waiting', 'Later', 'Resolved'], 'six explicit state view labels');
  equal(result.views.pressed, ['All'], 'All is default view');
  equal(result.views.group, 'Attention views', 'state view group label');

  const registry = await apiOk('/attention/query', { method: 'POST', body: JSON.stringify({ projectId, query: { schema_version: 1, kind: 'registry' } }) });
  result.rows.serverOrder = registry.items.map(item => item.descriptor.title);
  result.rows.anatomy = await evaluate(`[...document.querySelectorAll('.attention-registry-row')].map(row => ({
    id: row.dataset.attentionFocus,
    title: row.querySelector('.attention-row-title')?.textContent ?? null,
    status: row.querySelector('.home-attention-state')?.textContent ?? null,
    time: row.querySelector('.attention-row-time')?.textContent ?? null,
    datetime: row.querySelector('.attention-row-time')?.getAttribute('datetime') ?? null,
    rowText: row.textContent,
  }))`);
  result.rows.rendered = result.rows.anatomy.map(row => row.title);
  equal(result.rows.rendered, result.rows.serverOrder, 'All preserves server registry order');
  check(result.rows.anatomy.every(row => row.title && row.status && row.time && row.datetime), 'rows expose title status and updated_at time');
  check(result.rows.anatomy.every(row => !/Why this needs attention|Next step|source/i.test(row.rowText)), 'registry rows remain minimal');
  await shot('all-1440-light');
  await theme('dark'); await sleep(180); await shot('all-1440-dark'); await theme('light');

  const expectedByView = {
    investigating: ['indexing'], needs_you: ['renewal'], waiting: ['counsel'], later: ['filing'], resolved: ['served'],
  };
  for (const [view, expected] of Object.entries(expectedByView)) {
    await click(`[data-attention-focus="view-${view}"]`);
    await waitFor(`document.querySelectorAll('.attention-registry-row').length === ${expected.length}`);
    const ids = await evaluate(`[...document.querySelectorAll('.attention-registry-row')].map(row => row.dataset.attentionFocus.replace(/^item-/, ''))`);
    equal(ids, expected, `explicit ${view} view queries server state`);
  }
  await click('[data-attention-focus="view-all"]');
  await waitFor('document.querySelectorAll(".attention-registry-row").length >= 5');

  // Keyboard navigation and focus return use real CDP key events.
  await evaluate('document.querySelectorAll(".attention-registry-row")[0].focus(), true');
  result.keyboard.start = await focusKey();
  await press('KeyJ'); result.keyboard.afterJ = await focusKey();
  await press('KeyJ'); result.keyboard.afterSecondJ = await focusKey();
  await press('KeyK'); result.keyboard.afterK = await focusKey();
  await press('ArrowUp'); result.keyboard.afterArrowUp = await focusKey();
  await press('ArrowUp'); result.keyboard.clampedAtTop = await focusKey();
  equal(result.keyboard.start, 'item-counsel', 'keyboard starts on first server row');
  equal(result.keyboard.afterJ, 'item-counsel', 'J clamps at first row');
  equal(result.keyboard.afterSecondJ, 'item-filing', 'J advances to next row');
  equal(result.keyboard.afterK, 'item-counsel', 'K moves back');
  equal(result.keyboard.afterArrowUp, 'item-counsel', 'ArrowUp moves back');
  equal(result.keyboard.clampedAtTop, 'item-counsel', 'K/ArrowUp clamp at top');
  await enter();
  await waitFor('Boolean(document.querySelector(".attention-detail-head"))');
  result.keyboard.openedTitle = await text('.attention-detail-head h2');
  equal(result.keyboard.openedTitle, 'Counsel review of the draft', 'Enter opens focused item');
  await press('Escape');
  await waitFor('!document.querySelector(".attention-detail-head")');
  result.keyboard.returnedFocus = await focusKey();
  equal(result.keyboard.returnedFocus, 'item-counsel', 'Escape returns focus to originating row');

  // Typed advertisements: rendered controls must equal recognized advertised actions.
  const detailIds = { investigating: 'indexing', needs_you: 'renewal', waiting: 'counsel', later: 'filing', resolved: 'served' };
  const supported = new Set(['acknowledge', 'resume', 'set_waiting', 'snooze', 'resolve', 'reopen']);
  const actionOrder = ['acknowledge', 'resume', 'set_waiting', 'snooze', 'resolve', 'reopen'];
  result.actions.advertised = {};
  result.actions.rendered = {};
  for (const [status, id] of Object.entries(detailIds)) {
    await openWorkspace(1440, 'light');
    await openRow(id);
    const d = await detail(id);
    const advertised = d.human_actions.map(item => item.action);
    const rendered = await evaluate(`[...document.querySelectorAll('.attention-action-choice')].map(n => n.getAttribute('data-attention-focus').replace(/^action-/, ''))`);
    const expected = actionOrder.filter(name => advertised.includes(name) && supported.has(name));
    result.actions.advertised[status] = advertised;
    result.actions.rendered[status] = rendered;
    equal(rendered, expected, `${status} controls are exactly recognized advertised actions`);
    check(!rendered.includes('attach_relation') && !rendered.includes('request_disclosure'), `${status} omits out-of-scope relation/grant controls`);
    check(d.human_actions.every(item => item.schema_version === 1 && item.expected_revision === d.revision), `${status} advertisements carry inspected revision/schema`);
    const basisText = await evaluate(`[...document.querySelectorAll('.attention-basis p')].map(n => n.textContent).join(' | ')`);
    check(!/Active|countdown|fires in|scheduler/i.test(basisText), `${status} does not invent disclosure state or scheduler`);
  }

  // 390 light/dark layout: labels, no horizontal clipping, detail/list switch, touch targets.
  await openWorkspace(390, 'light');
  result.narrow.labelsLight = await evaluate(`[...document.querySelectorAll('.attention-view-choice')].map(n => n.textContent)`);
  result.narrow.truncatedLight = await evaluate(`[...document.querySelectorAll('.attention-view-choice')].filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent)`);
  result.narrow.scrollLight = await evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 1');
  result.narrow.viewTargetsLight = await evaluate(`[...document.querySelectorAll('.attention-view-choice')].map(n => Math.round(n.getBoundingClientRect().height))`);
  equal(result.narrow.labelsLight, result.views.labels, '390 light retains all view labels');
  equal(result.narrow.truncatedLight, [], '390 light view labels do not truncate');
  check(result.narrow.scrollLight === false, '390 light has no horizontal document scroll');
  check(result.narrow.viewTargetsLight.every(height => height >= 44), '390 light state views have 44px targets');
  await shot('list-390-light');
  await openRow('renewal');
  result.narrow.detailLightListHidden = await evaluate('getComputedStyle(document.querySelector(".attention-registry")).display === "none"');
  result.narrow.controlsLight = await evaluate(`[...document.querySelectorAll('.attention-reading button, .attention-reading select, .attention-reading textarea, .attention-reading input[type="text"], .attention-reading input[type="datetime-local"]')].map(n => ({ key: n.dataset.attentionFocus ?? n.tagName.toLowerCase(), height: Math.round(n.getBoundingClientRect().height) }))`);
  check(result.narrow.detailLightListHidden, '390 detail hides list behind detail');
  check(result.narrow.controlsLight.every(control => control.height >= 44), '390 light actionable controls meet 44px target');
  await shot('detail-390-light');
  await theme('dark'); await sleep(180);
  result.narrow.truncatedDark = await evaluate(`[...document.querySelectorAll('.attention-view-choice')].filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent)`);
  result.narrow.scrollDark = await evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth + 1');
  equal(result.narrow.truncatedDark, [], '390 dark detail has no truncated view labels');
  check(result.narrow.scrollDark === false, '390 dark detail has no horizontal document scroll');
  await shot('detail-390-dark');
  await click('[data-attention-focus="list-back"]');
  await waitFor('Boolean(document.querySelector(".attention-registry-row"))');
  result.narrow.returnedFocus = await focusKey();
  equal(result.narrow.returnedFocus, 'item-renewal', '390 Back returns focus to originating row');
  await shot('list-390-dark');

  // Return to desktop for action/recovery paths.
  await openWorkspace(1440, 'light');

  // Lost response after server commit: request query must recover exact request identity.
  await openRow('indexing');
  await installTrace('lose-after'); await setTraceTarget('indexing', 'lose-after');
  await click('[data-attention-focus="action-acknowledge"]');
  await waitFor(`window.__attTrace.some(entry => entry.body?.query?.kind === 'request')`, 20000);
  await sleep(450);
  const lostTrace = await trace();
  const lostPost = lostTrace.find(entry => entry.url.includes('/attention/indexing/actions'));
  const lostQuery = lostTrace.find(entry => entry.body?.query?.kind === 'request');
  check(Boolean(lostPost && lostQuery), 'lost response performs action then scoped request recovery');
  equal(lostQuery.body.query.request_id, lostPost.body.request.request_id, 'lost response query uses same request_id');
  const indexingEventsAfterLost = (await events('indexing')).filter(event => event.action === 'acknowledge');
  equal(indexingEventsAfterLost.length, 1, 'lost response creates exactly one acknowledge event');
  const indexingAfterLost = await detail('indexing');
  equal(indexingAfterLost.seen, true, 'lost response recovery reads committed seen state');
  const lostRetryButton = await evaluate('Boolean(document.querySelector("[data-attention-focus=retry-mutation]"))');
  check(!lostRetryButton, 'committed lost response clears uncertain retry state');
  result.recovery.lostResponse = { actionRequest: lostPost.body.request, queryRequestId: lostQuery.body.query.request_id, acknowledgeEvents: indexingEventsAfterLost.length, seen: indexingAfterLost.seen };

  // Request that never left: show uncertainty, then resend exactly unchanged.
  await openWorkspace(1440, 'light'); await openRow('filing');
  await installTrace('drop-first'); await setTraceTarget('filing', 'drop-first');
  await click('[data-attention-focus="action-acknowledge"]');
  await waitFor('Boolean(document.querySelector("[data-attention-focus=retry-mutation]"))');
  const dropTraceBeforeRetry = await trace();
  const dropFirst = dropTraceBeforeRetry.find(entry => entry.url.includes('/attention/filing/actions'));
  const dropQuery = dropTraceBeforeRetry.find(entry => entry.body?.query?.kind === 'request');
  check(Boolean(dropFirst && dropQuery), 'pre-send drop queries scoped receipt');
  equal(dropQuery.body.query.request_id, dropFirst.body.request.request_id, 'pre-send recovery query uses same request_id');
  check(/No committed result was found|result.*not known/i.test(await text('.attention-action-alert')), 'pre-send drop remains explicitly uncertain');
  await click('[data-attention-focus="retry-mutation"]');
  await waitFor(`window.__attTrace.filter(entry => entry.url.includes('/attention/filing/actions')).length === 2`, 20000);
  await waitFor('!document.querySelector("[data-attention-focus=retry-mutation]")', 20000);
  await sleep(350);
  const dropTrace = await trace();
  const dropPosts = dropTrace.filter(entry => entry.url.includes('/attention/filing/actions'));
  equal(dropPosts.length, 2, 'pre-send recovery has one original attempt and one retry');
  equal(dropPosts[1].body.request, dropPosts[0].body.request, 'retry preserves exact request identity and payload');
  const filingAckEvents = (await events('filing')).filter(event => event.action === 'acknowledge');
  equal(filingAckEvents.length, 1, 'pre-send retry creates exactly one acknowledge event');
  equal((await detail('filing')).seen, true, 'pre-send retry eventually commits seen state');
  result.recovery.preSendDrop = { actionRequests: dropPosts.map(entry => entry.body.request), queryRequestId: dropQuery.body.query.request_id, acknowledgeEvents: filingAckEvents.length };

  // Real stale CAS conflict: external client advances revision while browser draft is open.
  await openWorkspace(1440, 'light'); await openRow('counsel');
  await installTrace('normal'); await setTraceTarget('counsel', 'normal');
  await click('[data-attention-focus="action-resolve"]');
  await fill('field-reason', 'Resolved after comparing both lists.');
  const counselBefore = await detail('counsel');
  const externalAck = await action('counsel', { schema_version: 1, request_id: crypto.randomUUID(), attention_id: 'counsel', expected_revision: counselBefore.revision, action: 'acknowledge', payload: {} });
  check(externalAck.status === 200, 'external concurrent acknowledge commits before browser submit', externalAck.body);
  await click('[data-attention-focus="submit-resolve"]');
  await waitFor('Boolean(document.querySelector(".attention-action-alert"))', 20000);
  const conflictAlert = await text('.attention-action-alert');
  equal(conflictAlert, 'This item changed while you were deciding. Reload it and try again.', 'VERSION_CONFLICT copy');
  equal(await evaluate('document.querySelector(".attention-action-alert")?.getAttribute("role")'), 'alert', 'VERSION_CONFLICT is announced as alert');
  const counselAfterConflict = await detail('counsel');
  equal(counselAfterConflict.status, 'waiting', 'VERSION_CONFLICT makes no partial status change');
  equal(await value('[data-attention-focus="field-reason"]'), 'Resolved after comparing both lists.', 'VERSION_CONFLICT keeps human draft');
  const conflictTraceOne = await trace();
  const conflictPostsOne = conflictTraceOne.filter(entry => entry.url.includes('/attention/counsel/actions'));
  equal(conflictPostsOne.length, 1, 'VERSION_CONFLICT is not silently replayed');
  await click('[data-attention-focus="submit-resolve"]');
  await waitFor('document.querySelector(".attention-detail-state")?.textContent === "Resolved"', 20000);
  await sleep(300);
  const conflictTraceTwo = await trace();
  const conflictPostsTwo = conflictTraceTwo.filter(entry => entry.url.includes('/attention/counsel/actions'));
  equal(conflictPostsTwo.length, 2, 'second decision sends exactly one fresh request');
  check(conflictPostsTwo[0].body.request.request_id !== conflictPostsTwo[1].body.request.request_id, 'second decision has new request_id');
  equal(conflictPostsTwo[1].body.request.expected_revision, counselAfterConflict.revision, 'second decision uses re-inspected revision');
  equal((await detail('counsel')).status, 'resolved', 'second decision commits canonical resolved status');
  result.concurrency = { conflictCopy: conflictAlert, conflictRole: 'alert', firstActionCount: conflictPostsOne.length, secondActionCount: conflictPostsTwo.length, freshRequestId: conflictPostsTwo[0].body.request.request_id !== conflictPostsTwo[1].body.request.request_id };

  // Snooze editor includes recorded due_at and no scheduler; verify exact outgoing payload.
  await openWorkspace(1440, 'light'); await openRow('renewal');
  await installTrace('normal'); await setTraceTarget('renewal', 'normal');
  const renewalBefore = await detail('renewal');
  await click('[data-attention-focus="action-snooze"]');
  await fill('field-reason', 'Nothing to do until the window opens.');
  await fill('field-label', 'Check the filing window');
  await change('field-trigger', 'at');
  await waitFor('Boolean(document.querySelector("[data-attention-focus=field-due]"))');
  await fill('field-due', '2026-09-20T09:30');
  await click('[data-attention-focus="submit-snooze"]');
  await waitFor('document.querySelector(".attention-detail-state")?.textContent === "Later"', 20000);
  await sleep(300);
  const snoozeTrace = await trace();
  const snoozePost = snoozeTrace.find(entry => entry.url.includes('/attention/renewal/actions'));
  check(Boolean(snoozePost), 'snooze sends typed action request');
  equal(Object.keys(snoozePost.body.request).sort(), ['action', 'attention_id', 'expected_revision', 'payload', 'request_id', 'schema_version'], 'action request has exact contract keys');
  equal(snoozePost.body.request.expected_revision, renewalBefore.revision, 'snooze carries inspected revision');
  equal(snoozePost.body.request.action, 'snooze', 'snooze action name');
  equal(snoozePost.body.request.payload.reason, 'Nothing to do until the window opens.', 'snooze reason');
  equal(snoozePost.body.request.payload.next_action.kind, 'inspect', 'snooze next action kind defaults from descriptor');
  equal(snoozePost.body.request.payload.next_action.trigger, 'at', 'snooze next action trigger');
  check(typeof snoozePost.body.request.payload.next_action.due_at === 'string' && snoozePost.body.request.payload.next_action.due_at.endsWith('Z'), 'snooze due_at is timezone-qualified ISO');
  const renewalAfterSnooze = await detail('renewal');
  equal(renewalAfterSnooze.status, 'later', 'snooze records Later');
  const snoozePageText = await evaluate('document.body.textContent');
  check(!/countdown|fires in|reminder|will return/i.test(snoozePageText), 'Later has no countdown or scheduler promise');
  result.actions.snoozeRequest = snoozePost.body.request;
  result.actions.snoozeStatus = renewalAfterSnooze.status;

  // Resolve reason is required locally; successful body is then committed canonically.
  await openWorkspace(1440, 'light'); await openRow('indexing');
  await installTrace('normal'); await setTraceTarget('indexing', 'normal');
  await click('[data-attention-focus="action-resolve"]');
  await click('[data-attention-focus="submit-resolve"]');
  await waitFor('Boolean(document.querySelector(".attention-field-error"))');
  equal(await text('.attention-field-error'), 'A reason is required.', 'resolve requires a reason');
  equal(await evaluate('document.querySelector(".attention-field-error")?.getAttribute("role")'), 'alert', 'required reason is announced');
  equal((await trace()).filter(entry => entry.url.includes('/attention/indexing/actions')).length, 0, 'empty resolve does not send a request');
  await fill('field-reason', 'Recorded as handled after review.');
  await click('[data-attention-focus="submit-resolve"]');
  await waitFor('document.querySelector(".attention-detail-state")?.textContent === "Resolved"', 20000);
  await sleep(300);
  const resolveTrace = await trace();
  const resolvePost = resolveTrace.find(entry => entry.url.includes('/attention/indexing/actions'));
  check(Boolean(resolvePost), 'resolve sends after required reason');
  equal(resolvePost.body.request.action, 'resolve', 'resolve action name');
  equal(resolvePost.body.request.payload, { reason: 'Recorded as handled after review.' }, 'resolve payload exact');
  equal((await detail('indexing')).status, 'resolved', 'resolve canonical status');

  // Explicit unavailable response: transport rewrite to a real NOT_FOUND result.
  await openWorkspace(1440, 'light');
  await evaluate(`(() => {
    const real = window.fetch; let once = true;
    window.fetch = (input, init) => {
      const url = String(input);
      if (once && url.includes('/attention/counsel?')) { once = false; return real(url.replace('/attention/counsel?', '/attention/no-such-item?'), init); }
      return real(input, init);
    };
    return true;
  })()`);
  await click('[data-attention-focus="item-counsel"]');
  await waitFor('document.body.textContent.includes("This item is unavailable.")');
  result.actions.unavailable = await evaluate(`[...document.querySelectorAll('.attention-reading p')].map(n => n.textContent).find(t => t.includes('unavailable')) ?? null`);
  equal(result.actions.unavailable, 'This item is unavailable.', 'NOT_FOUND renders uniform unavailable copy');
  check(!/not found|does not exist|deleted|hidden/i.test(result.actions.unavailable), 'unavailable copy does not infer existence');
  await shot('unavailable-1440-light');

  // No Run/model/provider calls on read or actions, and source contains no timer.
  const activity = await apiOk('/work-activity?days=1');
  const sessions = await apiOk('/sessions');
  result.network.requestedPaths = [...new Set(observations.responses.map(response => new URL(response.url).pathname))].sort();
  result.network.runResponses = observations.responses.filter(response => /\/runs?(\/|$)/.test(new URL(response.url).pathname)).length;
  result.network.recordedRunCount = activity.recordedRunCount;
  result.network.sessions = sessions.sessions.length;
  result.network.pageExceptions = observations.exceptions.length;
  equal(result.network.runResponses, 0, 'Attention browser flow makes no Run HTTP requests');
  equal(result.network.recordedRunCount, 0, 'Attention browser flow records no Run');
  equal(result.network.sessions, 0, 'Attention browser flow creates no Session');
  equal(result.network.pageExceptions, 0, 'browser flow has no Runtime exceptions');

  const sourceRoot = process.env.VERIFY_TREE ?? '/private/tmp/cw-attention-delivery-verify-20260910';
  const source = await (await import('node:fs/promises')).readFile(`${sourceRoot}/app/web/attention-view.mjs`, 'utf8');
  for (const timer of ['setTimeout', 'setInterval', 'requestAnimationFrame', 'requestIdleCallback']) check(!source.includes(timer), `Attention view has no ${timer}`);

  result.overall = 'PASS';
} catch (error) {
  failure = { message: error?.message ?? String(error), stack: error?.stack ?? null };
  result.overall = 'FAIL';
  result.failure = failure;
  console.error(failure.stack ?? failure.message);
} finally {
  result.generatedAt = new Date().toISOString();
  result.observationSummary = { responseCount: observations.responses.length, exceptionCount: observations.exceptions.length };
  await writeFile(`${OUT}/independent-browser-verification.json`, `${JSON.stringify(result, null, 2)}\n`);
  try { await close(); } catch (error) { console.error('close failed', error?.message ?? error); }
}
if (failure) process.exitCode = 1;
