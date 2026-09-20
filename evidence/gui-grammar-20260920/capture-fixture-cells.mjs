// G4 · cross-surface visual state matrix — the two remaining candidate cells
// ("Home · Waiting/approval present" and "Chat · event burst"), captured for
// real against the app's own local deterministic provider
// (app/runtime/fake-provider.mjs, "/fixture …" directives), no paid provider
// and no fabricated server data. This script only captures; it renders no
// judgment ("accepted" / "passes"). A non-author reviewer decides.
//
// Self-contained: spawns its own app server against a fresh scratch data
// directory (removed and recreated on each run) and its own headless
// Chromium over CDP, reusing the exact CDP pattern of capture.mjs and of
// evidence/final-integration-20260908/browser.mjs. Ports and scratch paths
// default to the ranges assigned to this task (8874–8879, CDP 19670–19679;
// scratch under .../scratchpad/g4c/) and can be overridden by env vars for
// local re-runs.
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = HERE; // evidence/gui-grammar-20260920/
const REPO_ROOT = path.join(HERE, "..", "..");
const APP_DIR = path.join(REPO_ROOT, "app");
/* Scratch lives outside the repository: a synthetic data directory and a
   workspace folder, never a personal path. Override with G4C_SCRATCH. */
const SCRATCH_ROOT = process.env.G4C_SCRATCH ?? path.join(os.tmpdir(), "cw-g4-fixture-cells");
const DATA_DIR = path.join(SCRATCH_ROOT, "data-fixture-cells");
const APP_PORT = Number(process.env.G4C_APP_PORT ?? 8878);
const ORIGIN = process.env.APP_URL ?? `http://127.0.0.1:${APP_PORT}`;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CDP_PORT = Number(process.env.G4C_CDP_PORT ?? 19678);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const newCells = [];
function record(cell) { newCells.push(cell); console.log("captured:", cell.file, JSON.stringify(cell.facts || {}).slice(0, 200)); }

async function startServer() {
  await rm(DATA_DIR, { recursive: true, force: true });
  await mkdir(DATA_DIR, { recursive: true });
  const child = spawn("node", ["server/index.mjs", "--data-dir", DATA_DIR, "--port", String(APP_PORT)], {
    cwd: APP_DIR, stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (d) => { stderr += d.toString(); });
  let ready = false;
  for (let i = 0; i < 80 && !ready; i++) {
    try { const r = await fetch(ORIGIN); ready = r.ok; } catch { await sleep(200); }
  }
  if (!ready) { child.kill(); throw new Error("app server did not start: " + stderr.slice(0, 2000)); }
  return child;
}

async function launchChrome() {
  const profile = await mkdtemp(path.join(tmpdir(), "g4c-fixture-cells-"));
  const child = spawn(CHROME, [
    `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`,
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
    "--window-size=1440,900", "about:blank",
  ], { stdio: ["ignore", "ignore", "ignore"] });
  let version = null;
  for (let i = 0; i < 80 && !version; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json(); } catch { await sleep(150); }
  }
  if (!version) { child.kill(); throw new Error("headless Chrome did not open a debugging port"); }
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((res, rej) => { socket.onopen = res; socket.onerror = rej; });
  let messageId = 0; const pending = new Map();
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
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const cdp = (m, p) => send(m, p, sessionId);
  await cdp("Page.enable"); await cdp("Runtime.enable"); await cdp("Input.enable").catch(() => {});
  return { child, socket, cdp, profile, chromeVersion: version.Browser, userAgent: version["User-Agent"] };
}

function evaluateWith(cdp) {
  return async function evaluate(expression) {
    const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? ""));
    return result.value;
  };
}

