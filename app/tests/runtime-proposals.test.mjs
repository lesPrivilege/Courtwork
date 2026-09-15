import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { test } from "node:test";
import { boot, reopen } from "./helpers.mjs";

const SKILL = (name, body = "Use `count` and `perPage` as integers.\n") => `---\nname: ${name}\ndescription: Paging conventions for the parcel helper.\nallowed-tools: [ws_read]\n---\n# ${name}\n\n${body}`;
const propose = (name, extra = {}) => ({ name: "runtime_propose", arguments: { title: `Paging · ${name}`, content: SKILL(name), ...extra } });
const script = calls => `/fixture script ${JSON.stringify(calls)}`;

async function runScript(h, sessionId, calls, commandId) {
  const made = await h.api("POST", `/sessions/${sessionId}/runs`, { commandId, input: script(calls) });
  assert.equal(made.status, 200, JSON.stringify(made.json));
  return h.pollRun(made.json.run.id);
}

test("06 · propose → review → apply: the ledger is not a registry, Apply is one CAS put, the next Run binds and loads the skill, the earlier Run's binding is unchanged", async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const proposed = await runScript(h, session.id, [propose("paging")], "propose-1");
    assert.equal(proposed.status, "completed", JSON.stringify(proposed.error ?? null));
    const list = (await h.api("GET", `/runtime-proposals?sessionId=${session.id}`)).json;
    assert.equal(list.proposals.length, 1);
    const [p] = list.proposals;
    assert.equal(p.status, "proposed");
    assert.equal(p.revision, 1);
    assert.deepEqual(p.author, { ...p.author, origin: "agent", sessionId: session.id, runId: proposed.id }, "the author is the real Run, not a parameter");
    assert.equal(p.target.resourceId, "local:paging");
    assert.deepEqual(p.target.scope, { type: "session", id: session.id });
    assert.equal(p.declared.name, "paging");
    assert.deepEqual(p.declared.requestedTools, ["ws_read"]);

    // A draft is not a resource: not in the snapshot, not compiled, not loadable.
    const before = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
    assert.equal(before.resources.some(r => r.id === "local:paging"), false, "a proposal is not a resource");
    const context = (await h.api("GET", `/runtime-context?sessionId=${session.id}`)).json;
    assert.equal(JSON.stringify(context.context).includes("paging"), false, "a proposal enters no next-run context");
    const denied = await runScript(h, session.id, [{ name: "runtime_load", arguments: { id: "local:paging" } }], "load-draft");
    const loadedEvents = (await h.api("GET", `/runtime-context?sessionId=${session.id}&runId=${denied.id}`)).json.loaded;
    assert.equal(loadedEvents.length, 0, "a draft cannot be loaded");
    const earlierBinding = (await h.api("GET", `/runtime-context?sessionId=${session.id}&runId=${proposed.id}`)).json.binding;

    // Review computes the BE-6 fields against the configuration as it stands.
    const review = (await h.api("GET", `/runtime-proposals/${p.id}`)).json;
    assert.equal(review.proposal.id, p.id);
    assert.equal(review.source.contentSha256, p.identity.contentSha256);
    assert.equal(review.source.trust, "unverified");
    assert.equal(review.target.expectedConfigRevision, before.revision);
    assert.equal(review.target.exists, false);
    assert.deepEqual(review.operations.map(o => o.operation), ["put"]);
    assert.match(review.effectiveDiff.patch, /^---.*\n\+\+\+ local:paging \(proposed\)/m);
    assert.equal(review.effectiveDiff.before, null);
    assert.deepEqual(review.permissionsDelta.policyChanges, []);
    assert.deepEqual(review.permissionsDelta.requestedTools, ["ws_read"]);
    assert.equal(review.contextImpact.tokens, null);
    assert.equal(review.contextImpact.deferredBodyCharacters, SKILL("paging").length);
    assert.equal(review.trustImpact.origin, "agent-created");
    assert.equal(review.persistence.scope, "session");
    assert.equal(review.rollback.action, "remove");
    assert.match(review.approvalSha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(review.blockers, []);
    assert.equal(review.activeRun, false);

    // Apply: stale approval refused, wrong revision refused, then one CAS put.
    const stale = await h.api("POST", `/runtime-proposals/${p.id}/apply`, { revision: 1, approvalSha256: "0".repeat(64), requestId: "apply-stale" });
    assert.equal(stale.status, 409); assert.equal(stale.json.error.code, "approval_stale");
    const wrongRevision = await h.api("POST", `/runtime-proposals/${p.id}/apply`, { revision: 2, approvalSha256: review.approvalSha256, requestId: "apply-rev" });
    assert.equal(wrongRevision.status, 409); assert.equal(wrongRevision.json.error.code, "proposal_conflict");
    const applied = await h.api("POST", `/runtime-proposals/${p.id}/apply`, { revision: 1, approvalSha256: review.approvalSha256, requestId: "apply-1" });
    assert.equal(applied.status, 200, JSON.stringify(applied.json));
    assert.equal(applied.json.idempotent, false);
    assert.equal(applied.json.proposal.status, "applied");
    assert.equal(applied.json.receipt.configRevisionBefore, before.revision);
    assert.equal(applied.json.receipt.configRevisionAfter, before.revision + 1);
    assert.equal(applied.json.receipt.decidedBy, "local-user");
    assert.equal(applied.json.receipt.recovered, false);
    const after = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
    assert.equal(after.revision, before.revision + 1, "Apply is exactly one configuration revision");
    const resource = after.resources.find(r => r.id === "local:paging");
    assert.ok(resource, "the skill is now a resource");
    assert.equal(resource.exposed, true, "exposure follows the default rule of the scope; Apply set no override");
    assert.equal(after.audit.at(-1).operation, "put");

    // Replay with the same requestId is the same receipt; a second apply is refused.
    const replay = await h.api("POST", `/runtime-proposals/${p.id}/apply`, { revision: 1, approvalSha256: review.approvalSha256, requestId: "apply-1" });
    assert.equal(replay.status, 200); assert.equal(replay.json.idempotent, true);
    assert.deepEqual(replay.json.receipt, applied.json.receipt);
    const again = await h.api("POST", `/runtime-proposals/${p.id}/apply`, { revision: 1, approvalSha256: review.approvalSha256, requestId: "apply-2" });
    assert.equal(again.status, 409); assert.equal(again.json.error.code, "proposal_state");
    assert.equal((await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json.revision, before.revision + 1);

    // The next Run binds it and can load the exact bytes; the earlier Run keeps its binding.
    const loaded = await runScript(h, session.id, [{ name: "runtime_load", arguments: { id: "local:paging" } }], "load-applied");
    assert.equal(loaded.status, "completed", JSON.stringify(loaded.error ?? null));
    const bound = (await h.api("GET", `/runtime-context?sessionId=${session.id}&runId=${loaded.id}`)).json;
    assert.equal(bound.binding.revision, before.revision + 1);
    assert.ok(bound.binding.resources.some(r => r.id === "local:paging" && r.exposed));
    assert.equal(bound.loaded.length, 1);
    assert.equal(bound.loaded[0].id, "local:paging");
    assert.equal(bound.loaded[0].characters, SKILL("paging").length);
    const stillEarlier = (await h.api("GET", `/runtime-context?sessionId=${session.id}&runId=${proposed.id}`)).json.binding;
    assert.deepEqual(stillEarlier, earlierBinding, "history is not rewritten by Apply");

    // Cross-session: another session sees no proposal and cannot list by a foreign id in its scope.
    const other = await h.createSession();
    assert.equal((await h.api("GET", `/runtime-proposals?sessionId=${other.id}`)).json.proposals.length, 0);
    assert.equal((await h.api("GET", `/runtime-control?sessionId=${other.id}`)).json.resources.some(r => r.id === "local:paging"), false, "a session-scoped skill is not visible in another session");

    // Ledger survives reopen with its receipts.
    const dataDir = h.dataDir;
    await h.runtime.close();
    const again2 = await reopen(dataDir);
    try {
      const persisted = (await again2.api("GET", `/runtime-proposals/${p.id}`)).json;
      assert.equal(persisted.proposal.status, "applied");
      assert.equal(persisted.proposal.decision.configRevisionAfter, before.revision + 1);
    } finally { await again2.runtime.close(); }
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("06 · invalid or oversized text is refused at propose time; edit makes a new revision and voids the old review; reject leaves the configuration untouched", async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const bad = await runScript(h, session.id, [
      { name: "runtime_propose", arguments: { title: "No frontmatter", content: "# just markdown\n" } },
      { name: "runtime_propose", arguments: { title: "Too big", content: SKILL("big", "x".repeat(70 * 1024)) } },
      propose("editable"),
    ], "propose-mixed");
    assert.equal(bad.status, "completed", JSON.stringify(bad.error ?? null));
    const list = (await h.api("GET", `/runtime-proposals?sessionId=${session.id}`)).json.proposals;
    assert.deepEqual(list.map(p => p.target.resourceId), ["local:editable"], "only the valid, bounded proposal was recorded");
    const [p] = list;
    const first = (await h.api("GET", `/runtime-proposals/${p.id}`)).json;
    const edited = await h.api("PUT", `/runtime-proposals/${p.id}`, { revision: 1, content: SKILL("editable", "Edited by a person.\n") });
    assert.equal(edited.status, 200, JSON.stringify(edited.json));
    assert.equal(edited.json.revision, 2);
    assert.equal(edited.json.history.at(-1).by, "local-user");
    const renamed = await h.api("PUT", `/runtime-proposals/${p.id}`, { revision: 2, content: SKILL("renamed") });
    assert.equal(renamed.status, 400, "an edit cannot change the resource id");
    const oldApproval = await h.api("POST", `/runtime-proposals/${p.id}/apply`, { revision: 1, approvalSha256: first.approvalSha256, requestId: "old" });
    assert.equal(oldApproval.status, 409); assert.equal(oldApproval.json.error.code, "proposal_conflict");
    const second = (await h.api("GET", `/runtime-proposals/${p.id}`)).json;
    assert.notEqual(second.approvalSha256, first.approvalSha256, "the summary binds the revision");
    const oldHash = await h.api("POST", `/runtime-proposals/${p.id}/apply`, { revision: 2, approvalSha256: first.approvalSha256, requestId: "old-hash" });
    assert.equal(oldHash.status, 409); assert.equal(oldHash.json.error.code, "approval_stale");

    const revisionBefore = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json.revision;
    const rejected = await h.api("POST", `/runtime-proposals/${p.id}/reject`, { revision: 2, requestId: "reject-1", reason: "Not this week." });
    assert.equal(rejected.status, 200, JSON.stringify(rejected.json));
    assert.equal(rejected.json.proposal.status, "rejected");
    assert.equal(rejected.json.proposal.decision.reason, "Not this week.");
    const replay = await h.api("POST", `/runtime-proposals/${p.id}/reject`, { revision: 2, requestId: "reject-1" });
    assert.equal(replay.status, 200); assert.equal(replay.json.idempotent, true);
    assert.equal((await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json.revision, revisionBefore, "reject changes no configuration");
    const afterReject = await h.api("POST", `/runtime-proposals/${p.id}/apply`, { revision: 2, approvalSha256: second.approvalSha256, requestId: "after-reject" });
    assert.equal(afterReject.status, 409); assert.equal(afterReject.json.error.code, "proposal_state");
    const editRejected = await h.api("PUT", `/runtime-proposals/${p.id}`, { revision: 2, title: "x" });
    assert.equal(editRejected.status, 409);
    const unknown = await h.api("POST", `/runtime-proposals/${p.id}/apply`, { revision: 2, approvalSha256: second.approvalSha256, requestId: "k", extra: 1 });
    assert.equal(unknown.status, 400, "unknown keys are rejected");
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("06 · CAS conflict: a configuration change after review makes the approval stale; the same requestId with a different body is an idempotency conflict", async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    await runScript(h, session.id, [propose("cas")], "propose-cas");
    const [p] = (await h.api("GET", `/runtime-proposals?sessionId=${session.id}`)).json.proposals;
    const review = (await h.api("GET", `/runtime-proposals/${p.id}`)).json;
    const control = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
    const changed = await h.api("PUT", `/runtime-control?sessionId=${session.id}`, { revision: control.revision, operation: "put", resource: { id: "local:other", kind: "instruction", title: "Other", scope: { type: "session", id: session.id }, content: "Something else." } });
    assert.equal(changed.status, 200, JSON.stringify(changed.json));
    const stale = await h.api("POST", `/runtime-proposals/${p.id}/apply`, { revision: 1, approvalSha256: review.approvalSha256, requestId: "cas-1" });
    assert.equal(stale.status, 409); assert.equal(stale.json.error.code, "approval_stale");
    const fresh = (await h.api("GET", `/runtime-proposals/${p.id}`)).json;
    assert.equal(fresh.target.expectedConfigRevision, control.revision + 1);
    const applied = await h.api("POST", `/runtime-proposals/${p.id}/apply`, { revision: 1, approvalSha256: fresh.approvalSha256, requestId: "cas-2" });
    assert.equal(applied.status, 200, JSON.stringify(applied.json));
    const conflict = await h.api("POST", `/runtime-proposals/${p.id}/apply`, { revision: 1, approvalSha256: review.approvalSha256, requestId: "cas-2" });
    assert.equal(conflict.status, 409); assert.equal(conflict.json.error.code, "idempotency_conflict");
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});
