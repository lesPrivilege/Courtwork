/* Settings → Agents → Runtimes · the journey's state, without a DOM.
 *
 * One controller owns "which runtime am I looking at, what has its owner
 * confirmed, what have I asked for, and what happened to each command I sent".
 * It holds no facts of its own: availability, ownership, connection, admission,
 * bound runs and action support all come from the adapter's last reply. The
 * adapter is the whole seam — no `fetch`, storage, clock or `document` here —
 * so the same controller runs under the synthetic preview and, later, under a
 * production adapter once the owners expose these facts.
 *
 * The same guards as agent-profiles.mjs (06a), plus the ones a command needs
 * that a save did not:
 *   - **one operation per runtime.** A command carries an operation id minted
 *     once per press. While it is pending, or its outcome is unknown, nothing
 *     else may change that runtime — a second effect would land beside one
 *     nobody can see. A second click sends nothing.
 *   - **unknown is not failed.** An error is a settled refusal only when it
 *     carries a listed code (home-preparation.mjs `uncertainFailure`, the same
 *     fail-closed rule). Anything else — a lost reply, a dropped connection —
 *     leaves the outcome unknown, and the only way on is to ask the owner about
 *     that operation id. Nothing is resent.
 *   - **leaving is not cancelling.** Navigating away does not abort or forget a
 *     command already sent. Its reply is recorded against its own runtime and
 *     never lands on the page of another one.
 *   - **saved, effective and bound stay apart.** Disabling changes the next
 *     admission. A Run keeps the binding it recorded; the page says so and
 *     implies no cancel, migration or queue.
 */

const clone = (value) => structuredClone(value);

/* Owner answers that mean "nothing changed, and here is why". Anything else is
 * not proof of that. */
export const SETTLED_REFUSALS = new Set([
  "runtime_conflict",
  "action_unsupported",
  "connect_refused",
  "runtime_missing",
  "operation_closed",
]);

export function isSettledRefusal(error) {
  return typeof error?.code === "string" && SETTLED_REFUSALS.has(error.code);
}

const CONFIGURING = new Set(["connect", "reconnect"]);

/* Read-back states that settle a confirmed command. `done`: the owner's
 * reading is at the receipt's revision and agrees with it. `newer`: the
 * reading is at a later revision, which may legitimately describe a later
 * connection; the receipt is kept beside it. Anything else — `reading`,
 * `stale` (older than the receipt), `inconsistent` (another runtime, or the
 * receipt's revision with other connection facts), `failed`, `deferred` —
 * keeps changes locked. */
const SETTLED_READ_BACK = new Set(["done", "newer"]);

export function readBackOf(receipt, detail) {
  if (detail.id !== receipt.runtimeId) return "inconsistent";
  if (detail.revision < receipt.revision) return "stale";
  if (detail.revision > receipt.revision) return "newer";
  return detail.connection.connectionId === receipt.connectionId ? "done" : "inconsistent";
}

const KIND_WORDS = {
  connect: "connect",
  reconnect: "reconnect",
  disable: "disable for new work",
  enable: "enable for new work",
  disconnect: "disconnect",
};

/* Short, because it is said beside each locked action; the command status
 * above says the whole of it once. */
export const UNKNOWN_OUTCOME_REASON = "Locked until Check status settles the last command.";

function draftFrom(detail) {
  const saved = detail.connection.configuration;
  return saved
    ? { label: saved.label, credentialRefId: saved.credentialRefId }
    : { label: detail.proposal.defaultLabel, credentialRefId: null };
}

function sameDraft(a, b) {
  return a.label === b.label && a.credentialRefId === b.credentialRefId;
}

