/* The four friction seams the 2026-09-20 real dogfood run left behind.
 *
 * Each test here is first a counterexample: it describes what the browser
 * journey actually showed (a stale "0 writes" beside a real one-line diff, a
 * keyboard dropped on the page after Start private candidate, boundary copy
 * that overstates what the Host does not do, and a profile list that keeps
 * showing the values you just changed while its read is still out). None of
 * them is a helper's arithmetic; each one is exercised at the seam where the
 * fact crosses from a Host receipt into what a person reads.
 *
 * Source of the observed behaviour:
 * engineering/execution/claude-frontend-harness-2026-09-16/evidence/real-dogfood-20260920/README.md
 * (journey items 1, 3, 6 and the queued boundary-copy findings).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  createWorkspaceCard,
  candidateWriteRevision,
  REPOSITORY_HELP,
  REPOSITORY_DRAFT_SCOPE,
} from "../web/workspace-card.mjs";
import { createAgentProfilesController } from "../web/agent-profiles.mjs";
import { createAgentProfilesView } from "../web/agent-profiles-view.mjs";
import { withTinyDom, flush, deferred } from "./tiny-dom.mjs";

const root = new URL("../../", import.meta.url).pathname;
const field = (body, key) =>
  [...body.querySelectorAll("button,input,summary,details")].find(
    (node) => node.getAttribute("data-repository-field") === key,
  );
async function settle() { await flush(); await flush(); await flush(); }

const BINDING = { id: "b1", rootPath: "/synthetic/parcel", device: "1", inode: "2", revision: 1, status: "active" };
const CANDIDATE = {
  id: "cand-1", status: "active", revision: 1, sourceBindingId: "b1", sourceBindingRevision: 1,
  baseCommit: "c8310f06ef6022f0b1dbe6f2b6b1bbbf0f3c5a11", objectFormat: "sha1",
  writeRevision: 0, createdAt: "2026-09-20T00:00:00.000Z",
};
const bound = { id: "s1", permissionMode: "ask", repositoryBindingRevision: 1, repositoryCandidateRevision: 0, repositoryCandidate: null, repositoryBinding: BINDING };
const withCandidate = { ...bound, repositoryCandidateRevision: 1, repositoryCandidate: CANDIDATE };
/* The Host's own confirmation of the write that the dogfood run approved. It
 * is already in the client's event list; nothing below invents it. */
const CONFIRMED_WRITE = {
  seq: 41, sessionId: "s1", runId: "run-1", type: "repository.write.confirmed",
  data: { effectId: "e1", requestId: "r1", candidateId: "cand-1", path: "src/parcel.mjs", contentSha256: "a".repeat(64), bytes: 445, writeRevision: 1 },
};

/* ── 1 · the count that stayed at zero ─────────────────────────────────── */

test("a confirmed write moves the candidate reading even though the cached Session still says zero", () => {
  // The counterexample, exactly as 08-host-diff.png shows it: the Session the
  // client last read still carries writeRevision 0 while the Host has already
  // confirmed revision 1, so the heading said "0 writes" over a real diff.
  assert.equal(withCandidate.repositoryCandidate.writeRevision, 0);
  assert.equal(candidateWriteRevision(withCandidate, [CONFIRMED_WRITE]), 1);
  // Two Host receipts, never a third fact: with no newer event the Session's
  // own count is the answer, and a count that is already ahead is not lowered.
  assert.equal(candidateWriteRevision(withCandidate, []), 0);
  assert.equal(candidateWriteRevision({ ...withCandidate, repositoryCandidate: { ...CANDIDATE, writeRevision: 3 } }, [CONFIRMED_WRITE]), 3);
});

test("the reading belongs to one candidate: another candidate's writes and unconfirmed effects are not counted", () => {
  const otherCandidate = { ...CONFIRMED_WRITE, data: { ...CONFIRMED_WRITE.data, candidateId: "cand-2", writeRevision: 9 } };
  assert.equal(candidateWriteRevision(withCandidate, [otherCandidate]), 0);
  const prepared = { ...CONFIRMED_WRITE, type: "repository.write.prepared" };
  assert.equal(candidateWriteRevision(withCandidate, [prepared]), 0);
  assert.equal(candidateWriteRevision(bound, [CONFIRMED_WRITE]), null, "no active candidate has no reading");
});

