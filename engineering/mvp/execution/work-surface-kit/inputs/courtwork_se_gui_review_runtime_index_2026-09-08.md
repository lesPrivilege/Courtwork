# CourtWork / Schema Engineering — Agent GUI, Human Review & Expert Composition Index

> **Status:** canonical research handoff / design-retrace index  
> **Date:** 2026-09-08  
> **Intended consumer:** Opus / Codex / future CourtWork design and implementation agents  
> **Scope:** generic agent UI, SE human-review surfaces, runtime/control-plane UI, approval/review queues, trace/replay surfaces, source-owned component systems, and the Expert-as-composition direction.  
> **Purpose:** do not redesign these surfaces from a blank canvas. Start from mature/open implementations, locate the relevant source boundary, then selectively reuse / vendor / reverse-engineer under SE governance.

---

## 0. Executive decision

The research supports a strong architectural simplification:

> **CourtWork Chrome owns infrastructure and governance; Experts own bounded composition.**

An Expert should normally not implement its own chat shell, tool cards, trace viewer, approval widget, diff viewer, artifact panel, permission UX, or commit gate. It should reference shared primitives and declare their orchestration against a domain schema.

This turns an Expert from “a small bespoke app” into something closer to a **declarative work-surface package**:

```text
Expert
= domain schema
+ capability references
+ retrieval/context policy
+ review/commit policy
+ shared surface composition
+ optional domain-only renderer
```

The community has converged enough that the human-review interaction vocabulary is finite. The recurring primitives are:

```text
observe / disclose / inspect
compare / diff
ask / select / edit
approve / reject / dismiss
request changes / retry
allow once / always allow / deny
pause / resume / cancel
checkpoint / branch / restore
commit / revoke
queue / defer / expire / escalate
```

CourtWork should therefore build a **Review Primitive Canon** and make Expert authoring reuse it by default.

---

# 1. How to use this index

Do not treat every project below as a stack choice. Each is indexed by the layer it has already solved.

### Consumption modes

| Mode | Meaning | Typical use |
|---|---|---|
| **REUSE** | component/source can plausibly be vendored or adapted directly | shared React primitive, renderer, layout behavior |
| **REVERSE** | interaction/state machine is valuable; inspect implementation and reproduce against SE contracts | approval lifecycle, review queue, checkpoint UX |
| **REFERENCE** | design/product evidence only; do not inherit architecture | IA, density, keyboard flow, terminology |
| **PROTOCOL** | use its boundary as an interoperability target | AG-UI, A2A, ACP, MCP, OTel |
| **AVOID-COUPLING** | useful implementation, but keep behind CourtWork adapter | backend-specific runtime/framework |

### Maturity labels in this file

- **FS / shipped** — frontend + backend/runtime path represented as working in the public source.
- **FS / prototype** — meaningful front/back implementation exists, but project itself describes prototype/early-stage constraints.
- **FE / source** — frontend/component implementation only or intentionally backend-agnostic.
- **Pattern/docs** — documentation or isolated implementation used as design evidence.

For less-established 2026 projects, assume **experimental until source-level validation**. Their value may be the interaction contract rather than production readiness.

---

# 2. CourtWork target architecture: the boundary this research is for

```text
CourtWork Chrome / Shell
├── Matter + tab lifecycle
├── Session / runtime adapters
│   ├── Codex
│   ├── Pi
│   ├── OpenCode
│   ├── Claude / other ACP runtimes
│   └── sovereign thin runtime
├── Capability registry
│   ├── tools
│   ├── MCP
│   ├── skills
│   ├── plugins
│   ├── memory / retrieval
│   └── prompts / policies
├── Governed state substrate
├── Event / trace substrate
├── Review & permission substrate
├── Artifact renderer registry
├── Shared work-surface primitives
└── Expert host
       ↑
       │ declarative composition
       │
Expert Package
├── manifest
├── schema
├── capability refs
├── retrieval/context policy
├── review + commit policy
├── layout/views
├── transitions
└── optional domain-only components
```

### Architectural rule

> **Expert owns composition, not infrastructure.**

When an Expert needs a capability that already exists as a Chrome primitive, it references it. A custom component is an escape hatch, not the default.

### Three Expert authoring levels

```text
L0 Preset Expert
   choose an existing package

L1 Declarative Expert
   schema + tools + skills + views + review policy + permissions

L2 Escape Hatch
   custom renderer / verifier / tool / transition
```

A future visual Expert Studio can expose L1 as a low-code surface without changing the runtime model.

---

# 3. Review Primitive Canon — proposed shared vocabulary

This is the most important output of the index. Opus should test whether the existing CourtWork front/back can be projected onto these primitives before adding new bespoke surfaces.

## 3.1 Five distinct human interaction classes

### A. Observation
Human reads what happened. No execution authority is being granted.

Examples:
- trace row
- tool call result
- agent handoff
- provenance
- status / progress
- evidence disclosure

Shared components:
`EventRow`, `ToolCall`, `TraceTree`, `Timeline`, `EvidenceList`, `Provenance`, `Status`.

### B. Elicitation
Runtime lacks information or needs a human judgment.

Examples:
- clarification
- selection
- free text
- structured form

Shared components:
`Question`, `Selection`, `MultiSelection`, `Form`, `HumanInput`.

### C. Permission
A capability/tool is about to execute. The object being judged is **authority to invoke**.

