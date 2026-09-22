import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, lstat, link, mkdir, readFile, readdir, realpath, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPrivateRepositoryCandidate, readPrivateRepositoryCandidateDiff } from "../runtime/repository-candidate.mjs";
import { runRepositoryCandidateFs } from "../runtime/repository-candidate-fs.mjs";
import { createRepositoryCandidateTools } from "../runtime/repository-candidate-tools.mjs";
import { governTools } from "../runtime/control-tools.mjs";
import { RuntimeStore } from "../server/store.mjs";
import { inspectRepositoryRoot, runRepositoryFs } from "../runtime/repository-fs.mjs";
import { boot } from "./helpers.mjs";

function git(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trimEnd();
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function makeRepository(root, { dirty = false, malicious = false } = {}) {
  await mkdir(root, { recursive: true });
  git(root, ["init", "--quiet", "--initial-branch=main"]);
  git(root, ["config", "user.name", "Candidate Fixture"]);
  git(root, ["config", "user.email", "candidate-fixture@example.invalid"]);
  await writeFile(path.join(root, ".gitattributes"), "*.txt filter=evil\n", "utf8");
  await writeFile(path.join(root, "tracked.txt"), "base committed bytes\n", "utf8");
  await writeFile(path.join(root, "README.md"), "base documentation\n", "utf8");
  git(root, ["add", ".gitattributes", "tracked.txt", "README.md"]);
  git(root, ["commit", "--quiet", "-m", "base"]);
  const baseCommit = git(root, ["rev-parse", "--verify", "HEAD"]);
  await writeFile(path.join(root, "second.txt"), "a later commit\n", "utf8");
  git(root, ["add", "second.txt"]);
  git(root, ["commit", "--quiet", "-m", "second"]);

  if (dirty) {
    await writeFile(path.join(root, "README.md"), "uncommitted source edit\n", "utf8");
    await writeFile(path.join(root, "untracked-secret.txt"), "uncommitted source data\n", "utf8");
  }

  let sentinel = null;
  if (malicious) {
    sentinel = path.join(path.dirname(root), "execution-sentinel");
    const hookDirectory = path.join(path.dirname(root), "source hooks");
    await mkdir(hookDirectory);
    const hook = path.join(hookDirectory, "post-checkout");
    await writeFile(hook, `#!/bin/sh\ntouch '${sentinel}'\n`, "utf8");
    await chmod(hook, 0o700);
    git(root, ["config", "core.hooksPath", hookDirectory]);
    git(root, ["config", "filter.evil.smudge", `touch "${sentinel}"`]);
    git(root, ["config", "core.fsmonitor", `touch "${sentinel}"`]);
  }

  return { baseCommit, sentinel };
}

async function rootIdentity(root) {
  const canonical = await realpath(root);
  const info = await lstat(canonical);
  return { path: canonical, device: String(info.dev), inode: String(info.ino) };
}

function candidateFsFields(candidate) {
  return {
    candidateDirectory: candidate.candidateDirectory,
    containerDevice: candidate.candidateContainerDevice,
    containerInode: candidate.candidateContainerInode,
    candidatePath: candidate.candidatePath,
    device: candidate.candidateDevice,
    inode: candidate.candidateInode,
    stagingDevice: candidate.stagingDevice,
    stagingInode: candidate.stagingInode,
  };
}

async function openStoreWithCandidate(dataDir, candidateId = "423e4567-e89b-42d3-a456-426614174000") {
  const store = await new RuntimeStore({ dataDir }).open();
  const project = await store.createProject("candidate capacity fixture");
  const session = await store.createSession({ projectId: project.id, title: "candidate capacity", workspaceDir: path.join(dataDir, "managed") });
  const sourcePath = path.join(dataDir, "source");
  await mkdir(sourcePath, { recursive: true });
  const resolvedRoot = await inspectRepositoryRoot(sourcePath);
  const bound = await store.changeRepositoryBinding(session.id, {
    operation: "bind", requestId: "capacity-bind", expectedRevision: 0, rootPath: sourcePath, resolvedRoot,
  });
  if (candidateId === null) return { store, session, bound, candidateId: null, candidateRequest: null };
  const candidateRequest = {
    operation: "create", requestId: "capacity-create", expectedRevision: 0, expectedBindingRevision: 1,
    sourceBindingId: bound.binding.id, candidateId, baseCommit: "a".repeat(40),
  };
  await store.beginRepositoryCandidate(session.id, candidateRequest);
  const candidateParent = path.join(dataDir, "candidate-container");
  const candidate = {
    objectFormat: "sha1", candidatePath: path.join(candidateParent, "worktree"), candidateDevice: "1", candidateInode: "2",
    candidateDirectory: candidateParent, candidateContainerDevice: "1", candidateContainerInode: "3", stagingDevice: "1", stagingInode: "4",
    gitDirectory: path.join(candidateParent, "git"), gitDevice: "1", gitInode: "5", gitVersion: "git version capacity-fixture",
  };
  await store.activateRepositoryCandidate(session.id, { requestId: candidateRequest.requestId, candidate });
  return { store, session, bound, candidateId, candidateRequest };
}

function candidateCapacityRun(store, session, commandId) {
  return store.createRun({ sessionId: session.id, input: "capacity fixture", adapterId: "fixture",
    provider: { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions", realProvider: false },
    commandId, credentialGeneration: 0, expectedRepositoryBindingRevision: 1, expectedRepositoryCandidateRevision: 1 });
}

test("candidate reads and writes serialize so provenance keeps the observed write revision", async () => {
  const oldBytes = Buffer.from("old candidate contents\n", "utf8");
  let releaseRead;
  let markReadStarted;
  const readGate = new Promise(resolve => { releaseRead = resolve; });
  const readStarted = new Promise(resolve => { markReadStarted = resolve; });
  let hostWriteRevision = 0;
  let writeCalls = 0;
  const receipts = [];
  const writes = [];
  const candidate = {
    status: "active", id: "candidate-test", revision: 1, writeRevision: 0,
    sourceBindingId: "binding-test", sourceBindingRevision: 1,
    candidateDirectory: "/host/candidate", candidatePath: "/host/candidate/worktree",
    containerDevice: "1", containerInode: "2", device: "1", inode: "3",
    stagingDevice: "1", stagingInode: "4",
  };
  const tools = createRepositoryCandidateTools({
    candidate,
    runCandidateFs: async () => ({ verified: true }),
    runRepositoryFs: async request => {
      if (request.operation !== "read") throw new Error(`unexpected operation ${request.operation}`);
      markReadStarted();
      await readGate;
      return { path: request.path, bytes: oldBytes.length, sha256: sha256(oldBytes), dataBase64: oldBytes.toString("base64") };
    },
    recordRead: async receipt => { receipts.push(receipt); },
    writeCandidate: async request => {
      writeCalls += 1;
      writes.push(request);
      hostWriteRevision += 1;
      return { candidateId: request.candidateId, path: request.path, writeRevision: hostWriteRevision,
        before: null, after: { sha256: request.contentSha256, bytes: request.bytes } };
    },
    assertActive: (_candidateId, _revision, writeRevision) => writeRevision === hostWriteRevision,
  });
  const readTool = tools.find(tool => tool.name === "candidate_read");
  const writeTool = tools.find(tool => tool.name === "repo_write");
  const readResult = readTool.execute("read-before-write", { path: "tracked.txt" });
  await readStarted;
  const writeResult = writeTool.execute("write-after-read", { path: "new.txt", text: "new contents\n" });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(writeCalls, 0, "write waits until candidate observation and provenance complete");
  releaseRead();
  const [readOutput, writeOutput] = await Promise.all([readResult, writeResult]);
  assert.match(readOutput.content[0].text, /old candidate contents/);
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].writeRevision, 0);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].candidateWriteRevision, 0);
  assert.equal(JSON.parse(writeOutput.content[0].text).writeRevision, 1);
});

test("parallel ask-mode writes cannot spend approval after the candidate revision advances", async () => {
  let hostWriteRevision = 0;
  const approvals = [];
  const answerApproval = [];
  const writes = [];
  const candidate = {
    status: "active", id: "candidate-approval", revision: 1, writeRevision: 0,
    sourceBindingId: "binding-approval", sourceBindingRevision: 1,
    candidateDirectory: "/host/candidate", candidatePath: "/host/candidate/worktree",
    containerDevice: "1", containerInode: "2", device: "1", inode: "3",
    stagingDevice: "1", stagingInode: "4",
  };
  const candidateTools = createRepositoryCandidateTools({
    candidate,
    runCandidateFs: async () => ({ verified: true }),
    runRepositoryFs: async () => { throw new Error("write-only fixture"); },
    recordRead: async () => {},
    assertActive: (_candidateId, _revision, writeRevision) => writeRevision === hostWriteRevision,
    writeCandidate: async request => {
      assert.equal(request.candidateWriteRevision, hostWriteRevision);
      writes.push(request);
      hostWriteRevision += 1;
      return { candidateId: request.candidateId, path: request.path, writeRevision: hostWriteRevision,
        before: null, after: { sha256: request.contentSha256, bytes: request.bytes } };
    },
  });
  const [writeTool] = governTools(candidateTools, {
    binding: { resources: [{ id: "tool:repo_write", action: "repo_write", exposed: true }], policies: [] },
    permissionMode: "ask", workspaceDir: "/unused",
    isOpen: () => true,
    requestPermission: async question => {
      approvals.push(question);
      return new Promise(resolve => answerApproval.push(resolve));
    },
  });
  const first = writeTool.execute("parallel-write-1", { path: "one.txt", text: "first\n" });
  const second = writeTool.execute("parallel-write-2", { path: "two.txt", text: "second\n" });
  assert.equal(approvals.length, 2);
  assert.deepEqual(approvals.map(question => question.candidateWriteRevision), [0, 0]);

  answerApproval[0]("allow");
  await first;
  answerApproval[1]("allow");
  await assert.rejects(second, /changed after approval/);
  assert.equal(writes.length, 1, "the second approved revision is rejected before it can reach the effect gate");
  assert.equal(hostWriteRevision, 1);
});

