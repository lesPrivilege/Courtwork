// DF-04 Host check recipe catalog (RD-009 "DF-04可施工合同"). A frozen,
// code-defined list: the model selects a recipe id and nothing else. The
// Host fixes the exact command, arguments, execution location, environment
// policy, timeout and output limits. Not user-editable in this slice.
const RECIPES = Object.freeze([
  Object.freeze({
    id: "node-test",
    version: 1,
    title: "Run the package tests",
    // process.execPath is the Host's own Node binary, not a PATH lookup.
    command: process.execPath,
    argv: Object.freeze(["--test"]),
    // Recipes run only inside the Session's active private candidate
    // worktree; never the connected source folder, never the managed
    // workspace. This string is a declaration for callers to resolve against
    // the current candidate path, not a literal filesystem path.
    cwd: "candidate",
    timeoutMs: 120000,
    outputLimitBytes: 65536,
    env: "minimal",
  }),
  // The two fixed Courtwork recipes name only offline tests: they pass with a
  // read-only candidate and the check's own temporary directory, with no
  // listener and no nested check, because a check runs in the sandbox with no
  // network at all. HTTP Host tests and sandbox lifecycle tests are trusted
  // developer/CI verification (`npm --prefix app test`), outside `check_run`.
  // A change to what a recipe covers is a new version: v1 of both recipes named
  // files that listen on loopback or start checks and could not pass in the
  // sandbox. v1 is not kept; its receipts and approvals keep their recorded
  // identity and cannot authorize v2.
  Object.freeze({
    id: "node-test-attention-contract",
    version: 2,
    title: "Run Attention backend offline contract tests",
    command: process.execPath,
    argv: Object.freeze([
      "--test",
      "--test-concurrency=1",
      "app/tests/attention-core.test.mjs",
      "app/tests/attention-recovery.test.mjs",
      "app/tests/attention-github-fixture.test.mjs",
      "app/tests/attention-gmail-fixture.test.mjs",
      "app/tests/attention-trace-fixture.test.mjs",
    ]),
    cwd: "candidate",
    timeoutMs: 120000,
    outputLimitBytes: 65536,
    env: "minimal",
  }),
  // A selected offline Harness Core/Extensions regression set for Courtwork's
  // own candidate (RL-1 self-check), not all of Harness or product acceptance.
  Object.freeze({
    id: "node-test-harness-contract",
    version: 2,
    title: "Run Harness Core and Extensions offline contract tests",
    command: process.execPath,
    argv: Object.freeze([
      "--test",
      "--test-concurrency=1",
      "app/tests/request-summary.test.mjs",
      "app/tests/runtime-load-recovery.test.mjs",
      "app/tests/kit-context.test.mjs",
      "app/tests/kit-context-independent.test.mjs",
      "app/tests/control-policy.test.mjs",
      "app/tests/check-approval-authored-files.test.mjs",
    ]),
    cwd: "candidate",
    timeoutMs: 120000,
    outputLimitBytes: 65536,
    env: "minimal",
  }),
]);

export function listCheckRecipes() {
  return RECIPES;
}

export function getCheckRecipe(id) {
  return RECIPES.find(recipe => recipe.id === id) ?? null;
}
