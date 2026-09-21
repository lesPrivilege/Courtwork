import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
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

test('assistant time uses only its matching recorded Run start, never a redraw clock', () => {
  const startedAt = '2026-09-13T10:12:00.000Z';
  const input = [event(1, 'run-1', 'assistant.delta', {text: 'Hello'})];
  assert.equal(assistantRows(input, [run('run-1', 'running', {startedAt})])[0].startedAt, startedAt);
  assert.equal(assistantRows(input, [run('run-1', 'running', {sessionId: 'foreign', startedAt})])[0].startedAt, null);
  input.push(event(2, 'run-1', 'assistant.message', {text: 'Hello again'}));
  assert.equal(assistantRows(input, [run('run-1', 'completed', {startedAt})])[0].startedAt, startedAt);
});

test('message time has readable provenance content without naming the native time role', async () => {
  const {withTinyDom} = await import('./tiny-dom.mjs');
  const {renderMessageTime} = await import('../web/user-message.mjs');
  await withTinyDom(() => {
    const time = renderMessageTime('2026-09-13T10:12:00.000Z', 'Run started');
    assert.equal(time.getAttribute('aria-label'), null);
    assert.equal(time.getAttribute('datetime'), '2026-09-13T10:12:00.000Z');
    assert.match(time.querySelector('.sr-only').textContent, /^Run started /);
    assert.ok(time.querySelector('[aria-hidden="true"]').textContent);
    assert.equal(renderMessageTime(null), null);
    assert.equal(renderMessageTime('invalid'), null);
  });
});

/* 04 · one final answer per Run. A Run's assistant rows are all kept, in
 * order, with their tool boundaries; only the projection's `final` mark
 * decides which of them carries the ordinary message footer. */
const finals = (projected) => projected.filter((row) => row.kind === "assistant" && row.final);

test("narration → tool → answer keeps every row and marks only the answer final", () => {
  const input = [
    event(1, "run-1", "assistant.delta", { text: "Let me" }),
    event(2, "run-1", "assistant.message", { text: "Let me look first.", stopReason: "toolUse" }),
    event(3, "run-1", "tool.start", { callId: "c1", name: "ws_list" }),
    event(4, "run-1", "tool.result", { callId: "c1", name: "ws_list", text: "[]" }),
    event(5, "run-1", "assistant.message", { text: "", stopReason: "toolUse" }),
    event(6, "run-1", "tool.start", { callId: "c2", name: "ws_list" }),
    event(7, "run-1", "tool.result", { callId: "c2", name: "ws_list", text: "[]" }),
    event(8, "run-1", "assistant.delta", { text: "Here" }),
    event(9, "run-1", "assistant.message", { text: "Here is the answer.", stopReason: "stop" }),
  ];
  const projected = rows(input, [run("run-1")]);
  assert.deepEqual(projected.map((row) => [row.kind, row.id]), [
    ["assistant", "run-1:0"], ["tool", "run-1:c1"], ["assistant", "run-1:3"],
    ["tool", "run-1:c2"], ["assistant", "run-1:6"], ["run-status", "status:run-1"],
  ]);
  assert.deepEqual(finals(projected).map((row) => [row.id, row.text]), [["run-1:6", "Here is the answer."]]);
  // Nothing else is marked, and marking changes no identity or body.
  assert.deepEqual(projected.filter((row) => row.final).length, 1);
  assert.equal(projected[0].text, "Let me look first.");
  assert.equal(projected[0].pending, false);
});

test("the persisted real dogfood Run yields its five texts and exactly one final answer", () => {
  const url = new URL("../../engineering/execution/claude-frontend-harness-2026-09-16/evidence/prepared-real-dogfood-20260921/events.json", import.meta.url);
  const { events } = JSON.parse(readFileSync(url, "utf8"));
  const session = events[0].sessionId, runId = events[0].runId;
  const projected = projectThread(events, [{ id: runId, sessionId: session, status: "completed" }], session).rows;
  const assistants = projected.filter((row) => row.kind === "assistant");
  const visible = assistants.filter((row) => row.text.trim());
  assert.equal(assistants.length, 10);
  assert.equal(visible.length, 5);
  assert.equal(projected.filter((row) => row.kind === "tool").length, 17);
  assert.equal(finals(projected).length, 1);
  assert.equal(finals(projected)[0], visible.at(-1));
  assert.match(finals(projected)[0].text, /^Done\. Summary of the dogfood run/);
  // Event order is untouched: the answer is still after the check.
  const check = projected.findIndex((row) => row.kind === "tool" && row.name === "check_run");
  assert.ok(check >= 0 && check < projected.indexOf(finals(projected)[0]));
});

test("no row is final while the Run is still working, waiting or stopping", () => {
  const input = [
    event(1, "run-1", "assistant.message", { text: "Planning.", stopReason: "toolUse" }),
    event(2, "run-1", "tool.start", { callId: "q", name: "ask_user" }),
    event(3, "run-1", "question.open", { id: "q1", prompt: "Continue?" }),
  ];
  for (const status of ["created", "running", "waiting_user", "stopping"])
    assert.equal(finals(rows(input, [run("run-1", status)])).length, 0, status);
  // Even a settled stop answer is not final until the Run completes.
  const answered = [event(1, "run-1", "assistant.message", { text: "Answer.", stopReason: "stop" })];
  assert.equal(finals(rows(answered, [run("run-1", "running")])).length, 0);
  assert.equal(finals(rows([...answered, event(2, "run-1", "run.status", { status: "completed" })], [run("run-1", "running")])).length, 1);
  // Streaming text is pending and never final.
  const streaming = rows([event(1, "run-1", "assistant.delta", { text: "Part" })], [run("run-1", "completed")]);
  assert.equal(finals(streaming).length, 0);
  assert.equal(streaming[0].pending, true);
});

