import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, symlink, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { resolveWorkspacePath, createWsReadTool, createWsGrepTool, MAX_GREP_PATTERN_CHARS } from "../runtime/workspace-tools.mjs";
import { boot } from "./helpers.mjs";

// T-WS-1..4: the path guard rejects `..`, absolute paths, symlink escapes,
// and over-limit files, all as isError tool results (not thrown exceptions
// that would crash the run).

test("T-WS-1: '..' path segments are rejected", async () => {
  const workspaceDir = await mkdtemp(path.join(tmpdir(), "se-ws-"));
  await assert.rejects(() => resolveWorkspacePath(workspaceDir, "../outside.txt"), /escapes the workspace/);
});

test("T-WS-2: absolute paths are rejected", async () => {
  const workspaceDir = await mkdtemp(path.join(tmpdir(), "se-ws-"));
  await assert.rejects(() => resolveWorkspacePath(workspaceDir, "/etc/passwd"), /absolute paths are not allowed/);
});

test("T-WS-3: symlink escape is rejected", async () => {
  const workspaceDir = await mkdtemp(path.join(tmpdir(), "se-ws-"));
  const outside = await mkdtemp(path.join(tmpdir(), "se-outside-"));
  await symlink(outside, path.join(workspaceDir, "escape-link"));
  await assert.rejects(() => resolveWorkspacePath(workspaceDir, "escape-link/x.txt"), /escapes the workspace/);
});

test("T-WS-4: an over-limit file is rejected by ws_read (throws; pi-agent-core turns a thrown tool error into isError:true)", async () => {
  const workspaceDir = await mkdtemp(path.join(tmpdir(), "se-ws-"));
  const { writeFile } = await import("node:fs/promises");
  const big = "x".repeat(512 * 1024 + 10);
  await writeFile(path.join(workspaceDir, "big.txt"), big);
  const tool = createWsReadTool({ workspaceDir });
  await assert.rejects(() => tool.execute("call-1", { path: "big.txt" }), /exceeds/);
});

// T-WS-5: the model (scripted via the fake route) reads a material, writes
// out/memo.md, an artifact.written event is recorded, and the HTTP endpoint
// reads back the same sha256.
test("T-WS-5: ws_read then ws_write round-trips through the workspace endpoints", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession();
    const material = await api("POST", `/sessions/${session.id}/materials`, { name: "plan.txt", text: "line one\nline two\n" });
    assert.equal(material.status, 200);
    assert.equal(material.json.path, "materials/plan.txt");

    const calls = [
      { name: "ws_read", arguments: { path: "materials/plan.txt" } },
      { name: "ws_write", arguments: { path: "out/memo.md", text: "derived from plan" } },
    ];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    const run = await pollRun(created.json.run.id);
    assert.equal(run.status, "completed");
    assert.equal(run.artifacts.length, 1);
    assert.equal(run.artifacts[0].path, "out/memo.md");

    const events = (await api("GET", `/sessions/${session.id}/events`)).json.events;
    const artifactEvent = events.find((e) => e.type === "artifact.written");
    assert.ok(artifactEvent);
    assert.equal(artifactEvent.data.sha256, run.artifacts[0].sha256);

    const file = await api("GET", `/sessions/${session.id}/workspace/file?path=out/memo.md`);
    assert.equal(file.json.text, "derived from plan");
    const { createHash } = await import("node:crypto");
    const sha256 = createHash("sha256").update(file.json.text, "utf8").digest("hex");
    assert.equal(sha256, run.artifacts[0].sha256);

    const tree = await api("GET", `/sessions/${session.id}/workspace`);
    assert.ok(tree.json.tree.some((f) => f.path === "materials/plan.txt"));
    assert.ok(tree.json.tree.some((f) => f.path === "out/memo.md"));
  } finally {
    await runtime.close();
  }
});

test("materials endpoint rejects path separators in the name", async () => {
  const { runtime, api, createSession } = await boot();
  try {
    const session = await createSession();
    const badName = await api("POST", `/sessions/${session.id}/materials`, { name: "../escape.txt", text: "x" });
    assert.equal(badName.status, 400);
    const badName2 = await api("POST", `/sessions/${session.id}/materials`, { name: "a/b.txt", text: "x" });
    assert.equal(badName2.status, 400);
  } finally {
    await runtime.close();
  }
});

