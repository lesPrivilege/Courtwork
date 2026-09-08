# SE Experts / Extensions Hot-Plug Research Index

**Status:** External research handoff  
**Round:** 3 — Hot-pluggable Work Components  
**Date:** 2026-09-08  
**Primary consumer:** local repo review → reconciliation → implementation plan / PR slices / roadmap  
**Reference practice:** first bounded Expert = Inbound NDA Playbook Review

---

## 0. Scope

This document is an **index for local planning**, not the implementation plan itself.

Round 1 froze the first bounded legal practice: **Inbound NDA Playbook Review**.  
Round 2 froze its runtime semantics: **generic agent runtime + bounded Work Contract + governed Review Ledger + human commitment authority**.  
Round 3 asks a different question:

> How can an already-valid Expert become a hot-pluggable component of the generic agent, contributing both backend runtime semantics and frontend review semantics, while remaining reversible, scoped, governed, versioned, and compatible with sovereign/private/SaaS capabilities?

### 0.1 In scope

- DeepSeek Harness / Cordis hot-plug substrate
- runtime extension seams
- frontend review extension seams
- durable state and replay semantics
- package activation / suspension / update / unload
- Expert vs Extension boundary
- local / sovereign model routing implications
- private MCP / SaaS MCP / remote expert task implications
- frontier legal-agent patterns relevant to packaging
- implementation questions that must be resolved against the local repo

### 0.2 Out of scope

- redesigning the NDA legal playbook
- choosing actual legal positions for production use
- implementing multi-agent review before benchmark evidence requires it
- designing a marketplace/distribution business
- finalizing an Expert package manifest before local substrate review
- copying DeepSeek Harness wholesale
- treating MCP as the Expert abstraction itself

---

# 1. Frozen Claims

These are the highest-confidence claims from Rounds 1–3. Local planning should treat them as hypotheses to preserve unless code reality provides a stronger counterexample.

## C-01 — Expert is not an agent persona

**Claim**

An Expert is a reusable professional work contract, not a second agent runtime.

**Frozen shape**

```text
Generic Agent Runtime
    +
Expert Work Contract
    +
Domain Schema / State
    +
Verifier / Eval
    +
Optional Capability Requirements
    +
Review Surface
```

The host still owns planning, model calls, tool execution, retries, budgets, session lifecycle, persistence, approvals, and trace.

**Local validation**

- Does current runtime already have an abstraction that can contribute prompt/context + tools + event schema + UI without owning a new loop?
- Which existing object is closest: plugin, extension, preset, skill, runtime module, session feature?

---

## C-02 — State topology should be frozen before execution topology

**Claim**

The first NDA practice should logically decompose into per-rule work units, but v0 does not require physical multi-agent execution.

```text
ReviewRuleTask {
  rule_id
  applicability
  evidence[]
  classification
  selected_position
  proposed_edits[]
  rationale
  unresolved[]
  status
}
```

v0 may execute:

```text
1 generic agent × N sequential ReviewRuleTasks
```

Later:

```text
1 orchestrator × N parallel ReviewRuleTasks + reconciliation
```

The schema and review UI should not change when scheduler topology changes.

**External support**

Harvey’s 2026 Playbook Review rebuild moved from fixed waterfall model calls to orchestrator + rule workers + branch-per-worker + reconciliation, specifically because isolated calls lost context and could generate contradictory edits.

**Local validation**

- Can work items be replayed independently?
- Is there already a work queue / job primitive?
- Can concurrency be added later without rewriting state/UI?

---

## C-03 — Canonical work state is not agent trace

**Claim**

Trace is diagnostic. The durable Expert state must be explicit and replayable without reconstructing legal state from reasoning/tool history.

Reference shape:

```text
Matter
 ├─ InputArtifact
 ├─ ReviewContext
 ├─ PlaybookRef
 ├─ ReviewRules[]
 │   ├─ Evidence[]
 │   ├─ Finding
 │   ├─ SelectedPosition
 │   ├─ Proposals[]
 │   ├─ Uncertainty[]
 │   └─ ReviewDecision
 ├─ Conflicts[]
 ├─ ValidationReport
 └─ Commit
```

**Local validation**

- Where does canonical matter/session state live today?
- Are trace events immutable but too operational?
- Is an event log already replayable into view state?
- Does the UI currently infer state from chat messages?

---

## C-04 — Proposal and commitment remain separate

**Claim**

Expert execution may produce findings, redline proposals, routing recommendations, and review summaries. External or irreversible action remains behind authority/approval.

```text
finding → proposal → human review → committed change
```

This is not legal-specific; legal simply makes the distinction easy to observe.

**Local validation**

- Are write-capable tools currently distinguishable from proposal-only tools?
- Is approval attached to tools, actions, state transitions, or UI?
- Can an Expert forbid direct commit even if the host has a generic editing tool?

---

## C-05 — Expert owns work semantics; MCP exposes capabilities

**Claim**

MCP should not become the Expert abstraction.

```text
Expert
 ├─ local primitive tool
 ├─ private MCP capability
 ├─ SaaS MCP capability
 └─ remote expert task
```

A legal Expert decides *why/when* a capability is relevant; the runtime decides whether it is available/allowed.

**Local validation**

- Does tool registry preserve provider provenance?
- Can runtime filter tool visibility by matter/session policy?
- Can MCP servers be treated as optional dependencies rather than globally injected tools?

---

## C-06 — Code/config lifecycle differs from durable work-state lifecycle

**Claim**