Canonical actions:
- allow once
- always allow / policy exception
- deny
- inspect exact arguments

Shared component:
`PermissionGate`.

### D. Proposal review
Agent has produced a proposed artifact/change/action. The human judges **the proposal itself**.

Canonical actions:
- approve
- edit + approve
- reject
- request changes
- dismiss (valid proposal, but should not count as agent error)
- retry/regenerate

Shared components:
`ReviewCard`, `DiffReview`, `DraftReview`, `ArtifactReview`.

### E. Commit gate
A reviewed proposal is about to cross into institutional / external state.

Examples:
- merge
- send
- publish
- release
- write system of record
- apply legal/financial status

Canonical requirement:
**proposal identity must bind to committed effect**. Approval must not silently authorize a later-mutated payload.

Shared component:
`CommitGate` + immutable `DecisionReceipt`.

This is where SE’s `proposal ≠ commitment` should be explicit in both schema and UI.

---

## 3.2 Shared ReviewItem envelope

Opus should consider normalizing heterogeneous runtimes into an internal shape roughly like:

```ts
interface ReviewItem {
  id: string
  matterId: string
  sessionId?: string

  kind:
    | 'permission'
    | 'proposal'
    | 'change'
    | 'artifact'
    | 'question'
    | 'commit'

  actor: ActorRef
  target?: TargetRef
  summary: string

  proposal?: unknown
  patch?: PatchRef
  evidence?: EvidenceRef[]
  provenance?: ProvenanceRef[]

  risk?: RiskClass
  reversibility?: 'reversible' | 'irreversible' | 'unknown'
  policy?: PolicyVerdict

  status:
    | 'pending'
    | 'waiting'
    | 'approved'
    | 'rejected'
    | 'changes_requested'
    | 'dismissed'
    | 'expired'
    | 'executing'
    | 'committed'
    | 'failed'

  expiresAt?: string
  decision?: DecisionRef
}
```

Do not force every backend to natively implement this. Normalize through adapters.

---

# 4. P0 source index — inspect before redesigning anything

These are the first references Opus should review against the current CourtWork implementation.

## 4.1 BoardUI — source-owned product maturity + agent-consumable design system

**Class:** FE / source + design-system distribution  
**Priority:** P0  
**Consume:** REUSE + REVERSE

- Site: https://www.boardui.com/
- Getting started: https://www.boardui.com/getting-started
- Components: https://www.boardui.com/components
- MCP: https://www.boardui.com/mcp
- AI Chat template: https://www.boardui.com/components/ai-chat

### What it has solved

- broad mature dashboard/component baseline;
- semantic token system, light/dark consistency;
- agent-specific components and coding-agent template;
- source-copy distribution rather than runtime UI lock-in;
- an MCP server that can browse/install components;
- `AGENTS.md` / editor rules as always-on design constraints;
- agent skill installation and design-system discovery.

### SE consumption

**Primary value is not styling.** BoardUI demonstrates that a design system itself can be an agent-consumable governed capability:

```text
catalog + source + usage examples + token rules + MCP + skill + AGENTS.md
```

This should inform CourtWork’s future component/runtime registry.

### What to reuse now

- spacing / typography / state / accessibility maturity baseline;
- dashboard furniture;
- composer/status-bar anatomy;
- source-owned component delivery model;
- agent-facing design rules.

### What not to inherit blindly

- generic SaaS personality;
- decorative agent-loading language;
- proprietary/Pro component assumptions.

CourtWork should keep its own expert-presence / record / review / evidentiary visual semantics.

---

## 4.2 assistant-ui — generic agent interaction substrate

**Class:** FE framework + runtime adapters  
**Priority:** P0  
**Consume:** REUSE + PROTOCOL + AVOID-COUPLING

- Repo: https://github.com/assistant-ui/assistant-ui
- Docs: https://www.assistant-ui.com/

### Existing primitives

- Thread
- Message
- Composer
- ThreadList
- ActionBar
- reasoning / chain-of-thought disclosure
- tool rendering
- generative UI
- inline human approvals
- runtime adapters

### Integration relevance

Public surface includes adapters for:
- Vercel AI SDK
- LangGraph/LangChain
- AG-UI
- A2A
- Google ADK
- OpenCode
- custom streams

### SE consumption

This is the strongest generic baseline for **chat/work-thread mechanics**. CourtWork should avoid rebuilding:
- streaming behavior;
- auto-scroll;
- attachment and composer mechanics;
- message-part routing;
- tool UI renderer registration;
- accessible chat primitives.

CourtWork-specific state/review semantics should sit above or beside the adapter layer rather than fork the chat engine.

### Opus task

Audit exactly which existing CourtWork surfaces already depend on assistant-ui, and separate:
1. what can remain upstream-compatible;
2. what is currently custom because SE semantics require it;
3. what is accidental bespoke UI and should collapse back to upstream primitives.

---

## 4.3 Vercel AI Elements — source-owned generic AI components

**Class:** FE / source registry  
**Priority:** P0  
**Consume:** REUSE

- Repo: https://github.com/vercel/ai-elements
- Site: https://elements.ai-sdk.dev/

### Why it matters

Source-copy/shadcn distribution makes this well suited to CourtWork’s “own the code” approach. Relevant families include:
- conversation/message
- prompt input
- reasoning
- tool
- citations/sources
- task
- checkpoints
- file tree
- terminal
- workflow/canvas primitives

