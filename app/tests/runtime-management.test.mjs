/* 06c · Settings → Agents → Runtimes.
 *
 * Every case here drives the production controller (runtime-management.mjs)
 * and, where a person would see or press something, the production view
 * (runtime-management-view.mjs) under tiny-dom — against the synthetic owner in
 * fixtures/runtime-management. None of them checks a helper's arithmetic in
 * place of the page: CE-R1 showed that green helper tests can sit beside page
 * wiring nobody exercised.
 *
 * tiny-dom does not model one platform behaviour these tests depend on: when a
 * focused node is removed, a browser moves focus to <body> at that moment.
 * `page()` applies that rule to the mount's own re-render, so a pending focus
 * restore is tested the way a browser runs it.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeManagementController, isSettledRefusal, UNKNOWN_OUTCOME_REASON } from "../web/runtime-management.mjs";
import { createRuntimeManagementView, DISABLE_SENTENCE } from "../web/runtime-management-view.mjs";
import { createRuntimeManagementFixture } from "./fixtures/runtime-management/adapter.mjs";
import { startRuntimeManagementPreview } from "../scripts/runtime-management-preview.mjs";
import { withTinyDom, flush, press, deferred } from "./tiny-dom.mjs";

const ids = () => {
  let n = 0;
  return () => `op-${++n}`;
};
const fast = () => createRuntimeManagementFixture({ pause: async () => {} });
/* Every owner reply waits for the test to release it, in call order. */
function gated() {
  const gates = [];
  const adapter = createRuntimeManagementFixture({
    pause: () => {
      const gate = deferred();
      gates.push(gate);
      return gate.promise;
    },
  });
  return { adapter, gates, next: () => gates.shift().resolve() };
}
const commands = (adapter) => adapter.trace().filter((entry) => entry.call === "command");
const effects = (adapter) => adapter.trace().filter((entry) => entry.effect && !["replayed", "reply-lost"].includes(entry.effect));

function page(mount) {
  if (!mount.focusModelled) {
    const replace = mount.replaceChildren.bind(mount);
    mount.replaceChildren = (...children) => {
      replace(...children);
      const active = document.activeElement;
      if (active && active !== document.body && !mount.contains(active)) document.activeElement = document.body;
    };
    mount.focusModelled = true;
  }
  const $ = (id) => mount.querySelector(`[data-testid="${id}"]`);
  const focused = () => document.activeElement?.getAttribute?.("data-focus-key") ?? (document.activeElement === document.body ? "body" : null);
  async function settle() {
    for (let i = 0; i < 4; i += 1) await flush();
    const active = document.activeElement;
    if (active && active !== document.body && !mount.contains(active)) document.activeElement = document.body;
  }
  /* A keyboard press: focus the control, then Enter, which tiny-dom turns into
     the button's click exactly as the platform does. */
  async function activate(id) {
    const target = $(id);
    assert.ok(target, `${id} is on the page`);
    assert.equal(target.disabled, false, `${id} is operable`);
    target.focus();
    press(target, "Enter");
    await settle();
  }
  function type(id, value) {
    const input = $(id);
    input.focus();
    input.value = value;
    input.dispatchEvent({ type: "input" });
  }
  function choose(id, value) {
    const select = $(id);
    select.focus();
    select.value = value;
    select.dispatchEvent({ type: "change" });
  }
  return { $, focused, settle, activate, type, choose };
}

async function mounted(mount, adapter, { open } = {}) {
  document.body = document.createElement("body");
  const ui = page(mount);
  const controller = createRuntimeManagementController({ adapter, createOperationId: ids() });
  createRuntimeManagementView(mount, controller);
  void controller.openList();
  await ui.settle();
  if (open) {
    await ui.activate(`row-action:${open}`);
  }
  return { controller, ...ui };
}

/* ── 1 · list and inspect ─────────────────────────────────────────────── */