When an Expert is unloaded, its executable contribution should disappear. Already-produced durable findings and review decisions must survive.

```text
Expert code unload
    ≠
delete Expert-produced work state
```

Required behavior:

```text
install v1
→ produce Finding F-17
→ reviewer accepts D-9
→ unload v1
→ F-17 / D-9 still renderable and auditable
→ install v2
→ v2 may consume/migrate prior durable state explicitly
```

This is one of the most important Round 3 invariants.

**Local validation**

- Does frontend require live plugin code to render old event types?
- Is there a fallback/orphan renderer?
- How are schema migrations handled?
- Can old package metadata be retained without executing old code?

---

# 2. Reference Practice: NDA Expert Minimal Contract

The first Expert remains deliberately bounded.

## 2.1 Normal-path inputs

```text
one inbound NDA
+ representing party
+ paper source
+ jurisdiction
+ deal context
+ approved playbook version
+ approved fallback library
```

## 2.2 Normal-path capabilities

```text
document.read
document.search
playbook.read
ledger.write
proposal.edit
```

Normal-path v0 should **not require open-web legal research**.

## 2.3 Escalation instead of guessing

```text
unresolved {
  reason
  missing_fact?
  missing_rule?
  conflicting_rule?
  required_capability?
  required_authority?
}
```

Examples:

- playbook has no position
- jurisdiction creates a new legal issue
- document structure is outside parser assumptions
- a proposed edit introduces undefined terms
- two rules touch the same text incompatibly
- matter facts are insufficient

## 2.4 Why this remains the reference test

It traverses the entire SE chain:

```text
raw document
→ typed domain state
→ governed criterion
→ evidence-backed judgment
→ bounded proposal
→ human review
→ commit
```

while keeping the legal universe small enough to backtest.

---

# 3. DeepSeek Harness Index

DeepSeek Harness is the strongest current external substrate reference because it demonstrates runtime extensibility, lifecycle ownership, scoped registration, session event replay, UI contribution, MCP registration, model adapters, and model-facing dynamic packages in one architecture.

---

## DSH-01 — “No privileged core” plugin composition

**Mechanism**

DSH documents the product as a shared Cordis context where model adapter, tool registry, session log, agent loop, UI integration, etc. are contributed through plugins rather than patched into one privileged core.

**Why it matters**

The architectural target for Experts should be “mount beside” rather than “fork host”.

**SE implication**

An Expert package should preferentially contribute through existing registries/events/services instead of adding domain branches to the generic loop.

**Local questions**

- Which current host services are still hard-coded?
- Which can be converted into registries without over-generalizing?
- Is “plugin beside core” achievable incrementally?

**Source**

- `deepseek-harness/docs/architecture.md`
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md

---

## DSH-02 — Context / Fiber / Effect lifecycle

**Mechanism**

Cordis plugin lifecycle:

```text
PENDING → LOADING → ACTIVE → UNLOADING → DISPOSED
                 ↘ FAILED
```

Registrations are reversible effects. Built-in registration APIs already attach cleanup to the owning plugin; unmanaged resources are wrapped with `ctx.effect()` and return a disposer.

**Key property**

Hot reload is not a special feature implemented separately for every registry. It follows from structural ownership of effects.

**SE implication**

The important abstraction is not “reload a JS module”; it is:

> Every runtime contribution must have an owner and an explicit reversible disposal path.

**Expert-package requirement candidate**

Every contribution should be classified:

```text
reversible executable effect
durable emitted state
external resource
cached materialization
```

Only the first category should disappear automatically on unload.

**Local questions**

- Are tool registrations currently disposable?
- Can prompt/context contributions be removed?
- Are event listeners tied to package ownership?
- Which resources currently leak across reload?
- Does frontend registration have symmetric teardown?

**Source**

- `docs/cordis-tutorial/02-lifecycle-and-effects.md`
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-tutorial/02-lifecycle-and-effects.md

---

## DSH-03 — Agent-scoped registration

**Mechanism**

DSH exposes `agent.ctx` as a derived context. It shares the same service graph but can tag registrations to the nearest scope key, allowing one agent/session to receive a different capability set without cloning the runtime.

**SE implication**

This is a strong model for Expert activation:

```text
global installed package
    ≠
active in every matter/session
```

Likely desired levels:

```text
installed
enabled-for-user/workspace
eligible-for-agent
attached-to-matter
active-for-run
```

**Local questions**

- What is the narrowest current scope for tool/prompt/UI registration?
- Can the same runtime host two sessions where only one has NDA Expert active?
- Is scope encoded structurally or through prompt conventions?

**Source**

- `.agents/notes/implemented/architecture/2026-07-12-agent-scope-runtime-design.md`
- https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/architecture/2026-07-12-agent-scope-runtime-design.md

---

## DSH-04 — Runtime extension seam map

DSH’s architecture table is useful as an **external seam checklist**, not as an API to copy.

| Desired contribution | DSH seam |
|---|---|
| model provider | `ctx.llm` adapter |
| model-facing capability | `ctx.tools` |
| per-agent capability | `agent.ctx` |
| shell/backend | `ctx.shell` |
| persistent terminal | `ctx.terminals` |
| human command | `ctx.commands` |
| background work | `ctx.jobs` |
| filesystem/provider policy | `ctx.fs` / `fs/*` |
| request/tool/turn interception | `agent/*`, `tools/*` |
| model-visible context | `agent.inject()` |
| UI/editor integration | `ctx.agents`, `session/event` |
| Chat business node | `ConversationNodeDefinition` |
| durable session state | `SessionEventMap` |
| same-session goal | `ctx.goals` |
| live session fork | `ctx.sessions.fork(...)` |
| scoped registration | `agent.ctx` |

