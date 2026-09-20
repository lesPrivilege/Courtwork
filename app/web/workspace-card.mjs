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
 * 2026-09-20 · this is where a coding task is decided, so the four things that
 * decision depends on are named here with their separate owners, per RD-006's
 * dimension separation (research/deferred-workspace-binding-2026-09-12): the
 * project organises the chat, the connected folder supplies source, the private
 * candidate is the only thing edits land in, and File access governs whether
 * each exact write is shown first. They are read side by side, never merged
 * into one permission word, and nothing here grants any of them.
 *
 * Nearest precedent: local-extension-view.mjs (Host path input, inline error,
 * focus preserved across re-render), settings-view.mjs renderConnectionCard
 * (card sections, "Available after this run ends." meta) and
 * agent-profiles-view.mjs's FOCUS_CHAIN (where the keyboard goes when the
 * control it was on cannot take it back). */
import { el, SENDING_LABEL } from "./ui-controls.mjs";
import { semanticAction, semanticIcon } from "./semantic-controls.mjs";

export const REPOSITORY_SCOPE_LABEL = "Read only";
/* WK-96 · measured against the Host rather than against intent. "Nothing is
 * uploaded" was not true of a run that reads the folder: repository text a tool
 * returns becomes part of what the configured model is sent, and this card does
 * not know which runtime that is, so it does not say. What stays is the part
 * the Host really guarantees — the connected folder is never written. */
export const REPOSITORY_HELP = "The next run can read files under the folder you connect. The folder is never written, and what a run reads is sent to the model this chat is configured with.";
/* The same correction for the staged draft. A staged folder is stat'd and its
 * Git details read at once, because the strip beside this card draws them
 * (service.mjs getRepositoryInspection, called from renderContextStrip); only
 * file contents wait for the send. */
export const REPOSITORY_DRAFT_SCOPE = "Connected when you send. Until then the Host reads the folder's path and Git details only, to show them here.";
export const REPOSITORY_ACTIVE_RUN = "Available after this run ends.";
export const REPOSITORY_DIALOG_OPEN = "Choose a folder in the dialog that opened.";
export const CANDIDATE_HELP = "Edits go to a private candidate the Host creates from the folder's current commit. The folder itself is never written.";
export const CANDIDATE_NO_GIT = "This folder has no Git commit to start from, so edits stay unavailable.";
/* Preparing is the one command on Home that creates something. Say which
 * things it makes, and say that it is not a send — the person is about to
 * press a button on a screen whose other button costs a model call. */
export const PREPARE_SCOPE = "This makes the chat and connects the folder now. Nothing is sent and no model is called until you send.";
/* The Host refuses to rebind while a candidate is open (store.mjs
 * ACTIVE_CANDIDATE). Say that where the control would have been rather than
 * offering a button whose command is already known to fail. */
export const CHANGE_FOLDER_BLOCKED = "Stop edits first: the private candidate is built from this folder's commit, so the folder cannot change while it exists.";
const CHOOSE_PROMPT = "Connect a repository";

/* Where the keyboard goes when the control it was on cannot take it back. A
 * command disables its own button, and the platform then drops focus to the
 * page — which is what the 2026-09-20 dogfood journey saw after Start private
 * candidate. Each chain names the control that still answers the action. */
const FOCUS_CHAIN = {
  "start-edits": ["start-edits", "review", "stop-edits"],
  "stop-edits": ["stop-edits", "start-edits", "change-folder"],
  disconnect: ["disconnect", "open", "path", "connect"],
  remove: ["remove", "open", "path", "connect"],
  open: ["open", "disconnect", "change-folder", "connect"],
  recent: ["recent", "disconnect", "change-folder", "connect"],
  connect: ["connect", "disconnect", "change-folder"],
  "change-folder": ["change-folder", "open", "path", "keep-folder"],
  "keep-folder": ["keep-folder", "change-folder", "disconnect"],
};

export function repositoryName(rootPath) {
  const text = String(rootPath || "");
  const trimmed = text.replace(/\/+$/, "");
  return trimmed.slice(trimmed.lastIndexOf("/") + 1) || trimmed || text;
}