export function createRuntimeManagementController({
  adapter,
  createOperationId = () => globalThis.crypto.randomUUID(),
}) {
  const listeners = new Set();
  /* Unsaved connection input, per runtime, kept across leaving and returning
     and across every command that does not consume it. */
  const drafts = new Map();
  /* The latest command per runtime, whatever page is on screen. */
  const operations = new Map();
  let view = "list";
  let anchorId = null;
  let list = { status: "idle", rows: [], error: "" };
  let page = null;
  /* One epoch per read surface: a reply applies only when it is the newest
     read *and* still belongs to what is on screen. Commands are not guarded by
     an epoch — their replies are facts about their own runtime and are always
     recorded — only by which page they may touch. */
  let listEpoch = 0;
  let pageEpoch = 0;

  const emit = () => {
    const state = getState();
    for (const listener of listeners) listener(state);
  };

  function getState() {
    return clone({
      view,
      anchorId,
      list,
      page,
      operations: Object.fromEntries(operations),
      capabilities: adapter.capabilities(),
    });
  }

  function operationBlocks(id) {
    const operation = operations.get(id);
    if (!operation) return null;
    if (operation.status === "pending")
      return `Locked while the command to ${KIND_WORDS[operation.kind]} is in progress.`;
    if (operation.status === "unknown" || operation.status === "checking") return UNKNOWN_OUTCOME_REASON;
    if (operation.status === "conflict") return "Locked until this runtime is reloaded.";
    /* Between a confirmed reply and an adequate owner reading the page still
       shows values from before the command; a command composed against them
       would only be refused as stale, or worse, act on a picture that is no
       longer true. */
    if (operation.status === "confirmed" && operation.readBack === "reading")
      return "Locked while the last result is read back.";
    if (operation.status === "confirmed" && !SETTLED_READ_BACK.has(operation.readBack))
      return "Locked until a current reading confirms the last command.";
    return null;
  }

  function adopt(detail) {
    page.detail = detail;
    page.status = "ready";
    page.error = "";
    const kept = drafts.get(page.id);
    const seed = draftFrom(detail);
    /* A kept draft survives a reload; an option the owner no longer offers is
       dropped rather than sent. */
    page.draft = kept
      ? {
          label: kept.label,
          credentialRefId: detail.authentication.references.some((ref) => ref.id === kept.credentialRefId)
            ? kept.credentialRefId
            : seed.credentialRefId,
        }
      : seed;
    page.dirty = !sameDraft(page.draft, seed);
    if (page.dirty) drafts.set(page.id, clone(page.draft));
    else drafts.delete(page.id);
    /* Every reading of a runtime with an unsettled confirmed command is
       measured against that command's receipt; none is taken on trust. */
    const operation = operations.get(page.id);
    if (operation?.status === "confirmed" && !SETTLED_READ_BACK.has(operation.readBack))
      operation.readBack = readBackOf(operation.receipt, detail);
  }

  async function readPage(id) {
    const own = ++pageEpoch;
    try {
      const detail = await adapter.open(id);
      if (own !== pageEpoch || page?.id !== id) return false;
      adopt(detail);
      return true;
    } catch (error) {
      if (own !== pageEpoch || page?.id !== id) return false;
      page.status = "error";
      page.error = error.message;
      return false;
    }
  }

  /* A confirmed command is read back when its runtime is on screen; when the
     list is on screen the list is re-read instead, keeping its rows. Neither
     happens for a page that belongs to another runtime. */
  async function afterConfirmed(id) {
    const operation = operations.get(id);
    if (page?.id === id && view === "runtime") {
      operation.readBack = "reading";
      emit();
      await readPage(id);
      /* A successful read has already been measured by `adopt`; only a read
         that produced nothing leaves "reading" behind. */
      const current = operations.get(id);
      if (current === operation && current.readBack === "reading") current.readBack = "failed";
      emit();
      return;
    }
    operation.readBack = "deferred";
    emit();
    if (view === "list") void api.openList({ anchor: anchorId });
  }

  function settleConfirmed(id, operation, receipt) {
    operation.status = "confirmed";
    operation.receipt = receipt;
    operation.message = "";
    /* The draft that was sent is now the saved configuration. If it moved on
       while the command was out, it is still unsaved input and is kept. */
    if (CONFIGURING.has(operation.kind)) {
      const draft = drafts.get(id);
      if (!draft || sameDraft(draft, operation.configuration)) drafts.delete(id);
    }
    return afterConfirmed(id);
  }

  const api = {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      listener(getState());
      return () => listeners.delete(listener);
    },

    async openList({ anchor = anchorId } = {}) {
      const own = ++listEpoch;
      pageEpoch += 1;
      view = "list";
      anchorId = anchor;
      /* The previous reading stays on screen, marked as the previous reading,
         until this read answers (agent-profiles.mjs, same rule). */
      list = { status: "loading", rows: list.rows, error: "" };
      emit();
      try {
        const result = await adapter.list();
        if (own !== listEpoch) return;
        list = { status: "ready", rows: result.rows, error: "" };
      } catch (error) {
        if (own !== listEpoch) return;
        list = { status: "error", rows: list.rows, error: error.message };
      }
      emit();
    },

    async openRuntime(id) {
      listEpoch += 1;
      /* Reopening the runtime already on screen keeps its last reading visible
         while the reload is out; another runtime starts from nothing. */
      const carried = page?.id === id ? page.detail : null;
      view = "runtime";
      anchorId = id;
      page = {
        id,
        status: "loading",
        error: "",
        detail: carried,
        draft: carried ? page.draft : null,
        dirty: carried ? page.dirty : false,
        notice: "",
        confirming: null,
      };
      emit();
      await readPage(id);
      emit();
    },

    setDraft(field, value) {
      if (!page?.detail || !["label", "credentialRefId"].includes(field)) return;
      if (field === "credentialRefId" && !page.detail.authentication.references.some((ref) => ref.id === value)) return;
      page.draft = { ...page.draft, [field]: field === "label" ? String(value) : value };
      page.dirty = !sameDraft(page.draft, draftFrom(page.detail));
      if (page.dirty) drafts.set(page.id, clone(page.draft));
      else drafts.delete(page.id);
      /* Touching the draft makes a previous refusal about something else. An
         unknown outcome is not cleared: it is still unknown whatever you type. */
      const operation = operations.get(page.id);
      if (operation && ["refused", "not-applied"].includes(operation.status) && CONFIGURING.has(operation.kind))
        operations.delete(page.id);
      emit();
    },

    discardDraft() {
      if (!page?.detail || operations.get(page.id)?.status === "pending") return;
      drafts.delete(page.id);
      page.draft = draftFrom(page.detail);
      page.dirty = false;
      emit();
    },

    /** Whether `kind` can be sent now, and the reason when it cannot. The
     * owner's reason comes first when it has one, because it describes the
     * runtime; a lock describes this page. */
    availability(kind) {
      if (!page?.detail || page.status !== "ready") return { allowed: false, reason: null };
      const support = page.detail.actions[kind];
      if (!support) return { allowed: false, reason: null };
      if (!support.supported) return { allowed: false, reason: support.reason };
      const capabilities = adapter.capabilities();
      if (!capabilities.canManage) return { allowed: false, reason: capabilities.reason };
      const locked = operationBlocks(page.id);
      if (locked) return { allowed: false, reason: locked };
      if (CONFIGURING.has(kind)) {
        if (!page.draft.label.trim()) return { allowed: false, reason: "Name this connection first." };
        if (page.detail.authentication.owner === "courtwork") {
          const ref = page.detail.authentication.references.find((entry) => entry.id === page.draft.credentialRefId);
          if (!ref) return { allowed: false, reason: "Choose which Models credential reference to use." };
          if (ref.status !== "configured")
            return {
              allowed: false,
              reason: "That reference has no key in Models. Add one in Models, or choose another reference.",
            };
        }
      }
      return { allowed: true, reason: null };
    },

    /** Disconnect is the one command whose consequence warrants a second look:
     * it ends a connection other agents rely on. Opening the confirmation sends
     * nothing. */
    askToDisconnect() {
      if (!api.availability("disconnect").allowed) return;
      page.confirming = "disconnect";
      emit();
    },
    cancelConfirmation() {
      if (!page?.confirming) return;
      page.confirming = null;
      emit();
    },

    async run(kind) {
      if (!api.availability(kind).allowed) return false;
      if (kind === "disconnect" && page.confirming !== "disconnect") return false;
      const id = page.id;
      const operation = {
        operationId: createOperationId(),
        kind,
        runtimeId: id,
        runtimeName: page.detail.name,
        expectedRevision: page.detail.revision,
        configuration: CONFIGURING.has(kind) ? clone(page.draft) : null,
        status: "pending",
        message: "",
        receipt: null,
        readBack: "idle",
      };
      operations.set(id, operation);
      page.confirming = null;
      page.notice = "";
      emit();
      try {
        const receipt = await adapter.command(id, {
          operationId: operation.operationId,
          kind,
          expectedRevision: operation.expectedRevision,
          ...(operation.configuration ? { configuration: clone(operation.configuration) } : {}),
        });
        if (operations.get(id) !== operation) return false;
        await settleConfirmed(id, operation, receipt);
        return true;
      } catch (error) {
        if (operations.get(id) !== operation) return false;
        if (isSettledRefusal(error)) {
          operation.status = error.code === "runtime_conflict" ? "conflict" : "refused";
          operation.message = error.message;
        } else {
          operation.status = "unknown";
          operation.message = error.message;
        }
        emit();
        return false;
      }
    },

    /** The way out of an unknown outcome: ask the owner about that exact
     * operation id. It is never a resend. */
    async checkStatus() {
      if (!page) return;
      const id = page.id;
      const operation = operations.get(id);
      if (!operation || operation.status !== "unknown") return;
      operation.status = "checking";
      emit();
      try {
        const answer = await adapter.operationStatus(id, operation.operationId);
        if (operations.get(id) !== operation) return;
        if (answer.status === "confirmed") {
          await settleConfirmed(id, operation, answer.receipt);
          return;
        }
        /* Only two answers settle the operation without a receipt: the owner
           refused it, or the owner states it was not applied *and can no
           longer apply* (the contract's `not-applied`). Still in progress,
           inconclusive, or anything this page does not recognise leaves it
           unknown and locked. */
        if (answer.status === "not-applied") {
          operation.status = "not-applied";
          operation.message = "";
        } else if (answer.status === "refused") {
          operation.status = answer.code === "runtime_conflict" ? "conflict" : "refused";
          operation.message = answer.message;
        } else {
          operation.status = "unknown";
          operation.message =
            answer.status === "pending"
              ? "The host reports this command is still being carried out."
              : "The host could not yet say whether this command was applied.";
        }
      } catch (error) {
        if (operations.get(id) !== operation) return;
        operation.status = "unknown";
        operation.message = `Could not check yet: ${error.message}`;
      }
      emit();
    },

    /** After a confirmed command whose read-back is not yet adequate: read
     * the owner again. It never resends the command. */
    async readAgain() {
      if (!page || page.status === "loading") return;
      const id = page.id;
      const operation = operations.get(id);
      if (operation?.status !== "confirmed" || SETTLED_READ_BACK.has(operation.readBack)) return;
      operation.readBack = "reading";
      page.status = "loading";
      emit();
      await readPage(id);
      const current = operations.get(id);
      if (current === operation && current.readBack === "reading") current.readBack = "failed";
      emit();
    },

    /** After a conflict: read the owner's current values and keep the draft
     * beside them. Nothing is merged and nothing is resent. */
    async reload() {
      if (!page) return;
      const id = page.id;
      page.status = "loading";
      page.notice = "";
      emit();
      const read = await readPage(id);
      if (read) {
        const operation = operations.get(id);
        if (operation?.status === "conflict") operations.delete(id);
        page.notice = page.dirty
          ? `Reloaded revision ${page.detail.revision}, changed elsewhere. Your draft is unchanged and not applied; review it against these values.`
          : `Reloaded revision ${page.detail.revision}, changed elsewhere.`;
      }
      emit();
    },

    /** Preview only: forget every draft and command record and start again. */
    reset() {
      drafts.clear();
      operations.clear();
      pageEpoch += 1;
      page = null;
      anchorId = null;
      list = { status: "idle", rows: [], error: "" };
      return api.openList({ anchor: null });
    },
  };
  return api;
}
