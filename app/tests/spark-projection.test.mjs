/* WO-SP1-FE · Projection-module tests, following the convention already used
 * for `coordination-projection.mjs` (`coordination-view.test.mjs`) and
 * `usage-projection.mjs`: exercise the pure validator against the frozen
 * BE-41 shape (`be41-dto.md`) and its counterexamples — a payload this
 * surface does not recognise must come back `null`, never a half-shown
 * Matter — plus the small pure helpers the view renders from.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  activityRows,
  overviewBuckets,
  sameSnapshot,
  sourceSetChangeSummary,
  truncationNote,
  validSparkDerivations,
} from "../web/spark-projection.mjs";

const root = new URL("../", import.meta.url).pathname;
const fixture = (name) => JSON.parse(readFileSync(`${root}tests/fixtures/spark-derivations/${name}.json`, "utf8"));

/* ---- The five frozen fixtures all validate, with the shapes the fixture
 * table (be41-dto.md) promises. ---- */

test("SP1-FE · stale.json validates: one Matter behind, one fully current, sharing a snapshot", () => {
  const data = validSparkDerivations(fixture("stale"));
  assert.ok(data);
  assert.equal(data.matters.length, 2);
  assert.equal(data.snapshotRef, "core-state:9f2c1ab4");
  const buckets = overviewBuckets(data);
  assert.deepEqual(buckets.active.map((m) => m.matterId), ["m-1"]);
  assert.deepEqual(buckets.quiet.map((m) => m.matterId), ["m-2"]);
  assert.deepEqual(buckets.unavailable, []);
  assert.equal(sourceSetChangeSummary(buckets.active[0].sourceSetChange), "Revision 2 → 3 · 1 added, 1 replaced");
  assert.equal(sourceSetChangeSummary(buckets.quiet[0].sourceSetChange), null);
});

test("SP1-FE · quiet.json validates: every Matter current, no prompt-worthy bucket", () => {
  const data = validSparkDerivations(fixture("quiet"));
  assert.ok(data);
  const buckets = overviewBuckets(data);
  assert.equal(buckets.active.length, 0);
  assert.equal(buckets.quiet.length, 2);
});

test("SP1-FE · empty.json validates: no Matters, page.total 0", () => {
  const data = validSparkDerivations(fixture("empty"));
  assert.ok(data);
  assert.deepEqual(data.matters, []);
  assert.equal(data.page.total, 0);
  // No Matter carries a snapshot, so none can be claimed for this read.
  assert.equal(data.snapshotRef, null);
});

test("SP1-FE · partial.json validates: unavailable Matter keeps null counts, not zero", () => {
  const data = validSparkDerivations(fixture("partial"));
  assert.ok(data);
  const matter = data.matters[0];
  assert.equal(matter.availability, "partial");
  assert.equal(matter.derivations.total, null);
  assert.equal(matter.derivations.current, null);
  assert.equal(matter.derivations.stale, null);
  assert.equal(matter.reason, "contract_unsupported");
  assert.equal(data.coverage.matters, "partial");
  const buckets = overviewBuckets(data);
  assert.deepEqual(buckets.unavailable.map((m) => m.matterId), ["d-1"]);
});

test("SP1-FE · truncated.json validates: 20 refs loaded, true count stated separately", () => {
  const data = validSparkDerivations(fixture("truncated"));
  assert.ok(data);
  const matter = data.matters[0];
  assert.equal(matter.staleRefs.length, 20);
  assert.equal(matter.staleRefsTruncated, true);
  assert.equal(matter.derivations.stale, 37);
  assert.equal(truncationNote(matter), "Showing 20 of 37");
});

/* ---- null vs 0: the WO's named hard requirement. A backend that reports
 * zero counts alongside a non-observed availability is not "zero stale
 * items" — it is an unrecognised shape, because that combination is exactly
 * what a null/0 conflation bug would produce. ---- */

test("SP1-FE · a 0 where a non-observed Matter must publish null is rejected, not read as zero", () => {
  const payload = fixture("partial");
  payload.matters[0].derivations = { total: 0, current: 0, stale: 0, byStatus: [] };
  assert.equal(validSparkDerivations(payload), null);
});

test("SP1-FE · an observed Matter reporting stale:null instead of a real zero is rejected", () => {
  const payload = fixture("quiet");
  payload.matters[0].derivations.stale = null;
  assert.equal(validSparkDerivations(payload), null);
});

test("SP1-FE · a genuine zero-stale Matter is accepted and stays a real, distinct zero", () => {
  const data = validSparkDerivations(fixture("quiet"));
  assert.equal(data.matters[0].derivations.stale, 0);
  assert.notEqual(data.matters[0].derivations.stale, null);
});

/* ---- Truncation counterexamples. ---- */

test("SP1-FE · staleRefsTruncated true with fewer than 20 loaded refs is rejected", () => {
  const payload = fixture("stale");
  payload.matters[0].staleRefsTruncated = true;
  assert.equal(validSparkDerivations(payload), null);
});