export function activeRepositoryBinding(session) {
  const binding = session?.repositoryBinding;
  return binding?.status === "active" ? binding : null;
}

export function activeRepositoryCandidate(session) {
  const candidate = session?.repositoryCandidate;
  return candidate?.status === "active" ? candidate : null;
}

/* RD-006 / 02 · how many writes this candidate holds, from the Host only.
 *
 * Two Host receipts answer this and they can disagree by age: the Session
 * projection carries the count as of the last Session read, and every confirmed
 * write has already been recorded as `repository.write.confirmed` with the
 * revision it produced. A Run confirms writes without the client re-reading the
 * Session, so the cached field goes stale while the event is already in hand —
 * that is how a real one-line diff came to be titled "0 writes". Taking the
 * later of the two is not a third fact: both are the Host's own, filtered to
 * this candidate id, and a prepared or failed effect is not counted because
 * only the confirmation carries a revision. */
export function candidateWriteRevision(session, events) {
  const candidate = activeRepositoryCandidate(session);
  if (!candidate) return null;
  let revision = candidate.writeRevision ?? 0;
  for (const event of events || []) {
    if (event?.type !== "repository.write.confirmed") continue;
    const data = event.data;
    if (data?.candidateId !== candidate.id || !Number.isSafeInteger(data.writeRevision)) continue;
    if (data.writeRevision > revision) revision = data.writeRevision;
  }
  return revision;
}

