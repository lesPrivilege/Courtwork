import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createWorkspaceCard, repositoryName, activeRepositoryBinding, workLocationEntry, REPOSITORY_ACTIVE_RUN, REPOSITORY_DIALOG_OPEN, SEND_BUSY, PREPARE_UNCERTAIN, WORK_LOCATION_EMPTY } from "../web/workspace-card.mjs";
import { withTinyDom, flush } from "./tiny-dom.mjs";

const root = new URL("../../", import.meta.url).pathname;
const field = (body, key) => [...body.querySelectorAll("button,input")].find(e => e.getAttribute("data-repository-field") === key);
const fields = (body, key) => [...body.querySelectorAll("button,input")].filter(e => e.getAttribute("data-repository-field") === key);
const unbound = { id: "s1", repositoryBinding: null, repositoryBindingRevision: 0 };
const bound = { id: "s1", repositoryBindingRevision: 1, repositoryBinding: { id: "b1", rootPath: "/synthetic/parcel", device: "1", inode: "2", revision: 1, status: "active" } };
const recentEntries = [
  { rootPath: "/synthetic/parcel", lastConnectedAt: "2026-09-16T00:00:00.000Z", available: true, sessions: 2, git: { branch: "main" } },
  { rootPath: "/gone/old-repo", lastConnectedAt: "2026-09-15T00:00:00.000Z", available: false, sessions: 1, git: null },
];
function fakeRequest({ recent = recentEntries, choose = { rootPath: "/picked/repo" }, bindError = null } = {}) {
  const calls = [];
  return { calls, request: async (path, options = {}) => {
    calls.push({ path, method: options.method || "GET", body: options.body });
    if (path === "/repositories/recent") return { schemaVersion: 1, entries: recent };
    if (path === "/host/choose-directory") { if (choose instanceof Error) throw choose; return choose; }
    if (path.endsWith("/repository-binding")) { if (bindError) throw bindError; return { receipt: {}, binding: null, idempotent: false }; }
    throw new Error("unexpected " + path);
  } };
}
async function settle() { await flush(); await flush(); await flush(); }

test("repositoryName shows the folder word; activeRepositoryBinding ignores revoked bindings", () => {
  assert.equal(repositoryName("/synthetic/parcel/"), "parcel");
  assert.equal(repositoryName("/"), "/");
  assert.equal(activeRepositoryBinding(bound)?.id, "b1");
  assert.equal(activeRepositoryBinding({ repositoryBinding: { ...bound.repositoryBinding, status: "revoked" } }), null);
  assert.equal(activeRepositoryBinding(null), null);
});

test("An unbound chat offers Open folder first, lists folders connected before, and keeps the path behind a disclosure", () => withTinyDom(async body => {
  const { calls, request } = fakeRequest();
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {} });
  card.render(body, { session: unbound, active: false });
  await settle();
  assert.ok(field(body, "open"), "Open folder is the primary action");
  assert.equal(calls.filter(c => c.path === "/repositories/recent").length, 1, "the recent list is read once per open");
  const rows = fields(body, "recent");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].getAttribute("data-root-path"), "/synthetic/parcel");
  assert.equal(rows[0].disabled, false);
  assert.equal(rows[1].disabled, true, "a folder that is gone keeps its row but cannot be connected");
  assert.ok(body.textContent.includes("Not found"));
  assert.ok(body.querySelector("details summary"), "the typed path is a secondary disclosure");
  assert.ok(field(body, "path"));
  assert.equal(field(body, "disconnect"), undefined);
}));

