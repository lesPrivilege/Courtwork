/**
 * P03-D · failure and recovery of the Host consumer, on the same production
 * service path as P03-C: cancellation intent and confirmation, observation
 * recovery after a lost stream, the one documented retry, explicit
 * reconciliation after an unknown, and what stays unknown.
 *
 * Offline evidence only, against the loopback fixture. Each fault's row in the
 * fault matrix names its test here.
 */
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reopen, spawnWorker } from "./helpers.mjs";
import { createAgentsLoopback } from "./fixtures/agents-api-loopback.mjs";
import { createSyntheticRepository } from "./fixtures/synthetic-repo/create-synthetic-repo.mjs";
import { agentsPort, cleanup, closeAll, crashCopy, readCall, remoteHost, waitFor } from "./fixtures/agents-host-harness.mjs";

after(closeAll);

const isToolResult = (attempt) => attempt.method === "POST" && attempt.body?.events?.[0]?.type === "agent.session.input.tool_result";
const isInput = (attempt) => attempt.method === "POST" && attempt.body?.events?.[0]?.type === "agent.session.input.message";
const isCancel = (attempt) => attempt.method === "POST" && attempt.body?.events?.[0]?.type === "agent.session.input.cancel";
const notices = async (t, runId) => (await t.events(runId)).filter(event => event.type === "run.notice").map(event => event.data.code);
const cancelRun = (t, runId) => t.h.api("POST", `/runs/${runId}/cancel`, {});

describe("P03-D · cancellation", () => {
  test("cancel is an intent; the root turn ending cancelled confirms it, the retained result is not delivered, and the chat continues", async () => {
    const t = await remoteHost({ plan: ({ turnIndex }) => turnIndex === 1 ? [readCall(), { text: "never said" }] : [{ text: "after cancel" }] });
    await t.policy([{ action: "repo_read", resource: "README.md", effect: "ask" }]);
    const runId = (await t.start("read, then be cancelled", "d-cancel")).json.run.id;
    await waitFor(() => t.store.snapshot().questions.some(question => question.runId === runId && question.status === "pending"), "the approval");
    assert.equal((await cancelRun(t, runId)).status, 200);
    const run = await t.h.pollRun(runId);
    assert.equal(run.status, "cancelled", JSON.stringify(run.error));
    assert.deepEqual([run.remoteBinding.rootTurn.terminal.status, run.remoteBinding.rootTurn.terminal.evidence], ["cancelled", "turn.event"]);
    const actions = t.actions(runId);
    const cancel = actions.find(action => action.kind === "cancel");
    assert.deepEqual([cancel.phase, cancel.native.turnId], ["accepted", run.remoteBinding.rootTurn.turnId]);
    assert.equal(t.loopback.posts("/events").find(isCancel).headers["idempotency-key"], cancel.requestId);
    const call = actions.find(action => action.kind === "call");
    assert.deepEqual([call.execution, call.result.success, call.delivery.state], ["failed", false, "none"], "the interrupted read is retained as a failure and never delivered");
    assert.equal(t.results().length, 0);
    assert.equal((await t.events(runId)).some(event => event.type === "repository.read"), false);
    assert.equal((await t.run("go on", "d-after-cancel")).status, "completed", "a confirmed cancel leaves nothing unsettled");
  });

  test("an accepted cancel that is never confirmed gets one last turn read, then stays unknown and fences the chat until the turn is seen to end", async () => {
    const t = await remoteHost({ cancel: "ignore", port: { cancelConfirmMs: 150 }, plan: ({ turnIndex }) => turnIndex === 1 ? [{ pause: "held" }, { text: "late" }] : [{ text: "continued" }] });
    const runId = (await t.start("hang", "d-cancel-ignored")).json.run.id;
    await waitFor(() => t.store.getRun(runId).remoteBinding?.rootTurn, "the root turn");
    await cancelRun(t, runId);
    const run = await t.h.pollRun(runId);
    assert.deepEqual([run.status, run.error.code, run.remoteBinding.rootTurn.terminal], ["unknown", "remote_cancellation_unconfirmed", null]);
    assert.equal(t.actions(runId).find(action => action.kind === "cancel").phase, "accepted", "HTTP accepted the request; that is not a cancellation");
    assert.equal(t.sent("cancel").length, 1);
    assert.equal(t.loopback.gets(`/turns/${run.remoteBinding.rootTurn.turnId}`).length, 1);
    assert.equal((await t.start("too early", "d-early")).json.error.code, "remote_unreconciled", "the native turn may still be running");

    // Still running: reconciliation reads, decides nothing, changes nothing.
    const still = await t.h.runtime.service.reconcileRemoteSession(t.session.id);
    assert.deepEqual([still.settledRuns, still.unsettledRuns.map(item => item.reason)], [[], ["turn_not_ended"]]);
    // The turn ends by itself. A read of the turn is decisive.
    t.loopback.resume("held");
    const settled = await t.h.runtime.service.reconcileRemoteSession(t.session.id);
    assert.deepEqual(settled.settledRuns, [{ runId, rootTurnId: run.remoteBinding.rootTurn.turnId, status: "completed" }]);
    assert.deepEqual(settled.unsettledRuns, []);
    assert.equal(t.store.getRun(runId).status, "unknown", "the run that ended unknown stays unknown");
    assert.equal(t.store.getRun(runId).remoteBinding.rootTurn.terminal.evidence, "turn.read");
    assert.equal(t.sent("cancel").length, 1, "reconciliation sent nothing");
    assert.equal((await t.run("now", "d-continued")).status, "completed");
  });

  test("a cancel whose reply is lost, or that is refused, is sent once and leaves the run unknown", async () => {
    for (const [mode, code, phase] of [["lose_reply", "remote_cancel_unknown", "unknown"], ["reject", "remote_cancel_rejected", "rejected"]]) {
      const t = await remoteHost({ cancel: "ignore", plan: () => [{ pause: "held" }] });
      t.loopback.fault(isCancel, mode, 409);
      const runId = (await t.start("hang", `d-cancel-${mode}`)).json.run.id;
      await waitFor(() => t.store.getRun(runId).remoteBinding?.rootTurn, "the root turn");
      await cancelRun(t, runId);
      const run = await t.h.pollRun(runId);
      assert.deepEqual([run.status, run.error.code], ["unknown", code]);
      assert.equal(t.actions(runId).find(action => action.kind === "cancel").phase, phase);
      assert.equal(t.sent("cancel").length, 1);
    }
  });
});

