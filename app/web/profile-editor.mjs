/* K5 · edit the profile this Chat selects: source → Host preview → CAS save.
 *
 * DOM-free. It consumes three existing owners and holds no authority of its
 * own (engineering/execution/claude-frontend-harness-2026-09-16/
 * kit-profile-editor-20260923.md, docs/runtime-control/api.md):
 *   - `GET /runtime-resources/:id?sessionId` — the saved source bytes and the
 *     whole-config revision they were read at (the edit's **base**);
 *   - `POST /runtime-control/preview-profile?sessionId` — K4's read-only
 *     semantic preview, sent exactly `{expectedRevision, profileId, content}`;
 *   - `PUT /runtime-control?sessionId` `operation:"put"` — the existing save,
 *     with the resource's original id/kind/title/scope and the base revision.
 *
 * Readings stay apart, one slot per (Session, profile):
 *   - **draft** `text`: what the person typed. Kept across in-app navigation
 *     (this module lives with the page), not across a reload.
 *   - **base**: the saved source this draft started from. Only a read or a
 *     confirmed save replaces it; a later read that differs while the draft is
 *     edited is held apart as `fresh` for a deliberate choice.
 *   - **preview**: bound to the exact submitted text + revision. A newer text,
 *     base or a late reply never inherits it.
 *   - **save**: the frozen submitted text. Typing during a save stays in
 *     `text`; a lost reply stays unknown until a read-back compares hashes.
 *   - **owner facts** (K5-R1): the latest Workbench snapshot per Session —
 *     whole-config revision, active runs and the one profile this Chat may edit
 *     here. A newer known revision turns any preview into a previous reading
 *     and holds Preview/Save until a fresh read; a profile that stops being
 *     this Chat's own selection suspends its slot (text kept, read-only) until
 *     an explicit fresh read while it is eligible again.
 * Nothing is retried, queued, selected or saved on close.
 */

const clone = (value) => structuredClone(value);
const errorCode = (error) => error?.body?.error?.code ?? null;

export const editorKey = (sessionId, profileId) => `${sessionId}\u0000${profileId}`;

