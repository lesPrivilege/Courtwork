// EX-IC2 A · Chat space full inventory — synthetic seed + real-browser capture.
// CDP harness copied from evidence/cc-d0a/browser.mjs (itself copied down a chain
// from evidence/wk13-main-integration-20260908/browser.mjs); only the origin,
// CDP port and the seed/interaction sequence below are new. Every server call is
// the app's own /api/v5 traffic against a synthetic data dir; no paid provider,
// no personal credential store.
//
// Usage:
//   APP_URL=http://127.0.0.1:8881 node capture.mjs
// Env:
//   APP_URL      base origin of a running `npm --prefix app start` server
//                (default http://127.0.0.1:8881, matching this batch's port)
//   OUT_DIR      where PNGs land (default ./ — this file's directory)
//   CDP_PORT     headless Chrome remote-debugging port (default 20881)
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ORIGIN = process.env.APP_URL ?? "http://127.0.0.1:8881";
const OUT_DIR = process.env.OUT_DIR ?? dirname(fileURLToPath(import.meta.url));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CDP_PORT = Number(process.env.CDP_PORT ?? 20881);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await mkdir(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Stage 1 · seed synthetic data through the app's own HTTP API (no data-dir
// file writes, no direct store access). Every session below exists because a
// real /api/v5 request produced it, using the fake-openai-loopback provider
// the server registers by default in local-fake mode.
// ---------------------------------------------------------------------------
const boot = await (await fetch(`${ORIGIN}/api/v5/bootstrap`)).json();
const token = boot.sessionToken;
async function call(p, init = {}) {
  const res = await fetch(`${ORIGIN}/api/v5${p}`, {
    ...init,
    headers: { "content-type": "application/json", "x-work-token": token, ...(init.headers || {}) },
  });
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
async function runAndWait(sessionId, input, { statuses = ["completed", "failed", "cancelled", "unknown"] } = {}) {
  const made = await call(`/sessions/${sessionId}/runs`, { method: "POST", body: JSON.stringify({ input, commandId: crypto.randomUUID() }) });
  const run = made.run;
  await until(async () => statuses.includes((await call(`/runs/${run.id}`)).run.status));
  return run.id;
}
function scriptInput(calls) {
  return `/fixture script ${JSON.stringify(calls)}`;
}

const project = await call("/projects", { method: "POST", body: JSON.stringify({ name: "IC2 Inventory Fixture" }) });
const projectId = project.project.id;
const secondProject = await call("/projects", { method: "POST", body: JSON.stringify({ name: "Second project (nav density)" }) });
const secondProjectId = secondProject.project.id;

async function makeSession(title, overrides = {}) {
  const created = await call("/sessions", { method: "POST", body: JSON.stringify({ projectId, title, ...overrides }) });
  return created.session.id;
}

// 1 · a plain completed exchange — long user message (expand/collapse) + a
//     short assistant reply (Copy is the only wired action today).
const longMessage = "Please review the retained lease abstract for 42 Harborview and confirm the renewal window. ".repeat(14);
const plain = await makeSession("Lease abstract review");
await runAndWait(plain, longMessage);

// 2 · a tool-call trace: a write, a list, then a short reply — tool card +
//     activity group, both resolved/completed.
const toolSession = await makeSession("Docket file audit");
await runAndWait(
  toolSession,
  scriptInput([
    { name: "ws_write", arguments: { path: "out/summary.md", text: "Synthetic audit summary." } },
    { name: "ws_list", arguments: {} },
  ]),
);

// 3 · permission (ask mode): a session APPROVED and one DENIED are fully
//     resolved here. The store allows exactly one active run at a time
//     (server/service.mjs "only one active run is allowed"), so the PENDING
//     capture cannot be left hanging in this stage — it is created, screen-
//     shotted and resolved live in Stage 2, right before its own capture
//     step, instead of blocking every run created after it here.
const permPending = await makeSession("Contract redline (pending approval)", { permissionMode: "ask" });

const permApproved = await makeSession("Contract redline (approved)", { permissionMode: "ask" });
{
  const run = (await call(`/sessions/${permApproved}/runs`, { method: "POST", body: JSON.stringify({ input: scriptInput([{ name: "ws_write", arguments: { path: "out/approved.md", text: "Approved text." } }]), commandId: crypto.randomUUID() }) })).run;
  const openEvent = await until(async () => (await call(`/sessions/${permApproved}/events`)).events.find((e) => e.type === "permission.open"));
  await call(`/runs/${run.id}/questions/${openEvent.data.id}`, { method: "POST", body: JSON.stringify({ decision: "allow" }) });
  await until(async () => ["completed", "failed", "cancelled", "unknown"].includes((await call(`/runs/${run.id}`)).run.status));
}

const permDenied = await makeSession("Contract redline (denied)", { permissionMode: "ask" });
{
  const run = (await call(`/sessions/${permDenied}/runs`, { method: "POST", body: JSON.stringify({ input: scriptInput([{ name: "ws_write", arguments: { path: "out/denied.md", text: "Denied text." } }]), commandId: crypto.randomUUID() }) })).run;
  const openEvent = await until(async () => (await call(`/sessions/${permDenied}/events`)).events.find((e) => e.type === "permission.open"));
  await call(`/runs/${run.id}/questions/${openEvent.data.id}`, { method: "POST", body: JSON.stringify({ decision: "deny" }) });
  await until(async () => ["completed", "failed", "cancelled", "unknown"].includes((await call(`/runs/${run.id}`)).run.status));
}

// 4 · a question left pending (created live in Stage 2, same one-active-run
//     reason as above), and a second answered here for the resolved-history
//     row shape.
const questionPending = await makeSession("Scope question (pending)");

const questionAnswered = await makeSession("Scope question (answered)");
{
  const run = (await call(`/sessions/${questionAnswered}/runs`, { method: "POST", body: JSON.stringify({ input: "/fixture question", commandId: crypto.randomUUID() }) })).run;
  const openEvent = await until(async () => (await call(`/sessions/${questionAnswered}/events`)).events.find((e) => e.type === "question.open"));
  await call(`/runs/${run.id}/questions/${openEvent.data.id}`, { method: "POST", body: JSON.stringify({ answer: "Use the retained default." }) });
  await until(async () => ["completed", "failed", "cancelled", "unknown"].includes((await call(`/runs/${run.id}`)).run.status));
}

// 5 · a failed run (provider error) — run-status card + no retry control today.
const failedSession = await makeSession("Provider outage (failed run)");
await runAndWait(failedSession, "/fixture error");

// 6 · materials: a session with two chat files, for the Files dialog.
const filesSession = await makeSession("Filed materials");
await call(`/sessions/${filesSession}/materials`, { method: "POST", body: JSON.stringify({ name: "brief.md", text: "Synthetic brief text for the materials dialog." }) });
await runAndWait(filesSession, scriptInput([{ name: "ws_write", arguments: { path: "out/generated.md", text: "Agent-written file for the workspace list." } }]));

// 7 · a session held open for a live SLOW stream captured interactively below
//     (not pre-run — the capture step starts it and screenshots mid-flight).
const streamingSession = await makeSession("Live streaming capture");

// 8 · an Attention (global) conversation with an answered question, so the
//     Attention assistant's own (separately implemented) thread has content.
const attentionId = crypto.randomUUID();
await call("/attention/conversations", { method: "POST", body: JSON.stringify({ conversationId: attentionId }) });
{
  const run = (await call(`/sessions/${attentionId}/runs`, { method: "POST", body: JSON.stringify({ input: "/fixture question", commandId: crypto.randomUUID() }) })).run;
  const openEvent = await until(async () => (await call(`/sessions/${attentionId}/events`)).events.find((e) => e.type === "question.open"));
  await call(`/runs/${run.id}/questions/${openEvent.data.id}`, { method: "POST", body: JSON.stringify({ answer: "Synthetic Attention answer." }) });
  await until(async () => ["completed", "failed", "cancelled", "unknown"].includes((await call(`/runs/${run.id}`)).run.status));
}
// A second, pending Attention permission — Attention's own bespoke Allow/Deny
// buttons (no shared setRequestLabel/"Sending…" wiring; see ledger AT- rows).
// Its run is created live in Stage 2 (same one-active-run reason as above).
const attentionPermId = crypto.randomUUID();
await call("/attention/conversations", { method: "POST", body: JSON.stringify({ conversationId: attentionPermId }) });
await call(`/sessions/${attentionPermId}/permission-mode`, { method: "PUT", body: JSON.stringify({ permissionMode: "ask" }) });

// Truncated project/session density, to see the sidebar's "Show more" and long
// name truncation/tooltip path.
for (let i = 1; i <= 12; i += 1) await makeSession(`Filing ${String(i).padStart(2, "0")} — a title long enough to truncate in the rail`);

console.log(JSON.stringify({
  seeded: {
    projectId, secondProjectId, plain, toolSession, permPending, permApproved, permDenied,
    questionPending, questionAnswered, failedSession, filesSession, streamingSession,
    attentionId, attentionPermId,
  },
}, null, 2));

// ---------------------------------------------------------------------------
// Stage 2 · headless Chrome over raw CDP (no Puppeteer/Playwright dependency,
// matching this repo's existing evidence scripts).
// ---------------------------------------------------------------------------
const profile = await mkdtemp(path.join(tmpdir(), "ic2-capture-"));
const child = spawn(CHROME, [
  `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`,
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  "--window-size=1440,900", "about:blank",
], { stdio: ["ignore", "ignore", "ignore"] });
let version = null;
for (let i = 0; i < 80 && !version; i += 1) {
  try { version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json(); } catch { await sleep(150); }
}
if (!version) { child.kill(); throw new Error("headless browser did not open a debugging port"); }
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
await cdp("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

async function evaluate(expression) {
  const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? ""));
  return result.value;
}
async function waitFor(expression, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { const v = await evaluate(expression); if (v) return v; await sleep(100); }
  throw new Error("waitFor timed out: " + expression);
}
// Waits for the CLIENT's own render, not just the server's record: the app
// polls events on a ~900ms cadence (schedulePolling default delay, app.mjs),
// so a server-confirmed permission.open/question.open event can still be a
// couple of poll cycles away from actually being in the DOM.
async function waitForSelector(selector, timeout = 6000) {
  return waitFor(`Boolean(document.querySelector(${JSON.stringify(selector)}))`, timeout);
}
async function click(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)})?.click()`);
}
async function focus(selector) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)})?.focus()`);
}
async function typeInto(selector, text) {
  return evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.focus(); el.value = ${JSON.stringify(text)}; el.dispatchEvent(new Event('input', {bubbles:true})); return true; })()`);
}
async function hoverBySelector(selector) {
  const box = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; const r = el.getBoundingClientRect(); return {x: r.x + r.width/2, y: r.y + r.height/2}; })()`);
  if (!box) return false;
  await cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
  return true;
}
async function pressTab(shift = false) {
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", modifiers: shift ? 8 : 0, windowsVirtualKeyCode: 9 });
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", modifiers: shift ? 8 : 0, windowsVirtualKeyCode: 9 });
}
const KEY_CODES = { Enter: 13, Escape: 27, Tab: 9, " ": 32 };
async function pressKey(key, code = key) {
  const windowsVirtualKeyCode = KEY_CODES[key];
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode, nativeVirtualKeyCode: windowsVirtualKeyCode });
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode, nativeVirtualKeyCode: windowsVirtualKeyCode });
}
async function screenshot(name) {
  const { data } = await cdp("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(OUT_DIR, `${name}.png`), Buffer.from(data, "base64"));
}
async function setColorScheme(scheme) {
  await cdp("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
}
async function setViewport(width, height) {
  await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
}
async function activeElementDescriptor() {
  return evaluate(`(() => { const el = document.activeElement; if (!el || el === document.body) return null; return {tag: el.tagName, id: el.id || null, cls: el.className || null, aria: el.getAttribute('aria-label') || null, text: (el.textContent||'').trim().slice(0,60)}; })()`);
}
// The rail only renders the 8 most-recent sessions per open project unless a
// filter is active (renderProjectList, app.mjs ~1865); with 12 filler sessions
// seeded after every named one, blind text search over .session-button would
// silently miss every named fixture. Route every selection through the same
// nav filter a real user would use to find an older chat.
// selectSession() (app.mjs ~1421) skips its own network refetch when the
// requested session is already state.activeSessionId — it just re-renders
// existing (stale) state. A run created afterward through this script's own
// bare `call()` (not through the app's composer) is therefore invisible to
// the client until something forces a real re-fetch: schedulePolling only
// restarts when a fresh `GET /sessions/:id` finds `state.runs.some(isActiveRun)`
// true (pollEvents, app.mjs ~1050). Bouncing through Home and back is the
// simplest such forced re-fetch.
async function reselectSession(needle) {
  // Bouncing through #home-button and through a hard Page.navigate reload
  // were both tried and both proved unsafe in practice on this host: at
  // least once each, the sidebar came back with the wrong project open
  // (state.activeProjectId defaulting elsewhere) and every later
  // selectSessionByName() call in the run silently found nothing, quietly
  // leaving the browser on Home for the rest of the script. Bouncing to
  // ANOTHER already-known-reachable session inside the same already-open
  // project is the narrowest possible forced re-fetch: it only changes
  // state.activeSessionId (selectSession()'s own re-fetch trigger,
  // app.mjs ~1421) and never touches which project is open.
  await selectSessionByName('Docket file audit');
  await sleep(300);
  return selectSessionByName(needle);
}
async function selectSessionByName(needle) {
  await typeInto("#nav-filter-input", needle);
  // renderProjectList() runs synchronously off the input event, but the
  // session list itself may still be mid network fetch (loadSessionsForProject)
  // the first time a project opens — poll rather than trust one fixed delay.
  let found = false;
  for (let i = 0; i < 20 && !found; i += 1) {
    found = await evaluate(`(() => { const b = [...document.querySelectorAll('.session-button')].find(x => x.textContent.includes(${JSON.stringify(needle)})); if (b) { b.click(); return true; } return false; })()`);
    if (!found) await sleep(150);
  }
  await typeInto("#nav-filter-input", "");
  await sleep(300);
  return found;
}

const report = { keyboard: [], errors: [] };
async function step(name, fn, timeoutMs = 20000) {
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`step "${name}" exceeded ${timeoutMs}ms`)), timeoutMs)),
    ]);
  } catch (error) {
    report.errors.push({ name, error: String(error && error.stack || error) });
    console.error(`[capture] ${name} failed:`, error);
  }
}

