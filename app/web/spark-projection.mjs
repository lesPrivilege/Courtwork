/* WO-SP1-FE · The only place in app/web that knows the shape of the frozen
 * BE-41 read-only projection (`GET /work-derivations`), per
 * `engineering/design/spark-surface-2026-09-10/be41-dto.md`. BE-41 is served by the existing Core read-only projection; this module validates
 * its shape and does not
 * invent fields the doc did not freeze.
 *
 * Rules, matching the conventions already written down for the other
 * adapters in this directory (`coordination-projection.mjs`,
 * `usage-projection.mjs`):
 *
 *   1. Pure. No fetch, no DOM, no Date.now(), no ordering of its own beyond
 *      partitioning the server's own array in the order it arrived.
 *   2. A missing measurement is an explicit `null`, never `0` and never a
 *      dropped field. `availability !== "observed"` forces every derivation
 *      count to `null`; a `0` in that position is treated as an unrecognised
 *      payload, not as "zero stale items", because a real backend that
 *      confuses the two would otherwise render a silent false negative.
 *   3. A shape this module does not recognise yields `null` from
 *      `validSparkDerivations`. The view shows the unsupported-payload
 *      message; it never renders half a Matter.
 *   4. `staleRefs` is capped at 20 per Matter (the frozen page ceiling) and
 *      `staleRefsTruncated` must agree with that cap: true only where the
 *      cap was hit, false only where every stale candidate is present.
 *   5. Every Matter in one response is read at the same Core state, so every
 *      Matter must carry the same `snapshotRef`. A response mixing two
 *      snapshots is rejected rather than shown as one observation.
 */

/** `candidate.status` CHECK constraint (`app/core/core.py`). Restated here,
 * never re-worded, exactly like `coordination-projection.mjs` restates the
 * message-status enum. */
export const CANDIDATE_STATUSES = ["pending", "accepted", "rejected", "needs_evidence"];
/** `availability` (projection-contract.md Measurement envelope, narrowed by
 * BE-41 to the three values the DTO actually uses). */
export const AVAILABILITY_STATES = ["observed", "partial", "unavailable"];
/** Server page ceiling for `staleRefs` per Matter (be41-dto.md §语义). */
export const STALE_REFS_PAGE = 20;

const isString = (value) => typeof value === "string" && value.length > 0;
const isIsoDate = (value) => isString(value) && Number.isFinite(Date.parse(value));
const isCount = (value) => Number.isSafeInteger(value) && value >= 0;
const object = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function projectSourceRef(ref) {
  if (!object(ref)) return null;
  if (!isString(ref.sourceId)) return null;
  if (!Number.isSafeInteger(ref.version) || ref.version < 0) return null;
  return { sourceId: ref.sourceId, version: ref.version };
}

function projectReplacedRef(ref) {
  if (!object(ref)) return null;
  if (!isString(ref.sourceId)) return null;
  if (!Number.isSafeInteger(ref.fromVersion) || !Number.isSafeInteger(ref.toVersion)) return null;
  if (ref.fromVersion < 0 || ref.toVersion < 0 || ref.toVersion === ref.fromVersion) return null;
  return { sourceId: ref.sourceId, fromVersion: ref.fromVersion, toVersion: ref.toVersion };
}

/** `null` when the current source revision has no prior revision
 * (be41-dto.md §语义). An invalid non-null shape is reported with the
 * `INVALID` sentinel so the caller can tell "no prior revision" apart from
 * "this runtime published a shape we don't recognise". */
const INVALID = Symbol("invalid-source-set-change");
function projectSourceSetChange(change) {
  if (change === null) return null;
  if (!object(change)) return INVALID;
  if (!Number.isSafeInteger(change.fromRevision) || change.fromRevision < 0) return INVALID;
  if (!Number.isSafeInteger(change.toRevision) || change.toRevision <= change.fromRevision) return INVALID;
  if (!Array.isArray(change.added) || !Array.isArray(change.replaced) || !Array.isArray(change.removed)) return INVALID;
  const added = change.added.map(projectSourceRef);
  if (added.some((ref) => ref === null)) return INVALID;
  const replaced = change.replaced.map(projectReplacedRef);
  if (replaced.some((ref) => ref === null)) return INVALID;
  const removed = change.removed.map(projectSourceRef);
  if (removed.some((ref) => ref === null)) return INVALID;
  return { fromRevision: change.fromRevision, toRevision: change.toRevision, added, replaced, removed };
}

