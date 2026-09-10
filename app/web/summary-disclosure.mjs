/* R2-SD01 · Run summary card.
 *
 * The card owns only its inline disclosure and action guards.  The host still
 * owns the Run reader, right-panel tab, focus return, and all formal state.
 */
import { el, action, icon } from "./ui-controls.mjs";
import { validSummaryPath } from "./summary-disclosure-projection.mjs";

const HASH = /^[a-f0-9]{64}$/;
const PHASES = new Set([
  "ready",
  "loading",
  "empty",
  "unknown",
  "error",
  "unavailable",
  "incompatible",
]);

const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const identityPart = (value) => typeof value === "string" && value.length > 0;
const validGeneration = (value) => Number.isSafeInteger(value) && value >= 0;
const validFile = (file, identity) => object(file) && file.kind === "content-version" &&
  identityPart(file.sessionId) && identityPart(file.runId) &&
  file.sessionId === identity.sessionId && file.runId === identity.runId &&
  validSummaryPath(file.path) && typeof file.sha256 === "string" && HASH.test(file.sha256);

function normalizeSnapshot(snapshot) {
  /* Fail closed for an old or incompatible projection.  In particular, a
   * card must never render an object whose schema is not the one it knows. */
  if (!object(snapshot) || snapshot.schemaVersion !== 1 ||
      !object(snapshot.identity) || !identityPart(snapshot.identity.sessionId) ||
      !identityPart(snapshot.identity.runId) || !validGeneration(snapshot.generation) ||
      !PHASES.has(snapshot.phase) || typeof snapshot.statusLabel !== "string" ||
      snapshot.statusLabel.length === 0 || typeof snapshot.readerAvailable !== "boolean" ||
      typeof snapshot.filesKnown !== "boolean" || !Array.isArray(snapshot.files)) return null;
  return {
    ...snapshot,
    identity: {
      sessionId: snapshot.identity.sessionId,
      runId: snapshot.identity.runId,
    },
    files: snapshot.files.filter((file) => validFile(file, snapshot.identity)),
  };
}

function sameIdentity(left, right) {
  return Boolean(left && right) &&
    left.identity.sessionId === right.identity.sessionId &&
    left.identity.runId === right.identity.runId;
}

function sameGeneration(left, right) {
  return Boolean(left && right) && left.generation === right.generation;
}

