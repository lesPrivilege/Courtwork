import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdtemp, mkdir, readFile, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { RuntimeStore } from "./fixtures/executor-store.mjs";
import { inspectRepositoryRoot, runRepositoryFs } from "../runtime/repository-fs.mjs";
import { createRepositoryTools } from "../runtime/repository-tools.mjs";
import { boot } from "./helpers.mjs";

const PRE_BINDING_MAIN = "7e1a1ff047721e1ca6c871deba7f367ccea55a06";
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const sha256 = value => createHash("sha256").update(value).digest("hex");

test("RuntimeStore schema15 gains empty external bindings with an exact backup and old-host fence", async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), "cw-repository-schema15-"));
  let old;
  let current;
  let restored;
  try {
    const codeRoot = path.join(scratch, "old-code");
    await mkdir(codeRoot);
    const archive = execFileSync("git", ["archive", PRE_BINDING_MAIN, "app"], { cwd: repositoryRoot, maxBuffer: 64 * 1024 * 1024 });
    execFileSync("tar", ["-x", "-C", codeRoot], { input: archive });
    const { RuntimeStore: Schema15Store } = await import(pathToFileURL(path.join(codeRoot, "app/server/store.mjs")).href);
    const dataDir = path.join(scratch, "data");
    old = await new Schema15Store({ dataDir }).open();
    const project = await old.createProject("synthetic repository migration");
    const session = await old.createSession({ projectId: project.id, title: "Before external binding", workspaceDir: path.join(scratch, "managed", "session") });
    const made = await old.createRun({
      sessionId: session.id,
      input: "historical run",
      adapterId: "fixture",
      provider: { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions", realProvider: false },
      extension: null,
      commandId: "schema15-run",
      workspaceHostSession: null,
      credentialGeneration: 0,
    });
    await old.setDraft(session.id, "Preserve this draft");
    await old.close();
    old = null;

    const file = path.join(dataDir, "runtime-state.json");
    const original = await readFile(file);
    assert.equal(JSON.parse(original).schemaVersion, 15);
    current = await new RuntimeStore({ dataDir }).open();
    assert.equal(current.snapshot().schemaVersion, 22);
    assert.equal(current.getSession(session.id).draft, "Preserve this draft");
    assert.equal(current.getSession(session.id).workspaceDir, path.join(scratch, "managed", "session"));
    assert.equal(current.getSession(session.id).repositoryBinding, null);
    assert.equal(current.getSession(session.id).repositoryBindingRevision, 0);
    assert.deepEqual(current.getSession(session.id).repositoryBindingCommands, []);
    assert.equal(current.getRun(made.run.id).repositoryBindingSnapshot, null);
    await current.close();
    current = null;

    const digest = sha256(original);
    assert.deepEqual(await readFile(path.join(dataDir, `runtime-state.schema15.${digest}.json`)), original);
    const upgraded = await readFile(file);
    await assert.rejects(new Schema15Store({ dataDir }).open(), /schemaVersion 22 is not supported/);
    assert.deepEqual(await readFile(file), upgraded, "the schema15 host must refuse upgraded bytes without changing them");

    const restoreDir = path.join(scratch, "restore");
    await mkdir(restoreDir);
    await writeFile(path.join(restoreDir, "runtime-state.json"), original);
    restored = await new Schema15Store({ dataDir: restoreDir }).open();
    assert.equal(restored.snapshot().schemaVersion, 15);
    assert.equal(restored.getSession(session.id).draft, "Preserve this draft");
  } finally {
    await old?.close().catch(() => {});
    await current?.close().catch(() => {});
    await restored?.close().catch(() => {});
    await rm(scratch, { recursive: true, force: true });
  }
});

