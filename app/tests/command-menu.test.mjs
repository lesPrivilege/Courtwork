import assert from "node:assert/strict";
import test from "node:test";
import { createCommandMenu } from "../web/command-menu.mjs";
import { withTinyDom, flush, press } from "./tiny-dom.mjs";

/* CMD-01 · the command menu is a pure read of the composer's own value and
 * focus, filtered against the Host's own catalog (GET /sessions/:id/commands).
 * It keeps no command list of its own — every descriptor here is a fixture
 * standing in for what commands.mjs would return, not a copy the menu invents. */

function catalogOf(commands, revision) {
  return { protocolVersion: 1, revision, source: { type: "host-builtin", version: "test" }, commands };
}

function fakeRequest(routes) {
  const calls = [];
  const request = async (path) => {
    calls.push(path);
    if (Object.prototype.hasOwnProperty.call(routes, path)) return routes[path];
    throw new Error(`unexpected request ${path}`);
  };
  return { calls, request };
}

function setup(root, { routes, sessionId, onPick = () => {} }) {
  const textarea = document.createElement("textarea");
  const menuEl = document.createElement("div");
  root.append(textarea, menuEl);
  const { calls, request } = fakeRequest(routes);
  const menu = createCommandMenu({
    textarea, container: menuEl, request,
    getSessionId: () => sessionId, onPick,
  });
  return { textarea, menuEl, calls, menu };
}

function type(textarea, value) {
  textarea.value = value;
  textarea.dispatchEvent({ type: "input", target: textarea });
}

const COMMANDS = [
  { name: "status", aliases: [], kind: "read", title: "Status", description: "This chat's facts.",
    args: null, availability: { available: true, reason: null }, sideEffects: "none", interactive: false, target: null },
  { name: "effort", aliases: [], kind: "setting", title: "Reasoning effort", description: "Save the reasoning effort.",
    args: { value: { type: "enum", values: ["default", "low", "high"], required: true } },
    availability: { available: false, reason: "Reasoning effort is not selectable on the configured model." },
    sideEffects: "Saves the Host provider configuration.", interactive: false, target: null },
  { name: "compact", aliases: [], kind: "control", title: "Compact", description: "Summarize once.",
    args: { focus: { type: "text", maxLength: 4000, required: false } },
    availability: { available: true, reason: null }, sideEffects: "One summary request.", interactive: false, target: null },
];

test("CMD-MENU · opens on / and filters by prefix; unavailable rows carry the reason and are skipped by ArrowDown", async () => {
  await withTinyDom(async (root) => {
    const { textarea, menuEl } = setup(root, { routes: { "/sessions/s1/commands": catalogOf(COMMANDS, "rev-1") }, sessionId: "s1" });

    assert.equal(menuEl.hidden, true, "closed before any trigger");
    assert.equal(menuEl.getAttribute("role"), "listbox");
    assert.equal(menuEl.id, "command-menu");
    assert.equal(menuEl.getAttribute("aria-label"), "Commands");
    assert.equal(textarea.getAttribute("aria-controls"), "command-menu");

    textarea.focus();
    type(textarea, "/");
    await flush();

    assert.equal(menuEl.hidden, false);
    assert.equal(textarea.getAttribute("aria-expanded"), "true");
    let rows = menuEl.querySelectorAll(".command-option");
    assert.deepEqual(rows.map((row) => row.querySelector(".command-name").textContent),
      ["/status", "/effort <default|low|high>", "/compact <focus>"],
      "enum args and text args each get their own hint");
    const effortRow = rows[1];
    assert.equal(effortRow.getAttribute("aria-disabled"), "true");
    assert.equal(effortRow.querySelector(".command-reason").textContent,
      "Reasoning effort is not selectable on the configured model.");
    assert.deepEqual(rows.map((row) => row.getAttribute("aria-selected")), ["true", "false", "false"]);
    assert.equal(textarea.getAttribute("aria-activedescendant"), "command-option-status");

    // ArrowDown must skip the disabled `effort` row and land on `compact`.
    assert.equal(press(textarea, "ArrowDown"), false, "ArrowDown is prevented while open");
    rows = menuEl.querySelectorAll(".command-option");
    assert.deepEqual(rows.map((row) => row.getAttribute("aria-selected")), ["false", "false", "true"]);
    assert.equal(textarea.getAttribute("aria-activedescendant"), "command-option-compact");
    // Already at the last navigable row: another ArrowDown does not wrap.
    press(textarea, "ArrowDown");
    assert.equal(textarea.getAttribute("aria-activedescendant"), "command-option-compact");
    // ArrowUp walks back, again skipping the disabled row.
    press(textarea, "ArrowUp");
    assert.equal(textarea.getAttribute("aria-activedescendant"), "command-option-status");
    press(textarea, "ArrowUp");
    assert.equal(textarea.getAttribute("aria-activedescendant"), "command-option-status", "does not wrap past the first row");

    // Filtering by prefix: only the disabled `effort` command starts with "e".
    type(textarea, "/e");
    rows = menuEl.querySelectorAll(".command-option");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].querySelector(".command-name").textContent, "/effort <default|low|high>");
    assert.equal(textarea.getAttribute("aria-activedescendant"), null, "no navigable row is active");

    // No command starts with "zz".
    type(textarea, "/zz");
    assert.equal(menuEl.querySelectorAll(".command-option").length, 0);
    assert.equal(menuEl.textContent, "No command matches.");
  });
});

