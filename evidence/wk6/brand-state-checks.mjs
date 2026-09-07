// WK6 · DOM assertions that the brand symbol follows host facts.
// Fixtures are created only through the app's own /api/v5 routes; the page is a
// real headless Chromium driven over CDP with Node's built-in WebSocket. No
// package is installed and no credential file is read.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const ORIGIN = process.env.WK6_BASE ?? "http://127.0.0.1:8853";
const API = `${ORIGIN}/api/v5`;
const CHROME = process.env.CHROME_BIN ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const PORT = Number(process.env.WK6_CDP_PORT ?? 9334);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const boot = await (await fetch(`${API}/bootstrap`)).json();
const token = boot.sessionToken;
async function api(method, p, body) {
  const res = await fetch(API + p, {
    method,
    headers: { "content-type": "application/json", "x-work-token": token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

const stamp = Date.now();
const { project } = await api("POST", "/projects", { name: `WK6 brand ${stamp}` });
const { session } = await api("POST", "/sessions", {
  projectId: project.id, title: `Brand mapping ${stamp}`, permissionMode: "ask",
});

// --- browser ---------------------------------------------------------------
const profile = await mkdtemp(path.join(tmpdir(), "wk6-brand-"));
const child = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  "--window-size=1440,900", "about:blank",
], { stdio: ["ignore", "ignore", "ignore"] });
let version = null;
for (let i = 0; i < 80 && !version; i++) {
  try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(150); }
}
if (!version) { child.kill(); throw new Error("headless browser did not open a debugging port"); }
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej; });
let messageId = 0; const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id); pending.delete(message.id);
    message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
  }
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++messageId; pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params, sessionId }));
});
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const cdp = (m, p) => send(m, p, sessionId);
await cdp("Page.enable"); await cdp("Runtime.enable");
async function evaluate(expression) {
  const { result, exceptionDetails } = await cdp("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.text + " " + JSON.stringify(exceptionDetails.exception?.description ?? ""));
  return result.value;
}
await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await cdp("Page.navigate", { url: `${ORIGIN}/` });
await sleep(2500);

const OBSERVER = `
window.__wk6 = { facts: [], plays: [] };
const symbol = document.getElementById('session-presence-symbol');
const snap = () => ({ t: Date.now(), activity: symbol.getAttribute('activity'), authority: symbol.getAttribute('authority'), presence: symbol.getAttribute('presence'), hidden: symbol.hidden });
window.__wk6.facts.push(snap());
new MutationObserver((records) => {
  for (const record of records) {
    if (record.attributeName === 'data-playing') {
      const verb = symbol.getAttribute('data-playing');
      if (verb) window.__wk6.plays.push(verb);
    } else window.__wk6.facts.push(snap());
  }
}).observe(symbol, { attributes: true });
window.__wk6.read = () => ({ activity: symbol.getAttribute('activity'), authority: symbol.getAttribute('authority'), presence: symbol.getAttribute('presence'), hidden: symbol.hidden, label: symbol.getAttribute('label'), material: symbol.getAttribute('material'), size: symbol.getAttribute('size'), svg: symbol.shadowRoot && { activity: symbol.shadowRoot.querySelector('svg').dataset.activity, authority: symbol.shadowRoot.querySelector('svg').dataset.authority, presence: symbol.shadowRoot.querySelector('svg').dataset.presence } });
'true'`;

const openSession = `(async () => {
  const row = [...document.querySelectorAll('.home-row')].find((b) => b.textContent.includes(${JSON.stringify(`Brand mapping ${stamp}`)}));
  if (!row) return 'no row';
  row.click();
  return 'clicked';
})()`;

const results = [];
const record = (name, actual, expected) => {
  let pass = true;
  for (const [key, value] of Object.entries(expected)) if (actual?.[key] !== value) pass = false;
  results.push({ name, expected, actual, pass });
  return pass;
};

// 1 · a session with no run
await evaluate(OBSERVER);
assert.equal(await evaluate(openSession), "clicked");
await sleep(1500);
record("no run · idle, no authority, present", await evaluate("window.__wk6.read()"), {
  activity: "idle", authority: "none", presence: "present", hidden: false, material: "mono", size: "16",
});

// 2 · a run that reads, then asks to write, sent from the app's own composer
const sendFromComposer = (text) => `(() => {
  const input = document.getElementById('composer-input');
  input.value = ${JSON.stringify(text)};
  input.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('composer-form').requestSubmit();
  return 'sent';
})()`;
assert.equal(await evaluate(sendFromComposer('/fixture script [{"name":"ws_list","arguments":{}},{"name":"ws_write","arguments":{"path":"notes.md","text":"wk6 fixture"}}]')), "sent");
for (let i = 0; i < 60; i++) {
  const now = await evaluate("window.__wk6.read()");
  if (now.authority === "requested") break;
  await sleep(400);
}
record("pending permission · authority requested, waiting is not thinking", await evaluate("window.__wk6.read()"), {
  authority: "requested", activity: "idle", presence: "present",
});
const midway = await evaluate("JSON.stringify(window.__wk6)");
const seenThinking = JSON.parse(midway).facts.some((f) => f.activity === "thinking");
results.push({ name: "run running · activity thinking observed in the fact log", expected: { thinking: true }, actual: { thinking: seenThinking }, pass: seenThinking });
const playsBefore = JSON.parse(midway).plays;
results.push({ name: "session open plays summon; a permission card plays scope", expected: { summon: true, scope: true }, actual: { summon: playsBefore.includes("summon"), scope: playsBefore.includes("scope"), all: playsBefore }, pass: playsBefore.includes("summon") && playsBefore.includes("scope") });

// 3 · allow the write
const detail = await api("GET", `/sessions/${session.id}`);
const opened = detail.events.filter((e) => e.type === "permission.open").at(-1);
const runId = opened.runId;
await api("POST", `/runs/${runId}/questions/${opened.data.id}`, { decision: "allow" });
for (let i = 0; i < 60; i++) {
  const now = await evaluate("window.__wk6.read()");
  if (now.authority === "scoped" && now.activity === "complete") break;
  await sleep(400);
}
record("allowed write, run finished · authority scoped, activity complete", await evaluate("window.__wk6.read()"), {
  authority: "scoped", activity: "complete", presence: "present",
});
record("shadow SVG carries the same facts", (await evaluate("window.__wk6.read()")).svg, {
  authority: "scoped", activity: "complete", presence: "present",
});

// 4 · a denied write on a second run
assert.equal(await evaluate(sendFromComposer('/fixture script [{"name":"ws_write","arguments":{"path":"notes.md","text":"wk6 denied"}}]')), "sent");
for (let i = 0; i < 60; i++) {
  if ((await evaluate("window.__wk6.read()")).authority === "requested") break;
  await sleep(400);
}
const detail2 = await api("GET", `/sessions/${session.id}`);
const opened2 = detail2.events.filter((e) => e.type === "permission.open").at(-1);
await api("POST", `/runs/${opened2.runId}/questions/${opened2.data.id}`, { decision: "deny" });
for (let i = 0; i < 60; i++) {
  if ((await evaluate("window.__wk6.read()")).authority === "revoked") break;
  await sleep(400);
}
record("denied write · authority revoked", await evaluate("window.__wk6.read()"), { authority: "revoked" });

// 5 · a run that only emits text plays write; a run that only reads plays retrieve
await evaluate("window.__wk6.plays.length = 0");
assert.equal(await evaluate(sendFromComposer("Summarise the fixture.")), "sent");
for (let i = 0; i < 60; i++) {
  if (JSON.parse(await evaluate("JSON.stringify(window.__wk6.plays)")).includes("write")) break;
  await sleep(300);
}
let plays = JSON.parse(await evaluate("JSON.stringify(window.__wk6.plays)"));
results.push({ name: "a run emitting output plays write once", expected: { write: 1 }, actual: { write: plays.filter((v) => v === "write").length, all: plays }, pass: plays.filter((v) => v === "write").length === 1 });

await evaluate("window.__wk6.plays.length = 0");
assert.equal(await evaluate(sendFromComposer('/fixture script [{"name":"ws_list","arguments":{}}]')), "sent");
for (let i = 0; i < 60; i++) {
  if (JSON.parse(await evaluate("JSON.stringify(window.__wk6.plays)")).includes("retrieve")) break;
  await sleep(300);
}
plays = JSON.parse(await evaluate("JSON.stringify(window.__wk6.plays)"));
results.push({ name: "a read-like tool.start plays retrieve", expected: { retrieve: true }, actual: { all: plays }, pass: plays.includes("retrieve") });

// 6 · leaving the session plays withdraw and the mark goes away
await evaluate("window.__wk6.plays.length = 0");
await evaluate("document.getElementById('home-button').click(); 'clicked'");
await sleep(1200);
plays = JSON.parse(await evaluate("JSON.stringify(window.__wk6.plays)"));
const afterHome = await evaluate("window.__wk6.read()");
results.push({ name: "session close plays withdraw and hides the mark", expected: { withdraw: true, hidden: true }, actual: { withdraw: plays.includes("withdraw"), hidden: afterHome.hidden, all: plays }, pass: plays.includes("withdraw") && afterHome.hidden === true });

// 7 · presence follows the connection, not the run. The page is taken offline
// at the network layer, so the app's own failure path decides; nothing is
// injected into its state.
await evaluate(`(() => {
  const row = [...document.querySelectorAll('.home-row')].find((b) => b.textContent.includes(${JSON.stringify(`Brand mapping ${stamp}`)}));
  row.click();
  return 'reopened';
})()`);
await sleep(1600);
await evaluate(sendFromComposer('/fixture script [{"name":"ws_write","arguments":{"path":"presence.md","text":"presence check"}}]'));
for (let i = 0; i < 60; i++) {
  if ((await evaluate("window.__wk6.read()")).authority === "requested") break;
  await sleep(300);
}
await cdp("Network.enable");
await cdp("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
for (let i = 0; i < 40; i++) {
  if ((await evaluate("window.__wk6.read()")).presence === "absent") break;
  await sleep(300);
}
record("connection lost · presence absent while the run fact is unchanged", await evaluate("window.__wk6.read()"), { presence: "absent", authority: "requested" });
await cdp("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
for (let i = 0; i < 40; i++) {
  if ((await evaluate("window.__wk6.read()")).presence === "present") break;
  await sleep(400);
}
record("connection restored · presence present", await evaluate("window.__wk6.read()"), { presence: "present" });


// 5 · the connection, not the run, owns presence
const playsAll = JSON.parse(await evaluate("JSON.stringify(window.__wk6.plays)"));
results.push({ name: "no verb looped: every play is one of the five wired verbs", expected: { subsetOfFive: true }, actual: { plays: playsAll }, pass: playsAll.every((v) => ["summon", "write", "retrieve", "scope", "withdraw"].includes(v)) });

console.log(JSON.stringify({ sessionId: session.id, results }, null, 1));
socket.close(); child.kill();
await rm(profile, { recursive: true, force: true });
const failed = results.filter((r) => !r.pass);
if (failed.length) { console.error(`FAIL ${failed.length}/${results.length}`); process.exitCode = 1; }
else console.error(`PASS ${results.length}/${results.length}`);
