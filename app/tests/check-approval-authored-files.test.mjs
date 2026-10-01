/* Review D4 (engineering/reviews/doc-driven-code-review-2026-09-29): a check
 * executes files the model wrote into the private candidate, with the Host
 * user's rights. The approval names those files from the Host's own
 * `repository.write.confirmed` receipts, bounded by the write revision the
 * request was bound to, so a person approves the code that will run rather
 * than only `node --test`. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { candidateAuthoredFiles } from "../web/thread-projection.mjs";

const confirmed = (candidateId, path, contentSha256, writeRevision) =>
  ({ type: "repository.write.confirmed", data: { candidateId, path, contentSha256, bytes: 1, writeRevision } });

test("lists the latest confirmed write per path up to the approved write revision", () => {
  const events = [
    confirmed("c1", "test/a.test.mjs", "a".repeat(64), 1),
    confirmed("c1", "src/b.mjs", "b".repeat(64), 2),
    confirmed("c1", "test/a.test.mjs", "c".repeat(64), 3),
    confirmed("c1", "late.mjs", "d".repeat(64), 4),
    confirmed("c2", "other.mjs", "e".repeat(64), 1),
    { type: "repository.write.failed", data: { candidateId: "c1", path: "failed.mjs" } },
  ];
  assert.deepEqual(candidateAuthoredFiles(events, { candidateId: "c1", candidateWriteRevision: 3 }), [
    { path: "src/b.mjs", sha256: "b".repeat(64), writeRevision: 2 },
    { path: "test/a.test.mjs", sha256: "c".repeat(64), writeRevision: 3 },
  ]);
});

test("a write with an unknown outcome is listed as possibly written, not silently dropped", () => {
  const events = [
    confirmed("c1", "a.mjs", "a".repeat(64), 1),
    { type: "repository.write.unknown", data: { candidateId: "c1", path: "maybe.mjs", code: "write_outcome_unknown" } },
    { type: "repository.write.unknown", data: { candidateId: "c2", path: "elsewhere.mjs", code: "write_outcome_unknown" } },
  ];
  assert.deepEqual(candidateAuthoredFiles(events, { candidateId: "c1", candidateWriteRevision: 1 }), [
    { path: "a.mjs", sha256: "a".repeat(64), writeRevision: 1 },
    { path: "maybe.mjs", sha256: null, writeRevision: null },
  ]);
});

test("returns nothing without a recorded candidate or write revision", () => {
  const events = [confirmed("c1", "a.mjs", "a".repeat(64), 1)];
  assert.deepEqual(candidateAuthoredFiles(events, { candidateId: "c1" }), []);
  assert.deepEqual(candidateAuthoredFiles(events, { candidateWriteRevision: 1 }), []);
  assert.deepEqual(candidateAuthoredFiles(events, { candidateId: "c1", candidateWriteRevision: 0 }), []);
});

test("the check approval card and its decided record both show the authored files", () => {
  // The card body is the shared approval basis (approval-basis.mjs): its open
  // and decided builders each list the files, and the Chat card renders both.
  const basis = readFileSync(new URL("../web/approval-basis.mjs", import.meta.url), "utf8");
  assert.equal((basis.match(/nodes\.push\(\.\.\.checkAuthoredFiles\(events, payload\)\)/g) || []).length, 2, "open card and decided record");
  const app = readFileSync(new URL("../web/app.mjs", import.meta.url), "utf8");
  const render = app.slice(app.indexOf("function renderPermission("), app.indexOf("\nfunction ", app.indexOf("function renderPermission(") + 1));
  assert.match(render, /recordedApprovalBasis\(payload, state\.events, binding, row\.decision\)/);
  assert.match(render, /openApprovalBasis\(payload, state\.events, binding\)/);
});
