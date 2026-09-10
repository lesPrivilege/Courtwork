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

function fileName(path) {
  const value = String(path);
  const separator = Math.max(value.lastIndexOf("/"), value.lastIndexOf("\\"));
  return separator >= 0 ? value.slice(separator + 1) : value;
}

function fileParent(path) {
  const value = String(path);
  const separator = Math.max(value.lastIndexOf("/"), value.lastIndexOf("\\"));
  return separator >= 0 ? value.slice(0, separator + 1) : "Workspace root";
}

function filesCanDisplay(snapshot) {
  return snapshot.filesKnown && (snapshot.phase === "ready" || snapshot.phase === "empty");
}

function filesDisclosureLabel(snapshot) {
  return filesCanDisplay(snapshot) ? `Files · ${snapshot.files.length}` : "Files · unavailable";
}

function filesEmptyMessage(snapshot) {
  if (filesCanDisplay(snapshot) && snapshot.files.length === 0)
    return "No files were recorded for this run.";
  return snapshot.message || "Recorded files are unavailable.";
}

/**
 * Create the Run summary/disclosure.  `getSnapshot` is read again for
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

  function invoke(callback, snapshot, opener) {
    if (busy || disposed || typeof callback !== "function") return;
    actionError = null;
    const token = ++actionToken;
    setBusy(true);
    let result;
    try {
      result = callback(snapshot, opener);
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
    const sameTarget = Boolean(old && snapshot && sameIdentity(old, snapshot));
    const oldDetails = root.querySelectorAll("details");
    const oldFilesDetails = root.querySelector(".sd-run-summary-files-disclosure") || oldDetails[0];
    const oldInformationDetails = root.querySelector(".sd-run-summary-information-disclosure") || oldDetails[1];
    const wasFilesOpen = Boolean(sameTarget && oldFilesDetails?.open);
    const wasInformationOpen = Boolean(sameTarget && oldInformationDetails?.open);
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

    const readMessage = snapshot.error || snapshot.message;
    if (readMessage)
      root.append(
        el("p", {
          className: snapshot.phase === "error" ? "sd-run-summary-error" : "rail-note",
          text: readMessage,
          attrs: snapshot.phase === "error" ? { role: "alert" } : { role: "status" },
        }),
      );

    if (actionError)
      root.append(el("p", { className: "sd-run-summary-error", text: actionError, attrs: { role: "alert" } }));

    const filesDisclosure = el(
      "details",
      {
        className: "sd-run-summary-disclosure sd-run-summary-files-disclosure",
      },
      el("summary", {
        className: "sd-run-summary-trigger",
        text: filesDisclosureLabel(snapshot),
        attrs: { "data-focus-key": "run-summary-files" },
      }),
    );
    filesDisclosure.open = wasFilesOpen;
    const filesDetail = el("div", { className: "sd-run-summary-detail" });

    if (snapshot.files.length) {
      const list = el("ul", { className: "sd-run-summary-files" });
      for (const file of snapshot.files) {
        const item = el("li", { className: "sd-run-summary-file" });
        const copy = el(
          "span",
          { className: "sd-run-summary-file-copy" },
          el("span", { className: "sd-run-summary-file-name", text: fileName(file.path) }),
          el("span", { className: "sd-run-summary-file-parent", text: fileParent(file.path) }),
        );
        const bytes = bytesText(file.bytes) || "Size unavailable";
        const display = (button) => {
          button.classList.remove("icon-only");
          button.removeAttribute("data-tooltip");
          button.replaceChildren(
            icon("file-text", { size: 16 }),
            copy,
            el("span", { className: "sd-run-summary-file-bytes", text: bytes }),
            el("span", { className: "sd-run-summary-file-preview-label", text: "Preview" }),
          );
          return button;
        };
        if (typeof onOpenFile === "function" && snapshot.readerAvailable && (snapshot.phase === "ready" || snapshot.phase === "empty")) {
          const fileButton = action(
            "file-text",
            `Open recorded file ${file.path}`,
            () => {
              const latest = actionSnapshot(snapshot, (next) => next.readerAvailable && next.files.some((entry) => entry.path === file.path && entry.sha256 === file.sha256));
              const target = latest?.files.find((entry) => entry.path === file.path && entry.sha256 === file.sha256);
              if (target) invoke(onOpenFile, target, fileButton);
            },
            {
              className: "rail-file rail-file-open sd-run-summary-file-preview",
              attrs: { "data-focus-key": `run-summary-file:${encodeURIComponent(JSON.stringify([file.sessionId, file.runId, file.path, file.sha256]))}` },
            },
          );
          fileButton.setAttribute("title", file.path);
          actionButtons.push(fileButton);
          item.append(display(fileButton));
        } else {
          item.append(
            el(
              "div",
              { className: "sd-run-summary-file-static" },
              icon("file-text", { size: 16 }),
              copy,
              el("span", { className: "sd-run-summary-file-bytes", text: bytes }),
            ),
          );
        }
        list.append(item);
      }
      filesDetail.append(list, el("p", { className: "rail-note", text: "Recorded files; review acceptance is not recorded here." }));
      if (!snapshot.filesKnown)
        filesDetail.append(el("p", { className: "rail-note", text: "Some recorded files are unavailable." }));
    } else {
      filesDetail.append(el("p", { className: "rail-note", text: filesEmptyMessage(snapshot) }));
    }

    if (!snapshot.readerAvailable)
      filesDetail.append(el("p", { className: "rail-note", text: "The Run reader is unavailable. Opening is disabled." }));

    filesDisclosure.append(filesDetail);
    root.append(filesDisclosure);

    const informationDisclosure = el(
      "details",
      {
        className: "sd-run-summary-disclosure sd-run-summary-information-disclosure",
      },
      el("summary", {
        className: "sd-run-summary-trigger",
        text: "Run information",
        attrs: { "data-focus-key": "run-summary-information" },
      }),
    );
    informationDisclosure.open = wasInformationOpen;
    const informationDetail = el("div", { className: "sd-run-summary-detail" });
    informationDetail.append(
      row("Run", snapshot.identity.runId, { mono: true }),
      row("Session", snapshot.identity.sessionId, { mono: true }),
    );

    if (snapshot.files.length) {
      informationDetail.append(el("p", { className: "rail-group", text: "File SHA-256" }));
      for (const file of snapshot.files)
        informationDetail.append(row(`SHA-256 · ${file.path}`, file.sha256, { mono: true }));
    }

    if ((snapshot.phase === "ready" || snapshot.phase === "empty") && snapshot.readerAvailable && typeof onOpen === "function") {
      const openButton = action(
        "chevron-right",
        "Open run details",
        () => {
          const latest = actionSnapshot(snapshot, (next) => next.readerAvailable && (next.phase === "ready" || next.phase === "empty"));
          if (latest) invoke(onOpen, latest, openButton);
        },
        {
          visible: "Run details",
          trailing: true,
          size: 16,
          className: "quiet-button sd-run-summary-open",
          attrs: { "data-focus-key": "run-summary-open" },
        },
      );
      actionButtons.push(openButton);
      informationDetail.append(el("div", { className: "sd-run-summary-actions" }, openButton));
    }

    if (snapshot.phase === "error" && typeof onRetry === "function") {
      const retryButton = action(
        "refresh-cw",
        "Retry run summary",
        () => {
          const latest = actionSnapshot(snapshot, (next) => next.phase === "error");
          if (latest) invoke(onRetry, latest, retryButton);
        },
        {
          visible: "Retry",
          className: "secondary-button sd-run-summary-retry",
          attrs: { "data-focus-key": "run-summary-retry" },
        },
      );
      actionButtons.push(retryButton);
      informationDetail.append(el("div", { className: "sd-run-summary-actions" }, retryButton));
    }

    informationDisclosure.append(informationDetail);
    root.append(informationDisclosure);
    setBusy(busy);

    if (focusKey && sameTarget) {
      const focusTarget = [...root.querySelectorAll("[data-focus-key]")].find(node => node.dataset.focusKey === focusKey);
      if (focusTarget) focusTarget.focus();
      else {
        const fallbackKey = focusKey === "run-summary-open" || focusKey === "run-summary-retry" || focusKey === "run-summary-information"
          ? "run-summary-information"
          : "run-summary-files";
        root.querySelector(`[data-focus-key="${CSS.escape(fallbackKey)}"]`)?.focus();
      }
    }
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

/* Shared middle layer for existing rail modules. Scope and target changes
 * discard UI memory; neither expanded rows nor navigation confer authority. */
