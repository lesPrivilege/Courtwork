# Continuity development conformance suite

Protocol: [SE Continuity Evaluation](../../engineering/research/se-continuity-2026-09-08/README.md).
Observation and scoring: [v2 contract](observation-contract.md).

From repository root, Node >=22.19 and Python 3 (standard library only):

```sh
node --test benchmarks/continuity/grade.test.mjs
node benchmarks/continuity/run.mjs --output /tmp/continuity-result.json
```

Output, `.attempts.json` and `.journal.jsonl` must be new files. Attempts are
persisted before execution; failures stay in the denominator. Each trajectory
uses an independent temporary database, cleaned on normal completion. No
providers, personal runtime directories or network calls are used.

v1 runs six development trajectories in **one synthetic memo family** against
E (real trusted Work Core) and S (ordinary SQLite approval system). Both should
pass; this is calibration, not evidence of SE advantage. The sixth trajectory
checks stale-base CAS in addition to the original five scenarios. Production
regression counts and independent reruns are not additional benchmark samples.
The five-case v0 score had observation gaps identified by Pro; old reports are
retained unchanged and do not assert full continuity.

`cases.json` defines outcomes, `grade.mjs` checks full state at every checkpoint,
`observe.mjs` maps durable raw records, `courtwork.mjs` and `standard.py/mjs`
execute independently implemented mechanisms. The trusted clients are fixture
drivers, not model-reachable tools or a host authorization test. Restarts are
graceful, not SIGKILL. Host, model, legal-quality and human-takeover evidence is
separate. Strong S is brought forward before expanding tasks or model runs.
