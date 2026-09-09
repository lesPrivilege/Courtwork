#!/usr/bin/env node
// Capture the page's media (M1–M7) from a running product instance.
//
// Every screenshot on the page is taken here, from a data directory this script
// seeds itself through the product's own /api/v5 routes. Nothing is written
// behind the API and no screenshot from an earlier round is reused, because an
// earlier round's screenshots carry an earlier round's words.
//
//   npm --prefix app start -- --data-dir <fresh dir> --port 8908
//   node site/scripts/capture-media.mjs --origin http://127.0.0.1:8908
//
// The browser is a real headless Chrome driven over CDP, the same way the
// repository's other capture scripts do it (evidence/cc-s/browser.mjs); no new
// dependency is added for it.
import { spawn } from "node:child_process";
import { writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { buildReview } from "../../app/domains/inbound-nda/index.mjs";
import { SYNTHETIC_SOURCES, NORMAL_FACTS } from "../../app/domains/inbound-nda/fixtures.mjs";
import { FAKE_CREDENTIAL_KEY } from "../../app/runtime/pi-session-runtime.mjs";
import { git, release, ROOT, SITE } from "./release.mjs";

const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
};
const ORIGIN = arg("--origin", "http://127.0.0.1:8908");
const CHROME = arg("--chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
const CDP_PORT = Number(arg("--cdp-port", "19971"));
const SOURCE_SHA = arg("--source-sha", null);
const MEDIA = path.resolve(SITE, arg("--media-dir", "media"));

// The original capture remains pinned to the published evidence snapshot.
// A separate source-sha/media-dir pair lets Pages take a fresh, explicitly
// labelled capture from the current product main without relabelling the
// older specimen and benchmark evidence as if it had been recaptured.
const identity = SOURCE_SHA
  ? { source_sha: SOURCE_SHA, sha7: SOURCE_SHA.slice(0, 7) }
  : await release({ capture: true });
if (SOURCE_SHA) {
  if (!/^[0-9a-f]{40}$/.test(SOURCE_SHA)) throw new Error("--source-sha must be a full commit SHA");
  git("cat-file", "-e", `${SOURCE_SHA}^{commit}`);
  const verified = ["app", "benchmarks", "brand", "docs", "PAPER.md", "LICENSE"];
  const drift = git("diff", "--name-only", SOURCE_SHA, "--", ...verified);
  const extra = git("ls-files", "-z", "--others", "--exclude-standard", "--", ...verified);
  if (drift || extra) throw new Error(`current-main capture product paths differ from ${SOURCE_SHA.slice(0, 7)}:\n${drift}${extra}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- the product's own API -------------------------------------------------
const token = (await (await fetch(`${ORIGIN}/api/v5/bootstrap`)).json()).sessionToken;
async function api(method, p, body) {
  const res = await fetch(`${ORIGIN}/api/v5${p}`, {
    method,
    headers: { "content-type": "application/json", "x-work-token": token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${text}`);
  return json;
}
const scriptInput = (calls) => `/fixture script ${JSON.stringify(calls)}`;

async function settle(runId, statuses) {
  for (let i = 0; i < 800; i++) {
    const { run } = await api("GET", `/runs/${runId}`);
    if (statuses.includes(run.status)) return run;
    await sleep(50);
  }
  throw new Error(`run ${runId} never reached ${statuses.join("/")}`);
}
async function openEvent(sessionId, runId, type) {
  for (let i = 0; i < 800; i++) {
    const { events } = await api("GET", `/sessions/${sessionId}/events?afterSeq=0`);
    const found = events.find((e) => e.runId === runId && e.type === type);
    if (found) return found;
    await sleep(50);
  }
  throw new Error(`no ${type}`);
}

// ---- seed ------------------------------------------------------------------
console.error("seeding…");
await api("PUT", "/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
await api("POST", "/extensions/inbound-nda/lifecycle", { action: "load" });

const nda = (await api("POST", "/projects", { name: "NDA review" })).project;
const other = (await api("POST", "/projects", { name: "Northside Housing" })).project;

// A · a chat that asked a question, got an answer, and wrote a file.
const asked = (await api("POST", "/sessions", { projectId: nda.id, title: "Counterparty summary" })).session;
const askRun = (
  await api("POST", `/sessions/${asked.id}/runs`, {
    commandId: "media-question",
    input: scriptInput([
      { name: "ask_user", arguments: { prompt: "Which counterparty entity should the summary name?" } },
      {
        name: "ws_write",
        arguments: {
          path: "out/nda-summary.md",
          text: "# Inbound NDA — review summary\n\nSynthetic material.\n\n- Confidentiality term: 3 years from disclosure\n- Governing law: England and Wales\n- Counterparty entity: Northwind Logistics Ltd.\n",
        },
      },
    ]),
  })
).run;
const askedQuestion = await openEvent(asked.id, askRun.id, "question.open");
await api("POST", `/runs/${askRun.id}/questions/${askedQuestion.data.id}`, { answer: "Northwind Logistics Ltd." });
await settle(askRun.id, ["completed", "failed", "cancelled", "unknown"]);

// B · a bound matter with one candidate waiting on a person.
const bound = (await api("POST", "/sessions", { projectId: nda.id, title: "Inbound NDA — Project Cedar" })).session;
await api("POST", `/sessions/${bound.id}/extension`, {
  extensionId: "inbound-nda",
  input: { title: "Inbound NDA — Project Cedar", sourceText: SYNTHETIC_SOURCES[0].text, facts: NORMAL_FACTS },
});
const boundProjection = (await api("GET", `/sessions/${bound.id}/surface`)).projection;
const proposal = (
  await api("POST", `/sessions/${bound.id}/runs`, {
    commandId: "media-candidate",
    input: scriptInput([
      { name: "se_submit_candidate", arguments: { domain: buildReview({ sources: boundProjection.sources, facts: boundProjection.domain.facts }) } },
    ]),
  })
).run;
await settle(proposal.id, ["completed", "failed", "cancelled", "unknown"]);

// C · an unbound chat in the same project, so Continue in Work has somewhere to go.
const unbound = (await api("POST", "/sessions", { projectId: nda.id, title: "Side letter — open points" })).session;
// D · a chat in the other project, so Home holds two Projects with work in them.
const elsewhere = (await api("POST", "/sessions", { projectId: other.id, title: "Rent ledger reconciliation" })).session;
await settle((await api("POST", `/sessions/${elsewhere.id}/runs`, { commandId: "media-other", input: "hello fixture" })).run.id, [
  "completed", "failed", "cancelled", "unknown",
]);

// E · a write waiting for approval. This one is created *after* the review
// screenshots, not here: the service marks every work surface read-only while
// any run is active (service.mjs hasActiveRun), so a run parked on a person
// would quietly turn the review surface into a read-only reading and the
// decision controls the copy describes would not be in the picture.
const waiting = (
  await api("POST", "/sessions", { projectId: nda.id, title: "Exhibit index rebuild", permissionMode: "ask" })
).session;
async function parkAWriteOnApproval() {
  const run = (
    await api("POST", `/sessions/${waiting.id}/runs`, {
      commandId: "media-approval",
      input: scriptInput([{ name: "ws_write", arguments: { path: "out/exhibit-index.md", text: "# Exhibit index\n\nSynthetic material.\n" } }]),
    })
  ).run;
  await openEvent(waiting.id, run.id, "permission.open");
  await settle(run.id, ["waiting_user"]);
}

const seeded = {
  projects: { nda: nda.id, other: other.id },
  sessions: { asked: asked.id, bound: bound.id, unbound: unbound.id, elsewhere: elsewhere.id, waiting: waiting.id },
  matterId: (await api("GET", `/sessions/${bound.id}/surface`)).projection.matter.id,
};
console.error(JSON.stringify(seeded));
// Browser capture may be performed through the connected in-app browser.
// This mode only seeds the isolated synthetic host and writes its identities.
if (process.argv.includes("--seed-only")) {
  const seedFile = arg("--seed-file", null);
  if (!seedFile) throw new Error("--seed-only requires --seed-file outside the repository");
  await writeFile(seedFile, JSON.stringify({ source_sha: identity.source_sha, origin: ORIGIN, ...seeded }, null, 2) + "\n");
  process.exit(0);
}


// ---- the browser -----------------------------------------------------------
const profile = await mkdtemp(path.join(tmpdir(), "ps01-media-"));
const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profile}`,
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--window-size=1440,900",
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "ignore"] },
);

let version = null;
for (let i = 0; i < 120 && !version; i++) {
  try { version = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).json(); } catch { await sleep(150); }
}
if (!version) { chrome.kill(); throw new Error("headless browser did not open a debugging port"); }

const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let messageId = 0;
const pending = new Map();
socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
  }
};
const send = (method, params = {}, sid) =>
  new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, sessionId: sid }));
  });
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId: cdpSession } = await send("Target.attachToTarget", { targetId, flatten: true });
const cdp = (method, params) => send(method, params, cdpSession);
await cdp("Page.enable");
await cdp("Runtime.enable");

async function evaluate(expression) {
  const { result, exceptionDetails } = await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.text + " " + (exceptionDetails.exception?.description ?? ""));
  return result.value;
}
async function waitFor(expression, timeout = 25000) {
  const start = Date.now();
  for (;;) {
    if (await evaluate(expression)) return true;
    if (Date.now() - start > timeout) throw new Error(`timed out: ${expression}`);
    await sleep(120);
  }
}

const manifest = [];
async function shot(entry) {
  const { id, file, viewport, theme, ...rest } = entry;
  // A focus ring left over from the click that got here is not part of the
  // screen being documented.
  await evaluate(`(() => { document.activeElement?.blur?.(); return true; })()`);
  await sleep(200);
  const target = path.join(MEDIA, file);
  const png = Buffer.from((await cdp("Page.captureScreenshot", { format: "png" })).data, "base64");
  await mkdir(MEDIA, { recursive: true });
  await writeFile(target, png);
  manifest.push({
    id,
    kind: "product-screenshot",
    source_sha: identity.source_sha,
    capture_date: new Date().toISOString().slice(0, 10),
    viewport,
    theme,
    data_kind: "synthetic",
    provider_mode: "local deterministic fake (fake-openai-loopback); no real provider",
    capture_command: "node site/scripts/capture-media.mjs",
    asset_path: path.relative(ROOT, target).split(path.sep).join("/"),
    evidence_path: path.relative(ROOT, path.join(MEDIA, "manifest.json")).split(path.sep).join("/"),
    sha256: createHash("sha256").update(png).digest("hex"),
    bytes: png.length,
    ...rest,
  });
  console.error(`  ${id}  ${file}  ${png.length} B`);
}

async function viewport(width, height, theme) {
  await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
  await cdp("Emulation.setEmulatedMedia", {
    features: [
      { name: "prefers-color-scheme", value: theme },
      // Every screenshot is taken with motion off, so nothing is caught mid-way
      // through a transition.
      { name: "prefers-reduced-motion", value: "reduce" },
    ],
  });
}

async function home() {
  await cdp("Page.navigate", { url: `${ORIGIN}/?media=${Date.now()}` });
  await waitFor("window.__V5_UI__?.state.home.data");
  await sleep(900);
}

async function openSession(id) {
  await evaluate(`(() => { location.hash = ""; return true; })()`);
  await evaluate(`(() => {
    for (const p of document.querySelectorAll('[data-nav-key^="project:"]'))
      if (p.getAttribute("aria-expanded") !== "true") p.click();
    return true;
  })()`);
  await sleep(400);
  await evaluate(`(() => {
    const b = document.querySelector('[data-nav-key="session:${id}"]');
    if (!b) throw new Error("session row is not in the navigation");
    b.click();
    return true;
  })()`);
  await waitFor(`window.__V5_UI__.state.activeSessionId === ${JSON.stringify(id)}`);
  await sleep(900);
}

try {
  // ---- M6 · the review surface -------------------------------------------
  // First, while no run is active and the surface still carries its decisions.
  for (const [width, height, theme] of [[1440, 900, "light"], [1440, 900, "dark"], [390, 844, "light"]]) {
    await viewport(width, height, theme);
    await home();
    await openSession(seeded.sessions.bound);
    await evaluate(`(() => { document.getElementById("show-surface-button")?.click(); return true; })()`);
    await sleep(800);
    // The contributed review renderer mounts inside the preview pane, not on
    // the rail card that names it.
    await evaluate(`(() => {
      const open = document.querySelector('[aria-label="Open workspace"]');
      if (!open) throw new Error("the work surface rail did not offer its pane");
      open.click();
      return true;
    })()`);
    await waitFor(`/CANDIDATE/.test(document.getElementById("surface-content")?.innerText || "")`);
    await sleep(900);
    await shot({
      id: "M6",
      file: `review-${width}-${theme}.png`,
      viewport: `${width}x${height}`,
      theme,
      displayed_path: "/ · Work · work surface",
      setup_steps: "a bound matter whose scripted run proposed one candidate; nobody has decided yet",
      claim_ids: ["review"],
      limitations: "synthetic material; the candidate came from a scripted tool call, not a model",
    });
  }

  // ---- M3 · a question and its answer ------------------------------------
  await viewport(1440, 900, "light");
  await home();
  await openSession(seeded.sessions.asked);
  await shot({
    id: "M3",
    file: "chat-question-1440-light.png",
    viewport: "1440x900",
    theme: "light",
    displayed_path: "/ · Chat",
    setup_steps: "a chat whose scripted ask_user was answered, recorded with the run",
    claim_ids: ["run-chain"],
    limitations: "synthetic material; scripted tool call, no real provider",
  });

  // ---- M4 · the file and its hash ----------------------------------------
  await evaluate(`(() => { document.getElementById("materials-button")?.click(); return true; })()`);
  await sleep(1200);
  await evaluate(`(() => {
    const row = [...document.querySelectorAll("button")].find((b) => /nda-summary\\.md/.test(b.textContent));
    if (row) row.click();
    return Boolean(row);
  })()`);
  await sleep(1400);
  // Close the file list and open the version block: the copy for this picture
  // is about the file's identity, which is the hash, not the list it came from.
  await evaluate(`(() => {
    let closed = 0;
    for (const dialog of document.querySelectorAll("dialog[open]")) { dialog.close(); closed++; }
    return closed;
  })()`);
  await sleep(500);
  await evaluate(`(() => {
    const block = [...document.querySelectorAll("details.version-details")][0];
    if (!block) throw new Error("the file view shows no version block");
    block.open = true;
    return true;
  })()`);
  await sleep(600);
  await shot({
    id: "M4",
    file: "chat-file-1440-light.png",
    viewport: "1440x900",
    theme: "light",
    displayed_path: "/ · Chat files",
    setup_steps: "open the file the answered run wrote",
    claim_ids: ["run-chain"],
    limitations: "synthetic material",
  });

  // ---- M5 · Continue in Work ---------------------------------------------
  await home();
  await openSession(seeded.sessions.unbound);
  await evaluate(`(() => { window.__V5_UI__.state.bindingExtensionId = "inbound-nda"; return true; })()`);
  await evaluate(`(() => {
    const b = [...document.querySelectorAll("button")].find((n) => n.textContent.trim() === "Continue in Work");
    if (!b) throw new Error("Continue in Work is not offered");
    b.click();
    return true;
  })()`);
  await waitFor(`document.getElementById("binding-panel")?.hidden === false`);
  await sleep(900);
  await shot({
    id: "M5",
    file: "continue-in-work-1440-light.png",
    viewport: "1440x900",
    theme: "light",
    displayed_path: "/ · Continue in Work",
    setup_steps: "an unbound chat in a project that already holds one matter",
    claim_ids: ["continue-in-work"],
    limitations: "synthetic material",
  });

  // ---- M7 · Settings › Models --------------------------------------------
  // Both themes: this picture sits inside the page's own last section, and a
  // light slab in a dark page reads as a hole rather than as a screen.
  for (const theme of ["light", "dark"]) {
    await viewport(1440, 900, theme);
    await cdp("Page.navigate", { url: `${ORIGIN}/?media=${Date.now()}#settings/models` });
    await waitFor("window.__V5_UI__?.state.home.data");
    await waitFor(`document.getElementById("settings-models")?.getClientRects().length > 0`);
    await sleep(900);
    await evaluate(`(() => { document.querySelector(".connection-add").open = true; return true; })()`);
    await sleep(400);
    await evaluate(`(() => { document.getElementById("connection-path-compatible").click(); return true; })()`);
    await sleep(600);
    await shot({
      id: "M7",
      file: `settings-models-1440-${theme}.png`,
      viewport: "1440x900",
      theme,
      displayed_path: "/#settings/models",
      setup_steps: "open Add provider and choose the Compatible endpoint path",
      claim_ids: ["models"],
      limitations: "no endpoint is entered and nothing is probed; no credential is stored",
    });
  }

  // ---- now park a write on an approval, and photograph what that looks like
  console.error("parking a write on an approval…");
  await parkAWriteOnApproval();

  // ---- M1 · Home ---------------------------------------------------------
  for (const [width, height, theme] of [[1440, 900, "light"], [1440, 900, "dark"], [390, 844, "light"]]) {
    await viewport(width, height, theme);
    await home();
    // The reader should see the projects hold the work, not two closed folders.
    await evaluate(`(() => {
      for (const p of document.querySelectorAll('[data-nav-key^="project:"]'))
        if (p.getAttribute("aria-expanded") !== "true") p.click();
      return true;
    })()`);
    await sleep(600);
    await shot({
      id: "M1",
      file: `home-${width}-${theme}.png`,
      viewport: `${width}x${height}`,
      theme,
      displayed_path: "/",
      setup_steps: "two projects and five chats; the last chat holds a write waiting for approval",
      claim_ids: ["hero"],
      limitations: "synthetic material; the local deterministic provider answers every run",
    });
  }

  // ---- M2 · a run waiting on an approval ---------------------------------
  await viewport(1440, 900, "light");
  await home();
  await openSession(seeded.sessions.waiting);
  await evaluate(`(() => {
    const row = [...document.querySelectorAll("details")].find((d) => /ws_write/.test(d.textContent));
    if (row) row.open = true;
    return Boolean(row);
  })()`);
  await sleep(600);
  await shot({
    id: "M2",
    file: "chat-approval-1440-light.png",
    viewport: "1440x900",
    theme: "light",
    displayed_path: "/ · Chat",
    setup_steps: "a chat in Ask before editing whose scripted ws_write is waiting for a decision",
    claim_ids: ["run-chain"],
    limitations: "synthetic material; scripted tool call, no real provider",
  });

  await writeFile(
    path.join(MEDIA, "manifest.json"),
    JSON.stringify({ source_sha: identity.source_sha, origin: ORIGIN, media: manifest }, null, 2) + "\n",
  );
  console.error(`\nwrote ${manifest.length} images and site/media/manifest.json`);
} finally {
  socket.close();
  chrome.kill();
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }).catch(() => {});
}
