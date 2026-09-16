// Entry audit §6.1 — directory identity: after a chat connects folder A, the
// next Run's real repository tools must read A's own content, never folder
// B's same-named file, never an uploaded same-named material, never the
// managed workspace — and a later change to A must be read fresh while an
// earlier receipt keeps its own (now-historical) version. The binding must
// also survive a Host restart.
//
// Evidence used throughout: the `tool.result` events for repo_list/repo_read/
// ws_read (event.data.{name,text,isError}, from GET /sessions/:id/events)
// and the durable `repository.read` events recorded by the Host itself
// (event.data.{bindingId,revision,operation,path,sources[].sha256}; see
// server/store.mjs `recordRepositoryRead`). The binding's own state is read
// from the dedicated `GET /sessions/:id/repository-binding` endpoint (the
// same contract exercised by repository-binding.test.mjs), which is a more
// precise source of truth for "is the session still bound to A" than the
// general session view.
//
// Binding contract fact established against `repository-binding.test.mjs`:
// binding does NOT require the root to be a Git repository — that file binds
// a plain `mkdtemp` directory with no `git init` and it succeeds. This test
// therefore uses plain directories for A and B as well; a later on-disk edit
// to A is a plain `writeFile`, not a commit, which the binding contract
// accepts (repository reads go straight to the filesystem via a fresh
// process per call — see runtime/repository-fs.mjs — so there is no
// in-process cache to invalidate).
import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { boot, reopen, TERMINAL } from "./helpers.mjs";

const sha256 = (value) => createHash("sha256").update(value, "utf8").digest("hex");

