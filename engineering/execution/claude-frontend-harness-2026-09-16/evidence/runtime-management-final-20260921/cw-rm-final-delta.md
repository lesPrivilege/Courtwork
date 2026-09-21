# Runtime-management final delta review

Date: 2026-09-21
Candidate: `5f892137850229cd920f29ecc8dfcc895ccb4b48`
Parent reviewed: `84faff9`
Worktree: `/Users/lesprivilege/Projects/.worktrees/courtwork-runtime-management-20260921`

## Verification

The requested bounded target suite ran under `caffeinate -is`:

```text
node --test tests/runtime-management.test.mjs
```

Result: **34/34 passed, exit 0**. Raw log: `/tmp/cw-rm-final-delta.log`.

No browser, provider, native credential, user port, full suite, checkout, or source edit was used.

## RM-R1 — accept

The submitted/unknown distinction is wired through the public controller and real view. A lost reply remains `unknown` and keeps the non-resending status check; a pending command says it is waiting; newer edits are held as unsent local draft text. The focused tests verify exactly one command across the lost-reply and status-confirmation path (`app/tests/runtime-management.test.mjs:616-670`). The view's unknown wording at `app/web/runtime-management-view.mjs:283-313` no longer calls an unresolved command “not applied”.

## RM-R2 — accept

`readBackOf` in `app/web/runtime-management.mjs:57-63` requires the same runtime id, compares revisions, requires the same connection at equal revision, and permits a different connection only at a newer revision. `adopt` measures every subsequent reading against the receipt (`:157-165`); stale, inconsistent, failed and deferred states remain locked. `readAgain` re-reads the owner without resending (`:419-430`). The focused tests cover stale read, equal-revision connection mismatch, newer revision with a different connection, wrong runtime id, navigation/reopen, and eventual fresh read (`runtime-management.test.mjs:668-730`).

The implementation retains the original receipt when a newer reading is observed, as required by the return packet, so the evidence does not overwrite command identity with later state.

## RM-C1 — accept

The controller settles only an explicit owner `not-applied` or refusal. `pending`, `inconclusive`, unrecognised statuses, and lookup errors restore `unknown` and keep the runtime locked (`runtime-management.mjs:377-416`). The contract defines `not-applied` as a definitive negative that also closes the operation id; the synthetic adapter fences an unknown operation and returns `operation_closed` if that delayed command later arrives (`app/tests/fixtures/runtime-management/adapter.mjs:483-501`). The focused tests verify both inconclusive/unrecognised lookup handling and the late-arrival fence (`runtime-management.test.mjs:731-765`).

## Limits and recommendation

The adapter remains synthetic and the production owner projection/operation-status endpoint is proposed by the packet; this review therefore accepts the frontend/controller semantics only. No independent browser pass was run. Within the requested delta and target suite, RM-R1, RM-R2 and RM-C1 are accepted with no additional blocker.
