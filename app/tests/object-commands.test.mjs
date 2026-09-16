import assert from "node:assert/strict";
import { test } from "node:test";
import { withTinyDom } from "./tiny-dom.mjs";
import { OBJECT_COMMANDS, COMMAND_GROUPS, commandsFor, groupCommands, createCommandDispatcher } from "../web/object-commands.mjs";

const chatContext = (over = {}, target = {}) => ({
  target: { kind: "chat", id: "s1", title: "Parcel helper", projectId: "p1", preview: false, activeRun: false, ...target },
  activeSessionId: null, view: "home", startPending: false, ...over,
});
const projectContext = (over = {}, target = {}) => ({
  target: { kind: "project", id: "p1", title: "Cedar", preview: false, ...target },
  activeSessionId: null, view: "home", startPending: false, ...over,
});

test("09 · `when` draws only commands with a real path; `enablement` keeps a real command in the menu with its reason", () => {
  const drawn = commandsFor(chatContext());
  assert.deepEqual(drawn.map((c) => [c.id, c.word, c.label, c.glyph, c.group, c.enabled]), [
    ["chat.open", "Open", "Open chat", null, "navigation", true],
    ["chat.rename", "Rename", "Rename chat", "pencil-line", "organization", true],
    ["chat.delete", "Delete", "Delete chat", "trash", "destructive", true],
  ]);
  const open = commandsFor(chatContext({ activeSessionId: "s1", view: "session" }));
  assert.deepEqual(open.map((c) => [c.id, c.enabled, c.reason]).slice(0, 1), [["chat.open", false, "This chat is already open."]]);
  const running = commandsFor(chatContext({}, { activeRun: true }));
  assert.deepEqual(running.find((c) => c.id === "chat.delete").reason, "Unavailable while a Run is active.");
  assert.deepEqual(commandsFor(chatContext({}, { preview: true })).map((c) => c.id), ["chat.open"], "an example chat has no rename or delete path");
  assert.deepEqual(commandsFor(projectContext()).map((c) => [c.id, c.word, c.label, c.enabled]), [["project.new-chat", "New chat", "New chat in Cedar", true]]);
  assert.equal(commandsFor(projectContext({ startPending: true }))[0].reason, "Finish or recover the chat being started first.");
  assert.deepEqual(commandsFor(projectContext({}, { preview: true })), [], "no menu for the example project");
  assert.deepEqual(commandsFor(null), []);
  assert.ok(OBJECT_COMMANDS.every((c) => COMMAND_GROUPS.includes(c.group)));
  assert.ok(!OBJECT_COMMANDS.some((c) => /pin|archive|move|share|fork/.test(c.id)), "no Planned rows for capabilities that do not exist");
  const groups = groupCommands(drawn);
  assert.deepEqual(groups.map((g) => g.map((c) => c.id)), [["chat.open"], ["chat.rename"], ["chat.delete"]]);
  assert.equal(groups.at(-1)[0].destructive, true, "destructive last");
});

test("09 · the dispatcher resolves the target again when a command runs: gone, disabled and unknown all stop before the handler", async () => {
  const calls = [];
  let context = chatContext();
  const dispatcher = createCommandDispatcher({
    resolve: (ref) => (ref.id === context.target.id ? context : null),
    handlers: { open: (t) => calls.push(["open", t.id]), rename: (t) => calls.push(["rename", t.id]), delete: (t) => calls.push(["delete", t.id]), newChat: (t) => calls.push(["newChat", t.id]) },
  });
  assert.equal(dispatcher.list({ kind: "chat", id: "s1" }).length, 3);
  assert.deepEqual(dispatcher.list({ kind: "chat", id: "gone" }), []);
  assert.deepEqual(await dispatcher.run("chat.rename", { kind: "chat", id: "s1" }), { state: "done" });
  assert.deepEqual(await dispatcher.run("chat.rename", { kind: "chat", id: "gone" }), { state: "unavailable", reason: "This item is no longer available." });
  context = chatContext({}, { activeRun: true });
  assert.deepEqual(await dispatcher.run("chat.delete", { kind: "chat", id: "s1" }), { state: "disabled", reason: "Unavailable while a Run is active." });
  context = chatContext({}, { preview: true });
  assert.equal((await dispatcher.run("chat.delete", { kind: "chat", id: "s1" })).state, "unavailable", "a command `when` hides is not runnable either");
  assert.equal((await dispatcher.run("nothing.here", { kind: "chat", id: "s1" })).state, "unavailable");
  assert.equal((await dispatcher.run("project.new-chat", { kind: "chat", id: "s1" })).state, "unavailable", "a project command does not run on a chat");
  assert.deepEqual(calls, [["rename", "s1"]]);
});