test("repository tools use bounded relative paths, record source hashes, and recheck the root before disclosure", async () => {
  const scratch = await mkdtemp(path.join(tmpdir(), "cw-repository-tools-"));
  try {
    const root = path.join(scratch, "repo");
    const outside = path.join(scratch, "outside");
    await mkdir(path.join(root, "src"), { recursive: true });
    await mkdir(path.join(root, ".git"));
    await mkdir(path.join(root, "src", ".GIT"));
    await mkdir(outside);
    const bytes = Buffer.from("alpha needle\nbeta\n", "utf8");
    await writeFile(path.join(root, "src", "README.txt"), bytes);
    await writeFile(path.join(root, ".git", "config"), '[remote "origin"]\nurl = https://user:secret@example.invalid/private.git\n');
    await writeFile(path.join(root, "src", ".GIT", "config"), "nested-control-secret");
    await writeFile(path.join(outside, "secret.txt"), "outside secret");
    await symlink(path.join(outside, "secret.txt"), path.join(root, "src", "link.txt"));
    await symlink(outside, path.join(root, "escape"));
    const bound = await inspectRepositoryRoot(root);
    const binding = { id: "binding-test", status: "active", revision: 3, rootPath: bound.path, device: bound.device, inode: bound.inode };
    const records = [];
    const tools = createRepositoryTools({
      binding,
      runId: "run-test",
      runRepositoryFs,
      recordRead: async (runId, record) => records.push({ runId, ...record }),
      assertActive: (id, revision) => id === binding.id && revision === binding.revision,
    });

    const listing = JSON.parse((await tools.find(tool => tool.name === "repo_list").execute("list", { path: "src" })).content[0].text);
    assert.ok(listing.entries.some(item => item.name === "link.txt" && item.kind === "symlink"));
    const rootListing = JSON.parse((await tools.find(tool => tool.name === "repo_list").execute("list-root", { path: "." })).content[0].text);
    assert.ok(!rootListing.entries.some(item => item.name.toLowerCase() === ".git"));
    const rootGrep = JSON.parse((await tools.find(tool => tool.name === "repo_grep").execute("grep-root", { pattern: "secret|private\\.git", path: "." })).content[0].text);
    assert.deepEqual(rootGrep.matches, []);
    for (const protectedPath of [".git/config", ".git", "src/.GIT/config"]) {
      const name = protectedPath.endsWith("config") ? "repo_read" : "repo_list";
      await assert.rejects(() => tools.find(tool => tool.name === name).execute("git-guard", { path: protectedPath }), { code: "protected_path" });
    }
    assert.equal((await tools.find(tool => tool.name === "repo_read").execute("read", { path: "src/README.txt" })).content[0].text, bytes.toString("utf8"));
    const grep = JSON.parse((await tools.find(tool => tool.name === "repo_grep").execute("grep", { pattern: "needle", path: "." })).content[0].text);
    assert.deepEqual(grep.matches.map(match => [match.path, match.line]), [["src/README.txt", 1]]);
    assert.equal(records.length, 5);
    const readReceipt = records.find(item => item.operation === "read");
    assert.equal(readReceipt.runId, "run-test");
    assert.equal(readReceipt.bindingId, binding.id);
    assert.equal(readReceipt.revision, binding.revision);
    assert.equal(readReceipt.path, "src/README.txt");
    assert.deepEqual(readReceipt.sources, [{ path: "src/README.txt", bytes: bytes.length, sha256: sha256(bytes) }]);
    assert.equal(readReceipt.resultSha256, sha256(bytes));
    assert.ok(!JSON.stringify(records).includes(root), "source receipts contain relative paths, not host locators");

    await assert.rejects(() => runRepositoryFs({ operation: "read", path: "escape/secret.txt", rootPath: binding.rootPath, device: binding.device, inode: binding.inode }));
    await assert.rejects(() => runRepositoryFs({ operation: "read", path: "src/link.txt", rootPath: binding.rootPath, device: binding.device, inode: binding.inode }));
    await assert.rejects(() => runRepositoryFs({ operation: "read", path: "../outside/secret.txt", rootPath: binding.rootPath, device: binding.device, inode: binding.inode }), { code: "invalid_path" });
    await assert.rejects(() => runRepositoryFs({ operation: "grep", path: "src/.git", rootPath: binding.rootPath, device: binding.device, inode: binding.inode }), { code: "protected_path" });
    const aborted = new AbortController();
    aborted.abort();
    await assert.rejects(() => runRepositoryFs({ operation: "list", path: ".", rootPath: binding.rootPath, device: binding.device, inode: binding.inode }, { signal: aborted.signal }), { code: "cancelled" });
    const inFlightAbort = new AbortController();
    const inFlight = runRepositoryFs({ operation: "list", path: ".", rootPath: binding.rootPath, device: binding.device, inode: binding.inode }, { signal: inFlightAbort.signal });
    inFlightAbort.abort();
    await assert.rejects(inFlight, { code: "cancelled" });

    const replacedRoot = path.join(scratch, "replace-me");
    await mkdir(replacedRoot);
    await writeFile(path.join(replacedRoot, "source.txt"), "before replace");
    const replacedRootIdentity = await inspectRepositoryRoot(replacedRoot);
    const replacedBinding = { id: "binding-replaced", status: "active", revision: 1, rootPath: replacedRootIdentity.path, device: replacedRootIdentity.device, inode: replacedRootIdentity.inode };
    let disclosed = 0;
    const guardedTools = createRepositoryTools({
      binding: replacedBinding,
      runId: "run-replaced",
      runRepositoryFs: async (request, options) => {
        if (request.operation === "verify") {
          await rename(replacedRoot, path.join(scratch, "old-root"));
          await mkdir(replacedRoot);
        }
        return await runRepositoryFs(request, options);
      },
      recordRead: async () => { disclosed += 1; },
      assertActive: () => true,
    });
    await assert.rejects(() => guardedTools.find(tool => tool.name === "repo_read").execute("read", { path: "source.txt" }), { code: "root_changed" });
    assert.equal(disclosed, 0, "a replacement detected before result recording discloses no content");
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("binding revisions, idempotency, Run snapshots, and revocation are serialized by RuntimeStore", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "cw-repository-store-"));
  let store;
  try {
    store = await new RuntimeStore({ dataDir }).open();
    const project = await store.createProject("synthetic");
    const session = await store.createSession({ projectId: project.id, title: "Repository fixture", workspaceDir: path.join(dataDir, "managed") });
    const root = path.join(dataDir, "external");
    await mkdir(root);
    const resolvedRoot = await inspectRepositoryRoot(root);
    const command = { requestId: "bind-one", operation: "bind", rootPath: root, expectedRevision: 0 };
    const first = await store.changeRepositoryBinding(session.id, { ...command, resolvedRoot });
    const replay = await store.changeRepositoryBinding(session.id, { ...command, resolvedRoot });
    assert.equal(first.receipt.bindingId, replay.receipt.bindingId);
    assert.equal(replay.idempotent, true);
    await assert.rejects(() => store.changeRepositoryBinding(session.id, { ...command, rootPath: path.join(dataDir, "other"), resolvedRoot }), { code: "IDEMPOTENCY_CONFLICT" });
    await assert.rejects(() => store.changeRepositoryBinding(session.id, { requestId: "stale", operation: "bind", rootPath: root, expectedRevision: 0, resolvedRoot }), { code: "STALE_REVISION" });

    const provider = { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions", realProvider: false };
    await assert.rejects(() => store.createRun({ sessionId: session.id, input: "stale snapshot", adapterId: "fixture", provider, commandId: "stale-run", credentialGeneration: 0, expectedRepositoryBindingRevision: 0 }), { code: "BINDING_CHANGED" });
    const made = await store.createRun({ sessionId: session.id, input: "read later", adapterId: "fixture", provider, commandId: "bound-run", credentialGeneration: 0, expectedRepositoryBindingRevision: 1 });
    assert.deepEqual(made.run.repositoryBindingSnapshot, { ...first.binding, status: "active" });
    assert.ok(store.listEvents({ sessionId: session.id, runId: made.run.id }).some(event => event.type === "repository.bound" && event.data.revision === 1));
    await assert.rejects(() => store.changeRepositoryBinding(session.id, { requestId: "blocked", operation: "bind", rootPath: root, expectedRevision: 1, resolvedRoot }), { code: "ACTIVE_RUN" });

    const revoked = await store.changeRepositoryBinding(session.id, { requestId: "revoke-one", operation: "revoke", expectedRevision: 1 });
    assert.equal(revoked.binding.status, "revoked");
    assert.equal(revoked.binding.revision, 2);
    assert.deepEqual(revoked.runsToCancel, [made.run.id]);
    await assert.rejects(() => store.recordRepositoryRead(made.run.id, {
      bindingId: first.binding.id, revision: first.binding.revision, operation: "read", path: "README.txt",
      resultSha256: "a".repeat(64), sources: [{ path: "README.txt", bytes: 1, sha256: "b".repeat(64) }],
    }), { code: "BINDING_REVOKED" });
    const revokeReplay = await store.changeRepositoryBinding(session.id, { requestId: "revoke-one", operation: "revoke", expectedRevision: 1 });
    assert.equal(revokeReplay.idempotent, true);
    assert.deepEqual(revokeReplay.runsToCancel, [made.run.id], "a revoke replay still requests cancellation of an outstanding Run");

    await store.updateRun(made.run.id, { status: "cancelled", admissionOpen: false });
    const next = await store.createRun({ sessionId: session.id, input: "after revoke", adapterId: "fixture", provider, commandId: "after-revoke", credentialGeneration: 0, expectedRepositoryBindingRevision: 2 });
    assert.equal(next.run.repositoryBindingSnapshot, null);
    assert.equal(store.getSession(session.id).workspaceDir, path.join(dataDir, "managed"));
  } finally {
    await store?.close().catch(() => {});
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("HTTP binding API exposes only bound tools, records read provenance, and revoke cancels active Runs", async () => {
  const h = await boot();
  const root = await mkdtemp(path.join(tmpdir(), "cw-repository-api-root-"));
  try {
    const source = Buffer.from("needle from the connected repository\n", "utf8");
    await writeFile(path.join(root, "README.txt"), source);
    const session = await h.createSession();
    const other = await h.createSession();
    const bindBody = { operation: "bind", requestId: "api-bind-1", expectedRevision: 0, rootPath: root };
    const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, bindBody);
    assert.equal(bound.status, 200);
    assert.equal(bound.json.binding.status, "active");
    assert.equal(bound.json.binding.revision, 1);
    const normalizedRoot = bound.json.binding.rootPath;
    assert.equal(path.isAbsolute(normalizedRoot), true);
    const replay = await h.api("PUT", `/sessions/${session.id}/repository-binding`, bindBody);
    assert.equal(replay.status, 200);
    assert.equal(replay.json.idempotent, true);
    assert.equal(replay.json.receipt.bindingId, bound.json.receipt.bindingId);
    const conflict = await h.api("PUT", `/sessions/${session.id}/repository-binding`, { ...bindBody, rootPath: path.join(root, "subdir") });
    assert.equal(conflict.status, 409);
    assert.equal((await h.api("GET", `/sessions/${session.id}/repository-binding`)).json.binding.id, bound.json.binding.id);

    const control = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
    const otherControl = (await h.api("GET", `/runtime-control?sessionId=${other.id}`)).json;
    for (const name of ["repo_list", "repo_read", "repo_grep"]) {
      assert.equal(control.resources.find(resource => resource.id === `tool:${name}`).exposed, true);
      assert.equal(otherControl.resources.find(resource => resource.id === `tool:${name}`).exposed, false);
    }

    const made = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "repo-tools",
      input: h.scriptInput([
        { name: "repo_list", arguments: { path: "." } },
        { name: "repo_read", arguments: { path: "README.txt" } },
        { name: "repo_grep", arguments: { pattern: "needle", path: "." } },
      ]),
    });
    assert.equal(made.status, 200);
    const completed = await h.pollRun(made.json.run.id);
    assert.equal(completed.status, "completed");
    assert.equal(completed.repositoryBindingSnapshot.id, bound.json.binding.id);
    assert.equal(completed.repositoryBindingSnapshot.revision, 1);
    const events = (await h.api("GET", `/sessions/${session.id}/events`)).json.events;
    assert.ok(events.some(event => event.type === "repository.bound" && event.data.bindingId === bound.json.binding.id));
    const reads = events.filter(event => event.type === "repository.read");
    assert.deepEqual(reads.map(event => event.data.operation), ["list", "read", "grep"]);
    const readEvent = reads.find(event => event.data.operation === "read");
    assert.equal(readEvent.data.runId, undefined, "Run attribution is supplied by the event envelope");
    assert.equal(readEvent.runId, made.json.run.id);
    assert.equal(readEvent.data.sources[0].sha256, sha256(source));
    assert.equal(readEvent.data.path, "README.txt");
    assert.ok(!JSON.stringify(events).includes(normalizedRoot), "absolute host roots stay out of model-facing Run events");

    const waiting = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "repo-revoke-wait",
      input: h.scriptInput([{ name: "ask_user", arguments: { prompt: "wait for the revocation test" } }]),
    });
    assert.equal(waiting.status, 200);
    await h.pollRun(waiting.json.run.id, { until: status => status === "waiting_user" });
    const rebindWhileActive = await h.api("PUT", `/sessions/${session.id}/repository-binding`, {
      operation: "bind", requestId: "blocked-during-run", expectedRevision: 1, rootPath: root,
    });
    assert.equal(rebindWhileActive.status, 409);
    const revokeBody = { operation: "revoke", requestId: "api-revoke-1", expectedRevision: 1 };
    const revoked = await h.api("PUT", `/sessions/${session.id}/repository-binding`, revokeBody);
    assert.equal(revoked.status, 200);
    assert.equal(revoked.json.binding.status, "revoked");
    assert.equal(revoked.json.binding.revision, 2);
    assert.equal((await h.pollRun(waiting.json.run.id)).status, "cancelled");
    const revokeEvents = (await h.api("GET", `/sessions/${session.id}/events`)).json.events;
    assert.ok(revokeEvents.some(event => event.type === "repository.binding.revoked" && event.runId === waiting.json.run.id));
    assert.ok((await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json.resources
      .filter(resource => resource.id.startsWith("tool:repo_")).every(resource => !resource.exposed));
    const revokeReplay = await h.api("PUT", `/sessions/${session.id}/repository-binding`, revokeBody);
    assert.equal(revokeReplay.status, 200);
    assert.equal(revokeReplay.json.idempotent, true);
    assert.equal(revokeReplay.json.receipt.bindingId, revoked.json.receipt.bindingId);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});

test("repository path deny rules block case aliases on case-insensitive Host volumes", async t => {
  const h = await boot();
  const root = await mkdtemp(path.join(tmpdir(), "cw-repository-case-policy-"));
  try {
    await writeFile(path.join(root, "Secrets.txt"), "private case-alias sentinel\n");
    const original = await stat(path.join(root, "Secrets.txt"));
    let alias;
    try { alias = await stat(path.join(root, "secrets.txt")); }
    catch (error) { if (error?.code !== "ENOENT") throw error; }
    if (!alias || alias.ino !== original.ino) {
      t.skip("Host test volume is case-sensitive");
      return;
    }

    const session = await h.createSession();
    const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, {
      operation: "bind", requestId: "case-policy-bind", expectedRevision: 0, rootPath: root,
    });
    assert.equal(bound.status, 200, JSON.stringify(bound.json));
    const control = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
    const policy = await h.api("PUT", `/runtime-control?sessionId=${session.id}`, {
      revision: control.revision, operation: "policy", scope: { type: "session", id: session.id },
      rules: [{ action: "repo_read", resource: "Secrets.txt", effect: "deny" }],
    });
    assert.equal(policy.status, 200, JSON.stringify(policy.json));
    const started = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "case-policy-read", input: h.scriptInput([{ name: "repo_read", arguments: { path: "secrets.txt" } }]),
    });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    assert.equal((await h.pollRun(started.json.run.id)).status, "completed");
    const events = (await h.api("GET", `/sessions/${session.id}/events`)).json.events;
    const result = events.find(event => event.runId === started.json.run.id && event.type === "tool.result" && event.data.name === "repo_read");
    assert.equal(result?.data.isError, true);
    assert.match(result?.data.text ?? "", /Runtime policy denied repo_read/);
    assert.equal(events.some(event => event.runId === started.json.run.id && event.type === "repository.read"), false);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});