describe("P03-D · observation recovery", () => {
  test("a stream lost mid-turn is re-subscribed; undelivered events arrive, the call is not repeated, the run completes", async () => {
    const t = await remoteHost({ plan: () => [readCall(), { drop: true }, { text: "after the gap" }] });
    const run = await t.run("read across a gap", "d-gap");
    assert.equal(run.status, "completed", JSON.stringify(run.error));
    assert.ok((await notices(t, run.id)).includes("remote_stream_recovering"));
    assert.equal(t.results().length, 1);
    assert.equal((await t.events(run.id)).filter(event => event.type === "repository.read").length, 1);
    assert.equal((await t.events(run.id)).find(event => event.type === "assistant.message").data.text, "after the gap");
  });

  test("events missed for good: the session's current required action is executed once from the snapshot, and a terminal nobody streamed is read from the turn", async () => {
    // Each drop happens inside the service's handling of a result, so what follows is emitted to no stream at all.
    const t = await remoteHost({ replay: "live", plan: ({ turnIndex }) => turnIndex === 1
      ? [readCall({ path: "README.md" }), { drop: true }, readCall({ path: "package.json" }), { drop: true }, { text: "unheard" }] : [{ text: "next" }] });
    const run = await t.run("read through two gaps", "d-live");
    assert.equal(run.status, "completed", JSON.stringify(run.error));
    assert.equal(run.remoteBinding.rootTurn.terminal.evidence, "turn.read");
    const calls = t.actions(run.id).filter(action => action.kind === "call");
    assert.deepEqual(calls.map(call => [call.argumentsJson, call.execution, call.delivery.state]),
      [['{"path":"README.md"}', "succeeded", "accepted"], ['{"path":"package.json"}', "succeeded", "accepted"]], "the second call was never streamed; it came from the session snapshot");
    assert.equal(t.results().length, 2);
    assert.equal((await t.events(run.id)).some(event => event.type === "assistant.message"), false, "text that was never delivered is a gap, not reconstructed");
    assert.equal((await t.run("and continue", "d-live-2")).status, "completed");
  });

  test("a required action seen on the stream and again in the recovery snapshot is one claim", async () => {
    const t = await remoteHost({ plan: () => [readCall({ path: "README.md" }, { callId: "call_seen_twice", await: false }), { drop: true }, readCall({ path: "README.md" }, { callId: "call_seen_twice" })] });
    const run = await t.run("seen twice", "d-dup");
    assert.equal(run.status, "completed", JSON.stringify(run.error));
    assert.equal(t.actions(run.id).filter(action => action.kind === "call").length, 1);
    assert.equal(t.results().length, 1);
    assert.equal((await t.events(run.id)).filter(event => event.type === "repository.read").length, 1);
  });

  test("contradictory root terminals, a root turn that cannot be read and an unusable item cursor each end unknown", async () => {
    const terminal = (turnId, status) => ({ event: { type: `agent.session.turn.${status}`, turn_id: turnId, turn: { id: turnId, subagent_id: null, status, error: status === "failed" ? { code: "x", message: "y" } : null } } });
    const contradictory = await remoteHost({ plan: ({ turnId }) => [readCall(), { drop: true }, terminal(turnId, "completed"), terminal(turnId, "failed"), { end: "none" }] });
    const first = await contradictory.run("two endings", "d-contradiction");
    assert.deepEqual([first.status, first.error.code], ["unknown", "remote_contradictory_terminal"]);

    const unreadable = await remoteHost({ replay: "live", plan: () => [readCall(), { drop: true }, { text: "gone" }] });
    unreadable.loopback.fault(attempt => attempt.method === "GET" && attempt.path.includes("/turns/"), "reject", 500);
    const second = await unreadable.run("unreadable turn", "d-unreadable");
    assert.deepEqual([second.status, second.error.code], ["unknown", "remote_recovery_failed"]);

    const cursorless = await remoteHost({ plan: () => [readCall(), { drop: true }, { text: "gone" }] });
    cursorless.loopback.fault(attempt => attempt.method === "GET" && attempt.path.includes("/items"), "respond", { data: [], has_more: true, first_id: null, last_id: null });
    const third = await cursorless.run("incomplete history", "d-cursor");
    assert.deepEqual([third.status, third.error.code], ["unknown", "remote_recovery_failed"]);
    // Both endings agree the turn is over, so only how it ended is unknown; the other two never saw it end.
    assert.equal(contradictory.store.listUnsettledRemoteRuns(contradictory.session.id).length, 0);
    for (const t of [unreadable, cursorless]) assert.equal((await t.start("again", "d-fenced")).json.error.code, "remote_unreconciled");
  });

  test("recovery is bounded: a stream that never holds is re-subscribed twice, then the run is unknown", async () => {
    const t = await remoteHost({ plan: () => [{ pause: "forever" }] });
    const dropper = setInterval(() => t.loopback.dropStreams(), 25);
    cleanup.push(async () => clearInterval(dropper));
    const run = await t.run("never holds", "d-bounded");
    clearInterval(dropper);
    assert.deepEqual([run.status, run.error.code], ["unknown", "remote_stream_closed_before_terminal"]);
    assert.equal(t.loopback.gets("/events").length, 3, "one stream and two recoveries");
    assert.equal((await notices(t, run.id)).filter(code => code === "remote_stream_recovering").length, 2);
  });
});

