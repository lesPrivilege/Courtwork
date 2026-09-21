# Next bounded assignments — 2026-09-21

Astra/Codex disposition under the user's updated routing. This is a dispatch view of existing 06 / 06b / 11 / P03/DRT-03 obligations, not a new roadmap. Planning main is `af1cfadd39cb170983e25845d6ab571265b2c3e8`; every author must read actual main/HEAD, current, worktrees and dirty paths at pickup.

## Routing and ownership

- **Opus:** bounded implementation, frontend first; may implement a settled backend contract without taking architectural ownership.
- **Sonnet:** bounded source/precedent exploration before implementation. Findings include exact source/version, what already exists, the missing seam and counterexamples; no acceptance claims from an author's exploration.
- **Fable:** the first remaining Harness/Runtime core slice, implementing the existing architecture and returning concrete cross-layer decisions to Codex.
- **Codex:** architecture, candidate selection, independent verification, integration sequencing and real computer use on an OpenAI provider. Internal non-author helpers may provide bounded evidence; author tests alone do not accept their source.

These are user-requested worker routes, not claims that this Codex task launched those models. No callable Opus/Sonnet/Fable delegation tool is present here. The assignments are concrete handoffs for the user's Claude environment; do not silently substitute another model or invent a model identifier. Worktree creation alone is not execution or writer release.

## Work already claimed

`claude-answer-footer-20260921` exists at `../.worktrees/courtwork-answer-footer-20260921`, observed HEAD `af1cfad`. Treat it as claimed by the existing Chat author even if its tree is momentarily clean. Preserve it; do not dispatch another footer writer. The finite [06b footer return](06b-dogfood-friction-20260920.md) remains first frontend priority.

The current Pi coding loop, controlled candidate write, fixed check runner and prepared real-model path have already been delivered and accepted within their documented scopes. Do not reopen these as new implementation tasks. `app/runtime/agents-api-adapter.mjs` and `agents-api-contract.d.ts` already implement an offline protocol/binding slice; the adapter explicitly performs no network call and advertises no unverified live capability. It must not be recreated from scratch.

## Dispatch order and simultaneous work

Two independently owned lanes are allowed by this update:

1. Frontend: accepted footer → Composer working-location entry → Runtime-management journey → Role-first Composer, with independent disposition between journeys.
2. Core: Sonnet's bounded P03-B source map → Fable's Pi Runtime Port extraction → Codex independent acceptance. This lane may run alongside the current frontend because it owns separate files. It does not start P03-C–F, local CLI delegation and hooks together.

No two writers own `app/web/app.mjs`, `app/server/service.mjs`, a shared store or an active fixture. Codex alone updates `engineering/current.md` and shared acceptance summaries at integration. Each author owns its assignment/evidence subsection and exact source files. Authors may deliver a patch for a shared static allowlist; Codex integrates that hunk rather than sharing an index. Keep 8787, 8899 and all user data untouched. Separate preview ports/data; verify the port is free instead of assuming a fixed number.

Create a fresh `claude-*` worktree only when its writer starts, from the actual integrated main. No empty future trees are required. Record source SHA, worktree/branch, files, tests and writer release. Codex merges accepted candidates serially, verifies the resulting main, then archives/restores/checks ended-tree bytes before deletion. No push/deploy is included.

## Opus next frontend: Runtime connection and local management

**Owner:** existing [06 subsequent frontend consumer](06-agents-frontend-first-20260920.md), RD-001 Runtime control, Provider credentials and RD-009 hooks. **Entry condition:** current footer correction and the next [06b working-location entry](evidence/composer-entry-review-20260921/README.md) independently accepted; 06a is already accepted. **Queued behind that finite entry correction.**

**User outcome:** Settings → Agents → Runtimes lets an experienced agent user identify which execution engine is available, inspect its connection/capabilities, connect or disable it, and understand what changes for future work. Agent profiles choose a runtime; Models manages provider/model connections; Tools owns extension/hook configuration. Keep Role, Kit, Runtime, Provider and Model distinct. Pi remains the upstream name and existing IDs remain unchanged.

**First complete journey:** list → inspect Pi/Hermes examples → connect with declared configuration ownership → confirmed state → disable for future admissions → reconnect/disconnect → return to the same item. Explicit preview identity throughout. Native-managed authentication reports native ownership and an appropriate next action; CW-managed authentication shows a synthetic reference/status, never a fake successful secret migration. A disabled runtime does not cancel an active Run; an unavailable runtime does not mean permission denied. Hook information may link to its owning Tools view; executable hook management is not part of this first journey.

**Implementation boundary:** consume the accepted Agent-profile preview seam plus `runtime-intake.mjs`, `runtime-view.mjs`, `settings-view.mjs`, existing controls and fixtures. Prefer dedicated Runtime-management controller/view/fixture files so the accepted profile journey remains stable. Read Design Scout → relevant grammar/precedent → existing library inventory before custom mechanics. Implement an interactive synthetic adapter, not a screenshot or production fallback. No native CLI invocation, personal filesystem scan, key copying, native config editing, executable hook installation or live production exposure in this frontend slice.

**Contract evidence:** source/requested/effective/bound, stable runtime identity, configuration owner, supported actions/reasons, pending operation, revision/precondition, retained current-Run binding, next-Run availability, and explicit unknown effect. Proposals remain proposed until the backend owner accepts them. Do not build a second provider/permission registry.

