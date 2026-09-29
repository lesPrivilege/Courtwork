import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { boot } from "./helpers.mjs";

/* A revoke used to cancel the dependent Runs while holding the Host's
 * configuration gate. cancelRun waits for the Run to settle, and a write the
 * person has just approved queues on that same gate: neither could finish, the
 * Run stayed `stopping` and every later configuration change hung (2026-09-29
 * convergence loop, S7). Revocation is durable first, so cancelling after the
 * gate is released leaves no window for the revoked scope to be used. */

const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trimEnd();
const within = (promise, ms, label) => Promise.race([promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} did not settle within ${ms} ms`)), ms))]);

async function sourceRepository() {
  const root = await mkdtemp(path.join(tmpdir(), "cw-revoke-gate-"));
  await mkdir(root, { recursive: true });
  git(root, ["init", "--quiet", "--initial-branch=main"]);
  git(root, ["config", "user.name", "Fixture"]); git(root, ["config", "user.email", "fixture@example.invalid"]);
  await writeFile(path.join(root, "a.txt"), "a\n"); git(root, ["add", "a.txt"]); git(root, ["commit", "--quiet", "-m", "base"]);
  return { root, baseCommit: git(root, ["rev-parse", "HEAD"]) };
}

async function writeAwaitingApproval(h, source) {
  const session = await h.createSession({ permissionMode: "ask" });
  const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, { operation: "bind", requestId: "bind", expectedRevision: 0, rootPath: source.root });
  assert.equal(bound.status, 200, JSON.stringify(bound.json));
  const candidateId = "223e4567-e89b-42d3-a456-426614174000";
  const created = await h.api("PUT", `/sessions/${session.id}/repository-candidate`, { operation: "create", requestId: "create", expectedRevision: 0, expectedBindingRevision: 1, candidateId, baseCommit: source.baseCommit });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  const run = (await h.api("POST", `/sessions/${session.id}/runs`, { commandId: "write", input: h.scriptInput([{ name: "repo_write", arguments: { path: "new.txt", text: "x\n" } }]) })).json.run;
  await h.pollRun(run.id, { until: (status) => status === "waiting_user" });
  const question = h.runtime.store.snapshot().questions.find((q) => q.runId === run.id && q.status === "pending");
  const approve = () => h.api("POST", `/runs/${run.id}/questions/${question.id}`, { decision: "allow", expectedToolCallId: question.payload.toolCallId, expectedContentSha256: question.payload.contentSha256 });
  return { session, candidateId, run, approve };
}

for (const scope of ["candidate", "binding"]) {
  test(`revoking the repository ${scope} while an approved write queues settles both, and the gate stays free`, async () => {
    const h = await boot();
    const source = await sourceRepository();
    try {
      const { session, candidateId, run, approve } = await writeAwaitingApproval(h, source);
      const revoke = scope === "candidate"
        ? h.api("PUT", `/sessions/${session.id}/repository-candidate`, { operation: "revoke", requestId: "revoke", expectedRevision: 1, expectedBindingRevision: 1, candidateId })
        : h.api("PUT", `/sessions/${session.id}/repository-binding`, { operation: "revoke", requestId: "revoke", expectedRevision: 1 });
      const [revoked] = await within(Promise.all([revoke, approve()]), 8000, "revoke and approval");
      assert.equal(revoked.status, 200, JSON.stringify(revoked.json));
      const settled = await h.pollRun(run.id);
      assert.equal(settled.status, "cancelled");
      assert.equal(git(source.root, ["status", "--porcelain"]), "", "the source repository is untouched");
      const events = h.runtime.store.listEvents({ sessionId: session.id, runId: run.id });
      assert.equal(events.some((e) => e.type === "repository.write.confirmed"), false, "the approved write never landed in the revoked candidate");
      const other = await h.createSession();
      const changed = await within(h.api("PUT", `/sessions/${other.id}/permission-mode`, { permissionMode: "draft" }), 3000, "a later configuration change");
      assert.equal(changed.status, 200);
    } finally {
      // A deadlocked Host cannot close either; report it rather than hang.
      await within(h.runtime.close(), 8000, "Host close");
      await rm(source.root, { recursive: true, force: true });
    }
  });
}
