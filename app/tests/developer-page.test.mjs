/* UX 2026-09-28 · Developer reads by object: the chat's runtime and profile,
 * the Host's extensions, then Host diagnostics on demand. Pinned on the
 * shipped markup and the real runtime view. */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRuntimeView } from "../web/runtime-view.mjs";
import { withTinyDom } from "./tiny-dom.mjs";

const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
const developer = html.slice(html.indexOf('id="settings-developer"'), html.indexOf("</section>", html.indexOf('id="settings-developer"')));

test("Developer page: object order, the trust consequence beside the extensions, Host diagnostics closed by default", () => {
  const order = ['id="settings-runtime-overview"', 'id="settings-runtime-composition"', "Host Extensions", "<summary>Host runtime details</summary>", "<summary>Unavailable capabilities</summary>"]
    .map(marker => developer.indexOf(marker));
  assert.ok(order.every(index => index > 0), "every block is present");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "chat runtime, profile, extensions, then diagnostics");
  assert.doesNotMatch(developer, /<h4 class="settings-block-title">Runtime<\/h4>/, "no heading without an object");
  assert.doesNotMatch(developer, /Runtime info/);
  const extensions = developer.slice(developer.indexOf("Host Extensions"), developer.indexOf('id="extension-list"'));
  assert.match(extensions, /Only host-trusted extensions load, and they are not sandboxed\./);
  assert.match(extensions, /<a href="#settings\/plugins">Plugins<\/a>/);
  assert.match(developer, /<details class="settings-block">\s*<summary>Host runtime details<\/summary>\s*<div id="runtime-info"/);
  assert.doesNotMatch(developer, /<details[^>]* open/, "diagnostics are on demand");
});

test("Chat runtime block: loading, failure with retry, the reading, and the last good reading after a failure", () => withTinyDom(async body => {
  document.body = body;
  const overview = document.createElement("div"); body.append(overview);
  let reply = () => Promise.reject(new Error("The local runtime could not be reached."));
  const view = createRuntimeView({ overview }, { getSessionId: () => "s1", request: () => reply() });
  await view.load();
  assert.equal(overview.querySelector("h4").textContent, "Chat runtime");
  assert.equal(overview.querySelector(".inline-error").textContent, "The local runtime could not be reached.");
  const retry = overview.querySelectorAll("button").find(node => node.getAttribute("aria-label") === "Retry loading the runtime" || node.textContent.includes("Retry loading the runtime"));
  assert.ok(retry, "a failed first read offers Retry");
  reply = async () => ({ revision: 3, adapterId: "fixture-harness@1", activeRuns: 0, scopes: [], resources: [{ id: "tool:a", kind: "tool", exposed: true }] });
  await view.load();
  assert.equal(overview.querySelector("h4").textContent, "Chat runtime");
  assert.match(overview.textContent, /What the next run in this chat would use, and what past runs recorded\./);
  assert.match(overview.textContent, /Adapter.*fixture-harness@1/);
  assert.match(overview.textContent, /Exposed.*1 of 1 resources/);
  reply = () => Promise.reject(new Error("Read failed again."));
  await view.load();
  const stale = overview.querySelector("[data-stale]");
  assert.equal(stale.getAttribute("data-stale"), "3");
  assert.match(stale.textContent, /last snapshot the host confirmed, at revision 3/);
  assert.match(overview.textContent, /Adapter.*fixture-harness@1/, "the last good reading stays");
}));