test("repo_grep excludes a repo_read-denied file, counts it, and keeps only allowed sources in provenance", async t => {
  const h = await boot();
  const root = await mkdtemp(path.join(tmpdir(), "cw-repository-grep-deny-"));
  try {
    await mkdir(path.join(root, "src"), { recursive: true });
    await mkdir(path.join(root, "private"), { recursive: true });
    await writeFile(path.join(root, "src", "a.txt"), "SENTINEL in the open file\n");
    await writeFile(path.join(root, "private", "secret.txt"), "SENTINEL in the private file\n");

    const session = await h.createSession();
    const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, {
      operation: "bind", requestId: "grep-deny-bind", expectedRevision: 0, rootPath: root,
    });
    assert.equal(bound.status, 200, JSON.stringify(bound.json));
    const control = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
    // A single repo_read rule must also exclude the file from repo_grep,
    // because the effective per-file effect is the strictest of the
    // aggregate tool's own rule and the corresponding single-file read rule.
    const policy = await h.api("PUT", `/runtime-control?sessionId=${session.id}`, {
      revision: control.revision, operation: "policy", scope: { type: "session", id: session.id },
      rules: [{ action: "repo_read", resource: "private/secret.txt", effect: "deny" }],
    });
    assert.equal(policy.status, 200, JSON.stringify(policy.json));

    const started = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "grep-deny-run", input: h.scriptInput([{ name: "repo_grep", arguments: { pattern: "SENTINEL", path: "." } }]),
    });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    assert.equal((await h.pollRun(started.json.run.id)).status, "completed");

    const events = (await h.api("GET", `/sessions/${session.id}/events`)).json.events;
    const result = events.find(event => event.runId === started.json.run.id && event.type === "tool.result" && event.data.name === "repo_grep");
    assert.equal(result?.data.isError, false, JSON.stringify(result));
    const payload = JSON.parse(result.data.text);
    assert.deepEqual(payload.matches.map(match => match.path), ["src/a.txt"]);
    assert.equal(payload.excludedByPolicy, 1);
    assert.equal(payload.excludedPendingApproval, 0);

    const readEvent = events.find(event => event.runId === started.json.run.id && event.type === "repository.read" && event.data.operation === "grep");
    assert.deepEqual(readEvent.data.sources.map(s => s.path), ["src/a.txt"]);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});

