import assert from "node:assert/strict";
import test from "node:test";
import { projectThread } from "../web/thread-projection.mjs";

const sessionId = "session-output-boundary";

function run(id, status = "completed", overrides = {}) {
  return { id, sessionId, status, ...overrides };
}

function event(seq, runId, type, data, sourceSessionId = sessionId) {
  return { seq, runId, sessionId: sourceSessionId, type, data };
}

function rows(events, runs) {
  return projectThread(events, runs, sessionId).rows;
}

function assistantRows(events, runs) {
  return rows(events, runs).filter((row) => row.kind === "assistant");
}

test("cumulative assistant deltas and their final stay one non-pending row", () => {
  const assistant = assistantRows(
    [
      event(1, "run-1", "assistant.delta", { text: "A" }),
      event(2, "run-1", "assistant.delta", { text: "Answer" }),
      event(3, "run-1", "assistant.message", { text: "Answer", stopReason: "stop" }),
    ],
    [run("run-1")],
  );

  assert.equal(assistant.length, 1);
  assert.equal(assistant[0].text, "Answer");
  assert.equal(assistant[0].pending, false);
  assert.equal(assistant[0].id, "run-1:0");
});

test("subsequent complete assistant messages get separate rows even with identical text", () => {
  const assistant = assistantRows(
    [
      event(1, "run-1", "assistant.message", { text: "same", stopReason: "stop" }),
      event(2, "run-1", "assistant.message", { text: "same", stopReason: "stop" }),
    ],
    [run("run-1")],
  );

  assert.deepEqual(
    assistant.map(({ id, text, pending }) => ({ id, text, pending })),
    [
      { id: "run-1:0", text: "same", pending: false },
      { id: "run-1:1", text: "same", pending: false },
    ],
  );
});

test("a later assistant message's deltas do not overwrite the first message", () => {
  const assistant = assistantRows(
    [
      event(1, "run-1", "assistant.delta", { text: "first partial" }),
      event(2, "run-1", "assistant.message", { text: "first complete", stopReason: "stop" }),
      event(3, "run-1", "assistant.delta", { text: "second partial" }),
      event(4, "run-1", "assistant.delta", { text: "second complete" }),
      event(5, "run-1", "assistant.message", { text: "second complete", stopReason: "stop" }),
    ],
    [run("run-1")],
  );

  assert.deepEqual(
    assistant.map(({ id, text, pending }) => ({ id, text, pending })),
    [
      { id: "run-1:0", text: "first complete", pending: false },
      { id: "run-1:1", text: "second complete", pending: false },
    ],
  );
});

test("tool boundaries preserve assistant/tool/assistant order and tool result identity", () => {
  const projected = rows(
    [
      event(1, "run-1", "assistant.message", { text: "before", stopReason: "toolUse" }),
      event(2, "run-1", "tool.start", { callId: "tool-1", name: "ws_read", args: { path: "a.md" } }),
      event(3, "run-1", "tool.update", { callId: "tool-1", name: "ws_read", text: "partial", isError: false }),
      event(4, "run-1", "tool.result", { callId: "tool-1", name: "ws_read", text: "result", isError: false }),
      event(5, "run-1", "assistant.message", { text: "after", stopReason: "stop" }),
    ],
    [run("run-1")],
  );

  assert.deepEqual(projected.map((row) => row.kind), ["assistant", "tool", "assistant", "run-status"]);
  const tool = projected.find((row) => row.kind === "tool");
  assert.equal(tool.callId, "tool-1");
  assert.equal(tool.name, "ws_read");
  assert.equal(tool.phase, "result");
  assert.equal(tool.result, "result");
  assert.equal(projected.filter((row) => row.kind === "assistant")[0].text, "before");
  assert.equal(projected.filter((row) => row.kind === "assistant")[1].text, "after");
});

test("assistant and tool rows stay scoped when runs reuse segment and call identities", () => {
  const projected = rows(
    [
      event(1, "run-a", "assistant.message", { text: "a", stopReason: "stop" }),
      event(2, "run-a", "tool.start", { callId: "same-call", name: "ws_read" }),
      event(3, "run-a", "tool.result", { callId: "same-call", name: "ws_read", text: "a-result" }),
      event(4, "run-b", "assistant.message", { text: "b", stopReason: "stop" }),
      event(5, "run-b", "tool.start", { callId: "same-call", name: "ws_read" }),
      event(6, "run-b", "tool.result", { callId: "same-call", name: "ws_read", text: "b-result" }),
    ],
    [run("run-a"), run("run-b")],
  );

  assert.deepEqual(
    projected.filter((row) => row.kind === "assistant").map(({ id, text, runId }) => ({ id, text, runId })),
    [
      { id: "run-a:0", text: "a", runId: "run-a" },
      { id: "run-b:0", text: "b", runId: "run-b" },
    ],
  );
  assert.deepEqual(
    projected.filter((row) => row.kind === "tool").map(({ id, result, runId }) => ({ id, result, runId })),
    [
      { id: "run-a:same-call", result: "a-result", runId: "run-a" },
      { id: "run-b:same-call", result: "b-result", runId: "run-b" },
    ],
  );
});

test("terminal run keeps an incomplete delta pending but a terminal final is settled", () => {
  const cancelled = assistantRows(
    [event(1, "cancelled-run", "assistant.delta", { text: "partial" })],
    [run("cancelled-run", "cancelled")],
  );
  assert.equal(cancelled.length, 1);
  assert.equal(cancelled[0].text, "partial");
  assert.equal(cancelled[0].pending, true);

  const completed = assistantRows(
    [event(1, "completed-run", "assistant.delta", { text: "done" }), event(2, "completed-run", "assistant.message", { text: "done", stopReason: "stop" })],
    [run("completed-run", "completed")],
  );
  assert.equal(completed.length, 1);
  assert.equal(completed[0].pending, false);
});
