# SE hot plug research validation

**Date:** 2026-09-08  
**Scope:** read only validation of `/Users/lesprivilege/Downloads/se-experts-extensions-hotplug-research-index-2026-09-08.md` against the current Schema Engineering sources, the fixed CourtWork paper baseline, and five official-hosted Harvey, Ironclad, and Relativity pages (including one partner case study).  
**Disposition:** `Index only` for any new observation. Keep Canonical and Practice unchanged; do not upgrade CourtWork's paper binding or describe the proposed benchmark as executed.

## Authority and version boundary

- The attached document calls itself an index for local planning, not an implementation plan (attached file, lines 11-19). Its PR cuts are explicitly “candidate cuts only, not authorized work” (lines 1776-1779). Its proposed end state is therefore a hypothesis to reconcile, not an instruction or implementation evidence.
- Schema Engineering working tree: `main`, `HEAD 95c97f807f48030e02b349345f92d8407df50266`; the working tree contains the local 9.6 candidate and generated files. The candidate is useful for semantic comparison but is not a published or frozen release. Repository rules in `README.md` lines 5-21 and `CONTRIBUTING.md` lines 5-9, 26-55 make Practice Index the place for observations and require a fixed engineering commit for CourtWork feedback.
- CourtWork Fresh `PAPER.md` lines 5-13 fixes the engineering semantic baseline at SE 9.3, commit `f8ecb091895559389bb4e75f3c6f28052b71c5a3`, and says the local 9.6 candidate is uncommitted. `engineering/research/experts-hotplug-2026-09-08/validation.md` lines 1-3, 42-46 says its design is pre-registered and **not executed**. No result below should be attached to the 9.3 baseline as a completed product result.

### Which version the line references describe

The line references in the claim table below point to the **current uncommitted 9.6 candidate** in `papers/src/canonical.md` and `papers/src/practice.md`. They are not coordinates in the fixed CourtWork baseline. The candidate source bytes were hashed on 2026-09-08 as follows:

```text
9771dfce3863933db819029e8679b36bfd0933ac2028bab5b6bb2e1f73e4dc59  papers/src/canonical.md
cb5b106899d23429ff93e24a0470c93f8a22abb34c62c760a15426f61a39fc9d  papers/src/practice.md
5fad1ebb4ff89e2fbe3091c9c9aeaf26c0e16a5517899b59d3787468134c7aef  papers/src/practice-index.md
```

For the fixed SE 9.3 bytes at `f8ecb091895559389bb4e75f3c6f28052b71c5a3`, the closest stable coordinates are:

| Fixed 9.3 section | Relevant coordinates and C-claim coverage |
|---|---|
| Canonical §8 | Lines 684-842. §8/§8.1 lines 684-732 already define Agent Extension, Work Extension, runtime adapter, Human Work Surface, state compatibility, plugin lifecycle, and the limitation that composability does not prove Work Contract correctness or accepted-work-product quality. §8.2 lines 751-810 define Compiled Work Expert and activation; §8.3-§8.4 lines 812-842 define release and E2E acceptance. This covers C-01, C-02, and C-06 at the same semantic level. |
| Canonical §13 | Lines 1345-1387. §13.2-§13.3 separate Harness and Work Extension, preserve a single canonical owner, and state that hot swap acts on runtime packaging only; it cannot silently migrate formal state or skip Authority/Review. This is the fixed-baseline mapping for C-01, C-05, and C-06. |
| Canonical §14 | Lines 1389-1434. Architecture, continuity/governance, and product-value tests cover no core patch, plugin reload, session replacement, Candidate/Committed isolation, capability gates, accepted work product, and the cost/quality boundary. This is the fixed-baseline test mapping for C-01 through C-06. |
| Canonical §15 | Lines 1436-1498. Evidence classes and F1-F27 constrain how mechanism, vendor self-benchmark, independent reproduction, and hot-plug portability claims may be interpreted. |

The 9.6 candidate keeps the fixed 9.3 §13 and §14 boundaries materially intact while reorganizing nearby §8/runtime prose and adding or sharpening context, failure-containment, projection, evaluator, and state-mediated-coordination checks elsewhere. Fixed 9.3 §8 already contains the relevant hot-module-replacement and “does not prove reliability” caveat; the candidate therefore does not create a new C-01/C-06 semantic baseline. Use the fixed coordinates above when recording a CourtWork observation against the 9.3 SHA.

## Claim reconciliation

The claims do not require a new Canonical object, Contract type, or principle. They restate existing boundaries; their implementation and efficacy remain test questions.

