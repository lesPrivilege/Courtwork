import {
  icon,
  action,
  setAction,
  copyAction,
  markdown,
  installTooltips,
  anchorPopover,
} from "./ui-controls.mjs";

// WK-30 · window-control reservation is opt-in: a desktop shell sets
// data-shell, a Chromium/Electron overlay reports itself, a fixture may ask
// for it with ?shell=desktop. Plain browser tabs reserve nothing.
{
  const wanted = new URLSearchParams(location.search).get("shell") === "desktop";
  const overlay = navigator.windowControlsOverlay?.visible === true;
  if (wanted || overlay) document.documentElement.dataset.shell = "desktop";
}
import {
  createSettingsView,
  permissionLabels,
  providerLabels,
  renderConnectionCard,
} from "./settings-view.mjs";
import {
  renderRun,
  createFileView,
  runLabels,
  noticeText,
  formatBytes,
} from "./inspector.mjs";
import { createRuntimeView, renderRecordedContext } from "./runtime-view.mjs";
import { createMaterialsView } from "./materials-view.mjs";
import { renderHome } from "./home-view.mjs";
import {
  projectThread,
  canAnswer,
  validPermission,
} from "./thread-projection.mjs";

import {
  renderWorkspaceFilesView,
  renderSessionOverview,
  renderRunHistory,
} from "./workspace-view.mjs";
import { renderUserMessage } from "./user-message.mjs";

const API_BASE = "/api/v5";
const UI_STORAGE_KEY = "schema-engineering.ui.v6";
const HOME_DRAFT_KEY = `${UI_STORAGE_KEY}.home-draft`;
const surfaceOverlayQuery = window.matchMedia("(max-width: 1023px)");

const state = {
  token: null,
  editMessageCandidate: null,
  view: "home",
  navigationOpen: false,
  sidebarCollapsed: false,
  home: { data: null, error: null, loading: false, generation: 0, offsets: {} },
  homeDraft: "",
  homeProjectId: null,
  homePermissionMode: "ask",
  homeStart: null,
  homeProjectRequest: false,
  sessionListErrors: new Map(),
  unconfirmedRuns: new Map(),
  createAttempts: new Map(),
  startAfterProject: false,
  newSessionProjectId: null,
  runtimeInfo: null,
  capabilities: null,
  adapterId: null,
  projects: [],
  sessionsByProject: new Map(),
  openProjectIds: new Set(),
  activeProjectId: null,
  activeSessionId: null,
  restoreSessionId: null,
  navigationEpoch: 0,
  navigationFilter: "",
  session: null,
  events: [],
  runs: [],
  lastSeq: 0,
  sessionEpoch: 0,
  pollController: null,
  pollTimer: null,
  recordedContext: new Map(),
  draftCache: new Map(),
  draftDirty: new Set(),
  draftTimers: new Map(),
  draftRevisions: new Map(),
  draftQueues: new Map(),
  pendingRuns: new Map(),
  pendingCancels: new Map(),
  sessionMutationVersions: new Map(),
  sessionReadTokens: new Map(),
  operationSequence: 0,
  questionDrafts: new Map(),
  questionControls: new Map(),
  questionSubmitting: new Set(),
  questionSubmitted: new Set(),
  questionErrors: new Map(),
  toolOpen: new Map(),
  navigationLimits: new Map(),
  longMessageOpen: new Map(),
  messageReading: new Map(),
  bindingExtensionId: null,
  extensions: [],
  providerConfig: null,
  runtimeDialogReturnFocus: null,
  focusIntentEpoch: 0,
  feedback: new Map(),
  connectionLost: false,
  connectionEpoch: 0,
  recoveryProbeTimer: null,
  recoveryProbeController: null,
  surface: {
    open: false,
    kind: "preview",
    runId: null,
    fileRef: null,
    returnFocus: null,
    runReadGeneration: 0,
    runReadController: null,
    workspaceGeneration: 0,
    expanded: false,
    requestId: 0,
    fetchRequestId: 0,
    fetchController: null,
    controller: null,
    context: null,
    info: null,
    projection: null,
    module: null,
    ownedContainer: null,
    mounted: null,
  },
};

const $ = (id) => document.getElementById(id);
let tooltips, settingsView, materialsView, fileView, runtimeView;
const dialogReturns = new Map();
const COMMAND_STORAGE_KEY = "schema-engineering.commands.v1";
function storeUnconfirmedRuns() {
  try {
    window.sessionStorage.setItem(
      COMMAND_STORAGE_KEY,
      JSON.stringify([...state.unconfirmedRuns]),
    );
  } catch {
    /* receipt remains in memory */
  }
}
function setWorkspaceTitle(title) {
  if (state.surface.kind === "preview") $("surface-title").textContent = title;
}
function restoreLayerFocus(preferred, fallback = $("session-title")) {
  const target =
    preferred?.isConnected &&
    !preferred.closest("[inert]") &&
    preferred.getClientRects().length
      ? preferred
      : fallback;
  target?.focus();
}

function element(tag, options = {}, ...children) {
  const item = document.createElement(tag);
  if (options.className) item.className = options.className;
  if (options.text !== undefined) item.textContent = String(options.text);
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) {
      if (value !== undefined && value !== null)
        item.setAttribute(name, String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    item.append(
      typeof child === "string" ? document.createTextNode(child) : child,
    );
  }
  return item;
}

function clear(item) {
  while (item.firstChild) item.removeChild(item.firstChild);
}