const HOME_FACTS_FN = `
  (function homeFacts() {
    const body = document.getElementById('conversation-body');
    const form = document.getElementById('composer-form');
    const shell = document.getElementById('app-shell');
    if (!body || !form) return { note: 'composer/body not present' };
    const bodyRect = body.getBoundingClientRect();
    const formRect = form.getBoundingClientRect();
    const centreY = formRect.top + formRect.height / 2;
    const centrePct = bodyRect.height ? ((centreY - bodyRect.top) / bodyRect.height * 100) : null;
    const slots = [...document.querySelectorAll('.home-slot:not([hidden])')].map(s => s.dataset.homeSlot);
    const sections = [...document.querySelectorAll('.home-section')];
    const sectionLeftEdges = {};
    for (const s of sections) {
      const key = s.dataset.homeBlock || s.className;
      sectionLeftEdges[key] = Math.round(s.getBoundingClientRect().left);
    }
    const introEl = document.getElementById('home-composer-intro');
    const introHeight = introEl ? Math.round(introEl.getBoundingClientRect().height) : null;
    const homeLead = shell ? getComputedStyle(shell).getPropertyValue('--home-lead').trim() : null;
    const composerBlockOverlapCheck = {
      composerRect: { top: Math.round(formRect.top), bottom: Math.round(formRect.bottom) },
      homeSectionRects: Object.fromEntries(sections.map(s => {
        const r = s.getBoundingClientRect();
        const intersects = !(r.right < formRect.left || r.left > formRect.right || r.bottom < formRect.top || r.top > formRect.bottom);
        return [s.dataset.homeBlock || s.className, { top: Math.round(r.top), bottom: Math.round(r.bottom), intersectsComposer: intersects }];
      })),
    };
    return {
      composerFormRect: { top: Math.round(formRect.top), left: Math.round(formRect.left) },
      composerCentrePctOfBody: centrePct === null ? null : Math.round(centrePct * 10) / 10,
      visibleHomeSlots: slots,
      homeSectionLeftEdges: sectionLeftEdges,
      composerFormLeft: Math.round(formRect.left),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      introHeight,
      homeLead,
      composerBlockOverlapCheck,
    };
  })()`;

