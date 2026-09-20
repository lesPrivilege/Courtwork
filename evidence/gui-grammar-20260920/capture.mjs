// G4 · cross-surface visual state matrix — candidate evidence capture.
// Real headless Chromium over CDP, reusing the pattern of
// evidence/final-integration-20260908/browser.mjs. Every server call is the
// app's own /api/v5 traffic against a fresh synthetic data directory; the
// "example workspace" is the app's own synthetic story (recorded fixture),
// not fabricated server data. This script only captures; it renders no
// judgment ("accepted" / "passes"). A non-author reviewer decides.
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = HERE; // evidence/gui-grammar-20260920/
const ORIGIN = process.env.APP_URL ?? "http://127.0.0.1:8873";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CDP_PORT = Number(process.env.G4_CDP_PORT ?? 19661);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const manifest = { cells: [], notExecuted: [], keyboard: null, env: {}, observations: [] };

async function launchChrome() {
  const profile = await mkdtemp(path.join(tmpdir(), "g4-gui-grammar-"));
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
  manifest.env.chromeVersion = version.Browser;
  manifest.env.userAgent = version["User-Agent"];
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
  return { child, socket, cdp, profile };
}

function evaluateWith(cdp) {
  return async function evaluate(expression) {
    const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? ""));
    return result.value;
  };
}