test("the Workspace card's Writes line reads the confirmed write, not the cached Session field", () => withTinyDom(async (body) => {
  const request = async (path) => (path === "/repositories/recent" ? { entries: [] } : {});
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {}, onReviewChanges: () => {} });
  card.render(body, { session: withCandidate, active: false, events: [] });
  assert.match(body.textContent, /Writes\s*0/, "the Session alone still reads zero");
  card.render(body, { session: withCandidate, active: false, events: [CONFIRMED_WRITE] });
  assert.match(body.textContent, /Writes\s*1/, "the Host's confirmation is what the person reads");
}));

test("the changes dialog takes its count from the diff receipt it is already reading", () => {
  // The seam in app.mjs: the heading was painted from the cached Session and
  // never re-read, although the Host's diff reply carries writeRevision in the
  // same response that produced the visible patch (service.mjs
  // getRepositoryCandidateDiff). Refreshing must not rebuild the patch body.
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  assert.match(app, /function candidateHeading\(/, "one place decides what the heading says");
  assert.match(app, /candidateHeading\(session\.repositoryCandidate\.baseCommit, candidateWriteRevision\(session, state\.events\)\)/);
  assert.match(app, /candidateHeading\(result\.baseCommit, result\.writeRevision\)/, "the settled receipt refreshes the heading");
  const settle = app.slice(app.indexOf("async function openCandidateDiff"));
  const refresh = settle.indexOf("candidateHeading(result.baseCommit");
  const repaint = settle.indexOf("body.replaceChildren()");
  assert.ok(refresh >= 0 && repaint >= 0 && refresh < repaint, "the heading is refreshed before the patch is drawn, so a later refresh never re-enters the body");
});

/* ── 2 · focus after Start private candidate ───────────────────────────── */

test("Start private candidate leaves the keyboard on the control that now answers it", () => withTinyDom(async (body) => {
  const request = async (path) => {
    if (path.startsWith("/repositories/inspect")) return { rootPath: BINDING.rootPath, available: true, git: { branch: "main", head: CANDIDATE.baseCommit, detached: false } };
    if (path === "/repositories/recent") return { entries: [] };
    return {};
  };
  const card = createWorkspaceCard({
    request,
    onSession: async () => { card.render(body, { session: withCandidate, active: false, events: [] }); },
    onClose: () => {}, onReviewChanges: () => {},
  });
  card.render(body, { session: bound, active: false, events: [] });
  const start = field(body, "start-edits");
  start.focus();
  start.click();
  /* The platform detail this tiny DOM does not model: disabling the control
   * under the keyboard drops focus to the page, which is exactly what the
   * dogfood journey observed. Reproduce it before the reply lands. */
  document.activeElement.blur();
  assert.equal(document.activeElement, null);
  await settle();
  const landed = document.activeElement?.getAttribute("data-repository-field");
  assert.equal(landed, "review", "Review changes is what the new candidate offers next");
  assert.ok(body.contains(document.activeElement), "focus stays inside the card");
}));

test("Stop edits puts the keyboard back on the control that can start another candidate", () => withTinyDom(async (body) => {
  const request = async (path) => (path === "/repositories/recent" ? { entries: [] } : {});
  const card = createWorkspaceCard({
    request,
    onSession: async () => { card.render(body, { session: bound, active: false, events: [] }); },
    onClose: () => {}, onReviewChanges: () => {},
  });
  card.render(body, { session: withCandidate, active: false, events: [] });
  const stop = field(body, "stop-edits");
  stop.focus();
  stop.click();
  document.activeElement.blur();
  await settle();
  assert.equal(document.activeElement?.getAttribute("data-repository-field"), "start-edits");
}));

/* ── 3 · what the card says the Host does ──────────────────────────────── */

test("the folder card does not claim the Host reads nothing or sends nothing", () => {
  /* Both sentences were measured against behaviour, not intent: a staged
   * folder is stat'd and its Git status read at once (service.mjs
   * getRepositoryInspection, called from renderContextStrip), and file text a
   * run reads goes on to the model that is configured for it. */
  assert.doesNotMatch(REPOSITORY_HELP, /Nothing is uploaded/);
  assert.doesNotMatch(REPOSITORY_DRAFT_SCOPE, /Nothing is read before then/);
  assert.match(REPOSITORY_HELP, /folder is not changed|never written/, "the folder staying unwritten is true and stays");
  for (const sentence of [REPOSITORY_HELP, REPOSITORY_DRAFT_SCOPE]) {
    assert.doesNotMatch(sentence, /\blocal\b/i, "no claim about what any particular runtime sends");
    assert.ok(sentence.length <= 210, "a sentence at the control, not a warning wall");
  }
  const card = readFileSync(`${root}app/web/workspace-card.mjs`, "utf8");
  assert.doesNotMatch(card, /Nothing is uploaded|Nothing is read before then/);
});

test("the card names the four things a coding task depends on and keeps them apart", () => withTinyDom(async (body) => {
  const request = async (path) => (path === "/repositories/recent" ? { entries: [] } : {});
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {}, onReviewChanges: () => {} });
  card.render(body, {
    session: withCandidate, active: false, events: [],
    project: { id: "p1", name: "Courtwork" },
    permissionLabel: "Ask before editing",
  });
  const text = body.textContent;
  assert.match(text, /Project/);
  assert.match(text, /Courtwork/);
  assert.match(text, /Folder/);
  assert.match(text, /Read only/);
  assert.match(text, /Private candidate/);
  assert.match(text, /Ask before editing/);
  // Read only belongs to the folder; the candidate is the only writable thing.
  assert.doesNotMatch(text, /Kit/, "no Kit is named here, and none grants this");
}));

