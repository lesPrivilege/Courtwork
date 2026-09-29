# Work Core — contract → code review (non-author)

Checkout: `an isolated checkout of branch claude/doc-convergence-20260929`, HEAD `ffe68fb`. Repo files not modified. Probes are under `.../scratchpad/review/tmp-core/` (`probe1.mjs`, `probe2.mjs`, `probe3.mjs`).

All paths below are relative to the checkout root. Doc refs are `file:line`.

## 0. Test runs (all executed at HEAD)

All green: `work-core` 5, `attention-core` 9, `attention-actions` 12, `attention-http` 4, `attention-recovery` 2, `governance-core` 11, `governance-http` 3, `governance-recovery` 7, `nda-domain` 8, `nda-runtime` 2, `nda-producer-contract` 2, `nda-renderer` 4, `work-actions` 3, `work-http-recovery` 2, `work-continuity` 3, `work-context-continuity` 2, `work-settlement` 5, `work-artifact-read` 1, `work-derivations` 6, `work-derivations-compatibility` 4, `review-core-client-lifecycle` 13, `execution-file-candidates` 12, `execution-file-continuity` 7, `architecture-boundaries` 3.

Test level legend: **U** = pure unit; **B** = Core through the real Python bridge via `CoreClient`; **H** = real Host HTTP (`boot()`), real in-process runtime and Pi loopback; **S** = Core crash driven by a separate Python process (Host closed first).

Assessment of what the tests really assert:
- `core`/`governance`/`attention` tests are strong at B level. They cover CAS, replay, conflict, scope, hidden objects, corruption and SIGKILL barriers.
- `work-actions`, `nda-runtime`, `work-continuity`, `work-http-recovery` and `attention-http` are real H tests. They cover spoofed actor 400, `active_run` 409, generation mismatch, producer absence, deleted Session and restart.
- Weak or absent areas are listed in section 3.

## 1. Claims table

Verdict key: **R+T** realized and tested through the real path; **R/U** realized, tested only below the real path; **R/-** realized, untested at HEAD; **P** partial; **N** not implemented; **X** contradicted by code; **A** doc ambiguous or stale.

