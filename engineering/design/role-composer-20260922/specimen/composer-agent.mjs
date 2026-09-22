/* Role-first Composer · the next-run Agent choice, without a DOM.
 *
 * One controller owns "which Agent will the next run in this chat use, and what
 * does its owner say about it". It holds no facts of its own: rows, profile
 * details, runtime/model/permission readings and the chat's active Run all come
 * from the injected adapter. It never reaches for fetch, storage, a clock or
 * `document`, so both specimen alternatives drive the *same* state and differ
 * only in how they present it.
 *
 * What the choice is, and is not:
 *   - it is a **draft for this chat's next run**. Nothing here saves it, and no
 *     owner implements a per-chat Agent binding yet (gap G1 in the README).
 *   - it is not a profile edit. Role, Kits and runtime are changed in Settings →
 *     Agents by the accepted Agent profiles controller; this file only re-reads.
 *   - it never changes the running Run. A Run is bound to the profile revision it
 *     was admitted with; choosing another Agent applies to a run started later.
 *     No queue, no hot swap.
 *
 * Late replies: readings are kept per profile id, each with its own request
 * token. A reply is adopted only into its own id's slot and only if it is that
 * id's newest request, so a slow reply for A can neither land on B nor replace a
 * newer reading of A (FN-07, the 06a epoch rule applied per object).
 */

import { projectProfile } from "../../../../app/web/agent-profiles.mjs";

const clone = (value) => structuredClone(value);

/** Pure. What the next run with the chosen Agent would be, from owner facts
 * only. An absent fact stays absent; nothing is defaulted to "allowed". */
export function projectNextRun({ row, reading, activeRun }) {
  if (!row) return null;
  const detail = reading?.status === "ready" ? reading.detail : null;
  const out = {
    id: row.id,
    name: row.name,
    responsibility: row.responsibility,
    readingStatus: reading?.status ?? "idle",
    readingError: reading?.error ?? "",
    revision: detail ? detail.profile.revision : row.revision,
    runtime: null,
    model: null,
    kits: [],
    unchecked: [],
    permissions: { allowed: [], asks: [], denied: [], unreported: [], unsupported: [] },
    blockers: [],
    when: "",
    send: { enabled: false, reason: "" },
  };
  if (detail) {
    const draft = { roleId: detail.profile.roleId, kitIds: [...detail.profile.kitIds], runtimeId: detail.profile.runtimeId };
    const projection = projectProfile(detail, draft);
    const runtime = projection.runtime;
    out.role = projection.role?.name ?? null;
    /* Each Kit carries its attributed compatibility reading from the shared
       06a projection: supported / unsupported / unchecked (06E-R1). */
    out.kits = projection.selectedKits.map((kit) => ({
      id: kit.id,
      name: kit.name,
      version: kit.version,
      compatibility: projection.compatibility[kit.id] ?? null,
    }));
    if (runtime) {
      out.runtime = {
        id: runtime.id,
        name: runtime.name,
        location: runtime.location,
        available: runtime.availability === "available",
        unavailableReason: runtime.unavailableReason,
      };
      /* Who decides the model is part of the reading, not a footnote: a
         runtime-native model is not the one saved in Models, and changing Models
         would not change it. */
      out.model = {
        owner: runtime.modelOwner,
        effective: runtime.model.effective,
        source: runtime.model.source,
        requested: runtime.model.requested,
      };
    }
    /* Requested (Kit) → supported (runtime) → effect (permission owner). Four
       different answers stay four different lists; none becomes "deny". */
    for (const request of projection.requests) {
      const line = { action: request.action, label: request.label, kits: request.kitNames };
      if (request.supported === false) out.permissions.unsupported.push(line);
      else if (request.effect === "allow") out.permissions.allowed.push(line);
      else if (request.effect === "ask") out.permissions.asks.push(line);
      else if (request.effect === "deny") out.permissions.denied.push(line);
      else out.permissions.unreported.push(line);
    }
    if (runtime && runtime.availability !== "available")
      out.blockers.push(`${runtime.name} is unavailable: ${runtime.unavailableReason}`);
    /* Only verified-unsupported owner evidence blocks. `unchecked` is said in
       the reading and leaves every other blocker exactly as it was. */
    for (const kit of out.kits.filter((entry) => entry.compatibility?.result === "unsupported"))
      out.blockers.push(`${kit.name} ${kit.version} is not supported on ${runtime.name} (${kit.compatibility.evidenceRef}).`);
    out.unchecked = out.kits.filter((entry) => entry.compatibility?.result === "unchecked").map((entry) => entry.id);
  } else if (row.runtimeAvailability === "unavailable") {
    /* The row already says so; the detail read is still needed for the rest. */
    out.blockers.push(`${row.runtimeName} is unavailable.`);
  }

  /* When the choice takes effect. The running Run keeps its own binding. */
  if (activeRun) {
    const same = activeRun.profileId === row.id;
    out.when = same
      ? out.revision !== activeRun.profileRevision
        ? `Running now on ${activeRun.profileName} · revision ${activeRun.profileRevision}. A run you start after it ends uses revision ${out.revision}.`
        : `Running now on ${activeRun.profileName} · revision ${activeRun.profileRevision}. A run you start after it ends uses the same agent.`
      : `Running now on ${activeRun.profileName} · revision ${activeRun.profileRevision}, which it keeps. ${row.name} applies to a run you start after it ends.`;
  } else {
    out.when = `Applies to the next run you start in this chat.`;
  }

  if (activeRun) out.send = { enabled: false, reason: "Available after this run ends." };
  else if (out.readingStatus === "loading" || out.readingStatus === "idle")
    out.send = { enabled: false, reason: `Reading ${row.name}…` };
  else if (out.readingStatus === "error")
    out.send = { enabled: false, reason: `${row.name}'s configuration could not be read, so it is unknown what this run would use.` };
  else if (out.blockers.length)
    out.send = { enabled: false, reason: `${row.name} cannot start a run: ${out.blockers.join(" ")}` };
  else out.send = { enabled: true, reason: "" };
  return out;
}

