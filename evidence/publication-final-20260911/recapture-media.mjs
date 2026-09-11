#!/usr/bin/env node
// Recaptures the 13 Pages product screenshots (light + dark, 1440×900, DPR 1,
// native JPEG) from the final product commit, on the same synthetic story as
// the merged-20260911 batch: the capture fixture with its recorded Spark and
// Attention-conversation corrections, plus the fixture's own --active approval
// server and the standalone running-correction server for the two live states.
// Real headless Chrome over CDP, real UI navigation, no DOM or image edits.
//
//   node evidence/publication-final-20260911/recapture-media.mjs --origin http://127.0.0.1:8848 --fixture <fixture.json> --batch publication-final-20260911
//
// Writes site/media/<batch>/*.jpg + observations.json and prints a summary.
// Finalizing the registry (manifest, archive, plan pin) is a separate step:
//   node evidence/publication-final-20260911/finalize-media.mjs --batch publication-final-20260911 --source-sha <sha>
import { spawn } from "node:child_process";
import { writeFile, mkdir, mkdtemp, rm, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i === -1 ? fallback : process.argv[i + 1]; };
const ORIGIN = arg("--origin", "http://127.0.0.1:8848");
const FIXTURE = JSON.parse(await readFile(arg("--fixture"), "utf8"));
const BATCH = arg("--batch", "publication-final-20260911");
const ONLY = arg("--only", null)?.split(",") ?? null;
const CHROME = arg("--chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const CDP_PORT = Number(arg("--cdp-port", "19992"));
const OUT = path.join(ROOT, "site/media", BATCH);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (b) => createHash("sha256").update(b).digest("hex");

// ---- live-state servers owned by this script -------------------------------
const children = [];
async function spawnFixture(script, args) {
  const child = spawn(process.execPath, [path.join(ROOT, script), ...args], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  let out = "";
  const line = await new Promise((resolve, reject) => {
    child.stdout.on("data", (d) => { out += d; const m = out.split("\n").find((l) => l.startsWith("{") && l.includes('"origin"')); if (m) resolve(JSON.parse(m)); });
    child.stderr.on("data", (d) => { out += d; });
    child.on("exit", (code) => reject(new Error(`${script} exited ${code}: ${out.slice(-600)}`)));
    setTimeout(() => reject(new Error(`${script} did not report an origin: ${out.slice(-600)}`)), 180000);
  });
  return { child, ...line };
}

// ---- browser ------------------------------------------------------------------
const profile = await mkdtemp(path.join(tmpdir(), "cw-recapture-"));
const chrome = spawn(CHROME, [`--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--window-size=1440,900", "about:blank"], { stdio: ["ignore", "ignore", "ignore"] });
let version = null;
for (let i = 0; i < 120 && !version; i++) { try { version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json(); } catch { await sleep(150); } }
if (!version) throw new Error("no debugging port");
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let messageId = 0; const pending = new Map();
socket.onmessage = (event) => { const m = JSON.parse(event.data); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result); } };
const send = (method, params = {}, sid) => new Promise((resolve, reject) => { const id = ++messageId; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params, sessionId: sid })); });
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const cdp = (method, params) => send(method, params, sessionId);
await cdp("Page.enable"); await cdp("Runtime.enable");
await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const evaluate = async (expression) => { const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? "")); return result.value; };
async function load(url, theme) {
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: theme }] });
  await cdp("Page.navigate", { url });
  for (let i = 0; i < 100; i++) { if (await evaluate("document.readyState === 'complete' && !!document.getElementById('spark-button')")) break; await sleep(100); }
  await sleep(1800);
  await evaluate("localStorage.clear(); sessionStorage.clear(); true");
  await cdp("Page.navigate", { url }); await sleep(2200);
}
const W = "const w=(ms)=>new Promise(r=>setTimeout(r,ms));";
const click = async (selector, wait = 900) => { const ok = await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)return false;el.click();return true;})()`); await sleep(wait); return ok; };
const clickText = async (selector, re, wait = 900) => { const ok = await evaluate(`(()=>{const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>${re}.test((e.textContent||'').trim())||${re}.test((e.getAttribute('aria-label')||'').trim()));if(!el)return false;el.click();return true;})()`); await sleep(wait); return ok; };
async function openSession(id) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const found = await evaluate(`(async()=>{${W}for(const p of document.querySelectorAll('[data-nav-key^="project:"]')){if(!document.querySelector('[data-nav-key="session:${id}"]')){p.click();await w(700);}}const s=document.querySelector('[data-nav-key="session:${id}"]');if(s){s.click();return true;}return false;})()`);
    if (found) break;
    await sleep(1200);
  }
  await sleep(2500);
}
async function expandedWorkspace() {
  await evaluate(`(async()=>{${W}if(!/surface-cards|surface-open|surface-expanded/.test(document.getElementById('app-shell').className))document.getElementById('show-surface-button')?.click();await w(1200);[...document.querySelectorAll('.surface-panel button')].find(b=>/^expand/i.test(b.getAttribute('aria-label')||''))?.click();await w(1200);})()`);
  await clickText(".surface-panel button, .surface-header button, [role=tab]", "/^workspace$/i", 1200);
}
const S = FIXTURE.sessions;
const SLOTS = {
  home: { state: "home-cedar-northside-after-spark-correction", steps: "Home with two projects, retained runs and chats; one Attention item; Spark and conversation corrections applied to the same fixture.", prepare: async () => {} },
  spark: { state: `spark-matter-source-3-candidate-v2`, steps: "Spark Overview for Project Cedar review: one stale candidate from source v2 against current source revision 3; comparison Matter has one current candidate.", prepare: async () => { await click("#spark-button", 1800); } },
  attention: { state: `attention-${FIXTURE.attention.id.slice(-8)}-revision-inspected`, steps: "Attention workspace: the one Investigating item selected, with its recorded reason and next step; no decision asserted.", prepare: async () => { await click("#attention-button", 1200); await clickText("#attention-agent-dialog button", "/^Attention items$/", 1500); await clickText("#attention-workspace button", "/Review Project Cedar source change/", 1500); } },
  artifact: { state: `artifact-${S.artifact.slice(0, 8)}-recorded-file`, steps: "Recorded Markdown file out/project-cedar-review.md opened from the run's Files card in the expanded workspace; pending human Review.", prepare: async () => { await openSession(S.artifact); await expandedWorkspace(); await clickText(".surface-panel button, .surface-panel a, .surface-panel summary", "/project-cedar-review\\.md|Open recorded file/", 1500); } },
  matter: { state: `cedar-matter-${FIXTURE.matter.id.slice(7, 15)}-source1-overview`, steps: "Bound Matter workspace overview: source revision 1, pending candidate, four checked rules and decision controls; no decision submitted.", prepare: async () => { await openSession(S.matter); await expandedWorkspace(); } },
  review: { state: `cedar-candidate-${FIXTURE.matter.candidate.slice(10, 20)}-purpose-open`, steps: "Pending Candidate with purpose-limitation expanded: source version, quoted range and recorded-source action; accept / reject / request-evidence remain available and unused.", prepare: async () => { await openSession(S.matter); await expandedWorkspace(); await clickText(".surface-panel button, .surface-panel summary", "/^\\s*purpose-limitation/", 1200); } },
  continuity: { state: `continuity-${S.continuity.slice(0, 8)}-cedar-matter-source1`, steps: "Continuation session bound to the existing Matter, expanded workspace; pending candidate unchanged.", prepare: async () => { await openSession(S.continuity); await expandedWorkspace(); } },
  models: { state: "models-local-default", hash: "#settings/models", steps: "Models: the local deterministic connection is in force; no saved external credentials; no external request is sent." },
  integrations: { state: "tools-user-revision-0", hash: "#settings/tools", steps: "Tools & Integrations: User scope, Configurable view, built-in tools with policy / exposure facts; no imported external server." },
  settings: { state: "appearance-default-medium", hash: "#settings/appearance", steps: "Appearance: Medium text, default code font, Follow system motion; the theme is the only preference changed." },
  conversation: { state: `conversation-${(FIXTURE.sessions.conversationCorrection ?? S.conversation).slice(0, 8)}-disclosed-completed`, steps: "Global Attention conversation after the corrected run: question answered, the three Attention tools expanded, final answer; disclosure revision 2.", prepare: async () => { await click("#attention-button", 1500); await evaluate(`(async()=>{${W}const select=[...document.querySelectorAll('#attention-agent-dialog select')].find(s=>[...s.options].some(o=>o.value===${JSON.stringify(FIXTURE.sessions.conversationCorrection ?? S.conversation)}));if(select){select.value=${JSON.stringify(FIXTURE.sessions.conversationCorrection ?? S.conversation)};select.dispatchEvent(new Event('change',{bubbles:true}));}await w(2500);for(const g of [...document.querySelectorAll('#attention-agent-dialog details')].filter(d=>/^Tool activity/.test((d.querySelector('summary')?.textContent||'').trim())&&/attention_projects/.test(d.textContent||''))){g.open=true;}await w(800);})()`); await sleep(800); } },
  approval: { state: "approval-permission-pending", live: "approval", steps: "Actual waiting_user: ws_write out/exhibit-index.md, exact-write-only approval request; unanswered." },
  running: { state: "running-successful-list-read-active", live: "running", steps: "Active local-compatible Run after successful ws_list and ws_read; live stream and elapsed time advance naturally; no domain acceptance." },
};