describe("P03-D · lost replies and explicit reconciliation", () => {
  test("an unanswered input is re-sent once under the same request key — the one operation the SDK documents the key for", async () => {
    const t = await remoteHost({ plan: () => [{ text: "ok" }] });
    assert.equal((await t.run("first", "d-input-0")).status, "completed");
    t.loopback.fault(isInput, "lose_request");
    const run = await t.run("second", "d-input-1");
    assert.equal(run.status, "completed", JSON.stringify(run.error));
    const inputs = t.loopback.posts("/events").filter(isInput);
    assert.equal(inputs.length, 2);
    assert.equal(inputs[0].headers["idempotency-key"], inputs[1].headers["idempotency-key"]);
    assert.deepEqual(t.actions(run.id).filter(action => action.kind === "input").map(action => action.phase), ["accepted"]);

    t.loopback.fault(isInput, "lose_request"); t.loopback.fault(isInput, "lose_request");
    const lost = await t.run("third", "d-input-2");
    assert.deepEqual([lost.status, lost.error.code], ["unknown", "remote_input_unknown"]);
    assert.equal(t.loopback.posts("/events").filter(isInput).length, 4, "never a third attempt");
    assert.equal((await t.start("fourth", "d-input-3")).json.error.code, "remote_unreconciled");
  });

  test("a lost submission reply is never re-sent; reconciliation appends what the service's own history and turn show, and the chat continues", async () => {
    const t = await remoteHost({ plan: ({ turnIndex }) => turnIndex === 1 ? [readCall(), { text: "the service did get it" }] : [{ text: "continued" }] });
    t.loopback.fault(isToolResult, "lose_reply");
    const run = await t.run("read and lose the ack", "d-submit-lost");
    assert.deepEqual([run.status, run.error.code], ["unknown", "remote_delivery_unknown"]);
    const before = t.loopback.attempts.filter(attempt => attempt.method === "POST").length;

    const report = await t.h.runtime.service.reconcileRemoteSession(t.session.id);
    assert.deepEqual([report.unresolved, report.unsettledRuns], [[], []]);
    assert.equal(report.resolved.length, 2, "the claim and the intent that delivered it");
    const [call, intent] = ["call", "tool_result"].map(kind => t.actions(run.id).find(action => action.kind === kind));
    assert.deepEqual([call.delivery.state, intent.phase], ["unknown", "unknown"], "the unknown receipts are not rewritten");
    assert.deepEqual([call.resolution.evidence, intent.resolution.evidence], ["root_terminal", "root_terminal"]);
    assert.equal(t.loopback.attempts.filter(attempt => attempt.method === "POST").length, before, "reconciliation is reads only");
    assert.equal(t.results().length, 1);
    assert.equal((await t.run("continue", "d-submit-continued")).status, "completed");
    assert.deepEqual(await t.h.runtime.service.reconcileRemoteSession(t.session.id), { resolved: [], settledRuns: [], unresolved: [], unsettledRuns: [] });
  });

  test("a delivery the saved history shows is resolved by that item even while the turn is still running", async () => {
    const t = await remoteHost({ plan: () => [readCall(), { pause: "after-result" }] });
    t.loopback.fault(isToolResult, "lose_reply");
    const run = await t.run("delivered, turn still open", "d-item");
    assert.equal(run.error.code, "remote_delivery_unknown");
    // The store takes evidence, not assertions: a turn not on record as ended resolves nothing.
    const unknownCall = t.actions(run.id).find(action => action.kind === "call");
    await assert.rejects(t.store.resolveRemoteActions(t.session.id, [{ actionId: unknownCall.id, evidence: "root_terminal", nativeRef: run.remoteBinding.rootTurn.turnId }]), { code: "REMOTE_RESOLUTION_INVALID" });
    await assert.rejects(t.store.resolveRemoteActions(t.session.id, [{ actionId: t.actions(run.id).find(action => action.kind === "create").id, evidence: "native_item", nativeRef: "item_x" }]), { code: "REMOTE_RESOLUTION_INVALID" });
    const report = await t.h.runtime.service.reconcileRemoteSession(t.session.id);
    assert.equal(t.actions(run.id).find(action => action.kind === "call").resolution.evidence, "native_item");
    assert.deepEqual([report.unresolved, report.unsettledRuns.map(item => item.reason)], [[], ["turn_not_ended"]], "the delivery is known; the turn is not over");
    assert.equal((await t.start("not yet", "d-item-early")).json.error.code, "remote_unreconciled");
  });

  test("after a Host restart mid-submission the fenced chat is reconciled by reads alone and then continues on the same native session", async () => {
    const t = await remoteHost({ plan: ({ turnIndex }) => turnIndex === 1 ? [readCall(), { text: "done" }] : [{ text: "after restart" }] });
    t.loopback.fault(isToolResult, "hold");
    const runId = (await t.start("in flight", "d-restart")).json.run.id;
    await waitFor(() => t.results().length === 1, "the submission");
    const copy = await crashCopy(t.h);
    const reopened = await reopen(copy, { runtimePort: agentsPort(t.loopback) });
    cleanup.push(() => reopened.runtime.close());
    const service = reopened.runtime.service;
    assert.equal(service.store.getRun(runId).status, "unknown");

    // The held request was never applied: the native call is still required.
    const stuck = await service.reconcileRemoteSession(t.session.id);
    assert.deepEqual([stuck.resolved, stuck.unresolved.map(item => item.reason), stuck.unsettledRuns.map(item => item.reason)], [[], ["no_decisive_evidence", "no_decisive_evidence"], ["turn_not_ended"]]);
    assert.equal(t.results().length, 1, "nothing was re-sent to find out");

    // The native turn is ended from outside this Host; the read then decides.
    t.loopback.sessions.values().next().value.turnStatus.set(service.store.getRun(runId).remoteBinding.rootTurn.turnId, "cancelled");
    Object.assign(t.loopback.sessions.values().next().value, { turn: null, status: "idle", required: [] });
    const settled = await service.reconcileRemoteSession(t.session.id);
    assert.deepEqual([settled.settledRuns.map(item => item.status), settled.unresolved, settled.unsettledRuns], [["cancelled"], [], []]);
    const next = await reopened.api("POST", `/sessions/${t.session.id}/runs`, { input: "after restart", commandId: "d-after-restart" });
    assert.equal(next.status, 200, JSON.stringify(next.json));
    const done = await waitFor(() => { const run = service.store.getRun(next.json.run.id); return run.status === "running" ? null : run; }, "the continued run");
    assert.equal(done.status, "completed", JSON.stringify(done.error));
    assert.equal(t.loopback.posts("/v1/agents/sessions").length, 1, "the same native session, never a replacement");
  });

  test("CDE-R1: a repo_write whose execution was interrupted without a retained result stays fenced after its root turn ends; nothing is written or checked again", async () => {
    const t = await remoteHost({ permissionMode: "ask", plan: () => [{ call: { name: "repo_write", arguments: { path: "note.txt", text: "written under an unknown fence\n" } } }] });
    const candidate = await t.h.api("PUT", `/sessions/${t.session.id}/repository-candidate`, { operation: "create", requestId: "r1-candidate", expectedRevision: 0, expectedBindingRevision: 1, candidateId: "f23e4567-e89b-42d3-a456-426614174000", baseCommit: t.repository.head });
    assert.equal(candidate.status, 200, JSON.stringify(candidate.json));
    const runId = (await t.start("write", "r1-write")).json.run.id;
    await waitFor(() => t.store.snapshot().questions.some(question => question.runId === runId && question.status === "pending"), "the write approval");
    const claimed = t.actions(runId).find(action => action.kind === "call");
    assert.deepEqual([claimed.tool, claimed.execution, claimed.result], ["repo_write", "claimed", null]);
    const reopened = await reopen(await crashCopy(t.h), { runtimePort: agentsPort(t.loopback) });
    cleanup.push(() => reopened.runtime.close());
    const service = reopened.runtime.service;
    const fenced = () => service.store.listRemoteActions(t.session.id, runId).find(action => action.kind === "call");
    assert.deepEqual([service.store.getRun(runId).status, fenced().execution, fenced().delivery.state], ["unknown", "unknown", "none"]);

    // The native root turn ends from outside this Host: remote liveness is over, the local effect is still not known.
    const native = t.loopback.sessions.values().next().value;
    native.turnStatus.set(service.store.getRun(runId).remoteBinding.rootTurn.turnId, "cancelled");
    Object.assign(native, { turn: null, status: "idle", required: [] });
    const posts = t.loopback.attempts.filter(attempt => attempt.method === "POST").length;
    const report = await service.reconcileRemoteSession(t.session.id);
    assert.deepEqual([report.settledRuns.map(item => item.status), report.resolved, report.unsettledRuns, report.unresolved.map(item => [item.kind, item.reason])],
      [["cancelled"], [], [], [["call", "local_effect_unknown"]]]);
    assert.equal(fenced().resolution, null, "native evidence attached nothing to the unknown execution");
    await assert.rejects(service.store.resolveRemoteActions(t.session.id, [{ actionId: fenced().id, evidence: "root_terminal", nativeRef: service.store.getRun(runId).remoteBinding.rootTurn.turnId }]), { code: "REMOTE_RESOLUTION_INVALID" });
    const refused = await reopened.api("POST", `/sessions/${t.session.id}/runs`, { input: "again", commandId: "r1-again" });
    assert.deepEqual([refused.status, refused.json.error.code], [409, "remote_unreconciled"]);
    assert.equal(service.store.getSession(t.session.id).repositoryWriteEffects.length, 0, "no write effect was ever prepared");
    assert.equal(service.store.listEvents({ sessionId: t.session.id }).some(event => event.type.startsWith("repository.write") || event.type.startsWith("check.")), false);
    assert.equal(t.loopback.attempts.filter(attempt => attempt.method === "POST").length, posts, "reconciliation and the refusal sent nothing");
    await assert.rejects(readFile(path.join(service.store.getSession(t.session.id).repositoryCandidate.candidatePath, "note.txt")), { code: "ENOENT" });
  });

  test("a lost creation has no native locator: reconciliation can observe nothing and says so; Pi declares no recover capability", async () => {
    const t = await remoteHost({ plan: () => [{ text: "orphan" }] });
    t.loopback.fault(attempt => attempt.method === "POST" && attempt.path === "/v1/agents/sessions", "lose_reply");
    await t.run("create and lose", "d-create-lost");
    const requests = t.loopback.attempts.length;
    const report = await t.h.runtime.service.reconcileRemoteSession(t.session.id);
    assert.deepEqual([report.resolved, report.unresolved.map(item => [item.kind, item.reason])], [[], [["create", "no_native_locator"]]]);
    assert.equal(t.loopback.attempts.length, requests);
    await assert.rejects(t.h.runtime.service.reconcileRemoteSession("missing"), { code: "not_found" });
  });
});

