/* E1 · Role-first Composer · which Agent profile this chat's next run uses.
 *
 * DOM-free. It consumes the existing Runtime Control owner through a narrow
 * adapter (the live one is `liveAgentChoiceAdapter` below) and holds no fact of
 * its own. Contract: engineering/execution/claude-frontend-harness-2026-09-16/
 * evidence/e1-backend-contract-20260922 (candidate K3 at 76d91d6).
 *
 * Four readings stay apart:
 *   - **draft**: `{ profileId, sourceHash, observedConfigRevision }` — what the
 *     person picked and nobody has accepted. Local to this page; not Host
 *     persistence, not reload-safe.
 *   - **saved/effective**: the snapshot's session-scope selection and the
 *     `composition` it resolves to. Only a PUT reply or a re-read says so.
 *   - **bound**: a Run's recorded binding. Never read from here; a running Run
 *     keeps it whatever this chat selects next.
 *   - `revision` is the **whole-configuration** CAS value, not a per-profile
 *     revision, and is never presented as one.
 *
 * Apply is one PUT under the existing CAS. 409 `runtime_conflict` re-reads and
 * keeps the draft; 409 `active_run` keeps the draft and is not queued; a lost
 * reply re-reads and compares selected id + source hash before saying anything.
 * Send carries `runtimeSelection` from the fresh effective reading only.
 */

const clone = (value) => structuredClone(value);
export const BUILTIN_PROFILE = "agent:general";

/** Pure: the parts of one Runtime Control snapshot this consumer reads. */
export function projectSnapshot(snapshot) {
  const resources = Array.isArray(snapshot?.resources) ? snapshot.resources : [];
  const sessionScope = snapshot?.sessionId ? { type: "session", id: snapshot.sessionId } : null;
  const selection = (snapshot?.profileSelections || []).find(
    (entry) => sessionScope && entry.scope?.type === "session" && entry.scope?.id === sessionScope.id,
  );
  const composition = snapshot?.composition || null;
  return {
    revision: snapshot?.revision ?? null,
    sessionId: snapshot?.sessionId ?? null,
    activeRuns: Number.isSafeInteger(snapshot?.activeRuns) ? snapshot.activeRuns : null,
    adapterId: snapshot?.adapterId ?? null,
    profiles: resources
      .filter((resource) => resource.kind === "agent_profile")
      .map((resource) => ({
        id: resource.id,
        title: resource.title,
        description: resource.description ?? null,
        builtin: resource.source?.type === "builtin",
        sourceHash: resource.source?.hash ?? null,
        scope: resource.scope ?? null,
        health: resource.health ?? null,
        diagnostics: resource.diagnostics ?? [],
      })),
    /* `null` = this chat inherits; an id = selected at session scope. */
    sessionSelection: selection ? selection.id : null,
    effective: composition && {
      id: composition.id,
      hash: composition.hash ?? null,
      version: composition.version ?? null,
      status: composition.status,
      missing: composition.missing || [],
      schemaVersion: composition.schemaVersion ?? 1,
      kits: (composition.kits || []).map((kit) => ({ id: kit.descriptor?.id, version: kit.descriptor?.version })),
      selectionScope: composition.selectionScope ?? null,
    },
    titles: Object.fromEntries(resources.map((resource) => [resource.id, resource.title])),
  };
}

/** Pure: a profile source's Kit declarations. v1/builtin carry none. Unknown
 * or unparsable content is reported as such, never guessed. */
export function projectProfileSource(content) {
  if (content == null) return { status: "none", kits: [], resourceIds: [] };
  let value;
  try { value = JSON.parse(content); } catch { return { status: "unreadable", kits: [], resourceIds: [] }; }
  const kits = Array.isArray(value?.kits)
    ? value.kits.map((kit) => ({ id: kit?.descriptor?.id ?? null, version: kit?.descriptor?.version ?? null }))
    : [];
  return {
    status: "ready",
    schemaVersion: value?.schemaVersion ?? 1,
    version: value?.version ?? null,
    kits,
    resourceIds: Array.isArray(value?.resourceIds) ? value.resourceIds : [],
  };
}

