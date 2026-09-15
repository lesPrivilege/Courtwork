import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRepositoryCard, repositoryName, activeRepositoryBinding, REPOSITORY_ACTIVE_RUN } from "../web/repository-card.mjs";
import { withTinyDom, flush } from "./tiny-dom.mjs";

const root = new URL("../../", import.meta.url).pathname;
const field = (body, key) => [...body.querySelectorAll("button,input")].find(e => e.getAttribute("data-repository-field") === key);
const unbound = { id: "s1", repositoryBinding: null, repositoryBindingRevision: 0 };
const bound = { id: "s1", repositoryBindingRevision: 1, repositoryBinding: { id: "b1", rootPath: "/synthetic/parcel", device: "1", inode: "2", revision: 1, status: "active" } };

test("repositoryName shows the directory word; activeRepositoryBinding ignores revoked bindings", () => {
  assert.equal(repositoryName("/synthetic/parcel/"), "parcel");
  assert.equal(repositoryName("/"), "/");
  assert.equal(activeRepositoryBinding(bound)?.id, "b1");
  assert.equal(activeRepositoryBinding({ repositoryBinding: { ...bound.repositoryBinding, status: "revoked" } }), null);
  assert.equal(activeRepositoryBinding(null), null);
});

test("Connect submits one bind command with the current revision and reads the Session back", () => withTinyDom(async body => {
  const requests = [], seen = [];
  const card = createRepositoryCard({ request: async (path, options) => { requests.push({ path, body: options.body }); return { receipt: {}, binding: bound.repositoryBinding, idempotent: false }; }, onSession: async id => { seen.push(id); card.render(body, { session: bound, active: false }); }, onClose: () => {} });
  card.render(body, { session: unbound, active: false });
  assert.ok(field(body, "path"), "an unbound chat offers a path field");
  assert.equal(field(body, "disconnect"), undefined);
  field(body, "path").value = "  /synthetic/parcel  "; field(body, "path").dispatchEvent({ type: "input" });
  field(body, "connect").click();
  await flush(); await flush();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, "/sessions/s1/repository-binding");
  assert.deepEqual(Object.keys(requests[0].body).sort(), ["expectedRevision", "operation", "requestId", "rootPath"]);
  assert.equal(requests[0].body.operation, "bind");
  assert.equal(requests[0].body.expectedRevision, 0);
  assert.equal(requests[0].body.rootPath, "/synthetic/parcel", "the path is trimmed, not otherwise rewritten");
  assert.match(requests[0].body.requestId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(seen, ["s1"], "the card asks for the Session after the receipt instead of assuming success");
  assert.equal(field(body, "path"), undefined);
  assert.ok(body.textContent.includes("/synthetic/parcel") && body.textContent.includes("Read only"));
}));

test("A rejected bind keeps the typed path, shows the Host message and reuses the requestId on retry", () => withTinyDom(async body => {
  const requests = [];
  let fail = true;
  const card = createRepositoryCard({ request: async (path, options) => { requests.push(options.body); if (fail) { const error = new Error("repository root must be an existing readable directory"); error.status = 400; throw error; } return {}; }, onSession: async () => {}, onClose: () => {} });
  card.render(body, { session: unbound, active: false });
  field(body, "connect").click();
  await flush();
  assert.equal(requests.length, 0, "an empty path never reaches the Host");
  assert.ok(body.querySelector(".inline-error"));
  field(body, "path").value = "/missing"; field(body, "path").dispatchEvent({ type: "input" });
  field(body, "connect").click(); await flush(); await flush();
  assert.equal(body.querySelector(".inline-error")?.textContent, "repository root must be an existing readable directory");
  assert.equal(field(body, "path").value, "/missing");
  fail = false;
  field(body, "connect").click(); await flush(); await flush();
  assert.equal(requests.length, 2);
  assert.equal(requests[0].requestId, requests[1].requestId, "same path retried replays the same command");
}));

test("A bound chat shows the directory and scope; Disconnect sends revoke with the current revision", () => withTinyDom(async body => {
  const requests = [];
  const card = createRepositoryCard({ request: async (path, options) => { requests.push(options.body); return {}; }, onSession: async () => {}, onClose: () => {} });
  card.render(body, { session: bound, active: false });
  assert.equal(field(body, "path"), undefined);
  assert.ok(body.textContent.includes("/synthetic/parcel"));
  assert.ok(body.textContent.includes("Read only"));
  field(body, "disconnect").click(); await flush();
  assert.equal(requests.length, 1);
  assert.deepEqual(Object.keys(requests[0]).sort(), ["expectedRevision", "operation", "requestId"]);
  assert.equal(requests[0].operation, "revoke");
  assert.equal(requests[0].expectedRevision, 1);
}));

test("While a run is active the card explains the wait and disables both commands", () => withTinyDom(async body => {
  const card = createRepositoryCard({ request: async () => { throw new Error("must not be called"); }, onSession: async () => {}, onClose: () => {} });
  card.render(body, { session: unbound, active: true });
  assert.equal(field(body, "connect").disabled, true);
  assert.ok(body.textContent.includes(REPOSITORY_ACTIVE_RUN));
  card.render(body, { session: bound, active: true });
  assert.equal(field(body, "disconnect").disabled, true);
  assert.ok(body.textContent.includes(REPOSITORY_ACTIVE_RUN));
}));

test("Composer placement and shell wiring for the repository control", () => {
  const html = readFileSync(`${root}app/web/index.html`, "utf8");
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  const css = readFileSync(`${root}app/web/styles.css`, "utf8");
  const contextStart = html.indexOf('<div class="composer-context">');
  const buttonsStart = html.indexOf('<div class="composer-buttons">', contextStart);
  const context = html.slice(contextStart, buttonsStart);
  assert.ok(context.indexOf('id="permission-settings-button"') < context.indexOf('id="repository-button"'), "repository follows file access in the left context");
  assert.match(context, /id="repository-button"[^>]*aria-haspopup="dialog"[^>]*aria-controls="repository-popover"/);
  assert.match(html, /id="repository-popover"[^>]*popover="auto"[^>]*aria-label="Repository"/);
  assert.match(app, /\$\("repository-button"\)\.hidden = home \|\| !session/);
  assert.match(app, /\$\("repository-button"\)\.addEventListener\("click", \(event\) => openRepositoryCard\(event\.currentTarget\)\)/);
  assert.match(app, /const detail = await request\(`\/sessions\/\$\{encodeURIComponent\(id\)\}`\);\s*applySessionUpdate\(detail\.session, id\)/);
  assert.match(app, /tool === "repo_read" \|\| tool === "candidate_read"\) return "file-text"/);
  assert.match(css, /\.composer-repository\[aria-expanded="true"\]/);
});
