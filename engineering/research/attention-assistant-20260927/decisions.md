# Astra disposition · 2026-09-27

Scope: four source turns, two screenshots, two Luna reports; baseline `3bd850f2262ee0045196e99c4e2129094ae7a5ab`. This is a research/documentation decision. Current product facts stay with [current](../../current.md); Paper remains separately pinned by [PAPER](../../../PAPER.md). IDs below locate intake claims, not new tickets.

| Input | Disposition | Reason, selected boundary and owner |
|---|---|---|
| A1 · T1/T2 role versus always-on | **Adopt** | Attention role, lifecycle, identity and permissions are separate axes. Always-addressable can use events or periodic activation. [Product direction](../../product-direction.md) and existing Attention contracts own the definition. |
| A2 · T3/T4 Hermes priority | **Adjust/select** | Select Hermes first for the next Attention-specific integration research. This narrows the earlier Agents API-first research ordering for this use case; it does not replace Pi production execution, accept Hermes transport, or cancel the separate Agents API track. Consume existing RD-001/P03 obligations. |
| A3 · events → Attention → obligation → resolution | **Adjust** | CW Core/Host retain domain state, scoped signals, formal human actions and effect receipts. No automatic Matter/obligation creation or closure from native execution/delivery. [Existing closure ruling](../obligation-closure-2026-09-12/README.md) remains authoritative; Spark retains its distinct role. |
| A4 · gateway/inbox/durable pause/notification budget | **Adopt as reference; defer implementation** | Reuse synthetic ingress/recovery tests; live transport, wake, scheduler and outbound effect require bounded contracts. Hermes/Atlas/AEGIS/LangGraph/Temporal mechanisms do not require adopting their stacks. Owners: RD-001/005/007 and existing Attention/notification records. |
| A5 · independent watcher | **Adjust** | Evaluate common-failure behavior, recovery and duplicate-effect prevention. Do not mandate another daemon or failure-isolated deployment without a concrete consumer and evidence. |
| D1 · Map/Grammar/Tools/Gates | **Adopt** | Implement progressive documentation in this packet and pointers in existing entries. [Repository layout](../../../docs/repository-layout.md) places source intake under research; no new top-level authority. |
| D2 · semantic/generated repo maps | **Adopt separation; defer generator** | Semantic owner index is maintained; structural maps are task-scoped, source-pinned navigation. Aider is a mechanism reference, not a mandated dependency or ranking contract. |
| D3 · Skills and path rules | **Adjust** | Agent Skills is potential packaging; OpenHands triggers are client-specific. Preserve Runtime Control policy, resource identity, existing Kit/Profile schema and immutable Run bindings. No executable skill installation or automatic loader claim. |
| D4 · Spec Kit/converge and proposed folders | **Adopt method; reject duplicate layout** | Compare contract and evidence in the original record; no parallel `.cw/`, `specs/`, task ledger or universal plugin SDK. Proposed CLI names are unimplemented examples. “3–5 cases” is guidance, not a gate. |
| S1 · screenshots/product rumor | **Retain as source; exclude from adoption evidence** | Screenshot text and service anecdote do not establish OpenAI architecture, launch timing, product tiers or CW capabilities. Images were inspected but underlying claims were not independently verified. |
| S2 · 122 results / 16 queries / 10 sources / Hermes “60%” | **Do not adopt** | No returned query log or coverage denominator. Recheck identifiable primary mechanisms instead; popularity and alleged consensus cannot justify selection. |

## Corrections to dated exploration and source claims

The raw Luna reports are retained unchanged for provenance. Apply these parent corrections when consuming them:

- Runtime report says attachments were unavailable. Both returned JPEGs were subsequently retrieved and inspected by Astra; only their exact attachment-to-message mapping remains absent from the API.
- Runtime report repeats the September 19 direct-Pi-construction gap. [P03-B](../../execution/claude-frontend-harness-2026-09-16/evidence/p03b-pi-runtime-port-review-20260921/README.md) is already accepted: composition root supplies `createPiRuntimePort`; residual Pi-shaped helpers/options remain. Do not re-open extraction or imply arbitrary-runtime support.
- Runtime report's “no Kit runtime/catalog/schema” is too broad for this baseline. K1/K2, K3 immutable Run binding and K4/K5 preview/editing exist in bounded form; the dogfooding report and [Runtime Control](../../../docs/runtime-control/INDEX.md) distinguish these from missing general catalog/acquisition and alternate-runtime acceptance.
- Old architecture paragraphs are dated snapshots; later accepted owner records supersede their missing-consumer language. The current docs receive a narrow K3 clarification, not a rewritten history.
- Luna's proposed HERMES-A0–A9 are suggested test cases only. Their useful failure modes are summarized under existing owners; this intake does not adopt a new identifier series or execution roadmap.

## Placement and natural discovery

Use `engineering/research/attention-assistant-20260927/` because it holds a dated conversation, external evidence and dispositions. README is the short entry; INDEX routes tasks; two summaries offer optional expansion; this file records Astra's selection; source-index routes exact references; immutable source and exploration copies are last-mile evidence. Existing engineering/research entries and Attention/Runtime contracts link here. Product direction and architecture carry only adopted boundaries, not a copy of the research archive.

Next implementation must record affected responsibility, owner, nearest precedent and checks in its original assignment before edits. This intake itself changes documentation only. No new schema, dependency, runtime, schedule, external communication or product acceptance is authorized by a quoted source.
