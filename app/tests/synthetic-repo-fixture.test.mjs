import assert from "node:assert/strict";
import { test } from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { createSyntheticRepository, KNOWN_BUG } from "./fixtures/synthetic-repo/create-synthetic-repo.mjs";

const run = promisify(execFile);
// A nested `node --test` must not inherit the parent test runner's child context.
const childEnv = { ...process.env };
delete childEnv.NODE_TEST_CONTEXT;
delete childEnv.NODE_OPTIONS;

test("synthetic repository fixture has Git history, a failing test and a known one-line fix", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-synthetic-repo-"));
  try {
    const repo = await createSyntheticRepository(dir);
    assert.match(repo.head, /^[0-9a-f]{40}$/);
    const log = (await run("git", ["-C", dir, "log", "--format=%s"], { env: { PATH: "/usr/bin:/bin", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" } })).stdout.trim().split("\n");
    assert.deepEqual(log, ["add pagination helpers", "scaffold synthetic-parcel"]);
    const status = (await run("git", ["-C", dir, "status", "--porcelain"], { env: { PATH: "/usr/bin:/bin", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null" } })).stdout;
    assert.equal(status, "", "fixture commits everything it writes");

    await assert.rejects(run(process.execPath, ["--test"], { cwd: dir, env: childEnv }), error => error.code === 1, "the shipped test fails before the fix");

    const target = path.join(dir, KNOWN_BUG.path);
    const source = await readFile(target, "utf8");
    assert.ok(source.includes(KNOWN_BUG.broken));
    await writeFile(target, source.replace(KNOWN_BUG.broken, KNOWN_BUG.fixed));
    await run(process.execPath, ["--test"], { cwd: dir, env: childEnv });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