await cdp("Page.navigate", { url: `${ORIGIN}/` });
await waitFor(`document.readyState === 'complete'`);
// A generous warm-up, not just a readyState check: several early runs of
// this script observed the FIRST few session-selection clicks silently
// no-op (the sidebar's project list and bootstrap fetches were still
// in flight) while later, identical calls later in the same run worked
// every time. `readyState: complete` fires before those in-page fetches
// resolve; wait for the actual project rows the rest of the script
// depends on before doing anything else.
await waitForSelector(".project-toggle", 10000).catch(() => {});
await sleep(1500);

// --- Home baseline, 1440 × 390, light × dark --------------------------------
await step("home-1440-light", async () => { await setColorScheme("light"); await setViewport(1440, 900); await sleep(200); await screenshot("home-1440-light"); });
await step("home-1440-dark", async () => { await setColorScheme("dark"); await sleep(200); await screenshot("home-1440-dark"); });
await step("home-390-light", async () => { await setColorScheme("light"); await setViewport(390, 844); await sleep(250); await screenshot("home-390-light"); });
await step("home-390-dark", async () => { await setColorScheme("dark"); await sleep(200); await screenshot("home-390-dark"); await setViewport(1440, 900); await setColorScheme("light"); });

// --- Sidebar / entry chrome ---------------------------------------------------
await step("sidebar-rest", async () => { await sleep(300); await screenshot("sidebar-rest-1440-light"); });
await step("sidebar-newchat-focus", async () => {
  await evaluate(`document.body.focus()`);
  await focus("#new-session-button");
  await sleep(150);
  await screenshot("sidebar-newchat-focus-visible");
});
await step("nav-filter-active", async () => {
  await typeInto("#nav-filter-input", "Filing 0");
  await sleep(200);
  await screenshot("sidebar-nav-filter-active-clear-visible");
  await typeInto("#nav-filter-input", "");
});
await step("sidebar-session-tooltip-hover", async () => {
  // Open the fixture project so a long session name is present to truncate.
  await evaluate(`[...document.querySelectorAll('.project-toggle')].find(b => b.textContent.includes('IC2 Inventory Fixture'))?.click()`);
  await sleep(400);
  const found = await hoverBySelector(".session-button");
  await sleep(600);
  if (found) await screenshot("sidebar-session-name-tooltip-hover");
});