test("File access explains all three Host modes and the disclosure survives event renders", () => withTinyDom(async (body) => {
  const request = async (path) => (path === "/repositories/recent" ? { entries: [] } : {});
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {}, onReviewChanges: () => {} });
  const render = (events) => card.render(body, {
    session: withCandidate, active: false, events,
    project: { id: "p1", name: "Courtwork" }, permissionLabel: "Ask before editing",
  });

  render([]);
  let disclosure = field(body, "roles-summary").parentNode;
  assert.match(disclosure.textContent, /Ask before editing shows each exact write and check for approval/);
  assert.match(disclosure.textContent, /Allow edits lets writes proceed without asking, but checks still require approval/);
  assert.match(disclosure.textContent, /Read only blocks writes and checks/);

  disclosure.open = true;
  disclosure.setAttribute("open", "");
  disclosure.dispatchEvent({ type: "toggle" });
  render([CONFIRMED_WRITE]);
  disclosure = field(body, "roles-summary").parentNode;
  assert.equal(disclosure.hasAttribute("open"), true, "a Host event render preserves the user's expanded reading state");

  disclosure.open = false;
  disclosure.removeAttribute("open");
  disclosure.dispatchEvent({ type: "toggle" });
  const outside = body.ownerDocument.createElement("button");
  outside.focus();
  render([{ ...CONFIRMED_WRITE, seq: 42 }]);
  disclosure = field(body, "roles-summary").parentNode;
  assert.equal(disclosure.hasAttribute("open"), false, "a later Host event render also preserves an explicit collapse");
  assert.equal(document.activeElement, outside, "refreshing the card does not take focus from another surface");
}));

test("a bound folder can be changed without first disconnecting, and the Host's own precondition is stated", () => withTinyDom(async (body) => {
  const calls = [];
  const request = async (path, options = {}) => {
    calls.push({ path, body: options.body });
    if (path === "/repositories/recent") return { entries: [{ rootPath: "/synthetic/other", available: true }] };
    if (path === "/host/choose-directory") return { rootPath: "/synthetic/other" };
    return {};
  };
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {}, onReviewChanges: () => {} });
  // With a candidate open the Host refuses to rebind (store.mjs ACTIVE_CANDIDATE);
  // the card says so where the control is instead of offering a failing button.
  card.render(body, { session: withCandidate, active: false, events: [] });
  assert.equal(field(body, "change-folder"), undefined);
  assert.match(body.textContent, /Stop edits/);
  // With no candidate the existing bind command changes the folder in one step.
  card.render(body, { session: bound, active: false, events: [] });
  field(body, "change-folder").click();
  await settle();
  field(body, "recent").click();
  await settle();
  const bind = calls.find((call) => call.path === "/sessions/s1/repository-binding");
  assert.equal(bind.body.operation, "bind");
  assert.equal(bind.body.rootPath, "/synthetic/other");
  assert.equal(bind.body.expectedRevision, 1);
  assert.equal(calls.some((call) => call.body?.operation === "revoke"), false, "changing is not disconnecting");
}));

