// CC-W · copied verbatim from evidence/cc-s/, port only (8899→8901, 8900→8902, CDP 19925 起→19960 起). 断言一字未动；本单新增断言见 composition-checks.mjs 的 WORK-5…9 / SHELL-4 / SHELL-5 与 fe-t07.mjs 的 CC-W 五条。
// CC-S · copied verbatim from evidence/fe04/, port only (8897→8899, 8898→8900, CDP 19905→19925 起).
// FE-03 · copied verbatim from evidence/fe02-main-integration-20260909/, port only.
// FE-02 · copied verbatim from evidence/fe01/, port only.
// FE-01 · copied verbatim from evidence/wk13-main-integration-20260908/browser.mjs;
// only the default origin and debugging port differ.
// WK6 · the removed text removed no function. Real headless Chromium over CDP;
// every server call is the app's own /api/v5 traffic.
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const ORIGIN = process.env.APP_URL ?? "http://127.0.0.1:8901";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.env.WK6_CDP_PORT ?? 19960);
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
const observations = { responses: [], exceptions: [] };
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej; });
let messageId = 0; const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Network.responseReceived") { const r=message.params.response; observations.responses.push({url:r.url,status:r.status,mime:r.mimeType}); }
  if (message.method === "Runtime.exceptionThrown") observations.exceptions.push(message.params.exceptionDetails);
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

export { cdp, evaluate, key, ORIGIN, sleep, observations };
export async function close() { socket.close(); child.kill(); }
export async function waitFor(expression, timeout = 15000) {
 const start = Date.now();
 while(Date.now()-start < timeout) { const value = await evaluate(expression); if(value) return value; await sleep(100); }
 throw new Error('Timed out: '+expression);
}
