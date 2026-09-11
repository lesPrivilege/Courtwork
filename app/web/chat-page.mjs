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
  { key: "chat.surface", name: "Chat", line: "A conversation that stays with the work. Talk something through, keep what matters, and hand it on when it is ready.", current: true },
  { key: "attention.agent", name: "Attention", line: "The changes across your work that need a look, with the object and the reason beside them." },
  { key: "spark.surface", name: "Spark", line: "Fast, focused preparation of material: organize, extract and translate the pieces the next step depends on." },
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
    if (entry.current) card.append(el("p", { className: "chat-facet-here", text: "You are here." }));
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
        el("p", { className: "chat-eyebrow", text: "CHAT" }),
        el("h1", { attrs: { tabindex: "-1", "data-chat-focus": "title" } }, semanticIcon("chat.surface", { size: 24 }), el("span", { text: "Chat" })),
        el("p", { className: "chat-lede", text: "Start from a question or an idea, choose who you are talking to, and let the conversation carry what it produces into the work." }),
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
      continueSection.append(el("p", { className: "chat-empty", text: "No chats yet. New chat starts one; Home's composer does the same with a project chosen." }));
      if (example && onExample) {
        const see = el("button", { className: "quiet-button", text: example.label || "See the example workspace", attrs: { type: "button", "data-chat-action": "example" } });
        see.addEventListener("click", () => onExample());
        continueSection.append(see);
      }
    }

    const facets = el("section", { className: "chat-facets", attrs: { "aria-label": "Chat, Attention and Spark" } }, ...FACETS.map(facet));

    const keeps = el("section", { className: "chat-keeps", attrs: { "aria-labelledby": "chat-keeps-title" } },
      el("h2", { text: "What a chat keeps", attrs: { id: "chat-keeps-title" } }),
      el("dl", {},
        el("dt", { text: "Its project." }), el("dd", { text: "A chat belongs to the project you chose. Files, materials and file access come from there, and the chat stays in that project's list." }),
        el("dt", { text: "Its record." }), el("dd", { text: "Every run leaves its messages, tool actions and recorded files in the chat. Binding a chat to a Matter turns it into Work, where candidates and decisions are kept." }),
        el("dt", { text: "Its model." }), el("dd", { text: "Chats run through the connection configured in Settings · Models. This page does not connect to a provider by itself." }),
        el("dt", { text: "Later." }), el("dd", { text: "Carrying a conversation across providers, a shared memory, and handing a discussion to a run are planned. They appear here when they exist, not before." }),
      ),
    );

    container.replaceChildren(el("div", { className: "chat-page-inner" }, heading, continueSection, facets, keeps));
    return container;
  }

  return {
    open(input) { return render(input); },
    deactivate() { generation += 1; },
    get generation() { return generation; },
  };
}