function row(label, value, { mono = false } = {}) {
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

function bytesText(bytes) {
  if (!Number.isSafeInteger(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Create the local Run summary/disclosure.  `getSnapshot` is read again for
 * every action so a changed Session, Run, generation, reader, or phase revokes
 * the old button without asking the host to defend a stale intent.
 */
export function createRunSummaryCard({
  getSnapshot,
  onOpen,
  onRetry,
  onOpenFile,
} = {}) {
  if (typeof getSnapshot !== "function") throw new TypeError("getSnapshot is required");
  const root = el(
    "section",
    {
      className: "rail-card sd-run-summary",
      attrs: {
        "aria-label": "Run summary",
        "data-module": "run-summary",
      },
    },
  );
  root.hidden = true;

  let current = null;
  let busy = false;
  let disposed = false;
  let actionError = null;
  let actionToken = 0;
  let actionButtons = [];

  function freshSnapshot() {
    try {
      return normalizeSnapshot(getSnapshot());
    } catch {
      return null;
    }
  }

  function setBusy(value) {
    busy = value;
    for (const button of actionButtons) button.disabled = busy;
  }

  function actionFailure(error, token) {
    if (disposed || token !== actionToken) return;
    actionError = error?.message || "The action could not be completed.";
    setBusy(false);
    if (current) render(current);
  }

  function invoke(callback, snapshot) {
    if (busy || disposed || typeof callback !== "function") return;
    actionError = null;
    const token = ++actionToken;
    setBusy(true);
    let result;
    try {
      result = callback(snapshot);
    } catch {
      actionFailure(null, token);
      return;
    }
    Promise.resolve(result).then(
      () => { if (!disposed && token === actionToken) setBusy(false); },
      (error) => { actionFailure(error, token); },
    );
  }

  function actionSnapshot(expected, predicate) {
    const latest = freshSnapshot();
    if (!latest || !sameIdentity(latest, expected) || !sameGeneration(latest, expected)) return null;
    return predicate(latest) ? latest : null;
  }

  function render(snapshot) {
    const old = current;
    const oldDetails = root.querySelector("details");
    const wasOpen = Boolean(old && oldDetails?.open && sameIdentity(old, snapshot));
    const active = document.activeElement;
    const focusKey = root.contains(active) ? active?.dataset?.focusKey : null;
    actionButtons = [];
    root.replaceChildren();

    if (!snapshot) {
      root.hidden = true;
      return;
    }
    root.hidden = false;

    const head = el(
      "div",
      { className: "rail-card-head" },
      icon("activity", { size: 16 }),
      el("h3", { className: "rail-card-title", text: "Run" }),
      el("span", { className: "rail-card-state", text: snapshot.statusLabel }),
    );
    root.append(head);

    root.append(
      el("p", {
        className: "sd-run-summary-id",
        text: `Run ${snapshot.identity.runId}`,
      }),
    );

    const readMessage = snapshot.error || snapshot.message;
    if (readMessage)
      root.append(
        el("p", {
          className: snapshot.phase === "error" ? "sd-run-summary-error" : "rail-note",
          text: readMessage,
          attrs: snapshot.phase === "error" ? { role: "alert" } : { role: "status" },
        }),
      );

    if ((snapshot.phase === "ready" || snapshot.phase === "empty") && snapshot.files.length)
      root.append(row("Results", snapshot.files.length === 1 ? "1 recorded file" : `${snapshot.files.length} recorded files`));

    const disclosure = el(
      "details",
      {
        className: "sd-run-summary-disclosure",
      },
      el("summary", {
        className: "sd-run-summary-trigger",
        text: "Details",
        attrs: { "data-focus-key": "run-summary-details" },
      }),
    );
    disclosure.open = wasOpen;
    const detail = el("div", { className: "sd-run-summary-detail" });
    detail.append(
      el("p", { className: "rail-group", text: "Run identity" }),
      row("Session", snapshot.identity.sessionId, { mono: true }),
      row("Run", snapshot.identity.runId, { mono: true }),
      row("Status", snapshot.statusLabel),
    );

    if (snapshot.files.length) {
      detail.append(el("p", { className: "rail-group", text: "Recorded files" }));
      const list = el("ul", { className: "sd-run-summary-files" });
      for (const [index, file] of snapshot.files.entries()) {
        const item = el("li", { className: "sd-run-summary-file" });
        const pathLine = el("div", { className: "sd-run-summary-file-head" });
        pathLine.append(icon("file-text", { size: 16 }), el("code", { className: "sd-run-summary-path", text: file.path }));
        const meta = el("div", { className: "sd-run-summary-file-meta" });
        meta.append(el("code", { text: file.sha256 }));
        const bytes = bytesText(file.bytes);
        if (bytes) meta.append(el("span", { text: bytes }));
        if (typeof onOpenFile === "function" && snapshot.readerAvailable && (snapshot.phase === "ready" || snapshot.phase === "empty")) {
          const fileButton = action(
            "file-text",
            `Open recorded file ${file.path}`,
            () => {
              const latest = actionSnapshot(snapshot, (next) => next.readerAvailable && next.files.some((entry) => entry.path === file.path && entry.sha256 === file.sha256));
              const target = latest?.files.find((entry) => entry.path === file.path && entry.sha256 === file.sha256);
              if (target) invoke(onOpenFile, target);
            },
            {
              visible: "Open file",
              className: "quiet-button sd-run-summary-file-open",
              attrs: { "data-focus-key": `run-summary-file:${index}` },
            },
          );
          actionButtons.push(fileButton);
          meta.append(fileButton);
        }
        item.append(pathLine, meta);
        list.append(item);
      }
      detail.append(list, el("p", { className: "rail-note", text: "Recording a file does not establish review acceptance." }));
    }

    if (actionError)
      detail.append(el("p", { className: "sd-run-summary-error", text: actionError, attrs: { role: "alert" } }));

    if (!snapshot.readerAvailable)
      detail.append(el("p", { className: "rail-note", text: "The Run reader is unavailable. Opening is disabled." }));

    if ((snapshot.phase === "ready" || snapshot.phase === "empty") && snapshot.readerAvailable && typeof onOpen === "function") {
      const openButton = action(
        "panel-right",
        "Open run in right panel",
        () => {
          const latest = actionSnapshot(snapshot, (next) => next.readerAvailable && (next.phase === "ready" || next.phase === "empty"));
          if (latest) invoke(onOpen, latest);
        },
        {
          visible: "Open in right panel",
          trailing: true,
          className: "quiet-button sd-run-summary-open",
          attrs: { "data-focus-key": "run-summary-open" },
        },
      );
      actionButtons.push(openButton);
      detail.append(el("div", { className: "sd-run-summary-actions" }, openButton));
    }

    if (snapshot.phase === "error" && typeof onRetry === "function") {
      const retryButton = action(
        "refresh-cw",
        "Retry run summary",
        () => {
          const latest = actionSnapshot(snapshot, (next) => next.phase === "error");
          if (latest) invoke(onRetry, latest);
        },
        {
          visible: "Retry",
          className: "secondary-button sd-run-summary-retry",
          attrs: { "data-focus-key": "run-summary-retry" },
        },
      );
      actionButtons.push(retryButton);
      detail.append(el("div", { className: "sd-run-summary-actions" }, retryButton));
    }

    disclosure.append(detail);
    root.append(disclosure);
    setBusy(busy);

    if (focusKey) root.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`)?.focus();
  }

  function update(snapshot) {
    if (disposed) return;
    const next = normalizeSnapshot(snapshot);
    const targetChanged = !sameIdentity(current, next) || !sameGeneration(current, next);
    if (targetChanged || current?.phase !== next?.phase) {
      actionToken++;
      actionError = null;
      if (targetChanged) setBusy(false);
    }
    render(next);
    current = next;
  }

  update(freshSnapshot());

  return {
    element: root,
    update,
    dispose() {
      if (disposed) return;
      disposed = true;
      actionToken++;
      busy = false;
      current = null;
      actionButtons = [];
      root.replaceChildren();
      root.hidden = true;
    },
  };
}
