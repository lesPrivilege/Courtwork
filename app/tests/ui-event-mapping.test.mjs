import assert from "node:assert/strict";
import test from "node:test";
import {
  projectThread,
  canAnswer,
  validPermission,
} from "../web/thread-projection.mjs";
test("thread projection scopes runs and resolves exact permission request", () => {
  const run = { id: "r", sessionId: "s", status: "completed" };
  const payload = {
    id: "q",
    path: "out/a.md",
    toolCallId: "t",
    bytes: 3,
    contentSha256: "a".repeat(64),
    preview: "one",
  };
  const events = [
    {
      seq: 1,
      sessionId: "other",
      runId: "x",
      type: "user.message",
      data: { text: "hidden" },
    },
    {
      seq: 2,
      sessionId: "s",
      runId: "r",
      type: "user.message",
      data: { text: "write" },
    },
    {
      seq: 3,
      sessionId: "s",
      runId: "r",
      type: "permission.open",
      data: payload,
    },
    {
      seq: 4,
      sessionId: "s",
      runId: "r",
      type: "permission.resolved",
      data: { id: "q", decision: "deny" },
    },
    {
      seq: 5,
      sessionId: "s",
      runId: "r",
      type: "assistant.message",
      data: { text: "Denied." },
    },
  ];
  const { rows } = projectThread(events, [run], "s");
  assert.deepEqual(
    rows.filter((r) => r.kind === "user").map((r) => r.text),
    ["write"],
  );
  const question = rows.find((r) => r.kind === "permission");
  assert.equal(question.decision, "deny");
  assert.equal(canAnswer(question, run), false);
  assert.equal(validPermission(payload), true);
  assert.equal(validPermission({ ...payload, contentSha256: "wrong" }), false);
  assert.equal(rows.find((r) => r.kind === "assistant").text, "Denied.");
});
test("tool calls with identical IDs in different runs remain separate and require live admission", () => {
  const runs = [
    { id: "r1", sessionId: "s", status: "completed" },
    { id: "r2", sessionId: "s", status: "waiting_user", admissionOpen: true },
  ];
  const events = runs.flatMap((run, i) => [
    {
      seq: i * 2 + 1,
      runId: run.id,
      sessionId: "s",
      type: "tool.start",
      data: { callId: "same", name: "ws_read", args: { path: String(i) } },
    },
    {
      seq: i * 2 + 2,
      runId: run.id,
      sessionId: "s",
      type: "tool.result",
      data: { callId: "same", result: String(i) },
    },
  ]);
  const tools = projectThread(events, runs, "s").rows.filter(
    (r) => r.kind === "tool",
  );
  assert.equal(tools.length, 2);
  assert.equal(tools[0].result, "0");
  assert.equal(tools[1].result, "1");
  const q = { runId: "r2", questionStatus: "pending" };
  assert.equal(canAnswer(q, runs[1]), true);
  assert.equal(canAnswer(q, { ...runs[1], admissionOpen: false }), false);
});

test('permission display distinguishes remote actions from writes using only the recorded binding', async () => {
  const { permissionPresentation } = await import('../web/thread-projection.mjs');
  const payload = { tool: 'mcp_opaque', path: '*' };
  const binding = { resources: [{ id: 'tool:mcp_opaque', mcp: { name: 'send', serverId: 'local:mail' }, source: { uri: 'http://127.0.0.1:19000/original' } }] };
  const remote = permissionPresentation(payload, binding);
  // WK-89 · 一次动作是 Approval；标题仍按事实区分三种调用。
  assert.equal(remote.title, 'Approve this remote tool call?');
  assert.equal(remote.target, 'send · local:mail');
  assert.equal(remote.source, 'http://127.0.0.1:19000/original');
  assert.equal(remote.noun, 'action');
  const missing = permissionPresentation(payload, null);
  assert.equal(missing.target, 'mcp_opaque');
  assert.equal(missing.source, null);
  assert.equal(missing.noun, 'action');
  assert.equal(permissionPresentation({ path: 'out/old.txt' }).noun, 'action', 'missing tool does not prove a write');
  assert.equal(permissionPresentation({ tool: 'ws_write', path: 'out/a.txt' }).target, 'out/a.txt');
  assert.equal(permissionPresentation({ tool: 'ws_write', path: 'out/a.txt' }).noun, 'write');
  assert.equal(permissionPresentation({ tool: 'ws_read', path: 'materials/a.txt' }).noun, 'action');
});
