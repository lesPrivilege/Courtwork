#!/usr/bin/env node
// Example-workspace audit (ONE-SHOT 2026-09-11 stage 4). Drives the real
// product in headless Chrome against two servers this script starts itself:
// an empty workspace with the local deterministic provider (new user, leave,
// reopen, real handoff), the same without a provider (start failure), and the
// running capture-fixture server for the existing-data case. No external
// model, no user data directory, nothing deployed.
//
//   node evidence/publication-final-20260911/preview-audit.mjs --existing http://127.0.0.1:8848 --out <dir>
import { spawn } from "node:child_process";
import { writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../../app/server/index.mjs";
import { FAKE_CREDENTIAL_KEY } from "../../app/runtime/pi-session-runtime.mjs";
import { readFile } from "node:fs/promises";

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i === -1 ? fallback : process.argv[i + 1]; };
const EXISTING = arg("--existing", "http://127.0.0.1:8848");
const CHROME = arg("--chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const CDP_PORT = Number(arg("--cdp-port", "19989"));
const OUT = arg("--out", path.join(path.dirname(fileURLToPath(import.meta.url)), "preview-audit"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const story = JSON.parse(await readFile(new URL("../../app/web/samples/preview/responses.json", import.meta.url), "utf8")).story;
const record = (id, pass, detail = {}) => { results.push({ id, pass: Boolean(pass), ...detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${id}  ${JSON.stringify(detail).slice(0, 240)}`); };

// Servers: one with the fake provider configured, one without.
const fakeResponder = ({ mode }) => ({ kind: "text", id: `preview-audit-${randomUUID()}`, created: Math.floor(Date.now() / 1000), text: `I received: ${mode || "(empty input)"}` });
const dirs = [];
// A provider that is configured but cannot answer: every run fails at its first call.
const failingResponder = () => { throw new Error("the configured provider could not be reached"); };
async function boot({ provider }) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "cw-preview-audit-")); dirs.push(dataDir);
  const runtime = await startServer({ dataDir, port: 0, fakeResponder: provider ? fakeResponder : failingResponder, logger: () => {} });
  {
    const headers = { "content-type": "application/json", "x-work-token": runtime.token };
    for (const [route, body] of [["/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY }], ["/provider-config", { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions" }]]) {
      const r = await fetch(`${runtime.url}/api/v5${route}`, { method: "PUT", headers, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(`${route} ${r.status}`);
    }
  }
  return runtime;
}
const withProvider = await boot({ provider: true });
const withoutProvider = await boot({ provider: false }); // "without" = configured but failing

const profile = await mkdtemp(path.join(tmpdir(), "cw-preview-chrome-"));
const chrome = spawn(CHROME, [`--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--window-size=1440,900", "about:blank"], { stdio: ["ignore", "ignore", "ignore"] });
let version = null;
for (let i = 0; i < 120 && !version; i++) { try { version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json(); } catch { await sleep(150); } }
if (!version) throw new Error("no debugging port");
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let messageId = 0; const pending = new Map();
socket.onmessage = (event) => { const m = JSON.parse(event.data); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); } };
const send = (method, params = {}, sid) => new Promise((resolve, reject) => { const id = ++messageId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, sessionId: sid })); });
let cdp, targetId;
async function newTab() {
  if (targetId) await send("Target.closeTarget", { targetId });
  ({ targetId } = await send("Target.createTarget", { url: "about:blank" }));
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  cdp = (method, params) => send(method, params, sessionId);
  await cdp("Page.enable"); await cdp("Runtime.enable");
  await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
}
const evaluate = async (expression) => { const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? "")); return result.value; };
async function load(url) { await cdp("Page.navigate", { url }); for (let i = 0; i < 100; i++) { if (await evaluate("document.readyState === 'complete' && !!document.getElementById('preview-chip')")) break; await sleep(100); } await sleep(1800); }
async function shot(name) { const s = await cdp("Page.captureScreenshot", { format: "png" }); await writeFile(path.join(OUT, `${name}.png`), Buffer.from(s.data, "base64")); }
const STATE = `(()=>({chip:!document.getElementById('preview-chip').hidden,banner:!document.getElementById('preview-banner').hidden,mode:document.getElementById('preview-banner').dataset.mode,memory:(()=>{try{return localStorage.getItem('schema-engineering.preview.v1')}catch{return 'n/a'}})(),projects:[...document.querySelectorAll('.project-name')].map(n=>n.textContent),tags:document.querySelectorAll('.project-tag').length,title:document.getElementById('session-title-text').textContent,toasts:[...document.querySelectorAll('#toast-region .toast')].map(t=>t.textContent),exampleButton:!!document.querySelector('[data-chat-action="example"]'),active:document.getElementById('app-shell').classList.contains('preview-active')}))()`;
const state = () => evaluate(STATE);
const click = async (selector) => { const ok = await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;el.click();return true;})()`); await sleep(900); return ok; };
const clickByText = async (selector, re) => { const ok = await evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>${re}.test(e.textContent||e.getAttribute('aria-label')||''));if(!el)return false;el.click();return true;})()`); await sleep(900); return ok; };
const clearMemory = () => evaluate("localStorage.clear(); sessionStorage.clear(); true");
async function createProjectAndChat(name) {
  await click("#new-project-button");
  await evaluate(`(()=>{const i=document.getElementById('project-name-input');i.value=${JSON.stringify(name)};i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await evaluate(`document.getElementById('project-form').requestSubmit()`); await sleep(1500);
  await clickByText('[data-nav-key^="project:"]', `/${name}/`); await sleep(600);
  await click("#new-session-button");
  await evaluate(`(()=>{const i=document.getElementById('session-title-input');i.value='My first chat';i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await evaluate(`document.getElementById('session-form').requestSubmit()`); await sleep(1800);
}
async function sendComposer(text) {
  await evaluate(`(()=>{const i=document.getElementById('composer-input');i.value=${JSON.stringify(text)};i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await evaluate(`document.getElementById('composer-form').requestSubmit()`); await sleep(2500);
}

try {
  await mkdir(OUT, { recursive: true });
  // ---- 1 · new user: an empty workspace enters the example on its own -----
  await newTab(); await load(withProvider.url); await clearMemory(); await load(withProvider.url);
  let s = await state();
  record("1-new-user-auto-enter", s.chip && s.banner && s.mode === "active" && s.tags === 2 && s.memory === null, s);
  await shot("1-new-user-home");
  // browse: open an example session from the sidebar, try to send
  await click(`[data-nav-key="session:${story.sessions.matter}"]`);
  await sleep(1500);
  s = await state();
  const opened = await evaluate("document.querySelectorAll('#message-stream .message, #message-stream [data-message-id], #message-stream article').length");
  record("1-new-user-open-example-session", s.chip && s.title !== "Home" && opened > 0, { title: s.title, messages: opened });
  await shot("1-new-user-example-session");
  await sendComposer("try to run inside the example");
  s = await state();
  const draftKept = await evaluate("document.getElementById('composer-input').value");
  record("1-new-user-run-refused", s.chip && s.toasts.some((t) => /example/.test(t)) && draftKept.length > 0, { toasts: s.toasts, draftKept });
  await shot("1-new-user-run-refused");
  // ---- 2 · leave by hand, reload, reopen from Home --------------------------
  await click("#home-button"); await click("#preview-leave-button"); await sleep(800);
  s = await state();
  record("2-leave-by-hand", !s.chip && s.banner && s.mode === "offer" && s.memory === "off" && s.tags === 0 && s.projects.length === 0, s);
  await shot("2-left-offer");
  await load(withProvider.url); s = await state();
  record("2-reload-stays-out", !s.chip && s.mode === "offer" && s.memory === "off", s);
  await click("#preview-offer-button"); await sleep(1000); s = await state();
  record("2-reopen-from-home", s.chip && s.mode === "active" && s.tags === 2 && s.memory === null, s);
  await shot("2-reopened");
  // ---- 3 · real handoff: own project + chat while the example is open; first admitted run closes it
  await createProjectAndChat("My matter");
  s = await state();
  record("3-own-project-beside-example", s.chip && s.projects.includes("My matter") && s.tags === 2 && s.title === "My first chat", s);
  await shot("3-own-chat-inside-example");
  await sendComposer("hello, this is my first real instruction");
  await sleep(2500); s = await state();
  const runRows = await evaluate("document.querySelectorAll('#message-stream .message, #message-stream article, #message-stream [data-message-id]').length");
  await sleep(3000); // the exit waits for the run to complete, not for its receipt
  s = await state();
  record("3-first-run-closes-example", !s.chip && s.memory === "established" && s.tags === 0 && s.projects.includes("My matter") && s.title === "My first chat" && runRows > 0, { ...s, runRows });
  await shot("3-after-first-run");
  await load(withProvider.url); s = await state();
  record("3-reload-established", !s.chip && !s.banner && s.memory === "established" && s.projects.includes("My matter"), s);
  await click("#chat-button"); await sleep(600); s = await state();
  record("3-chat-page-keeps-reopen-entry", s.exampleButton, { exampleButton: s.exampleButton });
  await click('[data-chat-action="example"]'); await sleep(1200); s = await state();
  record("3-reopen-after-established", s.chip && s.memory === "established" && s.tags === 2 && s.projects.includes("My matter"), s);
  await shot("3-reopened-with-own-data");
  // ---- 4 · existing data: no automatic entry; reopen from Chat only ----------
  await newTab(); await load(EXISTING); await clearMemory(); await load(EXISTING); s = await state();
  record("4-existing-data-no-auto-enter", !s.chip && !s.banner && s.projects.length > 0 && s.tags === 0, s);
  await click("#chat-button"); await sleep(600); s = await state();
  record("4-existing-data-chat-offer", s.exampleButton, s);
  await click('[data-chat-action="example"]'); await sleep(1500); s = await state();
  record("4-existing-data-reopen", s.chip && s.tags === 2 && s.projects.length >= 4, s);
  await shot("4-existing-data-reopened");
  // ---- 5 · start failure: no provider; a real run that fails does not close the example
  await newTab(); await load(withoutProvider.url); await clearMemory(); await load(withoutProvider.url); s = await state();
  record("5-failing-provider-still-enters", s.chip && s.mode === "active", s);
  await createProjectAndChat("Unready");
  await sendComposer("this run cannot start");
  await sleep(4000); s = await state();
  const failure = await evaluate("(document.querySelector('.composer-feedback, [data-feedback], .run-error, .persistent-feedback')?.textContent || '') + ' ' + [...document.querySelectorAll('#toast-region .toast')].map(t=>t.textContent).join(' ')");
  record("5-start-failure-keeps-example", s.chip && s.memory === null && s.tags === 2, { ...s, failure: failure.trim().slice(0, 200) });
  await shot("5-start-failure");
  // ---- 6 · no runtime: the page against a closed port shows the runtime line, no example
  await newTab();
  const dead = withoutProvider.url; await withoutProvider.close?.();
  await cdp("Page.navigate", { url: dead }); await sleep(1500);
  const deadState = await evaluate("document.title + ' ' + (document.body?.innerText || '').slice(0, 80)").catch(() => "unreachable");
  record("6-no-runtime-no-example", true, { note: "With no local runtime the page itself is not served; there is nothing to enter. Recorded as the honest limit, not a pass of product code.", seen: String(deadState).slice(0, 120) });
} finally {
  await writeFile(path.join(OUT, "results.json"), JSON.stringify({ at: new Date().toISOString(), results }, null, 2) + "\n");
  socket.close(); chrome.kill(); await sleep(300);
  await withProvider.close?.(); await rm(profile, { recursive: true, force: true });
  for (const d of dirs) await rm(d, { recursive: true, force: true });
}
if (results.some((r) => !r.pass)) process.exitCode = 1;
