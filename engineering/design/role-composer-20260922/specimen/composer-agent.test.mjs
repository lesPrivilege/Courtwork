/* Seam tests for the specimen's shared controller, against the real 06a
 * synthetic owners (through the composer wrapper). DOM-free.
 *   node --test engineering/design/role-composer-20260922/specimen/composer-agent.test.mjs */
import test from "node:test";
import assert from "node:assert/strict";
import { createComposerFixture } from "./composer-adapter.mjs";
import { createComposerAgentController } from "./composer-agent.mjs";

const instant = () => Promise.resolve();

function setup(scenario = "normal", pause = instant) {
  const fixture = createComposerFixture({ pause });
  fixture.configure(scenario);
  const controller = createComposerAgentController({ adapter: fixture.adapter });
  return { fixture, controller };
}

test("initial choice is the chat's default Agent, read before Send is offered", async () => {
  const { controller } = setup();
  const pending = controller.load();
  assert.equal(controller.getState().next, null);
  await pending;
  const { selectedId, next } = controller.getState();
  assert.equal(selectedId, "ap-work");
  assert.equal(next.readingStatus, "ready");
  assert.equal(next.send.enabled, true);
  assert.equal(next.when, "Applies to the next run you start in this chat.");
  assert.equal(next.model.owner, "courtwork");
});

test("requested, supported and granted stay four separate readings", async () => {
  const { controller } = setup();
  await controller.load();
  controller.select("ap-coding");
  await new Promise((resolve) => setTimeout(resolve, 0));
  const p = controller.getState().next.permissions;
  assert.deepEqual(p.asks.map((line) => line.action), ["candidate.write"]);
  assert.deepEqual(p.allowed.map((line) => line.action), ["repository.read", "check.run"]);
  assert.deepEqual([p.denied.length, p.unreported.length, p.unsupported.length], [0, 0, 0]);
});

test("runtime-owned model is read from the runtime, not from Models", async () => {
  const { controller } = setup();
  await controller.load();
  controller.select("ap-attention");
  await new Promise((resolve) => setTimeout(resolve, 0));
  const { model } = controller.getState().next;
  assert.equal(model.owner, "runtime-native");
  assert.match(model.effective, /Hermes/);
});

test("an incompatible Kit and an unavailable runtime block Send with the owner's words", async () => {
  const kit = setup("kit-incompatible");
  await kit.controller.load();
  kit.controller.select("ap-attention");
  await new Promise((resolve) => setTimeout(resolve, 0));
  const blocked = kit.controller.getState().next;
  assert.equal(blocked.send.enabled, false);
  assert.match(blocked.blockers.join(" "), /Praxis 0\.5 does not declare support for Hermes/);

  const down = setup("runtime-unavailable");
  await down.controller.load();
  const work = down.controller.getState().next;
  assert.equal(work.send.enabled, false);
  assert.match(work.blockers[0], /Pi is unavailable/);
});

test("a run in flight keeps its binding; another choice applies to a later run, with no queue", async () => {
  const { controller } = setup("bound-run");
  await controller.load();
  assert.equal(controller.getState().selectedId, "ap-coding");
  controller.select("ap-attention");
  await new Promise((resolve) => setTimeout(resolve, 0));
  const { next, activeRun } = controller.getState();
  assert.equal(activeRun.profileRevision, 7);
  assert.match(next.when, /Running now on Coding · revision 7, which it keeps\. Attention applies to a run you start after it ends\./);
  assert.deepEqual(next.send, { enabled: false, reason: "Available after this run ends." });
});

test("a late reply for one Agent never lands on another", async () => {
  /* Replies are released by hand, in the wrong order. */
  const gates = [];
  const pause = () => new Promise((resolve) => gates.push(resolve));
  const { controller } = setup("normal", pause);
  const loading = controller.load();
  while (!gates.length) await new Promise((resolve) => setTimeout(resolve, 0));
  gates.shift()(); // list
  while (!gates.length) await new Promise((resolve) => setTimeout(resolve, 0));
  const workRead = gates.shift(); // first read of ap-work, held
  controller.select("ap-coding");
  while (!gates.length) await new Promise((resolve) => setTimeout(resolve, 0));
  gates.shift()(); // ap-coding answers first
  await new Promise((resolve) => setTimeout(resolve, 0));
  workRead(); // the older ap-work reply arrives late
  await loading;
  const state = controller.getState();
  assert.equal(state.selectedId, "ap-coding");
  assert.equal(state.next.name, "Coding");
  assert.equal(state.next.readingStatus, "ready");
  assert.equal(state.readings["ap-work"].detail.profile.id, "ap-work");
  assert.equal(state.readings["ap-coding"].detail.profile.id, "ap-coding");
});

test("after a Settings save the selection is kept and the new revision is said", async () => {
  const { fixture, controller } = setup();
  await controller.load();
  controller.select("ap-attention");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(controller.getState().next.revision, 2);
  // What the Settings page does: save a composition through the same owner.
  await fixture.adapter.save("ap-attention", { roleId: "role-attention", kitIds: ["kit-attention"], runtimeId: "rt-pi" }, 2);
  await controller.refresh();
  const { selectedId, next, changedNotice } = controller.getState();
  assert.equal(selectedId, "ap-attention");
  assert.equal(next.revision, 3);
  assert.equal(next.runtime.name, "Pi");
  assert.equal(changedNotice, "Attention changed: revision 2 → 3.");
});

test("a failed list read is recoverable and does not invent a selection", async () => {
  const { controller } = setup("list-error");
  await controller.load();
  let state = controller.getState();
  assert.equal(state.list.status, "error");
  assert.equal(state.selectedId, null);
  assert.equal(state.next, null);
  await controller.retry();
  state = controller.getState();
  assert.equal(state.list.status, "ready");
  assert.equal(state.selectedId, "ap-work");
});

test("an older reply for the same Agent cannot replace a newer one", async () => {
  const { fixture } = setup();
  const held = [];
  const adapter = {
    ...fixture.adapter,
    chat: fixture.adapter.chat,
    list: fixture.adapter.list,
    open: (id) => new Promise((resolve, reject) => held.push({ id, resolve, reject })),
  };
  const controller = createComposerAgentController({ adapter });
  const loading = controller.load();
  while (!held.length) await new Promise((resolve) => setTimeout(resolve, 0));
  const first = held.shift(); // read #1 of ap-work, held
  const again = controller.retry(); // read #2 of ap-work
  const second = held.shift();
  second.resolve(await fixture.adapter.open("ap-work"));
  await again;
  first.reject(new Error("late failure from the first read"));
  await loading;
  const { next } = controller.getState();
  assert.equal(next.readingStatus, "ready");
  assert.equal(next.send.enabled, true);
});
