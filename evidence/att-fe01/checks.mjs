/* ATT-FE-01 · behaviour assertions in real headless Chromium over CDP against a
 * real server. Every server call below is the app's own /api/v5 traffic.
 *
 * Two synthetic devices are used, both at the transport and never at the answer:
 *   · a page-level `fetch` wrapper holds the action request for ~2.4s, so the
 *     in-flight state can be photographed (a loopback round trip is milliseconds);
 *   · one inspect URL is rewritten to an id that does not exist, to photograph
 *     the unavailable-item state without inventing a deletion the contract has no
 *     word for.
 * The version conflict is not synthetic: a second client really advances the
 * object while the browser is deciding. */
import { writeFile, mkdir } from "node:fs/promises";
import { cdp, close, evaluate, key, observations, ORIGIN, sleep, waitFor } from "./browser.mjs";

const OUT = new URL("./", import.meta.url).pathname;
const SHOTS = `${OUT}screenshots`;
await mkdir(SHOTS, { recursive: true });
const result = { origin: ORIGIN, views: {}, rows: {}, keyboard: {}, actions: {}, concurrency: {}, narrow: {}, network: {} };

const token = (await (await fetch(`${ORIGIN}/api/v5/bootstrap`)).json()).sessionToken;
const api = async (path, init = {}) => {
  const res = await fetch(`${ORIGIN}/api/v5${path}`, { ...init,
    headers: { "content-type": "application/json", "x-work-token": token, ...(init.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
};
const projectId = (await api("/projects")).projects[0].id;

async function shot(name) {
  const { data } = await cdp("Page.captureScreenshot", { format: "png" });
  await writeFile(`${SHOTS}/${name}.png`, Buffer.from(data, "base64"));
}
async function viewport(width, height = 900) {
  await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 700 });
}
const theme = scheme => cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
const click = selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).click(), true`);
const text = selector => evaluate(`document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`);
const focusKey = () => evaluate(`document.activeElement?.dataset?.attentionFocus ?? null`);
const CODES = { Escape: 27, Enter: 13, KeyJ: 74, KeyK: 75, ArrowUp: 38, ArrowDown: 40 };
const press = code => key({ code, keyCode: CODES[code] ?? 0, text: code.startsWith("Key") ? code.slice(3).toLowerCase() : "" });
/* Chrome only performs a key's default action when the keyDown carries its text,
 * so Enter is dispatched directly: the point of this check is that the row is an
 * ordinary button and the browser, not the view, activates it. */
const enter = async () => {
  const base = { code: "Enter", key: "Enter", windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 };
  await cdp("Input.dispatchKeyEvent", { ...base, type: "keyDown", text: "\r", unmodifiedText: "\r" });
  await cdp("Input.dispatchKeyEvent", { ...base, type: "keyUp" });
};

await cdp("Network.enable");
await viewport(1440);
await theme("light");
await cdp("Page.navigate", { url: ORIGIN });
await waitFor(`Boolean(document.getElementById("attention-button"))`);
await sleep(1200);

/* Entry stays where it is: the sidebar opens the assistant, and the items
 * workspace is reached from inside it. This PR does not reverse that. */
await click("#attention-button");
await waitFor(`[...document.querySelectorAll('button')].some(b => b.textContent === 'Attention items')`);
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Attention items').click(), true`);
await waitFor(`document.querySelectorAll('.attention-registry-row').length >= 5`);
await sleep(300);

result.views.labels = await evaluate(`[...document.querySelectorAll('.attention-view-choice')].map(n => n.textContent)`);
result.views.pressed = await evaluate(`[...document.querySelectorAll('.attention-view-choice')].filter(n => n.getAttribute('aria-pressed') === 'true').map(n => n.textContent)`);
result.views.group = await evaluate(`document.querySelector('.attention-views')?.getAttribute('aria-label')`);
result.rows.anatomy = await evaluate(`[...document.querySelectorAll('.attention-registry-row')].map(row => ({
  title: row.querySelector('.attention-row-title').textContent,
  status: row.querySelector('.home-attention-state').textContent,
  updated: row.querySelector('.attention-row-time')?.textContent ?? null,
  datetime: row.querySelector('.attention-row-time')?.getAttribute('datetime') ?? null,
}))`);
result.rows.serverOrder = (await api("/attention/query", { method: "POST", body: JSON.stringify({ projectId,
  query: { schema_version: 1, kind: "registry" } }) })).items.map(item => item.descriptor.title);
