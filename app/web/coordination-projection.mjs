/* WO-MA2-02 · The only place in app/web that knows the shape of the
 * `/coordination` Thread contract (`app/docs/coordination.md`).
 *
 * It follows the adapter rules already written down in
 * `presentation-adapters.mjs`, and adds nothing to them:
 *
 *   1. Pure. No fetch, no cache, no Date.now(), no ordering of its own. The
 *      mailbox is published in the RuntimeStore transaction order and is passed
 *      through in exactly that order; this module never re-sorts it and never
 *      computes "how long ago".
 *   2. A missing fact is an explicit null, never 0 and never "". An undelivered
 *      message has `deliveredAt: null`, not an empty string.
 *   3. A shape this module does not recognise yields `null` — the caller shows
 *      the unsupported-payload message instead of half a Thread.
 *
 * MA2-D10: Thread messages are NOT folded into `thread-projection.mjs`'s row
 * model. They are not in `state.events`, and the contract requires delivery to
 * be shown separately from a Run or a Core acceptance. Membership shares an
 * inbox; it does not import the members' model transcripts.
 */

/** Server page ceiling for mailboxes and model directories (contract §Identity). */
export const MAILBOX_PAGE = 20;
/** Delivery settlements, in the server's own words. Never re-worded here. */
export const MESSAGE_STATUSES = ["queued", "delivered", "stale_target", "target_unavailable"];
const MESSAGE_KINDS = ["request", "signal", "reply", "result"];
const THREAD_STATUSES = ["open", "closed"];

const text = (value, max = 200) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const nullableText = (value) => value === null || (typeof value === "string" && value.length > 0);
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const object = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** `{kind,projectId,matterId}` exactly as `harness/coordination-state.mjs` captures it. */
function projectScope(scope) {
  if (!object(scope)) return null;
  if (!["global", "project"].includes(scope.kind)) return null;
  if (!(scope.projectId === null || text(scope.projectId, 100))) return null;
  if (!(scope.matterId === null || text(scope.matterId))) return null;
  return { kind: scope.kind, projectId: scope.projectId, matterId: scope.matterId };
}

/** Scope equality is the server's own binding rule, restated for option lists only. */
export const sameScope = (a, b) =>
  Boolean(a) && Boolean(b) && a.kind === b.kind && a.projectId === b.projectId && a.matterId === b.matterId;

/* `available` is derived per read: `list()` and `mailbox()` attach it, while the
 * `POST` receipts return the stored record and carry no such field. So it is
 * required where the payload publishes it and is an explicit null where the
 * payload does not — never a guessed `false`, which would read as "closed". */
function projectThreadRecord(thread, { requireAvailability = true } = {}) {
  if (!object(thread)) return null;
  if (!text(thread.id) || !text(thread.title)) return null;
  const scope = projectScope(thread.scope);
  if (!scope) return null;
  if (!Array.isArray(thread.sessionIds) || !thread.sessionIds.every((id) => text(id))) return null;
  if (!Number.isSafeInteger(thread.revision) || thread.revision < 1) return null;
  if (!THREAD_STATUSES.includes(thread.status)) return null;
  const availability = typeof thread.available === "boolean" ? thread.available : null;
  if (requireAvailability && availability === null) return null;
  if (!text(thread.createdAt)) return null;
  // The creation receipt is what lets a retried creation be recognised as the
  // same creation rather than a second one; it is part of the shape, not decor.
  if (!object(thread.creation) || !text(thread.creation.sessionId) || !text(thread.creation.title)) return null;
  return {
    id: thread.id,
    creation: { sessionId: thread.creation.sessionId, title: thread.creation.title },
    title: thread.title,
    scope,
    sessionIds: [...thread.sessionIds],
    revision: thread.revision,
    status: thread.status,
    available: availability,
    createdAt: thread.createdAt,
  };
}

/**
 * `GET /coordination` → the directory this surface is allowed to choose from.
 * Capabilities are passed through verbatim: `explore/handoff/workflow` are
 * false today and the view must not claim otherwise (MA2-D03).
 */
export function projectDirectory(payload) {
  if (!object(payload) || payload.schemaVersion !== 1) return null;
  if (!Array.isArray(payload.threads)) return null;
  const threads = [];
  for (const thread of payload.threads) {
    const projected = projectThreadRecord(thread);
    if (!projected) return null;
    threads.push(projected);
  }
  if (new Set(threads.map((t) => t.id)).size !== threads.length) return null;
  if (!(payload.currentThreadId === null || text(payload.currentThreadId))) return null;
  if (payload.currentThreadId !== null && !threads.some((t) => t.id === payload.currentThreadId)) return null;
  const capabilities = payload.capabilities;
  if (!object(capabilities)) return null;
  for (const name of ["message", "explore", "handoff", "workflow"])
    if (typeof capabilities[name] !== "boolean") return null;
  return {
    threads,
    currentThreadId: payload.currentThreadId,
    capabilities: {
      message: capabilities.message,
      explore: capabilities.explore,
      handoff: capabilities.handoff,
      workflow: capabilities.workflow,
    },
  };
}

/**
 * `POST /coordination/threads` and `.../attach` → `{schemaVersion:1,thread}`.
 * The same validator as the directory's rows: a receipt that does not carry a
 * Thread this surface recognises is not a receipt.
 */
export function projectThreadReceipt(payload) {
  if (!object(payload) || payload.schemaVersion !== 1) return null;
  return projectThreadRecord(payload.thread, { requireAvailability: false });
}

/**
 * `POST /coordination/messages` → `{schemaVersion:1,message}`. The settlement is
 * kept in the server's own word; `sentThreadId` is the sender's own Thread, so
 * direction is read the same way here as it is in the mailbox.
 */