| Attached claim | Existing SE support | What is supported now | Missing evidence / smallest decisive test |
|---|---|---|---|
| **C-01 — Expert is not an agent persona** (attached lines 50-79) | Canonical §8 lines 677-719 defines Agent Extension and Work Extension as versioned work semantics plus a runtime adapter, human surface, state compatibility, and evaluation. §8.2 lines 738-764 separates Work Primitive, Work Extension, Compiled Work Expert, and Run Plan. Practice §2.1 lines 52-81 and §3.1 lines 206-240 separate runtime seams, capability surface, and Work Contract. | The host can own loop, tools, persistence, permissions, and trace while an Extension contributes bounded work semantics. This is an existing SE distinction, not evidence that the local host already has the required seam. | Run **No Core Patch**, scoped registration/cleanup, capability provenance, and E2E equivalence with one generic agent. A successful install or demo alone does not prove an Extension boundary.
| **C-02 — Freeze state topology before execution topology** (lines 81-125) | Canonical §4.4 lines 322-328 defines Lane as parallelism and keeps operational responsibility on Operator; §8.5 lines 831-843 separates model, agentic, and work benchmarks. Practice §2.7 lines 129-144 says multi-agent is execution topology and governed artifacts are the coordination surface. | Sequential per-rule work is semantically compatible with the paper. Parallel workers and reconciliation can remain a later scheduler choice. Harvey's own description supports the mechanism of rule workers, branches, reconciliation, shared context, and persistent state; it does not establish local or general efficacy. | First prove replayable per-rule state and review outcomes sequentially. Only then compare sequential with parallel branches under the same Contract, corpus, reconciliation rule, and accepted-work-product review.
| **C-03 — Canonical work state is not agent trace** (lines 127-159) | Canonical §4.6-4.8 lines 336-366 separates Candidate and Committed Events, Artifact versions, Current Semantic State, and Raw History; §5 lines 394-407 separates history, state, projection, and output. Practice §2.5 lines 103-109 and §4.1-4.3 lines 305-347 require replay from authority state, artifacts, evidence, and open obligations. | Durable typed state and on-demand history are already the SE model. Transcript replay is not a valid substitute for canonical state. | **Session Replacement**, state/event replay, and UI fixture replay after the producer is gone. The current B-unload design tests only a limited renderer presence/absence condition and is not yet full lifecycle evidence.
| **C-04 — Proposal and commitment remain separate** (lines 161-179) | Canonical §4.6 and §4.9 lines 336-372 require typed Candidate changes, Authority and Review checks, then Committed Events. §6.1-6.6 lines 534-625 distinguish evidence, completion, authority, artifact, review, and escalation. Practice §5.3-5.4 lines 393-438 makes the typed Candidate Decision → validation → commit path explicit. | Findings, redlines, and recommendations may be produced by an Expert; formal state and irreversible/external actions remain behind authority and review. | Inject forged reviewer identity, direct accept calls, stale Candidate, invalid evidence, duplicate retries, and unknown external results. Any unauthorized committed effect is a zero-tolerance boundary failure.
| **C-05 — Expert owns work semantics; MCP exposes capabilities** (lines 181-203) | Canonical §6.1 lines 534-540 and §6.4 lines 588-603 distinguish resource/tool capability from business Authority. §8.1-8.2 lines 701-719, 758-764 make runtime services/tools dependencies of the Work Extension and require deterministic permission/commitment gates. Practice §2.1-2.2 lines 54-81 and §3.1 lines 196-204 require capability negotiation and effect checking. | MCP can be an optional capability adapter; it is not the Expert identity. Provider provenance, scope, and action effects belong in the runtime governance path. | Test visibility filtering before execution, provider provenance, missing-capability refusal, same-Matter isolation, and data egress at the enforcement point. The current B-policy probe is synthetic and cannot prove real egress safety; B-provider is correctly deferred.
| **C-06 — Executable lifecycle differs from durable work-state lifecycle** (lines 205-238) | Canonical §8.1 lines 701-719 requires state compatibility, migration, rollback, and canonical-owner mapping; §13.3 lines 1356-1374 says hot swap cannot move canonical ownership or skip Authority/Review. The §14 tests at lines 1382-1393 operationalize those boundaries. Practice §4.2 lines 307-324 says deleting a Session, changing model, or upgrading a host must preserve active Artifact, state, and obligations. | The invariant “unload executable contribution without deleting reviewed work” is already stated. It is a boundary requirement, not proof that the local frontend/runtime satisfies it. | Exercise install → enable → attach → produce → review/commit → unload/registration cleanup → fallback replay → explicit v2 migration/rollback. The current B-unload pair does not yet exercise these lifecycle transitions or schema migration.

## External source check

The five pages below were opened on 2026-09-08. They support mechanism or workflow observations. None supplies independent evidence that hot plugging, durable replay after unload, authority enforcement, or accepted-work-product quality improves in this implementation.

