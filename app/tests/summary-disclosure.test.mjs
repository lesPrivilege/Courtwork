import assert from "node:assert/strict";
import { test } from "node:test";

import { projectRunSummary } from "../web/summary-disclosure-projection.mjs";
import { createRunSummaryCard } from "../web/summary-disclosure.mjs";
import { deferred, flush, withTinyDom } from "./tiny-dom.mjs";

const HASH = "a".repeat(64);
const HASH_2 = "b".repeat(64);

function run(overrides = {}) {
  return {
    id: "r1",
    sessionId: "s1",
    status: "completed",
    artifacts: [{ kind: "content-version", path: "out/source-note.txt", bytes: 18, sha256: HASH, writtenAt: "2026-09-10T00:00:00.000Z" }],
    ...overrides,
  };
}

function facts(overrides = {}) {
  return { sessionId: "s1", runId: "r1", runs: [run()], events: [], ...overrides };
}

function project(overrides = {}, options = {}) {
  return projectRunSummary(facts(overrides), options);
}

test("Run projection keeps the selected Session/Run identity and recorded file locator", () => {
  const value = project();
  assert.equal(value.schemaVersion, 1);
  assert.deepEqual(value.identity, { sessionId: "s1", runId: "r1" });
  assert.equal(value.generation, 0);
  assert.equal(value.phase, "ready");
  assert.equal(value.status, "completed");
  assert.equal(value.statusLabel, "Completed");
  assert.deepEqual(value.files, [{
    kind: "content-version",
    sessionId: "s1",
    runId: "r1",
    path: "out/source-note.txt",
    sha256: HASH,
    bytes: 18,
    writtenAt: "2026-09-10T00:00:00.000Z",
  }]);
  assert.equal(value.filesKnown, true);
  assert.equal(value.canOpen, true);
});

test("Run projection fails closed for missing or cross-Session identity", () => {
  assert.equal(project({ sessionId: null }), null);
  assert.equal(project({ runId: null }), null);
  assert.equal(project({ runs: [] }), null);
  assert.equal(project({ runs: [run({ sessionId: "other" })] }), null);
  assert.equal(project({ runs: [run({ id: "other" })] }), null);
  assert.equal(project({ sessionId: "s2", runs: [run()] }), null);
});

test("unknown status is distinct from an explicit empty recorded-file set", () => {
  const empty = project({ runs: [run({ artifacts: [] })] });
  assert.equal(empty.statusLabel, "Completed");
  assert.deepEqual(empty.files, []);
  assert.equal(empty.filesKnown, true);
  assert.match(empty.message, /No files were recorded/);
  assert.doesNotMatch(empty.message, /unknown/i);

  const unknown = project({ runs: [run({ status: "unknown", artifacts: undefined })] }, { phase: "unknown" });
  assert.equal(unknown.status, "unknown");
  assert.equal(unknown.statusLabel, "Unknown");
  assert.equal(unknown.filesKnown, false);
  assert.match(unknown.message, /status is unknown/i);
  assert.doesNotMatch(unknown.message, /0 files|No files were recorded|Completed/);
});

test("loading, error, unavailable, and incompatible phases do not expose stale files", () => {
  for (const phase of ["loading", "error", "unavailable", "incompatible"]) {
    const value = project({}, { phase, error: phase === "error" ? "Read failed." : null, readerAvailable: phase !== "unavailable", generation: 7 });
    assert.equal(value.phase, phase);
    assert.deepEqual(value.files, [], phase);
    assert.equal(value.generation, 7);
    assert.equal(value.canOpen, false);
  }
  assert.equal(project({}, { phase: "loading" }).statusLabel, "Loading");
  assert.equal(project({}, { phase: "error", error: "Read failed." }).message, "Read failed.");
  assert.equal(project({}, { phase: "unavailable", readerAvailable: false }).statusLabel, "Unavailable");
  assert.equal(project({}, { phase: "incompatible" }).statusLabel, "Unsupported");
});

