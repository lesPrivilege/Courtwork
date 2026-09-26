/* Order 3 frontend · the shared Chat/Attention projection consumes the Host's
 * persisted `(runId, segment)`, the legacy finals-before rule, and settled
 * partials. Pure; no DOM. */
import test from "node:test";
import assert from "node:assert/strict";
import { projectThread } from "../web/thread-projection.mjs";

const S = "s1";
let seq = 0;
const ev = (type, data, runId = "r1") => ({ seq: ++seq, sessionId: S, runId, type, data });
const run = (status, id = "r1") => ({ id, sessionId: S, status });
const assistantRows = (rows) => rows.filter((row) => row.kind === "assistant").map((row) => ({ id: row.id, text: row.text, pending: Boolean(row.pending), partial: Boolean(row.partial), final: Boolean(row.final) }));

test("rows follow the Host segment: text, tool, text keeps segment 0 and opens segment 1", () => {
  seq = 0;
  const events = [
    ev("user.message", { text: "go" }),
    ev("assistant.delta", { text: "I will", segment: 0 }),
    ev("assistant.message", { text: "I will list.", segment: 0, stopReason: "toolUse" }),
    ev("tool.start", { callId: "c1", name: "ws_list" }),
    ev("tool.result", { callId: "c1", name: "ws_list", result: "[]" }),
    ev("assistant.delta", { text: "Empty", segment: 1 }),
    ev("assistant.message", { text: "Empty workspace.", segment: 1, stopReason: "stop" }),
  ];
  const { rows } = projectThread(events, [run("completed")], S);
  assert.deepEqual(rows.map((row) => row.kind), ["user", "assistant", "tool", "assistant", "run-status"]);
  assert.deepEqual(assistantRows(rows), [
    { id: "r1:0", text: "I will list.", pending: false, partial: false, final: false },
    { id: "r1:1", text: "Empty workspace.", pending: false, partial: false, final: true },
  ]);
});

test("a growing segment replaces its text; a late delta never reopens a settled segment", () => {
  seq = 0;
  const events = [ev("assistant.delta", { text: "a", segment: 0 }), ev("assistant.delta", { text: "ab", segment: 0 })];
  assert.deepEqual(assistantRows(projectThread(events, [run("running")], S).rows), [{ id: "r1:0", text: "ab", pending: true, partial: false, final: false }]);
  events.push(ev("assistant.message", { text: "abc", segment: 0, stopReason: "stop" }), ev("assistant.delta", { text: "ab", segment: 0 }));
  assert.deepEqual(assistantRows(projectThread(events, [run("completed")], S).rows), [{ id: "r1:0", text: "abc", pending: false, partial: false, final: true }]);
});

test("a Host-settled partial is shown, never pending and never the answer", () => {
  seq = 0;
  const events = [
    ev("assistant.delta", { text: "Half", segment: 0 }),
    ev("assistant.message", { text: "Half a reply", segment: 0, stopReason: "cancelled", partial: true }),
    ev("run.status", { status: "cancelled" }),
  ];
  assert.deepEqual(assistantRows(projectThread(events, [run("cancelled")], S).rows), [{ id: "r1:0", text: "Half a reply", pending: false, partial: true, final: false }]);
});

test("legacy events without a segment use the finals-before rule and get the same row ids", () => {
  seq = 0;
  const legacy = [
    ev("assistant.delta", { text: "a" }),
    ev("assistant.message", { text: "a.", stopReason: "toolUse" }),
    ev("tool.start", { callId: "c1", name: "ws_list" }),
    ev("assistant.delta", { text: "b" }),
    ev("assistant.message", { text: "b.", stopReason: "stop" }),
  ];
  assert.deepEqual(assistantRows(projectThread(legacy, [run("completed")], S).rows).map((row) => [row.id, row.text]), [["r1:0", "a."], ["r1:1", "b."]]);
});

test("legacy text still arriving when its Run ended reads as partial, not pending", () => {
  seq = 0;
  const events = [ev("assistant.delta", { text: "cut" }), ev("run.status", { status: "cancelled" })];
  assert.deepEqual(assistantRows(projectThread(events, [run("cancelled")], S).rows), [{ id: "r1:0", text: "cut", pending: false, partial: true, final: false }]);
});

test("recovery partials for two segments give two rows in segment order", () => {
  seq = 0;
  const events = [
    ev("assistant.delta", { text: "first", segment: 0 }),
    ev("assistant.delta", { text: "second", segment: 1 }),
    ev("assistant.message", { text: "first", segment: 0, stopReason: "unknown", partial: true }),
    ev("assistant.message", { text: "second", segment: 1, stopReason: "unknown", partial: true }),
    ev("run.status", { status: "unknown" }),
  ];
  assert.deepEqual(assistantRows(projectThread(events, [run("unknown")], S).rows).map((row) => [row.id, row.partial]), [["r1:0", true], ["r1:1", true]]);
});
