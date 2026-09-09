import { el, action } from "./ui-controls.mjs";

// A view of an immutable input record. Edits prepare a new composer draft.
export function renderUserMessage(row, { onCopy, onEdit }) {
  const message = el("article", {
    className: "message user",
    attrs: { "aria-label": "Your message" },
  });
  message.append(
    el(
      "div",
      { className: "user-message-content" },
      el("span", { className: "sr-only", text: "You" }),
      el("div", { className: "message-body", text: row.text }),
    ),
  );
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
      attrs: { "data-focus-key": `user-edit:${row.id}` },
    }),
  );
  message.append(footer);
  return message;
}
