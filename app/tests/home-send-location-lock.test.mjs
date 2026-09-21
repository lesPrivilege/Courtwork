/* CE-R1 · a plain Home Send holds its chat's location for its whole operation.
 *
 * The 2026-09-21 review (evidence/composer-entry-acceptance-20260921) found
 * that once `submitHomeRun()` had created the Chat, the Work location panel
 * read that Chat with no lock while the Send was still binding, reading back,
 * flushing materials and saving its draft. The author's browser reproduction
 * (evidence/composer-entry-20260921/race-before) pressed Disconnect in that
 * window: it landed, and the Run then worked against a revoked folder.
 *
 * `submitHomeRun()` lives in app.mjs, which no test imports. What these tests
 * drive instead is everything it hands the card: the production decision
 * `workLocationLock` from home-preparation.mjs, given the marker exactly as
 * `submitHomeRun()` holds it at each await, and the real `createWorkspaceCard`
 * against a Host that records every command. Every location control is then
 * pressed. The whole-page race is the browser pass (race-after), not this file.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { workLocationLock } from "../web/home-preparation.mjs";
import { createWorkspaceCard, PREPARE_UNCERTAIN, RUN_SENDING, SEND_BUSY } from "../web/workspace-card.mjs";
import { withTinyDom, flush } from "./tiny-dom.mjs";

const ROOT_PATH = "/private/tmp/synthetic/parcel";
// Controls that change the location or start something. Disclosures (the path
// field's summary, "Which is which") only reveal; the field and Connect inside
// the path disclosure are covered as `path` / `connect`.
const MUTATIONS = ["open", "path", "connect", "remove", "recent", "change-folder", "keep-folder", "disconnect", "start-edits", "stop-edits", "project-new"];
async function settle() { await flush(); await flush(); await flush(); }

function recordingHost() {
  const commands = [];
  return {
    commands,
    async request(path, options = {}) {
      const method = options.method || "GET";
      if (method !== "GET") commands.push({ path, method });
      if (path === "/repositories/recent") return { entries: [{ rootPath: "/private/tmp/synthetic/other", available: true }] };
      if (path.startsWith("/repositories/inspect")) return { git: { head: "c6f8d7f9a7dda9f1852575115e87d8b6abc6c9d0" } };
      if (path === "/host/choose-directory") return { rootPath: "/private/tmp/synthetic/other" };
      return {};
    },
  };
}
const unbound = { id: "s1", projectId: null, permissionMode: "ask", repositoryBinding: null, repositoryBindingRevision: 0, repositoryCandidate: null, repositoryCandidateRevision: 0 };
const bound = { ...unbound, repositoryBindingRevision: 1, repositoryBinding: { id: "b1", rootPath: ROOT_PATH, revision: 1, status: "active" } };

/* The marker `submitHomeRun()` holds, step by step (app.mjs). */
const send = {
  creating:      { projectId: null, commandId: "c1", sessionId: "s1", session: null, pending: true, error: "" },
  createdUnbound:{ projectId: null, commandId: "c1", sessionId: "s1", session: unbound, pending: true, error: "" },
  boundReadBack: { projectId: null, commandId: "c1", sessionId: "s1", session: bound, bindRequestId: "r1", pending: true, error: "" },
  createUnknown: { projectId: null, commandId: "c1", sessionId: "s1", session: null, pending: false, unconfirmed: true, error: "unconfirmed" },
  bindRefused:   { projectId: null, commandId: "c1", sessionId: "s1", session: unbound, bindRequestId: "r1", pending: false, error: "Could not start: repository root could not be validated. Your instruction is kept." },
};

/* app.mjs `renderWorkspaceCard` for Home: the card reads the marker's Chat once
 * it exists, otherwise the staged draft. */
function renderHome(card, body, marker, { runPending = false, runUnconfirmed = false } = {}) {
  const session = marker?.session || null;
  const busyReason = workLocationLock({ marker, home: true, session, runPending, runUnconfirmed });
  card.render(body, {
    session, active: false,
    draft: session ? null : { path: ROOT_PATH, onChange: () => { throw new Error("the staged folder changed under a Send"); }, onPrepare: () => { throw new Error("prepared under a Send"); } },
    events: [], project: null, permissionLabel: "Ask before editing", busyReason,
    projectChoice: session ? null : { options: [{ id: "p1", name: "Parcel maintenance" }], selectedId: null, onChoose: () => { throw new Error("project changed under a Send"); }, onCreate: () => { throw new Error("project created under a Send"); } },
  });
  return busyReason;
}
function mutationControls(body) {
  return body.querySelectorAll("button,input,summary")
    .filter((node) => { const f = node.getAttribute("data-repository-field"); return f && (MUTATIONS.includes(f) || f.startsWith("project:")); });
}
async function pressAll(body) {
  for (const node of mutationControls(body)) node.click();
  await settle();
}

