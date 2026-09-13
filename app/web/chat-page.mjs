/* The Chat page: the plain-conversation seat beside Attention and Spark, as a
 * page of its own (chat-product-page DECISION, 2026-09-11).
 *
 * It is a front-end reservation over what exists today: the chats in the open
 * projects, the real New chat route, and the two sibling entries. Nothing here
 * connects to a provider, stores a conversation outside its project session, or
 * promises memory, capture or hand-off — those sentences say "planned" and carry
 * no control. Reading this page starts no Run. */
import { el } from "./ui-controls.mjs";
import { semanticIcon } from "./semantic-controls.mjs";
import { sessionMode } from "./ui-controls.mjs";
import { relativeUpdated } from "./attention-view.mjs";

const FACETS = [
  { key: "chat.surface", name: "Chat", line: "Conversations and their recorded work.", current: true },
  { key: "attention.agent", name: "Attention", line: "Questions and decisions that need your attention." },
  { key: "spark.surface", name: "Spark", line: "Matters that may need updating after their sources change." },
];

export function createChatPage(container, { onOpenSession, onNewChat, onOpenAttention, onOpenSpark, onExample = null }) {
  let generation = 0;

  function chatRow({ session, project, active }) {
    const button = el("button", {
      className: `chat-row${active ? " is-current" : ""}`,
      attrs: { type: "button", "aria-current": active ? "page" : null, "data-chat-session": session.id },
    });
    const title = el("span", { className: "chat-row-title", text: session.title || "Untitled chat" });
    const meta = el("span", { className: "chat-row-meta" });
    meta.append(el("span", { text: project?.name || "Project" }));
    if (sessionMode(session) === "work") meta.append(el("span", { className: "session-mode-tag", text: "Work" }));
    const when = relativeUpdated(session.updatedAt || session.createdAt);
    if (when) meta.append(el("span", { text: when }));
    button.append(semanticIcon("chat.object", { size: 16 }), el("span", { className: "chat-row-text" }, title, meta));
    button.addEventListener("click", () => onOpenSession(session.id, project.id));
    return button;
  }

  function facet(entry) {
    const card = el("article", { className: `chat-facet${entry.current ? " is-current" : ""}`, attrs: { "aria-current": entry.current ? "page" : null } });
    const head = el("h2", { className: "chat-facet-name" }, semanticIcon(entry.key, { size: 20 }), el("span", { text: entry.name }));
    card.append(head, el("p", { text: entry.line }));
    if (entry.key === "attention.agent") card.append(el("button", { className: "quiet-button", text: "Open Attention", attrs: { type: "button", "data-chat-facet": "attention" } }));
    if (entry.key === "spark.surface") card.append(el("button", { className: "quiet-button", text: "Open Spark", attrs: { type: "button", "data-chat-facet": "spark" } }));
    card.querySelector('[data-chat-facet="attention"]')?.addEventListener("click", () => onOpenAttention());
    card.querySelector('[data-chat-facet="spark"]')?.addEventListener("click", () => onOpenSpark());
    return card;
  }

  function render({ projects = [], sessionsByProject = new Map(), activeSessionId = null, currentSession = null, example = null } = {}) {
    generation += 1;
    const rows = [];
    for (const project of projects) {
      for (const session of sessionsByProject.get(project.id) || []) rows.push({ session, project, active: session.id === activeSessionId });
    }
    rows.sort((a, b) => String(b.session.updatedAt ?? b.session.createdAt ?? "").localeCompare(String(a.session.updatedAt ?? a.session.createdAt ?? "")) || a.session.id.localeCompare(b.session.id));
    const recent = rows.slice(0, 8);

    const heading = el("header", { className: "chat-page-heading" },
      el("div", {},
        el("h1", { attrs: { tabindex: "-1", "data-chat-focus": "title" } }, semanticIcon("chat.surface", { size: 24 }), el("span", { text: "Chat" })),
      ),
    );
    const actions = el("div", { className: "chat-page-actions" });
    const newChat = el("button", { className: "primary-button", text: "New chat", attrs: { type: "button", "data-chat-action": "new" } });
    newChat.addEventListener("click", () => onNewChat());
    actions.append(newChat);
    if (currentSession) {
      const back = el("button", { className: "quiet-button", text: `Return to ${currentSession.title || "the open chat"}`, attrs: { type: "button", "data-chat-action": "return" } });
      back.addEventListener("click", () => onOpenSession(currentSession.id, currentSession.projectId));
      actions.append(back);
    }
    heading.append(actions);

    const continueSection = el("section", { className: "chat-continue", attrs: { "aria-labelledby": "chat-continue-title" } },
      el("h2", { text: "Continue", attrs: { id: "chat-continue-title" } }),
    );
    if (recent.length) {
      const list = el("div", { className: "chat-rows", attrs: { role: "list" } });
      for (const row of recent) list.append(el("div", { attrs: { role: "listitem" } }, chatRow(row)));
      continueSection.append(list);
      if (rows.length > recent.length) continueSection.append(el("p", { className: "form-help", text: `${rows.length - recent.length} more in the project list.` }));
    } else {
      continueSection.append(el("p", { className: "chat-empty", text: "No chats yet." }));
    }
    /* Stage 4 · the example workspace can be looked at again from here whether
     * or not real chats exist; the entry is a quiet button, never a row. */
    if (example && onExample) {
      const see = el("button", { className: "quiet-button chat-example", text: example.label || "See the example workspace", attrs: { type: "button", "data-chat-action": "example" } });
      see.addEventListener("click", () => onExample());
      continueSection.append(see);
    }

    const facets = el("section", { className: "chat-facets", attrs: { "aria-label": "Chat, Attention and Spark" } }, ...FACETS.map(facet));

    const keeps = el("section", { className: "chat-keeps", attrs: { "aria-labelledby": "chat-keeps-title" } },
      el("h2", { text: "What a chat keeps", attrs: { id: "chat-keeps-title" } }),
      el("dl", {},
        el("dt", { text: "Project" }), el("dd", { text: "Each chat belongs to a project and keeps its own file access." }),
        el("dt", { text: "Record" }), el("dd", { text: "Messages, tool actions and recorded files remain with the chat. A chat bound to a Matter is Work." }),
        el("dt", { text: "Model" }), el("dd", { text: "Connections are configured in Settings · Models. Opening this page does not start a run." }),
      ),
    );

    const about = el("details", { className: "chat-about" }, el("summary", { text: "About chats" }), facets, keeps);
    container.replaceChildren(el("div", { className: "chat-page-inner" }, heading, continueSection, about));
    return container;
  }

  return {
    open(input) { return render(input); },
    deactivate() { generation += 1; },
    get generation() { return generation; },
  };
}
