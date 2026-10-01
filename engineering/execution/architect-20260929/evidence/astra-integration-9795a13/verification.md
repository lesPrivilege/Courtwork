# Independent integrated review · 2026-09-30

Reviewer: Astra, non-author. Code commit `9795a13`, record-only HEAD `fc3fb2c7dd0486ae61b192302b14eeb24fa89660`; [source hashes](sources.json). The implementation matches the component branches in the reviewed F3/D6, A2/A3 and sandbox modules. No product code was edited. This review uses the already-created integration worktree; it did not create a duplicate integration branch.

## Commands and results

From the integration worktree, serially:

```sh
node engineering/execution/architect-20260929/evidence/astra-integration-9795a13/original-inputs.mjs app
node engineering/execution/architect-20260929/evidence/astra-integration-9795a13/remaining-counterexamples.mjs app
node --test --test-concurrency=1 app/tests/executor-identity-upgrade.test.mjs app/tests/next-context-after-restart.test.mjs app/tests/kit-binding-store.test.mjs app/tests/runtime-selection-store.test.mjs app/tests/work-context-continuity.test.mjs app/tests/governance-http.test.mjs app/tests/control-plane.test.mjs app/tests/check-sandbox.test.mjs app/tests/check-runner-group-kill.test.mjs
node engineering/execution/architect-20260929/evidence/astra-integration-9795a13/real-recipes.mjs
```

- [Original inputs](original-results.jsonl): positive assertions pass. These are the older concrete inputs, not the latest three residual cases.
- [Residual cases](remaining-results.jsonl): wildcard sigma alias and mixed-case conflicting rules still disclose synthetic file content through production `governTools`/`ws_read`; all three path families' evaluators allow the aliases. The real production grep worker still discloses a synthetic outside file after a directory swap during traversal. The latter uses deterministic scheduling at the real lstat/opendir boundary, not a whole-Host external-process race. Scripts are byte-for-byte copies of the previous independent rereview scripts, pointed at this integration's app directory. Historical evidence is unchanged.
- [Focused tests](focused-tests.log): **81/81**, no failures or skips, file concurrency 1. A2's tests use current Host-written state with synthetic historical identities/configuration refs, not a real old Pi binary. A3 covers both domains over HTTP, restart/new Session, reason propagation and budgets. D9 exercises a real CoreClient deadline on a sent synthetic governance mutation over HTTP; it is not a browser or every-extension action test. D10 checks that advisory evaluation and dispatch share the Host ceiling; it does not prove F3 alias security.
- [Real fixed recipes](real-recipes.json): Attention **22 pass / 3 fail of 25**; Harness **71 pass / 37 fail of 108**. Both exit 1 without timeout or output truncation. Logs: [Attention stdout](node-test-attention-contract.stdout.log), [Attention stderr](node-test-attention-contract.stderr.log), [Harness stdout](node-test-harness-contract.stdout.log), [Harness stderr](node-test-harness-contract.stderr.log). The real catalog runner used the integrated checkout as a read-only candidate-equivalent cwd plus a new synthetic denied data directory. This is a runner/policy compatibility probe, not another full candidate-creation/approval UI walkthrough. Actual catalog argv and production sandbox policy were used.

## Evidence boundaries

A2/A3 and D9/D10 pass their scoped non-author backend review; formal Work/user acceptance, whole-product acceptance and main integration do not follow. The sandbox focused tests pass on this macOS host for their read/write, loopback, unavailable-mechanism and same-group cleanup assertions. The R1–R5 author spike beyond those assertions remains unverified independently; I1 still breaks the advertised fixed recipes.

Not run: Linux, other macOS versions, full suite again on an idle machine, real-provider/model calls, browser handling of the changed HTTP error, visual baseline, native zoom/200%, screen reader, forced colors, coarse pointer/touch, dark theme, whole error matrices or S11 guard integration/review. The author's full-suite result remains 1903/1904; isolated K5-R2 passes are not a replacement full-suite result. Compatibility readers and personal stores were untouched. No push, PR, merge to main, deployment or user's Host restart.
