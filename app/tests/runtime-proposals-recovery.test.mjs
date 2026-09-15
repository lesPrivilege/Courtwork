import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { boot, reopen, TERMINAL } from "./helpers.mjs";

/* BE-7 · recovery tests for the runtime-proposals ledger.
 *
 * These tests do not touch app/runtime, app/server or app/web -- they only
 * drive the existing HTTP surface (see app/tests/runtime-proposals.test.mjs
 * for the same helper idioms) and, for the crash tests, edit the two JSON
 * files the Host itself writes (`runtime-proposals.json`, `runtime-control.json`)
 * while the Host is closed, then reopen it so `RuntimeProposalLedger.recover`
 * runs at startup (see `app/server/service.mjs` `initialize()`). */

const sha256 = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");

const SKILL = (name, body = "Use `count` and `perPage` as integers.\n") =>
  `---\nname: ${name}\ndescription: Paging conventions for the parcel helper.\nallowed-tools: [ws_read]\n---\n# ${name}\n\n${body}`;
const propose = (name, extra = {}) => ({ name: "runtime_propose", arguments: { title: `Paging · ${name}`, content: SKILL(name), ...extra } });

/** A pollRun bound to a plain `api` function, for use against a reopened
 * server (`reopen()` in helpers.mjs returns `{ runtime, api, logs }` only --
 * no `pollRun` of its own). Mirrors `boot()`'s pollRun exactly. */
function makePollRun(api) {
  return async function pollRun(runId, { timeoutMs = 5000, until = (status) => TERMINAL.has(status) } = {}) {
    const start = Date.now();
    let run = (await api("GET", `/runs/${runId}`)).json.run;
    while (!until(run.status)) {
      if (Date.now() - start > timeoutMs) throw new Error(`pollRun timed out waiting past status ${run.status}`);
      await new Promise((resolve) => setTimeout(resolve, 25));
      run = (await api("GET", `/runs/${runId}`)).json.run;
    }
    return run;
  };
}

async function runScript(apiFn, pollRunFn, sessionId, calls, commandId) {
  const made = await apiFn("POST", `/sessions/${sessionId}/runs`, { commandId, input: `/fixture script ${JSON.stringify(calls)}` });
  assert.equal(made.status, 200, JSON.stringify(made.json));
  return pollRunFn(made.json.run.id);
}

