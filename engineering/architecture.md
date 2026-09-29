# Architecture: layers, responsibilities and module boundaries

This page states the current architecture: the layers, who owns which facts and actions, how the code is divided, and the rules a change must respect. Status and open work are in [current](current.md); technical candidates in [options](options.md); the long-term design in the [Long-life Roadmap](roadmap.md); named decisions in [decisions](decisions.md) and the research rulings linked below. When a ruling changes something stated here, this page is revised to stand alone; it does not accumulate dated addenda. The pre-2026-09-29 layered text is in Git history (`ffe68fb`).

## Five layers

The [five-layer ruling](research/architecture-node-2026-09-13/architecture.md) (2026-09-13) defines the responsibilities; [Runtime and Work](architecture-runtime-canon.md) keeps the vocabulary and its history.

| Layer | Responsibility | Not its job |
|---|---|---|
| Adapter | Translate faithfully between external protocols and internal contracts. Provider Adapters cover model access; Runtime Adapters cover an execution runtime. | Deciding what counts as accepted work |
| Harness Core | Run a bounded, admitted input: the turn/tool loop, events, termination and recovery protocol. Reuses the locked Pi loop. | Re-implementing a model loop |
| Harness Extension | Tools, MCP, context contributions, communication/child tasks and execution environments inside an admitted composition. | Granting itself permissions |
| Work Core | Lawful queries and state transitions over Matters, sources, versions, candidates, decisions and obligations. | Importing Pi, provider or UI code; trusting model self-assessment |
| Work Extension | Local professional structure: Work Contract, candidate validation, presentation needs and checks, proposed to the Core. | Granting itself formal write authority |

