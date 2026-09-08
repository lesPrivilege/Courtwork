import assert from "node:assert/strict";
import { test } from "node:test";
import { boot } from "./helpers.mjs";

async function waitForStatus(pollRun, runId, status) {
  return pollRun(runId, { until: (s) => s === status || ["completed", "failed", "cancelled", "unknown"].includes(s) });
}

// T-PERM-1: "ask" mode opens a permission wait; allow -> the write succeeds.
test("T-PERM-1: ask mode + allow lets ws_write succeed", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession({ permissionMode: "ask" });
    const calls = [{ name: "ws_write", arguments: { path: "out/allowed.md", text: "yes" } }];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    const waiting = await waitForStatus(pollRun, created.json.run.id, "waiting_user");
    assert.equal(waiting.status, "waiting_user");
    const events = (await api("GET", `/sessions/${session.id}/events`)).json.events;
    const openEvent = events.find((e) => e.type === "permission.open");
    assert.ok(openEvent);
    assert.equal(openEvent.data.tool, "ws_write");
    assert.equal(openEvent.data.path, "out/allowed.md");

    const answered = await api("POST", `/runs/${created.json.run.id}/questions/${openEvent.data.id}`, { decision: "allow" });
    assert.equal(answered.status, 200);
    const finished = await pollRun(created.json.run.id);
    assert.equal(finished.status, "completed");
    assert.equal(finished.artifacts.length, 1);

    const resolved = (await api("GET", `/sessions/${session.id}/events`)).json.events.find((e) => e.type === "permission.resolved");
    assert.equal(resolved.data.decision, "allow");
  } finally {
    await runtime.close();
  }
});

// T-PERM-2: deny -> ws_write returns isError, model can continue, no file written.
test("T-PERM-2: ask mode + deny returns isError and writes nothing", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession({ permissionMode: "ask" });
    const calls = [{ name: "ws_write", arguments: { path: "out/denied.md", text: "no" } }];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    const waiting = await waitForStatus(pollRun, created.json.run.id, "waiting_user");
    const events = (await api("GET", `/sessions/${session.id}/events`)).json.events;
    const openEvent = events.find((e) => e.type === "permission.open");
    const answered = await api("POST", `/runs/${created.json.run.id}/questions/${openEvent.data.id}`, { decision: "deny" });
    assert.equal(answered.status, 200);
    const finished = await pollRun(created.json.run.id);
    assert.equal(finished.status, "completed", "the run itself keeps going after a denied tool call");
    assert.equal(finished.artifacts.length, 0);
    const toolResult = (await api("GET", `/sessions/${session.id}/events`)).json.events.find((e) => e.type === "tool.result" && e.data.name === "ws_write");
    assert.equal(toolResult.data.isError, true);
    const tree = await api("GET", `/sessions/${session.id}/workspace`);
    assert.ok(!tree.json.tree.some((f) => f.path === "out/denied.md"));
  } finally {
    await runtime.close();
  }
});

// T-PERM-3: cancelling while a permission is pending ends the run cancelled
// with no file written.
test("T-PERM-3: cancel while waiting on a permission leaves no file and Run cancelled", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession({ permissionMode: "ask" });
    const calls = [{ name: "ws_write", arguments: { path: "out/cancelled.md", text: "no" } }];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    await waitForStatus(pollRun, created.json.run.id, "waiting_user");
    const cancelled = await api("POST", `/runs/${created.json.run.id}/cancel`, {});
    assert.equal(cancelled.json.run.status, "cancelled");
    const tree = await api("GET", `/sessions/${session.id}/workspace`);
    assert.ok(!tree.json.tree.some((f) => f.path === "out/cancelled.md"));
  } finally {
    await runtime.close();
  }
});

test("read_only permission mode never injects ws_write", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession({ permissionMode: "read_only" });
    const calls = [{ name: "ws_write", arguments: { path: "out/nope.md", text: "no" } }];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    const finished = await pollRun(created.json.run.id);
    assert.equal(finished.status, "completed");
    assert.equal(finished.artifacts.length, 0);
    const toolResult = (await api("GET", `/sessions/${session.id}/events`)).json.events.find((e) => e.type === "tool.result" && e.data.name === "ws_write");
    assert.equal(toolResult.data.isError, true);
  } finally {
    await runtime.close();
  }
});

