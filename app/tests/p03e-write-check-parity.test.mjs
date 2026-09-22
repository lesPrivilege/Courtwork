/**
 * P03-E · same repository read / write / check, on the unchanged Pi baseline
 * and on the Agents Host consumer.
 *
 * One scenario script drives both Hosts through the same HTTP routes: the
 * model side is the fake provider's `/fixture script` for Pi and the loopback
 * service's plan for the remote runtime, asking for the same tool calls. What
 * the Host owns — approvals and their identity, write receipts, check
 * receipts, the candidate diff, what a reopened Host shows — is normalized
 * (ids, timestamps, durations, process output) and must be equal.
 *
 * Offline author evidence. A passing check, a model answer or a native turn
 * is never Work Core acceptance.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { boot, reopen } from "./helpers.mjs";
import { createAgentsLoopback } from "./fixtures/agents-api-loopback.mjs";
import { agentsPort, cleanup, closeAll, crashCopy, sha256, waitFor } from "./fixtures/agents-host-harness.mjs";
import { createSyntheticRepository, KNOWN_BUG } from "./fixtures/synthetic-repo/create-synthetic-repo.mjs";

after(closeAll);

const CANDIDATE_ID = "e23e4567-e89b-42d3-a456-426614174000";
const RUNTIMES = ["pi", "agents-api"];
const HOST_FACTS = new Set(["permission.open", "permission.resolved", "repository.read", "repository.candidate.read", "repository.write.confirmed", "repository.write.failed", "repository.write.unknown", "check.started", "check.settled", "tool.result"]);
const VOLATILE = new Set(["id", "callId", "toolCallId", "effectId", "requestId", "questionId", "startedAt", "endedAt", "settledAt", "createdAt", "at", "durationMs", "stdout", "stderr", "seq", "runId", "sessionId", "inode", "device"]);

/** Identity that differs per Host by construction (uuids, temp paths, clocks,
 * process output) is removed; everything else is compared as it is. */
function normalize(value, ids) {
  if (Array.isArray(value)) return value.map(item => normalize(item, ids));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !VOLATILE.has(key)).map(([key, item]) => [key, normalize(item, ids)]));
  if (typeof value !== "string") return value;
  let text = value;
  for (const [needle, label] of ids) text = text.split(needle).join(label);
  return text;
}

/** One committed source repository, shared read-only by both Hosts so the base commit is the same fact. */
async function sharedSource() {
  const sourceDir = await mkdtemp(path.join(tmpdir(), "cw-p03e-source-"));
  cleanup.push(() => rm(sourceDir, { recursive: true, force: true }));
  return { sourceDir, ...(await createSyntheticRepository(sourceDir)) };
}

