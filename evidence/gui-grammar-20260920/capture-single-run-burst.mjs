// G4 · cross-surface visual state matrix — one further candidate cell,
// requested after review of the session-level burst: a SINGLE Run that
// contains, at once, a failing tool call, a produced artifact (an approved
// write), and a pending permission — plus the reading position across a
// reload. Real local deterministic provider (app/runtime/fake-provider.mjs,
// "/fixture …" directives), no paid provider, no fabricated server data.
// This script only captures; it renders no judgment. A non-author reviewer
// decides.
//
// Self-contained, same CDP pattern as capture.mjs / capture-fixture-cells.mjs:
// its own headless Chrome and its own fresh app server / data directory,
// both started and stopped by this script.
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = HERE;
const REPO_ROOT = path.join(HERE, "..", "..");
const APP_DIR = path.join(REPO_ROOT, "app");
const SCRATCH_ROOT = process.env.G4C_SCRATCH ?? path.join(tmpdir(), "cw-g4-single-run-burst");
const DATA_DIR = path.join(SCRATCH_ROOT, "data-single-run-burst");
const APP_PORT = Number(process.env.G4C_APP_PORT ?? 8879);
const ORIGIN = process.env.APP_URL ?? `http://127.0.0.1:${APP_PORT}`;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CDP_PORT = Number(process.env.G4C_CDP_PORT ?? 19679);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const profile = await mkdtemp(path.join(tmpdir(), "g4c-single-run-"));
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
  return { child, socket, cdp, chromeVersion: version.Browser, userAgent: version["User-Agent"] };
}

