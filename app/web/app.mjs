import { coreFileSubjects, readCoreManifest } from "./markdown-source.mjs";
import {
  el,
  icon,
  flowRow,
  action,
  setAction,
  copyAction,
  markdown,
  installTooltips,
  anchorPopover,
  sessionMode,
  sessionModeLabel,
  setRequestLabel,
  MEMORY_SCOPE_OFF,
} from "./ui-controls.mjs";

import { projectRunSummary } from "./summary-disclosure-projection.mjs";
import { createRunSummaryCard } from "./summary-disclosure.mjs";

import { installShellLayout } from "./shell-layout.mjs";
installShellLayout({ window, document, navigator });
import { toHomeActivity, toHomeAttention, toHomeAttentionDetail } from "./presentation-adapters.mjs";
import { createAttentionWorkspace } from "./attention-view.mjs";
import { createAttentionAgent } from "./attention-agent-view.mjs";
import { renderRequestMeasurements } from "./telemetry-view.mjs";
import { createModelPicker } from "./model-picker.mjs";
import { createUsageView } from "./usage-view.mjs";
import { createSparkView } from "./spark-view.mjs";
let attentionWorkspace, attentionAgent, modelPicker, usageView, sparkView;
import {
  createSettingsPage,
  createSettingsView,
  isSettingsSection,
  permissionLabels,
  providerLabels,
  renderConnectionCard,
  readPreferences,
  DEFAULT_SECTION,
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
import {
  renderHome,
  renderHomeBand,
  renderHomeModuleBand,
  homeSets,
} from "./home-view.mjs";
import {
  projectThread,
  toolStateWord,
  unfinishedToolWord,
  canAnswer,
  validPermission,
  permissionPresentation,
} from "./thread-projection.mjs";

import {
  renderSessionOverview,
  renderRunHistory,
} from "./workspace-view.mjs";
import {
  surfaceModules,
  surfaceModule,
  resolveSurfaceSlot,
  slotStatusLine,
  workPacket,
  renderWorkPacket,
  decisionWords,
  shortRef,
} from "./surface-modules.mjs";
import { renderUserMessage } from "./user-message.mjs";

const API_BASE = "/api/v5";
const UI_STORAGE_KEY = "schema-engineering.ui.v6";
const HOME_DRAFT_KEY = `${UI_STORAGE_KEY}.home-draft`;
const surfaceOverlayQuery = window.matchMedia("(max-width: 1023px)");
// WK-58 · below 768 the composer docks at the foot of the frame on Home too, so
// the placement itself is viewport-dependent and not only its padding.
const narrowQuery = window.matchMedia("(max-width: 767px)");
/* WK-113 ① / CC-W · 工作面按视口分档的那条线。从 1680 起 nav 256 + chat ≥640 +
 * doc ≥688 在算术上成立，工作面因此是真正的第三栏；1024–1679 它是主区内的视图
 * 切换（B），<1024 仍是全屏 sheet。断点写在这里一次，CSS 里同一个数字。 */
const surfaceThreePaneQuery = window.matchMedia("(min-width: 1680px)");

const state = {
  token: null,
  editMessageCandidate: null,
  view: "home",
  navigationOpen: false,
  sidebarCollapsed: false,
  attentionOpen: false,
  homeActivity: { data: null, error: null, loading: true, generation: 0, days: 84 },
  homeAttention: { data: null, error: null, loading: true, generation: 0, projectId: null, selectedId: null, detail: null, detailGeneration: 0 },
  home: { data: null, error: null, loading: false, generation: 0, offsets: {}, filter: null },
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
  /* WK-78 / FN-26 · Settings 是页面而不是模态，所以它不改会话，也不改 state.view：
   * 它只是主区当前显示的东西。`section` 与 hash 同步，`returnFocus` 记住进入前握着
   * 焦点的那个控件，Back 与 Escape 都把焦点还回去。 */
  settings: { open: false, section: DEFAULT_SECTION, returnFocus: null },
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
    // WK-41 · the workspace tree is fetched once by the host and handed to both
    // rail states, so collapsing and expanding never re-reads the same tree.
    workspace: null,
    expanded: false,
    maximized: false,
    /* WK-72 ·两个量测结果（非形式状态，不入 localStorage）：悬浮层收成 glyph 竖条
     * 与否，以及 composer 当前占去的高度。 */
    strip: false,
    composerHeight: 0,
    requestId: 0,
    fetchRequestId: 0,
    fetchController: null,
    controller: null,
    context: null,
    info: null,
    rendererUnavailableContext: null,
    projection: null,
    module: null,
    ownedContainer: null,
    mounted: null,
  },
  /* WO-WK10b 第二段 · the formal decisions of the session's bound work, and the
   * committed receipt for each. The Chat Flow row is drawn from the receipt,
   * not from the decision: a decision the server cannot confirm has no receipt,
   * and a null receipt never becomes a success row (frontend-entries 3.4).
   * This store is read for a bound session whether or not the work surface is
   * open, because the receipt row belongs to the conversation. */
  work: { sessionId: null, decisions: [], receipts: new Map(), matterId: null, stateVersion: null },
  /* Which rule rows of the read-only fallback are open. A disclosure is a view
   * state, not a formal one, and it survives a re-read (FN-23). */
  surfaceRuleOpen: new Set(),
  /* WO-WK10b 第二段 · the work this project already owns, read once when the
   * binding panel opens. The route is per project, so work of another project
   * is not in this list and cannot be offered here. */
  projectWork: { projectId: null, extensionId: null, matters: null, error: null },
};

const $ = (id) => document.getElementById(id);
let tooltips, settingsView, settingsPage, materialsView, fileView, runtimeView;
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
        state.homeStart.error = "Creating the chat is unconfirmed. Refresh and check recent chats before trying again. Your instruction is kept.";
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
      attrs: { type: "button", "aria-label": "Recover run receipt" },
      text: "Recover",
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
      "Could not confirm run admission. Check this chat’s history before retrying.",
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
      "Could not confirm run cancellation. Check this chat’s history before retrying.",
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
        /* FE-04 · 在途记号也按 decision 登记（见 renderPermission），回执到达时
         * 一并撤掉，否则一条已结算的授权会留着「Sending…」不放。 */
        state.questionSubmitting.delete(`${key}:allow`);
        state.questionSubmitting.delete(`${key}:deny`);
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
        // A run ending lifts the runtime freeze; the Workbench reads the fact
        // from a fresh snapshot rather than deciding it locally.
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
  fileManifestController?.abort();
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
  state.attentionOpen = false;
  attentionWorkspace?.deactivate();
  /* 侧栏在 Settings 在场时是可点的（这正是页面而非模态的意思），所以走到一个会话
   * 就得让这一页退场：否则会话在底下换好了，顶带还写着 Settings。焦点交给下面的
   * 会话流程，不还给打开设置的那个控件。 */
  closeSettings({ restoreFocus: false });
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
  state.surface.workspace = null;
  state.surface.workspaceGeneration++;
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
  state.surface.maximized = false;
  state.recordedContext.clear();
  runtimeView?.pause();
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
    state.surface.open = !surfaceOverlayQuery.matches;
    renderAll();
    await loadSurface(epoch);
    await loadWorkThread(epoch);
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
  state.attentionOpen = false;
  attentionWorkspace?.deactivate();
  stopPolling();
  void disposeSurfaceRenderer();
  state.sessionEpoch += 1;
  state.activeSessionId = null;
  state.view = "home";
  state.surface.open = false;
  state.surface.kind = "preview";
  state.surface.fileRef = null;
  state.surface.workspace = null;
  state.surface.workspaceGeneration++;
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
  state.surface.maximized = false;
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
  if (navigationEpoch !== state.navigationEpoch) return;
  const projectIds = new Set([...state.openProjectIds, state.activeProjectId].filter(Boolean));
  await Promise.all([...projectIds].map(id => loadSessionsForProject(id, { force: true })));
  if (navigationEpoch !== state.navigationEpoch) return;
  renderProjectList();
  if (state.view === "home") { await loadHome(); return; }
  const sessions = state.sessionsByProject.get(state.activeProjectId);
  if (navigationEpoch !== state.navigationEpoch || !sessions) return;
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

/* WO-SP1-FE · Spark reads BE-41's Matter rows, which carry a `matterId` but
 * no session reference (`list_work` doesn't return one either — see
 * SP-3/be41-dto.md). "Reuse the existing Work-surface route, open no new
 * surface" (WO-SP1-FE §交付) means finding the Session already bound to this
 * Matter the same way `coordination-projection.mjs` already does
 * (`extensionBinding.binding.matterId`) and calling the existing
 * `selectProject(projectId, {sessionId})` route, then activating the existing
 * Work preview after the selected session and binding are revalidated.
 * A Matter with no currently open Session is left unopened, with a plain
 * notice; Spark does not start a new Work chat on a maintenance read. */
/* Matter -> Session is not a contract relation: `{detach:true}` releases a
 * binding while the formal work survives, so a Matter can have no bound
 * session at all, and nothing forbids more than one over time. The binding
 * shape read here is the server's own (service.mjs queryWork reads
 * `session.extensionBinding.binding.matterId`), not a UI convention. The
 * search stays inside the project Spark is scoped to, so opening a row never
 * fans out session loads across every project. */
async function openMatterSurface(matterId, projectId) {
  if (!projectId) { showToast("No open Work chat is bound to this Matter yet.", "error"); return; }
  const lookupEpoch = state.navigationEpoch;
  const sessions = state.sessionsByProject.get(projectId) ?? await loadSessionsForProject(projectId);
  if (state.navigationEpoch !== lookupEpoch) return;
  const owners = (sessions || []).filter((session) => session.extensionBinding?.binding?.matterId === matterId);
  const owner = owners.slice().sort((a, b) => a.id.localeCompare(b.id))[0];
  if (owner) {
    const selection = selectProject(projectId, { sessionId: owner.id });
    const selectionEpoch = state.navigationEpoch;
    await selection;
    if (state.navigationEpoch !== selectionEpoch || state.activeProjectId !== projectId || currentSession()?.id !== owner.id) return;
    if (currentSession()?.extensionBinding?.binding?.matterId !== matterId) {
      showToast("No open Work chat is bound to this Matter yet.", "error");
      return;
    }
    activateSurface("preview");
    return;
  }
  showToast("No open Work chat is bound to this Matter yet.", "error");
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
      `New chat in ${project.name}`,
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
          attrs: { type: "button", "aria-label": "Retry loading chats" },
          text: "Retry",
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
          element("p", { className: "empty-list", text: "Loading chats…" }),
        );
      } else if (!sessions.length) {
        sessionList.append(
          element("p", { className: "empty-list", text: "No chats yet." }),
        );
      } else {
        const limit = state.navigationFilter
          ? sessions.length
          : state.navigationLimits.get(project.id) || 8;
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
                "data-tooltip": session.title || "Untitled chat",
                "data-nav-key": `session:${session.id}`,
              },
            },
            /* WK-92 · 导航里一行会话只多说一件事：它是不是 Work。Chat 是默认的那一
             * 种，所以它不带标记 —— 给每一行都挂一个词只会让两种模式都不显眼。标记
             * 与标题同一行，标题先省略号，行高因此不随模式改变。 */
            element(
              "span",
              { className: "session-line" },
              element("span", {
                className: "session-name",
                text: session.title || "Untitled chat",
              }),
              sessionMode(session) === "work"
                ? element("span", { className: "session-mode-tag", text: "Work" })
                : null,
            ),
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
        sessions.length > (state.navigationLimits.get(project.id) || 8) &&
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
            (state.navigationLimits.get(project.id) || 8) + 10,
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
      if (session && session.scope !== "global" && !session.extensionBinding) {
        const bindButton = element("button", {
          className: "secondary-button",
          attrs: { type: "button" },
          text: "Continue in Work",
        });
        bindButton.addEventListener("click", () => {
          state.bindingExtensionId = extension.id;
          closeSettings({ restoreFocus: false });
          renderBindingPanel();
          focusBindingEntry();
          void loadProjectWork(session.projectId, extension.id);
        });
        actions.append(bindButton);
      }
      /* G3 · the other half of the same contract: `{detach:true}` releases the
       * execution binding after the project keeps the work. The formal record
       * survives, and this Session goes back to plain Chat — which is why the
       * word is «Release», not «Delete» (contract «Binding and actions»). */
      if (session && session.extensionBinding?.extensionId === extension.id) {
        const releaseButton = element("button", {
          className: "quiet-button",
          attrs: { type: "button" },
          text: "Release",
        });
        releaseButton.setAttribute(
          "aria-label",
          "Return this Work to Chat. The recorded work stays in this project.",
        );
        releaseButton.addEventListener("click", () => void releaseBinding(extension.id));
        actions.append(releaseButton);
      }
    }
    row.append(actions);
    list.append(row);
  }
}