// --- Enter a rich session for message-stream captures ------------------------
await step("select-plain-session", async () => {
  await selectSessionByName('Lease abstract');
  await sleep(500);
});
await step("user-message-long-collapsed", async () => { await screenshot("user-message-long-collapsed"); });
await step("user-message-actions-hover", async () => {
  const ok = await hoverBySelector(".message.user");
  await sleep(150);
  if (ok) await screenshot("user-message-actions-hover-visible");
});
await step("user-message-long-expanded", async () => {
  await click(".message.user details summary");
  await sleep(200);
  await screenshot("user-message-long-expanded");
});
await step("assistant-message-copy-hover", async () => {
  const ok = await hoverBySelector(".message.assistant");
  await sleep(150);
  if (ok) await screenshot("assistant-message-copy-hover-visible");
});
await step("chat-1440-light-rich", async () => { await screenshot("chat-1440-light"); });
await step("chat-1440-dark-rich", async () => { await setColorScheme("dark"); await sleep(200); await screenshot("chat-1440-dark"); await setColorScheme("light"); });
await step("chat-390-light-rich", async () => { await setViewport(390, 844); await sleep(300); await screenshot("chat-390-light"); await setViewport(1440, 900); await sleep(200); });

// --- Composer states -----------------------------------------------------------
await step("composer-rest", async () => { await screenshot("composer-rest-disabled-send"); });
await step("composer-text-entered", async () => {
  await typeInto("#composer-input", "Draft a synthetic follow-up message for inventory capture.");
  await sleep(150);
  await screenshot("composer-text-entered-send-enabled");
});
await step("composer-materials-open", async () => {
  await click("#materials-button");
  await sleep(400);
  await screenshot("composer-materials-dialog-open-empty");
  const closeBtn = "#close-materials-button";
  await click(closeBtn);
  await sleep(150);
});
await step("composer-connection-popover-open", async () => {
  await click("#model-settings-button");
  await sleep(250);
  await screenshot("composer-connection-popover-open");
  await pressKey("Escape");
  await sleep(150);
});