test("private Git candidate uses the explicit commit, contains source execution config, and leaves the dirty source untouched", async () => {
  const scratch = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(path.join(tmpdir(), "cw-private-candidate-")));
  try {
    const source = path.join(scratch, "source");
    const { baseCommit, sentinel } = await makeRepository(source, { dirty: true, malicious: true });
    const sourceHeadCommit = git(source, ["rev-parse", "--verify", "HEAD"]);
    const sourceHead = await readFile(path.join(source, ".git", "HEAD"));
    const sourceIndex = await readFile(path.join(source, ".git", "index"));
    const sourceReadme = await readFile(path.join(source, "README.md"));
    const sourceUntracked = await readFile(path.join(source, "untracked-secret.txt"));
    const identity = await rootIdentity(source);
    const candidateParent = path.join(scratch, "candidate storage with spaces");

    const candidate = await createPrivateRepositoryCandidate({
      sourcePath: identity.path,
      sourceIdentity: identity,
      candidateParent,
      baseCommit,
    });

    assert.equal(candidate.baseCommit, baseCommit);
    assert.equal(await readFile(path.join(candidate.candidatePath, "tracked.txt"), "utf8"), "base committed bytes\n");
    assert.equal(await readFile(path.join(candidate.candidatePath, "README.md"), "utf8"), "base documentation\n");
    await assert.rejects(readFile(path.join(candidate.candidatePath, "second.txt")), { code: "ENOENT" });
    await assert.rejects(readFile(path.join(candidate.candidatePath, "untracked-secret.txt")), { code: "ENOENT" });

    const configPath = path.join(candidate.gitDirectory, "config");
    const config = await readFile(configPath, "utf8");
    assert.match(config, /hooksPath = "/);
    assert.ok(!config.includes("filter.evil"));
    assert.ok(!config.includes("source hooks"));
    assert.ok(!config.includes(source));
    assert.equal(git(candidate.candidateDirectory, ["--git-dir", candidate.gitDirectory, "config", "--get", "core.hooksPath"]), path.join(candidate.candidateDirectory, "hooks"));
    assert.equal(git(candidate.candidateDirectory, ["--git-dir", candidate.gitDirectory, "config", "--get", "core.fsmonitor"]), "false");
    assert.deepEqual(git(candidate.candidateDirectory, ["--git-dir", candidate.gitDirectory, "for-each-ref", "--format=%(refname)"]).split("\n"), ["refs/heads/courtwork-base"]);
    assert.equal(git(candidate.candidateDirectory, ["--git-dir", candidate.gitDirectory, "remote"]), "");
    assert.equal(git(candidate.candidatePath, ["status", "--porcelain", "--untracked-files=all"]), "");
    assert.equal(await lstat(sentinel).then(() => true, () => false), false, "source hook/filter/fsmonitor commands did not execute");

    assert.deepEqual(await readFile(path.join(source, ".git", "HEAD")), sourceHead);
    assert.deepEqual(await readFile(path.join(source, ".git", "index")), sourceIndex);
    assert.deepEqual(await readFile(path.join(source, "README.md")), sourceReadme);
    assert.deepEqual(await readFile(path.join(source, "untracked-secret.txt")), sourceUntracked);
    assert.equal(git(source, ["rev-parse", "--verify", "HEAD"]), sourceHeadCommit);
    assert.equal((await stat(candidate.candidateDirectory)).mode & 0o777, 0o700);
    assert.equal((await stat(candidate.candidatePath)).mode & 0o777, 0o700);
    const gitFile = await readFile(path.join(candidate.candidatePath, ".git"), "utf8");
    assert.ok(gitFile.includes(candidate.gitDirectory));
    assert.ok(!gitFile.includes(source));
    assert.equal(sha256(await readFile(path.join(candidate.candidatePath, "tracked.txt"))), sha256(Buffer.from("base committed bytes\n")));
    const candidateTools = createRepositoryCandidateTools({
      candidate: { ...candidate, id: candidate.candidateId, status: "active", revision: 1, writeRevision: 0,
        device: candidate.candidateDevice, inode: candidate.candidateInode,
        containerDevice: candidate.candidateContainerDevice, containerInode: candidate.candidateContainerInode },
      runRepositoryFs,
      runCandidateFs: runRepositoryCandidateFs,
      recordRead: async () => {},
      writeCandidate: async () => { throw new Error("read-only fixture"); },
      assertActive: () => true,
    });
    const candidateList = await candidateTools.find(tool => tool.name === "candidate_list").execute("candidate-list", { path: "." });
    const candidateEntries = JSON.parse(candidateList.content[0].text).entries.map(entry => entry.name);
    assert.equal(candidateEntries.includes(".git"), false, "candidate listing hides the worktree .git pointer");
    await assert.rejects(candidateTools.find(tool => tool.name === "candidate_read").execute("candidate-read-git", { path: ".GIT/config" }), {
      code: "protected_path",
    });
    const candidateGrep = await candidateTools.find(tool => tool.name === "candidate_grep").execute("candidate-grep-git", { pattern: "gitdir:", path: "." });
    assert.deepEqual(JSON.parse(candidateGrep.content[0].text).matches, [], "candidate search does not disclose the .git pointer");
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("private candidate dissociates source object alternates", async () => {
  const { mkdtemp } = await import("node:fs/promises");
  const scratch = await mkdtemp(path.join(tmpdir(), "cw-private-candidate-alternate-"));
  try {
    const source = path.join(scratch, "source");
    const alternate = path.join(scratch, "alternate.git");
    const offline = path.join(scratch, "alternate-offline.git");
    const { baseCommit } = await makeRepository(source);
    git(scratch, ["init", "--quiet", "--bare", alternate]);
    git(source, ["push", "--quiet", alternate, "refs/heads/main:refs/heads/main"]);

    const objects = path.join(source, ".git", "objects");
    for (const entry of await readdir(objects)) {
      if (entry !== "info") await rm(path.join(objects, entry), { recursive: true, force: true });
    }
    await writeFile(path.join(objects, "info", "alternates"), `${path.join(alternate, "objects")}\n`, "utf8");
    assert.equal(git(source, ["cat-file", "-e", `${baseCommit}^{commit}`]), "");

    const candidate = await createPrivateRepositoryCandidate({
      sourcePath: (await rootIdentity(source)).path,
      sourceIdentity: await rootIdentity(source),
      candidateParent: path.join(scratch, "candidate-store"),
      baseCommit,
    });
    await assert.rejects(lstat(path.join(candidate.gitDirectory, "objects", "info", "alternates")), { code: "ENOENT" });
    await rename(alternate, offline);
    assert.equal(git(candidate.candidatePath, ["--git-dir", candidate.gitDirectory, "cat-file", "-e", `${baseCommit}^{commit}`]), "");
    const integrity = git(candidate.candidatePath, ["--git-dir", candidate.gitDirectory, "fsck", "--full", "--strict", "--no-reflogs", "--no-progress"]);
    assert.doesNotMatch(integrity, /missing|error/i);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("candidate diff stops collecting untracked patches at the aggregate Host limit", async () => {
  const { mkdtemp } = await import("node:fs/promises");
  const scratch = await mkdtemp(path.join(tmpdir(), "cw-candidate-diff-budget-"));
  try {
    const source = path.join(scratch, "source");
    const { baseCommit } = await makeRepository(source);
    const identity = await rootIdentity(source);
    const candidate = await createPrivateRepositoryCandidate({
      sourcePath: identity.path, sourceIdentity: identity,
      candidateParent: path.join(scratch, "candidate-store"), baseCommit,
    });
    for (const name of ["one.txt", "two.txt", "three.txt", "four.txt"]) {
      await writeFile(path.join(candidate.candidatePath, name), "small synthetic file\n", "utf8");
    }

    const callsPath = path.join(scratch, "untracked-diff-calls.txt");
    const wrapperPath = path.join(scratch, "bounded-git");
    const wrapper = `#!${process.execPath}
import { appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const args = process.argv.slice(2);
if (args.includes("--no-index")) {
  appendFileSync(${JSON.stringify(callsPath)}, "diff\\n");
  process.stdout.write("x".repeat(1_100_000), () => process.exit(1));
} else {
  const result = spawnSync("/usr/bin/git", args);
  if (result.stdout?.length) process.stdout.write(result.stdout);
  if (result.stderr?.length) process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}
`;
    await writeFile(wrapperPath, wrapper, "utf8");
    await chmod(wrapperPath, 0o700);
    await assert.rejects(readPrivateRepositoryCandidateDiff({ candidate, baseCommit, gitBinary: wrapperPath }), {
      code: "candidate_diff_too_large",
    });
    const calls = (await readFile(callsPath, "utf8")).trim().split("\n");
    assert.equal(calls.length, 2, "the second per-file diff crosses the aggregate cap and later paths are never invoked");
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("Linux mountinfo parser detects escaped mountpoint descendants", () => {
  const helper = fileURLToPath(new URL("../runtime/repository-candidate-fs-helper.py", import.meta.url));
  const parser = [
    "import importlib.util, json, sys",
    "spec = importlib.util.spec_from_file_location('candidate_helper', sys.argv[1])",
    "module = importlib.util.module_from_spec(spec)",
    "spec.loader.exec_module(module)",
    "mounts = module.parse_linux_mountinfo(sys.stdin.buffer.read())",
    "descendants = module.candidate_mount_descendants('/tmp/candidate/container', mounts)",
    "try:",
    "    module.parse_linux_mountinfo(b'malformed mount row')",
    "except Exception as error:",
    "    malformed_rejected = getattr(error, 'code', None) == 'mount_scope_unavailable'",
    "else:",
    "    malformed_rejected = False",
    "print(json.dumps({'descendants': descendants, 'malformedRejected': malformed_rejected}))",
  ].join("\n");
  const mountinfo = Buffer.from([
    "24 1 8:1 / / rw,relatime - ext4 /dev/sda1 rw",
    "54 24 8:1 / /tmp/candidate/container rw,relatime - ext4 /dev/sda1 rw",
    "55 54 8:1 / /tmp/candidate/container/worktree/sub\\040dir rw,relatime - ext4 /dev/sda1 rw",
    "56 24 0:42 / /tmp/candidate/container/staging rw,relatime - ext4 /dev/loop0 rw",
    "57 24 8:1 / /tmp/candidate/sibling rw,relatime - ext4 /dev/sda1 rw",
  ].join("\n") + "\n", "ascii");
  const output = execFileSync(process.env.WORK_AGENT_PYTHON ?? "python3", ["-c", parser, helper], { input: mountinfo, encoding: "utf8" });
  assert.deepEqual(JSON.parse(output), {
    descendants: ["/tmp/candidate/container", "/tmp/candidate/container/staging", "/tmp/candidate/container/worktree/sub dir"],
    malformedRejected: true,
  });
});

test("candidate creation rejects a replaced bound source root", async () => {
  const { mkdtemp } = await import("node:fs/promises");
  const scratch = await mkdtemp(path.join(tmpdir(), "cw-private-candidate-root-"));
  try {
    const source = path.join(scratch, "source");
    const { baseCommit } = await makeRepository(source);
    const identity = await rootIdentity(source);
    await rename(source, path.join(scratch, "old-source"));
    await mkdir(source);

    await assert.rejects(
      createPrivateRepositoryCandidate({ sourcePath: identity.path, sourceIdentity: identity, candidateParent: path.join(scratch, "candidate"), baseCommit }),
      { code: "source_root_changed" },
    );
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("candidate FD write inspects expected hashes and replaces existing files with a new inode", async () => {
  const { mkdtemp } = await import("node:fs/promises");
  const scratch = await mkdtemp(path.join(tmpdir(), "cw-private-candidate-write-"));
  try {
    const source = path.join(scratch, "source");
    const { baseCommit } = await makeRepository(source);
    const candidate = await createPrivateRepositoryCandidate({
      sourcePath: (await rootIdentity(source)).path,
      sourceIdentity: await rootIdentity(source),
      candidateParent: path.join(scratch, "candidate-store"),
      baseCommit,
    });
    const fields = candidateFsFields(candidate);
    const targetPath = path.join(candidate.candidatePath, "tracked.txt");
    const aliasPath = path.join(scratch, "outside-hardlink-alias.txt");
    const oldBytes = await readFile(targetPath);
    const oldInfo = await lstat(targetPath);
    await link(targetPath, aliasPath);
    const inspected = await runRepositoryCandidateFs({ operation: "inspect", ...fields, path: "tracked.txt" });
    assert.deepEqual(inspected.target, {
      present: true, sha256: sha256(oldBytes), bytes: oldBytes.length,
      device: String(oldInfo.dev), inode: String(oldInfo.ino), mode: oldInfo.mode & 0o777,
    });

    const replacement = Buffer.from("revised candidate source\n", "utf8");
    const receipt = await runRepositoryCandidateFs({
      operation: "write", ...fields, path: "tracked.txt", expectedSha256: inspected.target.sha256,
      dataBase64: replacement.toString("base64"), contentSha256: sha256(replacement),
    });
    assert.equal(receipt.created, false);
    assert.equal(receipt.before.sha256, sha256(oldBytes));
    assert.equal(receipt.after.sha256, sha256(replacement));
    assert.equal(receipt.after.bytes, replacement.length);
    assert.notEqual(receipt.after.inode, inspected.target.inode, "replacement uses a different inode");
    assert.equal(receipt.after.mode, inspected.target.mode, "replacement preserves executable/read permission bits");
    assert.deepEqual(await readFile(targetPath), replacement);
    assert.deepEqual(await readFile(aliasPath), oldBytes, "an existing hard-link alias retains its original bytes");
    assert.equal(await readRepositoryCandidateFile(scratch, targetPath), receipt.after.inode);

    const newText = Buffer.from("new candidate file\n", "utf8");
    await runRepositoryCandidateFs({
      operation: "write", ...fields, path: "new-file.md", expectedSha256: null,
      dataBase64: newText.toString("base64"), contentSha256: sha256(newText),
    });
    const diff = await readPrivateRepositoryCandidateDiff({ candidate, baseCommit });
    assert.deepEqual(diff.files.map(item => [item.path, item.status]), [["new-file.md", "created"], ["tracked.txt", "modified"]]);
    assert.equal(diff.files.find(item => item.path === "tracked.txt").beforeSha256, sha256(Buffer.from("base committed bytes\n")));
    assert.equal(diff.files.find(item => item.path === "tracked.txt").sha256, sha256(replacement));
    assert.equal(diff.files.find(item => item.path === "new-file.md").beforeSha256, null);
    assert.equal(diff.files.find(item => item.path === "new-file.md").sha256, sha256(newText));
    assert.match(diff.patch, /diff --git a\/tracked\.txt b\/tracked\.txt/);
    assert.match(diff.patch, /diff --git a\/new-file\.md b\/new-file\.md/);
    assert.equal(diff.patchBytes, Buffer.byteLength(diff.patch));
    assert.equal(diff.patchSha256, sha256(Buffer.from(diff.patch, "utf8")));
    assert.equal(diff.truncated, false);

    await assert.rejects(runRepositoryCandidateFs({
      operation: "write", ...fields, path: "tracked.txt", expectedSha256: inspected.target.sha256,
      dataBase64: Buffer.from("stale overwrite").toString("base64"), contentSha256: sha256(Buffer.from("stale overwrite")),
    }), { code: "write_conflict" });
    assert.deepEqual(await readFile(targetPath), replacement);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

async function readRepositoryCandidateFile(_scratch, targetPath) {
  return String((await lstat(targetPath)).ino);
}

test("candidate FD write creates only absent targets and serializes the no-replace primitive", async () => {
  const { mkdtemp } = await import("node:fs/promises");
  const scratch = await mkdtemp(path.join(tmpdir(), "cw-private-candidate-create-"));
  try {
    const source = path.join(scratch, "source");
    const { baseCommit } = await makeRepository(source);
    const candidate = await createPrivateRepositoryCandidate({
      sourcePath: (await rootIdentity(source)).path,
      sourceIdentity: await rootIdentity(source),
      candidateParent: path.join(scratch, "candidate-store"),
      baseCommit,
    });
    const fields = candidateFsFields(candidate);
    const absent = await runRepositoryCandidateFs({ operation: "inspect", ...fields, path: "new/nested.md" }).catch(error => error);
    assert.equal(absent.code, "path_unavailable", "the first-slice scope does not create missing parent directories");
    await mkdir(path.join(candidate.candidatePath, "new"));
    const firstText = Buffer.from("first writer\n");
    const first = await runRepositoryCandidateFs({
      operation: "write", ...fields, path: "new/created.md", expectedSha256: null,
      dataBase64: firstText.toString("base64"), contentSha256: sha256(firstText),
    });
    assert.equal(first.created, true);
    assert.equal(first.before.present, false);
    assert.equal(await readFile(path.join(candidate.candidatePath, "new", "created.md"), "utf8"), "first writer\n");

    const contenders = [Buffer.from("candidate A\n"), Buffer.from("candidate B\n")];
    const outcomes = await Promise.allSettled(contenders.map(content => runRepositoryCandidateFs({
      operation: "write", ...fields, path: "new/race.md", expectedSha256: null,
      dataBase64: content.toString("base64"), contentSha256: sha256(content),
    })));
    assert.equal(outcomes.filter(item => item.status === "fulfilled").length, 1);
    const rejected = outcomes.find(item => item.status === "rejected");
    assert.equal(rejected.reason.code, "write_conflict");
    const landed = await readFile(path.join(candidate.candidatePath, "new", "race.md"));
    assert.ok(contenders.some(content => content.equals(landed)));
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("candidate FD write rejects traversal, Git control paths, symlinks, and a replaced root", async () => {
  const { mkdtemp } = await import("node:fs/promises");
  const scratch = await mkdtemp(path.join(tmpdir(), "cw-private-candidate-guards-"));
  try {
    const source = path.join(scratch, "source");
    const outside = path.join(scratch, "outside.txt");
    const { baseCommit } = await makeRepository(source);
    await writeFile(outside, "outside unchanged\n");
    const candidate = await createPrivateRepositoryCandidate({
      sourcePath: (await rootIdentity(source)).path,
      sourceIdentity: await rootIdentity(source),
      candidateParent: path.join(scratch, "candidate-store"),
      baseCommit,
    });
    const fields = candidateFsFields(candidate);
    await symlink(outside, path.join(candidate.candidatePath, "linked.txt"));
    for (const [pathValue, errorCode] of [["../outside.txt", "invalid_path"], [".git/config", "protected_path"], ["nested/.GIT/config", "protected_path"]]) {
      await assert.rejects(runRepositoryCandidateFs({ operation: "inspect", ...fields, path: pathValue }),
        { code: errorCode });
    }
    await assert.rejects(runRepositoryCandidateFs({ operation: "inspect", ...fields, path: "linked.txt" }), { code: "symlink" });
    assert.equal(await readFile(outside, "utf8"), "outside unchanged\n");

    await rename(candidate.candidatePath, path.join(candidate.candidateDirectory, "old-worktree"));
    await mkdir(candidate.candidatePath);
    await assert.rejects(runRepositoryCandidateFs({
      operation: "write", ...fields, path: "tracked.txt", expectedSha256: null,
      dataBase64: Buffer.from("no write").toString("base64"), contentSha256: sha256(Buffer.from("no write")),
    }), { code: "candidate_root_changed" });
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("candidate FD post-operation check catches root replacement after its descriptor is opened", async () => {
  const { mkdtemp } = await import("node:fs/promises");
  const scratch = await mkdtemp(path.join(tmpdir(), "cw-private-candidate-root-race-"));
  try {
    const source = path.join(scratch, "source");
    const { baseCommit } = await makeRepository(source);
    const identity = await rootIdentity(source);
    const candidate = await createPrivateRepositoryCandidate({
      sourcePath: identity.path,
      sourceIdentity: identity,
      candidateParent: path.join(scratch, "candidate-store"),
      baseCommit,
    });
    const fields = candidateFsFields(candidate);
    const script = [
      "import importlib.util, json, os, sys",
      "spec = importlib.util.spec_from_file_location('candidate_fs_helper', sys.argv[1])",
      "helper = importlib.util.module_from_spec(spec)",
      "spec.loader.exec_module(helper)",
      "request = json.loads(sys.argv[2])",
      "container_fd, root_fd, staging_fd, root_mount = helper.open_candidate(request)",
      "try:",
      "    os.rename(request['candidatePath'], request['candidatePath'] + '.moved-after-open')",
      "    os.mkdir(request['candidatePath'], 0o700)",
      "    try:",
      "        helper.verify_candidate_names(request, container_fd, root_fd, staging_fd, root_mount)",
      "    except helper.CandidateFsError as error:",
      "        print(error.code)",
      "    else:",
      "        print('replacement_not_detected')",
      "finally:",
      "    os.close(staging_fd)",
      "    os.close(root_fd)",
      "    os.close(container_fd)",
    ].join("\n");
    const helperPath = fileURLToPath(new URL("../runtime/repository-candidate-fs-helper.py", import.meta.url));
    const python = process.env.WORK_AGENT_PYTHON ?? "python3";
    const result = execFileSync(python, ["-c", script, helperPath, JSON.stringify(fields)], { encoding: "utf8" }).trim();
    assert.equal(result, "candidate_root_changed");
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("candidate API rejects UUID versions the private-worktree builder cannot create before recording a receipt", async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const response = await h.api("PUT", `/sessions/${session.id}/repository-candidate`, {
      operation: "create", requestId: "candidate-v7-id", expectedRevision: 0,
      expectedBindingRevision: 0, candidateId: "723e4567-e89b-72d3-a456-426614174000",
      baseCommit: "a".repeat(40),
    });
    assert.equal(response.status, 400);
    assert.equal(response.json.error.code, "invalid_input");
    const persisted = h.runtime.store.getSession(session.id);
    assert.equal(persisted.repositoryCandidate, null);
    assert.equal(persisted.repositoryCandidateCommands.length, 0, "invalid identity is rejected before preparing a durable command");
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("candidate command history rejects overflow without poisoning restart and source revoke remains available", async () => {
  const dataDir = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(path.join(tmpdir(), "cw-candidate-command-cap-")));
  let store;
  try {
    const fixture = await openStoreWithCandidate(dataDir);
    store = fixture.store;
    const state = store.snapshot();
    const row = state.sessions.find(item => item.id === fixture.session.id);
    const now = new Date().toISOString();
    row.repositoryCandidateCommands = Array.from({ length: 511 }, (_, index) => {
      const requestId = `old-create-${index}`;
      const candidateId = `old-candidate-${index}`;
      const baseCommit = "b".repeat(40);
      return {
        requestId, requestHash: sha256(Buffer.from(requestId)), operation: "create", expectedRevision: 0,
        expectedBindingRevision: 1, sourceBindingId: fixture.bound.binding.id, candidateId, baseCommit,
        receipt: { requestId, operation: "create", candidateId, revision: 1, status: "failed",
          sourceBindingId: fixture.bound.binding.id, sourceBindingRevision: 1, baseCommit, failureCode: "creation_failed" },
      };
    });
    await store.close(); store = null;
    const statePath = path.join(dataDir, "runtime-state.json");
    await writeFile(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
    store = await new RuntimeStore({ dataDir }).open();

    const revoked = await store.beginRepositoryCandidate(fixture.session.id, {
      operation: "revoke", requestId: "reserved-revoke", expectedRevision: 1, expectedBindingRevision: 1,
      sourceBindingId: fixture.bound.binding.id, candidateId: fixture.candidateId, baseCommit: "a".repeat(40),
    });
    assert.equal(revoked.receipt.status, "revoked", "the last ledger slot records an active candidate revoke");
    assert.equal(store.getSession(fixture.session.id).repositoryCandidateCommands.length, 512);

    const beforeRejectedCommand = await readFile(statePath);
    await assert.rejects(store.beginRepositoryCandidate(fixture.session.id, {
      operation: "create", requestId: "over-limit-create", expectedRevision: 2, expectedBindingRevision: 1,
      sourceBindingId: fixture.bound.binding.id, candidateId: "523e4567-e89b-42d3-a456-426614174000", baseCommit: "c".repeat(40),
    }), { code: "CANDIDATE_COMMAND_LIMIT" });
    assert.deepEqual(await readFile(statePath), beforeRejectedCommand, "rejected command does not persist an over-limit ledger");
    const sourceRevocation = await store.changeRepositoryBinding(fixture.session.id, {
      operation: "revoke", requestId: "capacity-source-revoke", expectedRevision: 1,
    });
    assert.equal(sourceRevocation.binding.status, "revoked", "source revoke remains available when candidate history is full");
    await store.close(); store = null;
    store = await new RuntimeStore({ dataDir }).open();
    assert.equal(store.getSession(fixture.session.id).repositoryCandidateCommands.length, 512);
    assert.equal(store.getSession(fixture.session.id).repositoryCandidate.status, "revoked");
  } finally {
    await store?.close().catch(() => {});
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("candidate receipt budget preserves NO_ACTIVE_CANDIDATE and refuses a create that would strand revoke", async () => {
  const dataDir = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(path.join(tmpdir(), "cw-candidate-revoke-slot-")));
  let store;
  try {
    const fixture = await openStoreWithCandidate(dataDir, null);
    store = fixture.store;
    const state = store.snapshot();
    const row = state.sessions.find(item => item.id === fixture.session.id);
    row.repositoryCandidateCommands = Array.from({ length: 511 }, (_, index) => {
      const requestId = `prior-failed-create-${index}`;
      const candidateId = `prior-candidate-${index}`;
      const baseCommit = "d".repeat(40);
      return {
        requestId, requestHash: sha256(Buffer.from(requestId)), operation: "create", expectedRevision: 0,
        expectedBindingRevision: 1, sourceBindingId: fixture.bound.binding.id, candidateId, baseCommit,
        receipt: { requestId, operation: "create", candidateId, revision: 1, status: "failed",
          sourceBindingId: fixture.bound.binding.id, sourceBindingRevision: 1, baseCommit, failureCode: "creation_failed" },
      };
    });
    await store.close(); store = null;
    const statePath = path.join(dataDir, "runtime-state.json");
    await writeFile(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
    store = await new RuntimeStore({ dataDir }).open();
    const before = await readFile(statePath);

    await assert.rejects(store.beginRepositoryCandidate(fixture.session.id, {
      operation: "revoke", requestId: "no-active-candidate", expectedRevision: 0, expectedBindingRevision: 1,
      sourceBindingId: fixture.bound.binding.id, candidateId: "missing-candidate", baseCommit: "a".repeat(40),
    }), { code: "NO_ACTIVE_CANDIDATE" }, "operation-specific failure is not hidden by capacity");
    await assert.rejects(store.beginRepositoryCandidate(fixture.session.id, {
      operation: "create", requestId: "stranded-create", expectedRevision: 0, expectedBindingRevision: 1,
      sourceBindingId: fixture.bound.binding.id, candidateId: "623e4567-e89b-42d3-a456-426614174000", baseCommit: "e".repeat(40),
    }), { code: "CANDIDATE_COMMAND_LIMIT" }, "a new candidate cannot consume the receipt reserved for revoke");
    assert.deepEqual(await readFile(statePath), before);
    await store.close(); store = null;
    store = await new RuntimeStore({ dataDir }).open();
    assert.equal(store.getSession(fixture.session.id).repositoryCandidateCommands.length, 511);
    assert.equal(store.getSession(fixture.session.id).repositoryCandidate, null);
  } finally {
    await store?.close().catch(() => {});
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("repository write effect cap rejects before mutation and leaves an openable store", async () => {
  const dataDir = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(path.join(tmpdir(), "cw-candidate-effect-cap-")));
  let store;
  try {
    const fixture = await openStoreWithCandidate(dataDir);
    store = fixture.store;
    const firstRun = await candidateCapacityRun(store, fixture.session, "effect-cap-run-1");
    await store.updateRun(firstRun.run.id, { status: "completed", admissionOpen: false });
    const state = store.snapshot();
    const row = state.sessions.find(item => item.id === fixture.session.id);
    const now = new Date().toISOString();
    const contentSha256 = sha256(Buffer.from("historical failed write"));
    row.repositoryWriteEffects = Array.from({ length: 512 }, (_, index) => {
      const requestId = `old-write-${index}`;
      return {
        effectId: sha256(Buffer.from(`effect-${index}`)), requestHash: sha256(Buffer.from(`request-${index}`)), requestId,
        runId: firstRun.run.id, candidateId: `old-candidate-${index}`, candidateRevision: 1,
        sourceBindingId: fixture.bound.binding.id, sourceBindingRevision: 1, candidateWriteRevision: 0,
        path: `old-${index}.txt`, expectedSha256: null, before: { present: false }, contentSha256, bytes: 1,
        contentRef: null, status: "failed", createdAt: now, settledAt: now, result: null,
        failure: { code: "write_failed", message: "synthetic prior failure" },
      };
    });
    await store.close(); store = null;
    const statePath = path.join(dataDir, "runtime-state.json");
    await writeFile(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
    store = await new RuntimeStore({ dataDir }).open();
    const run = await candidateCapacityRun(store, fixture.session, "effect-cap-run-2");
    const input = { requestId: "write-over-effect-cap", candidateId: fixture.candidateId, candidateRevision: 1,
      sourceBindingId: fixture.bound.binding.id, sourceBindingRevision: 1, candidateWriteRevision: 0,
      path: "new.txt", expectedSha256: null, before: { present: false }, contentSha256: sha256(Buffer.from("new")), bytes: 3 };
    const beforeRejectedWrite = await readFile(statePath);
    assert.throws(() => store.assertRepositoryWriteCapacity(fixture.session.id, -1), { code: "INVALID_RECEIPT" });
    await assert.rejects(store.prepareRepositoryWrite(run.run.id, { ...input, requestId: "negative-byte-write", bytes: -1 }), { code: "INVALID_RECEIPT" });
    assert.deepEqual(await readFile(statePath), beforeRejectedWrite, "an invalid byte count cannot persist a write receipt");
    assert.throws(() => store.assertRepositoryWriteCapacity(fixture.session.id, input.bytes), { code: "WRITE_EFFECT_LIMIT" });
    await assert.rejects(store.prepareRepositoryWrite(run.run.id, input), { code: "WRITE_EFFECT_LIMIT" });
    assert.deepEqual(await readFile(statePath), beforeRejectedWrite, "rejected write does not persist a 513th effect");
    await store.close(); store = null;
    store = await new RuntimeStore({ dataDir }).open();
    assert.equal(store.getSession(fixture.session.id).repositoryWriteEffects.length, 512);
  } finally {
    await store?.close().catch(() => {});
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("repository retained-payload cap rejects a write from a later candidate", async () => {
  const dataDir = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(path.join(tmpdir(), "cw-candidate-payload-cap-")));
  let store;
  try {
    const fixture = await openStoreWithCandidate(dataDir);
    store = fixture.store;
    const firstRun = await candidateCapacityRun(store, fixture.session, "payload-cap-run-1");
    await store.updateRun(firstRun.run.id, { status: "completed", admissionOpen: false });
    const state = store.snapshot();
    const row = state.sessions.find(item => item.id === fixture.session.id);
    const now = new Date().toISOString();
    const content = Buffer.alloc(4 * 1024 * 1024, 0x61);
    const contentSha256 = sha256(content);
    row.repositoryWriteEffects = Array.from({ length: 16 }, (_, index) => {
      const effectId = sha256(Buffer.from(`unknown-effect-${index}`));
      return {
        effectId, requestHash: sha256(Buffer.from(`unknown-request-hash-${index}`)), requestId: `unknown-write-${index}`,
        runId: firstRun.run.id, candidateId: `previous-candidate-${index}`, candidateRevision: 1,
        sourceBindingId: fixture.bound.binding.id, sourceBindingRevision: 1, candidateWriteRevision: 0,
        path: `unknown-${index}.txt`, expectedSha256: null, before: { present: false }, contentSha256, bytes: content.length,
        contentRef: `effect-${effectId}.payload`, status: "unknown", createdAt: now, settledAt: now, result: null,
        failure: { code: "write_outcome_unknown", message: "synthetic retained payload" },
      };
    });
    await store.close(); store = null;
    const statePath = path.join(dataDir, "runtime-state.json");
    await writeFile(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
    store = await new RuntimeStore({ dataDir }).open();
    const run = await candidateCapacityRun(store, fixture.session, "payload-cap-run-2");
    const input = { requestId: "write-over-payload-cap", candidateId: fixture.candidateId, candidateRevision: 1,
      sourceBindingId: fixture.bound.binding.id, sourceBindingRevision: 1, candidateWriteRevision: 0,
      path: "new.txt", expectedSha256: null, before: { present: false }, contentSha256: sha256(Buffer.from("new")), bytes: 3 };
    const beforeRejectedWrite = await readFile(statePath);
    assert.throws(() => store.assertRepositoryWriteCapacity(fixture.session.id, input.bytes), { code: "RETAINED_PAYLOAD_LIMIT" });
    await assert.rejects(store.prepareRepositoryWrite(run.run.id, input), { code: "RETAINED_PAYLOAD_LIMIT" });
    assert.deepEqual(await readFile(statePath), beforeRejectedWrite, "rejected write leaves 64 MiB recovery payload ledger intact");
    await store.close(); store = null;
    store = await new RuntimeStore({ dataDir }).open();
    assert.equal(store.getSession(fixture.session.id).repositoryWriteEffects.reduce((total, effect) => total + effect.bytes, 0), 64 * 1024 * 1024);
  } finally {
    await store?.close().catch(() => {});
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("schema17 candidate API keeps source reads separate, asks before writes, records receipts, and revokes Run access", async () => {
  const h = await boot();
  const source = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(path.join(tmpdir(), "cw-candidate-api-source-")));
  try {
    const { baseCommit } = await makeRepository(source, { dirty: true });
    const original = await readFile(path.join(source, "tracked.txt"));
    const dirtyReadme = await readFile(path.join(source, "README.md"));
    const session = await h.createSession({ permissionMode: "ask" });
    const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, {
      operation: "bind", requestId: "candidate-api-bind", expectedRevision: 0, rootPath: source,
    });
    assert.equal(bound.status, 200, JSON.stringify(bound.json));
    const candidateId = "223e4567-e89b-42d3-a456-426614174000";
    const createBody = { operation: "create", requestId: "candidate-api-create", expectedRevision: 0,
      expectedBindingRevision: 1, candidateId, baseCommit };
    const created = await h.api("PUT", `/sessions/${session.id}/repository-candidate`, createBody);
    assert.equal(created.status, 200, JSON.stringify(created.json));
    assert.equal(created.json.candidate.status, "active");
    assert.equal(created.json.candidate.baseCommit, baseCommit);
    const sessionView = (await h.api("GET", `/sessions/${session.id}`)).json;
    assert.equal(sessionView.session.repositoryCandidate.id, candidateId);
    for (const field of ["candidatePath", "candidateDirectory", "gitDirectory", "stagingDevice", "stagingInode", "containerDevice", "containerInode"]) {
      assert.equal(Object.hasOwn(sessionView.session.repositoryCandidate, field), false, `Session API must not disclose ${field}`);
    }
    const createReplay = await h.api("PUT", `/sessions/${session.id}/repository-candidate`, createBody);
    assert.equal(createReplay.status, 200);
    assert.equal(createReplay.json.idempotent, true);

    const control = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
    for (const name of ["repo_list", "repo_read", "repo_grep", "candidate_list", "candidate_read", "candidate_grep", "repo_write", "repo_diff"]) {
      assert.equal(control.resources.find(resource => resource.id === `tool:${name}`).exposed, true, name);
    }

    const run = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "candidate-tools-allow",
      input: h.scriptInput([
        { name: "repo_read", arguments: { path: "README.md" } },
        { name: "candidate_list", arguments: { path: "." } },
        { name: "candidate_read", arguments: { path: "tracked.txt" } },
        { name: "candidate_grep", arguments: { pattern: "base committed", path: "." } },
        { name: "repo_write", arguments: { path: "tracked.txt", expectedSha256: sha256(original), text: "edited in private candidate\n" } },
        { name: "repo_diff", arguments: {} },
      ]),
    });
    assert.equal(run.status, 200, JSON.stringify(run.json));
    assert.equal(run.json.run.repositoryCandidateSnapshot.id, candidateId);
    assert.equal(Object.hasOwn(run.json.run.repositoryCandidateSnapshot, "candidatePath"), false, "Run API must not disclose the Host candidate path");
    assert.equal((await h.pollRun(run.json.run.id, { until: status => status === "waiting_user" || status === "completed" || status === "failed" || status === "unknown" })).status, "waiting_user");
    const permission = h.runtime.store.snapshot().questions.find(question => question.runId === run.json.run.id && question.status === "pending");
    assert.equal(permission.kind, "permission");
    assert.equal(permission.payload.tool, "repo_write");
    assert.equal(permission.payload.path, "tracked.txt");
    assert.equal(permission.payload.contentSha256, sha256(Buffer.from("edited in private candidate\n")), "approval hashes the exact file text");
    assert.equal(permission.payload.bytes, Buffer.byteLength("edited in private candidate\n"));
    assert.equal(permission.payload.preview, "edited in private candidate\n");
    assert.equal(permission.payload.candidateId, candidateId);
    assert.equal(permission.payload.candidateRevision, 1);
    assert.equal(permission.payload.candidateWriteRevision, 0);
    assert.equal(permission.payload.sourceBindingId, bound.json.binding.id);
    assert.equal(permission.payload.sourceBindingRevision, 1);
    assert.equal(permission.payload.expectedSha256, sha256(original));
    const allowed = await h.api("POST", `/runs/${run.json.run.id}/questions/${permission.id}`, {
      decision: "allow", expectedToolCallId: permission.payload.toolCallId, expectedContentSha256: permission.payload.contentSha256,
    });
    assert.equal(allowed.status, 200);
    const completed = await h.pollRun(run.json.run.id);
    assert.equal(completed.status, "completed", JSON.stringify(completed.error));
    const activeCandidate = h.runtime.service.store.getSession(session.id).repositoryCandidate;
    assert.equal(await readFile(path.join(activeCandidate.candidatePath, "tracked.txt"), "utf8"), "edited in private candidate\n");
    assert.deepEqual(await readFile(path.join(source, "tracked.txt")), original, "the arbitrary source checkout remains unchanged");
    assert.equal(activeCandidate.writeRevision, 1);
    const effects = h.runtime.store.getSession(session.id).repositoryWriteEffects;
    assert.equal(effects.length, 1);
    assert.equal(effects[0].status, "confirmed");
    assert.equal(effects[0].contentSha256, sha256(Buffer.from("edited in private candidate\n")));
    assert.equal(effects[0].result.writeRevision, 1);

    const diffResponse = await h.api("GET", `/sessions/${session.id}/repository-candidate/diff`);
    assert.equal(diffResponse.status, 200, JSON.stringify(diffResponse.json));
    assert.equal(diffResponse.json.schemaVersion, 1);
    assert.equal(diffResponse.json.candidateId, candidateId);
    assert.equal(diffResponse.json.baseCommit, baseCommit);
    assert.equal(diffResponse.json.writeRevision, 1);
    const diffFile = diffResponse.json.files.find(file => file.path === "tracked.txt");
    assert.ok(diffFile, "diff lists the written path");
    assert.equal(diffFile.status, "modified");
    assert.equal(diffFile.beforeSha256, sha256(original));
    assert.equal(diffFile.sha256, sha256(Buffer.from("edited in private candidate\n")));
    assert.ok(diffResponse.json.patch.includes("edited in private candidate"), "patch contains the written text");
    assert.equal(diffResponse.json.patchSha256, sha256(Buffer.from(diffResponse.json.patch, "utf8")));
    assert.equal(diffResponse.json.patchBytes, Buffer.byteLength(diffResponse.json.patch, "utf8"));
    assert.equal(diffResponse.json.truncated, false);

    const effectsResponse = await h.api("GET", `/sessions/${session.id}/repository-candidate/effects`);
    assert.equal(effectsResponse.status, 200, JSON.stringify(effectsResponse.json));
    assert.equal(effectsResponse.json.schemaVersion, 1);
    assert.equal(effectsResponse.json.candidateId, candidateId);
    assert.equal(effectsResponse.json.effects.length, 1);
    const effectView = effectsResponse.json.effects[0];
    assert.equal(effectView.path, "tracked.txt");
    assert.equal(effectView.status, "confirmed");
    assert.equal(effectView.contentSha256, sha256(Buffer.from("edited in private candidate\n")));
    assert.equal(effectView.writeRevision, 1);
    assert.equal(Object.hasOwn(effectView, "contentRef"), false, "effects view must not disclose contentRef");
    assert.equal(JSON.stringify(effectsResponse.json).includes("contentRef"), false, "no contentRef anywhere in the effects JSON");

    // The plain session read shares the same boundary: neither the candidate's
    // Host filesystem identity nor the write effect's ArtifactHistory pointer
    // may leave the Host through GET /sessions/:id either.
    const sessionAfterWrite = await h.api("GET", `/sessions/${session.id}`);
    assert.equal(sessionAfterWrite.status, 200);
    const sessionJson = JSON.stringify(sessionAfterWrite.json);
    for (const leaked of ["candidatePath", "candidateDirectory", "gitDirectory", "contentRef"]) {
      assert.equal(sessionJson.includes(leaked), false, `GET /sessions/:id must not disclose ${leaked}`);
    }

    const events = (await h.api("GET", `/sessions/${session.id}/events`)).json.events;
    assert.ok(events.some(event => event.type === "repository.read" && event.data.path === "README.md" && event.data.sources[0].sha256 === sha256(dirtyReadme)), "source repo_read remains bound to the original dirty checkout");
    assert.ok(events.some(event => event.type === "repository.candidate.read" && event.data.operation === "diff"));
    assert.ok(events.some(event => event.type === "repository.write.confirmed" && event.data.effectId === effects[0].effectId));

    const deniedRun = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "candidate-tools-deny",
      input: h.scriptInput([{ name: "repo_write", arguments: { path: "new.txt", text: "must stay absent\n" } }]),
    });
    await h.pollRun(deniedRun.json.run.id, { until: status => status === "waiting_user" || status === "completed" || status === "failed" || status === "unknown" });
    const deniedQuestion = h.runtime.store.snapshot().questions.find(question => question.runId === deniedRun.json.run.id && question.status === "pending");
    assert.ok(deniedQuestion);
    await h.api("POST", `/runs/${deniedRun.json.run.id}/questions/${deniedQuestion.id}`, {
      decision: "deny", expectedToolCallId: deniedQuestion.payload.toolCallId, expectedContentSha256: deniedQuestion.payload.contentSha256,
    });
    assert.equal((await h.pollRun(deniedRun.json.run.id)).status, "completed");
    await assert.rejects(readFile(path.join(activeCandidate.candidatePath, "new.txt")), { code: "ENOENT" });
    assert.equal(h.runtime.store.getSession(session.id).repositoryWriteEffects.length, 1, "a denied permission never prepares an effect");

    const conflictRun = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "candidate-write-conflict",
      input: h.scriptInput([{ name: "repo_write", arguments: { path: "tracked.txt", expectedSha256: sha256(Buffer.from("edited in private candidate\n")), text: "approval becomes stale\n" } }]),
    });
    await h.pollRun(conflictRun.json.run.id, { until: status => status === "waiting_user" || status === "completed" || status === "failed" || status === "unknown" });
    const conflictQuestion = h.runtime.store.snapshot().questions.find(question => question.runId === conflictRun.json.run.id && question.status === "pending");
    assert.ok(conflictQuestion);
    await writeFile(path.join(activeCandidate.candidatePath, "tracked.txt"), "a concurrent edit after the approval question\n");
    await h.api("POST", `/runs/${conflictRun.json.run.id}/questions/${conflictQuestion.id}`, {
      decision: "allow", expectedToolCallId: conflictQuestion.payload.toolCallId, expectedContentSha256: conflictQuestion.payload.contentSha256,
    });
    assert.equal((await h.pollRun(conflictRun.json.run.id)).status, "completed");
    assert.equal(await readFile(path.join(activeCandidate.candidatePath, "tracked.txt"), "utf8"), "a concurrent edit after the approval question\n");
    assert.equal(h.runtime.store.getSession(session.id).repositoryWriteEffects.length, 1, "a stale approved hash is rejected before a prepared effect");

    const waiting = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "candidate-revoke-wait",
      input: h.scriptInput([{ name: "repo_write", arguments: { path: "new.txt", text: "revoked before write\n" } }]),
    });
    await h.pollRun(waiting.json.run.id, { until: status => status === "waiting_user" || status === "completed" || status === "failed" || status === "unknown" });
    const candidateRevokeBody = {
      operation: "revoke", requestId: "candidate-api-revoke", expectedRevision: 1, expectedBindingRevision: 1, candidateId,
    };
    const revoke = await h.api("PUT", `/sessions/${session.id}/repository-candidate`, candidateRevokeBody);
    assert.equal(revoke.status, 200, JSON.stringify(revoke.json));
    assert.equal(revoke.json.candidate.status, "revoked");
    assert.equal(revoke.json.candidate.revision, 2);
    assert.equal((await h.pollRun(waiting.json.run.id)).status, "cancelled");
    const afterRevokeControl = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
    for (const name of ["candidate_list", "candidate_read", "candidate_grep", "repo_write", "repo_diff"]) {
      assert.equal(afterRevokeControl.resources.find(resource => resource.id === `tool:${name}`).exposed, false, name);
    }
    for (const name of ["repo_list", "repo_read", "repo_grep"]) {
      assert.equal(afterRevokeControl.resources.find(resource => resource.id === `tool:${name}`).exposed, true, name);
    }

    const secondCandidateId = "423e4567-e89b-42d3-a456-426614174000";
    const secondBaseCommit = git(source, ["rev-parse", "HEAD"]);
    const secondCandidate = await h.api("PUT", `/sessions/${session.id}/repository-candidate`, {
      operation: "create", requestId: "candidate-api-create-again", expectedRevision: 2, expectedBindingRevision: 1,
      candidateId: secondCandidateId, baseCommit: secondBaseCommit,
    });
    assert.equal(secondCandidate.status, 200, JSON.stringify(secondCandidate.json));
    const sourceRevokeRun = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "source-revoke-cascades-candidate",
      input: h.scriptInput([{ name: "ask_user", arguments: { prompt: "hold while the source binding is revoked" } }]),
    });
    await h.pollRun(sourceRevokeRun.json.run.id, { until: status => status === "waiting_user" });
    const sourceRevoked = await h.api("PUT", `/sessions/${session.id}/repository-binding`, {
      operation: "revoke", requestId: "candidate-api-source-revoke", expectedRevision: 1,
    });
    assert.equal(sourceRevoked.status, 200, JSON.stringify(sourceRevoked.json));
    assert.equal((await h.pollRun(sourceRevokeRun.json.run.id)).status, "cancelled");
    const afterSourceRevoke = h.runtime.store.getSession(session.id);
    assert.equal(afterSourceRevoke.repositoryBinding.status, "revoked");
    assert.equal(afterSourceRevoke.repositoryCandidate.status, "revoked");
    assert.equal(afterSourceRevoke.repositoryCandidate.revision, 4);
    const sourceRevokedControl = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
    for (const name of ["repo_list", "repo_read", "repo_grep", "candidate_list", "candidate_read", "candidate_grep", "repo_write", "repo_diff"]) {
      assert.equal(sourceRevokedControl.resources.find(resource => resource.id === `tool:${name}`).exposed, false, name);
    }
    const rebound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, {
      operation: "bind", requestId: "candidate-api-rebind", expectedRevision: 2, rootPath: source,
    });
    assert.equal(rebound.status, 200, JSON.stringify(rebound.json));
    const createReplayAfterRebind = await h.api("PUT", `/sessions/${session.id}/repository-candidate`, createBody);
    assert.equal(createReplayAfterRebind.status, 200, JSON.stringify(createReplayAfterRebind.json));
    assert.equal(createReplayAfterRebind.json.idempotent, true);
    assert.equal(createReplayAfterRebind.json.receipt.candidateId, candidateId);
    const revokeReplayAfterRebind = await h.api("PUT", `/sessions/${session.id}/repository-candidate`, candidateRevokeBody);
    assert.equal(revokeReplayAfterRebind.status, 200, JSON.stringify(revokeReplayAfterRebind.json));
    assert.equal(revokeReplayAfterRebind.json.idempotent, true);
    assert.equal(revokeReplayAfterRebind.json.receipt.candidateId, candidateId);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
    await rm(source, { recursive: true, force: true });
  }
});

test("human candidate diff route requires an active candidate and the work token", async () => {
  const h = await boot();
  try {
    const session = await h.createSession({ permissionMode: "ask" });
    const beforeCandidate = await h.api("GET", `/sessions/${session.id}/repository-candidate/diff`);
    assert.equal(beforeCandidate.status, 409, JSON.stringify(beforeCandidate.json));
    assert.equal(beforeCandidate.json.error.code, "no_repository_candidate");

    const unauthorized = await fetch(h.runtime.url + `/api/v5/sessions/${session.id}/repository-candidate/diff`);
    assert.equal(unauthorized.status, 401);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("candidate_grep and repo_diff exclude a candidate_read-denied file, counting it without naming it", async () => {
  const h = await boot();
  const source = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(path.join(tmpdir(), "cw-candidate-grep-deny-source-")));
  try {
    const { baseCommit } = await makeRepository(source);
    const session = await h.createSession();
    const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, {
      operation: "bind", requestId: "candidate-grep-deny-bind", expectedRevision: 0, rootPath: source,
    });
    assert.equal(bound.status, 200, JSON.stringify(bound.json));
    const candidateId = "523e4567-e89b-42d3-a456-426614174000";
    const created = await h.api("PUT", `/sessions/${session.id}/repository-candidate`, {
      operation: "create", requestId: "candidate-grep-deny-create", expectedRevision: 0,
      expectedBindingRevision: 1, candidateId, baseCommit,
    });
    assert.equal(created.status, 200, JSON.stringify(created.json));

    const writeRun = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "candidate-grep-deny-write",
      input: h.scriptInput([
        { name: "repo_write", arguments: { path: "a.txt", text: "SENTINEL in the open file\n" } },
        { name: "repo_write", arguments: { path: "secret.txt", text: "SENTINEL in the private file\n" } },
      ]),
    });
    assert.equal(writeRun.status, 200, JSON.stringify(writeRun.json));
    assert.equal((await h.pollRun(writeRun.json.run.id)).status, "completed", JSON.stringify((await h.api("GET", `/runs/${writeRun.json.run.id}`)).json.run.error));

    const control = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
    // A single candidate_read rule must also exclude the file from
    // candidate_grep and repo_diff, because the effective per-file effect is
    // the strictest of the aggregate tool's own rule and the corresponding
    // single-file read rule (candidate_read).
    const policy = await h.api("PUT", `/runtime-control?sessionId=${session.id}`, {
      revision: control.revision, operation: "policy", scope: { type: "session", id: session.id },
      rules: [{ action: "candidate_read", resource: "secret.txt", effect: "deny" }],
    });
    assert.equal(policy.status, 200, JSON.stringify(policy.json));

    const run = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "candidate-grep-deny-run",
      input: h.scriptInput([
        { name: "candidate_grep", arguments: { pattern: "SENTINEL", path: "." } },
        { name: "repo_diff", arguments: {} },
      ]),
    });
    assert.equal(run.status, 200, JSON.stringify(run.json));
    assert.equal((await h.pollRun(run.json.run.id)).status, "completed");

    const events = (await h.api("GET", `/sessions/${session.id}/events`)).json.events;
    const grepResult = events.find(event => event.runId === run.json.run.id && event.type === "tool.result" && event.data.name === "candidate_grep");
    assert.equal(grepResult?.data.isError, false, JSON.stringify(grepResult));
    const grepPayload = JSON.parse(grepResult.data.text);
    assert.deepEqual(grepPayload.matches.map(match => match.path), ["a.txt"]);
    assert.equal(grepPayload.excludedByPolicy, 1);
    assert.equal(grepPayload.excludedPendingApproval, 0);

    const diffResult = events.find(event => event.runId === run.json.run.id && event.type === "tool.result" && event.data.name === "repo_diff");
    assert.equal(diffResult?.data.isError, false, JSON.stringify(diffResult));
    const diffPayload = JSON.parse(diffResult.data.text);
    assert.deepEqual(diffPayload.files.map(file => file.path), ["a.txt"]);
    assert.equal(diffPayload.excludedByPolicy, 1);
    assert.equal(diffPayload.excludedPendingApproval, 0);
    assert.equal(diffPayload.patch.includes("secret.txt"), false, "an excluded file's path never reaches the disclosed patch");
    assert.equal(diffPayload.patch.includes("SENTINEL in the private file"), false, "an excluded file's content never reaches the disclosed patch");
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
    await rm(source, { recursive: true, force: true });
  }
});

test("source binding replacement requires an active private candidate to be revoked first", async () => {
  const h = await boot();
  const sources = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(path.join(tmpdir(), "cw-candidate-rebind-")));
  const sourceA = path.join(sources, "source-a");
  const sourceB = path.join(sources, "source-b");
  try {
    const { baseCommit } = await makeRepository(sourceA);
    await makeRepository(sourceB);
    const session = await h.createSession();
    const boundA = await h.api("PUT", `/sessions/${session.id}/repository-binding`, {
      operation: "bind", requestId: "candidate-rebind-source-a", expectedRevision: 0, rootPath: sourceA,
    });
    assert.equal(boundA.status, 200, JSON.stringify(boundA.json));
    const candidateId = "523e4567-e89b-42d3-a456-426614174000";
    const created = await h.api("PUT", `/sessions/${session.id}/repository-candidate`, {
      operation: "create", requestId: "candidate-rebind-create", expectedRevision: 0,
      expectedBindingRevision: 1, candidateId, baseCommit,
    });
    assert.equal(created.status, 200, JSON.stringify(created.json));

    const replacement = { operation: "bind", requestId: "candidate-rebind-source-b", expectedRevision: 1, rootPath: sourceB };
    const blocked = await h.api("PUT", `/sessions/${session.id}/repository-binding`, replacement);
    assert.equal(blocked.status, 409);
    assert.equal(blocked.json.error.code, "repository_candidate_active");
    assert.equal((await h.api("GET", `/sessions/${session.id}/repository-binding`)).json.binding.id, boundA.json.binding.id);
    assert.equal((await h.api("GET", `/sessions/${session.id}/repository-candidate`)).json.candidate.status, "active");

    const revoked = await h.api("PUT", `/sessions/${session.id}/repository-candidate`, {
      operation: "revoke", requestId: "candidate-rebind-revoke", expectedRevision: 1,
      expectedBindingRevision: 1, candidateId,
    });
    assert.equal(revoked.status, 200, JSON.stringify(revoked.json));
    assert.equal(revoked.json.candidate.status, "revoked");
    const rebound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, replacement);
    assert.equal(rebound.status, 200, JSON.stringify(rebound.json));
    assert.equal(rebound.json.binding.status, "active");
    assert.equal(rebound.json.binding.rootPath, await realpath(sourceB));
    assert.equal((await h.api("GET", `/sessions/${session.id}/repository-candidate`)).json.candidate.status, "revoked");
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
    await rm(sources, { recursive: true, force: true });
  }
});

test("confirmed candidate write replay returns its stored receipt without reapplying stale expected state", async () => {
  const firstWrite = { path: "tracked.txt", expectedSha256: sha256(Buffer.from("base committed bytes\n")), text: "one committed candidate edit\n" };
  const laterWrite = { path: "tracked.txt", expectedSha256: sha256(Buffer.from(firstWrite.text)), text: "a later distinct candidate edit\n" };
  const fakeResponder = ({ body, mode, requestNumber }) => {
    if (mode !== "/fixture replay-candidate-write") return null;
    const messages = body.messages ?? [];
    let lastUser = -1;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "user") { lastUser = index; break; }
    }
    const toolResults = messages.slice(lastUser + 1).filter(message => message?.role === "tool").length;
    if (toolResults === 0 || toolResults === 2) return { kind: "tool", id: `replay-${requestNumber}`, created: 1,
      toolCallId: "same-candidate-write-call", name: "repo_write", arguments: firstWrite };
    if (toolResults === 1) return { kind: "tool", id: `replay-${requestNumber}`, created: 1,
      toolCallId: "later-candidate-write-call", name: "repo_write", arguments: laterWrite };
    return { kind: "text", id: `replay-${requestNumber}`, created: 1, text: "the confirmed receipt was replayed" };
  };
  const h = await boot({ fakeResponder });
  const source = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(path.join(tmpdir(), "cw-candidate-replay-source-")));
  try {
    const { baseCommit } = await makeRepository(source);
    const session = await h.createSession({ permissionMode: "draft" });
    const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, {
      operation: "bind", requestId: "candidate-replay-bind", expectedRevision: 0, rootPath: source,
    });
    assert.equal(bound.status, 200, JSON.stringify(bound.json));
    const candidateId = "323e4567-e89b-42d3-a456-426614174000";
    const created = await h.api("PUT", `/sessions/${session.id}/repository-candidate`, {
      operation: "create", requestId: "candidate-replay-create", expectedRevision: 0,
      expectedBindingRevision: 1, candidateId, baseCommit,
    });
    assert.equal(created.status, 200, JSON.stringify(created.json));

    const started = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "candidate-replay-run", input: "/fixture replay-candidate-write",
    });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    const finished = await h.pollRun(started.json.run.id);
    assert.equal(finished.status, "completed", JSON.stringify(finished.error));
    const results = (await h.api("GET", `/sessions/${session.id}/events`)).json.events
      .filter(event => event.runId === started.json.run.id && event.type === "tool.result" && event.data.name === "repo_write");
    assert.equal(results.length, 3);
    assert.ok(results.every(result => result.data.isError === false), JSON.stringify(results.map(result => result.data)));
    assert.equal(results[0].data.text, results[2].data.text, "older duplicate call receives its original confirmed receipt after a later write");
    assert.notEqual(results[0].data.text, results[1].data.text);
    const sessionState = h.runtime.store.getSession(session.id);
    assert.equal(sessionState.repositoryWriteEffects.length, 2);
    assert.equal(sessionState.repositoryWriteEffects[0].status, "confirmed");
    assert.equal(sessionState.repositoryWriteEffects[0].result.writeRevision, 1);
    assert.equal(sessionState.repositoryWriteEffects[1].status, "confirmed");
    assert.equal(sessionState.repositoryWriteEffects[1].result.writeRevision, 2);
    const candidate = sessionState.repositoryCandidate;
    assert.equal(candidate.writeRevision, 2, "replaying the older receipt leaves the current candidate revision unchanged");
    assert.equal(await readFile(path.join(candidate.candidatePath, "tracked.txt"), "utf8"), laterWrite.text);
    assert.deepEqual(await readFile(path.join(source, "tracked.txt")), Buffer.from("base committed bytes\n"));
  } finally {
    await h.runtime.close();
    await rm(source, { recursive: true, force: true });
  }
});

test("schema16 migrates into schema17 without losing source binding snapshots", async () => {
  const dataDir = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(path.join(tmpdir(), "cw-candidate-schema16-")));
  const legacyDir = path.join(dataDir, "schema16");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(legacyDir));
  const source = path.join(dataDir, "source");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(source));
  let store;
  let upgraded;
  try {
    store = await new RuntimeStore({ dataDir: legacyDir }).open();
    const project = await store.createProject("schema16 fixture");
    const session = await store.createSession({ projectId: project.id, title: "schema16", workspaceDir: path.join(dataDir, "managed") });
    const resolvedRoot = await inspectRepositoryRoot(source);
    const bound = await store.changeRepositoryBinding(session.id, { operation: "bind", requestId: "schema16-bind", expectedRevision: 0, rootPath: source, resolvedRoot });
    const provider = { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions", realProvider: false };
    const run = await store.createRun({ sessionId: session.id, input: "schema16 snapshot", adapterId: "fixture", provider, commandId: "schema16-run", credentialGeneration: 0, expectedRepositoryBindingRevision: 1 });
    await store.updateRun(run.run.id, { status: "completed", admissionOpen: false });
    const schema16 = store.snapshot();
    schema16.schemaVersion = 16;
    for (const row of schema16.sessions) for (const key of ["repositoryCandidate", "repositoryCandidateRevision", "repositoryCandidateCommands", "repositoryWriteEffects"]) delete row[key];
    for (const row of schema16.runs) delete row.repositoryCandidateSnapshot;
    delete schema16.operations; schema16.sessions.forEach(session => { delete session.remoteBinding; delete session.remoteActions; }); schema16.runs.forEach(run => { delete run.remoteBinding; }); // schema 18 · not part of a true schema-16 file
    await store.close(); store = null;
    const { writeFile, readFile } = await import("node:fs/promises");
    const bytes = Buffer.from(JSON.stringify(schema16, null, 2));
    await writeFile(path.join(legacyDir, "runtime-state.json"), bytes, { mode: 0o600 });
    upgraded = await new RuntimeStore({ dataDir: legacyDir }).open();
    assert.equal(upgraded.snapshot().schemaVersion, 19);
    assert.equal(upgraded.getSession(session.id).repositoryBinding.id, bound.binding.id);
    assert.equal(upgraded.getSession(session.id).repositoryCandidate, null);
    assert.equal(upgraded.getSession(session.id).repositoryCandidateRevision, 0);
    assert.deepEqual(upgraded.getSession(session.id).repositoryCandidateCommands, []);
    assert.deepEqual(upgraded.getSession(session.id).repositoryWriteEffects, []);
    assert.equal(upgraded.getRun(run.run.id).repositoryBindingSnapshot.id, upgraded.getSession(session.id).repositoryBinding.id);
    assert.equal(upgraded.getRun(run.run.id).repositoryCandidateSnapshot, null);
    const backupName = (await import("node:fs/promises").then(({ readdir }) => readdir(legacyDir))).find(name => name.startsWith("runtime-state.schema16."));
    assert.ok(backupName);
    assert.deepEqual(await readFile(path.join(legacyDir, backupName)), bytes, "schema16 backup is byte-exact");
  } finally {
    await store?.close().catch(() => {});
    await upgraded?.close().catch(() => {});
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("prepared repository writes become unknown after restart and are never replayed", async () => {
  const dataDir = await import("node:fs/promises").then(({ mkdtemp }) => mkdtemp(path.join(tmpdir(), "cw-candidate-unknown-restart-")));
  const source = path.join(dataDir, "source");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(source));
  let store;
  let restarted;
  try {
    store = await new RuntimeStore({ dataDir }).open();
    const project = await store.createProject("unknown effect fixture");
    const session = await store.createSession({ projectId: project.id, title: "unknown effect", workspaceDir: path.join(dataDir, "managed") });
    const resolvedRoot = await inspectRepositoryRoot(source);
    await store.changeRepositoryBinding(session.id, { operation: "bind", requestId: "unknown-bind", expectedRevision: 0, rootPath: source, resolvedRoot });
    const candidateId = "323e4567-e89b-42d3-a456-426614174000";
    const candidateRequest = { operation: "create", requestId: "unknown-create", expectedRevision: 0, expectedBindingRevision: 1,
      sourceBindingId: store.getSession(session.id).repositoryBinding.id, candidateId, baseCommit: "a".repeat(40) };
    await store.beginRepositoryCandidate(session.id, candidateRequest);
    const candidateParent = path.join(dataDir, "candidate-container");
    const candidate = { objectFormat: "sha1", candidatePath: path.join(candidateParent, "worktree"), candidateDevice: "1", candidateInode: "2",
      candidateDirectory: candidateParent, candidateContainerDevice: "1", candidateContainerInode: "3", stagingDevice: "1", stagingInode: "4",
      gitDirectory: path.join(candidateParent, "git"), gitDevice: "1", gitInode: "5", gitVersion: "git version 2.fixture" };
    await store.activateRepositoryCandidate(session.id, { requestId: candidateRequest.requestId, candidate });
    const provider = { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions", realProvider: false };
    const run = await store.createRun({ sessionId: session.id, input: "prepare then restart", adapterId: "fixture", provider, commandId: "unknown-run", credentialGeneration: 0, expectedRepositoryBindingRevision: 1, expectedRepositoryCandidateRevision: 1 });
    const content = Buffer.from("possible candidate write\n");
    const prepared = await store.prepareRepositoryWrite(run.run.id, {
      requestId: "unknown-write", candidateId, candidateRevision: 1, sourceBindingId: candidateRequest.sourceBindingId,
      sourceBindingRevision: 1, candidateWriteRevision: 0, path: "new.txt", expectedSha256: null,
      before: { present: false }, contentSha256: sha256(content), bytes: content.length,
    });
    assert.equal(prepared.effect.status, "prepared");
    await store.close(); store = null;
    restarted = await new RuntimeStore({ dataDir }).open();
    const effect = restarted.getRepositoryWriteEffect(session.id, "unknown-write");
    assert.equal(effect.status, "unknown");
    assert.equal(effect.failure.code, "effect_unknown_after_restart");
    assert.equal(restarted.getRun(run.run.id).status, "unknown");
    assert.equal(restarted.getRun(run.run.id).admissionOpen, false);
    assert.ok(restarted.listEvents({ sessionId: session.id, runId: run.run.id }).some(event => event.type === "repository.write.unknown" && event.data.effectId === prepared.effect.effectId));
    const duplicate = await restarted.prepareRepositoryWrite(run.run.id, {
      requestId: "unknown-write", candidateId, candidateRevision: 1, sourceBindingId: candidateRequest.sourceBindingId,
      sourceBindingRevision: 1, candidateWriteRevision: 0, path: "new.txt", expectedSha256: null,
      before: { present: false }, contentSha256: sha256(content), bytes: content.length,
    });
    assert.equal(duplicate.idempotent, true);
    assert.equal(duplicate.effect.status, "unknown", "idempotent lookup returns the receipt and never creates a second effect");
    assert.equal(restarted.getSession(session.id).repositoryWriteEffects.length, 1);
  } finally {
    await store?.close().catch(() => {});
    await restarted?.close().catch(() => {});
    await rm(dataDir, { recursive: true, force: true });
  }
});