test("addMaterial rejects content over the 1 MiB limit (service-level, below the HTTP body cap)", async () => {
  const { runtime, api, createSession } = await boot();
  try {
    const session = await createSession();
    // 1 MiB of plain ASCII plus the JSON envelope still fits under the HTTP
    // body cap, but the raw material content itself is over the limit once
    // decoded, so the service's own byte check must catch it.
    const oversized = "x".repeat(1024 * 1024 + 1);
    // With this exact size the JSON body also exceeds the transport cap, so
    // either a transport-level connection reset or a service 400 is an
    // acceptable rejection; a 200 (accepted) would not be.
    try {
      const result = await api("POST", `/sessions/${session.id}/materials`, { name: "big.txt", text: oversized });
      assert.notEqual(result.status, 200);
    } catch (error) {
      assert.match(String(error?.cause?.code ?? error), /SOCKET|ECONNRESET|UND_ERR/);
    }
  } finally {
    await runtime.close();
  }
});

// T-WS-6: two writes to the same path produce two artifact CONTENT VERSIONS
// with different sha256, while GET workspace/file resolves the one CURRENT
// file — whose sha256 is the second version's.
test("T-WS-6: repeated writes yield two content versions and one current file", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession();
    const calls = [
      { name: "ws_write", arguments: { path: "out/memo.md", text: "first revision" } },
      { name: "ws_write", arguments: { path: "out/memo.md", text: "second revision" } },
    ];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    const run = await pollRun(created.json.run.id);
    assert.equal(run.status, "completed");
    assert.equal(run.artifacts.length, 2);
    assert.deepEqual(run.artifacts.map((a) => a.path), ["out/memo.md", "out/memo.md"]);
    assert.notEqual(run.artifacts[0].sha256, run.artifacts[1].sha256);
    for (const artifact of run.artifacts) {
      assert.equal(artifact.kind, "content-version");
      assert.ok(!Number.isNaN(Date.parse(artifact.writtenAt)));
    }

    const events = (await api("GET", `/sessions/${session.id}/events`)).json.events.filter((e) => e.type === "artifact.written");
    assert.equal(events.length, 2);
    assert.deepEqual(events.map((e) => e.data.sha256), run.artifacts.map((a) => a.sha256));
    assert.equal(events[1].data.kind, "content-version");
    assert.equal(events[1].data.writtenAt, run.artifacts[1].writtenAt);

    const file = await api("GET", `/sessions/${session.id}/workspace/file?path=out/memo.md`);
    assert.equal(file.json.kind, "current");
    assert.equal(file.json.text, "second revision");
    assert.equal(file.json.sha256, run.artifacts[1].sha256, "the current file is the latest content version");
    assert.notEqual(file.json.sha256, run.artifacts[0].sha256);
  } finally {
    await runtime.close();
  }
});

// R1-5: addMaterial resolves its target through the shared workspace guard,
// so a name that is legal for the name regex but walks out of materials/ is
// refused by the guard, not by a second private check.
test("addMaterial routes through the shared path guard, which rejects a '..' name", async () => {
  const { runtime, api, createSession } = await boot();
  try {
    const session = await createSession();
    const escaping = await api("POST", `/sessions/${session.id}/materials`, { name: "..", text: "x" });
    assert.equal(escaping.status, 400);
    assert.equal(escaping.json.error.code, "invalid_input");
    assert.match(escaping.json.error.message, /escapes the workspace/);

    const dotName = await api("POST", `/sessions/${session.id}/materials`, { name: ".", text: "x" });
    assert.equal(dotName.status, 400);

    const ok = await api("POST", `/sessions/${session.id}/materials`, { name: "good.txt", text: "x" });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.path, "materials/good.txt");

    const tree = await api("GET", `/sessions/${session.id}/workspace`);
    assert.deepEqual(tree.json.tree.map((f) => f.path), ["materials/good.txt"]);
  } finally {
    await runtime.close();
  }
});

