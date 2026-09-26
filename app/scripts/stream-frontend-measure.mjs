#!/usr/bin/env node
// Order 3 frontend · repeatable streaming measurements in a local headless
// Chrome. It starts `stream-frontend-fixture.mjs` (loopback fake provider
// only), drives Chat and Attention through their real UI over the Chrome
// DevTools Protocol, injects `app/tests/fixtures/stream-frontend/measure.js`,
// and writes one JSON report. No dependency; Node's built-in WebSocket.
//
//   node app/scripts/stream-frontend-measure.mjs --out <report.json> [--chrome <path>] [--port 8871]
//
// This is author timing evidence, not visual or accessibility acceptance:
// headless frames are not the user's display. Units are fake-provider chunks
// and characters; nothing here is decode TPS.
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i === -1 ? fallback : process.argv[i + 1]; };
const out = arg("--out", null);
if (!out) throw new Error("--out <report.json> is required");
const CHROME = arg("--chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const PORT = Number(arg("--port", 8871));
const only = arg("--only", null); // "chat" or "attention" to run one surface
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function lineFrom(child, stream, test) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    child[stream].on("data", (data) => {
      buffer += data;
      for (const line of buffer.split("\n")) { const match = test(line); if (match) resolve(match); }
    });
    child.on("exit", (code) => reject(new Error(`${stream} closed (${code}) before the expected line`)));
  });
}

const work = await mkdtemp(path.join(tmpdir(), "cw-stream-measure-"));
const hostTimings = path.join(work, "host.json");
const fixture = spawn(process.execPath, [path.join(here, "stream-frontend-fixture.mjs"), "--port", String(PORT), "--out", hostTimings], { stdio: ["ignore", "pipe", "inherit"] });
const started = JSON.parse(await lineFrom(fixture, "stdout", (line) => line.startsWith("{") && line));
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${path.join(work, "profile")}`, "--no-first-run", "--no-default-browser-check", "--window-size=1440,900", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
const browserWs = await lineFrom(chrome, "stderr", (line) => /DevTools listening on (ws:\S+)/.exec(line)?.[1]);
const devtools = new URL(browserWs);
const pageInfo = await (await fetch(`http://${devtools.host}/json/new?about:blank`, { method: "PUT" })).json();

const ws = new WebSocket(pageInfo.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
let nextId = 1;
const pending = new Map();
ws.onmessage = (message) => { const data = JSON.parse(message.data); if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); } };
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, (data) => data.error ? reject(new Error(`${method}: ${data.error.message}`)) : resolve(data.result)); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const press = async (key) => {
  for (const type of ["keyDown", "keyUp"]) await send("Input.dispatchKeyEvent", { type, key, code: key, windowsVirtualKeyCode: key === "Enter" ? 13 : 0, text: type === "keyDown" && key === "Enter" ? "\r" : undefined });
};

const bootstrap = await (await fetch(`${started.url}/api/v5/bootstrap`)).json();
const headers = { "x-work-token": bootstrap.sessionToken };
const api = async (route) => (await fetch(`${started.url}/api/v5${route}`, { headers })).json();
const lastRun = async (sessionId) => (await api(`/sessions/${sessionId}`)).runs.at(-1);
async function waitTerminal(sessionIdOf, afterRunCount, timeoutMs = 60000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const sessionId = await sessionIdOf();
    if (sessionId) {
      const detail = await api(`/sessions/${sessionId}`);
      const run = detail.runs.at(-1);
      if (detail.runs.length > afterRunCount && ["completed", "failed", "cancelled", "unknown"].includes(run.status)) return run;
    }
    await sleep(250);
  }
  throw new Error("Run did not settle");
}