// --- Tool / question / permission / run-status cards --------------------------
await step("select-tool-session", async () => {
  await selectSessionByName('Docket file audit');
  await sleep(500);
});
await step("tool-card-collapsed", async () => { await screenshot("tool-card-collapsed"); });
await step("tool-card-expanded", async () => {
  await click("details.tool-card summary, .activity-group summary");
  await sleep(200);
  await click("details.tool-card summary");
  await sleep(200);
  await screenshot("tool-card-expanded-request-result");
});

let permPendingRunId = null, permPendingQuestionId = null;
await step("select-perm-pending", async () => {
  await selectSessionByName('pending approval');
  await sleep(500);
  // Only one run may be active on this server at a time (server/service.mjs
  // "only one active run is allowed"), so this run is created live, right
  // before its capture, instead of being left hanging from Stage 1.
  const made = await call(`/sessions/${permPending}/runs`, { method: "POST", body: JSON.stringify({ input: scriptInput([{ name: "ws_write", arguments: { path: "out/redline.md", text: "Proposed redline text." } }]), commandId: crypto.randomUUID() }) });
  permPendingRunId = made.run.id;
  const openEvent = await until(async () => (await call(`/sessions/${permPending}/events`)).events.find((e) => e.type === "permission.open"));
  permPendingQuestionId = openEvent.data.id;
  await reselectSession('pending approval'); // forces the client to re-fetch and notice the active run
  await waitForSelector(".question-actions");
});
await step("permission-card-pending", async () => { await screenshot("permission-card-pending-allow-deny"); });
await step("permission-card-focus", async () => {
  await focus(".question-actions .secondary-button");
  await sleep(150);
  await screenshot("permission-card-deny-focus-visible");
});
await step("resolve-perm-pending", async () => {
  // Resolve it now so it does not block every run created after this point.
  await call(`/runs/${permPendingRunId}/questions/${permPendingQuestionId}`, { method: "POST", body: JSON.stringify({ decision: "allow" }) });
  await until(async () => ["completed", "failed", "cancelled", "unknown"].includes((await call(`/runs/${permPendingRunId}`)).run.status));
});