/** UTF-16 code units (the Host's source limit unit) and UTF-8 bytes. */
export function measureText(text) {
  return { characters: text.length, bytes: new TextEncoder().encode(text).length };
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The live adapter: existing authenticated endpoints only. */
export function liveProfileEditorAdapter(request) {
  const q = (sessionId) => `sessionId=${encodeURIComponent(sessionId)}`;
  return {
    source: (sessionId, id) => request(`/runtime-resources/${encodeURIComponent(id)}?${q(sessionId)}`),
    control: (sessionId) => request(`/runtime-control?${q(sessionId)}`),
    preview: (sessionId, body) => request(`/runtime-control/preview-profile?${q(sessionId)}`, { method: "POST", body }),
    save: (sessionId, body) => request(`/runtime-control?${q(sessionId)}`, { method: "PUT", body }),
  };
}

/** Pure: whether the Edit action is offered for `resource` in this snapshot.
 * Display gating only — the Host's preview and save remain the authority. */
export function editEligibility(snapshot, resource) {
  if (!snapshot?.sessionId || !resource || resource.kind !== "agent_profile") return { editable: false, reason: "" };
  if (resource.source?.type === "builtin") return { editable: false, reason: "A built-in profile has no source to edit." };
  if (snapshot.sessionScope?.kind === "global") return { editable: false, reason: "" };
  const selected = (snapshot.profileSelections || []).some(
    (entry) => entry.scope?.type === "session" && entry.scope?.id === snapshot.sessionId && entry.id === resource.id,
  );
  if (!selected) return { editable: false, reason: "Editing is offered for the profile this chat selects for itself." };
  return { editable: true, reason: "" };
}

/** Pure: the reading the view draws for one slot. `facts` are the latest
 * owner facts for its Session: `activeRuns`, snapshot `revision` and
 * `editableId` (the profile this Chat may edit here; `null` = none). A fact
 * that is not known is absent and never assumed. */
export function editorReading(slot, facts = {}) {
  if (!slot) return null;
  const base = slot.base;
  const text = slot.text ?? "";
  const dirty = Boolean(base) && text !== base.content;
  const known = Number.isSafeInteger(facts.revision) ? facts.revision : null;
  /* Revisions only grow, so an older snapshot (one read before our own save)
     never marks the base stale. */
  const configMoved = Boolean(base && known !== null && known > base.revision);
  const eligible = facts.editableId === undefined ? true : facts.editableId === slot.profileId;
  const suspended = Boolean(slot.suspended);
  const submitted = slot.preview.submitted;
  const previewCurrent = Boolean(base && submitted && !suspended && submitted.text === text
    && submitted.revision === base.revision && !(known !== null && known > submitted.revision));
  let preview = { enabled: true, reason: "" };
  if (!base) preview = { enabled: false, reason: "Reading the source…" };
  else if (suspended) preview = { enabled: false, reason: "This profile is not this chat's own selection now." };
  else if (configMoved && !slot.fresh) preview = { enabled: false, reason: "Read the current source first." };
  let save = { enabled: true, reason: "" };
  if (!base) save = { enabled: false, reason: slot.read.status === "error" ? "The source could not be read." : "Reading the source…" };
  else if (suspended) save = { enabled: false, reason: "This profile is not this chat's own selection now, so it is not saved from here." };
  else if (slot.save.status === "saving") save = { enabled: false, reason: "Saving…" };
  else if (slot.save.status === "unknown") save = { enabled: false, reason: "Whether the last save landed is not known. Check again before saving again." };
  else if (slot.save.status === "frozen") save = { enabled: false, reason: "Saving stays held until a fresh reading shows no active run." };
  else if (slot.fresh) save = { enabled: false, reason: "The saved source changed. Choose how to continue before saving." };
  else if (configMoved) save = { enabled: false, reason: "The configuration changed after this source was read. Read the current source first." };
  else if ((facts.activeRuns || 0) > 0) save = { enabled: false, reason: "A run is active, so saving is frozen. Your text stays here; nothing is queued." };
  else if (!dirty) save = { enabled: false, reason: "No unsaved changes." };
  return {
    key: slot.key,
    sessionId: slot.sessionId,
    profileId: slot.profileId,
    read: clone(slot.read),
    base: base && clone(base),
    text,
    dirty,
    measure: measureText(text),
    fresh: slot.fresh && clone(slot.fresh),
    facts: { revision: known, activeRuns: facts.activeRuns ?? null, editableId: facts.editableId },
    configMoved,
    eligible,
    suspended,
    preview: { ...clone(slot.preview), current: previewCurrent, gate: preview },
    save: { ...clone(slot.save), gate: save },
  };
}

export function createProfileEditor({ adapter, onSaved }) {
  const slots = new Map();
  const known = new Map(); // sessionId → latest owner facts
  const listeners = new Set();
  const emit = () => { for (const listener of listeners) listener(); };

  function slotFor(sessionId, profileId) {
    const key = editorKey(sessionId, profileId);
    if (!slots.has(key))
      slots.set(key, {
        key, sessionId, profileId,
        read: { status: "idle", error: "", code: null },
        base: null, text: null, fresh: null,
        preview: { status: "idle", submitted: null, result: null, error: null },
        save: { status: "idle", submitted: null, message: "", code: null },
        readToken: 0, previewEpoch: 0, saveEpoch: 0,
        suspended: known.get(sessionId)?.editableId !== undefined && known.get(sessionId).editableId !== profileId,
      });
    return slots.get(key);
  }

  const baseOf = (result) => ({
    revision: result.revision,
    resource: { id: result.resource.id, kind: result.resource.kind, title: result.resource.title, scope: clone(result.resource.scope) },
    sourceHash: result.resource.source?.hash ?? null,
    content: result.content,
  });

  const factsOf = (sessionId, override) => ({ ...(known.get(sessionId) || {}), ...(override || {}) });

  async function readBase(slot, { explicit = false } = {}) {
    const token = ++slot.readToken;
    slot.read = { status: "loading", error: "", code: null };
    emit();
    let result;
    try {
      result = await adapter.source(slot.sessionId, slot.profileId);
    } catch (error) {
      if (token !== slot.readToken) return;
      slot.read = { status: "error", error: error.message, code: errorCode(error) };
      emit();
      return;
    }
    if (token !== slot.readToken) return;
    if (result?.resource?.kind !== "agent_profile" || typeof result.content !== "string") {
      slot.read = { status: "error", error: "The Host reports no imported profile source for this id.", code: null };
      emit();
      return;
    }
    slot.read = { status: "ready", error: "", code: null };
    /* A suspended slot resumes only through this explicit read, and only
       while its profile is again this Chat's own selection. */
    if (explicit && slot.suspended && editorReading(slot, factsOf(slot.sessionId)).eligible) slot.suspended = false;
    const reading = baseOf(result);
    /* K5-R2 · an outstanding save owns base, text and save state until its
       reply settles. A read meanwhile only records what the Host now holds;
       the reply (or its own read-back) decides what that reading means. */
    if (slot.save.status === "saving") {
      if (reading.revision !== slot.base.revision || reading.sourceHash !== slot.base.sourceHash) slot.fresh = reading;
      emit();
      return;
    }
    const settling = ["unknown", "different"].includes(slot.save.status) && slot.save.submitted;
    if (settling) {
      /* A hash match confirms the saved bytes now equal the submitted text;
         it does not attribute the write to that request. */
      if (reading.sourceHash === slot.save.submitted.sha256) {
        slot.base = reading;
        slot.fresh = null;
        slot.save = { ...slot.save, status: "saved", message: "The saved source now matches the text you submitted. This read confirms the current saved bytes, not which request wrote them.", code: null };
        emit();
        onSaved?.({ sessionId: slot.sessionId, profileId: slot.profileId });
        return;
      }
      slot.fresh = reading;
      slot.save = { ...slot.save, status: "different", message: "The saved source is not the text you submitted. Nothing was overwritten, and your text is kept.", code: null };
      emit();
      return;
    }
    const dirty = slot.base && slot.text !== slot.base.content;
    if (!slot.base || !dirty) {
      slot.base = reading;
      slot.text = reading.content;
      slot.fresh = null;
    } else if (reading.revision !== slot.base.revision || reading.sourceHash !== slot.base.sourceHash) slot.fresh = reading;
    else slot.fresh = null;
    emit();
  }

  /* The Host's freeze lifts only on a fresh owner fact (a snapshot with no
     active run, or a preview whose save gate is open); nothing is resent. */
  function unfreeze(slot) {
    slot.save = { status: "idle", submitted: null, message: "No run is active now. Nothing was saved meanwhile; Save again when ready.", code: null };
  }

  const api = {
    /** Owner facts from a fresh Runtime Control snapshot of `sessionId`:
     * `activeRuns`, `revision` and `editableId` (each only when known). */
    observe(sessionId, facts = {}) {
      const before = JSON.stringify(known.get(sessionId) ?? null);
      const next = { ...(known.get(sessionId) || {}) };
      if (Number.isSafeInteger(facts.activeRuns)) next.activeRuns = facts.activeRuns;
      if (Number.isSafeInteger(facts.revision) && !(next.revision > facts.revision)) next.revision = facts.revision;
      if (facts.editableId !== undefined) next.editableId = facts.editableId;
      known.set(sessionId, next);
      let changed = JSON.stringify(next) !== before;
      for (const slot of slots.values()) {
        if (slot.sessionId !== sessionId) continue;
        if (facts.activeRuns === 0 && slot.save.status === "frozen") { unfreeze(slot); changed = true; }
        if (next.editableId !== undefined && next.editableId !== slot.profileId && !slot.suspended) { slot.suspended = true; changed = true; }
      }
      if (changed) emit();
    },
    /** "Check again" after a freeze: one fresh snapshot read. */
    async checkFreeze(sessionId) {
      try { api.observe(sessionId, { activeRuns: (await adapter.control(sessionId))?.activeRuns }); }
      catch { /* the held state stays; the person can check again */ }
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    reading(sessionId, profileId, facts) {
      return editorReading(slots.get(editorKey(sessionId, profileId)) || null, factsOf(sessionId, facts));
    },
    has(sessionId, profileId) { return slots.has(editorKey(sessionId, profileId)); },

    /** Start (or resume) editing. An existing draft is kept as it is. */
    open(sessionId, profileId) {
      const slot = slotFor(sessionId, profileId);
      if (!slot.base && slot.read.status !== "loading") void readBase(slot);
      return slot.key;
    },

    setText(sessionId, profileId, text) {
      const slot = slots.get(editorKey(sessionId, profileId));
      if (!slot?.base || slot.suspended || slot.text === text) return;
      slot.text = text;
      emit();
    },

    /** Explicit fresh read of the saved source (also "Check again"). */
    check(sessionId, profileId) {
      const slot = slots.get(editorKey(sessionId, profileId));
      return slot ? readBase(slot, { explicit: true }) : Promise.resolve();
    },

    async preview(sessionId, profileId) {
      const slot = slots.get(editorKey(sessionId, profileId));
      if (!slot?.base || !editorReading(slot, factsOf(sessionId)).preview.gate.enabled) return;
      const own = ++slot.previewEpoch;
      const submitted = { revision: slot.base.revision, text: slot.text };
      slot.preview = { ...slot.preview, status: "loading", submitted };
      emit();
      try {
        const result = await adapter.preview(sessionId, { expectedRevision: submitted.revision, profileId, content: submitted.text });
        if (own !== slot.previewEpoch) return; // a newer preview owns the slot
        const bound = result?.preview === true && result.applied === false && result.revision === submitted.revision
          && result.session?.id === sessionId && result.profile?.id === profileId
          && result.profile?.draftSha256 === await sha256Hex(submitted.text);
        if (own !== slot.previewEpoch) return;
        if (bound && result.save?.available === true && slot.save.status === "frozen") unfreeze(slot);
        slot.preview = bound
          ? { status: "ready", submitted, result, error: null }
          : { status: "error", submitted, result: null, error: { code: null, message: "The Host's preview does not match the submitted text, profile or revision, so it is not shown." } };
      } catch (error) {
        if (own !== slot.previewEpoch) return;
        slot.preview = { status: "error", submitted, result: null, error: { code: errorCode(error), message: error.message } };
        emit();
        if (errorCode(error) === "runtime_conflict") await readBase(slot);
        return;
      }
      emit();
    },

    async save(sessionId, profileId) {
      const slot = slots.get(editorKey(sessionId, profileId));
      /* K5-R2 · the gate is checked and the slot marked saving in the same
         synchronous step, before any await: a second call in the same turn
         (double click, Enter + click) finds it saving and sends nothing. The
         submission — text, base revision, original metadata — is captured
         here too, so typing during hashing never changes it. */
      if (!slot || ["saving", "unknown"].includes(slot.save.status) || !editorReading(slot, factsOf(sessionId)).save.gate.enabled) return;
      const own = ++slot.saveEpoch;
      const text = slot.text;
      const { id, kind, title, scope } = slot.base.resource;
      const submitted = { revision: slot.base.revision, text, sha256: null };
      slot.save = { status: "saving", submitted, message: "", code: null };
      emit();
      submitted.sha256 = await sha256Hex(text);
      let reply;
      try {
        reply = await adapter.save(sessionId, { revision: submitted.revision, operation: "put", resource: { id, kind, title, scope: clone(scope), content: text } });
      } catch (error) {
        if (own !== slot.saveEpoch) return;
        const code = errorCode(error);
        if (code === "runtime_conflict") {
          slot.save = { status: "conflict", submitted, message: "Not saved: the configuration changed after this source was read. Your text is kept.", code };
          emit();
          await readBase(slot);
        } else if (code === "active_run") {
          slot.save = { status: "frozen", submitted, message: "Not saved: a run is active. Your text is kept here and is not queued.", code };
          emit();
        } else if (code) {
          slot.save = { status: "failed", submitted, message: `Not saved: ${error.message}`, code };
          emit();
        } else {
          /* No settled answer. Never resend; read back and compare. */
          slot.save = { status: "unknown", submitted, message: `Whether the source was saved is not known (${error.message}). Reading the saved source to compare…`, code: null };
          emit();
          await readBase(slot);
          if (slot.save.status === "unknown") {
            slot.save = { ...slot.save, message: "Whether the source was saved is not known, and the saved source could not be read. Check again before saving again." };
            emit();
          }
        }
        return;
      }
      if (own !== slot.saveEpoch) return;
      const resource = (reply?.resources || []).find((entry) => entry.id === id);
      if (resource?.source?.hash === submitted.sha256) {
        slot.base = { revision: reply.revision, resource: { id, kind, title, scope: clone(scope) }, sourceHash: submitted.sha256, content: text };
        /* A reading taken while this save was outstanding at or before its
           revision is this write (or older); a newer one is someone else's
           change and stays for a deliberate choice. */
        if (!(slot.fresh && slot.fresh.revision > reply.revision)) slot.fresh = null;
        slot.save = { status: "saved", submitted, message: "Saved. Runs started after this in chats that select this profile use it; earlier runs keep their recorded context.", code: null };
        emit();
        onSaved?.({ sessionId, profileId, snapshot: reply });
        return;
      }
      slot.save = { status: "unknown", submitted, message: "The Host answered, but its reply does not show the submitted source. Reading the saved source to compare…", code: null };
      emit();
      await readBase(slot);
    },

    /** Replace the draft with the current saved source (discards the edit). */
    useCurrent(sessionId, profileId) {
      const slot = slots.get(editorKey(sessionId, profileId));
      if (!slot?.fresh || slot.suspended || slot.save.status === "saving") return;
      slot.base = slot.fresh;
      slot.text = slot.fresh.content;
      slot.fresh = null;
      slot.save = { status: "idle", submitted: null, message: "", code: null };
      emit();
    },
    /** Keep the draft text on top of the current saved source. Nothing is
     * saved; the next Save is checked against the new revision. */
    keepMine(sessionId, profileId) {
      const slot = slots.get(editorKey(sessionId, profileId));
      if (!slot?.fresh || slot.suspended || slot.save.status === "saving") return;
      slot.base = slot.fresh;
      slot.fresh = null;
      slot.save = { status: "idle", submitted: null, message: "", code: null };
      emit();
    },
    /** Put the saved text back into the field. */
    revert(sessionId, profileId) {
      const slot = slots.get(editorKey(sessionId, profileId));
      if (!slot?.base || slot.suspended || slot.save.status === "saving") return;
      slot.text = slot.base.content;
      if (slot.save.status !== "unknown") slot.save = { status: "idle", submitted: null, message: "", code: null };
      emit();
    },
  };
  return api;
}
