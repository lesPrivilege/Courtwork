/* Workspace card · the secondary card behind the context strip's Workspace chip.
 *
 * One Chat may connect one external directory for read-only source tools
 * (RD-006 / app/docs/repository-binding.md). Unbound: open a folder through
 * the Host's native dialog, pick a folder connected before, or type an
 * absolute Host path. Bound: the folder, its scope and Disconnect. The card
 * never invents a success: the Session projection read back through
 * `onSession()` is the only source of the bound state, and a chosen or listed
 * folder still goes through the explicit bind command. On Home there is no
 * Session yet, so the card works on a draft (`draft.path`) that the first send
 * binds before its Run starts; the draft is an intent, never a binding.
 *
 * Nearest precedent: local-extension-view.mjs (Host path input, inline error,
 * focus preserved across re-render) and settings-view.mjs renderConnectionCard
 * (card sections, "Available after this run ends." meta). */
import { el, SENDING_LABEL } from "./ui-controls.mjs";
import { semanticAction } from "./semantic-controls.mjs";

export const REPOSITORY_SCOPE_LABEL = "Read only";
export const REPOSITORY_HELP = "The next run can read files under the folder you connect. Nothing is uploaded and the folder is not changed.";
export const REPOSITORY_ACTIVE_RUN = "Available after this run ends.";
export const REPOSITORY_DIALOG_OPEN = "Choose a folder in the dialog that opened.";
export const CANDIDATE_HELP = "Edits go to a private candidate the Host creates from the folder's current commit. The folder itself is never written.";
export const CANDIDATE_NO_GIT = "This folder has no Git commit to start from, so edits stay unavailable.";
const CHOOSE_PROMPT = "Connect a repository";

export function repositoryName(rootPath) {
  const text = String(rootPath || "");
  const trimmed = text.replace(/\/+$/, "");
  return trimmed.slice(trimmed.lastIndexOf("/") + 1) || trimmed || text;
}

export function activeRepositoryBinding(session) {
  const binding = session?.repositoryBinding;
  return binding?.status === "active" ? binding : null;
}