test("SP1-FE · staleRefsTruncated false while refs fall short of the stated stale count is rejected", () => {
  const payload = fixture("stale");
  payload.matters[0].derivations.stale = 5; // now exceeds the 2 loaded refs, still marked not-truncated
  payload.matters[0].derivations.total = payload.matters[0].derivations.current + 5;
  assert.equal(validSparkDerivations(payload), null);
});

test("SP1-FE · more than the 20-ref page ceiling is rejected outright", () => {
  const payload = fixture("truncated");
  payload.matters[0].staleRefs.push({ candidateId: "c-999", status: "pending", candidateSourceVersion: 1, matterSourceVersion: 9, supersedes: null });
  assert.equal(validSparkDerivations(payload), null);
});

/* ---- snapshotRef counterexamples: never let two Core states share one
 * observation. ---- */

test("SP1-FE · two Matters in one page reporting different snapshotRefs is rejected", () => {
  const payload = fixture("stale");
  payload.matters[1].snapshotRef = "core-state:different";
  assert.equal(validSparkDerivations(payload), null);
});

test("SP1-FE · sameSnapshot refuses to confirm consistency across a null snapshot", () => {
  assert.equal(sameSnapshot({ snapshotRef: null }, { snapshotRef: null }), false);
  assert.equal(sameSnapshot({ snapshotRef: "a" }, { snapshotRef: "a" }), true);
  assert.equal(sameSnapshot({ snapshotRef: "a" }, { snapshotRef: "b" }), false);
  assert.equal(sameSnapshot(null, { snapshotRef: "a" }), false);
});

/* ---- Other shape counterexamples. ---- */

test("SP1-FE · wrong schemaVersion is rejected", () => {
  const payload = fixture("stale");
  payload.schemaVersion = 2;
  assert.equal(validSparkDerivations(payload), null);
});

test("SP1-FE · a stale ref not actually behind the Matter's source revision is rejected", () => {
  const payload = fixture("stale");
  payload.matters[0].staleRefs[0].candidateSourceVersion = payload.matters[0].sourceVersion;
  assert.equal(validSparkDerivations(payload), null);
});

test("SP1-FE · byStatus counts that don't sum to derivations.current/stale are rejected", () => {
  const payload = fixture("stale");
  payload.matters[0].derivations.byStatus[0].current = 99;
  assert.equal(validSparkDerivations(payload), null);
});

test("SP1-FE · an observed Matter must not carry a reason", () => {
  const payload = fixture("stale");
  payload.matters[0].reason = "should not be here";
  assert.equal(validSparkDerivations(payload), null);
});

test("SP1-FE · a partial Matter must carry a reason", () => {
  const payload = fixture("partial");
  payload.matters[0].reason = null;
  assert.equal(validSparkDerivations(payload), null);
});

test("SP1-FE · sourceSetChange with a non-increasing revision pair is rejected", () => {
  const payload = fixture("stale");
  payload.matters[0].sourceSetChange.toRevision = payload.matters[0].sourceSetChange.fromRevision;
  assert.equal(validSparkDerivations(payload), null);
});

test("SP1-FE · a missing sourceSetChange key (vs. an explicit null) is rejected", () => {
  const payload = fixture("stale");
  delete payload.matters[1].sourceSetChange;
  assert.equal(validSparkDerivations(payload), null);
});

test("SP1-FE · duplicate matterId within one page is rejected", () => {
  const payload = fixture("stale");
  payload.matters[1].matterId = payload.matters[0].matterId;
  assert.equal(validSparkDerivations(payload), null);
});

test("SP1-FE · page bounds exceeding the reported total are rejected", () => {
  const payload = fixture("stale");
  payload.page.total = 1;
  assert.equal(validSparkDerivations(payload), null);
});

test("SP1-FE · coverage.matters partial without a machine-readable reason is rejected", () => {
  const payload = fixture("partial");
  payload.coverage.reason = null;
  assert.equal(validSparkDerivations(payload), null);
});

test("SP1-FE · a non-object payload, and a missing top-level field, are both rejected", () => {
  assert.equal(validSparkDerivations(null), null);
  assert.equal(validSparkDerivations({}), null);
  const payload = fixture("stale");
  delete payload.scopeRef;
  assert.equal(validSparkDerivations(payload), null);
});

/* ---- Activity's per-Matter row filter. ---- */

test("SP1-FE · activityRows narrows to one candidate status without reordering", () => {
  const data = validSparkDerivations(fixture("stale"));
  const matter = data.matters[0];
  assert.deepEqual(activityRows(matter, "all").map((r) => r.candidateId), ["c-9", "c-10"]);
  assert.deepEqual(activityRows(matter, "pending").map((r) => r.candidateId), ["c-9", "c-10"]);
  assert.deepEqual(activityRows(matter, "accepted"), []);
});

test("SP1-FE · truncationNote is null once every stale ref for a Matter is loaded", () => {
  const data = validSparkDerivations(fixture("stale"));
  assert.equal(truncationNote(data.matters[0]), null);
  assert.equal(truncationNote(data.matters[1]), null);
});
