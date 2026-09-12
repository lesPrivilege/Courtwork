import assert from "node:assert/strict";
import { test } from "node:test";

import {
  executionDisclosureMemberId,
  executionDisclosureStateKey,
  projectExecutionDisclosures,
} from "../web/execution-disclosure.mjs";

const HASH = "a".repeat(64);
const allowedPermission = (overrides = {}) => ({
  kind: "permission",
  runId: "run-1",
  id: "permission-1",
  payload: {
    toolCallId: "call-1",
    tool: "ws_read",
    path: "notes.txt",
    bytes: 1,
    contentSha256: HASH,
    preview: "x",
  },
  questionStatus: "resolved",
  decision: "allow",
  ...overrides,
});
const successfulTool = (overrides = {}) => ({
  kind: "tool",
  runId: "run-1",
  callId: "call-1",
  id: "run-1:call-1",
  name: "ws_read",
  phase: "result",
  isError: false,
  ...overrides,
});

test("completed Run disclosure groups successful tools and exact allowed history in timeline order", () => {
  const tool = successfulTool();
  const permission = allowedPermission();
  const rows = [
    { kind: "assistant", runId: "run-1", id: "assistant-1", text: "First" },
    permission,
    { kind: "artifact", runId: "run-1", id: "artifact-1" },
    tool,
    { kind: "assistant", runId: "run-1", id: "assistant-2", text: "Second" },
    successfulTool({ callId: "call-2", id: "run-1:call-2" }),
  ];
  const { plans, members } = projectExecutionDisclosures(rows, new Map([["run-1", "completed"]]));

  assert.equal(plans.size, 1);
  const plan = plans.get("run-1");
  assert.equal(plan.firstIndex, 1);
  assert.equal(plan.callCount, 2);
  assert.deepEqual(plan.items.map(({ row }) => row), [permission, tool, rows[5]]);
  assert.deepEqual(plan.items.map(({ index }) => index), [1, 3, 5]);
  assert.deepEqual([...members.keys()], [permission, tool, rows[5]]);
  assert.equal(members.has(rows[0]), false);
  assert.equal(members.has(rows[2]), false);
  assert.equal(members.has(rows[4]), false);
});

test("incomplete, failed, pending, denied, malformed, and cross-call rows stay outside the summary", () => {
  const success = successfulTool();
  const rows = [
    success,
    successfulTool({ callId: "failed", id: "failed", isError: true }),
    successfulTool({ callId: "partial", id: "partial", phase: "started" }),
    successfulTool({ callId: 8, id: "non-string-call" }),
    allowedPermission({ id: "pending", questionStatus: "pending" }),
    allowedPermission({ id: "denied", decision: "deny" }),
    allowedPermission({ id: "mismatch", payload: { ...allowedPermission().payload, toolCallId: "other" } }),
    allowedPermission({ id: "malformed", payload: { toolCallId: "call-1" } }),
    allowedPermission({ id: "other-run", runId: "run-2" }),
  ];

  for (const status of ["running", "waiting_user", "failed", "cancelled", "unknown"]) {
    const { plans } = projectExecutionDisclosures(rows, new Map([["run-1", status], ["run-2", "completed"]]));
    assert.equal(plans.size, 0, status);
  }
  const { plans, members } = projectExecutionDisclosures(rows, new Map([["run-1", "completed"], ["run-2", "completed"]]));
  assert.equal(plans.size, 1);
  assert.equal(plans.get("run-1").callCount, 1);
  assert.deepEqual([...members.keys()], [success]);
});

test("a completed Run with only errors or unfinished calls gets no empty summary", () => {
  const { plans, members } = projectExecutionDisclosures([
    successfulTool({ isError: true }),
    successfulTool({ phase: "started" }),
  ], new Map([["run-1", "completed"]]));
  assert.equal(plans.size, 0);
  assert.equal(members.size, 0);
});

test("member IDs and disclosure state keys remain stable and surface-scoped", () => {
  assert.equal(
    executionDisclosureMemberId("chat", "session 1", "run-1", "tool:1"),
    executionDisclosureMemberId("chat", "session 1", "run-1", "tool:1"),
  );
  assert.equal(executionDisclosureMemberId("chat", "s", "r", "a b").includes(" "), false);
  assert.notEqual(
    executionDisclosureMemberId("chat", "s", "r", "row"),
    executionDisclosureMemberId("attention", "s", "r", "row"),
  );
  assert.notEqual(executionDisclosureStateKey("s1", "r"), executionDisclosureStateKey("s2", "r"));
});
