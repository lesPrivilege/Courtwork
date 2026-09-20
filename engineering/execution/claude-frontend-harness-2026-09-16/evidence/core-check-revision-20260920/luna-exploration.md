# First Core slice: bounded gap — same-Run candidate version guard

**Review scope.** Read-only source inspection of detached first-core tree `83041d158cea01f2272f010c098d538617e0c3c6`; no provider, credential, product write, or test execution. This is an owner handoff, not implementation acceptance.

## Finding

The DF-04 path captures `candidateWriteRevision` when a Run's check tools are created, but does not verify that the active candidate still has that revision before the check is admitted. A single Run can complete `repo_write` (which advances its own mutable write-revision closure) and then request `check_run`; the check permission and `check.started` still report the older admission revision while the process reads the same path after the write.

Evidence:

- `app/runtime/repository-candidate-tools.mjs:40-53,137-166` captures `writeRevision` and updates it after a confirmed write. The Host write path rechecks current candidate identity/revision at `app/server/service.mjs:1237-1243`.
- `app/server/service.mjs:2728-2747` constructs `checkTools` from `run.repositoryCandidateSnapshot` and supplies no current-candidate/version guard.
- `app/runtime/check-tools.mjs:16-20` captures `candidateId` and `candidateWriteRevision`; `permissionContext` reuses them at `:26-44`, and `execute` records them at `:46-53` before running the snapshot path at `:56`. `execute` has no equivalent to the repository writer's approved-context/current-revision check.
- The field's documented purpose is to identify the candidate state the recipe is about to run against (`app/docs/check-recipes.md:77-80`). The current code therefore permits a stale descriptor rather than rejecting an input-version change.
- Existing coverage separates the write and check into `run2` and `run3` (`app/tests/check-recipes.test.mjs:247-279`), so it proves only that a later Run sees revision `1`; it does not exercise a same-Run write followed by a check or assert a fail-closed boundary.

This is one bounded first-core gap: exact candidate identity is not guarded at the approval-to-effect seam. The existing durable settlement rule still records outcomes after cancellation independently of Pi; no provider lane is involved.

## Minimal regression rehearsal

Extend the existing offline DF-04 fixture with one scripted Run, starting at candidate write revision `0`:

1. Approve a successful `repo_write`, then issue `check_run(node-test)` in the **same** Run.
2. Assert the chosen boundary. For the current first slice, the minimal compatible result is a deterministic `candidate_changed` (or the existing equivalent) before `check.started` and before process spawn, because the permission descriptor is stale. The existing `check.settled` schema and Host/Pi loop need not change.
3. Also cover the normal path by issuing `check_run` with an unchanged candidate and asserting the permission's revision equals `check.started`'s revision and the check settles once. Keep the existing cancellation/restart test as the evidence that settlement remains independent of Pi.

The smallest implementation seam is an `assertActive(candidateId, revision, writeRevision)`-style Host callback passed to `checkTools`, checked when the permission is formed and again immediately before `recordCheckStarted`/spawn. If same-Run `repo_write → check_run` is later desired, that is a separate contract decision requiring a freshly resolved and frozen input descriptor; it should not be inferred from this first slice.

**Disposition requested:** dispatch the bounded current-descriptor/approval guard and the one same-Run regression. Do not claim same-Run composition or broaden this into runtime/provider work.
