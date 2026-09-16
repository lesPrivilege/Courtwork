/* 09 · the trail and the row commands are wired the way the contract says:
 * one stack, no browser history, leave/arrive at the real navigation seams,
 * every entry point on a row through one dispatcher, and the example's exit
 * no longer throws a project-less chat back to Home. Source-visible facts. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { semanticEntries } from "../web/product-semantics.generated.mjs";

const root = new URL("../../", import.meta.url).pathname;
const read = (p) => readFileSync(`${root}${p}`, "utf8");
const app = read("app/web/app.mjs");
const html = read("app/web/index.html");
const server = read("app/server/index.mjs");
const docs = read("docs/interface-components.md");

test("09 · one stack: the Shell trail is in memory, the hash stays the Settings deep link, nothing is pushed to the browser", () => {
  assert.match(app, /history: createLocationHistory\(\)/);
  assert.doesNotMatch(app, /history\.pushState|window\.addEventListener\("popstate"/);
  assert.deepEqual(app.match(/location\.hash = [^;]+;/g), ['location.hash = settingsHash(target);', 'location.hash = "";'], "only Settings writes the hash: its section, or nothing");
  assert.match(html, /<div class="nav-history" role="group" aria-label="Recent places">\s*<button id="nav-back-button"[^>]*disabled>/);
  assert.match(html, /<button id="nav-forward-button"[^>]*disabled>/);
  assert.match(html, /id="nav-history-notice"[^>]*role="status"/);
  for (const key of ["nav.back", "nav.forward", "chat.open", "chat.rename", "chat.delete"]) assert.ok(semanticEntries[key], key);
  assert.equal(semanticEntries["nav.back"].glyphRef, "arrow-left");
  assert.equal(semanticEntries["chat.delete"].glyphRef, "trash");
  for (const name of ["location-history.mjs", "object-commands.mjs", "object-menu.mjs"]) assert.ok(server.includes(`"${name}"`), `${name} is served`);
  assert.match(docs, /## Navigation history and object commands \(2026-09-16\)/);
});

test("09 · leave before every departure, arrive only through the reader; traversal resolves through selectSession and restores the anchor after render", () => {
  assert.equal((app.match(/^\s*leaveLocation\(\);$/gm) || []).length, 4, "goHome, selectSession, selectProject and a traversal capture the reading position before leaving");
  assert.match(app, /leaveLocation\(\);\n\s*const entry = direction === "back" \? state\.history\.back\(\) : state\.history\.forward\(\);/, "NAV-R1: the departure anchor is taken before the cursor moves");
  assert.match(app, /if \(!reading\.anchor\) return;\n\s*state\.history\.remember/, "no rows on screen never overwrites a kept anchor");
  assert.match(app, /\} else \{\n[^}]*state\.traversal = null;\n\s*state\.history\.arrive\(location\);/, "NAV-R1: a place opened while a return is pending wins and the pending return is abandoned");
  assert.match(app, /objectMenu\?\.refresh\(\);/, "NAV-R3: the open menu re-lists on every render");
  assert.match(app, /leaveLocation\(\);\n  const own = \+\+state\.navigationEpoch;\n  await persistCurrentDraft\(\);/);
  assert.match(app, /arriveLocation\(\{ kind: "session", sessionId, projectId: detail\.session\.projectId \?\? null, title: detail\.session\.title \}\);/);
  assert.match(app, /runtimeView\?\.pause\(\);\n  arriveLocation\(\{ kind: "home" \}\);/);
  assert.match(app, /if \(entry\.kind === "home"\) \{ await goHome\(\); return; \}/);
  assert.match(app, /await selectSession\(entry\.sessionId, \{ focus: true \}\);/);
  assert.match(app, /restoreChatReading\(stream, entry\.restore\.reading, \{ followLatest: false \}\)/);
  assert.match(app, /state\.history\.markUnavailable\(entry, reason\);\n\s*state\.historyNotice = `\$\{describeLocation\(entry\)\} \$\{reason\}\. Showing Home\.`;/);
  assert.doesNotMatch(app, /traverseHistory[\s\S]{0,1600}submitSessionRun|traverseHistory[\s\S]{0,1600}cancelRun/, "Back and Forward touch no Run");
  assert.match(app, /const label = entry \? `\$\{word\} to \$\{describeLocation\(entry\)\}` : word;/, "the control names its destination");
});

test("09 · every row entry point goes through the one dispatcher; the native menu is taken only when a menu is offered", () => {
  assert.match(app, /const objectCommands = createCommandDispatcher\(\{\n  resolve: resolveCommandTarget,/);
  assert.match(app, /if \(openMenu\(\{ point: \{ x: event\.clientX, y: event\.clientY \} \}\)\) event\.preventDefault\(\);/);
  assert.match(app, /event\.key === "ContextMenu" \|\| \(event\.shiftKey && event\.key === "F10"\)/);
  assert.equal((app.match(/attachObjectCommands\((button|sessionButton),\s*\{\s*kind:\s*"(chat|project)",\s*id:/g) || []).length, 3, "Recent rows, project chat rows and project rows");
  assert.match(app, /runObjectCommand\("project\.new-chat", \{ kind: "project", id: project\.id \}\)/, "the inline New chat is the same command");
  assert.match(app, /method: "PATCH", body: \{ title \}/);
  assert.match(app, /method: "DELETE" \}\);\n\s*state\.recentSessions = state\.recentSessions\.filter/);
  assert.match(app, /state\.history\.forget\(target\.id\);/);
  assert.match(html, /<dialog\s+id="rename-dialog"/);
  assert.match(html, /<dialog\s+id="delete-dialog"/);
  assert.match(html, /The chat leaves your lists\. Files in its workspace are kept\./);
  assert.match(html, /id="object-menu"[^>]*\n?\s*class="context-popover object-menu"\n?\s*popover="auto"/);
});

test("09 · dogfooding fix: leaving the example keeps a project-less chat in place", () => {
  assert.match(app, /const projectGone = Boolean\(state\.activeProjectId\) && !valid\.has\(state\.activeProjectId\);\n  if \(projectGone \|\| preview\.isExampleId\(state\.activeSessionId\)\) \{/);
  assert.doesNotMatch(app, /if \(!state\.activeProjectId \|\| !valid\.has\(state\.activeProjectId\)/);
});
