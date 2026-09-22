/* E1 seam tests: the Agent choice controller against a synthetic owner shaped
 * on the candidate K3 Runtime Control contract. DOM-free. */
import test from "node:test";
import assert from "node:assert/strict";
import { createAgentChoiceController, projectProfileSource, liveAgentChoiceAdapter } from "../web/agent-choice.mjs";
import { createAgentChoiceFixture } from "./fixtures/agent-choice/adapter.mjs";

const instant = () => Promise.resolve();
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
async function setup(scenario = "normal") {
  const fixture = createAgentChoiceFixture({ pause: instant });
  fixture.configure(scenario);
  const controller = createAgentChoiceController({ adapter: fixture.adapter, getSessionId: () => "session-synthetic" });
  await controller.load();
  return { fixture, controller };
}

test("the chat inherits General; Send carries the fresh effective selection", async () => {
  const { controller } = await setup();
  const state = controller.getState();
  assert.equal(state.snapshot.sessionSelection, null, "nothing selected at session scope");
  assert.deepEqual(state.next.send, { enabled: true, reason: "", runtimeSelection: { revision: 12, profileId: "agent:general", sourceHash: null } });
  assert.deepEqual(state.snapshot.profiles.map((p) => p.id), ["agent:general", "local:coding", "local:notes"]);
});

test("without the Host's expectation capability Send omits runtimeSelection", async () => {
  const fixture = createAgentChoiceFixture({ pause: instant, checks: false });
  const controller = createAgentChoiceController({ adapter: fixture.adapter, getSessionId: () => "session-synthetic" });
  await controller.load();
  assert.deepEqual(controller.getState().next.send, { enabled: true, reason: "", runtimeSelection: null });
  assert.equal(controller.getState().snapshot.sessionKind, "chat");
});

test("Check again settles an unknown outcome by read-back", async () => {
  const fixture = createAgentChoiceFixture({ pause: instant });
  let lose = true;
  const adapter = { ...fixture.adapter, select: async (id, body) => { const r = await fixture.adapter.select(id, body); if (lose) { lose = false; throw new Error("lost"); } return r; } };
  // First reply is lost but the write landed; make the automatic read-back fail too.
  let failRead = false;
  const read = adapter.read; adapter.read = async (...a) => { if (failRead) { failRead = false; throw new Error("no answer"); } return read(...a); };
  const controller = createAgentChoiceController({ adapter, getSessionId: () => "session-synthetic" });
  await controller.load();
  failRead = true;
  // choose → lost reply → read-back fails → status stays unknown
  const choosing = controller.choose("local:notes");
  await choosing;
  assert.equal(controller.getState().apply.status, "unknown");
  await controller.check();
  assert.equal(controller.getState().apply.status, "idle");
  assert.equal(controller.getState().snapshot.sessionSelection, "local:notes");
});

test("choosing applies one CAS write and adopts the reply as the effective reading", async () => {
  const { fixture, controller } = await setup();
  await controller.choose("local:coding");
  const state = controller.getState();
  assert.deepEqual(fixture.calls().filter((c) => c.kind === "select"), [{ kind: "select", revision: 12, id: "local:coding" }]);
  assert.equal(state.draft, null);
  assert.equal(state.snapshot.sessionSelection, "local:coding");
  assert.deepEqual(state.next.send.runtimeSelection, { revision: 13, profileId: "local:coding", sourceHash: "3".repeat(64) });
});

test("a configuration change elsewhere keeps the draft, re-reads, and never resends", async () => {
  const { fixture, controller } = await setup("conflict");
  await controller.choose("local:coding");
  const state = controller.getState();
  assert.equal(state.apply.status, "conflict");
  assert.equal(state.draft.profileId, "local:coding");
  assert.equal(state.next.send.enabled, false);
  assert.match(state.next.send.reason, /Coding was not selected: the configuration changed elsewhere/);
  assert.equal(fixture.calls().filter((c) => c.kind === "select").length, 1);
  // The explicit recovery submits once against the fresh revision.
  fixture.configure("normal");
  await controller.apply();
  assert.equal(controller.getState().snapshot.sessionSelection, "local:coding");
});

test("an active run freezes the selection: the draft is kept, not queued", async () => {
  const { fixture, controller } = await setup("active-run");
  await controller.choose("local:notes");
  const state = controller.getState();
  assert.equal(state.apply.status, "frozen");
  assert.equal(state.snapshot.sessionSelection, null, "the Host selection did not change");
  assert.match(state.next.send.reason, /will not change by itself/);
  fixture.configure("normal");
  await controller.refresh();
  assert.equal(controller.getState().draft.profileId, "local:notes", "a re-read does not apply it either");
  assert.equal(fixture.calls().filter((c) => c.kind === "select").length, 1);
});

