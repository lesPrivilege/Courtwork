# Luna source report · Orchestra implementation baseline

**Inspection target:** Courtwork `main@72c91a2f070cc8e134f1d09cebc7de735ff89415`  
**Inspection date:** 2026-09-19  
**Mode:** read-only source and ledger inspection. This report is evidence for the [Astra direction](../orchestra-direction-20260919.md), not an implementation acceptance.

## Current architecture facts

1. The current canon is five layers: Adapter, Harness Core, Harness Extension, Work Core, and Work Extension. The five-layer node's object vocabulary separates Role, Expert, Provider, Model, Runtime, Environment, and Orchestrator; Chat, Spark, Attention, and Experts are product roles/surfaces rather than four mandatory agents or stores. See `architecture.md` sections **Five layers**, **Object vocabulary**, **Current loop**, and **Staged direction** (especially `architecture.md:15-25`, `:31-42`, `:50-58`, `:71-91`).
2. The staged direction keeps Pi + DeepSeek as the fixed dogfood composition, then introduces a minimal Runtime Port only when a second runtime is a real consumer. The replacement report explicitly says the Codex adapter is not implemented and recommends extracting a bounded lifecycle port instead of building a full SDK (`runtime-replacement.md:3-17`, `:23-42`).
3. The current `architecture.md` data map assigns Host runtime JSON, sessions, and run events to Host/RuntimeStore; Core user schema and bridge schema remain separate. The file had a stale `Host schema 15` reference beside the schema-18 opening statement; the synchronized architecture pointer corrects that reference to schema 18 without changing historical reports.

## Harness Core and Extension baseline

| Area | Source evidence | What it means for the direction |
|---|---|---|
| Pi loop | `app/runtime/pi-session-runtime.mjs:14-17` states that Host wraps Pi coding-agent v3 `AgentSession` in process and supplies tools/events/settlement; no persistence, Core patch, extension binding, default coding tools, or resource discovery lives there. | Reuse the loop for the reference harness. CW-owned admission, effects, recovery, and receipts wrap it. |
| Context/resources | `app/runtime/pi-session-runtime.mjs:132-152` returns an empty ResourceLoader for extensions, skills, prompts, themes, and `AGENTS.md`; `:459-506` creates a fresh AgentSession per Run against a caller-owned SessionManager. | Pi is not the original coding CLI surface. Kit/Skill ordering must use CW Context Compiler and activation/resource owners rather than assuming Pi discovery. |
| Event durability | `app/runtime/pi-session-runtime.mjs:508-573` keeps cancellation sticky at the provider seam and tracks asynchronous Host event projections before completion. | A replacement runtime must preserve event ordering, cancellation evidence, and settlement barriers. |
| Service seam | `app/server/service.mjs:204-249` composes RuntimeStore, Coordination, Subagents, extensions, WorkCore, control plane, MCP, ArtifactHistory, Intake, and ModelRuntime. `:2470-2603` validates the Run and snapshots binding; `:2624-2841` builds Host tools and calls Pi `createSessionRun`. | The service still directly owns the Pi call. Extract only the minimal Port when the next runtime consumer exposes the coupling. |
| Trusted extensions | `app/runtime/extension-registry.mjs:10-80` validates strict manifests and `se_` tools; `:92-165` persists lifecycle/generation and does not auto-revive invalidated code; `:255-360` binds a loaded extension to a Run. `app/runtime/local-extensions.mjs:14-147` snapshots immutable host-trusted packages and loads them in process. | Extension work is explicit and trusted. It is not a marketplace, arbitrary installer, sandbox, or universal cross-runtime ABI. |
| Current foundation | `app/docs/runtime-foundation.md:1-31` describes one constrained agent per active Session, permission questions, persistence/content versions, cancellation and native compaction; no shell/browser/fork/child/scheduler by default. `:49-77` keeps Host admission/events separate from Pi's journal and loop. | Ordinary extension increments can proceed without a new orchestration service; orchestration stays above the existing owners. |

## Current coordination and child capability

- `app/harness/child-execution.mjs:3-4` is a conformance entry, explicitly says production Pi child scheduling is not installed, and `:5-63` only provides narrow grant intersection, finding reduction, cooperative abort, timeout→unknown, and no persistence/restart replay.
- `app/harness/coordination.mjs:17-18` uses one RuntimeStore transaction for the thread mailbox. `:22-33` reports communication capabilities (`message:true`, `explore:false`, `handoff:false`, `workflow:false`); `:35-121` keeps create/attach/close/enqueue/deliver/recover/mailbox explicit and states that messages are not acceptance.
- `app/harness/subagents.mjs:11-25` exposes Spark as bounded RuntimeStore state with `explore:true`, `parallel:false`, and `handoff:false`. `:44-68` freezes source references and scope; `:112-164` requires explicit parent resume and serializes dispatch; `:165-222` settles only after a completed child Run and resolved source reads, with explicit cancel/reconcile/retry/archive and restart→unknown.
- `app/docs/spark-agent.md:1-71` confirms no parent history, MCP, shell, network, recursive delegation, real coding, or G1–G5 acceptance. `app/docs/attention-agent.md:1-43` gives Attention one global product role and says it is not a second loop, generalized memory, connector scheduler, or Expert delegation surface.