test("each runtime is one row with its state, its configuration owner and one next action", () => withTinyDom(async (mount) => {
  const { $ } = await mounted(mount, fast());
  assert.equal(mount.querySelectorAll("[data-testid]").filter((node) => node.getAttribute("data-testid").startsWith("runtime-row:")).length, 3);
  assert.match($("runtime-row:rt-pi").textContent, /Pi · example/);
  assert.match($("runtime-row:rt-pi").textContent, /Configured by CourtWork/);
  assert.match($("row-state:rt-pi").textContent, /^Connected · takes new work$/);
  assert.match($("runtime-row:rt-pi").textContent, /Used by Work and Coding · 1 run bound now/, "the engine an agent uses is findable from the row");
  assert.match($("runtime-row:rt-hermes").textContent, /Configured in Hermes/);
  assert.equal($("row-action:rt-hermes").getAttribute("aria-label"), "Connect: Hermes");
  assert.equal($("row-action:rt-pi").getAttribute("aria-label"), "Manage: Pi");
}));

test("empty, loading, failed and refreshing lists are four different readings", () => withTinyDom(async (mount) => {
  const { adapter, next } = gated();
  document.body = document.createElement("body");
  const { $, settle } = page(mount);
  const controller = createRuntimeManagementController({ adapter, createOperationId: ids() });
  createRuntimeManagementView(mount, controller);

  void controller.openList();
  await settle();
  assert.ok($("list-loading"), "a first read with nothing to show says it is loading");
  assert.equal($("runtime-list").getAttribute("aria-busy"), "true");
  next();
  await settle();
  assert.equal($("runtime-list").getAttribute("aria-busy"), "false");

  // Refreshing keeps the rows and says they are the previous reading.
  void controller.openList();
  await settle();
  assert.ok($("list-pending"));
  assert.ok($("runtime-row:rt-pi"), "rows stay while the read is out");
  next();
  await settle();
  assert.equal($("list-pending"), null);

  // A failed refresh is an error, not an empty host, and the last good rows stay labelled as such.
  adapter.configure("read-error");
  void controller.openList();
  await settle();
  next();
  await settle();
  assert.ok($("list-error"));
  assert.equal($("list-empty"), null);
  assert.match(mount.textContent, /last reading that succeeded/);
  assert.ok($("runtime-row:rt-pi"));
  assert.ok($("list-retry"));

  // A host that reports nothing says so, and it is not an error.
  adapter.configure("empty");
  void controller.openList();
  await settle();
  next();
  await settle();
  assert.ok($("list-empty"));
  assert.equal($("list-error"), null);
  assert.match($("list-empty").textContent, /nothing is searched for/);
}));

test("opening a runtime moves the keyboard to its way back, and Back returns to the same row", () => withTinyDom(async (mount) => {
  const { $, activate, focused } = await mounted(mount, fast(), { open: "rt-hermes" });
  assert.equal(focused(), "back");
  assert.match($("runtime-state").textContent, /Disconnected · not taking new work/);
  await activate("back");
  assert.equal(focused(), "row:rt-hermes");
}));

test("protocol and process facts are disclosed on demand and a re-render does not close them", () => withTinyDom(async (mount) => {
  const { $, controller, settle } = await mounted(mount, fast(), { open: "rt-pi" });
  const details = $("disclosure:technical");
  assert.equal(details.open, false, "closed by default");
  details.open = true;
  details.dispatchEvent({ type: "toggle" });
  controller.setDraft("label", "Pi, renamed");
  await settle();
  assert.equal($("disclosure:technical").open, true);
  assert.match($("technical").textContent, /synthetic pid 41022/);
}));

/* ── 2 · connect ──────────────────────────────────────────────────────── */

test("native-owned sign-in describes the step in the runtime itself and offers no credential field", () => withTinyDom(async (mount) => {
  const { $ } = await mounted(mount, fast(), { open: "rt-hermes" });
  assert.match($("ownership").textContent, /Configured in Hermes itself/);
  assert.match($("native-next-step").textContent, /^Next step, in Hermes: Sign in inside Hermes/);
  assert.match($("native-next-step").textContent, /does not read, copy or store that sign-in/);
  assert.equal($("credential-ref"), null);
  assert.equal(mount.querySelector('input[type="password"]'), null);
}));