async function main() {
  const { child, socket, cdp, profile } = await launchChrome();
  const evaluate = evaluateWith(cdp);

  async function key({ text = "", code, keyCode, modifiers = 0 }) {
    await cdp("Input.dispatchKeyEvent", { type: "keyDown", code, key: text || code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers });
    if (text) await cdp("Input.dispatchKeyEvent", { type: "char", text, modifiers });
    await cdp("Input.dispatchKeyEvent", { type: "keyUp", code, key: text || code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers });
  }
  async function tab() { await key({ code: "Tab", keyCode: 9 }); }
  async function enter() { await key({ code: "Enter", keyCode: 13, text: "\r" }); }

  async function setViewport(width, height, { scale = 1, mobile = null } = {}) {
    await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: mobile ?? width < 768 });
  }
  async function setPresentation({ scheme = "light", reducedMotion = false } = {}) {
    const features = [{ name: "prefers-color-scheme", value: scheme }];
    features.push({ name: "prefers-reduced-motion", value: reducedMotion ? "reduce" : "no-preference" });
    await cdp("Emulation.setEmulatedMedia", { features });
  }
  async function screenshot(filename) {
    const { data } = await cdp("Page.captureScreenshot", { format: "png" });
    await writeFile(path.join(OUT, filename), Buffer.from(data, "base64"));
    return filename;
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
      // Independent of the screenshot: does any visible block's box actually
      // intersect the composer's box (not just "look" overlapped)?
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

  async function homeFacts() { return evaluate(HOME_FACTS_FN); }
  async function overflowFacts() {
    return evaluate(`({ horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth })`);
  }
  async function clippedTextFacts() {
    return evaluate(`(function () {
      const hits = [];
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if ((cs.overflow === 'hidden' || cs.overflowY === 'hidden') && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 1) {
          hits.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0,60), text: (el.textContent||'').trim().slice(0,50) });
        }
        if (hits.length >= 15) break;
      }
      return hits;
    })()`);
  }

  function record(cell) { manifest.cells.push(cell); console.log("captured:", cell.file, JSON.stringify(cell.facts || {}).slice(0, 160)); }
  function notExecuted(entry) { manifest.notExecuted.push(entry); console.log("NOT EXECUTED:", entry.cell, "—", entry.reason); }

  // ---- Navigate, fresh profile (no localStorage yet) --------------------
  await cdp("Page.navigate", { url: ORIGIN });
  await sleep(600);
  await setViewport(1440, 900);
  await setPresentation({ scheme: "light" });
  await evaluate(`new Promise(r => { if (document.readyState === 'complete') r(); else window.addEventListener('load', r, { once: true }); })`);
  await sleep(800);

  /* Cell 1: empty Home. A fresh data directory is NOT the precondition: the
     first visit can open the example dataset on its own (Luna 2026-09-20).
     The empty state is therefore reached explicitly — close the example, then
     reload — and the capture asserts zero projects before it is recorded. */
  {
    const file = "home-empty-1440-light.png";
    await evaluate(`(function(){ const b=document.getElementById('preview-leave-button'); if(b && !b.closest('[hidden]')){ b.click(); return true; } return false; })()`);
    await sleep(1200);
    await cdp("Page.navigate", { url: ORIGIN });
    await sleep(1600);
    const precondition = await evaluate(`(function(){
      const rows = document.querySelectorAll('#navigation .project-toggle, #navigation [data-project-id]').length;
      const slots = [...document.querySelectorAll('.home-slot:not([hidden])')].map(s => s.dataset.homeSlot);
      return { projectRows: rows, slots, exampleBadge: Boolean(document.querySelector('#preview-banner:not([hidden]) #preview-banner-active:not([hidden])')) };
    })()`);
    if (precondition.projectRows > 0 || precondition.exampleBadge || precondition.slots.includes("attention") || precondition.slots.includes("activity"))
      notExecuted({ cell: "Home · empty · 1440x900 light", reason: `precondition not met: ${JSON.stringify(precondition)}` });
    else {
      await screenshot(file);
      const facts = await homeFacts();
      record({ surface: "Home", state: "empty (example closed, then reloaded; asserted zero projects and no Attention/Activity block)", viewport: "1440x900", scheme: "light", method: "real", file, facts: { ...facts, precondition } });
    }
  }

  // ---- Open the example workspace ---------------------------------------
  const opened = await evaluate(`(function(){ const b=document.getElementById('preview-offer-button'); if(b){ b.click(); return true; } return false; })()`);
  if (!opened) notExecuted({ cell: "open example workspace", reason: "#preview-offer-button not found on empty Home" });
  await sleep(1000);

  // Cell 2: normal Home, 1440 light, real (also the 1440 viewport-axis cell).
  {
    const file = "home-normal-1440-light.png";
    await screenshot(file);
    const facts = await homeFacts();
    record({ surface: "Home", state: "normal (example workspace)", viewport: "1440x900", scheme: "light", method: "real", file, facts });
  }

  // Cell: Home viewport 1280x800 light
  {
    await setViewport(1280, 800);
    await sleep(200);
    const file = "home-normal-1280-light.png";
    await screenshot(file);
    const facts = await homeFacts();
    record({ surface: "Home", state: "normal (example workspace)", viewport: "1280x800", scheme: "light", method: "real", file, facts });
  }

  // Cell: Home viewport 390x844 (mobile emulation) light
  {
    await setViewport(390, 844, { mobile: true });
    await sleep(300);
    const file = "home-normal-390-light.png";
    await screenshot(file);
    const facts = await homeFacts();
    record({ surface: "Home", state: "normal (example workspace)", viewport: "390x844 (mobile emulation)", scheme: "light", method: "real", file, facts });
  }

  // back to 1440 for the rest of desktop cells
  await setViewport(1440, 900);
  await sleep(200);

  // Cell: sidebar collapsed at 1440, normal Home
  {
    const toggled = await evaluate(`(function(){ const b=document.getElementById('toggle-nav-button'); if(b){ b.click(); return true; } return false; })()`);
    await sleep(300);
    if (!toggled) notExecuted({ cell: "Home sidebar collapsed 1440", reason: "#toggle-nav-button not found" });
    else {
      const file = "home-normal-1440-light-sidebar-collapsed.png";
      await screenshot(file);
      const facts = await homeFacts();
      record({ surface: "Home", state: "normal, sidebar collapsed", viewport: "1440x900", scheme: "light", method: "real", file, facts });
      // expand it back
      await evaluate(`document.getElementById('toggle-nav-button')?.click()`);
      await sleep(300);
    }
  }

  // Cell: normal Home 1280 dark (presentation combined w/ viewport per note in G1: 1280/dark already checked by author; we add our own capture)
  {
    await setViewport(1280, 800);
    await setPresentation({ scheme: "dark" });
    await sleep(300);
    const file = "home-normal-1280-dark.png";
    await screenshot(file);
    const facts = await homeFacts();
    record({ surface: "Home", state: "normal (example workspace)", viewport: "1280x800", scheme: "dark", method: "real", file, facts });
    await setViewport(1440, 900);
    await setPresentation({ scheme: "light" });
    await sleep(300);
  }

  // Cell: normal Home 1440 dark (presentation axis)
  {
    await setPresentation({ scheme: "dark" });
    await sleep(300);
    const file = "home-normal-1440-dark.png";
    await screenshot(file);
    const facts = await homeFacts();
    record({ surface: "Home", state: "normal (example workspace)", viewport: "1440x900", scheme: "dark", method: "real", file, facts });
    await setPresentation({ scheme: "light" });
    await sleep(200);
  }

  // Cell: reduced motion — record computed transition of the Activity chevron
  {
    await setPresentation({ scheme: "light", reducedMotion: true });
    await sleep(200);
    const file = "home-normal-1440-light-reduced-motion.png";
    await screenshot(file);
    const transition = await evaluate(`(function(){ const el=document.querySelector('.home-activity > summary > .ui-icon'); return el ? getComputedStyle(el).transition : null; })()`);
    const facts = { ...(await homeFacts()), activityChevronTransition: transition };
    record({ surface: "Home", state: "normal, reduced motion", viewport: "1440x900", scheme: "light", method: "real (prefers-reduced-motion: reduce)", file, facts });
    await setPresentation({ scheme: "light", reducedMotion: false });
    await sleep(200);
  }

  // Cell: long content — real Profile work address (Settings, maxlength 40) + INJECTED DOM TEXT for greeting and the Example banner line.
  {
    const before = await homeFacts();
    await evaluate(`(function(){ location.hash = '#settings/profile'; })()`);
    await sleep(600);
    const longAddress = "Multnomah County Circuit Court, Division N".slice(0, 40);
    const setResult = await evaluate(`(function(addr){
      const input = document.querySelector('input[aria-label="Work address"]');
      if (!input) return { ok: false };
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, addr);
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    })(${JSON.stringify(longAddress)})`);
    await sleep(400);
    await evaluate(`document.getElementById('settings-back-button')?.click()`);
    await sleep(600);
    const injected = await evaluate(`(function(){
      const greeting = document.querySelector('#home-composer-intro [data-greeting]');
      const before = { greeting: greeting ? greeting.textContent : null };
      if (greeting) greeting.textContent = 'Good afternoon, and welcome back to a very long injected greeting line meant to stress the identity zone budget well past its ordinary length for G4 evidence purposes';
      const bannerText = document.querySelector('#preview-banner-active .preview-banner-text');
      const beforeBanner = bannerText ? bannerText.textContent : null;
      if (bannerText) bannerText.textContent = 'Explore an example workspace with an intentionally long injected sentence standing in for a long Example line, to see how the identity zone handles overflow text for G4 evidence purposes.';
      return { greetingFound: Boolean(greeting), bannerFound: Boolean(bannerText), beforeGreeting: before.greeting, beforeBanner };
    })()`);
    await sleep(300);
    const file = "home-long-1440-light.png";
    await screenshot(file);
    const facts = { ...(await homeFacts()), profileWorkAddressSet: setResult, domInjection: injected };
    record({
      surface: "Home", state: "long slogan + long Example + long Profile address", viewport: "1440x900", scheme: "light",
      method: "real Profile work address (Settings > Profile, maxlength 40) + INJECTED DOM TEXT (greeting span, Example banner line)",
      file, facts: { ...facts, before },
    });
  }

  // Waiting/approval — check pendingItems after a normal reload (example fixture has no pending question/permission per source inspection).
  // Run this BEFORE the failure cell: the failure cell closes the example
  // workspace (see below), and this check needs it still active.
  {
    await evaluate(`(function(){ location.reload(); })()`);
    await sleep(1500);
    const pending = await evaluate(`(function(){ const s = document.querySelector('[data-home-slot="pendingItems"]'); return { hidden: s ? s.hidden : null, rows: s ? s.querySelectorAll('.home-row').length : null }; })()`);
    if (!pending || pending.hidden !== false || !pending.rows) {
      notExecuted({ cell: "Home — Waiting/approval present", reason: `example workspace fixture (app/web/samples/preview/responses.json) has no pending question or permission item; pendingItems slot observed hidden=${pending?.hidden} rows=${pending?.rows}. No local action can create one without a paid provider.` });
    } else {
      const file = "home-waiting-1440-light.png";
      await screenshot(file);
      record({ surface: "Home", state: "Waiting/approval present", viewport: "1440x900", scheme: "light", method: "real (example workspace)", file, facts: pending });
    }
  }

  // Event burst — NOT EXECUTED in the browser (no paid provider to emit 100 tool calls live).
  notExecuted({ cell: "Home — event burst (G2 fixture)", reason: "Requires a live provider run emitting ≥100 tool events; none available without a paid provider. Unit coverage: app/tests/event-weight.test.mjs (builds the same 100-success/1-fail/1-pending/1-artifact fixture and asserts grouping)." });

  // Cell: failure — SIMULATED NETWORK FAILURE for *work-summary* via Fetch.failRequest.
  // While the example workspace is active, preview-layer.mjs's WORK_ROUTES
  // answers /work-summary from the recorded fixture directly in the page, so
  // no real network request is made and Fetch.failRequest never matches
  // anything. Close the example first (real click on "Close the example"),
  // which returns Home to a real (empty-workspace) network read that
  // Fetch.failRequest can catch, then reopen the example afterwards so the
  // remaining cells (Chat, Attention, Spark, the keyboard pass) still see it.
  {
    await evaluate(`(function(){ document.getElementById('home-button')?.click(); })()`);
    await sleep(500);
    const leftPreview = await evaluate(`(function(){ const b=document.getElementById('preview-leave-button'); if(b){ b.click(); return true; } return false; })()`);
    await sleep(800);
    if (!leftPreview) {
      notExecuted({ cell: "Home — failure", reason: "#preview-leave-button (\"Close the example\") not found; could not force a real (non-preview) work-summary network read to simulate failing" });
    } else {
      await cdp("Fetch.enable", { patterns: [{ urlPattern: "*work-summary*" }] });
      socket.addEventListener("message", (ev) => {
        const msg = JSON.parse(ev.data);
        if (msg.method === "Fetch.requestPaused") cdp("Fetch.failRequest", { requestId: msg.params.requestId, errorReason: "ConnectionRefused" }).catch(() => {});
      });
      await evaluate(`(function(){ location.reload(); })()`);
      await sleep(2200);
      const file = "home-failure-1440-light.png";
      await screenshot(file);
      const facts = await evaluate(`(function(){
        const el = document.querySelector('.connection-line-text');
        return { connectionLineText: el ? el.textContent : null, connectionLinePresent: Boolean(document.querySelector('.connection-line')) };
      })()`);
      record({ surface: "Home", state: "failure — Home read failure (preview closed, real empty workspace)", viewport: "1440x900", scheme: "light", method: "SIMULATED NETWORK FAILURE (CDP Fetch.failRequest on *work-summary*, preview closed so the read is a real network request)", file, facts });
      await cdp("Fetch.disable", {});
    }
    // Reopen the example workspace for the remaining cells.
    const reopened = await evaluate(`(function(){ const b=document.getElementById('preview-offer-button'); if(b){ b.click(); return true; } return false; })()`);
    await sleep(1000);
    if (!reopened) notExecuted({ cell: "reopen example workspace after the failure cell", reason: "#preview-offer-button not found after closing the example" });
  }

  // Cell: 200%-equivalent — Home and Chat, CSS-equivalent (720x450 @2x)
  async function zoomEquivalentCell(surfaceLabel, filePrefix) {
    await setViewport(720, 450, { scale: 2, mobile: false });
    await sleep(400);
    const file = `${filePrefix}-zoom-css-equivalent-720-light.png`;
    await screenshot(file);
    const overflow = await overflowFacts();
    const clipped = await clippedTextFacts();
    record({
      surface: surfaceLabel, state: "CSS-equivalent (720×450 @2x), not native zoom", viewport: "720x450 @2x",
      scheme: "light", method: "CSS-equivalent (720×450 @2x), not native zoom", file,
      facts: { ...overflow, clippedCandidates: clipped },
    });
    await setViewport(1440, 900, { scale: 1, mobile: false });
    await sleep(300);
  }
  await zoomEquivalentCell("Home", "home-normal");

  // ---- Keyboard pass on normal Home 1440 ---------------------------------
  {
    await evaluate(`document.getElementById('composer-input')?.focus()`);
    await sleep(200);
    const sequence = [];
    let activityToggleChecked = false;
    for (let i = 0; i < 30; i++) {
      await tab();
      await sleep(60);
      const desc = await evaluate(`(function(){
        const el = document.activeElement;
        if (!el) return null;
        return { tag: el.tagName.toLowerCase(), focusKey: el.dataset ? (el.dataset.focusKey || null) : null,
          ariaLabel: el.getAttribute('aria-label'), id: el.id || null, text: (el.textContent||'').trim().slice(0,40) };
      })()`);
      sequence.push(desc);
      if (desc && desc.focusKey === "home-activity-toggle" && !activityToggleChecked) {
        activityToggleChecked = true;
        const openBefore = await evaluate(`document.querySelector('.home-activity')?.open`);
        await enter();
        await sleep(200);
        const openAfter = await evaluate(`document.querySelector('.home-activity')?.open`);
        sequence.push({ note: "Enter pressed on Activity summary", openBefore, openAfter });
      }
    }
    manifest.keyboard = { startFocus: "composer-input", tabPresses: 30, sequence };
    console.log("keyboard pass recorded,", sequence.length, "entries; activity toggle checked:", activityToggleChecked);
  }

  // ---- Chat: open the example session with tool rows / an artifact -------
  // This fixture session lives in its own project's session list
  // (#project-list, data-nav-key="session:<id>"), not necessarily in the
  // global "Recent" list (data-recent-id) — both are tried for robustness.
  const ARTIFACT_SESSION_ID = "ab845057-7234-4e67-997f-391980d765d6"; // fixture story.sessions.artifact
  {
    const clicked = await evaluate(`(function(id){
      const byNavKey = document.querySelector('[data-nav-key="session:' + id + '"]');
      if (byNavKey) { byNavKey.click(); return 'project-list'; }
      const byRecent = document.querySelector('[data-recent-id="' + id + '"]');
      if (byRecent) { byRecent.click(); return 'recent-list'; }
      return null;
    })(${JSON.stringify(ARTIFACT_SESSION_ID)})`);
    await sleep(1000);
    if (!clicked) {
      notExecuted({ cell: "Chat surface", reason: `session ${ARTIFACT_SESSION_ID} (fixture story.sessions.artifact) not found via [data-nav-key="session:<id>"] under #project-list or [data-recent-id] under #recent-list` });
    } else {
      const file = "chat-normal-1440-light.png";
      await screenshot(file);
      const overflow = await overflowFacts();
      const sessionTitle = await evaluate(`document.getElementById('session-title-text')?.textContent || null`);
      record({ surface: "Chat", state: "normal (example session with tool rows/artifact)", viewport: "1440x900", scheme: "light", method: "real", file, facts: { ...overflow, sessionTitle } });

      await setViewport(1280, 800);
      await sleep(300);
      await screenshot("chat-normal-1280-light.png");
      record({ surface: "Chat", state: "normal (example session)", viewport: "1280x800", scheme: "light", method: "real", file: "chat-normal-1280-light.png", facts: await overflowFacts() });

      await setViewport(390, 844, { mobile: true });
      await sleep(300);
      await screenshot("chat-normal-390-light.png");
      record({ surface: "Chat", state: "normal (example session)", viewport: "390x844 (mobile emulation)", scheme: "light", method: "real", file: "chat-normal-390-light.png", facts: await overflowFacts() });

      await setViewport(1440, 900);
      await setPresentation({ scheme: "dark" });
      await sleep(300);
      await screenshot("chat-normal-1440-dark.png");
      record({ surface: "Chat", state: "normal (example session)", viewport: "1440x900", scheme: "dark", method: "real", file: "chat-normal-1440-dark.png", facts: await overflowFacts() });
      await setPresentation({ scheme: "light" });
      await sleep(300);

      await zoomEquivalentCell("Chat", "chat-normal");
    }
  }

  // ---- Attention workspace (example item) --------------------------------
  {
    await evaluate(`(function(){ location.hash=''; document.getElementById('home-button')?.click(); })()`);
    await sleep(800);
    const clicked = await evaluate(`(function(){
      const row = document.querySelector('.home-row[data-focus-key^="home:attention:"]');
      if (row) { row.click(); return true; }
      return false;
    })()`);
    await sleep(1000);
    if (!clicked) {
      notExecuted({ cell: "Attention surface", reason: "no .home-row[data-focus-key^=\"home:attention:\"] found on normal Home to open the example Attention item" });
    } else {
      const file = "attention-normal-1440-light.png";
      await screenshot(file);
      record({ surface: "Attention", state: "normal (example item)", viewport: "1440x900", scheme: "light", method: "real", file, facts: await overflowFacts() });

      await setPresentation({ scheme: "dark" });
      await sleep(300);
      await screenshot("attention-normal-1440-dark.png");
      record({ surface: "Attention", state: "normal (example item)", viewport: "1440x900", scheme: "dark", method: "real", file: "attention-normal-1440-dark.png", facts: await overflowFacts() });
      await setPresentation({ scheme: "light" });
      await sleep(300);
    }
  }

  // ---- Spark ---------------------------------------------------------------
  {
    await evaluate(`(function(){ document.getElementById('home-button')?.click(); })()`);
    await sleep(600);
    await evaluate(`document.getElementById('spark-button')?.click()`);
    await sleep(1000);
    const rendered = await evaluate(`(function(){
      const body = document.body.innerText || '';
      return { hasSparkHeading: /spark/i.test(document.title || '') || Boolean(document.querySelector('[class*="spark"]')), bodyLength: body.length };
    })()`);
    if (rendered && rendered.hasSparkHeading) {
      const file = "spark-1440-light.png";
      await screenshot(file);
      record({ surface: "Spark", state: "normal (Spark, if rendered)", viewport: "1440x900", scheme: "light", method: "real", file, facts: rendered });
    } else {
      notExecuted({ cell: "Spark surface", reason: "clicking #spark-button did not produce a detectable [class*=spark] surface on this synthetic data dir; recorded as not rendered" });
    }
  }

  await writeFile(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  socket.close();
  child.kill();
  console.log("done. manifest.json written.");
}

main().catch((err) => { console.error("capture.mjs failed:", err); process.exitCode = 1; });
