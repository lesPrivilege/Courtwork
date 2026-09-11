/* diff-view.mjs is display only. These tests pin what the single-red change
 * grammar promises: markers and line numbers are text, word blocks appear only
 * for one removed + one added line, longer replacements stay whole, HTML is
 * text, the no-newline marker is a row, and the Settings preview consumes the
 * shared renderer rather than a private sample. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { withTinyDom } from "./tiny-dom.mjs";
import { diffWords, diffModel, diffSummary, renderDiff } from "../web/diff-view.mjs";
import { DIFF_PREVIEW } from "../web/diff-fixture.mjs";

const here = new URL(".", import.meta.url).pathname;
const read = (p) => readFileSync(`${here}${p}`, "utf8");
const byClass = (node, name) => node.querySelectorAll(`.${name}`);

test("diffWords marks only the changed tokens and never leading indentation", () => {
  const words = diffWords("  Either party may end this agreement at will.", "  Either party may end this agreement on 30 days' notice.");
  assert.equal(words.old.filter((s) => s.changed).map((s) => s.text).join("|"), "at will.");
  assert.equal(words.new.filter((s) => s.changed).map((s) => s.text).join("|"), "on 30 days' notice.");
  assert.equal(words.new[0].changed, false);
  assert.match(words.new[0].text, /^ {2}Either/);
});

test("diffModel: word segments only for exactly one removed + one added line", () => {
  const single = diffModel([{ kind: "del", text: "a b c" }, { kind: "add", text: "a x c" }]);
  assert.ok(single[0].segments && single[1].segments);
  const multi = diffModel([{ kind: "del", text: "a" }, { kind: "del", text: "b" }, { kind: "add", text: "c" }]);
  assert.equal(multi.every((row) => row.segments === null), true);
  const addOnly = diffModel([{ kind: "add", text: "new" }]);
  assert.equal(addOnly[0].segments, null);
  assert.deepEqual(diffSummary([{ kind: "context", text: "same" }]), { added: 0, removed: 0, total: 1 });
});

test("renderDiff keeps ± and line numbers as text and puts blocks only on new words", () => withTinyDom(() => {
  const view = renderDiff(DIFF_PREVIEW.lines, { label: DIFF_PREVIEW.label });
  assert.equal(view.getAttribute("aria-label"), DIFF_PREVIEW.label);
  const lines = byClass(view, "diff-line");
  assert.equal(lines.length, DIFF_PREVIEW.lines.length);
  assert.deepEqual([...lines].map((line) => line.getAttribute("data-diff")), ["same", "same", "del", "add", "same", "add"]);
  const marks = [...byClass(view, "diff-mark")].map((mark) => mark.textContent);
  assert.deepEqual(marks, [" ", " ", "−", "+", " ", "+"]);
  const addWords = [...byClass(view, "diff-add-word")].map((node) => node.tagName.toLowerCase() + ":" + node.textContent);
  assert.deepEqual(addWords, ["ins:on 30 days' written notice."]);
  const delWords = [...byClass(view, "diff-del-word")].map((node) => node.tagName.toLowerCase() + ":" + node.textContent);
  assert.deepEqual(delWords, ["del:at will."]);
  assert.match(byClass(view, "diff-summary")[0].textContent, /2 added, 1 removed/);
  // the pure addition at the end carries no word block: the whole line is new
  assert.equal(byClass(lines[5], "diff-add-word").length, 0);
}));

test("renderDiff treats markup as text, renders the no-newline marker, and handles empty input", () => withTinyDom(() => {
  const view = renderDiff([
    { kind: "del", oldNo: 1, text: "<b>bold</b> & \"q\"" },
    { kind: "add", newNo: 1, text: "<b>bold</b> & 'q'", noNewline: true },
  ]);
  const texts = byClass(view, "diff-text");
  assert.equal(texts[0].textContent, "<b>bold</b> & \"q\"");
  assert.equal(view.querySelectorAll("b").length, 0);
  const meta = view.querySelectorAll('[data-diff="meta"]');
  assert.equal(meta.length, 1);
  assert.match(meta[0].textContent, /No newline at end of file/);
  const empty = renderDiff([]);
  assert.match(byClass(empty, "diff-summary")[0].textContent, /No lines/);
  assert.equal(byClass(empty, "diff-code").length, 0);
  const unchanged = renderDiff([{ kind: "context", oldNo: 3, newNo: 3, text: "x" }]);
  assert.match(byClass(unchanged, "diff-summary")[0].textContent, /No changes/);
}));

test("Settings preview and the static allowlist use the shared renderer and fixture", () => {
  const settings = read("../web/settings-view.mjs");
  assert.match(settings, /from "\.\/diff-view\.mjs"/);
  assert.match(settings, /renderDiff\(DIFF_PREVIEW\.lines/);
  assert.doesNotMatch(settings, /"Either party may end this agreement"/, "no private sample copy in settings-view");
  const server = read("../server/index.mjs");
  assert.match(server, /"diff-view\.mjs", "diff-fixture\.mjs"/);
  const css = read("../web/styles.css");
  assert.match(css, /--diff-add: var\(--diff-change-foreground\)/);
  assert.doesNotMatch(css, /\.diff-line\[data-diff="add"\]\s*\{[^}]*--success/, "diff never borrows success");
  assert.doesNotMatch(css, /\.diff-line\[data-diff="del"\]\s*\{[^}]*--danger/, "diff never borrows danger");
});