async function parityHost(kind, { sourceDir, head }) {
  const script = { calls: [] };
  const loopback = kind === "pi" ? null : await createAgentsLoopback({ plan: () => script.calls.map(call => ({ call })) });
  const h = await boot(loopback ? { runtimePort: agentsPort(loopback) } : {});
  cleanup.push(() => h.runtime.close(), () => loopback?.close());
  const session = await h.createSession({ permissionMode: "ask" });
  const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, { operation: "bind", requestId: "e-bind", expectedRevision: 0, rootPath: sourceDir });
  assert.equal(bound.status, 200, JSON.stringify(bound.json));
  const created = await h.api("PUT", `/sessions/${session.id}/repository-candidate`, { operation: "create", requestId: "e-candidate", expectedRevision: 0, expectedBindingRevision: 1, candidateId: CANDIDATE_ID, baseCommit: head });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  const ids = [[bound.json.binding.id, "<binding>"], [sourceDir, "<source>"], [h.dataDir, "<data>"]];
  const store = h.runtime.service.store;

  return {
    kind, h, loopback, session, sourceDir, store, ids,
    candidatePath: () => store.getSession(session.id).repositoryCandidate.candidatePath,
    async start(calls, commandId) {
      script.calls = calls;
      const run = await h.api("POST", `/sessions/${session.id}/runs`, { commandId, input: kind === "pi" ? h.scriptInput(calls) : `scenario ${commandId}` });
      assert.equal(run.status, 200, JSON.stringify(run.json));
      assert.equal(run.json.run.adapterId.startsWith(kind === "pi" ? "pi-coding-agent" : "agents-api"), true);
      return run.json.run.id;
    },
    question: (runId) => waitFor(() => store.snapshot().questions.find(question => question.runId === runId && question.status === "pending"), `${kind}: an approval`, 15000),
    answer: (runId, question, decision) => h.api("POST", `/runs/${runId}/questions/${question.id}`, { decision, expectedToolCallId: question.payload.toolCallId, expectedContentSha256: question.payload.contentSha256 }),
    /** Approve every question the Run opens, in order, until it ends. */
    async approveAll(runId, expected) {
      const asked = [];
      for (let index = 0; index < expected; index += 1) {
        const question = await this.question(runId);
        asked.push(question.payload);
        assert.equal((await this.answer(runId, question, "allow")).status, 200);
      }
      return { run: await h.pollRun(runId, { timeoutMs: 60000 }), asked };
    },
    /** What the Host recorded for one Run, in order, without per-Host identity. */
    facts(runId, from = store) {
      return normalize(from.listEvents({ sessionId: session.id, runId }).filter(event => HOST_FACTS.has(event.type)).map(event => {
        if (event.type !== "tool.result") return { type: event.type, data: event.data };
        // A tool's text is compared as the structure it carries when it carries one.
        let text = event.data.text; try { text = JSON.parse(text); } catch { /* prose */ }
        return { type: event.type, data: { name: event.data.name, isError: event.data.isError, text } };
      }), ids);
    },
    async surface(api = h.api) {
      const [candidate, diff, effects] = await Promise.all(["", "/diff", "/effects"].map(suffix => api("GET", `/sessions/${session.id}/repository-candidate${suffix}`)));
      return normalize({ candidate: candidate.json, diff: diff.json, effects: effects.json }, ids);
    },
  };
}

/** Run one scenario on both Hosts and hand back the pair. */
async function onBoth(scenario) {
  const out = {}, source = await sharedSource();
  for (const kind of RUNTIMES) out[kind] = await scenario(await parityHost(kind, source));
  return out;
}
const assertParity = (pair, label) => assert.deepEqual(pair["agents-api"], pair.pi, `${label}: the remote consumer differs from the Pi baseline`);

