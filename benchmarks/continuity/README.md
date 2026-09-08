# Continuity mechanism runner

Protocol: [SE Continuity Evaluation v0](../../engineering/research/se-continuity-2026-09-08/README.md).

Run from repository root with Node >=22.19 and Python 3 (standard library only):

```sh
node --test benchmarks/continuity/grade.test.mjs
node benchmarks/continuity/run.mjs --output /tmp/continuity-result.json
```

Output must be a new file; existing evidence is never overwritten. A failed trajectory yields exit code 1 after recording all cases. Setup/transport failures remain failures, not successful rejections. Each case creates and removes its own temporary database. There are no providers, personal runtime directories, or network calls.

This initial B0 entry executes five development trajectories in **one synthetic memo family** against the real private Core client: pending/valid acceptance, stale source, duplicate/changed receipt, graceful process restart, and actor-field spoof rejection followed by valid acceptance. The trusted client is a fixture driver, not a model-reachable interface or an authorization security test. Restart is graceful, not SIGKILL; host Session continuation and absent-producer behavior belong to B1.

`cases.json` owns source material, operations and expected observations. `courtwork.mjs` owns only fixture setup, operations and normalization. `grade.mjs` has no production dependencies and compares expected fields to actual values. `run.mjs` preserves raw snapshots, hashes, environment, errors and per-checkpoint results. This is author-created development evidence, not heldout evaluation or a competing-harness comparison. No legal correctness or human/model performance claim is supported.

Next capability order and required evidence are in the protocol. Existing Core/runtime regression suites remain separate; their assertion counts are not new benchmark samples.
