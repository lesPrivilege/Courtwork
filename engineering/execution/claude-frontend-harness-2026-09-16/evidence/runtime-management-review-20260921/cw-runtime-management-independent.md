# Independent review — 06c Runtime management

Date: 2026-09-21
Candidate: 84faff90235ecd5716bff7fe91448b86a2457213
Tree: /Users/lesprivilege/Projects/.worktrees/courtwork-runtime-management-20260921
Base: ff553e89ba26ba5e3db6b8ee6071bb3f7cc5bd93
Review scope: controller, view, synthetic adapter, proposed contract, isolation, and focused tests. No product edits, browser automation, provider calls, credentials, or user processes.

## Decision

Return one bounded view-copy correction before acceptance. The controller's operation identity, per-runtime locking, revision guards, late-read guards, and synthetic isolation are acceptable within the stated frontend-preview scope. The return does not require backend or schema work.

## F01 — unknown command plus dirty draft is described as “Not applied”

Severity: acceptance blocker for truthful recovery copy; no duplicate-effect path was found.

Reproduction on the fixed candidate, using the public controller/view and synthetic adapter:

1. Open Hermes.
2. Set the connection label to Independent Hermes.
3. Configure the adapter as lost-reply.
4. Run connect.

Observed DOM/state:

- command status: “may or may not have taken effect”; mutation controls remain locked and Check status is offered.
- draft summary: “Requested: name “Independent Hermes”. Not applied; saved is revision 6.”
- controller operation: status unknown, operationId probe-1, receipt null, readBack idle.

Independent probe output is retained in the review notes and was run with the real runtime-management controller, real view, and fixture. The source coordinates are:

- app/web/runtime-management-view.mjs:289-303 correctly presents unknown/checking as possibly applied and says the draft is kept.
- app/web/runtime-management-view.mjs:540-549 unconditionally renders the dirty draft as “Not applied”.
- app/web/runtime-management.mjs:338-347 keeps a non-settled transport error as unknown.
- app/tests/fixtures/runtime-management/adapter.mjs:450-456 commits the effect before throwing the lost-reply error.

This contradicts UX-01/UX-02 and the 06c recovery rule: the draft is local unsaved input, but the command outcome is unknown. It can mislead the user into treating an unknown command as a safe no-op even though the page correctly prevents resending.

Minimal correction: branch the draft-summary wording on operation status. For unknown/checking, say that the current text remains a draft and the last command may or may not have applied. Keep “Not applied” for a draft after a confirmed or explicitly not-applied command, where that statement is true.

This is a view-only return. Do not loosen the unknown lock or make Check status resend.

## Accepted findings

- Per-runtime pending operations survive list/detail navigation. app/web/runtime-management.mjs:74-89 and 202-242 maintain separate read epochs and a runtime-keyed operation map; tests at app/tests/runtime-management.test.mjs:469-546 cover late list/detail/command replies and list refresh.
- Unknown outcomes are fail-closed. runtime-management.mjs:338-347 accepts only the listed settled refusal codes; unknown/checking locks mutations at :107-119 and :352-384. The lost-reply test confirms one effect, one status lookup, and no resend.
- Draft identity after successful commands is guarded. runtime-management.mjs:181-191 deletes the draft only when it still equals the sent configuration; a newer draft remains unsaved. Connect/read-back and disconnect/history tests pass.
- Revision and active-run semantics are correctly represented by the fixture. adapter.mjs:193-201 leaves disable available while a bound Run remains, but refuses disconnect while bound at :196-200. Tests at runtime-management.test.mjs:264-290 verify disable changes future admission and does not stop/migrate/queue the bound Run.
- The candidate is isolated. The fixture declares invented Pi/Hermes/Codex data and no native/process/configuration access at adapter.mjs:1-12. The preview host is read-only and the only production diff is adding the two modules to the static allowlist; no Settings wiring or service/store/runtime changes are present in the candidate diff.

## Coverage and limits

Independent commands:

- node --test app/tests/runtime-management.test.mjs: 26/26, exit 0.
- node --test app/tests/runtime-management.test.mjs app/tests/agent-profiles-specimen.test.mjs app/tests/coding-start-friction.test.mjs app/tests/static-web-manifest.test.mjs: 67/67, exit 0.
- Test log: /tmp/cw-runtime-management-independent-tests.log.

The author’s stated limits remain valid: the fixture is one in-memory owner; real two-tab concurrency, restart during a pending command, and a long pending status lookup are not independently exercised. The controller source keeps those outcomes fail-closed, but they are not acceptance evidence for a production adapter.

## Separate existing-owner note

The author packet’s observation about the accepted 06a null child is source-confirmed and remains outside this candidate: app/web/agent-profiles-view.mjs:348-351 passes runtime.model.note ? element : null to native append; the contract permits note:null. Record this only with the original 06a owner. It is not a 06c return.

No merge, integration, acceptance, or product implementation was performed.



## F02 — stale read-back is marked done

Severity: acceptance blocker for read-back consistency; no duplicate effect occurred in the probe.

A public-controller probe wrapped only adapter.open so the initial Hermes detail was revision 6 and the post-connect read-back returned that same stale revision. The command itself returned a confirmed receipt at revision 7. Result:

    {"openCount":2,"detailRevision":6,"receiptRevision":7,"readBack":"done","connectAllowedAgainstStaleDetail":true,"reconnectAllowedAgainstStaleDetail":false}

This is reachable through the injectable adapter contract and does not require private state or a helper call. The stale read is presented as completed read-back even though its revision is below the command receipt. Because the stale detail also says Hermes is disconnected, the page offers Connect using stale facts; the fixture's revision precondition would refuse the next command, so this probe found no duplicate effect, but the UI has already claimed an invalid read-back and exposed an action against stale state.

Source:

- app/web/runtime-management.mjs:141-145 has the revision guard inside adopt: confirmed read-back is done only when detail.revision is at least the receipt revision.
- app/web/runtime-management.mjs:165-173 then overwrites that guard with readBack = "done" whenever readPage returns true, regardless of the returned revision.
- app/web/runtime-management-view.mjs:342-350 renders the stale detail as “Read back: revision 6”.
- app/web/runtime-management-contract.d.ts:118-120 defines revision as the owner's confirmed saved revision; CommandReceipt revision at :177-184 is the revision produced by the command.
- 06c order:21-25 requires read-back to confirm exact identity/revision and makes stale replies unable to create a second effect.

Minimal correction: afterConfirmed must preserve the adopt revision check. Mark read-back done only when the returned detail revision is at least the receipt revision and the returned identity/connection facts match the receipt; otherwise retain a stale/read-back-needed state and keep mutation actions locked until a fresh read succeeds. Do not treat a successful transport response alone as valid read-back.

The independent probe was source-only and used the synthetic fixture. Its output is recorded at /tmp/cw-runtime-management-stale-read.log.
