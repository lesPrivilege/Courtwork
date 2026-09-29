# Independent rereview of 5e11e01

Source: `5e11e019b016f2c8e4f39bf48280b52db4fb3b7f`, branch `claude/architect-20260929`. Reviewer: Astra, non-author. [Hashes](sources.json). No product code changed during review.

## Checks executed

```sh
node --test --test-concurrency=1 app/tests/path-alias-oracle.test.mjs app/tests/control-plane.test.mjs app/tests/workspace.test.mjs
node engineering/execution/architect-20260929/evidence/astra-rereview-5e11e01/original-inputs.mjs app
node engineering/execution/architect-20260929/evidence/astra-rereview-5e11e01/remaining-counterexamples.mjs app
```

Commands ran serially. Existing tests: **48/48**, no skips; [log](focused-tests.log). This includes running the author's volume oracle. [Original-input revalidation](original-results.jsonl) uses explicit corrected assertions, rather than removing assertions: no post-enumeration directory-swap leak, final-sigma exact-name deny holds in all three action families, original lowercase collision query stays denied. The historical evidence was preserved unchanged.

[Remaining counterexamples](remaining-results.jsonl) assert the observed defects at this commit. Both policy examples run the actual filesystem alias read and all three path-action evaluations; both also execute the production `governTools` + `ws_read` path and disclose only synthetic text. The traversal probe executes the production `grep-worker.mjs` with a preload that performs a real rename/symlink immediately after the real ancestor `lstat`, before `opendir`. It does not fabricate metadata, descriptors or matches. The test controller sends the allow-all admission response. This is a deterministic scheduling probe of the production worker, not a whole-Host concurrent external-process test. Only created temporary directories are touched; the worker is terminated and temporary files removed afterward.

## Scope and limits

The old-input corrections are verified; F3 and D6 are not accepted because the broader invariants still have counterexamples. The identity/lowercase readings do preserve the previous evaluator's effect for the same request spelling, but this does not prove equal effects across filesystem aliases. The wildcard example fails with only one deny rule.

The volume oracle validates concrete names in a fixed `x<codepoint>y` context. It does not test glob matching across different casing contexts or mixed-effect policies. Its `Set` records folded names, so a collision checks that some earlier name has the same folded value, rather than comparing the actual collided inode/name pair. Treat that as bounded evidence, not proof of the complete alias relation.

Not run: a repeat of the full suite, Linux/other filesystems, integration of the three branches, rereview of A2/A3 or D4, S11 guard revalidation, real-provider/model runs, browser or visual baseline, native zoom/200%, screen reader, forced colors, coarse pointer/touch, dark theme, whole error matrices. No credentials, user's Host, compatibility readers, push, PR, merge or deployment were touched.
