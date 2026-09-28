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