function projectStaleRef(ref) {
  if (!object(ref)) return null;
  if (!isString(ref.candidateId)) return null;
  if (!CANDIDATE_STATUSES.includes(ref.status)) return null;
  if (!isCount(ref.candidateSourceVersion) || !isCount(ref.matterSourceVersion)) return null;
  // A stale candidate is, by definition, behind the Matter's current source
  // revision (SP-2). A ref that is not strictly behind is not a stale ref.
  if (ref.candidateSourceVersion >= ref.matterSourceVersion) return null;
  if (!(ref.supersedes === null || isString(ref.supersedes))) return null;
  return {
    candidateId: ref.candidateId,
    status: ref.status,
    candidateSourceVersion: ref.candidateSourceVersion,
    matterSourceVersion: ref.matterSourceVersion,
    behind: ref.matterSourceVersion - ref.candidateSourceVersion,
    supersedes: ref.supersedes,
  };
}

function projectByStatus(entry, observed) {
  if (!object(entry)) return null;
  if (!CANDIDATE_STATUSES.includes(entry.status)) return null;
  if (observed) {
    if (!isCount(entry.current) || !isCount(entry.stale)) return null;
  } else if (entry.current !== null || entry.stale !== null) return null;
  return { status: entry.status, current: entry.current, stale: entry.stale };
}

function projectMatter(matter) {
  if (!object(matter)) return null;
  if (!isString(matter.matterId) || !isString(matter.title) || !isString(matter.extensionId)) return null;
  if (!Number.isSafeInteger(matter.version) || matter.version < 0) return null;
  if (!Number.isSafeInteger(matter.sourceVersion) || matter.sourceVersion < 0) return null;
  if (!isString(matter.snapshotRef)) return null;
  if (!AVAILABILITY_STATES.includes(matter.availability)) return null;
  const observed = matter.availability === "observed";
  if (!(matter.reason === null || isString(matter.reason))) return null;
  // observed carries no reason to explain; partial/unavailable must give one.
  if (observed !== (matter.reason === null)) return null;

  const derivations = matter.derivations;
  if (!object(derivations)) return null;
  if (observed) {
    if (!isCount(derivations.total) || !isCount(derivations.current) || !isCount(derivations.stale)) return null;
    if (derivations.total !== derivations.current + derivations.stale) return null;
  } else if (derivations.total !== null || derivations.current !== null || derivations.stale !== null) return null;

  if (!Array.isArray(derivations.byStatus)) return null;
  const byStatus = [];
  for (const raw of derivations.byStatus) {
    const entry = projectByStatus(raw, observed);
    if (!entry) return null;
    byStatus.push(entry);
  }
  if (observed) {
    const sumCurrent = byStatus.reduce((sum, entry) => sum + entry.current, 0);
    const sumStale = byStatus.reduce((sum, entry) => sum + entry.stale, 0);
    if (sumCurrent !== derivations.current || sumStale !== derivations.stale) return null;
  }

  if (!Array.isArray(matter.staleRefs)) return null;
  const staleRefs = [];
  for (const raw of matter.staleRefs) {
    const ref = projectStaleRef(raw);
    if (!ref) return null;
    staleRefs.push(ref);
  }
  if (staleRefs.length > STALE_REFS_PAGE) return null;
  if (typeof matter.staleRefsTruncated !== "boolean") return null;
  if (observed) {
    if (staleRefs.length > derivations.stale) return null;
    if (matter.staleRefsTruncated && staleRefs.length !== STALE_REFS_PAGE) return null;
    if (!matter.staleRefsTruncated && staleRefs.length !== derivations.stale) return null;
  } else if (staleRefs.length !== 0 || matter.staleRefsTruncated) return null;

  if (!("sourceSetChange" in matter)) return null;
  const sourceSetChange = projectSourceSetChange(matter.sourceSetChange);
  if (sourceSetChange === INVALID) return null;

  return {
    matterId: matter.matterId,
    title: matter.title,
    extensionId: matter.extensionId,
    version: matter.version,
    sourceVersion: matter.sourceVersion,
    snapshotRef: matter.snapshotRef,
    availability: matter.availability,
    reason: matter.reason,
    derivations: { total: derivations.total, current: derivations.current, stale: derivations.stale, byStatus },
    staleRefs,
    staleRefsTruncated: matter.staleRefsTruncated,
    sourceSetChange,
  };
}

/**
 * `GET /work-derivations?projectId=&limit=&offset=` → the validated page, or
 * `null` for a payload this surface does not recognise (including a 200 body
 * whose shape predates or diverges from the frozen DTO — the caller must not
 * treat that as zero Matters).
 */
