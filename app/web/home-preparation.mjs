/* Preparing the place the work will happen, before any inference is paid for.
 *
 * Three Host commands in order — create the Chat, bind the folder, create the
 * private candidate — and nothing else. None of them needs a Run: the Host asks
 * a candidate for an active binding, no active Run and a real base commit
 * (service.mjs #changeRepositoryCandidate), and has never asked that a Run
 * happened. So this sequence sends no message, admits no Run and calls no
 * model.
 *
 * What makes it safe to retry is the marker. Every identity is minted once and
 * handed to `persist` *before* the command that uses it goes out, so a reply
 * lost to a refresh, a dropped connection or a closed tab is replayed against
 * the same ids: the Host answers the original receipt instead of creating a
 * second Chat, a second binding or a second candidate. The marker is the same
 * object the Home start already keeps in session storage, and each step is
 * skipped when the Session read back says it is already done — so a resumed
 * preparation finishes the part that is missing rather than starting over.
 *
 * This module holds no state, reads no DOM, and owns no draft: the caller keeps
 * the Home draft and its materials exactly where they were, and decides what to
 * show. Nearest precedent: app.mjs `submitHomeRun`, which already uses this
 * discipline for the Chat and the binding; the candidate is the third step it
 * never had a reason to take.
 */
import { activeRepositoryBinding, activeRepositoryCandidate } from "./workspace-card.mjs";

export const PREPARE_NO_FOLDER = "Connect a folder before preparing a chat for it.";
export const PREPARE_NO_RECEIPT = "Creating the chat returned no matching receipt.";
export const PREPARE_NOT_BOUND = "The folder is not connected to this chat.";
export const PREPARE_NO_GIT = "This folder has no Git commit to start from, so edits stay unavailable.";

const readSession = async (request, id) =>
  (await request(`/sessions/${encodeURIComponent(id)}`)).session;

/** Was the effect of a failed step actually settled, or only reported?
 *
 * Phase is part of the answer. A read or read-back never proves the preceding
 * mutation did not land, even when its error has a Host code. Mutation errors
 * are also unknown by default. Only an explicitly listed refusal whose Host
 * contract rejects before the effect is settled; currently that is the bind
 * validator's `repository_validation_failed` response. */
const SETTLED_MUTATION_REFUSALS = new Map([
  ["bind-mutation", new Set(["repository_validation_failed"])],
]);

export function uncertainFailure(error, phase = error?.preparationPhase) {
  if (error?.preparationSettled === true) return false;
  const code = error?.body?.error?.code;
  return !(typeof code === "string" && SETTLED_MUTATION_REFUSALS.get(phase)?.has(code));
}

async function preparationStep(phase, operation) {
  try { return await operation(); }
  catch (error) {
    if (error && typeof error === "object") {
      try { error.preparationPhase = phase; } catch { /* An opaque error stays conservatively uncertain. */ }
    }
    throw error;
  }
}

/** The tab-local Home projection. Keep the failure fact small and typed: it
 * decides whether correction is safe after reload, but it is not a retained
 * HTTP envelope or diagnostic payload. */
export function preparationFailureForStorage(value) {
  if (!value || typeof value !== "object" || typeof value.uncertain !== "boolean" || typeof value.message !== "string") return null;
  return { uncertain: value.uncertain, message: value.message.slice(0, 1000) };
}

export function serializeHomePreparationMarker(start) {
  if (!start) return null;
  return {
    projectId: start.projectId,
    commandId: start.commandId,
    sessionId: start.sessionId || null,
    session: start.session || null,
    bindRequestId: start.bindRequestId || null,
    candidateRequestId: start.candidateRequestId || null,
    candidateId: start.candidateId || null,
    prepared: Boolean(start.prepared),
    unconfirmed: Boolean(start.unconfirmed || (start.pending && !start.session)),
    error: start.error || "",
    failure: preparationFailureForStorage(start.failure),
  };
}

export function restoreHomePreparationMarker(saved) {
  if (!saved || (saved.projectId !== null && typeof saved.projectId !== "string") || typeof saved.commandId !== "string") return null;
  return { ...saved, failure: preparationFailureForStorage(saved.failure), pending: false, restored: true };
}

/** Where a preparation has got to, as one word a surface can act on.
 *
 * `unfinished` is the state a lost reply leaves behind: the Chat exists, so
 * the screen is looking at a real Session, but the folder or the candidate it
 * was promised is not there yet. It matters because the ordinary "start a
 * candidate" command on that Session would mint fresh identities and race the
 * command that may already have landed — the marker's own identities are the
 * only safe way forward, and only this state knows they exist.
 *
 * Two flags qualify it, and they are opposites:
 *   · `uncertain` — an effect is outstanding and unknown. Nothing about this
 *     preparation may be changed while it is set, because a change would land
 *     beside whatever is already there. Only reconciling clears it.
 *   · `correctable` — the Host said no, the reconciled Session shows that
 *     nothing landed, and the input that was refused is therefore safe to
 *     replace. This is the only state in which a folder correction is offered,
 *     and it is never both of these at once. */
