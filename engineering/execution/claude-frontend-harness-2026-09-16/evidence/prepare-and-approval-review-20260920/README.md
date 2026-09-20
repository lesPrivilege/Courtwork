# Preparation and approval identity: independent review

2026-09-20 · Astra disposition, Luna non-author source/seam review and Astra OpenAI computer use. Candidate **afc9f3193bf5b5913da566937e35e1554da14935**, based on main **962046d8b264f1d4aae5bd7f3dff9e1d69f40c21**. **Hold product integration: three bounded preparation UI returns remain with Claude.** No product source was changed in this review.

## Accepted scope and author decisions

Retain the successful prepare-before-inference path and the approval identity projection. Astra independently prepared one Chat/binding/candidate with **zero events**, reloaded with the typed Home draft intact, and sent into that same Chat. Host receipts show one Chat, one bind command and one candidate command before the deliberate replacement. This is Local test execution, not a second real-model dogfood claim. See [before-send receipts](browser/before-send.json), [after-send receipts](browser/after-send.json), [prepared screenshot](browser/01-prepared.png) and [reload reading](browser/02-reloaded.ax.txt).

The write approval displays candidate revision 1 and write revision 0; the check displays write revision 1 without inventing a candidate revision. After the synthetic Host API deliberately stopped and replaced the candidate, browser reload and the decided records still showed the original candidate `c7a64515-41a2-4efe-8385-56068982a315`, whereas the current candidate is `ac5f4edc-868f-4a3d-9480-8b48e9158e94`. [Replacement receipts](browser/replacement.json), [historical AX](browser/05-historical.ax.txt), [screenshot](browser/05-historical.png). Replacement commands used the isolated HTTP API; preparation, send, both approvals and historical disclosure were actual browser actions.

**Adopt** the author's expansion into decided approval records: it answers the same historical-identity question using the same recorded payload and grants no new authority. **Adopt** leaving the prepared title unchanged on a later first send; automatic retitling is outside this order. Ordinary tool arguments remain deferred to the existing Runtime/Host owner. Do not redo accepted approval presentation or widen this return into Runtime management.

## Bounded return to Claude

| Input | Disposition / owner | Required correction and evidence |
|---|---|---|
| PA-R1: lost reply routes to a new candidate command | **Adopt — Claude, existing Home preparation/card owner; blocks integration.** | Preserve a reachable recovery action using the original preparation marker after every partial success, including reload. Reconcile current Host facts before deciding which command remains. Recover original request/candidate identities rather than fall through to the card's ordinary create/bind actions. Execute all three lost-reply cases through the actual Home/controller/card path, not only direct helper invocation; assert one Chat/binding/candidate and no Run. A definitively failed step must keep a usable correction path. |
| PA-R2: conflicting controls during preparation | **Adopt — Claude, workspace card; blocks integration.** | Include preparation pending/uncertain state in the mutation lock. Remove/change-folder and duplicate start must not be actionable while their owner is preparing or its outcome is unresolved. Keep nonmutating reading/navigation available where appropriate. Add the pending-card regression and verify pending → success/error focus and unlocked recovery. |
| PA-R3: Recent first-send leaves stale Home marker | **Adopt — Claude, Home/Chat lifecycle; blocks integration.** | Reconcile the matching prepared Chat when the first Run is admitted through Recent/ordinary Chat, not only Home Send. Retire obsolete preparation status so New chat works and Home does not claim nothing was sent. Preserve unsent Home text/materials deliberately; never silently send or delete them. Failed or uncertain sends remain recoverable. Test Recent → first send → Home → New chat and reload, including admission failure. |
| Secondary active-binding/path mismatch | **Adjust — Claude within PA-R1 recovery.** | Reconcile binding identity and Host-canonical path before continuing; do not silently continue against a different source, and do not introduce raw-string equality that rejects `/tmp` versus `/private/tmp`. No automatic rebind or new backend rule is authorized by this observation. |

### PA-R1: real browser counterexample

The isolated proxy on 8919 forwards to this review's Host 8918. It lets the candidate-create command complete with HTTP 200, then replaces that one response with synthetic 503. No product code is modified. The open Home card shows failure and exposes ordinary **Start private candidate**. Clicking it produces a different request ID and candidate ID and receives HTTP 409, visibly “repository candidate changed; refresh before retrying”.

The [two-command log](browser/lost-reply-commands.jsonl) records both payloads and actual Host status. [Failure AX](browser/07-lost-reply.ax.txt), [retry AX](browser/08-retry-conflict.ax.txt), [screenshot](browser/08-retry-conflict.png), and the [test-only proxy](browser/lost-reply-proxy.mjs) preserve the method. This proves a broken visible recovery route; it does **not** claim the Host created two candidates. The Host correctly refused the second command.

### PA-R2: pending-state counterexample

Astra's [pending browser AX](browser/06-pending.ax.txt) shows Remove and Sending… enabled while the composer itself is locked. Luna's independent tiny-DOM probe reports `removeDisabled:false`, `startDisabled:false`. `prepareHomeChat` guards reentry, but that does not prevent Remove from changing the staged path while work is in flight. This is a frontend ownership/lock correction, not a permission-system change.

### PA-R3: real browser counterexample

Astra prepared **Recent lifecycle review**, opened it from Recent, sent “Synthetic lifecycle check” with the Local test provider and observed a completed Run. Back on Home, New chat produced “A prepared chat is waiting for your first message”, while Home still displayed “Nothing was sent” and Continue displayed Completed for the same Chat. [Host events](browser/recent-send.json), [AX](browser/09-recent-lifecycle.ax.txt), [screenshot](browser/09-recent-lifecycle.png). The original Home text was retained; the return must preserve that input while fixing the obsolete preparation lock.

## Verification and limits

Luna independently passes **56/56** targeted tests, exit 0: preparation/approval, workspace-card, candidate-ui, check-approval-revision and workspace safety. [Report](luna-review.md), [unfiltered log and probes](luna-review.log). Those green tests do not cover the broken UI recovery routes above. Author 69/69 owner suites and full 1302/0 remain author evidence at `afc9f31`, not independently rerun here. Author packet remains at that SHA under `evidence/prepare-and-approval-20260920`; its bytes are unchanged.

OpenAI browser work used only independent synthetic Host/data and ports 8918/8919. No personal credential store or real provider was used. Native 200% zoom, screen reader, forced colors, attachment-upload recovery and the wider G4 matrix were not run; earlier residuals remain open. Screenshots establish these bounded states, not a whole-product visual baseline.

Review tabs and both review processes were closed/stopped. Synthetic source remains clean; its defective source bytes were not edited (the candidate was). User Host 8787 and preview 8899 remain running and untouched. Main receives only this review/owner documentation. Candidate branch/worktree and all evidence remain for Claude's correction; no source merge, archive deletion, push or deployment. Heartbeat remains paused.
