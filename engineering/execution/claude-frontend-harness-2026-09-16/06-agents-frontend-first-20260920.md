# 06 · Agents frontend first, with a replaceable backend adapter

2026-09-20 · **First journey delivered at `0f76407`; bounded author correction pending before frontend acceptance and integration.** User-authorized frontend-first development. Claude: serial frontend author. Astra: architecture and integration. Luna: bounded precedent exploration and non-author verification. Backend remains with the existing Provider / Runtime Control / RD-001 / RD-005 / RD-009 owners.

## Outcome before components

An experienced agent user should be able to choose an agent for a job, understand its responsibility, adjust its Kit composition and execution choice, and tell what will change on the next supported run. The interface should explain only what is needed at that decision. Role, Kit, Runtime and Model remain distinct without requiring the user to learn the engineering architecture.

This order authorizes runnable frontend behavior before the matching backend is implemented. Use the established [Fake UI first precedent](../../design/chat-controls-2026-09-10/fake-ui-first/README.md): explicit synthetic adapters make missing states interactive; existing production capabilities retain real handlers. Missing backend work does not block building or reviewing this frontend. Synthetic success must never become a production configuration, permission, run or capability claim.

## Sequence and isolation

1. First deliver the stable [11 coding dogfood readiness packet](11-coding-dogfood-handoff-20260920.md), with source and writer handoff. The user will launch that fixed version's WebUI.
2. Claude can then build this frontend in a **new isolated tree**, with its own data/port, while the user tests the fixed dogfood node. Do not modify or restart the user's Host/data or mutate the tested checkout. Do not wait for the user to finish browser acceptance before doing isolated frontend work.
3. Deliver the first journey below, obtain a bounded frontend review and disposition, then continue the next frontend journey serially. Implement backend contracts later under their original owners and integrate against the accepted consumer.

At pickup, verify actual main HEAD, worktrees, dirty files and active writer scope. Observed planning baseline is `0e06d7006f1e9262e850102e349fcc3bca6517f3`. Preserve other writers. Reuse Pi as the runtime name; preserve underlying IDs. Do not restart the paused first-Core heartbeat by implication.

## First dispatch: Agent profile → Kits → execution summary

Implement one complete path in the target **Settings → Agents → Agent profiles** preview:

- Read available agent profiles by responsibility and intended work, with one useful next action per row.
- Open one profile, inspect/change its Role and selected Kits, choose a runtime from the adapter-supplied choices, and inspect the effective/requested model and permission scope where those affect the decision.
- Save a draft, show the adapter's confirmed saved revision, return to the same profile/list position, and recover from errors without losing the draft. Keep current-run binding and future-run changes distinct; do not invent automatic queuing.
- Explain an incompatible Kit/runtime combination, an unavailable runtime and runtime-native model ownership beside the affected choice. Kit requirements are not grants. Saving a profile is not publishing a formally accepted Work Expert.
- Link to the corresponding runtime/connection detail when useful, using fixture-backed read views in this first slice. Full runtime CRUD, credential and hook controls belong to the following journey rather than expanding this one.

Use a small meaningful synthetic cast such as general Work on Pi, a coding Kit on Pi, and Attention with Praxis on Hermes. These are labeled examples, not discovery of the user's installations or a claim of supported integrations. Show only information the job requires by default; protocol, version/hash, paths and diagnostics belong in details.

**First-slice stop:** a working, reviewable end-to-end profile journey, not a static mockup or a new plan. No backend implementation is required for its frontend acceptance.

## Mandatory consumption path

Read [UX Grammar](../../design/ux-grammar.md) → [frontend contract](../../design/agent-interface-2026-09-10/frontend-contract.md) → relevant [precedent-map](../../design/agent-interface-2026-09-10/precedent-map.md) entries → [Design Scout](../../design/scout/README.md). Load only the relevant underlying sources.

Nearest implemented consumers: Settings navigation/model connections in `app/web/settings-view.mjs`; model choice and return-to-composer in `app/web/model-picker.mjs`; `ui-controls.mjs`; Runtime intake/inspection in `runtime-intake.mjs`, `runtime-view.mjs` and `local-extension-view.mjs`. Reuse existing typography, spacing, tokens, icon family, focus/disclosure behavior and the existing Settings layout. The relevant grammars include settings navigation, selection, source/requested/effective/bound, saving/error recovery and task-relevant disclosure.

Before constructing a behavior, inspect the existing primitive and dependency/vendor inventory. Prefer an already adopted implementation or a compatible mature indexed library for complex interaction mechanics. If a new dependency is justified, record its source/version, license, compatibility, keyboard/accessibility behavior, maintenance and teardown implications; follow normal repository dependency handling. Do not hand-roll focus management, popover positioning, parsing or similar infrastructure merely because it is quick. A React-specific donor does not require a framework migration: consume its documented grammar or find a compatible implementation. If no suitable dependency fits, document that concrete reason and implement the smallest bounded primitive.

External search is pull-based: a fixed unresolved question, the matching Design Scout problem row, then a bounded review of mature product/first-party library sources. Prefer 1–3 relevant candidates and stop once the decision is supported. Record source, observed behavior, relevant grammar, reuse decision and rejected alternatives. Existing sufficiency is a reason to stop searching. Application Settings uses product/settings precedents; public-site navigation and hero galleries are not application-navigation rules. Do not copy screenshots/assets or invent a fresh visual system.

