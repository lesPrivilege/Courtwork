# Verification: choosing checks and stating evidence

This page governs how verification is chosen for the current work order and how its evidence is stated. It does not replace the Core/Host contracts, the existing Release gates, or the concrete test commands.

## Principle

Write down the user outcome, the invariants that may fail, and the real seams the change crosses. Then choose the cheapest check that could detect that failure.

A green test supports only the assertions it actually executes. It cannot establish that the architecture is sound, that a model has the capability, or that the whole product works; each of those needs its own evidence. Do not repeat the same full suite when nothing has changed, nothing has failed, and no doubt is unresolved.

## Claims and exit evidence

Before changing code, state in the original task contract the delivery scope you intend to claim and the evidence that will close it. Four claims are stated separately: the source runs, the synthetic path holds, a real Agent completes the task, and a human formally accepts. They are not levels that advance automatically; whichever claim is made needs its own matching evidence.

Record the author's self-check, a non-author review, and a human Decision each with its actual identity and scope. An exploration report cannot stand in for independent acceptance.

## From risk to evidence

| Change and risk | Preferred evidence | Escalate when |
|---|---|---|
| Copy, indexes, generated output | Review of the corresponding source; link and generation sync; for visible changes, the actual page | Layout, focus, or action meaning changes: check the adjacent complete scenario |
| Pure projection, field semantics, state branches | Unit or contract tests with fixed input | The failure could occur at the HTTP, persistence, or SDK boundary: add that seam |
| Save, CAS, permissions, async receipts | Actual Host/service integration with independent synthetic data; verify stale receipts and the current draft | DOM state, return focus, or real browser behaviour carries the weight: add the GUI |
| Multi-surface user path | Deterministic Host/GUI task: actual operations, state, and user outcome | Geometry, hierarchy, long text, narrow screens, light/dark, and keyboard are checked in an actual browser |
| An Agent's ability to complete a real task | Authorized real-harness task, artifact inspection, and human review | Record by model/API/tool/permission; a synthetic provider cannot substitute for capability evidence |
| Cancellation, recovery, lost receipts, migration | One explicit fault, one invariant, independent data, and the recovery result | Widen the fault matrix only for a different risk or an uncovered boundary |

## New end-to-end paths

For every new end-to-end path, note six items in the original task or delivery record: the user outcome, the cross-system risk, the invariant, why a cheaper test is insufficient, the fixed input and how to reproduce it, and the run cost and the trigger for re-running. This is not a new approval table or test framework for every helper.

## Real-browser acceptance

Real-browser acceptance stays exploratory: confirm that the result can be found, that state is legible, that actions can be recovered from, and that the visual relationships across the whole page hold. Automation uses stable semantic locators and only the DOM facts it needs. Screenshots serve geometry and visual judgement; do not capture full-screen images per action. Tool token cost varies with the page and the sampling, so no external fixed savings ratio is adopted as a fact of this repository. Long-term automation is built only for paths that are complex or fail repeatedly.

## Real harness versus deterministic GUI

Keep real-harness verification and deterministic-GUI verification in separate accounts. The former answers whether the model completed the task; the latter answers whether the application correctly presents and saves known facts. Run, candidate, authorization, and formal acceptance remain with their respective owners. When a product bug reproduces reliably, sink its minimal counterexample into the relevant contract or integration test first, and keep a few valuable end-to-end regressions.

## Reviewing an implementation against its contract

A passing suite says which assertions ran, not which contract claims hold. To review a module, number the normative claims of its contract (invariants, transitions, authority rules, lifecycle and failure semantics). For each claim record where it is implemented, which test asserts it, and the level the test exercises: pure unit with stand-ins, Host in-process with a fake provider, real HTTP server, real runtime with a deterministic provider, or real provider. Then look for counterexamples — a path that skips the check, a terminal state that can still change, an authority reachable by the wrong actor — and reproduce each one before calling it a finding. Contract text that code contradicts is itself a finding for the owner to rule on: fix the code or the contract, not whichever is easier. The [2026-09-29 review](reviews/doc-driven-code-review-2026-09-29/README.md) is a worked example.

