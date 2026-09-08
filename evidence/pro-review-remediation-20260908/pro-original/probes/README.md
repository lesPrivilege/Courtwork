# Independent review probe bundle

Review date: 2026-09-08. Frozen Courtwork commit: d879e2ff94d234120f902e15101c103943719e33.

These are isolated observer/pure-function probes, NOT a Core/host/model replay. Four original files were reconstructed from GitHub connector text and validated against their exact Git blob SHA-1. See source-manifest.json. The original grader/cases SHA-256 also match the read portion of the repository's Luna report.

## Run

```sh
python3 verify_sources.py
node --test grade.test.mjs
node mutation-probes.mjs
node context-probes.mjs
```

Executed here on Node v22.16.0. This is below the complete application's specified Node version; no full application compatibility is claimed. No npm packages, database, model credentials or network are required.

## Expected observations on the frozen version

- Original grader unit test: one subtest passes.
- Mutation probes: five undesirable observations are accepted; two detection controls are rejected. The harness exits zero to CONFIRM these weaknesses. This is not a post-fix acceptance test.
- Context probe: current/stale pending candidates generate identical Context.text despite different decide eligibility.
- Context probe: a 25,000-ASCII-character artifact triggers the default CONTEXT_BUDGET. Full lifecycle reachability is not executed.

The mutation baselines are independently constructed synthetic normalized observations, not production snapshots. Context inputs are synthetic views. The context probe removes only the two imports from the hash-verified owner-original.mjs and leaves the exported pure function bodies unchanged; WorkCoreOwner is never instantiated.

Original source mapping: grade.mjs, cases.json, grade.test.mjs live under benchmarks/continuity/; owner-original.mjs is app/core/owner.mjs.

See ../pro-review-d879e2f.md for Chinese review, severity, scope, sources and three bounded next deliverables. No repository was modified or pushed.