test("leaving the change-folder path keeps the binding and the typed draft", () => withTinyDom(async (body) => {
  const request = async (path) => (path === "/repositories/recent" ? { entries: [] } : {});
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {}, onReviewChanges: () => {} });
  card.render(body, { session: bound, active: false, events: [] });
  field(body, "change-folder").click();
  await settle();
  const input = field(body, "path");
  input.value = "/synthetic/typed";
  input.dispatchEvent({ type: "input", target: input });
  field(body, "keep-folder").click();
  await settle();
  assert.ok(field(body, "change-folder"), "the bound card is back");
  assert.match(body.textContent, /\/synthetic\/parcel/, "the binding was never touched");
  field(body, "change-folder").click();
  await settle();
  assert.equal(field(body, "path").value, "/synthetic/typed", "the draft path survives the round trip");
}));

/* ── 4 · the profile list that showed what you had just changed ────────── */

function profilesFixture() {
  const rows = (name) => [{
    id: "agent-1", name, responsibility: "Reads and drafts.", roleName: "General work",
    kitNames: ["Praxis"], runtimeName: "Pi", runtimeAvailability: "available", revision: 1,
    activeRun: null, nextAction: { label: "Open", targetId: "agent-1" },
  }];
  const state = { name: "Before", pending: null };
  return {
    state,
    capabilities: () => ({ canSave: true, reason: "" }),
    async list() {
      const gate = deferred();
      state.pending = { gate, name: state.name };
      await gate.promise;
      return { rows: rows(state.name) };
    },
    async open() {
      return {
        profile: { id: "agent-1", name: state.name, revision: 1, savedAt: "2026-09-20T12:00:00.000Z", roleId: "role-work", kitIds: [], runtimeId: "rt-pi", activeRun: null },
        roles: [{ id: "role-work", name: "General work", purpose: "Drafts." }],
        kits: [], runtimes: [{ id: "rt-pi", name: "Pi", location: "This computer", availability: "available", unavailableReason: "", modelOwner: "courtwork", model: { effective: "Synthetic model", source: "Models", requested: null, note: "Synthetic." }, supportedActions: [], grants: {} }],
      };
    },
    async save() { throw new Error("not used"); },
    async runtimeDetail() { throw new Error("not used"); },
  };
}

test("rows from the previous reading are not presented as the confirmed list while a read is out", () => withTinyDom(async (mount) => {
  globalThis.document.body = mount.ownerDocument.createElement("body");
  const adapter = profilesFixture();
  const controller = createAgentProfilesController({ adapter });
  createAgentProfilesView(mount, controller);
  void controller.openList();
  await settle();
  adapter.state.pending.gate.resolve();
  await settle();
  assert.match(mount.textContent, /Before/);
  const list = mount.querySelector('[data-testid="profile-list"]');
  assert.equal(list.getAttribute("aria-busy"), "false");

  // Something changed the profile elsewhere; the person comes back to the list.
  adapter.state.name = "After";
  void controller.openList();
  await settle();
  const pendingList = mount.querySelector('[data-testid="profile-list"]');
  assert.equal(pendingList.getAttribute("aria-busy"), "true", "the read is still out");
  assert.ok(mount.querySelector('[data-testid="list-pending"]'), "and it is said in words, not only to the accessibility tree");
  assert.match(mount.textContent, /Before/, "the rows that are there stay readable");
  assert.ok(mount.querySelector('[data-focus-key="row:agent-1"]'), "the row you left from is still the anchor");

  adapter.state.pending.gate.resolve();
  await settle();
  assert.match(mount.textContent, /After/);
  assert.equal(mount.querySelector('[data-testid="profile-list"]').getAttribute("aria-busy"), "false");
  assert.equal(mount.querySelector('[data-testid="list-pending"]'), null);
}));

test("a list reply that arrives after you have opened a profile does not land", () => withTinyDom(async (mount) => {
  globalThis.document.body = mount.ownerDocument.createElement("body");
  const adapter = profilesFixture();
  const controller = createAgentProfilesController({ adapter });
  createAgentProfilesView(mount, controller);
  void controller.openList();
  await settle();
  const first = adapter.state.pending;
  void controller.openProfile("agent-1");
  await settle();
  assert.equal(controller.getState().view, "profile");
  // The read the list started belongs to a surface nobody is on any more.
  adapter.state.name = "Stale";
  first.gate.resolve();
  await settle();
  const after = controller.getState();
  assert.equal(after.view, "profile", "a late list reply never navigates");
  assert.equal(after.list.status, "loading", "and it is not adopted as the confirmed list either");
  assert.doesNotMatch(mount.textContent, /Stale/);
}));