await step("select-perm-approved", async () => {
  await selectSessionByName('(approved)');
  await sleep(500);
});
await step("permission-card-resolved", async () => {
  await click("details.resolved-permission summary");
  await sleep(200);
  await screenshot("permission-card-resolved-history-open");
});

await step("select-question-pending", async () => {
  await selectSessionByName('Scope question (pending)');
  await sleep(500);
  await call(`/sessions/${questionPending}/runs`, { method: "POST", body: JSON.stringify({ input: "/fixture question", commandId: crypto.randomUUID() }) });
  await until(async () => (await call(`/sessions/${questionPending}/events`)).events.some((e) => e.type === "question.open"));
  await reselectSession('Scope question (pending)'); // forces the client to re-fetch and notice the active run
  await waitForSelector("input[data-question-key]");
});
await step("question-card-pending", async () => { await screenshot("question-card-pending-input-focus"); });
await step("question-card-sending", async () => {
  const typed = await typeInto("input[data-question-key]", "Synthetic in-flight answer");
  if (!typed) throw new Error("input[data-question-key] not present — question card did not render in time");
  await sleep(100);
  // Submit and grab the frame while the Answer button reads "Sending…".
  await evaluate(`document.querySelector('input[data-question-key]')?.closest('form')?.requestSubmit()`);
  await sleep(60);
  await screenshot("question-card-sending-inflight");
  await sleep(700);
}, 10000);
// However the UI submission went, make sure this run is not left active —
// every capture step after this one depends on being able to start a new run.
await step("ensure-question-pending-resolved", async () => {
  const events = (await call(`/sessions/${questionPending}/events`)).events;
  const open = events.find((e) => e.type === "question.open");
  const resolved = events.some((e) => e.type === "question.resolved");
  const runId = open?.runId;
  if (open && !resolved) {
    await call(`/runs/${runId}/questions/${open.data.id}`, { method: "POST", body: JSON.stringify({ answer: "Fallback synthetic answer (UI submission step failed)." }) }).catch(() => {});
  }
  if (runId) await until(async () => ["completed", "failed", "cancelled", "unknown"].includes((await call(`/runs/${runId}`)).run.status), 5000).catch(() => {});
}, 8000);

