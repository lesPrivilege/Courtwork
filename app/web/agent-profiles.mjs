/* Settings → Agents → Agent profiles · the journey's state, without a DOM.
 *
 * One controller owns "which profile am I looking at, what has the owner
 * confirmed, and what have I changed since". It holds no facts of its own: every
 * name, availability, model reading and permission effect comes from the last
 * reply the injected adapter gave, and a draft is only ever the three ids this
 * journey can change (role, Kits, runtime). The adapter is the whole seam — this
 * file never reaches for `fetch`, storage, a clock or `document`, so the same
 * controller runs under the synthetic preview and under a production adapter
 * once the backend owners exist.
 *
 * Three separations are load-bearing here, because collapsing any of them would
 * make the page lie:
 *   - **saved vs draft.** `saved` is what the owner confirmed at `revision`;
 *     `draft` is what this person has asked for and nobody has accepted. They
 *     are never merged, and a failed save keeps the draft exactly as typed.
 *   - **this run vs the next one.** `activeRun.revision` is what a running Run
 *     is bound to. Saving is not offered while it holds the profile, and the
 *     draft explicitly does not promise to apply itself afterwards (the same
 *     sentence the Runtime policy editor already uses).
 *   - **requested vs granted vs supported.** A Kit *requests* actions; the
 *     runtime *supports* some of them; the permission owner *grants* an effect.
 *     The projection below reports all three and never folds them into one word.
 */

const clone = (value) => structuredClone(value);

/* Each profile keeps its own draft, so leaving for the list and coming back is
 * not an edit. Keyed by profile id; a save that lands clears its entry. */
const emptySave = () => ({ status: "idle", message: "", revision: null });

/** One Kit on one runtime. Pure; reads only supplied facts.
 *   `supported` / `unsupported` — an owner record matches this Kit version and
 *     this runtime (and its revision, when either side states one);
 *   `unchecked` — no matching record. `reason` says which: `no-evidence`, or
 *     `evidence-not-applicable` when records exist for another Kit version or
 *     runtime revision. Contradictory matching records are `unchecked` with
 *     `evidence-conflict`: the frontend does not pick a winner.
 * `declared` repeats the Kit's own declaration beside the reading; it never
 * decides it. */
export function kitCompatibility(kit, runtime) {
  const declared = Array.isArray(kit.supportedRuntimeIds) ? kit.supportedRuntimeIds.includes(runtime.id) : null;
  const records = Array.isArray(kit.compatibility) ? kit.compatibility : [];
  const forRuntime = records.filter(
    (record) => record.runtimeId === runtime.id && (record.result === "supported" || record.result === "unsupported"),
  );
  const matching = forRuntime.filter(
    (record) =>
      record.kitVersion === kit.version &&
      (record.runtimeRevision ?? null) === (runtime.revision ?? null),
  );
  const results = new Set(matching.map((record) => record.result));
  if (results.size === 1) {
    const [result] = results;
    return { result, reason: "evidence", evidenceRef: matching[0].evidenceRef, declared };
  }
  if (results.size > 1) return { result: "unchecked", reason: "evidence-conflict", evidenceRef: null, declared };
  return {
    result: "unchecked",
    reason: forRuntime.length ? "evidence-not-applicable" : "no-evidence",
    evidenceRef: null,
    declared,
  };
}

/** Pure projection over one adapter reply plus the current draft. It creates no
 * fact: every branch below reads a field the adapter supplied, and an absent
 * field becomes an explicit unknown rather than a default. */
