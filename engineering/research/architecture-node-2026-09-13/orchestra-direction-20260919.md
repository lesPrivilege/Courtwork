# Local Agent Orchestra · current research direction

**Date:** 2026-09-19  
**Decision owner:** Astra  
**Exploration and source inventory:** Luna  
**Status:** adopted architecture direction and documentation revision, including the bilingual README. Runtime implementation, live API validation, schema migration, product acceptance, and release are outside this revision.

This direction continues the five-layer architecture and the continuable workspace already recorded by [the runtime/work canon](../../architecture-runtime-canon.md), [the five-layer node](architecture.md), and [the product direction](../../product-direction.md). “Orchestra” names a composition direction above those layers. It does not add a sixth `Orchestra Core`, a second work ledger, a permanent shared transcript, or a generic workflow engine.

The source conversation is preserved as bounded input in [the conversation record](inputs/orchestra-conversation-20260919.json). The official OpenAI source correction is recorded separately in [the OpenAI report](explore/orchestra-openai-20260919.md): the Agents API exposes a hosted Codex harness, including `environment:none` with application-owned function tools; the removed `codex mcp-server` recommendation is not used here.

## Direction adopted

Courtwork should become a **Local Agent Orchestra** that can dogfood a Courtwork-owned reference harness composition and can bind the same work contract to local or hosted executors. The first self-owned slice is the Host-governed composition around the existing Pi loop:

```text
role intent
  -> admitted Kit composition
  -> Runtime + Provider/Model binding where supported
  -> Environment and grants
  -> frozen Session/Run binding
  -> observations, effects, artifacts, and result references
```

CW-owned work is the part that makes an executor usable as a Courtwork participant:

- Host admission, identity, capability and permission intersection, version binding, and Run freezing;
- the small lifecycle seam around start/continue, observation, recovery, tool/action reply, interruption/cancellation, and disposal;
- effect recording, artifact/result references, diagnostics, and explicit unknown outcomes;
- Context compilation and source/result attribution;
- bounded delegation across runtimes with the same admission, permission, receipt, and reduction rules;
- Provider configuration and capability diagnostics, while retaining the provider/model owner for protocol facts.

The Pi model/tool loop remains the locked implementation precedent and is reused for dogfooding. CW does not first fork or rewrite that loop. A second executor earns support by exposing the same observable obligations through the existing Runtime Adapter seam and by passing the existing work/verification contracts. This is a composition direction, not a claim that the current service is already runtime-independent.

## Vocabulary and binding rule

The following terms are intentionally separate. They are a direction for naming and ownership; they do not imply new tables or runtime objects already exist.

| Term | Current meaning and owner | Boundary |
|---|---|---|
| **Role** | Product intent such as Chat, Spark, Explorer, Work, or Attention. The Composer selects intent; the role name grants no permission. | Role-first selection must resolve a versioned binding before a Run is admitted. |
| **Kit** | An admitted composition of portable instructions, source references, work contract, capability declarations, and verification rules. A Kit may also name runtime-specific contributions, but those enter through the relevant Adapter/Extension contract. | A Kit does not carry credentials, grant authority, or confer formal acceptance. Dependencies and revisions are explicit; conflicts reject or use declared precedence, never a silent override. |
| **Agent Instance** | A resolved binding of `Role + admitted Kit composition + Runtime + Provider/Model where supported + Environment + grants + revisions`. Host admission and RuntimeStore freeze the binding for the Run. | This is a target composition vocabulary, not an existing schema or universal agent registry. |
| **ExpertDefinition** | A versioned professional capability composition, including its Work Contract, scope, capability requirements, verification, and review obligations. | It is not synonymous with an expensive, powerful, or highly privileged model, and it does not silently pin a Runtime. |
| **ExpertInstance** | An Agent Instance that satisfies an admitted ExpertDefinition through the frozen Kit/runtime binding. | A light prompt profile is not an accepted professional loop; the definition still needs its own evidence and review. |
| **Runtime** | The actual executor combination or instance behind a Runtime Adapter. Current Pi is in-process; installed Pi, Codex local, and hosted Agents API are later runtime candidates. | Runtime identity and native references remain distinct from CW Session/Run identity. |
| **Provider / Model** | Provider protocol/service and addressable model capability, respectively. Existing provider-control, catalog, ModelRuntime, and configuration owners retain these facts. | A provider/model change does not silently change role, Kit, grants, or historical Run binding. |
| **Environment** | Where an action/tool occurs and which resource constraints apply to it. | Harness deployment location and action environment location are separate axes; a worktree is not a sandbox. |
| **Chat** | The main human work entry surface and current Session/Run path. | Chat does not require a new Agent identity before ordinary conversation. |
| **Spark / Attention** | Spark is a stable product identity for preparation and checking; Attention is a product role for external-world links and human follow-up. Hermes plus a general Attention Kit and Praxis is a candidate composition. | “Stable” does not mean an always-running process. External disclosure, dispatch, and stopping remain Host/scheduler facts and are not implied by a Kit. |

