import { el, action, markdown } from "./ui-controls.mjs";

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
    const preview = el("p", { className: "user-message-excerpt", text: row.text.slice(0, 280) + "…" });
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