export function projectProfile(detail, draft) {
  const roles = detail.roles || [];
  const kits = detail.kits || [];
  const runtimes = detail.runtimes || [];
  const role = roles.find((entry) => entry.id === draft.roleId) || null;
  const runtime = runtimes.find((entry) => entry.id === draft.runtimeId) || null;
  const selectedKits = draft.kitIds
    .map((id) => kits.find((kit) => kit.id === id))
    .filter(Boolean);
  /* Compatibility is a reading of the pair, attributed to owner evidence
     (06E-R1, K0). A Kit's own `supportedRuntimeIds` is a declaration: its
     absence is `unchecked`, never a synthesized negative proof. Only a matching
     owner record says `supported` or `unsupported`, and only `unsupported`
     blocks. `incompatibleKitIds` keeps its name for existing consumers and now
     means exactly the verified-unsupported pairs. */
  const compatibility = {};
  if (runtime) for (const kit of selectedKits) compatibility[kit.id] = kitCompatibility(kit, runtime);
  const incompatible = selectedKits.filter((kit) => compatibility[kit.id]?.result === "unsupported");
  /* Requests are unioned in selection order; the first Kit that asks for an
     action owns the line, and a second asking Kit is named beside it. */
  const requests = [];
  for (const kit of selectedKits)
    for (const request of kit.requests) {
      const existing = requests.find((entry) => entry.action === request.action);
      if (existing) existing.kitNames.push(kit.name);
      else
        requests.push({
          action: request.action,
          label: request.label,
          kitNames: [kit.name],
          /* `supported` is the runtime's own answer; `effect` is the permission
             owner's. An unsupported action has no effect to report, and an
             unchosen runtime has no answer at all — neither becomes "deny". */
          supported: runtime ? runtime.supportedActions.includes(request.action) : null,
          effect: runtime ? runtime.grants[request.action] ?? null : null,
        });
    }
  const frozen = Boolean(detail.profile.activeRun);
  const unavailable = runtime?.availability === "unavailable";
  const blockers = [];
  if (!role) blockers.push("Choose a role for this agent.");
  if (!runtime) blockers.push("Choose a runtime for this agent.");
  if (unavailable)
    blockers.push(
      `${runtime.name} is unavailable: ${runtime.unavailableReason} An unavailable runtime cannot be saved as this agent's execution choice.`,
    );
  for (const kit of incompatible)
    blockers.push(
      `${kit.name} ${kit.version} is not supported on ${runtime.name} (${compatibility[kit.id].evidenceRef}). Remove the Kit or choose a runtime that supports it.`,
    );
  return {
    role,
    runtime,
    selectedKits,
    compatibility,
    incompatibleKitIds: incompatible.map((kit) => kit.id),
    requests,
    frozen,
    blockers,
  };
}

function draftOf(record) {
  return { roleId: record.roleId, kitIds: [...record.kitIds], runtimeId: record.runtimeId };
}

function sameDraft(a, b) {
  return (
    a.roleId === b.roleId &&
    a.runtimeId === b.runtimeId &&
    a.kitIds.length === b.kitIds.length &&
    a.kitIds.every((id) => b.kitIds.includes(id))
  );
}