export function createCardDisclosureMemory() {
  let scope = null;
  const entries = new Map();
  return {
    resetScope(next) {
      if (next !== scope) { scope = next; entries.clear(); }
    },
    wrap(card, kind, identity, label) {
      const old = entries.get(kind);
      const entry = old?.identity === identity ? old : { identity, open: false };
      entry.open = entry.node?.open ?? entry.open;
      entries.set(kind, entry);
      const rows = [...card.children].filter(node =>
        node.classList.contains('rail-row') || node.classList.contains('rail-file') || node.classList.contains('rail-group'));
      if (!rows.length) return card;
      const details = el('details', { className: 'sd-run-summary-disclosure' },
        el('summary', { className: 'sd-run-summary-trigger', text: label,
          attrs: { 'data-focus-key': `rail-disclosure:${kind}` } }));
      details.open = entry.open;
      entry.node = details;
      const body = el('div', { className: 'sd-run-summary-detail' });
      for (const row of rows) { row.remove(); body.append(row); }
      details.append(body);
      details.addEventListener('toggle', () => {
        if (entries.get(kind) === entry && entry.node === details) entry.open = details.open;
      });
      card.append(details);
      return card;
    },
  };
}

/* Presentation slots, not a domain/capability registry. The host supplies each
 * slot's read state and reader; a named slot alone never admits an action. */