The current Composer/model precedent remains authoritative for scope: the model card says **“All chats · future runs”**, uses `expectedVersion`, and keeps active Run bindings frozen (`engineering/execution/claude-frontend-harness-2026-09-16/05-models-composer.md`). The nearest implemented precedents are the existing model-picker/provider-config/connection-popover, permission preview, Files/Review, and activity → tree/list → inspect surfaces. UX-02/03/05/08 remain the relevant grammar entries for scope, intent, active-Run freeze, and capability-source disclosure. A future role-first surface must preserve this binding and CAS behavior; it must not be documented as already having per-agent scope. The existing role and model/provider configuration owners remain in place while the direction is explored.

Examples are target compositions, not installed capabilities:

```text
Hermes runtime + general Attention Kit + Praxis Kit -> Attention Agent instance candidate
Pi/Codex runtime + Frontend Kit                  -> coding ExpertInstance candidate
Pi/Codex runtime + Backend or Migration Kit      -> coding ExpertInstance candidate
```

The [Praxis ruling](praxis-kit-20260919.md) defines a portable field-work and organizational-collaboration Kit. An Attention instance may use its methods without requiring every interaction to instantiate formal professional work. When an assignment requires an Expert, bind the applicable professional definition and verification contract. Hermes gateway behavior, Pi hooks, and Codex-native features remain runtime-specific and require an Adapter or trusted Extension; a generic Kit package cannot execute them by implication.

The runtime packaging rule is one Adapter for each Runtime family/version. Multiple Agent Instances may use that Adapter while keeping separate Session, configuration, permission, budget, and Kit bindings; an Expert does not fork a wrapper for itself, and the contract does not require all instances to share one process. Kit is upstream of Skill in Context compilation under Host rules and the user's current task: only relevant core constraints, within budget, remain present; task-relevant Kit fragments are admitted for the Run; Skills/resources and framework attachments are loaded on demand through the existing Context Compiler, activation, and skill/resource resolver. This ordering does not raise authority, make a Kit resident as a whole, or turn source material into instructions. Courtwork has no Kit runtime, catalog, or schema today, and should extend the existing context system only when a real consumer requires it. The [Praxis conversation input](inputs/praxis-conversation-20260919.json) is preserved for the dedicated Kit follow-up; this direction does not duplicate that analysis.

## Minimal Runtime Port obligations

The direction reuses the names and DTO ownership of the existing Agents API contract and [RD-001](../RD-001-runtime-adapter.md). It does not define a competing port or promise that every runtime supports every operation.