await step("select-question-answered", async () => {
  await selectSessionByName('Scope question (answered)');
  await sleep(500);
});
await step("question-card-resolved", async () => {
  await click("details.resolved-question summary");
  await sleep(200);
  await screenshot("question-card-resolved-history-open");
});

await step("select-failed-session", async () => {
  await selectSessionByName('Provider outage');
  await sleep(500);
});
await step("run-status-failed", async () => { await screenshot("run-status-card-failed"); });
await step("run-inspect-open", async () => {
  await click(".run-status-card button");
  await sleep(400);
  await screenshot("run-surface-panel-open-failed-run");
  await click("#close-surface-button");
  await sleep(200);
});

// --- Materials / files ----------------------------------------------------------
await step("select-files-session", async () => {
  await selectSessionByName('Filed materials');
  await sleep(500);
});
await step("materials-dialog-with-files", async () => {
  await click("#materials-button");
  await sleep(400);
  await screenshot("composer-materials-dialog-open-with-files");
});
await step("materials-file-row-hover", async () => {
  const ok = await hoverBySelector(".workspace-file-row");
  await sleep(150);
  if (ok) await screenshot("materials-file-row-hover");
});
await step("materials-file-open", async () => {
  await click(".workspace-file-row");
  await sleep(500);
  await screenshot("file-surface-pane-open-current");
  await click("#close-surface-button");
  await sleep(200);
});
await step("artifact-row-in-stream", async () => {
  await sleep(200);
  const found = await evaluate(`Boolean(document.querySelector('.artifact-thread-row'))`);
  if (found) {
    await click(".artifact-thread-row");
    await sleep(500);
    await screenshot("artifact-content-version-open");
    await click("#close-surface-button");
    await sleep(200);
  } else {
    report.errors.push({ name: "artifact-row-in-stream", error: "no .artifact-thread-row present in this session's stream (recorded-version row did not project)" });
  }
});

