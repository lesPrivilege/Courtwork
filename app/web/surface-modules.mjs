/* WK-41 · The right column is a module rail. Every information surface in it is
 * a peer, declared once in the static table below. A module owns three things
 * and nothing else: how to turn the host's facts into its own schema, how that
 * schema reads as a collapsed card, and how it reads as an expanded pane.
 *
 * What a module must never own (WK-41): the column layout, the band, the module
 * order, the selected kind, the tab strip, the Escape order, the renderer
 * lifecycle, or any formal state. Those stay with the host in app.mjs, which is
 * why every entry here takes `host` and calls an intent on it instead of
 * touching application state. The intents are read-only navigation — open a
 * run, open a file, open a pane, ask for a refresh. No module writes.
 *
 * WK-45: a module consumes backend facts only. `adapter` returns null when the
 * facts for that module do not exist, and a null module is absent from the rail
 * rather than present-and-empty (WK-47 ablation: an empty card is a divider
 * without a fact). Where a provider or renderer is absent, the card is a
 * read-only text row with no button (WK-45 (3), boundaries §4).
 *
 * WK-56: the row, the card and the pane are three states of one primitive, so
 * the same schema feeds `card` and `pane`; only the field selection differs.
 */
import { el, icon, action } from "./ui-controls.mjs";
import { renderRun, runLabels, formatBytes } from "./inspector.mjs";
import { renderWorkspaceFilesView } from "./workspace-view.mjs";

/* WK-59 · The visible label of a card action is one word; the accessible name
 * stays complete, because a screen reader reads the button without the card
 * heading beside it. `action` writes the full name into aria-label and the
 * tooltip, so only the visible span is shortened. */
function openAction(fullName, focusKey, onClick) {
  const button = action("chevron-right", fullName, onClick, {
    className: "quiet-button rail-open",
    attrs: { "data-focus-key": focusKey },
  });
  button.classList.remove("icon-only");
  button.replaceChildren(
    el("span", { className: "button-label", text: "Open" }),
    icon("chevron-right"),
  );
  return button;
}

function retryAction(fullName, onClick) {
  const button = action("refresh-cw", fullName, onClick, {
    className: "secondary-button",
  });
  button.classList.remove("icon-only");
  button.replaceChildren(
    icon("refresh-cw"),
    el("span", { className: "button-label", text: "Retry" }),
  );
  return button;
}

/* The one card anatomy, shared by every module (WK-47 (2), Codex right-column
 * anatomy): a heading row of icon 16 + title + one count or state word + one
 * trailing action, then rows. No nested card, no progress bar, no percentage. */
function railCard(module, { stateWord, open }, ...rows) {
  const head = el(
    "div",
    { className: "rail-card-head" },
    icon(module.icon),
    el("h3", { className: "rail-card-title", text: module.title }),
    stateWord
      ? el("span", { className: "rail-card-state", text: stateWord })
      : null,
    open || null,
  );
  return el(
    "section",
    {
      className: "rail-card",
      attrs: { "aria-label": module.title, "data-module": module.kind },
    },
    head,
    ...rows,
  );
}

function railRow(label, value, { mono = false } = {}) {
  return el(
    "p",
    { className: "rail-row" },
    el("span", { className: "rail-row-label", text: label }),
    el("span", {
      className: mono ? "rail-row-value is-mono" : "rail-row-value",
      text: value,
    }),
  );
}

function fileRow(path, side, onOpen, focusKey) {
  const name = el("span", { className: "rail-file-name", text: path });
  const meta = side ? el("span", { className: "rail-file-side", text: side }) : null;
  if (!onOpen)
    return el("p", { className: "rail-file" }, icon("file-text"), name, meta);
  const button = el(
    "button",
    {
      className: "rail-file rail-file-open",
      attrs: { type: "button", "data-focus-key": focusKey },
    },
    icon("file-text"),
    name,
    meta,
  );
  button.addEventListener("click", onOpen);
  return button;
}

function clockRange(startedAt, endedAt) {
  const time = (value) => {
    const date = new Date(value || "");
    return Number.isFinite(date.valueOf())
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : null;
  };
  const from = time(startedAt);
  if (!from) return null;
  const to = time(endedAt);
  return to ? `${from} – ${to}` : from;
}

function contentVersions(run) {
  return (Array.isArray(run?.artifacts) ? run.artifacts : []).filter(
    (file) =>
      file.kind === "content-version" &&
      typeof file.path === "string" &&
      /^[a-f0-9]{64}$/.test(file.sha256),
  );
}

/* ---- run -------------------------------------------------------------------
 * Facts: state.runs (merged from GET /runs/:id) and state.events. The module is
 * present only while the host holds a run identity, which is the same condition
 * that shows the Run tab, so the card and the tab never disagree. */
