import { el, action, markdown } from "./ui-controls.mjs";

/**
 * A readable one-paragraph opening for a long authored message. The bounded
 * preview used to be a raw slice of the source, so a message that began with a
 * heading, a table or a fenced block opened with pipes and hash marks instead
 * of words. This drops the block syntax that carries no meaning on one line and
 * keeps the words. It is a preview only: the exact original stays behind
 * "Read full message", "Source" and Copy, none of which read this function.
 */
export function messageSummary(text, limit = 280) {
  const lines = [], fencedLines = [];
  let fenced = false;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.trim();
    if (/^(```|~~~)/.test(line)) { fenced = !fenced; continue; }
    if (fenced) { fencedLines.push(line); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) continue;
    if (/^\|/.test(line)) {
      // A table row reads as its cells, and its delimiter row reads as nothing.
      const cells = line.replace(/^\||\|$/g, "").split("|").map(cell => cell.trim());
      if (!cells.every(cell => /^:?-{1,}:?$/.test(cell))) lines.push(cells.filter(Boolean).join(" · "));
      continue;
    }
    lines.push(line
      .replace(/^#{1,6}\s+/, "")
      .replace(/^>\s?/, "")
      .replace(/^([-*+]|\d+[.)])\s+/, ""));
  }
  const summary = lines.join(" ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<(https?:\/\/[^>\s]+)>/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    // Paired emphasis only: `snake_case` in a preview must survive intact.
    .replace(/(\*\*|__|~~)(?=\S)([\s\S]*?\S)\1/g, "$2")
    .replace(/\*(?=\S)([^*\n]*?\S)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  // A message that is only a fenced block still gets its words, not its fence.
  const fallback = fencedLines.join(" ").replace(/\s+/g, " ").trim();
  const source = summary || fallback;
  return source.length > limit ? source.slice(0, limit).trimEnd() + "…" : source;
}

// A view of an immutable input record. Edits prepare a new composer draft.
export function renderUserMessage(row, { onCopy, onEdit, viewState = null, key = row.id, editDisabled = false }) {
  const message = el("article", {
    className: "message user",
    attrs: { "aria-label": "Your message" },
  });
  const content = el("div", { className: "user-message-content" });
  const body = markdown(row.text, { key: `user:${key}` });
  if (row.text.length > 1200 || row.text.split("\n").length > 16) {
    const detail = el("details", {}, el("summary", { text: "Read full message", attrs: { "data-focus-key": `user-expand:${key}` } }), body);
    const preview = el("p", { className: "user-message-excerpt", text: messageSummary(row.text) });
    detail.open = Boolean(viewState?.get(`${key}:expanded`));
    preview.hidden = detail.open;
    detail.addEventListener("toggle", () => { preview.hidden = detail.open; viewState?.set(`${key}:expanded`, detail.open); });
    content.append(preview, detail);
  } else content.append(body);
  const source = el("details", { className: "user-message-source" }, el("summary", { text: "Source", attrs: { "data-focus-key": `user-source:${key}` } }), el("pre", { text: row.text }));
  source.open = Boolean(viewState?.get(`${key}:source`));
  source.addEventListener("toggle", () => viewState?.set(`${key}:source`, source.open));
  content.append(source);
  message.append(content);
  const footer = el("footer", { className: "user-message-actions" });
  const time = new Date(row.startedAt || "");
  if (Number.isFinite(time.valueOf())) {
    footer.append(
      el("time", {
        text: time.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
        attrs: {
          datetime: time.toISOString(),
          title: `Run started ${time.toLocaleString()}`,
          "aria-label": `Run started ${time.toLocaleString()}`,
        },
      }),
    );
  }
  footer.append(
    action("copy", "Copy message", () => onCopy(row.text), {
      attrs: { "data-focus-key": `user-copy:${row.id}` },
    }),
    action("square-pen", "Edit as new message", () => onEdit(row), {
      attrs: { "data-focus-key": `user-edit:${row.id}`, disabled: editDisabled ? "" : null },
    }),
  );
  message.append(footer);
  return message;
}