// --- Streaming mid-flight -------------------------------------------------------
await step("select-streaming-session", async () => {
  await selectSessionByName('Live streaming capture');
  await sleep(500);
});
await step("streaming-inflight", async () => {
  await typeInto("#composer-input", "/fixture slow " + "Synthetic streamed answer text long enough to still be arriving. ".repeat(4));
  await sleep(100);
  await evaluate(`document.querySelector('#composer-form')?.requestSubmit()`);
  await sleep(900); // past the 600ms first-token delay, mid-chunk
  await screenshot("composer-sending-and-assistant-streaming-inflight");
  await sleep(3000);
});
await step("run-active-cancel", async () => {
  // Immediately after send, before the run settles, the Cancel affordance and
  // run hint should be visible; capture on a fresh send.
  await typeInto("#composer-input", "/fixture slow " + "Second slow reply for the cancel-button capture. ".repeat(3));
  await evaluate(`document.querySelector('#composer-form')?.requestSubmit()`);
  await sleep(150);
  await screenshot("composer-run-active-cancel-button-run-hint");
  await sleep(4000);
});

// --- Edit message dialog ---------------------------------------------------------
await step("edit-message-dialog", async () => {
  await selectSessionByName('Lease abstract');
  await sleep(500);
  const ok = await hoverBySelector(".message.user");
  await sleep(150);
  await click(".user-message-actions [aria-label='Edit as new message']");
  await sleep(300);
  await screenshot("edit-message-dialog-open");
  await click("#cancel-edit-message");
  await sleep(150);
});

// --- Chat overview / context popover ---------------------------------------------
await step("chat-overview-popover", async () => {
  const visible = await evaluate(`!document.querySelector('#show-run-button')?.hidden`);
  if (visible) {
    await click("#show-run-button");
    await sleep(250);
    await screenshot("chat-overview-context-popover-open");
    await pressKey("Escape");
    await sleep(150);
  } else {
    report.errors.push({ name: "chat-overview-popover", error: "#show-run-button is hidden in this session state (no run to summarise) — not captured" });
  }
});

// --- Mobile nav overlay -----------------------------------------------------------
await step("mobile-nav-overlay", async () => {
  await setViewport(390, 844);
  await sleep(300);
  await click("#toggle-nav-button");
  await sleep(300);
  await screenshot("sidebar-mobile-overlay-390-light");
  await setColorScheme("dark");
  await sleep(200);
  await screenshot("sidebar-mobile-overlay-390-dark");
  await setColorScheme("light");
  await click("#close-nav-button");
  await sleep(200);
  await setViewport(1440, 900);
  await sleep(200);
});

// --- Icon-only tooltip: hover and keyboard focus ----------------------------------
await step("tooltip-hover", async () => {
  const ok = await hoverBySelector("#refresh-button");
  await sleep(600); // past TOOLTIP_DELAY
  if (ok) await screenshot("tooltip-visible-on-hover-refresh-button");
});
await step("tooltip-focus", async () => {
  await evaluate(`document.body.focus()`);
  await focus("#refresh-button");
  await sleep(150);
  await screenshot("tooltip-visible-on-keyboard-focus-refresh-button");
});