export function preparationState(marker) {
  if (!marker?.prepared) return { status: "none", session: null, error: "", uncertain: false, correctable: false };
  const error = marker.error || "";
  const uncertain = Boolean(marker.unconfirmed || marker.failure?.uncertain);
  if (marker.pending) return { status: "preparing", session: marker.session || null, error: "", uncertain, correctable: false };
  if (marker.unconfirmed) return { status: "unconfirmed", session: null, error, uncertain: true, correctable: false };
  if (!marker.session) return { status: "unstarted", session: null, error, uncertain, correctable: false };
  const bound = activeRepositoryBinding(marker.session) !== null;
  const complete = bound && activeRepositoryCandidate(marker.session) !== null;
  return {
    status: complete ? "ready" : "unfinished",
    session: marker.session,
    error,
    uncertain,
    /* Nothing of this preparation is on the Host but the Chat itself, and the
     * step that failed said so definitively — so the folder it was given is
     * the thing to correct, and correcting it cannot collide with anything. */
    correctable: !complete && !bound && !uncertain && Boolean(marker.failure),
  };
}

/**
 * Bring `marker` up to "this Chat exists, reads that folder, and has a private
 * candidate", doing only the steps that are still missing.
 *
 * `marker` is mutated in place and is the caller's to persist: `persist` is
 * called after every identity is minted and after every receipt is adopted, and
 * must be synchronous and cheap. Returns the Session the Host last reported.
 */
export async function prepareChat({
  request,
  marker,
  rootPath,
  title,
  permissionMode,
  newId = () => crypto.randomUUID(),
  persist = () => {},
}) {
  if (typeof rootPath !== "string" || !rootPath) throw new Error(PREPARE_NO_FOLDER);
  const projectId = marker.projectId ?? null;

  if (!marker.session) {
    marker.sessionId ||= newId();
    persist();
    const result = await preparationStep("session-create", () => request("/sessions", {
      method: "POST",
      body: { projectId, sessionId: marker.sessionId, title, permissionMode },
    }));
    /* The id was chosen here, so the receipt is checkable rather than
     * trustworthy: a Session that is not the one asked for is not adopted. */
    if (result?.session?.id !== marker.sessionId || (result.session.projectId ?? null) !== projectId)
      throw new Error(PREPARE_NO_RECEIPT);
    marker.session = result.session;
    persist();
  }

  const id = marker.session.id;

  /* Before deciding which commands are still owed, ask the Host what it holds.
   * The snapshot in the marker is whatever the last reply managed to deliver,
   * and a reply lost after its command landed leaves it describing a state
   * that is already out of date — which is exactly when this function is
   * called again. Reconciling first means each step below is skipped when it
   * is already done, and the expected revisions sent with the steps that
   * remain are the Host's current ones rather than this client's arithmetic. */
  marker.session = await preparationStep("reconcile-read", () => readSession(request, id));
  persist();

  if (activeRepositoryBinding(marker.session) === null) {
    marker.bindRequestId ||= newId();
    persist();
    await preparationStep("bind-mutation", () => request(`/sessions/${encodeURIComponent(id)}/repository-binding`, {
      method: "PUT",
      body: {
        operation: "bind",
        requestId: marker.bindRequestId,
        expectedRevision: marker.session.repositoryBindingRevision ?? 0,
        rootPath,
      },
    }));
    // The bind receipt is not a Session; the Session is read back so the next
    // step's expected revisions are the Host's, never this client's arithmetic.
    marker.session = await preparationStep("bind-readback", () => readSession(request, id));
    persist();
  }

  if (activeRepositoryCandidate(marker.session) === null) {
    const binding = activeRepositoryBinding(marker.session);
    if (!binding) throw new Error(PREPARE_NOT_BOUND);
    // The base commit is a live Host reading of the folder, never a guess.
    const inspection = await preparationStep("inspect-read", () => request(`/repositories/inspect?rootPath=${encodeURIComponent(binding.rootPath)}`));
    const head = inspection?.git?.head;
    if (typeof head !== "string" || !head) {
      const error = new Error(PREPARE_NO_GIT);
      error.preparationSettled = true;
      throw error;
    }
    marker.candidateRequestId ||= newId();
    marker.candidateId ||= newId();
    persist();
    await preparationStep("candidate-mutation", () => request(`/sessions/${encodeURIComponent(id)}/repository-candidate`, {
      method: "PUT",
      body: {
        operation: "create",
        requestId: marker.candidateRequestId,
        expectedRevision: marker.session.repositoryCandidateRevision ?? 0,
        expectedBindingRevision: binding.revision,
        candidateId: marker.candidateId,
        baseCommit: head,
      },
    }));
    marker.session = await preparationStep("candidate-readback", () => readSession(request, id));
    persist();
  }

  return marker.session;
}

/* The Home side of preparing: which marker to continue, what to call the Chat,
 * which folder to continue against, and what each surface is therefore given.
 *
 * This is the production controller, not a helper the screen wraps. It was
 * moved out of app.mjs so the transitions that only appear between attempts —
 * an outcome that is not known yet, a folder the Host definitively refused —
 * are exercised where they live rather than through a stand-in. app.mjs keeps
 * what is genuinely its own: the persisted marker, the DOM, and rendering.
 *
 * `read()` returns the live Home state; `write()` takes what changed and is
 * responsible for persisting and re-rendering. Nothing here touches a draft,
 * sends a message or admits a Run.
 */
