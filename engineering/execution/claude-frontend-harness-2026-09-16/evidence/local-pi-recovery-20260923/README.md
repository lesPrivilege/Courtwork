# LP-R6 · retained Local Pi findings recovery

2026-09-23 · Sol author record. Baseline `1ae7d945f05b85a1e967422a51f19b60fdb09ad6`; branch `codex/local-pi-retained-recovery-20260923`. Architecture/integration remains with Astra. This packet is author evidence, not independent acceptance.

## Representability and boundary before product edits

The current data model can represent the requested result without weakening its unknown fences. `local_pi.result` already binds exact retained bytes/hash to the assignment, attempt, Run, dispatch packet and native session; `local_pi.terminal{status:'completed'}` proves the owned process completed. `validateLocalPiEvents` permits the Host Run and attempt to retain their historical `unknown` state while an assignment result points to that matching completed receipt. Its published-result validator requires the result revision's hash/bytes to match those receipts, but does not rewrite Run or attempt history.

Affected responsibility: Spark/Subagents publication in `app/harness/subagents.mjs`, using existing Local Pi receipt validation and `ArtifactHistory`. The explicit authenticated `reconcile` action is the only recovery trigger. Nearest owner precedents are `Subagents.settle` (exact result/source checks and atomic assignment publication), `Subagents.readResult` (authorization, source-policy and immutable-byte readback), and the existing `localPiRunUnresolved` gates on reconcile/retry/admission/deletion.

Transition: for one blocked Local Pi assignment whose latest attempt and Host Run are historically unknown, require matching `local_pi.result` plus completed `local_pi.terminal`; read and validate the retained UTF-8 bytes and current authorization/source conditions; then atomically append exactly one finding result while leaving assignment status blocked, attempt/Run unknown, reason/fences intact and recording the normal command CAS receipt. Revalidate authorization, cancellation, receipt identity, retained bytes and source revisions inside the publication mutation. Same-command replay returns the first state; stale/conflicting commands retain existing behavior.

Excluded: negative terminal resolution, Run/attempt/status repair, source-read fabrication, retry/admission/deletion unlock, schema/state/route/permission/runtime changes, new process or provider work, frontend changes and formal acceptance.

The pre-edit crash-window reproduction and final verification are recorded below.

## Pre-edit reproduction

[`pre-edit-crash.log`](pre-edit-crash.log) runs the accepted actual Host crash fixture before product edits. All four windows pass. In the `result` and `terminal` windows, exact bytes read `Retained before publication.`, the assignment has no result, the reopened attempt is unknown and old reconcile/retry cannot redispatch. The terminal window therefore supplies the requested concrete result+terminal-retained/publication-absent case. [`setup-failure.log`](setup-failure.log) retains the initial dependency-link path mistake; it failed before test loading and caused no product action.

## Author verification

[`author-tests.log`](author-tests.log) records **45 passed, 0 failed**, exit 0:

```text
node --test tests/local-pi-retained-recovery.test.mjs tests/local-pi-host.test.mjs tests/local-pi-session-deletion.test.mjs tests/subagents.test.mjs
```

`node --check harness/subagents.mjs`, `node --check tests/local-pi-retained-recovery.test.mjs` and `git diff --check` pass. The temporary `app/node_modules` link was removed after testing. No paid provider or user Host was used.

The detailed matrix and writer release are in [author-status.md](author-status.md).

## LP-R6-UI return boundary before product edits · 2026-09-23

Parent browser review of source `afa6b17` found that, after explicit recovery publishes findings for the current unknown attempt, the Spark detail still offers Reconcile. Repeating it produces a refusal beside the readable findings. This return owns only `app/web/subagent-view.mjs`, a direct view test, and this author packet. It projects the existing `assignment.result.runId` and latest `attempt.runId`; it does not change Spark state, Host receipts, retry/admission/deletion fences, or recovery eligibility. An older result must not consume the latest unknown attempt's Reconcile action.

Owner fact and nearest implemented precedent: `Subagents.recoverRetainedLocalResult` publishes a matching result while the attempt and Run remain unknown; `createSubagentView.detail` already places status help and typed actions beside findings. The action/decision role uses the current `form-help` text and `quiet-button` control. No token, geometry, glyph, color, or layout change is proposed; existing fine/coarse pointer and text-scale rules remain. The content's action controls and result reading stay in the same order, with dialog focus/scroll ownership unchanged. UX-02/04/05/06 require the unknown outcome, readable findings, and blocked retry to remain distinct. Verify the real view with synthetic unknown/no result, unknown/current result, unknown/older result, and completed/non-local states; parent retains actual browser and independent acceptance.

The view now compares the latest unknown attempt's `runId` with the current result's `runId`. A match replaces the generic unknown help with findings-available / execution-unresolved / retry-blocked guidance and removes the consumed Reconcile control. A missing result or an older attempt's result keeps Reconcile. Existing result reading, source actions, completed Archive and failed Retry stay in place. This changes projection/copy only; schema 21, Run/attempt status, `Subagents.recoverRetainedLocalResult`, and all backend fences are untouched.

Author checks at this return: `node --test tests/subagent-recovery-view.test.mjs tests/spark-view.test.mjs` **31/31, exit 0** (five direct production-view states plus adjacent Spark view checks); `node tools/lint-interaction.mjs`, `node tools/check-doc-links.mjs`, `node --check web/subagent-view.mjs`, `node --check tests/subagent-recovery-view.test.mjs`, and `git diff --check` all exit 0. The first direct-view attempt failed 4/4 because TinyDOM does not persist writes through its synthetic `dataset` getter; the test now locates the rendered task by its visible button text and passes without changing production code. Parent's actual browser review remains the final UI acceptance; this author did not run browser, native zoom, screen reader, forced colors, paid provider, user Host, or full backend suite for this projection-only correction. Original LP-R6 backend 45/45 evidence remains pinned to `afa6b17`, not restated as a run at this source.