/** The live adapter: existing authenticated endpoints only. */
export function liveAgentChoiceAdapter(request) {
  const q = (sessionId) => `sessionId=${encodeURIComponent(sessionId)}`;
  return {
    read: (sessionId, { signal } = {}) => request(`/runtime-control?${q(sessionId)}`, { signal }),
    source: (sessionId, id) => request(`/runtime-resources/${encodeURIComponent(id)}?${q(sessionId)}`),
    select: (sessionId, { revision, id }) =>
      request(`/runtime-control?${q(sessionId)}`, {
        method: "PUT",
        body: { revision, operation: "profile", scope: { type: "session", id: sessionId }, id },
      }),
  };
}

const errorCode = (error) => error?.body?.error?.code ?? error?.code ?? null;

export function createAgentChoiceController({ adapter, getSessionId }) {
  const listeners = new Set();
  let sessionId = null;
  let read = { status: "idle", error: "" };
  let snapshot = null; // projected
  let draft = null;
  let apply = { status: "idle", message: "" };
  const sources = new Map(); // id → { status, reading, error, token }
  let readEpoch = 0, applyEpoch = 0, tokens = 0;

  const profileOf = (id) => snapshot?.profiles.find((entry) => entry.id === id) || null;

  function nextRun() {
    if (!snapshot) return null;
    const effective = snapshot.effective;
    const selection = effective && {
      revision: snapshot.revision,
      profileId: effective.id,
      /* The server compares this with composition.hash; builtin is null. */
      sourceHash: effective.hash ?? null,
    };
    const pendingDraft = draft && !(draft.profileId === effective?.id && (draft.sourceHash ?? null) === (effective?.hash ?? null));
    let send = { enabled: true, reason: "", runtimeSelection: selection };
    if (read.status !== "ready") send = { enabled: false, reason: read.status === "error" ? `The agent reading failed: ${read.error}` : "Reading the agent…", runtimeSelection: null };
    else if (apply.status === "applying") send = { enabled: false, reason: `Selecting ${profileOf(draft?.profileId)?.title ?? "the agent"}…`, runtimeSelection: null };
    else if (pendingDraft) send = { enabled: false, reason: pendingReason(), runtimeSelection: null };
    else if (!effective) send = { enabled: false, reason: "The Host reported no agent for this chat.", runtimeSelection: null };
    else if (effective.status !== "compatible")
      send = {
        enabled: false,
        reason: `${snapshot.titles[effective.id] ?? effective.id} is ${effective.status}${effective.missing.length ? `: missing ${effective.missing.map((id) => snapshot.titles[id] ?? id).join(", ")}` : ""}.`,
        runtimeSelection: null,
      };
    return { effective, send };
  }
  function pendingReason() {
    const title = profileOf(draft.profileId)?.title ?? draft.profileId;
    if (apply.status === "frozen") return `${title} is kept as your choice. A run is active, so the selection is not changed now and will not change by itself.`;
    if (apply.status === "conflict") return `${title} was not selected: the configuration changed elsewhere. Select it again or keep the current agent.`;
    if (apply.status === "unknown") return `Whether ${title} was selected is not known. Check again before sending.`;
    if (apply.status === "failed") return `${title} was not selected: ${apply.message}`;
    return `${title} is not selected yet.`;
  }

  function getState() {
    return clone({
      sessionId,
      read,
      snapshot,
      draft,
      apply,
      sources: Object.fromEntries([...sources].map(([id, slot]) => [id, { status: slot.status, reading: slot.reading, error: slot.error }])),
      next: nextRun(),
    });
  }
  const emit = () => { const state = getState(); for (const listener of listeners) listener(state); };

  async function readSnapshot() {
    const own = ++readEpoch;
    const id = getSessionId();
    if (id !== sessionId) { sessionId = id; draft = null; apply = { status: "idle", message: "" }; sources.clear(); snapshot = null; }
    if (!id) { read = { status: "idle", error: "" }; emit(); return null; }
    read = { status: "loading", error: "" };
    emit();
    try {
      const result = await adapter.read(id);
      if (own !== readEpoch || id !== sessionId) return null;
      snapshot = projectSnapshot(result);
      read = { status: "ready", error: "" };
      emit();
      return snapshot;
    } catch (error) {
      if (own !== readEpoch || id !== sessionId) return null;
      read = { status: "error", error: error.message };
      emit();
      return null;
    }
  }

  async function readSource(id) {
    const profile = profileOf(id);
    if (!profile || profile.builtin) {
      sources.set(id, { status: "ready", reading: projectProfileSource(null), error: "", token: ++tokens });
      emit();
      return;
    }
    const token = ++tokens;
    const own = sessionId;
    sources.set(id, { status: "loading", reading: sources.get(id)?.reading ?? null, error: "", token });
    emit();
    try {
      const result = await adapter.source(own, id);
      if (sources.get(id)?.token !== token || own !== sessionId) return;
      sources.set(id, { status: "ready", reading: projectProfileSource(result?.content ?? null), error: "", token });
    } catch (error) {
      if (sources.get(id)?.token !== token || own !== sessionId) return;
      sources.set(id, { status: "error", reading: null, error: error.message, token });
    }
    emit();
  }

  const api = {
    getState,
    subscribe(listener) { listeners.add(listener); listener(getState()); return () => listeners.delete(listener); },

    /** (Re)read the owner's snapshot for the current chat. */
    load: readSnapshot,

    /** Read one profile's source for its Kit reading (chooser highlight). */
    preview(id) {
      const slot = sources.get(id);
      if (slot && slot.status !== "error") return;
      void readSource(id);
    },

    /** The person picked `id`. It becomes a draft and is applied at once with
     * one CAS write; nothing is claimed until the reply or a re-read says so. */
    async choose(id) {
      if (!snapshot || read.status !== "ready") return;
      const profile = profileOf(id);
      if (!profile) return;
      const effective = snapshot.effective;
      const explicit = snapshot.sessionSelection === id;
      if (!draft && explicit && effective?.id === id) return; // already this chat's selection
      draft = { profileId: id, sourceHash: profile.builtin ? null : profile.sourceHash, observedConfigRevision: snapshot.revision };
      await api.apply();
    },

    /** Submit the current draft against the latest read revision. Used by
     * `choose` and by the explicit "Select again" recovery. */
    async apply() {
      if (!draft || apply.status === "applying") return;
      const own = ++applyEpoch;
      const id = sessionId;
      const submitted = clone(draft);
      apply = { status: "applying", message: "" };
      emit();
      try {
        const result = await adapter.select(id, { revision: snapshot.revision, id: submitted.profileId });
        if (own !== applyEpoch || id !== sessionId) return;
        snapshot = projectSnapshot(result);
        settle(submitted);
      } catch (error) {
        if (own !== applyEpoch || id !== sessionId) return;
        const code = errorCode(error);
        if (code === "runtime_conflict") apply = { status: "conflict", message: error.message };
        else if (code === "active_run") apply = { status: "frozen", message: error.message };
        else if (error?.body?.error?.code) apply = { status: "failed", message: error.message };
        else {
          /* No settled answer (network, timeout, lost reply). Re-read and
             compare before saying anything; never resend blindly. */
          apply = { status: "unknown", message: error.message };
          emit();
          const fresh = await readSnapshot();
          if (own !== applyEpoch || id !== sessionId) return;
          if (fresh) settle(submitted, { afterUnknown: true });
          return;
        }
        emit();
        await readSnapshot();
      }
    },

    /** Drop the unapplied draft and keep the chat's current agent. */
    keepCurrent() {
      applyEpoch++;
      draft = null;
      apply = { status: "idle", message: "" };
      emit();
    },

    /** After a Settings visit or a run ends: re-read, keep the draft. */
    async refresh() {
      await readSnapshot();
      for (const id of [...sources.keys()]) sources.delete(id);
      const effectiveId = snapshot?.effective?.id;
      if (effectiveId) void readSource(effectiveId);
    },

    /** The Host refused a Send with `runtime_selection_conflict`: re-read. The
     * message text and materials belong to the composer and are untouched. */
    async selectionConflict() {
      await readSnapshot();
    },
  };

  function settle(submitted, { afterUnknown = false } = {}) {
    const effective = snapshot.effective;
    const landed = snapshot.sessionSelection === submitted.profileId
      && effective?.id === submitted.profileId
      && (effective?.hash ?? null) === (submitted.sourceHash ?? null);
    if (landed) { draft = null; apply = { status: "idle", message: "" }; }
    else if (afterUnknown) apply = { status: "unknown", message: "The selection could not be confirmed." };
    else apply = { status: "failed", message: "The Host accepted the write but reports a different agent for this chat." };
    emit();
    const effectiveId = snapshot.effective?.id;
    if (effectiveId && !sources.has(effectiveId)) void readSource(effectiveId);
  }

  return api;
}