test("a lost reply is settled by reading back, not by resending", async () => {
  const { fixture, controller } = await setup("lost-reply");
  await controller.choose("local:coding");
  const state = controller.getState();
  assert.equal(state.apply.status, "idle", "the read-back shows the write landed");
  assert.equal(state.snapshot.sessionSelection, "local:coding");
  assert.equal(fixture.calls().filter((c) => c.kind === "select").length, 1);
});

test("a lost reply whose write did not land stays unknown until the person acts", async () => {
  const fixture = createAgentChoiceFixture({ pause: instant });
  const adapter = { ...fixture.adapter, select: async () => { throw new Error("Network connection lost."); } };
  const controller = createAgentChoiceController({ adapter, getSessionId: () => "session-synthetic" });
  await controller.load();
  await controller.choose("local:coding");
  const state = controller.getState();
  assert.equal(state.apply.status, "unknown");
  assert.equal(state.next.send.enabled, false);
  assert.match(state.next.send.reason, /Whether Coding was selected is not known/);
  controller.keepCurrent();
  assert.equal(controller.getState().next.send.enabled, true);
});

test("an effective composition that is not compatible holds Send with the owner's reason", async () => {
  const { controller } = await setup("missing-resource");
  await controller.choose("local:notes");
  const { next } = controller.getState();
  assert.equal(next.effective.status, "unavailable");
  assert.equal(next.send.enabled, false);
  assert.match(next.send.reason, /Notes is unavailable: missing local:notes-style/);
});

test("a settled refusal keeps the draft and says the owner's message", async () => {
  const { controller } = await setup("refused");
  await controller.choose("local:notes");
  const state = controller.getState();
  assert.equal(state.apply.status, "failed");
  assert.match(state.next.send.reason, /Profile is unavailable in this scope/);
});

test("a read failure blocks Send until a re-read succeeds", async () => {
  const { controller } = await setup("read-error");
  assert.equal(controller.getState().read.status, "error");
  assert.equal(controller.getState().next, null);
  await controller.load();
  assert.equal(controller.getState().next.send.enabled, true);
});

test("Kit declarations are read from the profile's exact source; builtin has none", async () => {
  const { controller } = await setup();
  controller.preview("local:coding");
  controller.preview("agent:general");
  await tick();
  const { sources } = controller.getState();
  assert.deepEqual(sources["local:coding"].reading.kits, [{ id: "coding-review", version: "0.2.0" }]);
  assert.equal(sources["local:coding"].reading.schemaVersion, 2);
  assert.deepEqual(sources["agent:general"].reading, { status: "none", kits: [], resourceIds: [] });
  assert.equal(projectProfileSource("{not json").status, "unreadable");
});

test("a late source reply for an old chat never lands in the new one", async () => {
  let release;
  const fixture = createAgentChoiceFixture({ pause: instant });
  let session = "session-synthetic";
  const adapter = { ...fixture.adapter, source: () => new Promise((resolve) => { release = resolve; }) };
  const controller = createAgentChoiceController({ adapter, getSessionId: () => session });
  await controller.load();
  controller.preview("local:coding");
  session = "session-other";
  await controller.load();
  release({ content: "{}" });
  await tick();
  assert.deepEqual(controller.getState().sources, {});
});

test("the live adapter speaks the existing endpoints", async () => {
  const seen = [];
  const adapter = liveAgentChoiceAdapter(async (path, options = {}) => { seen.push([path, options.method ?? "GET", options.body ?? null]); return {}; });
  await adapter.read("s 1");
  await adapter.source("s 1", "local:coding");
  await adapter.select("s 1", { revision: 4, id: null });
  assert.deepEqual(seen, [
    ["/runtime-control?sessionId=s%201", "GET", null],
    ["/runtime-resources/local%3Acoding?sessionId=s%201", "GET", null],
    ["/runtime-control?sessionId=s%201", "PUT", { revision: 4, operation: "profile", scope: { type: "session", id: "s 1" }, id: null }],
  ]);
});

/* ── E1-R1 / E1-R3 · the host page's coordination seam ─────────────── */
import { agentChoiceGate, createAgentChoiceLifecycle } from "../web/agent-choice.mjs";