### SE use

Use as a **generic vocabulary provider**, not a product architecture.

Particularly useful for quickly filling interaction gaps while CourtWork canonical primitives stabilize.

---

## 4.4 21st.dev Agent Elements — coding-agent tool cards and approvals

**Class:** FE / source registry  
**Priority:** P0  
**Consume:** REUSE + REVERSE

- Repo: https://github.com/21st-dev/agent-elements
- Docs: https://agent-elements.21st.dev/docs

### Especially useful components

- `BashTool`
- `EditTool` — diff + approval
- `SearchTool`
- `TodoTool`
- `PlanTool`
- `SubagentTool`
- `McpTool`
- `ThinkingTool`
- question tool
- composable input bar

### Why this is high leverage

It already factorizes the exact work events coding agents emit. CourtWork can inspect its component anatomy and event→renderer mapping rather than invent its own card family.

### Agent-consumption pattern

It also ships an agent skill describing catalog/props/composition. This is directly aligned with CourtWork’s future Expert/Component Registry.

---

## 4.5 CopilotKit — HITL contract anatomy

**Class:** frontend/runtime integration + docs/patterns  
**Priority:** P0  
**Consume:** REVERSE + PROTOCOL

- HITL overview: https://docs.copilotkit.ai/teams/langgraph-typescript/human-in-the-loop
- Governed action: https://docs.copilotkit.ai/langgraph-typescript/human-in-the-loop/governed-actions

### Critical distinction

CopilotKit separates two pause semantics:

1. **model/LLM initiated** — tool-like `useHumanInTheLoop`;
2. **graph/runtime enforced** — `useInterrupt`.

This maps closely to a distinction CourtWork should preserve:

```text
agent asks human
!=
runtime requires human authority
```

### Governed action envelope

CopilotKit’s pattern explicitly carries:
- stable action id
- summary
- tool
- policy/reference
- verdict (`allow | deny | require_approval`)
- exact arguments

It also recommends binding resume to the same action id/reference.

### SE use

Reverse this as a contract model for `PermissionGate` / `CommitGate`, not necessarily as a permanent dependency.

---

## 4.6 Codeg — mature work workspace, runtime compatibility, review-before-land

**Class:** FS / shipped open-source multi-agent workspace  
**Priority:** P0  
**Consume:** REVERSE + PROTOCOL + REFERENCE

- Repo: https://github.com/xintaofei/codeg
- Docs: https://docs.codeg.app

### Why it is a major reference

Codeg is a strong reference for the exact “thin GUI around replaceable agent runtimes” direction:
- Claude Code / Codex / OpenCode / Pi / others;
- ACP-compatible custom agents;
- session aggregation;
- multi-agent delegation;
- worktrees;
- diff review;
- integrated editor / git / terminal;
- split views and persistent tab layouts;
- MCP and Skills management;
- desktop / web / server / mobile clients.

### Review semantic worth copying

A finished task moves into review; it does **not merge itself**. Human can inspect diff, request another pass, or accept. Codeg verifies git state rather than trusting an agent’s self-report.

This is a concrete software-engineering instance of SE’s `proposal ≠ commitment`.

### Opus source targets

Trace:
- tab/split workspace model;
- session event normalization;
- permission prompt rendering;
- diff and worktree review lifecycle;
- MCP/skill management UI;
- ACP agent registration / custom agent surface.

Do not copy the whole product. Extract the seams.

---

## 4.7 OpenHands / Agent Canvas — work surface + runtime/server boundary

**Class:** FS / shipped; large mature project  
**Priority:** P0  
**Consume:** REVERSE + PROTOCOL + REFERENCE

- Repo: https://github.com/OpenHands/OpenHands
- SDK: https://github.com/OpenHands/software-agent-sdk

### Relevant layers

- composable agent SDK;
- Local GUI with REST + React SPA;
- Agent Canvas control center;
- backend selection;
- ACP-compatible agent direction;
- workspace/files/git surfaces;
- action rendering and collapsible events;
- automation/run history.

### SE use

Inspect how a mature system separates:

```text
frontend control center
→ browser TS client
→ Agent Server API
→ runtime SDK
```

This is useful for preventing CourtWork Chrome from accidentally binding UI components to one runtime implementation.

### Specific design evidence

OpenHands has long-evolved file/edit/diff/workspace surfaces. It is more valuable as a source for hidden edge cases than as an aesthetic template.

---

## 4.8 Suna Review Center — unified human attention inbox

**Class:** FE implementation / connected prototype  
**Priority:** P0  
**Consume:** REVERSE + REUSE

- Source snapshot: https://github.com/kortix-ai/suna/blob/ef2a0c70/apps/web/src/features/review-center/review-center.tsx

### Why this deserves direct source study

The implementation explicitly treats review as a **single human attention surface** spanning:
- changes
- approvals
- outputs
- decisions/questions
- finished batches

It includes:
- `Needs you / Waiting / Done` segmentation;
- keyboard navigation (`j/k`, approve, ask changes, dismiss, bulk select, search);
- live/polling semantics;
- session grouping/filtering;
- safe bulk approval;
- per-item risk display;
- reducer separated from React for testable state transitions.

### SE use

This is a strong basis for a **Chrome-level Review Center**, independent of any particular Expert. Experts emit review items; Chrome owns the inbox.