test("DEV-R1 · with no chat open, the block names the default runtime every new chat starts from, and no chat's runs", () => withTinyDom(async body => {
  document.body = body;
  const overview = document.createElement("div"); body.append(overview);
  const composition = document.createElement("div"); body.append(composition);
  let reply = () => Promise.reject(new Error("The local runtime could not be reached."));
  const view = createRuntimeView({ overview, composition }, {
    getSessionId: () => null,
    // Another chat's runs may still be in the app's state; they are not this page's.
    getRuns: () => [{ id: "run-of-another-chat-0001", status: "completed" }],
    request: (path) => { assert.equal(path, "/runtime-control", "no session is read"); return reply(); },
  });
  await view.load();
  assert.equal(overview.querySelector(".inline-error").textContent, "The local runtime could not be reached.");
  assert.ok(overview.querySelectorAll("button").some(node => (node.getAttribute("aria-label") || node.textContent).includes("Retry loading the runtime")), "retry is unchanged");
  reply = async () => ({ revision: 1, adapterId: "fixture-harness@1", activeRuns: 0,
    scopes: [{ type: "user", id: "local" }], resources: [{ id: "agent:general", kind: "agent_profile", title: "General", exposed: true }],
    composition: { id: "agent:general", status: "compatible", resourceIds: null } });
  await view.load();
  const text = overview.textContent;
  assert.equal(overview.querySelector("h4").textContent, "Default runtime");
  assert.match(text, /What new chats start from\. Open a chat to see its own runtime and recorded runs\./);
  assert.doesNotMatch(text, /in this chat/, "no chat is implied");
  assert.match(text, /Profile.*agent:general · compatible/);
  assert.match(text, /Runs are recorded per chat\. Open a chat to see what its runs used\./);
  assert.equal(overview.querySelectorAll(".runtime-chip").length, 0, "another chat's runs are not listed");
  assert.equal(overview.querySelectorAll(".runtime-scope-tab").map(node => node.textContent).join(","), "User", "the user layer is the only scope");
  assert.match(composition.textContent, /open a chat to choose one of its recorded runs/);
  assert.doesNotMatch(composition.textContent, /Chat runtime › Recorded bindings/);
}));

test("DEV-R1 · with a chat open, the same block is that chat's runtime and lists its recorded runs", () => withTinyDom(async body => {
  document.body = body;
  const overview = document.createElement("div"); body.append(overview);
  const view = createRuntimeView({ overview }, {
    getSessionId: () => "s1",
    getRuns: () => [{ id: "run-of-this-chat-0001", status: "completed" }],
    request: async () => ({ revision: 1, adapterId: "fixture-harness@1", activeRuns: 0, scopes: [], resources: [] }),
  });
  await view.load();
  assert.equal(overview.querySelector("h4").textContent, "Chat runtime");
  assert.match(overview.textContent, /What the next run in this chat would use, and what past runs recorded\./);
  assert.equal(overview.querySelectorAll(".runtime-chip").length, 1);
}));

test("Attention: each Open is named for what it opens; a context fact has no Open", () => withTinyDom(async body => {
  document.body = body;
  const overview = document.createElement("div"); body.append(overview);
  const resource = (id, title, over) => ({ id, kind: "tool", title, exposed: false, health: "healthy", permission: { effect: "allow", trace: [] }, ...over });
  const view = createRuntimeView({ overview }, {
    getSessionId: () => null,
    request: async () => ({ revision: 1, adapterId: "fixture-harness@1", activeRuns: 0, scopes: [{ type: "user", id: "local" }],
      resources: [
        resource("tool:repo_list", "repo_list", { health: "unavailable" }),
        resource("tool:repo_read", "repo_read", { health: "unavailable" }),
        resource("local:docs", "Docs server", { kind: "mcp_server", exposed: true, health: "degraded" }),
      ],
      composition: { id: "agent:general", status: "compatible", resourceIds: null } }),
  });
  await view.load();
  const attention = overview.querySelector(".runtime-attention");
  assert.equal(attention.querySelector("h5").textContent, "Attention · 2");
  const rows = attention.querySelectorAll(".runtime-attention-row");
  assert.match(rows[0].textContent, /Docs server reports health degraded\./);
  const open = rows[0].querySelector("button");
  assert.equal(open.textContent, "Open");
  assert.equal(open.getAttribute("aria-label"), "Open Docs server");
  assert.match(rows[1].textContent, /^2 capabilities are unavailable here and not offered to the model: repo_list, repo_read\.$/);
  assert.equal(rows[1].querySelector("button"), null);
  assert.ok(attention.querySelectorAll("button").every(node => node.getAttribute("aria-label") !== "Open" && node.getAttribute("aria-label")?.startsWith("Open ")));
}));
