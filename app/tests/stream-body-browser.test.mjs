/* Order 3 frontend · STR-FE1: a growing reply resolves Markdown references
 * against the whole document, as the full renderer does. Runs the production
 * `createAssistantBody` and sanitizing `markdown()` in a real headless Chrome,
 * served by a disposable Host. Skips (and says so) when no Chrome is found;
 * set COURTWORK_CHROME to point at one. */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { startServer } from "../server/index.mjs";

const CHROME = process.env.COURTWORK_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function inBrowser(expression) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "cw-stream-body-"));
  const profile = await mkdtemp(path.join(tmpdir(), "cw-stream-body-chrome-"));
  const host = await startServer({ dataDir, port: 0, logger: () => {} });
  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  try {
    const wsUrl = await new Promise((resolve, reject) => {
      let buffer = "";
      chrome.stderr.on("data", (data) => { buffer += data; const match = /DevTools listening on (ws:\S+)/.exec(buffer); if (match) resolve(match[1]); });
      chrome.on("exit", () => reject(new Error("Chrome exited")));
    });
    const page = await (await fetch(`http://${new URL(wsUrl).host}/json/new?${host.url}/`, { method: "PUT" })).json();
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0;
    const pending = new Map();
    ws.onmessage = (message) => { const data = JSON.parse(message.data); pending.get(data.id)?.(data); pending.delete(data.id); };
    const send = (method, params) => new Promise((resolve) => { pending.set(++id, resolve); ws.send(JSON.stringify({ id, method, params })); });
    for (let i = 0; i < 50; i += 1) {
      const ready = await send("Runtime.evaluate", { expression: "document.readyState", returnByValue: true });
      if (ready.result?.result?.value === "complete") break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    ws.close();
    if (result.result?.exceptionDetails) throw new Error(result.result.exceptionDetails.exception?.description ?? "page error");
    return result.result.result.value;
  } finally {
    const exited = new Promise((resolve) => chrome.once("exit", resolve));
    chrome.kill("SIGTERM");
    await exited;
    await host.close();
    await rm(dataDir, { recursive: true, force: true });
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

test("a growing reply resolves references like the full document, and converges", { skip: existsSync(CHROME) ? false : `no Chrome at ${CHROME}` }, async (t) => {
  const report = await inBrowser(`(async () => {
    const { createAssistantBody } = await import('/web/stream-body.mjs');
    const { markdown } = await import('/web/ui-controls.mjs');
    const strip = (html) => html.replace(/ data-focus-key="[^"]*"/g, '');
    const canonical = (text) => strip(markdown(text, { key: 'k' }).innerHTML);
    const growing = (body) => strip(body.root.innerHTML);
    const out = {};

    // Definition before use.
    const before = createAssistantBody({ key: 'k' });
    const defFirst = '[ref]: https://example.com\\n\\nRead [the link][ref]\\n\\nMore text';
    before.update(defFirst);
    const link = before.root.querySelector('a');
    out.definitionBeforeUse = { anchorText: link?.textContent ?? null, href: link?.getAttribute('href') ?? null, equalsCanonical: growing(before) === canonical(defFirst) };

    // Definition arriving after the reference was already painted.
    const after = createAssistantBody({ key: 'k' });
    const early = '# Heading\\n\\nRead [the link][ref]\\n\\nNext';
    after.update(early);
    const heading = after.root.querySelector('h1');
    out.beforeDefinition = { literal: after.root.querySelector('p')?.textContent ?? null, anchors: after.root.querySelectorAll('a').length };
    const later = early + '\\n\\n[ref]: https://example.com\\n\\nTail';
    after.update(later);
    out.afterDefinition = { anchorText: after.root.querySelector('a')?.textContent ?? null, headingNodeKept: after.root.querySelector('h1') === heading, equalsCanonical: growing(after) === canonical(later) };

    // Settlement renders the final once and matches the full renderer.
    const final = later + '\\n\\nDone.';
    after.update(final, { settled: true });
    out.finalConverges = growing(after) === canonical(final);

    // The sanitizer still applies to reference links.
    const unsafe = createAssistantBody({ key: 'k' });
    const bad = '[x]: javascript:alert(1)\\n\\nClick [here][x]\\n\\nEnd';
    unsafe.update(bad);
    out.unsafe = { hrefs: [...unsafe.root.querySelectorAll('a')].map((a) => a.getAttribute('href')), equalsCanonical: growing(unsafe) === canonical(bad) };
    return out;
  })()`);
  t.diagnostic(`report ${JSON.stringify(report)}`);
  assert.deepEqual(report.definitionBeforeUse, { anchorText: "the link", href: "https://example.com", equalsCanonical: true });
  assert.deepEqual(report.beforeDefinition, { literal: "Read [the link][ref]", anchors: 0 }, "an undefined reference stays literal, as in the full renderer");
  assert.deepEqual(report.afterDefinition, { anchorText: "the link", headingNodeKept: true, equalsCanonical: true });
  assert.equal(report.finalConverges, true);
  assert.equal(report.unsafe.equalsCanonical, true);
  assert.ok(report.unsafe.hrefs.every((href) => href === null || /^https?:/i.test(href)), `no unsafe href: ${JSON.stringify(report.unsafe.hrefs)}`);
});
