// WO-CS-01 · minimal headless Chromium driver over CDP (pattern of
// evidence/fe02-main-integration-20260909/browser.mjs). CS_CDP_PORT selects the
// debugging port; the browser profile is a fresh temp directory. CS_SCROLLBARS=1
// keeps classic scrollbars visible (default hides them, as earlier evidence did).
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CHROME = process.env.CS_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.CS_CDP_PORT || 19883);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function openBrowser() {
  const profile = await mkdtemp(path.join(process.env.CS_PROFILE_ROOT || tmpdir(), 'cs-cdp-'));
  const child = spawn(CHROME, [
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--headless=new', '--disable-gpu', ...(process.env.CS_SCROLLBARS === '1' ? [] : ['--hide-scrollbars']), '--no-first-run',
    '--window-size=1440,900', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore'] });
  let version = null;
  for (let i = 0; i < 100 && !version; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(150); }
  }
  if (!version) { child.kill(); throw Error('headless browser did not open a debugging port'); }
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej; });
  let id = 0; const pending = new Map(); const exceptions = [];
  socket.onmessage = (event) => {
    const m = JSON.parse(event.data);
    if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id); pending.delete(m.id);
      m.error ? reject(Error(JSON.stringify(m.error))) : resolve(m.result);
    }
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const mid = ++id; pending.set(mid, { resolve, reject });
    socket.send(JSON.stringify({ id: mid, method, params, sessionId }));
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const cdp = (m, p) => send(m, p, sessionId);
  await cdp('Page.enable'); await cdp('Runtime.enable');
  async function evaluate(expression) {
    const { result, exceptionDetails } = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw Error(exceptionDetails.text + ' ' + (exceptionDetails.exception?.description ?? ''));
    return result.value;
  }
  async function waitFor(expression, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) { const v = await evaluate(expression); if (v) return v; await sleep(100); }
    throw Error('Timed out: ' + expression);
  }
  async function key(keyName, code, keyCode, modifiers = 0, text = '') {
    await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: keyName, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers });
    if (text) await cdp('Input.dispatchKeyEvent', { type: 'char', text, key: keyName, modifiers });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers });
  }
  async function screenshot() {
    const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
    return Buffer.from(data, 'base64');
  }
  async function close() { socket.close(); child.kill(); }
  return { cdp, evaluate, waitFor, key, screenshot, close, exceptions, version };
}
