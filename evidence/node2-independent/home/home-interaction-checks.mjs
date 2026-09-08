// WK6 · the removed text removed no function. Real headless Chromium over CDP;
// every server call is the app's own /api/v5 traffic.
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const ORIGIN = process.env.WK6_BASE ?? "http://127.0.0.1:8853";
const CHROME = process.env.CHROME_BIN ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const PORT = Number(process.env.WK6_CDP_PORT ?? 9335);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = await mkdtemp(path.join(tmpdir(), "wk6-interaction-"));
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
const send = (method, params = {}, sid) => new Promise((resolve, reject) => {
  const id = ++messageId; pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params, sessionId: sid }));
});
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const cdp = (m, p) => send(m, p, sessionId);
await cdp("Page.enable"); await cdp("Runtime.enable"); await cdp("Input.enable").catch(() => {});
async function evaluate(expression) {
  const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? ""));
  return result.value;
}
// Real key events, so the app's own keydown handling decides.
async function key({ text = "", code, keyCode, modifiers = 0 }) {
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", code, key: text || code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers });
  if (text) await cdp("Input.dispatchKeyEvent", { type: "char", text, modifiers });
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", code, key: text || code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers });
}
const results = [];
const check = (name, pass, actual) => results.push({ name, pass, actual });

await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await cdp("Page.navigate", { url: `${ORIGIN}/` });
await sleep(2500);

// 1 · the one conditional sentence is visible only while no project exists
const noProject = await evaluate(`JSON.stringify({ projects: window.__V5_UI__.state.projects.length, hidden: document.getElementById('home-start-status').hidden, text: document.getElementById('home-start-status').textContent })`);
check("no project · the conditional sentence is shown", JSON.parse(noProject).hidden === false && JSON.parse(noProject).text === "Choose or create a project to send.", JSON.parse(noProject));

// 2 · a draft typed before the project exists survives creating one
const DRAFT = "WK6 draft that must survive project creation";
await evaluate(`(() => { const i = document.getElementById('composer-input'); i.focus(); i.value = ${JSON.stringify(DRAFT)}; i.dispatchEvent(new Event('input', { bubbles: true })); return 'typed'; })()`);
await evaluate("document.getElementById('home-create-project').click(); 'opened'");
await sleep(500);
await evaluate(`(() => { const n = document.getElementById('project-name-input'); n.value = 'WK6 interaction'; n.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('project-form').requestSubmit(document.querySelector('#project-form button.primary-button')); return 'submitted'; })()`);
for (let i = 0; i < 40; i++) {
  if (JSON.parse(await evaluate("JSON.stringify({p: window.__V5_UI__.state.projects.length})")).p > 0) break;
  await sleep(300);
}
await sleep(600);
const afterProject = JSON.parse(await evaluate(`JSON.stringify({ projects: window.__V5_UI__.state.projects.length, hidden: document.getElementById('home-start-status').hidden, draft: document.getElementById('composer-input').value })`));
check("a project exists · the sentence disappears", afterProject.projects > 0 && afterProject.hidden === true, afterProject);
check("draft retained across project creation", afterProject.draft === DRAFT, { draft: afterProject.draft });

// 3 · Shift+Enter still inserts a newline, Enter still sends
await evaluate("document.getElementById('composer-input').focus(); document.getElementById('composer-input').setSelectionRange(9999,9999); 'focused'");
await key({ text: "\r", code: "Enter", keyCode: 13, modifiers: 8 }); // shift
await sleep(300);
const afterShift = JSON.parse(await evaluate(`JSON.stringify({ value: document.getElementById('composer-input').value, runs: window.__V5_UI__.state.runs.length, view: window.__V5_UI__.state.view })`));
check("Shift+Enter inserts a newline and sends nothing", afterShift.value.includes("\n") && afterShift.view === "home", afterShift);

await key({ text: "\r", code: "Enter", keyCode: 13, modifiers: 0 });
for (let i = 0; i < 60; i++) {
  if (JSON.parse(await evaluate("JSON.stringify({v: window.__V5_UI__.state.view, s: window.__V5_UI__.state.activeSessionId})")).s) break;
  await sleep(300);
}
const afterEnter = JSON.parse(await evaluate(`JSON.stringify({ view: window.__V5_UI__.state.view, session: window.__V5_UI__.state.activeSessionId, runs: window.__V5_UI__.state.runs.map((r) => r.status) })`));
check("Enter sends: one session and one run were admitted", Boolean(afterEnter.session) && afterEnter.runs.length === 1, afterEnter);

// 4 · tab order inside the composer, and Escape order on a layer
await evaluate("document.getElementById('home-button').click(); 'home'");
await sleep(1200);
await evaluate(`(() => { const i = document.getElementById('composer-input'); i.value = 'order probe'; i.dispatchEvent(new Event('input', { bubbles: true })); return 'typed'; })()`);
await sleep(300);
const order = JSON.parse(await evaluate(`JSON.stringify([...document.getElementById('composer-form').querySelectorAll('textarea, select, button')].filter((e) => !e.disabled && e.offsetParent !== null).map((e) => e.id || e.className))`));
check("Send is the last focusable control in the composer", order.at(-1) === "send-button", { order });

await evaluate("document.getElementById('model-settings-button').click(); 'opened'");
await sleep(400);
const popoverOpen = await evaluate("document.getElementById('connection-popover').matches(':popover-open')");
await key({ code: "Escape", keyCode: 27 });
await sleep(400);
const popoverClosed = await evaluate("!document.getElementById('connection-popover').matches(':popover-open')");
check("Escape closes the topmost layer only", popoverOpen === true && popoverClosed === true, { popoverOpen, popoverClosed });

console.log(JSON.stringify(results, null, 1));
socket.close(); child.kill();
await rm(profile, { recursive: true, force: true });
const failed = results.filter((r) => !r.pass);
console.error(failed.length ? `FAIL ${failed.length}/${results.length}` : `PASS ${results.length}/${results.length}`);
if (failed.length) process.exitCode = 1;