async function pollRun(api, runId, { timeoutMs = 5000 } = {}) {
  const start = Date.now();
  let run = (await api("GET", `/runs/${runId}`)).json.run;
  while (!TERMINAL.has(run.status)) {
    if (Date.now() - start > timeoutMs) throw new Error(`pollRun timed out at status ${run.status}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
    run = (await api("GET", `/runs/${runId}`)).json.run;
  }
  return run;
}

test("01 · the connected folder is the one the tools read: A, not B, not the uploaded copy, not the managed workspace", async () => {
  const h = await boot();
  const dirA = await mkdtemp(path.join(tmpdir(), "cw-directory-identity-a-"));
  const dirB = await mkdtemp(path.join(tmpdir(), "cw-directory-identity-b-"));
  try {
    const A_TARGET = "A-TARGET\n";
    const B_TARGET = "B-TARGET\n";
    const ONLY_A = "ONLY-A\n";
    const ONLY_A_V2 = "ONLY-A-REVISED\n";
    const UPLOAD_TARGET = "UPLOAD-TARGET\n";
    const MANAGED_TARGET = "MANAGED-WORKSPACE-TARGET\n";

    await writeFile(path.join(dirA, "target.txt"), A_TARGET);
    await writeFile(path.join(dirA, "only-a.txt"), ONLY_A);
    await writeFile(path.join(dirB, "target.txt"), B_TARGET);

    const shaA = sha256(A_TARGET);
    const shaB = sha256(B_TARGET);
    const shaOnlyA = sha256(ONLY_A);
    const shaOnlyAV2 = sha256(ONLY_A_V2);
    const shaUpload = sha256(UPLOAD_TARGET);
    const shaManaged = sha256(MANAGED_TARGET);

    const session = await h.createSession();

    // A same-named MATERIAL (goes to workspaceDir/materials/target.txt).
    const material = await h.api("POST", `/sessions/${session.id}/materials`, {
      name: "target.txt", text: UPLOAD_TARGET, commandId: "upload-target", expectedRevision: 0,
    });
    assert.equal(material.status, 200, JSON.stringify(material.json));
    assert.equal(material.json.workspaceState, "written");

    // A same-named file placed directly in the MANAGED workspace root (not
    // through the materials route) — e.g. what an out/ or root artifact
    // would look like to ws_read.
    const workspaceDir = h.runtime.store.getSession(session.id).workspaceDir;
    await mkdir(workspaceDir, { recursive: true });
    await writeFile(path.join(workspaceDir, "target.txt"), MANAGED_TARGET);

    // Bind A.
    const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, {
      operation: "bind", requestId: "identity-bind-a", expectedRevision: 0, rootPath: dirA,
    });
    assert.equal(bound.status, 200, JSON.stringify(bound.json));
    assert.equal(bound.json.binding.status, "active");
    const realA = await realpath(dirA);
    assert.equal(bound.json.binding.rootPath, realA, "the resolved binding root is A, not a lookalike path");

    const firstRun = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "identity-run-1",
      input: h.scriptInput([
        { name: "repo_list", arguments: { path: "." } },
        { name: "repo_read", arguments: { path: "target.txt" } },
        { name: "repo_read", arguments: { path: "only-a.txt" } },
        { name: "ws_read", arguments: { path: "target.txt" } },
        { name: "ws_read", arguments: { path: "materials/target.txt" } },
      ]),
    });
    assert.equal(firstRun.status, 200, JSON.stringify(firstRun.json));
    const firstCompleted = await pollRun(h.api, firstRun.json.run.id);
    assert.equal(firstCompleted.status, "completed", JSON.stringify(firstCompleted.error));
    assert.equal(firstCompleted.repositoryBindingSnapshot.id, bound.json.binding.id);

    const allEvents = (await h.api("GET", `/sessions/${session.id}/events`)).json.events;
    const firstRunEvents = allEvents.filter((event) => event.runId === firstRun.json.run.id);
    const toolResults = firstRunEvents.filter((event) => event.type === "tool.result");
    assert.equal(toolResults.length, 5, "one tool.result per scripted call, in call order");
    const [listResult, readTargetResult, readOnlyAResult, wsReadRootResult, wsReadMaterialResult] = toolResults;

    // repo_list sees A's own files.
    assert.equal(listResult.data.name, "repo_list");
    assert.equal(listResult.data.isError, false, JSON.stringify(listResult));
    const listing = JSON.parse(listResult.data.text);
    assert.deepEqual(listing.entries.map((entry) => entry.name).sort(), ["only-a.txt", "target.txt"]);

    // repo_read target.txt is A's content, not B's, not the upload, not the
    // managed workspace's same-named file.
    assert.equal(readTargetResult.data.name, "repo_read");
    assert.equal(readTargetResult.data.isError, false, JSON.stringify(readTargetResult));
    assert.equal(readTargetResult.data.text, A_TARGET);
    assert.notEqual(readTargetResult.data.text, B_TARGET);
    assert.notEqual(readTargetResult.data.text, UPLOAD_TARGET);
    assert.notEqual(readTargetResult.data.text, MANAGED_TARGET);

    // only-a.txt (which only exists in A) is readable through the binding.
    assert.equal(readOnlyAResult.data.name, "repo_read");
    assert.equal(readOnlyAResult.data.isError, false, JSON.stringify(readOnlyAResult));
    assert.equal(readOnlyAResult.data.text, ONLY_A);

    // The repo_* tool results, as a whole, never leak B's, the upload's, or
    // the managed workspace's content.
    const repoResultsText = JSON.stringify([listResult, readTargetResult, readOnlyAResult]);
    assert.ok(!repoResultsText.includes(B_TARGET.trim()), "B's content must never appear in repo_* results");
    assert.ok(!repoResultsText.includes(UPLOAD_TARGET.trim()), "the uploaded material's content must never appear in repo_* results");
    assert.ok(!repoResultsText.includes(MANAGED_TARGET.trim()), "the managed workspace's content must never appear in repo_* results");

    // ws_read stays on the OTHER root: the managed workspace, not A. Its own
    // root-level target.txt is the managed content; materials/target.txt is
    // the uploaded copy. Neither is A's.
    assert.equal(wsReadRootResult.data.name, "ws_read");
    assert.equal(wsReadRootResult.data.isError, false, JSON.stringify(wsReadRootResult));
    assert.equal(wsReadRootResult.data.text, MANAGED_TARGET);
    assert.notEqual(wsReadRootResult.data.text, A_TARGET);

    assert.equal(wsReadMaterialResult.data.name, "ws_read");
    assert.equal(wsReadMaterialResult.data.isError, false, JSON.stringify(wsReadMaterialResult));
    assert.equal(wsReadMaterialResult.data.text, UPLOAD_TARGET);
    assert.notEqual(wsReadMaterialResult.data.text, A_TARGET);

    // The durable repository.read events (server/store.mjs recordRepositoryRead)
    // corroborate the same facts independent of the tool.result stream.
    const repoReadEvents = firstRunEvents.filter((event) => event.type === "repository.read");
    assert.deepEqual(repoReadEvents.map((event) => event.data.operation), ["list", "read", "read"]);
    const [, targetReadEvent, onlyAReadEvent] = repoReadEvents;
    assert.equal(targetReadEvent.data.bindingId, bound.json.binding.id);
    assert.equal(targetReadEvent.data.revision, bound.json.binding.revision);
    assert.equal(targetReadEvent.data.path, "target.txt");
    assert.equal(targetReadEvent.data.resultSha256, shaA);
    assert.equal(targetReadEvent.data.sources[0].sha256, shaA);
    assert.notEqual(targetReadEvent.data.resultSha256, shaB);
    assert.notEqual(targetReadEvent.data.resultSha256, shaUpload);
    assert.notEqual(targetReadEvent.data.resultSha256, shaManaged);
    assert.equal(onlyAReadEvent.data.path, "only-a.txt");
    assert.equal(onlyAReadEvent.data.resultSha256, shaOnlyA);
    // The absolute host root never appears in model-facing/event data.
    assert.ok(!JSON.stringify(repoReadEvents).includes(realA));

    // Now change A's only-a.txt on disk. The binding accepts a plain write —
    // the root need not be Git, and reads go straight to the filesystem via
    // a fresh helper process per call (runtime/repository-fs.mjs), so there
    // is nothing to invalidate.
    await writeFile(path.join(dirA, "only-a.txt"), ONLY_A_V2);

    const secondRun = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "identity-run-2",
      input: h.scriptInput([{ name: "repo_read", arguments: { path: "only-a.txt" } }]),
    });
    assert.equal(secondRun.status, 200, JSON.stringify(secondRun.json));
    const secondCompleted = await pollRun(h.api, secondRun.json.run.id);
    assert.equal(secondCompleted.status, "completed", JSON.stringify(secondCompleted.error));

    const eventsAfterEdit = (await h.api("GET", `/sessions/${session.id}/events`)).json.events;
    const secondRunToolResult = eventsAfterEdit.find((event) => event.runId === secondRun.json.run.id && event.type === "tool.result" && event.data.name === "repo_read");
    assert.equal(secondRunToolResult.data.isError, false, JSON.stringify(secondRunToolResult));
    assert.equal(secondRunToolResult.data.text, ONLY_A_V2, "the second run reads A's file fresh off disk, not a cached snapshot");
    const secondRunReadEvent = eventsAfterEdit.find((event) => event.runId === secondRun.json.run.id && event.type === "repository.read" && event.data.operation === "read");
    assert.equal(secondRunReadEvent.data.resultSha256, shaOnlyAV2);

    // The FIRST run's own recorded evidence is untouched: it still shows the
    // OLD content, proving these are durable receipts, not live pointers
    // re-evaluated against the current file.
    const firstRunToolResultAfterEdit = eventsAfterEdit.find((event) => event.runId === firstRun.json.run.id && event.type === "tool.result" && event.data.name === "repo_read" && event.data.text === ONLY_A);
    assert.ok(firstRunToolResultAfterEdit, "the first run's tool.result for only-a.txt still shows the pre-edit content");
    const firstRunReadEventAfterEdit = eventsAfterEdit.find((event) => event.runId === firstRun.json.run.id && event.type === "repository.read" && event.data.path === "only-a.txt");
    assert.equal(firstRunReadEventAfterEdit.data.resultSha256, shaOnlyA, "the first run's repository.read receipt keeps the pre-edit sha256");
    assert.notEqual(firstRunReadEventAfterEdit.data.resultSha256, shaOnlyAV2);

    // The session is still bound to A.
    const bindingNow = await h.api("GET", `/sessions/${session.id}/repository-binding`);
    assert.equal(bindingNow.status, 200, JSON.stringify(bindingNow.json));
    assert.equal(bindingNow.json.binding.status, "active");
    assert.equal(bindingNow.json.binding.id, bound.json.binding.id);
    assert.equal(bindingNow.json.binding.rootPath, realA);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
    await rm(dirA, { recursive: true, force: true });
    await rm(dirB, { recursive: true, force: true });
  }
});

test("01 · the binding survives a Host restart and a bound run continues on the same folder", async () => {
  const h = await boot();
  const dirA = await mkdtemp(path.join(tmpdir(), "cw-directory-identity-restart-a-"));
  let reopened;
  try {
    const RESTART_TARGET = "RESTART-A\n";
    await writeFile(path.join(dirA, "note.txt"), RESTART_TARGET);
    const realA = await realpath(dirA);

    const session = await h.createSession();
    const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, {
      operation: "bind", requestId: "identity-restart-bind", expectedRevision: 0, rootPath: dirA,
    });
    assert.equal(bound.status, 200, JSON.stringify(bound.json));
    assert.equal(bound.json.binding.status, "active");

    const beforeRun = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "identity-restart-run-before",
      input: h.scriptInput([{ name: "repo_read", arguments: { path: "note.txt" } }]),
    });
    assert.equal(beforeRun.status, 200, JSON.stringify(beforeRun.json));
    const beforeCompleted = await pollRun(h.api, beforeRun.json.run.id);
    assert.equal(beforeCompleted.status, "completed", JSON.stringify(beforeCompleted.error));
    const beforeEvents = (await h.api("GET", `/sessions/${session.id}/events`)).json.events;
    const beforeResult = beforeEvents.find((event) => event.runId === beforeRun.json.run.id && event.type === "tool.result" && event.data.name === "repo_read");
    assert.equal(beforeResult.data.text, RESTART_TARGET);

    await h.runtime.close();
    reopened = await reopen(h.dataDir);

    const bindingAfterRestart = await reopened.api("GET", `/sessions/${session.id}/repository-binding`);
    assert.equal(bindingAfterRestart.status, 200, JSON.stringify(bindingAfterRestart.json));
    // Document the actual contract: the binding survives the restart as
    // still active, on the same root A, with the exact same binding id.
    // (If the Host instead re-validated and downgraded it, that would show
    // up here as status !== "active" — this assertion is not weakened to
    // paper over that; a different observed status must be reported, not
    // silently accepted.)
    assert.equal(bindingAfterRestart.json.binding.status, "active", "binding must still be active after a Host restart");
    assert.equal(bindingAfterRestart.json.binding.id, bound.json.binding.id);
    assert.equal(bindingAfterRestart.json.binding.rootPath, realA);

    const afterRun = await reopened.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "identity-restart-run-after",
      input: h.scriptInput([{ name: "repo_read", arguments: { path: "note.txt" } }]),
    });
    assert.equal(afterRun.status, 200, JSON.stringify(afterRun.json));
    const afterCompleted = await pollRun(reopened.api, afterRun.json.run.id);
    assert.equal(afterCompleted.status, "completed", JSON.stringify(afterCompleted.error));
    const afterEvents = (await reopened.api("GET", `/sessions/${session.id}/events`)).json.events;
    const afterResult = afterEvents.find((event) => event.runId === afterRun.json.run.id && event.type === "tool.result" && event.data.name === "repo_read");
    assert.equal(afterResult.data.isError, false, JSON.stringify(afterResult));
    assert.equal(afterResult.data.text, RESTART_TARGET, "a bound run after restart still reads A's content");
  } finally {
    await (reopened?.runtime ?? h.runtime).close();
    await rm(h.dataDir, { recursive: true, force: true });
    await rm(dirA, { recursive: true, force: true });
  }
});
