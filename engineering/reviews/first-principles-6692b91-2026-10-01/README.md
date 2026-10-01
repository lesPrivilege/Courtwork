# First-principles review of `6692b91` · intake, rulings and work packages

Use: intake record for an external review, and the owner record of the work packages registered from it. It verifies each finding against the code, rules it, states what each package must show, and names where each ruling landed. It accepts no delivery.

Input: [`source/first-principles-review-6692b91.html`](source/first-principles-review-6692b91.html) (56,702 bytes, sha256 `ea3d53b82327819ec493074f9f5be49bcdbdf1ad68633d260621ba65340832a8`; received from the user on 2026-10-01 as `CourtWork-第一性原理独立评审-6692b91.html`, kept byte for byte, in Chinese). A static review of `main` at `6692b91a2f758b33b4114900b1458d38aa44d920` in five streams (Core continuation; Runtime lifecycle; permissions and effects; user workflow; documents and evidence), with a read of the two GitHub workflow runs on that commit. It ran no code. With it the user passed on a proposed registration: five work packages and one design-ruling item, each starting from `6692b91` and checking first whether `main` already holds a fix.

Who: Claude (Opus) session at the user's request (2026-10-01: "保留 Opus 裁决权" — Opus keeps the rulings). Six Sonnet verifiers, none an author of the reviewed code, checked every finding against the code at `6692b91` and clustered the CI failures before any ruling. Opus ruled, wrote the work orders and coordinates one worker per package, each in its own worktree. No person has reviewed this record. Nothing here is accepted by anyone but its authors' side; acceptance of core changes stays with Astra and of UI changes with the UX owner ([current](../../current.md#who-holds-what)).

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

A person who wants another focus sends a new request. Proposal reject, which also replays by id alone, takes the same rule if the change is as small.

## Linux CI clusters

Read from the Runtime workflow run on `6692b91` (both Node jobs fail the same 23; 16 skips are Chrome- or volume-gated and expected on the runner). Nothing below was run on Linux by this intake.

| Cluster | Tests | Cause as read | Class |
|---|---|---|---|
| A | 17: `check-recipes`, `check-runner-group-kill`, `check-sandbox`, `p03e-write-check-parity` | The sandbox policy denies the home directory and re-allows the working directory, the temp directory and the Node prefix. On Linux the sandbox library executes its bundled `apply-seccomp` helper inside the sandbox; when `node_modules` lies under the home directory and the candidate elsewhere, the helper is hidden and the check reports `sandbox_unavailable`. | Product defect on Linux |
| B | 2, and more once A is fixed | Tests probe a pid the recipe printed; under bubblewrap's pid namespace that number is not a Host pid. | Test oracle |
| C | 2: the recipe's own exit signal | The guard reports its direct child, which on Linux is the wrapper chain. Mechanism not established. | Open |
| D | 1: Harness recipe pass count | One recipe test skips unless the volume aliases NFC and NFD names. | Test oracle |
| E | 1: path alias | An upper-cased directory spelling reaches the policy only on a case-insensitive volume; on Linux the resolver refuses first. | Test oracle |

## Changes, review and checks

Recorded here as the packages land.