// T-PERM-4: the permission record binds the exact call and the exact bytes.
// After "allow", the file that lands on disk hashes to the payload's
// contentSha256 — the approval was for this content, and this content is what
// was written.
test("T-PERM-4: the allowed write matches the approved contentSha256", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession({ permissionMode: "ask" });
    const body = "approved memo body";
    const calls = [{ name: "ws_write", arguments: { path: "out/bound.md", text: body } }];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    await waitForStatus(pollRun, created.json.run.id, "waiting_user");

    const openEvent = (await api("GET", `/sessions/${session.id}/events`)).json.events.find((e) => e.type === "permission.open");
    assert.equal(openEvent.data.kind, "permission");
    assert.ok(openEvent.data.toolCallId, "the permission must name the tool call it belongs to");
    assert.match(openEvent.data.contentSha256, /^[0-9a-f]{64}$/);
    assert.equal(openEvent.data.preview, body);
    assert.equal(openEvent.data.bytes, Buffer.byteLength(body, "utf8"));

    await api("POST", `/runs/${created.json.run.id}/questions/${openEvent.data.id}`, { decision: "allow" });
    const finished = await pollRun(created.json.run.id);
    assert.equal(finished.status, "completed");

    const { createHash } = await import("node:crypto");
    const file = await api("GET", `/sessions/${session.id}/workspace/file?path=out/bound.md`);
    const written = createHash("sha256").update(file.json.text, "utf8").digest("hex");
    assert.equal(written, openEvent.data.contentSha256, "the written bytes must be exactly the approved bytes");
    assert.equal(file.json.sha256, openEvent.data.contentSha256);
    assert.equal(finished.artifacts[0].sha256, openEvent.data.contentSha256);
  } finally {
    await runtime.close();
  }
});

// T-PERM-5: a second ws_write with different parameters opens a NEW question
// (the earlier approval does not carry over), and re-answering the resolved
// questionId is refused with 409 rather than silently authorising the new call.
test("T-PERM-5: changed parameters open a new permission and the old questionId is dead", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession({ permissionMode: "ask" });
    const calls = [
      { name: "ws_write", arguments: { path: "out/first.md", text: "first body" } },
      { name: "ws_write", arguments: { path: "out/second.md", text: "second body" } },
    ];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    const runId = created.json.run.id;

    async function permissionEvents() {
      return (await api("GET", `/sessions/${session.id}/events`)).json.events.filter((e) => e.type === "permission.open");
    }
    await waitForStatus(pollRun, runId, "waiting_user");
    const [first] = await permissionEvents();
    assert.equal(first.data.path, "out/first.md");
    assert.equal((await api("POST", `/runs/${runId}/questions/${first.data.id}`, { decision: "allow" })).status, 200);

    let opens = await permissionEvents();
    for (let i = 0; i < 200 && opens.length < 2; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      opens = await permissionEvents();
    }
    assert.equal(opens.length, 2, "the second write must open its own permission");
    const second = opens[1];
    assert.notEqual(second.data.id, first.data.id);
    assert.notEqual(second.data.toolCallId, first.data.toolCallId);
    assert.notEqual(second.data.contentSha256, first.data.contentSha256);
    assert.equal(second.data.path, "out/second.md");

    const replay = await api("POST", `/runs/${runId}/questions/${first.data.id}`, { decision: "allow" });
    assert.equal(replay.status, 409, "an approval already spent cannot be replayed");
    assert.equal(replay.json.error.code, "question_unavailable");

    await api("POST", `/runs/${runId}/questions/${second.data.id}`, { decision: "deny" });
    const finished = await pollRun(runId);
    assert.equal(finished.status, "completed");
    assert.deepEqual(finished.artifacts.map((a) => a.path), ["out/first.md"], "only the approved write landed");
  } finally {
    await runtime.close();
  }
});
