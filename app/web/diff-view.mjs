/* Shared display renderer for line diffs (single-red change language).
 *
 * This is presentation only. A row is {kind: "context" | "add" | "del", text,
 * oldNo?, newNo?, noNewline?}; nothing here reads a file, requests a diff or
 * says whether a change was accepted. Removed and added rows keep their "−" /
 * "+" marker and line numbers as text, so colour is never the only carrier
 * (FN-28). Exactly one removed row followed by exactly one added row gets
 * word-level segments; longer replacements are shown whole, as the reference
 * renderer does (Motto diff.ts@a510036, display semantics only — no ANSI or
 * terminal inverse is ported). Changed words are wrapped in <del> / <ins>, the
 * added ones carrying the one solid red block of this grammar. */
import { el } from "./ui-controls.mjs";

const TOKEN = /\s+|[^\s]+/g;

/** Word-level comparison of one removed line against one added line. */
export function diffWords(oldText, newText) {
  const a = String(oldText).match(TOKEN) ?? [];
  const b = String(newText).match(TOKEN) ?? [];
  // Retained uploads may contain a very long replacement line. Keep the
  // existing fine-grained presentation for small pairs, otherwise show whole
  // changed lines; no quadratic allocation for unbounded user text.
  if (a.length * b.length > 65536 || a.length > 2048 || b.length > 2048)
    return {old:[{text:String(oldText),changed:true}],new:[{text:String(newText),changed:true}]};
  // Longest common subsequence over the bounded token pair.
  const table = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const oldSegments = [], newSegments = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { push(oldSegments, a[i], false); push(newSegments, b[j], false); i++; j++; }
    else if (j < b.length && (i >= a.length || table[i][j + 1] >= table[i + 1][j])) { push(newSegments, b[j], true); j++; }
    else { push(oldSegments, a[i], true); i++; }
  }
  return { old: absorbWhitespace(oldSegments), new: absorbWhitespace(newSegments) };
}

function push(list, text, changed) {
  const last = list[list.length - 1];
  if (last && last.changed === changed) last.text += text;
  else list.push({ text, changed });
}

/* Whitespace between two changed words joins them into one block, and leading
 * indentation is never marked (the reference renderer strips it too), so a
 * block always starts and ends on visible text. */
function absorbWhitespace(segments) {
  const merged = [];
  for (const segment of segments) {
    const prev = merged[merged.length - 1];
    if (prev && prev.changed === segment.changed) prev.text += segment.text;
    else merged.push({ ...segment });
  }
  const out = [];
  for (let index = 0; index < merged.length; index++) {
    const segment = merged[index];
    const prev = out[out.length - 1];
    const bridges = !segment.changed && !segment.text.trim() && prev?.changed && merged[index + 1]?.changed;
    if (bridges) { prev.text += segment.text; continue; }
    if (segment.changed && !segment.text.trim() && !prev) { out.push({ text: segment.text, changed: false }); continue; }
    if (prev && prev.changed === segment.changed) prev.text += segment.text;
    else out.push({ ...segment });
  }
  return out.filter((segment) => segment.text.length);
}

/** Rows with word segments applied to every single-removed / single-added pair. */
export function diffModel(lines) {
  const rows = (Array.isArray(lines) ? lines : []).map((line) => ({
    kind: line.kind === "add" || line.kind === "del" ? line.kind : "context",
    text: String(line.text ?? ""),
    oldNo: line.oldNo ?? null,
    newNo: line.newNo ?? null,
    noNewline: Boolean(line.noNewline),
    segments: null,
  }));
  for (let index = 0; index < rows.length; index++) {
    if (rows[index].kind !== "del") continue;
    let end = index;
    while (end < rows.length && rows[end].kind === "del") end++;
    let addEnd = end;
    while (addEnd < rows.length && rows[addEnd].kind === "add") addEnd++;
    if (end - index === 1 && addEnd - end === 1) {
      const words = diffWords(rows[index].text, rows[end].text);
      rows[index].segments = words.old;
      rows[end].segments = words.new;
    }
    index = addEnd - 1;
  }
  return rows;
}

export function diffSummary(lines) {
  const rows = diffModel(lines);
  return {
    added: rows.filter((row) => row.kind === "add").length,
    removed: rows.filter((row) => row.kind === "del").length,
    total: rows.length,
  };
}

const MARK = { context: " ", add: "+", del: "−" };
const DATA = { context: "same", add: "add", del: "del" };

/** The DOM for a diff: a <pre> of rows, each row a marker, line numbers and text. */
export function renderDiff(lines, { label = "Changes", summary = true } = {}) {
  const rows = diffModel(lines);
  const counts = diffSummary(rows);
  const view = el("div", { className: "diff-view", attrs: { role: "group", "aria-label": label } });
  if (summary) {
    const text = counts.total === 0
      ? "No lines."
      : counts.added + counts.removed === 0
        ? "No changes."
        : `${counts.added} added, ${counts.removed} removed`;
    view.append(el("p", { className: "diff-summary", text, attrs: { "data-diff-added": counts.added, "data-diff-removed": counts.removed } }));
  }
  if (!rows.length) return view;
  const code = el("code");
  rows.forEach((row, index) => {
    const line = el("span", { className: "diff-line", attrs: { "data-diff": DATA[row.kind] } });
    line.append(
      el("span", { className: "diff-no", text: `${row.kind === "add" ? "" : row.oldNo ?? ""}`.padStart(4), attrs: { "aria-hidden": "true" } }),
      el("span", { className: "diff-no", text: `${row.kind === "del" ? "" : row.newNo ?? ""}`.padStart(4), attrs: { "aria-hidden": "true" } }),
      el("span", { className: "diff-mark", text: MARK[row.kind] }),
      " ",
      renderText(row),
    );
    if (index < rows.length - 1 || row.noNewline) line.append("\n");
    code.append(line);
    if (row.noNewline) {
      const meta = el("span", { className: "diff-line diff-meta", attrs: { "data-diff": "meta" } });
      meta.append(el("span", { className: "diff-no", text: "".padStart(4), attrs: { "aria-hidden": "true" } }), el("span", { className: "diff-no", text: "".padStart(4), attrs: { "aria-hidden": "true" } }), el("span", { className: "diff-mark", text: "\\" }), " No newline at end of file", index < rows.length - 1 ? "\n" : "");
      code.append(meta);
    }
  });
  view.append(el("pre", { className: "diff-code" }, code));
  return view;
}

function renderText(row) {
  const text = el("span", { className: "diff-text" });
  if (!row.segments) { text.textContent = row.text; return text; }
  for (const segment of row.segments) {
    if (!segment.changed) { text.append(segment.text); continue; }
    text.append(el(row.kind === "add" ? "ins" : "del", { className: row.kind === "add" ? "diff-add-word" : "diff-del-word", text: segment.text }));
  }
  return text;
}