export function validSparkDerivations(payload) {
  if (!object(payload) || payload.schemaVersion !== 1) return null;
  if (!isIsoDate(payload.asOf)) return null;
  if (!isString(payload.scopeRef)) return null;
  if (!object(payload.coverage)) return null;
  if (!["complete", "partial"].includes(payload.coverage.matters)) return null;
  if (payload.coverage.matters === "complete" && payload.coverage.reason !== null) return null;
  if (payload.coverage.matters === "partial" && !isString(payload.coverage.reason)) return null;
  if (!object(payload.page)) return null;
  const { limit, offset, total } = payload.page;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) return null;
  if (!isCount(offset) || !isCount(total)) return null;
  if (!Array.isArray(payload.matters)) return null;
  if (payload.matters.length > limit) return null;
  if (payload.matters.length && offset + payload.matters.length > total) return null;

  const matters = [];
  for (const raw of payload.matters) {
    const matter = projectMatter(raw);
    if (!matter) return null;
    matters.push(matter);
  }
  if (new Set(matters.map((m) => m.matterId)).size !== matters.length) return null;
  // One read is one Core state (be41-dto.md §语义): every row in this page
  // must agree on which snapshot it was read at.
  const snapshotRefs = new Set(matters.map((m) => m.snapshotRef));
  if (snapshotRefs.size > 1) return null;
  // The live endpoint binds even an empty page. Legacy explicit sample files
  // omit this field and keep their row-bound snapshot compatibility.
  if ("snapshotRef" in payload && (typeof payload.snapshotRef !== "string" ||
      !/^core-state:[0-9a-f]{64}$/.test(payload.snapshotRef))) return null;
  if ("snapshotRef" in payload && matters.some(m => m.snapshotRef !== payload.snapshotRef)) return null;

  return {
    schemaVersion: 1,
    asOf: payload.asOf,
    scopeRef: payload.scopeRef,
    coverage: { matters: payload.coverage.matters, reason: payload.coverage.reason },
    page: { limit, offset, total },
    matters,
    // Null remains possible only for legacy empty samples without a token.
    snapshotRef: payload.snapshotRef ?? matters[0]?.snapshotRef ?? null,
  };
}

/**
 * Two reads name the same Core state when their nonempty tokens agree.
 * Live empty pages carry a token; legacy tokenless samples cannot establish
 * consistency with another read.
 */
export function sameSnapshot(a, b) {
  return Boolean(a?.snapshotRef) && Boolean(b?.snapshotRef) && a.snapshotRef === b.snapshotRef;
}

/**
 * Overview's three zones (WO-SP1-FE §两页): a Matter with any stale
 * derivations, a Matter that is entirely current (the quiet zone — WO-SP1-FE
 * requires it not be mixed with stale rows), and a Matter this read could not
 * observe. Partition only; the server's own array order is preserved.
 */
export function overviewBuckets(data) {
  const active = [], quiet = [], unavailable = [];
  for (const matter of data.matters) {
    if (matter.availability !== "observed") unavailable.push(matter);
    else if (matter.derivations.stale > 0) active.push(matter);
    else quiet.push(matter);
  }
  return { active, quiet, unavailable };
}

/** A short, human sentence for a Matter's `sourceSetChange`, or `null` for
 * "no prior revision" (never rendered as "no change"; those are different
 * facts). Counts only — this never resolves what a `sourceId` refers to. */
export function sourceSetChangeSummary(change) {
  if (change === null) return null;
  const parts = [];
  if (change.added.length) parts.push(`${change.added.length} added`);
  if (change.replaced.length) parts.push(`${change.replaced.length} replaced`);
  if (change.removed.length) parts.push(`${change.removed.length} removed`);
  const detail = parts.length ? parts.join(", ") : "no membership change";
  return `Revision ${change.fromRevision} → ${change.toRevision} · ${detail}`;
}

/** Activity's per-Matter footer when the frozen 20-ref page was hit. `null`
 * when every stale ref for this Matter is already present. */
export function truncationNote(matter) {
  if (!matter.staleRefsTruncated) return null;
  return `Showing ${matter.staleRefs.length} of ${matter.derivations.stale}`;
}

/** Activity rows for one Matter, optionally narrowed to one candidate
 * status. A pure re-filter of already-validated refs; no new ordering. */
export function activityRows(matter, status = "all") {
  return matter.staleRefs.filter((ref) => status === "all" || ref.status === status);
}