test("invalid artifact entries are filtered without turning unknown data into empty", () => {
  const value = project({ runs: [run({ artifacts: [
    { kind: "content-version", path: "out/合法 note.txt", sha256: HASH_2, bytes: 2 },
    { kind: "current", path: "out/current.txt", sha256: HASH },
    { kind: "content-version", path: "../outside.txt", sha256: HASH },
    { kind: "content-version", path: "out/bad.txt", sha256: "not-a-hash" },
  ] })] });
  assert.equal(value.filesKnown, false);
  assert.equal(value.files.length, 1);
  assert.equal(value.files[0].path, "out/合法 note.txt");
  assert.match(value.message, /Recorded files are unavailable/);

  const absent = project({ runs: [run({ artifacts: undefined })] });
  assert.equal(absent.filesKnown, false);
  assert.deepEqual(absent.files, []);
  assert.match(absent.message, /Recorded files are unavailable/);
});

test("readerUnavailable keeps file provenance but revokes every open capability", () => {
  const value = project({}, { readerAvailable: false });
  assert.equal(value.files.length, 1);
  assert.equal(value.canOpen, false);
});

test("Run card starts collapsed with Files and Run information disclosures", async () => {
  await withTinyDom(async () => {
    const snapshot = project();
    let previewed = null;
    const card = createRunSummaryCard({
      getSnapshot: () => snapshot,
      onOpen() {},
      onOpenFile(file) { previewed = file; },
    });
    assert.equal(card.element.hidden, false);
    const details = card.element.querySelectorAll("details");
    assert.equal(details.length, 2);
    assert.equal(details[0].open, false);
    assert.equal(details[1].open, false);
    assert.match(details[0].textContent, /Files · 1/);
    assert.match(details[1].textContent, /Run information/);
    assert.match(card.element.textContent, /s1/);
    assert.match(card.element.textContent, /r1/);
    assert.match(card.element.textContent, /source-note\.txt/);
    assert.match(card.element.textContent, /out\//);
    assert.match(card.element.textContent, /18 B/);
    assert.match(card.element.textContent, /Preview/);
    assert.equal(card.element.querySelector(".sd-run-summary-id"), null);
    assert.equal(card.element.querySelector(".sd-run-summary-file-open"), null);
    assert.doesNotMatch(card.element.textContent, /Recording a file does not establish review acceptance/);
    assert.ok(card.element.querySelector(".sd-run-summary-open"));
    details[0].open = true;
    card.element.querySelector(".sd-run-summary-file-preview").click();
    assert.deepEqual(previewed, snapshot.files[0]);
    card.dispose();
    assert.equal(card.element.hidden, true);
    assert.equal(card.element.textContent, "");
  });
});

test("Run card does not turn unknown or unavailable files into a zero count", async () => {
  await withTinyDom(async () => {
    let current = project({ runs: [run({ status: "unknown", artifacts: undefined })] }, { phase: "unknown" });
    const card = createRunSummaryCard({ getSnapshot: () => current });
    const filesSummary = card.element.querySelectorAll("summary")[0];
    assert.equal(filesSummary.textContent, "Files · unavailable");
    assert.doesNotMatch(filesSummary.textContent, /0/);

    current = project({ runs: [run({ artifacts: [] })] });
    card.update(current);
    assert.equal(card.element.querySelectorAll("summary")[0].textContent, "Files · 0");
    assert.ok(card.element.querySelector(".sd-run-summary-information-disclosure"));
  });
});

test("Run card rejects stale Open intents after identity or generation changes", async () => {
  await withTinyDom(async () => {
    let current = project({}, { generation: 1 });
    let opened = 0;
    const card = createRunSummaryCard({ getSnapshot: () => current, onOpen() { opened++; } });
    const open = card.element.querySelector(".sd-run-summary-open");
    current = project({ sessionId: "s2", runs: [run({ sessionId: "s2" })] }, { generation: 1 });
    open.click();
    assert.equal(opened, 0);

    current = project({}, { generation: 1 });
    card.update(current);
    const nextOpen = card.element.querySelector(".sd-run-summary-open");
    current = project({}, { generation: 2 });
    nextOpen.click();
    assert.equal(opened, 0);
  });
});

test("Run card prevents duplicate async Open actions and preserves both disclosures and focus", async () => {
  await withTinyDom(async () => {
    const pending = deferred();
    let calls = 0;
    let current = project({}, { generation: 3 });
    const card = createRunSummaryCard({ getSnapshot: () => current, onOpen: () => { calls++; return pending.promise; } });
    const details = card.element.querySelectorAll("details");
    details[0].open = true;
    details[1].open = true;
    const open = card.element.querySelector(".sd-run-summary-open");
    open.focus();
    current = project({ runs: [run({ status: "running" })] }, { generation: 3 });
    card.update(current);
    assert.equal(card.element.querySelectorAll("details")[0].open, true);
    assert.equal(card.element.querySelectorAll("details")[1].open, true);
    assert.equal(document.activeElement.dataset.focusKey, "run-summary-open");

    const actionButton = card.element.querySelector(".sd-run-summary-open");
    actionButton.click();
    actionButton.click();
    assert.equal(calls, 1);
    assert.equal(actionButton.disabled, true);
    pending.resolve();
    await flush();
    assert.equal(actionButton.disabled, false);
  });
});

test("a late rejected action cannot block or annotate a replacement identity", async () => {
  await withTinyDom(async () => {
    const pending = deferred();
    let current = project({}, { generation: 8 });
    const card = createRunSummaryCard({ getSnapshot: () => current, onOpen: () => pending.promise });
    card.element.querySelector(".sd-run-summary-open").click();

    current = project({ sessionId: "s2", runs: [run({ sessionId: "s2" })] }, { generation: 9 });
    card.update(current);
    const replacementOpen = card.element.querySelector(".sd-run-summary-open");
    assert.equal(replacementOpen.disabled, false);
    pending.reject(new Error("late old action"));
    await flush();
    assert.equal(replacementOpen.disabled, false);
    assert.doesNotMatch(card.element.textContent, /late old action/);
  });
});

test("Run card only offers Retry for an error and exposes callback failures", async () => {
  await withTinyDom(async () => {
    let current = project({}, { phase: "error", error: "Network read failed.", generation: 4 });
    let retries = 0;
    const card = createRunSummaryCard({ getSnapshot: () => current, onRetry: async () => { retries++; throw new Error("Retry failed again."); } });
    assert.equal(card.element.querySelector(".sd-run-summary-open"), null);
    const retry = card.element.querySelector(".sd-run-summary-retry");
    assert.ok(retry);
    retry.click();
    retry.click();
    assert.equal(retries, 1);
    await flush();
    assert.match(card.element.textContent, /Retry failed again/);

    current = project({}, { phase: "incompatible", generation: 5 });
    card.update(current);
    assert.equal(card.element.querySelector(".sd-run-summary-retry"), null);
  });
});

test("removing a focused Retry action returns focus to Run information and preserves both disclosures", async () => {
  await withTinyDom(async () => {
    let current = project({}, { phase: "error", error: "Read failed.", generation: 10 });
    let card;
    card = createRunSummaryCard({
      getSnapshot: () => current,
      onRetry: () => {
        current = project({}, { phase: "loading", generation: 10 });
        card.update(current);
      },
    });
    const details = card.element.querySelectorAll("details");
    details[0].open = true;
    details[1].open = true;
    const retry = card.element.querySelector(".sd-run-summary-retry");
    retry.focus();
    retry.click();
    assert.equal(card.element.querySelectorAll("details")[0].open, true);
    assert.equal(card.element.querySelectorAll("details")[1].open, true);
    assert.equal(document.activeElement.dataset.focusKey, "run-summary-information");
    await flush();
  });
});

test("Run card hides incompatible projection schemas instead of rendering stale details", async () => {
  await withTinyDom(async () => {
    let current = project();
    const card = createRunSummaryCard({ getSnapshot: () => current });
    assert.equal(card.element.hidden, false);
    current = { ...current, schemaVersion: 0 };
    card.update(current);
    assert.equal(card.element.hidden, true);
    assert.equal(card.element.textContent, "");
  });
});