const runModule = {
  kind: "run",
  title: "Run",
  icon: "activity",
  tabId: "surface-run-tab",
  contentId: "run-content",
  repaint: true,
  adapter({ sessionId, sessionTitle, runId, runs, events, recordedContext }) {
    if (!runId) return null;
    const run = runs.find((item) => item.id === runId);
    if (!run || run.sessionId !== sessionId) return null;
    return {
      sessionId,
      sessionTitle,
      run,
      events,
      recordedContext,
      artifacts: contentVersions(run),
      stateWord: runLabels[run.status] || run.status,
      window: clockRange(run.startedAt, run.endedAt),
    };
  },
  card(schema, host) {
    const rows = [];
    if (schema.window) rows.push(railRow("Recorded", schema.window));
    rows.push(
      railRow(
        "Results",
        schema.artifacts.length === 1
          ? "1 file"
          : `${schema.artifacts.length} files`,
      ),
    );
    /* The consequence sentence stays whole (WK-59): a recorded file is not an
     * accepted result, and nothing else on this card says so. */
    if (schema.artifacts.length)
      rows.push(
        el("p", {
          className: "rail-note",
          text: "Not accepted by a review.",
        }),
      );
    return railCard(
      runModule,
      {
        stateWord: schema.stateWord,
        open: openAction("Open run", "rail-open:run", () => host.open("run")),
      },
      ...rows,
    );
  },
  pane(schema, host) {
    renderRun(host.container("run"), {
      sessionTitle: schema?.sessionTitle,
      sessionId: host.sessionId(),
      run: schema?.run,
      events: schema?.events || [],
      onFile: host.openFile,
      onRefresh: host.refreshRun,
      // RC-5: the recorded half of the context, in the Run inspector that
      // already owns this run's identity. It never opens another surface.
      runtimeContext: schema?.recordedContext || null,
    });
  },
};

/* ---- file ------------------------------------------------------------------
 * Facts: the host's current file reference plus the content versions the run
 * already reported. The card states which of the two readings is open (IC-1:
 * "open the current file" and "read a recorded version" must stay apart) and
 * lists the other recorded versions of the same run as openable rows. */
const fileModule = {
  kind: "file",
  title: "File",
  icon: "file-text",
  tabId: "surface-file-tab",
  contentId: "file-content",
  adapter({ sessionId, fileRef, runId, runs }) {
    if (!fileRef || fileRef.sessionId !== sessionId) return null;
    const run = runs.find((item) => item.id === (fileRef.runId || runId));
    return {
      ref: fileRef,
      versions: contentVersions(run),
      stateWord: fileRef.kind === "current" ? "Current" : "Recorded",
    };
  },
  card(schema, host) {
    const rows = [
      fileRow(
        schema.ref.path,
        schema.ref.sha256 ? schema.ref.sha256.slice(0, 12) : null,
        null,
      ),
    ];
    const others = schema.versions.filter(
      (file) => file.sha256 !== schema.ref.sha256,
    );
    if (others.length) {
      rows.push(el("p", { className: "rail-group", text: "Recorded versions" }));
      for (const [index, file] of others.entries())
        rows.push(
          fileRow(
            file.path,
            formatBytes(file.bytes),
            () =>
              host.openFile({
                kind: "content-version",
                sessionId: schema.ref.sessionId,
                runId: file.runId || schema.ref.runId,
                path: file.path,
                sha256: file.sha256,
              }),
            `rail-file:${index}`,
          ),
        );
    }
    return railCard(
      fileModule,
      {
        stateWord: schema.stateWord,
        open: openAction("Open file", "rail-open:file", () =>
          host.open("file"),
        ),
      },
      ...rows,
    );
  },
  pane(schema, host) {
    host.loadFile(schema?.ref);
  },
};

/* ---- workspace -------------------------------------------------------------
 * Facts: GET /sessions/:id/workspace, fetched once by the host and handed to
 * both states. When an extension owns this surface the module states the owner
 * and nothing else: the renderer, not this card, is the authority on its own
 * content, and WK-45 (3) forbids an actionable control for absent content. */