| # | Claim (doc:line) | Implementation | Test (level) | Verdict |
|---|---|---|---|---|
| C1 | One Core owner, one SQLite DB, single writer; Host owns the one client; extension lifecycle does not close it (contract.md:7; attention.md:5; architecture.md:66,73) | `core/owner.mjs:6-10`; `server/runtime.mjs:49,77-79`; flock in `core/bridge.py:389-399` | `work-core.test.mjs:55-58` DB_IN_USE (B); `attention-http.test.mjs` unload producer then Core reads still work (H) | R+T |
| C2 | Schema versions: Core user 4 / bridge app 5 / Runtime 22 (contract.md:9; architecture.md:73) | `core/bridge.py:52-53`; `server/store.mjs:45`; `core.py` Store rejects `user_version>4` | `governance-recovery.test.mjs:69-110` (B) | R+T |
| C3 | Migration only from Core1/app1, Core1/app2, Core2/app3, Core3/app4; exclusive backups; refuses existing/symlink backup and malformed schema; no repair (attention.md:9-13; contract.md:97; governance.md:36) | `core/bridge.py:196-380,426` | app1 to current: `work-core.test.mjs:80-93` (B, asserts only `.pre-file-core-v2-app-v3.bak`). app4 to app5 plus symlink/malformed/SIGKILL: `governance-recovery.test.mjs:69-110`. **No test at HEAD** for `.pre-attention-core-v3-app-v4.bak`, for the Core1/app2 origin, or for the Core2/app3 origin. My probe3 (empty DBs) shows the Core2/app3 to app5 path produces both backups as documented. | R+T for app1 and app4 origins; R/- for app2/app3 origins and the attention backup |
| C4 | Old Core2/Core3 hosts refuse the new schema (attention.md:13; governance.md:36) | `core.py:326-329` SCHEMA_NEWER | `governance-recovery.test.mjs:76` (fixed old host from git, B) | R+T (governance step only) |
| C5 | Decision = trusted actor, bound to candidate and version, request identity binds full content; a model-text actor is not identity (core-contracts.md:17,21; contract.md:31) | `core.py:778-870`, `_decision_hash` 622, `TRUSTED_ACTOR` 19, `validate_decision_request` rejects extra keys | `work-core.test.mjs:29,32` (B); `work-actions.test.mjs:61` and `work-continuity.test.mjs:20` spoof 400 (H) | R+T. Caveat: actor is a constant inside Core (F-9) |
| C6 | Idempotent replay returns the original receipt even after the candidate is closed; changed content is IDEMPOTENCY_CONFLICT (core-contracts.md:21; contract.md:42) | `core.py:625-633`, `decide` 788-791 (replay before CANDIDATE_CLOSED) | `work-core.test.mjs:31-33`; `work-http-recovery.test.mjs:24-66` (H, after crash) | R+T |
| C7 | CAS on base version; the later of two candidates on the same old version conflicts; no auto-merge (core-contracts.md:26) | `core.py:610-613,797`, `_recheck_binding` 656-674 | `work-core.test.mjs:38`; probe1 C (VERSION_CONFLICT on sibling) | R+T. Note: a reject or request_evidence also bumps the version and strands every sibling pending candidate (F-8, A-2) |
| C8 | Single-transaction accept: Artifact + version + obligations + Decision + audit + receipt; crash yields zero or one effect (core-contracts.md:22-24; contract.md:31) | `core.py:784-870` (BEGIN IMMEDIATE ... commit) | `work-core.test.mjs:66-79` four kill stages (S); `work-http-recovery.test.mjs:24-66` (S+H); `execution-file-candidates.test.mjs:83` | R+T |
| C9 | Decide re-checks evidence, contract/source staleness, obligations; only accept validates evidence (contract.md:62; core-contracts.md:22) | `core.py:792-807`, `_verify_evidence` 635, `_check_obligations` 676 | `work-core.test.mjs:42` (STALE_INPUT); `work-http-recovery.test.mjs:68` | R+T |
| C10 | Candidate is immutable; a revision is a new candidate with `supersedes` and human provenance; never revokes an earlier Decision (contract.md:32,40) | `core/bridge.py:918-934`; `core.py:442-486`; `core/owner.mjs:75-90` | `work-core.test.mjs:34-45`; `work-actions.test.mjs:36-66` (H) | R+T |
| C11 | `provenance` on a candidate is host-derived; the model cannot forge it (contract.md:11) | Node adapter builds the payload (`work-adapter.mjs:181-192`, exact keys). `core.py:141-145` (`validate_candidate_payload`) accepts `provenance:{human_revision,local-user}` from any caller | probe1 D: a model-path `saveCandidate` with forged provenance was accepted. No test | P (F-6) |
| C12 | Run admission: one active Run globally; base/source/contract frozen; terminal Run immutable except exact replay; candidate ids must belong to the Run and Matter (contract.md:62,64) | `core/bridge.py:637-757` | `work-core.test.mjs:55-61,95-107` (B); `work-continuity.test.mjs:64-72` (H) | R+T |
| C13 | Late model calls fail CANDIDATE_CLOSED; late results are never committed (core-contracts.md:38; attention.md:84) | `bridge.py:526-532,760-780`; adapter `admissionOpen` checks `work-adapter.mjs:572,740,765,782` | `work-core.test.mjs:59`; `nda-runtime.test.mjs:38` (H) | R+T |
| C14 | Human mutations require loaded producer, current generation and no active Run; read-only otherwise (contract.md:17,27,42) | `service.mjs:2478,2661-2689`, `owner.mjs:59` | `work-actions.test.mjs:92-115` (H); `work-continuity.test.mjs:39-43` | R+T. Core itself does not enforce "no active Run" (probe1 G); `humanAction` is not under `#withConfiguration` (F-7) |
| C15 | Actor is host-owned; any actor field is rejected (contract.md:27; attention.md:29,39) | `service.mjs:2663-2664,2683`; Attention `#attentionContext` 2520 | `work-actions.test.mjs:61`, `work-continuity.test.mjs:20`, `attention-http.test.mjs:188+` (H) | R+T |
| C16 | Core does not import host packages, GUI or provider names (architecture.md:116) | Python: stdlib only. mjs: `client.mjs` node builtins only, `owner.mjs` imports `./client.mjs` | `architecture-boundaries.test.mjs:103-104,185-195` scans `core/**/*.mjs` only | R/U. Python imports and provider names are not scanned (F-13) |
| C17 | Extension cannot grant itself formal write authority (architecture.md:116; core-contracts.md:17) | `WorkExtension.humanAction` itself calls `this.core.decide` (`work-adapter.mjs:958`). Local extensions receive the raw client: `extension-registry.mjs:117,213`, `local-extensions.mjs:131-138`, `runtime.mjs:77` | No test. probe1 E: a raw client acts as `local-user` on Attention | X for structural enforcement (F-1) |
| C18 | Tool approval, model completion and domain validation cannot substitute for acceptance (architecture.md:47; contract.md:42) | Model tools are only `se_read_source`, `se_submit_candidate`, `se_read_artifact` (+ file readers) (`work-adapter.mjs:525-598`); the only accept path is `humanAction`→`core.decide` | `work-continuity.test.mjs:29-32` (a forged submit after detach fails, H); `nda-runtime.test.mjs:66-80` | R+T (no accept tool exists) |
| C19 | Domain completion may further restrict accept; Core owns Completion (architecture.md M05 :105; contract.md:42; nda.md:9) | NDA gate is only in the adapter: `extensions/inbound-nda/index.mjs:45-53`. `core.py:676-733` gates only pre-existing blocking obligations and promotes the candidate's own blocking obligations on accept | `nda-runtime.test.mjs:73-75` (H, via the adapter). probe1 B: Core accepts a candidate carrying blocking open obligations | P (F-2) |
| C20 | Source history: historical reads use the candidate's frozen source revision; revisions must increase; bytes are immutable per (id,version) (contract.md:19,34) | `core.py:560-587`; `bridge.py:939-944`; `core.py:488-510` | `work-core.test.mjs:39-45` (B); `work-actions.test.mjs:87-88` (H) | R+T |
| C21 | Context v2 excludes the artifact body; `se_read_artifact` is paged, run- and matter-bound, digest-verified; `CONTEXT_BUDGET` at 24,000 (contract.md:52-56) | `owner.mjs:104-129`; `bridge.py:806-831`; `work-adapter.mjs:566-580` | `work-artifact-read.test.mjs`; `work-context-continuity.test.mjs:25` (H, 25k/100k) | R+T |
| C22 | Session delete never deletes formal work; Core history readable with no producer (contract.md:17,20) | `service.mjs:2472,2506-2517` | `work-continuity.test.mjs:33-44`; `nda-runtime.test.mjs:61-63` (H) | R+T. Host hard-codes the ids `['evidence-memo','inbound-nda']` (F-11) |
| C23 | Binding: `{existingMatterId}` with durable project and extension ownership; `fromSessionId`; detach preserves ownership (contract.md:25) | `service.mjs:2389-2432`; `bridge.py:897-911` | `work-continuity.test.mjs:22-28` covers existingMatterId, cross-project 409, detach. `fromSessionId` and detach with the wrong extension: no test | R+T for the main path; R/- for `fromSessionId` |
| C24 | `work-query kind=request` rejects another Matter's receipt (contract.md:18) | `service.mjs:2650-2653`; `work-adapter.mjs:934` | Only the positive case (`work-continuity.test.mjs:27`) | R/- |
| C25 | Settlement failure → host `unknown` + `extension_finish_failed`; reconcile never replays the finisher (contract.md:66) | `work-adapter.mjs:861-875`; runtime side | `work-settlement.test.mjs` (H) | R+T |
| C26 | File-memo profile: fixed basis, coverage monotone, verification recorded with the Candidate, `file-memo-structure-v1`, POLICY_STALE, limits, diff (contract.md:77-99) | `core/file_candidates.py` (whole); `core.py:802,838` | `execution-file-candidates.test.mjs` (12, B); `execution-file-continuity.test.mjs` (7, H) | R+T |
| C27 | Every file-profile HTTP action requires `fileCapabilityVersion:1`; others reject it (contract.md:89) | `service.mjs:2672-2678` | Not found in the tests I read (unverified whether covered) | R/- (unverified) |
| C28 | Core client lifecycle: bounded frames, 5s/30s deadlines, `outcome:'unknown'` on transmitted failures, no retry (contract.md:103-107) | `core/client.mjs`, `outcome` set at :190 | `review-core-client-lifecycle.test.mjs` (13, stub workers, U/B) | R+T for the client. **The HTTP layer drops `outcome`** (F-3) |
| C29 | BE-41 derivations: read-only project projection, `snapshotRef` binds paging, 409 on change (contract.md:109-113) | `core/derivations.py`; `service.mjs:2606-2630` | `work-derivations.test.mjs` (6), `-compatibility` (4) | R+T |
| C30 | Attention: identity `(project,id)`, limits (1000 / 32KiB / 16 / 32), create rev0→1, statuses, transitions, resolved requires reopen (attention.md:15-53) | `core/attention.py:241-330` | `attention-core.test.mjs:20-38,131`; `attention-http.test.mjs:78+` (H) | R+T |
| C31 | Attention request replay returns the original receipt, even after the origin Session was deleted; changed content conflicts; stale revision leaves no partial event (attention.md:55) | `attention.py:256-267`, `service.mjs:2546-2562` | `attention-core.test.mjs:22-23`; `attention-http.test.mjs` (delete session then replay create, H) | R+T |
| C32 | Runtime context is host-captured; the model cannot supply actor or context; grants default to absent; every read and signal rechecks the grant, including replay; signals cannot change status, seen, reason or grants (attention.md:59-65) | `attention-adapter.mjs`; `service.mjs:2594-2604`; `attention.py:87-130,241-256` | `attention-core.test.mjs:51-84`; `attention-http.test.mjs:248+` (H, adapter called directly; no production caller of `recordSignal`) | R+T at Core and adapter; consumer absent (per doc) |
| C33 | Signal source refs "are not promoted"; the runtime sees only what it is disclosed (attention.md:21,65; governance.md:9,32) | `attention.py:159-180,314-316`: `record_signal` validates `source_refs` with `matter_scope` only, never Matter disclosure | `attention-core.test.mjs` uses `source_refs:[]` for runtime signals. probe2: existence and digest oracle | P (F-4, latent) |
| C34 | Attention integrity: state, event and receipt digests are cross-checked; corruption is refused; hidden schema errors look like absence for runtime (attention.md:25,63) | `attention.py:69-120,393-400` | `attention-core.test.mjs:115-129,148-164` (B) | R+T |
| C35 | Attention queries: kinds, bounded, literal grep, offsets over the visible collection, event page 128KiB (attention.md:67-82) | `attention.py:333-412` | `attention-core.test.mjs:86-98`; `attention-http.test.mjs:188+` | R+T |
| C36 | Governance: policy is separate from Matter; a grant binds the observed object version; exact replay cannot resurrect a revoked grant; runtime cannot mutate policy (governance.md:7-19) | `governance.py:380-419` | `governance-core.test.mjs:39-62,87-111`; `governance-http.test.mjs:36` (H) | R+T |
| C37 | Governance reads: visible-collection version, source / artifact / file readers, expiry checked at read time, hidden fields excluded from the object hash (governance.md:13,21-32) | `governance.py:189-375` | `governance-core.test.mjs:64-207`; `governance-recovery.test.mjs:111` | R+T |
| C38 | Directory limits: ≤128 source descriptors per Matter, 128KiB per view, ≤1000 visible objects (governance.md:25) | `governance.py:28-29,177-181,44` | `governance-core.test.mjs:225-237` (over-budget inspect and revoke only) | R+T for the limit. Registry-wide effect untested (F-5) |
| C39 | Runtime Attention/governance tools only in global Attention; the Host recaptures identity every call (architecture.md:53) | `service.mjs:3200-3206,2582-2604`; `governance-adapter.mjs:9-15` | `governance-http.test.mjs:57,103` (H) | R+T. `attention-adapter.mjs` has no post-call identity recheck, unlike governance (F-12) |
| C40 | NDA: `se_submit_candidate` takes exactly `{domain}`; the whole review is verified against the trusted sources and facts before the artifact, evidence and obligations are derived; facts are immutable; the model cannot supply a conflicting artifact (nda.md:5-7) | `extensions/inbound-nda/index.mjs:44`; `domains/inbound-nda/*`; `app_work_data` has no update path | `nda-domain.test.mjs` (U); `nda-runtime.test.mjs:66-80` forged pass fails (H) | R+T |
| C41 | NDA: unresolved findings advertise only reject/request_evidence; attempted accept is rejected (nda.md:9) | `inbound-nda/index.mjs:45-62`; `owner.mjs` | `nda-runtime.test.mjs:73-75` (H) | R+T via the adapter only; see C19 |
| C42 | NDA domain module imports no model, GUI or host (nda.md:3) | `domains/inbound-nda/*` imports only siblings and `node:crypto` | `architecture-boundaries.test.mjs` scans domains but only asserts the catalog importer | R/- (no guard) |
| C43 | Renderer only interprets the packet; no arbitrary scripts (architecture.md:116) | `extensions/*/renderer.mjs` imports only `/web/*` | `architecture-boundaries.test.mjs:105-106,192` | R+T |
| C44 | M06 single write ownership, atomicity, idempotency, migration, backup, recovery (architecture.md:106) | see C1-C8 | see above | R+T |
| C45 | M08 Registry/Activation: check version, applicability, dependencies, permissions; unknown capabilities refused (architecture.md:107) | `extension-registry.mjs:43-81` validates manifest shape, id, `se_` tool namespace and surface prefix. No applicability, dependency or permission checks | `extension.test.mjs` (not read) | P (out of Core scope; unverified) |
| C46 | Evidence: the system resolver checks quote and coordinates and generates anchors; an ambiguous location stays unresolved (core-contracts.md:30) | The system only verifies caller-supplied `start/end/quote/digest` (`core.py:635-654`); it does not generate anchors or handle ambiguity | — | P (the doc is explicitly a "design candidate", core-contracts.md:3) |

