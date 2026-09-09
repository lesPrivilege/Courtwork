/* WO-MA2-02 · Thread consumer surface.
 *
 * Two kinds of check, following the conventions already in this directory:
 *   (1) the projection module's shape gate — a payload this surface does not
 *       recognise yields null, per counterexample class (missing field, wrong
 *       schemaVersion, out-of-range pagination), the way
 *       `home-presentation.test.mjs` does it;
 *   (2) a source regression in the shape of `chat-work-shell.test.mjs`: the two
 *       new modules are in the server's static allowlist (an omission there is a
 *       silent 404 in the browser and nothing else catches it), and this slice
 *       introduces no second `POST /sessions/:id/runs` write path.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import {
  MAILBOX_PAGE,
  attachableThreads,
  currentThreadFor,
  messageTargets,
  projectDirectory,
  projectMailbox,
  projectMessageReceipt,
  projectSessionOptions,
  projectThreadReceipt,
  sameScope,
} from "../web/coordination-projection.mjs";

const AT = "2026-09-10T12:00:00.000Z";

function thread(id, overrides = {}) {
  return {
    id,
    title: `Thread ${id}`,
    scope: { kind: "global", projectId: null, matterId: null },
    sessionIds: [`session-${id}`],
    revision: 1,
    status: "open",
    createdAt: AT,
    creation: { sessionId: `session-${id}`, title: `Thread ${id}` },
    available: true,
    ...overrides,
  };
}

function directory(threads = [thread("a"), thread("b")], overrides = {}) {
  return {
    schemaVersion: 1,
    threads,
    currentThreadId: null,
    capabilities: { message: true, explore: false, handoff: false, workflow: false },
    ...overrides,
  };
}

function message(id, overrides = {}) {
  return {
    id,
    sourceThreadId: "a",
    targetThreadId: "b",
    sourceSessionId: "session-a",
    sourceRunId: null,
    sourceCallId: null,
    actor: "human",
    kind: "request",
    text: "Please look at the retained filing.",
    replyTo: null,
    expectedTargetRevision: 1,
    status: "delivered",
    revision: 2,
    createdAt: AT,
    deliveredAt: AT,
    ...overrides,
  };
}

function mailbox(messages = [message("m1")], overrides = {}) {
  return {
    schemaVersion: 1,
    thread: thread("a"),
    authority: "communication-only",
    offset: 0,
    total: messages.length,
    nextOffset: null,
    messages,
    ...overrides,
  };
}

test("MA2-02 · the Thread directory projects only the published contract", () => {
  const projected = projectDirectory(directory());
  assert.deepEqual(projected.threads.map((t) => t.id), ["a", "b"]);
  assert.deepEqual(projected.capabilities, { message: true, explore: false, handoff: false, workflow: false });
  assert.equal(projected.currentThreadId, null);

  const invalid = [
    // Missing field.
    ["thread without a creation receipt", (data) => { delete data.threads[0].creation; }],
    ["thread without a scope", (data) => { delete data.threads[0].scope; }],
    ["capabilities missing workflow", (data) => { delete data.capabilities.workflow; }],
    // Wrong schemaVersion.
    ["schemaVersion 2", (data) => { data.schemaVersion = 2; }],
    ["schemaVersion absent", (data) => { delete data.schemaVersion; }],
    // Identity and reference.
    ["duplicate Thread identity", (data) => { data.threads[1].id = "a"; }],
    ["current Thread outside the directory", (data) => { data.currentThreadId = "absent"; }],
    ["revision below one", (data) => { data.threads[0].revision = 0; }],
    ["unsupported status", (data) => { data.threads[0].status = "archived"; }],
    ["availability as a string", (data) => { data.threads[0].available = "yes"; }],
    ["unsupported scope kind", (data) => { data.threads[0].scope.kind = "matter"; }],
  ];
  for (const [name, mutate] of invalid) {
    const data = structuredClone(directory());
    mutate(data);
    assert.equal(projectDirectory(data), null, name);
  }
});

test("MA2-02 · a mailbox page must stay inside the bounds the server reported", () => {
  const projected = projectMailbox(mailbox(), "a");
  assert.deepEqual(projected.messages.map((m) => [m.direction, m.otherThreadId, m.status]), [["outgoing", "b", "delivered"]]);
  assert.equal(projected.previousOffset, null);

  const second = projectMailbox(mailbox([message("m1")], { offset: MAILBOX_PAGE, total: MAILBOX_PAGE + 1 }), "a");
  assert.equal(second.previousOffset, 0);

  const invalid = [
    // Out-of-range pagination.
    ["page longer than the server ceiling", () => mailbox(
      Array.from({ length: MAILBOX_PAGE + 1 }, (_, index) => message(`m${index}`)),
      { total: MAILBOX_PAGE + 1 },
    )],
    ["page running past the reported total", () => mailbox([message("m1"), message("m2")], { total: 1 })],
    ["offset running past the reported total", () => mailbox([message("m1")], { offset: 5, total: 3 })],
    ["next cursor that skips a message", () => mailbox([message("m1")], { total: 9, nextOffset: 4 })],
    ["next cursor at or past the total", () => mailbox([message("m1")], { total: 1, nextOffset: 1 })],
    ["negative offset", () => mailbox([message("m1")], { offset: -1 })],
    // Missing field.
    ["message without a created stamp", () => mailbox([message("m1", { createdAt: undefined })])],
    ["mailbox without an authority", () => { const page = mailbox(); delete page.authority; return page; }],
    // Wrong schemaVersion.
    ["schemaVersion 0", () => mailbox([message("m1")], { schemaVersion: 0 })],
    // Identity, settlement and direction.
    ["unsupported settlement word", () => mailbox([message("m1", { status: "sent" })])],
    ["reply without a parent", () => mailbox([message("m1", { kind: "reply" })])],
    ["parent without a reply kind", () => mailbox([message("m1", { replyTo: "m0" })])],
    ["message belonging to neither side", () => mailbox([message("m1", { sourceThreadId: "x", targetThreadId: "y" })])],
    ["message looping onto one Thread", () => mailbox([message("m1", { targetThreadId: "a" })])],
    ["delivered stamp as an empty string", () => mailbox([message("m1", { deliveredAt: "" })])],
    ["a mailbox for a different Thread", () => mailbox()],
  ];
  for (const [name, build] of invalid) {
    const viewed = name === "a mailbox for a different Thread" ? "b" : "a";
    assert.equal(projectMailbox(build(), viewed), null, name);
  }
});

test("MA2-02 · an undelivered message keeps an explicit null, not an empty time", () => {
  const projected = projectMailbox(mailbox([message("m1", { status: "queued", revision: 1, deliveredAt: null })]), "a");
  assert.equal(projected.messages[0].deliveredAt, null);
  assert.equal(projected.messages[0].status, "queued");
});

test("MA2-02 · receipts are validated with the same gate as the directory rows", () => {
  assert.equal(projectThreadReceipt({ schemaVersion: 1, thread: thread("a") }).id, "a");
  assert.equal(projectThreadReceipt({ schemaVersion: 1 }), null);
  assert.equal(projectThreadReceipt({ schemaVersion: 2, thread: thread("a") }), null);
  // `available` is derived per read: the directory and the mailbox publish it,
  // the POST receipts return the stored record and do not. Absent is null, not
  // false — a guessed false would read on screen as "this Thread is closed".
  const stored = thread("a");
  delete stored.available;
  assert.equal(projectThreadReceipt({ schemaVersion: 1, thread: stored }).available, null);
  assert.equal(projectDirectory(directory([stored])), null, "a directory row must publish availability");
  assert.equal(projectMailbox({ ...mailbox(), thread: stored }, "a"), null, "a mailbox thread must publish availability");
  const settled = projectMessageReceipt({ schemaVersion: 1, message: message("m1", { status: "stale_target" }) }, "a");
  assert.equal(settled.status, "stale_target");
  assert.equal(settled.direction, "outgoing");
  assert.equal(projectMessageReceipt({ schemaVersion: 1, message: message("m1") }, "unrelated"), null);
});

test("MA2-02 · Session options carry the scope the server itself derives", () => {
  const projected = projectSessionOptions({ sessions: [
    { id: "s1", title: "Global chat", scope: "global", projectId: null, extensionBinding: null },
    { id: "s2", title: "", scope: "project", projectId: "p1", extensionBinding: { binding: { matterId: "m1" } } },
  ] });
  assert.deepEqual(projected[0].scope, { kind: "global", projectId: null, matterId: null });
  assert.deepEqual(projected[1].scope, { kind: "project", projectId: "p1", matterId: "m1" });
  // An untitled conversation is an explicit absence, never "".
  assert.equal(projected[1].title, null);

  assert.equal(projectSessionOptions({}), null, "missing field");
  assert.equal(projectSessionOptions({ sessions: [{ id: "s1", scope: "matter" }] }), null, "unsupported scope");
  assert.equal(projectSessionOptions({ sessions: [{ scope: "global" }] }), null, "session without an identity");
  assert.equal(projectSessionOptions({ sessions: [
    { id: "s1", title: "One", scope: "global", projectId: null },
    { id: "s1", title: "Two", scope: "global", projectId: null },
  ] }), null, "duplicate session identity");
});

test("MA2-02 · option lists offer only bindings the server would accept", () => {
  const global = thread("a");
  const project = thread("b", {
    scope: { kind: "project", projectId: "p1", matterId: null },
    sessionIds: [],
    creation: { sessionId: "session-a", title: "Thread b" },
  });
  const closed = thread("c", { status: "closed", available: false, sessionIds: [] });
  const threads = [global, project, closed];
  const session = { id: "session-a", title: "One", scope: { kind: "global", projectId: null, matterId: null } };

  assert.equal(currentThreadFor(threads, session).id, "a");
  assert.equal(currentThreadFor(threads, { ...session, scope: { kind: "project", projectId: "p1", matterId: null } }), null,
    "membership at a scope that no longer matches is not current membership");
  // Same scope, open, not already a member. Cross-scope and closed are excluded.
  assert.deepEqual(attachableThreads(threads, session).map((t) => t.id), []);
  assert.deepEqual(attachableThreads(threads, { ...session, id: "session-x" }).map((t) => t.id), ["a"]);
  // Human sends may cross scope, but never target an unavailable Thread or the sender's own.
  assert.deepEqual(messageTargets(threads, "a").map((t) => t.id), ["b"]);
  assert.equal(sameScope(global.scope, project.scope), false);
  assert.equal(sameScope(global.scope, { kind: "global", projectId: null, matterId: null }), true);
});

/* ---- Source regression ---- */

