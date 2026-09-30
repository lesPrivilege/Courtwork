/* Review D4 (engineering/reviews/doc-driven-code-review-2026-09-29): a check
 * executes files the model wrote into the private candidate, inside the
 * Host's sandbox. The approval names those files from the Host's own
 * `repository.write.confirmed` receipts, bounded by the write revision the
 * request was bound to, so a person approves the code that will run rather
 * than only `node --test`. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { candidateAuthoredFiles, checkAuthoredFilesSentence } from "../web/thread-projection.mjs";

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
  const app = readFileSync(new URL("../web/app.mjs", import.meta.url), "utf8");
  const render = app.slice(app.indexOf("function renderPermission("), app.indexOf("\nfunction ", app.indexOf("function renderPermission(") + 1));
  assert.equal((render.match(/checkAuthoredFiles\(/g) || []).length, 2, "open card and decided record");
});

test("a live approval states this Host's sandbox; a decided record states only what was recorded", () => {
  const live = checkAuthoredFilesSentence(1, { live: true });
  assert.equal(live, "This check executes 1 file the model wrote, inside this Host's sandbox: the candidate is read-only, only its own temporary directory is writable, and it has no network:");
  assert.match(checkAuthoredFilesSentence(3, { live: true }), /^This check executes 3 files the model wrote, inside this Host's sandbox/);
  assert.doesNotMatch(live, /your access|this computer/i);
  // R30-2 · a recorded approval has no execution-environment fact, so the
  // decided view must not project the current Host's sandbox onto the past.
  // The decided branch also renders denied and closed approvals, and an
  // approval by itself does not show that anything ran.
  const decided = checkAuthoredFilesSentence(2);
  assert.equal(decided, "This approval names 2 files the model wrote; the execution environment was not recorded:");
  assert.doesNotMatch(decided, /\bran\b|executes|sandbox|no network|your access|this computer/i);
  const app = readFileSync(new URL("../web/app.mjs", import.meta.url), "utf8");
  assert.match(app, /text: checkAuthoredFilesSentence\(files\.length, \{ live \}\)/, "the sentence follows the card's liveness");
  assert.match(app, /card\.append\(\.\.\.checkAuthoredFiles\(payload, \{ live: true \}\)\);/, "only the live card is told it is live");
  assert.match(app, /details\.append\(\.\.\.checkAuthoredFiles\(payload\)\);/, "the decided record is not");
  assert.doesNotMatch(app, /with your access to this computer/);
});

test("R30-2 · a recorded v1 approval payload is presented as recorded, without this Host's sandbox", async () => {
  const { permissionPresentation } = await import("../web/thread-projection.mjs");
  const v1 = { toolCallId: "c1", tool: "check_run", path: "*", bytes: 22, contentSha256: "a".repeat(64), preview: '{"recipeId":"node-test-harness-contract"}',
    recipeId: "node-test-harness-contract", recipeVersion: 1, command: "/usr/local/bin/node", argv: ["--test", "app/tests/hermes-api-runs.test.mjs"], cwd: "private candidate",
    candidateId: "cand", candidateWriteRevision: 2, timeoutMs: 120000, outputLimitBytes: 65536, env: "minimal" };
  const display = permissionPresentation(v1, null);
  assert.equal(display.scope, "node --test app/tests/hermes-api-runs.test.mjs · in the private candidate · 120 s · 64 KiB per stream · minimal environment");
  assert.doesNotMatch(JSON.stringify(display), /sandbox|no network/i);
  // The same payload shape for a current recipe is presented the same way: the record carries no environment fact either.
  const v2 = { ...v1, recipeVersion: 2, argv: ["--test", "app/tests/kit-context.test.mjs"] };
  assert.doesNotMatch(JSON.stringify(permissionPresentation(v2, null)), /sandbox|no network/i);
});

test("R30-2 · a denied or closed check approval names its files without claiming execution", () => {
  // renderPermission's decided branch shows one sentence for approved, denied
  // and closed records alike (app.mjs: `details.append(...checkAuthoredFiles(payload))`),
  // so that sentence must hold for a decision that started nothing.
  const app = readFileSync(new URL("../web/app.mjs", import.meta.url), "utf8");
  assert.match(app, /Approval denied for this exact \$\{display\.noun\}\./, "the decided branch renders denials");
  assert.match(app, /This request closed without a recorded decision\./, "and closed requests");
  assert.match(app, /details\.append\(\.\.\.checkAuthoredFiles\(payload\)\);/, "with the same authored-files sentence");
  for (const count of [1, 4]) {
    const sentence = checkAuthoredFilesSentence(count);
    assert.match(sentence, /^This approval names /);
    assert.doesNotMatch(sentence, /\bran\b|executes|executed|will run|sandbox/i, "a denied or closed approval executed nothing and the sentence must not say otherwise");
  }
});