result.rows.rendered = result.rows.anatomy.map(row => row.title);
await shot("all-1440-light");

/* Keyboard: real key events, so the app's own handler decides. */
await evaluate(`document.querySelectorAll('.attention-registry-row')[0].focus(), true`);
result.keyboard.start = await focusKey();
await press("KeyJ"); result.keyboard.afterJ = await focusKey();
await press("KeyJ"); result.keyboard.afterSecondJ = await focusKey();
await press("KeyK"); result.keyboard.afterK = await focusKey();
await press("ArrowUp"); result.keyboard.afterArrowUp = await focusKey();
await press("ArrowUp"); result.keyboard.clampedAtTop = await focusKey();
await enter();
await waitFor(`Boolean(document.querySelector('.attention-detail-head'))`);
result.keyboard.openedTitle = await text(".attention-detail-head h2");
await press("Escape");
await waitFor(`!document.querySelector('.attention-detail-head')`);
result.keyboard.returnedFocus = await focusKey();

/* Views are queries: each one asks the server and none of them sorts a page. */
await click('[data-attention-focus="view-needs_you"]');
await waitFor(`document.querySelectorAll('.attention-registry-row').length === 1`);
result.views.needsYou = await evaluate(`[...document.querySelectorAll('.attention-row-title')].map(n => n.textContent)`);
await shot("needs-you-1440-light");
await click('[data-attention-focus="view-later"]');
await waitFor(`document.querySelectorAll('.attention-registry-row').length === 1`);
result.views.later = await evaluate(`[...document.querySelectorAll('.attention-row-title')].map(n => n.textContent)`);
await evaluate(`document.querySelector('.attention-registry-row').click(), true`);
await waitFor(`Boolean(document.querySelector('.attention-decision'))`);
result.views.laterDetail = await text(".attention-decision");
await theme("dark");
await sleep(200);
await shot("later-1440-dark");
await theme("light");

/* Actions: only what the object advertised, and the editors those descriptors
 * describe. */
