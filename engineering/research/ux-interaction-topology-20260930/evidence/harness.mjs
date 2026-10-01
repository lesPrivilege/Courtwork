// The capture harness shared by this audit's evidence scripts: a disposable Host
// started in-process (as in app/scripts/settings-conditional-browser.mjs), seeded
// only through the app's own API, and headless Chrome over CDP (after
// engineering/design/chat-controls-2026-09-10/inventory/captures/capture.mjs).
// The local fake provider only; no model call is made.
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../../../../app/server/index.mjs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Which product source a capture ran against: the commit, the tree of `app/`
// at that commit, and, when `app/` has uncommitted changes, their paths and
// the hash of the exact diff. A report without this cannot be tied to the
// source it claims to show (engineering/verification.md, delivery evidence).
export function sourceIdentity() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const uncommitted = git("status", "--porcelain", "--", "app").split("\n").filter(Boolean).map((line) => line.slice(3));
  return {
    commit: git("rev-parse", "HEAD").trim(),
    productTree: git("rev-parse", "HEAD:app").trim(),
    uncommittedProductPaths: uncommitted,
    ...(uncommitted.length ? { uncommittedProductDiffSha256: createHash("sha256").update(git("diff", "HEAD", "--", "app")).digest("hex") } : {}),
  };
}

export async function openHarness({ outDir: defaultOutDir, prefix = "cw-ux-topology-capture-" }) {
  // `--out-dir <dir>` captures somewhere else, e.g. to compare a re-run with the kept captures.
  const argOut = process.argv.indexOf("--out-dir");
  const outDir = argOut > 0 ? path.resolve(process.argv[argOut + 1]) : defaultOutDir;
  const source = sourceIdentity();
  const argDir = process.argv.indexOf("--data-dir");
  const work = argDir > 0 ? process.argv[argDir + 1] : await mkdtemp(path.join(tmpdir(), prefix));
  await mkdir(outDir, { recursive: true });
  const host = await startServer({ dataDir: path.join(work, "data"), port: 0, logger: () => {} });
  const origin = host.url;

  const boot = await (await fetch(`${origin}/api/v5/bootstrap`)).json();
  async function call(p, init = {}) {
    const res = await fetch(`${origin}/api/v5${p}`, { ...init, headers: { "content-type": "application/json", "x-work-token": boot.sessionToken, ...(init.headers || {}) } });
    const text = await res.text();
    if (!res.ok) throw new Error(`${p} ${res.status} ${text}`);
    return text ? JSON.parse(text) : null;
  }
  async function until(check, timeout = 20000) {
    const start = Date.now();
    for (;;) {
      const value = await check();
      if (value) return value;
      if (Date.now() - start > timeout) throw new Error("seed: timed out waiting");
      await sleep(100);
    }
  }

  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${path.join(work, "profile")}`, "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "--window-size=1440,900", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const browserWs = await new Promise((resolve, reject) => {
    let buffer = "";
    chrome.stderr.on("data", (data) => { buffer += data; const match = /DevTools listening on (ws:\S+)/.exec(buffer); if (match) resolve(match[1]); });
    chrome.on("exit", () => reject(new Error("Chrome exited before DevTools was ready")));
  });
  const socket = new WebSocket(browserWs);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let messageId = 0;
  const pending = new Map();
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
  const { sessionId: cdpSession } = await send("Target.attachToTarget", { targetId, flatten: true });
  const cdp = (method, params) => send(method, params, cdpSession);
  await cdp("Page.enable"); await cdp("Runtime.enable");

  async function evaluate(expression) {
    const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression: `(async () => (${expression}))()`, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? ""));
    return result.value;
  }
  async function waitFor(expression, label, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) { if (await evaluate(expression)) return; await sleep(100); }
    throw new Error(`timed out waiting for ${label}`);
  }
  return {
    // `host` is the in-process Host (its fakeProvider serves the local test endpoint).
    host, origin, call, until, cdp, evaluate, waitFor,
    click: (selector) => evaluate(`(document.querySelector(${JSON.stringify(selector)})?.click(), true)`),
    open: (id) => `document.getElementById(${JSON.stringify(id)})?.matches(':popover-open')`,
    async closeAll() {
      await evaluate(`([...document.querySelectorAll(':popover-open')].forEach((node) => node.hidePopover()), document.activeElement?.blur?.(), true)`);
      await sleep(150);
    },
    async variant(width, height, scheme) {
      await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: width < 768 ? 2 : 1, mobile: width < 768 });
      await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
      await sleep(300);
    },
    async shot(name) {
      await sleep(250);
      const { data } = await cdp("Page.captureScreenshot", { format: "png" });
      await writeFile(path.join(outDir, `${name}.png`), Buffer.from(data, "base64"));
    },
    // A control's box, and whether its visible label is cut (the rendered text is wider than its box).
    layout: (selector) => evaluate(`(() => { const n = document.querySelector(${JSON.stringify(selector)}); if (!n) return null; const r = n.getBoundingClientRect(); const label = n.querySelector('.button-label'); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), visible: r.width > 0 && getComputedStyle(n).display !== 'none', label: label && getComputedStyle(label).display !== 'none' ? label.textContent : null, cut: label ? label.scrollWidth > label.clientWidth || label.getBoundingClientRect().width + 0.5 < (() => { const range = document.createRange(); range.selectNodeContents(label); return range.getBoundingClientRect().width; })() : null }; })()`),
    // The report beside the captures, with the source it ran against.
    writeReport: (report) => writeFile(path.join(outDir, "report.json"), `${JSON.stringify({ source, capturedAt: new Date().toISOString(), ...report }, null, 2)}\n`),
    popoverBox: () => evaluate(`(() => { const n = document.querySelector(':popover-open'); if (!n) return null; const r = n.getBoundingClientRect(); return { id: n.id, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })()`),
    async close() {
      socket.close();
      chrome.kill();
      await host.close();
    },
  };
}
