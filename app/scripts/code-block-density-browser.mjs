#!/usr/bin/env node
// CB-D1 · shared code-block composition in a real headless Chrome, against a
// disposable Host whose loopback fake provider answers with fixed Markdown.
// Measures the one-line command from the user's screenshot and a multiline
// block with a long line in Chat, in Attention and in the shared Markdown
// reader; checks exact clipboard bytes, keyboard focus/activation/feedback,
// selection, horizontal scroll and action/text overlap; and writes
// `record.json` plus screenshots.
//
//   node app/scripts/code-block-density-browser.mjs --out <dir> [--chrome <path>]
//
// Author evidence. Two 200% cases are EMULATIONS and are named so: "zoom" is a
// CSS viewport halved at DPR 2 (what browser zoom does to layout width), and
// "text" is the product's own `--text-scale: 2`. Neither is native browser
// zoom or OS text size; no screen reader or forced colours are exercised.
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { startServer } from "../server/index.mjs";
import { FAKE_CREDENTIAL_KEY } from "../runtime/pi-session-runtime.mjs";

const DEFAULT_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const KEYS = { Enter: 13, Tab: 9 };

/* The user's screenshot case, verbatim command, and a multiline block whose
   third line is far wider than any viewport here. */
export const ONE_LINE = "node --test --test-concurrency=1 tests/runtime-load-recovery.test.mjs";
export const MULTI = [
  "export function recover(store, runId) {",
  "  const run = store.getRun(runId);",
  `  if (!run) throw new Error(${JSON.stringify("x".repeat(40))} + " — a deliberately long line that must scroll horizontally, never wrap or clip: " + runId);`,
  "  return run.status;",
  "}",
].join("\n");
export const REPLY = ["From candidate `app/`:", "", "```", ONE_LINE, "```", "", "And the helper:", "", "```js", MULTI, "```", "", "Done."].join("\n");

function fakeResponder({ mode }) {
  if (!String(mode).startsWith("code sample")) return null;
  return { kind: "text", id: `cb-${randomUUID()}`, created: Math.floor(Date.now() / 1000), chunkMs: 0, text: REPLY };
}