const observations = [];
async function capture(slot, theme, origin, hash = "") {
  const url = `${origin}/${hash}`;
  await load(url, theme);
  if (SLOTS[slot].prepare) await SLOTS[slot].prepare();
  await sleep(500);
  const observed = await evaluate("({url:location.href,width:innerWidth,height:innerHeight,dpr:devicePixelRatio,bodyFont:getComputedStyle(document.body).fontSize,bodyBackground:getComputedStyle(document.body).backgroundColor,theme:document.documentElement.dataset.theme||null})");
  const shot = await cdp("Page.captureScreenshot", { format: "jpeg", quality: 92 });
  const bytes = Buffer.from(shot.data, "base64");
  const file = `${slot}-1440-${theme}.jpg`;
  await writeFile(path.join(OUT, file), bytes);
  observations.push({ slot, theme, state_id: SLOTS[slot].state, captured_at: new Date().toISOString(), asset_path: `site/media/${BATCH}/${file}`, sha256: sha256(bytes), bytes: bytes.length, observed, detail: SLOTS[slot].steps, displayed_path: observed.url });
  console.log(`wrote ${file} (${bytes.length} bytes)`);
}

try {
  await mkdir(OUT, { recursive: true });
  for (const [slot, def] of Object.entries(SLOTS)) {
    if (ONLY && !ONLY.includes(slot)) continue;
    if (def.live) continue;
    for (const theme of ["light", "dark"]) await capture(slot, theme, ORIGIN, def.hash ?? "");
  }
  if (!ONLY || ONLY.includes("approval")) {
    const live = await spawnFixture("evidence/semantic-polish-merge-20260911/capture-fixture.mjs", ["--active", "approval", "--manifest", path.join(tmpdir(), `cw-recapture-approval-${Date.now()}.json`)]);
    const id = live.ids.approval;
    console.log(`approval fixture ${live.origin} session ${id}`);
    for (const theme of ["light", "dark"]) { SLOTS.approval.prepare = async () => { await openSession(id); if (!(await evaluate("document.getElementById('session-title-text').textContent !== 'Home'"))) await clickText('[data-nav-key^="session:"]', "/approval/i", 2500); await sleep(1500); }; await capture("approval", theme, live.origin); }
    live.child.kill("SIGINT"); await sleep(1500);
  }
  if (!ONLY || ONLY.includes("running")) {
    const live = await spawnFixture("evidence/semantic-polish-merge-20260911/capture-fixture-running-correction.mjs", ["--manifest", path.join(tmpdir(), `cw-recapture-running-${Date.now()}.json`)]);
    await sleep(12000);
    for (const theme of ["light", "dark"]) { SLOTS.running.prepare = async () => { await openSession(live.sessionId); await sleep(6000); }; await capture("running", theme, live.origin); }
    live.child.kill("SIGINT"); await sleep(1500);
  }
  const previous = await readFile(path.join(OUT, "observations.json"), "utf8").then((t) => JSON.parse(t)).catch(() => []);
  const merged = [...previous.filter((o) => !observations.some((n) => n.slot === o.slot && n.theme === o.theme)), ...observations];
  await writeFile(path.join(OUT, "observations.json"), JSON.stringify(merged, null, 2) + "\n");
  console.log(`${observations.length} captures; ${merged.length} observations in ${OUT}`);
} finally {
  socket.close(); chrome.kill(); for (const c of children) { try { c.kill("SIGINT"); } catch {} }
  await sleep(500); await rm(profile, { recursive: true, force: true });
}
