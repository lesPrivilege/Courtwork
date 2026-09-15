import { el, flowRow } from "./ui-controls.mjs";
import { checkStateWord } from "./thread-projection.mjs";

/* WO-RUN-ROWS 2026-09-16 · Chat and Attention share this one run-row anatomy
 * («Chat/Attention 共用该解剖；不复制第二套运行卡», run-surface-pr-20260914).
 * Moved verbatim from app/web/app.mjs: toolGlyph, appendCheckDetails,
 * appendToolDetails, safeText. */

export function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/* WK-57 / IC-1 · the type glyph says what kind of act the row records, so the
 * user does not have to read the tool identifier to tell a read from a write.
 * The identifier itself stays visible beside it — the glyph never replaces the
 * object name, and "open the current file" and "write to it" are not allowed to
 * share one file glyph (IC-1, «成果摘要入口» row). Unrecognised tools use
 * their recorded name without an inferred category glyph. */
export function toolGlyph(name) {
  const tool = String(name || "");
  if (tool === "ws_write" || tool === "repo_write") return "square-pen";
  if (tool === "ws_list" || tool === "repo_list" || tool === "candidate_list") return "folder";
  if (tool === "ws_grep" || tool === "repo_grep" || tool === "candidate_grep") return "search";
  if (tool === "ws_read" || tool === "se_read_source" || tool === "repo_read" || tool === "candidate_read") return "file-text";
  if (tool === "check_run") return "play";
  if (tool.startsWith("runtime_")) return "settings-2";
  return null;
}

/* DF-04 · a check's settlement is Host fact: the exit status, how long it
 * ran, whether output was cut, and the streams themselves. It is shown as
 * those facts, not as the model's retelling of them; exit 0 is not
 * acceptance of anything. */
export function appendCheckDetails(container, check) {
  const facts = [
    ["Recipe", check.recipeId ? `${check.recipeId}${check.recipeVersion ? ` v${check.recipeVersion}` : ""}` : "unknown"],
    ["Outcome", checkStateWord(check)],
    ...(check.signal ? [["Signal", check.signal]] : []),
    ...(Number.isFinite(check.durationMs) ? [["Duration", `${(check.durationMs / 1000).toFixed(1)} s`]] : []),
    ...(check.truncated?.stdout || check.truncated?.stderr ? [["Output", "cut at the Host limit"]] : []),
    ...(check.failure?.code ? [["Reason", check.failure.code]] : []),
  ];
  const list = el("dl", { className: "data-list" });
  for (const [term, value] of facts) list.append(el("dt", { text: term }), el("dd", { text: value }));
  container.append(list);
  for (const [stream, text] of [["stdout", check.stdout], ["stderr", check.stderr]]) {
    if (typeof text !== "string" || !text) continue;
    container.append(el("h4", { className: "tool-detail-heading", text: stream }), el("pre", { className: "tool-detail", text }));
  }
}
export function appendToolDetails(container, row) {
  const requestValue = row.request;
  const resultValue = row.result;
  if (row.check && row.check.status !== "running") {
    appendCheckDetails(container, row.check);
    return;
  }
  if (requestValue !== undefined && requestValue !== null) {
    container.append(
      el("h4", { className: "tool-detail-heading", text: "Request" }),
    );
    container.append(
      el("pre", {
        className: "tool-detail",
        text: safeText(requestValue),
      }),
    );
  }
  if (resultValue !== undefined && resultValue !== null && resultValue !== "") {
    container.append(
      el("h4", { className: "tool-detail-heading", text: "Result" }),
    );
    container.append(
      el("pre", {
        className: `tool-detail ${row.isError ? "tool-error" : ""}`,
        text: safeText(resultValue),
      }),
    );
  }
  if (!container.childElementCount) {
    container.append(
      el("p", {
        className: "tool-detail",
        text: "No request or result details were included in this event.",
      }),
    );
  }
}

/* run-surface-pr-20260914 · the one tool-row anatomy: a `<details class="tool-card">`
 * whose summary is the shared flowRow (glyph / title / meta / is-failed) and whose
 * body is appendToolDetails (which defers to appendCheckDetails for settled
 * check_run rows). Callers own open-state memory, focus keys and execution-disclosure
 * membership; this only builds the row and reports toggles back via onToggle. */
export function renderToolRow(row, { toolState, open, onToggle }) {
  const details = el("details", { className: "tool-card" });
  details.open = Boolean(open);
  details.append(
    flowRow("summary", {
      glyph: toolGlyph(row.name),
      title: row.name,
      meta: toolState,
      className: row.isError ? "is-failed" : "",
    }),
  );
  const detail = el("div", { className: "tool-detail-block" });
  appendToolDetails(detail, row);
  details.append(detail);
  details.addEventListener("toggle", () => onToggle?.(details.open));
  return details;
}