test("repo_grep excludes an ask-gated file without opening a permission question", async t => {
  const h = await boot();
  const root = await mkdtemp(path.join(tmpdir(), "cw-repository-grep-ask-"));
  try {
    await mkdir(path.join(root, "src"), { recursive: true });
    await mkdir(path.join(root, "private"), { recursive: true });
    await writeFile(path.join(root, "src", "a.txt"), "SENTINEL in the open file\n");
    await writeFile(path.join(root, "private", "secret.txt"), "SENTINEL in the private file\n");

    const session = await h.createSession();
    const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, {
      operation: "bind", requestId: "grep-ask-bind", expectedRevision: 0, rootPath: root,
    });
    assert.equal(bound.status, 200, JSON.stringify(bound.json));
    const control = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
    const policy = await h.api("PUT", `/runtime-control?sessionId=${session.id}`, {
      revision: control.revision, operation: "policy", scope: { type: "session", id: session.id },
      rules: [{ action: "repo_grep", resource: "private/secret.txt", effect: "ask" }],
    });
    assert.equal(policy.status, 200, JSON.stringify(policy.json));

    const started = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "grep-ask-run", input: h.scriptInput([{ name: "repo_grep", arguments: { pattern: "SENTINEL", path: "." } }]),
    });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    const finished = await h.pollRun(started.json.run.id);
    assert.equal(finished.status, "completed", "an ask-gated aggregate file is excluded, not waited on");

    const events = (await h.api("GET", `/sessions/${session.id}/events`)).json.events;
    assert.equal(events.some(event => event.runId === started.json.run.id && event.type === "permission.open"), false);
    const result = events.find(event => event.runId === started.json.run.id && event.type === "tool.result" && event.data.name === "repo_grep");
    assert.equal(result?.data.isError, false, JSON.stringify(result));
    const payload = JSON.parse(result.data.text);
    assert.deepEqual(payload.matches.map(match => match.path), ["src/a.txt"]);
    assert.equal(payload.excludedByPolicy, 0);
    assert.equal(payload.excludedPendingApproval, 1);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});