async function main() {
  const serverChild = await startServer();
  console.log("app server ready at", ORIGIN, "data dir", DATA_DIR);
  const { child, socket, cdp, chromeVersion, userAgent } = await launchChrome();

  async function evaluate(expression) {
    const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? ""));
    return result.value;
  }
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

  await cdp("Page.navigate", { url: ORIGIN });
  await sleep(600);
  await evaluate(`new Promise(r => { if (document.readyState === 'complete') r(); else window.addEventListener('load', r, { once: true }); })`);
  await sleep(1000);
  await setViewport(1440, 900);
  await setPresentation({ scheme: "light" });

  const leftPreview = await evaluate(`(function(){ const b=document.getElementById('preview-leave-button'); if(b && !b.closest('[hidden]')){ b.click(); return true; } return false; })()`);
  await sleep(1000);
  await cdp("Page.navigate", { url: ORIGIN });
  await sleep(1000);
  await evaluate(`new Promise(r => { if (document.readyState === 'complete') r(); else window.addEventListener('load', r, { once: true }); })`);
  await sleep(800);
  const precondition = await evaluate(`({ projects: window.__V5_UI__.state.projects.length })`);
  console.log("left preview:", leftPreview, "precondition (real, empty workspace):", JSON.stringify(precondition));

  // ---- ONE Run, ONE /fixture script, everything happens inside it ---------
  // 25 successful ws_list, 1 failing ws_read (real ENOENT), 1 ws_write to be
  // APPROVED (produces a real artifact), 1 final ws_write left UNRESOLVED
  // (real pending permission). 28 calls total, under the provider's 32 cap
  // (app/runtime/fake-provider.mjs::scriptForMode rejects script.length > 32
  // — unmodified).
  const ARTIFACT_PATH = "out/single-run-artifact.txt";
  const ARTIFACT_TEXT = "G4 single-Run burst cell — approved write, real artifact\n";
  const PENDING_PATH = "out/single-run-pending.txt";
  const calls = [
    ...Array.from({ length: 25 }, () => ({ name: "ws_list", arguments: {} })),
    { name: "ws_read", arguments: { path: "materials/single-run-does-not-exist.txt" } },
    { name: "ws_write", arguments: { path: ARTIFACT_PATH, text: ARTIFACT_TEXT } },
    { name: "ws_write", arguments: { path: PENDING_PATH, text: "left pending, not resolved\n" } },
  ];
  if (calls.length > 32) throw new Error("script exceeds the provider's 32-call cap: " + calls.length);
  console.log("single-Run script has", calls.length, "calls (cap is 32)");

  const run = await sendMessage("/fixture script " + JSON.stringify(calls));
  const runId = run.id;
  const sessionId = run.sessionId;
  console.log("single Run:", runId, "session:", sessionId);

  // Runs to the FIRST permission ask (the approve-target write) automatically.
  await waitRunStatus(runId, "waiting_user");
  const firstCardText = await evaluate(`document.querySelector('.question-card.permission-card')?.innerText ?? null`);
  console.log("first pending permission card (about to approve):", JSON.stringify(firstCardText));
  if (!firstCardText || !firstCardText.includes(ARTIFACT_PATH)) {
    throw new Error("expected the first pending permission to be for " + ARTIFACT_PATH + ", got: " + firstCardText);
  }

  // Approve it via a real click, same control run-chain.mjs uses.
  await evaluate(`document.querySelector('[data-focus-key$=":allow"]')?.click()`);
  await sleep(500);

  // Execution resumes automatically after approval and runs straight into the
  // SECOND (final, deliberately unresolved) permission ask.
  await waitRunStatus(runId, "waiting_user", 25000);
  await waitForCondition(`(function(){ const c = document.querySelector('.question-card.permission-card'); return c && c.innerText.includes(${JSON.stringify(PENDING_PATH)}); })()`, 15000);
  const secondCardText = await evaluate(`document.querySelector('.question-card.permission-card')?.innerText ?? null`);
  console.log("second pending permission card (left unresolved):", JSON.stringify(secondCardText));

  // ---- Facts, all scoped to this one Run (it is the session's only Run) --
  const factsExpr = `(function(){
    const cards = [...document.querySelectorAll('.tool-card')];
    const failed = cards.filter(c => c.querySelector('summary.is-failed'));
    const disclosures = [...document.querySelectorAll('.execution-disclosure-summary')].map(b => ({
      text: b.innerText.replace(/\\n/g, ' '),
      focusKey: b.dataset.focusKey,
      ariaControls: (b.getAttribute('aria-controls') || '').split(' ').filter(Boolean).length,
    }));
    const artifactRow = document.querySelector('.artifact-thread-row');
    const artifactWrapper = artifactRow ? artifactRow.closest('.file-action-row') : null;
    const permCard = document.querySelector('.question-card.permission-card');
    const runObj = window.__V5_UI__.state.runs.find(r => r.id === ${JSON.stringify(runId)});
    const body = document.getElementById('conversation-body');
    return {
      totalToolCardsForRun: cards.length,
      hiddenToolCards: cards.filter(c => c.hidden).length,
      visibleToolCards: cards.filter(c => !c.hidden).length,
      failedToolCards: failed.length,
      failedToolText: failed[0] ? failed[0].innerText.slice(0, 200) : null,
      disclosures,
      artifactRow: artifactRow ? {
        visible: artifactWrapper ? !artifactWrapper.hidden : !artifactRow.hidden,
        title: artifactRow.querySelector('.flow-row-title')?.textContent ?? null,
        meta: artifactRow.querySelector('.flow-row-meta')?.textContent ?? null,
      } : null,
      runArtifacts: runObj ? runObj.artifacts : null,
      pendingPermissionCard: permCard ? { visible: !permCard.hidden, text: permCard.innerText } : null,
      runStatus: runObj ? runObj.status : null,
      scrollTop: body ? body.scrollTop : null,
      scrollHeight: body ? body.scrollHeight : null,
    };
  })()`;
  const facts = await evaluate(factsExpr);
  console.log("single-Run facts (before reload):", JSON.stringify(facts, null, 2));

  const file = "chat-burst-single-run-1440-light.png";
  await screenshot(file);

  function firstVisibleRowExpr() {
    return `(function(){
      const body = document.getElementById('conversation-body');
      if (!body) return null;
      const bodyTop = body.getBoundingClientRect().top;
      const rows = [...document.querySelectorAll('#conversation-body .tool-card summary, #conversation-body .execution-disclosure-summary, #conversation-body .question-card, #conversation-body .artifact-thread-row, #conversation-body .message')];
      const first = rows.find(r => { const rect = r.getBoundingClientRect(); return rect.bottom > bodyTop; });
      return first ? { text: first.innerText.slice(0, 80).replace(/\\n/g, ' '), focusKey: first.dataset ? (first.dataset.focusKey || null) : null } : null;
    })()`;
  }
  const beforeReload = {
    scrollTop: facts.scrollTop,
    firstVisibleRow: await evaluate(firstVisibleRowExpr()),
    sessionId: await evaluate(`window.__V5_UI__.state.activeSessionId`),
  };
  console.log("reading position before reload:", JSON.stringify(beforeReload));

  await cdp("Page.reload", {});
  await sleep(2000);
  await evaluate(`new Promise(r => { if (document.readyState === 'complete') r(); else window.addEventListener('load', r, { once: true }); })`);
  await sleep(1500);
  const afterReloadScroll = await evaluate(`(function(){ const b = document.getElementById('conversation-body'); return b ? b.scrollTop : null; })()`);
  const afterReload = {
    scrollTop: afterReloadScroll,
    firstVisibleRow: await evaluate(firstVisibleRowExpr()),
    sessionId: await evaluate(`window.__V5_UI__?.state?.activeSessionId ?? null`),
    pendingPermissionStillVisible: await evaluate(`!!document.querySelector('.question-card.permission-card')`),
    artifactRowStillVisible: await evaluate(`!!document.querySelector('.artifact-thread-row')`),
  };
  console.log("reading position after reload:", JSON.stringify(afterReload));

  const cell = {
    surface: "Chat",
    state: "single Run — 28-call script (25 successful ws_list, 1 failing ws_read, 1 approved ws_write producing a real artifact, 1 final ws_write left pending), all within ONE Run",
    viewport: "1440x900", scheme: "light",
    method: "real (local deterministic provider, /fixture directives — ONE run, ONE /fixture script, within the provider's 32-calls-per-run cap)",
    file,
    facts: {
      runId, sessionId,
      scriptCallCount: calls.length,
      successfulToolCallAttempts: 26, // 25 ws_list + 1 approved ws_write
      failedToolCallAttempts: 1,
      pendingToolCallAttempts: 1,
      ...facts,
      firstPendingPermissionCardTextBeforeApproval: firstCardText,
      secondPendingPermissionCardText: secondCardText,
      readingPositionBeforeReload: beforeReload,
      readingPositionAfterReload: afterReload,
      sessionPreservedAcrossReload: afterReload.sessionId === sessionId,
    },
  };
  console.log("cell:", JSON.stringify(cell.facts, null, 2));

  // ---- Merge into manifest.json (append only; keep everything else) ------
  const manifestPath = path.join(OUT, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.cells = [...manifest.cells, cell];
  manifest.notExecuted = [
    ...manifest.notExecuted,
    {
      cell: "Chat — single Run with ≥100 tool events",
      reason: "The local deterministic provider's own script cap is 32 calls per Run (app/runtime/fake-provider.mjs::scriptForMode, unmodified, script.length > 32 is rejected). A single Run therefore cannot script more than 32 tool calls in this build; the 100-successful-call burst recorded above (Chat · event burst) is a SESSION-level burst across 5 Runs (1/32/32/32/3), not one Run. A single Run containing ≥50 tool events with a failing call, a pending permission and a produced artifact together is recorded instead (Chat · single Run, this cell, 28 calls). A single Run with ≥100 tool events remains not executed in a browser; app/tests/event-weight.test.mjs is its only coverage (synthetic events, not a live provider Run).",
    },
  ];
  manifest.singleRunBurstEnv = {
    chromeVersion, userAgent, appOrigin: ORIGIN, appPort: APP_PORT, cdpPort: CDP_PORT, dataDir: DATA_DIR,
    note: "Third capture pass (capture-single-run-burst.mjs), same evidence packet, its own headless Chrome and its own fresh, empty, real app server/data directory.",
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("manifest.json updated:", manifest.cells.length, "total cells,", manifest.notExecuted.length, "not executed.");

  socket.close();
  child.kill();
  serverChild.kill();
  console.log("done.");
}

main().catch((err) => {
  console.error("capture-single-run-burst.mjs failed:", err);
  process.exitCode = 1;
});