test("failed, cancelled and unknown Runs keep their text readable with no final answer", () => {
  const input = [
    event(1, "run-1", "assistant.message", { text: "Narration.", stopReason: "toolUse" }),
    event(2, "run-1", "tool.start", { callId: "c1", name: "ws_list" }),
    event(3, "run-1", "tool.result", { callId: "c1", name: "ws_list", text: "[]" }),
    event(4, "run-1", "assistant.message", { text: "Last words.", stopReason: "stop" }),
  ];
  // `null` stands for a Run this client has no record of.
  for (const status of ["failed", "cancelled", "unknown", null]) {
    const projected = rows(input, status ? [run("run-1", status)] : []);
    assert.equal(finals(projected).length, 0, String(status));
    assert.deepEqual(projected.filter((row) => row.kind === "assistant").map((row) => row.text), ["Narration.", "Last words."]);
    assert.equal(projected.at(-1).kind, "run-status");
    assert.equal(projected.at(-1).status, status ?? undefined);
  }
  const partial = rows([event(1, "run-1", "assistant.delta", { text: "partial" })], [run("run-1", "cancelled")]);
  assert.equal(partial[0].pending, true);
  assert.equal(finals(partial).length, 0);
});

test("whatever follows the answer takes the final mark away or passes it on", () => {
  const answer = event(1, "run-1", "assistant.message", { text: "Answer.", stopReason: "stop" });
  const after = (...more) => finals(rows([answer, ...more], [run("run-1")])).map((row) => row.text);
  assert.deepEqual(after(), ["Answer."]);
  assert.deepEqual(after(event(2, "run-1", "tool.start", { callId: "c", name: "ws_list" })), []);
  assert.deepEqual(after(event(2, "run-1", "permission.open", { id: "p" })), []);
  assert.deepEqual(after(event(2, "run-1", "question.open", { id: "q" })), []);
  assert.deepEqual(after(event(2, "run-1", "check.started", { callId: "k", recipeId: "node-test" })), []);
  assert.deepEqual(after(event(2, "run-1", "assistant.delta", { text: "more" })), []);
  // A second settled message is the later answer; an empty one shows nothing
  // and displaces nothing.
  assert.deepEqual(after(event(2, "run-1", "assistant.message", { text: "Better.", stopReason: "stop" })), ["Better."]);
  assert.deepEqual(after(event(2, "run-1", "assistant.message", { text: " ", stopReason: "stop" })), ["Answer."]);
  // A runtime without stopReason (Agents API text.done) still ends a segment
  // at its next tool; only the tool decides that its text was narration.
  const agents = [
    event(1, "run-1", "assistant.message", { text: "Calling a function." }),
    event(2, "run-1", "tool.start", { callId: "f", name: "fn" }),
    event(3, "run-1", "tool.result", { callId: "f", name: "fn", text: "ok" }),
    event(4, "run-1", "assistant.message", { text: "Done." }),
  ];
  assert.deepEqual(finals(rows(agents, [run("run-1")])).map((row) => row.text), ["Done."]);
});

test("each Run has its own final answer", () => {
  const projected = rows([
    event(1, "run-a", "assistant.message", { text: "a", stopReason: "stop" }),
    event(2, "run-b", "assistant.message", { text: "b narration", stopReason: "toolUse" }),
    event(3, "run-b", "tool.start", { callId: "c", name: "ws_list" }),
    event(4, "run-b", "tool.result", { callId: "c", name: "ws_list", text: "[]" }),
    event(5, "run-b", "assistant.message", { text: "b", stopReason: "stop" }),
    event(6, "run-c", "assistant.message", { text: "c", stopReason: "stop" }),
  ], [run("run-a"), run("run-b"), run("run-c", "failed")]);
  assert.deepEqual(finals(projected).map((row) => [row.runId, row.text]), [["run-a", "a"], ["run-b", "b"]]);
});

test("the shared footer draws time and actions only under the final answer", async () => {
  const { withTinyDom } = await import("./tiny-dom.mjs");
  const { renderAnswerFooter } = await import("../web/user-message.mjs");
  await withTinyDom(() => {
    let built = 0;
    const actions = () => { built++; return document.createElement("div"); };
    const startedAt = "2026-09-21T04:35:41.788Z";
    for (const row of [{ pending: true, startedAt }, { pending: false, startedAt }, { final: false, startedAt }, null])
      assert.equal(renderAnswerFooter(row, actions), null);
    assert.equal(built, 0, "no hidden action row is built for a non-final reply");
    const footer = renderAnswerFooter({ final: true, startedAt }, actions);
    assert.equal(footer.tagName, "footer");
    assert.equal(footer.className, "assistant-message-actions");
    assert.equal(footer.children[0].tagName, "time");
    assert.equal(footer.children[0].getAttribute("datetime"), startedAt);
    assert.equal(built, 1);
    assert.equal(renderAnswerFooter({ final: true, startedAt: null }, actions).children.length, 1);
  });
});