## 2. Findings (ranked)

### Blockers
None found. No path was found in which a model or a browser client can record an accept.

### Major

**F-1 "Extension cannot grant itself formal write authority" is convention, not a capability boundary. (C17, C15)**
- Evidence:
  - `server/runtime.mjs:77` passes the raw `CoreClient` to the registry.
  - `runtime/extension-registry.mjs:117,213` call the factory with `{dataDir, core: this.workCore}` for every catalog and local extension.
  - `runtime/local-extensions.mjs:131-138` forwards that context to user-registered packages (`module.createExtension(context)`).
  - The client exposes `decide()` (`trusted_decide`) and `call('attention_action'|'governance_action'|'create_matter'|…)` with caller-supplied context.
  - `WorkExtension.humanAction` (`work-adapter.mjs:906-959`) is itself the Core caller. Its only actor check is a string comparison (`input.actor !== 'local-user'`) on a value the caller supplies.
- Verified by probe1 E: a raw `CoreClient` created an Attention as `actor:'local-user'`.
- Scenario: a locally registered extension (`trust:'host-trusted'`) runs `core.decide({..., action:'accept'})` for its own candidate, or resolves an Attention. Nothing in Core, the registry, or a test prevents it.
- Mitigation: local packages are explicitly "host-trusted" (`local-extensions.mjs:40-43`).
- Gap: no test asserts or forbids the exposure, and the architecture text states a structural guarantee.
- Fix: pass extensions a narrowed facade with no `decide`, no arbitrary `call`, and no human contexts. Or restate the guarantee as a trust rule.

