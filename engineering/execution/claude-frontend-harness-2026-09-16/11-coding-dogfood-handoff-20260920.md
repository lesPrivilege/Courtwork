# 11 · Coding dogfood readiness and WebUI handoff

2026-09-20 · **Status: delivered at `94d60d2`; independent positive-path rehearsal passed; bounded correction pending before integration.** Architecture/integration: Astra. Implementation: Claude, serial product writer after accepting this order. Independent verification: Luna. Human/operator: the user starts the WebUI after the readiness handoff; subsequent computer use stays on an OpenAI provider.

**Luna exploration consumed:** at `e687762`, the existing runtime smoke is in-process `ws_*` execution and explicitly excludes HTTP/UI; the current check regression reopens Store records but does not hand the user a clean restartable HTTP/WebUI scenario. Astra adopts a fresh-process public-HTTP rehearsal plus preparation packet as this order's concrete remaining seam. This is a scope review, not implementation acceptance.

This is the next bounded consumer of original **11 / N-02 / RD-006 / DF-04 / RD-009**, not a new roadmap. Read [current](../../current.md), [the original assignment](README.md#11--同一候选提交的真实合流), [repository binding](../../../app/docs/repository-binding.md), [check recipes](../../../app/docs/check-recipes.md), and [the accepted first Core correction](evidence/core-check-revision-20260920/README.md).

## Outcome

Deliver one reproducible coding scenario that the user can open in CW and give to its agent: read a known defect in an explicitly connected repository, obtain approval for a private-candidate edit, invoke the Host's fixed check, inspect exact changes/results, then stop/reopen and continue from durable state. Deliver a working offline rehearsal and a pasteable natural-language task plus startup/recovery instructions. Repair only actual defects blocking this path.

**Two distinct results:** `ready for WebUI dogfood` means the preparation and deterministic Host path passed independent review. `real-model dogfood passed` requires the later actual CW agent/browser run and its evidence. This order can establish the first; it must not close N-02 using synthetic calls or the author's own shell edits.

## Baseline and writer boundary

- Observed product main: `e6877623c4271922717ef74ca472031f3d1c6ef3`. At pickup, verify actual branch/HEAD, current record, worktrees, active writers and dirty ownership. Start a **new isolated worktree from current integrated main** containing this order and the accepted `8aef0bd` correction; record exact starting SHA. Do not revive an archived GUI/Core/Fresh tree.
- Claude owns this one implementation scope. You are not alone in the repository: preserve unrelated edits, and never checkout/reset/stash a shared active tree. No parallel product writer is introduced by this order.
- Already accepted: GUI G1–G4 within its recorded limits; same-Run write/check revision binding; pre-spawn cancellation; final source hashes and independent 27/27 checks. Do not reimplement or roll back those corrections. Full G4 residuals retain their original owner and are not this readiness prerequisite.
- Main-only `.agents/`, `.obsidian/` and `skills-lock.json` are unrelated existing files. Frozen Courtwork-legacy-frozen and its shared Git database remain untouched.

## Reuse before adding code

| Existing implementation | Use and limitation |
|---|---|
| `app/tests/fixtures/synthetic-repo/create-synthetic-repo.mjs` | Dependency-free Git repository with a known pagination defect and native `node --test`; use its generator rather than copying fixture files |
| `app/tests/check-recipes.test.mjs` | Real HTTP approval, candidate write/check, cancellation and reopen precedents; the accepted same-Run case proves revision 1 |
| `app/tests/check-approval-revision.test.mjs` | Approved descriptor drift and no-child cancellation barriers; retain these exact invariants |
| `app/scripts/runtime-smoke.mjs` | Public runtime-service read/write/reopen precedent; currently managed `ws_*` artifacts, not a repository candidate/check walkthrough |
| `app/scripts/harness-node1-fixture.mjs` | Synthetic server lifecycle precedent; its temporary DeepSeek loopback configuration is not a user's real model connection or a reusable credential setup |
| Existing candidate create/diff/effects APIs and Workspace/This chat surfaces | Reuse authoritative Host commands and records; no fixture may fabricate persisted Run/effect state to pretend the path worked |

## Serial work

### 1. Prepare a clean, recoverable scenario

Provide or adapt a small operator-facing preparation entry under `app/scripts/`, reusing the fixture generator and existing startup contract. It must create independent synthetic source and Host data directories outside the product repository and personal data; output the actual source commit, paths, startup command, URL/port selection instructions and manifest. Do not overwrite an existing nonempty destination. A rerun must explicitly reuse/inspect an identified preparation or create a fresh one, never silently reset an existing candidate.

Keep an untouched instance available for the user's browser run. The automated rehearsal must use separate scratch state so the user does not open an already-fixed task. Default to the local deterministic provider; do not copy credentials, discover personal configs, select a paid provider or alter native Pi/Hermes installations. The user will choose/configure an authorized real connection later. Stopping the preparation/test process must not delete the user's prepared data; document explicit cleanup separately.

The launch instructions must work from the checked-out source without a hard-coded author home, test port, stale dependency tree, or hidden prior seed. Use the actual `SE_RUNTIME_DATA_DIR`/Host startup contract. Print no access tokens or key values in durable manifests.

### 2. Exercise the assembled Host path and fix demonstrated blockers

Start the actual Host in a separate process on an ephemeral loopback port and drive its public HTTP routes with a deterministic provider and a real synthetic repository check. Verify the WebUI document/assets are served, while leaving actual browser interaction to the subsequent user-launched pass. Keep request authentication in memory and redact it from evidence. The important new seam is a repeatable prepared scenario and resumable handoff, not another copy of all existing unit tests.

- Start with an ordinary Chat and an explicit repository binding/private candidate; preserve session identity through resource connection. Record the source SHA and candidate identity.
- Read the actual source, establish the known failing check, then request and approve an exact candidate edit. In the **same Run**, request/approve `check_run` against the confirmed new write revision. Verify actual exit 0 and matching call/revision/result references. The source repository remains unchanged.
- Inspect the exact candidate diff and write/check outcomes through their existing public readers. A generic `Writes` count or an assistant success sentence alone is insufficient evidence. Do not manufacture a formal Core Artifact/Decision for ordinary coding output.
- Stop the Host process and start a fresh Host process against the same rehearsal data; resolve the same session/candidate/history and continue a **new** bounded read/check task. Verify no duplicated write, implicit retry, old-binding recomputation or replay of the earlier check. A new deliberately requested check is a new execution with its own identity.
- Preserve a bounded cancellation and stale/revoked approval case using actual supported seams. Reuse accepted lower-level cases where they already cover the invariant; distinguish any injected synthetic fault from an operator-reachable browser action. Unrepresentable cases remain explicitly unexecuted, not simulated through fabricated receipts.

Inspect the current task-relevant result/recovery surfaces before changing UI: older slice 02 records mention missing write-effect presentation, but current bytes decide whether a gap remains. If a real blocker exists, fix it in the original service/projection/surface owner and record the nearest implemented precedent and affected UX grammar **before** editing. Use the existing result/details surface; no new dashboard, state store or mandatory Settings redesign. Read UX Grammar and the frontend contract for any UI changes. Broader semantics/schema/permission changes return to Astra with a concrete failing case.

### 3. Produce the user handoff

Deliver a compact packet under this owner record containing:

1. One tested preparation command, one exact Host startup command, stop/restart instructions, the retained data/source paths, and the source/candidate identity rules.
2. A short **natural-language prompt** to paste into CW: diagnose and fix the pagination defect, use governed candidate writes and the fixed check, report exact changes/results, and leave the original source unchanged. Do not put the solution line, fixture tool-call script, keys, or a precomputed success answer into this real-model prompt.
3. A separate deterministic replay input for offline wiring checks, clearly labeled synthetic. Its known fix must not be presented as agent reasoning evidence.
4. A browser checklist: connect/start candidate, inspect/approve the edit and check, open matching diff/result, stop where appropriate, reopen the same Chat and continue. Record actual provider/runtime/model, source SHA, Run/call IDs, decisions and outcomes. Missing real model/budget/browser evidence stays blank or `not_run`.
5. Exact author commits and executed commands/exit codes; source hashes; independent-recheck instructions; all remaining owner-held gaps; explicit writer release. Report whether the handoff is `ready for independent review`, not self-accepted.

The historical RuntimeLock task remains an N-02 reference. This first browser-ready rehearsal uses the existing synthetic-parcel fixture to isolate the complete product path; it does not claim that the historical RuntimeLock case was rerun or resolved.

## Exit and integration

Astra pins the delivered source; Luna checks the bounded changed seams and preparation/reopen behavior. Select tests under [verification](../../verification.md), including real startup evaluation rather than syntax checks alone. Do not repeat an unchanged full suite or accepted G4 capture campaign; run the required integrated checks when new code or unresolved risk warrants them. Preserve author, independent, browser and real-model evidence separately.

After independent readiness acceptance, Astra integrates locally under the existing authorization and gives the user the packet to launch WebUI. Claude stops at delivery and preserves its source/evidence for review; no automatic push, deployment or deletion of the task worktree. Existing heartbeat stays paused; this order does not silently restart it.

Out of scope: local runtime delegation, Agents API expansion, keychain/key migration, hook manager, CC Switch registration, enterprise gateway, Pages redesign and broad G4/accessibility completion. Those directions retain their owners and follow the dogfood consumer instead of becoming prerequisites for this order.

## Independent return — 94d60d2 — 2026-09-20

Astra pins source `3f04f76` and packet `94d60d2`. Luna independently passes the fresh-process public-HTTP rehearsal 14/14 and preparation/startup tests 8/8, but synthetic probes demonstrate preparation-root and command/manifest guard defects; startup-timeout cleanup is also unclosed. [The original-owner return](evidence/coding-dogfood-review-20260920/README.md) adopts DF11-R1–R4, strengthens the durable-event assertion in R5, and corrects permission/recovery/identity claims. Claude owns only these new utilities/tests/packet corrections; no previously accepted product work is reopened. Exact evidence and source hashes are retained there.

Ready-for-WebUI acceptance and local merge are held until the correction delta passes. The user-reserved instance remains unopened. The separate Agents frontend writer is active and preserved; no competing UI work or backend expansion is authorized by this return. The existing heartbeat stays paused.

## Round 2 integration responsibility — 2026-09-20

Candidate source `c6a2b91` / packet `231532a` is combined with main `066be48` only in `codex/dogfood-integration-20260920`; main and the Claude source tree remain unchanged pending acceptance. Astra owns a minimal integration correction if confirmed: apply the existing canonical instance-path guard to `runtime-data` as well as `source` before reuse reads or emits a launch command. The nearest precedent is this same utility's `sourceReal`/`isWithin` check (DF11-R3); no Host/store/schema/UI responsibility changes. Luna owns non-author verification of the actual corrected bytes and the original R1–R5 delta. Small packet corrections will distinguish Home's saved/default mode from the service fallback and retain exact environment/evidence scope. No redesign or new route is included.

Luna's round-2 process run independently passes 15/15 but confirms bootstrap response reading is outside the readiness deadline. Astra's same integration correction also bounds bootstrap headers/body with the remaining startup deadline, preserving the existing child cleanup path. Two synthetic stalled-response tests reuse the real Host/data lock and prove that the same data directory can start after the failure. The exported script helper is testable utility scope, not a product API. Luna will verify this delta independently; inherited PATH/HOME/TMPDIR are described accurately rather than claimed to be an OS configuration sandbox.
