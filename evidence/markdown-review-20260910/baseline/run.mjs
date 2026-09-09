/* Synthetic, browser-executed baseline for app/web/ui-controls.mjs::markdown(). */
import { createServer } from "node:http";
import { readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn, execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../..");
const appWeb = join(repo, "app/web");
const port = Number(process.env.MARKDOWN_BASELINE_PORT || 8976);
const cdpPort = Number(process.env.MARKDOWN_BASELINE_CDP_PORT || 20276);
const chrome = process.env.CHROME_BIN || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const cdpTimeoutMs = Number(process.env.MARKDOWN_BASELINE_CDP_TIMEOUT_MS || 5000);
const resultPath = join(here, "results.json");
const corpus = JSON.parse(await readFile(join(here, "cases.json"), "utf8"));
const revisions = JSON.parse(await readFile(join(here, "revision-pairs.json"), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sourcePaths = ["app/web/ui-controls.mjs", "app/web/vendor/marked.mjs", "app/web/vendor/purify.mjs"];
function withTimeout(promise, timeoutMs, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}
async function sourceBinding() {
  const files = await Promise.all(sourcePaths.map(async (path) => ({ path, sha256: sha256(await readFile(join(repo, path))) })));
  const gitHead = await withTimeout(new Promise((resolve, reject) => execFile("git", ["rev-parse", "HEAD"], { cwd: repo }, (error, stdout) => error ? reject(error) : resolve(stdout.trim()))), cdpTimeoutMs, "git rev-parse HEAD");
  return { gitHead, files };
}

function portIsFree(candidate) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", (error) => reject(new Error(`Port ${candidate} is unavailable: ${error.code || error.message}`)));
    probe.listen(candidate, "127.0.0.1", () => probe.close(() => resolve()));
  });
}
const mime = { ".html": "text/html; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };
function allowedFile(url) {
  const pathname = new URL(url, "http://fixture.invalid").pathname;
  if (pathname === "/fixture.html") return join(here, "fixture.html");
  if (!pathname.startsWith("/web/")) return null;
  const candidate = normalize(join(appWeb, pathname.slice("/web/".length)));
  return candidate.startsWith(`${appWeb}/`) || candidate === appWeb ? candidate : null;
}
async function startServer() {
  await portIsFree(port);
  const server = createServer(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405).end(); return; }
    const file = allowedFile(req.url || "/");
    if (!file) { res.writeHead(404).end("not found"); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch { res.writeHead(404).end("not found"); }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  return server;
}
async function openBrowser() {
  await portIsFree(cdpPort);
  const profile = await mkdtemp(join(tmpdir(), "courtwork-markdown-baseline-"));
  const child = spawn(chrome, [
    `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${profile}`, "--headless=new", "--disable-gpu", "--no-first-run", "--window-size=1280,900", "about:blank",
  ], { stdio: "ignore" });
  let socket = null;
  async function cleanup() {
    try { socket?.close(); } catch {}
    if (child.exitCode === null && child.signalCode === null) {
      const exited = new Promise((resolve) => child.once("exit", resolve));
      child.kill();
      await Promise.race([exited, sleep(3000)]);
    }
    await rm(profile, { recursive: true, force: true });
  }
  let launchError = null;
  child.on("error", (error) => { launchError ||= error; });
  child.once("exit", (code, signal) => { launchError ||= new Error(`Chrome exited before CDP was ready (code ${code}, signal ${signal})`); });
  try {
    let version;
    for (let attempt = 0; attempt < 80 && !version; attempt++) {
      if (launchError) break;
      try { version = await (await fetch(`http://127.0.0.1:${cdpPort}/json/version`, { signal: AbortSignal.timeout(1000) })).json(); } catch { await sleep(125); }
    }
    if (!version) throw new Error(`Chrome did not expose CDP${launchError ? `: ${launchError.message}` : ""}`);
    socket = new WebSocket(version.webSocketDebuggerUrl);
    await withTimeout(new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = () => reject(new Error("CDP WebSocket connection failed")); }), cdpTimeoutMs, "CDP WebSocket connection");
    let sequence = 0; const pending = new Map(); const exceptions = [];
    const rejectPending = (error) => {
      for (const [id, request] of pending) { clearTimeout(request.timer); pending.delete(id); request.reject(error); }
    };
    socket.onclose = () => rejectPending(new Error("CDP WebSocket closed"));
    socket.onerror = () => rejectPending(new Error("CDP WebSocket error"));
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.text);
      if (message.id && pending.has(message.id)) {
        const request = pending.get(message.id); pending.delete(message.id); clearTimeout(request.timer);
        message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result);
      }
    };
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP ${method} timed out after ${cdpTimeoutMs}ms`)); }, cdpTimeoutMs);
      pending.set(id, { resolve, reject, timer });
      try { socket.send(JSON.stringify({ id, method, params, sessionId })); } catch (error) { clearTimeout(timer); pending.delete(id); reject(error); }
    });
    const { targetId } = await send("Target.createTarget", { url: `http://127.0.0.1:${port}/fixture.html` });
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const cdp = (method, params = {}) => send(method, params, sessionId);
    await cdp("Page.enable"); await cdp("Runtime.enable");
    async function evaluate(expression) {
      const value = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (value.exceptionDetails) throw new Error(value.exceptionDetails.text || "Runtime.evaluate failed");
      return value.result.value;
    }
    for (let attempt = 0; attempt < 80; attempt++) {
      if (await evaluate("typeof window.renderMarkdown === 'function'")) break;
      await sleep(50);
      if (attempt === 79) throw new Error("Fixture module did not load");
    }
    return { evaluate, exceptions, browserVersion: version.Browser, close: cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
function longSource({ targetBytes, unit }) { let source = ""; while (Buffer.byteLength(source, "utf8") < targetBytes) source += unit; return source; }
const browserChecks = `
(() => {
 const root = document.querySelector('.markdown-body');
 const rows = (selector) => root.querySelectorAll(selector).length;
 const link = root.querySelector('a[href^="https://"]');
 return {
  tags: ['h1','h2','ul','ol','pre','code','table','thead','tbody','tr','th','td'].reduce((all, tag) => ({...all, [tag]: rows(tag)}), {}),
  paragraphTexts: [...root.querySelectorAll('p')].map((p) => p.textContent),
  textContent: root.textContent,
  html: root.innerHTML,
  code: [...root.querySelectorAll('pre')].map((pre) => pre.textContent),
  toolbar: [...root.querySelectorAll('.code-toolbar')].map((node) => node.textContent),
  codeBlockText: [...root.querySelectorAll('.code-block')].map((node) => node.textContent),
  tableWrappers: rows('.table-scroll'),
  images: rows('img'), scripts: rows('script'),
  links: [...root.querySelectorAll('a')].map((a) => ({ text: a.textContent, href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel') })),
  pwned: window.__markdownPwned
 };
})()`;
function assert(condition, description, failures) { if (!condition) failures.push(description); }
function verifyCase(id, view, failures) {
  if (id === "gfm-structure") {
    assert(view.tags.h1 === 1 && view.tags.h2 === 1, "headings", failures); assert(view.tags.ul === 2 && view.tags.ol === 1, "nested lists", failures); assert(view.tags.table === 1 && view.tableWrappers === 1, "table wrapper", failures); assert(view.tags.pre === 1 && view.tags.code === 1, "fenced code", failures); assert(view.code[0] === "const answer = 42;" + String.fromCharCode(10), "code payload exact", failures);
  }
  if (id === "unicode-inline") {
    assert(view.textContent.includes("法院") && view.textContent.includes("👩🏽‍💻⚖️") && view.textContent.includes("é"), "unicode preserved", failures); assert(view.html.includes("<strong>strong</strong>") && view.html.includes("<em>emphasis</em>") && view.html.includes("<del>deleted</del>"), "inline formatting", failures); assert(!view.textContent.includes("**strong**"), "visible text differs from source markup", failures); assert(view.links[0]?.rel === "noopener noreferrer", "https rel", failures);
  }
  if (id === "paragraphs-repeated") assert(view.paragraphTexts.length === 4 && view.paragraphTexts[0] === view.paragraphTexts[1] && view.paragraphTexts[2] !== view.paragraphTexts[3], "repeated and cross-paragraph structure", failures);
  if (id === "unsafe-inputs") {
    assert(view.pwned === null && view.scripts === 0 && view.images === 0, "no executable raw script/image", failures); assert(view.links.filter((link) => !["plain HTTP", "secure HTTPS"].includes(link.text)).every((link) => link.href === null), "non-HTTP(S) href removed", failures); assert(view.links.find((link) => link.text === "plain HTTP")?.href === "http://plain.example.test/x" && view.links.find((link) => link.text === "plain HTTP")?.rel === "noopener noreferrer", "http link retained and hardened", failures); assert(view.links.find((link) => link.text === "secure HTTPS")?.href === "https://safe.example.test/x" && view.links.find((link) => link.text === "secure HTTPS")?.rel === "noopener noreferrer", "https link retained and hardened", failures);
  }
  if (id === "unsupported-syntax") {
    assert(view.images === 0, "no image renderer", failures); assert(view.textContent.includes("$x^2$") && view.textContent.includes("Footnote marker[^1]."), "math and footnote not rendered", failures); assert(view.code[0]?.includes("graph TD"), "mermaid retained as code", failures); assert(view.links[0]?.href === null, "relative asset removed", failures);
  }
  if (id.startsWith("incomplete-")) assert(view.pwned === null && view.scripts === 0 && view.images === 0, "incomplete syntax remains non-executable", failures);
}
async function main() {
  const startedAt = new Date().toISOString(); let server; let browser;
  const result = { format: 1, kind: "browser-executed-markdown-baseline", startedAt, source: { renderer: "app/web/ui-controls.mjs#markdown", corpus: "cases.json", revisionPairs: "revision-pairs.json", gitHead: null, files: [] }, environment: { node: process.version, platform: process.platform, arch: process.arch, port, cdpPort, cdpTimeoutMs, chrome }, cases: [], revisionFixture: {}, longDocument: {}, failures: [] };
  try {
    Object.assign(result.source, await sourceBinding());
    server = await startServer(); browser = await openBrowser(); result.environment.browserVersion = browser.browserVersion;
    for (const entry of corpus.cases) {
      const encoded = JSON.stringify(entry.markdown); const key = JSON.stringify(entry.id);
      await browser.evaluate(`window.__markdownPwned = null; window.renderMarkdown(${encoded}, ${key}); true`);
      const view = await browser.evaluate(browserChecks); const failures = []; verifyCase(entry.id, view, failures);
      result.cases.push({ id: entry.id, pass: failures.length === 0, failures, observation: view }); result.failures.push(...failures.map((failure) => `${entry.id}: ${failure}`));
    }
    const source = longSource(corpus.longDocument); const begin = await browser.evaluate("performance.now()"); await browser.evaluate(`window.renderMarkdown(${JSON.stringify(source)}, 'long-200kb'); true`); const elapsedMs = (await browser.evaluate("performance.now()")) - begin;
    const renderedBytes = await browser.evaluate("new TextEncoder().encode(document.querySelector('.markdown-body').textContent).length");
    result.longDocument = { id: corpus.longDocument.id, requestedMinimumBytes: corpus.longDocument.targetBytes, sourceBytes: Buffer.byteLength(source, "utf8"), renderedTextBytes: renderedBytes, elapsedMs, note: "Observed once in this environment; no performance threshold is asserted." };
    result.revisionFixture = { checkedOnly: "schema and declared SHA-256 hashes; no renderer or anchor relocation claim", pairs: revisions.pairs.map((pair) => ({ id: pair.id, expectation: pair.expectation, anchor: pair.anchor, beforeSha256: sha256(pair.before), afterSha256: sha256(pair.after), hashesMatch: pair.beforeSha256 === sha256(pair.before) && pair.afterSha256 === sha256(pair.after) })) };
    for (const pair of revisions.pairs) { const valid = typeof pair.id === "string" && typeof pair.before === "string" && typeof pair.after === "string" && /^anchor:base:/.test(pair.anchor) && ["immutable-anchor", "ambiguous", "no-silent-relocation"].includes(pair.expectation) && pair.beforeSha256 === sha256(pair.before) && pair.afterSha256 === sha256(pair.after); if (!valid) result.failures.push(`revision fixture invalid: ${pair.id}`); }
    result.runtimeExceptions = browser.exceptions;
    if (browser.exceptions.length) result.failures.push("browser runtime exceptions observed");
  } catch (error) { result.failures.push(`infrastructure failure: ${error.message}`); result.infrastructureFailure = true; }
  finally { await browser?.close().catch(() => {}); await new Promise((resolve) => server ? server.close(resolve) : resolve()); }
  result.finishedAt = new Date().toISOString(); result.pass = result.failures.length === 0;
  await writeFile(resultPath, JSON.stringify(result, null, 2) + "\n");
  if (!result.pass) process.exitCode = 1;
}
await main();