function readUiState() {
  try {
    if (!window.localStorage) return {};
    const raw = window.localStorage.getItem(UI_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeUiState() {
  try {
    if (!window.localStorage) return;
    window.localStorage.setItem(
      UI_STORAGE_KEY,
      JSON.stringify({
        activeProjectId:
          typeof state.activeProjectId === "string"
            ? state.activeProjectId
            : null,
        activeSessionId:
          typeof state.activeSessionId === "string"
            ? state.activeSessionId
            : null,
        openProjectIds: [...state.openProjectIds].filter(
          (id) => typeof id === "string",
        ),
        surfaceOpen: state.surface.open !== false,
      }),
    );
  } catch {
    // Storage is a convenience for UI markers. A blocked or malformed store must not block startup.
  }
}

function storeHomeDraft() {
  try {
    const start = state.homeStart;
    window.sessionStorage?.setItem(HOME_DRAFT_KEY, JSON.stringify({
      draft: state.homeDraft,
      projectId: state.homeProjectId,
      permissionMode: state.homePermissionMode,
      start: start ? {
        projectId: start.projectId, commandId: start.commandId,
        session: start.session || null,
        unconfirmed: Boolean(start.unconfirmed || (start.pending && !start.session)),
        error: start.error || "",
      } : null,
    }));
  } catch { /* A blocked browser store must not block composing. */ }
}
function restoreHomeDraft() {
  try {
    const saved = JSON.parse(window.sessionStorage?.getItem(HOME_DRAFT_KEY) || "null");
    if (typeof saved?.draft !== "string") return;
    state.homeDraft = saved.draft.slice(0, 100000);
    state.homeProjectId = typeof saved.projectId === "string" ? saved.projectId : null;
    if (Object.hasOwn(permissionLabels, saved.permissionMode)) state.homePermissionMode = saved.permissionMode;
    if (saved.start && typeof saved.start.projectId === "string" && typeof saved.start.commandId === "string") {
      state.homeStart = { ...saved.start, pending: false };
      if (saved.start.unconfirmed)
        state.homeStart.error = "Session creation is unconfirmed. Refresh and check recent sessions before trying again. Your instruction is kept.";
    }
  } catch { /* Ignore malformed tab-local state. */ }
}

function sessionScopeKey(...parts) {
  return [
    state.activeSessionId || "",
    ...parts.map((part) => String(part ?? "")),
  ].join(":");
}

function nextOperationId(kind = "op") {
  state.operationSequence += 1;
  return `${kind}-${state.operationSequence}`;
}

// --- WS-03 focus/navigation intent guard --------------------------------
// A small reusable tool with three judgment functions: register (登记),
// admit (准入) and handoff (交接). It holds two epoch counters:
//  - navEpoch: reused from the existing `state.navigationEpoch`, already
//    incremented by every operation that can change the landing
//    project/session (selectProject, selectSession, refreshNavigationAndSession).
//    This tool reads it; it does not own or increment it.
//  - focusIntentEpoch: new here, incremented whenever the user moves focus
//    away from the composer to another control, opens a dialog, or
//    switches session (all observed generically via a single `focusin`
//    listener in wireEvents, see below).
// This ticket (G2) only wires the send command to `guardHandoffFocus`.
// `guardAdmitNavigation` is provided for reuse by the G1 create/switch
// navigation-admission work; it is intentionally unused here.
function guardRegisterIntent(extra = {}) {
  return {
    navEpoch: state.navigationEpoch,
    focusIntentEpoch: state.focusIntentEpoch,
    ...extra,
  };
}

function guardAdmitNavigation(ticket) {
  return Boolean(ticket) && ticket.navEpoch === state.navigationEpoch;
}

function guardBumpFocusIntent() {
  state.focusIntentEpoch += 1;
  return state.focusIntentEpoch;
}

function guardHandoffFocus(
  ticket,
  { isTargetActive, targetControl, intentContainer, perform } = {},
) {
  if (!ticket || typeof perform !== "function") return false;
  if (ticket.focusIntentEpoch !== state.focusIntentEpoch) return false;
  if (typeof isTargetActive === "function" && !isTargetActive()) return false;
  // document.activeElement is only a secondary confirmation: the epoch
  // checks above are the primary decision. If the browser's own focus
  // already sits on something else specific — not <body>, not the target
  // control itself, and not any other control that belongs to the same
  // intent (e.g. the Send/Cancel buttons inside the composer form when the
  // target is the composer textarea) — treat that as corroborating evidence
  // the user moved on. `intentContainer` lets a caller name the group of
  // controls that all count as "still the same intent"; a focused element
  // outside that container still blocks the handoff.
  const active = document.activeElement;
  if (
    targetControl &&
    active &&
    active !== document.body &&
    active !== targetControl &&
    !(intentContainer && intentContainer.contains(active))
  )
    return false;
  perform();
  return true;
}

function draftRevision(sessionId) {
  return state.draftRevisions.get(sessionId) || 0;
}

function bumpSessionMutation(sessionId) {
  if (!sessionId) return;
  state.sessionMutationVersions.set(
    sessionId,
    (state.sessionMutationVersions.get(sessionId) || 0) + 1,
  );
}

function nextSessionReadToken(sessionId) {
  const token = (state.sessionReadTokens.get(sessionId) || 0) + 1;
  state.sessionReadTokens.set(sessionId, token);
  return token;
}

function isCurrentSessionRead(sessionId, token) {
  return state.sessionReadTokens.get(sessionId) === token;
}

function sessionIdForEvent(event) {
  return event?.sessionId || event?.data?.sessionId || null;
}

function runBelongsToSession(run, sessionId = state.activeSessionId) {
  if (!run?.id || !sessionId) return false;
  return !run.sessionId || run.sessionId === sessionId;
}

function questionScopeKey(runId, questionId) {
  return sessionScopeKey(runId, questionId);
}

function toolScopeKey(runId, callId, name = "tool") {
  return sessionScopeKey(runId, callId || name);
}

function isNearBottom(stream, threshold = 48) {
  return (
    stream.scrollHeight - stream.scrollTop - stream.clientHeight <= threshold
  );
}

function setJumpLatestVisible(visible) {
  const button = $("jump-latest-button");
  if (button) button.hidden = !visible;
}

function rememberMessageReading(stream, { forceFollow = null } = {}) {
  const session = currentSession();
  if (!session) {
    setJumpLatestVisible(false);
    return { followLatest: true, scrollTop: 0 };
  }
  const followLatest =
    forceFollow === null ? isNearBottom(stream) : forceFollow;
  const reading = { followLatest, scrollTop: stream.scrollTop };
  state.messageReading.set(session.id, reading);
  setJumpLatestVisible(!followLatest);
  return reading;
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function normalizedType(type) {
  const raw = String(type || "");
  if (raw === "user.message") return "message/user";
  if (raw === "assistant.message") return "assistant/final";
  return raw.replace(".", "/");
}

function isActiveRun(run) {
  return ["created", "running", "waiting_user", "stopping"].includes(
    run?.status,
  );
}

function isTerminalRunStatus(status) {
  return ["completed", "cancelled", "failed", "unknown"].includes(status);
}

function currentSession() {
  return state.session && state.session.id === state.activeSessionId
    ? state.session
    : null;
}

function currentProject() {
  return (
    state.projects.find((project) => project.id === state.activeProjectId) ||
    null
  );
}

function currentRun() {
  return state.runs.find((run) => isActiveRun(run)) || null;
}

function showToast(message, kind = "info") {
  const region = $("toast-region");
  const toast = element("div", {
    className: `toast ${kind === "error" ? "error" : ""}`,
    text: message,
  });
  region.append(toast);
  window.setTimeout(() => toast.remove(), 4600);
}

// --- WS-08 composer feedback store --------------------------------------
// Feedback is keyed by {sessionId, operationId}, holds a `kind` of
// "transient" (auto-clears) or "persistent" (stays until handled or
// superseded by a newer operation of the same `category` for that
// session). Storage never depends on which session is active — any
// session's operation outcome is written into that session's own bucket
// regardless of state.activeSessionId, so a backgrounded session's problem
// is not lost; only rendering is scoped to the active session (below).
// Persistent problems get one slot per category (run/cancel/draft): a
// newer write of the same category replaces it, but different categories
// coexist and are all shown. #draft-status is the only place that reads
// this store; nothing else writes to that element directly.
const FEEDBACK_CATEGORY_ORDER = ["run", "cancel", "draft"];

function feedbackBucket(sessionId) {
  if (!sessionId) return null;
  if (!state.feedback.has(sessionId)) {
    state.feedback.set(sessionId, {
      transient: null,
      persistent: { run: null, cancel: null, draft: null },
    });
  }
  return state.feedback.get(sessionId);
}

function setTransientFeedback(
  sessionId,
  operationId,
  category,
  text,
  { duration = 3000 } = {},
) {
  const bucket = feedbackBucket(sessionId);
  if (!bucket) return;
  if (bucket.transient?.timer) window.clearTimeout(bucket.transient.timer);
  let timer = null;
  if (duration) {
    timer = window.setTimeout(() => {
      const current = state.feedback.get(sessionId);
      if (current?.transient?.operationId === operationId) {
        current.transient = null;
        if (state.activeSessionId === sessionId) renderFeedback();
      }
    }, duration);
  }
  bucket.transient = {
    sessionId,
    operationId,
    kind: "transient",
    category,
    text,
    timer,
  };
  if (state.activeSessionId === sessionId) renderFeedback();
}

function setPersistentFeedback(
  sessionId,
  operationId,
  category,
  text,
  { nextAction = null } = {},
) {
  const bucket = feedbackBucket(sessionId);
  if (!bucket) return;
  bucket.persistent[category] = {
    sessionId,
    operationId,
    kind: "persistent",
    category,
    text,
    nextAction,
  };
  if (state.activeSessionId === sessionId) renderFeedback();
}

function clearPersistentFeedback(sessionId, category) {
  const bucket = state.feedback.get(sessionId);
  if (!bucket?.persistent?.[category]) return;
  bucket.persistent[category] = null;
  if (state.activeSessionId === sessionId) renderFeedback();
}

function renderFeedback() {
  const el = $("draft-status");
  if (!el) return;
  clear(el);
  const sessionId = state.activeSessionId;
  const bucket = sessionId ? state.feedback.get(sessionId) : null;
  const persistentEntries = bucket
    ? FEEDBACK_CATEGORY_ORDER.map(
        (category) => bucket.persistent[category],
      ).filter(Boolean)
    : [];
  // Persistent problems (one per category, run -> cancel -> draft) take
  // priority; a transient confirmation is only shown when nothing is
  // currently unresolved.
  const transient = persistentEntries.length ? null : bucket?.transient || null;
  if (!persistentEntries.length && !transient) {
    el.className = "draft-status";
    return;
  }
  el.className =
    `draft-status ${persistentEntries.length ? "error" : "saved"}`.trim();
  for (const entry of persistentEntries) el.append(renderFeedbackLine(entry));
  if (transient) el.append(renderFeedbackLine(transient));
}

function renderFeedbackLine(entry) {
  const line = element("div", {
    className: "draft-status-line",
    text: entry.text,
  });
  if (entry.nextAction === "retry-run") {
    const retry = element("button", {
      className: "text-button",
      attrs: { type: "button" },
      text: "Recover run receipt",
    });
    retry.addEventListener("click", () => void recoverRunReceipt());
    line.append(retry);
  }
  if (entry.nextAction === "view-history") {
    line.append(document.createTextNode(" "));
    const button = element("button", {
      className: "text-button draft-status-action",
      attrs: { type: "button" },
      text: "View history",
    });
    button.addEventListener("click", () => scrollToLatestMessage());
    line.append(button);
  }
  return line;
}

function scrollToLatestMessage() {
  const stream = $("message-stream");
  if (!stream) return;
  stream.scrollTop = stream.scrollHeight;
  rememberMessageReading(stream, { forceFollow: true });
}

// --- Error-copy mapping table --------------------------------------------
// One table governs every command-failure message shown in the composer
// feedback bar: code (operation + isUncertainCommandError classification)
// -> plain-language text -> retryable -> next action. isUncertainCommandError
// is the existing V7-01 guard (kept unmodified); this table only decides
// copy and affordance from its verdict, it does not change when a failure
// counts as uncertain.
const ERROR_COPY = {
  "run:uncertain": {
    text: () =>
      "Could not confirm run admission. Check session history before retrying.",
    retryable: false,
    nextAction: "view-history",
  },
  "run:rejected": {
    text: (error) => `Run was not started: ${error.message}`,
    retryable: true,
    nextAction: "retry",
  },
  "cancel:uncertain": {
    text: () =>
      "Could not confirm run cancellation. Check session history before retrying.",
    retryable: false,
    nextAction: "view-history",
  },
  "cancel:rejected": {
    text: (error) => `Run was not cancelled: ${error.message}`,
    retryable: true,
    nextAction: "retry",
  },
  "draft:uncertain": {
    text: (error) => `Draft not saved: ${error.message}`,
    retryable: true,
    nextAction: "retry-edit",
  },
  "draft:rejected": {
    text: (error) => `Draft not saved: ${error.message}`,
    retryable: true,
    nextAction: "retry-edit",
  },
};

function describeCommandError(operation, error) {
  const code = `${operation}:${isUncertainCommandError(error) ? "uncertain" : "rejected"}`;
  const entry = ERROR_COPY[code] || {
    text: (err) => err.message,
    retryable: true,
    nextAction: "retry",
  };
  return {
    code,
    text: entry.text(error),
    retryable: entry.retryable,
    nextAction: entry.nextAction,
  };
}

async function request(path, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  const init = {
    method: options.method || "GET",
    headers,
    signal: options.signal,
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }
  if (state.token && path !== "/bootstrap")
    headers["X-Work-Token"] = state.token;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    const networkError = new Error("The local runtime could not be reached.");
    networkError.cause = error;
    throw networkError;
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  // Router 401 means no command was admitted. Refresh a process-scoped token
  // once; transport errors and 5xx receipts are never automatically replayed.
  if (
    response.status === 401 &&
    payload?.error?.code === "unauthorized" &&
    path !== "/bootstrap" &&
    !options.tokenRetried
  ) {
    const bootstrap = await request("/bootstrap", { signal: options.signal });
    if (bootstrap.sessionToken) {
      state.token = bootstrap.sessionToken;
      return request(path, { ...options, tokenRetried: true });
    }
  }
  if (!response.ok) {
    const message =
      payload?.error?.message || `Request failed (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    error.body = payload;
    throw error;
  }
  return payload || {};
}

function surfaceIdentity(context) {
  if (!context) return null;
  return {
    sessionId: context.sessionId || null,
    extensionId: context.extensionId || null,
    generation: context.generation ?? null,
    status: context.status || null,
    modulePath: context.modulePath || null,
  };
}

function sameSurfaceIdentity(left, right) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  const a = surfaceIdentity(left);
  const b = surfaceIdentity(right);
  return (
    a.sessionId === b.sessionId &&
    a.extensionId === b.extensionId &&
    a.generation === b.generation &&
    a.status === b.status &&
    a.modulePath === b.modulePath
  );
}

function extensionModulePath(extension) {
  return extension?.surface?.module || extension?.module || null;
}

function surfaceIdentityFromExtension(extension, sessionId) {
  if (!extension) return null;
  return {
    sessionId,
    extensionId: extension.id || null,
    generation: extension.generation ?? null,
    status: extension.status || null,
    modulePath: extensionModulePath(extension),
  };
}

function projectionsEqual(left, right) {
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return left === right;
  }
}

function guardForSurface(context) {
  const current = state.surface.context;
  const infoExtension = state.surface.info?.extension;
  return Boolean(
    context &&
      current &&
      context.requestId === state.surface.requestId &&
      context.requestId === current.requestId &&
      context.epoch === state.sessionEpoch &&
      context.sessionId === state.activeSessionId &&
      sameSurfaceIdentity(context, current) &&
      infoExtension &&
      infoExtension.id === current.extensionId &&
      (infoExtension.generation ?? null) === (current.generation ?? null) &&
      (infoExtension.status || null) === (current.status || null) &&
      extensionModulePath(infoExtension) === (current.modulePath || null),
  );
}

function guardForSurfaceFetch({
  epoch,
  sessionId,
  fetchRequestId,
  controller,
}) {
  return (
    epoch === state.sessionEpoch &&
    sessionId === state.activeSessionId &&
    fetchRequestId === state.surface.fetchRequestId &&
    controller === state.surface.fetchController &&
    !controller.signal.aborted
  );
}

function invalidateSurfaceFetches() {
  state.surface.fetchController?.abort();
  state.surface.fetchController = null;
  state.surface.fetchRequestId += 1;
}

function mergeEvents(events) {
  const bySeq = new Map(state.events.map((event) => [event.seq, event]));
  const priorSeq = state.lastSeq;
  const fresh = [];
  let changed = false;
  for (const event of events || []) {
    const eventSessionId = sessionIdForEvent(event);
    if (eventSessionId && eventSessionId !== state.activeSessionId) continue;
    if (Number.isFinite(event.seq)) {
      if (bySeq.has(event.seq)) continue;
      changed = true;
      bySeq.set(event.seq, event);
      if (Number(event.seq) > priorSeq) fresh.push(event);
    }
    const type = normalizedType(event.type);
    if (type === "run/status" && event.runId && event.data?.status)
      changed =
        mergeRun(
          { id: event.runId, status: event.data.status },
          { sessionId: eventSessionId || state.activeSessionId },
        ) || changed;
    if (type === "run/error" && event.runId)
      changed =
        mergeRun(
          { id: event.runId, status: "failed", error: event.data },
          { sessionId: eventSessionId || state.activeSessionId },
        ) || changed;
    if (type === "run/usage" && event.runId)
      mergeRun(
        { id: event.runId, usage: event.data },
        { sessionId: eventSessionId || state.activeSessionId },
      );
    if (type === "artifact/written" && event.runId) {
      const previous = state.runs.find((run) => run.id === event.runId);
      const artifacts = [...(previous?.artifacts || [])];
      if (
        !artifacts.some(
          (file) =>
            file.path === event.data?.path &&
            file.sha256 === event.data?.sha256 &&
            file.writtenAt === event.data?.writtenAt,
        )
      )
        artifacts.push(event.data);
      mergeRun(
        { id: event.runId, artifacts },
        { sessionId: eventSessionId || state.activeSessionId },
      );
    }
    if (type === "question/resolved" || type === "permission/resolved") {
      const questionId = event.data?.id || event.data?.questionId;
      if (questionId !== undefined) {
        const key = questionScopeKey(event.runId, questionId);
        state.questionDrafts.delete(key);
        state.questionControls.delete(key);
        state.questionSubmitting.delete(key);
        state.questionSubmitted.delete(key);
        state.questionErrors.delete(key);
      }
    }
  }
  state.events = [...bySeq.values()].sort((a, b) => a.seq - b.seq);
  state.lastSeq = state.events.reduce(
    (max, event) => Math.max(max, Number(event.seq) || 0),
    state.lastSeq,
  );
  if (changed) bumpSessionMutation(state.activeSessionId);
  // priorSeq 0 is the first snapshot of a session: replaying its whole history
  // as motion would be a loop, so only later arrivals play.
  if (priorSeq > 0)
    brandPendingVerb = brandVerbForEvents(fresh) || brandPendingVerb;
  return changed;
}

function mergeRun(
  run,
  { sessionId = state.activeSessionId, preserveStatus = false } = {},
) {
  if (
    !runBelongsToSession(run, sessionId) ||
    sessionId !== state.activeSessionId
  )
    return false;
  const scopedRun = run.sessionId ? run : { ...run, sessionId };
  const index = state.runs.findIndex((item) => item.id === run.id);
  if (index === -1) {
    state.runs.push(scopedRun);
    bumpSessionMutation(sessionId);
    return true;
  }
  const previous = state.runs[index];
  if (
    isTerminalRunStatus(previous.status) &&
    scopedRun.status &&
    scopedRun.status !== previous.status
  )
    return false;
  const next = {
    ...previous,
    ...scopedRun,
    ...(preserveStatus &&
    previous.status &&
    scopedRun.status &&
    previous.status !== scopedRun.status
      ? { status: previous.status }
      : {}),
  };
  state.runs[index] = next;
  const changed =
    previous.status !== next.status ||
    previous.error !== next.error ||
    previous.id !== next.id;
  if (changed) bumpSessionMutation(sessionId);
  return changed;
}

function stopPolling() {
  if (state.pollTimer) window.clearTimeout(state.pollTimer);
  state.pollTimer = null;
  state.pollController?.abort();
  state.pollController = null;
}

function schedulePolling(epoch, delay = 900) {
  if (epoch !== state.sessionEpoch || !currentSession()) return;
  if (state.pollTimer) window.clearTimeout(state.pollTimer);
  state.pollTimer = window.setTimeout(() => {
    state.pollTimer = null;
    void pollEvents(epoch);
  }, delay);
}

async function pollEvents(epoch) {
  if (epoch !== state.sessionEpoch || !currentSession()) return;
  const sessionId = state.activeSessionId;
  if (!state.pollController) state.pollController = new AbortController();
  const controller = state.pollController;
  const hadActiveRun = state.runs.some(isActiveRun);
  const wasConnectionLost = state.connectionLost;
  // G2-r2 probe-lifecycle fix: capture which outage round this request was
  // issued under. If a different, in-between round already ended and a new
  // one began before this request returns, a success here is a stale
  // receipt for a round that no longer exists — see the identical reasoning
  // in scheduleRecoveryProbe/refreshActiveSession below.
  const connectionEpoch = state.connectionEpoch;
  try {
    const page = await request(
      `/sessions/${encodeURIComponent(sessionId)}/events?afterSeq=${state.lastSeq}`,
      {
        signal: controller.signal,
      },
    );
    if (
      epoch !== state.sessionEpoch ||
      sessionId !== state.activeSessionId ||
      controller.signal.aborted
    )
      return;
    if (wasConnectionLost && connectionEpoch === state.connectionEpoch) {
      // WS-12: connection state is separate from run state. The failing
      // request never changed run status; on recovery we do not merge the
      // (possibly gapped) incremental page, we refetch the full session
      // detail so the UI adopts the Host's actual current state.
      setConnectionLost(false);
      await refreshActiveSession();
    } else {
      // Either the connection was never lost for this request, or it was
      // lost under an outage round that has since ended or been superseded
      // by a newer one: a late success here must not touch a newer round's
      // connection state (or stop its probe) — just merge the page like an
      // ordinary successful poll.
      const changed = mergeEvents(page.events || []);
      if (changed) renderChat();
      if (state.surface.open && state.surface.kind === "run" && changed)
        void readRunDetails();
      if (hadActiveRun && !state.runs.some(isActiveRun)) {
        // A run ending lifts the runtime freeze; the module reads the fact
        // from a fresh snapshot rather than deciding it locally.
        if (state.surface.open && state.surface.kind === "runtime")
          void runtimeView?.refresh();
        await loadSurface(epoch);
        void refreshRunDetails(
          state.runs.find((run) => run.id === state.surface.runId)?.id ||
            state.runs.at(-1)?.id,
        );
      }
    }
  } catch (error) {
    if (
      error.body?.error?.code === "cursor_ahead" &&
      epoch === state.sessionEpoch
    ) {
      await refreshActiveSession();
    } else if (error?.name !== "AbortError" && epoch === state.sessionEpoch) {
      setConnectionLost(true);
    }
  }
  if (
    epoch === state.sessionEpoch &&
    currentSession() &&
    state.runs.some(isActiveRun)
  )
    schedulePolling(epoch);
  else stopPolling();
}

function setConnectionLost(isLost) {
  if (state.connectionLost === isLost) return;
  state.connectionLost = isLost;
  // G2-r2: every true<->false transition starts a new "outage round". Any
  // probe or refetch issued under an earlier round captures this epoch at
  // issue time and checks it again on return, so a stale receipt from an
  // already-ended round can never act on a newer round (see
  // scheduleRecoveryProbe/refreshActiveSession/pollEvents above).
  state.connectionEpoch += 1;
  renderConnectionStatus();
  renderComposer();
  // WK-14: presence is the connection, so it moves on this transition too.
  paintBrandPresence();
  if (isLost) startRecoveryProbe();
  else stopRecoveryProbe();
}

function renderConnectionStatus() {
  const bar = $("connection-status");
  if (!bar) return;
  bar.hidden = !state.connectionLost;
}

// WS-12: connection loss is an application-level condition, not something
// that can only be noticed by the run-event polling loop — that loop only
// runs while the active session has an active run (schedulePolling/
// pollEvents above), so switching to an idle session would otherwise
// strand connectionLost with no way to ever observe recovery. This probe
// runs on its own 900ms cadence, independent of that polling loop, for as
// long as connectionLost is true, and stops on recovery or page unload
// (see the "beforeunload" listener in wireEvents). Any successful Host
// response the probe itself observes counts as recovery: it calls the
// lightweight, session-independent /bootstrap endpoint, and on success
// clears connectionLost and (when a session is active) triggers
// refreshActiveSession() to adopt the Host's real current state — the same
// two effects a successful manual Refresh has (see refreshActiveSession
// below, which clears connectionLost on its own successful read so the
// "Refresh" button is an equally valid recovery signal).
// G2-r2 fix (adjudication-r2.md): a probe's own receipt — success OR
// failure — must only be allowed to act (clear connectionLost, refetch, or
// reschedule) when the outage round it was issued under (state.connectionEpoch
// at issue time, captured just before the request goes out, "at issue time")
// is still the current one AND connectionLost is still true. Otherwise the
// receipt is stale (its round already ended, or a newer round has already
// started) and must be dropped with no further action, including no
// reschedule — a fresh probe for the new round is what schedules the next
// attempt instead (started by setConnectionLost(true) -> startRecoveryProbe
// on the new round). This is what stops a first-outage probe's late success
// from clearing a second, unrelated outage that started after the first one
// had already ended.
function startRecoveryProbe() {
  if (state.recoveryProbeTimer) return;
  scheduleRecoveryProbe();
}

function stopRecoveryProbe() {
  if (state.recoveryProbeTimer) window.clearTimeout(state.recoveryProbeTimer);
  state.recoveryProbeTimer = null;
  // Fail/abort the in-flight probe request (if any) so its eventual receipt
  // cannot act on a round that has already ended by the time it arrives.
  // The epoch check below is a second, independent guard against exactly
  // that even if a receipt still slips through (e.g. it was already past
  // its own await when this abort fires), so this is defense in depth, not
  // the only thing making the fix correct.
  state.recoveryProbeController?.abort();
  state.recoveryProbeController = null;
}

function scheduleRecoveryProbe() {
  state.recoveryProbeTimer = window.setTimeout(async () => {
    state.recoveryProbeTimer = null;
    if (!state.connectionLost) return;
    // Captured here, at issue time, immediately before the request is sent.
    const probeEpoch = state.connectionEpoch;
    const controller = new AbortController();
    state.recoveryProbeController = controller;
    let succeeded = false;
    let bootstrap = null;
    try {
      bootstrap = await request("/bootstrap", { signal: controller.signal });
      succeeded = true;
    } catch {
      // Network failure, or an AbortError from stopRecoveryProbe having
      // ended this probe's round while it was in flight — either way,
      // handled uniformly by the epoch/connectionLost check below.
    }
    if (state.recoveryProbeController === controller)
      state.recoveryProbeController = null;
    if (state.connectionEpoch !== probeEpoch || !state.connectionLost) {
      // This round already ended (recovered some other way, e.g. an
      // explicit Refresh) or was superseded by a newer outage while this
      // probe was in flight. Drop the receipt and do not reschedule — a
      // still-active newer round already has its own probe running from
      // when it started; a since-recovered round needs no more probing.
      return;
    }
    if (succeeded) {
      if (bootstrap?.sessionToken) state.token = bootstrap.sessionToken;
      setConnectionLost(false);
      if (state.activeSessionId) void refreshActiveSession();
      return; // setConnectionLost(false) already stopped the probe for this round.
    }
    scheduleRecoveryProbe();
  }, 900);
}

async function saveDraft(
  sessionId,
  text,
  { revision = draftRevision(sessionId) } = {},
) {
  if (!sessionId) return false;
  const operationId = nextOperationId("draft");
  const previous = state.draftQueues.get(sessionId) || Promise.resolve(true);
  let task;
  task = previous
    .catch(() => false)
    .then(async () => {
      try {
        await request(`/sessions/${encodeURIComponent(sessionId)}/draft`, {
          method: "PUT",
          body: { text },
        });
        if (
          draftRevision(sessionId) === revision &&
          state.draftCache.get(sessionId) === text
        ) {
          state.draftDirty.delete(sessionId);
          // WS-08: storage is not gated on which session is active (see submitRun).
          clearPersistentFeedback(sessionId, "draft");
          setTransientFeedback(sessionId, operationId, "draft", "Draft saved");
        }
        return true;
      } catch (error) {
        const currentDraft =
          draftRevision(sessionId) === revision &&
          state.draftCache.get(sessionId) === text;
        if (currentDraft) {
          state.draftDirty.add(sessionId);
          const copy = describeCommandError("draft", error);
          setPersistentFeedback(sessionId, operationId, "draft", copy.text, {
            nextAction: copy.nextAction,
          });
        }
        return false;
      }
    })
    .finally(() => {
      if (state.draftQueues.get(sessionId) === task)
        state.draftQueues.delete(sessionId);
    });
  state.draftQueues.set(sessionId, task);
  return task;
}

async function awaitDraftQueue(sessionId) {
  while (state.draftQueues.has(sessionId)) {
    const queue = state.draftQueues.get(sessionId);
    await queue;
  }
}

function scheduleDraftSave() {
  const session = currentSession();
  if (!session) return;
  const sessionId = session.id;
  if (state.draftTimers.has(sessionId))
    window.clearTimeout(state.draftTimers.get(sessionId));
  const timer = window.setTimeout(() => {
    state.draftTimers.delete(sessionId);
    const revision = draftRevision(sessionId);
    const text = state.draftCache.get(sessionId) || "";
    void saveDraft(sessionId, text, { revision });
  }, 700);
  state.draftTimers.set(sessionId, timer);
  setTransientFeedback(
    sessionId,
    nextOperationId("draft-pending"),
    "draft",
    "Saving draft…",
    { duration: null },
  );
}

async function persistCurrentDraft() {
  const session = currentSession();
  if (!session) return;
  await persistDraftForSession(session.id);
}

async function persistDraftForSession(
  sessionId,
  {
    revision = draftRevision(sessionId),
    text = state.draftCache.get(sessionId) || "",
  } = {},
) {
  if (!sessionId) return;
  const pending = state.draftTimers.get(sessionId);
  if (pending) window.clearTimeout(pending);
  state.draftTimers.delete(sessionId);
  if (!state.draftDirty.has(sessionId)) return;
  await saveDraft(sessionId, text, { revision });
  await awaitDraftQueue(sessionId);
}

function detachOwnedSurfaceContainer(container) {
  if (!container) return;
  if (container.parentNode?.removeChild)
    container.parentNode.removeChild(container);
  else container.remove?.();
  if (state.surface.ownedContainer === container)
    state.surface.ownedContainer = null;
}

async function disposeSurfaceRenderer({ abortFetch = true } = {}) {
  if (abortFetch) {
    invalidateSurfaceFetches();
  }
  const mounted = state.surface.mounted;
  const rendererController = state.surface.controller;
  const ownedContainer = state.surface.ownedContainer;
  rendererController?.abort();
  state.surface.controller = null;
  state.surface.mounted = null;
  state.surface.module = null;
  state.surface.context = null;
  state.surface.ownedContainer = null;
  detachOwnedSurfaceContainer(ownedContainer);
  state.surface.info = null;
  state.surface.projection = null;
  if (mounted?.dispose) {
    try {
      await mounted.dispose();
    } catch {
      // Renderer cleanup is best effort; the host still owns lifecycle fences.
    }
  }
}

async function invalidateSurfaceForExtensionChange(previousExtensions = null) {
  const context = state.surface.context;
  const infoExtension = state.surface.info?.extension || null;
  const boundExtensionId =
    context?.extensionId ||
    infoExtension?.id ||
    currentSession()?.extensionBinding?.extensionId ||
    null;
  if (!boundExtensionId) return;
  const previousExtension =
    previousExtensions?.find((item) => item.id === boundExtensionId) ||
    infoExtension ||
    null;
  const currentIdentity =
    context ||
    surfaceIdentityFromExtension(previousExtension, state.activeSessionId);
  const extension =
    state.extensions.find((item) => item.id === boundExtensionId) || null;
  const nextIdentity = surfaceIdentityFromExtension(
    extension,
    state.activeSessionId,
  );
  if (sameSurfaceIdentity(currentIdentity, nextIdentity)) return;
  state.surface.requestId += 1;
  const expectedFetchRequestId = state.surface.fetchRequestId + 1;
  await disposeSurfaceRenderer();
  if (
    state.surface.fetchRequestId !== expectedFetchRequestId ||
    state.surface.context
  )
    return;
  state.surface.info = null;
  state.surface.projection = null;
  setWorkspaceTitle("Files");
  renderSurfaceFallback();
}

function maxEventSeq(events) {
  return (events || []).reduce(
    (max, event) => Math.max(max, Number(event.seq) || 0),
    0,
  );
}

function sessionRuns(runs, sessionId) {
  return (runs || []).filter((run) => runBelongsToSession(run, sessionId));
}

function applySessionDetail(
  detail,
  sessionId,
  { readVersion, readSeq, readToken } = {},
) {
  if (
    sessionId !== state.activeSessionId ||
    !isCurrentSessionRead(sessionId, readToken)
  )
    return false;
  const incomingEvents = (detail.events || [])
    .filter(
      (event) =>
        !sessionIdForEvent(event) || sessionIdForEvent(event) === sessionId,
    )
    .slice()
    .sort((a, b) => a.seq - b.seq);
  const incomingSeq = maxEventSeq(incomingEvents);
  const currentVersion = state.sessionMutationVersions.get(sessionId) || 0;
  const hasNewerLocalObservation =
    currentVersion !== readVersion ||
    state.lastSeq > incomingSeq ||
    state.lastSeq > readSeq;
  if (!hasNewerLocalObservation) {
    state.session = detail.session || state.session;
    state.events = incomingEvents;
    state.runs = sessionRuns(detail.runs, sessionId);
    state.lastSeq = incomingSeq;
  } else {
    // A local command/event was observed after this read began. Keep that
    // state and use the read only to fill in a session object on first load.
    if (!state.session && detail.session) state.session = detail.session;
    if (incomingSeq > state.lastSeq) mergeEvents(incomingEvents);
  }
  if (!state.draftCache.has(sessionId)) {
    state.draftCache.set(
      sessionId,
      state.session?.draft || detail.session?.draft || "",
    );
    state.draftRevisions.set(sessionId, 0);
    state.draftDirty.delete(sessionId);
  }
  const uncertain = state.unconfirmedRuns.get(sessionId);
  if (
    uncertain &&
    state.runs.some((run) => run.commandId === uncertain.commandId)
  ) {
    state.unconfirmedRuns.delete(sessionId);
    storeUnconfirmedRuns();
    clearPersistentFeedback(sessionId, "run");
    setTransientFeedback(
      sessionId,
      uncertain.operationId,
      "run",
      "Previous run found. Your current draft is kept.",
    );
  }
  return true;
}

async function selectSession(
  sessionId,
  { navigationEpoch: suppliedNavigationEpoch = null, focus = true } = {},
) {
  if (!sessionId) return;
  if (sessionId === state.activeSessionId) {
    state.view = "session";
    closeNavigation({ restoreFocus: false });
    renderAll();
    if (focus) restoreLayerFocus($("composer-input"));
    return;
  }
  const navigationEpoch = suppliedNavigationEpoch ?? state.navigationEpoch + 1;
  if (suppliedNavigationEpoch === null) state.navigationEpoch = navigationEpoch;
  if (navigationEpoch !== state.navigationEpoch) return;
  await persistCurrentDraft();
  if (navigationEpoch !== state.navigationEpoch) return;
  stopPolling();
  await disposeSurfaceRenderer();
  if (navigationEpoch !== state.navigationEpoch) return;
  const epoch = state.sessionEpoch + 1;
  state.sessionEpoch = epoch;
  state.activeSessionId = sessionId;
  state.view = "session";
  state.surface.open = false;
  state.surface.kind = "preview";
  state.surface.runId = null;
  state.surface.fileRef = null;
  state.surface.runReadController?.abort();
  state.surface.runReadGeneration++;
  fileView?.dispose();
  materialsView?.reset();
  closeNavigation({ restoreFocus: false });
  writeUiState();
  state.session = null;
  state.events = [];
  state.runs = [];
  state.lastSeq = 0;
  state.bindingExtensionId = null;
  state.surface.expanded = false;
  state.recordedContext.clear();
  runtimeView?.pause();
  brandWroteRuns.clear();
  renderAll();
  if (focus) restoreLayerFocus($("session-title"));

  let readToken;
  try {
    const readVersion = state.sessionMutationVersions.get(sessionId) || 0;
    const readSeq = state.lastSeq;
    readToken = nextSessionReadToken(sessionId);
    const detail = await request(`/sessions/${encodeURIComponent(sessionId)}`);
    if (
      epoch !== state.sessionEpoch ||
      navigationEpoch !== state.navigationEpoch ||
      state.activeSessionId !== sessionId
    )
      return;
    if (
      !applySessionDetail(detail, sessionId, {
        readVersion,
        readSeq,
        readToken,
      })
    )
      return;
    renderAll();
    playBrandVerb("summon");
    await loadSurface(epoch);
    if (state.runs.some(isActiveRun)) {
      state.pollController = new AbortController();
      schedulePolling(epoch, 0);
    }
  } catch (error) {
    if (
      epoch !== state.sessionEpoch ||
      navigationEpoch !== state.navigationEpoch ||
      !isCurrentSessionRead(sessionId, readToken)
    )
      return;
    showToast(`Could not load session: ${error.message}`, "error");
    state.session = null;
    renderAll();
  }
}

function clearActiveSession() {
  playBrandVerb("withdraw");
  brandWroteRuns.clear();
  stopPolling();
  void disposeSurfaceRenderer();
  state.sessionEpoch += 1;
  state.activeSessionId = null;
  state.view = "home";
  state.surface.open = false;
  state.surface.kind = "preview";
  state.surface.fileRef = null;
  state.surface.runId = null;
  state.surface.runReadController?.abort();
  state.surface.runReadGeneration++;
  fileView?.dispose();
  materialsView?.reset();
  state.session = null;
  state.events = [];
  state.runs = [];
  state.lastSeq = 0;
  state.bindingExtensionId = null;
  state.surface.expanded = false;
  state.recordedContext.clear();
  runtimeView?.pause();
  writeUiState();
  renderAll();
}

async function loadSessionsForProject(projectId, { force = false } = {}) {
  if (!projectId || (!force && state.sessionsByProject.has(projectId)))
    return state.sessionsByProject.get(projectId) || [];
  try {
    const result = await request(
      `/sessions?projectId=${encodeURIComponent(projectId)}`,
    );
    const sessions = Array.isArray(result.sessions) ? result.sessions : [];
    state.sessionListErrors.delete(projectId);
    state.sessionsByProject.set(projectId, sessions);
    return sessions;
  } catch (error) {
    showToast(`Could not load sessions: ${error.message}`, "error");
    state.sessionListErrors.set(projectId, error.message);
    return null;
  }
}

async function refreshNavigationAndSession() {
  const navigationEpoch = state.navigationEpoch + 1;
  state.navigationEpoch = navigationEpoch;
  await loadProjects();
  if (navigationEpoch !== state.navigationEpoch || !state.activeProjectId)
    return;
  const sessions = await loadSessionsForProject(state.activeProjectId, {
    force: true,
  });
  if (navigationEpoch !== state.navigationEpoch || !sessions) return;
  if (state.view === "home") {
    renderProjectList();
    await loadHome();
    return;
  }
  if (
    state.activeSessionId &&
    sessions.some((session) => session.id === state.activeSessionId)
  ) {
    await refreshActiveSession();
    return;
  }
  if (sessions[0]) await selectSession(sessions[0].id, { navigationEpoch });
  else clearActiveSession();
}

async function selectProject(projectId, { sessionId = null } = {}) {
  if (!projectId) return;
  const navigationEpoch = state.navigationEpoch + 1;
  state.navigationEpoch = navigationEpoch;
  await persistCurrentDraft();
  if (navigationEpoch !== state.navigationEpoch) return;
  if (!state.projects.some((project) => project.id === projectId)) return;
  state.activeProjectId = projectId;
  state.openProjectIds.add(projectId);
  writeUiState();
  renderProjectList();
  const sessions = await loadSessionsForProject(projectId);
  if (navigationEpoch !== state.navigationEpoch) return;
  renderProjectList();
  if (!sessions) return;
  const requested =
    sessionId && sessions.find((session) => session.id === sessionId);
  const current = currentSession();
  if (requested) await selectSession(requested.id, { navigationEpoch });
  else if (!current || current.projectId !== projectId) {
    clearActiveSession();
    void loadHome();
  }
  writeUiState();
}

async function loadProjects() {
  const result = await request("/projects");
  state.projects = result.projects || [];
  const valid = new Set(state.projects.map((project) => project.id));
  for (const projectId of state.sessionsByProject.keys()) {
    if (!valid.has(projectId)) state.sessionsByProject.delete(projectId);
  }
  state.openProjectIds = new Set(
    [...state.openProjectIds].filter((projectId) => valid.has(projectId)),
  );
  if (state.activeProjectId && !valid.has(state.activeProjectId)) {
    state.activeProjectId = null;
    state.restoreSessionId = null;
    clearActiveSession();
  }
  renderProjectList();
}

async function restoreUiSelection() {
  const projectId =
    state.activeProjectId &&
    state.projects.some((project) => project.id === state.activeProjectId)
      ? state.activeProjectId
      : state.projects[0]?.id || null;
  if (!projectId) {
    state.activeProjectId = null;
    state.restoreSessionId = null;
    clearActiveSession();
    void loadHome();
    return;
  }
  const requestedSessionId = state.restoreSessionId;
  state.restoreSessionId = null;
  await selectProject(projectId, { sessionId: requestedSessionId });
  writeUiState();
}

async function loadExtensions() {
  const previousExtensions = state.extensions;
  const result = await request("/extensions");
  state.extensions = result.extensions || [];
  await invalidateSurfaceForExtensionChange(previousExtensions);
  renderExtensionList();
  renderBindingPanel();
}

async function loadProviderConfig() {
  const result = await request("/provider-config");
  state.providerConfig = result;
  renderProviderPanel();
}

async function refreshActiveSession() {
  if (!state.activeSessionId) return;
  const id = state.activeSessionId;
  const epoch = state.sessionEpoch;
  const readVersion = state.sessionMutationVersions.get(id) || 0;
  const readSeq = state.lastSeq;
  const readToken = nextSessionReadToken(id);
  // G2-r2 probe-lifecycle fix: capture the outage round this read was
  // issued under. Whether this call came from the user's own manual
  // Refresh (refreshNavigationAndSession -> here) or from the recovery
  // probe's follow-up (scheduleRecoveryProbe above), a successful read is
  // only proof of recovery for the round it was actually issued under. If a
  // round issued while healthy (or during an earlier outage) doesn't return
  // until a *different* — newer — outage round has already started, that
  // stale receipt must not clear the newer round's connectionLost or stop
  // its probe; it is still perfectly good session data, so it is still
  // applied, just without touching connection state.
  const connectionEpoch = state.connectionEpoch;
  try {
    const detail = await request(`/sessions/${encodeURIComponent(id)}`);
    if (epoch !== state.sessionEpoch || id !== state.activeSessionId) return;
    // WS-12: this is the "refetch current session detail" step recovery is
    // supposed to end in — a successful read here is itself proof the Host
    // is reachable again, whether this call came from the user's own
    // manual Refresh (refreshNavigationAndSession -> here) or from the
    // recovery probe's follow-up (scheduleRecoveryProbe above). No-ops if
    // connectionLost is already false. Only acts on connection state when
    // the outage round is still the one this read was issued under (see
    // comment above) — otherwise this is a stale receipt for a round that
    // already ended, and connection state/the probe are left alone.
    if (connectionEpoch === state.connectionEpoch) setConnectionLost(false);
    if (!applySessionDetail(detail, id, { readVersion, readSeq, readToken }))
      return;
    renderAll();
    await loadSurface(epoch);
  } catch (error) {
    if (
      epoch !== state.sessionEpoch ||
      id !== state.activeSessionId ||
      !isCurrentSessionRead(id, readToken)
    )
      return;
    showToast(`Refresh failed: ${error.message}`, "error");
  }
}

function renderProjectList() {
  const list = $("project-list");
  const focusedKey = list.contains(document.activeElement)
    ? document.activeElement?.dataset.navKey
    : null;
  clear(list);
  $("project-count").textContent = String(state.projects.length);
  const query = state.navigationFilter.trim().toLocaleLowerCase();
  const filterInput = $("nav-filter-input");
  const clearFilter = $("clear-nav-filter-button");
  const filterStatus = $("nav-filter-status");
  if (filterInput && document.activeElement !== filterInput)
    filterInput.value = state.navigationFilter;
  if (clearFilter) clearFilter.hidden = !state.navigationFilter;
  if (filterStatus)
    filterStatus.textContent = query ? "Filtering loaded names only." : "";
  if (!state.projects.length) {
    list.append(
      element("p", { className: "empty-list", text: "No projects yet." }),
    );
    return;
  }
  const visibleProjects = state.projects.filter((project) => {
    if (!query) return true;
    const projectMatch = String(project.name || "")
      .toLocaleLowerCase()
      .includes(query);
    const sessions = state.sessionsByProject.get(project.id) || [];
    return (
      projectMatch ||
      sessions.some((session) =>
        String(session.title || "")
          .toLocaleLowerCase()
          .includes(query),
      )
    );
  });
  if (!visibleProjects.length) {
    list.append(
      element("p", {
        className: "empty-list",
        text: `No loaded project or session names match “${state.navigationFilter}”.`,
      }),
    );
    return;
  }
  for (const project of visibleProjects) {
    const open = state.openProjectIds.has(project.id);
    const row = element("div", { className: "project-row" });
    const button = element(
      "button",
      {
        className: `project-toggle ${state.activeProjectId === project.id ? "active" : ""}`,
        attrs: {
          type: "button",
          "aria-expanded": open,
          "aria-controls": `sessions-${project.id}`,
          "data-nav-key": `project:${project.id}`,
        },
      },
      element(
        "span",
        { className: "project-chevron" },
        icon(open ? "chevron-down" : "chevron-right"),
      ),
      icon("folder"),
      element("span", {
        className: "project-name",
        text: project.name || "Unnamed project",
      }),
    );
    button.addEventListener("click", () => {
      const wasOpen = state.openProjectIds.has(project.id);
      if (wasOpen) {
        state.openProjectIds.delete(project.id);
        writeUiState();
        renderProjectList();
      } else {
        state.openProjectIds.add(project.id);
        writeUiState();
        renderProjectList();
        void loadSessionsForProject(project.id).then(() => renderProjectList());
      }
    });
    const create = action(
      "plus",
      `New session in ${project.name}`,
      () => startNewSession({ projectId: project.id }),
      {
        className: "quiet-button project-create",
        attrs: { "data-nav-key": `create:${project.id}` },
      },
    );
    row.append(
      element("div", { className: "project-heading" }, button, create),
    );
    if (open) {
      const sessions = state.sessionsByProject.get(project.id);
      const sessionList = element("div", {
        className: "session-list",
        attrs: { id: `sessions-${project.id}` },
      });
      if (state.sessionListErrors.has(project.id)) {
        const retry = element("button", {
          className: "text-button",
          attrs: { type: "button" },
          text: "Retry loading sessions",
        });
        retry.addEventListener("click", async () => {
          await loadSessionsForProject(project.id, { force: true });
          renderProjectList();
        });
        sessionList.append(
          element("p", {
            className: "inline-error",
            text: state.sessionListErrors.get(project.id),
          }),
          retry,
        );
      } else if (!sessions) {
        sessionList.append(
          element("p", { className: "empty-list", text: "Loading sessions…" }),
        );
      } else if (!sessions.length) {
        sessionList.append(
          element("p", { className: "empty-list", text: "No sessions yet." }),
        );
      } else {
        const limit = state.navigationFilter
          ? sessions.length
          : state.navigationLimits.get(project.id) || 5;
        const visible = [...sessions]
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
          .slice(0, limit);
        const active = sessions.find(
          (session) => session.id === state.activeSessionId,
        );
        if (active && !visible.includes(active)) visible.push(active);
        for (const session of visible) {
          const sessionButton = element(
            "button",
            {
              className: `session-button ${session.id === state.activeSessionId ? "active" : ""}`,
              attrs: {
                type: "button",
                "aria-current":
                  session.id === state.activeSessionId ? "page" : null,
                "data-tooltip": session.title || "Untitled session",
                "data-nav-key": `session:${session.id}`,
              },
            },
            element("span", {
              className: "session-name",
              text: session.title || "Untitled session",
            }),
          );
          sessionButton.addEventListener(
            "click",
            () => void selectProject(project.id, { sessionId: session.id }),
          );
          sessionList.append(sessionButton);
        }
      }
      if (
        sessions &&
        sessions.length > (state.navigationLimits.get(project.id) || 5) &&
        !state.navigationFilter
      ) {
        const more = element("button", {
          className: "text-button nav-more",
          attrs: { type: "button" },
          text: "Show more",
        });
        more.addEventListener("click", () => {
          state.navigationLimits.set(
            project.id,
            (state.navigationLimits.get(project.id) || 5) + 10,
          );
          renderProjectList();
        });
        sessionList.append(more);
      }
      row.append(sessionList);
    }
    list.append(row);
  }
  if (focusedKey && document.activeElement === document.body)
    list.querySelector(`[data-nav-key="${CSS.escape(focusedKey)}"]`)?.focus();
}

function updateExtensionStatus(extension) {
  return `${extension.kind || "development-extension"} · ${extension.releaseStatus || "development"}`;
}

function renderExtensionList() {
  const list = $("extension-list");
  clear(list);
  if (!state.extensions.length) {
    list.append(
      element("p", {
        className: "empty-list",
        text: "No whitelisted extensions.",
      }),
    );
    return;
  }
  const session = currentSession();
  for (const extension of state.extensions) {
    const row = element("div", { className: "extension-row" });
    const head = element(
      "div",
      { className: "extension-row-head" },
      element("span", {
        className: "extension-row-title",
        text: extension.title || extension.id,
      }),
      element("span", {
        className: `extension-status ${extension.status || ""}`,
        text: extension.status || "unknown",
      }),
    );
    row.append(
      head,
      element("p", {
        className: "extension-row-meta",
        text: `${extension.id} · v${extension.version || "?"} · gen ${extension.generation ?? "?"}`,
      }),
    );
    row.append(
      element("p", {
        className: "extension-row-meta",
        text: updateExtensionStatus(extension),
      }),
    );
    const actions = element("div", { className: "extension-actions" });
    const lifecycleAction =
      extension.status === "loaded"
        ? "unload"
        : extension.status === "invalidated"
          ? "reload"
          : "load";
    const lifecycleButton = element("button", {
      className: "quiet-button",
      attrs: { type: "button" },
      text: lifecycleAction[0].toUpperCase() + lifecycleAction.slice(1),
    });
    lifecycleButton.addEventListener(
      "click",
      () => void lifecycle(extension.id, lifecycleAction),
    );
    actions.append(lifecycleButton);
    if (extension.status !== "invalidated") {
      const invalidateButton = element("button", {
        className: "quiet-button danger-button",
        attrs: { type: "button" },
        text: "Invalidate",
      });
      invalidateButton.addEventListener(
        "click",
        () => void lifecycle(extension.id, "invalidate"),
      );
      actions.append(invalidateButton);
    }
    if (extension.status === "loaded") {
      const reloadButton = element("button", {
        className: "quiet-button",
        attrs: { type: "button" },
        text: "Reload",
      });
      reloadButton.addEventListener(
        "click",
        () => void lifecycle(extension.id, "reload"),
      );
      actions.append(reloadButton);
      if (session && !session.extensionBinding) {
        const bindButton = element("button", {
          className: "secondary-button",
          attrs: { type: "button" },
          text: "Bind to session",
        });
        bindButton.addEventListener("click", () => {
          state.bindingExtensionId = extension.id;
          closeRuntimeDialog({ restoreFocus: false });
          renderBindingPanel();
          focusBindingEntry();
        });
        actions.append(bindButton);
      }
    }
    row.append(actions);
    list.append(row);
  }
}

async function lifecycle(extensionId, action) {
  try {
    await request(`/extensions/${encodeURIComponent(extensionId)}/lifecycle`, {
      method: "POST",
      body: { action },
    });
    await loadExtensions();
    if (state.activeSessionId) await loadSurface(state.sessionEpoch);
    showToast(`Extension ${action} completed.`);
  } catch (error) {
    showToast(`Extension ${action} failed: ${error.message}`, "error");
  }
}

function renderBindingPanel() {
  const panel = $("binding-panel");
  clear(panel);
  const extension = state.extensions.find(
    (item) => item.id === state.bindingExtensionId,
  );
  const session = currentSession();
  if (!extension || !session || session.extensionBinding) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const inner = element("div", { className: "binding-panel-inner" });
  inner.append(
    element("h3", { text: `Bind ${extension.title || extension.id}` }),
  );
  inner.append(
    element("p", {
      className: "binding-panel-note",
      text: "The extension validates these fields. The generic UI only renders the manifest declaration.",
    }),
  );
  const form = element("form", { className: "binding-form" });
  const fields = Array.isArray(extension.bindingFields)
    ? extension.bindingFields
    : [];
  const fieldsWrap = element("div", { className: "binding-fields" });
  const controls = [];
  for (const field of fields) {
    if (!field?.name) continue;
    const label = element("label", {
      className: "binding-field",
      text: field.label || field.name,
    });
    const control = field.multiline
      ? element("textarea", { attrs: { name: field.name, rows: 5 } })
      : element("input", { attrs: { name: field.name, type: "text" } });
    if (field.required) control.required = true;
    if (Number.isFinite(field.maxLength) && field.maxLength > 0)
      control.maxLength = field.maxLength;
    label.append(control);
    if (field.maxLength)
      label.append(
        element("small", { text: `Maximum ${field.maxLength} characters.` }),
      );
    fieldsWrap.append(label);
    controls.push({ field, control });
  }
  if (!controls.length)
    fieldsWrap.append(
      element("p", {
        className: "section-note",
        text: "This extension declares no input fields.",
      }),
    );
  form.append(fieldsWrap);
  const actions = element("div", { className: "binding-actions" });
  const cancel = element("button", {
    className: "quiet-button",
    attrs: { type: "button" },
    text: "Cancel",
  });
  cancel.addEventListener("click", () => {
    state.bindingExtensionId = null;
    renderBindingPanel();
    $("runtime-setup-button")?.focus();
  });
  actions.append(cancel);
  const submit = element("button", {
    className: "primary-button",
    attrs: { type: "submit" },
    text: "Create binding",
  });
  actions.append(submit);
  form.append(actions);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = {};
    for (const { field, control } of controls)
      input[field.name] = control.value;
    submit.disabled = true;
    try {
      const result = await request(
        `/sessions/${encodeURIComponent(session.id)}/extension`,
        {
          method: "POST",
          body: { extensionId: extension.id, input },
        },
      );
      if (state.activeSessionId !== session.id) return;
      state.session = result.session || state.session;
      state.sessionsByProject.set(
        session.projectId,
        (state.sessionsByProject.get(session.projectId) || []).map((item) =>
          item.id === session.id ? state.session : item,
        ),
      );
      state.bindingExtensionId = null;
      renderAll();
      await loadSurface(state.sessionEpoch);
      showToast("Extension bound to this session.");
    } catch (error) {
      submit.disabled = false;
      showToast(`Could not create binding: ${error.message}`, "error");
    }
  });
  inner.append(form);
  panel.append(inner);
}

function focusBindingEntry() {
  const panel = $("binding-panel");
  const firstField = panel?.querySelector(
    "input:not([disabled]), textarea:not([disabled])",
  );
  (
    firstField || panel?.querySelector("button[type=submit]:not([disabled])")
  )?.focus();
}


// WK-40 · the header connection badge is icon-only; the connection name stays
// visible in the composer's context row and in this control's accessible name.
function setCapabilityBadge(label) {
  setAction($("capability-badge"), "activity", `Connection · ${label}`);
}
function renderProviderPanel() {
  settingsView?.update(state.providerConfig);
  const config = state.providerConfig?.config;
  if (config) {
    $("model-settings-button").textContent =
      config.provider === "fake-openai-loopback" ? "Local test" : config.model;
    setCapabilityBadge(providerLabels[config.provider] || config.provider);
  }
}

function appendRunBadge(container, status) {
  if (!status) return;
  container.append(
    element("span", {
      className: `run-badge ${status}`,
      text: runLabels[status] || status,
    }),
  );
}

function appendAssistantBody(container, text, key) {
  container.append(
    element("div", { className: "message-body" }, markdown(text, { key })),
  );
}

function appendToolDetails(container, row) {
  const requestValue = row.request;
  const resultValue = row.result;
  if (requestValue !== undefined && requestValue !== null) {
    container.append(
      element("h4", { className: "tool-detail-heading", text: "Request" }),
    );
    container.append(
      element("pre", {
        className: "tool-detail",
        text: safeText(requestValue),
      }),
    );
  }
  if (resultValue !== undefined && resultValue !== null && resultValue !== "") {
    container.append(
      element("h4", { className: "tool-detail-heading", text: "Result" }),
    );
    container.append(
      element("pre", {
        className: `tool-detail ${row.isError ? "tool-error" : ""}`,
        text: safeText(resultValue),
      }),
    );
  }
  if (!container.childElementCount) {
    container.append(
      element("p", {
        className: "tool-detail",
        text: "No request or result details were included in this event.",
      }),
    );
  }
}

function renderMessageStream() {
  const stream = $("message-stream");
  if (state.view === "home") {
    renderHomeState();
    return;
  }
  const previousFocusKey = document.activeElement?.dataset?.focusKey;
  const focusedQuestionKey =
    document.activeElement?.dataset?.questionKey || null;
  const focusedQuestionInput = focusedQuestionKey
    ? document.activeElement
    : null;
  const focusedQuestionSelection =
    focusedQuestionInput &&
    Number.isInteger(focusedQuestionInput.selectionStart)
      ? {
          start: focusedQuestionInput.selectionStart,
          end:
            focusedQuestionInput.selectionEnd ??
            focusedQuestionInput.selectionStart,
          direction: focusedQuestionInput.selectionDirection || "none",
        }
      : null;
  let questionFocusTarget = null;
  let questionSelectionTarget = null;
  const session = currentSession();
  const previousReading = session && state.messageReading.get(session.id);
  const previousScrollTop = previousReading?.scrollTop ?? stream.scrollTop;
  const followLatest = previousReading?.followLatest ?? true;
  clear(stream);
  if (!session) {
    setJumpLatestVisible(false);
    stream.append(
      element(
        "div",
        { className: "empty-state" },
        element("h3", { text: "No session selected" }),
        element("p", {
          text: state.projects.length
            ? "Choose a session from the left or create one."
            : "Create a project and session from the left.",
        }),
      ),
    );
    return;
  }

  const { rows, statuses: runStatuses } = projectThread(
    state.events,
    state.runs,
    session.id,
  );

  if (!rows.length) {
    const active = currentRun();
    setJumpLatestVisible(false);
    stream.append(
      element(
        "div",
        { className: "empty-state" },
        element("h3", {
          text: active ? "Run has no messages yet" : "No messages yet",
        }),
        element("p", {
          text: active
            ? "The next event will appear here."
            : "Send a message to create the first run.",
        }),
      ),
    );
    return;
  }

  const streamList = element("div", { className: "message-list" });
  let list = streamList,
    runtimeRunId = null,
    activityGroup = null;
  for (const row of rows) {
    if (row.kind === "user") {
      list = streamList;
      runtimeRunId = null;
    } else if (runtimeRunId !== row.runId || list === streamList) {
      list = element("section", {
        className: "runtime-group",
        attrs: { "aria-label": "Agent run" },
      });
      streamList.append(list);
      runtimeRunId = row.runId;
    }
    if (row.kind !== "tool" && !(row.kind === "assistant" && !row.text?.trim()))
      activityGroup = null;
    const status =
      runStatuses.get(row.runId) ||
      state.runs.find((run) => run.id === row.runId)?.status;
    if (row.kind === "user") {
      list.append(
        renderUserMessage(row, {
          onCopy: async (text) => {
            try {
              await navigator.clipboard.writeText(text);
              showToast("Message copied.");
            } catch {
              showToast("Copy is unavailable.", "error");
            }
          },
          onEdit: openMessageEditor,
        }),
      );
    } else if (row.kind === "assistant") {
      if (!row.text || !row.text.trim()) continue;
      const wrapper = element("article", {
        className: `message assistant ${row.pending ? "pending" : ""}`,
      });
      const header = element(
        "div",
        { className: "message-header" },
        element("span", { className: "message-role", text: "Assistant" }),
      );
      header.append(
        action(
          "copy",
          "Copy response",
          async () => {
            try {
              await navigator.clipboard.writeText(row.text);
              showToast("Response copied.");
            } catch {
              showToast("Copy is unavailable.", "error");
            }
          },
          { attrs: { "data-focus-key": `response:${row.id}` } },
        ),
      );
      wrapper.append(header);
      appendAssistantBody(
        wrapper,
        row.text,
        sessionScopeKey("assistant", row.id),
      );
      list.append(wrapper);
    } else if (row.kind === "tool") {
      const details = element("details", {
        className: `tool-card ${row.isError ? "has-error" : ""}`,
      });
      const key = toolScopeKey(row.runId, row.callId, row.name);
      details.open = state.toolOpen.has(key)
        ? state.toolOpen.get(key)
        : row.isError;
      const toolStillActive = [
        "created",
        "running",
        "waiting_user",
        "stopping",
      ].includes(status);
      const suffix = row.isError
        ? " · failed"
        : row.phase === "result"
          ? ""
          : toolStillActive
            ? status === "waiting_user" ? " · waiting for you" : status === "stopping" ? " · stopping" : " · working"
            : " · interrupted";
      details.append(element("summary", { text: `${row.name}${suffix}` }));
      const detail = element("div", { className: "tool-detail-block" });
      appendToolDetails(detail, row);
      details.append(detail);
      details.addEventListener("toggle", () =>
        state.toolOpen.set(key, details.open),
      );
      if (!activityGroup) {
        const groupKey = sessionScopeKey("activity", row.id);
        const group = element("details", { className: "activity-group" });
        const summary = element(
          "summary",
          {},
          icon("activity"),
          element("span", { text: "Activity" }),
        );
        group.append(summary);
        group.open = state.toolOpen.has(groupKey)
          ? state.toolOpen.get(groupKey)
          : row.isError;
        group.addEventListener("toggle", () =>
          state.toolOpen.set(groupKey, group.open),
        );
        activityGroup = {
          node: group,
          summary: summary.lastChild,
          count: 0,
          errors: 0,
          working: 0,
          interrupted: 0,
        };
        list.append(group);
      }
      activityGroup.count++;
      activityGroup.errors += row.isError ? 1 : 0;
      activityGroup.working +=
        row.phase !== "result" && toolStillActive ? 1 : 0;
      activityGroup.interrupted +=
        row.phase !== "result" && !toolStillActive ? 1 : 0;
      activityGroup.summary.textContent = `${activityGroup.count} ${activityGroup.count === 1 ? "tool action" : "tool actions"}${activityGroup.errors ? ` · ${activityGroup.errors} failed` : activityGroup.working ? status === "waiting_user" ? " · waiting for you" : status === "stopping" ? " · stopping" : " · working" : activityGroup.interrupted ? " · interrupted" : " · completed"}`;
      activityGroup.node.classList.toggle(
        "is-working",
        !activityGroup.errors && activityGroup.working > 0 && status === "running",
      );
      activityGroup.node.append(details);
    } else if (row.kind === "question") {
      if (
        !canAnswer(
          row,
          state.runs.find((run) => run.id === row.runId),
        )
      ) {
        const questionKey = questionScopeKey(row.runId, row.id),
          openKey = `question-history:${questionKey}`;
        const history = element("details", {
          className: "resolved-question",
        });
        history.open = state.toolOpen.get(openKey) || false;
        history.append(
          element(
            "summary",
            { attrs: { "data-focus-key": `${questionKey}:answer` } },
            icon("message-square"),
            element("span", {
              text: row.answer
                ? `Answered · ${row.prompt}`
                : `Question closed · ${row.prompt}`,
            }),
          ),
          element("p", {
            className: "form-help",
            text:
              row.answer ||
              "No further response is available for this request.",
          }),
        );
        history.addEventListener("toggle", () =>
          state.toolOpen.set(openKey, history.open),
        );
        list.append(history);
        continue;
      }
      const card = element("article", {
        className: `question-card ${
          canAnswer(
            row,
            state.runs.find((run) => run.id === row.runId),
          )
            ? ""
            : "resolved"
        }`,
      });
      card.append(
        element("strong", { text: "Answer requested" }),
        element("p", { className: "question-prompt", text: row.prompt }),
      );
      const questionKey = questionScopeKey(row.runId, row.id);
      if (row.questionStatus !== "pending") {
        card.append(
          element("p", {
            className: "tool-detail",
            text:
              row.questionStatus === "resolved"
                ? `Answered: ${row.answer || ""}`
                : `Question closed: ${row.questionStatus.replaceAll("_", " ")}.`,
          }),
        );
      } else if (row.answer !== null) {
        card.append(
          element("p", {
            className: "tool-detail",
            text: `Answered: ${row.answer}`,
          }),
        );
      } else if (state.questionSubmitted.has(questionKey)) {
        card.append(
          element("p", {
            className: "tool-detail",
            attrs: { tabindex: 0, "data-focus-key": `${questionKey}:answer` },
            text: "Answer sent; waiting for confirmation.",
          }),
        );
      } else if (
        !canAnswer(
          row,
          state.runs.find((run) => run.id === row.runId),
        )
      ) {
        card.append(
          element("p", {
            className: "tool-detail",
            text: "This run has ended; the question is closed.",
          }),
        );
      } else {
        const form = element("form");
        let input = state.questionControls.get(questionKey)?.input;
        if (!input || input.ownerDocument !== document) {
          input = element("input", {
            attrs: {
              type: "text",
              required: true,
              "aria-label": "Answer",
              "data-question-key": questionKey,
              "data-focus-key": `${questionKey}:answer`,
            },
          });
          input.addEventListener("input", () =>
            state.questionDrafts.set(questionKey, input.value),
          );
          state.questionControls.set(questionKey, { input });
        }
        if (
          state.questionDrafts.has(questionKey) &&
          input.value !== state.questionDrafts.get(questionKey)
        ) {
          input.value = state.questionDrafts.get(questionKey) || "";
        }
        if (focusedQuestionKey === questionKey) {
          questionFocusTarget = input;
          questionSelectionTarget = focusedQuestionSelection;
        }
        const submitting = state.questionSubmitting.has(questionKey);
        input.readOnly = submitting;
        const submit = element("button", {
          className: "secondary-button",
          attrs: {
            type: "submit",
            "data-focus-key": `${questionKey}:answer`,
            "aria-disabled": String(submitting),
          },
          text: submitting ? "Sending…" : "Answer",
        });
        form.append(input, submit);
        const questionError = state.questionErrors.get(questionKey);
        if (questionError)
          form.append(
            element("p", { className: "question-error", text: questionError }),
          );
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (
            state.questionSubmitting.has(questionKey) ||
            state.questionSubmitted.has(questionKey)
          )
            return;
          const answer = input.value;
          if (!answer.trim()) {
            input.reportValidity?.();
            return;
          }
          const epoch = state.sessionEpoch;
          const sessionId = state.activeSessionId;
          state.questionSubmitting.add(questionKey);
          state.questionErrors.delete(questionKey);
          renderMessageStream();
          try {
            await request(
              `/runs/${encodeURIComponent(row.runId)}/questions/${encodeURIComponent(row.id)}`,
              { method: "POST", body: { answer } },
            );
            state.questionSubmitting.delete(questionKey);
            if (
              epoch !== state.sessionEpoch ||
              sessionId !== state.activeSessionId
            )
              return;
            state.questionSubmitted.add(questionKey);
            await pollEvents(state.sessionEpoch);
            if (
              epoch === state.sessionEpoch &&
              sessionId === state.activeSessionId
            )
              renderMessageStream();
          } catch (error) {
            state.questionSubmitting.delete(questionKey);
            if (
              epoch !== state.sessionEpoch ||
              sessionId !== state.activeSessionId
            )
              return;
            state.questionErrors.set(questionKey, error.message);
            renderMessageStream();
            showToast(`Answer was not accepted: ${error.message}`, "error");
          }
        });
        card.append(form);
      }
      list.append(card);
    } else if (row.kind === "permission") {
      list.append(renderPermission(row));
    } else if (row.kind === "artifact") {
      if (
        row.file?.kind !== "content-version" ||
        !/^[a-f0-9]{64}$/.test(row.file.sha256 || "")
      )
        continue;
      const button = element(
        "button",
        {
          className: "artifact-thread-row",
          attrs: { type: "button", "data-focus-key": row.id },
        },
        icon("file-text"),
        element("span", { className: "file-name", text: row.file.path }),
        element("span", { className: "form-help", text: "Recorded version" }),
        icon("chevron-right"),
      );
      button.addEventListener("click", () =>
        openFile({
          kind: "content-version",
          sessionId: session.id,
          runId: row.runId,
          path: row.file.path,
          sha256: row.file.sha256,
        }),
      );
      list.append(button);
    } else if (row.kind === "notice") {
      list.append(
        element("p", {
          className: `notice-row ${row.data?.kind === "unrecorded_files" ? "attention" : ""}`,
          text: noticeText(row.data),
        }),
      );
    } else if (row.kind === "error") {
      list.append(
        element(
          "article",
          { className: "message error" },
          element("div", { className: "message-body", text: row.text }),
        ),
      );
    } else if (row.kind === "run-status") {
      const card = element("article", { className: "run-status-card" });
      const header = element(
        "div",
        { className: "message-header" },
        element("span", { className: "sr-only", text: "Run" }),
      );
      appendRunBadge(header, row.status || "unknown");
      header.append(
        action("chevron-right", "Inspect this run", () => openRun(row.runId), {
          attrs: { "data-focus-key": row.id },
        }),
      );
      card.append(header);
      list.append(card);
    }
  }
  if (!streamList.childElementCount) {
    streamList.append(
      element(
        "div",
        { className: "empty-state compact" },
        element("h3", { text: "No message content yet" }),
        element("p", { text: "The recorded run has no assistant text." }),
      ),
    );
  }
  stream.append(streamList);
  if (questionFocusTarget) {
    questionFocusTarget.focus();
    if (
      questionSelectionTarget &&
      typeof questionFocusTarget.setSelectionRange === "function"
    ) {
      const length = questionFocusTarget.value.length;
      const start = Math.min(questionSelectionTarget.start, length);
      const end = Math.min(questionSelectionTarget.end, length);
      try {
        questionFocusTarget.setSelectionRange(
          start,
          end,
          questionSelectionTarget.direction,
        );
      } catch {
        /* input type/browser may reject selection restoration */
      }
    }
  }
  if (
    !questionFocusTarget &&
    previousFocusKey &&
    document.activeElement === document.body
  )
    stream
      .querySelector(`[data-focus-key="${CSS.escape(previousFocusKey)}"]`)
      ?.focus();
  const reading = state.messageReading.get(session.id) || {
    followLatest,
    scrollTop: previousScrollTop,
  };
  if (reading.followLatest) stream.scrollTop = stream.scrollHeight;
  else
    stream.scrollTop = Math.min(
      reading.scrollTop,
      Math.max(0, stream.scrollHeight - stream.clientHeight),
    );
  state.messageReading.set(session.id, {
    followLatest: reading.followLatest,
    scrollTop: stream.scrollTop,
  });
  setJumpLatestVisible(!reading.followLatest);
}

// --- WK-14 · brand facts -------------------------------------------------
// One place maps host facts onto the brand symbol. It reads state and never
// writes it: no attribute here, and no verb played below, changes a run, a
// question, a permission or a navigation, and `symbol-motion-end` is not
// listened to anywhere in this file.
const READ_LIKE_TOOLS = /^(ws_read|ws_grep|ws_list)$/;
const brandWroteRuns = new Set();
let brandHeroPlayed = false;
let brandPendingVerb = null;

// run eight-state → activity. `created` and `waiting_user` are deliberately
// idle: waiting for a human is not the host thinking (ux-conventions §1).
function brandActivity(run) {
  if (!run) return "idle";
  if (run.status === "running" || run.status === "stopping") return "thinking";
  if (isTerminalRunStatus(run.status)) return "complete";
  return "idle";
}

// question four-state → authority, permission-kind only. A free-text question
// authorises nothing, so it leaves authority at none.
function brandAuthority() {
  let authority = "none";
  for (const event of state.events) {
    const type = normalizedType(event.type);
    if (type === "permission/open") authority = "requested";
    else if (type === "permission/resolved")
      authority = (event.data || {}).decision === "allow" ? "scoped" : "revoked";
  }
  return authority;
}

function paintBrandPresence() {
  const symbol = $("session-presence-symbol");
  if (!symbol || typeof symbol.setAttribute !== "function") return;
  const session = currentSession();
  symbol.hidden = !session;
  if (!session) {
    brandPendingVerb = null;
    return;
  }
  const fact = (name, value) => {
    if (symbol.getAttribute(name) !== value) symbol.setAttribute(name, value);
  };
  fact("activity", brandActivity(currentRun() || state.runs.at(-1) || null));
  fact("authority", brandAuthority());
  fact("presence", state.connectionLost ? "absent" : "present");
  fact("theme", "light");
  fact("label", "Session presence mark");
  // Facts first, motion after: a fact write re-renders the component and would
  // otherwise cancel the play it belongs to.
  const verb = brandPendingVerb;
  brandPendingVerb = null;
  playBrandVerb(verb);
}

// Presentation only, 140 ms, never looped, never on hover, never awaited.
function playBrandVerb(verb, { target = "session-presence-symbol", explanatory = false } = {}) {
  if (!verb) return;
  const symbol = $(target);
  if (!symbol || typeof symbol.play !== "function" || symbol.hidden) return;
  void Promise.resolve(symbol.play(verb, { explanatory })).catch(() => {});
}

// WK-32 · Home carries no hero symbol: the layout itself reproduces the brand
// geometry. The symbol lives only in the sidebar wordmark and the session mark.
function paintBrandHero() {}

// One operational verb per merged batch, chosen from the newest host facts.
function brandVerbForEvents(fresh) {
  let verb = null;
  for (const event of fresh) {
    const type = normalizedType(event.type);
    const data = event.data || {};
    if (type === "permission/open") verb = "scope";
    else if (type === "tool/start" && READ_LIKE_TOOLS.test(String(data.name || "")))
      verb = "retrieve";
    else if (type === "assistant/delta" || type === "assistant/final") {
      // "a run starts emitting output" is once per run, not once per delta:
      // replaying it on every poll would be the loop WK-15 forbids.
      if (event.runId && !brandWroteRuns.has(event.runId)) {
        brandWroteRuns.add(event.runId);
        verb = "write";
      }
    }
  }
  return verb;
}

function renderChatHeader() {
  const session = currentSession(),
    project = currentProject();
  // WK-40 · one title line: the project name is a prefix only when the sidebar
  // cannot show it (collapsed or narrow); Home carries no eyebrow at all.
  const projectTitle = $("project-title");
  projectTitle.textContent = state.view === "home" ? "" : project?.name || "";
  projectTitle.hidden = state.view === "home" || !project?.name;
  $("session-title-text").textContent =
    state.view === "home" ? "Home" : session?.title || "Loading session…";
  $("session-meta").replaceChildren();
  if (session && currentRun())
    appendRunBadge($("session-meta"), currentRun().status);
  $("show-surface-button").hidden = !session;
  $("show-run-button").hidden = !session;
  const home = state.view === "home";
  $("composer-area").hidden = !home && !session;
  $("app-shell").classList.toggle("home-active", home);
  $("home-composer-intro").hidden = !home;
  $("home-composer-context").hidden = !home;
  if (!home) $("home-start-status").hidden = true;
  $("materials-button").hidden = home || !session;
  $("permission-settings-button").hidden = home || !session;
  const body = $("conversation-body"), composer = $("composer-area");
  if (home && body.firstElementChild !== composer) body.prepend(composer);
  else if (!home && body.lastElementChild !== composer) body.append(composer);
  const config = state.providerConfig?.config;
  const model =
    config?.provider === "fake-openai-loopback"
      ? "Local test"
      : config?.model || "Model settings";
  $("model-settings-button").textContent = model;
  // WK-39 · the sidebar foot names the connection the way an account row would;
  // it is a label, not a menu: there is no user identity to open.
  $("account-name").textContent = model;
  $("account-avatar").textContent = model.trim().charAt(0).toUpperCase() || "·";
  setCapabilityBadge(providerLabels[config?.provider] || config?.provider || "Connection");
  $("permission-settings-button").textContent =
    permissionLabels[session?.permissionMode] || "File permissions";
  $("home-button").setAttribute(
    "aria-current",
    state.view === "home" ? "page" : "false",
  );
  paintBrandPresence();
  paintBrandHero();
}

// The hint above the composer reads the run's recorded startedAt against the
// local clock; it is an elapsed reading, not a server-reported duration.
function formatElapsed(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60
    ? `${s}s`
    : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}
function paintWorkingClock() {
  const run = currentRun();
  const hint = $("composer-run-hint");
  if (!run || !hint) {
    stopWorkingClock();
    return;
  }
  const started = Date.parse(run.startedAt || "");
  const verb =
    run.status === "waiting_user"
      ? "Waiting for you"
      : run.status === "stopping"
        ? "Stopping"
        : "Working";
  const elapsed = Number.isFinite(started)
    ? formatElapsed(Date.now() - started)
    : "";
  const lead =
    run.status === "waiting_user"
      ? `${verb}${elapsed ? ` · ${elapsed}` : ""}`
      : `${verb}${elapsed ? ` for ${elapsed}` : ""}`;
  hint.textContent = `${lead} · your input will not be sent automatically.`;
  hint.classList?.toggle("is-waiting", run.status === "waiting_user");
}
function startWorkingClock() {
  paintWorkingClock();
  if (!state.workingClock && typeof setInterval === "function")
    state.workingClock = setInterval(paintWorkingClock, 1000);
}
function stopWorkingClock() {
  if (state.workingClock) {
    clearInterval(state.workingClock);
    state.workingClock = null;
  }
}
function renderComposer() {
  const session = currentSession();
  const textarea = $("composer-input");
  const send = $("send-button");
  const cancel = $("cancel-run-button");
  const runHint = $("composer-run-hint");
  const active = currentRun();
  const pendingRun = session && state.pendingRuns.get(session.id);
  const pendingCancel = active && state.pendingCancels.get(active.id);
  if (state.view === "home" && !session) {
    textarea.disabled = false;
    textarea.readOnly = Boolean(state.homeStart?.pending);
    if (textarea.value !== state.homeDraft) textarea.value = state.homeDraft;
    textarea.placeholder = "Describe the work you want to do…";
    send.hidden = false;
    send.disabled = Boolean(state.homeStart?.pending || state.homeStart?.unconfirmed || state.connectionLost) || !state.homeDraft.trim() || !homeProjectId();
    cancel.hidden = true;
    cancel.disabled = true;
    if (runHint) runHint.hidden = true;
    stopWorkingClock();
    renderHomeComposerContext();
    return;
  }
  // WS-08: no session keeps the textarea disabled; a send pending for this
  // session makes it readonly instead, so focus and content survive the
  // in-flight command. An active run (no pending) leaves it fully editable
  // (V7 regression requirement) and only locks Send.
  textarea.disabled = !session;
  textarea.readOnly = Boolean(session) && Boolean(pendingRun);
  send.disabled =
    !session ||
    Boolean(active) ||
    Boolean(pendingRun) ||
    state.unconfirmedRuns.has(session?.id) ||
    state.connectionLost;
  const focusMovesWithPrimaryAction =
    (Boolean(active) && document.activeElement === send) ||
    ((!active || Boolean(pendingCancel)) && document.activeElement === cancel);
  send.hidden = Boolean(active);
  cancel.hidden = !active;
  if (focusMovesWithPrimaryAction && !textarea.disabled) textarea.focus();
  cancel.disabled = !active || Boolean(pendingCancel);
  if (runHint) {
    runHint.hidden = !active;
    if (active) startWorkingClock();
    else stopWorkingClock();
  }
  if (session) {
    const cached = state.draftCache.has(session.id)
      ? state.draftCache.get(session.id)
      : session.draft || "";
    if (
      document.activeElement !== textarea ||
      !state.draftDirty.has(session.id)
    )
      textarea.value = cached;
    textarea.placeholder = "What would you like to work on?";
  } else {
    textarea.value = "";
    textarea.placeholder = "Select a session to chat";
  }
}

function renderChat() {
  renderChatHeader();
  renderMessageStream();
  renderComposer();
  renderFeedback();
  renderInspector();
}

function setSurfaceExpanded(expanded, { focus = true } = {}) {
  const next = Boolean(expanded && state.surface.open && currentSession());
  state.surface.expanded = next;
  renderSurfaceVisibility();
  if (focus) $("surface-expand-button")?.focus();
}

function surfaceIsModal() {
  return (
    state.surface.open &&
    (surfaceOverlayQuery.matches || state.surface.expanded)
  );
}

function closeSurface() {
  state.surface.expanded = false;
  state.surface.open = false;
  state.surface.runReadController?.abort();
  state.surface.runReadGeneration++;
  fileView?.pause();
  writeUiState();
  renderSurfaceVisibility();
  restoreLayerFocus(state.surface.returnFocus, $("show-surface-button"));
}
function closeNavigation({ restoreFocus = true } = {}) {
  state.navigationOpen = false;
  renderSurfaceVisibility();
  if (restoreFocus) restoreLayerFocus($("toggle-nav-button"));
}
function toggleNavigation() {
  if (surfaceOverlayQuery.matches) {
    state.navigationOpen = !state.navigationOpen;
    state.surface.open = false;
  } else state.sidebarCollapsed = !state.sidebarCollapsed;
  renderSurfaceVisibility();
  if (state.navigationOpen) $("close-nav-button").focus();
}
function renderSurfaceVisibility() {
  const shell = $("app-shell"),
    panel = $("surface-panel"),
    nav = $("navigation-panel"),
    chat = shell.querySelector(".chat-panel");
  const open = Boolean(state.surface.open && currentSession()),
    expanded = open && state.surface.expanded;
  const modal = open && (surfaceOverlayQuery.matches || expanded),
    navModal = surfaceOverlayQuery.matches && state.navigationOpen && !open;
  const wasModal = panel.getAttribute("aria-modal") === "true";
  shell.classList.toggle("surface-closed", !open);
  shell.classList.toggle("surface-expanded", expanded);
  shell.classList.toggle("nav-open", navModal);
  shell.classList.toggle("nav-collapsed", state.sidebarCollapsed);
  panel.classList.toggle("is-open", open);
  panel.classList.toggle("is-expanded", expanded);
  panel.hidden = !open;
  panel.inert = !open;
  panel.setAttribute("aria-hidden", String(!open));
  if (modal) {
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
  } else {
    panel.removeAttribute("role");
    panel.removeAttribute("aria-modal");
  }
  const navHidden = surfaceOverlayQuery.matches
    ? !navModal
    : state.sidebarCollapsed;
  nav.inert = Boolean(modal || navHidden);
  nav.setAttribute("aria-hidden", String(nav.inert));
  if (navModal) {
    nav.setAttribute("role", "dialog");
    nav.setAttribute("aria-modal", "true");
  } else {
    nav.removeAttribute("role");
    nav.removeAttribute("aria-modal");
  }
  chat.inert = Boolean(modal || navModal);
  chat.setAttribute("aria-hidden", String(chat.inert));
  $("surface-backdrop").hidden = !modal;
  $("nav-backdrop").hidden = !navModal;
  $("toggle-nav-button").setAttribute(
    "aria-expanded",
    String(surfaceOverlayQuery.matches ? navModal : !state.sidebarCollapsed),
  );
  setAction(
    $("surface-expand-button"),
    expanded ? "minimize-2" : "maximize-2",
    expanded ? "Restore work surface" : "Expand work surface",
  );
  $("surface-expand-button").setAttribute("aria-expanded", String(expanded));
  $("surface-expand-button").hidden =
    window.matchMedia("(max-width: 767px)").matches;
  for (const [kind, id] of [
    ["preview", "surface"],
    ["runtime", "runtime"],
    ["run", "run"],
    ["file", "file"],
  ]) {
    const tab = $(`surface-${kind}-tab`),
      selected = state.surface.kind === kind;
    tab.hidden =
      kind === "run"
        ? !state.surface.runId
        : kind === "file"
          ? !state.surface.fileRef
          : false;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    $(`${id}-content`).hidden = !selected;
  }
  if (
    modal &&
    (!wasModal || !document.activeElement?.getClientRects().length) &&
    !document.querySelector("dialog[open]") &&
    (!panel.contains(document.activeElement) ||
      !document.activeElement?.getClientRects().length)
  )
    $(`surface-${state.surface.kind}-tab`)?.focus();
}
function activateSurface(kind) {
  if (!currentSession()) return;
  if (!state.surface.open) state.surface.returnFocus = document.activeElement;
  state.navigationOpen = false;
  state.surface.kind = kind;
  state.surface.open = true;
  state.surface.runReadController?.abort();
  state.surface.runReadGeneration++;
  fileView?.pause();
  if (kind !== "runtime") runtimeView?.pause();
  $("surface-title").textContent =
    kind === "run"
      ? "Run details"
      : kind === "file"
        ? "File"
        : kind === "runtime"
          ? "Runtime"
          : state.surface.info?.extension?.title || "Workspace";
  renderSurfaceVisibility();
  writeUiState();
  $(`surface-${kind}-tab`).focus();
  if (kind === "preview") void loadSurface(state.sessionEpoch);
  if (kind === "runtime") void runtimeView.load();
  if (kind === "run") void readRunDetails();
  if (kind === "file" && state.surface.fileRef)
    void fileView.load(state.surface.fileRef);
}
function openRun(runId) {
  state.surface.runId = runId;
  activateSurface("run");
}
function openFile(ref) {
  if (ref.sessionId !== state.activeSessionId) return;
  state.surface.fileRef = ref;
  activateSurface("file");
}
function renderInspector() {
  if (!state.surface.open || state.surface.kind !== "run") return;
  const run = state.runs.find((item) => item.id === state.surface.runId);
  renderRun($("run-content"), {
    sessionTitle: currentSession()?.title,
    sessionId: state.activeSessionId,
    run,
    events: state.events,
    onFile: openFile,
    onRefresh: readRunDetails,
    // RC-5: the recorded half of the context, in the Run inspector that already
    // owns this run's identity. It never opens another surface.
    runtimeContext: state.recordedContext.get(state.surface.runId) || null,
  });
}
/** The binding a Run was created with is a property of that Run, so it is read
 * once per Run id and never re-derived from the current configuration. */
async function readRecordedContext(runId, sessionId) {
  if (!runId || !sessionId || state.recordedContext.has(runId)) return;
  try {
    const payload = await request(
      `/runtime-context?sessionId=${encodeURIComponent(sessionId)}&runId=${encodeURIComponent(runId)}`,
    );
    if (sessionId !== state.activeSessionId) return;
    state.recordedContext.set(runId, payload);
    renderInspector();
  } catch {
    // A run whose binding cannot be read keeps the rest of the inspector.
  }
}
async function refreshRunDetails(id) {
  if (!id) return;
  const sessionId = state.activeSessionId,
    epoch = state.sessionEpoch;
  try {
    const result = await request(`/runs/${encodeURIComponent(id)}`);
    if (sessionId !== state.activeSessionId || epoch !== state.sessionEpoch)
      return;
    mergeRun(result.run, { sessionId });
    renderInspector();
  } catch (error) {
    if (epoch === state.sessionEpoch)
      showToast(
        `Run details could not be refreshed: ${error.message}`,
        "error",
      );
  }
}
async function readRunDetails() {
  const id = state.surface.runId,
    sessionId = state.activeSessionId,
    own = ++state.surface.runReadGeneration;
  state.surface.runReadController?.abort();
  const controller = new AbortController();
  state.surface.runReadController = controller;
  renderInspector();
  try {
    const result = await request(`/runs/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    });
    if (
      own !== state.surface.runReadGeneration ||
      sessionId !== state.activeSessionId ||
      id !== state.surface.runId
    )
      return;
    mergeRun(result.run, { sessionId });
    renderInspector();
    void readRecordedContext(id, sessionId);
  } catch (error) {
    if (own === state.surface.runReadGeneration && error.name !== "AbortError")
      $("run-content").prepend(
        element("p", { className: "inline-error", text: error.message }),
      );
  }
}
async function renderWorkspaceFiles() {
  const sessionId = state.activeSessionId,
    own = ++state.surface.workspaceGeneration;
  const content = $("surface-content");
  content.replaceChildren(
    element("p", { className: "form-help", text: "Loading workspace files…" }),
  );
  try {
    const result = await request(
      `/sessions/${encodeURIComponent(sessionId)}/workspace`,
    );
    if (
      own !== state.surface.workspaceGeneration ||
      sessionId !== state.activeSessionId ||
      state.surface.info?.extension
    )
      return;
    renderWorkspaceFilesView(content, {
      files: result.tree || [],
      onFile: (path) => openFile({ kind: "current", sessionId, path }),
      onRefresh: renderWorkspaceFiles,
      onMaterials: () => {
        $("material-add").open = true;
        openDialog("materials-dialog", "material-name");
        materialsView.open();
      },
    });
  } catch (error) {
    if (
      own === state.surface.workspaceGeneration &&
      sessionId === state.activeSessionId
    )
      content.replaceChildren(
        element("p", { className: "inline-error", text: error.message }),
        action("refresh-cw", "Retry loading workspace", renderWorkspaceFiles, {
          visible: true,
        }),
      );
  }
}

function renderProjectionValue(value) {
  return typeof value === "string" ? value : safeText(value);
}

function renderSurfaceFallback() {
  const content = $("surface-content");
  detachOwnedSurfaceContainer(state.surface.ownedContainer);
  clear(content);
  const info = state.surface.info;
  if (!currentSession()) {
    content.append(
      element(
        "div",
        { className: "empty-state compact" },
        element("h3", { text: "No work surface" }),
        element("p", {
          text: "Choose a session to load its local renderer slot.",
        }),
      ),
    );
    return;
  }
  const binding = currentSession().extensionBinding;
  if (!info?.extension && binding?.extensionId) {
    const loading = Boolean(state.surface.fetchController);
    content.append(
      element(
        "div",
        { className: "empty-state compact" },
        element("h3", {
          text: loading ? "Loading preview" : "Preview not loaded yet",
        }),
        element("p", {
          text: `This session is bound to ${binding.extensionId}; the preview has not returned its current projection.`,
        }),
      ),
    );
    return;
  }
  if (!info?.extension) {
    void renderWorkspaceFiles();
    return;
  }
  const card = element("div", { className: "surface-card" });
  const statuses = element("div", { className: "surface-status" });
  statuses.append(
    element("span", {
      className: `extension-status ${info.extension.status || ""}`,
      text: info.extension.status || "unknown",
    }),
  );
  statuses.append(
    element("span", {
      className: "run-badge",
      text: `generation ${info.extension.generation ?? "?"}`,
    }),
  );
  card.append(
    statuses,
    element("h3", {
      text: info.extension.title || info.extension.id || "Extension workspace",
    }),
  );
  const projection = state.surface.projection;
  if (projection === null || projection === undefined) {
    card.append(
      element("p", {
        className: "surface-note",
        text: "No read-only projection is available yet.",
      }),
    );
  } else {
    const actions = Array.isArray(projection.humanActions)
      ? projection.humanActions
      : [];
    if (actions.length) {
      const block = element("section", { className: "surface-block" });
      block.append(element("h4", { text: "Available actions" }));
      const list = element("div", { className: "action-list" });
      for (const action of actions) {
        const item = element("div", { className: "action-item" });
        item.append(
          element("p", {
            className: "action-label",
            text: action.label || action.action || "Action",
          }),
        );
        const button = element("button", {
          className: "secondary-button",
          attrs: { type: "button" },
          text: "Run action",
        });
        button.addEventListener(
          "click",
          () => void dispatchSurfaceAction(action.action, action.payload || {}),
        );
        item.append(button);
        list.append(item);
      }
      block.append(list);
      card.append(block);
    }
    const block = element("section", { className: "surface-block" });
    block.append(element("h4", { text: "Read-only projection" }));
    const list = element("div", { className: "projection-list" });
    for (const [key, value] of Object.entries(projection)) {
      if (key === "humanActions") continue;
      const item = element("div", { className: "projection-item" });
      item.append(
        element("span", { className: "projection-key", text: key }),
        element("span", {
          className: "projection-value",
          text: renderProjectionValue(value),
        }),
      );
      list.append(item);
    }
    if (!list.childElementCount)
      list.append(
        element("p", {
          className: "surface-note",
          text: "Projection is empty.",
        }),
      );
    block.append(list);
    card.append(block);
  }
  content.append(card);
}

async function dispatchSurfaceAction(
  action,
  payload,
  context = state.surface.context,
) {
  if (!guardForSurface(context) || !state.surface.info?.extension)
    throw new Error("This work surface is no longer active.");
  const { sessionId, extensionId, generation } = context;
  const rendererController = state.surface.controller;
  invalidateSurfaceFetches();
  const result = await request(
    `/sessions/${encodeURIComponent(sessionId)}/actions`,
    {
      method: "POST",
      body: { extensionId, generation, action, payload },
      signal: rendererController?.signal,
    },
  );
  if (!guardForSurface(context))
    throw new Error("The work surface changed before the action completed.");
  invalidateSurfaceFetches();
  if (result.projection !== undefined) {
    if (projectionsEqual(state.surface.projection, result.projection))
      return result;
    if (!guardForSurface(context))
      throw new Error("The work surface changed before the projection update.");
    state.surface.projection = result.projection;
    const mounted = state.surface.mounted;
    if (mounted?.update) {
      if (!guardForSurface(context))
        throw new Error(
          "The work surface changed before the projection update.",
        );
      try {
        await mounted.update(result.projection);
      } catch {
        if (guardForSurface(context)) {
          const failedOwnedContainer = state.surface.ownedContainer;
          const failedFetchRequestId = state.surface.fetchRequestId;
          if (state.surface.mounted === mounted) state.surface.mounted = null;
          state.surface.module = null;
          detachOwnedSurfaceContainer(failedOwnedContainer);
          try {
            await mounted.dispose?.();
          } catch {
            /* failed renderer cleanup */
          }
          if (
            guardForSurface(context) &&
            state.surface.fetchRequestId === failedFetchRequestId &&
            state.surface.ownedContainer === null
          )
            renderSurfaceFallback();
        }
      }
    } else if (guardForSurface(context)) renderSurfaceFallback();
  } else {
    await loadSurface(context.epoch);
  }
  return result;
}

async function loadSurface(epoch) {
  if (
    !state.surface.open ||
    state.surface.kind !== "preview" ||
    !state.activeSessionId ||
    epoch !== state.sessionEpoch
  )
    return;
  const sessionId = state.activeSessionId;
  const fetchRequestId = state.surface.fetchRequestId + 1;
  state.surface.fetchRequestId = fetchRequestId;
  state.surface.fetchController?.abort();
  const fetchController = new AbortController();
  state.surface.fetchController = fetchController;
  try {
    const result = await request(
      `/sessions/${encodeURIComponent(sessionId)}/surface`,
      { signal: fetchController.signal },
    );
    if (
      !guardForSurfaceFetch({
        epoch,
        sessionId,
        fetchRequestId,
        controller: fetchController,
      })
    )
      return;
    const extensionRecord = result.extension || null;
    const catalogRecord = extensionRecord
      ? state.extensions.find((item) => item.id === extensionRecord.id)
      : null;
    const extension = extensionRecord
      ? {
          ...catalogRecord,
          ...extensionRecord,
          surface: extensionRecord.surface || catalogRecord?.surface,
        }
      : null;
    const nextIdentity = surfaceIdentityFromExtension(extension, sessionId);
    const currentContext = state.surface.context;
    const identityUnchanged = Boolean(
      currentContext &&
        currentContext.epoch === epoch &&
        currentContext.sessionId === sessionId &&
        sameSurfaceIdentity(currentContext, nextIdentity),
    );

    if (identityUnchanged && state.surface.mounted?.update) {
      if (
        !guardForSurfaceFetch({
          epoch,
          sessionId,
          fetchRequestId,
          controller: fetchController,
        }) ||
        !guardForSurface(currentContext)
      )
        return;
      const previousProjection = state.surface.projection;
      state.surface.info = { ...result, extension };
      state.surface.projection = result.projection ?? null;
      setWorkspaceTitle(extension?.title || "Files");
      if (!projectionsEqual(previousProjection, state.surface.projection)) {
        if (
          !guardForSurfaceFetch({
            epoch,
            sessionId,
            fetchRequestId,
            controller: fetchController,
          }) ||
          !guardForSurface(currentContext)
        )
          return;
        try {
          await state.surface.mounted.update(state.surface.projection);
        } catch {
          if (guardForSurface(currentContext)) {
            const failedMount = state.surface.mounted;
            const failedOwnedContainer = state.surface.ownedContainer;
            const failedFetchRequestId = fetchRequestId;
            state.surface.mounted = null;
            state.surface.module = null;
            detachOwnedSurfaceContainer(failedOwnedContainer);
            try {
              await failedMount?.dispose?.();
            } catch {
              /* failed renderer cleanup */
            }
            if (
              guardForSurfaceFetch({
                epoch,
                sessionId,
                fetchRequestId: failedFetchRequestId,
                controller: fetchController,
              }) &&
              guardForSurface(currentContext) &&
              state.surface.ownedContainer === null
            )
              renderSurfaceFallback();
          }
        }
      }
      return;
    }

    await disposeSurfaceRenderer({ abortFetch: false });
    if (
      !guardForSurfaceFetch({
        epoch,
        sessionId,
        fetchRequestId,
        controller: fetchController,
      })
    )
      return;
    const requestId = state.surface.requestId + 1;
    state.surface.requestId = requestId;
    const rendererController = new AbortController();
    state.surface.controller = rendererController;
    const context = extension
      ? {
          ...nextIdentity,
          requestId,
          epoch,
        }
      : null;
    state.surface.context = context;
    state.surface.info = { ...result, extension };
    state.surface.projection = result.projection ?? null;
    setWorkspaceTitle(extension?.title || "Files");
    renderSurfaceFallback();
    const modulePath = nextIdentity?.modulePath || null;
    if (!modulePath || !extension || extension.status !== "loaded") return;
    const moduleUrl = new URL(modulePath, window.location.origin);
    if (
      moduleUrl.origin !== window.location.origin ||
      !moduleUrl.pathname.startsWith("/extensions/")
    ) {
      throw new Error(
        "Renderer path is outside the local extension allowlist.",
      );
    }
    const rendererModule = await import(moduleUrl.href);
    if (
      !guardForSurfaceFetch({
        epoch,
        sessionId,
        fetchRequestId,
        controller: fetchController,
      }) ||
      !guardForSurface(context) ||
      rendererController.signal.aborted
    )
      return;
    const mount = rendererModule.mount || rendererModule.default?.mount;
    if (typeof mount !== "function")
      throw new Error("Renderer module does not export mount().");
    const container = $("surface-content");
    clear(container);
    const ownedContainer = element("div", {
      className: "surface-renderer-host",
    });
    container.append(ownedContainer);
    state.surface.ownedContainer = ownedContainer;
    const mounted = await mount({
      container: ownedContainer,
      projection: state.surface.projection,
      dispatch: (action, payload) =>
        dispatchSurfaceAction(action, payload, context),
      signal: rendererController.signal,
    });
    if (
      !guardForSurfaceFetch({
        epoch,
        sessionId,
        fetchRequestId,
        controller: fetchController,
      }) ||
      !guardForSurface(context) ||
      rendererController.signal.aborted
    ) {
      detachOwnedSurfaceContainer(ownedContainer);
      try {
        await mounted?.dispose?.();
      } catch {
        /* stale renderer */
      }
      return;
    }
    state.surface.module = rendererModule;
    state.surface.mounted = mounted || {};
  } catch (error) {
    if (
      error?.name === "AbortError" ||
      !guardForSurfaceFetch({
        epoch,
        sessionId,
        fetchRequestId,
        controller: fetchController,
      })
    )
      return;
    if (!state.surface.mounted) {
      detachOwnedSurfaceContainer(state.surface.ownedContainer);
      renderSurfaceFallback();
      $("surface-content").prepend(
        element("div", {
          className: "renderer-error",
          text: `Renderer unavailable: ${error.message}`,
        }),
      );
    }
  } finally {
    if (state.surface.fetchController === fetchController)
      state.surface.fetchController = null;
  }
}

function clearSubmittedDraft(operation) {
  const { sessionId, input, revision } = operation;
  if (
    draftRevision(sessionId) !== revision ||
    state.draftCache.get(sessionId) !== input
  )
    return false;
  state.draftCache.set(sessionId, "");
  state.draftDirty.delete(sessionId);
  if (state.activeSessionId === sessionId && state.session?.id === sessionId)
    state.session.draft = "";
  return true;
}

function isUncertainCommandError(error) {
  return !Number.isFinite(error?.status) || error.status >= 500;
}

function homeProjectId() {
  const start = state.homeStart;
  const fixedProject = start?.pending || start?.unconfirmed || start?.session;
  const preferred = (fixedProject ? start.projectId : state.homeProjectId) || state.activeProjectId;
  return state.projects.find((project) => project.id === preferred)?.id || state.projects[0]?.id || null;
}
function renderHomeComposerContext() {
  const project = $("home-project-input");
  const signature = JSON.stringify(state.projects.map(({ id, name }) => [id, name]));
  if (project.dataset.options !== signature) {
    project.replaceChildren(...(state.projects.length
      ? state.projects.map((item) => element("option", { text: item.name, attrs: { value: item.id } }))
      : [element("option", { text: "Create a project to begin", attrs: { value: "" } })]));
    project.dataset.options = signature;
  }
  project.value = homeProjectId() || "";
  const locked = Boolean(state.homeStart?.pending || state.homeStart?.unconfirmed || state.homeStart?.session);
  project.disabled = locked || !state.projects.length;
  $("home-permission-input").value = state.homePermissionMode;
  $("home-permission-input").disabled = locked;
  $("home-create-project").disabled = locked;
  const status = $("home-start-status");
  const message = state.homeStart?.pending
    ? "Starting your session…"
    : state.homeStart?.error || (state.homeStart?.session
      ? "Your session is ready. Send to continue in it."
      : !homeProjectId() ? "Choose or create a project to send." : "");
  status.textContent = message;
  status.hidden = !message;
  status.dataset.error = state.homeStart?.error ? "true" : "false";
}
async function submitHomeRun() {
  if (state.homeStart?.pending || state.homeStart?.unconfirmed || state.connectionLost) return;
  const input = $("composer-input").value;
  if (!input.trim()) return;
  state.homeDraft = input;
  const projectId = homeProjectId();
  if (!projectId) {
    storeHomeDraft();
    state.homeProjectRequest = true;
    state.startAfterProject = false;
    openDialog("project-dialog", "project-name-input");
    return;
  }
  const ticket = guardRegisterIntent();
  const operation = state.homeStart?.session ? state.homeStart : {
    projectId, commandId: crypto.randomUUID(), session: null,
  };
  operation.pending = true;
  operation.error = "";
  state.homeStart = operation;
  // Persist a conservative creation marker before POST; refresh cannot silently
  // issue a second non-idempotent create when the first receipt was lost.
  storeHomeDraft();
  renderComposer();
  try {
    if (!operation.session) {
      const result = await request("/sessions", { method: "POST", body: {
        projectId: operation.projectId,
        title: input.trim().split(/\r?\n/)[0].slice(0, 100),
        permissionMode: state.homePermissionMode,
      } });
      if (!result.session?.id || result.session.projectId !== operation.projectId)
        throw new Error("Session creation returned no matching receipt.");
      operation.session = result.session;
      storeHomeDraft();
    }
    const session = operation.session;
    const items = state.sessionsByProject.get(operation.projectId) || [];
    state.sessionsByProject.set(operation.projectId, [...items.filter((item) => item.id !== session.id), session]);
    const revision = draftRevision(session.id) + 1;
    state.draftCache.set(session.id, input);
    state.draftRevisions.set(session.id, revision);
    state.draftDirty.add(session.id);
    await persistDraftForSession(session.id, { revision, text: input });
    if (!guardAdmitNavigation(ticket) || state.view !== "home") {
      operation.error = "Session created; your instruction is saved there and has not been sent. Return Home to continue.";
      renderProjectList();
      return;
    }
    state.activeProjectId = operation.projectId;
    state.openProjectIds.add(operation.projectId);
    await selectSession(session.id, { focus: false });
    if (state.navigationEpoch !== ticket.navEpoch + 1 || currentSession()?.id !== session.id) {
      operation.error = "Session created; your instruction has not been sent. Return Home to continue.";
      return;
    }
    state.homeDraft = "";
    state.homeStart = null;
    storeHomeDraft();
    guardHandoffFocus(ticket, {
      isTargetActive: () => currentSession()?.id === session.id,
      targetControl: $("composer-input"), intentContainer: $("composer-form"),
      perform: () => $("composer-input").focus(),
    });
    // Only the existing Run pipeline admits execution, preserving its receipt,
    // draft revision, cancellation and recovery owners.
    await submitSessionRun({ commandId: operation.commandId });
    void loadHome();
  } catch (error) {
    operation.unconfirmed = !operation.session && isUncertainCommandError(error);
    operation.error = operation.unconfirmed
      ? "Session creation is unconfirmed. Refresh and check recent sessions before trying again. Your instruction is kept."
      : `Could not start: ${error.message}. Your instruction is kept.`;
  } finally {
    operation.pending = false;
    storeHomeDraft();
    renderComposer();
  }
}

async function submitRun(event) {
  event.preventDefault();
  if (state.view === "home" && !currentSession()) return submitHomeRun();
  return submitSessionRun();
}
async function submitSessionRun({ commandId = null } = {}) {
  const session = currentSession();
  if (
    !session ||
    currentRun() ||
    state.pendingRuns.has(session.id) ||
    state.unconfirmedRuns.has(session.id)
  )
    return;
  if (state.connectionLost) {
    // WS-12: the connection-lost guard applies to every send entry point —
    // Enter and a Send click both reach this same function (the form's
    // "submit" listener and requestSubmit() below), so there is no separate
    // Enter-specific branch to guard. Return before establishing a pending
    // fact; the draft is untouched (left exactly as typed).
    setTransientFeedback(
      session.id,
      nextOperationId("run-blocked"),
      "run",
      "Connection lost — not sent",
    );
    return;
  }
  const textarea = $("composer-input");
  const input = textarea.value;
  if (!input.trim()) {
    showToast("Enter a message first.", "error");
    return;
  }

  const sessionId = session.id;
  // WS-03: register the focus intent before any await. If, once the
  // command resolves, the user has not moved focus elsewhere (same
  // focusIntentEpoch) and this session is still the one being viewed, the
  // handoff below keeps focus in the composer. This does not change the
  // landing session/project (no navEpoch admission step) — send only
  // updates data for a session that is already known.
  const focusTicket = guardRegisterIntent({ sessionId });
  let revision = draftRevision(sessionId);
  if (state.draftCache.get(sessionId) !== input) {
    revision += 1;
    state.draftRevisions.set(sessionId, revision);
    state.draftCache.set(sessionId, input);
  }
  if (state.unconfirmedRuns.has(sessionId)) {
    setPersistentFeedback(
      sessionId,
      nextOperationId("run"),
      "run",
      "Delivery is unconfirmed. Check the previous instruction before sending another.",
      { nextAction: "retry-run" },
    );
    return;
  }
  const operation = {
    operationId: nextOperationId("run"),
    commandId: commandId || crypto.randomUUID(),
    sessionId,
    input,
    revision,
  };
  // This is the command fact. It must exist before draft persistence or POST
  // admission awaits so refreshes cannot create a second request.
  state.pendingRuns.set(sessionId, operation);
  renderComposer();

  const attemptFocusHandoff = () =>
    guardHandoffFocus(focusTicket, {
      isTargetActive: () => state.activeSessionId === sessionId,
      targetControl: textarea,
      // A mouse click on Send moves the browser's focus to the button before
      // this handler ever runs; that is part of the send intent, not the user
      // moving on, so the composer form's own controls (textarea, Send,
      // Cancel) all count as "still inside this intent" for the secondary
      // activeElement check below.
      intentContainer: $("composer-form"),
      perform: () => {
        if (document.activeElement !== textarea) textarea.focus();
      },
    });

  try {
    const pendingTimer = state.draftTimers.get(sessionId);
    if (pendingTimer) window.clearTimeout(pendingTimer);
    state.draftTimers.delete(sessionId);
    state.draftCache.set(sessionId, input);
    state.draftDirty.add(sessionId);
    await persistDraftForSession(sessionId, { revision, text: input });
    if (state.pendingRuns.get(sessionId) !== operation) return;
    state.unconfirmedRuns.set(sessionId, operation);
    storeUnconfirmedRuns();
    const result = await request(
      `/sessions/${encodeURIComponent(sessionId)}/runs`,
      { method: "POST", body: { input, commandId: operation.commandId } },
    );
    if (
      !result.run?.id ||
      result.run.sessionId !== sessionId ||
      result.run.commandId !== operation.commandId
    )
      throw new Error("The runtime did not return a matching run receipt.");
    state.unconfirmedRuns.delete(sessionId);
    storeUnconfirmedRuns();
    if (state.pendingRuns.get(sessionId) !== operation) return;
    state.pendingRuns.delete(sessionId);
    if (state.activeSessionId === sessionId && result.run?.id)
      mergeRun(result.run, { sessionId, preserveStatus: true });
    const cleared = clearSubmittedDraft(operation);
    // WS-08: storage does not depend on which session is active — write the
    // outcome into this session's own feedback bucket regardless, so a
    // backgrounded session's confirmation/problem is not lost. Only the
    // chat re-render and focus handoff below are scoped to the active
    // session, since those affect what is currently on screen.
    clearPersistentFeedback(sessionId, "run");
    setTransientFeedback(
      sessionId,
      operation.operationId,
      "run",
      cleared ? "Sent." : "Run admitted; newer draft kept.",
    );
    if (state.activeSessionId === sessionId) {
      renderChat();
      attemptFocusHandoff();
      if (state.runs.some(isActiveRun)) {
        stopPolling();
        state.pollController = new AbortController();
        schedulePolling(state.sessionEpoch, 0);
      }
    }
  } catch (error) {
    if (state.pendingRuns.get(sessionId) !== operation) return;
    state.pendingRuns.delete(sessionId);
    if (
      draftRevision(sessionId) === revision &&
      state.draftCache.get(sessionId) === input
    )
      state.draftDirty.add(sessionId);
    const uncertain =
      state.unconfirmedRuns.has(sessionId) &&
      (!error.status || error.status >= 500);
    if (!uncertain) {
      state.unconfirmedRuns.delete(sessionId);
      storeUnconfirmedRuns();
    }
    const copy = describeCommandError("run", error);
    setPersistentFeedback(
      sessionId,
      operation.operationId,
      "run",
      uncertain
        ? "Delivery is unconfirmed. Your instruction is kept; check its receipt before sending another."
        : copy.text,
      { nextAction: uncertain ? "retry-run" : copy.nextAction },
    );
    if (state.activeSessionId === sessionId) {
      renderComposer();
      attemptFocusHandoff();
    }
  } finally {
    if (state.pendingRuns.get(sessionId) === operation)
      state.pendingRuns.delete(sessionId);
    if (state.activeSessionId === sessionId) renderComposer();
  }
}

async function cancelCurrentRun() {
  const session = currentSession();
  const run = currentRun();
  if (!session || !run || state.pendingCancels.has(run.id)) return;
  const sessionId = session.id;
  const operation = {
    operationId: nextOperationId("cancel"),
    sessionId,
    runId: run.id,
  };
  state.pendingCancels.set(run.id, operation);
  renderComposer();
  try {
    const result = await request(`/runs/${encodeURIComponent(run.id)}/cancel`, {
      method: "POST",
      body: {},
    });
    if (state.pendingCancels.get(run.id) !== operation) return;
    state.pendingCancels.delete(run.id);
    const activeTarget =
      state.activeSessionId === sessionId && currentRun()?.id === run.id;
    if (activeTarget && result.run?.id === run.id)
      mergeRun(result.run, { sessionId });
    // WS-08: storage is not gated on which session is active (see submitRun).
    clearPersistentFeedback(sessionId, "cancel");
    if (activeTarget) {
      renderChat();
      schedulePolling(state.sessionEpoch, 0);
    }
  } catch (error) {
    if (state.pendingCancels.get(run.id) !== operation) return;
    state.pendingCancels.delete(run.id);
    const copy = describeCommandError("cancel", error);
    setPersistentFeedback(
      sessionId,
      operation.operationId,
      "cancel",
      copy.text,
      { nextAction: copy.nextAction },
    );
    if (state.activeSessionId === sessionId) {
      renderComposer();
    }
  } finally {
    if (state.pendingCancels.get(run.id) === operation)
      state.pendingCancels.delete(run.id);
    if (state.activeSessionId === sessionId) renderComposer();
  }
}

function openMessageEditor(row) {
  const session = currentSession();
  if (!session) return;
  state.editMessageCandidate = { sessionId: session.id };
  $("edit-message-input").value = row.text;
  $("edit-message-draft-warning").hidden = !$("composer-input").value.trim();
  openDialog("edit-message-dialog", "edit-message-input");
}
/** The single path text takes into the composer as a draft. Message editing and
 * a runtime prompt template both use it; neither one sends anything. */
function applyComposerDraft(sessionId, text, { unavailable, done, before }) {
  const composer = $("composer-input");
  if (
    !sessionId ||
    sessionId !== state.activeSessionId ||
    composer.disabled ||
    composer.readOnly
  ) {
    showToast(unavailable, "error");
    return false;
  }
  composer.value = text;
  state.draftCache.set(sessionId, composer.value);
  state.draftRevisions.set(sessionId, draftRevision(sessionId) + 1);
  state.draftDirty.add(sessionId);
  scheduleDraftSave();
  before?.();
  composer.focus();
  showToast(done);
  return true;
}
function useEditedMessage() {
  const candidate = state.editMessageCandidate;
  applyComposerDraft(candidate?.sessionId, $("edit-message-input").value, {
    unavailable: "The composer is unavailable. Your edit has not been applied.",
    done: "Draft ready. Send when you are ready.",
    before: () => closeDialog("edit-message-dialog"),
  });
}

function openConnectionCard(anchor) {
  const popover = $("connection-popover");
  if (popover.matches(":popover-open")) {
    popover.hidePopover();
    return;
  }
  state.connectionCardAnchor = anchor;
  const render = () =>
    renderConnectionCard(popover, {
      config: state.providerConfig?.config || null,
      session: currentSession(),
      active: Boolean(currentRun()),
      onClose: () => {
        popover.hidePopover();
        state.connectionCardAnchor?.focus?.();
      },
      onChangeConnection: () => {
        popover.hidePopover();
        openRuntimeDialog();
      },
      onPermission: async (mode) => {
        const session = currentSession();
        if (!session) return;
        try {
          const result = await request(
            `/sessions/${encodeURIComponent(session.id)}/permission-mode`,
            { method: "PUT", body: { permissionMode: mode } },
          );
          applySessionUpdate(result.session, session.id);
          showToast(`File writes: ${permissionLabels[mode]}.`);
        } catch (error) {
          showToast(error.message, "error");
        }
        if (popover.matches(":popover-open")) render();
      },
    });
  const header = render();
  popover.showPopover();
  header.querySelector("button").focus();
}
function applySessionUpdate(session, id) {
  if (session?.id !== id) return;
  state.sessionsByProject.set(
    session.projectId,
    (state.sessionsByProject.get(session.projectId) || []).map((item) =>
      item.id === id ? session : item,
    ),
  );
  if (id === state.activeSessionId) state.session = session;
  renderAll();
}
function openContextSummary() {
  const popover = $("context-popover");
  if (popover.matches(":popover-open")) {
    popover.hidePopover();
    return;
  }
  const session = currentSession();
  if (!session) return;
  const run = currentRun() || state.runs.at(-1);
  const go = (fn) => () => {
    popover.hidePopover();
    fn();
  };
  const header = renderSessionOverview(popover, {
    session,
    run,
    permissionLabel: permissionLabels[session.permissionMode],
    onClose: () => popover.hidePopover(),
    onMaterials: go(() => {
      openDialog("materials-dialog", "close-materials-button");
      materialsView.open();
    }),
    onWorkspace: go(() => activateSurface("preview")),
    onRun: (id) => go(() => openRun(id))(),
    onHistory: go(openRunHistory),
    onPermissions: go(openRuntimeDialog),
  });
  popover.showPopover();
  header.querySelector("button").focus();
}
function openRunHistory() {
  const sessionId = state.activeSessionId;
  renderRunHistory($("run-history-list"), {
    runs: state.runs.filter((run) => run.sessionId === sessionId),
    events: state.events,
    onRun: (id) => {
      if (state.activeSessionId !== sessionId) return;
      closeDialog("run-history-dialog");
      openRun(id);
    },
  });
  openDialog("run-history-dialog", "close-run-history");
}
function renderHomeState() {
  const summary = state.home.data;
  const rows = summary
    ? ["pendingItems", "sessionCandidates", "inspectionCandidates"].reduce(
        (total, key) => total + (summary[key]?.items?.length || 0),
        0,
      )
    : 0;
  $("app-shell").classList.toggle("home-empty", !rows && !state.home.error);
  renderHome($("message-stream"), {
    summary: state.home.data,
    error: state.home.error,
    loading: state.home.loading,
    projects: state.projects,
    onRetry: () => loadHome(),
    onMore: (key, offset) => loadHome(key, offset),
    onSession: async (item, { inspect }) => {
      await selectProject(item.projectId, { sessionId: item.sessionId });
      if (state.activeSessionId === item.sessionId && inspect)
        openRun(item.runId);
    },
  });
}
async function loadHome(key = null, offset = 0) {
  const own = ++state.home.generation;
  state.home.loading = true;
  state.home.error = null;
  if (state.view === "home") renderHomeState();
  const query = new URLSearchParams({ limit: "30" });
  const names = {
    sessionCandidates: "sessionsOffset",
    pendingItems: "pendingOffset",
    inspectionCandidates: "inspectionOffset",
  };
  if (key) query.set(names[key], String(offset));
  try {
    const data = await request(`/work-summary?${query}`);
    if (own !== state.home.generation) return;
    if (key && state.home.data) {
      const previous = state.home.data[key];
      const next = data[key];
      const unique = new Map(
        [...previous.items, ...next.items].map((item) => [
          item.questionId || item.runId || item.sessionId,
          item,
        ]),
      );
      state.home.data = {
        ...state.home.data,
        [key]: { ...next, items: [...unique.values()] },
      };
    } else state.home.data = data;
  } catch (error) {
    if (own === state.home.generation) state.home.error = error.message;
  } finally {
    if (own === state.home.generation) {
      state.home.loading = false;
      if (state.view === "home") renderHomeState();
    }
  }
}
async function goHome() {
  const own = ++state.navigationEpoch;
  await persistCurrentDraft();
  if (own !== state.navigationEpoch) return;
  clearActiveSession();
  closeNavigation({ restoreFocus: false });
  restoreLayerFocus($("composer-input"));
  void loadHome();
}
function startNewSession({ projectId = null } = {}) {
  state.homeProjectRequest = false;
  if (!state.projects.length) {
    state.startAfterProject = true;
    openDialog("project-dialog", "project-name-input");
    return;
  }
  state.newSessionProjectId =
    projectId || state.activeProjectId || state.projects[0].id;
  $("session-project-label").textContent =
    state.projects.find((p) => p.id === state.newSessionProjectId)?.name ||
    "Project";
  openDialog("session-dialog", "session-title-input");
}
function renderPermission(row) {
  const key = questionScopeKey(row.runId, row.id),
    run = state.runs.find((item) => item.id === row.runId),
    payload = row.payload;
  if (!canAnswer(row, run) && validPermission(payload)) {
    const keyOpen = `permission-history:${key}`;
    const details = element("details", {
      className: "resolved-permission",
    });
    details.open = state.toolOpen.get(keyOpen) || false;
    details.append(
      element(
        "summary",
        { attrs: { "data-focus-key": `${key}:${row.decision || "allow"}` } },
        icon("file-text"),
        element("span", {
          text: `${row.decision === "allow" ? "Write allowed" : row.decision === "deny" ? "Write denied" : "Write request closed"} · ${payload.path}`,
        }),
      ),
      element("p", {
        className: "intervention-scope",
        text:
          row.decision === "allow"
            ? "Permission recorded for this exact write. Review acceptance is not recorded here."
            : row.decision === "deny"
              ? "Permission denied for this exact write."
              : "This request closed without a recorded decision.",
      }),
      element("pre", {
        className: "permission-preview",
        text: payload.preview,
      }),
    );
    details.addEventListener("toggle", () =>
      state.toolOpen.set(keyOpen, details.open),
    );
    return details;
  }
  const card = element("article", {
    className: "question-card permission-card",
  });
  card.append(
    element("h3", { text: "Allow this file write?" }),
    element("p", {
      className: "file-name",
      text: payload.path || "Unavailable path",
    }),
  );
  if (validPermission(payload)) {
    card.append(
      element("p", {
        className: "form-help",
        text: `${formatBytes(payload.bytes)} · Permission for this exact write only`,
      }),
      element("pre", {
        className: "permission-preview",
        text: payload.preview,
      }),
    );
    const details = element(
      "details",
      {},
      element("summary", { text: "Write details" }),
      element("code", { text: payload.contentSha256 }),
      copyAction(payload.contentSha256, "Copy proposed content hash"),
    );
    card.append(details);
  }
  const allowed = validPermission(payload) && canAnswer(row, run),
    pending =
      state.questionSubmitting.has(key) || state.questionSubmitted.has(key);
  if (!allowed)
    card.append(
      element("p", {
        className: "form-help",
        text: row.decision
          ? `Write ${row.decision === "allow" ? "allowed" : "denied"}.`
          : row.questionStatus === "pending"
            ? "This request is no longer available."
            : "Request resolved.",
      }),
    );
  else {
    const actions = element("div", { className: "question-actions" });
    for (const [decision, label] of [
      ["deny", "Deny write"],
      ["allow", "Allow this write"],
    ]) {
      const button = element("button", {
        className: decision === "allow" ? "primary-button" : "secondary-button",
        attrs: { type: "button", "data-focus-key": `${key}:${decision}` },
        text: label,
      });
      button.setAttribute("aria-disabled", String(pending));
      button.addEventListener("click", async () => {
        if (
          state.questionSubmitting.has(key) ||
          state.questionSubmitted.has(key)
        )
          return;
        const epoch = state.sessionEpoch;
        state.questionSubmitting.add(key);
        renderMessageStream();
        try {
          await request(
            `/runs/${encodeURIComponent(row.runId)}/questions/${encodeURIComponent(row.id)}`,
            { method: "POST", body: { decision } },
          );
          state.questionSubmitted.add(key);
          await pollEvents(epoch);
        } catch (error) {
          state.questionErrors.set(key, error.message);
        } finally {
          state.questionSubmitting.delete(key);
          if (epoch === state.sessionEpoch) renderMessageStream();
        }
      });
      actions.append(button);
    }
    card.append(actions);
  }
  if (state.questionErrors.has(key))
    card.append(
      element("p", {
        className: "inline-error",
        attrs: { role: "alert" },
        text: state.questionErrors.get(key),
      }),
    );
  return card;
}
async function recoverRunReceipt() {
  const sessionId = state.activeSessionId,
    receipt = state.unconfirmedRuns.get(sessionId);
  if (!receipt || state.pendingRuns.has(sessionId)) return;
  state.pendingRuns.set(sessionId, receipt);
  renderComposer();
  try {
    const result = await request(
      `/sessions/${encodeURIComponent(sessionId)}/runs`,
      {
        method: "POST",
        body: { input: receipt.input, commandId: receipt.commandId },
      },
    );
    if (
      !result.run?.id ||
      result.run.sessionId !== sessionId ||
      result.run.commandId !== receipt.commandId
    )
      throw new Error("The returned run does not match this instruction.");
    state.unconfirmedRuns.delete(sessionId);
    storeUnconfirmedRuns();
    clearPersistentFeedback(sessionId, "run");
    if (sessionId === state.activeSessionId) {
      mergeRun(result.run, { sessionId });
      await refreshActiveSession();
      schedulePolling(state.sessionEpoch, 0);
    }
  } catch (error) {
    setPersistentFeedback(
      sessionId,
      nextOperationId("recover"),
      "run",
      `Run receipt is still unresolved: ${error.message}`,
      { nextAction: "retry-run" },
    );
  } finally {
    state.pendingRuns.delete(sessionId);
    if (sessionId === state.activeSessionId) {
      renderComposer();
      renderFeedback();
    }
  }
}

function openDialog(dialogId, inputId) {
  const dialog = $(dialogId);
  dialogReturns.set(dialogId, document.activeElement);
  if (dialog.open) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  $(inputId)?.focus();
}

function closeDialog(dialogId) {
  const dialog = $(dialogId);
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function openRuntimeDialog() {
  const dialog = $("runtime-dialog");
  const trigger = document.activeElement;
  state.runtimeDialogReturnFocus = trigger;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  $("close-runtime-button")?.focus();
  void settingsView.refresh();
}

function closeRuntimeDialog({ restoreFocus = true } = {}) {
  const dialog = $("runtime-dialog");
  if (!restoreFocus) state.runtimeDialogReturnFocus = null;
  if (typeof dialog.close === "function" && dialog.open) {
    dialog.close();
    return;
  }
  dialog.removeAttribute("open");
  if (restoreFocus) state.runtimeDialogReturnFocus?.focus?.();
  state.runtimeDialogReturnFocus = null;
}

function handleSurfaceEscape(event) {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    document.querySelector("dialog[open]")
  )
    return;
  if ($("connection-popover").matches(":popover-open")) {
    if (event.key === "Escape") {
      event.preventDefault();
      $("connection-popover").hidePopover();
      state.connectionCardAnchor?.focus?.();
    }
    return;
  }
  if ($("context-popover").matches(":popover-open")) {
    if (event.key === "Escape") {
      event.preventDefault();
      $("context-popover").hidePopover();
      $("show-run-button").focus();
    }
    return;
  }
  if (event.key === "Escape") {
    if (state.navigationOpen) {
      event.preventDefault();
      closeNavigation();
      return;
    }
    if (!state.surface.open) return;
    if (state.surface.expanded) {
      event.preventDefault();
      setSurfaceExpanded(false);
    } else {
      event.preventDefault();
      closeSurface();
    }
    return;
  }
  if (event.key !== "Tab" || (!surfaceIsModal() && !state.navigationOpen))
    return;
  const panel = state.navigationOpen
    ? $("navigation-panel")
    : $("surface-panel");
  const controls = [
    ...panel.querySelectorAll(
      "button, a[href], input, select, textarea, summary, [tabindex], [contenteditable=true]",
    ),
  ].filter(
    (control) =>
      control.tabIndex >= 0 &&
      !control.matches(":disabled") &&
      !control.closest("[inert]") &&
      control.getClientRects().length &&
      getComputedStyle(control).visibility !== "hidden",
  );
  const first = controls[0];
  const last = controls.at(-1);
  if (!first) return;
  const active = document.activeElement;
  if (
    !panel.contains(active) ||
    (event.shiftKey ? active === first : active === last)
  ) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}

async function createEntity(event, kind) {
  event.preventDefault();
  const dialogId = `${kind}-dialog`,
    dialog = $(dialogId);
  if (event.submitter?.value === "cancel") {
    closeDialog(dialogId);
    return;
  }
  if (state.createAttempts.has(kind)) return;
  const input = $(
    kind === "project" ? "project-name-input" : "session-title-input",
  );
  const value =
    input.value.trim() || (kind === "session" ? "Untitled session" : "");
  if (!value) return;
  const projectId = state.newSessionProjectId,
    nav = state.navigationEpoch,
    startNext = state.startAfterProject,
    homeRequest = state.homeProjectRequest;
  if (kind === "session" && !projectId) return;
  const attempt = nextOperationId(kind);
  state.createAttempts.set(kind, attempt);
  const controls = [
    ...dialog.querySelectorAll('button:not([value="cancel"]),input,select'),
  ];
  controls.forEach((node) => (node.disabled = true));
  const error = $(`${kind}-create-error`);
  error.hidden = true;
  try {
    const body =
      kind === "project"
        ? { name: value }
        : {
            projectId,
            title: value,
            permissionMode: $("session-permission-input").value,
          };
    const result = await request(
      kind === "project" ? "/projects" : "/sessions",
      { method: "POST", body },
    );
    const entity = result[kind];
    if (!entity?.id)
      throw new Error(
        "No creation receipt returned. Refresh before creating again.",
      );
    const admit = dialog.open && nav === state.navigationEpoch;
    if (kind === "project") await loadProjects();
    else {
      const items = state.sessionsByProject.get(projectId) || [];
      state.sessionsByProject.set(projectId, [
        ...items.filter((item) => item.id !== entity.id),
        entity,
      ]);
    }
    if (admit && dialog.open && nav === state.navigationEpoch) {
      closeDialog(dialogId);
      input.value = "";
      if (kind === "project") {
        await selectProject(entity.id);
        if (homeRequest) {
          state.homeProjectRequest = false;
          state.homeProjectId = entity.id;
          storeHomeDraft();
          await goHome();
        } else if (startNext) startNewSession();
      } else await selectProject(projectId, { sessionId: entity.id });
    } else renderProjectList();
    void loadHome();
  } catch (err) {
    error.hidden = false;
    error.textContent = isUncertainCommandError(err)
      ? `Creation could not be confirmed. Refresh the workspace and check for “${value}” before creating again.`
      : err.message;
    if (isUncertainCommandError(err)) {
      state.createAttempts.set(kind, "unconfirmed");
      return;
    }
  } finally {
    if (state.createAttempts.get(kind) !== "unconfirmed") {
      state.createAttempts.delete(kind);
      controls.forEach((node) => (node.disabled = false));
    }
  }
}
async function createProject(event) {
  return createEntity(event, "project");
}
async function createSession(event) {
  return createEntity(event, "session");
}

function wireEvents() {

  const actions = {
    "new-project-button": ["plus", "New project"],
    "close-nav-button": ["x", "Close navigation"],
    "toggle-nav-button": ["panel-left", "Toggle navigation"],
    "refresh-button": ["refresh-cw", "Refresh workspace"],
    "clear-nav-filter-button": ["x", "Clear filter"],
    "show-run-button": ["activity", "Session overview"],
    "show-surface-button": ["panel-right", "Open workspace preview"],
    "close-surface-button": ["x", "Close work surface"],
    "close-runtime-button": ["x", "Close settings"],
    "close-materials-button": ["x", "Close files"],
    "materials-button": ["paperclip", "Session files"],
    "refresh-extensions-button": ["refresh-cw", "Refresh extensions"],
  };
  for (const [id, [name, label]] of Object.entries(actions))
    setAction($(id), name, label);
  setAction($("home-button"), "house", "Home", { visible: true });
  setAction($("runtime-setup-button"), "settings-2", "Settings");
  setAction($("new-session-button"), "square-pen", "New session", {
    visible: true,
  });
  setAction($("home-create-project"), "plus", "New project", { visible: true });
  setAction($("send-button"), "arrow-up", "Send");
  setAction($("cancel-run-button"), "square", "Cancel run");
  $("search-icon").append(icon("search"));
  $("toggle-nav-button").addEventListener("click", toggleNavigation);
  $("close-nav-button").addEventListener("click", () => closeNavigation());
  $("nav-backdrop").addEventListener("click", () => closeNavigation());
  $("home-button").addEventListener("click", goHome);
  $("workspace-home-link").addEventListener("click", (event) => {
    event.preventDefault();
    void goHome();
  });
  $("show-run-button").addEventListener("click", openContextSummary);
  for (const id of [
    "capability-badge",
    "model-settings-button",
    "permission-settings-button",
  ])
    $(id).addEventListener("click", (event) =>
      openConnectionCard(event.currentTarget),
    );
  {
    // Keep the card beside whichever control opened it; mark that control expanded.
    const popover = $("connection-popover");
    let stopFollowing = null;
    popover.addEventListener("toggle", (event) => {
      const open = event.newState === "open";
      stopFollowing?.();
      stopFollowing = null;
      const anchor = state.connectionCardAnchor;
      if (open && anchor?.isConnected)
        stopFollowing = anchorPopover(anchor, popover, {
          placement: anchor.id === "capability-badge" ? "bottom-end" : "top-start",
        });
      for (const id of [
        "capability-badge",
        "model-settings-button",
        "permission-settings-button",
      ])
        $(id).setAttribute(
          "aria-expanded",
          String(open && anchor === $(id)),
        );
    });
  }
  $("materials-button").addEventListener("click", () => {
    openDialog("materials-dialog", "close-materials-button");
    materialsView.open();
  });
  $("close-materials-button").addEventListener("click", () =>
    closeDialog("materials-dialog"),
  );
  $("materials-dialog").addEventListener("close", () => materialsView.close());
  for (const kind of ["runtime", "run", "file"])
    $(`surface-${kind}-tab`).addEventListener("click", () =>
      activateSurface(kind),
    );
  $("surface-tabs").addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const tabs = [...$("surface-tabs").querySelectorAll("button")].filter(
      (tab) => !tab.hidden,
    );
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? tabs[0]
        : event.key === "End"
          ? tabs.at(-1)
          : tabs[
              (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) %
                tabs.length
            ];
    next.click();
    next.focus();
  });
  tooltips = installTooltips();
  // WS-12: the recovery probe (see scheduleRecoveryProbe above) must stop
  // when the page goes away, not just on recovery.
  window.addEventListener("beforeunload", stopRecoveryProbe);
  $("new-project-button").addEventListener("click", () => {
    state.homeProjectRequest = false;
    state.startAfterProject = false;
    openDialog("project-dialog", "project-name-input");
  });
  $("project-dialog").addEventListener("close", () => { state.homeProjectRequest = false; });
  $("new-session-button").addEventListener("click", startNewSession);
  $("refresh-button").addEventListener("click", async () => {
    try {
      await refreshNavigationAndSession();
      await loadExtensions();
      await loadProviderConfig();
      await loadHome();
      for (const kind of ["project", "session"])
        if (state.createAttempts.get(kind) === "unconfirmed") {
          state.createAttempts.delete(kind);
          $(`${kind}-dialog`)
            .querySelectorAll("button,input,select")
            .forEach((node) => (node.disabled = false));
        }
      if (state.homeStart?.unconfirmed) {
        state.homeStart = null;
        storeHomeDraft();
        showToast("Workspace refreshed. Check recent sessions before sending the kept instruction again.");
      } else showToast("Workspace refreshed.");
      renderComposer();
    } catch (error) {
      showToast(`Refresh failed: ${error.message}`, "error");
    }
  });
  $("runtime-setup-button").addEventListener("click", openRuntimeDialog);
  $("close-runtime-button").addEventListener("click", closeRuntimeDialog);
  $("runtime-dialog").addEventListener("close", () => {
    const trigger = state.runtimeDialogReturnFocus;
    state.runtimeDialogReturnFocus = null;
    settingsView.close();
    if (
      trigger &&
      (document.activeElement === document.body ||
        $("runtime-dialog").contains(document.activeElement))
    )
      restoreLayerFocus(trigger);
  });
  setAction($("close-run-history"), "x", "Close run history");
  $("close-run-history").addEventListener("click", () =>
    closeDialog("run-history-dialog"),
  );
  $("cancel-edit-message").addEventListener("click", () =>
    closeDialog("edit-message-dialog"),
  );
  $("use-edit-message").addEventListener("click", useEditedMessage);
  $("edit-message-dialog").addEventListener("close", () => {
    state.editMessageCandidate = null;
  });
  document.addEventListener("keydown", handleSurfaceEscape);
  for (const dialog of document.querySelectorAll("dialog")) {
    dialog.addEventListener("cancel", (event) => {
      if (event.isComposing) event.preventDefault();
    });
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && event.isComposing) event.preventDefault();
    });
    dialog.addEventListener("close", () => {
      const trigger = dialogReturns.get(dialog.id);
      dialogReturns.delete(dialog.id);
      if (
        trigger &&
        (document.activeElement === document.body ||
          dialog.contains(document.activeElement))
      )
        restoreLayerFocus(trigger);
      if (dialog.id === "project-dialog") state.startAfterProject = false;
      if (
        surfaceIsModal() &&
        !document.querySelector("dialog[open]") &&
        !$("surface-panel").contains(document.activeElement)
      ) {
        $(`surface-${state.surface.kind}-tab`)?.focus();
      }
    });
  }
  $("refresh-extensions-button").addEventListener(
    "click",
    () =>
      void loadExtensions().catch((error) => showToast(error.message, "error")),
  );
  $("close-surface-button").addEventListener("click", closeSurface);
  $("surface-backdrop").addEventListener("click", closeSurface);
  surfaceOverlayQuery.addEventListener("change", renderSurfaceVisibility);
  $("show-surface-button").addEventListener("click", () =>
    activateSurface("preview"),
  );
  $("surface-expand-button").addEventListener("click", () =>
    setSurfaceExpanded(!state.surface.expanded),
  );
  $("surface-preview-tab").addEventListener("click", () =>
    activateSurface("preview"),
  );
  $("nav-filter-input").addEventListener("input", (event) => {
    state.navigationFilter = event.currentTarget.value;
    renderProjectList();
  });
  $("clear-nav-filter-button").addEventListener("click", () => {
    state.navigationFilter = "";
    $("nav-filter-input").value = "";
    renderProjectList();
    $("nav-filter-input").focus();
  });
  $("message-stream").addEventListener("scroll", () => {
    rememberMessageReading($("message-stream"));
  });
  $("jump-latest-button").addEventListener("click", () =>
    scrollToLatestMessage(),
  );
  // WS-03: a single generic listener maintains focusIntentEpoch. Any focus
  // landing outside the composer form (a click into the session list, a
  // dialog opening and moving focus to its own field, etc.) is a
  // user-initiated focus move. Focus landing on any control *inside* the
  // composer form — the textarea itself, but also Send/Cancel — does not
  // bump the counter: a mouse click on Send moves the browser's focus to
  // the button as part of firing the submit event, before guardRegisterIntent
  // ever runs, and that is the send intent continuing, not the user moving
  // on to something else. Without this, guardRegisterIntent would snapshot
  // an epoch that already advanced past the click, and the later handoff's
  // activeElement check would see focus parked on the Send button and
  // refuse to return it to the textarea after admission.
  document.addEventListener("focusin", (event) => {
    if (!$("composer-form").contains(event.target)) guardBumpFocusIntent();
  });
  $("composer-form").addEventListener("submit", submitRun);
  $("cancel-run-button").addEventListener(
    "click",
    () => void cancelCurrentRun(),
  );
  $("composer-input").addEventListener("compositionstart", () => {
    $("composer-input").dataset.composing = "true";
  });
  $("composer-input").addEventListener("compositionend", () => {
    delete $("composer-input").dataset.composing;
  });
  $("composer-input").addEventListener("input", () => {
    const session = currentSession();
    if (!session && state.view === "home") {
      state.homeDraft = $("composer-input").value;
      storeHomeDraft();
      renderComposer();
      return;
    }
    if (!session) return;
    state.draftCache.set(session.id, $("composer-input").value);
    state.draftRevisions.set(session.id, draftRevision(session.id) + 1);
    state.draftDirty.add(session.id);
    scheduleDraftSave();
  });
  $("composer-input").addEventListener("keydown", (event) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.isComposing ||
      event.currentTarget.dataset.composing === "true"
    )
      return;
    event.preventDefault();
    $("composer-form").requestSubmit();
  });
  $("home-project-input").addEventListener("change", (event) => {
    if (state.homeStart?.pending || state.homeStart?.session) return;
    state.homeProjectId = event.target.value;
    storeHomeDraft();
    renderComposer();
  });
  $("home-permission-input").addEventListener("change", (event) => {
    state.homePermissionMode = event.target.value;
    storeHomeDraft();
  });
  $("home-create-project").addEventListener("click", () => {
    state.homeProjectRequest = true;
    state.startAfterProject = false;
    openDialog("project-dialog", "project-name-input");
  });
  $("project-form").addEventListener("submit", createProject);
  $("session-form").addEventListener("submit", createSession);
}

