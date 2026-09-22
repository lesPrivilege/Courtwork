# LP-R5 · preserve Spark references at Session deletion

2026-09-22 · Astra author return on the original branch/tree, based on packet `6b45fd8`. **Adopt** the parent's deletion finding. Parent review at `81d966f2f6b93d4b46bec29d144eaad8d4266a67`, path `engineering/execution/claude-frontend-harness-2026-09-16/evidence/local-pi-parent-review-20260922/README.md`, retains independent56/56 at the prior candidate and holds acceptance solely for LP-R5. That evidence is not relabelled as testing this correction.

## Before and after

The [exact parent probe](parent-probe.mjs.txt) is preserved byte-for-byte, including historical absolute retrieval paths. [Parent failure](parent-before.log) and [author rerun before the fix](author-before.log), both exit1: actual dispatch-crash exit71 → reopen unknown/fenced → HTTP DELETE200 → Run/events disappear, fence false and `validateState` fails with `Execution binding mismatch`. This establishes discarded recovery authority and invalid persistent state; it does not establish a second process launch.

The **same unmodified parent probe** after the fix exits0 ([log](author-after.log)): HTTP409 `spark_session_referenced`, Run retained, fence true, assignment retained, validation error null, provider requests0.

## Existing-owner correction

`subagent-state.mjs` now supplies one read-only Spark reference predicate. `RuntimeService.deleteSession` checks it before deletion side effects; `RuntimeStore.deleteSession` repeats it inside `_mutate` against the current state before removing any Session, Run, event or question.

It protects parent/origin, attempt, source/result/note, source-reader/consumer and Session mount-target references in the existing Spark graph. Archived/completed references remain references. The same guard covers earlier in-process Spark history and queued work with no local events; it does not depend on evidence surviving a deletion. No automatic cascade, tombstone, new deletion framework, new ledger, schema change or recovery transition was added. Ordinary unreferenced Chats remain deletable. API/Spark documentation describes the409 boundary; app README's data-layout comment now correctly says schema20.

## Verification

- [Dedicated tests](tests.log): **5/5 exit0**. Actual HTTP and direct Store rejection for unknown child and parent, memory snapshot and exact disk-byte preservation, valid close/reopen, reconcile/retry refusal and zero repeated spawn/provider observations; archived completed findings survive rejected deletion/reopen; queued references with no local records are protected; a reference queued after Service precheck still blocks at Store; unreferenced empty and completed ordinary Chats delete normally.
- [Selected regression](selected-tests.log): **35/35 exit0** — the first four new deletion cases plus existing object-command, Spark and local Host suites. The final ordinary completed-Chat case was added afterward and is covered in the dedicated5/5. This is author evidence, not a rerun of the parent's56 tests.
- Exact parent probe before exit1 / after exit0. Source/prose whitespace and documentation links are checked in the final packet.

All tests use independent temporary data and deterministic providers; owned Hosts/processes close. No user8787/data, native credentials/configuration, M1/UI, main product source, push or deployment changed. Parent retains independent acceptance and integration.