export function createHomePreparation({ request, read, write, newId = () => crypto.randomUUID(), onPrepared = async () => {} }) {
  const api = {
    /** What the surfaces should show, from the marker alone. */
    phase: () => preparationState(read().marker),

    /* Run the sequence, or continue one that stopped part way. Reentry is
     * refused while a command is out, and while an earlier effect is unknown:
     * the way past that is to reconcile, which `prepare` itself does, not to
     * start something beside it. */
    async prepare() {
      const { marker: previous, rootPath: staged, draftText, permissionMode, projectId, connectionLost } = read();
      if (previous?.pending || previous?.unconfirmed || connectionLost) return null;
      // A preparation that already made the Chat knows its own folder; only a
      // first attempt needs one staged on Home.
      if (!staged && !previous?.session) return null;
      const marker = previous?.session || previous?.sessionId ? previous
        : { projectId, commandId: newId(), sessionId: null, session: null };
      marker.pending = true;
      marker.error = "";
      marker.prepared = true;
      write({ marker });
      try {
        /* Named from what has been typed so far, or from the folder it will
         * read. A prepared chat has to be findable in Recent before it holds a
         * single message; it is renamed from there like any other chat. */
        const rootPath = activeRepositoryBinding(marker.session)?.rootPath || staged;
        const title = draftText.trim().split(/\r?\n/)[0].slice(0, 100)
          || rootPath.replace(/\/+$/, "").split("/").pop()
          || "New chat";
        const session = await prepareChat({
          request, marker, rootPath, title, permissionMode, newId,
          persist: () => { if (read().marker === marker) write({ marker }); },
        });
        marker.failure = null;
        /* The Host resolves the folder it binds, so its own rootPath is the
         * source this chat actually reads — this client has no resolver of its
         * own and cannot tell `/tmp` from `/private/tmp` by comparing strings.
         * Adopt the binding's path rather than testing the staged one against
         * it, so every surface names the folder that is really connected. */
        const bound = activeRepositoryBinding(session)?.rootPath;
        write({ marker, ...(bound && bound !== read().rootPath ? { rootPath: bound } : {}) });
        await onPrepared(session);
        return session;
      } catch (error) {
        const uncertain = uncertainFailure(error);
        marker.unconfirmed = !marker.session && uncertain;
        if (!marker.session && !marker.unconfirmed) marker.sessionId = null;
        /* Recorded on the marker, not only rendered: whether the folder may be
         * corrected has to survive a reload, and only the attempt that failed
         * knows whether its effect was settled. */
        marker.failure = { uncertain, message: String(error?.message || error) };
        marker.error = marker.unconfirmed
          ? "Creating the chat is unconfirmed. Check its status to recover the same chat. Your instruction is kept."
          : `Could not prepare: ${error.message}. Your instruction is kept.`;
        return null;
      } finally {
        if (read().marker === marker) {
          marker.pending = false;
          write({ marker });
        }
      }
    },

    /* Settle an outcome nobody knows: read the Chat back by the id this
     * preparation chose. Nothing is created by asking — the id was minted
     * here, so a 404 means the create never landed and the same id is free to
     * use again, and anything else is the Chat itself. This is the only way
     * out of `uncertain` for the create step, which is why it stays reachable
     * while every folder mutation is locked. */
    async settleUnconfirmed() {
      const { marker } = read();
      if (!marker?.unconfirmed || !marker.sessionId) return null;
      try {
        let found = null;
        try { found = (await request(`/sessions/${encodeURIComponent(marker.sessionId)}`)).session ?? null; }
        catch (error) { if (error?.status !== 404) throw error; }
        if (read().marker !== marker) return null;
        marker.session = found && (found.projectId ?? null) === (marker.projectId ?? null) ? found : null;
        marker.unconfirmed = false;
        marker.failure = marker.session ? null : { uncertain: false, message: "The chat was not created." };
        marker.error = marker.session
          ? "Your chat was recovered. Continue preparing it, or send to start work in it."
          : "The chat was not created. Preparing again uses the same identity.";
      } catch (error) {
        if (read().marker !== marker) return null;
        marker.error = `Check failed · ${error.message}. Your instruction is kept.`;
      }
      write({ marker });
      return marker.session;
    },

    /* Give a refused preparation a different folder. Only offered once the
     * Host has said no and the reconciled Session shows nothing landed, so
     * this can never race an outstanding effect. The Chat keeps its identity
     * and the person keeps their text; the binding does not keep its identity,
     * because a different folder is a different intent and reusing the old
     * request id with a new payload is exactly what the Host refuses. */
    async correctFolder(rootPath) {
      const { marker } = read();
      if (!preparationState(marker).correctable) return null;
      if (typeof rootPath !== "string" || !rootPath) return null;
      marker.bindRequestId = null;
      marker.failure = null;
      marker.error = "";
      write({ marker, rootPath });
      return api.prepare();
    },
  };
  return api;
}