The core decision should be whether CourtWork wants:
- only inline review;
- only global inbox;
- or both projections over the same ReviewItem store.

Recommended: both.

---

# 5. P0/P1 dedicated durable review layers

These projects are particularly important because they prove that “review UI” is not just a card; in async professional work it often needs durable state, identity, expiration and audit.

## 5.1 Gatewerk

**Class:** FS / shipped early project  
**Priority:** P0  
**Consume:** REVERSE

- Repo: https://github.com/gatewerk/gatewerk

### Core model

A framework-agnostic review layer:

```text
Agent → Review API → Human Inbox → Decision/Edit → callback/webhook → Agent
```

### High-value semantics

- schema-driven review templates;
- editable fields;
- approve / reject / request changes;
- suggested-vs-approved field tracking;
- versioned resubmission after requested changes;
- priority/timeout;
- human chains/assignment;
- immutable/auditable review history;
- feedback query surface.

### SE implication

The distinction between **agent proposal** and **human-approved payload** is first-class. CourtWork should preserve this distinction in data, not infer it from transcript text.

---

## 5.2 VekInbox

**Class:** FS / shipped early project  
**Priority:** P0  
**Consume:** REVERSE

- Repo: https://github.com/LatticeAG/VekInbox

### Why it matters

It cleanly separates an inline runtime interrupt from a **durable human queue**:
- Postgres persistence;
- wait-for-resolution;
- idempotency key;
- timeout/escalation;
- signed webhooks;
- reviewer UI;
- SDK + CLI.

### SE implication

CourtWork should not assume all human review can remain attached to an in-memory turn. The same ReviewItem canon should support:

```text
inline synchronous gate
and
durable asynchronous inbox
```

without changing Expert semantics.

---

## 5.3 AgentGate (`agentkitai/agentgate`)

**Class:** FS / early 2026  
**Priority:** P1  
**Consume:** REVERSE

- Repo: https://github.com/agentkitai/agentgate

Useful for:
- policy engine around approval routing;
- dashboard / Slack / Discord / email channels;
- scoped API keys;
- webhook retry;
- MCP surface;
- audit trail.

Use it mainly as implementation evidence for **approval as a platform service**, not as a CourtWork dependency.

---

## 5.4 Deliberate

**Class:** FS / pre-release, LangGraph-focused  
**Priority:** P1  
**Consume:** REVERSE

- Repo: https://github.com/beomwookang/deliberate

Useful design insight:
- different review domains need different *layouts* over the same approval substrate;
- runtime interrupt and approval/audit state can live in different stores;
- mobile-first human review is materially different from developer console review.

This supports CourtWork’s architecture of shared review contracts + Expert-specific composition.

---

## 5.5 FlowGate

**Class:** FS / working early project  
**Priority:** P1  
**Consume:** REVERSE

- Repo: https://github.com/horrible-gh/FlowGate

High-value idea:
- typed document pipeline;
- claim of completion is not accepted state;
- every stage transition can be gated;
- rejection/revision history is retained.

This is conceptually very close to SE’s institutional state model.

---

# 6. P1 frontend-only / headless review primitives

These are useful precisely because they **do not own the backend**. They can supply visual/behavioral components while SE keeps the state machine.

## 6.1 agenttrace-react

**Class:** FE / headless  
**Priority:** P1

- Repo: https://github.com/nedbpowell/agenttrace-react

Relevant:
- headless trace tree;
- approval gate;
- run status;
- LangGraph / AG-UI / Vercel adapters;
- no styling opinion.

Potential use: source study for `TraceTree` / `ApprovalGate` behavior while CourtWork keeps its own visual language.

---

## 6.2 @liggi/agent-ui-toolkit

**Class:** FE / source package  
**Priority:** P1

- npm/repo discovery: https://www.npmjs.com/package/@liggi/agent-ui-toolkit

Relevant:
- Claude Code event renderers;
- file read/write/edit cards;
- word-level diff;
- bash output;
- subagent tree;
- plan approval;
- generic fallback renderer;
- composer.

Important architectural pattern: event classification/harness is a layer below rendering. CourtWork should preserve the same separation:

```text
runtime event → normalized WorkEvent → renderer registry
```

---

## 6.3 beUI agent components

**Class:** FE / shadcn-style source  
**Priority:** P1

- Approval Card: https://beui.dev/components/agents/approval-card
- Tool Approval: https://beui.dev/components/agents/tool-approval

Useful for interaction microdetails:
- pending → submitting → resolved collapse;
- request changes as first-class action;
- allow once / remember access / deny;
- parameter disclosure;
- reduced motion behavior.

Reference anatomy; do not inherit arbitrary styling.

---

## 6.4 `agent-approval-card`

**Class:** FE only  
**Priority:** P1

- Repo: https://github.com/rifzankhan/agent-approval-card

Useful because it keeps the boundary explicit:
- host owns execution and persistence;
- component owns only temporary edit UI;
- approve receives latest explicitly-applied args.

This is a good discipline for CourtWork component APIs.

---

## 6.5 `agent-indicator`

**Class:** FE only  
**Priority:** P1

- Repo: https://github.com/ladanjohari/agent-indicator

High-value review semantics:
- destructive approvals are never batched;
- unknown reversibility should not be treated as safe;
- safe requests may batch;
- ordinary activity can collapse while questions/failures remain visible.