test("06 · apply is refused with active_run while a Run is in flight, and the ledger stays proposed", async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const proposed = await runScript(h.api, h.pollRun, session.id, [propose("hold")], "propose-hold");
    assert.equal(proposed.status, "completed", JSON.stringify(proposed.error ?? null));
    const [p] = (await h.api("GET", `/runtime-proposals?sessionId=${session.id}`)).json.proposals;
    assert.equal(p.status, "proposed");

    const beforeControl = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;

    // Hold a second Run active deterministically -- the T-PERM-1 /
    // model-effort-binding.test.mjs test 3 pattern: "ask" mode + a ws_write
    // fixture call reaches `waiting_user` on a real, deterministic permission
    // wait rather than a timing-based sleep. `hasActiveRun()` (server/store.mjs)
    // is checked with no sessionId, so a hold in a different session still
    // freezes Apply.
    const holdSession = await h.createSession({ permissionMode: "ask" });
    const holdCalls = [{ name: "ws_write", arguments: { path: "out/hold.md", text: "hold" } }];
    const started = await h.api("POST", `/sessions/${holdSession.id}/runs`, { input: h.scriptInput(holdCalls), commandId: "hold-1" });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    const waiting = await h.pollRun(started.json.run.id, { until: (status) => status === "waiting_user" });
    assert.equal(waiting.status, "waiting_user");

    const reviewDuring = (await h.api("GET", `/runtime-proposals/${p.id}`)).json;
    assert.equal(reviewDuring.activeRun, true, "a Run active in another session still freezes Apply");
    const refused = await h.api("POST", `/runtime-proposals/${p.id}/apply`, {
      revision: reviewDuring.proposal.revision, approvalSha256: reviewDuring.approvalSha256, requestId: "apply-during-run",
    });
    assert.equal(refused.status, 409, JSON.stringify(refused.json));
    assert.equal(refused.json.error.code, "active_run");

    const afterAttempt = (await h.api("GET", `/runtime-proposals/${p.id}`)).json;
    assert.equal(afterAttempt.proposal.status, "proposed", "the ledger stays proposed");
    assert.equal(afterAttempt.proposal.pending, null);
    const controlDuring = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
    assert.equal(controlDuring.revision, beforeControl.revision, "the refused apply left the configuration revision unchanged");

    // Answer the permission question (deny is fine) so the Run settles.
    const events = (await h.api("GET", `/sessions/${holdSession.id}/events`)).json.events;
    const openEvent = events.find((e) => e.type === "permission.open");
    assert.ok(openEvent, "the held run opened a permission question");
    const answered = await h.api("POST", `/runs/${started.json.run.id}/questions/${openEvent.data.id}`, { decision: "deny" });
    assert.equal(answered.status, 200, JSON.stringify(answered.json));
    await h.pollRun(started.json.run.id);

    // Apply now succeeds.
    const review = (await h.api("GET", `/runtime-proposals/${p.id}`)).json;
    assert.equal(review.activeRun, false);
    const applied = await h.api("POST", `/runtime-proposals/${p.id}/apply`, {
      revision: review.proposal.revision, approvalSha256: review.approvalSha256, requestId: "apply-after-run",
    });
    assert.equal(applied.status, 200, JSON.stringify(applied.json));
    assert.equal(applied.json.proposal.status, "applied");
    assert.equal(applied.json.receipt.recovered, false);
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("06 · crash after the pending marker but before the put: startup returns the proposal to proposed and the configuration is untouched", async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const proposed = await runScript(h.api, h.pollRun, session.id, [propose("crash-pending")], "propose-crash-pending");
    assert.equal(proposed.status, "completed", JSON.stringify(proposed.error ?? null));
    const [p] = (await h.api("GET", `/runtime-proposals?sessionId=${session.id}`)).json.proposals;
    const review = (await h.api("GET", `/runtime-proposals/${p.id}`)).json;
    const beforeRevision = review.target.expectedConfigRevision;

    const dataDir = h.dataDir;
    await h.runtime.close();

    // Simulate the crash: the pending marker was persisted, but the
    // configuration `put` never landed.
    const ledgerPath = path.join(dataDir, "runtime-proposals.json");
    const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
    const item = ledger.proposals.find((x) => x.id === p.id);
    assert.ok(item, "the proposed skill is in the ledger on disk");
    item.status = "applying";
    item.pending = {
      requestId: "crash-1", requestHash: "0".repeat(64),
      approvalSha256: review.approvalSha256, expectedConfigRevision: review.target.expectedConfigRevision,
      at: new Date().toISOString(),
    };
    await writeFile(ledgerPath, JSON.stringify(ledger));

    const reopened = await reopen(dataDir);
    try {
      const afterCrash = (await reopened.api("GET", `/runtime-proposals/${p.id}`)).json;
      assert.equal(afterCrash.proposal.status, "proposed");
      assert.equal(afterCrash.proposal.pending, null);
      const control = (await reopened.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
      assert.equal(control.revision, beforeRevision, "the configuration was never touched");

      const applied = await reopened.api("POST", `/runtime-proposals/${p.id}/apply`, {
        revision: afterCrash.proposal.revision, approvalSha256: afterCrash.approvalSha256, requestId: "apply-after-crash",
      });
      assert.equal(applied.status, 200, JSON.stringify(applied.json));
      assert.equal(applied.json.proposal.status, "applied");
      assert.equal(applied.json.receipt.recovered, false, "a normal apply afterwards is not a recovery");
    } finally {
      await reopened.runtime.close();
    }
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("06 · crash after the put but before the receipt: startup settles the proposal as applied with a recovered receipt and does not put again", async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const proposed = await runScript(h.api, h.pollRun, session.id, [propose("crash-put")], "propose-crash-put");
    assert.equal(proposed.status, "completed", JSON.stringify(proposed.error ?? null));
    const [p] = (await h.api("GET", `/runtime-proposals?sessionId=${session.id}`)).json.proposals;
    const review = (await h.api("GET", `/runtime-proposals/${p.id}`)).json;
    const expectedConfigRevision = review.target.expectedConfigRevision;
    const proposalRevision = review.proposal.revision;
    const resourceId = review.target.resourceId;

    const dataDir = h.dataDir;
    await h.runtime.close();

    // The requestHash must equal what `apply()`'s replay check computes from
    // the revision/approvalSha256 the test will later replay with (see
    // `RuntimeProposalLedger#apply` in runtime/runtime-proposals.mjs: `sha256({
    // revision, approvalSha256 })`), not an arbitrary value, so that the
    // post-recovery idempotent replay in this test actually matches the
    // receipt `recover()` persists.
    const requestId = "crash-1";
    const requestHash = sha256({ revision: proposalRevision, approvalSha256: review.approvalSha256 });

    const ledgerPath = path.join(dataDir, "runtime-proposals.json");
    const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
    const item = ledger.proposals.find((x) => x.id === p.id);
    assert.ok(item, "the proposed skill is in the ledger on disk");
    item.status = "applying";
    item.pending = { requestId, requestHash, approvalSha256: review.approvalSha256, expectedConfigRevision, at: new Date().toISOString() };
    await writeFile(ledgerPath, JSON.stringify(ledger));

    // Make runtime-control.json look exactly like the put landed: the
    // resource, the advanced revision and the matching audit entry (the same
    // shape `RuntimeControlPlane.change()` writes for a `put`).
    const controlPath = path.join(dataDir, "runtime-control.json");
    // No configuration change has happened yet in this test, so the file may
    // not exist on disk (RuntimeControlPlane starts from an in-memory default
    // -- see `initialize()` in runtime/control-plane.mjs -- and only writes it
    // on the first `change()`).
    const control = await readFile(controlPath, "utf8").then(JSON.parse).catch((error) => {
      if (error.code !== "ENOENT") throw error;
      return { version: 1, revision: 0, resources: [], overrides: [], policies: [], audit: [], profileSelections: [] };
    });
    control.resources.push({
      id: resourceId, kind: "skill", title: review.proposal.title,
      scope: review.proposal.target.scope, content: review.proposal.content,
    });
    control.revision = expectedConfigRevision + 1;
    control.audit.push({
      revision: expectedConfigRevision + 1, at: new Date().toISOString(),
      actor: "local-user", operation: "put", id: resourceId, scope: review.proposal.target.scope,
    });
    await writeFile(controlPath, JSON.stringify(control));

    const reopened = await reopen(dataDir);
    const reopenedPollRun = makePollRun(reopened.api);
    try {
      const afterCrash = (await reopened.api("GET", `/runtime-proposals/${p.id}`)).json;
      assert.equal(afterCrash.proposal.status, "applied");
      assert.equal(afterCrash.proposal.decision.action, "apply");
      assert.equal(afterCrash.proposal.decision.configRevisionAfter, expectedConfigRevision + 1);

      const controlAfter = (await reopened.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
      assert.equal(controlAfter.revision, expectedConfigRevision + 1, "no second put happened");

      const replay = await reopened.api("POST", `/runtime-proposals/${p.id}/apply`, {
        revision: proposalRevision, approvalSha256: review.approvalSha256, requestId,
      });
      assert.equal(replay.status, 200, JSON.stringify(replay.json));
      assert.equal(replay.json.idempotent, true);
      assert.equal(replay.json.receipt.recovered, true);

      const loaded = await runScript(reopened.api, reopenedPollRun, session.id, [{ name: "runtime_load", arguments: { id: resourceId } }], "load-after-crash");
      assert.equal(loaded.status, "completed", JSON.stringify(loaded.error ?? null));
      const context = (await reopened.api("GET", `/runtime-context?sessionId=${session.id}&runId=${loaded.id}`)).json;
      assert.equal(context.loaded.length, 1);
      assert.equal(context.loaded[0].id, resourceId);
    } finally {
      await reopened.runtime.close();
    }
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});
