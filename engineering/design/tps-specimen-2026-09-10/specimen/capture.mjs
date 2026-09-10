/* WO-TPS-01 · capture script (re-runnable). Headless Chrome over CDP, no npm dependency.
 *
 *   python3 -m http.server 8884 --bind 127.0.0.1 --directory engineering/design/tps-specimen-2026-09-10
 *   node engineering/design/tps-specimen-2026-09-10/specimen/capture.mjs
 *
 * Writes PNGs and measurements.json to ../captures/. Uses only the synthetic page; no
 * provider, credential or product server is involved. The Chrome profile lives in a temp
 * dir that is removed at the end.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CDP = Number(process.env.TPS_CDP_PORT || 19884);
const BASE = process.env.SPECIMEN_URL || 'http://127.0.0.1:8884/specimen/index.html';
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'captures');
const sleep = ms => new Promise(r => setTimeout(r, ms));

await mkdir(OUT, { recursive: true });
const profile = await mkdtemp(path.join(os.tmpdir(), 'tps-specimen-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${CDP}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank']);
chrome.stderr.on('data', () => {});

let target;
for (let i = 0; i < 80 && !target; i++) {
  try { target = await (await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: 'PUT' })).json(); }
  catch { await sleep(250); }
}
if (!target?.webSocketDebuggerUrl) throw new Error('chrome did not start');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let nextId = 1; const pending = new Map(); const waiters = [];
ws.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { const { res, rej } = pending.get(msg.id); pending.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); }
  else if (msg.method) for (const w of [...waiters]) if (w.method === msg.method) { waiters.splice(waiters.indexOf(w), 1); w.res(msg.params); }
};
const send = (method, params = {}) => new Promise((res, rej) => { const id = nextId++; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const once = method => new Promise(res => waiters.push({ method, res }));
const js = async expr => {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
await send('Page.enable');
await send('Runtime.enable');
await send('Page.bringToFront');

const shots = [];
async function save(name, data) {
  const buf = Buffer.from(data, 'base64');
  await writeFile(path.join(OUT, name), buf);
  const sha = createHash('sha256').update(buf).digest('hex').slice(0, 16);
  shots.push({ name, sha });
  return sha;
}
async function setup({ width, scheme = 'light', reduce = false, query = 'autoplay=0' }) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
  await send('Emulation.setEmulatedMedia', { features: [
    { name: 'prefers-color-scheme', value: scheme },
    { name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }] });
  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url: `${BASE}?${query}` });
  await loaded;
  await js('document.fonts.ready.then(() => true)');
  await sleep(300);
}
async function fullPage(name) {
  const { cssContentSize: s } = await send('Page.getLayoutMetrics');
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: s.width, height: Math.ceil(s.height), scale: 1 } });
  return save(name, r.data);
}
async function element(name, selector, scale = 2) {
  const rect = await js(`(() => { const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; })()`);
  const pad = 8;
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
    // Whole-pixel clip: a fractional origin resamples edges and would make identical content hash differently.
    clip: { x: Math.max(0, Math.floor(rect.x - pad)), y: Math.max(0, Math.floor(rect.y - pad)), width: Math.ceil(rect.width + pad * 2), height: Math.ceil(rect.height + pad * 2), scale } });
  return save(name, r.data);
}

const measurements = { page: BASE, synthetic: true, generatedAt: new Date().toISOString(), widths: {}, states: {}, motion: {}, frames: [], focus: {} };

// 1 · States and page × light/dark × 1440/390 (system scheme path, no data-theme attribute)
for (const width of [1440, 390]) for (const scheme of ['light', 'dark']) {
  await setup({ width, scheme });
  await js('__specimen.setTime(__specimen.at.streaming), true');
  await fullPage(`page__${width}-${scheme}.png`);
  await element(`states__${width}-${scheme}.png`, '#states');
  await element(`today__${width}-${scheme}.png`, '.grid');
  await element(`widths__${width}-${scheme}.png`, '#widths');
  await element(`forms__${width}-${scheme}.png`, '#forms');
}
// Explicit override path: data-theme="dark" while the system says light.
await setup({ width: 1440, scheme: 'light' });
await js(`document.querySelector('#ctl-theme [data-value="dark"]').click(), true`);
await element('states__1440-dark-attr-over-light-system.png', '#states');

// 2 · Width fit measurements (1440 and 390, default and large text)
for (const width of [1440, 390]) for (const size of ['default', 'large']) {
  await setup({ width });
  if (size === 'large') await js(`document.documentElement.setAttribute('data-text-size','large'), true`);
  measurements.widths[`${width}-${size}`] = await js(`(() => {
    const out = {};
    for (const id of ['width-40','width-48','width-60','form-spark','form-number']) {
      const dd = document.querySelector('#' + id + ' .data-list dd');
      const locus = dd.querySelector('.locus'), prov = dd.querySelector('.prov'), spark = dd.querySelector('.spark');
      const lh = parseFloat(getComputedStyle(dd).fontSize) * 1.5;
      const lr = locus.getBoundingClientRect(), pr = prov.getBoundingClientRect();
      out[id] = { ddWidth: Math.round(dd.clientWidth), ddHeight: Math.round(dd.getBoundingClientRect().height),
        locusWidth: Math.round(lr.width), provWidth: Math.round(pr.width), sparkShown: !!spark && getComputedStyle(spark).display !== 'none',
        oneLine: Math.abs(lr.top - pr.top) < 2 && dd.getBoundingClientRect().height <= lh + 2, overflow: dd.scrollWidth > dd.clientWidth };
      out[id].slack = Math.round(dd.clientWidth - lr.width - pr.width);
      // Realistic extremes the row must also hold: a three-digit rate with a source word, and a
      // dash with the longest state word. Text is swapped in place, measured, then restored.
      const num = dd.querySelector('.num'), keep = [num.textContent, prov.textContent];
      for (const [key, n, p] of [['threeDigit', '188 tok/s', 'synthetic'], ['longestState', '—', 'cancelled']]) {
        num.textContent = n; prov.textContent = p;
        const wl = locus.getBoundingClientRect(), wp = prov.getBoundingClientRect();
        out[id][key] = { text: n + ' + ' + p, fits: dd.scrollWidth <= dd.clientWidth && dd.getBoundingClientRect().height <= lh + 2, slack: Math.round(dd.clientWidth - wl.width - wp.width) };
      }
      [num.textContent, prov.textContent] = keep;
    }
    return out; })()`);
}
await setup({ width: 1440, scheme: 'light', query: 'autoplay=0' });
await js(`document.documentElement.setAttribute('data-text-size','large'), true`);
await element('widths__1440-light-text-large.png', '#widths');

// 3 · State text as rendered (what each card states, for the README table)
await setup({ width: 1440 });
measurements.states = await js(`(() => Object.fromEntries(['state-streaming','state-completed','state-idle','state-unavailable','state-failed','state-cancelled'].map(id => {
  const c = document.getElementById(id); const s = c.querySelector('svg.spark');
  return [id, { headline: c.querySelector('.request-measurements > h4').textContent, rows: [...c.querySelectorAll('.request-measurements > .data-list dd')].map(d => d.textContent),
    sparkLabel: s ? s.getAttribute('aria-label') : null, bars: s ? s.querySelectorAll('rect.bar').length : 0, inked: s ? s.querySelectorAll('rect.latest').length : 0,
    voids: s ? s.querySelectorAll('rect.slot-void').length : 0 }];
})))()`);

// 4 · Motion: shoot the live per-request card 40ms after a bar arrives, motion on vs reduced.
async function arrivalShot(label, prep) {
  await setup({ width: 1440, ...prep.media });
  if (prep.attr) await js(`document.querySelector('#ctl-motion [data-value="reduce"]').click(), true`);
  await js(`(() => { const r = __specimen.runs.live.requests[3]; __specimen.setTime(r.terminal.tMs - 1); return true; })()`);
  await sleep(400);
  await js('__specimen.step(), true');
  await sleep(40);
  const opacity = await js(`(() => { const b = document.querySelector('#live-request rect.bar.latest'); return b ? getComputedStyle(b).opacity : null; })()`);
  const sha = await element(`motion__${label}.png`, '#live-request', 3);
  measurements.motion[label] = { latestBarOpacityAt40ms: opacity, sha };
}
await arrivalShot('on', { media: { reduce: false } });
await arrivalShot('reduce-system', { media: { reduce: true } });
await arrivalShot('reduce-toggle', { media: { reduce: false }, attr: true });

// 5 · Keyboard: Tab to the completed card's disclosure, open it with Enter, shoot with focus ring.
for (const scheme of ['light', 'dark']) {
  await setup({ width: 1440, scheme });
  let tabs = 0, onTarget = false;
  for (; tabs < 60 && !onTarget; tabs++) {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    onTarget = await js(`!!document.activeElement.closest('#state-completed') && document.activeElement.tagName === 'SUMMARY'`);
  }
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await sleep(150);
  measurements.focus[scheme] = { tabPresses: tabs, reached: onTarget, open: await js(`document.querySelector('#state-completed details').open`),
    focusVisible: await js(`document.activeElement.matches(':focus-visible')`) };
  await element(`focus-disclosure__1440-${scheme}.png`, '#state-completed', 2);
}

// 6 · Continuous frames, real-time playback at 1x owner clock: streaming -> frozen.
await setup({ width: 1440, query: 'autoplay=0' });
const live = await js(`(() => { const r = __specimen.runs.live; return { endMs: r.endMs, req: r.requests.map(q => ({ id: q.requestId, dispatch: q.dispatchMs, first: q.firstTokenMs, end: q.terminal.tMs })) }; })()`);
const r4 = live.req[3], r5 = live.req[4];
const plan = [
  { label: 'a-req4-streaming', t: r4.first + 1500 },
  { label: 'b-req4-streaming+1500ms', t: r4.first + 3000 },
  { label: 'c-req4-completed', t: r4.end + 300 },
  { label: 'd-req5-in-flight', t: r5.first + 600 },
  { label: 'e-run-ended', t: live.endMs + 300 },
  { label: 'f-run-ended+3s', t: live.endMs + 3300 },
];
await js('__specimen.replay(), window.__t0 = performance.now(), true');
for (const [i, f] of plan.entries()) {
  const now = await js('performance.now() - window.__t0');
  if (f.t > now) await sleep(f.t - now);
  // Shoot settled pixels: wait (<= 600ms) for any one-shot arrival fade to finish.
  const settled = await js(`new Promise(r => { const t0 = performance.now(); (function poll() { const n = document.querySelectorAll('#live .fresh, #live .entering').length; if (!n || performance.now() - t0 > 600) r(n === 0); else setTimeout(poll, 20); })(); })`);
  const state = await js(`({ t: __specimen.player.t, delivered: __specimen.player.idx, renders: { ...__specimen.player.renders } })`);
  state.settled = settled;
  state.domSig = await js(`({ request: document.getElementById('live-request').dataset.sig.length + ':' + [...document.getElementById('live-request').dataset.sig].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7), interval: [...document.getElementById('live-interval').dataset.sig].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) })`);
  const req = await element(`frame-${i + 1}-${f.label}__request.png`, '#live-request', 2);
  const int = await element(`frame-${i + 1}-${f.label}__interval.png`, '#live-interval', 2);
  measurements.frames.push({ ...f, ...state, requestSha: req, intervalSha: int });
}
await element('live__1440-light-end.png', '#live', 2);

measurements.shots = shots;
await writeFile(path.join(OUT, 'measurements.json'), JSON.stringify(measurements, null, 2) + '\n');
ws.close();
chrome.kill();
await sleep(300);
await rm(profile, { recursive: true, force: true });
console.log(JSON.stringify({ shots: shots.length, frames: measurements.frames.map(f => ({ label: f.label, request: f.requestSha, interval: f.intervalSha, renders: f.renders })), motion: measurements.motion, focus: measurements.focus }, null, 2));