export function createComposerAgentController({ adapter }) {
  const listeners = new Set();
  let list = { status: "idle", rows: [], error: "" };
  let selectedId = null;
  /* Per-id reading slot: { status, detail, error, token }. */
  const readings = new Map();
  let tokens = 0;
  let listEpoch = 0;
  let chat = adapter.chat();
  /* The revision the person last saw for the selection, so a change made
     elsewhere (Settings) is said rather than silently adopted. */
  let seenRevision = null;
  let changedNotice = "";

  function getState() {
    const row = list.rows.find((entry) => entry.id === selectedId) || null;
    const activeRun = chat.activeRun
      ? { ...chat.activeRun, profileName: list.rows.find((entry) => entry.id === chat.activeRun.profileId)?.name ?? chat.activeRun.profileId }
      : null;
    return clone({
      list,
      chat,
      selectedId,
      activeRun,
      changedNotice,
      readings: Object.fromEntries([...readings].map(([id, slot]) => [id, { status: slot.status, detail: slot.detail, error: slot.error }])),
      next: projectNextRun({ row, reading: readings.get(selectedId), activeRun }),
    });
  }
  const emit = () => {
    const state = getState();
    for (const listener of listeners) listener(state);
  };

  async function read(id) {
    const token = ++tokens;
    const previous = readings.get(id);
    /* A re-read keeps the previous detail beside `loading`: it is still the
       last confirmed reading, but it is not the newest one until this answers. */
    readings.set(id, { status: "loading", detail: previous?.detail ?? null, error: "", token });
    emit();
    try {
      const detail = await adapter.open(id);
      if (readings.get(id)?.token !== token) return;
      readings.set(id, { status: "ready", detail, error: "", token });
      if (id === selectedId) noteRevision(detail.profile.revision);
    } catch (error) {
      if (readings.get(id)?.token !== token) return;
      readings.set(id, { status: "error", detail: null, error: error.message, token });
    }
    emit();
  }

  function noteRevision(revision) {
    if (seenRevision !== null && revision !== seenRevision) {
      const name = list.rows.find((entry) => entry.id === selectedId)?.name ?? selectedId;
      changedNotice = `${name} changed: revision ${seenRevision} → ${revision}.`;
    }
    seenRevision = revision;
  }

  const api = {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      listener(getState());
      return () => listeners.delete(listener);
    },

    async load() {
      const own = ++listEpoch;
      chat = adapter.chat();
      list = { status: "loading", rows: list.rows, error: "" };
      emit();
      try {
        const { rows } = await adapter.list();
        if (own !== listEpoch) return;
        list = { status: "ready", rows, error: "" };
        /* The chat's default is an adapter fact; an id the list no longer
           offers is not kept as a selection nobody can read. */
        if (!selectedId || !rows.some((entry) => entry.id === selectedId)) {
          selectedId = rows.some((entry) => entry.id === chat.defaultProfileId) ? chat.defaultProfileId : rows[0]?.id ?? null;
          seenRevision = null;
        }
      } catch (error) {
        if (own !== listEpoch) return;
        list = { status: "error", rows: list.rows, error: error.message };
      }
      emit();
      if (selectedId && list.status === "ready") await read(selectedId);
    },

    /** Read one profile for a preview (alternative A's highlight). */
    preview(id) {
      const slot = readings.get(id);
      if (slot && (slot.status === "ready" || slot.status === "loading")) return;
      void read(id);
    },

    select(id) {
      if (!list.rows.some((entry) => entry.id === id)) return;
      if (id !== selectedId) {
        selectedId = id;
        seenRevision = null;
        changedNotice = "";
      }
      const slot = readings.get(id);
      if (slot?.status === "ready") seenRevision = slot.detail.profile.revision;
      emit();
      if (!slot || slot.status === "error") void read(id);
    },

    retry() {
      if (list.status === "error") return api.load();
      if (selectedId) return read(selectedId);
    },

    /** After a Settings visit: the list and the selected reading are re-read;
     * the selection and every other draft are left exactly as they were. */
    async refresh() {
      const own = ++listEpoch;
      chat = adapter.chat();
      try {
        const { rows } = await adapter.list();
        if (own !== listEpoch) return;
        list = { status: "ready", rows, error: "" };
      } catch (error) {
        if (own !== listEpoch) return;
        list = { status: "error", rows: list.rows, error: error.message };
      }
      for (const id of [...readings.keys()]) if (id !== selectedId) readings.delete(id);
      emit();
      if (selectedId) await read(selectedId);
    },

    dismissNotice() {
      changedNotice = "";
      emit();
    },
  };
  return api;
}