async function main() {
  const serverChild = await startServer();
  console.log("app server ready at", ORIGIN, "data dir", DATA_DIR);
  const { child, socket, cdp, chromeVersion, userAgent } = await launchChrome();
  const evaluate = evaluateWith(cdp);

  async function setViewport(width, height, { scale = 1, mobile = null } = {}) {
    await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: mobile ?? width < 768 });
  }
  async function setPresentation({ scheme = "light" } = {}) {
    await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
  }
  async function screenshot(filename) {
    const { data } = await cdp("Page.captureScreenshot", { format: "png" });
    await writeFile(path.join(OUT, filename), Buffer.from(data, "base64"));
    return filename;
  }
  async function homeFacts() { return evaluate(HOME_FACTS_FN); }
  async function overflowFacts() {
    return evaluate(`({ horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth })`);
  }
  async function waitForCondition(expr, timeout = 25000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const v = await evaluate(expr);
      if (v) return v;
      await sleep(150);
    }
    throw new Error("timed out waiting for: " + expr);
  }
  async function sendMessage(input) {
    const old = await evaluate(`window.__V5_UI__.state.runs.map(r=>r.id)`);
    await evaluate(`(()=>{const i=document.querySelector('#composer-input');i.value=${JSON.stringify(input)};i.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#composer-form').requestSubmit();})()`);
    return waitForCondition(`window.__V5_UI__.state.runs.find(r=>!${JSON.stringify(old)}.includes(r.id))`);
  }
  async function waitRunStatus(id, status, timeout = 25000) {
    return waitForCondition(`window.__V5_UI__.state.runs.find(r=>r.id===${JSON.stringify(id)} && r.status===${JSON.stringify(status)})`, timeout);
  }

  // ---- Navigate, real fresh empty data directory ------------------------
  await cdp("Page.navigate", { url: ORIGIN });
  await sleep(600);
  await evaluate(`new Promise(r => { if (document.readyState === 'complete') r(); else window.addEventListener('load', r, { once: true }); })`);
  await sleep(1000);
  await setViewport(1440, 900);
  await setPresentation({ scheme: "light" });

  // A fresh data directory still opens the "example workspace" preview on
  // first visit (see capture.mjs); leave it so every session/run below is a
  // REAL project/session against the local provider, not the recorded preview
  // fixture, which has no provider behind it at all.
  const leftPreview = await evaluate(`(function(){ const b=document.getElementById('preview-leave-button'); if(b && !b.closest('[hidden]')){ b.click(); return true; } return false; })()`);
  await sleep(1000);
  await cdp("Page.navigate", { url: ORIGIN });
  await sleep(1000);
  await evaluate(`new Promise(r => { if (document.readyState === 'complete') r(); else window.addEventListener('load', r, { once: true }); })`);
  await sleep(800);
  const precondition = await evaluate(`({ projects: window.__V5_UI__.state.projects.length })`);
  console.log("left preview:", leftPreview, "precondition (real, empty workspace):", JSON.stringify(precondition));

  // =========================================================================
  // ONE session carries both remaining cells. Sending a second real message
  // from Home a second time (after navigating Home again mid-script) was
  // found, empirically, to race the client's own navigation-epoch guard in
  // submitHomeRun() (app/web/app.mjs) and silently drop the run (a session
  // record was created but no Run ever appeared) — a real behavior of this
  // build, not a script bug, and not one this evidence-only script is here to
  // fix. Every send after the FIRST one below therefore goes through the
  // already-open session's own composer (submitSessionRun()), which does not
  // hit that path and was exercised without incident. One session, used for
  // both cells, is therefore the cleaner and more reliable capture, not a
  // shortcut.
  // =========================================================================

  // ---- Cell: Home · Waiting/approval present -----------------------------
  const runQ = await sendMessage("/fixture question");
  await waitRunStatus(runQ.id, "waiting_user");
  const mainSessionId = runQ.sessionId;
  console.log("session (used for both remaining cells):", mainSessionId, "run:", runQ.id);

  await evaluate(`document.getElementById('home-button')?.click()`);
  await sleep(800);
  const pendingHome = await evaluate(`(function(){
    const s = document.querySelector('[data-home-slot="pendingItems"]');
    return {
      hidden: s ? s.hidden : null,
      rows: s ? [...s.querySelectorAll('.home-row')].map(r => ({ text: r.innerText, focusKey: r.dataset.focusKey })) : null,
    };
  })()`);
  if (!pendingHome || pendingHome.hidden !== false || !pendingHome.rows?.length) {
    throw new Error("expected pendingItems ('Waiting for you') to be populated on Home; got " + JSON.stringify(pendingHome));
  }
  const homeWaitFile = "home-waiting-1440-light.png";
  await screenshot(homeWaitFile);
  const homeWaitFacts = await homeFacts();
  record({
    surface: "Home", state: "Waiting/approval present (real /fixture question, pending, real local-provider run)",
    viewport: "1440x900", scheme: "light",
    method: "real (local deterministic provider, /fixture directives)",
    file: homeWaitFile,
    facts: { ...homeWaitFacts, pendingItemsSlot: pendingHome, runId: runQ.id, sessionId: mainSessionId },
  });

  // ---- Cell: Chat · pending decision card ---------------------------------
  await evaluate(`document.querySelector('[data-focus-key^="home:pendingItems:"]')?.click()`);
  await sleep(800);
  await waitForCondition(`!!document.querySelector('input[aria-label=Answer]')`);
  const chatPendingFile = "chat-pending-decision-1440-light.png";
  await screenshot(chatPendingFile);
  const chatPendingFacts = await evaluate(`(function(){
    const card = document.querySelector('.question-card');
    return {
      cardText: card ? card.innerText : null,
      cardClass: card ? card.className : null,
      hasAnswerInput: !!document.querySelector('input[aria-label=Answer]'),
      activeSessionId: window.__V5_UI__.state.activeSessionId,
      sessionTitle: document.getElementById('session-title-text')?.textContent ?? null,
    };
  })()`);
  const chatPendingOverflow = await overflowFacts();
  if (chatPendingFacts.activeSessionId !== mainSessionId) throw new Error("expected to be back in the same session viewing the pending question card");
  record({
    surface: "Chat", state: "pending decision card (real /fixture question, unanswered, real local-provider run)",
    viewport: "1440x900", scheme: "light",
    method: "real (local deterministic provider, /fixture directives)",
    file: chatPendingFile,
    facts: { ...chatPendingOverflow, ...chatPendingFacts, runId: runQ.id },
  });

  // ---- Continue in the SAME session: answer, then build the event burst --
  await evaluate(`(()=>{const i=document.querySelector('input[aria-label=Answer]');i.value='fixture-cells capture answer';i.dispatchEvent(new Event('input',{bubbles:true}));i.form.requestSubmit();})()`);
  await waitRunStatus(runQ.id, "completed");

  const runIds = { question: runQ.id };
  const scriptCalls = { A: 32, B: 32, C: 32 }; // ws_list × 32 per run (the provider's per-run script cap)
  for (const [label, count] of Object.entries(scriptCalls)) {
    const script = JSON.stringify(Array.from({ length: count }, () => ({ name: "ws_list", arguments: {} })));
    const run = await sendMessage("/fixture script " + script);
    if (run.sessionId !== mainSessionId) throw new Error(`burst run ${label} started a different session (${run.sessionId}) than expected (${mainSessionId})`);
    await waitRunStatus(run.id, "completed");
    runIds[label] = run.id;
    console.log("burst run", label, "completed:", run.id, `(${count} ws_list calls)`);
  }

  // One run mixing a real failing tool call (ws_read of a path that does not
  // exist under the session's own bound workspace) with successful ones, so
  // the failure sits inside the same burst rather than as a separate cell.
  const scriptD = JSON.stringify([
    { name: "ws_read", arguments: { path: "materials/does-not-exist.txt" } },
    { name: "ws_list", arguments: {} },
    { name: "ws_list", arguments: {} },
    { name: "ws_list", arguments: {} },
  ]);
  const runD = await sendMessage("/fixture script " + scriptD);
  if (runD.sessionId !== mainSessionId) throw new Error("run D started a different session than expected");
  await waitRunStatus(runD.id, "completed");
  runIds.D = runD.id;
  console.log("run D (1 failing ws_read + 3 ws_list) completed:", runD.id);

  // Final run: a real ws_write while permissionMode is "ask" opens a genuine
  // pending permission card. Left UNRESOLVED (not approved, not denied) so
  // the burst cell captures a real pending decision alongside the burst —
  // per the task's guidance, this keeps the pending-permission capture simple
  // and does not attempt a produced-artifact cell in the same run.
  const scriptE = JSON.stringify([{ name: "ws_write", arguments: { path: "out/burst-fixture-cells.txt", text: "G4 burst cell — pending write, left unresolved" } }]);
  const runE = await sendMessage("/fixture script " + scriptE);
  if (runE.sessionId !== mainSessionId) throw new Error("run E started a different session than expected");
  await waitRunStatus(runE.id, "waiting_user");
  runIds.E = runE.id;
  console.log("run E (ws_write, permission ask) pending, left unresolved:", runE.id);

  const burstFacts = await evaluate(`(function(){
    const cards = [...document.querySelectorAll('.tool-card')];
    const disclosures = [...document.querySelectorAll('.execution-disclosure-summary')].map(b => {
      const title = b.querySelector('.flow-row-title')?.textContent ?? null;
      const meta = b.querySelector('.flow-row-meta')?.textContent ?? null;
      return { text: b.innerText.replace(/\\n/g, ' '), title, meta, focusKey: b.dataset.focusKey, ariaExpanded: b.getAttribute('aria-expanded') };
    });
    const failedSummary = document.querySelector('.tool-card summary.is-failed');
    const failedCard = failedSummary ? failedSummary.closest('.tool-card') : null;
    const permCard = document.querySelector('.question-card.permission-card');
    const body = document.getElementById('conversation-body');
    return {
      totalToolCards: cards.length,
      hiddenToolCards: cards.filter(c => c.hidden).length,
      visibleToolCards: cards.filter(c => !c.hidden).length,
      disclosures,
      failedRow: failedCard ? { visible: !failedCard.hidden, text: failedCard.innerText.slice(0, 300) } : null,
      pendingPermissionCard: permCard ? { visible: !permCard.hidden, text: permCard.innerText } : null,
      scrollTop: body ? body.scrollTop : null,
      scrollHeight: body ? body.scrollHeight : null,
    };
  })()`);
  console.log("burst facts (before reload):", JSON.stringify(burstFacts, null, 2));

  const burstFile = "chat-burst-1440-light.png";
  await screenshot(burstFile);

  // Reading position across a reload: capture the DOM's own reading anchors
  // (scrollTop + the first row's identifying text) before and after a real
  // CDP Page.reload of this same session's Chat view.
  function firstVisibleRowExpr() {
    return `(function(){
      const body = document.getElementById('conversation-body');
      if (!body) return null;
      const bodyTop = body.getBoundingClientRect().top;
      const rows = [...document.querySelectorAll('#conversation-body .tool-card summary, #conversation-body .execution-disclosure-summary, #conversation-body .question-card, #conversation-body .message')];
      const first = rows.find(r => { const rect = r.getBoundingClientRect(); return rect.bottom > bodyTop; });
      return first ? first.innerText.slice(0, 80).replace(/\\n/g, ' ') : null;
    })()`;
  }
  const beforeReload = { scrollTop: burstFacts.scrollTop, firstVisibleRow: await evaluate(firstVisibleRowExpr()) };
  await cdp("Page.reload", {});
  await sleep(2000);
  await evaluate(`new Promise(r => { if (document.readyState === 'complete') r(); else window.addEventListener('load', r, { once: true }); })`);
  await sleep(1500);
  const afterReloadFacts = await evaluate(`(function(){
    const body = document.getElementById('conversation-body');
    return {
      scrollTop: body ? body.scrollTop : null,
      activeSessionId: window.__V5_UI__?.state?.activeSessionId ?? null,
      pendingPermissionStillVisible: !!document.querySelector('.question-card.permission-card'),
    };
  })()`);
  const afterReload = { scrollTop: afterReloadFacts.scrollTop, firstVisibleRow: await evaluate(firstVisibleRowExpr()) };
  console.log("reading position before reload:", JSON.stringify(beforeReload));
  console.log("reading position after reload:", JSON.stringify(afterReload), "session preserved:", afterReloadFacts.activeSessionId === mainSessionId);

  record({
    surface: "Chat", state: "event burst (real local-provider runs: 1 answered question shown as a 1-call Execution group, three 32-call ws_list runs, one 3-call+1-failing-call run, one pending ws_write permission left unresolved)",
    viewport: "1440x900", scheme: "light",
    method: "real (local deterministic provider, /fixture directives — several consecutive runs in ONE session, the provider's own 32-calls-per-run script cap)",
    file: burstFile,
    facts: {
      ...burstFacts,
      totalScriptedToolCallAttempts: 1 + 32 + 32 + 32 + 4, // ask_user + 3×32 ws_list + (3 ws_list + 1 failing ws_read)
      successfulToolCallAttempts: 1 + 32 + 32 + 32 + 3,
      failedToolCallAttempts: 1,
      pendingToolCallAttempts: 1,
      runIds, sessionId: mainSessionId,
      readingPositionBeforeReload: beforeReload,
      readingPositionAfterReload: afterReload,
      sessionPreservedAcrossReload: afterReloadFacts.activeSessionId === mainSessionId,
    },
  });

  // ---- Merge into the existing manifest.json ------------------------------
  const manifestPath = path.join(OUT, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const stillNotExecuted = manifest.notExecuted.filter((entry) =>
    entry.cell !== "Home — Waiting/approval present" && entry.cell !== "Home — event burst (G2 fixture)");
  manifest.notExecuted = stillNotExecuted;
  manifest.cells = [...manifest.cells, ...newCells];
  manifest.fixtureCellsEnv = {
    chromeVersion, userAgent,
    appOrigin: ORIGIN, appPort: APP_PORT, cdpPort: CDP_PORT,
    dataDir: DATA_DIR,
    note: "Second capture pass (capture-fixture-cells.mjs), same evidence packet. Its own headless Chrome instance and its own fresh, empty, real (non-preview) app server/data directory — independent of the chromeVersion/userAgent recorded under env for the first pass.",
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("manifest.json updated:", manifest.cells.length, "total cells,", manifest.notExecuted.length, "still not executed.");

  socket.close();
  child.kill();
  serverChild.kill();
  console.log("done.");
}

main().catch((err) => {
  console.error("capture-fixture-cells.mjs failed:", err);
  process.exitCode = 1;
});
