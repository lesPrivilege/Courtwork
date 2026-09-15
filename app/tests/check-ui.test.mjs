import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { projectThread, toolStateWord, checkStateWord, permissionPresentation } from "../web/thread-projection.mjs";
import { projectRunProcess } from "../web/run-activity.mjs";

const root = new URL("../../", import.meta.url).pathname;
const run = { id: "r1", sessionId: "s1", status: "running" };
const ev = (seq, type, data) => ({ seq, runId: "r1", sessionId: "s1", type, data });

test("check.started and check.settled project onto one tool row and outrank Pi's tool events", () => {
  const events = [
    ev(1, "user.message", { text: "run the tests" }),
    ev(2, "tool.start", { callId: "c1", name: "check_run", args: { recipeId: "node-test" } }),
    ev(3, "check.started", { callId: "c1", recipeId: "node-test", recipeVersion: 1, candidateId: "cand", candidateWriteRevision: 1, startedAt: "2026-09-16T00:00:00.000Z" }),
  ];
  let rows = projectThread(events, [run], "s1").rows ?? projectThread(events, [run], "s1");
  let tool = rows.find(r => r.kind === "tool");
  assert.equal(tool.check.status, "running");
  assert.equal(toolStateWord(tool, "running"), "Checking");
  events.push(ev(4, "check.settled", { callId: "c1", status: "completed", exitCode: 1, signal: null, durationMs: 1234, stdout: "", stderr: "not ok 1", truncated: { stdout: false, stderr: false }, startedAt: "2026-09-16T00:00:00.000Z", endedAt: "2026-09-16T00:00:01.234Z" }));
  rows = projectThread(events, [run], "s1").rows ?? projectThread(events, [run], "s1");
  tool = rows.find(r => r.kind === "tool");
  assert.equal(tool.phase, "result");
  assert.equal(toolStateWord(tool, "running"), "Exit 1");
  assert.equal(tool.isError, false, "a non-zero exit is a fact, not a tool failure");
  assert.equal(rows.filter(r => r.kind === "tool").length, 1, "the settlement joins the existing row");
});

test("A cancelled or unknown settlement stands on its own without a Pi tool/result", () => {
  const events = [ev(1, "check.started", { callId: "c9", recipeId: "node-test", recipeVersion: 1, startedAt: "x" }), ev(2, "check.settled", { callId: "c9", status: "cancelled", exitCode: null, signal: "SIGTERM", durationMs: 800, stdout: "partial", stderr: "", truncated: { stdout: false, stderr: false } })];
  const rows = projectThread(events, [{ ...run, status: "cancelled" }], "s1").rows ?? projectThread(events, [{ ...run, status: "cancelled" }], "s1");
  const tool = rows.find(r => r.kind === "tool");
  assert.equal(tool.name, "check_run");
  assert.equal(toolStateWord(tool, "cancelled"), "Cancelled");
  assert.equal(checkStateWord({ status: "unknown" }), "Unknown");
  assert.equal(checkStateWord({ status: "timed_out" }), "Timed out");
});

test("A check approval names the recipe, what runs, where, and the limits", () => {
  const display = permissionPresentation({ toolCallId: "c1", tool: "check_run", path: "*", bytes: 22, contentSha256: "a".repeat(64), preview: '{"recipeId":"node-test"}',
    recipeId: "node-test", recipeVersion: 1, command: "/usr/local/bin/node", argv: ["--test"], cwd: "private candidate", candidateId: "cand", candidateWriteRevision: 2, timeoutMs: 120000, outputLimitBytes: 65536, env: "minimal" }, null);
  assert.equal(display.title, "Approve this check?");
  assert.equal(display.label, "Check");
  assert.equal(display.target, "node-test v1");
  assert.equal(display.scope, "node --test · in the private candidate · 120 s · 64 KiB per stream · minimal environment");
});

test("Activity word and glyph wiring for checks", () => {
  const process = projectRunProcess([{ type: "tool/start", data: { callId: "c1", name: "check_run" } }].map((e, i) => ({ seq: i, runId: "r1", ...e })), run);
  assert.equal(process, "checking");
  const runRows = readFileSync(`${root}app/web/run-rows.mjs`, "utf8");
  assert.match(runRows, /if \(tool === "check_run"\) return "play"/);
  assert.match(runRows, /function appendCheckDetails\(container, check\)/);
  assert.match(runRows, /if \(row\.check && row\.check\.status !== "running"\) \{\s*appendCheckDetails\(container, row\.check\);/);
});
