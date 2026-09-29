# Convergence loop, 2026-09-29

Owner record for the serial documentation and source convergence loop.

## Scope and authority

The user, 2026-09-29, in the session that ran the [documentation convergence](../../research/document-governance-2026-09-28/README.md) and the [doc-driven code review](../../reviews/doc-driven-code-review-2026-09-29/README.md):

> 后续长任务皆可串行做，依然从第一性原理出发，整理文档、重构源码，开放 opus 、Sonnet 作为 worker 或 explorer，parents 掌握 loop 节奏即可。

(Long tasks may continue serially, still from first principles: organize documentation and refactor source, with Opus and Sonnet open as workers or explorers; the parent session paces the loop.)

- **Writer:** the Claude (Opus) parent session, on branch `claude/converge-loop-20260929` in its own worktree. Sonnet and Opus subagents explore, review and do bounded edits; the parent rules, reviews every diff and commits.
- **Lanes:** the directive opens source refactoring to this loop, including code inside the Astra core lane and the original Claude UX lane. The loop does not take over those lanes' queues or decisions. Each slice is behavior-preserving or fixes a reproduced defect; acceptance stays with Astra (core) or the UX owner (UI). Authors do not accept their own work.
- **Selection rule:** [architecture change boundaries](../../architecture.md#change-boundaries). A slice needs a reproducible invariant failure, a concrete coupling named by a stated rule, or an obsolete path. File length or tidiness alone is not a reason.
- **Not authorized by the directive:** pushes, deployment, paid provider or real-model runs, restarting the user's Host, and removal of capabilities that an owner record lists as accepted or deferred. Those removals are listed under [Needs a ruling](#needs-a-ruling).

## Inputs

Three read-only Sonnet surveys against `main` at `87e2207`: architecture-boundary violations; obsolete paths and dead code; the responsibility map of `app/server/service.mjs`. Their findings are disposed in the slices below or under [Needs a ruling](#needs-a-ruling). A finding is not adopted until the parent reproduces or reads the evidence.

Baseline at `87e2207`: `npm --prefix app test` 1844/1845. The failure, `review-core-client-lifecycle`, is the known concurrent flake in [verification](../../verification.md) and passed 13/13 when rerun alone.

## Slices

Slices run in order. Each entry records the defect or coupling, the fact owner, the change, the checks and the non-author review.

### S1 · Persisted state must load again

- **Defect, reproduced.** Deleting a Chat that had a manual compaction record kept the `operations` row, which names the deleted Session. The Store validates the whole state only on load (`validateOperations`), so the next Host start refused the state file: `invalid runtime state: operation.sessionId`. Found by the `service.mjs` survey (refusal gap) and reproduced against `87e2207`.
- **Root cause.** Each Store write checks only what its own mutation touches (`validateLocalPiEvents`, `validateKitBindings`, `validateExecutorState`); nothing held a write to the load rule. An experiment that ran `validateState` on every write found one more divergence: `createSession` accepted a missing `workspaceDir` outside `unassigned` scope, which the loader rejects (test fixtures only; the service always passes one).
- **Fact owner.** Host RuntimeStore (`app/server/store.mjs`), Astra's core lane; contract [HTTP API](../../../app/docs/api-v6.md). Nearest precedent: `deleteSession` already cascades runs, events and questions.
- **Change.**
  - `deleteSession` also removes the Session's compaction records and refuses while that Session's compaction runs; the service refuses `409 operation_active` while any compaction runs, beside the existing any-Run `409 active_run`.
  - `createSession` requires a workspace for every scope.
  - Kit binding validation, which every write runs, indexes `runtime.bound` events once per call instead of filtering all events per Run; the load validator does the same for event → Run lookups.
- **Why not validate every write.** Measured on a synthetic 3,000-Run / 30,000-event state: `validateState` about 0.9–1.7 s; the existing per-write clone and serialization about 1.1 s. Validating each write would roughly double the cost of a write. Instead, every Host a test boots is held to the load rule once when it closes (`tests/helpers.mjs`), which covers the whole suite without a production switch.
- **Measured side effect.** Per-write Kit validation at 3,000 Runs: about 923 ms before, 1.4 ms after (1,000 Runs: 102 → 1.9 ms).
- **Checks.** A new CMP-01 test (compact, delete, restart) fails without the fix and passes with it; the refusal test asserts `409 operation_active` for deletion during a compaction. Each test file alone under the close check: all pass after two fixtures pass a workspace.
- **Suite.** `npm --prefix app test` 1846/1846.
- **Non-author review (Sonnet).** All six claims confirmed. Evidence: store-level probes; a 300-case differential fuzz of the old against the new Kit validator; a check of every collection the loader reads for references a delete leaves behind. `asyncTasks` are retained by design, and the validator accepts their missing Session. Findings and dispositions:
  - Adjust, returned to the UX owner: the delete dialog shows "Unavailable while a Run is active." for any 409, and the row's Delete stays enabled during a compaction (`web/app.mjs` delete dialog, `web/object-commands.mjs`). The refusal is correct; only the copy and enablement lag.
  - Adopt as stated: a close-time validation error in a test's `finally` replaces that test's own error. This is intended; the persisted-state failure is the stronger signal.
  - Defer: Hosts started directly through `startServer` or `RuntimeStore`, not through the helpers, are not held to the close check. Reopen if a divergence shows up in a Store-level fixture.

### S2 · One provider route for every model request

- **Gap, reproduced.** Run admission and manual compaction both send model requests, but compaction repeated only part of Run admission's provider checks. It skipped descriptor validation, the per-kind route and admissible-model checks, and the reasoning-effort check. With a saved effort the model no longer supports, a Run was refused `503 effort_unsupported` while a compaction was accepted (`200`) and sent the summary request with that effort. Found by the `service.mjs` survey (candidate 3).
- **Fact owner.** Host service Run admission (`app/server/service.mjs`); contracts [HTTP API](../../../app/docs/api-v6.md) and [commands and compaction](../../../app/docs/commands-and-compaction.md).
- **Change.** Run admission's route checks moved unchanged into `#admitProviderRoute()`, evaluated against the saved configuration; Run admission and compaction both call it. The command catalog reports `/compact` unavailable on a route it refuses. The provider-save path keeps its own 400-level input validation, and provider verify keeps its own gate; both are separate contracts.
- **Checks.** A new CMP-01 test fails against the previous `service.mjs` (`200` instead of `503`) and passes after the change. `npm --prefix app test` 1847/1847.
- **Non-author review (Sonnet).** Run admission is equivalent: the moved checks read only fields the derived Run provider copies unchanged; no `await` separates the gate from the copy; the Local Pi `baseUrl` override applies to the copy afterwards. No previously valid compaction is refused: only the Pi port supports compaction, and 14 affected test files pass. The only other model-request path, provider verify, has its own gate. Dispositions:
  - Adopt as stated: a compaction whose model no longer resolves now reports `503 provider_unsupported` instead of `503 provider_error`, the same as a Run. The later `!model` guard stays as a defensive check.
  - Adopt as stated: route refusals (503) now precede `409 compaction_unavailable` and `409 credential_missing`, the same order as Run admission.

## Needs a ruling

These are removals or data decisions that the directive does not settle, because an owner record lists the code as accepted, deferred or preview capability.

## Deferred

These are findings kept with a reason; each reopens when its trigger occurs.

- **Whole-state rewrite per Store write.** Every mutation clones and serializes the entire RuntimeStore state, about 0.3 s per write at 1,000 Runs and 1.1 s at 3,000 on the synthetic state above; coalesced streaming snapshots are writes too. This is the storage design (architecture unit M06), not a slice. Reopen when a user's store reaches a size where writes are felt, or when storage is replaced.