**F-2 Domain "Completion" is enforced only in the Node adapter, not by Core. (C19, C41; contradicts architecture.md:105 M05 and :47)**
- Evidence: `extensions/inbound-nda/index.mjs:45-53` refuses an NDA accept when `reconciliation.complete` is false. `core.py:676-733` only gates the Matter's pre-existing blocking obligations. A candidate's own blocking obligations are simply promoted on accept.
- Verified by probe1 B: Core accepted a candidate carrying a blocking open obligation and promoted it into the Matter (`matter.obligations` blocking/open, version 1).
- Scenario: any caller of `trusted_decide` that skips `humanAction`'s `validateDecision` (see F-1) can accept an NDA review with unresolved findings. Nothing in Core or the schema marks such a candidate as non-acceptable.
- The HTTP test (`nda-runtime.test.mjs:73-75`) proves only the adapter path.
- The file-memo profile is the counter-example: there Core does own verification (`check_file_accept`).

**F-3 Contract claim "`CORE_TIMEOUT` and transport failures carry `outcome: "unknown"` and the operation" is not realized at the HTTP seam. (C28, contract.md:107)**
- Evidence: `server/index.mjs:110` maps every `error.source==='core_bridge'` to `{status:409, code, message}`. `outcome` and `operation` are dropped, and an unknown-delivery failure is reported as 409 Conflict.
- No test covers the HTTP form. `review-core-client-lifecycle` tests only the client object.
- Scenario: a decision times out after Core committed. The browser gets 409 `CORE_TIMEOUT` with no unknown-outcome marker and cannot tell "refused" from "maybe committed".
- Data safety is preserved by request-id replay and CAS. The recovery guidance the doc promises is not present on the wire.
- Also untested end-to-end: a worker SIGKILL under a live Host (`work-http-recovery` closes the Host before killing).