const workspaceModule = {
  kind: "preview",
  title: "Workspace",
  icon: "folder",
  tabId: "surface-preview-tab",
  contentId: "surface-content",
  repaint: true,
  adapter({ sessionId, workspace, extension, slot, projection }) {
    if (!sessionId) return null;
    return {
      sessionId,
      extension: extension || null,
      slot: slot || null,
      projection: projection || null,
      files: Array.isArray(workspace?.files) ? workspace.files : null,
      error: workspace?.error || null,
    };
  },
  card(schema, host) {
    if (schema.extension) {
      /* WK-43 / 45 (3) · what this card says about a contributed surface is the
       * host's own slot resolution, not the extension's self-report. When the
       * renderer is not mounted the card carries a read-only line and its one
       * navigation action; it never offers an action of the producer's. */
      const statusLine = slotStatusLine(schema.slot);
      return railCard(
        workspaceModule,
        {
          stateWord: schema.extension.status || null,
          open: openAction("Open workspace", "rail-open:preview", () =>
            host.open("preview"),
          ),
        },
        el("p", {
          className: "rail-note",
          text:
            statusLine ||
            `${schema.extension.title || "An extension"} renders this workspace.`,
        }),
      );
    }
    const open = () =>
      openAction("Open workspace", "rail-open:preview", () =>
        host.open("preview"),
      );
    if (schema.error)
      return railCard(
        workspaceModule,
        { stateWord: null, open: open() },
        el("p", { className: "rail-note", text: schema.error }),
      );
    /* Before the tree has arrived the card states the module and its way in,
     * and nothing it does not yet know. */
    if (!schema.files)
      return railCard(workspaceModule, { stateWord: null, open: open() });
    const groups = new Map();
    for (const file of schema.files) {
      const slash = file.path.lastIndexOf("/");
      const directory = slash < 0 ? "Workspace root" : file.path.slice(0, slash);
      if (!groups.has(directory)) groups.set(directory, []);
      groups.get(directory).push(file);
    }
    const rows = [];
    for (const [directory, entries] of groups) {
      rows.push(el("p", { className: "rail-group", text: directory }));
      for (const file of entries)
        rows.push(
          fileRow(
            file.path.split("/").at(-1),
            formatBytes(file.bytes),
            () =>
              host.openFile({
                kind: "current",
                sessionId: schema.sessionId,
                path: file.path,
              }),
            `rail-file:${file.path}`,
          ),
        );
    }
    return railCard(
      workspaceModule,
      {
        stateWord:
          schema.files.length === 1 ? "1 file" : `${schema.files.length} files`,
        open: open(),
      },
      ...rows,
    );
  },
  pane(schema, host) {
    /* The extension branch keeps its own mount / update / dispose path in the
     * host; this module only renders the plain file tree. */
    if (schema?.extension) return;
    const container = host.container("preview");
    if (schema?.error) {
      container.replaceChildren(
        el("p", { className: "inline-error", text: schema.error }),
        retryAction("Retry loading workspace", host.refreshWorkspace),
      );
      return;
    }
    if (!schema?.files) {
      container.replaceChildren(
        el("p", { className: "form-help", text: "Loading workspace files…" }),
      );
      return;
    }
    renderWorkspaceFilesView(container, {
      files: schema.files,
      onFile: (path) =>
        host.openFile({ kind: "current", sessionId: schema.sessionId, path }),
      onRefresh: host.refreshWorkspace,
      onMaterials: host.openMaterials,
    });
  },
};

/* ---- runtime ---------------------------------------------------------------
 * The WO-RC module joins the rail as the fourth peer. Its pane is the module's
 * own view object, untouched; the card reads the snapshot summary that view
 * exposes, so the rail adds no second fetch and no second state machine. */
const runtimeModule = {
  kind: "runtime",
  title: "Runtime",
  icon: "settings-2",
  tabId: "surface-runtime-tab",
  contentId: "runtime-content",
  adapter({ sessionId, runtime }) {
    if (!sessionId) return null;
    return runtime || { loaded: false };
  },
  card(schema, host) {
    const rows = [];
    /* RC-4: while a run holds the runtime, a change is not refused — it is
     * deferred. That consequence is the one sentence this card keeps. */
    if (schema.frozen)
      rows.push(
        el("p", {
          className: "rail-note",
          text: "Frozen until this run ends.",
        }),
      );
    for (const [label, count] of schema.rows || [])
      rows.push(railRow(label, String(count)));
    return railCard(
      runtimeModule,
      {
        stateWord: Number.isFinite(schema.total)
          ? schema.total === 1
            ? "1 resource"
            : `${schema.total} resources`
          : null,
        open: openAction("Open runtime", "rail-open:runtime", () =>
          host.open("runtime"),
        ),
      },
      ...rows,
    );
  },
  pane(schema, host) {
    host.loadRuntime();
  },
};

/* The rail order. The tab strip keeps its own DOM order (a retained item in
 * docs/ui-composition.md): Workspace first, because it is the one kind that is
 * always there. The cards lead with the run and the file, because those are the
 * two the last message just changed. */
export const surfaceModules = [
  runModule,
  fileModule,
  workspaceModule,
  runtimeModule,
];