async function init() {
  restoreHomeDraft();
  const savedUi = readUiState();
  state.activeProjectId =
    typeof savedUi.activeProjectId === "string"
      ? savedUi.activeProjectId
      : null;
  state.restoreSessionId =
    typeof savedUi.activeSessionId === "string"
      ? savedUi.activeSessionId
      : null;
  state.openProjectIds = new Set(
    Array.isArray(savedUi.openProjectIds)
      ? savedUi.openProjectIds.filter((id) => typeof id === "string")
      : [],
  );
  state.surface.open = false;
  try {
    for (const [id, value] of JSON.parse(
      sessionStorage.getItem(COMMAND_STORAGE_KEY) || "[]",
    ))
      if (
        typeof id === "string" &&
        typeof value?.input === "string" &&
        typeof value?.commandId === "string"
      ) {
        state.unconfirmedRuns.set(id, value);
        setPersistentFeedback(
          id,
          "restored-receipt",
          "run",
          "A prior run receipt is unresolved. Recover it before sending another instruction.",
          { nextAction: "retry-run" },
        );
      }
  } catch {}
  settingsView = createSettingsView($("provider-panel"), {
    request,
    getSession: () => ({
      session: currentSession(),
      active: Boolean(currentRun()),
    }),
    onConfig: (config) => {
      state.providerConfig = config;
      renderChatHeader();
    },
    onSession: applySessionUpdate,
    notify: showToast,
    onOpenRuntime: () => {
      // The module takes the focus the dialog would otherwise hand back.
      closeRuntimeDialog({ restoreFocus: false });
      activateSurface("runtime");
    },
  });
  runtimeView = createRuntimeView($("runtime-content"), {
    request,
    getSessionId: () => state.activeSessionId,
    notify: showToast,
    onDraft: (text, title) =>
      applyComposerDraft(state.activeSessionId, text, {
        unavailable:
          "The composer is unavailable. The template has not been used.",
        done: `Draft from "${title}" is ready. Nothing has been sent.`,
      }),
  });
  fileView = createFileView($("file-content"), { request });
  materialsView = createMaterialsView({
    request,
    getSession: currentSession,
    onOpenFile: openFile,
    notify: showToast,
  });
  for (const id of ["home-permission-input", "session-permission-input"]) {
    const select = $(id);
    if (select) select.replaceChildren(...Object.entries(permissionLabels).map(([value, text]) =>
      element("option", { text, attrs: { value } })));
  }
  wireEvents();
  renderAll();
  try {
    const bootstrap = await request("/bootstrap");
    state.token = bootstrap.sessionToken || null;
    state.capabilities = bootstrap.capabilities || null;
    state.adapterId = bootstrap.adapterId || null;
    setCapabilityBadge(
      state.capabilities?.realProvider === false ? providerLabels["fake-openai-loopback"] : "Connection",
    )
    await Promise.all([loadProjects(), loadExtensions(), loadProviderConfig()]);
    await Promise.all(
      [...state.openProjectIds].map((id) => loadSessionsForProject(id)),
    );
    await loadHome();
    // Home is the default entry; previous sessions remain in Continue.

    renderAll();
  } catch (error) {
    setCapabilityBadge("Runtime unavailable");
    showToast(`Could not start workspace: ${error.message}`, "error");
    const stream = $("message-stream");
    clear(stream);
    stream.append(
      element(
        "div",
        { className: "empty-state" },
        element("h3", { text: "Runtime unavailable" }),
        element("p", { text: error.message }),
      ),
    );
  }
}

function renderAll() {
  renderProjectList();
  renderExtensionList();
  renderProviderPanel();
  renderBindingPanel();
  renderChat();
  renderSurfaceVisibility();
  renderConnectionStatus();
}

window.__V5_UI__ = {
  state,
  request,
  normalizedType,
  renderAll,
};

void init();