test("Choosing a folder connected before sends one bind command and reads the Session back", () => withTinyDom(async body => {
  const { calls, request } = fakeRequest();
  const seen = [];
  const card = createWorkspaceCard({ request, onSession: async id => { seen.push(id); card.render(body, { session: bound, active: false }); }, onClose: () => {} });
  card.render(body, { session: unbound, active: false });
  await settle();
  fields(body, "recent")[0].click();
  await settle();
  const bind = calls.find(c => c.method === "PUT");
  assert.equal(bind.path, "/sessions/s1/repository-binding");
  assert.deepEqual(Object.keys(bind.body).sort(), ["expectedRevision", "operation", "requestId", "rootPath"]);
  assert.equal(bind.body.rootPath, "/synthetic/parcel");
  assert.equal(bind.body.expectedRevision, 0);
  assert.match(bind.body.requestId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(seen, ["s1"], "the card asks for the Session after the receipt instead of assuming success");
  assert.ok(body.textContent.includes("/synthetic/parcel") && body.textContent.includes("Read only"));
  assert.ok(field(body, "disconnect"));
}));

test("Open folder asks the Host for a native dialog, binds the chosen path, and does nothing when cancelled", () => withTinyDom(async body => {
  const { calls, request } = fakeRequest();
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {} });
  card.render(body, { session: unbound, active: false });
  await settle();
  field(body, "open").click();
  assert.ok(body.textContent.includes(REPOSITORY_DIALOG_OPEN), "while the dialog is open the card says so");
  await settle();
  const choose = calls.find(c => c.path === "/host/choose-directory");
  assert.equal(choose.method, "POST");
  assert.equal(calls.find(c => c.method === "PUT")?.body.rootPath, "/picked/repo");

  const cancelled = fakeRequest({ choose: { cancelled: true } });
  const card2 = createWorkspaceCard({ request: cancelled.request, onSession: async () => {}, onClose: () => {} });
  card2.render(body, { session: unbound, active: false });
  await settle();
  field(body, "open").click(); await settle();
  assert.equal(cancelled.calls.some(c => c.method === "PUT"), false, "a cancelled dialog binds nothing");
  assert.equal(body.querySelector(".inline-error"), null);
}));

test("A Host without a folder dialog falls back to the typed path as the primary form", () => withTinyDom(async body => {
  const unsupported = Object.assign(new Error("a native folder dialog is not available on this host"), { status: 501 });
  const { request } = fakeRequest({ choose: unsupported, recent: [] });
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {} });
  card.render(body, { session: unbound, active: false });
  await settle();
  field(body, "open").click(); await settle();
  assert.equal(field(body, "open"), undefined, "the dialog action disappears once the Host says it is unavailable");
  assert.equal(body.querySelector("details"), null, "the path form is no longer hidden");
  assert.ok(field(body, "path"));
  assert.equal(body.querySelector(".inline-error"), null);
}));

test("A rejected typed path keeps the text, shows the Host message and reuses the requestId on retry", () => withTinyDom(async body => {
  let fail = true;
  const calls = [];
  const request = async (path, options = {}) => {
    calls.push(options.body);
    if (path === "/repositories/recent") return { entries: [] };
    if (fail) throw Object.assign(new Error("repository root must be an existing readable directory"), { status: 400 });
    return {};
  };
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {} });
  card.render(body, { session: unbound, active: false });
  await settle();
  field(body, "connect").click(); await settle();
  assert.equal(calls.filter(Boolean).length, 0, "an empty path never reaches the Host");
  assert.ok(body.querySelector(".inline-error"));
  field(body, "path").value = "/missing"; field(body, "path").dispatchEvent({ type: "input" });
  field(body, "connect").click(); await settle();
  assert.equal(body.querySelector(".inline-error")?.textContent, "repository root must be an existing readable directory");
  assert.equal(field(body, "path").value, "/missing");
  fail = false;
  field(body, "connect").click(); await settle();
  const binds = calls.filter(b => b?.operation === "bind");
  assert.equal(binds.length, 2);
  assert.equal(binds[0].requestId, binds[1].requestId, "same path retried replays the same command");
}));

test("A bound chat shows the folder and scope; Disconnect sends revoke with the current revision", () => withTinyDom(async body => {
  const { calls, request } = fakeRequest();
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {} });
  card.render(body, { session: bound, active: false });
  assert.equal(field(body, "path"), undefined);
  assert.equal(field(body, "open"), undefined);
  assert.ok(body.textContent.includes("/synthetic/parcel") && body.textContent.includes("Read only"));
  field(body, "disconnect").click(); await settle();
  const revoke = calls.find(c => c.method === "PUT");
  assert.deepEqual(Object.keys(revoke.body).sort(), ["expectedRevision", "operation", "requestId"]);
  assert.equal(revoke.body.operation, "revoke");
  assert.equal(revoke.body.expectedRevision, 1);
}));