**SE implication**

The local repo does not need identical names, but the Expert story is incomplete if it lacks equivalents for:

1. capability registration
2. context injection
3. durable state
4. UI projection
5. approval/policy
6. lifecycle ownership
7. scoping

---

## DSH-05 — Session event log as durable UI source

**Mechanism**

DSH’s UI guidance is to render from persistent `session/event` records and use transient streaming frames only for live presentation. Durable custom session state is added by extending `SessionEventMap`.

**SE implication**

Expert UI should ideally be a projection of durable Expert state/events, not a private frontend database.

Candidate event family:

```text
expert/activated
expert/deactivated
review/rule-created
review/evidence-linked
review/finding-updated
review/proposal-created
review/conflict-raised
review/decision-recorded
review/validation-completed
review/committed
```

Exact event granularity remains a local design question.

**Local questions**

- Is current event log authoritative or merely telemetry?
- Can events seed/replay UI state?
- Are events append-only?
- Can business events coexist with agent/tool trace cleanly?
- Is there a projection layer?

**Source**

- `docs/architecture.md`
- `docs/cookbook/extension-cookbook.md`
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/extension-cookbook.md

---

## DSH-06 — ConversationNodeDefinition / keyed renderer

**Mechanism**

A browser plugin can contribute a business node to built-in Chat via a `ConversationNodeDefinition` and a keyed renderer.

**Why it matters**

This demonstrates that a domain component can contribute a review row/card into the host conversation without owning the entire frontend.

**SE implication**

Possible local direction:

```text
Expert durable state
  → generic conversation projection
  → expert-specific renderer when available
  → generic fallback renderer when unavailable
```

The fallback requirement is critical for unload/history.

**Local questions**

- Does current Chat renderer support registry-based node renderers?
- Can an Expert contribute a side panel / detail view as well as inline rows?
- What survives when the renderer package is missing?

---

## DSH-07 — Permission / approval as independent axis

**Mechanism**

DSH documents approval through tool execution interception (`tools/pre-execute`) and `ctx.approval`. Plan mode is separate from sandbox/approval enforcement.

**SE implication**

Do not put Expert safety only in instructions such as:

> “ask before external legal research”

Instead, runtime policy should independently gate:

- tool visibility
- tool execution
- data egress
- state transition
- commit

**Local questions**

- Is there a generic approval object?
- Does approval persist and remain auditable?
- Can Expert policy add stricter restrictions than host defaults?
- Can capability denial happen before a tool is shown to the model?

---

## DSH-08 — MCP as “discover → register native tools”

**Mechanism**

DSH’s MCP client pattern discovers server tools and registers them on the same tool registry, so permission/approval/guards can remain part of one execution pipeline.

**SE implication**

MCP provenance should remain visible even if MCP tools become “native” to the model-facing registry.

Recommended metadata to preserve:

```text
provider = mcp
server_id
trust_zone
auth_principal
data_egress_class
license_scope
capability_version
```

**Local questions**

- Are MCP tools currently flattened and provenance lost?
- Can server-level policy apply to all tools?
- Can a private server and SaaS server expose colliding tool names safely?

---

## DSH-09 — Dynamic Cordis package lifecycle

**Mechanism**

`dsh-tool-cordis` lets the model inspect the live runtime, define a package with host/browser halves, run/update/stop/undefine it, and append immutable package versions after failures.

Relevant actions:

```text
inspect
define
run
update
stop
undefine
```

A browser half may require approval.

**Important boundary**

Definitions are session-scoped/process-local, but active code may affect other sessions in the same process; the VM sandbox is explicitly not a security boundary.

**SE implication**

This is highly relevant to **self-authored extensions**, but it should not be copied as the security model for professional Experts.

It establishes useful lifecycle semantics:

```text
define != run
run != authorize
stop != delete
update != mutate old version
```

**Local questions**

- Should user-created Expert components be immutable-versioned?
- Should activation be explicitly separable from installation?
- What is the process isolation requirement for third-party code?
- Should professional Expert packages be declarative-first and code-constrained?

**Source**

- `packages/extensions/tool-cordis/README.md`
- https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/extensions/tool-cordis/README.md

---

## DSH-10 — Dual-half host/browser package

**Mechanism**

The dynamic Cordis subsystem has host and browser halves; the extension directory explicitly describes dual-half packages and separate runners.

**SE implication**

This is the closest direct substrate analogy for an Expert that contributes both:

```text
backend runtime behavior
+
frontend review behavior
```

But the package should not imply those halves share lifecycle-identical state.

Candidate separation:

```text
Expert Package
 ├─ contract/manifest
 ├─ host contribution
 ├─ client contribution
 └─ schema/resources
```

Durable state remains host-owned / store-owned, not browser-half-owned.

**Local questions**

- Does current build support dual entry points?
- Can frontend contribution fail without breaking backend review?
- Can backend continue headlessly?
- Can historical state render with generic UI if client half is unavailable?

**Source**

- `packages/extensions/README.md`
- https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/extensions/README.md

---

# 4. Expert Hot-Plug Lifecycle Candidate

This is **not yet the manifest/API design**. It is the lifecycle vocabulary local planning should test.

```text
discover
  ↓
inspect
  ↓
install
  ↓
enable
  ↓
attach(scope)
  ↓
activate(run)
  ↓
suspend
  ↓
resume
  ↓
update(version)
  ↓
detach(scope)
  ↓
disable
  ↓
uninstall
```

