/* The Chat page (stage 2 of the final Design ONE-SHOT): a peer page beside
 * Attention and Spark, over existing chats and routes only. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { withTinyDom } from "./tiny-dom.mjs";
import { createChatPage } from "../web/chat-page.mjs";

const here = new URL(".", import.meta.url).pathname;
const read = (p) => readFileSync(`${here}${p}`, "utf8");

function fixture() {
  const projects = [{ id: "p1", name: "Project Cedar" }, { id: "p2", name: "Northside" }];
  const sessionsByProject = new Map([
    ["p1", [{ id: "s1", projectId: "p1", title: "Term sheet questions", createdAt: "2026-09-10T10:00:00Z" }, { id: "s2", projectId: "p1", title: "Cedar review", createdAt: "2026-09-11T09:00:00Z", extensionBinding: { binding: { matterId: "m1" } } }]],
    ["p2", [{ id: "s3", projectId: "p2", title: "Ledger notes", createdAt: "2026-09-11T08:00:00Z" }]],
  ]);
  return { projects, sessionsByProject };
}

test("recent chats across open projects, newest first, marking Work and the current one", () => withTinyDom(() => {
  const opened = [];
  const page = createChatPage(document.createElement("section"), { onOpenSession: (id, pid) => opened.push([id, pid]), onNewChat() {}, onOpenAttention() {}, onOpenSpark() {} });
  const { projects, sessionsByProject } = fixture();
  const node = page.open({ projects, sessionsByProject, activeSessionId: "s3", currentSession: { id: "s3", projectId: "p2", title: "Ledger notes" } });
  const rows = node.querySelectorAll("[data-chat-session]");
  assert.deepEqual([...rows].map((r) => r.getAttribute("data-chat-session")), ["s2", "s3", "s1"]);
  assert.equal(rows[1].getAttribute("aria-current"), "page");
  assert.equal(rows[0].querySelectorAll(".session-mode-tag").length, 1, "the bound chat is marked Work");
  assert.equal(rows[2].querySelectorAll(".session-mode-tag").length, 0);
  rows[0].dispatchEvent({ type: "click", target: rows[0] });
  assert.deepEqual(opened, [["s2", "p1"]]);
  const back = node.querySelector('[data-chat-action="return"]');
  assert.match(back.textContent, /Return to Ledger notes/);
}));

test("empty state and New chat stay primary while explanation and sibling entries are disclosed", () => withTinyDom(() => {
  const calls = [];
  const page = createChatPage(document.createElement("section"), { onOpenSession() {}, onNewChat: () => calls.push("new"), onOpenAttention: () => calls.push("attention"), onOpenSpark: () => calls.push("spark") });
  const node = page.open({ projects: [], sessionsByProject: new Map() });
  assert.match(node.querySelector(".chat-empty").textContent, /No chats yet/);
  assert.equal(node.querySelector('[data-chat-action="return"]'), null);
  node.querySelector('[data-chat-action="new"]').dispatchEvent({ type: "click" });
  node.querySelector('[data-chat-facet="attention"]').dispatchEvent({ type: "click" });
  node.querySelector('[data-chat-facet="spark"]').dispatchEvent({ type: "click" });
  assert.deepEqual(calls, ["new", "attention", "spark"]);
  const text = node.textContent;
  assert.match(text, /Opening this page does not start a run/);
  const about = node.querySelector('details.chat-about');
  assert.equal(about.hasAttribute('open'), false);
  assert.equal(about.querySelector('[data-chat-action="new"]'), null);
  assert.equal(about.querySelectorAll('.chat-facet').length, 3);
  assert.equal(node.querySelectorAll("input, select").length, 0, "no fake toggles");
  assert.equal(node.querySelectorAll(".chat-facet").length, 3);
  assert.equal(node.querySelector(".chat-facet.is-current").querySelector(".chat-facet-name").textContent, "Chat");
  assert.equal(node.querySelector('[data-chat-action="example"]'), null, "no example entry unless one is supplied");
}));

test("app wiring: the Chat seat opens the page, the page closes like Attention, and it is served", () => {
  const app = read("../web/app.mjs");
  const html = read("../web/index.html");
  const server = read("../server/index.mjs");
  assert.match(html, /<section id="chat-page" class="chat-page" aria-label="Chat" hidden><\/section>/);
  assert.match(app, /\$\("chat-button"\)\.addEventListener\("click", \(\) => void openChatPage\(\)\)/);
  assert.match(app, /chatPage = createChatPage\(\$\("chat-page"\)/);
  assert.match(app, /\$\("chat-page"\)\.hidden = !state\.chatOpen \|\| settingsOpen/);
  assert.match(server, /"chat-page\.mjs"/);
  const openChatPage = app.slice(app.indexOf("async function openChatPage("), app.indexOf("\n}", app.indexOf("async function openChatPage(")));
  assert.doesNotMatch(openChatPage, /startNewSession|request\(|createProject/);
});

test("09 N-07 · a Chat-page row carries the Shell's object commands like a sidebar chat row; a target with none stays a plain row", () => withTinyDom(() => {
  const attached = [];
  const attachCommands = (row, ref) => {
    attached.push([row.getAttribute("data-chat-session"), ref]);
    row.addEventListener("contextmenu", () => {}); // the owner wires the row itself
    if (ref.id === "s1") return null; // e.g. no command for this target
    const more = document.createElement("button");
    more.className = "quiet-button object-more";
    more.setAttribute("aria-label", "More chat actions");
    return more;
  };
  const page = createChatPage(document.createElement("section"), { onOpenSession() {}, onNewChat() {}, onOpenAttention() {}, onOpenSpark() {}, attachCommands });
  const { projects, sessionsByProject } = fixture();
  const node = page.open({ projects, sessionsByProject });
  assert.deepEqual(attached, [["s2", { kind: "chat", id: "s2" }], ["s3", { kind: "chat", id: "s3" }], ["s1", { kind: "chat", id: "s1" }]], "the row and its object go to the one owner");
  const items = node.querySelectorAll('[role="listitem"]');
  assert.equal(items.length, 3);
  for (const item of items.slice(0, 2)) {
    assert.ok(item.classList.contains("session-row"), "the sidebar's row + More anatomy");
    assert.equal(item.children[0].getAttribute("data-chat-session") !== null, true);
    assert.equal(item.children[1].getAttribute("aria-label"), "More chat actions");
  }
  assert.equal(items[2].classList.contains("session-row"), false);
  assert.equal(items[2].children.length, 1, "no inert More control");
}));

test("09 N-07 · without an owner the Chat page draws no commands; the app passes the shared attachObjectCommands", () => withTinyDom(() => {
  const page = createChatPage(document.createElement("section"), { onOpenSession() {}, onNewChat() {}, onOpenAttention() {}, onOpenSpark() {} });
  const { projects, sessionsByProject } = fixture();
  const node = page.open({ projects, sessionsByProject });
  assert.equal(node.querySelectorAll(".object-more").length, 0);
  assert.equal(node.querySelectorAll('[role="listitem"]').every((item) => item.children.length === 1), true);
  assert.match(read("../web/app.mjs"), /createChatPage\(\$\("chat-page"\), \{[\s\S]*?attachCommands: \(row, ref\) => attachObjectCommands\(row, ref,/);
}));
