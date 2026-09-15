/* Repository card · the secondary card behind the composer's Repository control.
 *
 * One Chat may connect one external directory for read-only source tools
 * (RD-006 / app/docs/repository-binding.md). The card shows the bound
 * directory and its scope, or takes an absolute Host path and submits the
 * bind command. It never invents a success: the Session projection returned
 * by the Host after `onSession()` is the only source of the bound state.
 *
 * Nearest precedent: local-extension-view.mjs (Host path input, inline error,
 * focus preserved across re-render) and settings-view.mjs renderConnectionCard
 * (card sections, "Available after this run ends." meta). */
import { el, SENDING_LABEL } from "./ui-controls.mjs";
import { semanticAction } from "./semantic-controls.mjs";

export const REPOSITORY_SCOPE_LABEL = "Read only";
export const REPOSITORY_HELP = "The next run can read files under this directory. Nothing is uploaded and the directory is not changed.";
export const REPOSITORY_ACTIVE_RUN = "Available after this run ends.";

export function repositoryName(rootPath) {
  const text = String(rootPath || "");
  const trimmed = text.replace(/\/+$/, "");
  return trimmed.slice(trimmed.lastIndexOf("/") + 1) || trimmed || text;
}

export function activeRepositoryBinding(session) {
  const binding = session?.repositoryBinding;
  return binding?.status === "active" ? binding : null;
}

export function createRepositoryCard({ request, onSession, onClose }) {
  let directory = "", pending = false, error = "", generation = 0, requestId = null, requestFor = null;

  function bindRequestId(rootPath) {
    // The same path retried after a failure reuses its requestId so the Host
    // returns the original receipt instead of a second binding.
    if (requestFor !== rootPath) { requestFor = rootPath; requestId = crypto.randomUUID(); }
    return requestId;
  }

  function render(container, { session, active }) {
    const focus = container.contains(document.activeElement) ? document.activeElement?.getAttribute("data-repository-field") : null;
    const selection = focus && typeof document.activeElement?.selectionStart === "number" ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    const header = el("div", { className: "section-heading" }, el("h3", { text: "Repository" }),
      semanticAction("surface.close", onClose, { values: { target: "repository card" } }));
    const binding = activeRepositoryBinding(session);
    const revision = session?.repositoryBindingRevision ?? 0;
    const busy = pending || active;
    const children = [header];
    if (binding) {
      const disconnect = el("button", { className: "quiet-button", text: pending ? SENDING_LABEL : "Disconnect", attrs: { type: "button", "data-repository-field": "disconnect" } });
      disconnect.disabled = busy;
      disconnect.addEventListener("click", () => submit({ operation: "revoke", requestId: crypto.randomUUID(), expectedRevision: revision }, session));
      children.push(el("section", { className: "context-card" },
        el("dl", { className: "data-list" },
          el("dt", { text: "Directory" }), el("dd", {}, el("code", { text: binding.rootPath })),
          el("dt", { text: "Access" }), el("dd", { text: REPOSITORY_SCOPE_LABEL })),
        el("p", { className: "context-meta", text: active ? REPOSITORY_ACTIVE_RUN : "Disconnecting stops further reads. Files the model already read stay in this chat." }),
        disconnect));
    } else {
      const input = el("input", { attrs: { "aria-label": "Repository directory", placeholder: "/absolute/path/to/repository", "data-repository-field": "path", autocomplete: "off", spellcheck: "false" } });
      input.value = directory; input.disabled = busy;
      input.addEventListener("input", () => { directory = input.value; error = ""; });
      input.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault?.(); connect(); } });
      const connect = () => {
        const rootPath = directory.trim();
        if (!rootPath) { error = "Enter an absolute directory path on this computer."; rerender(); return; }
        submit({ operation: "bind", requestId: bindRequestId(rootPath), expectedRevision: revision, rootPath }, session);
      };
      const button = el("button", { className: "primary-button", text: pending ? SENDING_LABEL : "Connect repository", attrs: { type: "button", "data-repository-field": "connect" } });
      button.disabled = busy;
      button.addEventListener("click", connect);
      children.push(el("section", { className: "context-card" },
        el("label", { className: "runtime-intake-field" }, el("span", { text: "Directory on this computer" }), input),
        el("p", { className: "context-meta", text: active ? REPOSITORY_ACTIVE_RUN : `${REPOSITORY_SCOPE_LABEL}. ${REPOSITORY_HELP}` }),
        button));
    }
    if (error) children.push(el("p", { className: "inline-error", text: error, attrs: { role: "alert" } }));
    container.replaceChildren(...children);
    if (focus) {
      const target = container.querySelector(`[data-repository-field="${focus}"]`);
      target?.focus({ preventScroll: true });
      if (selection) target?.setSelectionRange?.(...selection);
    }
    return header;

    function rerender() { render(container, { session, active }); }
    async function submit(body, current) {
      if (pending || active || !current?.id) return;
      const own = ++generation;
      pending = true; error = ""; rerender();
      try {
        await request(`/sessions/${encodeURIComponent(current.id)}/repository-binding`, { method: "PUT", body });
        if (own !== generation) return;
        if (body.operation === "bind") { directory = ""; requestFor = null; requestId = null; }
        pending = false;
        await onSession?.(current.id);
      } catch (err) {
        if (own !== generation) return;
        pending = false;
        error = err?.message || "The repository could not be connected.";
        rerender();
      }
    }
  }

  return { render, get pending() { return pending; } };
}
