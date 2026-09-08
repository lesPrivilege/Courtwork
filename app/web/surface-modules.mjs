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
import { el, icon, action, flowRow } from "./ui-controls.mjs";
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
      const rows = [
        el("p", {
          className: "rail-note",
          text:
            statusLine ||
            `${schema.extension.title || "An extension"} renders this workspace.`,
        }),
      ];
      /* WO-WK10b 第二段 · the collapsed card reads the same packet the pane
       * reads, from the same host field, so inline and detail can never state
       * two different versions of one work state. It carries the identity and
       * the counts; the rules themselves belong to the pane. */
      const packet = workPacket(schema.projection);
      if (packet?.hasCandidates) {
        if (packet.version !== null) rows.push(railRow("Version", String(packet.version)));
        rows.push(
          railRow(
            "Candidates",
            packet.candidates.length === 1
              ? "1 candidate"
              : `${packet.candidates.length} candidates`,
          ),
        );
        const open = packet.candidates.find(
          (candidate) => candidate.status === "pending" && candidate.review,
        );
        if (open?.review?.unresolved !== null && open?.review?.unresolved !== undefined)
          rows.push(
            railRow(
              "Unresolved",
              open.review.unresolved === 1
                ? "1 rule"
                : `${open.review.unresolved} rules`,
            ),
          );
        if (packet.stateVersion)
          rows.push(railRow("State", packet.stateVersion.slice(0, 12), { mono: true }));
      }
      return railCard(
        workspaceModule,
        {
          stateWord: schema.extension.status || null,
          open: openAction("Open workspace", "rail-open:preview", () =>
            host.open("preview"),
          ),
        },
        ...rows,
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

/* ---- the Work packet reading (WO-WK10b 第二段) -----------------------------
 * FN-25 / frontend-entries 3.1 & 3.3 · one reading of a Work packet, used by
 * two callers that must never disagree: the host's read-only fallback (the
 * producer is absent, unloaded, or its renderer could not be read) and the
 * inbound-NDA renderer (the producer is loaded and the packet advertises legal
 * actions). Building it twice would be a second anatomy for one object, so the
 * rows, the words and the field selection live here once and the caller only
 * adds what it is allowed to add: controls.
 *
 * Nothing here fetches, infers completeness, or writes. Every field it prints
 * is a field the server put in the packet; a field the packet does not carry is
 * absent from the reading rather than filled in (WK-45 (3), FN-28).
 */

/* The identity of a Candidate or a Source is a hash-shaped string. A row shows
 * enough of it to tell two apart; the expanded anchor keeps the exact bytes,
 * because that is what a person checks a quote against. */
export function shortRef(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return text.length > 24 ? `${text.slice(0, 20)}…` : text;
}

/* The one place the domain's own status words become visible. They are printed
 * as the packet spelled them — the frontend does not translate, rank or
 * recompute them (WO-WK10b 第二段「状态词按 packet 原值」). Only `conflict` is
 * allowed a colour: it is the one word that says two read facts disagree.
 * `unknown` stays grey on purpose, because unknown is not failed (FN-28), and
 * the word itself is always present, so colour is never the only carrier. */
const FLAGGED_STATUS = new Set(["conflict"]);

function statusMeta(status) {
  return {
    text: status === null || status === undefined ? "" : String(status),
    flagged: FLAGGED_STATUS.has(status),
  };
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/* A domain review, as this product can read it: one finding per rule, each with
 * the packet's own status word, one reason, and its source anchors. A candidate
 * without this shape is not a review; it stays a plain candidate and its
 * artifact text is what the reading shows. */
function domainReview(candidate) {
  const domain = isRecord(candidate?.domain) ? candidate.domain : null;
  /* FN-24 «schema 不兼容» · the decoder test is the payload's own declared
   * version, not the envelope's `compatibility` word. A producer-absent packet
   * is `read_only` and still perfectly decodable; a payload whose
   * `schemaVersion` this build does not know is not readable even when the
   * producer is loaded. The two are separate facts and are kept apart. */
  if (!domain || domain.schemaVersion !== 1 || !Array.isArray(domain.findings)) return null;
  const reconciliation = isRecord(domain.reconciliation) ? domain.reconciliation : null;
  const unresolved = Array.isArray(reconciliation?.unresolvedRuleIds)
    ? reconciliation.unresolvedRuleIds.length
    : null;
  return {
    contractVersion: domain.contractVersion ?? null,
    playbookVersion: domain.playbookVersion ?? null,
    schemaVersion: domain.schemaVersion ?? null,
    facts: isRecord(domain.facts) ? domain.facts : null,
    reconciliation,
    reconciliationStatus: reconciliation?.status ?? null,
    unresolved,
    findings: domain.findings.filter(isRecord).map((finding) => ({
      ruleId: finding.ruleId ?? null,
      status: finding.status ?? null,
      reason: finding.reason ?? null,
      evidence: (Array.isArray(finding.evidence) ? finding.evidence : []).filter(isRecord),
    })),
  };
}

/* The whole packet, normalised once. The view model carries no default that the
 * packet did not state: an absent field is `null` and its row is not drawn. */
export function workPacket(projection) {
  if (!isRecord(projection)) return null;
  const matter = isRecord(projection.matter) ? projection.matter : {};
  const candidates = (Array.isArray(projection.candidates) ? projection.candidates : []).filter(isRecord);
  const packet = {
    title: projection.title ?? matter.id ?? null,
    matterId: matter.id ?? null,
    version: matter.version ?? null,
    sourceVersion: matter.source_version ?? null,
    contractVersion: projection.contractVersion ?? matter.contract_version ?? null,
    activeArtifact: matter.active_artifact ?? null,
    obligations: Array.isArray(matter.obligations) ? matter.obligations : [],
    stateVersion: typeof projection.stateVersion === "string" ? projection.stateVersion : null,
    readOnly: projection.readOnly === true,
    compatibility: projection.compatibility ?? null,
    sources: (Array.isArray(projection.sources) ? projection.sources : []).filter(isRecord),
    artifact: isRecord(projection.artifact) ? projection.artifact : null,
    decisions: (Array.isArray(projection.decisions) ? projection.decisions : []).filter(isRecord),
    humanActions: (Array.isArray(projection.humanActions) ? projection.humanActions : []).filter(isRecord),
    candidates: candidates.map((candidate) => ({
      id: candidate.id ?? null,
      status: candidate.status ?? null,
      baseVersion: candidate.base_version ?? null,
      sourceVersion: candidate.source_version ?? null,
      contractVersion: candidate.contract_version ?? null,
      supersedes: candidate.supersedes ?? null,
      provenance: isRecord(candidate.provenance) ? candidate.provenance : null,
      artifactText: candidate.artifact_text ?? null,
      /* The parent bytes a human revision starts from. It is handed on
       * unchanged; nothing in this module edits or recomputes a domain. */
      domainRaw: isRecord(candidate.domain) ? candidate.domain : null,
      domainSchemaVersion: isRecord(candidate.domain) ? (candidate.domain.schemaVersion ?? null) : null,
      review: domainReview(candidate),
    })),
  };
  packet.isReview = packet.candidates.some((candidate) => candidate.review);
  /* Whether this projection is a Work packet at all. A contributed surface that
   * is not work has no `candidates` array, and the reading below must not be
   * drawn for it: «no candidate has been proposed yet» would be a claim about
   * an object that does not exist (FN-28, boundaries §4). A work packet whose
   * domain payload this build cannot decode is still a work packet, and is
   * still read — as an envelope. */
  packet.hasCandidates = packet.candidates.length > 0;
  return packet;
}

/* Whether a legal action for this candidate is advertised, and with which
 * payload. The descriptor is the only authority: an action this packet does not
 * carry is not drawn, and an action whose `schemaVersion` this build does not
 * know stays non-executable (contract «Unknown action versions/names must
 * remain non-executable»). */
export function candidateActions(packet, candidateId) {
  const known = (action) => action.schemaVersion === 1;
  const forCandidate = (action) =>
    action.payloadSchema?.properties?.candidate_id?.const === candidateId;
  const decide = packet.humanActions.find(
    (item) => item.action === "decide" && known(item) && forCandidate(item),
  );
  const revise = packet.humanActions.find(
    (item) => item.action === "revise_candidate" && known(item) && forCandidate(item),
  );
  const decisions = Array.isArray(decide?.payloadSchema?.properties?.action?.enum)
    ? decide.payloadSchema.properties.action.enum.filter((value) => typeof value === "string")
    : [];
  return {
    decide: decide
      ? {
          descriptor: decide,
          decisions,
          candidateId: decide.payloadSchema?.properties?.candidate_id?.const ?? null,
          baseVersion: decide.payloadSchema?.properties?.base_version?.const ?? null,
        }
      : null,
    revise: revise
      ? {
          descriptor: revise,
          candidateId: revise.payloadSchema?.properties?.candidate_id?.const ?? null,
          baseVersion: revise.payloadSchema?.properties?.base_version?.const ?? null,
        }
      : null,
  };
}

/* `stateVersionShown` is the caller saying it has already printed the work
 * state on a row of its own. One fact, one place: the host's fallback carries
 * it in its identity line, so repeating it here would be the same twelve
 * characters twice on adjacent lines (WK-47). */
function factsLine(packet, { stateVersionShown = false } = {}) {
  const facts = [];
  if (packet.version !== null) facts.push(`version ${packet.version}`);
  if (packet.sourceVersion !== null) facts.push(`source revision ${packet.sourceVersion}`);
  if (packet.stateVersion && !stateVersionShown)
    facts.push(`state ${packet.stateVersion.slice(0, 12)}`);
  return facts.join(" · ");
}

function anchorLine(anchor) {
  return `${anchor.source_id ?? "?"}:${anchor.source_version ?? "?"} [${anchor.start ?? "?"}, ${anchor.end ?? "?"}]`;
}

/* One rule, one row: the rule's own id, the packet's status word, and the
 * reason under it. The anchors and the frozen quote are the expanded state,
 * because a person reads them to check the finding, not to scan the list. */
function ruleRow(finding, candidate, hooks, open) {
  const meta = statusMeta(finding.status);
  const row = el("details", {
    className: `rule-row${meta.flagged ? " is-flagged" : ""}`,
  });
  row.open = open;
  row.append(
    flowRow("summary", {
      glyph: "file-text",
      title: finding.ruleId || "Rule",
      meta: meta.text,
    }),
  );
  const body = el("div", { className: "rule-detail" });
  if (finding.reason) body.append(el("p", { className: "rule-reason", text: finding.reason }));
  for (const anchor of finding.evidence) {
    const block = el("div", { className: "rule-anchor" });
    block.append(el("p", { className: "rule-anchor-ref is-mono", text: anchorLine(anchor) }));
    if (anchor.quote !== undefined && anchor.quote !== null)
      block.append(el("blockquote", { className: "rule-quote", text: String(anchor.quote) }));
    /* The bytes behind an old quote are read from that candidate's own frozen
     * revision, never from the Matter's current sources (WO-WK10b 第二段, item
     * «历史来源字节»). The host owns the read; this view only asks for it. */
    if (typeof hooks.onReadSource === "function" && anchor.source_id)
      block.append(
        readSourceControl(block, hooks, {
          candidateId: candidate.id,
          sourceId: anchor.source_id,
          version: anchor.source_version,
        }),
      );
    body.append(block);
  }
  if (!finding.evidence.length)
    body.append(el("p", { className: "work-note", text: "This finding records no source anchor." }));
  row.append(body);
  if (typeof hooks.onToggle === "function")
    row.addEventListener("toggle", () => hooks.onToggle(candidate.id, finding.ruleId, row.open));
  return row;
}

function readSourceControl(block, hooks, request) {
  const button = el("button", {
    className: "quiet-button",
    attrs: { type: "button" },
    text: "Read the recorded source",
  });
  button.addEventListener("click", async () => {
    button.disabled = true;
    const status = el("p", { className: "work-note", text: "Reading the recorded source…" });
    block.append(status);
    try {
      const source = await hooks.onReadSource(request);
      const text = source && typeof source.text === "string" ? source.text : null;
      status.replaceWith(
        text === null
          ? el("p", { className: "inline-error", text: "The recorded source could not be read." })
          : el(
              "div",
              { className: "rule-source" },
              el("p", {
                className: "work-note is-mono",
                text: `${request.sourceId}:${source.version ?? request.version}`,
              }),
              el("pre", { className: "rule-source-text", text }),
            ),
      );
    } catch (error) {
      status.replaceWith(el("p", { className: "inline-error", text: error.message }));
    } finally {
      button.disabled = false;
    }
  });
  return button;
}

function keyValueList(record) {
  const list = el("div", { className: "projection-list" });
  for (const [key, value] of Object.entries(record))
    list.append(
      el(
        "div",
        { className: "projection-item" },
        el("span", { className: "projection-key", text: key }),
        el("span", {
          className: "projection-value",
          text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
        }),
      ),
    );
  return list;
}

function candidateArticle(candidate, packet, hooks) {
  const article = el("article", { className: "work-candidate" });
  article.append(
    flowRow("div", {
      glyph: "file-text",
      title: shortRef(candidate.id),
      meta: statusMeta(candidate.status).text,
      className: "work-candidate-head",
    }),
  );
  const identity = [];
  if (candidate.baseVersion !== null) identity.push(`base version ${candidate.baseVersion}`);
  if (candidate.sourceVersion !== null) identity.push(`source revision ${candidate.sourceVersion}`);
  /* Lineage is a fact of the packet, and the old candidate it names stays in
   * this same list: a revision never replaces or rewrites its parent. */
  if (candidate.supersedes) identity.push(`supersedes ${shortRef(candidate.supersedes)}`);
  if (candidate.provenance?.kind)
    identity.push(String(candidate.provenance.kind).replaceAll("_", " "));
  if (identity.length) article.append(el("p", { className: "work-note", text: identity.join(" · ") }));
  const review = candidate.review;
  if (review) {
    /* The playbook version and the reconciliation are stated once per
     * candidate, not once per rule: they belong to the review, and repeating
     * them on four rows answers nothing new (WK-47). */
    const summary = [];
    if (review.playbookVersion) summary.push(`playbook ${review.playbookVersion}`);
    if (review.reconciliationStatus) summary.push(String(review.reconciliationStatus));
    if (review.unresolved !== null)
      summary.push(
        review.unresolved === 1 ? "1 unresolved rule" : `${review.unresolved} unresolved rules`,
      );
    if (summary.length)
      article.append(el("p", { className: "work-note", text: summary.join(" · ") }));
    const rules = el("div", { className: "rule-rows" });
    for (const finding of review.findings)
      rules.append(
        ruleRow(
          finding,
          candidate,
          hooks,
          Boolean(hooks.expanded?.has(`${candidate.id}|${finding.ruleId}`)),
        ),
      );
    article.append(rules);
    if (review.facts) {
      const facts = el("details", { className: "work-facts-block" });
      facts.append(
        flowRow("summary", { glyph: "folder", title: "Recorded facts" }),
        keyValueList(review.facts),
      );
      article.append(facts);
    }
  } else {
    /* A candidate that carries a domain payload this build cannot decode says
     * so, and shows the text the packet itself recorded. It never guesses at
     * field names to reconstruct findings (FN-24 «按字段名猜 accepted»). */
    if (candidate.domainRaw)
      article.append(
        el("p", {
          className: "work-note",
          text: `domain schema ${candidate.domainSchemaVersion ?? "unstated"} · not readable by this build`,
        }),
      );
    if (candidate.artifactText)
      article.append(el("pre", { className: "work-artifact-text", text: candidate.artifactText }));
  }
  const controls = typeof hooks.candidateControls === "function"
    ? hooks.candidateControls(candidate, packet)
    : null;
  if (controls) article.append(controls);
  return article;
}

/* The visible words for a decision. They name the object the decision was
 * about — a version of this review — instead of the bare verb, because a bare
 * «Accept» does not say what was accepted (FN-18, copy-convention §2). */
export const decisionWords = Object.freeze({
  accept: "Accepted this version",
  reject: "Rejected",
  request_evidence: "Evidence requested",
});

export const decisionActionWords = Object.freeze({
  accept: "Accept this version",
  reject: "Reject",
  request_evidence: "Request evidence",
});

function decisionRow(decision) {
  const row = el("details", { className: "work-decision" });
  row.append(
    flowRow("summary", {
      glyph: "file-text",
      title: shortRef(decision.candidate_id),
      meta: decisionWords[decision.action] || String(decision.action ?? ""),
    }),
  );
  const facts = [];
  if (decision.result?.version !== undefined) facts.push(`version ${decision.result.version}`);
  if (decision.request_id) facts.push(`request ${shortRef(decision.request_id)}`);
  if (decision.actor?.kind) facts.push(String(decision.actor.kind).replaceAll("_", " "));
  const body = el("div", { className: "work-decision-detail" });
  if (facts.length) body.append(el("p", { className: "work-note", text: facts.join(" · ") }));
  if (decision.reason) body.append(el("p", { className: "rule-reason", text: decision.reason }));
  row.append(body);
  return row;
}

function block(title, ...children) {
  return el("section", { className: "work-block" }, el("h4", { text: title }), ...children);
}

/* The reading itself. `hooks` is the only way a caller adds anything, and it
 * can add exactly three things: controls for one candidate, a historical source
 * read, and the open/closed memory of the rule rows. It cannot add a fact. */
export function renderWorkPacket(packet, hooks = {}) {
  const root = el("div", { className: "work-packet" });
  if (!packet) return root;
  const line = factsLine(packet, hooks);
  if (line) root.append(el("p", { className: "work-note", text: line }));
  if (packet.candidates.length)
    root.append(
      block(
        packet.candidates.length === 1 ? "Candidate" : "Candidates",
        ...packet.candidates.map((candidate) => candidateArticle(candidate, packet, hooks)),
      ),
    );
  else
    root.append(
      block(
        "Candidates",
        el("p", { className: "work-note", text: "No candidate has been proposed yet." }),
      ),
    );
  if (packet.decisions.length)
    root.append(block("Decisions", ...packet.decisions.map(decisionRow)));
  if (packet.artifact)
    root.append(
      block(
        "Accepted version",
        el("p", { className: "work-note is-mono", text: shortRef(packet.artifact.id) }),
        el("pre", { className: "work-artifact-text", text: String(packet.artifact.content ?? "") }),
      ),
    );
  if (packet.sources.length)
    root.append(
      block(
        packet.sources.length === 1 ? "Source" : "Sources",
        ...packet.sources.map((source) =>
          el("p", {
            className: "work-note is-mono",
            text: `${source.id}:${source.version} · ${String(source.digest ?? "").slice(0, 12)}`,
          }),
        ),
      ),
    );
  return root;
}