| Official-hosted source | Verified mechanism | Efficacy and interpretation limit |
|---|---|---|
| [Harvey, “How We Rebuilt Playbook Review as a Multi-Agent System”](https://www.harvey.ai/blog/rebuilding-playbook-review-as-a-multi-agent-system), 2026-09-02 | Describes an internal benchmark, per-rule workers, unique document identifiers, per-worker branches, reconciliation, shared matter context, persistent worker state, retries/concurrency limits, and a multi-model harness. It reports vendor offline changes of risk classification 59%→77%, redline rubric 53%→87%, and latency 2.6→3.8 minutes. | The benchmark and rubric were built with Harvey's in-house legal team and scored with a committee of three frontier-model judges. The page does not provide an independent gold set, independent adjudication, accepted-work-product outcome, or component-level causal ablation. Use it for C-02 mechanism context and as a vendor-reported hypothesis, not as proof of general benefit.
| [Harvey, “Turn Your Standards Into Stronger Reviews”](https://www.harvey.ai/blog/playbook-builder-in-harvey), 2026-08-04 | Describes building a playbook from standards/corpus or from scratch, clarifying questions, citations, preferred/fallback positions, actions, conditions, and escalation paths. | Product mechanism only. The page includes customer/vendor claims (including an 80% time reduction for one customer), but no independent controlled accepted-work-product result. Use for the review-surface and playbook-versioning analogy only.
| [Ironclad, “Create Ironclad AI Playbooks in Workflow Designer”](https://support.ironcladapp.com/hc/en-us/articles/24948981301143-Create-Ironclad-AI-Playbooks-in-Workflow-Designer), updated 2026-02-19 | Documents playbooks linked to workflow templates, administrator access, triggers, required/forbidden clause presence, positions, approvers, save/publish, and permissions. Missing required clauses or exceptions can require additional approval. | This is a product help article. It does not document hot-plug package lifecycle, replay without live code, or causal quality improvement. It supports bounded scope/approval/version concepts, not the C claims as empirical results.
| [Relativity, “aiR for Review”](https://help.relativity.com/RelativityOne/Content/Relativity/aiR_for_Review/aiR_for_Review.htm) | Describes SME prompt criteria, citations and rationale, citation verification, and Develop → Validate → Apply; validation compares model predictions with human-coded material before broader application. | Workflow/evaluation guidance, not an independent efficacy study. It does not show durable Expert state, unload semantics, or accepted-work-product lift attributable to the mechanism.
| [Relativity, “Anatomy of a Gen AI Review: Process, Validation, Disclosure”](https://www.relativity.com/blog/anatomy-of-a-gen-ai-review-process-validation-disclosure/) | Describes scoping, random/diversity/threshold/keyword sampling, attorney iteration, validation, recall/precision confidence intervals, and disclosure considerations in a partner case study. | Relativity labels it descriptive rather than prescriptive and states that facts were adjusted for confidentiality. It is official-hosted partner evidence, not an independent controlled comparison; do not promote its reported process or outcomes into a general SE efficacy claim.

These sources therefore justify retaining a narrowly scoped Index observation: mature legal products expose playbook rules, review/approval surfaces, citations, validation workflows, and in Harvey's case an orchestrator/branch/reconciliation pattern. They do not justify adding a new Kernel concept or claiming that hot-plug architecture improves professional work.

## Minimum falsification benchmark

Use the existing synthetic inbound NDA, fixed playbook/fallback, and fixed no-open-web normal path. The current validation file's 12 paired variants are a useful candidate smoke corpus, not a frozen sample size or power calculation; small same-template variants must not be counted as independent evidence.

### Optional follow-up ablation (reuse one architecture)

If the primary implementation later needs component attribution, reuse the same implementation and expose two controlled switches—durable replayable state and an independent typed review/commitment gate—in a 2×2 ablation. This is an optional follow-up experiment, not a requirement to build four production paths or four architectures:

| Arm | Durable typed state / replay | Independent typed review and commitment gate | Purpose |
|---|---:|---:|---|
| 00 | No; transcript plus final output only | No; existing output review | Baseline |
| 10 | Yes; Candidate, Evidence, State, Artifact version, obligations | No; retain the same output review | State/recovery increment |
| 01 | No durable replay; ephemeral typed candidate/evidence packet | Yes; Authority-checked Decision and commitment path | Review/commitment increment |
| 11 | Yes | Yes | Full governed path |

The 10/01 arms require explicit implementation definitions before execution. If a proposed arm cannot be built by toggling the relevant behavior without silently adding the other factor, record that confounding and do not infer a component effect. Existing A/B, B-context, B-policy, B-provider, and B-unload pairs can be secondary probes. A single primary architecture can pass the smoke suite first; the ablation is only for later causal attribution.

### Freeze and review protocol

Before looking at holdout results, hash and record the NDA corpus, playbook/fallback and rule versions, initial Matter state, model/provider, harness/adapter, tool allowlist, prompts/configuration, budget, run order, evaluator/rubric, reviewer instructions, and code/dependency SHAs. Use a development set for changes, then lock a source/Matter-isolated holdout. Blind variant labels, counterbalance order, repeat enough trials to report run variability, and predeclare the acceptable difference/effect target or explicitly state that the run is an engineering smoke test.

At least two qualified independent reviewers should score the work-product packet, with a written adjudication and disagreement procedure. If independent review is unavailable, report only deterministic engineering behavior and reviewer usability; do not claim reduced lawyer burden or improved professional outcomes. Preserve every attempt, refusal, escalation, reversal, and failure.

### Required negative controls and boundaries

- Missing fact, missing rule, conflicting rules, incomplete parse, stale document/playbook version, duplicated evidence, overlapping edits, and malicious instruction in the material.
- Forged reviewer identity, direct accept/approve/publish/transmit call, stale Candidate, same-key retry, same-key changed content, cancel followed by a late result, lost commit response, process restart, and session deletion.
- Same-Matter versus other-Matter capability visibility, missing provider/capability, permission revocation, and a synthetic policy bypass probe. A synthetic probe cannot establish real external data-egress safety.
- Renderer present/absent and producer/extension unload, followed by fallback rendering from durable state. Add install, enable, attach, update, migration, cleanup, and rollback before calling this a hot-plug test.

### Metrics and falsifiers

Report separate deterministic integrity, work quality, human review, and system-cost measures; do not multiply them into an undefined score.

- **Zero-violation integrity gates:** unauthorized commit, stale or invalid commit, duplicate side effect, cross-Matter exposure, post-unload state loss, replay mismatch, or renderer-dependent loss of evidence/Decision.
- **Work measures:** rule coverage; evidence integrity and provenance; missing-versus-not-found correctness; bounded proposal correctness; escalation correctness; review fidelity; accepted-work-product rate; substantive reviewer modification; later reversal; and risk-stratified outcomes.
- **Review/recovery measures:** independent error detection, evidence requests, review time, disagreement, recovery success, rerun/recovery cost, and number of transcript replays. Keep reviewer ability to form an independent decision separate from approval clicks.
- **Execution measures:** latency, tokens, retries, tool calls, memory/context size, maintenance code, and provider/model variation.

Falsify or narrow the claim when:

1. any integrity gate is violated; retain proposal-only behavior and stop formal acceptance claims;
2. state cannot replay the same committed versions, open obligations, evidence links, and Decision after Session replacement or unload; withdraw the hot-plug durability claim;
3. the governed arm does not improve accepted work product, independent error detection, or recovery while adding material review/cost burden; retain the mechanism as a design option without efficacy claim;
4. State-only loses trajectory-defined, unknown, conflict, or audit information; retain on-demand History/Evidence and do not claim State-only sufficiency;
5. arm definitions, reviewer labels, or model/provider changes are confounded; report no causal component result;
6. parallel execution changes outcome only through a different Contract, reviewer, or reconciliation rule; do not attribute the change to topology.

The next topology test, if warranted, is sequential versus parallel per-rule branches with the same typed state, reconciliation, reviewer, and acceptance standard. It should wait until state/review semantics pass the preceding boundary tests.

## Paper and engineering disposition

1. **Body:** no Canonical or Practice edit is justified. C-01 through C-06 are already covered by Canonical §4, §5, §6, §8, §10-§11, and §14-§15 and the corresponding Practice §2, §3, §4, §5, §6, and §7. Adding a new “Expert/Extension/Hot-plug” ontology would duplicate the current Work Extension / Compiled Work Expert and runtime-governance boundaries.
2. **Index:** if this research round is recorded, add one `observe:` or `adjudicate:` entry containing the six claims, the five URLs, the mechanism-versus-efficacy limits, the fixed CourtWork commit, and the benchmark status. Keep vendor numbers and case-study details there. Use existing V-01, V-05, V-07, V-09, V-10, V-16, V-18, V-19, V-20, and V-21/V-22 rather than adding duplicate validation queues; add a focused hot-plug item only if the actual implementation introduces a distinct unrepresented boundary.
3. **CourtWork:** retain `PAPER.md`'s SE 9.3 / `f8ecb091895559389bb4e75f3c6f28052b71c5a3` binding. Do not write 9.6 into the binding until decisions and executed evidence exist. The current validation document should remain marked as design/pre-registration until the benchmark is actually run.
4. **Implementation:** the attached PR-0 through PR-8 list remains planning material. Any later engineering work must be carried out in CourtWork Fresh, with its own fixed commit and evidence, then fed back as a minimal Practice Index observation under the repository protocol.
