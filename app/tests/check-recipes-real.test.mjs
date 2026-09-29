/* I1 completion evidence (architect-20260929, "I1 ruling"): each fixed
 * Courtwork recipe, with its exact frozen argv, timeout and output limit, runs
 * against this repository as the candidate through the real runner and the
 * unchanged production sandbox, and passes. No stub files, no widened limits.
 *
 * This needs the sandbox and fails, never skips, when it is unavailable. It
 * also needs real dependency files inside the repository: the sandbox reads the
 * candidate's real path only, so an `app/node_modules` that is a symlink leaving
 * the repository makes every dependency-needing test fail to load. That is a
 * property of the checkout, not a recipe defect, and the precondition below
 * names it. This file is not itself named by any recipe: a check cannot start a
 * check. */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCheckRecipe } from "../runtime/check-runner.mjs";
import { getCheckRecipe } from "../runtime/check-recipes.mjs";

const repository = await realpath(fileURLToPath(new URL("../..", import.meta.url)));
const dataDir = await mkdtemp(path.join(tmpdir(), "cw-recipes-real-data-"));
test.after(() => rm(dataDir, { recursive: true, force: true }));

test("precondition: app/node_modules holds real files inside the repository, not a link out of it", async () => {
  let modules;
  try { modules = await realpath(path.join(repository, "app", "node_modules")); }
  catch { assert.fail("app/node_modules is missing: prepare the candidate's dependencies inside the repository first (not a recipe defect)"); }
  assert.ok(modules === repository || modules.startsWith(repository + path.sep),
    `app/node_modules resolves to ${modules}, outside the repository ${repository}. The check sandbox reads the candidate's real path only, so no dependency-needing test can load: this is a checkout preparation problem, not a recipe defect.`);
});

for (const id of ["node-test-attention-contract", "node-test-harness-contract"]) {
  test(`${id} passes on this repository under the production sandbox with its frozen limits`, async () => {
    const recipe = getCheckRecipe(id);
    // A missing or failing sandbox rejects here with sandbox_unavailable; it is
    // not a skip.
    const result = await runCheckRecipe({ recipe, cwd: repository, dataDir });
    const output = result.stdout + result.stderr;
    const count = name => Number((output.match(new RegExp(`^(?:#|ℹ) ${name} (\\d+)`, "m")) ?? [])[1]);
    assert.equal(result.exitCode, 0, output.slice(0, 4000));
    assert.equal(result.signal, null);
    assert.equal(result.timedOut, false);
    assert.deepEqual(result.truncated, { stdout: false, stderr: false }, "the frozen 65536-byte limit holds the whole output");
    assert.ok(count("tests") > 0, "the run executed tests");
    assert.equal(count("pass"), count("tests"));
    assert.equal(count("fail"), 0);
    assert.equal(count("skipped"), 0);
    assert.ok(result.durationMs < recipe.timeoutMs / 2, `duration ${result.durationMs} ms leaves headroom under the ${recipe.timeoutMs} ms limit`);
  });
}
