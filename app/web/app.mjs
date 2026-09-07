const API_BASE = "/api/v5";
const UI_STORAGE_KEY = "schema-engineering.ui.v6";
const surfaceOverlayQuery = window.matchMedia("(max-width: 1060px)");

const state = {
  token: null,
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
    open: true,
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

function element(tag, options = {}, ...children) {
  const item = document.createElement(tag);
  if (options.className) item.className = options.className;
  if (options.text !== undefined) item.textContent = String(options.text);
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) {
      if (value !== undefined && value !== null) item.setAttribute(name, String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    item.append(typeof child === "string" ? document.createTextNode(child) : child);
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
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeUiState() {
  try {
    if (!window.localStorage) return;
    window.localStorage.setItem(UI_STORAGE_KEY, JSON.stringify({
      activeProjectId: typeof state.activeProjectId === "string" ? state.activeProjectId : null,
      activeSessionId: typeof state.activeSessionId === "string" ? state.activeSessionId : null,
      openProjectIds: [...state.openProjectIds].filter((id) => typeof id === "string"),
      surfaceOpen: state.surface.open !== false,
    }));
  } catch {
    // Storage is a convenience for UI markers. A blocked or malformed store must not block startup.
  }
}

function sessionScopeKey(...parts) {
  return [state.activeSessionId || "", ...parts.map((part) => String(part ?? ""))].join(":");
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
  return { navEpoch: state.navigationEpoch, focusIntentEpoch: state.focusIntentEpoch, ...extra };
}

function guardAdmitNavigation(ticket) {
  return Boolean(ticket) && ticket.navEpoch === state.navigationEpoch;
}

function guardBumpFocusIntent() {
  state.focusIntentEpoch += 1;
  return state.focusIntentEpoch;
}

function guardHandoffFocus(ticket, { isTargetActive, targetControl, intentContainer, perform } = {}) {
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
    targetControl
    && active
    && active !== document.body
    && active !== targetControl
    && !(intentContainer && intentContainer.contains(active))
  ) return false;
  perform();
  return true;
}

function draftRevision(sessionId) {
  return state.draftRevisions.get(sessionId) || 0;
}

function bumpSessionMutation(sessionId) {
  if (!sessionId) return;
  state.sessionMutationVersions.set(sessionId, (state.sessionMutationVersions.get(sessionId) || 0) + 1);
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
  return stream.scrollHeight - stream.scrollTop - stream.clientHeight <= threshold;
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
  const followLatest = forceFollow === null ? isNearBottom(stream) : forceFollow;
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
  return ["created", "running", "waiting_user", "stopping"].includes(run?.status);
}

function isTerminalRunStatus(status) {
  return ["completed", "cancelled", "failed", "unknown"].includes(status);
}

function currentSession() {
  return state.session && state.session.id === state.activeSessionId ? state.session : null;
}

function currentProject() {
  return state.projects.find((project) => project.id === state.activeProjectId) || null;
}

function currentRun() {
  return state.runs.find((run) => isActiveRun(run)) || null;
}

function showToast(message, kind = "info") {
  const region = $("toast-region");
  const toast = element("div", { className: `toast ${kind === "error" ? "error" : ""}`, text: message });
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
    state.feedback.set(sessionId, { transient: null, persistent: { run: null, cancel: null, draft: null } });
  }
  return state.feedback.get(sessionId);
}

function setTransientFeedback(sessionId, operationId, category, text, { duration = 3000 } = {}) {
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
  bucket.transient = { sessionId, operationId, kind: "transient", category, text, timer };
  if (state.activeSessionId === sessionId) renderFeedback();
}

function setPersistentFeedback(sessionId, operationId, category, text, { nextAction = null } = {}) {
  const bucket = feedbackBucket(sessionId);
  if (!bucket) return;
  bucket.persistent[category] = { sessionId, operationId, kind: "persistent", category, text, nextAction };
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
    ? FEEDBACK_CATEGORY_ORDER.map((category) => bucket.persistent[category]).filter(Boolean)
    : [];
  // Persistent problems (one per category, run -> cancel -> draft) take
  // priority; a transient confirmation is only shown when nothing is
  // currently unresolved.
  const transient = persistentEntries.length ? null : bucket?.transient || null;
  if (!persistentEntries.length && !transient) {
    el.className = "draft-status";
    return;
  }
  el.className = `draft-status ${persistentEntries.length ? "error" : "saved"}`.trim();
  for (const entry of persistentEntries) el.append(renderFeedbackLine(entry));
  if (transient) el.append(renderFeedbackLine(transient));
}

function renderFeedbackLine(entry) {
  const line = element("div", { className: "draft-status-line", text: entry.text });
  if (entry.nextAction === "view-history") {
    line.append(document.createTextNode(" "));
    const button = element("button", { className: "text-button draft-status-action", attrs: { type: "button" }, text: "View history" });
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
    text: () => "Could not confirm run admission. Check session history before retrying.",
    retryable: false,
    nextAction: "view-history",
  },
  "run:rejected": {
    text: (error) => `Run was not started: ${error.message}`,
    retryable: true,
    nextAction: "retry",
  },
  "cancel:uncertain": {
    text: () => "Could not confirm run cancellation. Check session history before retrying.",
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
  const entry = ERROR_COPY[code] || { text: (err) => err.message, retryable: true, nextAction: "retry" };
  return { code, text: entry.text(error), retryable: entry.retryable, nextAction: entry.nextAction };
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
  if (state.token && path !== "/bootstrap") headers["X-Work-Token"] = state.token;

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
  if (!response.ok) {
    const message = payload?.error?.message || `Request failed (${response.status}).`;
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
  return a.sessionId === b.sessionId &&
    a.extensionId === b.extensionId &&
    a.generation === b.generation &&
    a.status === b.status &&
    a.modulePath === b.modulePath;
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

function guardForSurfaceFetch({ epoch, sessionId, fetchRequestId, controller }) {
  return epoch === state.sessionEpoch &&
    sessionId === state.activeSessionId &&
    fetchRequestId === state.surface.fetchRequestId &&
    controller === state.surface.fetchController &&
    !controller.signal.aborted;
}

function invalidateSurfaceFetches() {
  state.surface.fetchController?.abort();
  state.surface.fetchController = null;
  state.surface.fetchRequestId += 1;
}

function mergeEvents(events) {
  const bySeq = new Map(state.events.map((event) => [event.seq, event]));
  let changed = false;
  for (const event of events || []) {
    const eventSessionId = sessionIdForEvent(event);
    if (eventSessionId && eventSessionId !== state.activeSessionId) continue;
    if (Number.isFinite(event.seq)) {
      if (bySeq.has(event.seq)) continue;
      changed = true;
      bySeq.set(event.seq, event);
    }
    const type = normalizedType(event.type);
    if (type === "run/status" && event.runId && event.data?.status) changed = mergeRun({ id: event.runId, status: event.data.status }, { sessionId: eventSessionId || state.activeSessionId }) || changed;
    if (type === "run/error" && event.runId) changed = mergeRun({ id: event.runId, status: "failed", error: event.data }, { sessionId: eventSessionId || state.activeSessionId }) || changed;
    if (type === "question/resolved") {
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
  state.lastSeq = state.events.reduce((max, event) => Math.max(max, Number(event.seq) || 0), state.lastSeq);
  if (changed) bumpSessionMutation(state.activeSessionId);
  return changed;
}

function mergeRun(run, { sessionId = state.activeSessionId, preserveStatus = false } = {}) {
  if (!runBelongsToSession(run, sessionId) || sessionId !== state.activeSessionId) return false;
  const scopedRun = run.sessionId ? run : { ...run, sessionId };
  const index = state.runs.findIndex((item) => item.id === run.id);
  if (index === -1) {
    state.runs.push(scopedRun);
    bumpSessionMutation(sessionId);
    return true;
  }
  const previous = state.runs[index];
  if (isTerminalRunStatus(previous.status) && scopedRun.status && scopedRun.status !== previous.status) return false;
  const next = {
    ...previous,
    ...scopedRun,
    ...(preserveStatus && previous.status && scopedRun.status && previous.status !== scopedRun.status
      ? { status: previous.status }
      : {}),
  };
  state.runs[index] = next;
  const changed = previous.status !== next.status || previous.error !== next.error || previous.id !== next.id;
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
    const page = await request(`/sessions/${encodeURIComponent(sessionId)}/events?afterSeq=${state.lastSeq}`, {
      signal: controller.signal,
    });
    if (epoch !== state.sessionEpoch || sessionId !== state.activeSessionId || controller.signal.aborted) return;
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
      if (hadActiveRun && !state.runs.some(isActiveRun)) await loadSurface(epoch);
    }
  } catch (error) {
    if (error?.name !== "AbortError" && epoch === state.sessionEpoch) {
      setConnectionLost(true);
    }
  }
  if (epoch === state.sessionEpoch && currentSession() && state.runs.some(isActiveRun)) schedulePolling(epoch);
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
    try {
      await request("/bootstrap", { signal: controller.signal });
      succeeded = true;
    } catch {
      // Network failure, or an AbortError from stopRecoveryProbe having
      // ended this probe's round while it was in flight — either way,
      // handled uniformly by the epoch/connectionLost check below.
    }
    if (state.recoveryProbeController === controller) state.recoveryProbeController = null;
    if (state.connectionEpoch !== probeEpoch || !state.connectionLost) {
      // This round already ended (recovered some other way, e.g. an
      // explicit Refresh) or was superseded by a newer outage while this
      // probe was in flight. Drop the receipt and do not reschedule — a
      // still-active newer round already has its own probe running from
      // when it started; a since-recovered round needs no more probing.
      return;
    }
    if (succeeded) {
      setConnectionLost(false);
      if (state.activeSessionId) void refreshActiveSession();
      return; // setConnectionLost(false) already stopped the probe for this round.
    }
    scheduleRecoveryProbe();
  }, 900);
}

async function saveDraft(sessionId, text, { revision = draftRevision(sessionId) } = {}) {
  if (!sessionId) return false;
  const operationId = nextOperationId("draft");
  const previous = state.draftQueues.get(sessionId) || Promise.resolve(true);
  let task;
  task = previous.catch(() => false).then(async () => {
    try {
      await request(`/sessions/${encodeURIComponent(sessionId)}/draft`, {
        method: "PUT",
        body: { text },
      });
      if (draftRevision(sessionId) === revision && state.draftCache.get(sessionId) === text) {
        state.draftDirty.delete(sessionId);
        // WS-08: storage is not gated on which session is active (see submitRun).
        clearPersistentFeedback(sessionId, "draft");
        setTransientFeedback(sessionId, operationId, "draft", "Draft saved");
      }
      return true;
    } catch (error) {
      const currentDraft = draftRevision(sessionId) === revision && state.draftCache.get(sessionId) === text;
      if (currentDraft) {
        state.draftDirty.add(sessionId);
        const copy = describeCommandError("draft", error);
        setPersistentFeedback(sessionId, operationId, "draft", copy.text, { nextAction: copy.nextAction });
      }
      return false;
    }
  }).finally(() => {
    if (state.draftQueues.get(sessionId) === task) state.draftQueues.delete(sessionId);
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
  if (state.draftTimers.has(sessionId)) window.clearTimeout(state.draftTimers.get(sessionId));
  const timer = window.setTimeout(() => {
    state.draftTimers.delete(sessionId);
    const revision = draftRevision(sessionId);
    const text = state.draftCache.get(sessionId) || "";
    void saveDraft(sessionId, text, { revision });
  }, 700);
  state.draftTimers.set(sessionId, timer);
  setTransientFeedback(sessionId, nextOperationId("draft-pending"), "draft", "Saving draft…", { duration: null });
}

async function persistCurrentDraft() {
  const session = currentSession();
  if (!session) return;
  await persistDraftForSession(session.id);
}

async function persistDraftForSession(sessionId, { revision = draftRevision(sessionId), text = state.draftCache.get(sessionId) || "" } = {}) {
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
  if (container.parentNode?.removeChild) container.parentNode.removeChild(container);
  else container.remove?.();
  if (state.surface.ownedContainer === container) state.surface.ownedContainer = null;
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
  const boundExtensionId = context?.extensionId || infoExtension?.id || currentSession()?.extensionBinding?.extensionId || null;
  if (!boundExtensionId) return;
  const previousExtension = previousExtensions?.find((item) => item.id === boundExtensionId) || infoExtension || null;
  const currentIdentity = context || surfaceIdentityFromExtension(previousExtension, state.activeSessionId);
  const extension = state.extensions.find((item) => item.id === boundExtensionId) || null;
  const nextIdentity = surfaceIdentityFromExtension(extension, state.activeSessionId);
  if (sameSurfaceIdentity(currentIdentity, nextIdentity)) return;
  state.surface.requestId += 1;
  const expectedFetchRequestId = state.surface.fetchRequestId + 1;
  await disposeSurfaceRenderer();
  if (state.surface.fetchRequestId !== expectedFetchRequestId || state.surface.context) return;
  state.surface.info = null;
  state.surface.projection = null;
  $("surface-title").textContent = "Preview";
  renderSurfaceFallback();
}

function maxEventSeq(events) {
  return (events || []).reduce((max, event) => Math.max(max, Number(event.seq) || 0), 0);
}

function sessionRuns(runs, sessionId) {
  return (runs || []).filter((run) => runBelongsToSession(run, sessionId));
}

function applySessionDetail(detail, sessionId, { readVersion, readSeq, readToken } = {}) {
  if (sessionId !== state.activeSessionId || !isCurrentSessionRead(sessionId, readToken)) return false;
  const incomingEvents = (detail.events || [])
    .filter((event) => !sessionIdForEvent(event) || sessionIdForEvent(event) === sessionId)
    .slice()
    .sort((a, b) => a.seq - b.seq);
  const incomingSeq = maxEventSeq(incomingEvents);
  const currentVersion = state.sessionMutationVersions.get(sessionId) || 0;
  const hasNewerLocalObservation = currentVersion !== readVersion || state.lastSeq > incomingSeq || state.lastSeq > readSeq;
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
    state.draftCache.set(sessionId, state.session?.draft || detail.session?.draft || "");
    state.draftRevisions.set(sessionId, 0);
    state.draftDirty.delete(sessionId);
  }
  return true;
}

async function selectSession(sessionId, { navigationEpoch: suppliedNavigationEpoch = null } = {}) {
  if (!sessionId || sessionId === state.activeSessionId) return;
  const navigationEpoch = suppliedNavigationEpoch ?? (state.navigationEpoch + 1);
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
  writeUiState();
  state.session = null;
  state.events = [];
  state.runs = [];
  state.lastSeq = 0;
  state.bindingExtensionId = null;
  state.surface.expanded = false;
  renderAll();

  let readToken;
  try {
    const readVersion = state.sessionMutationVersions.get(sessionId) || 0;
    const readSeq = state.lastSeq;
    readToken = nextSessionReadToken(sessionId);
    const detail = await request(`/sessions/${encodeURIComponent(sessionId)}`);
    if (epoch !== state.sessionEpoch || navigationEpoch !== state.navigationEpoch || state.activeSessionId !== sessionId) return;
    if (!applySessionDetail(detail, sessionId, { readVersion, readSeq, readToken })) return;
    renderAll();
    await loadSurface(epoch);
    if (state.runs.some(isActiveRun)) {
      state.pollController = new AbortController();
      schedulePolling(epoch, 0);
    }
  } catch (error) {
    if (epoch !== state.sessionEpoch || navigationEpoch !== state.navigationEpoch || !isCurrentSessionRead(sessionId, readToken)) return;
    showToast(`Could not load session: ${error.message}`, "error");
    state.session = null;
    renderAll();
  }
}

function clearActiveSession() {
  stopPolling();
  void disposeSurfaceRenderer();
  state.sessionEpoch += 1;
  state.activeSessionId = null;
  state.session = null;
  state.events = [];
  state.runs = [];
  state.lastSeq = 0;
  state.bindingExtensionId = null;
  state.surface.expanded = false;
  writeUiState();
  renderAll();
}

async function loadSessionsForProject(projectId, { force = false } = {}) {
  if (!projectId || (!force && state.sessionsByProject.has(projectId))) return state.sessionsByProject.get(projectId) || [];
  try {
    const result = await request(`/sessions?projectId=${encodeURIComponent(projectId)}`);
    const sessions = Array.isArray(result.sessions) ? result.sessions : [];
    state.sessionsByProject.set(projectId, sessions);
    return sessions;
  } catch (error) {
    showToast(`Could not load sessions: ${error.message}`, "error");
    state.sessionsByProject.set(projectId, []);
    return [];
  }
}

async function refreshNavigationAndSession() {
  const navigationEpoch = state.navigationEpoch + 1;
  state.navigationEpoch = navigationEpoch;
  await loadProjects();
  if (navigationEpoch !== state.navigationEpoch || !state.activeProjectId) return;
  const sessions = await loadSessionsForProject(state.activeProjectId, { force: true });
  if (navigationEpoch !== state.navigationEpoch) return;
  if (state.activeSessionId && sessions.some((session) => session.id === state.activeSessionId)) {
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
  const requested = sessionId && sessions.find((session) => session.id === sessionId);
  const current = currentSession();
  if (requested) await selectSession(requested.id, { navigationEpoch });
  else if (!current || current.projectId !== projectId) {
    if (sessions[0]) await selectSession(sessions[0].id, { navigationEpoch });
    else clearActiveSession();
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
  state.openProjectIds = new Set([...state.openProjectIds].filter((projectId) => valid.has(projectId)));
  if (state.activeProjectId && !valid.has(state.activeProjectId)) {
    state.activeProjectId = null;
    state.restoreSessionId = null;
    clearActiveSession();
  }
  renderProjectList();
}

async function restoreUiSelection() {
  const projectId = state.activeProjectId && state.projects.some((project) => project.id === state.activeProjectId)
    ? state.activeProjectId
    : state.projects[0]?.id || null;
  if (!projectId) {
    state.activeProjectId = null;
    state.restoreSessionId = null;
    clearActiveSession();
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
    if (!applySessionDetail(detail, id, { readVersion, readSeq, readToken })) return;
    renderAll();
    await loadSurface(epoch);
  } catch (error) {
    if (epoch !== state.sessionEpoch || id !== state.activeSessionId || !isCurrentSessionRead(id, readToken)) return;
    showToast(`Refresh failed: ${error.message}`, "error");
  }
}

function renderProjectList() {
  const list = $("project-list");
  clear(list);
  $("project-count").textContent = String(state.projects.length);
  const query = state.navigationFilter.trim().toLocaleLowerCase();
  const filterInput = $("nav-filter-input");
  const clearFilter = $("clear-nav-filter-button");
  const filterStatus = $("nav-filter-status");
  if (filterInput && document.activeElement !== filterInput) filterInput.value = state.navigationFilter;
  if (clearFilter) clearFilter.hidden = !state.navigationFilter;
  if (filterStatus) filterStatus.textContent = query ? "Filtering loaded names only." : "";
  if (!state.projects.length) {
    list.append(element("p", { className: "empty-list", text: "No projects yet." }));
    return;
  }
  const visibleProjects = state.projects.filter((project) => {
    if (!query) return true;
    const projectMatch = String(project.name || "").toLocaleLowerCase().includes(query);
    const sessions = state.sessionsByProject.get(project.id) || [];
    return projectMatch || sessions.some((session) => String(session.title || "").toLocaleLowerCase().includes(query));
  });
  if (!visibleProjects.length) {
    list.append(element("p", { className: "empty-list", text: `No loaded project or session names match “${state.navigationFilter}”.` }));
    return;
  }
  for (const project of visibleProjects) {
    const open = state.openProjectIds.has(project.id);
    const row = element("div", { className: "project-row" });
    const button = element("button", {
      className: `project-button ${state.activeProjectId === project.id ? "active" : ""}`,
      attrs: { type: "button", "aria-expanded": open, "aria-controls": `sessions-${project.id}` },
    },
    element("span", { className: "project-chevron", text: open ? "▾" : "▸", attrs: { "aria-hidden": "true" } }),
    element("span", { className: "project-name", text: project.name || "Unnamed project" }));
    button.addEventListener("click", () => {
      state.openProjectIds.has(project.id) ? state.openProjectIds.delete(project.id) : state.openProjectIds.add(project.id);
      void selectProject(project.id);
    });
    row.append(button);
    if (open) {
      const sessions = state.sessionsByProject.get(project.id);
      const sessionList = element("div", { className: "session-list", attrs: { id: `sessions-${project.id}` } });
      if (!sessions) {
        sessionList.append(element("p", { className: "empty-list", text: "Loading sessions…" }));
      } else if (!sessions.length) {
        sessionList.append(element("p", { className: "empty-list", text: "No sessions yet." }));
      } else {
        for (const session of sessions) {
          const sessionButton = element("button", {
            className: `session-button ${session.id === state.activeSessionId ? "active" : ""}`,
            attrs: { type: "button" },
          }, element("span", { className: "session-name", text: session.title || "Untitled session" }));
          sessionButton.addEventListener("click", () => void selectSession(session.id));
          sessionList.append(sessionButton);
        }
      }
      row.append(sessionList);
    }
    list.append(row);
  }
}

function updateExtensionStatus(extension) {
  return `${extension.kind || "development-extension"} · ${extension.releaseStatus || "development"}`;
}

function renderExtensionList() {
  const list = $("extension-list");
  clear(list);
  if (!state.extensions.length) {
    list.append(element("p", { className: "empty-list", text: "No whitelisted extensions." }));
    return;
  }
  const session = currentSession();
  for (const extension of state.extensions) {
    const row = element("div", { className: "extension-row" });
    const head = element("div", { className: "extension-row-head" },
      element("span", { className: "extension-row-title", text: extension.title || extension.id }),
      element("span", { className: `extension-status ${extension.status || ""}`, text: extension.status || "unknown" }));
    row.append(head, element("p", { className: "extension-row-meta", text: `${extension.id} · v${extension.version || "?"} · gen ${extension.generation ?? "?"}` }));
    row.append(element("p", { className: "extension-row-meta", text: updateExtensionStatus(extension) }));
    const actions = element("div", { className: "extension-actions" });
    const lifecycleAction = extension.status === "loaded" ? "unload" : extension.status === "invalidated" ? "reload" : "load";
    const lifecycleButton = element("button", { className: "quiet-button", attrs: { type: "button" }, text: lifecycleAction[0].toUpperCase() + lifecycleAction.slice(1) });
    lifecycleButton.addEventListener("click", () => void lifecycle(extension.id, lifecycleAction));
    actions.append(lifecycleButton);
    if (extension.status !== "invalidated") {
      const invalidateButton = element("button", { className: "quiet-button danger-button", attrs: { type: "button" }, text: "Invalidate" });
      invalidateButton.addEventListener("click", () => void lifecycle(extension.id, "invalidate"));
      actions.append(invalidateButton);
    }
    if (extension.status === "loaded") {
      const reloadButton = element("button", { className: "quiet-button", attrs: { type: "button" }, text: "Reload" });
      reloadButton.addEventListener("click", () => void lifecycle(extension.id, "reload"));
      actions.append(reloadButton);
      if (session && !session.extensionBinding) {
        const bindButton = element("button", { className: "secondary-button", attrs: { type: "button" }, text: "Bind to session" });
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
    await request(`/extensions/${encodeURIComponent(extensionId)}/lifecycle`, { method: "POST", body: { action } });
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
  const extension = state.extensions.find((item) => item.id === state.bindingExtensionId);
  const session = currentSession();
  if (!extension || !session || session.extensionBinding) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const inner = element("div", { className: "binding-panel-inner" });
  inner.append(element("h3", { text: `Bind ${extension.title || extension.id}` }));
  inner.append(element("p", { className: "binding-panel-note", text: "The extension validates these fields. The generic UI only renders the manifest declaration." }));
  const form = element("form", { className: "binding-form" });
  const fields = Array.isArray(extension.bindingFields) ? extension.bindingFields : [];
  const fieldsWrap = element("div", { className: "binding-fields" });
  const controls = [];
  for (const field of fields) {
    if (!field?.name) continue;
    const label = element("label", { className: "binding-field", text: field.label || field.name });
    const control = field.multiline ? element("textarea", { attrs: { name: field.name, rows: 5 } }) : element("input", { attrs: { name: field.name, type: "text" } });
    if (field.required) control.required = true;
    if (Number.isFinite(field.maxLength) && field.maxLength > 0) control.maxLength = field.maxLength;
    label.append(control);
    if (field.maxLength) label.append(element("small", { text: `Maximum ${field.maxLength} characters.` }));
    fieldsWrap.append(label);
    controls.push({ field, control });
  }
  if (!controls.length) fieldsWrap.append(element("p", { className: "section-note", text: "This extension declares no input fields." }));
  form.append(fieldsWrap);
  const actions = element("div", { className: "binding-actions" });
  const cancel = element("button", { className: "quiet-button", attrs: { type: "button" }, text: "Cancel" });
  cancel.addEventListener("click", () => {
    state.bindingExtensionId = null;
    renderBindingPanel();
    $("runtime-setup-button")?.focus();
  });
  actions.append(cancel);
  const submit = element("button", { className: "primary-button", attrs: { type: "submit" }, text: "Create binding" });
  actions.append(submit);
  form.append(actions);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = {};
    for (const { field, control } of controls) input[field.name] = control.value;
    submit.disabled = true;
    try {
      const result = await request(`/sessions/${encodeURIComponent(session.id)}/extension`, {
        method: "POST",
        body: { extensionId: extension.id, input },
      });
      if (state.activeSessionId !== session.id) return;
      state.session = result.session || state.session;
      state.sessionsByProject.set(session.projectId, (state.sessionsByProject.get(session.projectId) || []).map((item) => item.id === session.id ? state.session : item));
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
  const firstField = panel?.querySelector("input:not([disabled]), textarea:not([disabled])");
  (firstField || panel?.querySelector("button[type=submit]:not([disabled])"))?.focus();
}

function renderProviderPanel() {
  const panel = $("provider-panel");
  clear(panel);
  if (!state.providerConfig) {
    panel.append(element("p", { className: "provider-readonly", text: "Loading…" }));
    return;
  }
  const config = state.providerConfig.config || {};
  const form = element("form");
  const fields = [
    ["provider", "Provider", config.provider || "fake-openai-loopback"],
    ["model", "Model", config.model || "fake-1"],
    ["api", "API", config.api || "openai-completions"],
    ["baseUrl", "Base URL (optional)", config.baseUrl || ""],
  ];
  const controls = new Map();
  for (const [name, labelText, value] of fields) {
    const label = element("label", { text: labelText });
    const input = element("input", { attrs: { name, type: "text", autocomplete: "off" } });
    input.value = value;
    controls.set(name, input);
    label.append(input);
    form.append(label);
  }
  form.append(element("p", { className: "provider-help", text: "Local fake execution only. This form never accepts or reads a provider key." }));
  const save = element("button", { className: "secondary-button", attrs: { type: "submit" }, text: "Save route" });
  form.append(save);
  const execution = state.providerConfig.execution || {};
  form.append(element("p", { className: "provider-readonly", text: `${execution.mode || "local-fake"} · realProvider:${String(execution.realProvider === true)}` }));
  if (state.providerConfig.credentialStatus) form.append(element("p", { className: "provider-readonly", text: `Credentials: ${state.providerConfig.credentialStatus}` }));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    save.disabled = true;
    const body = {};
    for (const [name, input] of controls) {
      if (name !== "baseUrl" || input.value.trim()) body[name] = input.value.trim();
    }
    try {
      state.providerConfig = await request("/provider-config", { method: "PUT", body });
      renderProviderPanel();
      showToast("Provider descriptor saved.");
    } catch (error) {
      save.disabled = false;
      showToast(`Provider descriptor was not saved: ${error.message}`, "error");
    }
  });
  panel.append(form);
}

function appendRunBadge(container, status) {
  if (!status) return;
  container.append(element("span", { className: `run-badge ${status}`, text: status }));
}

function appendAssistantBody(container, text, key) {
  const body = element("div", { className: "message-body", text });
  if (text.length <= 1400) {
    container.append(body);
    return;
  }
  const details = element("details", { className: "message-long" });
  details.open = state.longMessageOpen.get(key) === true;
  details.append(element("summary", { text: `Full response · ${text.length} characters` }), body);
  details.addEventListener("toggle", () => state.longMessageOpen.set(key, details.open));
  container.append(details);
}

function appendToolDetails(container, row) {
  const requestValue = row.request;
  const resultValue = row.result;
  if (requestValue !== undefined && requestValue !== null) {
    container.append(element("h4", { className: "tool-detail-heading", text: "Request" }));
    container.append(element("pre", { className: "tool-detail", text: safeText(requestValue) }));
  }
  if (resultValue !== undefined && resultValue !== null && resultValue !== "") {
    container.append(element("h4", { className: "tool-detail-heading", text: "Result" }));
    container.append(element("pre", { className: `tool-detail ${row.isError ? "tool-error" : ""}`, text: safeText(resultValue) }));
  }
  if (!container.childElementCount) {
    container.append(element("p", { className: "tool-detail", text: "No request or result details were included in this event." }));
  }
}

function renderMessageStream() {
  const stream = $("message-stream");
  const focusedQuestionKey = document.activeElement?.dataset?.questionKey || null;
  const focusedQuestionInput = focusedQuestionKey ? document.activeElement : null;
  const focusedQuestionSelection = focusedQuestionInput && Number.isInteger(focusedQuestionInput.selectionStart)
    ? {
      start: focusedQuestionInput.selectionStart,
      end: focusedQuestionInput.selectionEnd ?? focusedQuestionInput.selectionStart,
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
    stream.append(element("div", { className: "empty-state" },
      element("h3", { text: "No session selected" }),
      element("p", { text: state.projects.length ? "Choose a session from the left or create one." : "Create a project and session from the left." })));
    return;
  }

  const rows = [];
  const assistantRows = new Map();
  const assistantSegmentByRun = new Map();
  const toolRows = new Map();
  const questionRows = new Map();
  const runStatusRows = new Map();
  const runStatuses = new Map(state.runs.map((run) => [run.id, run.status]));
  for (const run of state.runs) {
    if (run?.id && run.status) runStatusRows.set(run.id, { kind: "run-status", runId: run.id, status: run.status });
  }
  for (const event of state.events) {
    const type = normalizedType(event.type);
    const data = event.data || {};
    if (type === "message/user") {
      rows.push({ kind: "user", text: data.text || "", runId: event.runId });
    } else if (type === "assistant/delta") {
      const segment = assistantSegmentByRun.get(event.runId) || 0;
      const assistantKey = `${event.runId}:${segment}`;
      let row = assistantRows.get(assistantKey);
      if (!row) {
        row = { kind: "assistant", text: "", runId: event.runId, pending: true };
        assistantRows.set(assistantKey, row);
        rows.push(row);
      }
      row.text = data.text ?? data.delta ?? row.text;
    } else if (type === "assistant/final") {
      const segment = assistantSegmentByRun.get(event.runId) || 0;
      const assistantKey = `${event.runId}:${segment}`;
      let row = assistantRows.get(assistantKey);
      if (!row) {
        row = { kind: "assistant", text: "", runId: event.runId };
        assistantRows.set(assistantKey, row);
        rows.push(row);
      }
      row.text = data.text ?? data.message ?? row.text;
      row.pending = false;
    } else if (type === "tool/start") {
      assistantSegmentByRun.set(event.runId, (assistantSegmentByRun.get(event.runId) || 0) + 1);
      const callId = data.callId || data.id || data.name || event.seq;
      const key = `${event.runId}:${callId}`;
      const row = {
        kind: "tool",
        runId: event.runId,
        callId,
        name: data.name || "tool",
        request: data.request ?? data.args ?? data.arguments ?? data.input,
        result: data.result ?? data.text ?? data.error,
        isError: Boolean(data.isError || data.error),
        phase: "started",
      };
      toolRows.set(key, row);
      rows.push(row);
    } else if (type === "tool/update" || type === "tool/result") {
      assistantSegmentByRun.set(event.runId, (assistantSegmentByRun.get(event.runId) || 0) + 1);
      const callId = data.callId || data.id || data.name || "";
      const key = `${event.runId}:${callId}`;
      let row = toolRows.get(key);
      if (!row) {
        row = { kind: "tool", runId: event.runId, callId, name: data.name || "tool", request: undefined, result: undefined, isError: false, phase: "updated" };
        toolRows.set(key, row);
        rows.push(row);
      }
      row.request = data.request ?? data.args ?? data.arguments ?? data.input ?? row.request;
      row.result = data.result ?? data.text ?? data.error ?? row.result;
      row.isError = Boolean(data.isError || data.error);
      row.phase = type === "tool/result" ? "result" : "updated";
    } else if (type === "question/open") {
      assistantSegmentByRun.set(event.runId, (assistantSegmentByRun.get(event.runId) || 0) + 1);
      const id = data.id || data.questionId || event.seq;
      const key = questionScopeKey(event.runId, id);
      const row = questionRows.get(key) || { kind: "question", runId: event.runId, id, prompt: data.prompt || "Input requested", answer: null };
      row.prompt = data.prompt || row.prompt;
      questionRows.set(key, row);
      if (!rows.includes(row)) rows.push(row);
    } else if (type === "question/resolved") {
      const id = data.id || data.questionId;
      const row = questionRows.get(questionScopeKey(event.runId, id));
      if (row) row.answer = data.answer || "";
    } else if (type === "run/status") {
      if (data.status) {
        runStatuses.set(event.runId, data.status);
        runStatusRows.set(event.runId, { kind: "run-status", runId: event.runId, status: data.status });
      }
    } else if (type === "run/error") {
      rows.push({ kind: "error", runId: event.runId, text: data.message || data.code || "Run failed." });
    }
  }

  for (const runId of runStatuses.keys()) {
    const hasAssistantOrStatus = rows.some((row) => (
      row.runId === runId && (
        row.kind === "run-status" ||
        (row.kind === "assistant" && Boolean(row.text && row.text.trim()))
      )
    ));
    if (!hasAssistantOrStatus && runStatusRows.has(runId)) rows.push(runStatusRows.get(runId));
  }

  if (!rows.length) {
    const active = currentRun();
    setJumpLatestVisible(false);
    stream.append(element("div", { className: "empty-state" },
      element("h3", { text: active ? "Run has no messages yet" : "No messages yet" }),
      element("p", { text: active ? "The next event will appear here." : "Send a message to create the first run." })));
    return;
  }

  const list = element("div", { className: "message-list" });
  for (const row of rows) {
    const status = runStatuses.get(row.runId) || state.runs.find((run) => run.id === row.runId)?.status;
    if (row.kind === "user") {
      const wrapper = element("article", { className: "message user" });
      const header = element("div", { className: "message-header" }, element("span", { className: "message-role", text: "You" }));
      wrapper.append(header, element("div", { className: "message-body", text: row.text }));
      list.append(wrapper);
    } else if (row.kind === "assistant") {
      if (!row.text || !row.text.trim()) continue;
      const wrapper = element("article", { className: `message assistant ${row.pending ? "pending" : ""}` });
      const header = element("div", { className: "message-header" }, element("span", { className: "message-role", text: "Assistant" }));
      appendRunBadge(header, status);
      wrapper.append(header);
      appendAssistantBody(wrapper, row.text, sessionScopeKey("assistant", row.runId));
      list.append(wrapper);
    } else if (row.kind === "tool") {
      const details = element("details", { className: "tool-card" });
      const key = toolScopeKey(row.runId, row.callId, row.name);
      details.open = state.toolOpen.get(key) === true;
      const suffix = row.isError ? " · failed" : row.phase === "result" ? " · result" : "";
      details.append(element("summary", { text: `${row.name}${suffix}` }));
      const detail = element("div", { className: "tool-detail-block" });
      appendToolDetails(detail, row);
      details.append(detail);
      details.addEventListener("toggle", () => state.toolOpen.set(key, details.open));
      list.append(details);
    } else if (row.kind === "question") {
      const card = element("article", { className: "question-card" });
      card.append(element("strong", { text: "Input requested" }), element("p", { className: "question-prompt", text: row.prompt }));
      const questionKey = questionScopeKey(row.runId, row.id);
      if (row.answer !== null) {
        card.append(element("p", { className: "tool-detail", text: `Answered: ${row.answer}` }));
      } else if (state.questionSubmitted.has(questionKey)) {
        card.append(element("p", { className: "tool-detail", text: "Answer sent; waiting for confirmation." }));
      } else if (!isActiveRun({ status })) {
        card.append(element("p", { className: "tool-detail", text: "This run has ended; the question is closed." }));
      } else {
        const form = element("form");
        let input = state.questionControls.get(questionKey)?.input;
        if (!input || input.ownerDocument !== document) {
          input = element("input", { attrs: { type: "text", required: true, "aria-label": "Answer", "data-question-key": questionKey } });
          input.addEventListener("input", () => state.questionDrafts.set(questionKey, input.value));
          state.questionControls.set(questionKey, { input });
        }
        if (state.questionDrafts.has(questionKey) && input.value !== state.questionDrafts.get(questionKey)) {
          input.value = state.questionDrafts.get(questionKey) || "";
        }
        if (focusedQuestionKey === questionKey) {
          questionFocusTarget = input;
          questionSelectionTarget = focusedQuestionSelection;
        }
        const submitting = state.questionSubmitting.has(questionKey);
        input.disabled = submitting;
        const submit = element("button", { className: "secondary-button", attrs: { type: "submit" }, text: submitting ? "Sending…" : "Answer" });
        submit.disabled = submitting;
        form.append(input, submit);
        const questionError = state.questionErrors.get(questionKey);
        if (questionError) form.append(element("p", { className: "question-error", text: questionError }));
        form.addEventListener("submit", async (event) => {
          event.preventDefault();
          if (state.questionSubmitting.has(questionKey) || state.questionSubmitted.has(questionKey)) return;
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
            await request(`/runs/${encodeURIComponent(row.runId)}/questions/${encodeURIComponent(row.id)}`, { method: "POST", body: { answer } });
            state.questionSubmitting.delete(questionKey);
            if (epoch !== state.sessionEpoch || sessionId !== state.activeSessionId) return;
            state.questionSubmitted.add(questionKey);
            await pollEvents(state.sessionEpoch);
            if (epoch === state.sessionEpoch && sessionId === state.activeSessionId) renderMessageStream();
          } catch (error) {
            state.questionSubmitting.delete(questionKey);
            if (epoch !== state.sessionEpoch || sessionId !== state.activeSessionId) return;
            state.questionErrors.set(questionKey, error.message);
            renderMessageStream();
            showToast(`Answer was not accepted: ${error.message}`, "error");
          }
        });
        card.append(form);
      }
      list.append(card);
    } else if (row.kind === "error") {
      list.append(element("article", { className: "message error" }, element("div", { className: "message-body", text: row.text })));
    } else if (row.kind === "run-status") {
      const card = element("article", { className: "run-status-card" });
      const header = element("div", { className: "message-header" }, element("span", { className: "message-role", text: "Run" }));
      appendRunBadge(header, row.status || "unknown");
      card.append(header);
      list.append(card);
    }
  }
  if (!list.childElementCount) {
    list.append(element("div", { className: "empty-state compact" },
      element("h3", { text: "No message content yet" }),
      element("p", { text: "The recorded run has no assistant text." })));
  }
  stream.append(list);
  if (questionFocusTarget) {
    questionFocusTarget.focus();
    if (questionSelectionTarget && typeof questionFocusTarget.setSelectionRange === "function") {
      const length = questionFocusTarget.value.length;
      const start = Math.min(questionSelectionTarget.start, length);
      const end = Math.min(questionSelectionTarget.end, length);
      try { questionFocusTarget.setSelectionRange(start, end, questionSelectionTarget.direction); } catch { /* input type/browser may reject selection restoration */ }
    }
  }
  const reading = state.messageReading.get(session.id) || { followLatest, scrollTop: previousScrollTop };
  if (reading.followLatest) stream.scrollTop = stream.scrollHeight;
  else stream.scrollTop = Math.min(reading.scrollTop, Math.max(0, stream.scrollHeight - stream.clientHeight));
  state.messageReading.set(session.id, { followLatest: reading.followLatest, scrollTop: stream.scrollTop });
  setJumpLatestVisible(!reading.followLatest);
}

function renderChatHeader() {
  const session = currentSession();
  const project = currentProject();
  $("project-title").textContent = project?.name || "No project selected";
  $("session-title").textContent = session?.title || "Create a session to begin";
  const meta = $("session-meta");
  clear(meta);
  if (session) {
    if (session.extensionBinding?.extensionId) meta.append(element("span", { className: "run-badge", text: `bound: ${session.extensionBinding.extensionId}` }));
    const active = currentRun();
    if (active) appendRunBadge(meta, active.status);
  }
  const show = $("show-surface-button");
  show.hidden = state.surface.open;
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
  // WS-08: no session keeps the textarea disabled; a send pending for this
  // session makes it readonly instead, so focus and content survive the
  // in-flight command. An active run (no pending) leaves it fully editable
  // (V7 regression requirement) and only locks Send.
  textarea.disabled = !session;
  textarea.readOnly = Boolean(session) && Boolean(pendingRun);
  send.disabled = !session || Boolean(active) || Boolean(pendingRun) || state.connectionLost;
  cancel.hidden = !active;
  cancel.disabled = !active || Boolean(pendingCancel);
  if (runHint) runHint.hidden = !active;
  if (session) {
    const cached = state.draftCache.has(session.id) ? state.draftCache.get(session.id) : session.draft || "";
    if (document.activeElement !== textarea || !state.draftDirty.has(session.id)) textarea.value = cached;
    textarea.placeholder = "Message the local fake agent";
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
}

function setSurfaceExpanded(expanded, { focus = true } = {}) {
  const next = Boolean(expanded && state.surface.open && currentSession());
  state.surface.expanded = next;
  renderSurfaceVisibility();
  if (focus) $("surface-expand-button")?.focus();
}

function surfaceIsModal() {
  return state.surface.open && (surfaceOverlayQuery.matches || state.surface.expanded);
}

function closeSurface() {
  state.surface.expanded = false;
  state.surface.open = false;
  writeUiState();
  renderSurfaceVisibility();
  $("show-surface-button")?.focus();
}

function renderSurfaceVisibility() {
  const shell = $("app-shell");
  const panel = $("surface-panel");
  const open = state.surface.open === true;
  const expanded = open && state.surface.expanded && Boolean(currentSession());
  const modal = Boolean(open && (surfaceOverlayQuery.matches || expanded));
  const wasModal = panel.getAttribute("aria-modal") === "true";
  const sidebar = shell?.querySelector(".sidebar");
  const chat = shell?.querySelector(".chat-panel");
  const content = $("surface-content");
  const tab = $("surface-preview-tab");
  shell.classList.toggle("surface-closed", !open);
  shell.classList.toggle("surface-expanded", expanded);
  panel.classList.toggle("is-open", open);
  panel.classList.toggle("is-expanded", expanded);
  panel.setAttribute("aria-hidden", String(!open));
  panel.inert = !open;
  if (modal) {
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
  } else {
    panel.removeAttribute("role");
    panel.removeAttribute("aria-modal");
  }
  $("surface-backdrop").hidden = !modal;
  tab.setAttribute("aria-selected", String(open));
  for (const root of [sidebar, chat]) {
    if (!root) continue;
    root.inert = modal;
    root.setAttribute("aria-hidden", String(modal));
  }
  const expandButton = $("surface-expand-button");
  if (expandButton) {
    const label = expanded ? (surfaceOverlayQuery.matches ? "Restore work surface" : "Return to chat") : "Expand work surface";
    expandButton.textContent = label;
    expandButton.setAttribute("aria-label", label);
    expandButton.setAttribute("aria-expanded", String(expanded));
  }
  // Closing remains available from both split and expanded layouts. In
  // expanded mode it closes the surface and returns focus to its show trigger;
  // the expand control remains the layout-only return action.
  $("close-surface-button").hidden = false;
  $("show-surface-button").hidden = open;
  // Enter the sheet synchronously. Loading content must never reclaim focus.
  // A native dialog above us retains its own focus and Escape handling.
  if (modal && !wasModal && !document.querySelector("dialog[open]") && !panel.contains(document.activeElement)) {
    $("surface-preview-tab")?.focus();
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
    content.append(element("div", { className: "empty-state compact" },
      element("h3", { text: "No work surface" }),
      element("p", { text: "Choose a session to load its local renderer slot." })));
    return;
  }
  const binding = currentSession().extensionBinding;
  if (!info?.extension && binding?.extensionId) {
    const loading = Boolean(state.surface.fetchController);
    content.append(element("div", { className: "empty-state compact" },
      element("h3", { text: loading ? "Loading preview" : "Preview not loaded yet" }),
      element("p", { text: `This session is bound to ${binding.extensionId}; the preview has not returned its current projection.` })));
    return;
  }
  if (!info?.extension) {
    content.append(element("div", { className: "empty-state compact" },
      element("h3", { text: "No extension bound" }),
      element("p", { text: "Bind a loaded extension to this session from Runtime setup." })));
    return;
  }
  const card = element("div", { className: "surface-card" });
  const statuses = element("div", { className: "surface-status" });
  statuses.append(element("span", { className: `extension-status ${info.extension.status || ""}`, text: info.extension.status || "unknown" }));
  statuses.append(element("span", { className: "run-badge", text: `generation ${info.extension.generation ?? "?"}` }));
  card.append(statuses, element("h3", { text: info.extension.title || info.extension.id || "Extension workspace" }));
  const projection = state.surface.projection;
  if (projection === null || projection === undefined) {
    card.append(element("p", { className: "surface-note", text: "No read-only projection is available yet." }));
  } else {
    const actions = Array.isArray(projection.humanActions) ? projection.humanActions : [];
    if (actions.length) {
      const block = element("section", { className: "surface-block" });
      block.append(element("h4", { text: "Available actions" }));
      const list = element("div", { className: "action-list" });
      for (const action of actions) {
        const item = element("div", { className: "action-item" });
        item.append(element("p", { className: "action-label", text: action.label || action.action || "Action" }));
        const button = element("button", { className: "secondary-button", attrs: { type: "button" }, text: "Run action" });
        button.addEventListener("click", () => void dispatchSurfaceAction(action.action, action.payload || {}));
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
      item.append(element("span", { className: "projection-key", text: key }), element("span", { className: "projection-value", text: renderProjectionValue(value) }));
      list.append(item);
    }
    if (!list.childElementCount) list.append(element("p", { className: "surface-note", text: "Projection is empty." }));
    block.append(list);
    card.append(block);
  }
  content.append(card);
}

async function dispatchSurfaceAction(action, payload, context = state.surface.context) {
  if (!guardForSurface(context) || !state.surface.info?.extension) throw new Error("This work surface is no longer active.");
  const { sessionId, extensionId, generation } = context;
  const rendererController = state.surface.controller;
  invalidateSurfaceFetches();
  const result = await request(`/sessions/${encodeURIComponent(sessionId)}/actions`, {
    method: "POST",
    body: { extensionId, generation, action, payload },
    signal: rendererController?.signal,
  });
  if (!guardForSurface(context)) throw new Error("The work surface changed before the action completed.");
  invalidateSurfaceFetches();
  if (result.projection !== undefined) {
    if (projectionsEqual(state.surface.projection, result.projection)) return result;
    if (!guardForSurface(context)) throw new Error("The work surface changed before the projection update.");
    state.surface.projection = result.projection;
    const mounted = state.surface.mounted;
    if (mounted?.update) {
      if (!guardForSurface(context)) throw new Error("The work surface changed before the projection update.");
      try { await mounted.update(result.projection); } catch {
        if (guardForSurface(context)) {
          const failedOwnedContainer = state.surface.ownedContainer;
          const failedFetchRequestId = state.surface.fetchRequestId;
          if (state.surface.mounted === mounted) state.surface.mounted = null;
          state.surface.module = null;
          detachOwnedSurfaceContainer(failedOwnedContainer);
          try { await mounted.dispose?.(); } catch { /* failed renderer cleanup */ }
          if (
            guardForSurface(context) &&
            state.surface.fetchRequestId === failedFetchRequestId &&
            state.surface.ownedContainer === null
          ) renderSurfaceFallback();
        }
      }
    } else if (guardForSurface(context)) renderSurfaceFallback();
  } else {
    await loadSurface(context.epoch);
  }
  return result;
}

async function loadSurface(epoch) {
  if (!state.surface.open || !state.activeSessionId || epoch !== state.sessionEpoch) return;
  const sessionId = state.activeSessionId;
  const fetchRequestId = state.surface.fetchRequestId + 1;
  state.surface.fetchRequestId = fetchRequestId;
  state.surface.fetchController?.abort();
  const fetchController = new AbortController();
  state.surface.fetchController = fetchController;
  try {
    const result = await request(`/sessions/${encodeURIComponent(sessionId)}/surface`, { signal: fetchController.signal });
    if (!guardForSurfaceFetch({ epoch, sessionId, fetchRequestId, controller: fetchController })) return;
    const extensionRecord = result.extension || null;
    const catalogRecord = extensionRecord ? state.extensions.find((item) => item.id === extensionRecord.id) : null;
    const extension = extensionRecord ? { ...catalogRecord, ...extensionRecord, surface: extensionRecord.surface || catalogRecord?.surface } : null;
    const nextIdentity = surfaceIdentityFromExtension(extension, sessionId);
    const currentContext = state.surface.context;
    const identityUnchanged = Boolean(
      currentContext &&
      currentContext.epoch === epoch &&
      currentContext.sessionId === sessionId &&
      sameSurfaceIdentity(currentContext, nextIdentity),
    );

    if (identityUnchanged && state.surface.mounted?.update) {
      if (!guardForSurfaceFetch({ epoch, sessionId, fetchRequestId, controller: fetchController }) || !guardForSurface(currentContext)) return;
      const previousProjection = state.surface.projection;
      state.surface.info = { ...result, extension };
      state.surface.projection = result.projection ?? null;
      $("surface-title").textContent = extension?.title || extension?.id || "Work surface";
      if (!projectionsEqual(previousProjection, state.surface.projection)) {
        if (!guardForSurfaceFetch({ epoch, sessionId, fetchRequestId, controller: fetchController }) || !guardForSurface(currentContext)) return;
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
            try { await failedMount?.dispose?.(); } catch { /* failed renderer cleanup */ }
            if (
              guardForSurfaceFetch({ epoch, sessionId, fetchRequestId: failedFetchRequestId, controller: fetchController }) &&
              guardForSurface(currentContext) &&
              state.surface.ownedContainer === null
            ) renderSurfaceFallback();
          }
        }
      }
      return;
    }

    await disposeSurfaceRenderer({ abortFetch: false });
    if (!guardForSurfaceFetch({ epoch, sessionId, fetchRequestId, controller: fetchController })) return;
    const requestId = state.surface.requestId + 1;
    state.surface.requestId = requestId;
    const rendererController = new AbortController();
    state.surface.controller = rendererController;
    const context = extension ? {
      ...nextIdentity,
      requestId,
      epoch,
    } : null;
    state.surface.context = context;
    state.surface.info = { ...result, extension };
    state.surface.projection = result.projection ?? null;
    $("surface-title").textContent = extension?.title || extension?.id || "Work surface";
    renderSurfaceFallback();
    const modulePath = nextIdentity?.modulePath || null;
    if (!modulePath || !extension || extension.status !== "loaded") return;
    const moduleUrl = new URL(modulePath, window.location.origin);
    if (moduleUrl.origin !== window.location.origin || !moduleUrl.pathname.startsWith("/extensions/")) {
      throw new Error("Renderer path is outside the local extension allowlist.");
    }
    const rendererModule = await import(moduleUrl.href);
    if (!guardForSurfaceFetch({ epoch, sessionId, fetchRequestId, controller: fetchController }) || !guardForSurface(context) || rendererController.signal.aborted) return;
    const mount = rendererModule.mount || rendererModule.default?.mount;
    if (typeof mount !== "function") throw new Error("Renderer module does not export mount().");
    const container = $("surface-content");
    clear(container);
    const ownedContainer = element("div", { className: "surface-renderer-host" });
    container.append(ownedContainer);
    state.surface.ownedContainer = ownedContainer;
    const mounted = await mount({
      container: ownedContainer,
      projection: state.surface.projection,
      dispatch: (action, payload) => dispatchSurfaceAction(action, payload, context),
      signal: rendererController.signal,
    });
    if (!guardForSurfaceFetch({ epoch, sessionId, fetchRequestId, controller: fetchController }) || !guardForSurface(context) || rendererController.signal.aborted) {
      detachOwnedSurfaceContainer(ownedContainer);
      try { await mounted?.dispose?.(); } catch { /* stale renderer */ }
      return;
    }
    state.surface.module = rendererModule;
    state.surface.mounted = mounted || {};
  } catch (error) {
    if (error?.name === "AbortError" || !guardForSurfaceFetch({ epoch, sessionId, fetchRequestId, controller: fetchController })) return;
    if (!state.surface.mounted) {
      detachOwnedSurfaceContainer(state.surface.ownedContainer);
      renderSurfaceFallback();
      $("surface-content").prepend(element("div", { className: "renderer-error", text: `Renderer unavailable: ${error.message}` }));
    }
  } finally {
    if (state.surface.fetchController === fetchController) state.surface.fetchController = null;
  }
}

function clearSubmittedDraft(operation) {
  const { sessionId, input, revision } = operation;
  if (draftRevision(sessionId) !== revision || state.draftCache.get(sessionId) !== input) return false;
  state.draftCache.set(sessionId, "");
  state.draftDirty.delete(sessionId);
  if (state.activeSessionId === sessionId && state.session?.id === sessionId) state.session.draft = "";
  return true;
}

function isUncertainCommandError(error) {
  return !Number.isFinite(error?.status) || error.status >= 500;
}

async function submitRun(event) {
  event.preventDefault();
  const session = currentSession();
  if (!session || currentRun() || state.pendingRuns.has(session.id)) return;
  if (state.connectionLost) {
    // WS-12: the connection-lost guard applies to every send entry point —
    // Enter and a Send click both reach this same function (the form's
    // "submit" listener and requestSubmit() below), so there is no separate
    // Enter-specific branch to guard. Return before establishing a pending
    // fact; the draft is untouched (left exactly as typed).
    setTransientFeedback(session.id, nextOperationId("run-blocked"), "run", "Connection lost — not sent");
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
  const operation = { operationId: nextOperationId("run"), sessionId, input, revision };
  // This is the command fact. It must exist before draft persistence or POST
  // admission awaits so refreshes cannot create a second request.
  state.pendingRuns.set(sessionId, operation);
  renderComposer();

  const attemptFocusHandoff = () => guardHandoffFocus(focusTicket, {
    isTargetActive: () => state.activeSessionId === sessionId,
    targetControl: textarea,
    // A mouse click on Send moves the browser's focus to the button before
    // this handler ever runs; that is part of the send intent, not the user
    // moving on, so the composer form's own controls (textarea, Send,
    // Cancel) all count as "still inside this intent" for the secondary
    // activeElement check below.
    intentContainer: $("composer-form"),
    perform: () => { if (document.activeElement !== textarea) textarea.focus(); },
  });

  try {
    const pendingTimer = state.draftTimers.get(sessionId);
    if (pendingTimer) window.clearTimeout(pendingTimer);
    state.draftTimers.delete(sessionId);
    state.draftCache.set(sessionId, input);
    state.draftDirty.add(sessionId);
    await persistDraftForSession(sessionId, { revision, text: input });
    if (state.pendingRuns.get(sessionId) !== operation) return;
    const result = await request(`/sessions/${encodeURIComponent(sessionId)}/runs`, { method: "POST", body: { input } });
    if (state.pendingRuns.get(sessionId) !== operation) return;
    state.pendingRuns.delete(sessionId);
    if (state.activeSessionId === sessionId && result.run?.id) mergeRun(result.run, { sessionId, preserveStatus: true });
    const cleared = clearSubmittedDraft(operation);
    // WS-08: storage does not depend on which session is active — write the
    // outcome into this session's own feedback bucket regardless, so a
    // backgrounded session's confirmation/problem is not lost. Only the
    // chat re-render and focus handoff below are scoped to the active
    // session, since those affect what is currently on screen.
    clearPersistentFeedback(sessionId, "run");
    setTransientFeedback(sessionId, operation.operationId, "run", cleared ? "Sent." : "Run admitted; newer draft kept.");
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
    if (draftRevision(sessionId) === revision && state.draftCache.get(sessionId) === input) state.draftDirty.add(sessionId);
    const copy = describeCommandError("run", error);
    setPersistentFeedback(sessionId, operation.operationId, "run", copy.text, { nextAction: copy.nextAction });
    if (state.activeSessionId === sessionId) {
      renderComposer();
      attemptFocusHandoff();
    }
  } finally {
    if (state.pendingRuns.get(sessionId) === operation) state.pendingRuns.delete(sessionId);
    if (state.activeSessionId === sessionId) renderComposer();
  }
}

async function cancelCurrentRun() {
  const session = currentSession();
  const run = currentRun();
  if (!session || !run || state.pendingCancels.has(run.id)) return;
  const sessionId = session.id;
  const operation = { operationId: nextOperationId("cancel"), sessionId, runId: run.id };
  state.pendingCancels.set(run.id, operation);
  renderComposer();
  try {
    const result = await request(`/runs/${encodeURIComponent(run.id)}/cancel`, { method: "POST", body: {} });
    if (state.pendingCancels.get(run.id) !== operation) return;
    state.pendingCancels.delete(run.id);
    const activeTarget = state.activeSessionId === sessionId && currentRun()?.id === run.id;
    if (activeTarget && result.run?.id === run.id) mergeRun(result.run, { sessionId });
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
    setPersistentFeedback(sessionId, operation.operationId, "cancel", copy.text, { nextAction: copy.nextAction });
    if (state.activeSessionId === sessionId) {
      renderComposer();
    }
  } finally {
    if (state.pendingCancels.get(run.id) === operation) state.pendingCancels.delete(run.id);
    if (state.activeSessionId === sessionId) renderComposer();
  }
}

function openDialog(dialogId, inputId) {
  const dialog = $(dialogId);
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
  const trigger = $("runtime-setup-button");
  state.runtimeDialogReturnFocus = trigger;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  $("close-runtime-button")?.focus();
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
  if (event.defaultPrevented || document.querySelector("dialog[open]")) return;
  if (event.key === "Escape") {
    if (!state.surface.open) return;
    if (state.surface.expanded) {
      event.preventDefault();
      setSurfaceExpanded(false);
    } else if (surfaceOverlayQuery.matches) {
      event.preventDefault();
      closeSurface();
    }
    return;
  }
  if (event.key !== "Tab" || !surfaceIsModal()) return;
  const panel = $("surface-panel");
  const controls = [...panel.querySelectorAll("button, a[href], input, select, textarea, summary, [tabindex], [contenteditable=true]")]
    .filter((control) => control.tabIndex >= 0 && !control.matches(":disabled") && !control.closest("[inert]") && control.getClientRects().length && getComputedStyle(control).visibility !== "hidden");
  const first = controls[0];
  const last = controls.at(-1);
  if (!first) return;
  const active = document.activeElement;
  if (!panel.contains(active) || (event.shiftKey ? active === first : active === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}

async function createProject(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    closeDialog("project-dialog");
    return;
  }
  const input = $("project-name-input");
  const name = input.value.trim();
  if (!name) return;
  try {
    const result = await request("/projects", { method: "POST", body: { name } });
    closeDialog("project-dialog");
    input.value = "";
    await loadProjects();
    if (result.project?.id) await selectProject(result.project.id);
  } catch (error) {
    showToast(`Project was not created: ${error.message}`, "error");
  }
}

async function createSession(event) {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    closeDialog("session-dialog");
    return;
  }
  const projectId = state.activeProjectId;
  if (!projectId) {
    closeDialog("session-dialog");
    showToast("Choose a project first.", "error");
    return;
  }
  const input = $("session-title-input");
  const title = input.value.trim() || "Untitled session";
  try {
    const result = await request("/sessions", { method: "POST", body: { projectId, title } });
    closeDialog("session-dialog");
    input.value = "";
    const sessions = state.sessionsByProject.get(projectId) || [];
    if (result.session) state.sessionsByProject.set(projectId, [...sessions, result.session]);
    renderProjectList();
    if (result.session?.id) await selectSession(result.session.id);
  } catch (error) {
    showToast(`Session was not created: ${error.message}`, "error");
  }
}

function wireEvents() {
  // WS-12: the recovery probe (see scheduleRecoveryProbe above) must stop
  // when the page goes away, not just on recovery.
  window.addEventListener("beforeunload", stopRecoveryProbe);
  $("new-project-button").addEventListener("click", () => openDialog("project-dialog", "project-name-input"));
  $("new-session-button").addEventListener("click", () => {
    if (!state.activeProjectId) showToast("Choose or create a project first.", "error");
    else openDialog("session-dialog", "session-title-input");
  });
  $("refresh-button").addEventListener("click", async () => {
    try {
      await refreshNavigationAndSession();
      await loadExtensions();
      await loadProviderConfig();
      showToast("Workspace refreshed.");
    } catch (error) {
      showToast(`Refresh failed: ${error.message}`, "error");
    }
  });
  $("runtime-setup-button").addEventListener("click", openRuntimeDialog);
  $("close-runtime-button").addEventListener("click", closeRuntimeDialog);
  $("runtime-dialog").addEventListener("close", () => {
    const trigger = state.runtimeDialogReturnFocus;
    state.runtimeDialogReturnFocus = null;
    trigger?.focus?.();
  });
  document.addEventListener("keydown", handleSurfaceEscape);
  for (const dialog of document.querySelectorAll("dialog")) {
    dialog.addEventListener("close", () => {
      if (surfaceIsModal() && !document.querySelector("dialog[open]") && !$("surface-panel").contains(document.activeElement)) {
        $("surface-preview-tab")?.focus();
      }
    });
  }
  $("refresh-extensions-button").addEventListener("click", () => void loadExtensions().catch((error) => showToast(error.message, "error")));
  $("close-surface-button").addEventListener("click", closeSurface);
  $("surface-backdrop").addEventListener("click", closeSurface);
  surfaceOverlayQuery.addEventListener("change", renderSurfaceVisibility);
  $("show-surface-button").addEventListener("click", () => {
    state.surface.expanded = false;
    state.surface.open = true;
    writeUiState();
    renderSurfaceVisibility();
    $("surface-preview-tab")?.focus();
    void loadSurface(state.sessionEpoch);
  });
  $("surface-expand-button").addEventListener("click", () => setSurfaceExpanded(!state.surface.expanded));
  $("surface-preview-tab").addEventListener("click", () => {
    if (!state.surface.open) {
      state.surface.open = true;
      writeUiState();
      renderSurfaceVisibility();
    }
    $("surface-preview-tab")?.focus();
  });
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
  $("jump-latest-button").addEventListener("click", () => scrollToLatestMessage());
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
  $("cancel-run-button").addEventListener("click", () => void cancelCurrentRun());
  $("composer-input").addEventListener("compositionstart", () => { $("composer-input").dataset.composing = "true"; });
  $("composer-input").addEventListener("compositionend", () => { delete $("composer-input").dataset.composing; });
  $("composer-input").addEventListener("input", () => {
    const session = currentSession();
    if (!session) return;
    state.draftCache.set(session.id, $("composer-input").value);
    state.draftRevisions.set(session.id, draftRevision(session.id) + 1);
    state.draftDirty.add(session.id);
    scheduleDraftSave();
  });
  $("composer-input").addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing || event.currentTarget.dataset.composing === "true") return;
    event.preventDefault();
    $("composer-form").requestSubmit();
  });
  $("project-form").addEventListener("submit", createProject);
  $("session-form").addEventListener("submit", createSession);
}

async function init() {
  const savedUi = readUiState();
  state.activeProjectId = typeof savedUi.activeProjectId === "string" ? savedUi.activeProjectId : null;
  state.restoreSessionId = typeof savedUi.activeSessionId === "string" ? savedUi.activeSessionId : null;
  state.openProjectIds = new Set(Array.isArray(savedUi.openProjectIds) ? savedUi.openProjectIds.filter((id) => typeof id === "string") : []);
  state.surface.open = savedUi.surfaceOpen !== false;
  wireEvents();
  renderAll();
  try {
    const bootstrap = await request("/bootstrap");
    state.token = bootstrap.sessionToken || null;
    state.capabilities = bootstrap.capabilities || null;
    state.adapterId = bootstrap.adapterId || null;
    $("capability-badge").textContent = state.capabilities?.realProvider === false ? "Local fake" : "Runtime";
    await Promise.all([loadProjects(), loadExtensions(), loadProviderConfig()]);
    await restoreUiSelection();
    renderAll();
  } catch (error) {
    $("capability-badge").textContent = "Runtime unavailable";
    showToast(`Could not start workspace: ${error.message}`, "error");
    const stream = $("message-stream");
    clear(stream);
    stream.append(element("div", { className: "empty-state" },
      element("h3", { text: "Runtime unavailable" }),
      element("p", { text: error.message })));
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