async function releaseBinding(extensionId) {
  const session = currentSession();
  if (!session) return;
  try {
    const result = await request(
      `/sessions/${encodeURIComponent(session.id)}/extension`,
      { method: "POST", body: { extensionId, input: { detach: true } } },
    );
    if (state.activeSessionId !== session.id) return;
    state.session = result.session || state.session;
    state.sessionsByProject.set(
      session.projectId,
      (state.sessionsByProject.get(session.projectId) || []).map((item) =>
        item.id === session.id ? state.session : item,
      ),
    );
    state.work = { sessionId: null, decisions: [], receipts: new Map(), matterId: null, stateVersion: null };
    await disposeSurfaceRenderer();
    renderAll();
    await loadSurface(state.sessionEpoch);
    showToast("The binding is released; the recorded work stays in this project.");
  } catch (error) {
    showToast(`Could not release the binding: ${error.message}`, "error");
    if (error.status === 409) await refreshSessionBinding(session.id);
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

/* G3 · what this project already owns, so a new Session can continue it instead
 * of starting a second work item over the same source. The route is scoped to
 * one project by the server; nothing here merges two projects' lists. */
async function loadProjectWork(projectId, extensionId) {
  state.projectWork = { projectId, extensionId, matters: null, error: null };
  if (!projectId) return;
  try {
    const result = await request(
      `/projects/${encodeURIComponent(projectId)}/work`,
    );
    if (state.projectWork.projectId !== projectId) return;
    state.projectWork.matters = Array.isArray(result?.matters) ? result.matters : [];
  } catch (error) {
    if (state.projectWork.projectId !== projectId) return;
    state.projectWork.error = error.message;
  }
  if (state.bindingExtensionId) renderBindingPanel();
}

/* The authoritative answer to a refused binding is the session record itself:
 * `binding_exists` and `binding_mismatch` both mean this host already knows
 * something this panel did not. Re-read it rather than restate the guess. */
async function refreshSessionBinding(sessionId) {
  try {
    const detail = await request(`/sessions/${encodeURIComponent(sessionId)}`);
    if (state.activeSessionId !== sessionId) return;
    state.session = detail.session || state.session;
    const list = state.sessionsByProject.get(state.session.projectId) || [];
    state.sessionsByProject.set(
      state.session.projectId,
      list.map((item) => (item.id === sessionId ? state.session : item)),
    );
    renderAll();
  } catch {
    /* The refusal message stands on its own. */
  }
}

/* WK-85 (2) · which segment leads is decided by the data, not by a fixed order:
 * a project that already owns work is a project where continuing is the likely
 * act, and a project that owns none has no second choice to offer. `entries` is
 * null in both of the cases that are not "there is work": the read has not
 * settled, and the read settled on nothing. The sentence says which (DC-1). */
function existingProjectWork(extension, session) {
  const work = state.projectWork;
  if (work.projectId !== session.projectId || work.matters === null)
    return {
      entries: null,
      note: work.error || "Reading the work this project already owns…",
    };
  const entries = work.matters.filter(
    (item) => item?.extensionId === extension.id && item?.matter?.id,
  );
  return entries.length
    ? { entries, note: null }
    : {
        entries: null,
        note: `No work in this project is bound to ${extension.title || extension.id} yet.`,
      };
}

function continueExistingSegment(entries, submitExisting) {
  const segment = element("section", { className: "binding-segment" });
  segment.append(element("h4", { text: "Existing work in this project" }));
  const list = element("div", { className: "binding-entries" });
  for (const entry of entries) {
    const matter = entry.matter;
    const row = element("div", { className: "binding-entry" });
    const button = flowRow(
      "button",
      {
        glyph: "plug",
        title: shortRef(matter.id),
        meta: matter.version === undefined ? null : `version ${matter.version}`,
        className: "binding-entry-open",
        attrs: {
          type: "button",
          "aria-label": `Continue ${matter.id}`,
          "data-focus-key": `binding-existing:${matter.id}`,
        },
      },
    );
    button.addEventListener("click", () => void submitExisting(matter.id, button));
    row.append(button);
    const facts = [entry.extensionId];
    if (matter.source_version !== undefined)
      facts.push(`source revision ${matter.source_version}`);
    if (matter.contract_version) facts.push(matter.contract_version);
    row.append(element("p", { className: "work-note", text: facts.join(" · ") }));
    list.append(row);
  }
  segment.append(list);
  return segment;
}

function renderBindingPanel() {
  const panel = $("binding-panel");
  clear(panel);
  const extension = state.extensions.find(
    (item) => item.id === state.bindingExtensionId,
  );
  const session = currentSession();
  if (!extension || !session || session.scope === "global" || session.extensionBinding) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const inner = element("div", { className: "binding-panel-inner" });
  inner.append(
    element("h3", { text: "Continue in Work" }),
  );
  inner.append(
    element("p", {
      className: "binding-panel-note",
      text: `This chat keeps its history and its project; continuing in Work binds it to a Matter that ${extension.title || extension.id} owns. Nothing is copied and nothing is moved. That extension validates the fields below; this page only renders what its manifest declares.`,
    }),
  );
  const submitExisting = async (matterId, control) => {
    control.disabled = true;
    try {
      const result = await request(
        `/sessions/${encodeURIComponent(session.id)}/extension`,
        {
          method: "POST",
          body: { extensionId: extension.id, input: { existingMatterId: matterId } },
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
      await loadWorkThread(state.sessionEpoch);
      showToast("This chat continues the existing work.");
    } catch (error) {
      control.disabled = false;
      showToast(`Could not continue this work: ${error.message}`, "error");
      if (error.status === 409) await refreshSessionBinding(session.id);
    }
  };
  const created = element("section", { className: "binding-segment" });
  created.append(element("h4", { text: "New work" }));
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
    text: "Continue in Work",
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
      await loadWorkThread(state.sessionEpoch);
      showToast("This chat continues in Work.");
    } catch (error) {
      submit.disabled = false;
      showToast(`Could not create binding: ${error.message}`, "error");
      if (error.status === 409) await refreshSessionBinding(session.id);
    }
  });
  created.append(form);
  const existing = existingProjectWork(extension, session);
  if (existing.entries)
    inner.append(continueExistingSegment(existing.entries, submitExisting), created);
  else
    inner.append(
      created,
      element("p", { className: "section-note", text: existing.note }),
    );
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


/* WK-94 · the header capability badge is retired. The connection identity is a
 * standing fact of the composer's context row and is stated there once; the
 * header said the same thing a second time in a band that has nothing else to
 * say. `#model-settings-button` is now the single entry to the connection card
 * on this screen (FN-05). */
function renderProviderPanel() {
  settingsView?.update(state.providerConfig);
  const config = state.providerConfig?.config;
  if (config)
    $("model-settings-button").textContent =
      config.provider === "fake-openai-loopback" ? "Local test" : config.model;
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

/* WK-57 / IC-1 · the type glyph says what kind of act the row records, so the
 * user does not have to read the tool identifier to tell a read from a write.
 * The identifier itself stays visible beside it — the glyph never replaces the
 * object name, and "open the current file" and "write to it" are not allowed to
 * share one file glyph (IC-1, «成果摘要入口» row). Anything unrecognised keeps
 * the neutral activity glyph rather than being guessed into a family. */
function toolGlyph(name) {
  const tool = String(name || "");
  if (tool === "ws_write") return "square-pen";
  if (tool === "ws_list") return "folder";
  if (tool === "ws_grep") return "search";
  if (tool === "ws_read" || tool === "se_read_source") return "file-text";
  if (tool.startsWith("runtime_")) return "settings-2";
  return "activity";
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

/* A decision becomes visible in the conversation only when the server confirms
 * it. `projection.decisions[]` says this host recorded one; the request query
 * says Core committed it. A null receipt draws nothing — not a success row, not
 * a failure row (frontend-entries 3.4, FN-28). */
function decisionReceiptRows(runId) {
  if (!runId || state.work.sessionId !== state.activeSessionId) return [];
  const rows = [];
  for (const decision of state.work.decisions) {
    if (decision?.scope?.run_id !== runId) continue;
    const receipt = state.work.receipts.get(decision.request_id);
    if (!receipt) continue;
    const facts = [];
    if (receipt.version !== undefined) facts.push(`version ${receipt.version}`);
    if (state.work.stateVersion && state.work.matterId === decision.matter_id)
      facts.push(`state ${state.work.stateVersion.slice(0, 12)}`);
    const card = element("article", { className: "decision-receipt" });
    card.append(
      flowRow("div", {
        glyph: "file-text",
        title: shortRef(receipt.candidate_id || decision.candidate_id),
        meta:
          decisionWords[receipt.action || decision.action] ||
          String(receipt.action || decision.action || ""),
      }),
    );
    if (facts.length)
      card.append(element("p", { className: "work-note", text: facts.join(" · ") }));
    rows.push(card);
  }
  return rows;
}

/* WK-115 ① · 一个没有 result 的工具调用有两种不同的事实，不能共用一个词。
 * Run 明确 cancelled / failed 时，这次调用确实是被打断的；Run 的终态本身是
 * `unknown`（或根本没有对应的 Run 记录）时，它为什么没有回来同样是未知的，写
 * `Interrupted` 是对未知事实的正面断言（FN-28）。第六个词因此是 `Unknown`
 * （glyph-semantics §3）。BE-33 交付后原因改由后端给出，这里的推断随之退役。 */
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
        element("h3", { text: "No chat selected" }),
        element("p", {
          text: state.projects.length
            ? "Choose a chat from the left or create one."
            : "Create a project and a chat from the left.",
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
    activityGroup = null,
    pendingList = null;
  /* WK-115 ② · Chat Flow 的未决卡是一条列表，Home 下带的行是另一条：一条是这一个
   * 会话里等着人回答或授权的东西，一条是跨会话的收件箱。两者各自 `role="list"`，
   * 不合并成一条 —— 合并会让读屏把「本会话 3 项」读成整个工作区的计数。列表键
   * （j / k / o / Enter / Home / End）在两条上行为一致，但走的是各自的那一条。
   * 除未决卡以外的流内容不是列表项，遇到它就把这一段收口。 */
  const appendFlowRow = (node) => {
    if (!node?.matches?.("[data-nav-item]")) {
      pendingList = null;
      list.append(node);
      return;
    }
    if (!pendingList || pendingList.parentElement !== list) {
      pendingList = element("div", {
        className: "pending-list",
        attrs: { role: "list" },
      });
      list.append(pendingList);
    }
    pendingList.append(
      element(
        "div",
        { className: "pending-list-item", attrs: { role: "listitem" } },
        node,
      ),
    );
  };
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
      appendFlowRow(
        renderUserMessage(row, {
          key: sessionScopeKey("user", row.id), viewState: userMessageViews,
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
        element("span", { className: "message-role", text: currentSession()?.scope === "global" ? "Attention" : "Assistant" }),
      );
      wrapper.append(header);
      appendAssistantBody(
        wrapper,
        row.text,
        sessionScopeKey("assistant", row.id),
      );
      const footer = element("footer", { className: "assistant-message-actions" });
      if (!row.pending) footer.append(
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
      wrapper.append(footer);
      appendFlowRow(wrapper);
    } else if (row.kind === "tool") {
      /* WK-47 ablation · the whole row no longer turns red. A failed tool is
       * named by its state word, and the failure text itself is inside; colour
       * was never the only carrier and the object name is not a state
       * (copy-convention §2, FN-28). */
      const details = element("details", { className: "tool-card" });
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
      /* WK-57 · the state word is a word in its own slot, not a lower-case
       * suffix glued to the tool's name with a middle dot. A finished tool row
       * still carries no state word: the group summary above it already says
       * the run completed, and repeating it on every row answers nothing
       * (WK-47 ablation C-2). */
      const toolState = toolStateWord(row, status);
      details.append(
        flowRow("summary", {
          glyph: toolGlyph(row.name),
          title: row.name,
          meta: toolState,
          className: row.isError ? "is-failed" : "",
        }),
      );
      const detail = element("div", { className: "tool-detail-block" });
      appendToolDetails(detail, row);
      details.append(detail);
      details.addEventListener("toggle", () =>
        state.toolOpen.set(key, details.open),
      );
      if (!activityGroup) {
        const groupKey = sessionScopeKey("activity", row.id);
        const group = element("details", { className: "activity-group" });
        /* The group heading is the same anatomy as the rows it holds: the type
         * glyph, the object name (how many tool actions), and one state word. */
        const summary = flowRow("summary", {
          glyph: "activity",
          title: "Activity",
        });
        group.append(summary);
        group.open = state.toolOpen.has(groupKey)
          ? state.toolOpen.get(groupKey)
          : row.isError;
        group.addEventListener("toggle", () =>
          state.toolOpen.set(groupKey, group.open),
        );
        activityGroup = {
          node: group,
          title: summary.querySelector(".flow-title"),
          meta: element("span", { className: "flow-meta" }),
          count: 0,
          errors: 0,
          working: 0,
          interrupted: 0,
          unknown: 0,
        };
        summary.append(activityGroup.meta);
        appendFlowRow(group);
      }
      activityGroup.count++;
      activityGroup.errors += row.isError ? 1 : 0;
      activityGroup.working +=
        row.phase !== "result" && toolStillActive ? 1 : 0;
      activityGroup.interrupted +=
        row.phase !== "result" &&
        !toolStillActive &&
        unfinishedToolWord(status) === "Interrupted"
          ? 1
          : 0;
      activityGroup.unknown +=
        row.phase !== "result" &&
        !toolStillActive &&
        unfinishedToolWord(status) === "Unknown"
          ? 1
          : 0;
      activityGroup.title.textContent = `${activityGroup.count} ${activityGroup.count === 1 ? "tool action" : "tool actions"}`;
      activityGroup.meta.textContent = activityGroup.errors
        ? `${activityGroup.errors} failed`
        : activityGroup.working
          ? status === "waiting_user"
            ? "Waiting for you"
            : status === "stopping"
              ? "Stopping"
              : "Working"
          : activityGroup.interrupted
            ? "Interrupted"
            : activityGroup.unknown
              ? "Unknown"
              : "Completed";
      activityGroup.node.classList.toggle("is-failed", activityGroup.errors > 0);
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
        /* WK-57 · the same anatomy the live card uses: the question's own text
         * is the title, and how it ended is the one metadata word. The two were
         * previously one string joined by a middle dot, which read as part of
         * the prompt. */
        history.append(
          flowRow(
            "summary",
            {
              glyph: "message-square",
              title: row.prompt,
              meta: row.answer ? "Answered" : "Closed",
              attrs: { "data-focus-key": `${questionKey}:answer` },
            },
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
        appendFlowRow(history);
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
        /* WK-4 · a pending card is one stop of the list keyboard. It is not in
         * the tab sequence (tabindex -1): Tab still walks the controls. */
        attrs: { tabindex: "-1", "data-nav-item": "" },
      });
      /* WK-57 ablation · «Answer requested» said nothing the Answer button
       * below it does not say, and the prompt was a second paragraph under a
       * heading that was not an object name. One head remains: the type glyph,
       * the question itself as the title, and one state word. */
      const questionKey = questionScopeKey(row.runId, row.id);
      card.append(
        flowRow("div", {
          glyph: "message-square",
          title: row.prompt,
          /* No state word on the live card: an unanswered input with an Answer
           * button beside it is the state, and the run status row directly
           * below already carries «Waiting for you» from the Host. The word was
           * on screen three times within one section (WK-47 ablation C-5). The
           * decided history row keeps its word, because there it is the only
           * carrier. */
          className: "question-head",
        }),
      );
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
        });
        setRequestLabel(submit, "Answer", submitting);
        form.append(input, submit);
        const questionError = state.questionErrors.get(questionKey);
        /* FE-04 · 提交失败在授权卡上是一条 `role="alert"`，在问题卡上原先只是一段
         * 静默的文字。同一族原语的同一件事不该只对看得见的人说：读屏用户按下
         * Answer 之后不会知道它没有被接受（FN-28 «loading / error 可辨»）。 */
        if (questionError)
          form.append(
            element("p", {
              className: "question-error",
              attrs: { role: "alert" },
              text: questionError,
            }),
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
      appendFlowRow(card);
    } else if (row.kind === "permission") {
      appendFlowRow(renderPermission(row));
    } else if (row.kind === "artifact") {
      if (
        row.file?.kind !== "content-version" ||
        !/^[a-f0-9]{64}$/.test(row.file.sha256 || "")
      )
        continue;
      /* WK-57 · the output row is the same anatomy: type glyph, the file's own
       * path as the title, one metadata word saying which of the two readings
       * this is (IC-1 keeps «current file» and «recorded version» apart), and
       * the single action of opening it — the row itself. */
      const button = flowRow(
        "button",
        {
          glyph: "file-text",
          title: row.file.path,
          meta: "Recorded version",
          className: "artifact-thread-row",
          attrs: { type: "button", "data-focus-key": row.id },
        },
        icon("chevron-right", { size: 16 }),
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
      appendFlowRow(button);
    } else if (row.kind === "notice") {
      appendFlowRow(
        element("p", {
          className: `notice-row ${row.data?.kind === "unrecorded_files" ? "attention" : ""}`,
          text: noticeText(row.data),
        }),
      );
    } else if (row.kind === "error") {
      appendFlowRow(
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
      appendFlowRow(card);
      /* frontend-entries 3.4 · the Run's formal outcome, one read-only row
       * after the Run it belongs to. It restates nothing the decision changed:
       * which version was decided, how, and at which work state. There is no
       * button, and no fourth Home band (WK13 keeps three). */
      for (const receipt of decisionReceiptRows(row.runId)) appendFlowRow(receipt);
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
  /* R4D-3 · 没有布局盒的时候（B 态展开，聊天列 `hidden`）什么都不写：此刻
   * scrollTop 与 scrollHeight 都是 0，照写会把记住的阅读位置抹成 0。 */
  if (!stream.clientHeight && !stream.scrollHeight) {
    setJumpLatestVisible(!reading.followLatest);
    return;
  }
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
// WK-51 · the brand symbol is restrained to the sidebar wordmark; the session
// header carries the run state word instead of an animated mark.

function renderChatHeader() {
  const session = currentSession(),
    project = currentProject();
  /* WK-78 · Settings 在场时顶带说的是这一页，而不是它盖住的那个会话；进入设置的入口
   * （连接徽章、会话概览、工作面）在这一页里都收起来，否则会从设置再走回设置。
   * 会话本身没有被离开，所以标题一收起页面就回来。 */
  const settingsOpen = state.settings.open;
  $("settings-page").hidden = !settingsOpen;
  $("attention-workspace").hidden = !state.attentionOpen || settingsOpen;
  $("app-shell").classList.toggle("attention-active", state.attentionOpen && !settingsOpen);
  renderConversationBodyVisibility();
  $("app-shell").classList.toggle("settings-active", settingsOpen);
  /* WK-116 · 进入 Settings 后全局侧栏不渲染。`hidden` 让它离开无障碍树，`inert`
   * 让它离开焦点顺序：视觉上藏起来但 Tab 仍能走进去的侧栏，会让「这一页的分组导航是
   * 唯一导航」成为一句假话。折叠态由 .nav-collapsed 各自负责，两者互不覆盖。 */
  const navigationPanel = $("navigation-panel");
  navigationPanel.hidden = settingsOpen;
  navigationPanel.inert = settingsOpen;
  /* 没有可开合的侧栏，就没有开合它的按钮；那个槽位在这一页上由 Back to app 占据。 */
  $("toggle-nav-button").hidden = settingsOpen;
  $("settings-back-button").hidden = !settingsOpen;
  // WK-40 · one title line: the project name is a prefix only when the sidebar
  // cannot show it (collapsed or narrow); Home carries no eyebrow at all.
  const projectTitle = $("project-title");
  projectTitle.textContent = state.view === "home" ? "" : project?.name || "";
  projectTitle.hidden = settingsOpen || state.view === "home" || !project?.name;
  $("session-title-text").textContent = settingsOpen
    ? "Settings"
    : state.attentionOpen ? "Attention" : state.view === "home"
      ? "Home"
      : session?.title || "Loading chat…";
  /* WK-92 · 标题下一行说的是**这是哪一种会话**，以及（只在 Work 上）它的 memory
   * scope。Chat 与 Work 是同一个对象的两种模式，所以它们共用一条标题行，模式词
   * 作为陈述跟在后面，而不是两个分开的界面。M-2 / WK-113 ③ 之后 `Memory · Off`
   * 不再挂在这一行上：scope 位属于工作面的标题带，由 `renderSurfaceScope()` 画。 */
  const meta = $("session-meta");
  meta.replaceChildren();
  if (!settingsOpen && session) {
    meta.append(
      element("span", {
        className: "session-mode",
        text: session.scope === "global" ? "Attention" : sessionModeLabel(session),
      }),
    );
    if (currentRun()) appendRunBadge(meta, currentRun().status);
  }
  $("show-surface-button").hidden = settingsOpen || state.attentionOpen || !session;
  $("show-run-button").hidden = settingsOpen || state.attentionOpen || !session;
  const home = state.view === "home" && !state.attentionOpen;
  $("composer-area").hidden = settingsOpen || state.attentionOpen || (!home && !session);
  $("app-shell").classList.toggle("home-active", home);
  $("home-composer-intro").hidden = !home;
  $("home-composer-context").hidden = !home;
  if (!home) $("home-start-status").hidden = true;
  $("materials-button").hidden = home || !session;
  $("permission-settings-button").hidden = home || !session;
  const body = $("conversation-body"),
    composer = $("composer-area"),
    band = $("home-top-band"),
    modules = $("home-module-band"),
    stream = $("message-stream").closest(".message-stream-wrap");
  // DOM order is reading order: Modules overview precedes the desktop composer;
  // Simple keeps the centred composer, while mobile docks it below the work list.
  band.hidden = !home;
  // Simple removes the overview from layout and the accessibility tree.
  const bandLayout = home && homeLayoutPreference() === "modules";
  modules.hidden = !bandLayout;
  $("app-shell").classList.toggle("home-modules-active", bandLayout);
  /* WK-96 · in Work the Home dashboard primitives leave the document, not just
   * the screen: a hidden band is still a rendered band, and the next reader of
   * this DOM would find three Home statistics inside a chat. */
  if (!home) band.replaceChildren();
  if (!bandLayout) modules.replaceChildren();
  const centred = home && !narrowQuery.matches;
  if (centred) {
    if (body.firstElementChild !== composer) body.prepend(composer);
    if (composer.nextElementSibling !== band) composer.after(band);
  } else {
    if (body.firstElementChild !== band) body.prepend(band);
    if (band.nextElementSibling !== stream) band.after(stream);
    if (body.lastElementChild !== composer) body.append(composer);
  }
  // User refinement: attention and recorded activity orient Home above the
  // composer. DOM order is reading/tab order. Mobile keeps its docked composer.
  if (bandLayout && body.firstElementChild !== modules) body.prepend(modules);
  $("attention-button").setAttribute("aria-current", !settingsOpen && state.attentionOpen ? "page" : "false");
  measureHomeLead();
  const config = state.providerConfig?.config;
  const model =
    config?.provider === "fake-openai-loopback"
      ? "Local test"
      : config?.model || "Model settings";
  $("model-settings-button").textContent = model;
  $("model-settings-button").setAttribute(
    "aria-label",
    `Connection · ${providerLabels[config?.provider] || config?.provider || "Not loaded"} · ${model}`,
  );
  /* WK-73 · the quiet line below the composer states the standing context of
   * this session: which project it writes into, and what it may do to files.
   * The word is visible, the sentence is the accessible name and the tooltip. */
  const projectLine = $("composer-project");
  projectLine.textContent = project?.name || "";
  projectLine.hidden = home || !session || !project?.name;
  /* WK-94 · `File writes  Ask` 收成一个控件：可见文字就是后果本身，后面一个
   * disclosure 记号说明它可以打开。同一事实不再分成一个标签加一个单词。 */
  const permission = $("permission-settings-button"),
    mode = session?.permissionMode;
  const permissionSentence = permissionLabels[mode] || "File access";
  permission.replaceChildren(
    element("span", { className: "button-label", text: permissionSentence }),
    icon("chevron-down", { size: 16 }),
  );
  permission.setAttribute("aria-label", `File access: ${permissionSentence}`);
  permission.dataset.tooltip = `File access: ${permissionSentence}`;
  $("home-button").setAttribute(
    "aria-current",
    !settingsOpen && !state.attentionOpen && state.view === "home" ? "page" : "false",
  );
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
/* FE-04 · composer 的两个主控件说的是同一件事的两端，所以它们与授权卡、问题卡
 * 用同一个在途词（`requestLabel`）：请求已经送出、回执还没到。此前这一段窗口在
 * 屏幕上完全不存在 —— Send 被关掉但仍写着 Send，Cancel run 被关掉但仍写着
 * Cancel run，而 run hint 仍在数「Working for 12s」。FE-T06 的另半条正是这一条：
 * **cancel requested ≠ stopped**。状态词不动：`Stopping` 只在宿主把 Run 报成
 * `stopping` 之后才出现，取消请求本身不把 Run 提前说成已停（FN-19）。 */
const userMessageViews = new Map();
const COMPOSER_SEND_LABEL = "Send";
const COMPOSER_CANCEL_LABEL = "Cancel run";
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
    setRequestLabel(
      send,
      COMPOSER_SEND_LABEL,
      Boolean(state.homeStart?.pending),
    );
    send.disabled = Boolean(state.homeStart?.pending || state.homeStart?.unconfirmed || state.connectionLost) || !state.homeDraft.trim() || !homeProjectId();
    cancel.hidden = true;
    setRequestLabel(cancel, COMPOSER_CANCEL_LABEL, false);
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
  setRequestLabel(send, COMPOSER_SEND_LABEL, Boolean(pendingRun));
  setRequestLabel(cancel, COMPOSER_CANCEL_LABEL, Boolean(pendingCancel));
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
    textarea.placeholder = "Select a chat to continue";
  }
  /* The floating layer stops at the composer's top edge, so the composer's own
   * height is one of its two measurements (WK-72). */
  measureSurfaceLayout();
}

/* WK-96 · one machine-checkable fact about Home's first screen: the composer is
 * the optical anchor, so its centre sits at least 55 % of the way down the main
 * area. The height above it is not fixed — the orientation line, the theme's
 * text size and the window all move it — so the lead is measured rather than
 * guessed, and it is a measurement of the DOM as rendered, not a second layout
 * engine: read where the composer's centre is now, and add the difference.
 *
 * It applies only to the wide Home, where the composer floats in the column. In
 * a session and on a narrow screen the composer is docked at the foot and there
 * is no lead to compute (WK-97). */
/* CC-D0-a · the Home layout and the band's fold live in the same this-device
 * preference channel as Appearance (`cw:prefs`, WK-114 ⑥). They are display
 * preferences over facts the app already loaded, so they are not a second
 * source of truth for anything (WK-107 ②). Reading them here rather than
 * caching a copy in `state` keeps one value in one place. */
const homeLayoutPreference = () => readPreferences().homeLayout;
const homeModuleBandCollapsed = () =>
  readPreferences().homeModuleBand === "collapsed";

const HOME_COMPOSER_CENTRE = 0.56;
function measureHomeLead() {
  const shell = $("app-shell");
  const body = $("conversation-body");
  const form = $("composer-form");
  if (!shell.classList.contains("home-active") || narrowQuery.matches || $("composer-area").hidden) {
    shell.style.removeProperty("--home-lead");
    return;
  }
  const current = Number.parseFloat(
    getComputedStyle(shell).getPropertyValue("--home-lead"),
  );
  const lead = Number.isFinite(current) ? current : 0;
  const area = body.getBoundingClientRect();
  const box = form.getBoundingClientRect();
  if (!area.height || !box.height) return;
  const centre = box.top + box.height / 2 - area.top;
  // Modules have a finite top lead instead of the old 56%-height anchor:
  // their records and the first pending item must fit in the same first screen.
  const next = homeLayoutPreference() === "modules"
    ? 24
    : Math.max(32, Math.round(lead + (HOME_COMPOSER_CENTRE * area.height - centre)));
  if (Math.abs(next - lead) >= 1) shell.style.setProperty("--home-lead", `${next}px`);
}

function renderChat() {
  renderChatHeader();
  renderMessageStream();
  renderComposer();
  renderFeedback();
  renderInspector();
}

/* WK-33 / WK-56 · the rail has two states and no third: collapsed is one card
 * per module, expanded is one tab pane. Expanding on the desktop hands the
 * chat column to the pane inside the shell (WK-54) instead of floating a modal
 * over it, so the tab strip lands in the same band as the other two columns. */
function setSurfaceExpanded(expanded, { focus = true } = {}) {
  const next = Boolean(expanded && state.surface.open && currentSession());
  const was = state.surface.expanded;
  /* R4D-3 · B 态展开会把聊天列从屏幕上拿走（`hidden` + `inert`）。一个没有布局盒的
   * 元素的 scrollTop 是 0，所以阅读位置必须在它离开屏幕**之前**记下来，回来时由
   * `renderMessageStream()` 从同一个 Map 还原。草稿本来就在 `state.draftCache` 与
   * textarea 的 value 里，不受显隐影响。 */
  if (next && !was && $("message-stream").clientHeight)
    rememberMessageReading($("message-stream"));
  state.surface.expanded = next;
  if (!next) state.surface.maximized = false;
  if (next && !was) {
    if (!visibleSurfaceKinds().includes(state.surface.kind))
      state.surface.kind = "preview";
    loadSurfaceKind(state.surface.kind);
  }
  writeUiState();
  renderSurfaceVisibility();
  /* 回到聊天：DOM 一直在，位置由 `state.messageReading` 还原。 */
  if (!next && was) renderMessageStream();
  /* Returning lands on the cards, because the cards are what the overlay came
   * from; there is no rail header to return to (WK-72). */
  if (focus)
    next
      ? (surfaceTabButton(state.surface.kind) ?? $("surface-expand-button"))?.focus()
      : restoreLayerFocus(surfaceReturnFocus(), $("show-surface-button"));
}

/* Geometry-only transition: keep the active tab and renderer instance mounted. */
function toggleSurfaceMaximized() {
  if (!state.surface.expanded || surfaceOverlayQuery.matches) return;
  const next = !state.surface.maximized;
  if (next && $("message-stream").clientHeight) rememberMessageReading($("message-stream"));
  state.surface.maximized = next;
  renderSurfaceVisibility();
  if (!next) renderMessageStream();
  $("surface-expand-button").focus();
}

/* The panel is a modal only where it really covers the work: below 1024 the
 * expanded pane is an overlay, and below 768 so is the collapsed sheet
 * (docs/ui-composition.md §responsive). From 768 up the collapsed state is a
 * floating card layer that disables nothing, and from 1024 up the expanded
 * sheet leaves the sidebar operable (WK-74 (1)); claiming aria-modal in either
 * case would describe a trap that does not exist. */
/* B 态判定的单一出处：展开、桌面、且没到三栏那一档。`renderChatHeader` 与
 * `renderSurfaceVisibility` 都从这里读，免得两处各写一遍同一个条件、又互相覆盖。 */
function surfaceViewSwitch() {
  return Boolean(
    !state.attentionOpen && state.surface.open &&
      state.surface.expanded &&
      currentSession() &&
      !surfaceOverlayQuery.matches &&
      (state.surface.maximized || !surfaceThreePaneQuery.matches),
  );
}
function renderConversationBodyVisibility() {
  const body = $("conversation-body");
  const switched = surfaceViewSwitch();
  body.hidden = state.settings.open || state.attentionOpen || switched;
  body.inert = state.attentionOpen || (switched && !state.settings.open);
}
function surfaceIsModal() {
  return (
    !state.attentionOpen && state.surface.open &&
    surfaceOverlayQuery.matches &&
    (state.surface.expanded || narrowQuery.matches)
  );
}

/* A module without a tab has no pane of its own: it is a rail card that opens
 * somewhere else (the Runtime card opens Settings › Runtime). */
function surfacePaneModules() {
  return surfaceModules.filter((module) => module.tabId);
}
function visibleSurfaceKinds() {
  return surfacePaneModules()
    .filter((module) =>
      module.kind === "run"
        ? Boolean(state.surface.runId)
        : module.kind === "file"
          ? Boolean(state.surface.fileRef)
          : true,
    )
    .map((module) => module.kind);
}

/* WK-113 ④ ⑥ · 文档实例 tab 与类型 tab 是两种东西。类型 tab 是档位，没有关闭区；
 * 文档 tab 说的是**哪一份**文档，选中区与关闭区分开。第一段只有一份受信活动文档
 * （BE-2 未交付），所以这里没有数组、没有 map、没有位置表：文档 tab 在不在，就是
 * `state.surface.fileRef` 在不在。 */
function surfaceDocumentRef() {
  const ref = state.surface.fileRef;
  return ref && ref.sessionId === state.activeSessionId ? ref : null;
}
/* FN-22 · 显示 key 由已有身份字段拼出，不新增 `scope` 字段：scope 由 sessionId 推出。
 * 这个字符串只用来判断"tab 说的还是不是同一个对象"，renderer 的失效判定仍然是
 * `sameSurfaceIdentity`（含 status / modulePath，R4D-4），两者不共用一个值。 */
function surfaceDocumentKey(ref) {
  if (!ref) return "";
  return [
    ref.sessionId,
    ref.path,
    ref.kind,
    ref.sha256 || "",
    ref.runId || "",
    ...(ref.kind === "core-file" ? [ref.matterId,ref.candidateId,ref.artifactId || "",ref.candidateDigest,ref.bundleDigest] : []),
  ].join("\u0000");
}
function documentTabTitle(ref) {
  const name = ref.path.split("/").filter(Boolean).at(-1) || ref.path;
  return { name, full: ref.path };
}
/* 选中一个 kind 时该聚焦哪个按钮：file 档在有文档 tab 时由文档 tab 承担，类型 tab
 * 此刻不画（同一个面画两个 tab 是多余的一格）。 */
function surfaceTabButton(kind) {
  if (kind === "file" && surfaceDocumentRef()) return $("surface-document-select");
  const module = surfaceModule(kind);
  return module?.tabId ? $(module.tabId) : null;
}
function surfaceTabButtons() {
  return [...$("surface-tabs").querySelectorAll('[role="tab"]')].filter(
    (tab) => !tab.hidden && tab.closest("[hidden]") === null,
  );
}
function surfaceReturnFocus(opener = state.surface.returnFocus) {
  if (opener?.isConnected) return opener;
  const key = opener?.dataset?.focusKey;
  return key ? document.querySelector(`[data-focus-key="${CSS.escape(key)}"]`) : null;
}
/* 关闭活跃文档 tab：回紧凑目录，并把焦点还给打开它的那个控件（restoreLayerFocus）。 */
function closeDocumentTab() {
  if (!surfaceDocumentRef()) return;
  const opener = state.surface.returnFocus;
  /* 打开它的那一行在聊天流里，回来时那条流会重画一遍，于是原来那个节点已经不在
     文档里了。既有的 `data-focus-key`（Chat Flow 的行本来就带着它）说的正是"重画
     之后还是同一行"，所以按它把焦点找回来，而不是按节点身份。 */
  const openerKey = opener?.dataset?.focusKey ?? null;
  state.surface.fileRef = null;
  if (state.surface.kind === "file") state.surface.kind = "preview";
  fileView?.dispose();
  setSurfaceExpanded(false, { focus: false });
  renderSurfaceVisibility();
  const again =
    openerKey && !opener?.isConnected
      ? document.querySelector(
          `[data-focus-key="${CSS.escape(openerKey)}"]`,
        )
      : opener;
  restoreLayerFocus(again, $("show-surface-button"));
}
/* WK-118 ⑤ · agent activity 以微型 indicator 入对应类型 tab，不造 banner。形状与
 * 文字各说一遍，不只靠颜色（FN-28）：running 实心、waiting_user 空心环、failed 方块，
 * 每个都带一句 sr-only 的话。没有新图形、没有新色 —— 颜色沿 run-badge 的三档。 */
const TAB_ACTIVITY = {
  running: "Running",
  created: "Running",
  stopping: "Running",
  waiting_user: "Waiting for you",
  failed: "Failed",
  unknown: "Unknown",
};
/* run 的状态在每一次 render 里都可能变，而 `renderSurfaceVisibility` 只在布局变化时
 * 跑；记号因此从 `renderInspector` 一起画，那是 rail 与 pane 的同一次重绘。 */
function renderSurfaceTabActivity() {
  const tab = $("surface-run-tab");
  renderTabActivity(tab, tab.hidden ? null : (currentRun()?.status ?? null));
}
function renderTabActivity(tab, status) {
  const word = status ? TAB_ACTIVITY[status] : null;
  const existing = tab.querySelector(".tab-activity");
  if (!word) {
    existing?.remove();
    return;
  }
  const mark = existing ?? element("span", { className: "tab-activity" });
  mark.className = `tab-activity ${status}`;
  mark.replaceChildren(element("span", { className: "sr-only", text: word }));
  if (!existing) tab.append(mark);
}

function closeSurface({ restoreFocus = true } = {}) {
  state.surface.expanded = false;
  state.surface.maximized = false;
  state.surface.open = false;
  state.surface.runReadController?.abort();
  state.surface.runReadGeneration++;
  fileView?.pause();
  writeUiState();
  renderSurfaceVisibility();
  /* 收起时通常把焦点还给开它的控件；被别的东西接管（进 Settings 页）时不还，
     由接管者决定焦点落在哪里，否则焦点会先跳到一个马上要被藏起来的按钮上。 */
  if (restoreFocus)
    restoreLayerFocus(surfaceReturnFocus(), $("show-surface-button"));
}
/* The rail entry point: it opens the collapsed cards without choosing a kind,
 * because choosing one is what the cards are for. */
function openSurfaceRail() {
  if (!currentSession()) return;
  if (!state.surface.open) state.surface.returnFocus = document.activeElement;
  state.navigationOpen = false;
  state.surface.open = true;
  state.surface.expanded = false;
  state.surface.maximized = false;
  writeUiState();
  loadRailFacts();
  renderSurfaceVisibility();
  /* WK-72 · there is no rail header to land on any more: the first card's own
   * action is the first thing in the layer. */
  focusSurfaceRail();
}
function focusSurfaceRail() {
  const rail = $("surface-rail");
  const first = [...rail.querySelectorAll("summary, button:not([hidden])")].find(node => node.getClientRects().length);
  (first ?? $("surface-expand-button"))?.focus();
}
/* WK-72 · the layer's two measurements: how much room the composer leaves it,
 * and whether the main column can still hold a 740 reading column and a 360
 * card side by side. Both are read from the live box, never assumed. */
function measureSurfaceLayout({ render = true } = {}) {
  const chat = document.querySelector(".chat-panel");
  const composer = $("composer-area");
  if (!chat) return;
  const style = getComputedStyle(document.documentElement);
  const px = (name, fallback) =>
    parseFloat(style.getPropertyValue(name)) || fallback;
  const height = composer.hidden
    ? 0
    : Math.round(composer.getBoundingClientRect().height);
  if (state.surface.composerHeight !== height) {
    state.surface.composerHeight = height;
    document.documentElement.style.setProperty("--composer-h", `${height}px`);
  }
  const strip =
    chat.getBoundingClientRect().width <
    480 + 2 * px("--col-gap", 24) + 288;
  if (strip !== state.surface.strip) {
    state.surface.strip = strip;
    if (render) renderSurfaceVisibility();
  }
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
  measureSurfaceLayout({ render: false });
  const shell = $("app-shell"),
    panel = $("surface-panel"),
    nav = $("navigation-panel"),
    chat = shell.querySelector(".chat-panel");
  const open = Boolean(!state.attentionOpen && state.surface.open && currentSession()),
    expanded = open && state.surface.expanded;
  const overlay = surfaceOverlayQuery.matches;
  /* WK-113 ① · 展开态有两种，不是一种：≥1680 三栏并列（C），1024–1679 主区内的
   * 视图切换（B）。<1024 仍是那张全屏 sheet。 */
  const threePane = expanded && surfaceThreePaneQuery.matches && !overlay && !state.surface.maximized;
  const viewSwitch = expanded && !overlay && !threePane;
  const modal = surfaceIsModal(),
    navModal = overlay && state.navigationOpen && !open;
  const wasModal = panel.getAttribute("aria-modal") === "true";
  /* WK-72 · the collapsed state is a floating layer inside the main column, so
   * the shell says whether the reading column must step aside for it. */
  const cards = open && !expanded && !narrowQuery.matches;
  shell.classList.toggle("surface-cards", cards);
  shell.classList.toggle("surface-strip", cards && state.surface.strip);
  shell.classList.toggle("surface-expanded", expanded);
  shell.classList.toggle("surface-three-pane", threePane);
  shell.classList.toggle("surface-view-switch", viewSwitch);
  shell.classList.toggle("nav-open", navModal);
  shell.classList.toggle("nav-collapsed", state.sidebarCollapsed);
  panel.classList.toggle("is-open", open);
  panel.classList.toggle("is-expanded", expanded);
  panel.classList.toggle("is-three-pane", threePane);
  panel.classList.toggle("is-view-switch", viewSwitch);
  panel.classList.toggle("is-strip", cards && state.surface.strip);
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
  const navHidden = overlay ? !navModal : state.sidebarCollapsed;
  nav.inert = Boolean(modal || navHidden);
  nav.setAttribute("aria-hidden", String(nav.inert));
  if (navModal) {
    nav.setAttribute("role", "dialog");
    nav.setAttribute("aria-modal", "true");
  } else {
    nav.removeAttribute("role");
    nav.removeAttribute("aria-modal");
  }
  /* B（1024–1679）· 展开是**主区内的视图切换**：文档面占主区，聊天列的 DOM 一直在
   * （滚动位置与草稿因此不丢，R4D-3），但它不在屏幕上，所以也不能留在焦点顺序与无障碍
   * 树里 —— `hidden` + `inert` 一起给。顶带那一行不属于聊天列的内容，它是这一屏的
   * chrome（侧栏开合钮、会话名），所以留在原地可用。C（≥1680）三面同时在场，什么都
   * 不藏。 */
  renderConversationBodyVisibility();
  chat.inert = Boolean(modal || navModal);
  chat.setAttribute("aria-hidden", String(chat.inert));
  /* WK-69 · an L3 overlay sits over the scrim; the collapsed cards are L2 and
   * disable nothing, so the ground stays clear under them. */
  /* 遮罩只画在它真的挡住工作的地方：<1024 的那张 sheet。B 的视图切换不压暗任何
   * 东西（被切走的那一面根本不在屏幕上），C 三栏并列更没有可压暗的对象。 */
  $("surface-backdrop").hidden = !modal;
  $("nav-backdrop").hidden = !navModal;
  $("toggle-nav-button").setAttribute(
    "aria-expanded",
    String(overlay ? navModal : !state.sidebarCollapsed),
  );
  setAction(
    $("show-surface-button"),
    "panel-right",
    expanded ? "Collapse work surface" : open ? "Hide work surface" : "Open work surface",
  );
  /* C 态两面并列，"回到聊天"这句话没有对象可指：那里的同一个控件说的是把文档面收回
   * 紧凑目录。B 态由 strip 左端的 ← Chat 承担返回，展开钮此刻不画，免得一行里出现
   * 两个说同一件事的控件。 */
  setAction(
    $("surface-expand-button"),
    state.surface.maximized ? "minimize-2" : "maximize-2",
    state.surface.maximized ? "Restore preview" : expanded ? "Expand preview" : "Expand work surface",
  );
  $("surface-expand-button").setAttribute("aria-expanded", String(state.surface.maximized));
  $("surface-expand-button").hidden =
    (viewSwitch && !state.surface.maximized) || overlay;
  $("show-surface-button").hidden = expanded || state.settings.open || state.attentionOpen || !currentSession();
  const back = $("surface-back-button");
  back.hidden = !viewSwitch;
  if (viewSwitch) {
    /* 纯文字。sprite 里没有一个"往回"的 glyph，而 glyph-semantics 是本单不可写的
     * 契约文件；与其为一个控件新造一个图形，不如让这个控件就说 `Chat`。它也因此在
     * 一排 tab 里一眼可辨：tab 是下划线，它是一个带框的按钮。 */
    back.replaceChildren(
      element("span", { className: "button-label", text: "Chat" }),
    );
    back.setAttribute("aria-label", "Back to chat");
    back.dataset.tooltip = "Back to chat";
  }
  const kinds = visibleSurfaceKinds();
  const documentRef = surfaceDocumentRef();
  for (const module of surfacePaneModules()) {
    const tab = $(module.tabId),
      selected = state.surface.kind === module.kind;
    /* file 档在有文档 tab 的时候由那个 tab 承担：同一个面不画两个 tab。 */
    tab.hidden =
      !kinds.includes(module.kind) ||
      (module.kind === "file" && Boolean(documentRef));
    tab.setAttribute("aria-selected", String(selected && !tab.hidden));
    tab.tabIndex = selected && !tab.hidden ? 0 : -1;
    $(module.contentId).hidden = !(expanded && selected);
  }
  renderSurfaceTabActivity();
  renderDocumentTab(documentRef);
  /* WK-42 · the band names the whole rail while the cards are showing, and the
   * open kind once a pane is showing; the tab strip is the band's content then,
   * so the heading steps back to the accessible name only. */
  $("surface-tabs").hidden = !expanded;
  $("surface-title").textContent = expanded
    ? surfaceKindTitle(state.surface.kind)
    : "Work surface";
  renderSurfaceScope(expanded);
  renderSurfaceRail();
  if (
    modal &&
    (!wasModal || !document.activeElement?.getClientRects().length) &&
    !document.querySelector("dialog[open]") &&
    (!panel.contains(document.activeElement) ||
      !document.activeElement?.getClientRects().length)
  )
    (expanded && surfaceTabButton(state.surface.kind)
      ? surfaceTabButton(state.surface.kind).focus()
      : focusSurfaceRail());
}
function renderDocumentTab(ref) {
  const wrap = $("surface-document-tab"),
    select = $("surface-document-select"),
    close = $("surface-document-close");
  wrap.hidden = !ref;
  if (!ref) {
    // 文档 tab 不在时，file 面的可访问名回到类型 tab 上。
    $("file-content").setAttribute("aria-labelledby", "surface-file-tab");
    return;
  }
  const { name, full } = documentTabTitle(ref);
  const selected = state.surface.kind === "file";
  select.textContent = name;
  /* 截断只发生在看的那一层：完整名字仍在可访问名与 title 上（通行做法，EX-CC1 §4）。 */
  select.title = full;
  select.setAttribute("aria-label", full);
  select.setAttribute("aria-selected", String(selected));
  select.tabIndex = selected ? 0 : -1;
  select.dataset.documentKey = surfaceDocumentKey(ref);
  setAction(close, "x", `Close ${full}`);
  $("file-content").setAttribute("aria-labelledby", "surface-document-select");
}
/* M-2 · scope 位现在是工作面标题带上的一句陈述。只在 Work 会话上，只在这条带真的
 * 在屏幕上时（展开态）；BE-19 之前它仍然没有控件、仍然只有一个值。 */
function renderSurfaceScope(expanded) {
  const scope = $("surface-scope"),
    session = currentSession();
  const show = Boolean(expanded && session && sessionMode(session) === "work");
  scope.hidden = !show;
  scope.textContent = show ? MEMORY_SCOPE_OFF : "";
}
function surfaceKindTitle(kind) {
  if (kind === "run") return "Run details";
  if (kind === "preview")
    return state.surface.info?.extension?.title || "Workspace";
  return surfaceModule(kind)?.title || "Work surface";
}
/* WK-41 · the host's facts. Every module reads this object and nothing else;
 * none of them reaches into `state`. */
/* WK10b-1 registered item · the profile's slot declaration is read off the one
 * `/runtime-control` response the Runtime Workbench already fetched, through
 * that module's own summary. No second request, no second state machine, and
 * no wrapper around the client the host hands it. `known` stays false until the
 * Workbench has read once in this session, so an unread declaration is reported
 * as unread rather than as "this profile declares no slot" (FN-28). */
function slotDeclaration() {
  const summary = runtimeView?.summary();
  if (!summary?.loaded || summary.sessionId !== state.activeSessionId) return null;
  return {
    known: true,
    sessionId: summary.sessionId,
    revision: summary.revision,
    profileId: summary.profileId,
    /* The declaration carries the status the server gave it. An incompatible
     * composition still declares its slots; it just cannot be the reason
     * anything is mounted, and the missing ids are the explanation the
     * Workbench already prints (FN-20, FE-T05). */
    status: summary.status,
    missing: summary.missing,
    slots: summary.uiSlots,
  };
}

/* WK-43 / 45 · the host's own reading of the `work.surface` slot for this
 * session. Both the collapsed card and the expanded pane read this one
 * resolution, so a card and its pane can never disagree about whether a
 * renderer is mounted. */
function workSurfaceSlot() {
  return resolveSurfaceSlot("work.surface", {
    declaration: slotDeclaration(),
    extension: state.surface.info?.extension || null,
    binding: currentSession()?.extensionBinding || null,
    rendererUnavailable: Boolean(
      state.surface.context &&
      state.surface.rendererUnavailableContext === state.surface.context,
    ),
  });
}

function surfaceFacts() {
  return {
    sessionId: state.activeSessionId,
    sessionTitle: currentSession()?.title,
    runId: state.surface.runId,
    runs: state.runs,
    events: state.events,
    recordedContext: state.recordedContext.get(state.surface.runId) || null,
    fileRef: state.surface.fileRef,
    workspace: state.surface.workspace,
    extension: state.surface.info?.extension || null,
    /* WK-43 · the host's slot resolution travels with the facts, so the module
     * reads one answer instead of re-deriving mount conditions of its own. */
    slot: workSurfaceSlot(),
    projection: state.surface.projection,
    runtime: runtimeView?.summary() || null,
  };
}
/* The intents a module may reach for. All of them navigate or re-read; none of
 * them writes, which is why a module can never create formal state. */
const railHost = {
  sessionId: () => state.activeSessionId,
  container: (kind) => $(surfaceModule(kind).contentId),
  open: (kind) => activateSurface(kind),
  openFile: (ref) => openFile(ref),
  openRun: (id) => openRun(id),
  refreshRun: () => readRunDetails(),
  refreshWorkspace: () => void loadWorkspaceTree(),
  loadFile: (ref) => {
    if (ref) void fileView.load(ref);
  },
  loadRuntime: () => void runtimeView.load(),
  /* WK-66 / WK-90 · the coarse card opens the fine reading, which is now the
   * Runtime block of Settings › Developer. One entry, one controller, one
   * admission (FN-05); only the path changed. */
  openRuntimeSettings: () => openSettings("developer"),
  openMaterials: () => {
    $("material-add").open = true;
    openDialog("materials-dialog", "material-name");
    materialsView.open();
  },
};
function runSummarySnapshot() {
  if (state.view !== "session" || state.settings.open || !currentSession()) return null;
  const facts = surfaceFacts();
  const selected = facts.runs.find(run => run.id === facts.runId) || facts.runs.at(-1);
  return projectRunSummary({...facts, runId: selected?.id}, {generation: state.sessionEpoch});
}
const runSummaryCard = createRunSummaryCard({
  getSnapshot: runSummarySnapshot,
  onOpen: snapshot => railHost.openRun(snapshot.identity.runId),
  onOpenFile: ref => railHost.openFile(ref),
});
function renderSurfaceRail() {
  const rail = $("surface-rail");
  const visible = Boolean(
    state.surface.open && currentSession() && !state.surface.expanded,
  );
  rail.hidden = !visible;
  const summarySnapshot = runSummarySnapshot();
  runSummaryCard.update(summarySnapshot);
  if (!visible) return;
  const focusKey = document.activeElement?.dataset?.focusKey;
  const focusModule = document.activeElement?.closest("[data-module]")?.dataset?.module;
  const scroll = rail.scrollTop;
  const facts = surfaceFacts();
  /* WK-72 · below the width where a 740 column and a 360 card can stand side by
   * side, the same modules read as one glyph each; the icon carries the module
   * and its title is the accessible name (IC-1: a stable object, not a state). */
  if (state.surface.strip && !narrowQuery.matches) {
    const glyphs = surfaceModules
      .filter((module) => module.kind === "run" ? summarySnapshot : module.adapter(facts))
      .map((module) =>
        action(module.icon, module.title, () => {
          if (module.kind !== "run") return activateSurface(module.kind);
          const latest = runSummarySnapshot();
          if (latest && summarySnapshot && latest.generation === summarySnapshot.generation &&
              latest.identity.sessionId === summarySnapshot.identity.sessionId &&
              latest.identity.runId === summarySnapshot.identity.runId)
            openRun(latest.identity.runId);
        }, {
          attrs: {
            "data-module": module.kind,
            "data-focus-key": `strip:${module.kind}`,
          },
        }),
      );
    rail.replaceChildren(el("div", { className: "rail-strip" }, ...glyphs));
    if (focusKey && document.activeElement === document.body) {
      const key = focusKey.startsWith("strip:") ? focusKey : `strip:${focusModule === "run-summary" ? "run" : focusModule}`;
      rail.querySelector(`[data-focus-key="${CSS.escape(key)}"]`)?.focus();
    }
    return;
  }
  const cards = [];
  for (const module of surfaceModules) {
    if (module.kind === "run") {
      if (!runSummaryCard.element.hidden) cards.push(runSummaryCard.element);
      continue;
    }
    const schema = module.adapter(facts);
    /* WK-45 / WK-47 · a module with no facts is absent, not empty. */
    if (schema) cards.push(module.card(schema, railHost));
  }
  rail.replaceChildren(...cards);
  rail.scrollTop = scroll;
  if (focusKey && document.activeElement === document.body) {
    const direct = rail.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`);
    const fromStrip = focusKey === "strip:run" ? runSummaryCard.element.querySelector("summary") :
      focusKey.startsWith("strip:") ? rail.querySelector(`[data-module="${CSS.escape(focusKey.slice(6))}"] button`) : null;
    (direct || fromStrip)?.focus();
  }
}
/* Panes that draw from facts repaint whenever the facts move; panes that own a
 * fetch or a renderer instance are entered once, on activation. */
function renderSurfacePanes() {
  if (!state.surface.open || !state.surface.expanded) return;
  const module = surfaceModule(state.surface.kind);
  if (!module?.repaint) return;
  module.pane(module.adapter(surfaceFacts()), railHost);
}
function loadSurfaceKind(kind) {
  const module = surfaceModule(kind);
  if (!module?.pane) return;
  if (kind === "preview") {
    void loadSurface(state.sessionEpoch);
    return;
  }
  module.pane(module.adapter(surfaceFacts()), railHost);
  if (kind === "run") void readRunDetails();
}
/* The rail's own reads: the two facts a card states that no other view has
 * already fetched. Both are guarded by the same generation counters the panes
 * use, so a session switch discards them. */
function loadRailFacts() {
  if (!state.surface.info?.extension) void loadWorkspaceTree();
  void runtimeView?.load();
}
function activateSurface(kind) {
  if (!currentSession() || !surfaceModule(kind)?.tabId) return;
  if (!state.surface.expanded) state.surface.returnFocus = document.activeElement;
  state.navigationOpen = false;
  state.surface.kind = kind;
  state.surface.open = true;
  state.surface.expanded = true;
  state.surface.runReadController?.abort();
  state.surface.runReadGeneration++;
  fileView?.pause();
  renderSurfaceVisibility();
  writeUiState();
  surfaceTabButton(kind)?.focus();
  loadRailFacts();
  loadSurfaceKind(kind);
}
function openRun(runId) {
  state.surface.runId = runId;
  activateSurface("run");
}
function openFile(ref) {
  if (ref.sessionId !== state.activeSessionId) return;
  /* 关闭这份文档时焦点要回到**打开它的那个控件**，所以在这里记下来。沿用既有的
     `returnFocus` 字段，不新增状态。 */
  const opener = document.activeElement;
  if (opener && opener !== document.body && opener.isConnected)
    state.surface.returnFocus = opener;
  state.surface.fileRef = ref;
  activateSurface("file");
}
/* The rail and its open pane are one render: a run that moves changes the Run
 * card and the Run pane at the same moment, from the same facts. */
function renderInspector() {
  renderSurfaceRail();
  renderSurfacePanes();
  renderSurfaceTabActivity();
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
/* WK-41 · one read, two states. The tree lands in host state; the module turns
 * it into a card or a pane. Nothing re-reads it when the rail collapses. */
async function loadWorkspaceTree() {
  const sessionId = state.activeSessionId,
    own = ++state.surface.workspaceGeneration;
  if (!sessionId || state.surface.info?.extension) return;
  state.surface.workspace = null;
  renderInspector();
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
    state.surface.workspace = { files: result.tree || [] };
  } catch (error) {
    if (
      own !== state.surface.workspaceGeneration ||
      sessionId !== state.activeSessionId
    )
      return;
    state.surface.workspace = { error: error.message };
  }
  renderInspector();
}

function renderProjectionValue(value) {
  return typeof value === "string" ? value : safeText(value);
}

let fileManifestController = null;
function renderSurfaceFallback() {
  fileManifestController?.abort();
  fileManifestController = new AbortController();
  const manifestSignal = fileManifestController.signal;
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
          text: "Choose a chat to load its local renderer slot.",
        }),
      ),
    );
    return;
  }
  const binding = currentSession().extensionBinding;
  if (!info?.extension && binding?.extensionId) {
    /* Three conditions that used to read as one. Still reading is not the same
     * as read and empty, and neither is the same as a producer this host has no
     * record of; only the first of the three is going to change on its own
     * (FN-28). None of them shows a control. */
    const loading = Boolean(state.surface.fetchController);
    const read = Boolean(info);
    content.append(
      element(
        "div",
        { className: "empty-state compact" },
        element("h3", {
          text: loading
            ? "Loading work surface"
            : read
              ? "Extension not installed"
              : "Work surface not read yet",
        }),
        element("p", {
          text: loading
            ? `Reading the work surface of ${binding.extensionId}.`
            : read
              ? `This session is bound to ${binding.extensionId}. This host has no record of it, so its work state cannot be read here.`
              : `This session is bound to ${binding.extensionId}. Its work surface has not been read in this session.`,
        }),
      ),
    );
    return;
  }
  if (!info?.extension) {
    const module = surfaceModule("preview");
    if (state.surface.workspace)
      module.pane(module.adapter(surfaceFacts()), railHost);
    else void loadWorkspaceTree();
    return;
  }
  /* WK10b 第一段 item 5 / FN-24 · the top row of an unmounted contributed
   * surface states three facts and offers nothing: which extension the session
   * is bound to, what state that extension is in, and which version of the work
   * state this reading is. The rulings' word for it is «producer»; the visible
   * word is «extension», which is what the rest of the product already calls
   * this object (copy-convention §3 forbids a second name for one thing).
   * Producer absence, renderer absence and an unloaded record stay three lines,
   * because they lead to three different next steps (FN-28). */
  const card = element("div", { className: "surface-card" });
  const slot = workSurfaceSlot();
  const projection = state.surface.projection;
  const stateVersion =
    typeof projection?.stateVersion === "string"
      ? projection.stateVersion.slice(0, 12)
      : null;
  card.append(
    flowRow("div", {
      glyph: "plug",
      title:
        info.extension.title || info.extension.id || "Extension workspace",
      meta: info.extension.status || "unknown",
      className: "surface-state-row",
    }),
  );
  const facts = [`generation ${info.extension.generation ?? "?"}`];
  if (stateVersion) facts.push(`state ${stateVersion}`);
  /* Compatibility is stated only when it is not `supported`: the ordinary case
   * adds no judgement, and the word that matters is the one that says this
   * reading cannot be acted on (FN-24, WK-47). The server's enum is spelled as
   * words, not re-interpreted. */
  if (
    typeof projection?.compatibility === "string" &&
    projection.compatibility !== "supported"
  )
    facts.push(projection.compatibility.replaceAll("_", " "));
  card.append(element("p", { className: "surface-note", text: facts.join(" · ") }));
  /* The slot line is added only where it says something the row above does not.
   * For an unloaded or invalidated producer the row already carries the name and
   * the state word, so repeating «Evidence Memo · unloaded» underneath is a
   * second copy of one fact (WK-47 ablation S-9). A loaded producer that
   * contributes no renderer is the case the line exists for. */
  const statusLine =
    slot?.reason === "renderer-absent" ? slotStatusLine(slot) : null;
  if (statusLine)
    card.append(element("p", { className: "surface-note", text: statusLine }));
  const rendererAbsent = slot?.reason === "renderer-absent";
  if (projection === null || projection === undefined) {
    /* A bound session whose producer returned no projection is not an empty
     * Matter. The host says the reading is missing and stops there: it does not
     * fill in a Decision, an Evidence set or an accepted Artifact
     * (boundaries §4, WK-45 (3)). */
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
    /* FN-18 / FN-21 ablation · the generic fallback no longer offers a «Run
     * action» button. A button with no object, no scope and no payload is
     * exactly the unscoped approval FN-18 forbids, and a universal dispatch
     * over whatever string the projection names is what FN-21 forbids. The
     * declared actions stay visible as text, because knowing what the producer
     * would offer is a fact; performing them belongs to its own renderer, whose
     * absence is why this fallback is on screen at all. */
    const block0 = element("section", { className: "surface-block" });
    block0.append(
      element("h4", { text: "Declared actions" }),
      actions.length
        ? element(
            "ul",
            { className: "action-list" },
            ...actions.map((item) =>
              element("li", {
                className: "action-label",
                text: item.label || item.action || "Action",
              }),
            ),
          )
        : element("p", {
            className: "surface-note",
            text: "No action is declared on this reading.",
          }),
    );
    /* WO-WK10b 第二段 ablation · this sentence is the reason there is no
     * button, and it is only true in one of the branches. An unloaded producer
     * has no action because it is unloaded — the state word above says so — and
     * telling that reader it needs a renderer names the wrong condition
     * (FN-28, copy-convention §1). It stays where it is the reason. */
    if (rendererAbsent)
      block0.append(
        element("p", {
          className: "surface-note",
          text: "Read-only. An action needs the extension's own renderer.",
        }),
      );
    card.append(block0);
    /* WO-WK10b 第二段 item 6 · a producer that is gone does not take its work
     * with it. When the packet carries a per-rule review the host reads it with
     * the same component the producer's own renderer uses, minus every control:
     * the rules, their status words, the anchors, the decisions and the
     * accepted version stay legible, and no action is offered (FN-24's
     * «producer 缺席，独立 reader 可用» row, frontend-entries 3.3). */
    const packet = workPacket(projection);
    const sessionId = state.activeSessionId;
    const epoch = state.sessionEpoch;
    const subjects = coreFileSubjects(projection, sessionId);
    if (subjects.length) {
      const files = element("section", {className:"surface-block"}, element("h4", {text:"Recorded files"}));
      for (const subject of subjects) {
        const group = element("div", {className:"surface-block"});
        const button = element("button", {className:"secondary-button", attrs:{type:"button"}, text: subject.artifactId ? "Read accepted artifact files" : `Read candidate ${subject.candidateId} files`});
        button.addEventListener("click", async () => {
          button.disabled = true;
          const live = () => !manifestSignal.aborted && epoch === state.sessionEpoch && sessionId === state.activeSessionId && group.isConnected;
          try {
            const entries = await readCoreManifest(subject, {signal:manifestSignal, query:(input,signal)=>request(`/sessions/${encodeURIComponent(sessionId)}/work-query?${new URLSearchParams(input)}`,{signal})});
            if (!live()) return;
            group.replaceChildren(element("p",{className:"form-help",text:subject.artifactId ? "Accepted artifact files" : `Candidate ${subject.candidateId}`}));
            for (const file of entries) {
              const open = element("button", {className:"secondary-button",attrs:{type:"button"},text:file.path});
              open.addEventListener("click",()=>{if(live()) openFile(file);});
              group.append(open);
            }
          } catch (error) {
            if (!live()) return;
            group.replaceChildren(button,element("p",{className:"form-help",text:error.message}));
            button.disabled = false;
          }
        });
        group.append(button); files.append(group);
      }
      card.append(files);
    }
    if (packet?.hasCandidates)
      card.append(
        renderWorkPacket(packet, {
          /* The identity line above already carries the work state. */
          stateVersionShown: Boolean(stateVersion),
          expanded: state.surfaceRuleOpen,
          onToggle(candidateId, ruleId, open) {
            const memory = `${candidateId}|${ruleId}`;
            if (open) state.surfaceRuleOpen.add(memory);
            else state.surfaceRuleOpen.delete(memory);
          },
          onReadSource: (input) => readHistoricalSource(sessionId, epoch, input),
        }),
      );
    const block = element(packet?.hasCandidates ? "details" : "section", {
      className: "surface-block",
    });
    /* The whole packet stays available underneath, unchanged. The structured
     * reading above is a reading; this is the bytes it was read from, and a
     * field the reading does not show is still here (WK-47 ablation S-8). */
    if (packet?.hasCandidates)
      block.append(flowRow("summary", { glyph: "folder", title: "Recorded fields" }));
    else block.append(element("h4", { text: "Read-only projection" }));
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

/* WO-WK10b 第二段 · the read-only work queries a contributed renderer may
 * raise, and the only ones. The contribution names a kind from this closed
 * table and hands over fixed parameters; it never names a path, a method or a
 * host, so this is not the universal dispatch FN-21 forbids. Both routes are
 * GETs that work without a loaded producer, which is why historical bytes stay
 * readable after the extension is unloaded (contract «Queries»).
 *
 * `source` reads the bytes of the revision that candidate was frozen against.
 * A quote of an old candidate is therefore never re-read from the Matter's
 * current sources, and never silently updated by a source replacement. */
const SURFACE_QUERIES = Object.freeze({
  source: (input) => ({
    kind: "source",
    candidateId: String(input.candidateId ?? ""),
    sourceId: String(input.sourceId ?? ""),
    version: String(input.version ?? ""),
  }),
  request: (input) => ({
    kind: "request",
    requestId: String(input.requestId ?? ""),
  }),
});

/* The same GET the contributed renderer reaches through `surfaceQuery`, for the
 * read-only fallback, which has no renderer context to guard on. It is bound to
 * the session and the epoch that drew the row, so a late answer to an old
 * session cannot land in a new one (FN-24). */
async function readHistoricalSource(sessionId, epoch, input) {
  if (!sessionId || epoch !== state.sessionEpoch || state.activeSessionId !== sessionId)
    throw new Error("This work surface is no longer active.");
  const params = new URLSearchParams(SURFACE_QUERIES.source(input || {}));
  const answer = await request(
    `/sessions/${encodeURIComponent(sessionId)}/work-query?${params}`,
  );
  if (epoch !== state.sessionEpoch || state.activeSessionId !== sessionId)
    throw new Error("The chat changed before the read completed.");
  return answer?.source ?? null;
}

async function surfaceQuery(kind, input, context = state.surface.context) {
  const build = Object.hasOwn(SURFACE_QUERIES, kind) ? SURFACE_QUERIES[kind] : null;
  if (!build) throw new Error("This work query is not available.");
  if (!guardForSurface(context))
    throw new Error("This work surface is no longer active.");
  const { sessionId } = context;
  const params = new URLSearchParams(build(input || {}));
  const answer = await request(
    `/sessions/${encodeURIComponent(sessionId)}/work-query?${params}`,
    { signal: state.surface.controller?.signal },
  );
  if (!guardForSurface(context))
    throw new Error("The work surface changed before the read completed.");
  return kind === "source" ? (answer?.source ?? null) : (answer?.result ?? null);
}

/* The receipt half of a decision. `projection.decisions[]` says what this host
 * recorded; the request query says whether the server committed it. A decision
 * whose receipt cannot be read keeps no row at all — an unread receipt is not
 * a failure and not a success (FN-28). */
async function loadWorkReceipts(epoch, projection) {
  const sessionId = state.activeSessionId;
  if (!sessionId || epoch !== state.sessionEpoch) return;
  if (state.work.sessionId !== sessionId)
    state.work = { sessionId, decisions: [], receipts: new Map(), matterId: null, stateVersion: null };
  const decisions = Array.isArray(projection?.decisions) ? projection.decisions : [];
  state.work.decisions = decisions;
  /* The work state this reading of the decisions came from. It is carried with
   * them so the conversation row can name the version it is reporting even
   * when the work surface panel was never opened. */
  state.work.matterId = projection?.matter?.id ?? null;
  state.work.stateVersion =
    typeof projection?.stateVersion === "string" ? projection.stateVersion : null;
  let changed = false;
  for (const decision of decisions) {
    const id = decision?.request_id;
    if (typeof id !== "string" || !id || state.work.receipts.has(id)) continue;
    try {
      const answer = await request(
        `/sessions/${encodeURIComponent(sessionId)}/work-query?kind=request&requestId=${encodeURIComponent(id)}`,
      );
      if (epoch !== state.sessionEpoch || state.activeSessionId !== sessionId) return;
      state.work.receipts.set(id, answer?.result ?? null);
      changed = true;
    } catch {
      /* An unread receipt stays unread; no row is drawn from a guess. */
    }
  }
  if (changed && state.activeSessionId === sessionId && epoch === state.sessionEpoch)
    renderMessageStream();
}

/* Read the bound work of the current session once, so the Chat Flow receipt
 * does not depend on whether the work surface panel happens to be open. The
 * work surface's own reads stay where they are; this one is not repeated by
 * collapsing or expanding anything (FN-23). */
async function loadWorkThread(epoch) {
  const session = currentSession();
  if (!session?.extensionBinding || epoch !== state.sessionEpoch) return;
  try {
    const result = await request(
      `/sessions/${encodeURIComponent(session.id)}/surface`,
    );
    if (epoch !== state.sessionEpoch || state.activeSessionId !== session.id) return;
    await loadWorkReceipts(epoch, result?.projection);
  } catch {
    /* The conversation stays readable without its work receipts. */
  }
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
  let result;
  try {
    result = await request(`/sessions/${encodeURIComponent(sessionId)}/actions`, {
      method: "POST",
      body: { extensionId, generation, action, payload },
      signal: rendererController?.signal,
    });
  } catch (error) {
    /* WO-WK10b 第二段 · a refused mutation is refused against a state this
     * reading no longer knows: Core's 409s (VERSION_CONFLICT, STALE_INPUT,
     * IDEMPOTENCY_CONFLICT, CANDIDATE_CLOSED) and the host's admission refusals
     * (generation_mismatch, active_run, binding_mismatch) all mean the same
     * next step — read the authoritative state again. The contribution keeps
     * its draft and receives the error, so it can say what was refused; the
     * host never replays the command (FN-19). */
    if (error?.name !== "AbortError" && Number.isFinite(error?.status) && error.status < 500)
      await loadSurface(context.epoch);
    throw error;
  }
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
  /* A committed decision changes what the conversation shows, so the receipt
   * half is re-read from the same authority that just answered. */
  await loadWorkReceipts(context.epoch, state.surface.projection);
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
    void loadWorkReceipts(epoch, result.projection);
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
    /* FN-20 / WK-43 · one mount rule, and the collapsed card reads the same
     * one: the host mounts only when its own slot resolution says a loaded
     * producer contributes a renderer module inside the local allowlist. A
     * profile's `uiSlots` declaration alone never mounts anything, and a
     * declared slot with no loaded renderer leaves the read-only fallback that
     * `renderSurfaceFallback` has already painted above. */
    const slot = resolveSurfaceSlot("work.surface", {
      declaration: slotDeclaration(),
      extension,
      binding: currentSession()?.extensionBinding || null,
    });
    const modulePath = slot?.mount ? nextIdentity?.modulePath || null : null;
    if (!modulePath) return;
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
      /* FN-20 · the contribution's only read channel, and a closed one. It
       * cannot reach a route this table does not name (FN-21), and it stops
       * working the moment this mount's context is no longer current. */
      query: (kind, input) => surfaceQuery(kind, input, context),
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
    state.surface.rendererUnavailableContext = null;
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
      state.surface.rendererUnavailableContext = state.surface.context;
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
    ? "Starting your chat…"
    : state.homeStart?.error || (state.homeStart?.session
      ? "Your chat is ready. Send to continue in it."
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
        throw new Error("Creating the chat returned no matching receipt.");
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
      operation.error = "The chat was created; your instruction is saved there and has not been sent. Return Home to continue.";
      renderProjectList();
      return;
    }
    state.activeProjectId = operation.projectId;
    state.openProjectIds.add(operation.projectId);
    await selectSession(session.id, { focus: false });
    if (state.navigationEpoch !== ticket.navEpoch + 1 || currentSession()?.id !== session.id) {
      operation.error = "The chat was created; your instruction has not been sent. Return Home to continue.";
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
      ? "Creating the chat is unconfirmed. Refresh and check recent chats before trying again. Your instruction is kept."
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
      measurements: renderRequestMeasurements(state.events, (currentRun() || state.runs.at(-1))?.id, {compact:true}),
      onChooseModel: () => { popover.hidePopover(); void modelPicker.open(); },
      onChangeConnection: () => {
        popover.hidePopover();
        openSettings("models");
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
          showToast(`File access: ${permissionLabels[mode]}.`);
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
    onPermissions: go(() => openSettings("permissions")),
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
    ? homeSets.reduce(
        (total, key) => total + (summary[key]?.items?.length || 0),
        0,
      )
    : 0;
  $("app-shell").classList.toggle("home-empty", !rows && !state.home.error);
  const load = { loading: state.home.loading, error: state.home.error };
  /* WK-32 · the top band is Home's first band; a session has no cross-session
   * totals to state, so the band is absent rather than present-and-empty. The
   * `hidden` flag itself is set with the rest of the band order in renderChat. */
  const band = $("home-top-band");
  if (state.view === "home")
    renderHomeBand(band, {
      summary,
      load,
      activeSet: state.home.filter,
      onFilter: (key) => {
        state.home.filter = key;
        renderHomeState();
        /* FN-05 · the tile and the row reach the same list; pressing a tile
         * leaves the focus on the tile that now states the filter. */
      },
    });
  if (state.view === "home" && homeLayoutPreference() === "modules")
    renderHomeModuleBand($("home-module-band"), {
      activity: state.homeActivity,
      attention: state.homeAttention,
      projects: state.projects,
      onOpenAttentionWorkspace: () => openAttentionWorkspace(state.homeAttention.projectId, state.homeAttention.selectedId),
      onOpenUsage: () => usageView.open(),
      onActivityDays: (days) => { state.homeActivity.days = days; void loadHomeActivity(); },
      onActivityRetry: () => loadHomeActivity(),
      onAttentionProject: (projectId) => loadHomeAttention(projectId),
      onAttentionRetry: () => loadHomeAttention(state.homeAttention.projectId),
      onAttentionPage: (offset) => loadHomeAttention(state.homeAttention.projectId, offset),
      onAttentionOpen: (id) => openHomeAttention(id),
      onAttentionBack: () => {
        const id = state.homeAttention.selectedId;
        state.homeAttention.detailGeneration++;
        state.homeAttention.selectedId = null;
        state.homeAttention.detail = null;
        renderHomeState();
        $("home-module-band").querySelector(`[data-focus-key="attention-item-${CSS.escape(id)}"]`)?.focus();
      },
      collapsed: homeModuleBandCollapsed(),
      onCollapse: (collapsed) => {
        settingsPage?.setHomeModuleBand(collapsed ? "collapsed" : "expanded");
        renderHomeState();
        $("home-module-band")
          .querySelector('[data-focus-key="home-module-collapse"]')
          ?.focus();
      },
      onManageConnections: () => openSettings("models"),
    });
  renderHome($("message-stream"), {
    summary: state.home.data,
    error: state.home.error,
    loading: state.home.loading,
    projects: state.projects,
    activeSet: state.home.filter,
    onRetry: () => loadHome(),
    onMore: (key, offset) => loadHome(key, offset),
    onFilter: (key) => {
      state.home.filter = key;
      renderHomeState();
    },
    onSession: async (item, { inspect }) => {
      await selectProject(item.projectId, { sessionId: item.sessionId });
      if (state.activeSessionId === item.sessionId && inspect)
        openRun(item.runId);
    },
  });
}
// Independent reads: a failed Activity request must not clear Attention or
// pending questions. New scope/period clears old records before rendering.
async function loadHomeActivity() {
  const target = state.homeActivity;
  const own = ++target.generation;
  const days = target.days;
  if (target.data?.interval?.days !== days) target.data = null;
  target.loading = true; target.error = null;
  if (state.view === "home") renderHomeState();
  try {
    const data = await request(`/work-activity?days=${days}`);
    if (!toHomeActivity(data, days)) throw new Error("Unsupported activity records.");
    if (own === target.generation) target.data = data;
  } catch (error) {
    if (own === target.generation) target.error = error.message;
  } finally {
    if (own === target.generation) {
      target.loading = false;
      if (state.view === "home") renderHomeState();
    }
  }
}
async function loadHomeAttention(projectId = state.homeAttention.projectId || homeProjectId(), offset = 0) {
  const target = state.homeAttention;
  const own = ++target.generation;
  target.detailGeneration++;
  target.selectedId = null; target.detail = null; target.detailError = null; target.detailLoading = false;
  if (target.projectId !== projectId || target.data?.offset !== offset) target.data = null;
  target.preview = null; target.previewError = null;
  target.projectId = projectId;
  target.loading = Boolean(projectId); target.error = null;
  if (state.view === "home") renderHomeState();
  if (!projectId) return;
  try {
    const data = await request("/attention/query", { method: "POST", body: { projectId, query: { schema_version: 1, kind: "registry", limit: 2, offset } } });
    if (own !== target.generation) return;
    const page = toHomeAttention(data);
    if (!page) throw new Error("Unsupported attention records.");
    target.data = data;
    target.loadedAt = new Date().toISOString(); // time this browser received the registry, not a service observation
    if (page.items[0]) {
      try {
        const first = await request(`/attention/${encodeURIComponent(page.items[0].id)}?${new URLSearchParams({ projectId })}`);
        if (own === target.generation && toHomeAttentionDetail(first) && first.attention_id === page.items[0].id && first.revision === page.items[0].revision) target.preview = first;
      } catch (error) {
        if (own === target.generation) target.previewError = error.message;
      }
    }
  } catch (error) {
    if (own === target.generation) target.error = error.message;
  } finally {
    if (own === target.generation) {
      target.loading = false;
      if (state.view === "home") renderHomeState();
    }
  }
}
async function openHomeAttention(id) {
  const target = state.homeAttention;
  const own = ++target.detailGeneration;
  const projectId = target.projectId;
  target.selectedId = id; target.detail = null; target.detailError = null; target.detailLoading = true;
  renderHomeState();
  $("home-module-band").querySelector('[data-focus-key="attention-back"]')?.focus();
  try {
    const data = await request(`/attention/${encodeURIComponent(id)}?${new URLSearchParams({ projectId })}`);
    if (!toHomeAttentionDetail(data) || data.attention_id !== id) throw new Error("Unsupported attention item.");
    if (own === target.detailGeneration && projectId === target.projectId) target.detail = data;
  } catch (error) {
    if (own === target.detailGeneration) target.detailError = error.message;
  } finally {
    if (own === target.detailGeneration) {
      target.detailLoading = false;
      if (state.view === "home") renderHomeState();
    }
  }
}
function loadHomeModules() {
  if (homeLayoutPreference() !== "modules") return;
  void loadHomeActivity();
  void loadHomeAttention();
}
async function loadHome(key = null, offset = 0) {
  if (!key) loadHomeModules();
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
async function openAttentionWorkspace(projectId = state.homeAttention.projectId || homeProjectId(), attentionId = null) {
  const own = ++state.navigationEpoch;
  await persistCurrentDraft();
  if (own !== state.navigationEpoch) return;
  closeSettings({ restoreFocus: false });
  state.attentionOpen = true;
  closeNavigation({ restoreFocus: false });
  renderAll();
  void attentionWorkspace.open({ projects: state.projects, projectId, attentionId });
  $("attention-workspace").querySelector('[data-attention-focus="project"]')?.focus();
}
async function goHome() {
  state.attentionOpen = false;
  attentionWorkspace?.deactivate();
  closeSettings({ restoreFocus: false });
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
    payload = row.payload,
    binding = state.events.find((event) => event.runId === row.runId && normalizedType(event.type) === "runtime/bound")?.data,
    display = permissionPresentation(payload, binding);
  if (!canAnswer(row, run) && validPermission(payload)) {
    const keyOpen = `permission-history:${key}`;
    const details = element("details", {
      className: "resolved-permission",
    });
    details.open = state.toolOpen.get(keyOpen) || false;
    /* The decided request keeps every fact it had — which kind of call, what it
     * named, and how it was decided — in the one row anatomy: the object it
     * named is the title, and the decision is the metadata word. The exact-call
     * facts stay inside, unchanged (copy-convention, Astra addendum). */
    details.append(
      flowRow(
        "summary",
        {
          glyph: display.glyph,
          title: display.target,
          meta: `${display.label} ${row.decision === "allow" ? "approved" : row.decision === "deny" ? "denied" : "closed"}`,
          attrs: { "data-focus-key": `${key}:${row.decision || "allow"}` },
        },
      ),
      element("p", {
        className: "intervention-scope",
        text:
          row.decision === "allow"
            ? `Approval recorded for this exact ${display.noun}. Review acceptance is not recorded here.`
            : row.decision === "deny"
              ? `Approval denied for this exact ${display.noun}.`
              : "This request closed without a recorded decision.",
      }),
      element("pre", {
        className: "permission-preview",
        text: payload.preview,
      }),
    );
    if (display.source) details.append(element("p", { className: "form-help", text: `Recorded source: ${display.source}` }));
    details.addEventListener("toggle", () =>
      state.toolOpen.set(keyOpen, details.open),
    );
    return details;
  }
  const card = element("article", {
    className: "question-card permission-card",
    attrs: { tabindex: "-1", "data-nav-item": "" },
  });
  card.append(
    element("h3", { text: display.title }),
    element("p", {
      className: "file-name",
      text: display.target,
    }),
  );
  if (display.source) card.append(element("p", { className: "form-help", text: `Recorded source: ${display.source}` }));
  if (validPermission(payload)) {
    card.append(
      element("p", {
        className: "form-help",
        text: `${formatBytes(payload.bytes)} · Approval for this exact ${display.noun} only`,
      }),
      element("pre", {
        className: "permission-preview",
        text: payload.preview,
      }),
    );
    const details = element(
      "details",
      {},
      element("summary", { text: display.details }),
      element("code", { text: payload.contentSha256 }),
      copyAction(payload.contentSha256, display.hashLabel),
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
          ? `${display.label} ${row.decision === "allow" ? "approved" : "denied"}.`
          : row.questionStatus === "pending"
            ? "This request is no longer available."
            : "Request resolved.",
      }),
    );
  else {
    const actions = element("div", { className: "question-actions" });
    /* WK-89 / FN-18 · 动作对象化命名，不用无范围的 Approve：可见文字说清楚
       被批准的是哪一次动作。后端的 decision 取值不变。 */
    for (const [decision, label] of [
      ["deny", `Deny this ${display.noun}`],
      ["allow", `Approve this ${display.noun}`],
    ]) {
      /* FE-04 · review-projection §6 «pending → submitting：按钮禁用、文字
       * "Sending…"、不换图标» 此前只落实了半条：两个按钮被 `aria-disabled`
       * 关掉，但可见文字仍然是 Approve / Deny，屏幕上没有任何东西说这一次决定
       * 已经送出而尚未回执。在途的是**哪一个**决定也是事实的一部分，所以在途
       * 记号带上 decision：按下的那个换词，另一个只是关掉，读屏与目视都能看出
       * 送出的是 Approve 还是 Deny（FN-19：不乐观晋升，也不隐瞒已送出）。 */
      const inFlight = state.questionSubmitting.has(`${key}:${decision}`);
      const button = element("button", {
        className: decision === "allow" ? "primary-button" : "secondary-button",
        attrs: { type: "button", "data-focus-key": `${key}:${decision}` },
      });
      setRequestLabel(button, label, inFlight);
      button.setAttribute("aria-disabled", String(pending));
      button.addEventListener("click", async () => {
        if (
          state.questionSubmitting.has(key) ||
          state.questionSubmitted.has(key)
        )
          return;
        const epoch = state.sessionEpoch;
        state.questionSubmitting.add(key);
        state.questionSubmitting.add(`${key}:${decision}`);
        /* 重试之前先撤掉上一次的失败：一条 role="alert" 与一个 "Sending…"
         * 同时在场会把「刚刚失败了」读成「这一次失败了」（FN-28 stale 可辨）。
         * 问题卡一直是这样做的，授权卡此前不是。 */
        state.questionErrors.delete(key);
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
          state.questionSubmitting.delete(`${key}:${decision}`);
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

/* WK-78 (1) · Settings 页的开合。它不是一个 view：会话、活动 Run 与草稿都不动，
 * 只是主区暂时显示这一页。hash 是可深链的那一面，state.settings.open 是唯一的真值，
 * 两者由 syncSettingsHash 单向对齐，避免 hashchange 与状态互相回声。 */
function settingsHash(section) {
  return `#settings/${section}`;
}
function readSettingsHash() {
  const match = /^#settings(?:\/([a-z-]+))?$/.exec(location.hash);
  if (!match) return null;
  return isSettingsSection(match[1]) ? match[1] : DEFAULT_SECTION;
}
/* `read: false` puts the page on screen without issuing its two authoritative
 * reads. It exists for one caller: the deep link at start-up, which lands here
 * before `/bootstrap` has returned the session token (WK-98 (4)). Reading then
 * would spend a 401 and a retry on every `#settings/<section>` entry, so the
 * frame is painted first and `refreshSettingsReads()` runs once the token is
 * held. Every other caller reads, because by then the token exists. */
function openSettings(section = state.settings.section, { trigger, hash = true, read = true } = {}) {
  const target = isSettingsSection(section) ? section : DEFAULT_SECTION;
  if (!state.settings.open) state.settings.returnFocus = trigger ?? document.activeElement;
  state.settings.open = true;
  state.settings.section = target;
  /* 悬浮的工作面锚在主区右侧，会盖住这一页；这一页替换的正是主区的内容，所以进设置
   * 就收起工作面，而不是让两层叠在一起（FN-27：焦点不被悬浮层遮住）。 */
  if (state.surface.open) closeSurface({ restoreFocus: false });
  /* WK-116 · 侧栏在这一页上不渲染，所以抽屉不能停在「开着」的状态里：那样 Escape
   * 的第一步会指向一个不存在的层。两步序本身不变（抽屉 / 工作面 → 这一页）。 */
  if (state.navigationOpen) closeNavigation({ restoreFocus: false });
  settingsPage.select(target);
  if (hash && location.hash !== settingsHash(target)) location.hash = settingsHash(target);
  renderChatHeader();
  /* 进这一页，焦点落在 Back：出去的路和 Escape 指的是同一件事，一开始就摆在手边。 */
  if (!$("settings-page").contains(document.activeElement)) $("settings-back-button").focus();
  if (read) refreshSettingsReads();
}
/* The Workbench reads for the Runtime group and for the rail card alike, so it
 * loads with the page rather than with one of its blocks. */
function refreshSettingsReads() {
  void settingsView.refresh();
  void runtimeView?.load();
}
function closeSettings({ restoreFocus = true, hash = true } = {}) {
  if (!state.settings.open) return;
  const trigger = state.settings.returnFocus;
  state.settings.open = false;
  state.settings.returnFocus = null;
  settingsPage.resetSearch();
  settingsView.close();
  if (hash && readSettingsHash() !== null) location.hash = "";
  renderChatHeader();
  if (restoreFocus) {
    // A deep link has no focusable opener; Home hides the shared page title.
    const fallback = state.view === "home" && !state.attentionOpen ? $("composer-input") : $("session-title");
    restoreLayerFocus(trigger === document.body ? null : trigger, fallback);
  }
}
function syncSettingsFromHash({ read = true } = {}) {
  const section = readSettingsHash();
  if (section === null) {
    if (state.settings.open) closeSettings({ hash: false });
    return;
  }
  if (state.settings.open && state.settings.section === section) return;
  openSettings(section, { hash: false, read });
}

/* WK-4 / review-projection §6 · one list keyboard for both inboxes: Home's lower
 * band and the pending cards inside a session. `j` / `k` / ArrowDown / ArrowUp
 * move the focus, `Enter` / `o` open the focused item.
 *
 * What is deliberately absent: `a` / `e` / `d` / `x` and any batch key. SE has
 * no risk or reversibility field and no batch decision, so a one-key Allow would
 * be an authorisation granted without the payload being read (§6, FN-18).
 * Opening a pending card therefore moves the focus into it — the same place a
 * click lands — and never presses Allow or Deny for the person (FN-05).
 *
 * The handler yields to text entry: it never fires while the caret is in an
 * input, a textarea, a select or contenteditable, and never during IME
 * composition. Arrow keys are only taken when a list item already holds the
 * focus, so ordinary scrolling is untouched. */
/* WK-115 ② · `Home` / `End` 跳到这条列表的第一项与最后一项。它们和方向键同一档：
 * 只有焦点已经在列表里才接管，否则整页的 Home / End 滚动会被一个看不见的列表夺走。 */
const LIST_KEYS = new Set([
  "j",
  "k",
  "o",
  "ArrowDown",
  "ArrowUp",
  "Enter",
  "Home",
  "End",
]);
const TEXT_ENTRY =
  "input, textarea, select, [contenteditable=''], [contenteditable='true']";
function openListItem(item) {
  const target = item.matches("button")
    ? item
    : item.querySelector("[data-nav-open]");
  if (target) {
    target.click();
    return;
  }
  item
    .querySelector(
      "button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex='0']",
    )
    ?.focus();
}
/* WO-WK11 · `/` opens the finder for the Runtime group. It is a navigation key
 * and nothing else: it focuses the search this page already has, and the only
 * thing Enter does there is open one readable resource. It never fires while
 * someone is typing — a text entry, a contenteditable, an IME composition or a
 * modifier combination all keep the slash as a character (FN-27, FE-T10). */
function handleRuntimeFinderKey(event) {
  if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
  if (event.key !== "/") return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  /* WK-90 · runtime resources are spread over four groups now, so the finder is
   * bound to the Settings page rather than to one group of it. */
  if (!state.settings.open) return;
  const active = document.activeElement;
  if (active?.closest(TEXT_ENTRY) || active?.isContentEditable) return;
  if (document.querySelector("dialog[open]")) return;
  event.preventDefault();
  settingsPage.focusSearch();
}
function handleListKeys(event) {
  if (event.defaultPrevented || event.isComposing || event.keyCode === 229)
    return;
  /* 列表键属于 Chat Flow 与 Home 的那一条列表。Settings 页在场时那条列表被盖住，
     j / k / o 不该在看不见的地方挪焦点。 */
  if (state.settings.open) return;
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  if (!LIST_KEYS.has(event.key)) return;
  const active = document.activeElement;
  if (active?.closest(TEXT_ENTRY)) return;
  if (document.querySelector("dialog[open]")) return;
  if (active?.closest("#surface-panel, [popover]")) return;
  const stream = $("message-stream");
  const items = [...stream.querySelectorAll("[data-nav-item]")];
  if (!items.length) return;
  const current = active?.closest("[data-nav-item]");
  const index = current ? items.indexOf(current) : -1;
  if (event.key === "Enter" || event.key === "o") {
    if (index < 0) return;
    /* A focused button already activates itself on Enter; taking the event here
     * would open the same session twice. */
    if (event.key === "Enter" && current.matches("button")) return;
    event.preventDefault();
    openListItem(current);
    return;
  }
  if (event.key === "Home" || event.key === "End") {
    if (index < 0) return;
    event.preventDefault();
    items[event.key === "Home" ? 0 : items.length - 1].focus();
    return;
  }
  const arrow = event.key === "ArrowDown" || event.key === "ArrowUp";
  if (arrow && index < 0) return;
  event.preventDefault();
  const forward = event.key === "j" || event.key === "ArrowDown";
  const next =
    index < 0
      ? 0
      : Math.min(items.length - 1, Math.max(0, index + (forward ? 1 : -1)));
  items[next].focus();
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
    if (state.surface.open) {
      event.preventDefault();
      if (state.surface.expanded) setSurfaceExpanded(false);
      else closeSurface();
      return;
    }
    /* Settings 是最后一层：抽屉与工作面都不在了，Escape 才退出这一页，
       焦点回到打开它的那个控件（FN-27）。 */
    if (state.settings.open) {
      event.preventDefault();
      closeSettings();
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
    input.value.trim() || (kind === "session" ? "Untitled chat" : "");
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
    "show-run-button": ["activity", "Chat overview"],
    "show-surface-button": ["panel-right", "Open work surface"],
    "close-surface-button": ["panel-right", "Hide work surface"],
    "close-materials-button": ["x", "Close files"],
    "materials-button": ["paperclip", "Chat files"],
    "refresh-extensions-button": ["refresh-cw", "Refresh extensions"],
  };
  for (const [id, [name, label]] of Object.entries(actions))
    setAction($(id), name, label);
  setAction($("home-button"), "house", "Home", { visible: true });
  setAction($("attention-button"), "message-square", "Attention", { visible: true });
  setAction($("spark-button"), "refresh-cw", "Spark", { visible: true });
  setAction($("runtime-setup-button"), "settings-2", "Settings");
  setAction($("new-session-button"), "square-pen", "New chat", {
    visible: true,
  });
  setAction($("home-create-project"), "plus", "New project", { visible: true });
  setAction($("send-button"), "arrow-up", "Send");
  setAction($("cancel-run-button"), "square", "Cancel run");
  $("search-icon").append(icon("search"));
  $("toggle-nav-button").addEventListener("click", toggleNavigation);
  $("close-nav-button").addEventListener("click", () => {
    if (surfaceOverlayQuery.matches) {
      closeNavigation();
      return;
    }
    state.sidebarCollapsed = true;
    writeUiState();
    renderSurfaceVisibility();
    $("toggle-nav-button").focus();
  });
  $("nav-backdrop").addEventListener("click", () => closeNavigation());
  $("home-button").addEventListener("click", goHome);
  $("attention-button").addEventListener("click", () => attentionAgent.open());
  $("spark-button").addEventListener("click", () => sparkView.open(currentProject()?.id ?? null));
  $("workspace-home-link").addEventListener("click", (event) => {
    event.preventDefault();
    void goHome();
  });
  $("show-run-button").addEventListener("click", openContextSummary);
  for (const id of ["model-settings-button", "permission-settings-button"])
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
          placement: "top-start",
        });
      for (const id of ["model-settings-button", "permission-settings-button"])
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
  for (const module of surfacePaneModules())
    $(module.tabId).addEventListener("click", () => activateSurface(module.kind));
  $("surface-document-select").addEventListener("click", () =>
    activateSurface("file"),
  );
  $("surface-document-close").addEventListener("click", closeDocumentTab);
  $("surface-back-button").addEventListener("click", () =>
    setSurfaceExpanded(false),
  );
  $("surface-tabs").addEventListener("keydown", (event) => {
    /* 关闭是一个明确的动作：关闭钮，或焦点在文档 tab 上时的 Delete / Backspace。
       类型 tab 上按它什么也不发生 —— 档位不可关闭。 */
    if (
      (event.key === "Delete" || event.key === "Backspace") &&
      document.activeElement === $("surface-document-select")
    ) {
      event.preventDefault();
      closeDocumentTab();
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    // 只在 role="tab" 之间走：关闭钮不是这条 tablist 的一站。
    const tabs = surfaceTabButtons();
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
        showToast("Workspace refreshed. Check recent chats before sending the kept instruction again.");
      } else showToast("Workspace refreshed.");
      renderComposer();
    } catch (error) {
      showToast(`Refresh failed: ${error.message}`, "error");
    }
  });
  $("runtime-setup-button").addEventListener("click", (event) =>
    openSettings(state.settings.section, { trigger: event.currentTarget }),
  );
  $("settings-back-button").addEventListener("click", () => closeSettings());
  window.addEventListener("hashchange", syncSettingsFromHash);
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
  document.addEventListener("keydown", handleRuntimeFinderKey);
  document.addEventListener("keydown", handleListKeys);
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
  $("surface-backdrop").addEventListener("click", () =>
    state.surface.expanded ? setSurfaceExpanded(false) : closeSurface(),
  );
  surfaceOverlayQuery.addEventListener("change", renderSurfaceVisibility);
  /* 断点跨越（1679 ↔ 1680）只改布局：不卸载 renderer、不重发命令、不重读，
   * 所以这里只是一次重绘。R4D-3 的位置与草稿因此也不动。 */
  surfaceThreePaneQuery.addEventListener("change", () => {
    renderSurfaceVisibility();
    if (!surfaceViewSwitch()) renderMessageStream();
  });
  narrowQuery.addEventListener("change", () => {
    renderChatHeader();
    renderComposer();
    renderSurfaceVisibility();
  });
  /* WK-72 · the layer follows the main column and the composer, not the
   * viewport: a collapsing sidebar changes the same numbers a resize does. */
  const surfaceMetrics = new ResizeObserver(() => {
    measureSurfaceLayout();
    measureHomeLead();
  });
  surfaceMetrics.observe(document.querySelector(".chat-panel"));
  surfaceMetrics.observe($("composer-area"));
  window.addEventListener("resize", () => {
    measureSurfaceLayout();
    measureHomeLead();
  });
  /* WK-72 · with the rail header gone, the header control is the way in and the
   * way out of the collapsed layer; Escape still walks the same two steps. */
  $("show-surface-button").addEventListener("click", () =>
    state.surface.open && !state.surface.expanded
      ? closeSurface()
      : openSurfaceRail(),
  );
  $("surface-expand-button").addEventListener("click", () =>
    state.surface.expanded ? toggleSurfaceMaximized() : setSurfaceExpanded(true),
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
  /* WK-78 · 页壳自己的控制器：分组、搜索、外观偏好、只读表。它不取数据；
   * 需要的快照由 settingsView 推给它（`page` 选项），所以一个事实仍只有一个来源。 */
  settingsPage = createSettingsPage({
    home: {
      get: () => state.homePermissionMode,
      set: (value) => {
        if (!Object.hasOwn(permissionLabels, value)) return;
        state.homePermissionMode = value;
        storeHomeDraft();
        renderHomeComposerContext();
      },
    },
    onSection: (section) => {
      state.settings.section = section;
      if (state.settings.open && location.hash !== settingsHash(section))
        history.replaceState(null, "", settingsHash(section));
    },
    onEditConnection: () => {
      settingsPage.select("models", { focusPanel: false });
      $("provider-panel").querySelector("select,input,button")?.focus();
    },
    /* WO-WK11 · the finder's open action. It expands the resource and reads its
     * recorded source; it installs nothing and applies nothing. */
    onOpenRuntimeResource: (id) => runtimeView?.openResource(id),
    /* Changing the Home layout in Settings must reach Home, and only Home:
       the band's presence is decided in `renderChatHeader`, so both are redrawn
       and neither Settings nor Home writes the other's DOM. */
    onHomeLayout: () => {
      loadHomeModules();
      renderChatHeader();
      if (state.view === "home") renderHomeState();
    },
  });
  settingsView = createSettingsView($("provider-panel"), {
    page: settingsPage,
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
    onRuntimeEnvironment: (next) => runtimeView?.setEnvironment(next),
  });
  /* WO-WK11 · the Runtime Workbench lives in the five intent blocks of the
   * Settings page. One controller owns the control-plane snapshot; the rail
   * card and the host's slot resolution read its summary. The `Bound` layer
   * reads the recorded-binding cache this file already keeps per run id, so a
   * run's binding is still fetched once and held in one place. */
  runtimeView = createRuntimeView(
    {
      overview: $("settings-runtime-overview"),
      composition: $("settings-runtime-composition"),
      instructions: $("settings-runtime-instructions"),
      capabilities: $("settings-runtime-capabilities"),
      permissions: $("settings-runtime-permissions"),
      environment: $("settings-runtime-environment"),
    },
    {
      request,
      getSessionId: () => state.activeSessionId,
      notify: showToast,
      onDraft: (text, title) =>
        applyComposerDraft(state.activeSessionId, text, {
          unavailable:
            "The composer is unavailable. The template has not been used.",
          done: `Draft from "${title}" is ready. Nothing has been sent.`,
        }),
      getRuns: () => state.runs,
      getBinding: (runId) => state.recordedContext.get(runId) || null,
      loadBinding: (runId) => readRecordedContext(runId, state.activeSessionId),
      onEditConnection: () => {
        settingsPage.select("models", { focusPanel: false });
        $("provider-panel").querySelector("select,input,button")?.focus();
      },
      /* The Workbench rebuilds its own blocks; the page re-applies its one
       * search filter afterwards, and the rail card re-reads the summary. */
      onRendered: () => {
        settingsPage.refilter();
        if (state.surface.open) renderSurfaceRail();
      },
    },
  );
  fileView = createFileView($("file-content"), { request });
  materialsView = createMaterialsView({
    request,
    getSession: currentSession,
    onOpenFile: openFile,
    notify: showToast,
  });
  /* WK-94 · 两处用同一句话：控件自己说全后果，没有第二套短词。 */
  for (const id of ["home-permission-input", "session-permission-input"]) {
    const select = $(id);
    if (!select) continue;
    select.replaceChildren(
      ...Object.entries(permissionLabels).map(([value, text]) =>
        element("option", { text, attrs: { value } }),
      ),
    );
  }
  usageView = createUsageView({request, getProjects: () => state.projects, onOpenRun: async (runId, sessionId) => { await selectSession(sessionId); if (currentSession()?.id === sessionId) await openRun(runId); }});
  sparkView = createSparkView({ request, getProjects: () => state.projects, onOpenMatter: (matterId, projectId) => void openMatterSurface(matterId, projectId) });
  modelPicker = createModelPicker({request, onSaved: value => { state.providerConfig = value; renderProviderPanel(); renderAll(); void attentionAgent?.controller.refresh(); }});
  attentionAgent = createAttentionAgent($("attention-agent-dialog"), { request, onChooseModel: () => modelPicker.open(), getProvider: () => state.providerConfig, onItems: () => openAttentionWorkspace(), onOpenSession: id => selectSession(id), onConfigure: async id => { await selectSession(id); if (currentSession()?.id === id) openSettings("developer"); } });
  attentionWorkspace = createAttentionWorkspace($("attention-workspace"), { request, onOpenAssistant: () => attentionAgent.open(), onBack: () => {
    state.attentionOpen = false;
    attentionWorkspace.deactivate();
    renderAll();
    $("attention-button").focus();
  } });
  wireEvents();
  renderAll();
  /* 深链：带着 #settings/<section> 进来的人直接落在那一节，不必先看见 Home 再跳。
   * WK-98 (4) · 这一步只摆好页面，不发读取：token 还没到手，此刻发出的每个读取都是
   * 一次 401 加一次重试。读取在 bootstrap 之后由 refreshSettingsReads 补上。 */
  syncSettingsFromHash({ read: false });
  try {
    const bootstrap = await request("/bootstrap");
    state.token = bootstrap.sessionToken || null;
    state.capabilities = bootstrap.capabilities || null;
    state.adapterId = bootstrap.adapterId || null;
    await Promise.all([loadProjects(), loadExtensions(), loadProviderConfig()]);
    // Only a new device gets the initial overview; an explicitly collapsed tree stays collapsed.
    if (!Array.isArray(savedUi.openProjectIds))
      state.openProjectIds = new Set(state.projects.slice(0, 2).map(project => project.id));
    await Promise.all(
      [...state.openProjectIds].map((id) => loadSessionsForProject(id)),
    );
    await loadHome();
    // Home is the default entry; previous chats remain in Continue.
    /* 现在 token 在手，深链落地的那一页才发它的两个读取（WK-98 (4)）。 */
    if (state.settings.open) refreshSettingsReads();

    renderAll();
  } catch (error) {
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
  /* WK-43 · the host's own slot resolution, exposed for the same reason `state`
   * is: a non-author check must be able to read the host's answer rather than
   * re-derive one of its own from the DOM. It is a read; calling it changes
   * nothing. */
  slot: workSurfaceSlot,
};

void init();