This is useful for designing **attention policy**, not just visuals.

---

## 6.6 `approvals-ui`

**Class:** FE + headless policy core  
**Priority:** P1

- Repo: https://github.com/DylanMerigaud/approvals-ui

High-value ideas:
- typed small edit ops rather than whole-policy regeneration;
- human sees exact diff before apply;
- deterministic validation/lint separate from model;
- policy graph as reviewable artifact.

This is extremely aligned with SE’s principle that **proposal should be bounded and reviewable by construction**.

---

## 6.7 depute

**Class:** FE source/component concept  
**Priority:** P2

- Repo: https://github.com/Iambizi/depute

Useful catalog vocabulary:
- plan card
- approval gate
- run controls
- tool trace
- artifact card
- orchestrator view
- capability matrix
- state diff
- rollback timeline
- decision record

Treat as taxonomy inspiration until source quality/maturity is verified.

---

# 7. Runtime/control-plane references beyond generic chat

## 7.1 AgentDock

**Class:** FS / prototype control plane  
**Priority:** P1

- Repo: https://github.com/Mike-Jenkins-Org/agentdock

Useful for:
- durable approvals around arbitrary coding agents;
- tasks + artifacts + policies + append-only audit;
- MCP tools as control-plane API;
- human roles (owner/admin/reviewer/operator/viewer);
- DB as system of record, realtime as projection.

This is close to a “SE governance shell around external runtimes” reference.

---

## 7.2 executor

**Class:** FS / local-first structured tool runtime  
**Priority:** P1

- Repo: https://github.com/britg/executor

Particularly relevant to the runtime registry direction:
- connect MCP/OpenAPI/GraphQL sources;
- indexed/discoverable tool catalog;
- inspect schemas before calls;
- secrets/OAuth outside agent context;
- executions can pause for human interaction;
- UI and CLI share one local control plane.

This is a good reference for CourtWork’s **capability discovery + auth + progressive disclosure** layer.

---

## 7.3 mspace

**Class:** FS / substantial project  
**Priority:** P1

- Repo: https://github.com/mlhiter/mspace

Useful for:
- issue/matter as durable work unit;
- evidence review alongside agent sessions;
- worker/runtime decoupling;
- fixed agent catalog + materialized skills;
- review of diffs, test evidence and PR handoff;
- desktop/workspace rather than chat-first IA.

Very relevant to CourtWork’s “matter establishes the field” concept.

---

## 7.4 Ispo Code

**Class:** FS / coding workspace  
**Priority:** P1

- Repo: https://github.com/olegakbarov/ispo-code

Useful for:
- Create → Plan → Implement → Verify → Review lifecycle;
- multi-agent debate/debugging;
- durable streams;
- worktree isolation;
- file-by-file diff review;
- tool-call gallery.

Use as another implementation of finite work states around coding agents.

---

## 7.5 OpenMacaw / Agent Nexus class of projects

**Class:** FS / early community control planes  
**Priority:** P2

Examples:
- https://github.com/OpenMacaw/OpenMacaw
- https://github.com/deepaksinghcs14/agent-nexus

Useful primarily for:
- MCP server registry UI;
- permission policy editors;
- risk-based approval;
- tools grouped by source;
- memory/tool/admin surfaces.

Do not choose them as architecture before deeper audit; mine interaction/state patterns.

---

# 8. Trace / observability / replay index

SE does not want raw trace to become the primary human work surface, but governed trace is essential as progressively disclosed evidence. These projects show different projections over trace data.

## 8.1 Langfuse

**Class:** FS / mature  
**Priority:** P0 for trace/review source study

- Repo: https://github.com/langfuse/langfuse
- Site: https://langfuse.com/

Relevant:
- hierarchical traces;
- tool/retrieval/generation spans;
- sessions;
- human annotation;
- datasets/evals;
- prompt versioning;
- OTel and broad integration;
- increasingly agent-consumable surface (CLI/MCP/skills).

### SE use

Mine:
- trace detail IA;
- hierarchical disclosure;
- filtering/search;
- annotation → dataset flow;
- how verbose raw I/O is kept secondary to summary metadata.

Do not turn CourtWork into an LLM observability product.

---

## 8.2 Opik

**Class:** FS / mature  
**Priority:** P1

- Repo: https://github.com/comet-ml/opik

Relevant:
- trace/span browsing;
- annotations and feedback scores;
- datasets/experiments;
- online evaluation;
- guardrails;
- agent optimization loop.

Useful mainly to compare alternative trace/eval surfaces and identify what Langfuse-specific decisions should not leak into CourtWork.

---

## 8.3 Rewind (`agentoptics/rewind`)

**Class:** FS / shipped debugger  
**Priority:** P0/P1 for replay and branching

- Repo: https://github.com/agentoptics/rewind

High-value interaction semantics:
- fork at a step;
- replay from failure;
- compare timelines;
- inspect exact context at each point;
- original vs fixed diff;
- multi-agent span tree/swim lanes.

### SE use

CourtWork may not need a full debugger, but **checkpoint / branch / compare / restore** should borrow these mature debugger semantics rather than invent chat-specific undo metaphors.

---

## 8.4 TraceLens

**Class:** FS / early debugger  
**Priority:** P1

- Repo: https://github.com/certainly-param/tracelens