test("On Home the card edits a draft: choosing writes the intent, nothing is bound, Remove clears it", () => withTinyDom(async body => {
  const { calls, request } = fakeRequest();
  let draftPath = null;
  const draft = { get path() { return draftPath; }, onChange: path => { draftPath = path; } };
  const card = createWorkspaceCard({ request, onSession: async () => { throw new Error("no Session on Home"); }, onClose: () => {} });
  card.render(body, { session: null, active: false, draft });
  await settle();
  fields(body, "recent")[0].click(); await settle();
  assert.equal(draftPath, "/synthetic/parcel");
  assert.equal(calls.some(c => c.method === "PUT"), false, "a Home draft never binds");
  assert.ok(body.textContent.includes("Connected when you send."));
  field(body, "remove").click(); await settle();
  assert.equal(draftPath, null);
  assert.ok(field(body, "open"));
  field(body, "open").click(); await settle();
  assert.equal(draftPath, "/picked/repo", "the native dialog also writes the draft on Home");
}));

test("While a run is active the card explains the wait and disables the commands", () => withTinyDom(async body => {
  const { request } = fakeRequest();
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {} });
  card.render(body, { session: unbound, active: true });
  await settle();
  assert.equal(field(body, "open").disabled, true);
  assert.equal(field(body, "connect").disabled, true);
  assert.ok(body.textContent.includes(REPOSITORY_ACTIVE_RUN));
  card.render(body, { session: bound, active: true });
  assert.equal(field(body, "disconnect").disabled, true);
}));

test("Band placement and shell wiring for the Work location entry", () => {
  const html = readFileSync(`${root}app/web/index.html`, "utf8");
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  const css = readFileSync(`${root}app/web/styles.css`, "utf8");
  const server = readFileSync(`${root}app/server/index.mjs`, "utf8");
  const formStart = html.indexOf('<form id="composer-form"');
  const areaStart = html.indexOf('<footer id="composer-area"');
  const stripStart = html.indexOf('id="composer-context-strip"');
  assert.ok(stripStart > areaStart && stripStart < formStart, "the strip is its own card above the composer, inside the composer area");
  assert.match(app, /const tab = strip\.querySelector\(":scope > \.context-tab"\) \|\| element\("div", \{ className: "context-tab" \}\);/);
  assert.doesNotMatch(css.slice(css.indexOf(".context-tab {"), css.indexOf(".composer-form { position: relative; }")), /border(?!-radius)/, "the tab is separated by tone, not by a line");
  assert.match(app, /const greeting = home && state\.greeting\?\.text;/, "the composer intro hosts the greeting on every Home layout (GUI grammar G1)");
  assert.doesNotMatch(css.slice(css.indexOf(".composer-context-strip {"), css.indexOf(".context-chip {")), /backdrop-filter/, "no blur on the strip");
  assert.doesNotMatch(html, /id="repository-button"/, "no standing control in the composer row");
  assert.match(html, /id="workspace-popover"[^>]*popover="auto"[^>]*role="dialog"[^>]*aria-label="Work location"/);
  assert.doesNotMatch(html, /home-project-button|home-project-popover/, "the project is chosen in the Work location panel, not from a second composer control");
  assert.match(app, /const visible = home \|\| \(Boolean\(session\) && !state\.runs\.length && !state\.attentionOpen\)/, "the strip leaves once work has started");
  assert.match(app, /const entry = workLocationEntry\(\{ projectName: project\?\.name \|\| null, rootPath: rootPath \|\| null \}\);/);
  assert.match(app, /if \(branch\) children\.push/, "an unknown branch is never drawn");
  assert.match(app, /onRepository: go\(\(\) => openWorkspaceCard\(\$\("show-run-button"\)\)\)/, "after work starts the overview reaches the same card");
  assert.match(app, /if \(state\.homeRepositoryPath && session\.repositoryBinding\?\.status !== "active"\) \{\s*operation\.bindRequestId \|\|= crypto\.randomUUID\(\);/, "Home binds the draft before the first run with a stable requestId");
  /* The card's own commands still read the Session back rather than trusting a
     receipt. Since a Chat can now be prepared from Home before it is sent to,
     that read-back lands in whichever place holds it: the project lists, or
     the Home start marker that owns a prepared Chat. */
  assert.match(app, /const detail = await request\(`\/sessions\/\$\{encodeURIComponent\(id\)\}`\);\s*if \(detail\.runs\?\.length && retirePreparedChat\(id\)\)/,
    "that read already carries the Run list, so a prepared chat with work is reconciled here too");
  assert.match(app, /if \(preparedHomeChat\(\)\?\.id === id\) \{/);
  assert.match(app, /\} else applySessionUpdate\(detail\.session, id\);/);
  const runRows = readFileSync(`${root}app/web/run-rows.mjs`, "utf8");
  assert.match(runRows, /tool === "repo_read" \|\| tool === "candidate_read"\) return "file-text"/, "repository reads share the read glyph in the shared row renderer");
  assert.match(css, /\.context-chip\[aria-expanded="true"\]/);
  assert.match(server, /"workspace-card\.mjs"/, "the Host serves the card module");
});

