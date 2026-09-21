/**
 * P03-C · Host governed-read consumer, through the production service path:
 * startServer → RuntimeService → RuntimeStore 19 → Agents Host gateway →
 * adapter → SDK transport → unmodified openai@7.15.0 over loopback sockets.
 *
 * Offline evidence only. The loopback service is a fixture; nothing here is a
 * live Agents API fact and no capability becomes available because of it.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, describe, test } from "node:test";
import { ArtifactHistory } from "../runtime/artifact-history.mjs";
import { boot, reopen } from "./helpers.mjs";
import { agentsPort, cleanup, closeAll, crashCopy, readCall, remoteHost, sha256, waitFor } from "./fixtures/agents-host-harness.mjs";

after(closeAll);

describe("P03-C Host consumer · governed read on the production service path", () => {
  test("admission → create intent → binding → root turn → claim → governed repo_read → retained bytes → one submission → root terminal → later input on the same binding", async () => {
    const t = await remoteHost({ plan: ({ turnIndex }) => turnIndex === 1 ? [readCall(), { text: "read it" }] : [{ text: "second turn" }] });
    const expected = await readFile(path.join(t.sourceDir, "README.md"));

    const first = await t.run("read the README", "c-first");
    assert.equal(first.status, "completed", JSON.stringify(first.error));
    assert.equal(first.adapterId, "agents-api");
    assert.equal(first.hostSession, null, "a remote Run never carries a Pi locator");

    // The serialized creation request the pinned SDK actually sent.
    const [create] = t.loopback.posts("/v1/agents/sessions");
    assert.deepEqual(create.body.environment, { type: "none" });
    assert.deepEqual(create.body.agent.tools, [{
      type: "function", name: "repo_read",
      description: "Read a UTF-8 text file from the currently connected repository. Use a relative path; symbolic links are not followed.",
      parameters: { type: "object", required: ["path"], additionalProperties: false, properties: {
        path: { type: "string", minLength: 1, maxLength: 1000 }, startLine: { type: "integer", minimum: 1 }, endLine: { type: "integer", minimum: 1 } } },
    }], "only repo_read is advertised, with the owner's bounds and a closed shape");
    assert.equal("idempotency-key" in create.headers, false);

    // Durable records.
    const session = t.store.getSession(t.session.id);
    const nativeId = [...t.loopback.sessions.keys()][0];
    assert.equal(session.hostSession, null);
    assert.equal(session.remoteBinding.nativeSessionId, nativeId);
    assert.deepEqual([session.remoteBinding.runtimeId, session.remoteBinding.environment, session.remoteBinding.revision, session.remoteBinding.protocol.sdk, session.remoteBinding.origin.runId],
      ["agents-api", "none", 1, "openai@7.15.0", first.id]);
    assert.equal(first.remoteBinding.bindingId, session.remoteBinding.bindingId);
    assert.equal(first.remoteBinding.rootTurn.turnId, `turn_${nativeId}_1`);
    assert.equal(first.remoteBinding.rootTurn.attribution, "turn.created");
    assert.equal(first.remoteBinding.scope.repositoryBindingRevision, 1);
    assert.equal(JSON.stringify(session).includes("synthetic-loopback-key"), false, "no secret in a binding");

    const [createIntent, call, delivery] = t.actions(first.id);
    assert.deepEqual([createIntent.kind, createIntent.phase, createIntent.requestId], ["create", "accepted", null]);
    assert.deepEqual([call.kind, call.tool, call.execution, call.delivery.state, call.argumentsJson], ["call", "repo_read", "succeeded", "accepted", '{"path":"README.md"}']);
    assert.deepEqual(call.result, { success: true, sha256: sha256(expected), bytes: expected.length });
    assert.deepEqual([delivery.kind, delivery.phase, delivery.id], ["tool_result", "accepted", call.delivery.intentId]);

    // The retained bytes are the file's bytes, and exactly those were sent, once.
    const retained = await new ArtifactHistory(t.h.dataDir).read(t.session.id, call.result.sha256, call.result.bytes);
    assert.ok(retained.equals(expected));
    const submissions = t.loopback.posts("/events").filter(attempt => attempt.body.events[0].type === "agent.session.input.tool_result");
    assert.equal(submissions.length, 1);
    assert.deepEqual(submissions[0].body.events[0], { type: "agent.session.input.tool_result", turn_id: call.native.turnId, call_id: call.native.callId, success: true, output: expected.toString("utf8") });
    assert.equal(submissions[0].headers["idempotency-key"], delivery.requestId);

    // The existing governed reader ran: its own receipt is in the timeline.
    const firstEvents = await t.events(first.id);
    const read = firstEvents.find(event => event.type === "repository.read");
    assert.deepEqual([read.data.operation, read.data.path, read.data.resultSha256], ["read", "README.md", sha256(expected)]);
    assert.deepEqual(firstEvents.filter(event => event.type.startsWith("tool.")).map(event => [event.type, event.data.name, event.data.isError ?? null]),
      [["tool.start", "repo_read", null], ["tool.result", "repo_read", false]]);
    assert.equal(firstEvents.find(event => event.type === "assistant.message").data.text, "read it");

    // A later input continues the same native session: no second creation.
    const second = await t.run("and again", "c-second");
    assert.equal(second.status, "completed", JSON.stringify(second.error));
    assert.equal(t.loopback.posts("/v1/agents/sessions").length, 1);
    assert.equal(second.remoteBinding.nativeSessionId, nativeId);
    assert.equal(second.remoteBinding.rootTurn.turnId, `turn_${nativeId}_2`);
    const [input] = t.actions(second.id);
    assert.deepEqual([input.kind, input.phase], ["input", "accepted"]);
    const message = t.loopback.posts("/events").find(attempt => attempt.body.events[0].type === "agent.session.input.message");
    assert.equal(message.headers["idempotency-key"], input.requestId);
    assert.equal((await t.events(second.id)).find(event => event.type === "assistant.message").data.text, "second turn");
  });

  test("unadvertised, wrong-turn, malformed and out-of-scope calls read nothing; each refusal is retained and delivered once as an error", async () => {
    const t = await remoteHost({ plan: () => [
      { call: { name: "repo_write", arguments: { path: "README.md", text: "x" } } },
      readCall({ path: "README.md" }, { turnId: "turn_of_someone_else" }),
      readCall({ path: "README.md", extra: true }),
      readCall({ path: "README.md", startLine: "1" }),
      readCall('{"path":'),
      readCall({ path: "../outside.txt" }),
    ] });
    const run = await t.run("try everything", "c-negative");
    assert.equal(run.status, "completed", JSON.stringify(run.error));
    const calls = t.actions(run.id).filter(action => action.kind === "call");
    assert.deepEqual(calls.map(call => [call.execution, call.delivery.state, call.result.success]),
      [...Array(5).fill(["rejected", "accepted", false]), ["failed", "accepted", false]]);
    assert.equal(calls[4].argumentsJson, null, "arguments that are not JSON are hashed, never stored as validated");
    const sent = t.results();
    assert.deepEqual(sent.map(event => event.success), Array(6).fill(false));
    assert.match(sent[0].error, /^tool_unavailable:/); assert.match(sent[1].error, /^wrong_turn:/);
    for (const index of [2, 3, 4]) assert.match(sent[index].error, /^invalid_arguments:/);
    const events = await t.events(run.id);
    assert.equal(events.some(event => event.type === "repository.read"), false, "no refusal reached the filesystem reader's receipt");
    assert.deepEqual(events.filter(event => event.type === "tool.start").map(event => event.data.name), ["repo_read"], "only the out-of-scope path reached the governed reader, which refused it");
  });

  test("policy deny and a user's deny never read; a scope revoked while approval is pending cancels the run unread, and a later run has no reader", async () => {
    const t = await remoteHost({ plan: ({ turnIndex }) => turnIndex === 1 ? [readCall({ path: "package.json" }), readCall({ path: "README.md" })] : [readCall({ path: "README.md" })] });
    await t.policy([{ action: "repo_read", resource: "package.json", effect: "deny" }, { action: "repo_read", resource: "README.md", effect: "ask" }]);
    const pending = (runId) => waitFor(() => t.store.snapshot().questions.find(item => item.runId === runId && item.status === "pending"), "the approval");
    const runId = (await t.start("read under policy", "c-policy")).json.run.id;
    const question = await pending(runId);
    assert.deepEqual([question.payload.tool, question.payload.path], ["repo_read", "README.md"]);
    const denied = await t.h.api("POST", `/runs/${runId}/questions/${question.id}`, { decision: "deny", expectedToolCallId: question.payload.toolCallId, expectedContentSha256: question.payload.contentSha256 });
    assert.equal(denied.status, 200, JSON.stringify(denied.json));
    const run = await t.h.pollRun(runId);
    assert.equal(run.status, "completed", JSON.stringify(run.error));
    assert.match(t.results()[0].error, /Runtime policy denied repo_read/);
    assert.match(t.results()[1].error, /denied by the user/);
    assert.deepEqual(t.actions(runId).filter(action => action.kind === "call").map(call => call.execution), ["failed", "failed"]);
    assert.equal((await t.events(runId)).some(event => event.type === "repository.read"), false);

    // Revocation through the existing owner cancels the waiting Run; the read never happens.
    const waitingId = (await t.start("read, then lose the scope", "c-revoked-waiting")).json.run.id;
    await pending(waitingId);
    const revoked = await t.h.api("PUT", `/sessions/${t.session.id}/repository-binding`, { operation: "revoke", requestId: "p03c-revoke", expectedRevision: 1 });
    assert.equal(revoked.status, 200, JSON.stringify(revoked.json));
    assert.equal((await t.h.pollRun(waitingId)).status, "cancelled");
    const waitingCall = t.actions(waitingId).find(action => action.kind === "call");
    assert.deepEqual([waitingCall.execution, waitingCall.delivery.state], ["failed", "none"]);
    assert.equal((await t.events(waitingId)).some(event => event.type === "repository.read"), false);

    // A later Run is admitted without that scope and has no reader to call.
    const later = await t.run("read after revoke", "c-revoked");
    assert.equal(later.status, "completed", JSON.stringify(later.error));
    assert.equal(later.remoteBinding.scope.repositoryBindingId, null);
    assert.match(t.results().at(-1).error, /^tool_unavailable:/);
    assert.equal((await t.events(later.id)).some(event => event.type === "repository.read" || event.type === "tool.start"), false);
  });

  test("a native call observed twice is claimed once, executed once and submitted once; racing claims share one receipt", async () => {
    const t = await remoteHost({ plan: () => [readCall({ path: "README.md" }, { callId: "call_twice", await: false }), readCall({ path: "README.md" }, { callId: "call_twice" })] });
    const run = await t.run("read once", "c-duplicate");
    assert.equal(run.status, "completed", JSON.stringify(run.error));
    assert.equal(t.actions(run.id).filter(action => action.kind === "call").length, 1);
    assert.equal(t.results().length, 1);
    assert.equal((await t.events(run.id)).filter(event => event.type === "repository.read").length, 1);

    // The store is the arbiter: concurrent claims of one native tuple.
    const open = await remoteHost({ plan: () => [readCall({ path: "README.md" }, { callId: "held" })] });
    await open.policy([{ action: "repo_read", resource: "README.md", effect: "ask" }]);
    const held = (await open.start("hold", "c-race")).json.run;
    await waitFor(() => open.actions(held.id).find(action => action.kind === "call"), "the held claim");
    const native = { sessionId: [...open.loopback.sessions.keys()][0], turnId: "turn_race", callId: "call_race" };
    const claim = (json) => open.store.claimRemoteCall(held.id, { native, tool: "repo_read", argumentsJson: json, argumentsSha256: sha256(json) });
    const raced = await Promise.all([claim('{"path":"a"}'), claim('{"path":"a"}'), claim('{"path":"a"}')]);
    assert.deepEqual(raced.map(result => result.idempotent).sort(), [false, true, true]);
    await assert.rejects(claim('{"path":"b"}'), { code: "REMOTE_CALL_CONFLICT" });
    await open.h.api("POST", `/runs/${held.id}/cancel`, {});
  });

  test("without attributable root identity nothing is read and nothing settles the run; a required action is not root evidence", async () => {
    const t = await remoteHost({ announceTurns: false, port: { recoveryAttempts: 0 }, plan: () => [readCall()] });
    const started = (await t.start("no root", "c-noroot")).json.run;
    await waitFor(() => t.results().length === 1, "the refusal");
    assert.match(t.results()[0].error, /^root_turn_unknown:/);
    // The loopback turn completed, but no terminal is attributable to this run.
    assert.equal(t.store.getRun(started.id).status, "running");
    t.loopback.dropStreams();
    const run = await t.h.pollRun(started.id);
    assert.deepEqual([run.status, run.error.code, run.remoteBinding.rootTurn], ["unknown", "remote_stream_closed_before_terminal", null]);
    assert.equal((await t.events(run.id)).some(event => event.type === "repository.read"), false);
  });

  test("a lost creation reply stays unknown: no binding, no guessed id, no replacement session, and the chat is fenced", async () => {
    const t = await remoteHost({ plan: () => [{ text: "never seen" }] });
    t.loopback.fault(attempt => attempt.method === "POST" && attempt.path === "/v1/agents/sessions", "lose_reply");
    const run = await t.run("create and lose", "c-create-lost");
    assert.deepEqual([run.status, run.error.code], ["unknown", "remote_create_unknown"]);
    assert.equal(t.loopback.sessions.size, 1, "the service did create a session the Host cannot name");
    assert.equal(t.store.getSession(t.session.id).remoteBinding, null);
    assert.equal(run.remoteBinding.nativeSessionId, null);
    assert.deepEqual(t.actions().map(action => [action.kind, action.phase, action.native.sessionId]), [["create", "unknown", null]]);
    const again = await t.start("try again", "c-create-again");
    assert.deepEqual([again.status, again.json.error.code], [409, "remote_unreconciled"]);
    assert.equal(t.loopback.posts("/v1/agents/sessions").length, 1);

    // A refusal is decisive: the run fails and the chat may create again.
    const refused = await remoteHost({ plan: () => [{ text: "second attempt" }] });
    refused.loopback.fault(attempt => attempt.method === "POST" && attempt.path === "/v1/agents/sessions", "reject", 400);
    const failed = await refused.run("create and be refused", "c-create-refused");
    assert.deepEqual([failed.status, failed.error.code], ["failed", "remote_create_rejected"]);
    assert.equal((await refused.run("create again", "c-create-retry")).status, "completed");
  });

  test("a lost submission reply keeps the retained result and its identity: unknown delivery, no re-read, no re-send, chat fenced", async () => {
    const t = await remoteHost({ plan: () => [readCall(), { text: "the service did get it" }] });
    t.loopback.fault(attempt => attempt.method === "POST" && attempt.body?.events?.[0]?.type === "agent.session.input.tool_result", "lose_reply");
    const run = await t.run("read and lose the ack", "c-submit-lost");
    assert.deepEqual([run.status, run.error.code], ["unknown", "remote_delivery_unknown"]);
    const call = t.actions(run.id).find(action => action.kind === "call");
    assert.deepEqual([call.execution, call.delivery.state, call.result.success], ["succeeded", "unknown", true]);
    assert.ok((await new ArtifactHistory(t.h.dataDir).read(t.session.id, call.result.sha256, call.result.bytes)).length > 0);
    assert.equal(t.results().length, 1);
    assert.equal((await t.events(run.id)).filter(event => event.type === "repository.read").length, 1);
    assert.equal((await t.start("continue", "c-after-loss")).json.error.code, "remote_unreconciled");
  });

  test("restart fences: an interrupted execution and an unanswered submission become unknown; nothing is re-read, re-run or re-sent", async () => {
    // Interrupted execution: claimed, the governed reader is waiting for approval.
    const exec = await remoteHost({ plan: () => [readCall()] });
    await exec.policy([{ action: "repo_read", resource: "README.md", effect: "ask" }]);
    const execRun = (await exec.start("claimed only", "c-crash-exec")).json.run;
    await waitFor(() => exec.store.snapshot().questions.some(question => question.runId === execRun.id && question.status === "pending"), "the approval");
    assert.equal(exec.actions(execRun.id).find(action => action.kind === "call").execution, "claimed", "the claim precedes execution");
    const execCopy = await crashCopy(exec.h);

    // Interrupted submission: result retained, request in flight, never answered.
    const submit = await remoteHost({ plan: () => [readCall()] });
    submit.loopback.fault(attempt => attempt.method === "POST" && attempt.body?.events?.[0]?.type === "agent.session.input.tool_result", "hold");
    const submitRun = (await submit.start("in flight", "c-crash-submit")).json.run;
    await waitFor(() => submit.results().length === 1, "the submission");
    assert.equal(submit.actions(submitRun.id).find(action => action.kind === "call").delivery.state, "pending", "the intent precedes the request");
    const submitCopy = await crashCopy(submit.h);

    for (const [t, copy, runId, expected] of [[exec, execCopy, execRun.id, ["unknown", "none", null]], [submit, submitCopy, submitRun.id, ["succeeded", "unknown", true]]]) {
      const requestsBefore = t.loopback.attempts.length;
      const readsBefore = (await t.events(runId)).filter(event => event.type === "repository.read").length;
      const reopened = await reopen(copy, { runtimePort: agentsPort(t.loopback) });
      cleanup.push(() => reopened.runtime.close());
      assert.ok(reopened.logs.some(line => /remote actions were fenced as unknown/.test(line)));
      const store = reopened.runtime.service.store;
      const run = store.getRun(runId);
      assert.deepEqual([run.status, run.admissionOpen], ["unknown", false]);
      const call = store.listRemoteActions(t.session.id, runId).find(action => action.kind === "call");
      assert.deepEqual([call.execution, call.delivery.state, call.result?.success ?? null], expected);
      assert.equal(store.snapshot().questions.some(question => question.status === "pending"), false, "unsafe approvals expired through the existing owner");
      const next = await reopened.api("POST", `/sessions/${t.session.id}/runs`, { input: "after restart", commandId: "c-after-restart" });
      assert.deepEqual([next.status, next.json.error.code], [409, "remote_unreconciled"]);
      assert.equal(t.loopback.attempts.length, requestsBefore, "recovery sent nothing to the remote service");
      assert.equal(store.listEvents({ sessionId: t.session.id, runId }).filter(event => event.type === "repository.read").length, readsBefore, "recovery read nothing");
    }
    await exec.h.api("POST", `/runs/${execRun.id}/cancel`, {});
  });

  test("an earlier stream replayed to a later run cannot re-execute, re-associate or settle it", async () => {
    const t = await remoteHost({ replay: "all", plan: ({ turnIndex }) => turnIndex === 1 ? [readCall(), { text: "first" }] : [{ text: "second" }] });
    const first = await t.run("first", "c-replay-1");
    // A fresh Host process holds no event-id ledger; only durable records protect it.
    const copy = await crashCopy(t.h);
    await t.h.runtime.close();
    const reopened = await reopen(copy, { runtimePort: agentsPort(t.loopback) });
    cleanup.push(() => reopened.runtime.close());
    const created = await reopened.api("POST", `/sessions/${t.session.id}/runs`, { input: "second", commandId: "c-replay-2" });
    assert.equal(created.status, 200, JSON.stringify(created.json));
    const store = reopened.runtime.service.store;
    const second = await waitFor(() => { const run = store.getRun(created.json.run.id); return ["completed", "failed", "unknown", "cancelled"].includes(run.status) ? run : null; }, "the second run");
    assert.equal(second.status, "completed", JSON.stringify(second.error));
    assert.notEqual(second.remoteBinding.rootTurn.turnId, first.remoteBinding.rootTurn.turnId);
    assert.equal(t.results().length, 1, "the replayed required action met its receipt");
    const events = store.listEvents({ sessionId: t.session.id, runId: second.id });
    assert.deepEqual(events.filter(event => event.type === "assistant.message").map(event => event.data.text), ["second"]);
    assert.equal(events.some(event => event.type === "repository.read"), false);
  });

  test("a chat stays with its runtime: Pi refuses a remote-bound chat, the remote runtime refuses a Pi chat, and a changed configuration cannot reuse the binding", async () => {
    const t = await remoteHost({ plan: () => [{ text: "bound" }] });
    assert.equal((await t.run("bind", "c-own-1")).status, "completed");
    const copy = await crashCopy(t.h);
    const pi = await reopen(copy);
    cleanup.push(() => pi.runtime.close());
    const refused = await pi.api("POST", `/sessions/${t.session.id}/runs`, { input: "on Pi", commandId: "c-own-pi" });
    assert.deepEqual([refused.status, refused.json.error.code], [409, "runtime_mismatch"]);

    // The other direction: a chat Pi served is never handed to the remote runtime.
    const piHost = await boot();
    cleanup.push(() => piHost.runtime.close());
    const piSession = await piHost.createSession();
    const piRun = await piHost.api("POST", `/sessions/${piSession.id}/runs`, { input: "hello", commandId: "c-own-pi-first" });
    assert.equal((await piHost.pollRun(piRun.json.run.id)).status, "completed");
    assert.match(piHost.runtime.service.store.getSession(piSession.id).hostSession.path, /pi-sessions/);
    const remote = await reopen(await crashCopy(piHost), { runtimePort: agentsPort(t.loopback) });
    cleanup.push(() => remote.runtime.close());
    const handed = await remote.api("POST", `/sessions/${piSession.id}/runs`, { input: "on the remote runtime", commandId: "c-own-remote" });
    assert.deepEqual([handed.status, handed.json.error.code], [409, "runtime_mismatch"]);
    assert.equal(t.loopback.posts("/v1/agents/sessions").length, 1, "nothing was created for the Pi chat");

    await t.store.bumpCredentialGeneration();
    const mismatched = await t.start("other credential", "c-own-2");
    assert.deepEqual([mismatched.status, mismatched.json.error.code], [409, "remote_binding_mismatch"]);
  });
});