// --- Keyboard reachability of hover-revealed actions ------------------------------
await step("keyboard-user-message-actions-reachable", async () => {
  const selected = await selectSessionByName('Lease abstract');
  await sleep(500);
  const anchorPresent = await evaluate(`Boolean(document.querySelector('.user-message-source summary'))`);
  await evaluate(`document.querySelector('.user-message-source summary')?.scrollIntoView({block:'center'})`);
  await evaluate(`document.querySelector('.user-message-source summary')?.focus()`);
  const focusLanded = await evaluate(`document.activeElement?.closest('.user-message-source') != null`);
  let reached = false;
  for (let i = 0; i < 6; i += 1) {
    await pressTab();
    await sleep(60);
    const desc = await activeElementDescriptor();
    if (desc && desc.aria && /copy message|edit as new message/i.test(desc.aria)) { reached = true; break; }
  }
  report.keyboard.push({ check: "user-message hover actions reachable via Tab (focus-within)", selected, anchorPresent, focusLanded, reached });
  await screenshot("keyboard-user-message-action-focus-visible");
});
await step("keyboard-menu-close-focus-return", async () => {
  await focus("#model-settings-button");
  await sleep(100);
  await pressKey("Enter");
  await sleep(250);
  let opened = await evaluate(`document.getElementById('connection-popover')?.matches(':popover-open') ?? false`);
  report.keyboard.push({ check: "Enter activates a focused #model-settings-button (native <button> default action)", reached: opened });
  if (!opened) {
    // Fall back to a real click so the focus-return assertion below still runs
    // against an actually-open popover, independent of whether this harness's
    // synthetic CDP Enter triggers the browser's own button default-action.
    await click("#model-settings-button");
    await sleep(250);
    opened = await evaluate(`document.getElementById('connection-popover')?.matches(':popover-open') ?? false`);
  }
  await pressKey("Escape");
  await sleep(150);
  const desc = await activeElementDescriptor();
  report.keyboard.push({ check: "focus returns to #model-settings-button after connection popover closes via Escape", opened, reached: desc?.id === "model-settings-button" });
});
await step("keyboard-tooltip-escape", async () => {
  await focus("#refresh-button");
  await sleep(500);
  const before = await evaluate(`document.getElementById('control-tooltip')?.matches(':popover-open') ?? false`);
  await pressKey("Escape");
  await sleep(150);
  const after = await evaluate(`document.getElementById('control-tooltip')?.matches(':popover-open') ?? false`);
  report.keyboard.push({ check: "tooltip opens on keyboard focus and Escape closes it", openedOnFocus: before, closedOnEscape: before && !after });
});

// --- Attention assistant (separate implementation) --------------------------------
await step("attention-open", async () => {
  await click("#attention-button");
  await sleep(500);
  await screenshot("attention-dialog-open-default");
});
await step("attention-with-answered", async () => {
  // Select the specific seeded conversation by id (the dropdown also lists
  // attentionPermId, created later in Stage 1 and therefore listed first).
  await evaluate(`(() => { const sel = document.querySelector('#attention-agent-dialog select'); if (!sel) return; sel.value = ${JSON.stringify(attentionId)}; sel.dispatchEvent(new Event('change', {bubbles:true})); })()`);
  await sleep(600);
  await screenshot("attention-dialog-with-conversation");
});
await step("attention-recent-rename", async () => {
  await click("#attention-agent-dialog .attention-agent-toolbar .text-button"); // "Conversations" manage toggle (first text-button after select/refresh)
  await sleep(300);
  const renameBtn = await evaluate(`Boolean([...document.querySelectorAll('#attention-agent-dialog .attention-recent-row button')].find(b => b.textContent === 'Rename'))`);
  if (renameBtn) {
    await evaluate(`[...document.querySelectorAll('#attention-agent-dialog .attention-recent-row button')].find(b => b.textContent === 'Rename')?.click()`);
    await sleep(200);
    await screenshot("attention-recent-rename-form-open");
  }
});
await step("attention-permission-pending", async () => {
  // Created live: it is this server's second-ever active run at seed time,
  // and the only one left unresolved when the script ends (nothing after
  // this step creates another run).
  await call(`/sessions/${attentionPermId}/runs`, { method: "POST", body: JSON.stringify({ input: scriptInput([{ name: "ws_write", arguments: { path: "notes/attention.md", text: "Attention write." } }]), commandId: crypto.randomUUID() }) });
  await until(async () => (await call(`/sessions/${attentionPermId}/events`)).events.some((e) => e.type === "permission.open"));
  await evaluate(`document.getElementById('attention-agent-dialog')?.close()`);
  await sleep(200);
  await click("#attention-button");
  await sleep(400);
  await evaluate(`(() => { const sel = document.querySelector('#attention-agent-dialog select'); if (!sel) return; sel.value = ${JSON.stringify(attentionPermId)}; sel.dispatchEvent(new Event('change', {bubbles:true})); })()`);
  await sleep(600);
  await screenshot("attention-dialog-permission-pending-bespoke-buttons");
});
await step("attention-390", async () => {
  await setViewport(390, 844);
  await sleep(300);
  await screenshot("attention-dialog-390-light");
  await setViewport(1440, 900);
});

await writeFile(path.join(OUT_DIR, "capture-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

socket.close();
child.kill();