**F-4 Attention `record_signal` source refs leak existence and content of undisclosed Matters (latent — no production caller today). (C33; governance.md:9 "Matter defaults to undisclosed")**
- Evidence: `attention.py:159-180` (`sources` → `source_record`) checks only project scope (`matter_scope`), never the Matter disclosure policy. It then answers NOT_FOUND vs INTEGRITY_REFUSAL vs OK on `(matter_id, source_id, version, digest)`.
- probe2 confirmed with only `registry`+`signal` on one Attention:
  - a wrong digest → INTEGRITY_REFUSAL (matter/source exists)
  - a missing source id or matter → NOT_FOUND
  - a correct SHA-256 of a secret source → accepted and stored in the event
- Scenario: a Runtime consumer can confirm guesses of a source body (a hash-guess oracle) or the existence of `(matter,source)` ids in the project. It also records refs to undisclosed Matters into events readable under the `events` grant.
- Practical exposure is limited because `recordSignal` has no production caller (grep) and ids are random uuids.
- Tests only use `source_refs:[]` for runtime signals.

### Minor

**F-5 One bad object breaks the whole directory.** `governance.py:339-349` re-raises any non-NOT_FOUND `CoreError` from a single snapshot.
- Probe1 A: one Matter with 129 current sources made the human `registry` query fail with GOVERNANCE_LIMIT for the whole project. `object_kind:'attention'` still worked.
- The runtime path has the same shape for any granted Matter that is over budget or has an unsupported domain schema.
- Only per-object inspect and revoke are tested (`governance-core.test.mjs:225-237`).