## 4.1 Required semantic distinctions

### Discover vs Install

Discovering that an Expert exists must not execute code or grant capabilities.

### Install vs Enable

Installed artifact can remain disabled pending trust/admin decision.

### Enable vs Attach

Enabled Expert may be eligible globally but attached only to selected agents/matters.

### Attach vs Activate

Attachment supplies semantics/capabilities. Activation may start actual work.

### Stop/Suspend vs Uninstall

Stopping execution should preserve configuration and durable state.

### Update vs Mutation

Prefer immutable package versions plus explicit migration over silently mutating an active Expert.

### Uninstall vs Historical Erasure

Uninstall removes executable/config artifacts but must not delete committed/reviewed historical matter state unless a separate data deletion action is requested.

---

# 5. Package Contract: Fields to Investigate, Not Yet Freeze

Local planning should derive the minimal contract from actual substrate. These are candidate dimensions.

```yaml
expert:
  identity:
    id:
    version:
    kind: expert | extension
    publisher:
    provenance:

  compatibility:
    host_api:
    state_schema:
    ui_api:

  scope:
    allowed: [global, user, workspace, matter, session, run]

  contributions:
    runtime:
    context:
    tools:
    state:
    ui:
    verifier:
    eval:

  dependencies:
    required_capabilities:
    optional_capabilities:
    remote_tasks:
    model_requirements:

  trust:
    code_execution:
    network:
    filesystem:
    data_egress:
    secrets:
    licensed_sources:

  lifecycle:
    state_migration:
    unload_policy:
    orphan_rendering:

  review:
    commit_authority:
    approval_policy:

  evaluation:
    suite_id:
    minimum_profile:
```

## 5.1 Candidate invariant

**Manifest data should describe capability and policy; it should not itself execute arbitrary logic.**

Where executable code is necessary, it should be separately scoped and permissioned.

---

# 6. Expert vs Extension Taxonomy

Do not freeze naming before the local component model is clear.

## 6.1 Working distinction

### Extension

Primarily contributes runtime capability or presentation primitive.

Examples:

- MCP connector
- document parser
- DOCX tracked-change writer
- grep/search capability
- model adapter
- diff renderer
- approval widget

### Expert

Contributes a professional work semantics bundle:

```text
schema
+ Work Contract
+ domain policy/playbook
+ verifier/eval
+ review surface
+ capability requirements
+ transition rules
```

### Relationship

```text
Expert may depend on N Extensions
Extension should not depend on Expert semantics
```

## 6.2 Litmus test

If removing the component leaves the host able to perform the same professional task merely with fewer tools, it is probably an Extension.

If removing the component removes the governed definition of *what the professional task means and how it is reviewed*, it is probably an Expert.

---

# 7. Frontend Review Index

The Expert story is incomplete if only backend runtime is pluggable.

---

## UI-01 — One durable state, multiple projections

Desired:

```text
Review Ledger
 ├─ Chat compact row
 ├─ side review panel
 ├─ document annotation/redline view
 ├─ trajectory/trace view
 └─ export artifact
```

Avoid:

```text
backend finding
→ transform to chat message
→ separately transform to review DB
→ separately track DOCX edits
```

The latter creates drift.

---

## UI-02 — Progressive disclosure

Normal Chat should preserve generic-agent semantics.

Suggested layers:

```text
L0: Agent trace / “NDA review completed — 3 issues need review”
L1: review summary cards
L2: per-rule finding + evidence + proposal
L3: source document span / playbook rule / full provenance
L4: operational trace / tool execution / model details
```

Expert activation should add richer projections without turning Chat into a permanently legal-specific UI.

---

## UI-03 — Review actions as state transitions

Candidate human actions:

```text
accept proposal
reject proposal
edit proposal
approve exception
mark unresolved
request re-review
change selected position
attach additional fact/source
```

These should write governed review events/state, not merely send opaque natural-language messages back to the agent.

---

## UI-04 — Historical rendering after unload

Must test:

```text
Expert renderer installed → rich review UI
Expert renderer absent → generic typed-state renderer
```

Minimum historical fallback should preserve:

- type
- time
- Expert/package version
- rule ID
- finding/status
- evidence references
- reviewer decision
- exported artifact link/reference

An unloaded UI plugin must not make prior review unreadable.

---

## UI-05 — Version awareness

Every visible finding/proposal should make the relevant policy provenance inspectable:

```text
expert_version
playbook_version
state_schema_version
source artifact version
model/provider run metadata (diagnostic level)
```

The user need not see all of this by default; it must be recoverable.

---

# 8. Backend Runtime Index

---

## RT-01 — Capability resolution before model exposure

Recommended pipeline:

```text
registered capabilities
→ installation trust
→ identity / entitlement
→ workspace policy
→ matter permissions
→ data classification
→ Expert requirement
→ run-specific approval
→ model-visible capability set
```

Do not rely on the model to decide whether confidential NDA text may be sent to a remote service.

---

## RT-02 — Capability descriptor

Candidate conceptual shape:

```yaml
capability:
  id:
  kind: primitive_tool | resource | remote_task | expert_service
  provider:
  trust_zone:
  data_egress:
  auth_principal:
  side_effect:
  reversible:
  async:
  resumable:
  provenance:
  cost_class:
  availability:
```

The exact schema should be derived from local registries.

---

## RT-03 — Model routing is a policy decision

Same Expert work unit should be executable under different allowed model profiles:

```text
sovereign local
→ private/VPC
→ frontier SaaS
```

only if policy allows escalation.

Expert should specify requirements, not vendor identity:

```text
structured_output
reasoning_level
context_requirement
document_read
vision?
tool_use?
```

The runtime selects a qualified model.

---

## RT-04 — Sovereign-model practice test

The NDA replay corpus is useful for comparing:

```text
same schema
same playbook
same tools
same verifier
different model/provider
```

Measure failures at schema level:

- missed applicable rule
- wrong evidence
- wrong classification
- unsupported proposal
- failed escalation
- reconciliation conflict
- invalid structured state

Do not benchmark only prose quality.

---

## RT-05 — Deterministic primitives stay deterministic

Examples:

```text
DOCX parsing
section numbering
stable element IDs
text diff
fallback insertion
event persistence
rule coverage accounting
schema validation
```

should not be delegated to a model merely because a model is available.

---

# 9. MCP / External Capability Index

The current MCP spec materially strengthens the “remote task” distinction.

---

## MCP-01 — MCP 2026-07-28 is stateless-core, extensible

Current specification direction includes:

- stateless request/response core
- formal Extensions framework
- header-based routing
- cacheable list responses
- authorization hardening
- Multi Round-Trip Requests
- Tasks as an extension

**SE implication**

Do not architect local state around an assumption that the transport/session itself is the persistent work object.

Application state can remain stateful even if the protocol core is stateless.

**Source**

- https://blog.modelcontextprotocol.io/posts/2026-07-28/

---

## MCP-02 — Tasks is now the right external long-running-work abstraction

The Tasks extension (`io.modelcontextprotocol/tasks`) allows `tools/call` to return a durable task handle.

Task lifecycle includes:

```text
working
input_required
completed
failed
cancelled
```

Client methods:

```text
tasks/get
tasks/update
tasks/cancel
```

Task IDs should be durably persisted by clients to resume polling after disconnect/restart.

**SE implication**

A SaaS professional capability can be modeled as a remote task rather than flattened into synchronous tool semantics.

Candidate local abstraction:

```text
RemoteTaskRef {
  provider
  task_id
  status
  created_at
  last_updated_at
  ttl
  input_requests[]
  result_ref?
}
```

**Source**

- https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks
- https://tasks.extensions.modelcontextprotocol.io/

---

## MCP-03 — “Remote Expert Task” is not “local Expert”

A remote legal research service may already contain its own internal agent loop.

The host should own:

- whether to invoke it
- what governed data may be sent
- matter linkage
- authorization
- task persistence
- result provenance
- review/commit semantics

The remote service owns its internal execution strategy.

---

## MCP-04 — CoCounsel Legal MCP concrete pattern

Current CoCounsel connector exposes deep legal research with four high-level operations:

```text
start_deep_research
check_deep_research_status
get_deep_research_report
follow_up_deep_research
```

A conversation reference persists the remote research state.

**SE implication**

Do not force every third-party professional service into “search_case / fetch_statute / summarize_case” micro-tools if the service’s meaningful contract is an integrated professional task.

**Source**

- https://legal-mcp.thomsonreuters.com/docs/connector-guide

---

## MCP-05 — Private vs SaaS MCP

Candidate trust zones:

```text
local
private_network
licensed_external
public_external
```

Important attributes:

```text
data_egress
retention
license
tenant boundary
user identity
matter ACL
auditability
```

A tool’s JSON schema is insufficient to express these properties.

---

# 10. Frontier Legal Agent Pattern Index

These are not products to clone. Each supplies one architectural lesson.

---

## F-01 — Harvey: rule workers + reconciliation

**Observed pattern**

```text
lead reviewer
→ parallel per-rule workers
→ each worker searches/reads as needed
→ each worker edits its own document branch
→ branch merge
→ conflict reconciliation
→ final completeness/quality pass
```

Workers share matter context: represented party, paper source, negotiation stance, deal-specific instructions, precedents.

Worker state persists so follow-ups need not rerun the entire review.

**SE use**

- per-rule work unit is validated by frontier practice
- parallelism should be scheduler optimization
- document branches prevent concurrent-edit corruption
- reconciliation is a first-class stage, not a prompt afterthought

**Source**

- Harvey, “How We Rebuilt Playbook Review as a Multi-Agent System”, 2026-09-02
- https://www.harvey.ai/blog/rebuilding-playbook-review-as-a-multi-agent-system

---

## F-02 — Harvey: expert-built playbook in Word

Playbooks can be converted into structured rules; review surfaces status, reasoning, redlines, rule history, and human accept/reject.

**SE use**

- review UI is part of the Expert contract
- playbook versioning matters
- domain state should be clause/rule-addressable rather than chat-only

---

## F-03 — Lexis Protégé: goal → plan → human review → execution

Protégé exposes a pattern where users define goal/documents/skills/sources, review a proposed multi-step plan, then follow execution.

Lexis also increasingly organizes work around persistent matter/workroom context and reusable Skills.

**SE use**

- generic agent planning may be reviewable
- compiled Expert normal path should not necessarily require plan approval every run
- Skills are precedent for reusable work instructions
- matter is the natural persistence scope for professional work

**Sources**

- https://www.lexisnexis.com/en-us/products/lexis-plus-protege/legal-drafting.page
- https://www.lexisnexis.com/community/insights/legal/b/product-features/posts/matter-centered-legal-workflow
- https://www.lexisnexis.com/community/pressroom/b/news/posts/lexis-with-protege-accelerates-frictionless-agentic-productivity-from-first-idea-to-review-ready-legal-work-product

