#!/usr/bin/env node
// Records the example workspace: walks the product in a headless browser
// against a server that serves the canonical capture fixture, and keeps every
// work-data answer the surfaces asked for. The result is the single sample file
// the preview layer reads (app/web/samples/preview/responses.json).
//
//   node app/scripts/example-fixture.mjs --active none --seed-only --retain --manifest fixture.json
//   node app/server/index.mjs --data-dir <data_dir from fixture.json> --port 8848
//   node app/scripts/record-preview.mjs --origin http://127.0.0.1:8848 --fixture fixture.json
//
// The recorder never seeds or writes; it reads what the UI reads. Host facts
// (bootstrap, provider, runtime, extensions) are recorded for the manifest but
// the layer never serves them.
import { spawn } from "node:child_process";
import { writeFile, mkdir, mkdtemp, rm, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i === -1 ? fallback : process.argv[i + 1]; };
const ORIGIN = arg("--origin", "http://127.0.0.1:8848");
const FIXTURE = arg("--fixture", null);
const CHROME = arg("--chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const CDP_PORT = Number(arg("--cdp-port", "19986"));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "app/web/samples/preview");
if (!FIXTURE) throw new Error("--fixture <capture-fixture manifest> is required");
const fixture = JSON.parse(await readFile(FIXTURE, "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = await mkdtemp(path.join(tmpdir(), "cw-record-preview-"));
const chrome = spawn(CHROME, [`--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--window-size=1440,900", "about:blank"], { stdio: ["ignore", "ignore", "ignore"] });
let version = null;
for (let i = 0; i < 120 && !version; i++) { try { version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json(); } catch { await sleep(150); } }
if (!version) { chrome.kill(); throw new Error("no debugging port"); }
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let messageId = 0; const pending = new Map(); const requests = new Map(); const bodies = new Map();
socket.onmessage = (event) => {
  const m = JSON.parse(event.data);
  if (m.method === "Network.requestWillBeSent") requests.set(m.params.requestId, m.params.request);
  if (m.method === "Network.loadingFinished" || m.method === "Network.responseReceived") { if (m.method === "Network.responseReceived") bodies.set(m.params.requestId, m.params.response); }
  if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); }
};
const send = (method, params = {}, sid) => new Promise((resolve, reject) => { const id = ++messageId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, sessionId: sid })); });
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const cdp = (method, params) => send(method, params, sessionId);
await cdp("Page.enable"); await cdp("Runtime.enable"); await cdp("Network.enable", { maxResourceBufferSize: 50_000_000, maxTotalBufferSize: 200_000_000 });
const evaluate = async (expression) => { const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? "")); return result.value; };
const w = (ms) => sleep(ms);

const entries = new Map();
async function harvest() {
  for (const [id, request] of requests) {
    if (bodies.has(id) === false) continue;
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/v5/")) continue;
    const response = bodies.get(id);
    if (!response || response.status !== 200) continue;
    let text;
    try { ({ body: text } = await cdp("Network.getResponseBody", { requestId: id })); } catch { continue; }
    const pathKey = url.pathname.replace(/^\/api\/v5/, "") + url.search;
    const method = request.method;
    const body = request.postData ? JSON.parse(request.postData) : undefined;
    const key = `${method} ${pathKey}#${body ? JSON.stringify(body) : ""}`;
    if (entries.has(key)) continue;
    entries.set(key, { method, path: pathKey, body, payload: JSON.parse(text) });
  }
  requests.clear(); bodies.clear();
}
async function go(url) { await cdp("Page.navigate", { url }); for (let i = 0; i < 100; i++) { if (await evaluate("document.readyState === 'complete'")) break; await w(100); } await w(1800); }
async function click(selector) { const done = await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;el.click();return true;})()`); await w(900); return done; }
async function openSession(id) {
  await go(`${ORIGIN}/`);
  await evaluate(`(async()=>{const w=(ms)=>new Promise(r=>setTimeout(r,ms));for(const p of document.querySelectorAll('[data-nav-key^="project:"]')){if(!document.querySelector('[data-nav-key="session:${id}"]')){p.click();await w(600);}}document.querySelector('[data-nav-key="session:${id}"]')?.click();})()`);
  await w(2500);
}

try {
  await mkdir(OUT, { recursive: true });
  // Home (summary, activity, attention module) and both projects' session lists.
  await go(`${ORIGIN}/`); await w(1500);
  await evaluate(`(async()=>{for(const p of document.querySelectorAll('[data-nav-key^="project:"]')){p.click();await new Promise(r=>setTimeout(r,700));}})()`); await w(1000);
  await click('[data-focus-key^="home:attention:"]'); await w(1200);
  await harvest();
  // Sessions of the story.
  for (const key of ["matter", "artifact", "continuity", "spark", "other"]) {
    const id = fixture.sessions?.[key]; if (!id) continue;
    await openSession(id);
    // Preview: the Workspace tab, each recorded file the chat shows, and the
    // latest run's details (Inspect run from its measurements).
    await evaluate(`(async()=>{const w=(ms)=>new Promise(r=>setTimeout(r,ms));const back=()=>{const b=document.getElementById('surface-back-button');if(b&&b.offsetParent)b.click();};document.getElementById('show-surface-button')?.click();await w(1500);back();await w(500);for(const row of [...document.querySelectorAll('#message-stream .artifact-thread-row')]){row.click();await w(1500);back();await w(500);}const glyph=[...document.querySelectorAll('#message-stream .run-activity-glyph')].pop();glyph?.click();await w(800);[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Inspect run')?.click();await w(1500);back();await w(500);})()`);
    await w(1500);
    await harvest();
  }
  // Attention workspace and its items; the assistant conversation.
  await go(`${ORIGIN}/`); await click("#attention-button"); await w(800);
  await evaluate(`(async()=>{const w=(ms)=>new Promise(r=>setTimeout(r,ms));const items=document.querySelector('#attention-agent-dialog button[aria-label*="items" i], #attention-agent-dialog [data-attention-items]');items?.click();await w(1200);})()`);
  await evaluate(`(async()=>{const w=(ms)=>new Promise(r=>setTimeout(r,ms));const ws=document.getElementById('attention-workspace');if(ws&&ws.hidden){document.querySelector('[data-focus-key^="attention-item-"]')?.click();await w(800);}for(const v of document.querySelectorAll('.attention-view-choice')){v.click();await w(700);}for(const row of [...document.querySelectorAll('#attention-workspace [data-attention-row], #attention-workspace .attention-row, #attention-workspace button[data-attention-id]')].slice(0,3)){row.click();await w(900);}})()`);
  await w(1000); await harvest();
  // Spark for the primary project.
  await go(`${ORIGIN}/`); await click("#spark-button"); await w(1500);
  await evaluate(`(async()=>{const w=(ms)=>new Promise(r=>setTimeout(r,ms));[...document.querySelectorAll('dialog[open] button')].find(b=>/Source maintenance/.test(b.textContent))?.click();await w(1500);const select=[...document.querySelectorAll('dialog[open] select')].find(s=>/Spark project/i.test(s.getAttribute('aria-label')||s.labels?.[0]?.textContent||''));for(const option of [...(select?.options??[])]){select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));await w(1500);}})()`);
  await harvest();
  // Home usage details.
  await go(`${ORIGIN}/`); await click('[data-home-usage], .home-usage-open, button[aria-label*="usage" i]'); await w(1200); await harvest();

  const work = [...entries.values()].filter((e) => /^\/(projects|sessions|runs|work-|attention|coordination)/.test(e.path));
  // RP-8 · only Host-generated object identifiers mark the story. Route words
  // ("query", "conversations") and resource names ("local", "tool:…") also sit
  // in id fields and paths; as Example IDs they would capture real requests.
  const OBJECT_ID = /^(?:[a-z]+(?:-[a-z]+)*-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$|^candidate-[0-9a-f]{64}$/;
  const ids = new Set();
  for (const e of work) {
    const collect = (value) => { if (Array.isArray(value)) value.forEach(collect); else if (value && typeof value === "object") { for (const [k, v] of Object.entries(value)) { if (/^(id|sessionId|projectId|runId|attention_id|matterId|candidateId)$/.test(k) && typeof v === "string" && OBJECT_ID.test(v)) ids.add(v); collect(v); } } };
    collect(e.payload);
    for (const m of e.path.matchAll(/\/(?:sessions|runs|attention)\/([^/?]+)/g)) { const id = decodeURIComponent(m[1]); if (OBJECT_ID.test(id)) ids.add(id); }
  }
  const story = { source_sha: fixture.source_sha, fixture_manifest: path.basename(FIXTURE), projects: fixture.projects, sessions: fixture.sessions, attention: fixture.attention, matter: fixture.matter, recorded_at: new Date().toISOString(), note: "Example workspace: synthetic material and a local deterministic provider; no external model call; not the user's data." };
  const out = { schemaVersion: 1, story, ids: [...ids], entries: work.map((e) => ({ method: e.method, path: e.path, body: e.body, payload: e.payload })) };
  // The recording is published with the app: the seed's local data directory
  // (a temp path naming the recording machine) becomes a neutral root.
  const json = JSON.stringify(out).split(fixture.data_dir).join("/example-data");
  if (/\/(?:Users|home|private|tmp|var\/folders)\//.test(json)) throw new Error("the recording still carries a local absolute path");
  await writeFile(path.join(OUT, "responses.json"), json);
  const host = [...entries.values()].filter((e) => !work.includes(e)).map((e) => `${e.method} ${e.path}`);
  await writeFile(path.join(OUT, "manifest.json"), JSON.stringify({ file: "responses.json", bytes: Buffer.byteLength(json), sha256: createHash("sha256").update(json).digest("hex"), entries: out.entries.length, ids: out.ids.length, source_sha: fixture.source_sha, origin: ORIGIN, recorded_at: story.recorded_at, host_routes_seen_but_not_served: [...new Set(host)].sort() }, null, 2) + "\n");
  console.log(`recorded ${out.entries.length} work answers, ${out.ids.length} example ids → app/web/samples/preview/responses.json`);
} finally {
  socket.close(); chrome.kill(); await sleep(300); await rm(profile, { recursive: true, force: true });
}