describe("P03-D · process evidence", () => {
  const appRoot = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
  const prelude = `
    import { createAgentsRuntimePort } from ${JSON.stringify(path.join(appRoot, "runtime/agents-host-gateway.mjs"))};
    import { createOpenAiAgentsTransport } from ${JSON.stringify(path.join(appRoot, "runtime/openai-agents-transport.mjs"))};`;
  const serverOptions = `{ runtimePort: () => createAgentsRuntimePort({ transport: createOpenAiAgentsTransport({ apiKey: "synthetic-loopback-key", baseURL: process.env.CW_LOOPBACK_URL, timeoutMs: 2000 }) }) }`;
  const body = (policy) => `
    await api("PUT", "/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
    const project = (await api("POST", "/projects", { name: "process" })).json.project;
    const session = (await api("POST", "/sessions", { projectId: project.id, title: "process" })).json.session;
    await api("PUT", "/sessions/" + session.id + "/repository-binding", { operation: "bind", requestId: "process-bind", expectedRevision: 0, rootPath: process.env.CW_SOURCE_DIR });
    ${policy ? `const control = (await api("GET", "/runtime-control?sessionId=" + session.id)).json;
    await api("PUT", "/runtime-control?sessionId=" + session.id, { revision: control.revision, operation: "policy", scope: { type: "session", id: session.id }, rules: [{ action: "repo_read", resource: "README.md", effect: "ask" }] });` : ""}
    const run = (await api("POST", "/sessions/" + session.id + "/runs", { input: "read", commandId: "process-run" })).json.run;
    emit({ sessionId: session.id, runId: run.id });
    await new Promise(() => {});`;

  for (const [name, policy, hold, expected] of [
    ["SIGKILL while the claimed read waits for approval", true, false, ["unknown", "none"]],
    ["SIGKILL while the result submission is in flight", false, true, ["succeeded", "unknown"]],
  ]) {
    test(`${name}: the next Host process fences it unknown, sends nothing, reads nothing again, and reconciles by reads`, async () => {
      const loopback = await createAgentsLoopback({ plan: ({ turnIndex }) => turnIndex === 1 ? [readCall(), { text: "done" }] : [{ text: "after the crash" }] });
      const dataDir = await mkdtemp(path.join(tmpdir(), "cw-p03d-process-"));
      const sourceDir = await mkdtemp(path.join(tmpdir(), "cw-p03d-source-"));
      cleanup.push(() => loopback.close(), () => rm(dataDir, { recursive: true, force: true }), () => rm(sourceDir, { recursive: true, force: true }));
      await createSyntheticRepository(sourceDir);
      if (hold) loopback.fault(isToolResult, "hold");
      const worker = spawnWorker({ dataDir, prelude, serverOptions, body: body(policy), env: { CW_LOOPBACK_URL: loopback.baseURL, CW_SOURCE_DIR: sourceDir } });
      cleanup.push(() => worker.kill());
      const ids = await worker.waitForLine(value => Boolean(value?.runId));
      assert.ok(ids, worker.stderr);
      // The instant to die at: the claim exists (and, for the submission case, the request has left).
      // The durable state file is the only witness a crash leaves; wait on it, not on a clock.
      const durable = async () => JSON.parse(await readFile(path.join(dataDir, "runtime-state.json"), "utf8"));
      await waitFor(async () => hold ? loopback.posts("/events").some(isToolResult)
        : (await durable().catch(() => null))?.questions.some(question => question.runId === ids.runId && question.status === "pending"), "the crash point");
      await worker.kill("SIGKILL");
      assert.deepEqual(await worker.waitForExit(), { code: null, signal: "SIGKILL" });

      const requests = loopback.attempts.length;
      const reopened = await reopen(dataDir, { runtimePort: agentsPort(loopback) });
      cleanup.push(() => reopened.runtime.close());
      const { service } = reopened.runtime;
      const run = service.store.getRun(ids.runId);
      assert.deepEqual([run.status, run.admissionOpen], ["unknown", false]);
      const call = service.store.listRemoteActions(ids.sessionId, ids.runId).find(action => action.kind === "call");
      assert.deepEqual([call.execution, call.delivery.state], expected);
      assert.equal(loopback.attempts.length, requests, "opening the data directory sent nothing");
      assert.equal(service.store.listEvents({ sessionId: ids.sessionId, runId: ids.runId }).filter(event => event.type === "repository.read").length, hold ? 1 : 0);
      const refused = await reopened.api("POST", `/sessions/${ids.sessionId}/runs`, { input: "again", commandId: "process-again" });
      assert.equal(refused.json.error.code, "remote_unreconciled");

      // The native turn still waits for a result this Host will never re-run or re-send.
      const stuck = await service.reconcileRemoteSession(ids.sessionId);
      assert.deepEqual([stuck.resolved, stuck.unsettledRuns.map(item => item.reason)], [[], ["turn_not_ended"]]);
      assert.equal(loopback.attempts.filter(attempt => attempt.method === "POST").length, loopback.attempts.slice(0, requests).filter(attempt => attempt.method === "POST").length);
    });
  }
});