**F-6 Core does not guard candidate `provenance`.** `core.py:141-145` accepts `human_revision/local-user` from any payload; probe1 D showed a model-path `saveCandidate` with that provenance stored as-is. Only the Node adapter's exact-key checks prevent forgery (`work-adapter.mjs:181-192`).

**F-7 "No active Run" is a Host check only, with a race window.**
- Core `decide` ignores `app_run` (probe1 G: accept succeeded while the Run was `running`).
- `service.humanAction` (`service.mjs:2661-2689`) checks `#busy()` but, unlike `createRun`, is not serialized under `#withConfiguration`. A Run admitted between the check and the Core write leaves the Run's frozen base stale.
- CAS makes the later candidate un-acceptable; nothing is corrupted. Unverified end-to-end (no test).

**F-8 Reject / request_evidence advance the Matter version.**
- `core.py:808` (`next_version`) bumps for every action, so sibling pending candidates become VERSION_CONFLICT and vanish from `humanActions` (`owner.mjs:61`). probe1 C confirmed.
- `contract.md:31` reads as if only accept advances the version (doc ambiguity, see A-2).

**F-9 Three actor vocabularies.**
- Decisions record the constant `{local_reviewer, reviewer-1}` (`core.py:19,783`), not the channel-supplied identity.
- Attention and governance record `local-user`.
- The `capability` argument of `Store.decide` is only tested for `None` (`core.py:781`); any object passes. `AUTHORITY_DENIED` has no test.