test("the Work location entry names only the facts it opens, and says which are absent", () => {
  assert.deepEqual(workLocationEntry({}), { parts: [], label: WORK_LOCATION_EMPTY, ariaLabel: WORK_LOCATION_EMPTY, tooltip: "Choose a project and a folder for this chat" });
  const both = workLocationEntry({ projectName: "Parcel maintenance", rootPath: "/synthetic/parcel/" });
  assert.deepEqual(both.parts, ["Parcel maintenance", "parcel"], "project first, then the folder's own name");
  assert.equal(both.ariaLabel, "Work location: project Parcel maintenance; folder /synthetic/parcel/, read only");
  assert.equal(workLocationEntry({ rootPath: "/synthetic/parcel" }).ariaLabel, "Work location: no project; folder /synthetic/parcel, read only");
  assert.equal(workLocationEntry({ projectName: "Parcel maintenance" }).ariaLabel, "Work location: project Parcel maintenance; no folder");
  for (const entry of [both, workLocationEntry({ rootPath: "/x" })])
    assert.doesNotMatch(entry.ariaLabel + entry.tooltip, /candidate|edit|write|Local/i, "the entry is not a permission and does not name one");
});

test("A Home send in flight locks the project and folder, and says why", () => withTinyDom(async body => {
  const { request } = fakeRequest();
  const card = createWorkspaceCard({ request, onSession: () => {}, onClose: () => {} });
  let chosen = 0;
  card.render(body, { session: null, active: false, draft: { path: "/synthetic/parcel", onChange: () => {} }, busyReason: SEND_BUSY,
    projectChoice: { options: [{ id: "p1", name: "Parcel maintenance" }], selectedId: null, onChoose: () => { chosen++; }, onCreate: () => {} } });
  await settle();
  assert.equal(field(body, "project:p1").disabled, true);
  assert.equal(field(body, "project-new").disabled, true);
  assert.equal(field(body, "remove").disabled, true);
  field(body, "project:p1").click();
  assert.equal(chosen, 0, "a disabled choice does nothing");
  assert.match(body.textContent, new RegExp(SEND_BUSY.slice(0, 40)));
}));

/* ── CE-F2 · where the keyboard starts when the panel opens ───────────────
 * Counterexample (evidence/composer-entry-acceptance-20260921/browser/04-reopened.png):
 * the opener focused the first of open/path/disconnect/remove, so a bound
 * panel started on Disconnect and scrolled its title and Close out of view.
 * `inView` stands for the opener's geometry (app.mjs toggle handler); the
 * browser capture in the 06d packet measures the real one. */
const everything = () => true, nothing = () => false;
const LONG = "/private/tmp/synthetic/" + "a-very-long-folder-name-that-keeps-going/".repeat(6) + "parcel";
const key = node => node?.getAttribute("data-repository-field");

test("CE-F2 · a bound panel starts on Close, never on Disconnect, even when Disconnect is in view", () => withTinyDom(async body => {
  const { request } = fakeRequest();
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {} });
  for (const session of [bound, { ...bound, repositoryBinding: { ...bound.repositoryBinding, rootPath: LONG } }]) {
    card.render(body, { session, active: false });
    const start = card.initialFocus(body, { inView: everything });
    assert.equal(key(start), "close");
    assert.ok(field(body, "disconnect") && !field(body, "disconnect").disabled, "Disconnect is still there, one Tab stop away");
    assert.ok(body.textContent.includes(session.repositoryBinding.rootPath), "the whole location is drawn for reading");
  }
}));

test("CE-F2 · an unbound chat starts on Connect folder when it is in view, and on Close when it is not", () => withTinyDom(async body => {
  const { request } = fakeRequest();
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {} });
  card.render(body, { session: unbound, active: false });
  await settle();
  assert.equal(key(card.initialFocus(body, { inView: everything })), "open");
  assert.equal(key(card.initialFocus(body, { inView: nothing })), "close", "a decision below the fold is not scrolled to");
  assert.equal(key(card.initialFocus(body)), "close", "without geometry nothing counts as in view");
}));