These are logical responsibilities, not services. The [module map](#module-map) navigates the implementation; a layer name does not imply a service of that name exists.

The current direction, Local Agent Orchestra ([ruling](research/architecture-node-2026-09-13/orchestra-direction-20260919.md), 2026-09-19), continues these five layers and the continuable workspace. It adds no sixth layer, second ledger or generic workflow engine. Role, Kit, Agent Instance, ExpertDefinition/Instance, Runtime, Provider, Model and Environment stay separate terms; naming one does not imply a catalog or schema for it.

## Authority

- **Host** owns Session and Run identity, admission, captured execution identity, tools and permissions, effects, credentials, disclosure and recovery arbitration.
- **Work Core** owns formal work state — Matters, candidates, sources, decisions, obligations and Attention state — and the human formal actions on them.
- **Runtimes** own execution. Native runtime persistence (journals, native session history) is execution evidence, not formal state.
- **UI** reads projections and submits actions through the Host; its drafts and overlays are disposable.

Execution, domain validation and formal acceptance each stay with their owner. Tool approval, a completed Run, a passing check or a successful domain validation never substitutes for a person accepting a result. Notification delivery and Run completion do not resolve Attention. No gateway, watcher, Skill or package receives these authorities by being installed ([Attention ruling](research/attention-assistant-20260927/decisions.md), 2026-09-27).

## Runtime Port

The minimum Runtime Port reuses the [RD-001](research/RD-001-runtime-adapter.md) / Agents API contract: `describe/admit`, `start/continue`, `observe/recover`, `reply/tool-result`, `interrupt/cancel`, `dispose`. Host Run references and native references stay separate. A cancellation request is not a confirmed termination, and an unresolved outcome keeps unknown semantics rather than being reported as success or cancellation. Local and hosted runtimes meet the same minimum lifecycle obligations.

The implemented seam is Pi's ([P03-B acceptance](execution/claude-frontend-harness-2026-09-16/evidence/p03b-pi-runtime-port-review-20260921/README.md)): [`server/runtime.mjs`](../app/server/runtime.mjs) constructs `createPiRuntimePort` and passes it to `RuntimeService`. The port owns native journal open/create/history, execution and steering, compaction and Pi-event translation; the Host keeps the authorities listed above. `service.mjs` no longer uses Pi's `SessionManager`, but it still depends on Pi-shaped model/provider helpers (`ModelRuntime` calls), Pi-shaped options and outcomes, Pi session locators and a duck-typed remote-port branch. Replacing the runtime therefore still needs that coupling removed first; it is not a one-adapter change today.

Which executors production startup actually wires is recorded in [current](current.md#baseline) and owned by [supported preview](../app/docs/supported-preview.md).

## Kits and profiles

- [`planKitContext`](../app/runtime/kit-context.mjs) is a pure Harness contribution over existing Runtime Control bindings and source identities. It verifies and attributes already-admitted content; it does not admit resources, grant permissions or own profile or Run persistence. Without a Kit, the existing context compiler is unchanged ([K1/K2](execution/claude-frontend-harness-2026-09-16/evidence/kit-final-20260922/README.md)).
- Run admission freezes Kit context: each Run owns immutable Kit plan and context payloads through ArtifactHistory ([K3 contract](execution/claude-frontend-harness-2026-09-16/kit-run-binding-20260922.md), [acceptance](execution/claude-frontend-harness-2026-09-16/evidence/kit-run-final-20260923/README.md)). Kit admission is verified on in-process Pi only.
- A draft preview overlays the selected imported profile's source in memory through Runtime Control validation and resolution; it never persists or grants authority. Saving uses whole-config CAS ([K4](execution/claude-frontend-harness-2026-09-16/evidence/kit-profile-preview-final-20260923/README.md)). The selected-profile editor consumes these owners without adding persistence or permission authority ([K5](execution/claude-frontend-harness-2026-09-16/evidence/kit-profile-editor-final-20260924/README.md)).
- Structured Kit creation and acquisition, a general catalog, and alternate-runtime Kit compatibility do not exist yet.

## Preview and browser surfaces

Three concerns stay separate ([ruling](research/architecture-node-2026-09-13/browser-preview-ruling-20260921.md), 2026-09-21): real artifact/dev-target Preview, a human-visible Browser projection, and Host-governed browser control. Browser resources are not automatically Matter state, and closing or hiding a view is neither execution cancellation nor profile deletion. Playwright-controlled isolated Chromium is the first candidate for later browser control; nothing is adopted until a contract does so.

## Settings and configuration

Settings present one consistent set of relationships — Agent, Kit, Runtime, Provider, Model — while the five layers stay internal ([ruling](research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md#comprehension-presentation-and-document-ownership)). Settings → Agents holds Agent profiles and Runtimes; Models owns provider configuration; Developer owns diagnostics. Removing a connection, uninstalling a native runtime and cancelling an active Run are separate operations. Credentials are Host-held secret references in a protected local file, with RD-009 hook governance; secure storage and process isolation are targets, not current claims. Pi is the public and development name of the upstream runtime; underlying IDs are kept.

## Module map

Each row names the code that writes or executes, and the contract that describes it.

| Code | Responsibility | Contract |
|---|---|---|
| [`app/web/`](../app/web/) | Browser presentation of Chat, files, Review, Settings and runtime resources | [Interface components](../docs/interface-components.md) |
| [`server/runtime.mjs`](../app/server/runtime.mjs), [`service.mjs`](../app/server/service.mjs), [`store.mjs`](../app/server/store.mjs) | Host lifecycle, Session/Run, permissions, context, authenticated human actions and queries; RuntimeStore | [HTTP API](../app/docs/api-v6.md) |
| [`runtime/pi-runtime-port.mjs`](../app/runtime/pi-runtime-port.mjs), [`pi-session-runtime.mjs`](../app/runtime/pi-session-runtime.mjs) | Pi execution port; native session loop and ModelRuntime integration | [Runtime foundation](../app/docs/runtime-foundation.md) |
| [`runtime/local-pi-process.mjs`](../app/runtime/local-pi-process.mjs), [`local-pi-host.mjs`](../app/runtime/local-pi-host.mjs) | Opt-in offline Spark process consumer; Host and Store keep child admission, typed Run receipts and unknown fences | [Tool-less consultation](../app/docs/spark-agent.md#local-pi-process-consultation) |
| [`runtime/control-plane.mjs`](../app/runtime/control-plane.mjs), [`mcp-manager.mjs`](../app/runtime/mcp-manager.mjs), [`kit-context.mjs`](../app/runtime/kit-context.mjs), [`kit-run-context.mjs`](../app/runtime/kit-run-context.mjs) | Declarative resources, scopes, call policy, MCP lifecycle, Kit planning and Run binding | [Runtime Control](../docs/runtime-control/INDEX.md) |
| [`runtime/repository-candidate.mjs`](../app/runtime/repository-candidate.mjs), [`repository-fs.mjs`](../app/runtime/repository-fs.mjs), [`check-runner.mjs`](../app/runtime/check-runner.mjs), [`check-recipes.mjs`](../app/runtime/check-recipes.mjs) | Session repository binding, private candidates, approved writes and fixed check recipes | [Repository binding](../app/docs/repository-binding.md), [check recipes](../app/docs/check-recipes.md) |
| [`harness/`](../app/harness/) | Thread membership, local communication, bounded child execution; not a second model loop | [Thread / messaging](../app/docs/coordination.md) |
| [`server/async-tasks.mjs`](../app/server/async-tasks.mjs) | Optional immutable asynchronous read tasks: cancel, recover, consume | [Async reads](../app/docs/async-tasks.md) |
| [`core/owner.mjs`](../app/core/owner.mjs), [`client.mjs`](../app/core/client.mjs), [`bridge.py`](../app/core/bridge.py), [`core.py`](../app/core/core.py), [`attention.py`](../app/core/attention.py), [`governance.py`](../app/core/governance.py) | One Work Core and SQLite transaction: Matters, candidates, sources, decisions, file candidates, Attention, governed disclosure | [Work Core](../docs/work-core/contract.md) |
| [`extensions/work-adapter.mjs`](../app/extensions/work-adapter.mjs), [`domains/`](../app/domains/) | Domain input, proposal validation, binding and presentation; NDA and Evidence Memo share the Core | [NDA](../docs/work-core/nda.md) |
| [`web/markdown-source.mjs`](../app/web/markdown-source.mjs), [`markdown-reader.mjs`](../app/web/markdown-reader.mjs) | Fixed-version Markdown sources, paging and read-only reading; Output Review owns all output scopes | [Output review](../docs/output-review.md) |
| [`runtime/source-resolver.mjs`](../app/runtime/source-resolver.mjs) | Declarative source resolution; the Host provides the authenticated inspect route | [Source resolver](../docs/runtime-control/source-resolver.md) |

Governed directory reads ([Work Core governance](../docs/work-core/governance.md)) query domain objects through the existing Core owner. The directory stores no second state; its persistent records are only Matter disclosure policy, events and request receipts. Its runtime tools are injected only in global Attention; the Host captures the execution identity on each call and the Core checks object scope and current disclosure on each call.

## Data ownership

Host runtime JSON, session journals, ArtifactHistory and Core data live under one explicitly selected data directory. Host RuntimeStore, Core user schema and bridge app schema evolve independently; the current numbers and the migration rules are owned by [Runtime data and migration](../app/README.md#store-schema). The Core keeps `extensions/evidence-memo/state.db`, created through the single `WorkCoreOwner` client; NDA does not create another database.

RuntimeStore records each Session's executor choice and each Run's actual port identity; the first new Run in a migrated Session pins its factory reference atomically. A Chat can choose an eligible executor only before it has any Run or native history. Profile source uses existing Runtime Control CAS. Run events and accepted results each have their own persistent owner; neither the runtime log nor the GUI can become a second source of accepted results.

## Minimum delivery

One person works on one Matter: reads material, has an Agent propose a result, checks evidence and differences, accepts or rejects the candidate, and continues after restarting or replacing the Session. The first loop needs one Artifact type, one reviewer, one formal accept transition, one active version pointer, open obligations and the next context. Multi-user, marketplace, automated training, multi-agent scheduling, cross-device sync and irreversible outbound actions come later. A single person still separates propose from approve; one researcher's smooth use does not show that professional capability can be distributed.

```text
Human Work Surface ── Work API ── Semantic Core ── Matter Repository
                           │            │
                           │       Context / Run Plan
                           │            │
                           └──── Host Adapter ── Generic Agent Runtime
                                                    │
                                              Model / Tools
```

This is a logical responsibility diagram, not a microservice plan.

## Engineering units

| ID | Unit | Input → output | Failure responsibility | Stance |
|---|---|---|---|---|
| M01 | Provider and model execution | request, model config → stream, usage, errors | Host handles protocol; Adapter preserves unknown usage, timeouts and model identity | Reuse |
| M02 | Loop and Run control | frozen Run Plan → run events, terminal outcome | Runtime executes; Adapter distinguishes queued, steer, cancel, failure and uncertain outcomes | Reuse; no loop rewrite |
| M03 | Tools and execution environment | scoped capability → tool result | Arguments, budget, paths, network and subprocesses constrained at the execution boundary | Restricted tools first; sandbox verified separately |
| M04 | Session, events and adaptation | host session/events → standard Run observation | Isolate host API, event order, reconnect, recovery and version differences | Thin adapter |
| M05 | Semantic Core | candidate + decision + current version → lawful transition or refusal | Owns work semantics, authority, completion and transition rules | Designed precisely |
| M06 | Matter repository | commit transaction → state, events, active refs | Single writer, atomicity, idempotency, migration, backup and recovery | Mature storage + own contract |
| M07 | Artifacts and evidence | raw sources, candidate content → immutable versions, anchors, support relations | Versions never mixed; parsing and format fidelity verified separately | Mature parsers + own source semantics |
| M08 | Registry and activation | manifest, Matter, role, stage → frozen profile | Version, scope, dependency and permission checks; unknown capability refused | Static presets first |
| M09 | Context compiler | effective state, obligations, sources → context projection | Record selection, omission and versions; indexes and summaries cannot restore expired validity | Deterministic assembly first |
| M10 | Work API and review | human intent → typed decision / query | Verify actor and scope; tool approval and result acceptance separate | Small own interface |
| M11 | GUI and projections | state + candidate + evidence → a surface a person can judge | Disconnects, stale versions, pending items and failures visible; local cache disposable | Reuse components and patterns |
| M12 | Trace and offline eval | runs, versions, checks → traceable evidence and comparison | Never infer acceptance from model self-report; separate mock, real chain and user effect | Files first, eval infrastructure later |
| M13 | Host and distribution | config, credentials, processes → an app that starts and upgrades | Credentials never reach the browser or logs; packaging, signing and platform permissions verified separately | Local Web first |
| M14 | Dependency and compatibility | upstream change → impact analysis, adaptation or rollback | Locked versions, license scope, migration evidence, upstream feedback | Manual maintenance first |

## Dependency boundaries

The Core does not import host packages, GUI components or provider names. An Adapter may depend on a host interface but cannot define acceptance criteria. A renderer interprets a Work Contract's presentation declaration; it does not execute model-generated scripts. An Extension may propose transitions and review dimensions but cannot grant itself formal write authority. This holds for what an extension exposes to models and for its domain proposals. It is not enforced against the extension's own code: host-trusted extensions run in-process with the Host's rights and currently receive the Core client itself, so they are inside the trust boundary and are trusted not to decide on a person's behalf ([2026-09-29 review](reviews/doc-driven-code-review-2026-09-29/README.md), D7).

Completion is split deliberately. The Core refuses an accept while a pre-existing blocking obligation is open; obligations proposed inside a candidate become open obligations when it is accepted, and block the next accept. Whether unresolved findings may be accepted at all is a domain rule enforced by the Work Extension (for NDA, its adapter refuses them).

Models get material reads and candidate submission; human acceptance goes through the Work API. If arbitrary shell or code execution is opened to a model, keeping the database in another directory is not a boundary: it must be shown that the execution identity cannot reach formal write capability or credentials. Until that is shown, only trusted, restricted tools run.

## Two replacement axes

Replacing the runtime targets M04 and the run configuration; the remaining Pi coupling described under [Runtime Port](#runtime-port) must go first. Replacing storage changes only M06 and must show that versions, events and recovery keep their semantics. Changing the GUI does not change what a decision means; changing the model does not change what completion means. A second implementation verifies only the part it actually replaces; one adapter test does not show the whole system is portable.

## Change boundaries

Before changing product code, record in the task contract the responsibility being changed, the fact owner, the nearest implemented precedent, and why any cross-layer change is needed. Ordinary provider, execution-capability or domain increments follow their existing contract. Review checks whether a change copies authoritative state, lets domain differences leak into the main loop, or adds another UI semantics. A cross-layer change names the real seam and its invariant; directory counts are not evidence of decoupling.

Architecture debt is recorded in the owning contract with the concrete coupling, the consumer that would trigger paying it, and the minimum exit evidence. A runtime replacement, a new domain, or a reproducible invariant failure triggers the refactor; file length or tidiness alone does not. A new automated guard needs a decidable contract boundary. Recipes, lifecycle interfaces and domain migrations stay in their construction contracts.

Work starts in units small enough to have their own RD, ruling and exit path — for example "compare SDK and process protocols for cancel/recover" or "verify duplicate submissions against the single-writer store". Source files, classes, full database fields and UI pixel specifications wait until that unit is approved.
