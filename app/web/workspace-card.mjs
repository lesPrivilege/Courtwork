/* Work location · the panel behind the context band's one entry.
 *
 * 2026-09-21 · the composer used to offer two distant starts — a Project button
 * inside it and a Connect folder chip above it — and this card was titled
 * Workspace, a third name for neither. There is now one entry and one panel,
 * titled Work location. "Work location" is a label for the place a task is
 * decided, not a new object: inside it Project (organisation, including No
 * project) and Folder (the files a run can read) stay two separately named
 * facts with their own commands, and choosing one never sets the other. The
 * ruling is evidence/composer-entry-review-20260921; the change record is
 * evidence/composer-entry-20260921/change-record.md.
 *
 * Earlier notes on the same card follow.
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
/* While preparation is in flight the folder it is binding cannot be changed
 * from under it, and the command cannot be pressed a second time. The card is
 * not the owner of that work, so it is told to lock rather than deciding to. */
export const PREPARE_BUSY = "Preparing this chat. Its folder and private candidate are being created; nothing is sent.";
/* A preparation whose reply was lost left a real Chat behind with part of what
 * it promised missing. Finishing it has to reuse the identities that command
 * already used — starting a fresh candidate here would race whatever landed —
 * so this is a different command from Start private candidate and says so. */
export const PREPARE_RESUME_SCOPE = "This chat was prepared but not finished. Continuing uses the same request it already sent, so nothing is created twice.";
/* An outstanding effect nobody can see the result of. The folder must not move
 * while it is outstanding — a change would land beside whatever is already
 * there — and saying "still working" would be a different, false claim. */
export const PREPARE_UNCERTAIN = "Whether the last step took effect is not known yet. The folder cannot change until that is settled; your folder and text are kept.";
/* The opposite case: the Host refused, nothing landed, and the folder it
 * refused is the thing to replace. */
export const PREPARE_CORRECT_SCOPE = "This chat was made, but that folder could not be connected. Connect a different one to finish it; the chat and what you typed stay as they are.";
/* The Host refuses to rebind while a candidate is open (store.mjs
 * ACTIVE_CANDIDATE). Say that where the control would have been rather than
 * offering a button whose command is already known to fail. */
export const CHANGE_FOLDER_BLOCKED = "Stop edits first: the private candidate is built from this folder's commit, so the folder cannot change while it exists.";
/* The project line needs one sentence to be chosen correctly, because the
 * mistake it prevents is real: picking a project does not give the chat any
 * files. */
export const PROJECT_HELP = "Organises this chat. Choosing one does not connect a folder or give access to one.";
/* The Host can rename a chat but has no command that moves it between
 * projects, so once a chat exists its project is a fact, and the panel says so
 * instead of offering a choice it cannot carry out. */
export const PROJECT_FIXED = "Set when this chat was made. A chat keeps its project.";
/* A Home send in flight is creating a chat with exactly this location. The
 * location is locked for that — not hidden — and says why. */
export const SEND_BUSY = "Your chat is being started with this location, so it cannot change until that finishes.";
/* The last step of a Send: the Host is admitting its Run with this location. */
export const RUN_SENDING = "Your message is being sent with this location, so it cannot change until the run starts.";
export const WORK_LOCATION_TITLE = "Work location";
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
  "project-new": ["project-new"],
};

export function repositoryName(rootPath) {
  const text = String(rootPath || "");
  const trimmed = text.replace(/\/+$/, "");
  return trimmed.slice(trimmed.lastIndexOf("/") + 1) || trimmed || text;
}

/* A folder is recognised by its name and identified by its path. The name
 * carries the line; the whole path follows it at full length, wrapping where
 * it must, because the panel is where the complete path is meant to be read. */
function folderIdentity(rootPath) {
  return [
    el("p", { className: "location-value", text: repositoryName(rootPath) }),
    el("p", { className: "location-path" }, el("code", { text: rootPath })),
  ];
}