test("CourtWork-managed sign-in chooses a synthetic Models reference and never takes a key", () => withTinyDom(async (mount) => {
  const { $, choose, settle, activate } = await mounted(mount, fast(), { open: "rt-pi" });
  assert.match($("ownership").textContent, /Configured by CourtWork/);
  const options = $("credential-ref").children.map((option) => option.textContent);
  assert.deepEqual(options, [
    "Choose a reference",
    "Synthetic reference · Models › Synthetic connection A",
    "Synthetic reference · Models › Synthetic connection B — no key in Models",
  ]);
  assert.equal(mount.querySelector('input[type="password"]'), null);
  choose("credential-ref", "syn-ref-b");
  await settle();
  assert.equal($("action:reconnect").disabled, true);
  assert.match($("reason:reconnect").textContent, /no key in Models/);
  choose("credential-ref", "syn-ref-a");
  await settle();
  await activate("action:reconnect");
  assert.match($("command-status").textContent, /^Preview receipt · Reconnected\. .*connection syn-pi-conn-1/, "reconnect keeps the connection's identity");
}));

test("connect shows what it writes before the command, then reads back the exact revision and connection", () => withTinyDom(async (mount) => {
  const { adapter, next } = gated();
  const { $, activate, type, settle, focused, controller } = await (async () => {
    const ui = await mounted(mount, adapter);
    next();
    await ui.settle();
    return ui;
  })();
  await activate("row-action:rt-hermes");
  next();
  await settle();
  assert.match($("proposal-writes").textContent, /A CourtWork connection record for Hermes/);
  assert.match($("proposal-leaves").textContent, /Hermes' own configuration, sign-in and installation/);

  type("connection-label", "Hermes, desk");
  await settle();
  assert.match($("draft-summary").textContent, /Requested: name “Hermes, desk”\. Not applied; saved is revision 6\./);
  assert.equal(commands(adapter).length, 0, "reading the proposal sends nothing");

  await activate("action:connect");
  assert.equal($("command-status").getAttribute("data-status"), "pending");
  assert.match($("command-status").textContent, /Leaving this page does not cancel it/);
  assert.equal(focused(), "body", "the pressed control is disabled; focus waits instead of jumping to the top");
  next(); // the command
  await settle();
  next(); // the read-back
  await settle();
  const status = $("command-status");
  assert.match(status.textContent, /^Preview receipt · Connected\. The preview confirmed Hermes at revision 7 · connection syn-hermes-conn-2\./);
  assert.match(status.textContent, /Read back: revision 7 · connection syn-hermes-conn-2 · Synthetic one-shot job\./);
  assert.equal(focused(), "command-status", "the keyboard lands on what happened");
  assert.equal($("draft-summary"), null, "the draft is now the saved configuration");
  assert.equal(controller.getState().page.detail.connection.configuration.label, "Hermes, desk");
  assert.ok($("history:syn-hermes-conn-1"), "the earlier connection is still in history");
}));

test("a refused connect keeps the typed name and puts the keyboard back on Connect", () => withTinyDom(async (mount) => {
  const adapter = fast();
  adapter.configure("connect-refused");
  const { $, activate, type, settle, focused } = await mounted(mount, adapter, { open: "rt-hermes" });
  type("connection-label", "Hermes, desk");
  await settle();
  await activate("action:connect");
  assert.equal($("command-status").getAttribute("data-status"), "refused");
  assert.equal($("command-status").getAttribute("role"), "alert");
  assert.match($("command-status").textContent, /did not report a signed-in session, so nothing was connected/);
  assert.equal($("connection-label").value, "Hermes, desk");
  assert.ok($("draft-summary"));
  assert.equal(focused(), "connect");
  assert.equal(effects(adapter).length, 0);
}));

/* ── 3 · disable for future work ─────────────────────────────────────── */

test("disabling says what changes on the next admission and leaves the bound run on its recorded revision", () => withTinyDom(async (mount) => {
  const adapter = fast();
  const { $, activate, focused, controller } = await mounted(mount, adapter, { open: "rt-pi" });
  assert.ok(mount.textContent.includes(DISABLE_SENTENCE));
  assert.match($("bound:synthetic-run-311").textContent, /Coding is running on revision 3/);
  await activate("action:disable");
  const detail = controller.getState().page.detail;
  assert.equal(detail.admission.saved, "disabled");
  assert.equal(detail.admission.effective, false);
  assert.match($("admission-effective").textContent, /Not taking new work: disabled for new work at revision 4\./);
  assert.match($("bound:synthetic-run-311").textContent, /revision 3/, "the run keeps the binding it recorded");
  assert.match($("command-status").textContent, /synthetic-run-311 keeps revision 3; it was not stopped, moved or queued\./);
  assert.equal(focused(), "command-status");
  assert.deepEqual(effects(adapter).map((entry) => entry.effect), ["disable"], "no cancel, migration or queue effect");
  assert.ok($("action:enable"), "the reverse command is offered in its place");
}));

/* ── 4 · disconnect, history and return ──────────────────────────────── */

test("disconnect is unavailable while a run is bound, with its reason beside it", () => withTinyDom(async (mount) => {
  const { $, controller } = await mounted(mount, fast(), { open: "rt-pi" });
  assert.equal($("action:disconnect").disabled, true);
  assert.match($("reason:disconnect").textContent, /Disconnecting never stops a run/);
  controller.askToDisconnect();
  assert.equal(controller.getState().page.confirming, null, "the confirmation cannot even be opened");
  assert.equal(await controller.run("disconnect"), false);
}));

test("Escape closes the disconnect confirmation and returns the keyboard to Disconnect", () => withTinyDom(async (mount) => {
  const adapter = fast();
  const { $, activate, settle, focused, type } = await mounted(mount, adapter, { open: "rt-hermes" });
  type("connection-label", "Hermes, desk");
  await activate("action:connect");
  await activate("action:disconnect");
  assert.ok($("disconnect-confirmation"));
  assert.equal(focused(), "disconnect-cancel", "the confirmation opens on its safe choice");
  press($("disconnect-confirm"), "Escape");
  await settle();
  assert.equal($("disconnect-confirmation"), null);
  assert.equal(focused(), "disconnect");
  assert.deepEqual(effects(adapter).map((entry) => entry.effect), ["connect"], "opening and dismissing sends nothing");
}));

test("disconnect removes only this connection; identity, history and unsaved input survive", () => withTinyDom(async (mount) => {
  const adapter = fast();
  const { $, activate, type, settle, controller, focused } = await mounted(mount, adapter, { open: "rt-hermes" });
  type("connection-label", "Hermes, desk");
  await activate("action:connect");
  // A new name typed for the next reconnect, not sent.
  type("connection-label", "Hermes, second desk");
  await settle();
  await activate("action:disconnect");
  await activate("disconnect-confirm");
  const detail = controller.getState().page.detail;
  assert.equal(detail.id, "rt-hermes");
  assert.equal(detail.connection.state, "disconnected");
  assert.deepEqual(detail.history.map((entry) => entry.connectionId), ["syn-hermes-conn-1", "syn-hermes-conn-2"]);
  assert.deepEqual(detail.usedBy.map((profile) => profile.name), ["Attention"], "the agent that chose it still does");
  assert.equal($("connection-label").value, "Hermes, second desk", "the unsent name is still there");
  assert.match($("command-status").textContent, /^Preview receipt · Disconnected\./);
  assert.equal(focused(), "command-status");
  // And the round trip back: reconnect with that name creates the next connection beside the history.
  await activate("action:connect");
  assert.equal(controller.getState().page.detail.connection.connectionId, "syn-hermes-conn-3");
  assert.equal(controller.getState().page.detail.history.length, 2);
  await activate("back");
  assert.equal(focused(), "row:rt-hermes");
}));

test("an unavailable engine is not a permission decision and offers no connect", () => withTinyDom(async (mount) => {
  const { $ } = await mounted(mount, fast(), { open: "rt-codex" });
  assert.match($("runtime-state").textContent, /Unavailable\. This example reports no Codex installation/);
  assert.equal($("action:connect").disabled, true);
  assert.match($("reason:connect").textContent, /not a permission decision/);
  assert.doesNotMatch(mount.textContent, /denied|not allowed|permission denied/i);
}));

test("a host that cannot change runtimes gives each action its reason and sends nothing", () => withTinyDom(async (mount) => {
  const adapter = fast();
  adapter.configure("read-only");
  const { $, controller } = await mounted(mount, adapter, { open: "rt-pi" });
  for (const kind of ["reconnect", "disable", "disconnect"]) {
    assert.equal($(`action:${kind}`).disabled, true);
    assert.match($(`reason:${kind}`).textContent, /cannot change a runtime yet/);
    assert.equal(await controller.run(kind), false);
  }
  assert.equal(commands(adapter).length, 0);
  assert.equal($("credential-ref"), null, "nothing looks editable that is not");
}));

/* ── 5 · recover ──────────────────────────────────────────────────────── */

test("a committed command whose reply is lost stays unknown, blocks every mutation, and Check status settles it without resending", () => withTinyDom(async (mount) => {
  const adapter = fast();
  const { $, activate, focused, controller } = await mounted(mount, adapter, { open: "rt-pi" });
  adapter.configure("lost-reply");
  await activate("action:disable");
  const status = $("command-status");
  assert.equal(status.getAttribute("data-status"), "unknown");
  assert.equal(status.getAttribute("role"), "alert");
  assert.match(status.textContent, /may or may not have taken effect/);
  assert.match(status.textContent, /it does not send it again/);
  assert.equal(focused(), "command-status", "the keyboard lands where Check status is");
  // The owner did apply it — the page must not say otherwise, and must not offer a second one.
  assert.equal(effects(adapter).length, 1);
  assert.equal(controller.getState().page.detail.admission.saved, "enabled", "the page still shows the last confirmed reading");
  for (const kind of ["disable", "reconnect"]) {
    assert.equal($(`action:${kind}`).disabled, true);
    assert.equal($(`reason:${kind}`).textContent, UNKNOWN_OUTCOME_REASON);
  }
  assert.equal($("check-status").disabled, false, "the reconciling action is the one control not locked");
  assert.equal(await controller.run("disable"), false);

  await activate("check-status");
  assert.equal(commands(adapter).length, 1, "checking asked about op-1; it did not send another command");
  assert.deepEqual(adapter.trace().filter((entry) => entry.call === "status").map((entry) => entry.operationId), ["op-1"]);
  assert.match($("command-status").textContent, /^Preview receipt · Disabled for new work\. .*revision 4/);
  assert.equal(controller.getState().page.detail.admission.saved, "disabled", "and the read-back shows it");
  assert.equal($("action:enable").disabled, false, "settled, the runtime can be changed again");
}));

test("an unknown outcome the owner never received settles as not applied and keeps the draft", () => withTinyDom(async (mount) => {
  const adapter = fast();
  const command = adapter.command;
  adapter.command = async () => { throw new Error("The request could not be sent."); };
  const { $, activate, type, settle, controller } = await mounted(mount, adapter, { open: "rt-hermes" });
  type("connection-label", "Hermes, desk");
  await settle();
  await activate("action:connect");
  assert.equal($("command-status").getAttribute("data-status"), "unknown");
  adapter.command = command;
  await activate("check-status");
  assert.equal($("command-status").getAttribute("data-status"), "not-applied");
  assert.match($("command-status").textContent, /no record of that command, so nothing changed/);
  assert.equal($("connection-label").value, "Hermes, desk");
  assert.equal($("action:connect").disabled, false, "now it can be sent again, as a new operation");
  await activate("action:connect");
  assert.equal(controller.getState().operations["rt-hermes"].operationId, "op-2");
  assert.equal(effects(adapter).length, 1);
}));

test("an error without a listed code is never read as a refusal", () => {
  assert.equal(isSettledRefusal(Object.assign(new Error("x"), { code: "runtime_conflict" })), true);
  assert.equal(isSettledRefusal(Object.assign(new Error("x"), { code: "ECONNRESET" })), false);
  assert.equal(isSettledRefusal(Object.assign(new Error("x"), { status: 409 })), false, "a status alone settles nothing");
  assert.equal(isSettledRefusal(new Error("x")), false);
});

test("a double press sends one command, and the owner treats a repeated operation id as the same one", () => withTinyDom(async (mount) => {
  const { adapter, next, gates } = gated();
  const ui = await mounted(mount, adapter);
  next();
  await ui.settle();
  await ui.activate("row-action:rt-pi");
  next();
  await ui.settle();
  const button = ui.$("action:disable");
  button.click();
  button.click(); // the same node, before any re-render could disable it
  await ui.settle();
  assert.equal(commands(adapter).length, 1);
  while (gates.length) { next(); await ui.settle(); }
  assert.deepEqual(effects(adapter).map((entry) => entry.effect), ["disable"]);

  // At the owner: the same id again is answered from its ledger, with no second effect.
  const replay = fast();
  const request = { operationId: "op-x", kind: "disable", expectedRevision: 3 };
  const first = await replay.command("rt-pi", request);
  const second = await replay.command("rt-pi", request);
  assert.deepEqual(second, first);
  assert.equal(effects(replay).length, 1);
}));

test("a revision changed elsewhere is refused, the draft is kept, and Reload shows the owner's values beside it", () => withTinyDom(async (mount) => {
  const adapter = fast();
  const { $, activate, type, settle, controller, focused } = await mounted(mount, adapter, { open: "rt-pi" });
  type("connection-label", "Pi, lab");
  await settle();
  adapter.configure("stale-revision");
  await activate("action:reconnect");
  assert.equal($("command-status").getAttribute("data-status"), "conflict");
  assert.match($("command-status").textContent, /now at revision 4\. This command was composed against revision 3; nothing was changed\./);
  assert.equal($("connection-label").value, "Pi, lab");
  assert.equal($("action:disable").disabled, true, "nothing else is sent against a revision that no longer exists");
  assert.equal(focused(), "command-status");
  await activate("reload");
  assert.match($("reload-notice").textContent, /Reloaded revision 4, changed elsewhere\. Your draft is unchanged and not applied/);
  assert.equal(focused(), "reload-notice", "the keyboard lands on what was reloaded, not on the page");
  assert.equal(controller.getState().page.detail.connection.configuration.label, "Pi (renamed in another window)");
  assert.equal($("connection-label").value, "Pi, lab");
  await activate("action:reconnect");
  assert.match($("command-status").textContent, /revision 5/);
  assert.equal(effects(adapter).filter((entry) => entry.effect === "reconnect").length, 1);
}));

test("a draft survives leaving for the list and coming back", () => withTinyDom(async (mount) => {
  const { $, activate, type, settle } = await mounted(mount, fast(), { open: "rt-hermes" });
  type("connection-label", "Hermes, desk");
  await settle();
  await activate("back");
  await activate("row-action:rt-hermes");
  assert.equal($("connection-label").value, "Hermes, desk");
  assert.ok($("draft-summary"));
}));

test("a late list reply after opening a runtime does not navigate or land", () => withTinyDom(async (mount) => {
  const { adapter, gates } = gated();
  document.body = document.createElement("body");
  const { $, settle } = page(mount);
  const controller = createRuntimeManagementController({ adapter, createOperationId: ids() });
  createRuntimeManagementView(mount, controller);
  void controller.openList();
  await settle();
  const listReply = gates.shift();
  void controller.openRuntime("rt-pi");
  await settle();
  listReply.resolve();
  await settle();
  const state = controller.getState();
  assert.equal(state.view, "runtime");
  assert.equal(state.list.status, "loading", "the reply for a surface nobody is on is not adopted");
  assert.equal($("runtime-list"), null);
}));

test("a late detail reply for one runtime does not overwrite another runtime's page", () => withTinyDom(async (mount) => {
  const { adapter, gates, next } = gated();
  const ui = await mounted(mount, adapter);
  next();
  await ui.settle();
  const { controller, $, settle } = ui;
  void controller.openRuntime("rt-pi");
  await settle();
  const piReply = gates.shift();
  void controller.openRuntime("rt-hermes");
  await settle();
  next();
  await settle();
  piReply.resolve();
  await settle();
  assert.equal(controller.getState().page.id, "rt-hermes");
  assert.match($("runtime-state").textContent, /Disconnected/);
  assert.doesNotMatch(mount.textContent, /synthetic-run-311/);
}));

test("a command reply that arrives after leaving lands on its own runtime only, and was never cancelled", () => withTinyDom(async (mount) => {
  const { adapter, gates, next } = gated();
  const ui = await mounted(mount, adapter);
  next();
  await ui.settle();
  const { controller, $, settle, activate } = ui;
  await activate("row-action:rt-pi");
  next();
  await settle();
  await activate("action:disable");
  const commandReply = gates.shift();
  // Leave while it is out, and open another runtime.
  await activate("back");
  next(); // list
  await settle();
  assert.match($("row-operation:rt-pi").textContent, /Disabling for new work… still waiting for an answer/);
  await activate("row-action:rt-hermes");
  next();
  await settle();
  const before = mount.textContent;
  commandReply.resolve();
  await settle();
  assert.equal(controller.getState().page.id, "rt-hermes");
  assert.equal(mount.textContent, before, "Hermes' page is untouched");
  const operation = controller.getState().operations["rt-pi"];
  assert.equal(operation.status, "confirmed");
  assert.equal(operation.readBack, "deferred");
  // Coming back reads Pi again, which is its read-back.
  await activate("back");
  next();
  await settle();
  assert.match($("row-operation:rt-pi").textContent, /Preview receipt: disabled for new work at revision 4/);
  assert.match($("row-state:rt-pi").textContent, /disabled for new work/);
  await activate("row-action:rt-pi");
  next();
  await settle();
  assert.equal(controller.getState().operations["rt-pi"].readBack, "done");
  assert.match($("command-status").textContent, /Read back: revision 4/);
}));

test("a command confirmed while the list is on screen refreshes the list and keeps its rows", () => withTinyDom(async (mount) => {
  const { adapter, gates, next } = gated();
  const ui = await mounted(mount, adapter);
  next();
  await ui.settle();
  const { $, settle, activate } = ui;
  await activate("row-action:rt-pi");
  next();
  await settle();
  await activate("action:disable");
  const commandReply = gates.shift();
  await activate("back");
  next();
  await settle();
  commandReply.resolve();
  await settle();
  assert.ok($("list-pending"), "the list is being read again, rows kept");
  assert.ok($("runtime-row:rt-pi"));
  next();
  await settle();
  assert.match($("row-state:rt-pi").textContent, /disabled for new work/);
}));

test("every receipt, pending line and entry point carries the preview identity", () => withTinyDom(async (mount) => {
  const { adapter, gates, next } = gated();
  const ui = await mounted(mount, adapter);
  next();
  await ui.settle();
  await ui.activate("row-action:rt-pi");
  next();
  await ui.settle();
  await ui.activate("action:disable");
  assert.match(ui.$("command-status").textContent, /^Preview command · /);
  while (gates.length) { next(); await ui.settle(); }
  assert.match(ui.$("command-status").textContent, /^Preview receipt · /);
  assert.match(mount.textContent, /Pi · example/);
}));

test("the preview host serves the fixture page and product assets, and accepts no mutation", async () => {
  const preview = await startRuntimeManagementPreview();
  try {
    const html = await (await fetch(preview.url)).text();
    assert.match(html, /Settings › Agents › Runtimes/);
    assert.match(html, /data-testid="preview-identity"/);
    assert.match(html, /labelled examples, not a search of this device/);
    for (const asset of ["web/runtime-management.mjs", "web/runtime-management-view.mjs", "adapter.mjs", "preview.mjs"])
      assert.equal((await fetch(new URL(asset, preview.url))).status, 200, asset);
    assert.equal((await fetch(new URL("api/runtimes", preview.url))).status, 404);
    assert.equal((await fetch(preview.url, { method: "POST" })).status, 405);
  } finally {
    await preview.close();
  }
});