export function createWorkspaceCard({ request, onSession, onClose, onReviewChanges }) {
  let directory = "", pending = false, choosing = false, error = "", generation = 0, requestId = null, requestFor = null;
  let recent = null, recentLoading = false, pickerUnavailable = false, pathOpen = false, rolesOpen = false, changing = false;
  // The field a command was started from, kept for exactly as long as the
  // command is out: the control it names is about to be replaced or disabled.
  let commandField = null;

  function bindRequestId(rootPath) {
    // The same path retried after a failure reuses its requestId so the Host
    // returns the original receipt instead of a second binding.
    if (requestFor !== rootPath) { requestFor = rootPath; requestId = crypto.randomUUID(); }
    return requestId;
  }

  function render(container, { session, active, draft = null, events = null, project = null, permissionLabel = null }) {
    const owned = container.contains(document.activeElement) ? document.activeElement?.getAttribute("data-repository-field") : null;
    /* Only resume a remembered destination while nobody else has taken the
       keyboard; if focus moved outside this card the wait is over and the card
       does not take it back (agent-profiles-view.mjs render()). */
    const unclaimed = !document.activeElement || document.activeElement === document.body;
    if (!owned && !unclaimed) commandField = null;
    const focus = owned || (unclaimed ? commandField : null);
    const selection = owned && typeof document.activeElement?.selectionStart === "number" ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    const header = el("div", { className: "section-heading" }, el("h3", { text: "Workspace" }),
      semanticAction("surface.close", onClose, { values: { target: "workspace card" } }));
    const binding = draft ? (draft.path ? { rootPath: draft.path, status: "draft" } : null) : activeRepositoryBinding(session);
    const revision = session?.repositoryBindingRevision ?? 0;
    const busy = pending || choosing || active;
    const children = [header];
    if (binding && draft) {
      const remove = el("button", { className: "quiet-button", text: "Remove", attrs: { type: "button", "data-repository-field": "remove" } });
      remove.disabled = busy;
      remove.addEventListener("click", () => { commandField = "remove"; draft.onChange(null); rerender(); });
      children.push(el("section", { className: "context-card" },
        el("dl", { className: "data-list" },
          el("dt", { text: "Folder" }), el("dd", {}, el("code", { text: binding.rootPath })),
          el("dt", { text: "Access" }), el("dd", { text: REPOSITORY_SCOPE_LABEL })),
        el("p", { className: "context-meta", text: REPOSITORY_DRAFT_SCOPE }),
        remove));
      /* A staged folder can be prepared into a real Chat with its own binding
       * and private candidate before anything is sent. The card does not own
       * that sequence — it is the Home start's, which holds the exactly-once
       * identities — so it only offers the command and says what pressing it
       * makes. Without an owner to call, the section is not drawn at all. */
      if (draft.onPrepare) {
        const prepare = el("button", { className: "quiet-button", text: draft.preparing ? SENDING_LABEL : "Start private candidate", attrs: { type: "button", "data-repository-field": "start-edits" } });
        prepare.disabled = busy || draft.locked === true;
        prepare.addEventListener("click", () => { commandField = "start-edits"; void draft.onPrepare(); });
        children.push(el("section", { className: "context-card" }, el("h4", { text: "Edits" }),
          el("p", { className: "context-meta", text: CANDIDATE_HELP }),
          el("p", { className: "context-meta", text: PREPARE_SCOPE }),
          prepare));
      }
    } else if (binding) {
      const candidate = activeRepositoryCandidate(session);
      const connectPath = rootPath => submit({ operation: "bind", requestId: bindRequestId(rootPath), expectedRevision: revision, rootPath }, session);
      const disconnect = el("button", { className: "quiet-button", text: pending ? SENDING_LABEL : "Disconnect", attrs: { type: "button", "data-repository-field": "disconnect" } });
      disconnect.disabled = busy;
      disconnect.addEventListener("click", () => { commandField = "disconnect"; submit({ operation: "revoke", requestId: crypto.randomUUID(), expectedRevision: revision }, session); });
      /* RD-006 · four dimensions, four readings, in the order the decision is
         made: what organises this chat, where source comes from, what may be
         done to it, and what will be shown before a write happens. A missing
         one is said as missing rather than filled in from another. */
      const facts = el("dl", { className: "data-list" },
        el("dt", { text: "Project" }), el("dd", { text: project?.name || "No project" }),
        el("dt", { text: "Folder" }), el("dd", {}, el("code", { text: binding.rootPath })),
        el("dt", { text: "Access" }), el("dd", { text: REPOSITORY_SCOPE_LABEL }));
      if (permissionLabel) facts.append(el("dt", { text: "File access" }), el("dd", { text: permissionLabel }));
      const primary = el("section", { className: "context-card" }, facts);
      // UX-02 · the sentence each reading needs to be acted on stays at the
      // control; the longer definitions are one disclosure away.
      const roles = el("details", { className: "repository-path-details" },
        el("summary", { text: "Which is which", attrs: { "data-repository-field": "roles-summary" } }),
        el("dl", { className: "data-list" },
          el("dt", { text: "Project" }), el("dd", { text: "How this chat is organised. It does not connect a folder or grant access to one." }),
          el("dt", { text: "Folder" }), el("dd", { text: "Where a run reads source. It stays read only and is never written." }),
          el("dt", { text: "Private candidate" }), el("dd", { text: "The Host's own copy of the folder's current commit. It is the only place an edit lands." }),
          el("dt", { text: "File access" }), el("dd", { text: "Ask before editing shows each exact write and check for approval. Allow edits lets writes proceed without asking, but checks still require approval. Read only blocks writes and checks." })));
      if (rolesOpen) roles.setAttribute("open", "");
      roles.addEventListener("toggle", () => { rolesOpen = roles.open === true || roles.hasAttribute("open"); });
      primary.append(roles);
      if (changing) {
        const keep = el("button", { className: "quiet-button", text: "Keep this folder", attrs: { type: "button", "data-repository-field": "keep-folder" } });
        keep.disabled = busy;
        keep.addEventListener("click", () => { commandField = "keep-folder"; changing = false; error = ""; rerender(); });
        primary.append(el("p", { className: "context-meta", text: active ? REPOSITORY_ACTIVE_RUN : "Connecting another folder replaces this one for this chat. Files the model already read stay in this chat." }), keep);
        children.push(primary, ...chooserSections(connectPath, busy));
      } else {
        if (!candidate) {
          const change = el("button", { className: "context-row", attrs: { type: "button", "data-repository-field": "change-folder", "aria-label": "Change the connected folder" } },
            semanticIcon("workspace.object", { size: 18 }), el("span", { text: "Change folder…" }));
          change.disabled = busy;
          change.addEventListener("click", () => { commandField = "change-folder"; changing = true; error = ""; rerender(); });
          primary.append(change);
        }
        primary.append(el("p", { className: "context-meta", text: active ? REPOSITORY_ACTIVE_RUN : candidate ? CHANGE_FOLDER_BLOCKED : "Disconnecting stops further reads. Files the model already read stay in this chat." }), disconnect);
        children.push(primary, renderCandidateSection());
      }
    } else {
      const connectPath = rootPath => draft
        ? (draft.onChange(rootPath), directory = "", rerender())
        : submit({ operation: "bind", requestId: bindRequestId(rootPath), expectedRevision: revision, rootPath }, session);
      children.push(...chooserSections(connectPath, busy));
    }
    if (error) children.push(el("p", { className: "inline-error", text: error, attrs: { role: "alert" } }));
    container.replaceChildren(...children);
    if (focus) {
      // After a command the field that held focus may be gone (Connect became
      // Disconnect, or the reverse) or still here but disabled while the next
      // request is out. Those are different situations: a control that is
      // waiting is waited for, and `commandField` keeps the destination until
      // one of the chain's controls can really take the keyboard. A control
      // that has gone entirely is replaced, and only then does the card fall
      // back to keeping focus inside itself.
      const usable = key => {
        const node = container.querySelector(`[data-repository-field="${key}"]`);
        return node && !node.disabled ? node : null;
      };
      let target = null;
      for (const key of FOCUS_CHAIN[focus] || [focus]) { target = usable(key); if (target) break; }
      if (!target && owned && !container.querySelector(`[data-repository-field="${focus}"]`))
        target = [...container.querySelectorAll("[data-repository-field]")].find(node => !node.disabled) || null;
      if (target) {
        target.focus({ preventScroll: true });
        commandField = null;
        if (selection && target.getAttribute("data-repository-field") === focus) target.setSelectionRange?.(...selection);
      }
    }
    return header;

    function rerender() { render(container, { session, active, draft, events, project, permissionLabel }); }

    /* The chooser is the same list of ways to name a folder whether this chat
     * has none yet or is replacing the one it has; only the command behind
     * `connectPath` differs. */
    function chooserSections(connectPath, disabled) {
      if (recent === null && !recentLoading) void loadRecent();
      const sections = [];
      const primary = el("section", { className: "context-card" });
      if (!pickerUnavailable) {
        // A card row like the connection card's actions, not a filled button:
        // the card is a list of things this chat can do, and the folder glyph
        // names the object the row opens.
        const open = el("button", { className: "context-row", attrs: { type: "button", "data-repository-field": "open", "aria-label": "Open a folder to connect" } },
          semanticIcon("workspace.object", { size: 18 }), el("span", { text: "Connect folder…" }));
        open.disabled = disabled;
        open.addEventListener("click", () => { commandField = "open"; chooseFolder(session, connectPath); });
        primary.append(open);
      }
      primary.append(el("p", { className: "context-meta", text: active ? REPOSITORY_ACTIVE_RUN : choosing ? REPOSITORY_DIALOG_OPEN : `${REPOSITORY_SCOPE_LABEL}. ${REPOSITORY_HELP}` }));
      sections.push(primary);
      if (recent?.length) {
        const list = el("ul", { className: "repository-recent", attrs: { "aria-label": "Folders connected before" } });
        for (const item of recent) {
          const absent = item.available === false;
          const row = el("button", { className: "context-row repository-recent-row", attrs: { type: "button", "data-repository-field": "recent", "data-root-path": item.rootPath, title: item.rootPath } },
            el("span", { className: "repository-recent-name", text: repositoryName(item.rootPath) }),
            el("span", { className: "repository-recent-path", text: absent ? "Not found" : item.rootPath }));
          row.setAttribute("aria-label", `${absent ? "Not found" : "Connect"}: ${item.rootPath}`);
          row.disabled = disabled || absent;
          row.addEventListener("click", () => { commandField = "recent"; connectPath(item.rootPath); });
          list.append(el("li", {}, row));
        }
        sections.push(el("section", { className: "context-card" }, el("h4", { text: "Connected before" }), list));
      }
      const input = el("input", { attrs: { "aria-label": "Repository folder path", placeholder: "/absolute/path/to/repository", "data-repository-field": "path", autocomplete: "off", spellcheck: "false" } });
      input.value = directory; input.disabled = disabled;
      input.addEventListener("input", () => { directory = input.value; error = ""; });
      const connect = () => {
        const rootPath = directory.trim();
        if (!rootPath) { error = "Enter an absolute folder path on this computer."; rerender(); return; }
        commandField = "connect";
        connectPath(rootPath);
      };
      input.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault?.(); connect(); } });
      const button = el("button", { className: pickerUnavailable ? "primary-button" : "quiet-button", text: pending ? SENDING_LABEL : "Connect", attrs: { type: "button", "data-repository-field": "connect" } });
      button.disabled = disabled;
      button.addEventListener("click", connect);
      const pathSection = el("section", { className: "context-card" },
        el("label", { className: "runtime-intake-field" }, el("span", { text: "Folder path on this computer" }), input), button);
      if (pickerUnavailable) sections.push(pathSection);
      else {
        const details = el("details", { className: "repository-path-details" }, el("summary", { text: "Enter a path instead", attrs: { "data-repository-field": "path-summary" } }), pathSection);
        if (pathOpen) details.setAttribute("open", "");
        details.addEventListener("toggle", () => { pathOpen = details.open === true || details.hasAttribute("open"); });
        sections.push(details);
      }
      return sections;
    }

    /* RD-006 / 02 · the private candidate is the only place `repo_write` can
     * land. Start it from the folder's current commit (a Host fact read live,
     * never guessed); stop it without deleting anything. */
    function renderCandidateSection() {
      const candidate = activeRepositoryCandidate(session);
      const candidateRevision = session?.repositoryCandidateRevision ?? 0;
      const section = el("section", { className: "context-card" }, el("h4", { text: "Edits" }));
      if (candidate) {
        const review = el("button", { className: "context-row", text: "Review changes", attrs: { type: "button", "data-repository-field": "review" } });
        review.disabled = pending || !onReviewChanges;
        review.addEventListener("click", () => onReviewChanges?.());
        const stop = el("button", { className: "quiet-button", text: pending ? SENDING_LABEL : "Stop edits", attrs: { type: "button", "data-repository-field": "stop-edits" } });
        stop.disabled = busy;
        stop.addEventListener("click", () => { commandField = "stop-edits"; submitCandidate({ operation: "revoke", requestId: crypto.randomUUID(), expectedRevision: candidateRevision, expectedBindingRevision: binding.revision, candidateId: candidate.id }); });
        section.append(
          el("dl", { className: "data-list" },
            el("dt", { text: "Private candidate" }), el("dd", {}, el("code", { text: `from ${candidate.baseCommit.slice(0, 12)}` })),
            // The Host's own count, taken from whichever of its two receipts is
            // later; see candidateWriteRevision above.
            el("dt", { text: "Writes" }), el("dd", { text: String(candidateWriteRevision(session, events) ?? 0) })),
          review,
          el("p", { className: "context-meta", text: active ? REPOSITORY_ACTIVE_RUN : "Stopping keeps the candidate's files; later edits need a new candidate." }),
          stop);
        return section;
      }
      const start = el("button", { className: "quiet-button", text: pending ? SENDING_LABEL : "Start private candidate", attrs: { type: "button", "data-repository-field": "start-edits" } });
      start.disabled = busy;
      start.addEventListener("click", () => { commandField = "start-edits"; startCandidate(); });
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
    async function chooseFolder(current, connectPath) {
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
        connectPath(result.rootPath);
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
        // A folder that was replaced or disconnected leaves the change path:
        // the card is back to reading one binding, not choosing another.
        if (body.operation === "bind") { directory = ""; requestFor = null; requestId = null; }
        changing = false;
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