These facts support two separate child ownership paths: a CW-controlled second Session/Run, or a runtime-native child tree that CW can only project where the runtime exposes facts. There is no evidence for a CW shadow scheduler or double cancellation authority.

## Role, provider, model, Kit, and UI ownership

- The canonical `architecture.md` object vocabulary and `product-direction.md` role section keep product role, Agent identity, Provider, Model, and permission separate. `architecture.md:25` defines Expert as a versioned professional capability combination and Runtime as an actual execution combination; the direction document further distinguishes ExpertDefinition from the resolved ExpertInstance.
- Provider/model facts remain with provider-control, the provider catalog, ModelRuntime, and Host configuration. `app/docs/runtime-foundation.md:84-87` states that installed provider/model definitions do not grant exposure or execution.
- No Kit domain object, Kit runtime, Kit catalog, or Kit schema exists in the current core. Current mechanisms are runtime profiles, trusted Extensions, explicit instructions/resources, Context Compiler, activation, and the skill/resource resolver. A Kit therefore needs to remain a target composition concept until a real consumer requires a bounded contract.
- `engineering/execution/claude-frontend-harness-2026-09-16/05-models-composer.md:6-19` is the nearest UI precedent: the model/effort card saves **all chats, future runs**, uses `expectedVersion`, keeps active Run binding frozen, and has no real-provider evidence or non-author review. It must not be retold as existing per-agent scope.
- Hermes/Praxis, Pi/Codex coding Kits, stable Spark, and role-first Composer selection are target combinations. The current UI and Host configuration owner still govern global future-run provider/model settings; a role selection must resolve and freeze a binding before Run admission.

## Agents API and Runtime Port facts

- `engineering/research/agents-api-first-2026-09-14/README.md:3-7` already registers Agents API as the first new Runtime sample: `none` plus CW function tools, native Session/turn/call mapping, effect settlement, cancellation/recovery, and one GUI. It explicitly leaves Pi in place and does not claim a live lane.
- `implementation-plan-20260916.md:24-38` says the sample must replace the executor without moving Work/Core ownership, keep Host tools/permission independent of the Pi loop, and reuse GUI semantics. `:61-101` lists the bounded Port responsibilities and says to extract SessionManager/createSessionRun dependencies only as the real seam appears. `:223-236` maps existing A–F slices; `:273-279` defers hosted environment, tool-search/programmatic calls, and subagents until a consumer exists.
- `adapter-protocol-20260915.md:7-16` fixes the offline DTO/identity/event/recovery semantics. `:44-50` says `environment:none` is protocol-mapped but still unavailable, while self-hosted/openai-hosted lanes are unsupported. `:73-96` accepts A-1 recovery repair in `53ab038`, leaves A-2/A-3/A-4 deferred, and keeps the live lane unavailable.
- Official local evidence under `agents-api-first-2026-09-14/evidence/docs-20260915/` records the hosted Codex harness, `environment:none`, application-owned function tools, hosted environments, and native multi-agent delegation. It corrects the source conversation's earlier lack of a stable public cloud REST contract equivalent to App Server; it does not prove account access, SDK runtime, service/UI wiring, or a CW release lane.

## Minimum bounded staging

The lowest-risk implementation sequence is already present in the existing records:

1. RD-006 + DF-04 + RD-009: make the CW GUI read→edit→fixed self-check→precise output/reference→interrupt/reopen path real. Keep existing synthetic recipe evidence as synthetic; do not rewrite it as a real-model result.
2. P03/DRT-03 and the Agents API A follow-ups: extract the minimal lifecycle Port, run the real `none`/function-tool probe only with bounded credentials and budget, then compare Pi parity, cancellation, and recovery. Keep unavailable capabilities unavailable.
3. RD-005: prove one bounded heterogeneous child with the same admission, permissions, receipts, result references, and unknown semantics. A Codex main runtime plus local Pi is a candidate example, not an existing capability.
4. Spark independent configuration plus Hermes/Praxis Attention composition, consumed serially through the existing Composer/provider owners. Stable Spark identity is not an always-running process; a stronger model does not widen grants.

No second runtime is required before the first coding dogfood, and no new 00–13 roadmap lane follows from this report. Browser, computer use, swarm, auto-routing, self-improving memory, and a general Kit SDK remain deferred.

## Source limits

This report is based on local source, current ledgers, and the fixed official evidence already attached to the repository. It did not run a paid provider, use credentials, modify product code, alter schemas, or claim non-author acceptance. All observed gaps remain gaps until their existing owner records a bounded implementation and independent evidence.