The 2026-09-20 user preference expressly permits selecting mature compatible libraries; historical “behavior donor, no dependency” entries are not a blanket requirement to reimplement their mechanics manually.

## Fixture and backend boundary

**Bounded Luna precedent review, adopted:** reuse the adapter separation in `app/tests/fixtures/chat-continuity/adapter.mjs` and action failure/abort semantics in `app/tests/fixtures/chat-actions/adapter.mjs`; `app/scripts/model-adaptation-fixture.mjs` supplies a synthetic browser-server precedent. Keep the current model picker's Provider/Model responsibility and `All chats · future runs` scope; do not turn it into a universal Agent/Runtime picker. The Agent selector is a distinct consumer of the same control grammar. The preview route must stay outside the user's live dogfood Settings route, with any simulated saved revision explicitly identified as preview-only.

**Astra adjustment:** Luna cites older guidance limiting external libraries to conceptual donors. The user's newer instruction permits a mature compatible implementation dependency when justified. Apply the consumption rules above; no framework or design-system migration follows automatically from that permission. This is a precedent/scope review only, not frontend acceptance.

Use the **same view/controller** with a narrow injected data/command adapter, rather than a separate prototype app that will be discarded. Define the minimum typed projection and intents needed by the journey; locate each fact's existing owner. Proposed transport paths remain proposed until the backend owner agrees—do not declare a new API authoritative just because a button needs one.

A contract row records: consumer intent; object identity/scope; source/requested/effective/bound distinctions; version/precondition; input/result/error shape; permission requirement; idempotency/cancel behavior; refresh/reconciliation; current implementation or missing backend owner; fixture case. Include only fields this journey consumes. No second permanent agent/provider/permission ledger.

- Synthetic adapter: explicit opt-in local preview, persistent visible preview identity, bounded synthetic inputs, request/result traces, and no production mutation fallback. Keep preview state separate from real local storage and Host configuration; use fake credential references, never real keys.
- Production adapter: existing actual capabilities may be connected under their original contract. Unsupported actions remain unavailable with a meaningful reason; simulated success cannot be substituted. Production visibility/exposure is capability-driven.
- Saving, enablement, compatibility, permissions and actual runtime execution are separate facts. A UI switch does not prove a runtime or hook is installed, authenticated, enabled or enforced.
- Required interactive cases: empty list; loaded profile; dirty draft; saving; confirmed revision; failed save with draft retained; stale revision/conflict; runtime unavailable/incompatible; active-run binding frozen. Out-of-order replies must not overwrite another profile or newer draft.

This explicitly permits a complete target Settings preview despite the older production rule against unsupported placeholders. That production rule remains intact; a nonfunctional disabled mockup does not satisfy this order.

## Frontend evidence and exit

Test the actual transition/adapter seams rather than mirroring rendering implementation. Demonstrate the complete journey and its negative states in the existing browser preview, using an OpenAI computer-use provider. Check keyboard traversal, Escape/focus return, draft retention, long labels, light/dark and narrow/desktop layout. Check actual native zoom when accessible; record unexecuted accessibility/device cases honestly and distinguish them from the old G4 campaign. An external diagram or screenshot alone is not implementation evidence.

Deliver source commit/changed files, runnable preview command and isolated data/port instructions, source/precedent consumption notes, the small adapter contract with backend ownership, fixture/production routing safeguards, actual interaction evidence and limits. Existing product behavior and the user's dogfood node must remain intact. Luna verifies the changed frontend scope; Astra disposes findings and freezes the accepted contract for backend consumption. Claude releases this slice before taking the next one; no push/deploy or deletion of its evidence tree.

## Subsequent serial frontend consumers

After the first journey is accepted, continue under the same existing owners:

1. **Runtime connection and local management:** connect/inspect/enable/disable/disconnect semantics, upstream-owned versus CW-managed authentication, key-reference status and trusted-hook controls. Consume [the local management ruling](../../research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md#personal-credentials-hooks-and-browser-dogfooding--2026-09-20). Fixture-first is authorized; actual key storage/migration, native config writes and hook execution remain backend work.
2. **Role-first Composer:** consume the accepted Agent selection/profile contract, keep model choice nearby, and preserve task text/materials/focus when visiting Settings. Existing production global future-run model scope remains truthful until per-agent binding is implemented.

These are subsequent bounded slices, not simultaneous writers or a request to rebuild Home/Chat. Browser/computer-use product capabilities, swarm, enterprise gateway and Pages redesign are outside this frontend order.

## 06a independent disposition — 0f76407 — 2026-09-20

Astra retains the Settings/Agent/Kit/Runtime direction and fixture-adapter boundary. [The independent review](evidence/agents-profile-review-20260920/README.md) records Luna's 16/16 seam tests, one full-suite summary of 1254/1254 (capture-wrapper error disclosed), static-route isolation checks and OpenAI computer-use verification including native Escape/focus return. Acceptance is held for two controller race invariants, Save focus recovery, an edit path when the runtime is unavailable, capability/permission explanations and ownership/revision wording. Claude owns the finite AP-R1–R6 return; no next runtime-management or Composer journey starts.

Missing backend fields remain assigned to the existing owners; configuration-wide revision/active-run precedents do not establish a per-profile API. The isolated frontend is retained despite the author's disclosed sequence deviation. Order 11's delivered status is not the accepted stable readiness handoff; its correction remains independently reviewed under its original record. No product merge, production Settings exposure, provider call, cleanup or deployment occurred in this disposition.
