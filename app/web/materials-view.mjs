import { el, icon, action, copyAction } from "./ui-controls.mjs";
import { formatBytes } from "./inspector.mjs";
import { renderDiff } from "./diff-view.mjs";

const MAX_UPLOAD_BYTES = 1_048_576;
const fingerprint = (name, text) => JSON.stringify([name, text]);

function uploadId() {
  if (typeof globalThis.crypto?.randomUUID !== "function")
    throw new Error("A secure upload command ID could not be created.");
  return globalThis.crypto.randomUUID();
}

function recordedDate(value) {
  const date = new Date(value || "");
  return Number.isFinite(date.valueOf()) ? date.toLocaleString() : "Date unavailable";
}

function validSourceList(result) {
  return result && Array.isArray(result.sources) &&
    ["complete", "partial"].includes(result.coverage) &&
    Number.isSafeInteger(result.limit) && result.limit > 0 &&
    result.sources.every(source =>
      source && typeof source.sourceId === "string" && source.sourceId.length > 0 &&
      typeof source.name === "string" && source.name.length > 0 &&
      source.path === `materials/${source.name}` &&
      Number.isSafeInteger(source.latestRevision) && source.latestRevision > 0);
}

export function createMaterialsView({ request, getSession, onOpenFile, notify }) {
  const list = document.getElementById("workspace-files");
  const form = document.getElementById("material-form");
  const error = document.getElementById("material-error");
  const name = document.getElementById("material-name");
  const text = document.getElementById("material-text");
  const submit = document.getElementById("material-submit");
  const upload = document.getElementById("material-upload");
  const dialog = document.getElementById("materials-dialog");
  let sessionId = null;
  let sessionEpoch = 0;
  let workspaceGeneration = 0;
  let sourceGeneration = 0;
  let workspaceController = null;
  let sourceController = null;
  let workspaceStatus = "idle";
  let sourceStatus = "idle";
  let files = [];
  let sources = [];
  let sourceCoverage = "complete";
  let sourceLimit = 0;
  let expandedSources = new Set();
  let sourceDetails = new Map();
  let detailControllers = new Map();
  let detailGenerations = new Map();
  let versionCache = new Map();
  let comparisonSelections = new Map();
  let comparisonStates = new Map();
  let comparisonControllers = new Map();
  let comparisonGenerations = new Map();
  let comparisonButtons = new Map();
  let busy = false;
  let commandState = null;
  let linkRetry = null;
  let conflict = null;
  let fileReturn = null;
  let fileDraft = null;

  const activeScope = (id = sessionId, epoch = sessionEpoch) =>
    Boolean(id && id === sessionId && id === getSession()?.id && epoch === sessionEpoch);
  const displayFingerprint = () => fingerprint(name.value.trim(), text.value);
  const displayedFileDraft = () => fileDraft?.displayFingerprint === displayFingerprint() ? fileDraft : null;
  const currentFingerprint = () => fingerprint(name.value.trim(), displayedFileDraft()?.originalText ?? text.value);
  const sourceNamed = value => sources.find(source => source.name === value) ?? null;

  function focusSavedSourceSummary(savedName, id, epoch, focusAtSubmit) {
    if (!activeScope(id, epoch) || (document.activeElement !== focusAtSubmit && document.activeElement !== document.body)) return;
    const saved = sourceNamed(savedName);
    const summary = saved
      ? sourceDetails.get(saved.sourceId)?.row.querySelector("summary")
      : null;
    const target = summary || document.getElementById("material-add")?.querySelector("summary");
    target?.focus({ preventScroll: true });
  }

  function restoreSourceRefreshFocus(previousButton, id, epoch, dialogWasOpen) {
    if (!previousButton || !dialogWasOpen || !dialog.open || !activeScope(id, epoch) || list.contains(previousButton)) return;
    if (document.activeElement !== previousButton && document.activeElement !== document.body) return;
    list.querySelector('button[aria-label="Refresh retained uploads"]')?.focus({ preventScroll: true });
  }

  function fail(message, { buttonLabel, buttonAction } = {}) {
    error.replaceChildren(el("span", { text: message }));
    if (buttonLabel && buttonAction) {
      const button = el("button", {
        className: "text-button",
        text: buttonLabel,
        attrs: { type: "button" },
      });
      button.addEventListener("click", buttonAction);
      error.append(button);
    }
    error.hidden = false;
  }

  function clearError() {
    error.hidden = true;
    error.replaceChildren();
  }

  function updateSubmit() {
    const currentName = name.value.trim();
    const matched = sourceNamed(currentName);
    const unlistedWithPartialCoverage = sourceCoverage === "partial" && !matched;
    const conflictNeedsReview = conflict && (
      conflict.phase !== "review" ||
      conflict.reviewedRevision !== matched?.latestRevision
    );
    submit.disabled = busy || !activeScope() || sourceStatus !== "ready" ||
      unlistedWithPartialCoverage || Boolean(conflictNeedsReview);

    if (linkRetry?.fingerprint === currentFingerprint()) {
      submit.textContent = "Retry retained upload";
    } else if (matched) {
      submit.textContent = `Save revision ${matched.latestRevision + 1}`;
    } else {
      submit.textContent = "Add material";
    }
  }

  function setCoverageNote(target) {
    if (sourceCoverage === "partial") {
      target.append(el("p", {
        className: "form-help",
        text: `Showing up to ${sourceLimit} retained uploads. The list is incomplete; a name that is not shown cannot be safely replaced here.`,
      }));
    } else if (sourceStatus === "ready") {
      target.append(el("p", {
        className: "form-help",
        text: `All ${sources.length} retained uploads are listed · list limit ${sourceLimit}.`,
      }));
    }
  }

  function renderWorkspace() {
    const section = el("section", { className: "workspace-file-section" });
    section.append(el(
      "div",
      { className: "section-heading" },
      el("h3", { text: `Workspace files · ${files.length}` }),
      action("refresh-cw", "Refresh workspace files", () => void refreshWorkspace()),
    ));
    if (workspaceStatus === "loading") {
      section.append(el("p", { className: "form-help", text: "Loading chat files…" }));
    } else if (workspaceStatus === "error") {
      section.append(
        el("p", { className: "inline-error", text: "Workspace files could not be loaded." }),
        action("refresh-cw", "Retry loading workspace files", () => void refreshWorkspace(), { className: "secondary-button" }),
      );
    } else if (!files.length) {
      section.append(el("p", {
        className: "form-help",
        text: "Files written by the agent also appear here.",
      }));
    } else {
      for (const file of files) {
        const row = el(
          "button",
          { className: "workspace-file-row", attrs: { type: "button" } },
          icon("file-text"),
          el("span", { className: "file-name", text: file.path }),
          el("span", { className: "file-size", text: formatBytes(file.bytes) }),
        );
        row.addEventListener("click", () => {
          if (!activeScope()) return;
          dialog.close();
          onOpenFile({ kind: "current", sessionId, path: file.path });
        });
        section.append(row);
      }
    }
    return section;
  }

  function renderVersions(source, body, versionsResult, ownEpoch) {
    if (!activeScope(sessionId, ownEpoch) || !body.parentNode) return;
    const versions = versionsResult.versions;
    body.replaceChildren();
    body.append(el("p", {
      className: "form-help",
      text: versionsResult.coverage === "partial"
        ? `Showing up to ${versionsResult.limit} revisions. Older retained versions are not listed here.`
        : `All ${versions.length} retained revisions are listed · version limit ${versionsResult.limit}.`,
    }));
    if (!versions.length) {
      body.append(el("p", { className: "form-help", text: "No retained versions are available." }));
      return;
    }
    const versionList = el("div", { className: "retained-version-list" });
    for (const version of versions) {
      const ref = {
        kind: "retained-source",
        sessionId,
        sourceId: source.sourceId,
        revision: version.revision,
        path: source.path,
        sha256: version.sha256,
        bytes: version.bytes,
      };
      const row = el(
        "div",
        { className: "retained-version-entry" },
        el(
          "button",
          {
            className: "workspace-file-row retained-version-open",
            attrs: { type: "button", "aria-label": `Open ${source.name}, revision ${version.revision}` },
          },
          icon("file-text", { size: 16 }),
          el("span", { className: "file-name", text: `Revision ${version.revision}` }),
          el("span", { className: "file-size", text: formatBytes(version.bytes) }),
        ),
      );
      const open = row.querySelector("button");
      const focusKey = `retained-version:${source.sourceId}:${version.revision}`;
      open.setAttribute("data-focus-key", focusKey);
      open.addEventListener("click", () => {
        if (!activeScope(sessionId, ownEpoch)) return;
        if (conflict?.phase === "review" && conflict.name === source.name &&
            version.revision === versionsResult.latestRevision) {
          conflict.reviewedRevision = version.revision;
          const reviewNote = list.querySelector(".retained-review-prompt");
          if (reviewNote) {
            reviewNote.className = "form-help retained-review-status";
            reviewNote.textContent = `Revision ${version.revision} was opened. Saving will add revision ${version.revision + 1}.`;
          }
          updateSubmit();
        }
        const opener = [...list.querySelectorAll("button.retained-version-open")]
          .find(button => button.dataset.focusKey === focusKey) || open;
        fileReturn = {
          sessionId,
          epoch: ownEpoch,
          sourceId: source.sourceId,
          revision: version.revision,
          focusKey,
          opener,
          scrollTop: list.scrollTop,
        };
        dialog.close();
        onOpenFile(ref, opener);
      });
      const details = el(
        "details",
        { className: "version-details", attrs: { "data-section": `retained-version-${source.sourceId}-${version.revision}` } },
        el("summary", { text: "Version details" }),
        el("div", { className: "version-line" },
          el("code", { text: version.sha256 }),
          copyAction(version.sha256, "Copy retained version hash", `retained-hash:${source.sourceId}:${version.revision}`)),
        el("p", { className: "form-help", text: `Retained ${recordedDate(version.createdAt)} · ${version.bytes.toLocaleString()} bytes` }),
      );
      row.append(details);
      versionList.append(row);
    }
    body.append(versionList);
    renderComparisonControls(source, body, versionsResult, ownEpoch);
    if (conflict?.phase === "review" && conflict.name === source.name) {
      const ready = conflict.reviewedRevision === versionsResult.latestRevision;
      body.append(el("p", {
        className: ready ? "form-help retained-review-status" : "form-help retained-review-prompt",
        text: ready
          ? `Revision ${versionsResult.latestRevision} was opened. Saving will add revision ${versionsResult.latestRevision + 1}.`
          : `The upload changed during your save. Open revision ${versionsResult.latestRevision} in File Inspector to review it before saving.`,
      }));
    }
  }

  function renderComparisonOutput(target, state) {
    target.replaceChildren();
    if (!state || state.status === "idle") {
      target.append(el("p", {
        className: "form-help",
        text: state?.message || "Choose two retained revisions and compare them.",
      }));
      return;
    }
    if (state.status === "loading") {
      target.append(el("p", { className: "form-help", text: `Comparing revision ${state.fromRevision} with revision ${state.toRevision}…` }));
      return;
    }
    if (state.status === "error") {
      target.append(el("p", { className: "inline-error", text: state.error }));
      return;
    }
    const result = state.result;
    target.append(el("p", {
      className: "form-help retained-comparison-label",
      text: `Comparison · revision ${result.from.revision} → revision ${result.to.revision} · latest retained at comparison: revision ${result.latestRetainedRevision}`,
    }));
    target.append(el("p", {
      className: "form-help",
      text: "Latest retained is a history fact; formal adoption is handled separately in Work Review.",
    }));
    if (result.status === "limited") {
      target.append(el("p", { className: "inline-notice", text: result.reason }));
      return;
    }
    target.append(renderDiff(result.rows, {
      label: `${sourceLabel(result.path)} revision ${result.from.revision} to revision ${result.to.revision}`,
    }));
  }

  function sourceLabel(path) {
    return path.slice("materials/".length);
  }

  function validComparisonResult(result, source, from, to, id) {
    const matches = (identity, version) => identity &&
      identity.kind === "retained-source" && identity.sessionId === id &&
      identity.sourceId === source.sourceId && identity.revision === version.revision &&
      identity.path === source.path && identity.sha256 === version.sha256 &&
      identity.bytes === version.bytes && identity.representation === "original-utf8-v1";
    if (!result || result.sourceId !== source.sourceId || result.path !== source.path ||
        !matches(result.from, from) || !matches(result.to, to) ||
        !Number.isSafeInteger(result.latestRetainedRevision) || result.latestRetainedRevision < 1 ||
        typeof result.identical !== "boolean" || !result.limits || !Array.isArray(result.rows)) return false;
    if (result.status === "limited") return typeof result.reason === "string" && result.reason.length > 0 && result.rows.length === 0;
    return result.status === "complete" && result.rows.every(row => row &&
      ["context", "add", "del"].includes(row.kind) && typeof row.text === "string" &&
      (row.oldNo == null || Number.isSafeInteger(row.oldNo)) &&
      (row.newNo == null || Number.isSafeInteger(row.newNo)) &&
      (row.noNewline == null || typeof row.noNewline === "boolean"));
  }

  function currentComparisonPanel(sourceId) {
    return sourceDetails.get(sourceId)?.body.querySelector(".retained-comparison-result") ?? null;
  }

  function cancelComparison(sourceId, message = "") {
    comparisonControllers.get(sourceId)?.abort();
    comparisonControllers.delete(sourceId);
    comparisonGenerations.set(sourceId, (comparisonGenerations.get(sourceId) || 0) + 1);
    const state = comparisonStates.get(sourceId);
    if (state?.status === "loading") comparisonStates.set(sourceId, { status: "idle", message });
    const button = comparisonButtons.get(sourceId);
    const selection = comparisonSelections.get(sourceId);
    if (button) {
      button.disabled = !selection?.from || !selection?.to || selection.from === selection.to;
      button.removeAttribute("aria-disabled");
    }
    const panel = currentComparisonPanel(sourceId);
    if (panel && state?.status === "loading") renderComparisonOutput(panel, comparisonStates.get(sourceId));
  }

  function renderComparisonControls(source, body, versionsResult, ownEpoch) {
    const versions = new Map(versionsResult.versions.map(version => [version.revision, version]));
    const prior = comparisonSelections.get(source.sourceId) || { from: "", to: "" };
    const controls = el("section", { className: "retained-comparison" });
    controls.append(el("h4", { text: "Compare retained revisions" }));

    function revisionSelect(labelText, className, selected, retainedSelection) {
      const select = el("select", { className, attrs: { "aria-label": labelText } });
      select.append(el("option", { text: "Choose a revision", attrs: { value: "" } }));
      for (const version of versionsResult.versions) {
        select.append(el("option", {
          text: `Revision ${version.revision} · ${formatBytes(version.bytes)}`,
          attrs: { value: String(version.revision) },
        }));
      }
      const selectedRevision = Number(selected);
      if (selected && !versions.has(selectedRevision) && retainedSelection?.revision === selectedRevision) {
        select.append(el("option", {
          text: `Revision ${selectedRevision} · previously listed`,
          attrs: { value: String(selectedRevision) },
        }));
      }
      select.value = !selected || versions.has(selectedRevision) || retainedSelection?.revision === selectedRevision
        ? String(selected || "")
        : "";
      return select;
    }

    const from = revisionSelect("From revision", "retained-compare-from", prior.from, prior.fromVersion);
    const to = revisionSelect("To revision", "retained-compare-to", prior.to, prior.toVersion);
    const compare = el("button", {
      className: "secondary-button retained-compare-button",
      text: "Compare",
      attrs: { type: "button" },
    });
    const output = el("div", { className: "retained-comparison-result", attrs: { "aria-live": "polite" } });
    const selectedVersion = side => {
      const value = side === "from" ? from.value : to.value;
      const revision = Number(value);
      const cached = versions.get(revision);
      if (cached) return cached;
      const retained = comparisonSelections.get(source.sourceId)?.[`${side}Version`];
      return retained?.revision === revision ? retained : null;
    };
    const selectionState = { ...prior, from: from.value, to: to.value };
    comparisonSelections.set(source.sourceId, selectionState);
    const setEnabled = () => {
      selectionState.from = from.value;
      selectionState.to = to.value;
      const state = comparisonStates.get(source.sourceId);
      compare.disabled = !selectionState.from || !selectionState.to || selectionState.from === selectionState.to ||
        !selectedVersion("from") || !selectedVersion("to") || !activeScope(sessionId, ownEpoch);
      if (state?.status === "loading") compare.setAttribute("aria-disabled", "true");
      else compare.removeAttribute("aria-disabled");
      compare.textContent = state?.status === "loading" ? "Comparing…" : state?.status === "error" ? "Retry comparison" : "Compare";
    };
    const onSelection = () => {
      const priorSelection = comparisonSelections.get(source.sourceId) || {};
      comparisonSelections.set(source.sourceId, {
        from: from.value,
        to: to.value,
        fromVersion: versions.get(Number(from.value)) || (priorSelection.from === from.value ? priorSelection.fromVersion : null),
        toVersion: versions.get(Number(to.value)) || (priorSelection.to === to.value ? priorSelection.toVersion : null),
      });
      if (comparisonStates.get(source.sourceId)?.status === "loading") {
        cancelComparison(source.sourceId, "The selection changed. Compare the selected revisions to continue.");
        renderComparisonOutput(output, comparisonStates.get(source.sourceId));
      }
      setEnabled();
    };
    from.addEventListener("change", onSelection);
    to.addEventListener("change", onSelection);

    const refreshOutput = () => renderComparisonOutput(output, comparisonStates.get(source.sourceId));
    comparisonButtons.set(source.sourceId, compare);
    compare.addEventListener("click", () => {
      if (comparisonStates.get(source.sourceId)?.status === "loading") return;
      const fromVersion = selectedVersion("from");
      const toVersion = selectedVersion("to");
      if (!fromVersion || !toVersion || fromVersion.revision === toVersion.revision || !activeScope(sessionId, ownEpoch)) return;
      cancelComparison(source.sourceId);
      const generation = (comparisonGenerations.get(source.sourceId) || 0) + 1;
      comparisonGenerations.set(source.sourceId, generation);
      const id = sessionId;
      const controller = new AbortController();
      comparisonControllers.set(source.sourceId, controller);
      const state = { status: "loading", fromRevision: fromVersion.revision, toRevision: toVersion.revision };
      comparisonStates.set(source.sourceId, state);
      compare.disabled = false;
      compare.setAttribute("aria-disabled", "true");
      compare.textContent = "Comparing…";
      refreshOutput();
      const params = new URLSearchParams({
        sourceId: source.sourceId,
        fromRevision: String(fromVersion.revision),
        fromSha256: fromVersion.sha256,
        toRevision: String(toVersion.revision),
        toSha256: toVersion.sha256,
      });
      void request(`/sessions/${encodeURIComponent(id)}/materials/compare?${params}`, { signal: controller.signal })
        .then(result => {
          if (!activeScope(id, ownEpoch) || comparisonGenerations.get(source.sourceId) !== generation || comparisonControllers.get(source.sourceId) !== controller) return;
          if (!validComparisonResult(result, source, fromVersion, toVersion, id)) throw new Error("The comparison could not be verified.");
          comparisonStates.set(source.sourceId, { status: "ready", result });
          const activeButton = comparisonButtons.get(source.sourceId);
          if (activeButton) {
            const selection = comparisonSelections.get(source.sourceId);
            activeButton.disabled = !selection?.from || !selection?.to || selection.from === selection.to;
            activeButton.removeAttribute("aria-disabled");
            activeButton.textContent = "Compare";
          }
          const panel = currentComparisonPanel(source.sourceId);
          if (panel) renderComparisonOutput(panel, comparisonStates.get(source.sourceId));
        })
        .catch(err => {
          if (err.name === "AbortError" || !activeScope(id, ownEpoch) || comparisonGenerations.get(source.sourceId) !== generation || comparisonControllers.get(source.sourceId) !== controller) return;
          comparisonStates.set(source.sourceId, { status: "error", fromRevision: fromVersion.revision, toRevision: toVersion.revision, error: err.message || "The comparison could not be loaded." });
          const activeButton = comparisonButtons.get(source.sourceId);
          if (activeButton) {
            const selection = comparisonSelections.get(source.sourceId);
            activeButton.disabled = !selection?.from || !selection?.to || selection.from === selection.to;
            activeButton.removeAttribute("aria-disabled");
            activeButton.textContent = "Retry comparison";
          }
          const panel = currentComparisonPanel(source.sourceId);
          if (panel) renderComparisonOutput(panel, comparisonStates.get(source.sourceId));
        })
        .finally(() => {
          if (comparisonGenerations.get(source.sourceId) === generation && comparisonControllers.get(source.sourceId) === controller)
            comparisonControllers.delete(source.sourceId);
        });
    });
    controls.append(el("div", { className: "retained-comparison-controls" },
      el("label", { className: "retained-compare-field" }, el("span", { text: "From" }), from),
      el("label", { className: "retained-compare-field" }, el("span", { text: "To" }), to),
      compare,
    ), output);
    setEnabled();
    renderComparisonOutput(output, comparisonStates.get(source.sourceId));
    body.append(controls);
  }

  function renderSourceRows(container, ownEpoch) {
    if (sourceStatus === "loading") {
      container.append(el("p", { className: "form-help", text: "Loading retained uploads…" }));
      return;
    }
    if (sourceStatus === "error") {
      container.append(
        el("p", { className: "inline-error", text: "Retained uploads could not be loaded. Uploading stays paused until the list is refreshed." }),
        action("refresh-cw", "Retry loading retained uploads", () => void refreshSources(), { className: "secondary-button" }),
      );
      return;
    }
    if (!sources.length) {
      container.append(el("p", { className: "form-help", text: "No uploaded sources have been retained for this chat yet." }));
      return;
    }
    const entries = el("div", { className: "retained-source-list" });
    for (const source of sources) {
      const row = el("details", {
        className: "retained-source-entry",
        attrs: { "data-source-id": source.sourceId },
      });
      row.open = expandedSources.has(source.sourceId);
      const summary = el(
        "summary",
        { className: "retained-source-summary" },
        el("span", { className: "file-name", text: source.name }),
        el("span", { className: "file-size", text: `Latest retained revision ${source.latestRevision}` }),
      );
      const body = el("div", { className: "retained-source-versions" });
      row.append(summary, body);
      row.addEventListener("toggle", () => {
        if (!activeScope(sessionId, ownEpoch)) return;
        if (row.open) {
          expandedSources.add(source.sourceId);
          void loadVersions(source, body, row, ownEpoch);
        } else {
          expandedSources.delete(source.sourceId);
          cancelComparison(source.sourceId, "This source was closed. Reopen it and compare the selected revisions again.");
        }
      });
      entries.append(row);
      sourceDetails.set(source.sourceId, { source, row, body });
      if (row.open) void loadVersions(source, body, row, ownEpoch);
    }
    container.append(entries);
  }

  function render() {
    sourceDetails = new Map();
    const workspace = renderWorkspace();
    const retained = el("section", { className: "retained-sources-section" });
    retained.append(el(
      "div",
      { className: "section-heading" },
      el("h3", { text: `Retained uploads · ${sources.length}${sourceCoverage === "partial" ? "+" : ""}` }),
      action("refresh-cw", "Refresh retained uploads", event => {
        const trigger = event.currentTarget ?? event.target;
        void refreshSources({ focusFrom: document.activeElement === trigger ? trigger : null });
      }, { className: "quiet-button" }),
    ));
    setCoverageNote(retained);
    const rows = el("div", { className: "retained-source-rows" });
    renderSourceRows(rows, sessionEpoch);
    retained.append(rows);
    if (conflict && conflict.phase === "review" && conflict.name && !sourceNamed(conflict.name)) {
      retained.append(el("p", {
        className: "inline-error",
        text: "The refreshed list did not include the changed source. Choose a new name or refresh again before saving.",
      }));
    }
    list.replaceChildren(workspace, retained);
    updateSubmit();
  }

  async function refreshWorkspace() {
    if (!sessionId || !activeScope()) return;
    const own = ++workspaceGeneration;
    const id = sessionId;
    const epoch = sessionEpoch;
    workspaceController?.abort();
    workspaceController = new AbortController();
    workspaceStatus = "loading";
    render();
    try {
      const result = await request(`/sessions/${encodeURIComponent(id)}/workspace`, { signal: workspaceController.signal });
      if (own !== workspaceGeneration || !activeScope(id, epoch)) return;
      files = Array.isArray(result.tree) ? result.tree : [];
      workspaceStatus = "ready";
      render();
    } catch (err) {
      if (own !== workspaceGeneration || err.name === "AbortError" || !activeScope(id, epoch)) return;
      workspaceStatus = "error";
      render();
    }
  }

  async function refreshSources({ afterConflict = false, focusFrom = null } = {}) {
    if (!sessionId || !activeScope()) return;
    const own = ++sourceGeneration;
    const id = sessionId;
    const epoch = sessionEpoch;
    const dialogWasOpen = dialog.open;
    sourceController?.abort();
    sourceController = new AbortController();
    for (const controller of detailControllers.values()) controller.abort();
    detailControllers = new Map();
    detailGenerations = new Map();
    versionCache = new Map();
    sourceStatus = "loading";
    if (conflict && (afterConflict || conflict.phase === "refresh-required")) conflict.phase = "refreshing";
    render();
    try {
      const result = await request(`/sessions/${encodeURIComponent(id)}/materials`, { signal: sourceController.signal });
      if (own !== sourceGeneration || !activeScope(id, epoch)) return;
      if (!validSourceList(result)) throw new Error("The retained upload list was incomplete.");
      sources = result.sources;
      sourceCoverage = result.coverage;
      sourceLimit = result.limit;
      sourceStatus = "ready";
      if (conflict?.phase === "refreshing") {
        const changed = sourceNamed(conflict.name);
        if (!changed) {
          conflict.phase = "blocked";
          fail("The upload list refreshed, but the changed source is not available for review. Choose a new name or refresh again.");
        } else {
          conflict.phase = "review";
          const priorReviewed = conflict.reviewedRevision;
          if (priorReviewed !== changed.latestRevision) conflict.reviewedRevision = null;
          expandedSources.add(changed.sourceId);
        }
      } else if (conflict?.phase === "review") {
        const changed = sourceNamed(conflict.name);
        if (!changed) {
          conflict.phase = "blocked";
          conflict.reviewedRevision = null;
        } else if (conflict.reviewedRevision !== changed.latestRevision) {
          conflict.reviewedRevision = null;
          expandedSources.add(changed.sourceId);
        }
      }
      render();
    } catch (err) {
      if (own !== sourceGeneration || err.name === "AbortError" || !activeScope(id, epoch)) return;
      sourceStatus = "error";
      if (conflict) conflict.phase = "refresh-required";
      render();
      fail("Retained uploads could not be refreshed. The draft is kept and the upload list must load before saving.", {
        buttonLabel: "Retry refresh",
        buttonAction: () => void refreshSources({ afterConflict: Boolean(conflict) }),
      });
    } finally {
      if (own === sourceGeneration) restoreSourceRefreshFocus(focusFrom, id, epoch, dialogWasOpen);
    }
  }

  async function loadVersions(source, body, row, ownEpoch) {
    const id = sessionId;
    if (!activeScope(id, ownEpoch) || !row.open) return;
    const cached = versionCache.get(source.sourceId);
    if (cached?.latestRevision === source.latestRevision) {
      renderVersions(source, body, cached.result, ownEpoch);
      return;
    }
    const prior = detailControllers.get(source.sourceId);
    prior?.abort();
    const controller = new AbortController();
    detailControllers.set(source.sourceId, controller);
    const generation = (detailGenerations.get(source.sourceId) || 0) + 1;
    detailGenerations.set(source.sourceId, generation);
    body.replaceChildren(el("p", { className: "form-help", text: "Loading retained versions…" }));
    try {
      const params = new URLSearchParams({ sourceId: source.sourceId });
      const result = await request(`/sessions/${encodeURIComponent(id)}/materials?${params}`, { signal: controller.signal });
      if (!activeScope(id, ownEpoch) || !row.open || detailGenerations.get(source.sourceId) !== generation) return;
      if (!result || result.sourceId !== source.sourceId || result.name !== source.name ||
          !Array.isArray(result.versions) || !["complete", "partial"].includes(result.coverage) ||
          !Number.isSafeInteger(result.limit) || result.limit < 1 ||
          !Number.isSafeInteger(result.latestRevision) || result.latestRevision < 1 ||
          !result.versions.every(version => Number.isSafeInteger(version.revision) && version.revision > 0 &&
            /^[a-f0-9]{64}$/.test(version.sha256 || "") && Number.isSafeInteger(version.bytes) &&
            version.bytes >= 0 && version.bytes <= MAX_UPLOAD_BYTES))
        throw new Error("The retained versions could not be verified.");
      const now = sources.find(item => item.sourceId === source.sourceId);
      if (!now || now.latestRevision !== result.latestRevision) {
        if (conflict && conflict.name === source.name) {
          conflict.phase = "refreshing";
          conflict.reviewedRevision = null;
        }
        void refreshSources({ afterConflict: Boolean(conflict) });
        return;
      }
      versionCache.set(source.sourceId, { latestRevision: result.latestRevision, result });
      renderVersions(source, body, result, ownEpoch);
    } catch (err) {
      if (err.name === "AbortError" || !activeScope(id, ownEpoch) || !row.open || detailGenerations.get(source.sourceId) !== generation) return;
      body.replaceChildren(
        el("p", { className: "inline-error", text: "Retained versions could not be loaded." }),
        action("refresh-cw", "Retry loading retained versions", () => void loadVersions(source, body, row, ownEpoch), { className: "secondary-button" }),
      );
    }
  }

  function replacementLabel() {
    updateSubmit();
  }

  function draftChanged() {
    if (fileDraft && fileDraft.displayFingerprint !== displayFingerprint()) fileDraft = null;
    const next = currentFingerprint();
    if (commandState?.fingerprint !== next) commandState = null;
    if (linkRetry?.fingerprint !== next) linkRetry = null;
    if (conflict?.fingerprint !== next) conflict = null;
    replacementLabel();
  }

  name.addEventListener("input", draftChanged);
  text.addEventListener("input", draftChanged);
  upload.addEventListener("change", async () => {
    const file = upload.files?.[0];
    if (!file) return;
    const id = sessionId;
    const epoch = sessionEpoch;
    try {
      if (file.size > MAX_UPLOAD_BYTES)
        throw new Error("Choose a UTF-8 text file smaller than 1 MB.");
      const bytes = await file.arrayBuffer();
      const value = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
      if (value.includes("\0"))
        throw new Error("This file contains binary data. Choose a UTF-8 text file.");
      if (!activeScope(id, epoch)) return;
      name.value = file.name;
      text.value = value;
      fileDraft = { originalText: value, displayFingerprint: displayFingerprint() };
      clearError();
      draftChanged();
    } catch (err) {
      if (!activeScope(id, epoch)) return;
      fail(err.message || "The file could not be read as UTF-8 text.");
    } finally {
      if (activeScope(id, epoch)) upload.value = "";
    }
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !activeScope() || sourceStatus !== "ready") return;
    const id = sessionId;
    const epoch = sessionEpoch;
    const focusAtSubmit = document.activeElement;
    const nameValue = name.value.trim();
    const submittedFileDraft = displayedFileDraft();
    const submittedDisplayFingerprint = displayFingerprint();
    const textValue = submittedFileDraft?.originalText ?? text.value;
    const draftKey = fingerprint(nameValue, textValue);
    const knownSource = sourceNamed(nameValue);
    if (sourceCoverage === "partial" && !knownSource) {
      fail("The retained upload list is incomplete. Choose a listed name or a different name before saving.");
      return;
    }
    if (conflict && (conflict.phase !== "review" || conflict.reviewedRevision !== knownSource?.latestRevision)) {
      fail("Refresh the upload list and open its latest retained version before saving again.");
      return;
    }
    if (new TextEncoder().encode(JSON.stringify({ name: nameValue, text: textValue })).length > MAX_UPLOAD_BYTES) {
      fail("This material exceeds the 1 MB request limit. Reduce its size and try again.");
      return;
    }
    let expectedRevision = knownSource?.latestRevision ?? 0;
    let commandId;
    if (linkRetry?.fingerprint === draftKey) {
      commandId = linkRetry.commandId;
      expectedRevision = linkRetry.expectedRevision;
    }
    else if (commandState?.fingerprint === draftKey && commandState.expectedRevision === expectedRevision) commandId = commandState.commandId;
    else {
      try { commandId = uploadId(); }
      catch (err) { fail(err.message); return; }
      commandState = { fingerprint: draftKey, commandId, expectedRevision };
    }
    const body = { name: nameValue, text: textValue, commandId, expectedRevision };
    busy = true;
    submit.disabled = true;
    clearError();
    try {
      const result = await request(`/sessions/${encodeURIComponent(id)}/materials`, { method: "POST", body });
      if (!activeScope(id, epoch)) return;
      if (result.workspaceState === "pending") {
        linkRetry = { fingerprint: draftKey, commandId, expectedRevision };
        fail("The source was retained but is not yet linked into this chat. Retry the same upload command.");
        return;
      }
      commandState = null;
      linkRetry = null;
      conflict = null;
      if (result.workspaceState === "written") {
        const draftStillMatches = displayFingerprint() === submittedDisplayFingerprint &&
          (submittedFileDraft ? fileDraft === submittedFileDraft : !fileDraft);
        if (draftStillMatches) {
          name.value = "";
          text.value = "";
          fileDraft = null;
          document.getElementById("material-add").open = false;
        }
        notify(`Saved ${result.path || `materials/${nameValue}`} as retained revision ${result.retained?.revision ?? ""}.`);
      } else if (result.workspaceState === "superseded") {
        fail("This upload was retained, but a newer version already exists, so the workspace file was left unchanged. Review the latest retained version before trying again.");
        conflict = { name: nameValue, fingerprint: draftKey, phase: "refreshing", reviewedRevision: null };
      } else {
        fail("The upload outcome is unknown. Refresh retained uploads before trying again.");
      }
      await refreshSources({ afterConflict: Boolean(conflict) });
      await refreshWorkspace();
      if (result.workspaceState === "written") focusSavedSourceSummary(nameValue, id, epoch, focusAtSubmit);
    } catch (err) {
      if (!activeScope(id, epoch)) return;
      const code = err.body?.error?.code;
      if (err.status === 503 && code === "material_link_failed") {
        linkRetry = { fingerprint: draftKey, commandId, expectedRevision };
        commandState = { fingerprint: draftKey, commandId, expectedRevision };
        fail("The source was retained, but it could not be linked into this chat. The draft and command are kept for a same-command retry.");
        await refreshSources();
      } else if (err.status === 409) {
        linkRetry = null;
        conflict = { name: nameValue, fingerprint: draftKey, phase: "refresh-required", reviewedRevision: null };
        fail("This retained source changed during the save. Refresh the upload list, review the current version, then submit again.", {
          buttonLabel: "Refresh uploads",
          buttonAction: () => void refreshSources({ afterConflict: true }),
        });
      } else {
        fail(err.message || "The material could not be added.");
      }
    } finally {
      if (activeScope(id, epoch)) {
        busy = false;
        updateSubmit();
      }
    }
  });

  function cancelRequests() {
    workspaceGeneration++;
    sourceGeneration++;
    workspaceController?.abort();
    sourceController?.abort();
    for (const controller of detailControllers.values()) controller.abort();
    detailControllers.clear();
    detailGenerations.clear();
    for (const sourceId of comparisonControllers.keys()) cancelComparison(sourceId, "The comparison was interrupted. Compare the selected revisions again.");
    comparisonControllers.clear();
    comparisonButtons.clear();
  }

  function returnFromFile() {
    const target = fileReturn;
    if (!target || !activeScope(target.sessionId, target.epoch)) {
      fileReturn = null;
      return false;
    }
    if (!dialog.open) dialog.showModal();
    list.scrollTop = target.scrollTop;
    const opener = list.contains(target.opener)
      ? target.opener
      : [...list.querySelectorAll("button.retained-version-open")]
          .find(button => button.dataset.focusKey === target.focusKey);
    if (opener) opener.focus({ preventScroll: true });
    fileReturn = null;
    return Boolean(opener);
  }

  function discardFileReturn() {
    const hadReturn = Boolean(fileReturn);
    fileReturn = null;
    return hadReturn;
  }

  return {
    open() {
      const session = getSession();
      if (!session) return;
      if (session.id !== sessionId) {
        discardFileReturn();
        cancelRequests();
        sessionEpoch++;
        sessionId = session.id;
        workspaceStatus = "idle";
        sourceStatus = "idle";
        files = [];
        sources = [];
        sourceCoverage = "complete";
        sourceLimit = 0;
        expandedSources = new Set();
        versionCache = new Map();
        comparisonSelections = new Map();
        comparisonStates = new Map();
        comparisonGenerations = new Map();
        comparisonButtons = new Map();
        commandState = null;
        linkRetry = null;
        conflict = null;
        fileDraft = null;
        name.value = "";
        text.value = "";
        upload.value = "";
        clearError();
      }
      document.getElementById("materials-session-title").textContent = session.title || "Session";
      void refreshWorkspace();
      void refreshSources();
    },
    close() {
      cancelRequests();
    },
    returnFromFile,
    discardFileReturn,
    reset() {
      discardFileReturn();
      cancelRequests();
      sessionEpoch++;
      sessionId = null;
      workspaceStatus = "idle";
      sourceStatus = "idle";
      files = [];
      sources = [];
      sourceCoverage = "complete";
      sourceLimit = 0;
      expandedSources = new Set();
      sourceDetails = new Map();
      versionCache = new Map();
      comparisonSelections = new Map();
      comparisonStates = new Map();
      comparisonGenerations = new Map();
      comparisonButtons = new Map();
      commandState = null;
      linkRetry = null;
      conflict = null;
      busy = false;
      fileDraft = null;
      name.value = "";
      text.value = "";
      upload.value = "";
      clearError();
      list.replaceChildren();
      updateSubmit();
    },
  };
}