## Minimum delivery evidence

Delivery evidence states at least: the source and input versions, the command or actual path, the result, the scope of author versus non-author work, and what was not run together with its limits. Reusing older evidence requires a statement of source relevance; an old screenshot is not relabelled as the new version. Real-provider calls, sensitive data, and outbound sends follow the user's existing authorization; this page does not by default start a paid model or a new background task.

## Adopted stack

The adopted stack is the existing Node tests, Host synthetic fixtures, and the available browser tools. XState, Playwright CLI, and other frameworks mentioned in external articles are optional methods only; this ruling introduces no dependency, no new runtime state, and no second state machine. The concrete commands are in the [root README](../README.md). UI coverage follows the [frontend continuity contract](design/agent-interface-2026-09-10/frontend-contract.md), recorded against the actual change.

## Current-pointer check

Run this check with each affected change: confirm that the schema and its migration owner, the supported-capability list, the media manifest, the install source, the paper adoption pin, and the release state are consistent across the current entry points. Mark unrelated items not applicable. A reachable link does not prove that these are semantically consistent. Historical receipts, specimens, and media keep their original SHAs and are not rewritten to sync the current entries; the paper adoption version moves only after an explicit upgrade ruling. The [pull request template](../.github/pull_request_template.md) records the checks completed and the remaining differences; it does not copy a second version ledger.

## Rules consolidated from past receipts

These method-level rules first appeared in dated receipts; they are stated here so they need not be rediscovered. The dates are the receipts they came from, now in the [archive](archive/verification-receipts-2026-09-16-to-2026-09-28.md).

- UI evidence recording: record CSS viewport, pointer mode, text scale, zoom, and DPR separately, following [visual-spatial-grammar.md](design/visual-spatial-grammar.md) (2026-09-21).
- Drive the production owner, not a test-local stand-in: lifecycle and integration tests run through the production module and the real card or controller, because a stand-in controller is not integration coverage. Source-pin assertions move with the code they pin and keep the same invariant, rather than being loosened (2026-09-16, 2026-09-21).
- Counterexample first: reproduce the failure on the unchanged baseline bytes before fixing, then show before and after (2026-09-20, 2026-09-21).
- No known flakes. An intermittent failure is closed by a demonstrated mechanism, not by a passing rerun. The former known flakes were each reproduced on demand and fixed in the test, as were three more found in the 2026-09-29 loop ([convergence loop S12](execution/converge-loop-20260929/README.md#s12--test-races-found-while-verifying-fixed-at-their-cause), 2026-09-30):
  - the former known flakes, `review-core-client-lifecycle` (Core bridge ready timeout) and `profile-editor` K5-R2;
  - MS-R2 in `models-save-flow`;
  - `work-summary`;
  - the two `local-pi` timing tests.

  A new intermittent failure is investigated the same way before it is called anything.
- State unexecuted checks explicitly, using the standard list: native zoom/200%, screen reader, forced colors, coarse pointer/touch, dark theme, error matrices, real provider, non-author review, and visual baseline (recurring across receipts, 2026-09-16 to 2026-09-28).
- Independent acceptance uses the parent's own browser session. DOM and network records from an author's tool are not a visual baseline (2026-09-20, 2026-09-21).
- Tests must not rewrite tracked evidence blobs during the default run (2026-09-19).
- For README or Pages changes, run the site build and its generated-output check (README source/output equality, also checked by the default suite) rather than relying on the product baseline; see [site/README.md](../site/README.md) (2026-09-22).

## Related

The user-registered [frontend testing stack and enterprise Agent discussion](research/frontend-testing-stack-2026-09-14/README.md) is a history input index only. Its external technical claims were not verified when registered, and it does not change this page's current choices or the adopted stack.

Adopted by Astra ruling 2026-09-14 ([consumption record](research/ux-grammar-2026-09-14/README.md)); dated receipts through 2026-09-28 are in [archive](archive/verification-receipts-2026-09-16-to-2026-09-28.md).