**F-10 Non-production code lives in the production module.**
- B1 event-authority mode, `rebuild_projection`, `ModelDispatcher`, `TrustedReviewer`, and the env hooks `CORE_TRUNCATE_ARTIFACT` / `CORE_KILL_HOOK` (`core.py:321,832`) remain.
- The client strips the environment (`client.mjs:77-79`), so the hooks are not reachable from the Host.
- Dead bridge surface remains: `list_matters` (`client.mjs:224`, no caller) and the unscoped all-Matter `snapshot`.
- The module docstring still says "experiment implementation, not the product Core".
- This conflicts with the project rule to remove obsolete paths.

**F-11 Non-atomic bind and Host-hardcoded ids.**
- `createBinding` (Matter created) and `claim_work` are two Core calls (`service.mjs:2417-2424`). A failure between them leaves an unowned orphan Matter.
- `['evidence-memo','inbound-nda']` is hard-coded in `service.mjs:2404,2417,2423,2471,2513,2640,2672`. A new Work extension gets no Core-history path, no `claim_work` and no `work-query`.
- Core hard-codes `CONTRACTS` in `governance.py:27` and file-memo verification rules in `file_candidates.py`.

**F-12 Adapter asymmetry.** `governance-adapter.mjs:11-13` rechecks the execution identity after the Core call. `attention-adapter.mjs:11` does not, so an Attention result can be returned after the Run closed mid-call. This is unverified for impact, and the doc claims only a per-call pre-check.

**F-13 Boundary guard is partial.** `architecture-boundaries.test.mjs` scans `core/*.mjs` only.
- Python imports and provider names are not scanned.
- `domains/` and `extensions/` graphs are scanned but not constrained.
- The Core-independence claim is true today but unguarded for the code that matters (Python).

**F-14 First-run crash window bricks an empty DB.**
- `bridge.py:409-413` writes meta and `user_version=4` in autocommit before `app_meta` exists. A crash there is followed by SCHEMA_INVALID ("no application schema version") on every restart until the file is removed.
- Reproduced by emulating the crash point (see the reproduction command in section 4).
- Only fresh empty DBs are affected.

**F-15 Test gaps that leave documented claims unverified at HEAD.**
- Attention-migration backup and the Core1/app2 / Core2/app3 origins (C3).
- `fromSessionId` binding (C23).
- Cross-Matter request receipt over `work-query` (C24).
- File-capability version negotiation over HTTP (C27, unverified whether covered elsewhere).
- The Local-extension Core exposure (F-1).

**F-16 Route shadowing.** `GET /attention/registry` and `GET /attention/conversations` (`server/index.mjs:165-170`) shadow those literal Attention ids for the GET inspect route; POST `/attention/query` still works.