await click('[data-attention-focus="view-needs_you"]');
await waitFor(`document.querySelectorAll('.attention-registry-row').length === 1`);
await evaluate(`document.querySelector('.attention-registry-row').click(), true`);
await waitFor(`Boolean(document.querySelector('.attention-actions'))`);
result.actions.offered = await evaluate(`[...document.querySelectorAll('.attention-action-choice')].map(n => n.textContent)`);
result.actions.advertised = (await api(`/attention/renewal?projectId=${projectId}`)).human_actions.map(entry => entry.action);
result.actions.disclosure = await evaluate(`[...document.querySelectorAll('.attention-basis p')].map(n => n.textContent).find(t => t.startsWith('Runtime disclosure')) ?? null`);
await click('[data-attention-focus="action-resolve"]');
await waitFor(`Boolean(document.querySelector('[data-attention-focus="submit-resolve"]'))`);
result.actions.resolveSubmitName = await evaluate(`document.querySelector('[data-attention-focus="submit-resolve"]').getAttribute('aria-label')`);
await click('[data-attention-focus="submit-resolve"]');
await waitFor(`Boolean(document.querySelector('.attention-field-error'))`);
result.actions.emptyReason = await text(".attention-field-error");
result.actions.emptyReasonRole = await evaluate(`document.querySelector('.attention-field-error').getAttribute('role')`);
await shot("action-resolve-1440-light");
await click('[data-attention-focus="action-snooze"]');
await waitFor(`Boolean(document.querySelector('[data-attention-focus="field-trigger"]'))`);
result.actions.snoozeKinds = await evaluate(`[...document.querySelector('[data-attention-focus="field-kind"]').options].map(o => o.value)`);
await evaluate(`(() => { const t = document.querySelector('[data-attention-focus="field-trigger"]');
  t.value = 'at'; t.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
await waitFor(`Boolean(document.querySelector('[data-attention-focus="field-due"]'))`);
result.actions.dueFieldType = await evaluate(`document.querySelector('[data-attention-focus="field-due"]').type`);
await theme("dark"); await sleep(200);
await shot("action-snooze-1440-dark");
await theme("light");
await click('[data-attention-focus="action-set_waiting"]');
await waitFor(`Boolean(document.querySelector('[data-attention-focus="submit-set_waiting"]'))`);
await shot("action-waiting-1440-light");

/* In flight: the submit control is the only thing that changes. */
await click('[data-attention-focus="action-resolve"]');
await waitFor(`Boolean(document.querySelector('[data-attention-focus="field-reason"]'))`);
await evaluate(`(() => { const box = document.querySelector('[data-attention-focus="field-reason"]');
  box.value = 'Recorded as handled after review.'; box.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
await evaluate(`(() => { const real = window.fetch;
  window.fetch = (input, init) => String(input).includes('/actions')
    ? new Promise(resolve => setTimeout(() => resolve(real(input, init)), 2400))
    : real(input, init);
  return true; })()`);
await click('[data-attention-focus="submit-resolve"]');
await sleep(600);
result.actions.inFlight = {
  submit: await text('[data-attention-focus="submit-resolve"]'),
  detailStatus: await text(".attention-detail-state"),
  rowStatus: await evaluate(`document.querySelector('.attention-registry-row .home-attention-state')?.textContent ?? null`),
};
await shot("action-sending-1440-light");
await waitFor(`!document.querySelector('.attention-action-editor')`, 20000);
await sleep(600);
result.actions.afterReceipt = {
  detailStatus: await text(".attention-detail-state"),
  canonical: (await api(`/attention/renewal?projectId=${projectId}`)).status,
  inNeedsYouView: await evaluate(`Boolean(document.querySelector('[data-attention-focus="item-renewal"]'))`),
  focus: await focusKey(),
};

/* A real version conflict: another client advances the object while this one is
 * deciding. Nothing is replayed and the recorded status does not move. */
await click('[data-attention-focus="view-all"]');
await waitFor(`document.querySelectorAll('.attention-registry-row').length >= 5`);
await evaluate(`document.querySelector('[data-attention-focus="item-indexing"]').click(), true`);
await waitFor(`Boolean(document.querySelector('.attention-actions'))`);
await click('[data-attention-focus="action-resolve"]');
await waitFor(`Boolean(document.querySelector('[data-attention-focus="field-reason"]'))`);
await evaluate(`(() => { const box = document.querySelector('[data-attention-focus="field-reason"]');
  box.value = 'Resolved after comparing both lists.'; box.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
const inspected = await api(`/attention/indexing?projectId=${projectId}`);
await api(`/attention/indexing/actions`, { method: "POST", body: JSON.stringify({ projectId, request: {
  schema_version: 1, request_id: crypto.randomUUID(), attention_id: "indexing", expected_revision: inspected.revision,
  action: "acknowledge", payload: {} } }) });
await click('[data-attention-focus="submit-resolve"]');
await waitFor(`Boolean(document.querySelector('.attention-action-alert'))`);
result.concurrency.conflictCopy = await text(".attention-action-alert");
result.concurrency.conflictRole = await evaluate(`document.querySelector('.attention-action-alert').getAttribute('role')`);
result.concurrency.draftKept = await evaluate(`document.querySelector('[data-attention-focus="field-reason"]')?.value ?? null`);
result.concurrency.canonicalStatus = (await api(`/attention/indexing?projectId=${projectId}`)).status;
result.concurrency.events = (await api("/attention/query", { method: "POST", body: JSON.stringify({ projectId,
  query: { schema_version: 1, kind: "events", attention_id: "indexing" } }) })).events.map(event => event.action);
await shot("conflict-1440-light");

/* The unavailable item says only that it is unavailable. */
await evaluate(`(() => { const real = window.fetch; let once = true;
  window.fetch = (input, init) => {
    const url = String(input);
    if (once && /\\/attention\\/[^/?]+\\?/.test(url)) { once = false; return real(url.replace(/\\/attention\\/[^/?]+\\?/, '/attention/no-such-item?'), init); }
    return real(input, init);
  };
  return true; })()`);
await click('[data-attention-focus="view-all"]');
await waitFor(`document.querySelectorAll('.attention-registry-row').length >= 5`);
await evaluate(`document.querySelector('[data-attention-focus="item-counsel"]').click(), true`);
await waitFor(`document.body.textContent.includes('This item is unavailable')`);
result.actions.unavailable = await evaluate(`[...document.querySelectorAll('.attention-reading p')].map(n => n.textContent).find(t => t.includes('unavailable')) ?? null`);
await shot("unavailable-1440-light");
await cdp("Page.navigate", { url: ORIGIN });
await waitFor(`Boolean(document.getElementById("attention-button"))`);
await sleep(1000);

/* 390: the same labels, the same words, 44px targets. */
await viewport(390, 780);
await click("#attention-button");
await waitFor(`[...document.querySelectorAll('button')].some(b => b.textContent === 'Attention items')`);
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Attention items').click(), true`);
await waitFor(`document.querySelectorAll('.attention-registry-row').length >= 5`);
await sleep(400);
result.narrow.labels = await evaluate(`[...document.querySelectorAll('.attention-view-choice')].map(n => n.textContent)`);
result.narrow.truncated = await evaluate(`[...document.querySelectorAll('.attention-view-choice')].filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent)`);
result.narrow.viewTargets = await evaluate(`[...document.querySelectorAll('.attention-view-choice')].map(n => Math.round(n.getBoundingClientRect().height))`);
result.narrow.documentScrollsHorizontally = await evaluate(`document.documentElement.scrollWidth > document.documentElement.clientWidth + 1`);
await shot("list-390-light");
await evaluate(`document.querySelector('[data-attention-focus="item-renewal"]').click(), true`);
await waitFor(`Boolean(document.querySelector('.attention-actions'))`);
result.narrow.listHiddenBehindDetail = await evaluate(`getComputedStyle(document.querySelector('.attention-registry')).display === 'none'`);
await click('[data-attention-focus="action-reopen"]').catch(() => null);
await sleep(200);
result.narrow.controlTargets = await evaluate(`[...document.querySelectorAll('.attention-reading button, .attention-reading select, .attention-reading textarea, .attention-reading input')]
  .map(n => ({ key: n.dataset.attentionFocus ?? n.tagName.toLowerCase(), height: Math.round(n.getBoundingClientRect().height) }))`);
await shot("detail-390-light");
result.narrow.backReturnsToRow = await (async () => {
  await click('[data-attention-focus="list-back"]');
  await sleep(200);
  return focusKey();
})();

/* Nothing here started a Run or reached a provider. */
result.network.requestedPaths = [...new Set(observations.responses.map(r => new URL(r.url).pathname))].sort();
result.network.runResponses = observations.responses.filter(r => /\/runs?(\/|$)/.test(new URL(r.url).pathname)).length;
result.network.recordedRunCount = (await api("/work-activity?days=1")).recordedRunCount;
result.network.sessions = (await api("/sessions")).sessions.length;
result.network.pageExceptions = observations.exceptions.length;

await writeFile(`${OUT}checks.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  views: result.views.labels,
  keyboard: result.keyboard,
  offered: result.actions.offered,
  inFlight: result.actions.inFlight,
  conflict: result.concurrency,
  narrowTargets: Math.min(...result.narrow.viewTargets),
  runResponses: result.network.runResponses,
  recordedRunCount: result.network.recordedRunCount,
  exceptions: result.network.pageExceptions,
}, null, 2));
await close();