test("choose-directory uses the SE_TEST_MODE picker script, reports a cancel, and requires the work token", async () => {
  const h = await boot();
  const scratch = await mkdtemp(path.join(tmpdir(), "cw-directory-picker-"));
  try {
    const pickedDir = path.join(scratch, "picked-repo");
    await mkdir(pickedDir);
    const successScript = path.join(scratch, "pick-success.sh");
    await writeFile(successScript, `#!/bin/sh\nprintf '%s\\n' "${pickedDir}/"\n`);
    await chmod(successScript, 0o755);
    const cancelScript = path.join(scratch, "pick-cancel.sh");
    await writeFile(cancelScript, `#!/bin/sh\necho "User canceled." 1>&2\nexit 1\n`);
    await chmod(cancelScript, 0o755);

    process.env.SE_TEST_MODE = "1";
    try {
      process.env.SE_TEST_DIRECTORY_PICKER = successScript;
      const picked = await h.api("POST", "/host/choose-directory", { prompt: "Pick a repository" });
      assert.equal(picked.status, 200, JSON.stringify(picked.json));
      assert.equal(picked.json.rootPath, pickedDir, "a trailing slash printed by the dialog is trimmed");
      assert.equal(picked.json.cancelled, undefined);

      process.env.SE_TEST_DIRECTORY_PICKER = cancelScript;
      const cancelled = await h.api("POST", "/host/choose-directory", {});
      assert.equal(cancelled.status, 200, JSON.stringify(cancelled.json));
      assert.equal(cancelled.json.cancelled, true);
      assert.equal(cancelled.json.rootPath, undefined, "a cancel never carries a path");
    } finally {
      delete process.env.SE_TEST_MODE;
      delete process.env.SE_TEST_DIRECTORY_PICKER;
    }

    const unauthorized = await fetch(h.runtime.url + "/api/v5/host/choose-directory", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}",
    });
    assert.equal(unauthorized.status, 401);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
    await rm(scratch, { recursive: true, force: true });
  }
});

