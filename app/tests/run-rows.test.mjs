import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { renderToolRow, toolGlyph, appendToolDetails, appendCheckDetails, safeText } from "../web/run-rows.mjs";
import { withTinyDom } from "./tiny-dom.mjs";

const root = new URL("../../", import.meta.url).pathname;

test("a successful ws_read row renders the shared anatomy: title, meta, glyph, closed by default", () => withTinyDom(() => {
  const row = { kind: "tool", name: "ws_read", request: { path: "a.txt" }, result: "file contents", isError: false };
  let toggled = null;
  const details = renderToolRow(row, { toolState: "Exit 0", open: false, onToggle: (open) => { toggled = open; } });
  assert.equal(details.tagName, "details");
  assert.ok(details.classList.contains("tool-card"));
  assert.equal(details.open, false, "closed by default");
  const summary = details.querySelector("summary");
  assert.ok(summary, "summary is present");
  assert.equal(summary.querySelector(".flow-title").textContent, "ws_read", "title is the object name");
  assert.equal(summary.querySelector(".flow-meta").textContent, "Exit 0", "meta is the given state word");
  assert.ok(summary.querySelector("svg"), "the glyph is rendered");
  assert.ok(!summary.classList.contains("is-failed"), "a successful row carries no failure class");
  assert.equal(toggled, null, "onToggle is not called until the row is toggled");
  details.dispatchEvent({ type: "toggle" });
  assert.equal(toggled, false);
}));

test("an error row is open by default and carries the is-failed class", () => withTinyDom(() => {
  const row = { kind: "tool", name: "ws_write", request: { path: "a.txt" }, result: "permission denied", isError: true };
  const details = renderToolRow(row, { toolState: "Failed", open: true, onToggle: () => {} });
  assert.equal(details.open, true);
  const summary = details.querySelector("summary");
  assert.ok(summary.classList.contains("is-failed"));
  const errorPre = details.querySelector(".tool-detail-block").querySelector("pre.tool-error");
  assert.ok(errorPre, "the result is rendered with the error class");
  assert.equal(errorPre.textContent, "permission denied");
}));

test("a settled check_run row shows the facts list (Recipe/Outcome) and stdout, not the request/result JSON dump", () => withTinyDom(() => {
  const row = {
    kind: "tool", name: "check_run", isError: false,
    request: { recipeId: "node-test" }, result: "should not appear",
    check: {
      status: "completed", exitCode: 1, recipeId: "node-test", recipeVersion: 1,
      durationMs: 1234, stdout: "not ok 1", stderr: "", truncated: { stdout: false, stderr: false },
    },
  };
  const details = renderToolRow(row, { toolState: "Exit 1", open: false, onToggle: () => {} });
  const block = details.querySelector(".tool-detail-block");
  const terms = block.querySelectorAll("dt").map(node => node.textContent);
  const values = block.querySelectorAll("dd").map(node => node.textContent);
  assert.deepEqual(terms, ["Recipe", "Outcome", "Duration"]);
  assert.equal(values[0], "node-test v1");
  assert.equal(values[1], "Exit 1");
  const stdoutPre = [...block.querySelectorAll("pre")].find(node => node.textContent === "not ok 1");
  assert.ok(stdoutPre, "stdout is rendered as its own pre block");
  assert.ok(!block.textContent.includes("should not appear"), "the settled check does not fall back to the request/result JSON dump");
}));

test("toggling the details element calls onToggle with the new open state", () => withTinyDom(() => {
  const row = { kind: "tool", name: "ws_list", request: null, result: null, isError: false };
  const seen = [];
  const details = renderToolRow(row, { toolState: null, open: false, onToggle: (open) => seen.push(open) });
  details.open = true;
  details.dispatchEvent({ type: "toggle" });
  details.open = false;
  details.dispatchEvent({ type: "toggle" });
  assert.deepEqual(seen, [true, false]);
}));

test("toolGlyph, appendToolDetails and appendCheckDetails cover the moved cases", () => withTinyDom(() => {
  assert.equal(toolGlyph("ws_write"), "square-pen");
  assert.equal(toolGlyph("repo_write"), "square-pen");
  assert.equal(toolGlyph("ws_list"), "folder");
  assert.equal(toolGlyph("repo_list"), "folder");
  assert.equal(toolGlyph("candidate_list"), "folder");
  assert.equal(toolGlyph("ws_grep"), "search");
  assert.equal(toolGlyph("repo_grep"), "search");
  assert.equal(toolGlyph("candidate_grep"), "search");
  assert.equal(toolGlyph("ws_read"), "file-text");
  assert.equal(toolGlyph("se_read_source"), "file-text");
  assert.equal(toolGlyph("repo_read"), "file-text");
  assert.equal(toolGlyph("candidate_read"), "file-text");
  assert.equal(toolGlyph("check_run"), "play");
  assert.equal(toolGlyph("runtime_x"), "settings-2");
  assert.equal(toolGlyph("unknown_tool"), null);
  assert.equal(safeText(undefined, "fallback"), "fallback");
  assert.equal(safeText("plain"), "plain");
  assert.equal(safeText({ a: 1 }), JSON.stringify({ a: 1 }, null, 2));
  const container = document.createElement("div");
  appendToolDetails(container, { request: undefined, result: undefined, isError: false });
  assert.equal(container.textContent, "No request or result details were included in this event.");
  const checkContainer = document.createElement("div");
  appendCheckDetails(checkContainer, { status: "timed_out", recipeId: null });
  assert.ok(checkContainer.textContent.includes("Timed out"));
}));

test("parity: Chat and Attention share renderToolRow, and the old duplicate tool-row anatomy is gone", () => {
  const attention = readFileSync(`${root}app/web/attention-agent-view.mjs`, "utf8");
  assert.doesNotMatch(attention, /JSON\.stringify\(\{ request/, "Attention no longer dumps request/result as raw JSON for tool rows");
  assert.match(attention, /import \{ renderToolRow \} from ['"]\.\/run-rows\.mjs['"]/, "Attention imports the shared renderer");
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  assert.match(app, /import \{[^}]*renderToolRow[^}]*\} from ["']\.\/run-rows\.mjs["']/, "app.mjs imports renderToolRow from run-rows.mjs");
  assert.match(app, /import \{[^}]*toolGlyph[^}]*\} from ["']\.\/run-rows\.mjs["']/, "app.mjs imports toolGlyph from run-rows.mjs");
  assert.doesNotMatch(app, /function toolGlyph\(/, "app.mjs no longer defines toolGlyph itself");
  assert.doesNotMatch(app, /function appendToolDetails\(/, "app.mjs no longer defines appendToolDetails itself");
  assert.doesNotMatch(app, /function appendCheckDetails\(/, "app.mjs no longer defines appendCheckDetails itself");
});
