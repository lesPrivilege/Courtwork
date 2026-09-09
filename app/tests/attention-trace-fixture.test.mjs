import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import { TRACE_VECTORS } from "./fixtures/attention-trace/vectors.mjs";
import { assertValidTraceVectors, validateTraceVector } from "./fixtures/attention-trace/validate.mjs";

const execFile = promisify(execFileCallback);

test("synthetic trace vectors preserve edits, stale approval, unknown effect, duplicate surfacing and non-score samples", () => {
  assert.deepEqual(assertValidTraceVectors(), { vectorCount: 4, valid: true });
  const edit = TRACE_VECTORS.find(({ id }) => id === "edit-draft-edit-effect");
  assert.equal(edit.events.filter(({ kind }) => kind === "edit").length, edit.expected.reconstructableEdits);
  const stale = TRACE_VECTORS.find(({ id }) => id === "stale-and-duplicate-decisions");
  assert.ok(stale.events.some(({ status }) => status === "stale_rejected"));
  const unknown = TRACE_VECTORS.find(({ id }) => id === "unknown-and-missing-times");
  assert.equal(unknown.events.at(-1).status, "unknown");
  const samples = TRACE_VECTORS.find(({ id }) => id === "duplicate-surfacing-and-unsurfaced-sample");
  assert.equal(samples.expected.noAccuracyOrCalibrationClaim, true);
});

test("trace fixture validator rejects contradictions rather than turning missing evidence into a score", () => {
  const invalid = structuredClone(TRACE_VECTORS[1]);
  invalid.events[3].status = "verified";
  invalid.events[3].verifiedAt = "2026-09-09T01:02:00Z";
  invalid.events[5].duplicate = false;
  assert.match(validateTraceVector(invalid).join("\n"), /duplicate decision must be surfaced/);
  const unknown = structuredClone(TRACE_VECTORS[2]);
  unknown.events.at(-1).verifiedAt = "2026-09-09T01:03:00Z";
  assert.match(validateTraceVector(unknown).join("\n"), /unknown effect cannot claim verification time/);
});

test("trace fixture validation runner is executable within the fixture directory", async () => {
  const runner = new URL("./fixtures/attention-trace/run-validation.mjs", import.meta.url).pathname;
  const { stdout } = await execFile(process.execPath, [runner]);
  assert.deepEqual(JSON.parse(stdout), { vectorCount: 4, valid: true });
});