const root = new URL("../../", import.meta.url).pathname;
const serverSource = readFileSync(`${root}app/server/index.mjs`, "utf8");
const viewSource = readFileSync(`${root}app/web/coordination-view.mjs`, "utf8");
const projectionSource = readFileSync(`${root}app/web/coordination-projection.mjs`, "utf8");
const mountSource = readFileSync(`${root}app/web/attention-agent-view.mjs`, "utf8");

test("MA2-02 · both new modules are admitted by the static allowlist", () => {
  // The literal array in server/index.mjs is the only gate on /web/*.mjs. A
  // module missing from it 404s silently in the browser; no other test looks.
  const allowlist = serverSource.slice(serverSource.indexOf("for (const name of ["), serverSource.indexOf("STATIC.set(\"/web/vendor/icons.svg\""));
  for (const name of ["coordination-view.mjs", "coordination-projection.mjs"])
    assert.match(allowlist, new RegExp(`"${name}"`), `${name} is not served`);
});

test("MA2-02 · the consumer surface adds no second run-start path", () => {
  const runStarts = (source) => (source.match(/\/sessions\/\$\{[^}]*\}\/runs/g) || []).length;
  assert.equal(runStarts(viewSource), 0, "the Thread panel must not start Runs");
  assert.equal(runStarts(projectionSource), 0, "a projection module never fetches");
  assert.equal(runStarts(mountSource), 0, "the mount point gained no write path");
  // Delivery is stated in the server's own words, next to what it is not.
  for (const word of ["queued", "delivered", "stale_target", "target_unavailable"])
    assert.match(projectionSource, new RegExp(`"${word}"`), word);
  assert.match(viewSource, /does not start a Run/);
  // A projection module fetches nothing, keeps nothing and reads no clock.
  // The header comment names those rules, so comments are stripped first.
  const code = projectionSource.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  for (const forbidden of ["fetch(", "Date.now(", "request(", "localStorage"])
    assert.equal(code.includes(forbidden), false, forbidden);
  // Only known lists are selectable: no free-text Thread ID field (MA2-D12).
  assert.doesNotMatch(viewSource, /'Thread ID'|"Thread ID"/);
});