// T-ART-1: a run that completes without writing anything has no artifacts and
// nothing anywhere claiming the (non-existent) result was accepted. This slice
// has no approval semantics at all, and must not imply one.
test("T-ART-1: a completed run with no write has no artifacts and no acceptance field", async () => {
  const { runtime, api, createSession, pollRun } = await boot();
  try {
    const session = await createSession();
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: "just talk, write nothing", commandId: "cmd-1" });
    const finished = await pollRun(created.json.run.id);
    assert.equal(finished.status, "completed");
    assert.deepEqual(finished.artifacts, []);

    const snapshot = await api("GET", `/sessions/${session.id}`);
    const surface = await api("GET", `/sessions/${session.id}/surface`);
    const banned = /^(accepted|approved|isAccepted|isApproved|acceptance|approval)$/i;
    const offenders = [];
    const walk = (value, trail) => {
      if (Array.isArray(value)) { value.forEach((item, i) => walk(item, `${trail}[${i}]`)); return; }
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (banned.test(key)) offenders.push(`${trail}.${key}=${JSON.stringify(child)}`);
        walk(child, `${trail}.${key}`);
      }
    };
    walk(finished, "run");
    walk(snapshot.json, "snapshot");
    walk(surface.json, "surface");
    assert.deepEqual(offenders, [], "no acceptance/approval field may exist in this slice's responses");

    assert.ok(!(await api("GET", `/sessions/${session.id}/events`)).json.events.some((e) => e.type === "artifact.written"));
    assert.deepEqual((await api("GET", `/sessions/${session.id}/workspace`)).json.tree, []);
  } finally {
    await runtime.close();
  }
});

// T-ART-2: writing the same path twice and then reading it back. The two
// content versions are both kept; the endpoint resolves the one current file.
// (T-WS-6 regression, restated at the artifact-semantics level.)
test("T-ART-2: two writes to one path keep both content versions and one current file", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession();
    const calls = [
      { name: "ws_write", arguments: { path: "out/report.md", text: "draft one" } },
      { name: "ws_write", arguments: { path: "out/report.md", text: "draft two, revised" } },
    ];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    const finished = await pollRun(created.json.run.id);
    assert.equal(finished.status, "completed");

    assert.equal(finished.artifacts.length, 2, "both content versions are retained");
    assert.ok(finished.artifacts.every((a) => a.kind === "content-version" && a.path === "out/report.md"));
    assert.notEqual(finished.artifacts[0].sha256, finished.artifacts[1].sha256);
    assert.ok(Date.parse(finished.artifacts[0].writtenAt) <= Date.parse(finished.artifacts[1].writtenAt));

    const file = await api("GET", `/sessions/${session.id}/workspace/file?path=out/report.md`);
    assert.equal(file.json.kind, "current", "the endpoint resolves the mutable file, not a version");
    assert.equal(file.json.text, "draft two, revised");
    assert.equal(file.json.sha256, finished.artifacts[1].sha256);
    assert.notEqual(file.json.sha256, finished.artifacts[0].sha256);

    // The workspace tree also reports one file, not two.
    const tree = (await api("GET", `/sessions/${session.id}/workspace`)).json.tree;
    assert.deepEqual(tree.map((f) => f.path), ["out/report.md"]);
    assert.equal(tree[0].sha256, finished.artifacts[1].sha256);
  } finally {
    await runtime.close();
  }
});

// Hardening (work order 2.8): ws_grep refuses a pattern that nests a
// quantifier inside a quantified group, and caps pattern length, BEFORE the
// pattern is compiled or run against any file.
test("ws_grep rejects nested quantifiers and over-long patterns before compiling them", async () => {
  const workspaceDir = await mkdtemp(path.join(tmpdir(), "se-grep-"));
  const { writeFile } = await import("node:fs/promises");
  await writeFile(path.join(workspaceDir, "notes.txt"), "aaaaaaaaaaaaaaaaaaaaaaaaaaaaX\nplain line\n");
  const tool = createWsGrepTool({ workspaceDir });

  for (const pattern of ["(a+)+$", "(a*)*b", "(x{2,})?y", "((a+))+"]) {
    await assert.rejects(() => tool.execute("call", { pattern }), /nests a quantifier/, `must reject ${pattern}`);
  }
  await assert.rejects(() => tool.execute("call", { pattern: "a".repeat(MAX_GREP_PATTERN_CHARS + 1) }), /1 to 200 characters/);
  assert.equal(MAX_GREP_PATTERN_CHARS, 200);

  // Ordinary patterns, including quantified groups without nesting, still work.
  const ok = await tool.execute("call", { pattern: "(plain|missing) line" });
  assert.equal(ok.details.matches.length, 1);
  assert.equal((await tool.execute("call", { pattern: "a+X" })).details.matches.length, 1);
  await assert.rejects(() => tool.execute("call", { pattern: "([" }), /not a valid regular expression/);
});