**Acceptance cases:** empty/unavailable runtime; failed connect; reply lost/unknown; duplicate click; stale revision; late reply after navigation; disable while a Run is bound; disconnect cannot erase history; draft/focus retention; native versus CW-managed credentials. Test production controller+view, not a substitute controller. Codex visually verifies desktop/narrow, keyboard/Escape and recorded limits; synthetic UI acceptance is distinct from working local runtime integration.

## Fable core: P03-B, extract the current Pi execution port

**Owner:** [RD-001](../../research/RD-001-runtime-adapter.md), [existing P03/DRT-03 A–F plan, slice B](../../research/agents-api-first-2026-09-14/implementation-plan-20260916.md). **Next core implementation; no second model loop.** The first accepted RD-006/DF-04 correction and real coding loop are already consumed.

**Observed remaining seam:** `app/server/service.mjs` still directly imports Pi `SessionManager`, opens it for stored-session operations, creates/opens it for admission, and calls `createSessionRun`. Move Pi session/journal lifetime and execution control behind the smallest existing-contract-compatible port. Host retains admission/configuration serialization, Run identity/status, tool governance, permission decisions, candidate/check effects, runtime bindings, credentials and Core bridge. The port receives already governed tools; it cannot authorize them or invent final acceptance.

**Sonnet preflight (bounded, can start now):** at actual pinned source, answer only these five questions: (1) all service consumers of SessionManager/createSessionRun and related Pi-specific result types; (2) journal open/create/history/compaction/disposal ownership and existing migration promises; (3) cancellation/requested/confirmed/unknown and late-event behavior that extraction must preserve; (4) exact contracts/fixtures already present in agents-api-adapter, with protocol-only versus live support separated; (5) minimum unchanged-behavior tests and the smallest file map. Use repository code and locally pinned upstream source first. Maximum 20 tool calls; stop with the source map, concrete uncertainty and proposed test selection. Fetch current first-party docs only for a genuinely unresolved external contract; historical summaries are not fresh verification. No credentials, paid calls, native config changes or implementation. Codex adjudicates a material cross-layer difference; routine extraction proceeds under this already-defined boundary.

**Fable source ownership:** `app/server/service.mjs`, `app/runtime/pi-session-runtime.mjs`, the minimal port/Pi adapter module if needed, and directly related tests. Shared store mutation is excluded by default because this is an unchanged-persistence extraction; if actual code proves a schema change necessary, return its concrete consumer/migration proposal before widening the slice. Do not change web renderers, Models semantics, installed runtime inventory, Pi version, SDK dependency, hook loader or child-agent dispatch.

**Exit:** the existing Pi implementation actually runs through the port in production, with no direct Pi SessionManager handling left in service; old journals/configuration/identity remain readable and unchanged in meaning. Compare admission/replay, governed deny/approval, streaming result boundaries, fixed check, cancellation and restart recovery with the existing independent fixtures. Exercise actual production service wiring, including events arriving after cancellation and command retries that must not create another native session. Port unsupported capabilities fail explicitly rather than falling back to a different runtime. Deliver a finite implementation, exact source/evidence and released writer; Codex independently verifies before integrating. This closes P03-B only, not a live Agents API, CLI orchestration or cross-runtime handoff claim.

The existing protocol adapter has its own verified artifact pin; the later implementation plan names a different candidate SDK version. Preserve both historical records. Sonnet must identify the difference for the later transport owner; do not upgrade dependencies opportunistically during Pi extraction.

## Queued backend consumer: bounded request details, then Opus implementation

**Owner:** original [06b B2 disposition](06b-dogfood-friction-20260920.md), RD-006/Runtime tool trace. **Not ready for code until Codex freezes the small data contract.** This is useful after the two current lanes settle, not a third writer on service.

Sonnet may prepare a bounded schema proposal for the first read-only repository tool: one allowlisted request summary at execution start, stable call identity, tool-specific safe fields, omitted/unknown fields and explicit truncation/retention. No raw arbitrary arguments, headers, content or credentials; unknown tools omit request details. Reuse the current event/tool identity and reader. The existing 400-character approval preview is not a redaction precedent. After Codex accepts the contract, Opus may implement that one backend projection plus its existing disclosure consumer and tests for safe fields, omitted values, limits, replay and failure. Do not spread general argument capture across every tool.

## Queued frontend consumer: Role-first Composer

**Owner:** the second subsequent consumer in 06. **Entry:** Runtime-management preview accepted and the chosen profile/runtime binding semantics explicitly available or clearly synthetic. Opus then implements choose Agent/Role → inspect effective model → visit Settings → return with draft/materials/focus intact. The existing production global future-run model scope remains truthful; synthetic per-agent bindings must not become production claims. Do not couple this to a complete backend registry or rebuild Home.

## Kept out of this batch

OS-backed key storage/native config migration, executable hooks, additional hosted transport, local Pi/Hermes child workers, swarm and browser/computer-use product support remain with Provider / RD-009 / P03-C–F / RD-005. Their declarations and existing implementations must be consumed when their turn arrives; no green preview or port refactor claims them. Current computer-use testing remains on an OpenAI provider, and new real provider trials need their own bounded test scope rather than automatically sharing this offline author budget.

## 2026-09-21 · Core lane disposition

P03-B source `c2be594` is [independently accepted](evidence/p03b-pi-runtime-port-review-20260921/README.md), merged `e2eaf6d`; the original extraction assignment is complete and must not be dispatched again. The existing C consumer is next in the core plan, with its own transport/access/permission contract and finite assignment before code. No C–F or third service writer starts automatically. Composer working-location remains the next frontend task.