for (const [label, marker, reason] of [
  ["creating the Chat", send.creating, SEND_BUSY],
  ["Chat created, bind not landed", send.createdUnbound, SEND_BUSY],
  ["bound and read back, not yet admitted", send.boundReadBack, SEND_BUSY],
]) {
  test(`CE-R1 · ${label}: every location mutation is locked and says why`, () => withTinyDom(async (body) => {
    const host = recordingHost();
    const card = createWorkspaceCard({ request: host.request, onSession: () => {}, onClose: () => {} });
    assert.equal(renderHome(card, body, marker), reason);
    await settle();
    renderHome(card, body, marker);
    const controls = mutationControls(body);
    assert.ok(controls.length > 0, "the panel still shows the location's controls");
    for (const node of controls) assert.equal(node.disabled, true, `${node.getAttribute("data-repository-field")} is locked`);
    assert.match(body.textContent, new RegExp(reason.slice(0, 40)), "and the reason is said");
    assert.match(body.textContent, /Work location/, "reading stays available");
    await pressAll(body);
    assert.deepEqual(host.commands, [], "pressing everything sends nothing to the Host");
  }));
}

test("CE-R1 · the counterexample: after the Chat exists, the old condition left the panel unlocked", () => {
  // ac6049b computed the Send lock as `home && !session && !prepared && pending`.
  const old = (marker) => { const session = marker?.session || null; return Boolean(!session && !marker?.prepared && marker?.pending); };
  assert.equal(old(send.creating), true);
  assert.equal(old(send.createdUnbound), false, "reproduced: unlocked once the Chat existed");
  assert.equal(old(send.boundReadBack), false, "reproduced: unlocked while bound and not yet admitted");
  assert.equal(workLocationLock({ marker: send.createdUnbound, home: true, session: unbound }), SEND_BUSY);
  assert.equal(workLocationLock({ marker: send.boundReadBack, home: true, session: bound }), SEND_BUSY);
});

test("CE-R1 · the Run admission the Send ends in keeps the lock; an unknown admission too", () => withTinyDom(async (body) => {
  // submitHomeRun clears the Home marker and selects the Chat before it awaits
  // submitSessionRun; from then on the pending Run is what holds the location.
  const host = recordingHost();
  const card = createWorkspaceCard({ request: host.request, onSession: () => {}, onClose: () => {} });
  // The Run owner marks the admission unconfirmed before posting it, so in
  // flight both flags are set (race-before/race-after measured it); in flight
  // is said. Unconfirmed alone is a lost reply.
  for (const [flags, reason] of [[{ runPending: true, runUnconfirmed: true }, RUN_SENDING], [{ runPending: true }, RUN_SENDING], [{ runUnconfirmed: true }, PREPARE_UNCERTAIN]]) {
    const busyReason = workLocationLock({ marker: null, home: false, session: bound, ...flags });
    assert.equal(busyReason, reason);
    card.render(body, { session: bound, active: false, events: [], project: null, permissionLabel: "Ask before editing", busyReason });
    await settle();
    for (const node of mutationControls(body)) assert.equal(node.disabled, true, `${node.getAttribute("data-repository-field")} is locked`);
    assert.equal(mutationControls(body).some((n) => n.getAttribute("data-repository-field") === "change-folder"), false, "Change folder is not offered");
    await pressAll(body);
  }
  assert.deepEqual(host.commands, []);
}));

test("CE-R1 · an unknown create stays locked; Check status is not the card's to lock", () => {
  assert.equal(workLocationLock({ marker: send.createUnknown, home: true, session: null }), PREPARE_UNCERTAIN);
});

test("CE-R1 · a settled Send holds nothing: after a refused bind the folder can be corrected on the same chat", () => withTinyDom(async (body) => {
  const host = recordingHost();
  const card = createWorkspaceCard({ request: host.request, onSession: () => {}, onClose: () => {} });
  assert.equal(renderHome(card, body, send.bindRefused), null, "the Send has ended; nothing is in flight");
  await settle();
  renderHome(card, body, send.bindRefused);
  const connect = mutationControls(body).find((n) => n.getAttribute("data-repository-field") === "connect");
  assert.equal(connect.disabled, false, "the chooser is usable again");
  const recent = mutationControls(body).find((n) => n.getAttribute("data-repository-field") === "recent");
  recent.click();
  await settle();
  assert.deepEqual(host.commands.map((c) => `${c.method} ${c.path}`), ["PUT /sessions/s1/repository-binding"], "one bind, on the same chat");
  // Once admitted, and no longer pending, the card's own `active` is the lock.
  assert.equal(workLocationLock({ marker: null, home: false, session: bound }), null);
}));