Relevant:
- checkpoint browser;
- state diff;
- timeline;
- step replay;
- active intervention and branching;
- sidecar instrumentation.

Useful for evaluating how much of “runtime introspection” should be in Chrome vs a secondary developer/debug surface.

---

## 8.5 LangObs / Agent Rewind class

**Class:** FS / early local-first tools  
**Priority:** P2

Examples:
- https://github.com/langobs/langobs
- https://github.com/JaydenCJ/agent-rewind

Mine:
- local trace graph;
- session replay;
- state/context diff;
- failure localization;
- OTel-native ingestion.

These reinforce a likely CourtWork choice: **standardize trace event contracts and keep rendering replaceable**.

---

# 9. Protocol / compatibility layer to preserve

The UI design should not accidentally destroy runtime substitutability.

## MCP
Use for external capability/tool discovery and execution. UI needs:
- server registry
- auth state
- tool inventory
- enable/disable
- scope/permission
- provenance/source
- per-call approval

BoardUI’s MCP distribution is also evidence that **UI/design capabilities can themselves be agent-addressable resources**.

## ACP
Useful for pluggable coding/runtime agents. Codeg is a high-signal implementation reference.

## AG-UI
Useful as an agent↔frontend event/interrupt interoperability target. CopilotKit and assistant-ui expose relevant implementations.

## A2A
Useful where external agent/task runtimes expose task/artifact state. Keep as an adapter, not CourtWork’s internal ontology.

## OpenTelemetry / GenAI semantic conventions
Useful for raw trace export/import and ecosystem compatibility. Do not make OTel spans the canonical human work schema.

### Internal rule

> **External protocols terminate at adapters. CourtWork’s human-facing WorkEvent / ReviewItem / Artifact contracts remain stable.**

---

# 10. Recommended shared component tree for CourtWork

This is not a final API; it is a target vocabulary for Opus to test against current source.

```text
chrome/
  MatterTabs
  ExpertPresence
  CommandPalette
  ReviewInbox
  NotificationCenter
  CapabilityStatus

conversation/
  Thread
  Turn
  MessagePart
  Composer
  Attachment
  ContextMeter

work-events/
  EventRow
  EventGroup
  ToolCall
  AgentHandoff
  Progress
  TraceTree
  Timeline

review/
  ReviewCard
  PermissionGate
  CommitGate
  Question
  Selection
  DraftReview
  DiffReview
  ArtifactReview
  RequestChanges
  DecisionReceipt

artifacts/
  ArtifactFrame
  DocumentPreview
  CodePreview
  DataPreview
  EvidenceList
  Citation
  Provenance
  VersionHistory

workspace/
  Inspector
  SplitView
  FileTree
  DiffViewer
  Terminal
  BrowserPreview
  Queue
  Checkpoint
  BranchComparison

runtime/
  RuntimePicker
  ExpertPicker
  ToolPicker
  SkillPicker
  MCPServerManager
  PermissionPolicy
  CapabilityMatrix
```

---

# 11. Expert declarative composition target

A future Expert should be able to declare a work surface without shipping its own shell.

Illustrative only:

```yaml
apiVersion: courtwork/v1
kind: Expert
metadata:
  name: contract-review

runtime:
  agent: general
  skills:
    - contract-analysis
  capabilities:
    - evidence.search
    - document.read

schema:
  primary: ContractMatter
  proposals:
    - Finding
    - ProposedChange

views:
  primary:
    type: document-review
    artifact: contract
  secondary:
    - type: evidence
    - type: trace

renderers:
  Finding: ReviewCard
  ProposedChange: DiffReview
  EvidenceSet: EvidenceList

review:
  Finding:
    actions: [approve, reject, edit, request_changes]
  ProposedChange:
    commit: explicit

permissions:
  writes: gated
  reads: policy
```

### Important consequence

If this works, an Expert is close to a **domain-specific low-code package**, but the authored objects are not generic page widgets. They are:

```text
schema + capabilities + state transitions + review policy + work-surface composition
```

That is the correct abstraction level for SE.

---

# 12. What Opus should do in the full retrospective design pass

The requested next step is larger than a visual redesign. It should be a **source-grounded architecture/design reconciliation**.

## Phase A — inventory current CourtWork truth

Do not rely on this document for local implementation truth. Inspect the current repo/worktree.

Produce:

```text
current/frontend-map.md
current/backend-map.md
current/runtime-map.md
current/component-map.md
current/state-contracts.md
current/review-contracts.md
```

For every existing surface, identify:
- current source path;
- current owner layer;
- runtime/data dependency;
- whether it duplicates an upstream/community primitive;
- whether it encodes an SE-specific invariant.

### Known historical baseline to verify, not assume

Prior CourtWork inspection has referenced a React/Vite/Tauri frontend, assistant-ui usage, protocol/client seams, preview/renderer registry concepts and Pi-related lane UI. These may have changed. **Read current source first.**

---

## Phase B — map current surfaces to the Canon

Example output:

| Existing surface | Canon primitive | Keep | Replace/vendor | Refactor contract |
|---|---|---:|---:|---:|
| current tool card | `ToolCall` | | | |
| current approval UI | `PermissionGate` or `ReviewCard`? | | | |
| current diff | `DiffReview` | | | |
| current trace | `TraceTree/Timeline` | | | |
| current artifact panel | `ArtifactFrame` | | | |