---

## F-04 — CoCounsel MCP: remote professional task lifecycle

See MCP-04.

**SE use**

A remote expert-service connector can remain an optional dependency of a local Expert without becoming the local Expert itself.

---

## F-05 — Vincent: outcome-driven agentic mode

Vincent chooses workflow/tool sequence and adapts research depth to question complexity, while keeping source verification visible.

**SE use**

The host agent may remain adaptive inside the bounded Expert contract; “bounded” does not mean “hard-coded waterfall”.

---

# 11. General Harness Comparison Index

---

## H-01 — OpenCode

Relevant practices:

- custom project/global tools
- plugin system
- MCP as another tool source
- allow / deny / ask permission patterns, including wildcard policy for MCP tool namespaces

**SE use**

Good reference for a small generic permission layer and simple local/global contribution discovery.

**Limits for Expert goal**

Tool/plugin extensibility alone does not provide the full dual-sided professional Expert contract (durable domain state + review UI + eval + transitions).

**Sources**

- https://opencode.ai/docs/custom-tools/
- https://opencode.ai/docs/tools/

---

## H-02 — Pi ecosystem

Current Pi-style extension practice reinforces a useful separation:

```text
extension = runtime code behavior
skill = model-readable instructions/capability pack
prompt = reusable user invocation
```

Typical extension surfaces include tools, commands, lifecycle hooks, UI, and tool-call interception.

**SE use**

This supports keeping “instructions” and “runtime effects” distinct inside an Expert package.

**Caution**

Community Pi forks/extensions vary significantly; verify against the exact local Pi lineage before importing API assumptions.

---

## H-03 — Progressive disclosure for Skills

File-backed skills that expose only lightweight metadata until invoked remain a useful pattern for Expert discovery:

```text
catalog metadata
→ user/model selects Expert
→ load full contract/resources
→ activate required runtime/UI contributions
```

This reduces baseline context pollution.

**SE use**

Round 3 should keep “discoverability metadata” separate from full activation payload.

---

# 12. Expert Discovery / Activation Questions

These should become explicit local research questions before implementation planning.

## Q-01 Discovery

- Who discovers Experts: host startup, workspace registry, model, user, or all?
- What metadata is visible before activation?
- Can the model see that an Expert exists without loading its full instructions?
- Can user pin/disable an Expert?

## Q-02 Selection

- Does the generic router select an Expert automatically?
- Does activation require explicit user selection for sensitive domains?
- How are multiple matching Experts ranked?
- Can two Experts compose?

## Q-03 Scope

- global
- user
- workspace
- project
- matter
- session
- run

Which scopes exist locally and which should not be invented yet?

## Q-04 Dependency resolution

- required extension missing
- optional MCP unavailable
- required model profile unavailable
- UI half unavailable
- verifier unavailable

Should activation fail, degrade, or become pending?

## Q-05 Trust

- first-party package
- user-authored local package
- organization-approved package
- third-party signed package
- model-generated dynamic package

Do these share the same activation path?

---

# 13. Durable State / Migration Questions

## Q-06 Schema ownership

Who owns `review/*` event/state schema?

Options to test:

1. Expert package owns schema
2. host owns generic `artifact/state` envelope, Expert owns payload
3. dedicated schema registry owns namespaced schemas

## Q-07 Versioning

Every durable item may need:

```text
producer_expert_id
producer_expert_version
schema_version
playbook_version
source_version
```

Which are canonical vs diagnostic?

## Q-08 Migration

Possible policies:

```text
read old state as-is
lazy projection migration
explicit migration artifact
fork new review from old state
```

Avoid rewriting historical reviewed facts invisibly.

## Q-09 Orphan state

What happens when the producing Expert is unavailable?

Minimum requirement:

```text
state remains readable
provenance remains visible
commit remains auditable
new mutation may be disabled
```

---

# 14. UI/Runtime Partial Failure Matrix

The dual-half component requires failure semantics.

| Host half | Client half | Expected behavior candidate |
|---|---|---|
| OK | OK | full Expert experience |
| OK | failed/missing | runtime may continue; generic fallback UI |
| failed | OK | UI shows Expert unavailable; no fake actions |
| unloaded | available historical bundle | read-only historical projection |
| version mismatch | version mismatch | explicit incompatibility, no silent coercion |

Local plan should decide which are v0 requirements.

---

# 15. Security / Sovereignty Index

---

## S-01 — Model is not the policy engine

Policy should gate capability before/at execution independently of prompt instructions.

---

## S-02 — Data egress must be capability metadata

For each remote tool/task:

```text
what data can leave?
to whom?
under which user/org identity?
under what retention/licensing contract?
```

---

## S-03 — Sovereign model should be first-class

Do not build “cloud Expert” and “local Expert” separately.

One Expert contract; different runtime model profiles.

---

## S-04 — Dynamic code is higher-risk than declarative Expert semantics

DSH explicitly warns its dynamic Cordis package sandbox is not a security boundary.

Local design should consider separating:

```text
declarative Expert contract
signed/pre-approved executable extension
user/model-generated runtime code
```

into different trust classes.

---

## S-05 — Capability escalation is itself a governed transition

Example:

```text
NDA local review
→ unresolved: governing-law question
→ request licensed legal-research capability
→ runtime policy / user approval
→ remote research task
→ result linked into rule state
```

The remote call should not be an invisible “agent got smarter” step.

---

# 16. Evaluation / Compatibility Index

