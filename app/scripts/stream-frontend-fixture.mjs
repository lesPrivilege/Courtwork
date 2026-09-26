#!/usr/bin/env node
// Order 3 frontend · a local Host for streaming Chat/Attention measurements.
// Loopback fake provider only; no external model, credential or user data.
//
//   node app/scripts/stream-frontend-fixture.mjs [--port 8861] [--out <timings.json>]
//
// Send one of these inputs from Chat or Attention (the prefix picks the reply):
//   stream sustained   ~12,000 characters of Markdown and CJK, 24-character chunks every 20 ms
//   stream flood       the same text every 4 ms
//   stream burst       the same text, back to back, pausing 700 ms after every 60 chunks
//   stream tools       narration and a ws_list call in one message, then a second reply
//   stream markdown    prose, a fenced block, a list, a link and CJK at 60 ms per chunk
//   stream slow        30 short paragraphs at 100 ms per chunk (selection, scroll, cancel)
//   stream fail        slow text; the provider drops after 20 chunks
// Units are fake-provider chunks and characters, not provider tokens: no rate
// reported here is decode TPS.
//
// Browser probe: app/tests/fixtures/stream-frontend/measure.js is served on
// port+1 for injection into the page before a Run:
//   eval(await (await fetch("http://127.0.0.1:8862/measure.js")).text())
// and `POST http://127.0.0.1:8862/report/<name>` saves a JSON report.
//
// Host timing: every persisted assistant event is logged with its wall-clock
// persist time (Date.now) and written to --out on exit, for joining with the
// browser's receive/paint samples by `seq`.
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { startServer } from "../server/index.mjs";
import { FAKE_CREDENTIAL_KEY } from "../runtime/pi-session-runtime.mjs";

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i === -1 ? fallback : process.argv[i + 1]; };
const out = arg("--out", null);

const CJK = "流式文本需要在生成过程中逐步呈现，同时保持选区、滚动位置与键盘焦点不被打断。长段中文不应在换行处被截断或重复。";
const section = (n) => [
  `## Section ${n}`,
  "",
  `Paragraph ${n} explains what the Run is doing with enough prose to wrap across several lines at a reading measure. It mentions [a reference](https://example.com/ref-${n}) and some \`inline code\` inline.`,
  "",
  `- first point for section ${n}`,
  `- second point with **emphasis** and _style_`,
  `- third point ${CJK.slice(0, 18)}`,
  "",
  "```js",
  `function section${n}(input) {`,
  "  const rows = input.split('\\n');",
  "  return rows.map((row, index) => `${index}: ${row}`);",
  "}",
  "```",
  "",
  CJK,
  "",
].join("\n");
const LONG = Array.from({ length: 40 }, (_, i) => section(i + 1)).join("\n").slice(0, 12000);
const MARKDOWN = [
  "Here is the plan in three parts.",
  "",
  "```python",
  ...Array.from({ length: 12 }, (_, i) => `step_${i} = run(${i})  # line ${i + 1}`),
  "```",
  "",
  "1. Read the inputs",
  "2. Write the change",
  "3. Check it with [the recipe](https://example.com/recipe)",
  "",
  CJK + CJK,
].join("\n");
const SLOW = Array.from({ length: 30 }, (_, i) => `Synthetic slow paragraph ${i + 1}.`).join("\n\n");

const toolCount = (body) => { const m = body?.messages ?? []; let start = 0; for (let i = m.length - 1; i >= 0; i--) if (m[i]?.role === "user") { start = i + 1; break; } return m.slice(start).filter((x) => x?.role === "tool").length; };
function fakeResponder({ body, mode }) {
  const id = `stream-fe-${randomUUID()}`, created = Math.floor(Date.now() / 1000);
  if (mode.startsWith("stream sustained")) return { kind: "text", id, created, chunkMs: 20, text: LONG };
  if (mode.startsWith("stream flood")) return { kind: "text", id, created, chunkMs: 4, text: LONG };
  if (mode.startsWith("stream burst")) return { kind: "text", id, created, chunkMs: 0, burst: { every: 60, pauseMs: 700 }, text: LONG };
  if (mode.startsWith("stream tools") && toolCount(body) === 0) return { kind: "mixed", id, created, chunkMs: 40, text: "I will list the workspace first, then summarize what I find there.", toolCallId: `fe-${id}`, name: "ws_list", arguments: {} };
  if (mode.startsWith("stream tools")) return { kind: "text", id, created, chunkMs: 40, text: MARKDOWN };
  if (mode.startsWith("stream markdown")) return { kind: "text", id, created, chunkMs: 60, text: MARKDOWN };
  if (mode.startsWith("stream slow")) return { kind: "text", id, created, chunkMs: 100, text: SLOW };
  if (mode.startsWith("stream fail")) return { kind: "text", id, created, chunkMs: 100, failAfterChunks: 20, text: SLOW };
  return null;
}

const dataDir = await mkdtemp(path.join(tmpdir(), "courtwork-stream-fe-"));
const runtime = await startServer({ dataDir, port: Number(arg("--port", 8861)), fakeResponder, logger: () => {} });
const timings = [];
const append = runtime.store.appendEvent.bind(runtime.store);
runtime.store.appendEvent = async (event) => {
  const stored = await append(event);
  if (event.type === "assistant.delta" || event.type === "assistant.message") timings.push({ seq: stored.seq, runId: event.runId, type: event.type, segment: event.data?.segment ?? null, chars: event.data?.text?.length ?? 0, persistedAt: Date.now() });
  return stored;
};
const headers = { "content-type": "application/json", "x-work-token": runtime.token };
const api = async (method, route, body) => { const r = await fetch(`${runtime.url}/api/v5${route}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }); if (!r.ok) throw new Error(`${route} ${r.status}`); return r.json(); };
await api("PUT", "/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
const { version } = await api("GET", "/provider-config");
await api("PUT", "/provider-config", { expectedVersion: version, provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions" });
const { project } = await api("POST", "/projects", { name: "Streaming fixture" });
const { session } = await api("POST", "/sessions", { projectId: project.id, title: "Streaming" });
const probePath = fileURLToPath(new URL("../tests/fixtures/stream-frontend/measure.js", import.meta.url));
// POST /report/<name> stores a browser report next to --out (or in dataDir).
const reportDir = out ? path.dirname(out) : dataDir;
const probe = createServer(async (req, res) => {
  const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type" };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); res.end(); return; }
  const name = req.method === "POST" && /^\/report\/([\w.-]+)$/.exec(req.url)?.[1];
  if (name) {
    let body = ""; for await (const chunk of req) body += chunk;
    await writeFile(path.join(reportDir, `${name}.json`), JSON.stringify({ ...JSON.parse(body), savedAt: new Date().toISOString() }, null, 1) + "\n");
    res.writeHead(204, cors); res.end(); return;
  }
  res.writeHead(200, { "content-type": "text/javascript", ...cors });
  res.end(await readFile(probePath));
}).listen(Number(arg("--port", 8861)) + 1, "127.0.0.1");
console.log(JSON.stringify({ url: runtime.url, probe: `http://127.0.0.1:${Number(arg("--port", 8861)) + 1}/measure.js`, dataDir, sessionId: session.id, provider: "loopback fake only" }));
const stop = async () => { probe.close(); if (out) await writeFile(out, JSON.stringify(timings, null, 1) + "\n"); await runtime.close(); process.exit(0); };
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => void stop());