export async function runCodeBlockDensity({ outDir, chromePath = DEFAULT_CHROME } = {}) {
  const work = await mkdtemp(path.join(tmpdir(), "cw-code-block-"));
  const host = await startServer({ dataDir: path.join(work, "data"), port: 0, fakeResponder, logger: () => {} });
  const headers = { "content-type": "application/json", "x-work-token": host.token };
  const api = async (method, route, body) => { const r = await fetch(`${host.url}/api/v5${route}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }); if (!r.ok) throw new Error(`${route} ${r.status}`); return r.json(); };
  await api("PUT", "/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
  const { version } = await api("GET", "/provider-config");
  await api("PUT", "/provider-config", { expectedVersion: version, provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions" });
  const { project } = await api("POST", "/projects", { name: "Code blocks" });
  const { session } = await api("POST", "/sessions", { projectId: project.id, title: "Code blocks" });
  const record = { expected: { oneLine: ONE_LINE, multi: MULTI }, cases: [] };
  if (outDir) await mkdir(outDir, { recursive: true });

  const chrome = spawn(chromePath, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${path.join(work, "profile")}`, "--no-first-run", "--no-default-browser-check", "--window-size=1440,900", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  try {
    const browserWs = await new Promise((resolve, reject) => {
      let buffer = "";
      chrome.stderr.on("data", (data) => { buffer += data; const match = /DevTools listening on (ws:\S+)/.exec(buffer); if (match) resolve(match[1]); });
      chrome.on("exit", () => reject(new Error("Chrome exited before DevTools was ready")));
    });
    const browser = new WebSocket(browserWs);
    await new Promise((resolve, reject) => { browser.onopen = resolve; browser.onerror = reject; });
    browser.send(JSON.stringify({ id: 1, method: "Browser.grantPermissions", params: { origin: host.url, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] } }));
    await sleep(200);
    const target = await (await fetch(`http://${new URL(browserWs).host}/json/new?about:blank`, { method: "PUT" })).json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let nextId = 1;
    const pending = new Map();
    const pageErrors = [];
    ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.id && pending.has(data.id)) { pending.get(data.id)(data); pending.delete(data.id); return; }
      if (data.method === "Runtime.exceptionThrown") pageErrors.push(data.params.exceptionDetails.exception?.description ?? data.params.exceptionDetails.text);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, (data) => (data.error ? reject(new Error(`${method}: ${data.error.message}`)) : resolve(data.result)));
      ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", { expression: `(async () => (${expression}))()`, awaitPromise: true, returnByValue: true, userGesture: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const key = async (name) => {
      for (const type of ["keyDown", "keyUp"])
        await send("Input.dispatchKeyEvent", { type, key: name, code: name, windowsVirtualKeyCode: KEYS[name], nativeVirtualKeyCode: KEYS[name], text: type === "keyDown" && name === "Enter" ? "\r" : undefined });
      await sleep(150);
    };
    const waitFor = async (expression, label, timeout = 15_000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) { if (await evaluate(expression)) return; await sleep(100); }
      throw new Error(`timed out waiting for ${label}`);
    };
    const shot = async (name, clipSelector) => {
      if (!outDir) return;
      await sleep(150);
      const clip = clipSelector ? await evaluate(`(() => { const n = document.querySelector(${JSON.stringify(clipSelector)}); if (!n) return null; n.scrollIntoView({ block: 'center' }); const r = n.getBoundingClientRect(); return { x: Math.max(0, r.left - 16), y: Math.max(0, r.top - 16), width: r.width + 32, height: r.height + 32, scale: 1 }; })()`) : null;
      const { data } = await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip } : {}) });
      await writeFile(path.join(outDir, `${name}.png`), Buffer.from(data, "base64"));
    };
    const viewport = async ({ width, height, dpr = 1, mobile = false, touch = false, scheme = "light" }) => {
      await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: dpr, mobile });
      await send("Emulation.setTouchEmulationEnabled", { enabled: touch, maxTouchPoints: touch ? 5 : 1 });
      await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
      await sleep(300);
    };

    /* Geometry, type and overlap for every code block inside `scope`. The copy
       action must never sit over the code's own box. */
    const measure = (scope) => evaluate(`(() => {
      const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
      const overlap = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      const blocks = [...document.querySelectorAll(${JSON.stringify(scope)} + ' .code-block')].filter(n => n.getClientRects().length);
      return blocks.map((block) => {
        const pre = block.querySelector('pre'), copy = block.querySelector('button'), bar = block.querySelector('.code-toolbar');
        const ps = getComputedStyle(pre), cs = copy && getComputedStyle(copy);
        const label = bar ? [...bar.childNodes].filter(n => n !== copy && !n.contains?.(copy)).map(n => n.textContent.trim()).filter(Boolean) : [];
        const preBox = box(pre), copyBox = box(copy);
        return {
          lines: pre.textContent.split('\\n').filter(Boolean).length,
          block: box(block), toolbar: box(bar), toolbarLabel: label, pre: preBox, copy: copyBox,
          copyName: copy?.getAttribute('aria-label') ?? copy?.textContent.trim() ?? null,
          copyOverPre: Boolean(overlap(preBox, copyBox)),
          code: { size: ps.fontSize, line: ps.lineHeight, family: ps.fontFamily.split(',')[0], padTop: ps.paddingTop, padLeft: ps.paddingLeft, whiteSpace: ps.whiteSpace },
          scroll: { scrollWidth: pre.scrollWidth, clientWidth: pre.clientWidth, overflowX: ps.overflowX },
          copyTarget: copyBox ? Math.min(copyBox.w, copyBox.h) : null, copyGlyph: box(copy?.querySelector('svg')),
          codeBeforeTop: preBox && block ? preBox.y - box(block).y : null,
        };
      });
    })()`);

    /* Keyboard: focus the code's Copy, press Enter, read the clipboard back
       exactly; the visible feedback and focus are recorded too. */
    const copyByKeyboard = (scope, index, expected) => evaluate(`(async () => {
      const block = [...document.querySelectorAll(${JSON.stringify(scope)} + ' .code-block')].filter(n => n.getClientRects().length)[${index}];
      const button = block.querySelector('button');
      await navigator.clipboard.writeText('sentinel');
      button.focus();
      return { focused: document.activeElement === button, focusVisible: button.matches(':focus-visible') };
    })()`).then(async (before) => {
      await key("Enter");
      await sleep(250);
      return evaluate(`(async () => {
        const block = [...document.querySelectorAll(${JSON.stringify(scope)} + ' .code-block')].filter(n => n.getClientRects().length)[${index}];
        const button = block.querySelector('button');
        const text = await navigator.clipboard.readText();
        return { ...${JSON.stringify(before)}, exact: text === ${JSON.stringify(expected)}, bytes: new TextEncoder().encode(text).length, expectedBytes: ${new TextEncoder().encode(expected).length}, feedback: button.getAttribute('aria-label') ?? button.textContent.trim(), stillFocused: document.activeElement === button };
      })()`);
    });

    /* Selecting the code itself selects exactly the code, and a scrolled long
       line keeps its end reachable with the action still off the code. */
    const selectAndScroll = (scope, index, expected) => evaluate(`(() => {
      const block = [...document.querySelectorAll(${JSON.stringify(scope)} + ' .code-block')].filter(n => n.getClientRects().length)[${index}];
      const pre = block.querySelector('pre'), copy = block.querySelector('button');
      const range = document.createRange(); range.selectNodeContents(pre);
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
      const selected = selection.toString();
      selection.removeAllRanges();
      pre.scrollLeft = pre.scrollWidth;
      const scrolledToEnd = Math.abs(pre.scrollLeft + pre.clientWidth - pre.scrollWidth) <= 1;
      const p = pre.getBoundingClientRect(), c = copy.getBoundingClientRect();
      const overlapAfterScroll = c.left < p.right && p.left < c.right && c.top < p.bottom && p.top < c.bottom;
      pre.scrollLeft = 0;
      return { selectedIsCode: selected.replace(/\\n$/, '') === ${JSON.stringify(expected)}, selectedHasChrome: /Copy/.test(selected), scrolledToEnd, overlapAfterScroll };
    })()`);

    await send("Page.enable");
    await send("Runtime.enable");
    await viewport({ width: 1440, height: 900 });
    await send("Page.navigate", { url: `${host.url}/` });
    await sleep(2500);
    await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Code blocks')?.click()`);
    await sleep(1200);
    await evaluate(`(() => { const box = document.getElementById('composer-input'); box.focus(); box.value = 'code sample'; box.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    await key("Enter");
    await waitFor(`document.querySelectorAll('#message-stream .message.assistant .code-block').length >= 2 && !document.querySelector('#message-stream .message.assistant.pending')`, "Chat reply with two code blocks");
    await sleep(800);

    const CHAT = "#message-stream .message.assistant";
    const scenarios = [
      ["desktop-1440-light", { width: 1440, height: 900 }],
      ["desktop-1440-dark", { width: 1440, height: 900, scheme: "dark" }],
      ["narrow-390-touch-light", { width: 390, height: 844, dpr: 2, mobile: true, touch: true }],
      ["narrow-390-touch-dark", { width: 390, height: 844, dpr: 2, mobile: true, touch: true, scheme: "dark" }],
      ["zoom-200-emulated-720", { width: 720, height: 450, dpr: 2 }],
    ];
    for (const [name, vp] of scenarios) {
      await viewport(vp);
      const entry = { surface: "chat", name, blocks: await measure(CHAT) };
      if (name === "desktop-1440-light" || name === "narrow-390-touch-light") {
        entry.copyOneLine = await copyByKeyboard(CHAT, 0, ONE_LINE);
        entry.copyMulti = await copyByKeyboard(CHAT, 1, MULTI);
        entry.selectScroll = [await selectAndScroll(CHAT, 0, ONE_LINE), await selectAndScroll(CHAT, 1, MULTI)];
      }
      record.cases.push(entry);
      await shot(`chat-${name}`, `${CHAT}:last-of-type .markdown-body`);
    }
    // Product text scale ×2 (emulation of large text, not OS text size).
    await viewport({ width: 1440, height: 900 });
    await evaluate(`document.documentElement.style.setProperty('--text-scale', '2')`);
    await sleep(200);
    record.cases.push({ surface: "chat", name: "text-scale-2-emulated", blocks: await measure(CHAT) });
    await shot("chat-text-scale-2-emulated", `${CHAT}:last-of-type .markdown-body`);
    await evaluate(`document.documentElement.style.removeProperty('--text-scale')`);

    // Attention: its own conversation, same reply.
    await evaluate(`[...document.querySelectorAll('button, a')].find(b => b.textContent.trim() === 'Attention')?.click()`);
    await sleep(1500);
    await evaluate(`(() => { const box = document.querySelector('dialog[open] input[aria-label="Message Attention"]'); box.focus(); box.value = 'code sample'; box.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
    await evaluate(`[...document.querySelectorAll('dialog[open] button')].find(b => b.getAttribute('aria-label') === 'Send to Attention').click()`);
    const ATTN = "dialog[open] .attention-agent-message.is-assistant";
    await waitFor(`document.querySelectorAll(${JSON.stringify(ATTN + " .code-block")}).length >= 2`, "Attention reply with two code blocks", 30_000);
    await sleep(1600);
    for (const [name, vp] of [["desktop-1440-light", { width: 1440, height: 900 }], ["narrow-390-touch-dark", { width: 390, height: 844, dpr: 2, mobile: true, touch: true, scheme: "dark" }]]) {
      await viewport(vp);
      const entry = { surface: "attention", name, blocks: await measure(ATTN) };
      if (name === "desktop-1440-light") entry.copyOneLine = await copyByKeyboard(ATTN, 0, ONE_LINE);
      record.cases.push(entry);
      await shot(`attention-${name}`, `${ATTN}:last-of-type`);
    }
    await evaluate(`document.querySelector('dialog[open]')?.close()`);

    // The shared Markdown reader, on the same document, in the real page.
    await viewport({ width: 1440, height: 900 });
    await evaluate(`(async () => {
      const { projectMarkdown, sha256Text } = await import('/web/markdown-source.mjs');
      const { createMarkdownReader } = await import('/web/markdown-reader.mjs');
      const text = ${JSON.stringify(REPLY)};
      const projection = await projectMarkdown(text, { kind: 'content-version', sessionId: 's', runId: 'r', path: 'notes.md', sha256: await sha256Text(text) });
      const host = document.createElement('div');
      host.id = 'cb-reader-host';
      host.style.cssText = 'position:fixed;inset:24px;z-index:9999;overflow:auto;background:var(--panel);padding:var(--space-4)';
      document.body.append(host);
      createMarkdownReader(host).render(projection);
      return true;
    })()`);
    await sleep(400);
    for (const [name, vp] of [["desktop-1440-light", { width: 1440, height: 900 }], ["narrow-390-touch-dark", { width: 390, height: 844, dpr: 2, mobile: true, touch: true, scheme: "dark" }]]) {
      await viewport(vp);
      const entry = { surface: "reader", name, blocks: await measure("#cb-reader-host") };
      if (name === "desktop-1440-light") entry.copyOneLine = await copyByKeyboard("#cb-reader-host", 0, ONE_LINE);
      record.cases.push(entry);
      await shot(`reader-${name}`, "#cb-reader-host .code-block");
    }
    record.pageErrors = pageErrors;
    record.browser = (await send("Browser.getVersion")).product;
    ws.close();
    browser.close();
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
  const record = await runCodeBlockDensity({ outDir: path.resolve(outDir), chromePath: arg("--chrome") ?? process.env.COURTWORK_CHROME ?? DEFAULT_CHROME });
  for (const entry of record.cases) for (const [i, b] of entry.blocks.entries())
    console.log(`${entry.surface} ${entry.name} #${i}: block ${b.block.h} toolbar ${b.toolbar?.h ?? "-"} pre ${b.pre.h} copy ${b.copy?.w}×${b.copy?.h} over ${b.copyOverPre} code ${b.code.size}/${b.code.line} scroll ${b.scroll.scrollWidth}>${b.scroll.clientWidth}`);
  console.log(JSON.stringify({ pageErrors: record.pageErrors }));
}