export const surfaceEntryDefinitions = Object.freeze([
  ['activity', 'Activity', 'Work'],
  ['task', 'Tasks', 'Work'],
  ['explore', 'Explore', 'Work'],
  ['diff', 'Changes', 'Work'],
  ['context', 'Context', 'Information'],
  ['source', 'Sources', 'Information'],
  ['browser', 'Browser', 'Tools'],
  ['computer-use', 'Computer use', 'Tools'],
].map(([id, title, group]) => Object.freeze({id, title, group})));
const ENTRY_STATES = new Set(['ready', 'loading', 'empty', 'error', 'unavailable', 'unsupported']);
const ENTRY_COPY = {
  loading: 'Reading…', empty: 'Nothing recorded here.', error: 'Could not read this entry.',
  unavailable: 'Not available yet.', unsupported: 'Not supported in this view.',
  ready: 'Available to read.',
};

export function createSurfaceEntryDirectory({getSnapshot}) {
  const root = el('section', {className:'rail-card sd-entry-directory', attrs:{'aria-label':'More surfaces', 'data-module':'more'}});
  let scope = null;
  let disclosure = null;
  return {
    element: root,
    update() {
      const snapshot = getSnapshot();
      const sameScope = snapshot?.scope && snapshot.scope === scope;
      const open = Boolean(sameScope && disclosure?.open);
      const focused = root.contains(document.activeElement) ? document.activeElement?.dataset?.focusKey : null;
      scope = typeof snapshot?.scope === "string" && snapshot.scope ? snapshot.scope : null;
      root.hidden = !scope;
      root.replaceChildren();
      if (!scope) { disclosure = null; return; }
      const capturedScope = scope;
      disclosure = el('details', {}, el('summary', {className:'sd-run-summary-trigger', text:'More',
        attrs:{'data-focus-key':'surface-entry-more'}}));
      disclosure.open = open;
      const body = el('div', {className:'sd-entry-groups'});
      let group = null;
      let list = null;
      for (const definition of surfaceEntryDefinitions) {
        if (group !== definition.group) {
          group = definition.group;
          list = el('div', {className:'sd-entry-group', attrs:{role:'group','aria-label':group}},
            el('p', {className:'rail-group',text:group}));
          body.append(list);
        }
        const entry = snapshot.schemaVersion === 1 ? snapshot.entries?.[definition.id] : {state: "unsupported"};
        const state = entry ? (ENTRY_STATES.has(entry.state) ? entry.state : 'unsupported') : 'unavailable';
        const canOpen = state === 'ready' && typeof entry?.identity === 'string' && entry.identity.length > 0 && typeof entry.open === 'function';
        const fallback = state === "ready" && !canOpen ? "Reading is not available here yet." : ENTRY_COPY[state];
        const detail = typeof entry?.detail === 'string' && entry.detail ? entry.detail : fallback;
        const row = el(canOpen ? 'button' : 'div', {className:'sd-entry-row', attrs:{
          'data-entry':definition.id, 'data-entry-state':state === 'ready' && !canOpen ? 'unavailable' : state,
          ...(canOpen ? {type:'button','data-focus-key':`surface-entry:${definition.id}`,'aria-label':`${definition.title}: ${detail}`} : {}),
        }}, el('span',{className:'sd-entry-title',text:definition.title}),
        el('span',{className:'sd-entry-detail',text:detail}));
        if (canOpen) {
          row.addEventListener('click', () => {
            const latest = getSnapshot();
            const next = latest?.entries?.[definition.id];
            if (latest?.schemaVersion === 1 && latest?.scope === capturedScope && next?.state === 'ready' &&
                next.identity === entry.identity && next.revision === entry.revision && typeof next.open === 'function') next.open(row);
          });
        }
        list.append(row);
      }
      disclosure.append(body);
      root.append(disclosure);
      if (sameScope && focused) (root.querySelector(`[data-focus-key="${focused}"]`) || root.querySelector('summary'))?.focus();
    },
  };
}
