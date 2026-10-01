/* UX-11 audit slice S3 (engineering/research/ux-interaction-topology-20260930/rulings.md):
 * the chat's working context. File access has one chat-scoped card; the Chat
 * overview row opens it; the chat paperclip adds files through the Files view's
 * own save. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { withTinyDom, waitFor } from "./tiny-dom.mjs";
import { createMaterialsView, materialOutcome } from "../web/materials-view.mjs";

const app = readFileSync(new URL("../web/app.mjs", import.meta.url), "utf8");

function makeMaterialsDom() {
  const nodes = new Map();
  document.getElementById = (id) => nodes.get(id) ?? null;
  const make = (id, tag = "div") => { const node = document.createElement(tag); nodes.set(id, node); return node; };
  const dialog = make("materials-dialog", "dialog");
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; };
  for (const [id, tag] of [["workspace-files"], ["material-form", "form"], ["material-error", "p"], ["material-name", "input"], ["material-text", "textarea"], ["material-submit", "button"], ["material-upload", "input"], ["material-add", "details"], ["materials-session-title", "p"]]) make(id, tag);
  return { dialog };
}
const textFile = (name, text) => ({ name, size: new TextEncoder().encode(text).length, arrayBuffer: async () => new TextEncoder().encode(text).buffer });
const source = { sourceId: "source-1", name: "brief.md", path: "materials/brief.md", latestRevision: 2 };

test("S3 · one reading of a materials answer, shared by the Files form and the paperclip", () => {
  assert.equal(materialOutcome({ workspaceState: "written" }), "written");
  assert.equal(materialOutcome({ workspaceState: "pending" }), "pending");
  assert.equal(materialOutcome({ workspaceState: "superseded" }), "superseded");
  assert.equal(materialOutcome({}), "unknown");
  assert.equal(materialOutcome(null, { status: 503, body: { error: { code: "material_link_failed" } } }), "link_failed");
  assert.equal(materialOutcome(null, { status: 409, body: { error: { code: "source_revision_conflict" } } }), "conflict");
  assert.equal(materialOutcome(null, { status: 409, body: { error: { code: "active_run" } } }), "failed", "another 409 is not a revision conflict; its own message is shown");
  assert.equal(materialOutcome(null, new Error("offline")), "failed");
});

test("S3 · addFiles saves several files with the retained revision, retries with the same command, and checks before sending", async () => {
  await withTinyDom(async () => {
    makeMaterialsDom();
    const posts = [];
    let pendingOnce = true;
    const request = async (url, options = {}) => {
      const parsed = new URL(url, "http://local");
      if (parsed.pathname.endsWith("/materials") && options.method === "POST") {
        posts.push(options.body);
        if (options.body.name === "new.md" && pendingOnce) { pendingOnce = false; return { workspaceState: "pending" }; }
        return { workspaceState: "written", path: `materials/${options.body.name}`, retained: { revision: options.body.expectedRevision + 1 } };
      }
      if (parsed.pathname.endsWith("/materials")) return { sources: [source], coverage: "complete", limit: 200 };
      if (parsed.pathname.endsWith("/surface") || parsed.pathname.includes("/workspace")) return { files: [], entries: [] };
      return {};
    };
    const view = createMaterialsView({ request, getSession: () => ({ id: "session-1", title: "Chat" }), onOpenFile() {}, notify() {} });
    const outcomes = await view.addFiles([textFile("brief.md", "v3"), textFile("new.md", "hello"), textFile("bad name.md", "x")]);
    assert.deepEqual(outcomes.map((entry) => entry.outcome), ["written", "pending", "failed"]);
    assert.equal(posts.length, 2, "an invalid name is refused before any request");
    assert.equal(posts[0].expectedRevision, 2, "an existing name saves the next revision of that source");
    assert.equal(posts[1].expectedRevision, 0);
    assert.match(outcomes[0].message, /Saved materials\/brief\.md as revision 3\./);
    assert.match(outcomes[1].message, /Retained, but not yet linked/);
    const again = await outcomes[1].retry();
    assert.equal(again.outcome, "written");
    assert.equal(posts[2].commandId, posts[1].commandId, "the retry sends the same command");
  });
});

test("S3 · the file-access card holds this chat's file access and nothing Host-wide", async () => {
  await withTinyDom(async () => {
    const { renderFileAccessCard } = await import("../web/settings-view.mjs");
    const container = document.createElement("div");
    const modes = [], defaults = [];
    renderFileAccessCard(container, { session: { permissionMode: "ask" }, active: false, onClose() {}, onPermission: (mode) => modes.push(mode), onDefaults: () => defaults.push(1) });
    assert.equal(container.querySelector("h3").textContent, "File access · this chat");
    assert.doesNotMatch(container.textContent, /Model|Provider|Connection/, "no model block in a chat-scoped control");
    const radios = container.querySelectorAll('input[type="radio"]');
    assert.ok(radios.length >= 2);
    const other = radios.find((radio) => !radio.checked);
    other.checked = true;
    await other.dispatchEvent({ type: "change", target: other });
    assert.equal(modes.length, 1);
    const toDefaults = container.querySelectorAll("button").find((node) => node.getAttribute("aria-label") === "Default for new chats in Settings");
    toDefaults.click();
    assert.equal(defaults.length, 1);
    renderFileAccessCard(container, { session: { permissionMode: "ask" }, active: true, activeNotice: "Available after this run ends.", onClose() {}, onPermission() {} });
    assert.equal(container.querySelector("fieldset").disabled, true);
    assert.match(container.textContent, /Available after this run ends\./);
  });
});

test("S3 · the Chat overview's file-access row opens the chat control, with no settings gear", async () => {
  await withTinyDom(async () => {
    const { renderSessionOverview } = await import("../web/workspace-view.mjs");
    const container = document.createElement("div");
    let opened = 0;
    renderSessionOverview(container, { session: {}, permissionLabel: "Ask before editing", onClose() {}, onMaterials() {}, onWorkspace() {}, onRun() {}, onHistory() {}, onPermissions: () => opened++ });
    const row = container.querySelectorAll("button").find((node) => node.getAttribute("aria-label") === "Ask before editing");
    assert.ok(row);
    row.click();
    assert.equal(opened, 1);
    assert.match(container.textContent, /File access/);
    assert.doesNotMatch(container.textContent, /Chat settings/);
    assert.match(app, /onPermissions: go\(\(\) => openFileAccessCard\(\$\("show-run-button"\)\)\),/);
  });
});

test("S3 · wiring: the chat paperclip opens the add-files popover; Files stays the list", () => {
  assert.match(app, /\$\("materials-button"\)\.addEventListener\("click", \(\) => chatFilesAttach\.open\(\)\);/);
  assert.match(app, /"materials-button": \["paperclip", "Add files to this chat"\]/);
  assert.match(app, /addFiles: \(files\) => materialsView\.addFiles\(files\),/);
  assert.match(app, /onMaterials: go\(\(\) => \{\s*openDialog\("materials-dialog", "close-materials-button"\);/);
  assert.doesNotMatch(app, /openConnectionCard|renderConnectionCard|connectionMeasurementViews/);
});

test("S3 review · addFiles reports every Host outcome as the Files form does, and stops at a chat switch", async () => {
  await withTinyDom(async () => {
    makeMaterialsDom();
    const posts = [];
    let session = { id: "session-1", title: "Chat" };
    let linkFailsOnce = true;
    const answers = {
      "old.md": () => ({ workspaceState: "superseded" }),
      "raced.md": () => { throw Object.assign(new Error("changed"), { status: 409, body: { error: { code: "source_revision_conflict" } } }); },
      "linked.md": () => { if (linkFailsOnce) { linkFailsOnce = false; throw Object.assign(new Error("link"), { status: 503, body: { error: { code: "material_link_failed" } } }); } return { workspaceState: "written", path: "materials/linked.md" }; },
      "odd.md": () => ({}),
      "switch.md": () => { session = { id: "session-2", title: "Other" }; return { workspaceState: "written", path: "materials/switch.md" }; },
    };
    const request = async (url, options = {}) => {
      const parsed = new URL(url, "http://local");
      if (parsed.pathname.endsWith("/materials") && options.method === "POST") { posts.push(options.body); return answers[options.body.name](); }
      if (parsed.pathname.endsWith("/materials")) return { sources: [source], coverage: "complete", limit: 200 };
      return { files: [], entries: [] };
    };
    const view = createMaterialsView({ request, getSession: () => session, onOpenFile() {}, notify() {} });
    const big = { name: "big.md", size: 2_000_000, arrayBuffer: async () => new ArrayBuffer(0) };
    const outcomes = await view.addFiles([textFile("old.md", "a"), textFile("raced.md", "b"), textFile("linked.md", "c"), textFile("odd.md", "d"), big, textFile("switch.md", "e"), textFile("after.md", "f")]);
    assert.deepEqual(outcomes.map((entry) => entry.outcome), ["superseded", "conflict", "link_failed", "unknown", "failed", "written", "not_sent"]);
    assert.ok(!posts.some((body) => body.name === "big.md" || body.name === "after.md"), "an oversize file and the file after a chat switch are not sent");
    assert.match(outcomes[0].message, /newer version already exists/);
    assert.match(outcomes[1].message, /changed during the save/);
    assert.match(outcomes[3].message, /outcome is unknown/);
    const linked = outcomes[2];
    const firstCommand = posts.find((body) => body.name === "linked.md").commandId;
    session = { id: "session-1", title: "Chat" };
    // A retry belongs to the chat the file was sent to.
    view.open();
    const again = await linked.retry();
    assert.equal(again.outcome, "written");
    assert.equal(posts.filter((body) => body.name === "linked.md").at(-1).commandId, firstCommand);
  });
});

test("S3 review · partial coverage refuses a name it cannot check", async () => {
  await withTinyDom(async () => {
    makeMaterialsDom();
    const posts = [];
    const request = async (url, options = {}) => {
      const parsed = new URL(url, "http://local");
      if (parsed.pathname.endsWith("/materials") && options.method === "POST") { posts.push(options.body); return { workspaceState: "written" }; }
      if (parsed.pathname.endsWith("/materials")) return { sources: [source], coverage: "partial", limit: 1 };
      return { files: [], entries: [] };
    };
    const view = createMaterialsView({ request, getSession: () => ({ id: "session-1" }), onOpenFile() {}, notify() {} });
    const [unknown, known] = await view.addFiles([textFile("fresh.md", "a"), textFile("brief.md", "b")]);
    assert.equal(unknown.outcome, "failed");
    assert.match(unknown.message, /incomplete/);
    assert.equal(known.outcome, "written");
    assert.deepEqual(posts.map((body) => body.name), ["brief.md"]);
  });
});

test("S3 review · the popover: a batch reports to its own chat, keeps unresolved outcomes, and a press while open closes it", async () => {
  await withTinyDom(async (root) => {
    const { createChatFilesAttach } = await import("../web/chat-files-attach.mjs");
    const wrap = document.createElement("div");
    const trigger = document.createElement("button");
    wrap.append(trigger);
    const toasts = [];
    let session = "chat-a", release;
    const attach = createChatFilesAttach({
      trigger,
      addFiles: () => new Promise((resolve) => { release = resolve; }),
      openFiles() {},
      getSessionId: () => session,
      notify: (text, kind) => toasts.push([text, kind]),
    });
    const popover = wrap.children[1];
    // Open state without the toggle event: its anchoring needs a real layout.
    popover.showPopover = () => { popover._popoverOpen = true; };
    popover.hidePopover = () => { popover._popoverOpen = false; };
    const input = popover.querySelector('input[type="file"]');
    attach.open();
    assert.equal(popover.matches(":popover-open"), true);
    input.files = [{ name: "a.md" }];
    const saving = input.dispatchEvent({ type: "change", target: input });
    await tick();
    session = "chat-b"; attach.reset();
    release([{ name: "a.md", outcome: "conflict", message: "changed" }]);
    await saving; await tick();
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0][1], "error");
    assert.equal(popover.querySelectorAll("li").length, 0, "chat B does not show chat A's outcome");

    attach.open();
    input.files = [{ name: "b.md" }];
    input.dispatchEvent({ type: "change", target: input });
    await tick();
    release([{ name: "b.md", outcome: "pending", message: "not linked", retry: async () => ({ name: "b.md", outcome: "written", message: "saved" }) }]);
    await tick(); await tick();
    popover.hidePopover();
    attach.open();
    assert.equal(popover.querySelectorAll("li").length, 1, "an unresolved outcome stays until it is seen");
    const retry = popover.querySelectorAll("button").find((node) => node.getAttribute("aria-label") === "Retry b.md");
    retry.click(); await tick(); await tick();
    assert.equal(popover.querySelector('[role="status"]').textContent, "Saved 1 file to this chat.", "the status follows the retry");

    trigger.dispatchEvent({ type: "pointerdown", target: trigger });
    popover.hidePopover();
    attach.open();
    assert.equal(popover.matches(":popover-open"), false, "a press while open closes it rather than reopening");
  });
});
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test("S3 evidence · the file access card opens beside whatever opened it", () => {
  const wiring = app.slice(app.indexOf('const popover = $("connection-popover");\n    let stopFollowing'));
  assert.match(wiring, /anchorPopover\(anchor, popover, \{ placement: "top-start", fit: true \}\)/);
  assert.match(wiring, /const anchor = state\.connectionCardAnchor;/);
  assert.match(app, /state\.connectionCardAnchor = anchor;/, "the chip and the overview row both record the opener");
});
