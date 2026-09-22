# 11 · Coding dogfood readiness and WebUI handoff

2026-09-22 · **Current status: readiness accepted at `3618947`; the bounded basic real-browser journey is accepted at `95080e4`, followed by the prepared-Chat read/write/check/reload journey at `13e06cc`. Historical RuntimeLock reproduction, broader robustness and G4 remain open.** Architecture/integration: Astra. Implementation: Claude, serial product writer after accepting this order. Independent verification: Luna. Human/operator: the user starts the WebUI after the readiness handoff; subsequent computer use stays on an OpenAI provider.

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

## Final readiness acceptance — 3618947 — 2026-09-20

[Final disposition and source hashes](evidence/coding-dogfood-final-20260920/README.md) consume Claude's `c6a2b91` / `231532a` and two Astra integration corrections. Luna independently passes preparation 13/13, stalled-bootstrap lifecycle 2/2 and the final real-process deterministic rehearsal 15/15. DF11-R1–R5 are closed within this readiness scope. Local integration and preserved cleanup proceed under existing authorization; the user will launch the untouched synthetic instance from persistent Courtwork. No real-model, browser, G4 or slice02 write-effect acceptance is inferred. The paused heartbeat stays paused; 06a's return remains independent.

## Real provider finding: model-visible candidate hash — 2026-09-20

Astra's user-authorized real DeepSeek browser trial at main `6191733` found that `candidate_read` returns the prior file hash only in tool `details`, while Pi's provider serializer sends only `content`. The model reads the file but omits `expectedSha256`; a write is approved then rejected as `write_conflict`. Both recorded permission requests carried null prior hashes. The existing source and candidate remained unchanged. Supplying the hash manually let a diagnostic continuation complete the write and node-test (2/2, exit 0); this is assisted evidence, not autonomous N-02 acceptance.

Responsibility: RD-006 candidate-tool result contract, consumed by the locked Pi provider path. Host owns canonical bytes/hash, candidate identity, compare-and-swap and effect receipts. Nearest precedent: candidate list/grep tools already expose structured facts through `content`; retain `details` for local consumers. No Store/schema, provider, frontend or approval-bypass change.

User authorizes Astra serial integration with Luna exploration and Sol implementation. Sol owns only `app/runtime/repository-candidate-tools.mjs`, focused candidate/provider-boundary regression tests, and a small author receipt appended here, in the isolated `codex/dogfood-visible-hash-20260920` tree. Expose the **full original file** SHA-256 and path/byte scope in model-visible content even for ranged reads, preserve exact file text and existing metadata, make expectedSha256 usage discoverable, and retain stale-hash/new-file safety. Do not patch Pi/node_modules or teach a fixture the answer. Test actual model-visible serialization, not access to details. Luna independently verifies; Astra merges only the bounded fix and restarts the idle user Host before a fresh, unassisted synthetic run. Preserve the existing assisted/failure Chat and credential configuration. Other frontend friction is queued for Claude after this blocker; the pending 06a candidate `aca21c8` is not accepted or merged by this order.

### Sol author receipt — model-visible candidate hash

Sol's bounded candidate adds a second `candidate_read` text content block containing the canonical path, full-file byte count and SHA-256, explicit `hashScope: full-file`, the exact returned line bounds, and replacement/new-file `expectedSha256` guidance. The first content block remains the undecorated decoded file text, including Unicode and trailing-newline behavior; the existing `details` shape is unchanged. `repo_write` and the Host CAS, permission, candidate and receipt paths are unchanged.

Focused author verification passed:

- `node --test tests/candidate-visible-hash.test.mjs` — 2/2. The first test executes the real candidate tool through installed Pi 0.85.1 and captures Pi's second OpenAI-completions HTTP request at a synthetic loopback endpoint. It proves the model-visible tool message contains the full-file hash/bytes, path, range bounds and write guidance without reading `details`; its direct assertions cover ranged Unicode and a trailing newline. The second test proves a stale expected hash still reaches and is rejected by the Host CAS seam.
- `node --test tests/repository-candidate.test.mjs tests/candidate-visible-hash.test.mjs` — 25/25, exit 0.
- `node --check runtime/repository-candidate-tools.mjs`, `node --check tests/candidate-visible-hash.test.mjs`, and `git diff --check` — exit 0.

Author source SHA-256 before commit: `app/runtime/repository-candidate-tools.mjs` `3ae6dccf25593b5c24fd97a4bc77540d87be221044dccedbb041f1422c6a4301`; `app/tests/candidate-visible-hash.test.mjs` `04fdbde5f3490e4e1da78915fe362a5f62b632321844b359f859a1b1766e48e2`. This is ready for Astra/Luna independent review, not self-acceptance. Remaining real-model/browser acceptance stays open; the only material compatibility risk is a larger provider-visible result for every candidate file read, bounded by the existing candidate read limit.

## Real browser basic journey accepted — 2026-09-20

Astra accepts the bounded synthetic-parcel real-model journey on integrated `95080e4`, after Luna independently accepts the model-visible hash correction (25/25). [Completion and exact identities](evidence/real-dogfood-20260920/completion.md) separate the earlier assisted run from the new unassisted write/check at candidate revision 1 and exit 0 (2/2), unchanged source, reload, previous process-restart comparison and restoration-verified repair-tree cleanup. N-02's historical RuntimeLock reproduction and broader robustness remain open; no G4 or arbitrary coding acceptance is inferred. Claude's queued frontend friction and 06a correction review retain their owners.


## Prepared real journey consumed — 2026-09-22

The [actual13e06cc browser/provider packet](evidence/prepared-real-dogfood-20260921/README.md) closes this bounded prepared-Chat path: zero-Run preparation, real diagnosis, exact write/check approvals, fixed check result and browser reload, with one recorded workflow-direction intervention. It does not prove an unassisted universal agent, process restart in that round, historical RuntimeLock robustness, upload recovery or fullG4. The [closure audit](evidence/work-closure-audit-20260922/README.md) corrects this order's stale opening summary; do not re-dispatch the already accepted basic task merely because the historical readiness paragraphs below once left it open.