The question is not “does it look good?” but **does it belong to the right semantic class?**

---

## Phase C — source-level comparative design

For each primitive, review no more than 2–4 best references.

Example:

```text
PermissionGate
  semantics        ← CopilotKit governed actions
  microinteraction ← beUI ToolApproval
  risk/attention   ← agent-indicator
  runtime binding  ← current CourtWork adapter

ReviewInbox
  IA / keyboard    ← Suna Review Center
  durability       ← VekInbox
  editable payload ← Gatewerk
  visual language  ← CourtWork

DiffReview
  coding anatomy   ← Agent Elements / Codeg
  policy-diff idea ← approvals-ui
  Court semantics  ← own implementation

TraceTree
  generic runtime  ← assistant-ui / agenttrace-react
  debug disclosure ← Langfuse / Rewind
  human work view  ← CourtWork projection
```

---

## Phase D — freeze contracts before polishing visuals

Freeze internal contracts for at least:
- `WorkEvent`
- `ReviewItem`
- `Decision`
- `Artifact`
- `CapabilityRef`
- `ExpertManifest`

Only after those stabilize should source components be converged around them.

---

## Phase E — produce migration slices, not a rewrite

Recommended order:

1. **generic chat/work-thread baseline** — remove accidental divergence from mature primitives;
2. **WorkEvent normalization + renderer registry**;
3. **ReviewItem + Permission/Review/Commit distinction**;
4. **global Review Inbox + inline projections over same store**;
5. **artifact/diff/evidence primitives**;
6. **runtime capability management**;
7. **Expert declarative composition**;
8. only then expand visual unfamiliarization / CourtWork-specific identity.

---

# 13. Explicit anti-goals

Opus should reject the following paths unless source evidence shows a concrete need.

### Do not build one UI per Expert
Expert packages should compose shared primitives.

### Do not make raw transcript the canonical state
Thread is a projection; governed matter state survives beyond it.

### Do not make raw trace the primary review surface
Trace is evidence/provenance, progressively disclosed.

### Do not collapse permission, proposal review and commitment into one Approve button
They authorize different things.

### Do not expose framework-specific interrupt objects directly to Expert code
Normalize them.

### Do not use generative raw HTML/JSX as the main Expert UI model
Prefer a whitelisted component/renderer registry with typed schemas.

### Do not rebuild generic composer/chat mechanics for brand differentiation
CourtWork’s differentiation belongs in governed work semantics and material/visual language above the baseline.

### Do not start by building a large visual Expert Studio
First prove that 2–3 real Experts can be expressed declaratively in source/YAML/TS. A visual editor can project the same model later.

---

# 14. Prioritized source-reading queue

## P0 — must inspect in the Opus pass

1. BoardUI — component/token/agent-consumption system
2. assistant-ui — chat/tool/runtime primitives
3. Vercel AI Elements — source-owned generic components
4. Agent Elements — coding-agent cards/diffs/plans
5. CopilotKit HITL — interrupt vs human-tool + governed action envelope
6. Codeg — runtime compatibility + workspaces + review-before-merge
7. OpenHands — frontend/server/runtime boundaries + mature workspace edge cases
8. Suna Review Center — unified review inbox and reducer semantics
9. Gatewerk — editable structured review and proposed-vs-approved payload
10. VekInbox — durable async review queue
11. Langfuse — trace disclosure / annotation
12. Rewind — checkpoint/fork/replay/diff semantics

## P1 — targeted follow-up when a primitive is being implemented

- agenttrace-react
- @liggi/agent-ui-toolkit
- beUI approval components
- approvals-ui
- agent-indicator
- AgentDock
- executor
- mspace
- Ispo Code
- Opik
- TraceLens
- AgentGate
- Deliberate
- FlowGate

## P2 — landscape / taxonomy only until validated

- depute
- early control-plane clones and “agent OS” projects
- projects that mainly advertise capability without enough source/runtime evidence

---

# 15. Decision ledger from this research

### DEC-UI-01 — Generic Agent UI is infrastructure
Use mature primitives as the baseline. CourtWork does not need a novel message/composer implementation.

### DEC-UI-02 — Human review is a finite primitive set
Build a shared Review Primitive Canon. Expert-specific review should mostly be composition over it.

### DEC-UI-03 — Approval is not one semantic
Separate elicitation, permission, proposal review and commit.

### DEC-UI-04 — Inline and inbox review are projections of the same state
A review should be resolvable in the thread/matter surface or a global Review Center without creating two competing records.

### DEC-UI-05 — Durable review must exist below UI
Long-running professional work cannot depend solely on an in-memory frontend interrupt.

### DEC-UI-06 — Expert = composition
Chrome owns runtime, state, review, trace, permission, artifact and lifecycle. Expert owns domain schema and bounded orchestration.

### DEC-UI-07 — Source-owned components are preferred
shadcn/registry-style source delivery is especially compatible with a small self-maintained CourtWork codebase.

### DEC-UI-08 — Protocols terminate at adapters
MCP/ACP/AG-UI/A2A/OTel compatibility should not determine CourtWork’s internal human-facing ontology.

### DEC-UI-09 — Trace is evidence, not work state
Use observability products to inform progressive disclosure and debugging, not to define the main work UX.

