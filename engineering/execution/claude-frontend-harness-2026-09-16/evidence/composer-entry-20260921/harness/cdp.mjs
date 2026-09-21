/* Evidence harness only. A minimal Chrome DevTools Protocol driver over the
 * WebSocket built into Node, so the author can write real PNGs without adding
 * a dependency. Chrome runs headless with its own throwaway profile directory;
 * the user's Chrome profile is never opened. */
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export async function launch({ port = 9333, profileRoot } = {}) {
  const profile = await mkdtemp(path.join(profileRoot || tmpdir(), "cw-capture-profile-"));
  const proc = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--hide-scrollbars", "--force-color-profile=srgb",
    "--font-render-hinting=none", "about:blank"], { stdio: "ignore" });
  let version;
  for (let i = 0; i < 100 && !version; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); } catch { await new Promise(r => setTimeout(r, 100)); }
  }
  if (!version) throw new Error("Chrome did not start");
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const waiting = new Map();
  ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && waiting.has(msg.id)) { const { res, rej } = waiting.get(msg.id); waiting.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const n = ++id; waiting.set(n, { res, rej }); ws.send(JSON.stringify({ id: n, method, params })); });
  await send("Page.enable"); await send("Runtime.enable");
  const page = {
    send,
    async viewport({ width, height, dpr = 1, dark = false }) {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: dpr, mobile: false });
      await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }] });
    },
    async goto(url) { await send("Page.navigate", { url }); await page.wait(1500); },
    async eval(expression) {
      const r = await send("Runtime.evaluate", { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result.value;
    },
    wait: (ms) => new Promise(r => setTimeout(r, ms)),
    async shot(file, { selector = null, pad = 12 } = {}) {
      let clip;
      if (selector) {
        const box = await page.eval(`const n=document.querySelector(${JSON.stringify(selector)}); if(!n) return null; const r=n.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height};`);
        if (!box) throw new Error(`no element for ${selector}`);
        clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + pad * 2, height: box.height + pad * 2, scale: 1 };
      }
      const r = await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip } : {}) });
      await writeFile(file, Buffer.from(r.data, "base64"));
    },
    async close() { try { ws.close(); } catch {} proc.kill(); },
  };
  return page;
}