## 3. Weak or misleading test coverage
- The SIGKILL recovery tests (`work-core.test.mjs:66`, `work-http-recovery.test.mjs:24`, governance, attention) kill a separate Python driver with the Host closed. They prove that the DB is recoverable, not that a live Host handles a worker death mid-commit (C28, F-3).
- `attention-http.test.mjs:248` exercises `recordSignal` by calling the adapter directly. No Pi tool or route uses it (grep), so the "Runtime seam" is unconsumed.
- The NDA completion tests go through the adapter; nothing tests Core behaviour on the same input, and Core would accept it (F-2).
- `architecture-boundaries.test.mjs` passes trivially for Python (unscanned).

## 4. Doc defects (stale or ambiguous vs code)

- **A-1 (stale Runtime schema).**
  - `attention.md:5` says "Runtime8 is unchanged"; `attention.md:13` and `governance.md:36` mention runtime4 and Runtime8 data.
  - Current Runtime is 22 (`contract.md:9`, `store.mjs:45`).
  - `governance.md:3` still lists Runtime7/8 as the base.
  - These read as current facts.
- **A-2 (`contract.md:31`).** "Accept alone atomically creates Artifact, advances version …" — code advances the version on every decision including reject and request_evidence (`core.py:808`).
  - request_evidence closes the candidate (status `needs_evidence`, `core.py:813`) and there is no path back other than a revision.
- **A-3 (`contract.md:11`).** "Core interprets identity/version/evidence/authority, while the domain adapter interprets rules" — the file-memo structure rules and their verification are implemented in Core (`file_candidates.py:30,181-187`).
  - `architecture.md:105` (M05, "Completion") is likewise not literally true for NDA (F-2).
- **A-4 (`contract.md:17`).** "If the producer is absent, extension is null" — an unloaded record returns `extension: record` with a read-only projection; only a missing catalog record returns null (`service.mjs:2471-2473`).
- **A-5 (`contract.md:62`).** "Generic pending proposals may retain unverified evidence" is true for Core; the memo adapter verifies evidence at proposal time (`work-adapter.mjs:149-163`). Clarify which layer.
- **A-6 (`contract.md:107` / HTTP).** The `outcome:"unknown"` marker is described as if visible to HTTP clients; the Host does not forward it (F-3).
- **A-7 (`attention.md:9,13`).** Migration steps and backup names are documented, but no current test exercises the attention step (C3, F-15). Historical probes live only under `evidence/`.
- **A-8 (`core.py:3-4` docstring vs contract.md:7).** The module describes itself as an experiment, while the contract names it the owner of transactional state.
- **A-9 (`core-contracts.md:60-64`).** The open question "Event as sole source vs transactional State + audit" is still listed open; code and contract.md:7 have already chosen B0 State+audit (the B1 code remains, F-10).
- **A-10 (`core-contracts.md:30`).** The system-generated anchor language is not implemented (C46); the file is marked a design candidate, so this is a status note rather than a violation.
- **A-11 (actor naming).** Docs speak of a host-set `local-user` (attention.md:39, contract.md:27), but the stored Decision actor is `local_reviewer/reviewer-1` (F-9).

## 5. What I did not verify
- End-to-end Host behaviour when the worker dies mid-request (F-3, F-7).
- Whether an HTTP test for `fileCapabilityVersion` negotiation exists elsewhere (C27).
- M08 activation semantics beyond manifest validation (C45).
- Renderers' behaviour on mutations (out of scope).
- Whether MCP or local Pi tools can reach the plain-file `state.db` (the architecture.md:118 shell/credential-isolation requirement). No shell tool was found in `runtime/workspace-tools.mjs`. The docs themselves say digests are not an adversarial signature.

Reproduction: `node <scratchpad>/review/tmp-core/probe{1,2,3}.mjs`; the F-14 emulation is a 12-line Python snippet that calls `core.Store` and `bridge.open_or_initialize` on `init-probe/state.db`.