test("choose-directory rejects a second concurrent picker with 409 while the first is still open", async () => {
  const h = await boot();
  const scratch = await mkdtemp(path.join(tmpdir(), "cw-directory-picker-busy-"));
  try {
    const slowScript = path.join(scratch, "pick-slow.sh");
    await writeFile(slowScript, `#!/bin/sh\nsleep 1\nprintf '%s\\n' "${scratch}"\n`);
    await chmod(slowScript, 0o755);
    process.env.SE_TEST_MODE = "1";
    process.env.SE_TEST_DIRECTORY_PICKER = slowScript;
    try {
      const first = h.api("POST", "/host/choose-directory", {});
      await new Promise(resolve => setTimeout(resolve, 150));
      const second = await h.api("POST", "/host/choose-directory", {});
      assert.equal(second.status, 409);
      assert.equal(second.json.error.code, "directory_picker_busy");
      const resolved = await first;
      assert.equal(resolved.status, 200, JSON.stringify(resolved.json));
      assert.equal(resolved.json.rootPath, scratch);
      // The flag must clear once the first picker settles, or every later
      // call would wrongly see the Host as permanently busy.
      const third = await h.api("POST", "/host/choose-directory", {});
      assert.equal(third.status, 200);
    } finally {
      delete process.env.SE_TEST_MODE;
      delete process.env.SE_TEST_DIRECTORY_PICKER;
    }
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
    await rm(scratch, { recursive: true, force: true });
  }
});

