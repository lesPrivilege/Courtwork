# First-principles review of `6692b91` · intake, rulings and work packages

Use: intake record for an external review, and the owner record of the work packages registered from it. It verifies each finding against the code, rules it, states what each package must show, and names where each ruling landed. It accepts no delivery.

Input: [`source/first-principles-review-6692b91.html`](source/first-principles-review-6692b91.html) (56,702 bytes, sha256 `ea3d53b82327819ec493074f9f5be49bcdbdf1ad68633d260621ba65340832a8`; received from the user on 2026-10-01 as `CourtWork-第一性原理独立评审-6692b91.html`, kept byte for byte, in Chinese). A static review of `main` at `6692b91a2f758b33b4114900b1458d38aa44d920` in five streams (Core continuation; Runtime lifecycle; permissions and effects; user workflow; documents and evidence), with a read of the two GitHub workflow runs on that commit. It ran no code. With it the user passed on a proposed registration: five work packages and one design-ruling item, each starting from `6692b91` and checking first whether `main` already holds a fix.

Who: Claude (Opus) session at the user's request (2026-10-01: "保留 Opus 裁决权" — Opus keeps the rulings). Six Sonnet verifiers, none an author of the reviewed code, checked every finding against the code at `6692b91` and clustered the CI failures before any ruling. Opus ruled, wrote the work orders, coordinated one worker per package (five Opus, one Sonnet), each in its own worktree, read every diff and ruled the workers' and reviewers' open points. Three reviewers who wrote none of it reviewed the integrated diff. No person has reviewed this record. Nothing here is accepted by anyone but its authors' side; acceptance of core changes stays with Astra and of UI changes with the UX owner ([current](../../current.md#who-holds-what)).

Checked first, as the registration asks: `main` and `origin/main` are both `6692b91`; none of the six unmerged branches touches these findings.

## Dispositions

Verification: `TRUE` means the code at `6692b91` allows what the finding describes. No path was reproduced by running it before the fix unless the package's evidence says so.

| Finding | Verified at `6692b91` | Ruling and reason | Package |
|---|---|---|---|
| N1 · P1 · a late HTTP write can cross the Store lock handoff | TRUE, wider than stated and narrower in time. `RuntimeStore.close()` awaits the queue it sees and then releases; `_mutate` has no close admission; `_persist` checks the lock handle only before its file writes; the handle is cleared after the helper's receipt, and the helper unlocks before it sends it. HTTP checks `closing` only at handler entry and waits for in-flight handlers after `runtime.close()`. Without a closing check: `createProject`, `createSession`, `createAttentionConversation`, `updateDraft`, the Spark and Coordination routes. After the handle is cleared a late mutation fails safely, so the exposed interval is the release round trip. Other owners under the same lock (Work Core, ArtifactHistory, intake, native journals) are reachable by a late handler too. | **Adopt, P1.** The lock must hold without relying on callers. The Store closes its own admission and drains before it gives the lock up; the entry owner drains what it admitted before the other owners close. | [1](#package-1--host-close-and-the-single-writer-handoff-p1) |
| N2 · P2 · an accepted file bundle has no manifest a new Agent can find | TRUE in effect; the stated cause is wrong. The Work context names the Artifact's id and text reader and nothing about files; both file readers need a path; Core's manifest query accepts a Run context but no model tool calls it. The governance fallback the review cites is the cross-Matter Attention path and is not involved. | **Adopt, adjusted.** The context states that the object is a file bundle and which tool lists it; one read-only listing tool sits beside the readers under the same admission and coverage rules. Governance is unchanged. | [2](#package-2--work-result-discovery-and-revision-receipts-p2) |
| N3 · P2 · a committed revision cannot be confirmed after the sources moved | TRUE for the generic memo and for the NDA path; reach is narrow. The adapter validates the proposal against current sources before Core's replay branch. The contract tells clients to send a fresh `new_candidate_id`, and the one in-repo client does, so only a caller that resends the same id meets the refusal — while a client that mints a fresh id after a lost reply creates a second revision. | **Adopt.** The adapter follows its own `decide` precedent: an id that already exists is a replay and Core answers it; a new id keeps the full current-source validation. The contract states the retry rule. | [2](#package-2--work-result-discovery-and-revision-receipts-p2) |
| N4 · P2 · a configuration `put` is validated for one scope, stored for another and audited as the first | TRUE, and wider: `resource.scope` is only shape-checked, so it may lie outside the Session's chain and replace a resource there; a stray top-level `id` is disconnected and audited in place of the stored one. No in-repo caller sends both scopes. | **Adopt.** One target per operation, derived once and used for the chain check, storage, disconnect and audit; the key set per operation is the typed contract's. | [3](#package-3--one-target-per-configuration-change-p2) |
| N5 · P2 · the Matter form loses typed input when a read lands | TRUE. Every re-render of the open panel rebuilds empty fields; the list read is the likeliest trigger, not the only one. | **Adopt.** A draft owner keyed by Session and extension; closing the panel keeps the draft ([UX conventions](../../design/ux-conventions.md)). | [4](#package-4--client-operation-identity-and-draft-recovery-p2) |
| N6 · P2 · a Send the Host definitely refused stays "unconfirmed" across reloads | TRUE. Recovery replays the stored request and classifies no outcome. | **Adopt, adjusted.** Whether the original command has a receipt is a Host fact: the Host states it on refusals raised after its receipt lookup, and the client releases only on that statement. The client does not infer it from the order of the Host's checks. | [4](#package-4--client-operation-identity-and-draft-recovery-p2) |
| N7 · P2 · retrying a candidate creation after a lost reply mints another identity | TRUE; Stop edits and Disconnect have the same shape. | **Adopt**, for the three commands. | [4](#package-4--client-operation-identity-and-draft-recovery-p2) |
| N8 · P2 · the README carries a prerequisite its generator source lacks | TRUE; one sentence, added by `c71c6b4`. It fails the Pages build, and regenerating would delete it. No local check compares source and output. | **Adopt**, with a check in the default suite. | [5](#package-5--publication-sources-and-the-linux-check-environment-p2p3) |
| M1 · P3 · the dependency ledger lacks five lockfile packages | TRUE; `lockfileSha256` is stale too. No generator and no check exist. | **Adopt**, with a generator and a check. | [5](#package-5--publication-sources-and-the-linux-check-environment-p2p3) |
| M2 · P3 · the contract calls a known MCP error a failure; the code treats it as unknown | TRUE as a document contradiction: `docs/runtime-control/architecture.md` against `docs/runtime-control/api.md` and the code. | **Ruled: the code is the contract** ([ruling R1](#r1--what-establishes-that-a-remote-call-had-no-effect)). | [3](#package-3--one-target-per-configuration-change-p2) |
| Linux CI · 23 failing tests in both Node jobs | Read from the run's log: five clusters ([below](#linux-ci-clusters)). One is a product defect on Linux, three are test oracles that encode macOS facts, one is not yet explained. | **Adopt the diagnosis; fixes are a candidate until a Linux run exists.** | [5](#package-5--publication-sources-and-the-linux-check-environment-p2p3) |

### Items the review kept apart

| Item | Ruling | Owner and trigger |
|---|---|---|
| A manual compaction replayed with the same `requestId` and another `focus` | **Ruled** ([R2](#r2--a-request-id-names-one-request)); this replaces the deferral in the [review of `7e8e253`](../declaration-to-implementation-2026-10-01/README.md). | Package 3 |
| Core `completed` beside Host `cancelled`/`unknown` for one Run | No ruling. The two records have different owners ([architecture](../../architecture.md#data-ownership)); the review found no integrity failure. | Astra; trigger: a report where the difference misleads a person or a continuation |
| Generic memo reads do not recompute the source digest | **Defer.** No supported write path produces changed text under an unchanged digest. | Astra (Core); trigger: corruption-recovery work, or a write path that can do it |
| Context budget omits old decisions; no exact reader for a closed candidate's body | Already deferred in the review of `7e8e253` (F1). | Astra |
| Unsent Review reasons across Sessions; the Attention entry's target | Already deferred there. | UX owner; Astra |
| Compaction cancelled during setup; real OS isolation; runtime equivalence | Evidence insufficient, as the review says. | Unchanged |
| A cold-takeover walkthrough across restart with a real model (the review's step 7) | Not registered as a package. Package 2's evidence covers discovery from the record with a scripted model; real-model capability needs the user's authorization. | Astra, integration acceptance |

Found by the verifiers beyond the review, and where each went: the further close-admission gaps (package 1); the scope outside the chain and the stray `id` (package 3); proposal reject replays by id alone (package 3); Stop edits and Disconnect (package 4); `README.zh-CN.md` has no generator and no check (noted; unchanged); `replace_sources` keeps no receipt, so a retry after a lost reply is answered `VERSION_CONFLICT` (**defer**: Astra, Core contract; trigger: the next change to source replacement).

## Work packages

Every package starts from `6692b91`, keeps its change inside the named owner, shows its counterexample failing on the old code and passing on the new, and is reviewed by a non-author on the integration commit. None adds a feature or refactors beyond its finding.

### Package 1 · Host close and the single-writer handoff (P1)

Covers N1. Responsibility: Host lifecycle and the RuntimeStore lock. Fact owners: `RuntimeStore` (mutation admission and the lock), `server/runtime.mjs` (the close order), `server/index.mjs` (HTTP admission). Nearest precedent: `RuntimeService.close()`'s drain of admissions, operations and Run tasks, and `addMaterial`'s `runtime_closing` refusal with its test in `intake-independent`. Cross-layer: the HTTP owner hands its drain to the composition owner; no schema change, no change to the lock helper.

Invariant: after close begins no new mutation is admitted; every admitted mutation finishes or is refused before the lock is released; after release the old Host cannot publish state.

Exit evidence: a request whose body arrives after close began is refused `503 runtime_closing`, writes nothing, and does not delay close; a mutation issued during close is refused and one admitted before it is persisted before release; with two Hosts on one data directory, the old Host cannot publish after the new one took over.

### Package 2 · Work-result discovery and revision receipts (P2)

Covers N2 and N3. Responsibility: what a continuation can find, and what a retried human revision returns. Fact owners: `compileWorkContext` (the bounded context), the Work adapter (model tools, the input observer, human actions), Work Core (the manifest query and the revision replay, both unchanged). Nearest precedents: `se_read_artifact_file` for the tool and its coverage class; `decide`'s receipt-first order for the replay.

Exit evidence: a new Session that is given only the Matter finds and reads an accepted file from what its context and the listing return, with no file name supplied by the test; through the HTTP entry, a saved revision whose reply was lost returns its original result after the sources were replaced, the same id with other content conflicts, and a new id is still validated against current sources.

### Package 3 · One target per configuration change (P2)

Covers N4, and builds rulings R1 and R2. Responsibility: Runtime Control changes and Host request identity. Fact owners: `control-plane.mjs` `change()` (key set, target, audit), `RuntimeService.changeRuntimeControl` (the Session's scope chain), the Store's `createOperation` hash (compaction request identity). Nearest precedents: the typed `RuntimeChange` contract; `getCommandReceipt` for a lookup that refuses changed content.

Exit evidence: a `put` naming two scopes is refused with the revision, resources and audit unchanged; a scope outside the Session's chain is refused; a normal `put` names one target in storage, the returned catalog, the audit record and the disconnect; a compaction replay with another focus is refused and the stored operation is unchanged.

### Package 4 · Client operation identity and draft recovery (P2)

Covers N5–N7. Responsibility: the browser keeps a draft, an unconfirmed operation, a definite refusal and a committed result apart. Fact owners: the Host for whether a command has a receipt; the client for drafts and pending identities ([dependency boundaries](../../architecture.md#dependency-boundaries)). Grammar: receipts bind scope, revision and draft identity, and a failure is recoverable without losing input ([UX grammar](../../design/ux-grammar.md)); Retry re-sends a definitely failed operation and Check status reads the same record back ([copy convention](../../design/copy-convention.md)); closing a panel does not clear a draft ([UX conventions](../../design/ux-conventions.md)). Nearest precedents: the view-owned input in `local-extension-view.mjs` and `workspace-card.mjs`; Home preparation's identity kept until settled; `bindRequestId` in the card. Cross-layer: one Host hunk in Run admission states the receipt fact; its consumer, the API page and a Host test change with it. No visual change is intended.

Exit evidence: a slow or failed list read, a close and reopen, a Session switch and a reload keep the form's input; a replay the Host answers "no receipt" releases the Send with the text kept, while a conflict or an unknown outcome keeps the lock; a candidate command retried after a lost reply carries the same identity and payload, or shows the committed state after a readback.

### Package 5 · Publication sources and the Linux check environment (P2/P3)

Covers N8 and M1, and the Runtime workflow on Linux as its own item. Fact owners: `site/src/readme.mjs` (README source), `app/package-lock.json` (the ledger's source), `check-sandbox.mjs` (the check sandbox policy). Nearest precedent for a source/output check in the default suite: `tools/product-semantics.mjs` with its test.

Exit evidence: regenerating the README changes nothing and the suite fails when source and output differ; the ledger equals the lockfile and the suite fails when it does not; the Linux prerequisites are stated and sufficient, and the Runtime workflow's checks run on Linux. No check is deleted and no test skipped to get there; a test changes only where it asserted a fact of the macOS volume or process table.

## Rulings

### R1 · What establishes that a remote call had no effect

Question: when an MCP call returns an error, what evidence lets the Host treat the call as having had no effect, so the Run may continue?

Ruling: only evidence the Host owns — the request never left the Host. A statement from the remote side does not: not a result with `isError`, not a JSON-RPC error, not a tool annotation such as `readOnlyHint`. A server can fail after it has acted, and the Host has no way to check its account.

| What the Host observed | Classification | Run |
|---|---|---|
| Refused before dispatch: not exposed, policy, arguments invalid locally, no connection, the dispatch record could not be written | Failure, no effect | Stays open |
| Dispatched; transport error, timeout, abort or no result | Effect unknown | Admission closes; the Run ends `unknown` |
| Dispatched; JSON-RPC error response | Effect unknown | Same |
| Dispatched; result with `isError` | Effect unknown, kind `tool-reported-error`; the body is kept and shown to the model | Same |
| Dispatched; result received but not retained | Effect unknown | Same |
| Dispatched; result retained | Confirmed result | Stays open |

This is what the code does and what `docs/runtime-control/api.md` says since HPR02-P02; the sentence in `docs/runtime-control/architecture.md` is corrected. Widening it would need Host-owned evidence, for example an effect class the operator declares for a tool in Runtime Control. None exists and none is added; the trigger is a report that the fence blocks ordinary use of a read-only server.

### R2 · A request id names one request

Question: when a manual compaction is replayed with the same `requestId` and a different `focus`, whose result is the stored one?

Ruling: an id names one request, which is the id together with its content — for compaction `{kind, sessionId, focus}`, the hash the Store already computes. This is the rule Run commands, candidate commands and proposal apply already follow.

| Replay | Stored operation | Answer |
|---|---|---|
| Same `requestId`, same focus | Running or settled | The same record, `idempotent: true`, answered before provider and capability checks so a lost reply can be queried after the configuration changed |
| Same `requestId`, different focus | Any | `409 idempotency_conflict`; the stored operation is unchanged and its result belongs to the focus it was admitted with |
| New `requestId` while one runs | — | `operation_active`, as today |

A person who wants another focus sends a new request. Proposal reject, which also replayed by id alone, takes the same rule: its replay must repeat the recorded revision and reason.

## Linux CI clusters

Read from the Runtime workflow run on `6692b91` (both Node jobs fail the same 23; 16 skips are Chrome- or volume-gated and expected on the runner). Nothing below was run on Linux by this intake.

| Cluster | Tests | Cause as read | Class |
|---|---|---|---|
| A | 17: `check-recipes`, `check-runner-group-kill`, `check-sandbox`, `p03e-write-check-parity` | The sandbox policy denies the home directory and re-allows the working directory, the temp directory and the Node prefix. On Linux the sandbox library executes its bundled `apply-seccomp` helper inside the sandbox; when `node_modules` lies under the home directory and the candidate elsewhere, the helper is hidden and the check reports `sandbox_unavailable`. | Product defect on Linux |
| B | 2, and more once A is fixed | Tests probe a pid the recipe printed; under bubblewrap's pid namespace that number is not a Host pid. | Test oracle |
| C | 2: the recipe's own exit signal | The guard reports its direct child, which on Linux is the wrapper chain. Mechanism not established. | Open |
| D | 1: Harness recipe pass count | One recipe test skips unless the volume aliases NFC and NFD names. | Test oracle |
| E | 1: path alias | An upper-cased directory spelling reaches the policy only on a case-insensitive volume; on Linux the resolver refuses first. | Test oracle |

## What landed

Branch `claude/review-6692b91-20261001` from `6692b91`; product head `0047a12`. Each worker wrote in its own worktree and branch (`claude/review-6692b91-{host,core,control,web,docs,ci}-20261001`) with installed dependencies, a file allowlist and its own scratch directory; the coordinator read each diff and cherry-picked it. Nothing is merged into `main` and nothing is pushed.

### Package 1 · as built

| Commit | Author | What |
|---|---|---|
| `140f0dc` | Host worker (Opus) | The Store closes its mutation admission in the step its close begins (`StoreClosingError`, answered `503 runtime_closing`), drains, and takes the lock handle out of `_persist`'s reach before the release is sent; `_persist` re-checks the lock before its rename. `createRuntime().close({ drain })` states one order: service settles, entry owner drains, extensions, providers and Core close, Store drains and releases. The HTTP server tracks every admitted handler, refuses a handler still reading its body when close begins, and passes its drain. Project, Session, Attention conversation, draft, async-task and a person's Spark and Coordination commands refuse once closing. |
| `4635807` | Host worker | Close ends an open folder picker and a candidate diff's Git instead of holding the lock for them. |
| `a8025d8` | Host worker | `WorkCoreOwner.close()` seals its client: no bridge restarts after the Host closed. `CoreClient.close()` keeps its reopen for callers that own a client. |
| `0047a12` | Host worker | Review dispositions: the proposal ledger's commands and the Spark library's refuse once closing; the documents state exactly what is gated. |

Tests: `close-single-writer` (11), each failing on `6692b91` — a late mutation behind a busy queue persisted; `_persist` renamed after unlock; with two Hosts the file held the old Host's state and the new Host's project was gone; a handler waiting for its body was refused only when the body arrived; a late proposal reject rewrote the next Host's ledger. Contract: [runtime foundation](../../../app/docs/runtime-foundation.md), [HTTP API](../../../app/docs/api-v6.md).

Limits stated by the author and the reviewer: a lock lost between `_persist`'s re-check and its rename can still publish (only a fencing token closes that; close itself is unaffected); an admitted private-candidate creation is awaited to its Git bounds (up to 120 s per command) before release; a client still uploading when refused may see a reset instead of the 503; `RuntimeStore.close()` during `open()` is not guarded (not reachable through `createRuntime`); `answerQuestion`, `cancelRun`, `cancelCompaction`, `setMatterDisclosure` and `reconcileRemoteSession` have no closing check in-process and rely on the Store's refusal, the Run's end or the sealed Core. Not checked: signal-driven CLI shutdown, a real `osascript` dialog, a kept-alive connection during close.

### Package 2 · as built

| Commit | Author | What |
|---|---|---|
| `771df1e` | Core worker (Opus) | The Work context states a file bundle (count, size, digest) for the active Artifact and each pending candidate and names `se_list_files`; that tool takes exactly one of `artifactId`/`candidateId`, calls Core's manifest query with the Run context and returns `{path, bytes, sha256}` only. Coverage follows the reader of the same object: the frozen base is a tracked input, anything else marks coverage unknown. |
| `b27a567` | Core worker | `revise_candidate` with an id the bound Matter already holds goes to Core with shape checks only; Core returns the stored result or `IDEMPOTENCY_CONFLICT`. A new id keeps full validation. |
| `d97f86a`, `9b4ddc6` | Core worker; coordinator | The NDA renderer keeps one revision identity per parent, base version and domain payload until the Host settles it, and says so when a reply is lost. |
| `99459c0` | Core worker | Review dispositions: the unknown-outcome notice; coverage cases for the listing. |

Tests: `execution-file-discovery` (a new Session given only the Matter reads the Artifact id from its context, lists, reads a path from the listing; the artifact text and the test name no file), `work-revision-replay` (through HTTP: on `6692b91` the identical revision after a source replacement was refused `BINDING_MISMATCH`, and `REVIEW_INVALID` on the NDA path), `nda-renderer`. Contract: [Work Core](../../../docs/work-core/contract.md).

Limits: the NDA replay relies on a domain proposal being exactly `{domain}`; each pending file candidate adds about 250 characters to the mandatory context, so the budget is reached at fewer pending candidates (it fails closed); `replace_sources` still keeps no receipt.

### Package 3 · as built

| Commit | Author | What |
|---|---|---|
| `00d5fd6`, `88b6f16` | Control worker (Opus) | `changeTarget` in `control-plane.mjs` owns the key set per operation and the one target; the service uses it for the chain check and the disconnect, the control plane for storage and audit. A missing or malformed scope is `invalid_runtime_config`; `invalid_scope` means a well-formed scope outside the chain. |
| `fdc6b25` | Control worker | R2: `store.getOperationReceipt` compares the hash `createOperation` records; proposal reject compares its recorded decision. |
| `f014c2e`, `bcc91f2` | Control worker | R1 in the documents, and one consequence in code: the pinned MCP client re-sent `tools/call` once on a HeaderMismatch error unless given the tool definition. The Host now passes the definition its connection published; a tool no longer in the connected catalog is refused before dispatch. |

Tests: `control-change-target`, and new cases in `manual-compaction`, `runtime-proposals` and `hpr_p02` (on `6692b91` the header-mismatch fixture received two calls). The out-of-chain `resource.scope` case passes before and after and stays as a guard: the old fallback already refused it. Contract: [Runtime Control API](../../../docs/runtime-control/api.md), [architecture](../../../docs/runtime-control/architecture.md), [commands and compaction](../../../app/docs/commands-and-compaction.md).

Limits: no fixture declares `x-mcp-header` parameters or an `outputSchema`, so header mirroring and output validation with the supplied definition rest on the SDK source; the MCP transport's reconnect logic was not read; the `/commands` path still answers `command_unavailable` before a `/compact` replay (**defer**: Astra; trigger: the next change to commands).

### Package 4 · as built

| Commit | Author | What |
|---|---|---|
| `c5053bb`, `b36c642` | Web worker (Opus) | `binding-draft.mjs`: the Matter form's values per Session and extension, restored on every rebuild with focus and selection, kept in the tab's sessionStorage up to each field's declared limit; cleared only by a confirmed bind, a Session that shows the binding, or Session deletion. Cancel closes and keeps. |
| `e03f25f`, `9f7fb68` | Web worker | The Host marks refusals raised after its receipt lookup missed with `commandAdmitted: false`, in one place around the admission part of Run creation; never on an error whose outcome may be "the Run exists". `command-outcome.mjs` is the one outcome function for the first Send and a replay: a replay is released only on that marker or a 404 for a deleted Session. |
| `4a5644c` | Web worker | The card keeps one identity and exact payload per intent (create, stop edits, disconnect) until the Host settles it; after an unknown outcome it reads the Session back, then re-sends the same request. |
| `754c7dd` | Web worker | Review dispositions. |
| `ec02df9` | Web worker | Browser check of the form draft ([script](evidence/binding-draft-browser.mjs), [baseline](evidence/binding-draft-browser.baseline.json): 7 of 10 checks fail on `6692b91`; [report](evidence/binding-draft-browser.report.json): 10 of 10 at `04f330a`; 1440×900, DPR 1, fine pointer, headless Chrome). Author evidence; not re-run after the later commits. |

Tests: `binding-draft`, `command-outcome`, `run-admission-marker`, `candidate-command-identity`. Contract: [HTTP API](../../../app/docs/api-v6.md).

For the UX owner: the card's new sentences ("Not created. Start private candidate again to use the same identity." and its siblings, "The result is not known: …"); Cancel keeps the draft and the form has no way to start over but emptying the fields (smallest option: a quiet Clear); one press reads back and then re-sends, so there is no read-only check; a rebuild during IME composition ends the composition; a rebuild during an in-flight bind re-enables Submit (the bind route has no request identity). Not checked: N6 and N7 in a browser; screen reader, zoom, touch, Safari, dark theme, narrow viewport.

### Package 5 · as built

| Commit | Author | What |
|---|---|---|
| `d7b45f4` | Docs worker (Sonnet) | The generator source carries the sentence; `README.md` is unchanged; `tests/readme-source.test.mjs` compares source and output in the default suite. |
| `25b77ee` | Docs worker | `app/scripts/dependency-ledger.mjs` derives the ledger from the lockfile (it reproduces the 303 old entries byte for byte); the ledger gains the five packages and the current lockfile hash; `dependency-ledger.test.mjs` compares in the default suite. |
| `18d4487` | CI worker (Opus) | Cluster A: on Linux the policy re-allows, read-only, the directory holding the library's `apply-seccomp` helper, under the guard that no re-allowed path may contain the home or data directory. That directory holds the one binary. |
| `ed1538d`, `a63d393` | CI worker | Clusters B, D, E: the process tests scan the Host's process table for a marker; the recipe count allows the one NFC/NFD skip only on a volume that does not alias those names; the upper-cased directory spelling must be denied on a case-insensitive volume and must fail as parent-missing otherwise. |
| `a2895a6` | Coordinator | The workflow runs the smoke and link checks after a failing test step; the [source card](../../ecosystem/sandbox-runtime-source-card.md) records the helper facts. |

Linux: none of this has run on Linux. Expected from reading, not evidence: 21 of the 23 pass; the two of cluster C stay red, so the Runtime job stays red until C is ruled. Open on Linux, for Astra under RD-009, to be decided from a Linux run and not before it:

- Cluster C: whether the product recovers a recipe's own exit signal behind the wrapper chain (a Host-owned shim in the sandbox) or the contract states the Linux behaviour.
- The Host confirms the exit of its guard's process group; bubblewrap's `--new-session` puts the sandboxed tree outside that group, so on Linux a check may settle before its last process is reaped. The process tests stay strict so that a Linux run shows it.
- The Host's group signal does not reach a recipe behind `--new-session`; the recipe ends by SIGKILL through `--die-with-parent`. The contract's "Process lifetime" does not say so.
- An install reached through a symlink under the home directory (`npm link`, pnpm) hides the helper again: the policy allows the helper's real directory, the library runs the unresolved path.

## Non-author review

Three reviewers who wrote none of it read `6692b91..a8025d8` by slice (Host, Store, Runtime Control and MCP: Opus; Core adapter and web client: Sonnet; sandbox, oracles, generators and CI: Sonnet), read-only. No high finding. They traced as holding: the Store close and the HTTP gate and drain; the Core seal; the one-target rule; the replay rules; the single MCP dispatch; the admission marker; that a revision replay stores nothing; the helper mechanism against the library's source.

| Finding | Disposition | Landing |
|---|---|---|
| MEDIUM, in-process only · proposal edit and reject write the proposal ledger with no closing check, so a late call could rename over the next Host's ledger | **Adopt**, with a sweep of every data-directory writer outside the Store, Core and ArtifactHistory: only the proposal ledger had no refusal | `0047a12` |
| LOW · the close document claimed more than the code gates (Spark library; "for minutes") | **Adopt**: the library's commands are gated; the document lists what is and is not | `0047a12` |
| LOW · a missing scope answered `invalid_scope` | **Adopt** | `88b6f16` |
| LOW · the marker test passed with `!admission.created` removed; two exclusions untested | **Adopt**: each clause has a case that fails without it. None of the three has a production trigger today; they guard a future refusal of that shape | `9f7fb68` |
| LOW · a draft field loaded after a reload was cut to the default limit; focus keys of the existing-work buttons lost; the card's failure sentence shown on another chat; a read failure after a confirmed receipt went unhandled; copy term; the API page omitted the 404 case | **Adopt** | `754c7dd` |
| LOW · an unacknowledged revision showed a raw transport message; two coverage cases for the listing unpinned | **Adopt** | `99459c0`, `9b4ddc6` |
| LOW · a refused upload may be reset; close during `open()` | **Accept** as stated limits | Package 1 limits |
| LOW/MEDIUM on Linux · a strict process scan at settle may see a dying process; only one process test has a positive control; tight recipe timeouts | **Accept, kept strict**: a failure there on Linux is a settle-ordering finding, not a flake | Package 5, open on Linux |
| LOW · symlinked install hides the helper | **Accept** as a stated limit | Package 5, open on Linux |
| LOW · IME composition; Submit refocused during an in-flight bind; no read-only check | **Defer** to the UX owner | Package 4 |

## Checks

- Before any ruling: every finding checked against the code at `6692b91` by a non-author verifier; the CI failures clustered from the run's log by another.
- Each package's new tests fail on `6692b91` and pass on its commit, by its author (an archive of `6692b91`, or the product hunk withheld).
- The same, by a non-author: a clean archive of `6692b91` with its own installed dependencies and only the fourteen new or changed test files copied in, each run alone. Ten files fail there on behaviour: the listing tool is not admitted; the identical revision is refused `BINDING_MISMATCH` and `REVIEW_INVALID`; a `put` with two scopes answers 200; refusals carry no admission marker; the card mints a new identity after a lost reply; the NDA retry sends another revision id; a compaction replay with another focus and a changed proposal reject answer 200; the MCP fixture receives two calls; the README differs from its source. `close-single-writer` failed there only on a missing export, so it was run again with that one import replaced by a stand-in: 0 of 11 pass, each on a behavioural assertion (the late mutation persisted; the rename landed after unlock; with two Hosts the file held the old Host's writes; the late proposal reject changed the next Host's ledger; the Core answered after close). Three files (`binding-draft`, `command-outcome`, `dependency-ledger`) fail on `6692b91` only because the module under test does not exist there; for those the fail-before is the author's (for the form draft, also the browser baseline). On the integration branch all fourteen pass. Twenty-six older tests in the changed files pass on both and prove nothing about the fixes.
- `npm --prefix app run check:product` on the integration branch, macOS, product tree clean: at `a8025d8` exit 0, bounded suite 2118/2118; at `0047a12` exit 0, bounded suite 2124/2124, deterministic runtime smoke, documentation links (1765 documents, no problems). `6692b91` has 2065 tests.
- `node site/build.mjs`: passes its README check (docs worker).

## Not run

- Linux, in any form: the sandbox fix, the changed oracles and the workflow change are unverified there. A Linux run needs a branch on `origin`, which needs the user's word.
- No real provider or model; no person has used any of it.
- Browser: only the Matter form draft script, by its author. No screen reader, zoom, touch, Safari or forced-colors check.
- Pages build in CI; no deployment.
- No acceptance: Astra has not reviewed the core changes, the UX owner has not reviewed the UI changes, and no person has reviewed this record.
