/* CB-R1 · Copy code gives the code's own text: a fenced or indented block's
 * parsed token text (never an arbitrary trim of rendered DOM), and a raw HTML
 * <pre>'s own semantic text. Checked through both Markdown entry points — the
 * complete `markdown()` and the growing reply (`createAssistantBody`, growing
 * and settled) — in a real headless Chrome with the production sanitizer and
 * the real Copy click handler; `navigator.clipboard.writeText` is recorded,
 * so this proves the bytes requested, not OS clipboard persistence. Skips
 * without Chrome; set COURTWORK_CHROME. */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { startServer } from "../server/index.mjs";

const CHROME = process.env.COURTWORK_CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/* input → the text each Copy code button must request, in document order. */
export const CASES = [
  ["fenced", "```\nabc\n```", ["abc"]],
  ["fenced with a retained blank line", "```\nabc\n\n```", ["abc\n"]],
  ["fenced with trailing spaces", "```\nabc  \n```", ["abc  "]],
  ["raw pre", "<pre>abc\n</pre>", ["abc\n"]],
  ["raw pre code", "<pre><code>abc\n</code></pre>", ["abc\n"]],
  ["raw pre then the same fenced text", "<pre>abc\n</pre>\n\n```\nabc\n```", ["abc\n", "abc"]],
  ["multiple blocks and a nested list", "- item\n\n  ```sh\n  one\n  two\n  ```\n\n- next\n\n```js\nthree\n```\n\n    four\n", ["one\ntwo", "three", "four"]],
  ["indented", "Text\n\n    x = 1\n\n    y = 2\n", ["x = 1\n\ny = 2"]],
  ["Unicode and entities", "```\né 😀 &amp; <b>not bold</b> \\u00e9\n```", ["é 😀 &amp; <b>not bold</b> \\u00e9"]],
  ["blockquote", "> ```\n> quoted\n> ```", ["quoted"]],
];

async function inBrowser(expression) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "cw-copy-fidelity-"));
  const profile = await mkdtemp(path.join(tmpdir(), "cw-copy-fidelity-chrome-"));
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

export const PROBE = (cases) => `(async () => {
  const { markdown } = await import('/web/ui-controls.mjs');
  const { createAssistantBody } = await import('/web/stream-body.mjs');
  const original = navigator.clipboard.writeText;
  const written = [];
  navigator.clipboard.writeText = async (text) => { written.push(text); };
  const copies = async (root) => {
    document.body.append(root);
    const out = [];
    for (const button of root.querySelectorAll('.code-block button')) {
      written.length = 0;
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      out.push(written[0]);
    }
    root.remove();
    return out;
  };
  const results = {};
  try {
    for (const [name, text] of ${JSON.stringify(cases.map(([name, text]) => [name, text]))}) {
      const growing = createAssistantBody({ key: 'g' });
      // A growing reply paints its blocks incrementally; add a trailing
      // paragraph so every code block is a completed (reused) block too.
      growing.update(text + '\\n\\nmore');
      const growingCopies = await copies(growing.root);
      const settled = createAssistantBody({ key: 's' });
      settled.update(text, { settled: true });
      results[name] = {
        complete: await copies(markdown(text, { key: 'k' })),
        growing: growingCopies,
        settled: await copies(settled.root),
        titlesLeft: markdown(text, { key: 'k' }).querySelectorAll('pre[title]').length,
      };
    }
  } finally { navigator.clipboard.writeText = original; }
  return results;
})()`;

test("Copy code requests the code's own text from every Markdown entry point", { skip: existsSync(CHROME) ? false : `no Chrome at ${CHROME}` }, async (t) => {
  const results = await inBrowser(PROBE(CASES));
  t.diagnostic(`results ${JSON.stringify(results)}`);
  for (const [name, , expected] of CASES) {
    const result = results[name];
    assert.deepEqual(result.complete, expected, `${name}: complete markdown()`);
    assert.deepEqual(result.growing, expected, `${name}: growing reply`);
    assert.deepEqual(result.settled, expected, `${name}: settled reply`);
    assert.equal(result.titlesLeft, 0, `${name}: no copy marker is left in the page`);
  }
});

test("source HTML cannot claim a code block's copy text through a title", { skip: existsSync(CHROME) ? false : `no Chrome at ${CHROME}` }, async () => {
  const results = await inBrowser(PROBE([
    ["forged title", '<pre title="cw-code:0">raw\n</pre>\n\n```\nreal\n```'],
  ]));
  const result = results["forged title"];
  assert.deepEqual(result.complete, ["raw\n", "real"]);
  assert.deepEqual(result.growing, ["raw\n", "real"]);
});

/* The shared Markdown reader builds from its own parser (markdown-reader.mjs,
   profile cw-markdown-block-v1) and is out of CB-R1's scope. Its copy text for
   the same inputs is recorded beside the Markdown entry points for comparison
   only; the diagnostic is the evidence. */
test("reader comparison: the shared reader's copy text for the same inputs (recorded)", { skip: existsSync(CHROME) ? false : `no Chrome at ${CHROME}` }, async (t) => {
  const reader = await inBrowser(`(async () => {
    const { projectMarkdown, sha256Text } = await import('/web/markdown-source.mjs');
    const { createMarkdownReader } = await import('/web/markdown-reader.mjs');
    const original = navigator.clipboard.writeText;
    const written = [];
    navigator.clipboard.writeText = async (text) => { written.push(text); };
    const out = {};
    try {
      for (const [name, text] of ${JSON.stringify(CASES.map(([name, text]) => [name, text]))}) {
        const host = document.createElement('div');
        document.body.append(host);
        try {
          const projection = await projectMarkdown(text, { kind: 'content-version', sessionId: 's', runId: 'r', path: 'x.md', sha256: await sha256Text(text) });
          createMarkdownReader(host).render(projection);
          const copies = [];
          for (const button of host.querySelectorAll('.code-block button')) { written.length = 0; button.click(); await new Promise((r) => setTimeout(r, 0)); copies.push(written[0]); }
          out[name] = copies;
        } catch (error) { out[name] = 'error: ' + error.message; }
        host.remove();
      }
    } finally { navigator.clipboard.writeText = original; }
    return out;
  })()`);
  t.diagnostic(`reader ${JSON.stringify(reader)}`);
  // Markdown code agrees with the reader; the reader's profile renders no raw
  // HTML <pre> as a code block, so those have no Copy there.
  const READER_RAW = { "raw pre": [], "raw pre code": [], "raw pre then the same fenced text": ["abc"] };
  for (const [name, , expected] of CASES)
    assert.deepEqual(reader[name], READER_RAW[name] ?? expected, `${name}: reader`);
});
