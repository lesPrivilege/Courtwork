#!/usr/bin/env node
// Reader coarse targets (06d / F2) · real headless Chrome, the Host's own
// shipped stylesheets and preview-tabs module: the Preview tab close and the
// shared Version details summary, under a fine and an emulated coarse pointer.
// This measures the shipped CSS on the real markup; the full reading flow is
// Parent's capture. Author evidence only.
//
//   node app/scripts/reader-targets-browser.mjs [--chrome <path>]
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../server/index.mjs";

const DEFAULT_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runReaderTargetsBrowser({ chromePath = DEFAULT_CHROME } = {}) {
  const work = await mkdtemp(path.join(tmpdir(), "cw-reader-targets-"));
  const host = await startServer({ dataDir: path.join(work, "data"), port: 0, logger: () => {} });
  const chrome = spawn(chromePath, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${path.join(work, "profile")}`, "--no-first-run", "--no-default-browser-check", "--window-size=1440,900", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  try {
    const browserWs = await new Promise((resolve, reject) => {
      let buffer = "";
      chrome.stderr.on("data", (data) => { buffer += data; const match = /DevTools listening on (ws:\S+)/.exec(buffer); if (match) resolve(match[1]); });
      chrome.on("exit", () => reject(new Error("Chrome exited before DevTools was ready")));
    });
    const target = await (await fetch(`http://${new URL(browserWs).host}/json/new?about:blank`, { method: "PUT" })).json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let nextId = 1;
    const pending = new Map();
    ws.onmessage = (message) => { const data = JSON.parse(message.data); if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); } };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, (data) => (data.error ? reject(new Error(`${method}: ${data.error.message}`)) : resolve(data.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", { expression: `(async () => (${expression}))()`, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    await send("Page.enable");
    // Same origin as the Host so the shipped CSS and modules load as the app loads them.
    await send("Page.navigate", { url: `${host.url}/web/styles.css` });
    await sleep(300);
    await evaluate(`(async () => {
      document.open(); document.write('<!doctype html><html><head><link rel="stylesheet" href="/web/styles.css"><link rel="stylesheet" href="/web/surface-layout.css"></head><body><aside class="surface-panel"><header class="surface-header"><div id="surface-tabs" class="surface-tabs" role="tablist"></div></header><div class="surface-content"><details class="version-details"><summary>Version details</summary><div class="version-line"><code>0000</code></div></details></div></aside></body></html>'); document.close();
      await new Promise(r => setTimeout(r, 300));
      const { renderPreviewTabs } = await import('/web/preview-tabs.mjs');
      renderPreviewTabs(document.getElementById('surface-tabs'), {
        tabs: [{ key: 'file:a', id: 'tab-a', kind: 'file' }], activeKey: 'file:a',
        describe: () => ({ name: 'reader-measurements.md', full: 'out/reader-measurements.md', meta: 'Current' }),
        controls: () => 'surface-file', onSelect() {}, onClose() {},
      });
      return true;
    })()`);
    await sleep(300);
    const measure = () => evaluate(`(() => {
      const box = (n) => { const r = n.getBoundingClientRect(); return { w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100 }; };
      const close = document.querySelector('.surface-tab-close');
      const summary = document.querySelector('.version-details summary');
      return { coarse: matchMedia('(pointer: coarse)').matches, tabClose: box(close), tabCloseName: close.getAttribute('aria-label'), glyph: box(close.querySelector('svg') || close), versionSummary: box(summary), summaryMarker: getComputedStyle(summary).display };
    })()`);
    const fine = await measure();
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    await sleep(200);
    const coarse = await measure();
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });
    return { fine, coarse };
  } finally {
    chrome.kill();
    await host.close();
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf("--chrome");
  console.log(JSON.stringify(await runReaderTargetsBrowser(at > 0 ? { chromePath: process.argv[at + 1] } : {}), null, 2));
}