### DEC-UI-10 — Brand language sits above the primitive substrate
BoardUI/assistant-ui/etc. can supply industrial maturity. CourtWork retains its own expert-presence, record, evidence, review and versioning visual semantics.

---

# 16. Definition of done for the Opus design reconciliation

The pass is complete only when it produces all of the following:

- [ ] source-verified current CourtWork frontend map
- [ ] source-verified current CourtWork backend/runtime map
- [ ] existing component → Canon mapping
- [ ] current event/state → proposed `WorkEvent` / `ReviewItem` mapping
- [ ] duplicate/custom components identified
- [ ] P0 references inspected at source level where relevant
- [ ] per-primitive reuse/reverse/reference decision
- [ ] stable shared component vocabulary
- [ ] stable Expert composition boundary
- [ ] migration plan in small reversible slices
- [ ] 2–3 representative Experts expressed without bespoke shells
- [ ] visual design tokens/material/motion applied after semantic convergence
- [ ] narrow-screen / keyboard / accessibility / reduced-motion behavior validated
- [ ] no framework-specific runtime object leaks into Expert contracts

---

# 17. Suggested Opus kickoff prompt

```text
Read this index first, then inspect the current CourtWork repository/worktree as ground truth.

Goal: perform a complete source-grounded retrospective design reconciliation of CourtWork under Schema Engineering. Do not redesign from screenshots or from memory. Inventory the implemented frontend, backend/runtime seams, state contracts, review/approval flows, trace/artifact renderers, capability management, and existing component libraries.

Use the index as a source map, not as a mandate. For every current surface, determine whether it is:
1) a generic agent UI primitive that should align with a mature community implementation,
2) an SE-specific governed-work primitive that should remain CourtWork-owned,
3) accidental bespoke code that should be deleted/refactored,
4) a missing primitive that should be introduced.

Maintain a strict distinction between elicitation, permission, proposal review, and commitment. Test whether a unified WorkEvent + ReviewItem substrate can support both inline review and a Chrome-level Review Center. Preserve runtime substitutability through adapters (Codex/Pi/OpenCode/etc.) and do not let MCP/ACP/AG-UI/A2A/OTel wire formats become the internal human-facing ontology.

Then test the Expert composition thesis: Chrome owns runtime/state/review/trace/permissions/artifacts/lifecycle, while Experts declare schema, capability refs, retrieval/context policy, review/commit policy, views and transitions. Demonstrate this by expressing 2–3 existing/plausible Experts without bespoke shells before proposing an Expert Studio.

For each primitive you touch, inspect the 2–4 most relevant P0/P1 source references from this index and record: source path, reusable behavior, incompatible assumptions, and final CourtWork decision.

Deliver decisions + source indexes + component maps + migration slices. Prefer reversible local convergence over a rewrite.
```

---

# 18. Source directory

Primary sources used in this index:

- BoardUI — https://www.boardui.com/
- BoardUI MCP — https://www.boardui.com/mcp
- assistant-ui — https://github.com/assistant-ui/assistant-ui
- AI Elements — https://github.com/vercel/ai-elements
- Agent Elements — https://github.com/21st-dev/agent-elements
- CopilotKit governed actions — https://docs.copilotkit.ai/langgraph-typescript/human-in-the-loop/governed-actions
- Codeg — https://github.com/xintaofei/codeg
- OpenHands — https://github.com/OpenHands/OpenHands
- Suna Review Center — https://github.com/kortix-ai/suna/blob/ef2a0c70/apps/web/src/features/review-center/review-center.tsx
- Gatewerk — https://github.com/gatewerk/gatewerk
- VekInbox — https://github.com/LatticeAG/VekInbox
- AgentGate — https://github.com/agentkitai/agentgate
- Deliberate — https://github.com/beomwookang/deliberate
- FlowGate — https://github.com/horrible-gh/FlowGate
- agenttrace-react — https://github.com/nedbpowell/agenttrace-react
- agent-approval-card — https://github.com/rifzankhan/agent-approval-card
- agent-indicator — https://github.com/ladanjohari/agent-indicator
- approvals-ui — https://github.com/DylanMerigaud/approvals-ui
- depute — https://github.com/Iambizi/depute
- AgentDock — https://github.com/Mike-Jenkins-Org/agentdock
- executor — https://github.com/britg/executor
- mspace — https://github.com/mlhiter/mspace
- Ispo Code — https://github.com/olegakbarov/ispo-code
- OpenMacaw — https://github.com/OpenMacaw/OpenMacaw
- Agent Nexus — https://github.com/deepaksinghcs14/agent-nexus
- Langfuse — https://github.com/langfuse/langfuse
- Opik — https://github.com/comet-ml/opik
- Rewind — https://github.com/agentoptics/rewind
- TraceLens — https://github.com/certainly-param/tracelens
- LangObs — https://github.com/langobs/langobs
- agent-rewind — https://github.com/JaydenCJ/agent-rewind

---

## Final handoff note

This index deliberately stops short of choosing a monolithic UI/runtime framework. The intended CourtWork strategy is **local selection + stable internal contracts + source ownership + ecosystem compatibility**.

The decisive design hypothesis to test now is:

> Once the Chrome-level primitive substrate is strong enough, most new Experts should be cheap to author, because the expensive interaction and governance problems have already been solved once.

That is the point at which “Expert authoring” can become low-code-like without reducing professional work to a generic workflow builder.
