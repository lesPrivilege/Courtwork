# Fixed-source verification · 2026-09-12

Product source: `6522eb1b6a8b941f2b83a956fb88623f62d0d623`, detached clean worktree, isolated synthetic data, locked dependencies. No real provider request.

- [Full suite](full-6522eb1.txt): 839 tests, 838 passed, one failure in `review-core-client-lifecycle.test.mjs` request-timeout case: worker failed to become ready within 2 seconds under the full concurrent run. This is not an all-green full suite.
- [Isolated lifecycle rerun](core-lifecycle-6522eb1-rerun.txt): 13/13. The initial isolated rerun also passed 13/13; this saved repeat records the same result. Consistent with a load-sensitive startup timeout; not proof of its cause. No production timeout or test expectation was changed.
- [Runtime smoke](smoke-6522eb1.txt): pass, including material/workspace/artifact/reopen/continuation; real-provider portion not run.
- [Document links](doc-links-6522eb1.txt): 5,365 references in 1,076 documents, no problems, before the final evidence-only additions.

Luna independently reviewed an archived copy of the same fixed commit, without edits: P01 23/23, P02 9/9, P02b 14/14, total 46/46. It confirmed closure of the crash-intent gap, embedded-resource `_meta` stripping and duplicate-native-callId result lookup ambiguity. This is bounded non-author code/test review, not whole-product acceptance.

Astra adjudication of the remaining parallel boundary: Pi's existing same-batch parallel execution stays in place. A call that already passed governed admission is in flight even if it is waiting for its durable intent write. The first unknown result closes subsequent admission, not already-admitted calls. Every pending intent must settle or recover as unknown. This release does not promise cancellation of all same-batch network dispatches after the first error. No scheduler ownership change is smuggled into MCP settlement.
