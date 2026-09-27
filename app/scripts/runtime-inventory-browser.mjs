#!/usr/bin/env node
// 06c production I1 · Settings → Agents → Runtimes in a real headless Chrome,
// against a disposable Host (fake provider, fresh data directory, no Session).
// The app bootstraps its own token, so every read is the authenticated
// production path. It drives the page by keyboard over the Chrome DevTools
// Protocol, fails one inventory read on purpose and recovers, checks 1440 and
// 390 CSS px in light and dark, and writes `record.json` plus screenshots.
//
//   node app/scripts/runtime-inventory-browser.mjs --out <dir> [--chrome <path>]
//
// Author evidence, not independent visual or accessibility acceptance:
// emulated viewports are not native zoom, and no screen reader or forced
// colours are exercised here.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../server/index.mjs";

const DEFAULT_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const KEYS = { Enter: 13, Tab: 9, Escape: 27 };

export async function runRuntimeInventoryBrowser({ outDir, chromePath = DEFAULT_CHROME } = {}) {
  const work = await mkdtemp(path.join(tmpdir(), "cw-runtime-inventory-"));
  const dataDir = path.join(work, "data");
  const host = await startServer({ dataDir, port: 0, logger: () => {} });
  const stateFile = path.join(dataDir, "runtime-state.json");
  const digest = async () => { try { return createHash("sha256").update(await readFile(stateFile)).digest("hex"); } catch { return "absent"; } };
  const sessionsVia = async () => (await (await fetch(`${host.url}/api/v5/sessions`, { headers: { "x-work-token": host.token } })).json()).sessions?.length ?? null;
  const record = { host: { sessionsBefore: await sessionsVia() }, steps: [] };
  const beforeDigest = await digest();
  if (outDir) await mkdir(outDir, { recursive: true });

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
    const handlers = new Map();
    ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); return; }
      if (data.method) handlers.get(data.method)?.(data.params);
    };
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
    const key = async (name, modifiers = 0) => {
      for (const type of ["keyDown", "keyUp"])
        await send("Input.dispatchKeyEvent", { type, key: name, code: name, modifiers, windowsVirtualKeyCode: KEYS[name], nativeVirtualKeyCode: KEYS[name], text: type === "keyDown" && name === "Enter" ? "\r" : undefined });
      await sleep(120);
    };
    const waitFor = async (expression, label, timeout = 10_000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) { if (await evaluate(expression)) return; await sleep(80); }
      throw new Error(`timed out waiting for ${label}`);
    };
    const shot = async (name) => {
      if (!outDir) return;
      await sleep(200);
      const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      await writeFile(path.join(outDir, `${name}.png`), Buffer.from(data, "base64"));
    };
    const byTestId = (id) => `[...document.querySelectorAll('[data-testid]')].find(n => n.getAttribute('data-testid') === ${JSON.stringify(id)})`;
    const focused = () => evaluate(`document.activeElement?.getAttribute('data-focus-key') ?? document.activeElement?.id ?? document.activeElement?.tagName`);
    const panel = `document.getElementById('settings-agents')`;
    const readPanel = () => evaluate(`({
      tabSelected: document.getElementById('settings-tab-agents')?.getAttribute('aria-selected'),
      panelHidden: ${panel}.hidden,
      rows: [...${panel}.querySelectorAll('[data-testid^="runtime-row:"]')].map(n => n.innerText.replace(/\\s+/g, ' ').trim()),
      status: ${byTestId("reading-status")}?.innerText.trim() ?? null,
      error: ${byTestId("reading-error")}?.innerText.trim() ?? null,
      buttons: [...${panel}.querySelectorAll('button')].map(b => b.getAttribute('data-testid')),
    })`);
    /* Anything wider than its panel or the viewport, inside the Agents panel. */
    const overflow = () => evaluate(`(() => {
      const width = document.documentElement.clientWidth;
      const box = ${panel}.getBoundingClientRect();
      const wide = [...${panel}.querySelectorAll('*')].filter(n => { const r = n.getBoundingClientRect(); return r.width && (r.right > Math.min(width, box.right) + 1 || n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflowX === 'visible'); }).map(n => n.tagName + (n.dataset.testid ? '[' + n.dataset.testid + ']' : '')).slice(0, 8);
      return { viewport: width, pageScrollWidth: document.documentElement.scrollWidth, panelRight: Math.round(box.right), wide };
    })()`);
    const step = (name, value) => { record.steps.push({ name, ...value }); return value; };

    const runtimeInfoRequests = [];
    handlers.set("Network.requestWillBeSent", (params) => {
      if (params.request.url.includes("/runtime-info")) runtimeInfoRequests.push({ url: new URL(params.request.url).pathname + new URL(params.request.url).search, token: Boolean(params.request.headers["X-Work-Token"]) });
    });
    const failed = [];
    handlers.set("Fetch.requestPaused", (params) => {
      failed.push(new URL(params.request.url).pathname);
      void send("Fetch.failRequest", { requestId: params.requestId, errorReason: "ConnectionRefused" });
    });
    await send("Page.enable");
    await send("Network.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });

    // 1 · A deep link into the group before any Session exists.
    await send("Page.navigate", { url: `${host.url}/#settings/agents` });
    await waitFor(`${panel} && ${panel}.querySelectorAll('[data-testid^="runtime-row:"]').length >= 2`, "runtime rows");
    step("list", { ...(await readPanel()), runtimeInfoRequests: [...runtimeInfoRequests] });
    await shot("list-1440-light");

    // 2 · Keyboard: Refresh → Tab → the first Details → Enter → Back → Enter.
    await evaluate(`${byTestId("refresh")}.focus()`);
    await key("Tab");
    const onRow = await focused();
    await key("Enter");
    await waitFor(`!!${byTestId("runtime-detail")}`, "runtime detail");
    const afterOpen = await focused();
    const detail = await evaluate(`({
      runtime: ${byTestId("runtime-name")}.innerText,
      status: [...${byTestId("status")}.children].map(n => n.innerText),
      operations: [...(${byTestId("operations")}?.children ?? [])].map(n => n.innerText),
      buttons: [...${panel}.querySelectorAll('button')].map(b => b.getAttribute('data-testid')),
    })`);
    step("detail-by-keyboard", { focusOnRow: onRow, focusAfterOpen: afterOpen, ...detail });
    await shot("detail-1440-light");
    await evaluate(`${byTestId("disclosure:technical")}.open = true`);
    step("technical", { overflow: await overflow() });
    await shot("detail-technical-1440-light");
    await evaluate(`${byTestId("back")}.focus()`);
    await key("Enter");
    await waitFor(`!!${byTestId("runtime-list")}`, "list again");
    step("back-by-keyboard", { focusAfterBack: await focused() });

    // 3 · A failed refresh keeps the rows and says so; the next refresh recovers.
    await send("Fetch.enable", { patterns: [{ urlPattern: "*runtime-info*" }] });
    await evaluate(`${byTestId("refresh")}.focus()`);
    await key("Enter");
    await waitFor(`!!${byTestId("reading-error")}`, "reading error");
    step("refresh-failed", { ...(await readPanel()), failedRequests: [...failed], focus: await focused() });
    await shot("refresh-failed-1440-light");
    await send("Fetch.disable");
    await key("Enter");
    await waitFor(`!${byTestId("reading-error")} && ${byTestId("reading-status")}?.dataset.status === 'ready'`, "recovered reading");
    step("refresh-recovered", { ...(await readPanel()), focus: await focused() });

    // 4 · Narrow and dark.
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
    await sleep(300);
    step("list-390-dark", { overflow: await overflow(), ...(await readPanel()) });
    await shot("list-390-dark");
    await evaluate(`[...document.querySelectorAll('[data-testid^="row-action:"]')].at(-1).focus()`);
    await key("Enter");
    await waitFor(`!!${byTestId("runtime-detail")}`, "narrow detail");
    await evaluate(`${byTestId("disclosure:technical")}.open = true`);
    step("detail-390-dark", { overflow: await overflow(), focus: await focused() });
    await shot("detail-390-dark");
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    step("detail-390-light", { overflow: await overflow() });
    await shot("detail-390-light");
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
    await shot("detail-1440-dark");

    // 5 · Escape leaves Settings; coming back finds the same runtime.
    await evaluate(`${byTestId("back")}.focus()`);
    await key("Escape");
    const left = await evaluate(`({ hash: location.hash, settingsHidden: document.getElementById('settings-page').hidden })`);
    await evaluate(`location.hash = '#settings/agents'`);
    await waitFor(`!document.getElementById('settings-page').hidden`, "settings again");
    await sleep(400);
    step("escape-and-return", { left, returned: { detailShown: await evaluate(`!!${byTestId("runtime-detail")}`), runtime: await evaluate(`${byTestId("runtime-name")}?.innerText ?? null`) } });

    record.runtimeInfoRequests = runtimeInfoRequests;
    record.host.sessionsAfter = await sessionsVia();
    record.host.stateUnchanged = (await digest()) === beforeDigest;
    record.browser = (await send("Browser.getVersion")).product;
    ws.close();
  } finally {
    const exited = new Promise((resolve) => chrome.once("exit", resolve));
    chrome.kill("SIGTERM");
    await exited;
    await host.close();
    await rm(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
  if (outDir) await writeFile(path.join(outDir, "record.json"), `${JSON.stringify(record, null, 2)}\n`);
  return record;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (name) => { const i = process.argv.indexOf(name); return i === -1 ? undefined : process.argv[i + 1]; };
  const outDir = arg("--out");
  if (!outDir) throw new Error("--out <dir> is required");
  const record = await runRuntimeInventoryBrowser({ outDir: path.resolve(outDir), chromePath: arg("--chrome") ?? process.env.COURTWORK_CHROME ?? DEFAULT_CHROME });
  console.log(JSON.stringify(record, null, 2));
}