describe("P03-E · write → approval → fixed check parity", () => {
  test("check fails before the fix; an approved exact write then the fixed check pass; result, diff and a reopened Host match on both runtimes", async () => {
    const pair = await onBoth(async (t) => {
      const before = await t.approveAll(await t.start([{ name: "check_run", arguments: { recipeId: "node-test" } }], "e-before"), 1);
      assert.equal(before.run.status, "completed", JSON.stringify(before.run.error));

      const original = await readFile(path.join(t.sourceDir, KNOWN_BUG.path), "utf8");
      const fixed = original.replace(KNOWN_BUG.broken, KNOWN_BUG.fixed);
      const runId = await t.start([
        { name: "repo_write", arguments: { path: KNOWN_BUG.path, text: fixed, expectedSha256: sha256(Buffer.from(original)) } },
        { name: "check_run", arguments: { recipeId: "node-test" } },
      ], "e-fix-and-check");
      const fix = await t.approveAll(runId, 2);
      assert.equal(fix.run.status, "completed", JSON.stringify(fix.run.error));

      // Absolute facts first, so parity cannot be two equal mistakes.
      const [write, check] = fix.asked;
      assert.deepEqual([write.tool, write.path, write.contentSha256, write.candidateId, write.candidateWriteRevision, write.expectedSha256],
        ["repo_write", KNOWN_BUG.path, sha256(Buffer.from(fixed)), CANDIDATE_ID, 0, sha256(Buffer.from(original))]);
      assert.deepEqual([check.tool, check.recipeId, check.recipeVersion, check.candidateId, check.candidateWriteRevision, check.argv], ["check_run", "node-test", 1, CANDIDATE_ID, 1, ["--test"]],
        "the check approval names the candidate as the confirmed write left it");
      const settled = (runIdentity) => t.store.listEvents({ sessionId: t.session.id, runId: runIdentity }).filter(event => event.type === "check.settled").map(event => [event.data.status, event.data.exitCode]);
      assert.deepEqual([settled(before.run.id), settled(runId)], [[["completed", 1]], [["completed", 0]]]);
      assert.equal(await readFile(path.join(t.candidatePath(), KNOWN_BUG.path), "utf8"), fixed);
      assert.equal(await readFile(path.join(t.sourceDir, KNOWN_BUG.path), "utf8"), original, "the source checkout is never written");

      const surface = await t.surface();
      assert.match(JSON.stringify(surface.diff), /Math\.ceil/);
      // A reopened Host shows the same candidate, diff and receipts.
      const reopened = await reopen(await crashCopy(t.h), t.loopback ? { runtimePort: agentsPort(t.loopback) } : {});
      cleanup.push(() => reopened.runtime.close());
      const again = await t.surface(reopened.api);
      return { asked: normalize([before.asked, fix.asked], t.ids), facts: [t.facts(before.run.id), t.facts(runId)], surface, reopenedMatches: JSON.stringify(again) === JSON.stringify(surface) };
    });
    assert.equal(pair.pi.reopenedMatches, true); assert.equal(pair["agents-api"].reopenedMatches, true);
    assertParity(pair, "write → approval → check");
  });

  test("deny, a stale approval, a revoked candidate and a cancelled running check leave the same Host record on both runtimes", async () => {
    const pair = await onBoth(async (t) => {
      const out = {};
      // Deny: no effect is prepared, nothing is written.
      const denyRun = await t.start([{ name: "repo_write", arguments: { path: "new.txt", text: "must stay absent\n" } }], "e-deny");
      const denyQuestion = await t.question(denyRun);
      await t.answer(denyRun, denyQuestion, "deny");
      out.deny = { status: (await t.h.pollRun(denyRun)).status, facts: t.facts(denyRun), effects: t.store.getSession(t.session.id).repositoryWriteEffects.length };
      await assert.rejects(readFile(path.join(t.candidatePath(), "new.txt")), { code: "ENOENT" });

      // Stale: the file changes between the question and the allow.
      const original = await readFile(path.join(t.candidatePath(), "README.md"));
      const staleRun = await t.start([{ name: "repo_write", arguments: { path: "README.md", text: "approved against an older file\n", expectedSha256: sha256(original) } }], "e-stale");
      const staleQuestion = await t.question(staleRun);
      await writeFile(path.join(t.candidatePath(), "README.md"), "a concurrent edit\n");
      await t.answer(staleRun, staleQuestion, "allow");
      out.stale = { status: (await t.h.pollRun(staleRun)).status, facts: t.facts(staleRun), effects: t.store.getSession(t.session.id).repositoryWriteEffects.length };
      assert.equal(await readFile(path.join(t.candidatePath(), "README.md"), "utf8"), "a concurrent edit\n");

      // Cancel while the approved fixed check is running: it still settles, as cancelled.
      const slow = 'import { test } from "node:test";\ntest("slow", async () => { await new Promise(resolve => setTimeout(resolve, 20000)); });\n';
      assert.equal((await t.approveAll(await t.start([{ name: "repo_write", arguments: { path: "test/slow.test.mjs", text: slow } }], "e-slow"), 1)).run.status, "completed");
      const cancelRun = await t.start([{ name: "check_run", arguments: { recipeId: "node-test" } }], "e-cancel");
      await t.answer(cancelRun, await t.question(cancelRun), "allow");
      await waitFor(() => t.store.listEvents({ sessionId: t.session.id, runId: cancelRun }).some(event => event.type === "check.started"), `${t.kind}: the check process`, 15000);
      // Unknown: what a Host killed now would leave, judged by the next Host below.
      const crash = await crashCopy(t.h);
      assert.equal((await t.h.api("POST", `/runs/${cancelRun}/cancel`, {})).status, 200);
      out.cancel = { status: (await t.h.pollRun(cancelRun, { timeoutMs: 30000 })).status, facts: t.facts(cancelRun) };
      assert.deepEqual(out.cancel.facts.filter(fact => fact.type === "check.settled").map(fact => fact.data.status), ["cancelled"]);

      const restarted = await reopen(crash, t.loopback ? { runtimePort: agentsPort(t.loopback) } : {});
      cleanup.push(() => restarted.runtime.close());
      const fenced = restarted.runtime.service.store;
      out.unknown = { status: fenced.getRun(cancelRun).status, facts: t.facts(cancelRun, fenced) };
      assert.deepEqual(out.unknown.facts.filter(fact => fact.type === "check.settled").map(fact => [fact.data.status, fact.data.failure]), [["unknown", { code: "check_unknown_after_restart" }]]);
      assert.equal(out.unknown.status, "unknown");

      // Revoked: the candidate is revoked while a write waits for approval.
      const revokeRun = await t.start([{ name: "repo_write", arguments: { path: "late.txt", text: "revoked before write\n" } }], "e-revoked");
      await t.question(revokeRun);
      const revision = t.store.getSession(t.session.id).repositoryCandidateRevision;
      const revoke = await t.h.api("PUT", `/sessions/${t.session.id}/repository-candidate`, { operation: "revoke", requestId: "e-revoke", expectedRevision: revision, expectedBindingRevision: 1, candidateId: CANDIDATE_ID });
      assert.equal(revoke.status, 200, JSON.stringify(revoke.json));
      out.revoked = { status: (await t.h.pollRun(revokeRun)).status, facts: t.facts(revokeRun), candidate: t.store.getSession(t.session.id).repositoryCandidate.status };
      assert.deepEqual([out.deny.status, out.deny.effects, out.stale.status, out.stale.effects, out.cancel.status, out.revoked.status, out.revoked.candidate], ["completed", 0, "completed", 0, "cancelled", "cancelled", "revoked"]);
      return out;
    });
    assertParity(pair, "deny / stale / cancel / unknown / revoked");
  });

  test("the remote consumer adds its own receipts to the same effects, exposes nothing it was not admitted with, and keeps its argument ceiling", async () => {
    const t = await parityHost("agents-api", await sharedSource());
    const runId = await t.start([{ name: "repo_write", arguments: { path: "note.txt", text: "through the gateway\n" } }, { name: "repo_write", arguments: { path: "big.txt", text: "x".repeat(17 * 1024) } }], "e-remote");
    const { run } = await t.approveAll(runId, 1);
    assert.equal(run.status, "completed", JSON.stringify(run.error));
    const declared = t.loopback.posts("/v1/agents/sessions")[0].body.agent.tools.map(tool => tool.name);
    assert.deepEqual(declared, ["repo_read", "repo_write", "check_run"], "only the three governed functions, and only because this Run was admitted with a candidate");
    const [first, second] = t.store.listRemoteActions(t.session.id, runId).filter(action => action.kind === "call");
    assert.deepEqual([first.tool, first.execution, first.delivery.state, first.scope.repositoryCandidateId], ["repo_write", "succeeded", "accepted", CANDIDATE_ID]);
    // The Host's write receipt is keyed by the native call it answered.
    assert.equal(t.store.getSession(t.session.id).repositoryWriteEffects[0].requestId, first.native.callId);
    assert.equal(t.store.getSession(t.session.id).repositoryWriteEffects[0].status, "confirmed");
    // 16 KiB of arguments is this consumer's ceiling; Pi's repo_write accepts 4 MiB. Refused before any approval.
    assert.deepEqual([second.execution, second.argumentsJson], ["rejected", null]);
    assert.equal(t.store.getSession(t.session.id).repositoryWriteEffects.length, 1);
  });
});
