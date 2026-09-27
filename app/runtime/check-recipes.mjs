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
  Object.freeze({
    id: "node-test-attention-contract",
    version: 1,
    title: "Run Attention backend contract tests",
    command: process.execPath,
    argv: Object.freeze([
      "--test",
      "--test-concurrency=1",
      "app/tests/attention-core.test.mjs",
      "app/tests/attention-http.test.mjs",
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
]);

export function listCheckRecipes() {
  return RECIPES;
}

export function getCheckRecipe(id) {
  return RECIPES.find(recipe => recipe.id === id) ?? null;
}
