# CourtWork-fresh · Experts / hot-plug local seam report

Date: 2026-09-08 (Asia/Singapore)
Scope: read-only inspection of `<isolated-checkout>`, branch `codex/fresh-courtwork`, HEAD `f8aff61be8ef7ed5e3a3d2b7a1fbb631197383fd`. No product or Paper files were changed by this audit. The only new file written by this audit is `/tmp/se-hotplug-local-seams.md`.

## Verification

```text
cd <isolated-checkout>/app
npm test
tests 134
pass 134
fail 0
duration ~35s
```

The command covered the existing application and extension tests, including extension-run, extension-restart, control-plane, UI event mapping, Core/extension, lifecycle, artifact and work-summary paths. No paid provider, live remote MCP, browser run, or real legal review was performed.

The product source paths inspected below have no working-tree diff against HEAD. The checkout is nevertheless dirty in documentation and Work Surface Kit files, including modified `engineering/current.md`, `engineering/roadmap.md`, runtime/Review work orders, and untracked `engineering/research/experts-hotplug-2026-09-08/`. Any implementation or acceptance result must bind to the later writer-merged SHA, not this research SHA.

## C01–C06 local matrix

| Claim | Local result | Evidence and exact boundary |
|---|---|---|
| C01 Expert is a Work Contract, not a second agent runtime | **Verified for the existing extension seam.** | The host creates one generic Run and one Pi AgentSession; the extension contributes context, tools, close and finish through `app/server/service.mjs:724-814,834-1049`, `app/runtime/extension-registry.mjs:231-247`, and `app/extensions/evidence-memo/index.mjs:284-362`. The extension has no second agent loop. The runtime profile is declarative and its UI slots cannot register renderer code: `app/runtime/control-plane.mjs:57-66,176-206`. **Gap:** there is no first-class Expert package or Matter attachment beyond the trusted built-in extension/session binding. |
| C02 Freeze state topology before execution topology | **Partial.** | Sequential execution exists: one Run exposes `se_read_source` and `se_submit_candidate` at `app/extensions/evidence-memo/index.mjs:284-362`; candidate state is a domain row at `app/extensions/evidence-memo/core/core.py:198-213`. There is no `ReviewRuleTask`, queue, scheduler, worker branch, or reconciliation state in the current product. NDA per-rule state and unresolved/conflict accounting are new domain work. Parallel workers remain deferred. |
| C03 Canonical work state is not agent trace | **Verified for evidence-memo, not genericized.** | Host schema 4 stores session/run/event operational state (`app/server/store.mjs:19-31,398-455`); `runtime.bound` is an append-only host event whose `data` is only an object-level value, not a typed domain schema. Evidence-memo Core owns SQLite Matter/source/Candidate/Artifact/Decision/Audit/Event tables at `app/extensions/evidence-memo/core/core.py:169-257`, returns state at `697-730`, and projects it at `app/extensions/evidence-memo/index.mjs:175-218`. **Gap:** the host has no generic Matter/Review repository or typed restore/fallback decoder. |
| C04 Proposal and commitment remain separate | **Verified in the sample.** | Model-facing tools are read/source and candidate-only (`app/extensions/evidence-memo/index.mjs:322-358`); candidate save is pending and cannot publish an Artifact. Trusted decision is a separate Core capability and transaction (`app/extensions/evidence-memo/core/core.py:746-831`; `app/extensions/evidence-memo/core/bridge.py:599-606`). Host human actions hardcode host-derived `local-user`, reject a model actor, and call only a bound extension (`app/server/service.mjs:665-685`; `app/extensions/evidence-memo/index.mjs:458-479`). **Gap:** generic host Review actions/queue do not exist; current permission allow/deny is tool authorization, not Work commitment. |
| C05 Expert owns work semantics; MCP exposes capabilities | **Mostly verified.** | Resource provenance, scoped exposure, profile ceilings and permission evaluation are in `app/runtime/control-plane.mjs:131-206`; actual execution rechecks policy in `app/runtime/control-tools.mjs:20-42`; MCP discovery/lifecycle/tool calls are separate in `app/runtime/mcp-manager.mjs:5-99`. **Gaps:** no durable RemoteTask/MCP Tasks handle, no generic trust-zone/egress/principal/side-effect metadata, and only the implemented Streamable HTTP/unauthenticated MCP subset is supported. |
| C06 Executable lifecycle differs from durable work state | **Gap / current counterexample.** | Registry records load/invalidate/unload/reload and generations at `app/runtime/extension-registry.mjs:179-217`. `unload` only changes status and explicitly keeps the singleton instance alive (`194-200`); `projection` accepts unloaded/invalidated records and invokes that instance (`238-242`). Evidence-memo `projection` calls `start()` and can reopen its Core (`app/extensions/evidence-memo/index.mjs:278-281`). Thus unload does not structurally dispose/revoke all executable resources. If the catalog is absent, persisted records remain dormant but there is no producer-independent projection: `service.mjs:650-662` returns no surface for a missing record, while the browser fallback needs the returned projection (`app/web/app.mjs:2996-3120`). Existing restart tests cover records/source and changed version (`app/tests/extension-restart.test.mjs:11-98`) but do not prove missing-package history fallback or executable teardown. |