export function projectMessageReceipt(payload, sourceThreadId) {
  if (!object(payload) || payload.schemaVersion !== 1) return null;
  return projectMessage(payload.message, sourceThreadId);
}

/**
 * `GET /sessions` → the source conversations a human may pick explicitly.
 * The Thread scope of a Session is derived exactly the way the server derives
 * it (`sessionScope`), so an option list can never offer a binding the server
 * would then refuse for a different reason than the one shown.
 */
export function projectSessionOptions(payload) {
  if (!object(payload) || !Array.isArray(payload.sessions)) return null;
  const sessions = [];
  for (const session of payload.sessions) {
    if (!object(session) || !text(session.id)) return null;
    if (!["global", "project"].includes(session.scope)) return null;
    if (!(session.projectId === null || session.projectId === undefined || text(session.projectId, 100))) return null;
    const binding = session.extensionBinding;
    if (!(binding === null || binding === undefined || object(binding))) return null;
    sessions.push({
      id: session.id,
      // A conversation the server never titled has no title. Not "".
      title: text(session.title) ? session.title : null,
      scope: {
        kind: session.scope,
        projectId: session.projectId ?? null,
        matterId: binding?.binding?.matterId ?? null,
      },
    });
  }
  if (new Set(sessions.map((s) => s.id)).size !== sessions.length) return null;
  return sessions;
}

/**
 * `GET /coordination/threads/:id?offset=&limit=` → one Thread's mailbox page.
 *
 * `viewedThreadId` is the Thread whose inbox is on screen; direction is read
 * off the message's own source/target, not off the sender's identity. A message
 * that belongs to neither side of this Thread is an unrecognised shape.
 */
export function projectMailbox(payload, viewedThreadId) {
  if (!object(payload) || payload.schemaVersion !== 1) return null;
  if (payload.authority !== "communication-only") return null;
  const thread = projectThreadRecord(payload.thread);
  if (!thread || thread.id !== viewedThreadId) return null;
  if (!Array.isArray(payload.messages)) return null;
  if (!count(payload.offset) || !count(payload.total)) return null;
  if (!(payload.nextOffset === null || count(payload.nextOffset))) return null;
  // Page bounds. The server's ceiling is 20 per page and pagination is stable
  // over an append-only mailbox, so a page can never exceed the ceiling, can
  // never run past the reported total, and a next cursor must land inside it.
  if (payload.messages.length > MAILBOX_PAGE) return null;
  if (payload.offset + payload.messages.length > payload.total) return null;
  if (payload.nextOffset !== null
    && (payload.nextOffset !== payload.offset + payload.messages.length || payload.nextOffset >= payload.total))
    return null;
  const messages = [];
  for (const message of payload.messages) {
    const projected = projectMessage(message, viewedThreadId);
    if (!projected) return null;
    messages.push(projected);
  }
  return {
    thread,
    offset: payload.offset,
    total: payload.total,
    nextOffset: payload.nextOffset,
    previousOffset: payload.offset > 0 ? Math.max(0, payload.offset - MAILBOX_PAGE) : null,
    messages,
  };
}

function projectMessage(message, viewedThreadId) {
  if (!object(message)) return null;
  if (!text(message.id) || !text(message.sourceThreadId) || !text(message.targetThreadId)) return null;
  if (!text(message.sourceSessionId)) return null;
  if (!MESSAGE_KINDS.includes(message.kind)) return null;
  if (!MESSAGE_STATUSES.includes(message.status)) return null;
  if (typeof message.text !== "string" || message.text.length > 16000) return null;
  if (!["human", "runtime"].includes(message.actor)) return null;
  if (!Number.isSafeInteger(message.revision) || message.revision < 1) return null;
  if (!text(message.createdAt)) return null;
  if (!nullableText(message.deliveredAt)) return null;
  if (!nullableText(message.replyTo)) return null;
  if ((message.kind === "reply") !== (message.replyTo !== null)) return null;
  if (!nullableText(message.sourceRunId) || !nullableText(message.sourceCallId)) return null;
  const outgoing = message.sourceThreadId === viewedThreadId;
  const incoming = message.targetThreadId === viewedThreadId;
  if (outgoing === incoming) return null;
  return {
    id: message.id,
    direction: outgoing ? "outgoing" : "incoming",
    otherThreadId: outgoing ? message.targetThreadId : message.sourceThreadId,
    kind: message.kind,
    // The server's own settlement word. Delivery is not execution and not a
    // Core acceptance; the view states that in words next to this value.
    status: message.status,
    text: message.text,
    actor: message.actor,
    createdAt: message.createdAt,
    // Undelivered is an explicit absence, not an empty time.
    deliveredAt: message.deliveredAt,
    sourceRunId: message.sourceRunId,
    replyTo: message.replyTo,
  };
}

/* ---- Option lists. Rearrangement of already-validated facts, nothing new. ---- */

/** The Thread this Session is a member of at its current scope, or null. */
export const currentThreadFor = (threads, session) =>
  session ? threads.find((t) => t.sessionIds.includes(session.id) && sameScope(t.scope, session.scope)) ?? null : null;

/** Open, same-scope Threads a Session may still be attached to. */
export const attachableThreads = (threads, session) =>
  session ? threads.filter((t) => t.status === "open" && sameScope(t.scope, session.scope) && !t.sessionIds.includes(session.id)) : [];

/** Available Threads other than the sender's own. Cross-scope human sends are allowed. */
export const messageTargets = (threads, currentThreadId) =>
  threads.filter((t) => t.available && t.id !== currentThreadId);