// Hardening (work order 2.8): GET workspace/file truncates on a UTF-8
// character boundary, so a cut file never ends in a mangled character. The
// digest still covers the whole file.
test("getWorkspaceFile truncates on a UTF-8 boundary and keeps the whole-file digest", async () => {
  const { runtime, api, createSession } = await boot();
  try {
    const session = await createSession();
    // 3 bytes per character: no multiple of 3 divides 512 KiB evenly, so the
    // byte limit necessarily lands mid-character.
    const character = "漢";
    const repeats = Math.ceil((512 * 1024) / 3) + 100;
    const content = character.repeat(repeats);
    assert.notEqual((512 * 1024) % 3, 0, "the limit must fall inside a character for this test to mean anything");

    const material = await api("POST", `/sessions/${session.id}/materials`, { name: "wide.txt", text: content });
    assert.equal(material.status, 200);

    const file = await api("GET", `/sessions/${session.id}/workspace/file?path=materials/wide.txt`);
    assert.equal(file.json.truncated, true);
    assert.ok(!file.json.text.includes("�"), "truncation must not manufacture replacement characters");
    assert.equal(file.json.text, character.repeat(file.json.text.length), "every character in the returned text is whole");
    assert.equal(file.json.text.length, Math.floor((512 * 1024) / 3));

    assert.equal(file.json.bytes, Buffer.byteLength(content, "utf8"), "bytes describes the whole file");
    assert.equal(file.json.sha256, createHash("sha256").update(content, "utf8").digest("hex"), "the digest covers the whole file, not the truncated text");
  } finally {
    await runtime.close();
  }
});

// A second run in the SAME session must be able to revise what the first one
// wrote. This is the C1 §8 path shape, and it is also the regression for a
// fixture defect found while running T-SELF-1: the fake route indexed its
// script by tool results across the whole continued conversation, so a second
// run's script was skipped entirely and its writes silently never happened.
test("a second run in a continued session revises the first run's file", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession();
    await api("POST", `/sessions/${session.id}/materials`, { name: "plan.txt", text: "one\ntwo\n" });

    const first = await api("POST", `/sessions/${session.id}/runs`, {
      input: scriptInput([
        { name: "ws_read", arguments: { path: "materials/plan.txt" } },
        { name: "ws_write", arguments: { path: "out/memo.md", text: "first wording" } },
      ]),
      commandId: "run-1",
    });
    const run1 = await pollRun(first.json.run.id);
    assert.equal(run1.status, "completed");
    assert.equal(run1.artifacts.length, 1);

    const second = await api("POST", `/sessions/${session.id}/runs`, {
      input: scriptInput([{ name: "ws_write", arguments: { path: "out/memo.md", text: "second wording" } }]),
      commandId: "run-2",
    });
    const run2 = await pollRun(second.json.run.id);
    assert.equal(run2.status, "completed");
    assert.equal(run2.artifacts.length, 1, "the second run's script must actually execute");
    assert.notEqual(run2.artifacts[0].sha256, run1.artifacts[0].sha256);

    const file = await api("GET", `/sessions/${session.id}/workspace/file?path=out/memo.md`);
    assert.equal(file.json.text, "second wording");
    assert.equal(file.json.sha256, run2.artifacts[0].sha256);
    assert.equal(run1.hostSession.id, run2.hostSession.id, "both runs continue one host session");
  } finally {
    await runtime.close();
  }
});
