// Shared by historical tests and the preflight. Paths are relative to app/.
export const historicalFixtures = {
  "schema4": {
    "commit": "7c07ef6b5a19f0eb2c45b8894ab9911de87ea979",
    "files": [
      "server/store.mjs",
      "server/runtime-lock.mjs",
      "server/runtime-lock.py",
      "server/work-metrics.mjs",
      "server/work-summary.mjs",
      "runtime/test-hooks.mjs"
    ]
  },
  "coordination": {
    "commit": "6921dbd18de153020c87e4438eebe5260762fee0",
    "files": [
      "server/store.mjs",
      "server/runtime-lock.mjs",
      "server/runtime-lock.py",
      "server/work-metrics.mjs",
      "server/work-summary.mjs",
      "runtime/test-hooks.mjs",
      "server/async-task-state.mjs"
    ]
  },
  "governance": {
    "commit": "6921dbd18de153020c87e4438eebe5260762fee0",
    "files": [
      "core/core.py",
      "core/file_candidates.py",
      "core/attention.py",
      "core/bridge.py"
    ]
  },
  "lineage": {
    "commit": "461ab12148bf9a36ea1f62183b88145285f6c5aa",
    "files": [
      "server/store.mjs",
      "server/runtime-lock.mjs",
      "server/runtime-lock.py",
      "server/work-metrics.mjs",
      "server/work-summary.mjs",
      "runtime/test-hooks.mjs",
      "server/async-task-state.mjs",
      "harness/coordination-state.mjs",
      "server/usage-details.mjs"
    ]
  },
  "providerPublication": {
    "commit": "a579929edd66544e6aa7cd8cd7d2399fae8265d3",
    "files": [
      "server/store.mjs",
      "server/runtime-lock.mjs",
      "server/runtime-lock.py",
      "server/work-metrics.mjs",
      "server/work-summary.mjs",
      "runtime/test-hooks.mjs",
      "server/async-task-state.mjs",
      "harness/coordination-state.mjs",
      "server/usage-details.mjs"
    ]
  }
};