const report = { source: null, chrome: null, viewport: null, scenarios: {}, activity: {}, startedAt: new Date().toISOString() };
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: started.url });
  await sleep(2500);
  report.chrome = await evaluate("navigator.userAgent");
  report.viewport = await evaluate("[innerWidth, innerHeight, devicePixelRatio, document.hidden]");
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Streaming')?.click()`);
  await sleep(1500);
  await evaluate(`(async () => { (0, eval)(await (await fetch('${started.probe}')).text()); return 'ok'; })()`);
  const resetProbe = () => evaluate("(() => { const m = window.__streamMeasure; m.polls.length = 0; m.doms.length = 0; m.frames.length = 0; m.loaf.length = 0; return 'reset'; })()");

  async function chatRun(name, input, { during } = {}) {
    await resetProbe();
    const before = (await api(`/sessions/${started.sessionId}`)).runs.length;
    await evaluate(`(() => { const box = document.getElementById('composer-input'); box.focus(); box.value = ${JSON.stringify(input)}; box.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    await press("Enter");
    if (during) report.activity[name] = await evaluate(during);
    const run = await waitTerminal(async () => started.sessionId, before);
    await sleep(1200);
    const measured = await evaluate("window.__streamMeasure.report()");
    report.scenarios[name] = { surface: "chat", input, runId: run.id, status: run.status, ...measured };
    console.log(`${name}: receive→DOM p50 ${measured.receiveToDom.p50} p95 ${measured.receiveToDom.p95} · long frames ${measured.longFrames.count}`);
  }

  // Activity motion under the same load: per-bar scale samples, restarts and
  // the per-sample spread across bars (0 = all bars identical).
  const sampleActivity = `(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    await sleep(1500);
    const root = document.querySelector('#message-stream .run-activity');
    const bars = [...root.querySelectorAll('.run-activity-bars i')];
    const prev = new Map(); let restarts = 0; const heights = []; const moving = [];
    const instances = bars.map(() => new Set());
    // What touches the glyph: its own attributes/children, or an ancestor's.
    const touches = [];
    const watch = new MutationObserver((records) => { for (const r of records) {
      const hitsRoot = r.target === root || root.contains(r.target) || [...r.removedNodes, ...r.addedNodes].some(n => n === root || n.contains?.(root));
      const onAncestor = r.type === 'attributes' && r.target.contains?.(root) && r.target !== root;
      if (hitsRoot || onAncestor) touches.push(r.type + ':' + (r.attributeName || 'children') + ':' + (r.target.id || r.target.className || r.target.nodeName).toString().slice(0, 40));
    } });
    watch.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
    for (let i = 0; i < 40; i++) {
      await sleep(100);
      bars.forEach((b, k) => { const a = b.getAnimations()[0]; if (a) instances[k].add(a); const ct = a?.currentTime; if (ct == null) return; if (prev.has(k) && ct < prev.get(k) - 1) restarts++; prev.set(k, ct); });
      heights.push(bars.map(b => +new DOMMatrix(getComputedStyle(b).transform).d.toFixed(3)));
      moving.push(root.classList.contains('is-moving'));
    }
    const spread = heights.map(h => Math.max(...h) - Math.min(...h)).sort((a, b) => a - b);
    const perBarRange = bars.map((_, k) => { const v = heights.map(h => h[k]); return +(Math.max(...v) - Math.min(...v)).toFixed(3); });
    watch.disconnect();
    const counts = {}; for (const t of touches) counts[t] = (counts[t] || 0) + 1;
    return { movingSamples: moving.filter(Boolean).length, samples: moving.length, restarts,
      animationInstancesPerBar: instances.map(set => set.size), touches: counts,
      spreadP50: +spread[Math.floor(spread.length / 2)].toFixed(3), spreadMax: +spread.at(-1).toFixed(3), perBarRange,
      computed: bars.map(b => { const s = getComputedStyle(b); return [s.animationDuration, s.animationDelay]; }) };
  })()`;

  if (only !== "attention") {
  await chatRun("chat-sustained-1", "stream sustained", { during: sampleActivity });
  await chatRun("chat-burst", "stream burst");
  await chatRun("chat-sustained-3", "stream sustained");
  await chatRun("chat-flood", "stream flood");
  await chatRun("chat-tools", "stream tools");

  // C8b · a selection inside the growing reply holds its text through the
  // Run's final (a structural rebuild), then the final paints once on release.
  {
    const before = (await api(`/sessions/${started.sessionId}`)).runs.length;
    await evaluate(`(() => { const box = document.getElementById('composer-input'); box.focus(); box.value = 'stream slow'; box.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    await press("Enter");
    await sleep(1800);
    const held = await evaluate(`(() => {
      const body = [...document.querySelectorAll('#message-stream .message.assistant.pending .message-body > .markdown-body')].at(-1);
      const p = body.querySelector('p'); const range = document.createRange(); range.selectNodeContents(p);
      getSelection().removeAllRanges(); getSelection().addRange(range);
      window.__held = { text: getSelection().toString(), chars: body.textContent.length };
      return window.__held;
    })()`);
    const run = await waitTerminal(async () => started.sessionId, before);
    await sleep(1500);
    const during = await evaluate(`(() => {
      const row = [...document.querySelectorAll('#message-stream .message.assistant')].at(-1);
      const hint = row.querySelector('.stream-body-hint');
      return { selectionKept: getSelection().toString() === window.__held.text, chars: row.querySelector('.markdown-body').textContent.length, hint: hint && !hint.hidden ? hint.textContent : null, pending: row.classList.contains('pending') };
    })()`);
    await evaluate(`getSelection().removeAllRanges()`);
    await sleep(500);
    const after = await evaluate(`(() => {
      const row = [...document.querySelectorAll('#message-stream .message.assistant')].at(-1);
      const hint = row.querySelector('.stream-body-hint');
      return { chars: row.querySelector('.markdown-body').textContent.length, hint: hint && !hint.hidden ? hint.textContent : null };
    })()`);
    const final = (await api(`/sessions/${started.sessionId}`)).events.filter((e) => e.runId === run.id && e.type === "assistant.message").at(-1);
    report.checks = { ...(report.checks || {}), selectionAcrossFinal: { status: run.status, heldChars: held.chars, during, after, finalChars: final?.data.text.length } };
    console.log(`C8b selection across final: ${JSON.stringify(report.checks.selectionAcrossFinal)}`);
  }

  // Reduced motion: the same Run with prefers-reduced-motion emulated.
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await chatRun("chat-reduced-motion", "stream markdown", { during: sampleActivity });
  await send("Emulation.setEmulatedMedia", { features: [] });
  }

  // Attention: a new global conversation through its own composer.
  if (only !== "chat") {
  await resetProbe();
  await evaluate(`[...document.querySelectorAll('button, a')].find(b => b.textContent.trim() === 'Attention')?.click()`);
  await sleep(1500);
  const conversations = async () => (await api("/attention/conversations")).sessions ?? [];
  const beforeIds = new Set((await conversations()).map((s) => s.id));
  await evaluate(`(() => { const box = document.querySelector('dialog[open] input[aria-label="Message Attention"]'); box.focus(); box.value = 'stream sustained'; box.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await evaluate(`[...document.querySelectorAll('dialog[open] button')].find(b => b.getAttribute('aria-label') === 'Send to Attention').click()`);
  const attentionId = async () => (await conversations()).find((s) => !beforeIds.has(s.id))?.id ?? null;
  const run = await waitTerminal(attentionId, 0).catch(async (error) => {
    const state = await evaluate(`JSON.stringify({ dialog: Boolean(document.querySelector('dialog[open]')), value: document.querySelector('dialog[open] input[aria-label="Message Attention"]')?.value, text: document.querySelector('dialog[open]')?.innerText.slice(0, 300) })`);
    throw new Error(`${error.message}: ${state}`);
  });
  await sleep(2000);
  const measured = await evaluate("window.__streamMeasure.report()");
  report.scenarios["attention-sustained"] = { surface: "attention", input: "stream sustained", runId: run.id, status: run.status, ...measured };
  console.log(`attention-sustained: receive→DOM p50 ${measured.receiveToDom.p50} p95 ${measured.receiveToDom.p95} · max page ${Math.max(...measured.samples.map((s) => s.bytes))} B`);
  }
} finally {
  ws.close();
  const chromeExited = new Promise((resolve) => chrome.once("exit", resolve));
  chrome.kill("SIGTERM");
  await chromeExited;
  fixture.kill("SIGINT");
  await new Promise((resolve) => fixture.once("exit", resolve));
  // Join Host persist times with browser receipt by seq (same machine clock).
  try {
    const host = JSON.parse(await readFile(hostTimings, "utf8"));
    // `seq` is per Session, so the key is the Run and the seq.
    const persistedAt = new Map(host.map((row) => [`${row.runId}:${row.seq}`, row.persistedAt]));
    for (const scenario of Object.values(report.scenarios)) {
      const at = (seq) => persistedAt.get(`${scenario.runId}:${seq}`);
      const lags = scenario.samples.map((s) => at(s.maxSeq) !== undefined ? s.t - at(s.maxSeq) : null).filter((x) => x !== null).sort((a, b) => a - b);
      scenario.hostPersistToReceive = lags.length ? { p50: lags[Math.floor(lags.length / 2)], p95: lags[Math.min(lags.length - 1, Math.floor(lags.length * 0.95))], max: lags.at(-1) } : null;
    }
  } catch (error) { report.hostJoinError = String(error); }
  await writeFile(out, JSON.stringify(report, null, 1) + "\n");
  await rm(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