test("recent repositories are derived from bind receipts, deduped by exact path, ordered, and report live availability", async () => {
  const h = await boot();
  const rootA = await mkdtemp(path.join(tmpdir(), "cw-recent-repo-a-"));
  const rootB = await mkdtemp(path.join(tmpdir(), "cw-recent-repo-b-"));
  try {
    const sessionOne = await h.createSession();
    const sessionTwo = await h.createSession();
    const sessionThree = await h.createSession();

    const bindOne = await h.api("PUT", `/sessions/${sessionOne.id}/repository-binding`, { operation: "bind", requestId: "recent-bind-1", expectedRevision: 0, rootPath: rootA });
    assert.equal(bindOne.status, 200, JSON.stringify(bindOne.json));
    await new Promise(resolve => setTimeout(resolve, 15));
    const bindTwo = await h.api("PUT", `/sessions/${sessionTwo.id}/repository-binding`, { operation: "bind", requestId: "recent-bind-2", expectedRevision: 0, rootPath: rootB });
    assert.equal(bindTwo.status, 200, JSON.stringify(bindTwo.json));
    await new Promise(resolve => setTimeout(resolve, 15));
    // A second session binding the SAME resolved root dedupes into one entry
    // and becomes its newest `lastConnectedAt`, while `sessions` counts both.
    const bindThree = await h.api("PUT", `/sessions/${sessionThree.id}/repository-binding`, { operation: "bind", requestId: "recent-bind-3", expectedRevision: 0, rootPath: rootA });
    assert.equal(bindThree.status, 200, JSON.stringify(bindThree.json));
    const normalizedRootA = bindThree.json.binding.rootPath;
    assert.equal(bindOne.json.binding.rootPath, normalizedRootA, "the same input directory resolves to the same canonical path");

    const revoke = await h.api("PUT", `/sessions/${sessionTwo.id}/repository-binding`, { operation: "revoke", requestId: "recent-revoke-2", expectedRevision: 1 });
    assert.equal(revoke.status, 200, JSON.stringify(revoke.json));

    await rm(rootB, { recursive: true, force: true });

    const recent = await h.api("GET", "/repositories/recent");
    assert.equal(recent.status, 200, JSON.stringify(recent.json));
    assert.equal(recent.json.schemaVersion, 1);
    assert.equal(recent.json.entries.length, 2, "two distinct rootPaths, deduped");
    assert.equal(recent.json.entries[0].rootPath, normalizedRootA, "the most recently (re)connected path sorts first");

    const entryA = recent.json.entries.find(entry => entry.rootPath === normalizedRootA);
    assert.equal(entryA.sessions, 2, "two distinct sessions have ever bound this path");
    assert.equal(entryA.available, true);

    const entryB = recent.json.entries.find(entry => entry.rootPath === bindTwo.json.binding.rootPath);
    assert.equal(entryB.sessions, 1);
    assert.equal(entryB.available, false, "revoked and its directory deleted, so it is no longer available");

    const unauthorized = await fetch(h.runtime.url + "/api/v5/repositories/recent");
    assert.equal(unauthorized.status, 401);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
    await rm(rootA, { recursive: true, force: true }).catch(() => {});
    await rm(rootB, { recursive: true, force: true }).catch(() => {});
  }
});