/* The band's one entry reads the two facts it opens, and only those. Empty,
 * it says what it is for. With a project or a folder it names them — project
 * first, the order they are decided in — and the accessible name says both
 * facts in full, including the one that is absent, and that the folder is
 * read only. It never names the private candidate or file access: those have
 * their own places, and the entry is not a permission. */
export const WORK_LOCATION_EMPTY = "Choose work location";
export function workLocationEntry({ projectName = null, rootPath = null } = {}) {
  const parts = [projectName, rootPath ? repositoryName(rootPath) : null].filter(Boolean);
  if (!parts.length) return { parts: [], label: WORK_LOCATION_EMPTY, ariaLabel: WORK_LOCATION_EMPTY, tooltip: "Choose a project and a folder for this chat" };
  const projectText = projectName ? `project ${projectName}` : "no project";
  const folderText = rootPath ? `folder ${rootPath}, ${REPOSITORY_SCOPE_LABEL.toLowerCase()}` : "no folder";
  return {
    parts,
    label: parts.join(" · "),
    ariaLabel: `${WORK_LOCATION_TITLE}: ${projectText}; ${folderText}`,
    // Names, untruncated; the complete path is read in the panel (UX-02), and
    // a path-long tooltip would cover the composer it sits on.
    tooltip: `${projectName || "No project"} · ${rootPath ? `${repositoryName(rootPath)} · ${REPOSITORY_SCOPE_LABEL}` : "No folder"}`,
  };
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

  function render(container, { session, active, draft = null, events = null, project = null, projectChoice = null, permissionLabel = null, busyReason = null, preparation = null }) {
    const owned = container.contains(document.activeElement) ? document.activeElement?.getAttribute("data-repository-field") : null;
    /* Only resume a remembered destination while nobody else has taken the
       keyboard; if focus moved outside this card the wait is over and the card
       does not take it back (agent-profiles-view.mjs render()). */
    const unclaimed = !document.activeElement || document.activeElement === document.body;
    if (!owned && !unclaimed) commandField = null;
    const focus = owned || (unclaimed ? commandField : null);
    const selection = owned && typeof document.activeElement?.selectionStart === "number" ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
    const header = el("div", { className: "section-heading" }, el("h3", { text: WORK_LOCATION_TITLE }),
      semanticAction("surface.close", onClose, { values: { target: "work location" } }));
    const binding = draft ? (draft.path ? { rootPath: draft.path, status: "draft" } : null) : activeRepositoryBinding(session);
    /* PA-R1 · an unfinished preparation owns this chat's folder and candidate
     * identities, whichever of them landed. Its own command is the only way
     * forward, so the card offers that instead of its ordinary Connect or
     * Start — either of which would mint identities beside ones already in
     * use and be refused against the revision they moved. */
    const resuming = !draft && preparation?.onResume ? preparation : null;
    const revision = session?.repositoryBindingRevision ?? 0;
    /* `busyReason` is an owner outside this card holding the same objects — a
     * Home preparation creating this chat's folder and candidate. It locks the
     * mutating commands exactly as this card's own in-flight command does, and
     * says why; reading and navigation stay available. */
    const busy = pending || choosing || active || Boolean(busyReason);
    const children = [header, renderProjectSection()];
    // Folder facts and commands, then the Edits section; each state below fills
    // them, and they are placed after the project in that order.
    const folder = [], edits = [];
    if (binding && draft) {
      const remove = el("button", { className: "quiet-button", text: "Remove", attrs: { type: "button", "data-repository-field": "remove" } });
      remove.disabled = busy;
      remove.addEventListener("click", () => { commandField = "remove"; draft.onChange(null); rerender(); });
      folder.push(el("section", { className: "context-card" },
        ...folderIdentity(binding.rootPath),
        el("dl", { className: "data-list" },
          el("dt", { text: "Access" }), el("dd", { text: REPOSITORY_SCOPE_LABEL })),
        el("p", { className: "context-meta", text: busyReason || REPOSITORY_DRAFT_SCOPE }),
        remove));
      /* A staged folder can be prepared into a real Chat with its own binding
       * and private candidate before anything is sent. The card does not own
       * that sequence — it is the Home start's, which holds the exactly-once
       * identities — so it only offers the command and says what pressing it
       * makes. Without an owner to call, the section is not drawn at all. */
      if (draft.onPrepare) {
        const prepare = el("button", { className: "quiet-button", text: pending || draft.preparing ? SENDING_LABEL : "Start private candidate", attrs: { type: "button", "data-repository-field": "start-edits" } });
        prepare.disabled = busy || draft.locked === true;
        prepare.addEventListener("click", () => { commandField = "start-edits"; void draft.onPrepare(); });
        edits.push(el("section", { className: "context-card location-section" }, el("h4", { text: "Edits" }),
          el("p", { className: "context-meta", text: CANDIDATE_HELP }),
          /* One reason, said once. While an owner holds this card the card has
           * already said why at the top; repeating it here would be the same
           * sentence twice, and the alternative sentence would contradict it. */
          busyReason ? null : el("p", { className: "context-meta", text: PREPARE_SCOPE }),
          prepare));
      }
    } else if (resuming) {
      const facts = el("dl", { className: "data-list" });
      if (binding) facts.append(el("dt", { text: "Access" }), el("dd", { text: REPOSITORY_SCOPE_LABEL }));
      if (permissionLabel) facts.append(el("dt", { text: "File access" }), el("dd", { text: permissionLabel }));
      folder.push(el("section", { className: "context-card" },
        ...(binding ? folderIdentity(binding.rootPath) : [el("p", { className: "location-value", text: "Not connected yet" })]), facts));
      edits.push(renderCandidateSection());
      /* PA-R1 · the Host refused this folder and nothing landed, so the folder
       * is what there is to correct. The same chooser the unbound card uses,
       * over the same chat: picking one is a new binding intent and the
       * preparation mints a new identity for it. Offered only when the owner
       * says correcting is safe — never while an effect is outstanding. */
      if (resuming.onCorrectFolder) {
        folder.push(el("p", { className: "context-meta", text: PREPARE_CORRECT_SCOPE }));
        folder.push(...chooserSections((rootPath) => { commandField = "open"; void resuming.onCorrectFolder(rootPath); }, busy));
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
        el("dt", { text: "Access" }), el("dd", { text: REPOSITORY_SCOPE_LABEL }));
      if (permissionLabel) facts.append(el("dt", { text: "File access" }), el("dd", { text: permissionLabel }));
      const primary = el("section", { className: "context-card" }, ...folderIdentity(binding.rootPath), facts);
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
        folder.push(primary, ...chooserSections(connectPath, busy));
      } else {
        if (!candidate && !busyReason && !preparation) {
          const change = el("button", { className: "context-row", attrs: { type: "button", "data-repository-field": "change-folder", "aria-label": "Change the connected folder" } },
            semanticIcon("workspace.object", { size: 16 }), el("span", { text: "Change folder…" }));
          change.disabled = busy;
          change.addEventListener("click", () => { commandField = "change-folder"; changing = true; error = ""; rerender(); });
          primary.append(change);
        }
        primary.append(el("p", { className: "context-meta", text: busyReason || (active ? REPOSITORY_ACTIVE_RUN : candidate ? CHANGE_FOLDER_BLOCKED : "Disconnecting stops further reads. Files the model already read stay in this chat.") }), disconnect);
        folder.push(primary);
        edits.push(renderCandidateSection());
      }
    } else {
      const connectPath = rootPath => draft
        ? (draft.onChange(rootPath), directory = "", rerender())
        : submit({ operation: "bind", requestId: bindRequestId(rootPath), expectedRevision: revision, rootPath }, session);
      folder.push(...chooserSections(connectPath, busy));
    }
    children.push(el("section", { className: "location-section", attrs: { "aria-label": "Folder" } }, el("h4", { text: "Folder" }), ...folder), ...edits);
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

    function rerender() { render(container, { session, active, draft, events, project, projectChoice, permissionLabel, busyReason, preparation }); }

    /* Project first: it is the first of the two decisions and the cheaper one to
     * change. On Home, before any chat exists, it is a choice; once a chat
     * exists it is that chat's fact and the sentence says why it stays. A
     * choice never touches the folder below it. */
    function renderProjectSection() {
      const section = el("section", { className: "location-section", attrs: { "aria-label": "Project" } }, el("h4", { text: "Project" }));
      if (projectChoice) {
        const list = el("div", { className: "workspace-options", attrs: { role: "group", "aria-label": "Project for this chat" } });
        for (const option of [{ id: null, name: "No project" }, ...projectChoice.options]) {
          const selected = option.id === (projectChoice.selectedId ?? null);
          const key = `project:${option.id ?? "none"}`;
          const button = el("button", { className: "quiet-button workspace-option", text: option.name,
            attrs: { type: "button", "aria-pressed": String(selected), "data-repository-field": key, title: option.name } });
          if (selected) button.append(el("span", { className: "workspace-choice-state", text: "Selected", attrs: { "aria-hidden": "true" } }));
          button.disabled = busy;
          // Focus first: not every browser focuses a button it clicks, and the
          // re-render that follows keeps the keyboard on the focused choice.
          button.addEventListener("click", () => { commandField = key; button.focus(); projectChoice.onChoose(option.id); });
          list.append(button);
        }
        const create = el("button", { className: "context-row", attrs: { type: "button", "data-repository-field": "project-new" } },
          semanticIcon("project.create", { size: 16 }), el("span", { text: "New project…" }));
        create.disabled = busy;
        create.addEventListener("click", () => projectChoice.onCreate());
        section.append(list, create, el("p", { className: "context-meta", text: PROJECT_HELP }));
      } else {
        section.append(el("p", { className: "location-value", text: project?.name || "No project" }));
        if (session) section.append(el("p", { className: "context-meta", text: PROJECT_FIXED }));
      }
      return section;
    }

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
          semanticIcon("workspace.object", { size: 16 }), el("span", { text: "Connect folder…" }));
        open.disabled = disabled;
        open.addEventListener("click", () => { commandField = "open"; chooseFolder(session, connectPath); });
        primary.append(open);
      }
      // CE-R1 · a lock held by another owner is said here too: this is the only
      // sentence an unbound chat's chooser has.
      primary.append(el("p", { className: "context-meta", text: busyReason || (active ? REPOSITORY_ACTIVE_RUN : choosing ? REPOSITORY_DIALOG_OPEN : `${REPOSITORY_SCOPE_LABEL}. ${REPOSITORY_HELP}`) }));
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
      const candidate = !resuming ? activeRepositoryCandidate(session) : null;
      const candidateRevision = session?.repositoryCandidateRevision ?? 0;
      const section = el("section", { className: "context-card location-section" }, el("h4", { text: "Edits" }));
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
      /* PA-R1 · an unfinished preparation still owns this chat's candidate
       * identities. Its own command finishes the work; the card's ordinary
       * create would mint new ones and be refused by the Host against the
       * revision the lost command already moved. */
      const start = el("button", {
        className: "quiet-button",
        text: pending ? SENDING_LABEL : resuming ? "Finish preparing this chat" : "Start private candidate",
        attrs: { type: "button", "data-repository-field": "start-edits" },
      });
      /* Continuing a preparation is how an unknown outcome is settled, so the
       * lock that stops the folder moving must not stop this: it is the way
       * out, not another thing landing beside it. Only a command actually in
       * flight, or a Run holding the chat, takes it away. */
      start.disabled = resuming ? pending || active : busy;
      start.addEventListener("click", () => {
        commandField = "start-edits";
        if (resuming) void resuming.onResume();
        else startCandidate();
      });
      section.append(
        /* One reason, said once: a bound chat's folder section already says
         * why it is locked, so here the section says what it is. An unfinished
         * preparation's folder section is silent, so its reason stays here. */
        el("p", { className: "context-meta", text: (busyReason && !resuming ? null : busyReason) || (active ? REPOSITORY_ACTIVE_RUN : resuming ? PREPARE_RESUME_SCOPE : CANDIDATE_HELP) }),
        start,
      );
      if (resuming?.error) section.append(el("p", { className: "inline-error", text: resuming.error, attrs: { role: "alert" } }));
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