export function createWorkspaceCard({ request, onSession, onClose, onReviewChanges }) {
  let directory = "", pending = false, choosing = false, error = "", generation = 0, requestId = null, requestFor = null;
  let recent = null, recentLoading = false, pickerUnavailable = false, pathOpen = false;

  function bindRequestId(rootPath) {
    // The same path retried after a failure reuses its requestId so the Host
    // returns the original receipt instead of a second binding.
    if (requestFor !== rootPath) { requestFor = rootPath; requestId = crypto.randomUUID(); }
    return requestId;
  }

  function render(container, { session, active, draft = null }) {
    const focus = container.contains(document.activeElement) ? document.activeElement?.getAttribute("data-repository-field") : null;
    const selection = focus && typeof document.activeElement?.selectionStart === "number" ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    const header = el("div", { className: "section-heading" }, el("h3", { text: "Workspace" }),
      semanticAction("surface.close", onClose, { values: { target: "workspace card" } }));
    const binding = draft ? (draft.path ? { rootPath: draft.path, status: "draft" } : null) : activeRepositoryBinding(session);
    const revision = session?.repositoryBindingRevision ?? 0;
    const busy = pending || choosing || active;
    const children = [header];
    if (binding && draft) {
      const remove = el("button", { className: "quiet-button", text: "Remove", attrs: { type: "button", "data-repository-field": "remove" } });
      remove.disabled = busy;
      remove.addEventListener("click", () => { draft.onChange(null); rerender(); });
      children.push(el("section", { className: "context-card" },
        el("dl", { className: "data-list" },
          el("dt", { text: "Folder" }), el("dd", {}, el("code", { text: binding.rootPath })),
          el("dt", { text: "Access" }), el("dd", { text: REPOSITORY_SCOPE_LABEL })),
        el("p", { className: "context-meta", text: "Connected when you send. Nothing is read before then." }),
        remove));
    } else if (binding) {
      const disconnect = el("button", { className: "quiet-button", text: pending ? SENDING_LABEL : "Disconnect", attrs: { type: "button", "data-repository-field": "disconnect" } });
      disconnect.disabled = busy;
      disconnect.addEventListener("click", () => submit({ operation: "revoke", requestId: crypto.randomUUID(), expectedRevision: revision }, session));
      children.push(el("section", { className: "context-card" },
        el("dl", { className: "data-list" },
          el("dt", { text: "Folder" }), el("dd", {}, el("code", { text: binding.rootPath })),
          el("dt", { text: "Access" }), el("dd", { text: REPOSITORY_SCOPE_LABEL })),
        el("p", { className: "context-meta", text: active ? REPOSITORY_ACTIVE_RUN : "Disconnecting stops further reads. Files the model already read stay in this chat." }),
        disconnect));
      children.push(renderCandidateSection());
    } else {
      if (recent === null && !recentLoading) void loadRecent();
      const connectPath = rootPath => draft
        ? (draft.onChange(rootPath), directory = "", rerender())
        : submit({ operation: "bind", requestId: bindRequestId(rootPath), expectedRevision: revision, rootPath }, session);
      const primary = el("section", { className: "context-card" });
      if (!pickerUnavailable) {
        const open = el("button", { className: "primary-button", text: "Open folder…", attrs: { type: "button", "data-repository-field": "open", "aria-label": "Open a folder to connect" } });
        open.disabled = busy;
        open.addEventListener("click", () => chooseFolder(session));
        primary.append(open);
      }
      primary.append(el("p", { className: "context-meta", text: active ? REPOSITORY_ACTIVE_RUN : choosing ? REPOSITORY_DIALOG_OPEN : `${REPOSITORY_SCOPE_LABEL}. ${REPOSITORY_HELP}` }));
      children.push(primary);
      if (recent?.length) {
        const list = el("ul", { className: "repository-recent", attrs: { "aria-label": "Folders connected before" } });
        for (const item of recent) {
          const absent = item.available === false;
          const row = el("button", { className: "context-row repository-recent-row", attrs: { type: "button", "data-repository-field": "recent", "data-root-path": item.rootPath, title: item.rootPath } },
            el("span", { className: "repository-recent-name", text: repositoryName(item.rootPath) }),
            el("span", { className: "repository-recent-path", text: absent ? "Not found" : item.rootPath }));
          row.setAttribute("aria-label", `${absent ? "Not found" : "Connect"}: ${item.rootPath}`);
          row.disabled = busy || absent;
          row.addEventListener("click", () => connectPath(item.rootPath));
          list.append(el("li", {}, row));
        }
        children.push(el("section", { className: "context-card" }, el("h4", { text: "Connected before" }), list));
      }
      const input = el("input", { attrs: { "aria-label": "Repository folder path", placeholder: "/absolute/path/to/repository", "data-repository-field": "path", autocomplete: "off", spellcheck: "false" } });
      input.value = directory; input.disabled = busy;
      input.addEventListener("input", () => { directory = input.value; error = ""; });
      const connect = () => {
        const rootPath = directory.trim();
        if (!rootPath) { error = "Enter an absolute folder path on this computer."; rerender(); return; }
        connectPath(rootPath);
      };
      input.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault?.(); connect(); } });
      const button = el("button", { className: pickerUnavailable ? "primary-button" : "quiet-button", text: pending ? SENDING_LABEL : "Connect", attrs: { type: "button", "data-repository-field": "connect" } });
      button.disabled = busy;
      button.addEventListener("click", connect);
      const pathSection = el("section", { className: "context-card" },
        el("label", { className: "runtime-intake-field" }, el("span", { text: "Folder path on this computer" }), input), button);
      if (pickerUnavailable) children.push(pathSection);
      else {
        const details = el("details", { className: "repository-path-details" }, el("summary", { text: "Enter a path instead", attrs: { "data-repository-field": "path-summary" } }), pathSection);
        if (pathOpen) details.setAttribute("open", "");
        details.addEventListener("toggle", () => { pathOpen = details.open === true || details.hasAttribute("open"); });
        children.push(details);
      }
    }
    if (error) children.push(el("p", { className: "inline-error", text: error, attrs: { role: "alert" } }));
    container.replaceChildren(...children);
    if (focus) {
      // After a command the field that held focus may be gone (Connect became
      // Disconnect, or the reverse); keep focus inside the card on the first
      // command so keyboard users are not dropped on the page.
      const target = container.querySelector(`[data-repository-field="${focus}"]`) || container.querySelector("[data-repository-field]");
      target?.focus({ preventScroll: true });
      if (selection && target?.getAttribute("data-repository-field") === focus) target?.setSelectionRange?.(...selection);
    }
    return header;

    function rerender() { render(container, { session, active, draft }); }
    /* RD-006 / 02 · the private candidate is the only place `repo_write` can
     * land. Start it from the folder's current commit (a Host fact read live,
     * never guessed); stop it without deleting anything. */
    function renderCandidateSection() {
      const candidate = session?.repositoryCandidate?.status === "active" ? session.repositoryCandidate : null;
      const candidateRevision = session?.repositoryCandidateRevision ?? 0;
      const section = el("section", { className: "context-card" }, el("h4", { text: "Edits" }));
      if (candidate) {
        const review = el("button", { className: "context-row", text: "Review changes", attrs: { type: "button", "data-repository-field": "review" } });
        review.disabled = pending || !onReviewChanges;
        review.addEventListener("click", () => onReviewChanges?.());
        const stop = el("button", { className: "quiet-button", text: pending ? SENDING_LABEL : "Stop edits", attrs: { type: "button", "data-repository-field": "stop-edits" } });
        stop.disabled = busy;
        stop.addEventListener("click", () => submitCandidate({ operation: "revoke", requestId: crypto.randomUUID(), expectedRevision: candidateRevision, expectedBindingRevision: binding.revision, candidateId: candidate.id }));
        section.append(
          el("dl", { className: "data-list" },
            el("dt", { text: "Private candidate" }), el("dd", {}, el("code", { text: `from ${candidate.baseCommit.slice(0, 12)}` })),
            el("dt", { text: "Writes" }), el("dd", { text: String(candidate.writeRevision ?? 0) })),
          review,
          el("p", { className: "context-meta", text: active ? REPOSITORY_ACTIVE_RUN : "Stopping keeps the candidate's files; later edits need a new candidate." }),
          stop);
        return section;
      }
      const start = el("button", { className: "quiet-button", text: pending ? SENDING_LABEL : "Start private candidate", attrs: { type: "button", "data-repository-field": "start-edits" } });
      start.disabled = busy;
      start.addEventListener("click", () => startCandidate());
      section.append(el("p", { className: "context-meta", text: active ? REPOSITORY_ACTIVE_RUN : CANDIDATE_HELP }), start);
      return section;
    }
    async function startCandidate() {
      if (busy || !session?.id) return;
      const own = ++generation;
      pending = true; error = ""; rerender();
      try {
        const inspection = await request(`/repositories/inspect?rootPath=${encodeURIComponent(binding.rootPath)}`);
        if (own !== generation) return;
        const head = inspection?.git?.head;
        if (typeof head !== "string" || !head) { pending = false; error = CANDIDATE_NO_GIT; rerender(); return; }
        pending = false;
        await submitCandidate({ operation: "create", requestId: crypto.randomUUID(), expectedRevision: session.repositoryCandidateRevision ?? 0,
          expectedBindingRevision: binding.revision, candidateId: crypto.randomUUID(), baseCommit: head });
      } catch (err) {
        if (own !== generation) return;
        pending = false; error = err?.message || "The folder could not be inspected."; rerender();
      }
    }
    async function submitCandidate(body) {
      if (pending || active || !session?.id) return;
      const own = ++generation;
      pending = true; error = ""; rerender();
      try {
        await request(`/sessions/${encodeURIComponent(session.id)}/repository-candidate`, { method: "PUT", body });
        if (own !== generation) return;
        pending = false;
        await onSession?.(session.id);
      } catch (err) {
        if (own !== generation) return;
        pending = false; error = err?.message || "The private candidate could not be changed."; rerender();
      }
    }
    async function loadRecent() {
      const own = ++generation;
      recentLoading = true;
      try {
        const result = await request("/repositories/recent");
        if (own !== generation) return;
        recent = Array.isArray(result?.entries) ? result.entries : [];
      } catch {
        if (own !== generation) return;
        recent = [];
      } finally {
        if (own === generation) { recentLoading = false; rerender(); }
      }
    }
    async function chooseFolder(current) {
      if (busy || (!draft && !current?.id)) return;
      const own = ++generation;
      choosing = true; error = ""; rerender();
      try {
        const result = await request("/host/choose-directory", { method: "POST", body: { prompt: CHOOSE_PROMPT } });
        if (own !== generation) return;
        choosing = false;
        if (result?.cancelled || typeof result?.rootPath !== "string") { rerender(); return; }
        if (draft) { draft.onChange(result.rootPath); rerender(); return; }
        directory = result.rootPath;
        await submit({ operation: "bind", requestId: bindRequestId(result.rootPath), expectedRevision: revision, rootPath: result.rootPath }, current);
      } catch (err) {
        if (own !== generation) return;
        choosing = false;
        if (err?.status === 501) { pickerUnavailable = true; error = ""; }
        else error = err?.message || "The folder dialog could not be opened.";
        rerender();
      }
    }
    async function submit(body, current) {
      if (pending || active || !current?.id) return;
      const own = ++generation;
      pending = true; error = ""; rerender();
      try {
        await request(`/sessions/${encodeURIComponent(current.id)}/repository-binding`, { method: "PUT", body });
        if (own !== generation) return;
        if (body.operation === "bind") { directory = ""; requestFor = null; requestId = null; }
        recent = null;
        pending = false;
        await onSession?.(current.id);
      } catch (err) {
        if (own !== generation) return;
        pending = false;
        error = err?.message || "The folder could not be connected.";
        rerender();
      }
    }
  }

  return { render, get pending() { return pending; } };
}
