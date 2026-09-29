# Doc-driven code review · 2026-09-29

Use: review record. Findings are returned to their lane owners below; this packet does not change code outside the one test named in D11, and it does not accept or reject any delivery.
Source reviewed: `main` at `ffe68fb`, `app/` unchanged during the review.
Who: Claude (Opus) session at the user's request. Four Sonnet reviewers, none an author of the reviewed code, checked contract claims against code; a fifth Sonnet agent, not one of the four, tried to refute every major finding; Opus re-ran two reproductions, confirmed UI root causes and made the rulings. No person has reviewed this record yet.

## Why

A green suite shows that its assertions ran. It does not show that the architecture holds, that a documented feature exists, or that an end-to-end path works. After the [documentation convergence](../../research/document-governance-2026-09-28/README.md), each module was reviewed claim by claim against its owner document, following [verification](../../verification.md#reviewing-an-implementation-against-its-contract).

## Method and coverage

| Area | Contracts | Claims | Reviewer report |
|---|---|---|---|
| Work Core | `docs/work-core/*`, `core-contracts.md`, architecture M05–M10 | 46 | [work-core](reports/work-core.md) |
| Host Session/Run lifecycle and Runtime Port | RD-001, `api-v6.md`, `runtime-foundation.md`, `run-attempts.md`, `permission-cas.md`, `hermes-api-runs.md` | 24 | [host-runtime](reports/host-runtime.md) |
| Runtime Control, Kits, MCP, commands | `docs/runtime-control/*`, RD-008, `commands-and-compaction.md`, K3 contract | 34 | [runtime-control](reports/runtime-control.md) |
| Harness, repository candidates, checks, async tasks | RD-005/006/007/009, `repository-binding.md`, `check-recipes.md`, `coordination.md`, `async-tasks.md` | 33 | [harness](reports/harness.md) |

For every claim the reports record the implementing code, the asserting test and the level it exercises (unit with stand-ins, Host in-process, real HTTP, real in-process Pi with a deterministic provider). About 130 existing test files were run area by area; all passed. Adversarial verification: [verdicts](reports/verdicts.md). Reproductions, rewritten to run from this directory with `node ../engineering/reviews/doc-driven-code-review-2026-09-29/probes/<file>` from `app/`: [probes/](probes/).

**Overall.** Most claims hold through real paths: admission, idempotency, Run lineage, schema 21→22 migration against a pinned old Store, SIGKILL restart, Kit preview/save/freeze, MCP lifecycle, source resolution, commands and compaction, path confinement, candidate write approval and check settlement. No path lets a model or the browser record an accept. The findings below are where code and contract part ways.

## Baseline

`npm --prefix app test` at `ffe68fb`: 1833 of 1834 passed. The failure was a stale source-shape assertion (D11), not a product regression; behavior was confirmed by the real-Chrome chat-page tests (6/6).

## End-to-end walkthrough

Performed by Opus in the in-app browser against a fresh Host (`npm start`, independent data directory, Local test executor), following [first work](../../../app/docs/first-work.md):

1. Closed the example; created a project and a chat; the deterministic executor replied.
2. Settings → Developer: loaded Inbound NDA Playbook Review; Continue in Matter with the synthetic source and facts. The chat became bound to a new Matter.
3. Sent a `/fixture script` whose tool calls were `se_read_source` then `se_submit_candidate` with a domain proposal built from the Matter's live projection. Two tool actions succeeded; Review showed one pending candidate with four passing findings.
4. Accept without a reason was refused ("A reason is required"). Accept with a reason recorded version 1 and the accepted Artifact.
5. Stopped the Host process and started it again on the same data directory.
6. New chat in the same project; Continue in Matter offered the existing Matter; after choosing it, Review showed the accepted version, and a `se_read_artifact` call on the accepted Artifact succeeded.

This demonstrates the architecture's minimum delivery loop through the real UI, Host, Core and restart. It does not demonstrate that a real model can produce the candidate: the candidate came from a scripted executor, and no real provider was used.

## Findings

Severity is the verifier's and Opus's judgment. "Owner" is the lane that holds the code per [current](../../current.md#who-holds-what).

| ID | Finding | Severity | Status | Owner |
|---|---|---|---|---|
| D1 | A terminal Run can change state. `cancelRun` checks terminal status on published state and queues `stopping` unconditionally; the store applies status patches without a transition guard. A cancel landing in the few-millisecond completion write turns `completed` into `stopping` then `cancelled` (reproduced without artificial delay). `server/service.mjs:3543-3585`, `server/store.mjs:1696-1711`. | Major (invariant), low likelihood | Fixed | Claude (reassigned) |
| D2 | A pending cancel outranks a decided native outcome: when the native turn is already `completed` and a cancel lands before the Host's terminal write, the Host records `cancelled`. Same root as D1. `service.mjs:3369-3372`. The reviewer's broader scenario (cancel first, remote completes later) correctly yields `unknown`. | Minor–major | By design (ruled) | Claude (reassigned) |
| D3 | An exception thrown while a cancel is pending is recorded as `cancelled` with `error: null`; the error survives only as an event. `service.mjs:3328`, `3369-3372`. Contradicts the rule that an unresolved outcome is not reported as cancelled. | Minor | Fixed | Claude (reassigned) |
| D4 | `check_run` runs candidate-authored code with the Host user's rights. The private candidate sits inside the Host data directory beside `credentials.json` and the Core store; in `draft` (the default) the model writes a test file without approval; the single `check_run` approval shows only recipe and argv. A probe test read a file placed at the credentials path. The architecture rule for code execution opened to a model is not met. | Major | Partly fixed: approval names the code; containment still unmet | Claude (reassigned) |
| D5 | Descendants that ignore `SIGTERM` and detach their output outlive a cancelled or timed-out check: the pending group `SIGKILL` is cleared when the leader's output closes. `runtime/check-runner.mjs:115-121`. Reachable only through candidate-authored code (D4). | Minor–major | Fixed | Claude (reassigned) |
| D6 | `ws_grep` returns content from a file that a `ws_read` deny rule blocks; per-file admission exists only for `repo_*`/`candidate_*` aggregates. `runtime/control-tools.mjs:105-127`. The contract is silent for `ws_*`. | Minor | Confirmed | Astra (Runtime Control) |
| D7 | Every extension, including host-trusted local packages, receives the raw Core client with `decide` and free `call`. `runtime/extension-registry.mjs:117,213`, `runtime/local-extensions.mjs:131-138`. In-process code could import the client anyway, so a facade would guard against accidents, not hostile code. | Minor | Confirmed as fact | Astra (Host / Core) |
| D8 | The Core accepts a candidate whose proposed obligations are blocking; this is deliberate (`core/core.py:708-715`) and the contract lets domains restrict accept. The architecture's "Core owns Completion" overstated it. | Doc ambiguity | Defect refuted | Resolved in architecture (below) |
| D9 | A Core `outcome: "unknown"` (for example a bridge deadline on `decide`) reaches HTTP as a plain 409 without the outcome marker. `server/index.mjs:110`. Replay and CAS keep it safe; the browser cannot tell "maybe committed" from "refused". | Minor | Confirmed | Astra (Host API) |
| D10 | `POST /runtime-permissions/evaluate` applies a host ceiling only to `tool:ws_write`; for `spark_explore`, `check_run`, `repo_write` and `message_other_agent` it can report `allow` where dispatch asks or denies. `service.mjs:1027`; the right function is `hostToolCeiling`. Advisory endpoint shown in Settings. | Minor | Confirmed | Astra (Runtime Control) |
| D11 | Baseline failure: `tests/chat-entry.test.mjs` asserted `chatPage.open(` inside `openChatPage`, which N07-R1 (`16d5b94`) moved into `refreshChatPage`. | Trivial | Fixed here | — |
| U1 | Pressing Enter in the New project dialog cancels it. The project, rename and session dialogs in `web/index.html` put Cancel (`type="submit" formnovalidate`) first; HTML implicit submission uses the first submit button, and `createEntity`/`submitRename` treat a Cancel submitter as dismissal. The delete dialog deliberately defaults to Cancel and is not a defect (corrected after the cold-start test). The typed name is kept, so a second attempt concatenates it. | Minor (UX) | Root cause confirmed | Original Claude (UX) |
| U2 | Continue in Matter lists existing work by its Matter ID (`matter-3b1e…`) rather than its title. | Minor (UX) | Observed | Original Claude (UX) |

Two suspected accessibility defects from the walkthrough (unnamed project toggle, unlabelled Matter fields) were checked in the DOM and rejected: both are labelled; the browser tool's tree omitted the names.

Lower-priority leads in the reviewer reports were not adversarially verified and are not claimed: among them Unicode-normalization path aliases (harness F3), async cancel under tool-exposure denial (harness F5), workspace-scoped profile selectable at user scope (runtime-control F2), undeclared-capability enforcement, compaction log redaction and lock-loss coverage (host-runtime minors), and Core first-run crash window and version bumps on reject (work-core minors). Their owners may pick them up from the reports.

## Dispositions

| ID | Disposition | Where it landed |
|---|---|---|
| D1–D3 | Reassigned to Claude by the user on 2026-09-29 and fixed; see [fixes](#fixes-after-reassignment). | `app/server/store.mjs`, `app/server/service.mjs`, [API run vocabulary](../../../app/docs/api-v6.md#run-and-question-vocabularies) |
| D4–D5 | Reassigned to Claude on 2026-09-29. D5 fixed. D4: the approval now names the code that will run; containment (separate identity or sandbox, candidates outside the data directory) remains open under RD-009. Until then no claim that self-check is contained. | [check recipes](../../../app/docs/check-recipes.md#environment-policy), [fixes](#fixes-after-reassignment) |
| D6, D9, D10 | Return to Astra as small fixes with tests (per-file `ws_read` admission for `ws_grep`/`ws_list`; carry `outcome`/`operation` to HTTP; use `hostToolCeiling` in evaluate). | Same record |
| D7 | Adjust the rule rather than the code for now: host-trusted extensions are inside the trust boundary. A narrowed client facade is optional hardening for Astra. | [architecture](../../architecture.md#dependency-boundaries) |
| D8 | Clarify, no code change: Core gates pre-existing blocking obligations; domain adapters decide whether unresolved findings may be accepted. | [architecture](../../architecture.md#dependency-boundaries) |
| D11 | Fixed: the test now pins `openChatPage` → `refreshChatPage()` → `chatPage.open(` and keeps the no-creation invariant; it fails when the page draw is removed. | `app/tests/chat-entry.test.mjs` |
| U1–U2 | Return to the UX queue. | [UX record](../../execution/claude-frontend-harness-2026-09-16/ux-polish-release-20260924.md#2026-09-29--returned-from-the-doc-driven-code-review) |

Documentation defects the reviewers found (stale schema numbers, "future" dispatcher text, the stale `SessionManager` coupling claim, Kit freezing listed as missing) were corrected as part of the [convergence](../../research/document-governance-2026-09-28/README.md), G1 and G3a.

## Fixes after reassignment

The user reassigned D1–D5 from Astra to this Claude (Opus) session on 2026-09-29. Each fix started from a test that failed on the unchanged code.

- **D1, fixed.** The Store refuses to change a terminal Run's status (`RUN_TERMINAL`, "Host terminal transition is immutable", matching the existing Local Pi guard) and refuses to open a question on a terminal Run. A new `updateRunIfActive` does the active check inside the same mutation as the write; `cancelRun` and Run settlement use it, so a cancel that loses the race returns the settled Run. [Tests](../../../app/tests/run-terminal-arbitration.test.mjs): the race without artificial delay now ends `running → completed`.
- **D2, ruled by design.** The accepted Local Pi contract already settles a late explicit cancel as `cancelled` after native completion, keeping the native result as evidence. The same rule now holds explicitly for every Run: a cancel accepted before the Host's terminal write settles `cancelled`, and the completed answer stays in the Run's events. A cancel after that write cannot change it (D1). An initial change that relabelled such Runs `completed` was reverted when the Local Pi contract test showed the conflict.
- **D3, fixed.** An exception while a cancel is pending settles `unknown` with its error, not `cancelled` with none; without a cancel it is still `failed`.
- **D4, partly fixed.** The check approval card and its decided record list the files the model wrote into the candidate (path and content hash), read from the Host's `repository.write.confirmed` receipts up to the write revision the request is bound to. The persisted approval payload is unchanged, so no schema change. Verified in the real UI on a synthetic repository. Not fixed: the check still runs with the Host user's rights, files created by an earlier check are not listed, and the architecture rule for opened code execution stays unmet.
- **D5, fixed** (bounded edit by a Sonnet worker, reviewed by Opus). A stopped check settles only after its process group is confirmed gone, with `SIGKILL` re-sent and bounded polling; a group that cannot be confirmed gone is marked `groupLingered`. [Test](../../../app/tests/check-runner-group-kill.test.mjs) covers cancel, timeout and normal exit.

**Non-author review of the fixes.** A fresh Sonnet agent tried to break the fix commits: every Run status writer is guarded or already `!TERMINAL`-checked, no runtime throws on a normal abort (so D3 does not turn user cancels into `unknown`), and D5's handler cannot double-settle. It confirmed one D4 defect — a write with an unknown outcome was omitted, so the card could claim no model-written files — now listed as "Write outcome unknown", and a low-severity edge where settlement losing the race dropped partial text, now kept. Full suite 1845/1845. No Astra or human acceptance yet.

Four existing tests fabricated states by rewriting terminal Runs (for example `completed → running` before an orphan cancel); their fixtures now write that shape directly, with the invariant each asserts unchanged. D6, D7, D9 and D10 remain with Astra.

## Not verified

Real-model capability; Safari, physical touch and assistive technology; the web UI against its interface contract beyond the walkthrough; `remote-action-state.mjs` (no contract in scope); CI on the remote. The walkthrough used one browser at one viewport.