/* A page render that does what app.mjs's syncAgentChoice does, subscribed
 * *synchronously* — the worst case, stricter than the product's microtask
 * repaint — so any re-entrant load/refresh shows up as extra reads. */
function page(fixture, controller, view) {
  const lifecycle = createAgentChoiceLifecycle(controller);
  let renders = 0;
  const render = () => {
    renders += 1;
    if (renders > 50) throw new Error("render recursion");
    lifecycle.sync({ session: view.session, active: view.active });
    return agentChoiceGate({ session: view.session, choice: controller.getState() });
  };
  controller.subscribe(() => render());
  return { render, renders: () => renders, reads: () => fixture.calls().filter((c) => c.kind === "read").length };
}

test("E1-R1: a run ending refreshes exactly once, with a synchronously re-rendering page", async () => {
  const fixture = createAgentChoiceFixture({ pause: instant });
  const view = { session: { id: "session-synthetic", scope: "project" }, active: false };
  const controller = createAgentChoiceController({ adapter: fixture.adapter, getSessionId: () => view.session?.id ?? null });
  const p = page(fixture, controller, view);
  p.render();
  await tick(); await tick();
  assert.equal(p.reads(), 1, "one load for the Session");
  view.active = true; p.render(); p.render();
  assert.equal(p.reads(), 1, "an active run causes no read");
  view.active = false; p.render(); p.render(); p.render();
  await tick(); await tick();
  assert.equal(p.reads(), 2, "one refresh for the one terminal transition");
  assert.ok(p.renders() < 50);
  const gate = agentChoiceGate({ session: view.session, choice: controller.getState() });
  assert.deepEqual([gate.shown, gate.holdsSend], [true, false], "Send is restored after the refresh");
});

test("E1-R3: a project-scope Session is an ordinary Chat; global and no Session keep their behaviour", async () => {
  const { controller } = await setup();
  const choice = controller.getState();
  assert.equal(agentChoiceGate({ session: { id: "session-synthetic", scope: "project" }, choice }).shown, true);
  assert.deepEqual(agentChoiceGate({ session: { id: "session-synthetic", scope: "global" }, choice }), { shown: false, holdsSend: false, reason: "" });
  assert.deepEqual(agentChoiceGate({ session: null, choice }), { shown: false, holdsSend: false, reason: "" });
  assert.equal(agentChoiceGate({ session: { id: "session-synthetic", scope: "project" }, attentionOpen: true, choice }).shown, false);
});

test("E1-R3: navigating to another Chat while its read is delayed never uses the old Chat's reading", async () => {
  const fixtureA = createAgentChoiceFixture({ pause: instant, sessionId: "chat-a" });
  let release;
  const view = { session: { id: "chat-a", scope: "project" }, active: false };
  const adapter = {
    ...fixtureA.adapter,
    read: (id) => (id === "chat-b" ? new Promise((resolve) => { release = () => resolve(createAgentChoiceFixture({ pause: instant, sessionId: "chat-b" }).adapter.read("chat-b")); }) : fixtureA.adapter.read(id)),
  };
  const controller = createAgentChoiceController({ adapter, getSessionId: () => view.session.id });
  const lifecycle = createAgentChoiceLifecycle(controller);
  lifecycle.sync(view); await tick(); await tick();
  await controller.choose("local:coding");
  assert.equal(controller.getState().snapshot.sessionSelection, "local:coding");
  view.session = { id: "chat-b", scope: "project" };
  lifecycle.sync(view);
  const during = agentChoiceGate({ session: view.session, choice: controller.getState() });
  assert.deepEqual([during.shown, during.holdsSend], [true, true], "B shows the control and holds Send while its own read is out");
  assert.equal(controller.getState().snapshot, null, "A's reading is not carried into B");
  release(); await tick(); await tick(); await tick();
  const after = agentChoiceGate({ session: view.session, choice: controller.getState() });
  assert.deepEqual([after.shown, after.holdsSend], [true, false]);
  assert.equal(controller.getState().snapshot.sessionSelection, null, "B inherits; A's selection did not follow");
});

test("E1-R3: a failed read for the current Chat keeps the control, the hold and Retry", async () => {
  const { controller } = await setup("read-error");
  const gate = agentChoiceGate({ session: { id: "session-synthetic", scope: "project" }, choice: controller.getState() });
  assert.deepEqual([gate.shown, gate.holdsSend], [true, true]);
  assert.match(gate.reason, /The agent reading failed/);
});