export function surfaceModule(kind) {
  return surfaceModules.find((module) => module.kind === kind) || null;
}

/* ---- declared slots --------------------------------------------------------
 * FN-20 · the slot belongs to the host. This table is the whole contract: an
 * id, the input the host will hand a contribution and its version, the intents
 * a contribution may raise, and what the host shows when nothing is mounted.
 * A contributor declares an intention to fill a slot; it does not register
 * renderer code by declaring it. `control-contract.d.ts:74`'s `uiSlots` is such
 * a declaration — a saved list of strings on an agent profile — and WK-43 / 45
 * are implemented on that reading: a declared slot with no loaded renderer is a
 * read-only row, never a button (WK-45 (3), boundaries §4).
 *
 * The commands a contribution may reach are not listed here and are not open:
 * they are exactly the ones the server advertises in that projection's
 * `humanActions` and revalidates on receipt (FN-17). There is no command
 * string channel and no dynamic module URL (FN-11 / FN-21). */
export const surfaceSlots = Object.freeze([
  Object.freeze({
    id: "work.surface",
    title: "Work surface",
    /* Which rail module carries the slot. The host, not the contribution,
     * decides where it sits, in what order, and under which tab (WK-41). */
    module: "preview",
    input: "ReviewProjection",
    inputVersion: 1,
    intents: Object.freeze(["open", "refresh"]),
    commands: "projection.humanActions",
    fallback: "read-only-row",
  }),
]);

export function surfaceSlot(id) {
  return surfaceSlots.find((slot) => slot.id === id) || null;
}

/* WK-45 (1) · the host resolves a slot from backend facts only, and from two
 * of them: the control-plane snapshot's selected profile (the declaration) and
 * the extension registry record the surface response carries (the producer and
 * its renderer). Nothing here fetches, and nothing here infers a state the
 * backend did not report.
 *
 * The four outcomes are kept apart on purpose (FN-24's failure table, FN-28):
 *   mounted            renderer loaded and its module path admitted
 *   renderer-absent    the producer is loaded but declares no renderer module
 *   producer-<status>  the producer exists but is unloaded / invalidated
 *   producer-absent    the registry has no record for the bound id
 * "Not declared" is a fifth, and is not the same as any of them: an unread
 * declaration is reported as unread, never as "no slot". */
export function resolveSurfaceSlot(
  slotId,
  { declaration = null, extension = null, binding = null, rendererUnavailable = false } = {},
) {
  const slot = surfaceSlot(slotId);
  if (!slot) return null;
  const declaredBy = [];
  /* An incompatible composition still declares its slots, but a declaration is
   * never the reason anything mounts, so it is recorded and set aside rather
   * than counted (FN-20; the missing ids are explained by the Runtime module
   * that owns that snapshot). */
  const declarationUsable =
    Boolean(declaration?.known) && declaration.status !== "incompatible";
  if (declarationUsable && declaration.slots?.includes(slot.id))
    declaredBy.push("profile");
  if (binding?.extensionId) declaredBy.push("binding");
  const contribution = extension?.surface || null;
  const status = extension?.status || null;
  const loaded = status === "loaded";
  const mount = Boolean(loaded && contribution?.module && !rendererUnavailable);
  const title =
    contribution?.title || extension?.title || binding?.extensionId || slot.title;
  let reason = null;
  if (!mount) {
    if (!extension) reason = binding?.extensionId ? "producer-absent" : "unbound";
    else if (!loaded) reason = `producer-${status || "unknown"}`;
    else reason = "renderer-absent";
  }
  return {
    slot,
    declaredBy,
    declared: declaredBy.length > 0,
    declarationKnown: Boolean(declaration?.known),
    declarationStatus: declaration?.status || null,
    declarationMissing: declaration?.missing || [],
    profileId: declaration?.profileId || null,
    extensionId: extension?.id || binding?.extensionId || null,
    generation: extension?.generation ?? null,
    status,
    title,
    module: contribution?.module || null,
    mount,
    reason,
  };
}

/* The one sentence the read-only row carries. Each branch names the object, the
 * condition and the consequence, and none of them offers an action
 * (copy-convention §1). `renderer not loaded` is the phrase WK10b fixes for the
 * declared-but-unmountable case. */
export function slotStatusLine(resolved) {
  if (!resolved) return null;
  if (resolved.mount) return null;
  if (resolved.reason === "renderer-absent")
    return `${resolved.title} · renderer not loaded`;
  if (resolved.reason === "producer-absent")
    return `${resolved.extensionId} · not installed`;
  if (resolved.reason === "unbound") return null;
  return `${resolved.title} · ${resolved.status || "unknown"}`;
}