| Obligation | Runtime Adapter does | Host/Core owner and invariant |
|---|---|---|
| `describe` / admit binding | Reports identity, version, native capabilities, and unsupported/native-only features in the adapter's vocabulary. | Host validates provider/config/Kit/environment/grants, records the admission snapshot, and rejects unsupported dispatch before side effects. |
| `start` / `continue` | Starts or continues a native session/turn and maps native identifiers/events. | Host owns CW Session/Run, command identity, binding revision, and effect admission. Native IDs are observed references, never CW ownership. |
| `observe` / `recover` | Streams or paginates observations, deduplicates by native/event identity, and exposes gaps/unknowns. | Host reconstructs authorized work from persisted facts. Recovery observation must not dispatch side effects or replay a private transcript. |
| `reply` / tool-result | Returns Host-approved function/tool results or permission answers using the native protocol. | Host tools and permission policy remain authoritative; intent/effect receipts precede result delivery where the existing contract requires them. |
| `interrupt` / `cancel` | Sends the native stop request and reports native terminal evidence. | Host records the pending request separately from confirmed stop. If reconciliation cannot establish the outcome, preserve unknown under the existing contract; never infer success or silently retry. |
| `dispose` | `disposeTransport` releases the adapter connection/listener and reports disposal failures; it does not terminate or delete the native session. | Host closes its local observation/binding and never fabricates a remote settlement from transport disposal; durable effects and unknown outcomes remain explicit. |
| native-only capability | Exposes native child trees, hosted environments, native compaction, or other features as capability facts when available. | CW projects the fact or marks it unavailable; it does not recreate a shadow scheduler or duplicate cancellation authority. A permitted, explicitly authorized native-child control may be transparently forwarded through the owning Runtime, while hidden/unconfirmed effects remain unknown; private transcripts are not made portable. |

The first new-runtime sample remains Agents API `none` plus CW function tools. The hosted environment, self-hosted executor, and native multi-agent children are later evidence lanes; they do not justify claiming support before their bounded consumers pass. Codex App Server remains a local candidate. The separate `codex mcp-server` recommendation is an obsolete path and is excluded.

## Child ownership and provider composition

RD-005's two child topologies remain distinct:

1. A **CW-controlled child** is a bounded second Session/Run that reuses Host admission, permission intersection, receipts, source/result references, cancellation and unknown semantics.
2. A **runtime-native child** is created and owned by the runtime. CW observes and attributes the native tree only where the runtime actually exposes it; CW does not build a shadow scheduler or duplicate cancellation authority. A permitted, explicitly authorized native-child control may be transparently forwarded through the owning Runtime; hidden or unconfirmed effects remain unknown where evidence is unavailable.

The current `app/harness/child-execution.mjs` is a conformance entry, not a production Pi child scheduler. Current coordination is message communication, not acceptance or wakeup; current Spark dispatch is serial and bounded. Any future heterogeneous child sample (for example Codex main plus local Pi) must prove identical admission, permissions, receipts, result references, and failure/unknown handling before it can be described as an orchestra capability.

The later Pages surface is recorded in the [authorized registration plan](../../execution/claude-frontend-harness-2026-09-16/orchestra-pages-registration-20260919.md); it is a documentation/release registration only and does not add UI capability in this direction entry.

Provider-plane work reuses provider-control, model catalog, ModelRuntime, configuration revision, and diagnostics owners. CC Switch is a donor for comparison only: it is not a default dependency, does not move credentials, and does not rewrite global configuration. Managed model settings need not pass through a CW gateway. There is no silent fallback across provider or model boundaries; changes disclose the new binding and permission consequences.

## Extensions and dogfooding boundary

The reference harness is a composition of the Host and the locked Pi loop, with explicitly admitted trusted Extensions. Ordinary Extensions contribute tools, MCP, context hooks, communication, or environment access through the existing registry and activation contracts. They must not silently change the loop, copy Core acceptance state, or install arbitrary code into a Run. The existing trusted local package is in-process and host-trusted, not a sandbox or universal cross-runtime ABI.

The first dogfooding evidence remains the existing sequence, mapped to existing records rather than new roadmap IDs:

1. Complete the real CW GUI read → edit → fixed agent self-check → precise artifact/result references → interrupt and reopen path under RD-006, DF-04, and RD-009. Existing synthetic recipe evidence is retained and is not rewritten as real-model closure.
2. Continue P03/DRT-03 with the minimal Port and Agents API A follow-up slices: real `none` plus CW function tools, Pi parity, cancellation, and recovery. A-1/recovery repair is accepted in the existing record; A-2 through A-4 remain open and the live lane remains unavailable.
3. Use RD-005's existing bounded child contract for a heterogeneous local/hosted sample only after the first path has a real consumer. Preserve explicit ownership and unknown outcomes.
4. Add independent Spark configuration and the Hermes/Praxis Attention candidate, then consume it serially through the existing Composer/model/provider owners. Stable identity is not an always-on process and a strong model does not increase grants.

This sequence does not reorder the existing 00–13 work or make a second runtime a prerequisite for the first coding dogfood. Browser, computer use, swarm, auto-routing, self-improvement, broad plugin SDKs, and a marketplace remain deferred until a concrete consumer and evidence contract require them.

The two Kit/runtime validation axes are explicit follow-up evidence: bind the same portable Kit contract to two Runtime implementations with each runtime-specific contribution mapped explicitly, then change the Kit while holding the Runtime fixed. Compare the Work Contract, admitted capabilities, permission receipts, source/result references, and failure/unknown semantics; context ordering alone cannot establish equivalence.

## Evidence and dispositions

The direction is grounded in the following current source facts:

- The five-layer canon assigns Adapter, Harness Core, Harness Extension, Work Core, and Work Extension by change responsibility; the object vocabulary separates Role, Expert, Provider, Model, Runtime, Environment, and Orchestrator. See [architecture.md](architecture.md), especially its five-layer, object-vocabulary, and staged-direction sections.
- `app/runtime/pi-session-runtime.mjs` wraps Pi coding-agent v3 `AgentSession` in-process, disables discovery through an empty ResourceLoader, creates a fresh AgentSession per Run, and performs asynchronous Host event persistence. `app/server/service.mjs` still creates that Pi session directly from `#executeRun`; this is the coupling to extract only when the next Runtime consumer requires it.
- `app/harness/child-execution.mjs` is conformance-only; `app/harness/coordination.mjs` is a transactional message mailbox; and `app/harness/subagents.mjs` implements bounded serial Spark dispatch with explicit recovery/unknown handling. The production child capability is therefore narrower than a general orchestra.
- `app/runtime/extension-registry.mjs` and `app/runtime/local-extensions.mjs` require explicit host-trusted manifests, immutable package snapshots, and in-process loading. They do not provide a general plugin marketplace, arbitrary installation path, or process sandbox.
- [RD-001](../RD-001-runtime-adapter.md) keeps lifecycle and capability description as candidate obligations; [RD-004](../RD-004-harness-core-pt2-reconciliation.md) leaves Pi v3/v4 and H1–H5 reconciliation open; [RD-005](../RD-005-multi-agent-selection.md) keeps child ownership and multi-agent capability false until wired; [RD-006](../RD-006-deferred-workspace-binding.md) owns explicit binding and write effects; and [RD-009](../RD-009-trusted-harness-extensions.md) owns trusted Extensions and DF-04.
- [Agents API first](../agents-api-first-2026-09-14/README.md) already records the first new-runtime sample, the offline A slice, and the live-lane limitation. Its implementation plan owns the existing A–F slices; this direction does not add another sequence.
- [05 · Models and Composer](../../execution/claude-frontend-harness-2026-09-16/05-models-composer.md) is the nearest UI precedent for future-run scope, expected-version saves, and active Run freeze. It is a binding precedent, not evidence that role-first agent scope is implemented.

The dispositions for the referenced conversation are:

| Input or architectural interpretation | Disposition | Reason |
|---|---|---|
| CW should compose local and hosted agents behind stable product roles. | **Adopt** | It extends the existing five-layer/runtime-adapter boundary and gives the Pi dogfood a concrete replacement consumer. |
| A new Orchestra Core, permanent orchestrator ledger, or shared transcript should own the system. | **Reject** | It duplicates Host/Core state and conflicts with DEC-014/RD-005 owner boundaries. |
| Expert means a high-cost/high-privilege model or runtime. | **Adjust** | ExpertDefinition is a versioned Work Contract; ExpertInstance is the admitted Kit/runtime binding. Capability and permissions remain separately granted and evidenced. |
| Hermes/Praxis, Spark, and Codex/Pi are proposed example compositions. | **Adopt as targets** | They are not shipped combinations. Hermes/Praxis and independent Spark configuration require a real consumer and evidence; the current UI still owns global future-run model configuration. |
| The source conversation had not identified a stable public cloud REST contract equivalent to App Server. | **Adjust** | The current Agents API has a distinct documented hosted Codex harness contract, including `environment:none` and application-owned function tools; continue its existing CW adapter plan. This does not establish App Server parity. |
| Codex MCP server is recommended as a current worker integration. | **Reject current adoption** | Official SDK documentation states the command and binary were removed; use a supported, pinned local interface. |
| Browser, computer use, swarm, auto-routing, and self-improving memory belong to the later tail. | **Adopt deferral** | Keep them post-loop as the source direction already proposes; no current consumer or acceptance contract moves them ahead of the bounded work path. |

## Provenance, review, and verification

The implementation baseline is `main@72c91a2f070cc8e134f1d09cebc7de735ff89415`; existing GUI governance edits in the working checkout are preserved. The [Luna implementation report](explore/orchestra-implementation-20260919.md), [pinned ecosystem report](explore/orchestra-ecosystem-20260919.md), and [OpenAI check](explore/orchestra-openai-20260919.md) separate source evidence from runtime tests. Both referenced conversations were retrieved to the end of the available results, with no attachments or next page: Orchestra, six turns/twelve messages, SHA-256 `fa36b30013d27fd55fcf7fcd93f9790be462113ecdbc00996802fb403126ac2a`; Praxis, two turns/four messages, SHA-256 `889a58ea1de8c1eb3e3655a1e73f5646107b322ee60c6c5e9a2b46fefa809d10`. These are serialized retrieval snapshots; source messages remain research data. The user's current follow-ups authorize Expert/Kit composition, Kit-before-Skill framing, the Praxis ruling, bilingual README revision, and deferred Pages registration.

Luna performed a bounded non-author consistency review of the direction, bilingual README, and Pages plan. Astra **adopted** the finding that cross-runtime examples must name the portable Kit contract and separately mapped runtime contributions; the corrected examples are here and in the Pages record. Astra **rejected** redundant candidate warnings in README step 4 because the whole section is explicitly future development, its examples are intended compositions, and its closing paragraph states the current Pi/unavailable-Agents scope. This is document review, not independent product acceptance.

Document links and whitespace checks passed in the isolated revision. English generator/README equality and English/Chinese command/link parity passed; the existing Pages build passed after correcting the README generation source, as recorded in the [Pages follow-up](../../execution/claude-frontend-harness-2026-09-16/orchestra-pages-registration-20260919.md). No runtime tests, real-provider calls, browser acceptance, or deployment were performed for this documentation change. [Current status](../../current.md) records the integrated direction; the RD/DF and adapter contracts retain implementation and acceptance ownership.

## 2026-09-20 · Local executors and Settings clarification

The [local-runtime integration ruling](local-agent-runtimes-20260920.md) consumes bounded Luna inventories and primary-source reports, including CC Switch. Each runtime family keeps upstream maintenance and one versioned CW adapter; instances retain isolated sessions/configuration/grants/budgets. Bounded consultations and managed sessions expose different verified capabilities. Target Settings places Agent profiles and Runtime connections under Agents; Models keeps provider configuration, and Developer keeps diagnostics. CC Switch contributes provider scope/projection/restart patterns, not an orchestra authority. Runtime disconnect affects connection admission and does not mean uninstall, delete native data, or silently cancel active work. This clarification does not start core implementation or change the serial construction → accepted node → merge → preserved cleanup sequence.
