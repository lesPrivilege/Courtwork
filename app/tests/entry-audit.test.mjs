import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { boot } from "./helpers.mjs";

const root = new URL("../../", import.meta.url).pathname;

test("00 · a project can be created under a client-fixed id; the same id replays the same record and a different name conflicts", async () => {
  const h = await boot();
  try {
    const id = randomUUID();
    const first = await h.api("POST", "/projects", { name: "Audit", projectId: id });
    assert.equal(first.status, 200, JSON.stringify(first.json));
    assert.equal(first.json.project.id, id);
    const replay = await h.api("POST", "/projects", { name: "Audit", projectId: id });
    assert.equal(replay.status, 200); assert.equal(replay.json.idempotent, true); assert.equal(replay.json.project.id, id);
    assert.equal((await h.api("GET", "/projects")).json.projects.filter((p) => p.id === id).length, 1, "no second project");
    const conflict = await h.api("POST", "/projects", { name: "Other", projectId: id });
    assert.equal(conflict.status, 409); assert.equal(conflict.json.error.code, "project_conflict");
    const bad = await h.api("POST", "/projects", { name: "x", projectId: "not-a-uuid" });
    assert.equal(bad.status, 400);
    const plain = await h.api("POST", "/projects", { name: "Plain" });
    assert.equal(plain.status, 200); assert.match(plain.json.project.id, /^[0-9a-f-]{36}$/);
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("00 · entry audit: the global Refresh and the passive Expert seat are gone; recovery moved to the origin as Check status", () => {
  const html = readFileSync(`${root}app/web/index.html`, "utf8");
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  const css = readFileSync(`${root}app/web/styles.css`, "utf8");
  assert.doesNotMatch(html, /id="refresh-button"/, "no standing Refresh in the sidebar");
  assert.doesNotMatch(app, /"refresh-button"|Workspace refreshed|Refresh the workspace|Refresh to recover/, "no listener, toast or copy points at the removed button");
  assert.doesNotMatch(html, /id="expert-seat"|Planned<\/span>/, "no passive Expert placeholder in navigation");
  assert.doesNotMatch(app, /expert-seat/);
  assert.doesNotMatch(css, /\.nav-planned-seat|\.nav-seat-plan/);
  assert.match(html, /id="account-button"/, "the sidebar footer is the account identity");
  assert.match(app, /attrs: \{ id: "runtime-setup-button" \}/, "Settings stays reachable from the account menu");
  assert.match(app, /clientId: crypto\.randomUUID\(\), value, projectId, nav, startNext, homeRequest, unconfirmed: false/, "a creation fixes its identity before the POST");
  assert.match(app, /\? \{ name: value, projectId: attempt\.clientId \}/, "projects are created under the fixed id");
  assert.match(app, /sessionId: attempt\.clientId,/, "chats from the dialog are created under the fixed id");
  assert.match(app, /async function checkCreationStatus\(kind\)/);
  assert.match(app, /text: "Check status", attrs: \{ type: "button", "aria-label": `Check \$\{kind\} creation status` \}/);
  assert.match(app, /Creation could not be confirmed\. Check its status before creating/);
  assert.match(app, /async function checkHomeStart\(\)/);
  assert.match(app, /"aria-label": "Check chat creation status"/);
  /* The recovery itself is the Home preparation owner's (home-preparation.mjs,
     2026-09-21): same invariant, asked in the module that decides whether an
     outcome is settled. Nothing is created by asking — the id was minted
     client-side, so the read is by that id and a 404 is an answer. */
  const preparation = readFileSync(`${root}app/web/home-preparation.mjs`, "utf8");
  assert.match(preparation, /Creating the chat is unconfirmed\. Check its status to recover the same chat\. Your instruction is kept\./);
  assert.match(preparation, /request\(`\/sessions\/\$\{encodeURIComponent\(marker\.sessionId\)\}`\)/, "the Home chat is read back by its own id");
  assert.match(preparation, /if \(error\?\.status !== 404\) throw error;/, "and a missing chat is an answer, not a failure");
  assert.match(app, /nextAction === "retry-run"/, "the unconfirmed Run keeps its own Recover action");
});

test("00 · v3: no Runtime inventory card, no not-accepted sentence on ordinary results, the surface opens for an object not for a chat", () => {
  const modules = readFileSync(`${root}app/web/surface-modules.mjs`, "utf8");
  const inspector = readFileSync(`${root}app/web/inspector.mjs`, "utf8");
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  assert.doesNotMatch(modules, /runtimeModule|Runtime details have not been read/);
  assert.doesNotMatch(modules, /Not accepted by a review/);
  assert.doesNotMatch(inspector, /have not been accepted by a review/);
  assert.doesNotMatch(modules, /\bcard\(schema|railCard/, "06d · no module draws a card: an object opens as a tab");
  assert.doesNotMatch(app, /openRuntimeSettings|module\.kind === "runtime"/);
  assert.match(app, /if \(state\.view !== "session"\) state\.surface\.open = false;/, "entering a chat does not open the rail");
  assert.match(app, /state\.surface\.open = false;\s*renderAll\(\);\s*await loadSurface\(epoch\);/);
});

test("00 · one Work location entry; Connect folder stays the command inside it", () => {
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  const card = readFileSync(`${root}app/web/workspace-card.mjs`, "utf8");
  const html = readFileSync(`${root}app/web/index.html`, "utf8");
  assert.match(card, /export const WORK_LOCATION_EMPTY = "Choose work location";/);
  assert.match(card, /export const WORK_LOCATION_TITLE = "Work location";/);
  assert.match(app, /workLocationEntry\(\{ projectName:/);
  assert.doesNotMatch(app, /"Choose workspace"/);
  assert.match(card, /text: "Connect folder…"/);
  assert.doesNotMatch(html, /id="home-project-button"/);
});