test("repositories/inspect reports live availability and Git branch/HEAD without persisting or granting access", async () => {
  const h = await boot();
  const gitRoot = await mkdtemp(path.join(tmpdir(), "cw-repo-inspect-git-"));
  const plainRoot = await mkdtemp(path.join(tmpdir(), "cw-repo-inspect-plain-"));
  const missingParent = await mkdtemp(path.join(tmpdir(), "cw-repo-inspect-missing-"));
  const missingRoot = path.join(missingParent, "does-not-exist");
  try {
    execFileSync("git", ["init", "-b", "main"], { cwd: gitRoot });
    execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd: gitRoot });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: gitRoot });
    await writeFile(path.join(gitRoot, "README.md"), "hello\n");
    execFileSync("git", ["add", "README.md"], { cwd: gitRoot });
    execFileSync("git", ["commit", "-m", "initial"], { cwd: gitRoot });
    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: gitRoot }).toString().trim();

    const gitResult = await h.api("GET", `/repositories/inspect?rootPath=${encodeURIComponent(gitRoot)}`);
    assert.equal(gitResult.status, 200, JSON.stringify(gitResult.json));
    assert.equal(gitResult.json.rootPath, gitRoot);
    assert.equal(gitResult.json.available, true);
    assert.deepEqual(gitResult.json.git, { branch: "main", head, detached: false });

    const plainResult = await h.api("GET", `/repositories/inspect?rootPath=${encodeURIComponent(plainRoot)}`);
    assert.equal(plainResult.status, 200, JSON.stringify(plainResult.json));
    assert.equal(plainResult.json.available, true);
    assert.equal(plainResult.json.git, null, "a directory that is not a Git repository reports git: null");

    const missingResult = await h.api("GET", `/repositories/inspect?rootPath=${encodeURIComponent(missingRoot)}`);
    assert.equal(missingResult.status, 200, JSON.stringify(missingResult.json));
    assert.equal(missingResult.json.available, false);
    assert.equal(missingResult.json.git, null);

    const relative = await h.api("GET", "/repositories/inspect?rootPath=relative/path");
    assert.equal(relative.status, 400);
    assert.equal(relative.json.error.code, "invalid_repository_root");

    const unauthorized = await fetch(h.runtime.url + `/api/v5/repositories/inspect?rootPath=${encodeURIComponent(gitRoot)}`);
    assert.equal(unauthorized.status, 401);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
    await rm(gitRoot, { recursive: true, force: true });
    await rm(plainRoot, { recursive: true, force: true });
    await rm(missingParent, { recursive: true, force: true });
  }
});