## Existing Work / Review mechanism and what is missing

H1 should be described as reuse/adaptation/validation, not creation of the basic Matter/Candidate/Decision chain. The existing development Core already has:

- Matter, source and source-set rows, candidate, artifact, request-result idempotency, decision, audit and optional event tables: `app/extensions/evidence-memo/core/core.py:169-257`.
- Candidate save with exact schema, trusted Run binding and pending status: `core.py:419-457`; bridge boundary `app/extensions/evidence-memo/core/bridge.py:563-583`.
- CAS, source/evidence checks, one-transaction acceptance, artifact pointer, obligations and idempotent `accept|reject|request_evidence`: `core.py:746-831`.
- A read-only extension projection with candidates, evidence, Artifact and candidate-specific `decide` action: `app/extensions/evidence-memo/index.mjs:175-218`.
- A host-facing action route only for a session-bound extension: `app/server/index.mjs:107-110`, `app/server/service.mjs:650-685`.

The following are **not** a generic Review API:

1. There are no HTTP routes for list/get Matter, Review packet, Candidate, Decision, evidence anchors or review queue. The only related host mutation is `POST /sessions/:id/actions`, which dispatches an extension-specific opaque action.
2. There is no generic read route that can return a candidate or Decision after the producer package is missing. Core bridge operations are private to the extension process: `bridge.py:613-665`.
3. There is no UI edit/revise-Candidate API. A model can submit a new Candidate only during an admitted Run; `humanAction` supports `save_draft` and `decide`, not a generic edit that creates a new Candidate.
4. There is no rule-level schema containing `rule_id`, applicability/classification/position, finding, proposal set, uncertainty, conflict/reconciliation status and per-rule Decision. Current Candidate has `artifact_text`, evidence and obligations only: `core.py:131-156`.
5. There is no producer-independent historical envelope/decoder carrying producer version, schema version, playbook/source version, rule identity, evidence references, Decision and artifact reference. The current rich renderer is explicitly a trusted live extension renderer; absent code has no fallback.
6. The existing host Artifact is a run content-version, not an accepted Work Artifact. The UI says this explicitly at `app/web/inspector.mjs:90-171`, and the host has no acceptance field in that path.

The minimum missing Work API contract therefore needs a domain-owned implementation or adapter that can:

- read a versioned review packet/state by Matter and Candidate identity;
- submit or revise a Candidate as a new identity/version;
- submit a typed Decision with trusted host actor, request identity, Candidate/base-version CAS, action, reason and idempotency;
- return authoritative state after commit and expose unresolved obligations/conflicts;
- render a read-only typed fallback when producer code is absent, with mutation disabled unless a compatible producer/action adapter is loaded.

This list is a seam requirement, not an instruction to add a second ledger or to move domain state into host events.

## H1/H2/H3 and Work Surface Kit audit

### H1

The H1 text in `engineering/research/experts-hotplug-2026-09-08/pr-plan.md:19-29` should explicitly say “reuse and generalize the existing evidence-memo Core” and name the missing generic API/rule schema/fallback above. Its current phrase “补足候选、可信 Decision、来源版本及当前有效成果链” reads as if those primitives are absent, although the development Core and tests already implement them.

Existing behavior does not prove all H1 acceptance claims. The current tests prove candidate save, trusted acceptance, late-call rejection, restart of the loaded extension and dormant records, but not cross-session Matter attachment, UI-independent review recovery, producer-absent projection, or a generic review endpoint. Keep those as new tests/contract gaps rather than marking H1 done.

### H2

The H2 reuse boundary is accurate for runtime mechanics:

- profiles/resources and restrictive policy are implemented in `app/runtime/control-plane.mjs:7-11,176-206`;
- Run admission binds a runtime snapshot and freezes configuration at `app/server/service.mjs:724-813`;
- the extension model surface is intentionally only source read and candidate submit at `app/extensions/evidence-memo/index.mjs:322-358`.

What H2 still needs to add is the NDA adapter/domain content: fixed playbook/resource version, per-rule finding/proposal/unresolved state, source/rule coverage and conflict/reconciliation checks. No current code runs an NDA playbook or produces per-rule ReviewRuleTask state. The existing runtime should be reused; do not add a legal-specific agent loop.

### H3 versus WK3/WK4

H3 in `pr-plan.md:44-55` promises rule/source/diff/legal-action detail and producer-absent historical fallback. That promise exceeds the currently frozen Work Surface contract:

- `engineering/mvp/execution/work-surface-kit/contracts/review-projection.md:3,8-22,32-41` and `review-projection.d.ts:1-19` define only `permission | question | outcome`, generic summaries/targets/status and actions `answer | allow | deny`; the commit gate is a comment placeholder.
- The current source has no `outcome` kind in `app/web/thread-projection.mjs:21-105`; EX-WK1 records this at `explore/ex-wk1-canon-map.md:136-145`.
- `WO-WK4-review-slice.md:17-19` explicitly forbids adding review states, fields or endpoints and forbids `accept/reject/revise` buttons.
- The current `work-summary` is session/run/question/permission oriented, not Matter/Candidate/Decision oriented: `app/server/work-summary.mjs:37-56`.

Required correction: keep WK3/WK4 scoped to generic question/permission/outcome projection and fixture behavior. Put the actual domain Review packet/actions and historical fallback behind a new post-H1 Core/domain contract and separate work order. Do not count WK3/WK4 acceptance as H3 acceptance. If H3 first ships a read-only fallback, it still needs a typed domain envelope and a producer-independent decoder; the present raw `renderSurfaceFallback` cannot infer rule/evidence/Decision fields from an absent projection.

A process status mismatch should also be corrected or explicitly recorded: `WO-WK3-contract-freeze.md:3` says it is frozen, while `EX-WK2-review-sources.md:3` remains “骨架” and `explore/ex-wk2-review-sources.md` does not exist. The current freeze is therefore only the EX-WK1/local mapping plus a type decision, not completion of the promised external Review-source intake.

## Lifecycle, baseline and dynamic changes

- Current product code is unchanged from the fixed SHA used for this read-only comparison.
- The active checkout is not a clean baseline: Work Surface Kit docs/contracts/work orders and the new Experts research directory are untracked or modified; `WO-RC-runtime-ui.md` is now waiting for WK6/WK8 merge, and `WO-WK5-brand-wiring.md` is marked merged into WK6. These are documentation/planning changes, not runtime implementation changes.
- `engineering/research/experts-hotplug-2026-09-08/README.md:12` correctly warns that later PRs must rebind to a new HEAD and active writer state. Preserve that warning in each H0/H1/H3 evidence record.
- `engineering/roadmap.md:36-48` and `engineering/current.md:25` describe the new path as research/plan only; this is consistent with the code. The roadmap links resolve to `engineering/research/experts-hotplug-2026-09-08/`.
- The existing Runtime Control Plane’s hot-swap claim is explicitly “between-runs” and its work-state owner is extension/system-of-record at `app/runtime/control-plane.mjs:206`; H4 should test and narrow the unload behavior rather than infer structural hot-plug from this metadata.

## Minimum bounded self-build

1. H0: freeze a synthetic NDA/playbook corpus, per-rule gold and holdout/error taxonomy. Record final code SHA and all input/provider/policy hashes.
2. H1: keep EvidenceMemo Core as the domain owner; extend only the domain adapter/schema needed for per-rule state and a typed Review query/action boundary. Do not create a host ledger or a generic SDK.
3. H2: use the existing Pi loop, profile, control-plane, trusted extension and policy gate. Add only NDA resources and adapter semantics; preserve candidate-only model tools and unresolved output.
4. H3: after H1’s API exists, add a domain Review projection and typed producer-independent read-only fallback. Keep accepted/rejected/revise semantics in Core; keep permission/question cards in WK3/WK4.
5. H4: prove disabled/unloaded/invalidated/absent producer, partial init failure, restart and schema mismatch. Fix or explicitly narrow Registry unload semantics; do not delete domain state.
6. H5: only then run paired fixture/provider evaluation. Real provider and professional Reviewer remain separate evidence classes.

Defer parallel workers/scheduler, MCP Tasks or remote jobs, marketplace/package installer, arbitrary third-party executable packages, complete theoretical scope hierarchy, process sandboxing, and generic migration framework until a second consumer or measured failure requires them.

## Seam questions for the parent

- Which existing domain object will be the NDA Matter owner, and will per-rule state extend EvidenceMemo Core or use a separate domain adapter while retaining one authoritative repository?
- What exact generic query/action API will expose Review state without making `session/event` the authority? It must cover read packet, candidate revision, typed Decision, CAS/idempotency and producer-absent read.
- What is the producer-independent envelope and decoder for a historical Review packet? At minimum retain producer/package version, schema version, playbook/source version, rule identity, evidence anchors, unresolved status, Decision and Artifact reference.
- Does H4 deliberately change `ExtensionRegistry.unload` to dispose executable resources, or is v0 narrowed to “disable future Runs while keeping Core projection alive”? The current implementation only supports the latter and can revive the Core through projection.
- When will EX-WK2 source intake actually return? Until then, label WK3 as a local type freeze and keep WK4’s external source claims/unrelated acceptance pending.

