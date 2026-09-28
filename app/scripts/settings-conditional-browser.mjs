#!/usr/bin/env node
// MS-R1 · the whole Settings page in a real headless Chrome against a
// disposable Host (fake provider, fresh data, no Session): rows and blocks a
// view hides for its own reasons stay hidden through the page's search and
// section switches, and search still filters and restores.
//
//   node app/scripts/settings-conditional-browser.mjs [--chrome <path>]
//
// Author evidence, not visual or accessibility acceptance.
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../server/index.mjs";

const DEFAULT_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runSettingsConditionalBrowser({ chromePath = DEFAULT_CHROME } = {}) {
  const work = await mkdtemp(path.join(tmpdir(), "cw-settings-conditional-"));
  const host = await startServer({ dataDir: path.join(work, "data"), port: 0, logger: () => {} });
  const chrome = spawn(chromePath, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${path.join(work, "profile")}`, "--no-first-run", "--no-default-browser-check", "--window-size=1440,900", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const record = { steps: [] };
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
    const waitFor = async (expression, label, timeout = 10_000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) { if (await evaluate(expression)) return; await sleep(80); }
      throw new Error(`timed out waiting for ${label}`);
    };
    await send("Page.enable");
    await send("Page.navigate", { url: `${host.url}/#settings/models` });
    const row = (title) => `[...document.querySelectorAll('#settings-models .settings-row')].find(r => r.querySelector('.settings-row-title')?.textContent === ${JSON.stringify(title)})`;
    await waitFor(`Boolean(${row("API key")}) && Boolean(${row("Model")}?.querySelector('select')?.options.length)`, "the Models form");
    const shown = (expression) => `(() => { const n = ${expression}; return n ? getComputedStyle(n).display !== 'none' && n.getClientRects().length > 0 : null; })()`;
    const read = () => evaluate(`({
      section: [...document.querySelectorAll('.settings-section')].find(s => !s.hidden)?.id ?? null,
      local: document.querySelector('#settings-models input[name="connection-path"][value="local"]')?.checked ?? null,
      apiKey: ${shown(row("API key"))},
      contextWindow: ${shown(row("Context window"))},
      effortValues: ${shown(row("Supported effort values"))},
      provider: ${shown(row("Provider"))},
      model: ${shown(row("Model"))},
      sessionPanel: document.getElementById('session-settings')?.hidden ?? null,
      searchMarks: document.querySelectorAll('[data-search-hidden]').length,
    })`);
    const search = async (text) => {
      await evaluate(`(() => { const input = document.getElementById('settings-search'); input.value = ${JSON.stringify(text)}; input.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
      await sleep(150);
    };
    const go = async (hash) => { await evaluate(`(location.hash = ${JSON.stringify(hash)}, true)`); await sleep(250); };
    const step = async (name) => { const value = await read(); record.steps.push({ name, ...value }); return value; };

    await step("local-in-force");
    await search("key");
    await step("search-key");
    await search("");
    await step("search-cleared");
    await go("#settings/general");
    await step("general");
    await go("#settings/models");
    await step("back-to-models");
    await evaluate(`(document.querySelector('[data-focus-key="connection:configure:catalog-deepseek"]').click(), true)`);
    await sleep(150);
    await step("deepseek-configured");
    await search("effort");
    await step("search-effort");
    await search("");
    await step("deepseek-search-cleared");
    await search("api key");
    await step("search-api-key");
    await search("");
    await step("deepseek-final");
    return record;
  } finally {
    chrome.kill();
    await host.close();
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf("--chrome");
  console.log(JSON.stringify(await runSettingsConditionalBrowser(at > 0 ? { chromePath: process.argv[at + 1] } : {}), null, 2));
}