export function createAgentProfilesController({ adapter }) {
  const drafts = new Map();
  const listeners = new Set();
  let view = "list";
  let list = { status: "idle", rows: [], error: "" };
  let profile = null;
  let runtimeDetail = { status: "closed", id: null, record: null, error: "" };
  let anchorId = null;
  /* One epoch per asynchronous surface. A reply is applied only when it is the
     newest request *and* still belongs to the object on screen — the two checks
     are separate, because a late reply for profile A is a different mistake
     from a stale reply for the profile you are still looking at (FN-07). */
  let listEpoch = 0;
  let profileEpoch = 0;
  let saveEpoch = 0;
  let detailEpoch = 0;

  const emit = () => {
    const state = getState();
    for (const listener of listeners) listener(state);
  };

  function getState() {
    return clone({
      view,
      anchorId,
      list,
      profile: profile && {
        ...profile,
        projection: profile.detail ? projectProfile(profile.detail, profile.draft) : null,
      },
      runtimeDetail,
      capabilities: adapter.capabilities(),
    });
  }

  function markDirty() {
    profile.dirty = !sameDraft(profile.draft, draftOf(profile.detail.profile));
    drafts.set(profile.id, clone(profile.draft));
    /* A confirmation names one exact revision. Touching the draft makes that
       sentence about a previous action, so it goes rather than lingering above
       a value it no longer describes. A conflict is not cleared this way: the
       owner's version is still ahead whatever you type next. */
    if (profile.save.status === "saved" || profile.save.status === "failed")
      profile.save = emptySave();
  }

  function adopt(detail) {
    profile.detail = detail;
    profile.status = "ready";
    profile.error = "";
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
      profileEpoch += 1;
      saveEpoch += 1;
      /* Leaving a surface invalidates the reads it started. Closing the detail
         without retiring its epoch would let a reply still in flight reopen it
         over the list a moment later (Luna F-01). */
      detailEpoch += 1;
      view = "list";
      anchorId = anchor;
      runtimeDetail = { status: "closed", id: null, record: null, error: "" };
      /* The rows from the previous reading stay — they are the anchor you came
         back to and they are still worth reading — but they are not the
         confirmed latest list until this read answers. `status` is the whole
         difference, and the view must say it rather than draw them as settled
         (ui-orchestration-contract: a failed or pending read must not leave an
         old projection impersonating the newest one). */
      list = { status: "loading", rows: list.rows, error: "" };
      emit();
      try {
        const result = await adapter.list();
        if (own !== listEpoch) return;
        list = { status: "ready", rows: result.rows, error: "" };
      } catch (error) {
        if (own !== listEpoch) return;
        list = { status: "error", rows: [], error: error.message };
      }
      emit();
    },

    async openProfile(id) {
      const own = ++profileEpoch;
      /* Leaving the list invalidates the read it started, the same way openList
         retires the profile's reads. Without this the older list reply lands
         behind a newer navigation and is adopted as "ready" — rows nobody
         asked for, confirmed by nothing (Luna F-01's symmetric case). */
      listEpoch += 1;
      const kept = drafts.get(id) || null;
      /* Reopening the profile already on screen keeps its last confirmed
         values visible while the reload is out; a different profile starts
         from nothing rather than borrowing the previous one's facts. */
      const carried = profile?.id === id ? profile.detail : null;
      detailEpoch += 1;
      view = "profile";
      anchorId = id;
      runtimeDetail = { status: "closed", id: null, record: null, error: "" };
      profile = {
        id,
        status: "loading",
        error: "",
        detail: carried,
        draft: kept || (carried ? draftOf(carried.profile) : null),
        dirty: false,
        save: emptySave(),
        notice: "",
      };
      emit();
      try {
        const detail = await adapter.open(id);
        if (own !== profileEpoch || profile?.id !== id) return;
        adopt(detail);
        /* Reopening a profile you have an unsaved draft for must not silently
           discard it. It is reconciled instead: an id the owner no longer
           offers is dropped, everything else is kept exactly as chosen. */
        const fresh = draftOf(detail.profile);
        profile.draft = kept
          ? {
              roleId: detail.roles.some((role) => role.id === kept.roleId) ? kept.roleId : fresh.roleId,
              runtimeId: detail.runtimes.some((rt) => rt.id === kept.runtimeId)
                ? kept.runtimeId
                : fresh.runtimeId,
              kitIds: kept.kitIds.filter((kitId) => detail.kits.some((kit) => kit.id === kitId)),
            }
          : fresh;
        profile.dirty = !sameDraft(profile.draft, fresh);
        if (profile.dirty) drafts.set(id, clone(profile.draft));
        else drafts.delete(id);
      } catch (error) {
        if (own !== profileEpoch || profile?.id !== id) return;
        profile.status = "error";
        profile.error = error.message;
      }
      emit();
    },

    setRole(roleId) {
      if (!profile?.detail || !profile.detail.roles.some((role) => role.id === roleId)) return;
      profile.draft.roleId = roleId;
      markDirty();
      emit();
    },

    toggleKit(kitId) {
      if (!profile?.detail || !profile.detail.kits.some((kit) => kit.id === kitId)) return;
      const next = profile.draft.kitIds.includes(kitId)
        ? profile.draft.kitIds.filter((id) => id !== kitId)
        : [...profile.draft.kitIds, kitId];
      profile.draft.kitIds = next;
      markDirty();
      emit();
    },

    setRuntime(runtimeId) {
      if (!profile?.detail || !profile.detail.runtimes.some((rt) => rt.id === runtimeId)) return;
      profile.draft.runtimeId = runtimeId;
      markDirty();
      emit();
    },

    discardDraft() {
      /* The view already hides this while a request is out; the rule belongs
         here too. Discarding mid-flight would leave the draft describing one
         thing and the reply confirming another, and the controller must stay
         coherent under a race the view cannot see (Luna F-02). */
      if (!profile?.detail || profile.save.status === "saving") return;
      profile.draft = draftOf(profile.detail.profile);
      profile.dirty = false;
      profile.save = emptySave();
      drafts.delete(profile.id);
      emit();
    },

    /** True only when a save would be honest: something changed, the owner
     * offers the operation, no Run holds the profile, and nothing in the draft
     * contradicts a fact the adapter reported. */
    canSave() {
      if (!profile?.detail || !profile.dirty) return false;
      if (!adapter.capabilities().canSave) return false;
      if (profile.save.status === "saving" || profile.save.status === "conflict") return false;
      const projection = projectProfile(profile.detail, profile.draft);
      return !projection.frozen && projection.blockers.length === 0;
    },

    async save() {
      if (!api.canSave()) return false;
      const id = profile.id;
      const own = ++saveEpoch;
      const requested = clone(profile.draft);
      const expected = profile.detail.profile.revision;
      profile.notice = "";
      profile.save = { status: "saving", message: "", revision: null };
      emit();
      try {
        const detail = await adapter.save(id, requested, expected);
        /* Three guards, not one: the request must be the newest save, the page
           must still be on this profile, and the draft must not have moved on
           while the request was out. Any of them failing means this reply is
           about a state nobody is looking at. */
        if (own !== saveEpoch || profile?.id !== id) return false;
        if (!sameDraft(profile.draft, requested)) {
          /* The owner did apply this save; the draft simply moved on while the
             request was out. Dropping the reply here would imply the write was
             cancelled, so the confirmed revision is adopted and named, and the
             draft is re-measured against it rather than reported clean. */
          adopt(detail);
          profile.draft = { ...profile.draft, kitIds: [...profile.draft.kitIds] };
          profile.dirty = !sameDraft(profile.draft, draftOf(detail.profile));
          if (profile.dirty) drafts.set(id, clone(profile.draft));
          else drafts.delete(id);
          profile.save = { status: "saved", message: "", revision: detail.profile.revision };
          emit();
          return false;
        }
        adopt(detail);
        profile.draft = draftOf(detail.profile);
        profile.dirty = false;
        drafts.delete(id);
        profile.save = {
          status: "saved",
          message: "",
          revision: detail.profile.revision,
        };
      } catch (error) {
        if (own !== saveEpoch || profile?.id !== id) return false;
        const conflict = error.code === "profile_conflict";
        profile.save = {
          status: conflict ? "conflict" : "failed",
          message: error.message,
          revision: null,
        };
      }
      emit();
      return profile.save.status === "saved";
    },

    /** The only way out of a conflict: read the owner's current values again
     * and keep the draft beside them. Nothing is merged and nothing is resent. */
    async reloadSaved() {
      if (!profile) return;
      const id = profile.id;
      const own = ++profileEpoch;
      profile.notice = "";
      profile.status = "loading";
      emit();
      try {
        const detail = await adapter.open(id);
        if (own !== profileEpoch || profile?.id !== id) return;
        adopt(detail);
        /* The owner may have moved to exactly what this draft asked for. Then
           there is nothing left to save, and saying so is the whole receipt. */
        profile.dirty = !sameDraft(profile.draft, draftOf(detail.profile));
        profile.save = emptySave();
        profile.notice = profile.dirty
          ? `Reloaded revision ${detail.profile.revision}, saved elsewhere. Your draft is unchanged and still not applied; review it against these values before saving.`
          : `Reloaded revision ${detail.profile.revision}. It already holds what your draft asked for, so there is nothing left to save.`;
        if (!profile.dirty) drafts.delete(id);
      } catch (error) {
        if (own !== profileEpoch || profile?.id !== id) return;
        profile.status = "error";
        profile.error = error.message;
      }
      emit();
    },

    async openRuntimeDetail(runtimeId) {
      const own = ++detailEpoch;
      runtimeDetail = { status: "loading", id: runtimeId, record: null, error: "" };
      emit();
      try {
        const record = await adapter.runtimeDetail(runtimeId);
        if (own !== detailEpoch) return;
        runtimeDetail = { status: "ready", id: runtimeId, record, error: "" };
      } catch (error) {
        if (own !== detailEpoch) return;
        runtimeDetail = { status: "error", id: runtimeId, record: null, error: error.message };
      }
      emit();
    },

    closeRuntimeDetail() {
      detailEpoch += 1;
      runtimeDetail = { status: "closed", id: null, record: null, error: "" };
      emit();
    },

    /** Preview-only: drop every local draft and reload. Never offered by a
     * production adapter — it exists so the specimen can be put back. */
    reset() {
      drafts.clear();
      listEpoch += 1;
      profileEpoch += 1;
      saveEpoch += 1;
      detailEpoch += 1;
      profile = null;
      anchorId = null;
      return api.openList({ anchor: null });
    },
  };
  return api;
}