Hot-pluggability without compatibility testing will create hidden coupling.

## E-01 Expert conformance suite

Candidate checks:

```text
install/uninstall idempotence
registration cleanup
scope isolation
history replay after unload
schema validation
UI fallback rendering
dependency failure behavior
permission enforcement
data-egress enforcement
state migration compatibility
rollback to prior package version
```

## E-02 NDA domain replay suite

Retain Round 2 metrics:

- rule coverage
- evidence integrity
- rule provenance
- missing-vs-not-found correctness
- bounded proposal correctness
- escalation correctness
- review fidelity
- regression

## E-03 Provider matrix

```text
model profile × capability profile × Expert version
```

Examples:

- sovereign model + local only
- sovereign model + private MCP
- frontier model + no external legal source
- frontier model + licensed legal research

## E-04 UI regression

State/event fixtures should render without requiring a live model/tool runtime.

---

# 17. Local Reconciliation Checklist

This section is intentionally the handoff boundary.

For each external mechanism, local review should record:

```text
external mechanism
→ local equivalent
→ gap
→ reuse / adapt / reject
→ reason
→ target owner/module
→ test
```

Recommended table:

| Ref | External mechanism | Local equivalent | Gap | Decision | Evidence | PR/DEC |
|---|---|---|---|---|---|---|
| DSH-02 | reversible effects | TBD | TBD | TBD | code path | TBD |
| DSH-03 | agent scoped ctx | TBD | TBD | TBD | | |
| DSH-05 | durable session event | TBD | TBD | TBD | | |
| DSH-06 | keyed business renderer | TBD | TBD | TBD | | |
| DSH-07 | independent approval axis | TBD | TBD | TBD | | |
| DSH-10 | host/browser halves | TBD | TBD | TBD | | |
| MCP-02 | remote task lifecycle | TBD | TBD | TBD | | |
| F-01 | rule worker/reconcile | TBD | deferred likely | TBD | | |

---

# 18. Decision Candidates for Local ADR / DEC

These are questions likely worthy of explicit architectural decisions after code review.

## DEC-CANDIDATE-01 — Canonical Expert state

**Question**

What is the canonical durable state abstraction for Expert work?

**Do not decide before**

session/event, current matter state, and current trace implementation are reviewed.

---

## DEC-CANDIDATE-02 — Hot-plug ownership model

**Question**

What mechanism structurally owns and disposes runtime/UI registrations?

**Desired property**

Unload must not require every consumer to remember manual cleanup.

---

## DEC-CANDIDATE-03 — Expert activation scope

**Question**

Which scopes are supported in v0?

Suggested minimal candidate:

```text
installed globally
attached per matter/session
```

Avoid implementing every theoretical scope initially.

---

## DEC-CANDIDATE-04 — Expert vs Extension taxonomy

**Question**

Does the codebase need two first-class package kinds, or one generic package contract with different contribution sets?

---

## DEC-CANDIDATE-05 — Durable work state survives package unload

**Question**

How does historical rendering and mutation behave when producer package is absent?

---

## DEC-CANDIDATE-06 — Capability policy metadata

**Question**

Where do trust zone, data egress, authorization principal, side-effect class, and remote-task lifecycle live?

---

## DEC-CANDIDATE-07 — Frontend contribution API

**Question**

Can an Expert contribute review semantics without owning a page?

Desired first surface:

```text
Chat node/card + detail panel
```

rather than a new legal application shell.

---

## DEC-CANDIDATE-08 — Remote Task abstraction

**Question**

Should the host have a generic long-running remote-task primitive independent of MCP, with MCP Tasks as one adapter?

This may be preferable to coupling core state to one protocol.

---

# 19. Possible PR Slicing After Local Review

These are **candidate cuts only**, not authorized work.

## PR-0 — Index / architecture notes only

- local seam map
- no runtime changes

## PR-1 — Reversible contribution primitive

Potential targets:

- disposable registrations
- owner-scoped cleanup
- conformance tests

## PR-2 — Scoped capability/context registration

- attach contribution to selected agent/session/matter
- isolation tests

## PR-3 — Durable Expert state envelope/event family

- no legal-specific UI required initially
- replay fixtures

## PR-4 — Generic business-state Chat renderer registry

- typed node/card
- fallback renderer
- unloaded-package history test

## PR-5 — Expert contract loader

- metadata
- dependencies
- no arbitrary remote discovery initially
- install/enable/attach separation

## PR-6 — NDA Expert v0

- bounded playbook
- sequential per-rule tasks
- Review Ledger
- proposal-only
- no open-web legal research

## PR-7 — Remote task capability adapter

- first generic abstraction
- optional MCP Tasks integration if local need is clear

## PR-8 — Parallel scheduler / reconciliation

Only after NDA eval identifies latency/context bottleneck.

---

# 20. Avoid / Defer List

## Avoid now

- a second legal agent loop
- a marketplace
- arbitrary third-party executable Expert packages
- auto-approval of NDA commitments
- open-web research in the normal NDA happy path
- multi-agent architecture for its own sake
- duplicating durable state in frontend
- treating tool description as data-governance policy
- deleting historical work when plugin unloads
- binding Expert identity to one model vendor

## Defer until evidence

- parallel workers
- cross-Expert composition
- public sharing/signing format
- organization marketplace
- self-improving playbook updates
- automatic activation of high-stakes Experts
- generic schema migration framework beyond first real need

---

# 21. Suggested Local Review Order

To minimize wandering in the repo:

```text
1. session / state / trace
2. tool registry + permissions
3. agent runtime + context injection
4. frontend Chat rendering / event projection
5. plugin/extension lifecycle
6. model provider routing
7. MCP integration
8. current local work already implementing Expert-adjacent seams
9. only then draft package contract
10. map NDA Expert onto the chosen seams
```

Reason:

If canonical state and lifecycle ownership are wrong, every later Expert API will be wrong.

---

# 22. Handoff Output Expected From Local Review

The next local session should ideally produce:

## A. Current-state map

```text
host runtime
state/session
tool registry
policy/approval
model routing
frontend event/rendering
extension/plugin loading
MCP
```

## B. Reconciliation matrix

Use §17.

## C. Minimal architecture decisions

Only decisions required to implement the first Expert.

## D. PR plan

Small, reversible slices with tests.

## E. Roadmap delta

Separate:

```text
needed for NDA Expert practice
needed for generic Expert substrate
deferred ecosystem/marketplace
```

## F. Explicit non-goals

Prevent the substrate project from expanding into a framework rewrite.

---

# 23. Source Index

## DeepSeek Harness / Cordis

### Architecture
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md
  - plugin-based product composition
  - extension seam map
  - `agent.ctx`
  - session/UI integration
  - durable state via session events

### Cordis lifecycle and effects
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-tutorial/02-lifecycle-and-effects.md
  - plugin lifecycle
  - reversible registrations
  - `ctx.effect()`
  - structural unload / hot reload

### Extension cookbook
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cookbook/extension-cookbook.md
  - UI plugin pattern
  - `ConversationNodeDefinition`
  - approval
  - MCP
  - skills
  - model adapters
  - hot reload

### Agent scope runtime design
- https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/architecture/2026-07-12-agent-scope-runtime-design.md
  - derived context
  - scope tagging
  - shared service graph

### Dynamic Cordis tools
- https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/extensions/tool-cordis/README.md
  - inspect / define / run / update / stop / undefine
  - immutable package versions
  - approval boundary
  - security limitations

### Dynamic extensions subsystem
- https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/extensions/README.md
  - host/browser dual-half package model
  - dynamic runners and UI

---

## MCP

### MCP 2026-07-28 release
- https://blog.modelcontextprotocol.io/posts/2026-07-28/
  - stateless core
  - Extensions framework
  - routing/auth/cache changes
  - Tasks extension

### MCP Tasks extension
- https://tasks.extensions.modelcontextprotocol.io/
- https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks
  - durable task handles
  - `working / input_required / completed / failed / cancelled`
  - `tasks/get / tasks/update / tasks/cancel`
  - client persistence of task IDs

---

## Legal frontier systems

### Harvey Playbook Review multi-agent rebuild
- https://www.harvey.ai/blog/rebuilding-playbook-review-as-a-multi-agent-system
  - waterfall failure modes
  - single-agent prototype
  - orchestrator/worker design
  - per-worker document branches
  - reconciliation
  - persistent state

### Harvey playbook practice
- https://www.harvey.ai/blog/harvey-in-practice-build-and-run-playbooks-in-word
  - structured playbook rules
  - reasoning / redline / review
  - version history

### Lexis Protégé agentic drafting
- https://www.lexisnexis.com/en-us/products/lexis-plus-protege/legal-drafting.page
  - goal
  - proposed plan
  - human review
  - execution
  - reusable legal Skills

### Lexis matter-centered workflow
- https://www.lexisnexis.com/community/insights/legal/b/product-features/posts/matter-centered-legal-workflow
  - matter/workroom persistence
  - Skills
  - shared content/context

### CoCounsel Legal MCP
- https://legal-mcp.thomsonreuters.com/docs/connector-guide
  - remote persistent legal-research task pattern
  - start/status/report/follow-up lifecycle

---

## General harness references

### OpenCode custom tools
- https://opencode.ai/docs/custom-tools/
  - project/global tool contributions

### OpenCode permissions
- https://opencode.ai/docs/tools/
  - allow / deny / ask
  - wildcard permissions for MCP namespaces

---

# 24. One-Screen Local Handoff

If only one section is read before entering the repo, use this:

> **Goal:** do not design an Expert SDK in the abstract. Find the smallest existing runtime/UI seams that let the already-frozen NDA Expert attach to the generic agent, create durable typed review state, render it in Chat/review UI, use governed capabilities, and unload cleanly.
>
> **Primary invariant:** executable contribution is reversible; reviewed work state is durable.
>
> **First code questions:**  
> 1. What owns canonical session/matter state?  
> 2. How are tool/context/UI registrations scoped and disposed?  
> 3. Can domain events/state replay without live Expert code?  
> 4. Can capability visibility and data egress be policy-filtered before model execution?  
> 5. Can backend and frontend contributions attach independently to the same durable schema?
>
> **Do not start with:** package manifest, marketplace, multi-agent workers, or legal-specific page architecture.
>
> **First implementation consumer:** Inbound NDA Playbook Review, single generic agent, sequential per-rule tasks, proposal-only, human review.

---

## End state of this research round

The external evidence supports the following working direction:

```text
Hot-pluggable Work Component
    =
reversible executable contributions
+ scoped capability/context contributions
+ durable namespaced work state
+ pluggable review projections
+ explicit dependencies/trust policy
+ immutable/versioned package identity
+ human-governed commitment boundary
```

Whether the local product should expose this publicly as **Expert**, **Extension**, or a single lower-level package abstraction with two higher-level categories must be decided only after local reconciliation.