test("09 · the menu primitive: groups with separators only between them, disabled rows reachable with their reason, roving keys, Escape home", async () => {
  await withTinyDom(async (container) => {
    const { createObjectMenu } = await import("../web/object-menu.mjs");
    const popover = document.createElement("div");
    container.append(popover);
    let positioned = 0, cleaned = 0;
    const menu = createObjectMenu({ popover, position: () => { positioned++; return () => { cleaned++; }; }, viewport: () => ({ width: 1280, height: 900 }) });
    const opener = document.createElement("button");
    container.append(opener);
    opener.focus();
    const picks = [];
    const commands = commandsFor(chatContext({ activeSessionId: "s1", view: "session" }));
    assert.equal(menu.show({ commands: [], anchor: opener, opener, label: "x", onPick: () => {} }), false, "nothing to draw, no menu");
    assert.equal(menu.show({ commands, anchor: opener, opener, label: "Chat actions · Parcel helper", onPick: (id) => picks.push(id) }), true);
    assert.equal(menu.isOpen(), true);
    assert.equal(popover.getAttribute("role"), "menu");
    assert.equal(popover.getAttribute("aria-label"), "Chat actions · Parcel helper");
    const items = popover.querySelectorAll('[role="menuitem"]');
    assert.deepEqual(items.map((b) => [b.dataset.command, b.textContent, b.getAttribute("aria-label"), b.getAttribute("aria-disabled"), b.dataset.tooltip ?? null]), [
      ["chat.open", "Open", "Open chat", "true", "This chat is already open."],
      ["chat.rename", "Rename", "Rename chat", null, null],
      ["chat.delete", "Delete", "Delete chat", null, null],
    ]);
    assert.equal(popover.querySelectorAll('[role="separator"]').length, 2);
    assert.equal(positioned, 1);
    assert.equal(document.activeElement, items[0], "the first row takes focus, disabled or not");
    items[0].click();
    assert.deepEqual(picks, [], "a disabled row does nothing");
    popover.dispatchEvent({ type: "keydown", key: "ArrowDown", target: items[0] });
    assert.equal(document.activeElement, items[1]);
    popover.dispatchEvent({ type: "keydown", key: "End", target: items[1] });
    assert.equal(document.activeElement, items[2]);
    popover.dispatchEvent({ type: "keydown", key: "ArrowDown", target: items[2] });
    assert.equal(document.activeElement, items[0], "wraps");
    popover.dispatchEvent({ type: "keydown", key: "Escape", target: items[0] });
    assert.equal(menu.isOpen(), false);
    assert.equal(cleaned, 1);
    assert.equal(document.activeElement, opener, "Escape returns to the row");
    assert.equal(popover.childElementCount, 0, "nothing left behind");
    menu.show({ commands, anchor: opener, opener, label: "again", onPick: (id) => picks.push(id) });
    popover.querySelectorAll('[role="menuitem"]').find((b) => b.dataset.command === "chat.rename").click();
    assert.deepEqual(picks, ["chat.rename"]);
    assert.equal(menu.isOpen(), false);
    assert.equal(document.activeElement, opener, "focus is home before the command runs, so a dialog returns there");
  });
});