test("CE-F2 · a fresh Home starts on the chosen project; a staged folder starts on Close", () => withTinyDom(async body => {
  const { request } = fakeRequest();
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {} });
  let path = null;
  const draft = { get path() { return path; }, onChange: next => { path = next; } };
  const projectChoice = { options: [{ id: "p1", name: "Parcel maintenance" }], selectedId: null, onChoose: () => {}, onCreate: () => {} };
  card.render(body, { session: null, active: false, draft, projectChoice });
  await settle();
  assert.equal(key(card.initialFocus(body, { inView: everything })), "project:none");
  path = LONG;
  card.render(body, { session: null, active: false, draft, projectChoice });
  assert.equal(key(card.initialFocus(body, { inView: everything })), "close", "Remove is not a decision still open");
}));

test("CE-F2 · a locked panel starts on Close and its reason stays beside the locked control", () => withTinyDom(async body => {
  const { request } = fakeRequest();
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {} });
  for (const [session, busyReason] of [[unbound, SEND_BUSY], [bound, SEND_BUSY], [unbound, PREPARE_UNCERTAIN], [bound, PREPARE_UNCERTAIN]]) {
    card.render(body, { session, active: false, busyReason });
    await settle();
    assert.equal(key(card.initialFocus(body, { inView: everything })), "close", `${busyReason.slice(0, 20)}… on ${session.repositoryBinding ? "bound" : "unbound"}`);
    const locked = field(body, "open") || field(body, "disconnect");
    assert.equal(locked.disabled, true);
    assert.ok(locked.parentNode.textContent.includes(busyReason), "the reason is in the same section as the control it locks");
  }
}));

test("CE-F2 · an unfinished preparation starts on Close; its way out stays enabled with its reason", () => withTinyDom(async body => {
  const { request } = fakeRequest();
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {} });
  card.render(body, { session: bound, active: false, busyReason: PREPARE_UNCERTAIN, preparation: { onResume: () => {} } });
  await settle();
  assert.equal(key(card.initialFocus(body, { inView: everything })), "close");
  const resume = field(body, "start-edits");
  assert.equal(resume.disabled, false, "Finish preparing is how the unknown is settled");
  assert.ok(resume.parentNode.textContent.includes(PREPARE_UNCERTAIN));
}));

test("CE-F2 · a read-back re-render keeps the keyboard on Close instead of dropping it", () => withTinyDom(async body => {
  const { request } = fakeRequest();
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {} });
  card.render(body, { session: bound, active: false });
  card.initialFocus(body, { inView: everything }).focus();
  card.render(body, { session: { ...bound, repositoryBindingRevision: 2, repositoryBinding: { ...bound.repositoryBinding, revision: 2 } }, active: false });
  assert.equal(key(document.activeElement), "close");
  assert.ok(body.contains(document.activeElement), "the focused Close is the one now drawn");
}));

test("CE-F2 · a command that loses its control still falls back inside the card, not to Close", () => withTinyDom(async body => {
  const { request } = fakeRequest();
  const card = createWorkspaceCard({ request, onSession: async () => {}, onClose: () => {} });
  card.render(body, { session: unbound, active: false });
  await settle();
  field(body, "open").focus();
  card.render(body, { session: bound, active: false });
  assert.equal(key(document.activeElement), "disconnect", "Connect became Disconnect: the command's own chain still decides");
}));

test("CE-F2 · the panel's opener decides the start after it is sized, from its top, without scrolling", () => {
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  const toggle = app.slice(app.indexOf('const popover = $("workspace-popover");\n    let stopFollowing'));
  const open = toggle.slice(0, toggle.indexOf("if (!open)"));
  assert.ok(open.indexOf("anchorPopover(") < open.indexOf("workspaceCard.initialFocus("), "sized first");
  assert.match(open, /popover\.scrollTop = 0/);
  assert.match(open, /\.focus\(\{ preventScroll: true \}\)/);
  const opener = app.slice(app.indexOf("function openWorkspaceCard("), app.indexOf("RD-006 · the strip above the composer"));
  assert.doesNotMatch(opener, /\.focus\(/, "showing the panel no longer moves the keyboard by itself");
  assert.doesNotMatch(opener, /data-repository-field="disconnect"/);
});