test("CMD-MENU · Enter picks the active row, writes the composer, dispatches input, and keeps focus", async () => {
  await withTinyDom(async (root) => {
    const COMMANDS2 = [
      { name: "status", aliases: [], kind: "read", title: "Status", description: "This chat's facts.",
        args: null, availability: { available: true, reason: null }, sideEffects: "none", interactive: false, target: null },
      { name: "effort", aliases: [], kind: "setting", title: "Reasoning effort", description: "Save the reasoning effort.",
        args: { value: { type: "enum", values: ["default", "low", "high"], required: true } },
        availability: { available: true, reason: null }, sideEffects: "Saves the Host provider configuration.", interactive: false, target: null },
    ];
    const picks = [];
    const { textarea, menuEl } = setup(root, {
      routes: { "/sessions/s2/commands": catalogOf(COMMANDS2, "rev-2") },
      sessionId: "s2", onPick: (command) => picks.push(command),
    });
    let inputEvents = 0;
    textarea.addEventListener("input", () => { inputEvents++; });

    // No-args command: /status.
    textarea.focus();
    type(textarea, "/");
    await flush();
    assert.equal(textarea.getAttribute("aria-activedescendant"), "command-option-status");
    inputEvents = 0;
    assert.equal(press(textarea, "Enter"), false, "Enter is prevented while open");
    assert.equal(picks.length, 1);
    assert.equal(picks[0], COMMANDS2[0]);
    assert.equal(textarea.value, "/status", "no trailing space for a no-args command");
    assert.equal(inputEvents, 1, "an input event was dispatched");
    assert.equal(document.activeElement, textarea, "focus stays in the textarea");
    assert.equal(menuEl.hidden, true);
    assert.equal(textarea.getAttribute("aria-expanded"), null);
    assert.equal(textarea.getAttribute("aria-activedescendant"), null);

    // Args command: /effort <space>.
    type(textarea, "/e");
    assert.equal(textarea.getAttribute("aria-activedescendant"), "command-option-effort");
    inputEvents = 0;
    assert.equal(press(textarea, "Enter"), false);
    assert.equal(picks.length, 2);
    assert.equal(picks[1], COMMANDS2[1]);
    assert.equal(textarea.value, "/effort ", "a trailing space invites the argument");
    assert.equal(inputEvents, 1);
    assert.equal(document.activeElement, textarea);
    assert.equal(menuEl.hidden, true);
  });
});

test("CMD-MENU · Escape closes; a newline or a non-slash value stays closed; no session id shows the note", async () => {
  await withTinyDom(async (root) => {
    const { textarea, menuEl } = setup(root, { routes: { "/sessions/s3/commands": catalogOf(COMMANDS, "rev-3") }, sessionId: "s3" });

    textarea.focus();
    type(textarea, "/");
    await flush();
    assert.equal(menuEl.hidden, false);
    assert.equal(press(textarea, "Escape"), false, "Escape is prevented while open");
    assert.equal(menuEl.hidden, true);
    assert.equal(textarea.getAttribute("aria-expanded"), null);
    assert.equal(textarea.getAttribute("aria-activedescendant"), null);

    // Closed: an arrow key is never intercepted.
    assert.equal(press(textarea, "ArrowDown"), true, "not prevented once closed");

    type(textarea, "hello");
    assert.equal(menuEl.hidden, true, "no leading slash never opens");

    type(textarea, "/foo\nbar");
    assert.equal(menuEl.hidden, true, "a second line keeps the menu closed even with a leading slash");

    type(textarea, "/status extra");
    assert.equal(menuEl.hidden, true, "arguments on the first line are not a bare command token");

    // No session id: the trigger still opens, but shows the note and no options.
    const noSession = setup(root, { routes: {}, sessionId: null });
    noSession.textarea.focus();
    type(noSession.textarea, "/");
    assert.equal(noSession.menuEl.hidden, false);
    assert.equal(noSession.menuEl.textContent, "Commands work inside a chat.");
    assert.equal(noSession.menuEl.querySelectorAll(".command-option").length, 0);
    assert.equal(noSession.calls.length, 0, "no fetch is attempted without a session");
  });
});

test("CMD-MENU · the catalog is fetched from /sessions/:id/commands and catalog(sessionId) returns the cached {revision, commands}", async () => {
  await withTinyDom(async (root) => {
    const sessionId = "s 42"; // a space exercises the encodeURIComponent call in the request path.
    const routes = { "/sessions/s%2042/commands": catalogOf(COMMANDS, "rev-42") };
    const { textarea, calls, menu } = setup(root, { routes, sessionId });

    assert.equal(menu.catalog(sessionId), null, "nothing cached before the first fetch");
    textarea.focus();
    type(textarea, "/");
    await flush();

    assert.deepEqual(calls, ["/sessions/s%2042/commands"]);
    assert.deepEqual(menu.catalog(sessionId), { revision: "rev-42", commands: COMMANDS });

    // refresh() re-fetches on demand and updates the cache with whatever the Host now says.
    routes["/sessions/s%2042/commands"] = catalogOf(COMMANDS, "rev-43");
    await menu.refresh(sessionId);
    assert.deepEqual(calls, ["/sessions/s%2042/commands", "/sessions/s%2042/commands"]);
    assert.deepEqual(menu.catalog(sessionId), { revision: "rev-43", commands: COMMANDS });
  });
});
