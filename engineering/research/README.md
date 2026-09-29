# Research and RD index

A research packet holds one question's inputs, sources, the local ruling or a pointer to it, and its disposition. An RD file is a research-and-validation record for a local engineering question; it is not a product requirements document and does not approve implementation. Adopted content lives in its owner (contract, decision, task, code and tests); a packet keeps the reasons and the source, never a second contract or ticket list. Current status lives only in [current](../current.md). How inputs are consumed and material is retired: [governance](../governance.md#consuming-inputs); where material goes: [repository layout](../../docs/repository-layout.md#what-each-kind-of-material-is-for).

Find the question you are asking, then open the row. Effect values are the package's force as its own README or a named later record states it: **current rule**, **reference**, **intake open**, **intake closed**, **history**, **superseded → replacement**, **unknown**. "Intake closed" means every question in the input has a disposition; it does not mean adopted or implemented. Open raw inputs only to resolve a specific claim.

## Questions

### Which runtimes do we connect, and how do adapters, cancellation, permission, recovery and identity work?

Start with [Runtime and Work](../architecture-runtime-canon.md).

| Package | Answers | Effect | Owner or ruling |
|---|---|---|---|
| [RD-001](RD-001-runtime-adapter.md) | Can a runtime be thinly adapted; cancel, permission and recovery boundaries (M01–04, M08, M13–14; V-01, V-06) | reference | [architecture](../architecture.md), [Runtime Control](../../docs/runtime-control/INDEX.md) |
| [RD-004](RD-004-harness-core-pt2-reconciliation.md) | How an external Harness Core delivery reconciles with DEC-006/007/008 and H1–H5 | history | [decisions](../decisions.md) |
| [architecture-node-2026-09-13](architecture-node-2026-09-13/README.md) | Five-layer architecture, Orchestra, local runtimes, Multica, Kit direction, browser preview | current rule (the rulings linked); history (explore, evidence, archive, ui) | [architecture](../architecture.md), [Orchestra direction](architecture-node-2026-09-13/orchestra-direction-20260919.md), [local runtimes](architecture-node-2026-09-13/local-agent-runtimes-20260920.md), [Multica consumption](architecture-node-2026-09-13/multica-consumption-20260920.md), [Praxis Kit](architecture-node-2026-09-13/praxis-kit-20260919.md) |
| [agents-api-first-2026-09-14](agents-api-first-2026-09-14/README.md) | What a hosted Agents API adapter needs: official-source check, slices, protocol | reference; intake closed | [adapter protocol](agents-api-first-2026-09-14/adapter-protocol-20260915.md), [RD-001](RD-001-runtime-adapter.md) |
| [architecture-maintenance-2026-09-09](architecture-maintenance-2026-09-09/README.md) | Decoupling and maintenance units: source index, PR plan, integration design | intake closed | [integration design](architecture-maintenance-2026-09-09/integration-design.md) |
| [deepseek-runtime-2026-09-11](deepseek-runtime-2026-09-11/README.md) | DeepSeek runtime and architecture input with per-item dispositions | intake closed | [runtime canon](../architecture-runtime-canon.md) |
| [harness-pro-2026-09-10](harness-pro-2026-09-10/README.md) | Harness architecture-review submissions and returns | intake open | no owner, no trigger |
| [control-principles-2026-09-10](control-principles-2026-09-10/README.md) | Control-plane and token-level design principles (CP-01–14) | intake closed | [Pro review ticket](../execution/2026-09-10-harness-pro-review.md) |

### How do trusted extensions, Kits, resources and configuration attach to a runtime?

| Package | Answers | Effect | Owner or ruling |
|---|---|---|---|
| [RD-009](RD-009-trusted-harness-extensions.md) | Trusted Host check recipes, hooks and cancel settlement | current rule | [check recipes](../../app/docs/check-recipes.md), [DF-04](../release/harness-implementation-2026-09-12/harness-dogfooding.md) |
| [gui-agent-control-plane-2026-09-12](gui-agent-control-plane-2026-09-12/README.md) | One resource, many projections; agent draft, review, apply, next-Run binding | intake closed | [skill proposal slice](gui-agent-control-plane-2026-09-12/skill-proposal-slice.md) |
| [module-authoring-discovery-2026-09-13](module-authoring-discovery-2026-09-13/README.md) | Which runtime resources can be authored, imported or discovered | reference | none stated |
| [developer-control-panel-2026-09-13](developer-control-panel-2026-09-13/README.md) | Developer panel scope for MCP, Skill and local plugins | intake closed | [design record](../design/developer-control-panel-2026-09-13/README.md) |
| [models-provider-registration-2026-09-14](models-provider-registration-2026-09-14/README.md) | One Models entry, separate provider registration, composer connection guidance | intake closed; composer follow-up unknown | [implementation receipt](models-provider-registration-2026-09-14/implementation.md) |
| [work-capability-input-2026-09-11](work-capability-input-2026-09-11/README.md) | Provider allegations and temporary Work capabilities (WCI candidates) | intake closed | [RD-005](RD-005-multi-agent-selection.md) |
| [experts-hotplug-2026-09-08](experts-hotplug-2026-09-08/README.md) | Expert and extension hot-plug, first validation candidate | history | [decisions](../decisions.md) |

### How are agents coordinated, selected and given roles?

| Package | Answers | Effect | Owner or ruling |
|---|---|---|---|
| [RD-005](RD-005-multi-agent-selection.md) | Multi-agent practice selection, communication surfaces, execution routing | current rule (execution routing); reference (selection ledger) | [coordination](../../app/docs/coordination.md) |
| [multi-agent-2026-09-10](multi-agent-2026-09-10/README.md) | Thread and inter-agent messaging rulings; owns MA numbering | intake closed | [coordination](../../app/docs/coordination.md) |
| [multi-agent-selection-2026-09-10](multi-agent-selection-2026-09-10/README.md) | Consumption of three selection turns; entry is RD-005 | intake closed | [RD-005](RD-005-multi-agent-selection.md) |
| [multi-experts-2026-09-10](multi-experts-2026-09-10/README.md) | Multi-expert implementation research: turn ledger, selection, PR plan | intake closed | [roadmap](../roadmap.md) |
| [teamai-2026-09-09](teamai-2026-09-09/README.md) | Multi-expert discussion and personal-context Attention delta | intake closed | [attention-2026-09-09](attention-2026-09-09/README.md) |
| [court-position-2026-09-13](court-position-2026-09-13/README.md) | Reference practices for positioning; DEC-014 vocabulary and control responsibility | intake closed | [RD-005](RD-005-multi-agent-selection.md), [RD-007](RD-007-resource-governance.md) |
| [spark-explore-2026-09-13](spark-explore-2026-09-13/README.md) | Spark explorer merge review; coordination bottlenecks; form and async-attention references | intake closed (coordination, in RD-005); intake open (form and async-attention references) | [RD-005](RD-005-multi-agent-selection.md) |

### How is formal work state kept correct, and how do workspaces and obligations continue?

| Package | Answers | Effect | Owner or ruling |
|---|---|---|---|
| [RD-002](RD-002-commit-recovery.md) | Atomic, idempotent, recoverable commit with negative cases (M05–07, M10; V-04, V-09, V-11) | reference; closure unknown | [core contracts](../core-contracts.md) |
| [RD-006](RD-006-deferred-workspace-binding.md) | Start a task first and bind external resources later | current rule | [source pack](deferred-workspace-binding-2026-09-12/README.md) |
| [deferred-workspace-binding-2026-09-12](deferred-workspace-binding-2026-09-12/README.md) | Sources and dispositions behind RD-006 | intake closed | [RD-006](RD-006-deferred-workspace-binding.md) |
| [obligation-closure-2026-09-12](obligation-closure-2026-09-12/README.md) | Who may register, close and heartbeat a work obligation | intake closed | [Attention contract](../../docs/work-core/attention.md), [RD-005](RD-005-multi-agent-selection.md) |
| [se-continuity-2026-09-08](se-continuity-2026-09-08/README.md) | Plain persistence versus explicit governance across change, recovery and handover | reference | none stated |
| [longlife-2026-09-08](longlife-2026-09-08/README.md) | Sources and design checks behind the long-term roadmap | history | [roadmap](../roadmap.md) |

### What are Attention, Chat and Spark, and how do they differ from the runtime and Matter?

| Package | Answers | Effect | Owner or ruling |
|---|---|---|---|
| [attention-assistant-20260927](attention-assistant-20260927/INDEX.md) | Attention Assistant, dogfooding Kit, first integration candidate; task reading route | intake closed; routing index | [Attention contract](../../docs/work-core/attention.md), [Attention agent](../../app/docs/attention-agent.md) |
| [attention-2026-09-09](attention-2026-09-09/README.md) | Personal Attention research and ATT contract and plan | intake closed | [Attention contract](../../docs/work-core/attention.md) |
| [attention-human-loop-2026-09-09](attention-human-loop-2026-09-09/README.md) | Human decision queue for email and GitHub items | intake closed | [Attention contract](../../docs/work-core/attention.md) |
| [chat-attention-2026-09-11](chat-attention-2026-09-11/README.md) | Division of roles between Chat and Attention; product rationale | intake open (long-term roadmap not ruled); product rationale closed | CA-01 trigger: next authorised UI merge, no owner named |
| [chat-memory-broker-2026-09-12](chat-memory-broker-2026-09-12/README.md) | Governed memory sidecar; disclosure and forgetting for Attention | intake closed | [RD-007](RD-007-resource-governance.md) |
| [spark-product-definition-2026-09-11](spark-product-definition-2026-09-11/README.md) | Spark product and release-copy definition; restricted profile | intake closed | [obligation-closure](obligation-closure-2026-09-12/README.md) |

### How do people see, review and act on work: work surface, UX, commands and frontend?

Start with [UX grammar](../design/ux-grammar.md).

| Package | Answers | Effect | Owner or ruling |
|---|---|---|---|
| [RD-003](RD-003-work-surface.md) | Can a thin GUI present run, candidate, evidence and decision from one state (M07–12; V-05, V-08, V-10, V-14/15) | reference; experiments status unknown | [design index](../design/README.md) |
| [RD-008](RD-008-command-compaction.md) | Typed slash commands and native manual compaction | current rule | [commands and compaction](../../app/docs/commands-and-compaction.md) |
| [slash-compaction-2026-09-13](slash-compaction-2026-09-13/README.md) | Source ledger and baseline behind RD-008 | intake closed | [RD-008](RD-008-command-compaction.md) |
| [ux-grammar-2026-09-14](ux-grammar-2026-09-14/README.md) | UX copy practice input and the ruling that created UX grammar | intake closed | [UX grammar](../design/ux-grammar.md), [verification](../verification.md) |
| [review-surface-2026-09-09](review-surface-2026-09-09/README.md) | Review Surface, projection and presentation increments, recalled-item dispositions | intake closed | [disposition ledger](review-surface-2026-09-09/visual-reference-audit-20260915.md), [RD-007](RD-007-resource-governance.md) |
| [markdown-review-2026-09-10](markdown-review-2026-09-10/README.md) | Markdown review surface architecture and parser spike | intake closed | [Markdown reader](../../docs/markdown-reader.md) |
| [micro-surface-review-20260910](micro-surface-review-20260910/README.md) | Front and back merge-review practice; rename seam | intake open | no owner, no trigger |
| [chat-space-2026-09-09](chat-space-2026-09-09/README.md) | Design-method discussion and Chat Space mapping | intake closed | [Markdown reader](../../docs/markdown-reader.md) |
| [frontend-intake-2026-09-08](frontend-intake-2026-09-08/README.md) | Frontend discussion and GUI/Review runtime index | history | [work surface boundaries](../design/work-surface-boundaries.md) |
| [frontend-spec-review-2026-09-08](frontend-spec-review-2026-09-08/README.md) | Independent frontend layering spec candidate v0.1 | superseded → [frontend layering spec](../design/frontend-layering-spec.md) | [frontend layering spec](../design/frontend-layering-spec.md) |
| [frontend-attention-audit-2026-09-14](frontend-attention-audit-2026-09-14/README.md) | Input and scope for the attention-text audit | intake closed | [UX grammar](../design/ux-grammar.md) |
| [frontend-testing-stack-2026-09-14](frontend-testing-stack-2026-09-14/README.md) | Frontend test stack and enterprise-agent discussion, full capture | history | [verification](../verification.md) |
| [ux-polish-2026-09-08](ux-polish-2026-09-08/README.md) | Material, hierarchy and local-motion research for polish | history | [design index](../design/README.md) |
| [ui-ecology-2026-09-11](ui-ecology-2026-09-11/README.md) | UI ecology, visual grammar and taste-memory input | intake closed | [Design one-shot handoff](../design/se-control-one-shot-2026-09-11/HANDOFF.md) |
| [visual-compilation-2026-09-10](visual-compilation-2026-09-10/README.md) | Visual-compiler concept input (VC items) | intake closed | VC-04 trigger: real repeated cost |
| [motto-diff-2026-09-11](motto-diff-2026-09-11/README.md) | Terminal diff renderer source study for the shared diff renderer | intake closed | none stated |
| [agent-presence-2026-09-11](agent-presence-2026-09-11/README.md) | Agent presence figure: exploration, handoff and return | intake closed | [convergence note](../design/agent-presence-2026-09-11/return-v1/CONVERGENCE.md), [review evidence](../../evidence/agent-presence-review-20260912/README.md) |

### How are data, memory, resources and context governed?

| Package | Answers | Effect | Owner or ruling |
|---|---|---|---|
| [RD-007](RD-007-resource-governance.md) | Retention, links and cleanup of content resources, notes and messages | current rule | [mature-practices](mature-practices-2026-09-12/README.md) |
| [mature-practices-2026-09-12](mature-practices-2026-09-12/README.md) | Mature-practice ledger, PR plan and roadmap behind RD-007 | intake closed | [RD-007](RD-007-resource-governance.md) |
| [data-systems-2026-09-09](data-systems-2026-09-09/README.md) | Data-systems principles turned into DS candidates | intake closed | per-candidate start conditions in its plan |
| [local-governance-2026-09-09](local-governance-2026-09-09/README.md) | Local data governance, Explore method and evaluation prep (LG-00–04) | intake closed | expansion triggers in its benchmark plan |
| [data-organization-2026-09-10](data-organization-2026-09-10/README.md) | Data and organization engineering: public narrative and selection index | intake closed | none stated |
| [data-surfaces-2026-09-13](data-surfaces-2026-09-13/README.md) | Data work-surface receipt, ruling and serial implementation evidence | intake closed; implementation evidence is history | none stated |
| [context-window-2026-09-11](context-window-2026-09-11/README.md) | Context Window in the composer: meter, inspector, compaction timeline | intake closed (partly consumed; rest dormant reference) | [Context capacity contract](../design/context-capacity-ring-2026-09-14/contract.md); reopen when a compaction timeline or "what the Agent knows" copy is scheduled |

### How are the repository, documents and semantics governed?

| Package | Answers | Effect | Owner or ruling |
|---|---|---|---|
| [document-governance-2026-09-28](document-governance-2026-09-28/README.md) | Structure of documents, indexes, status and raw inputs | intake open (partly disposed; open items named in its README) | [repository layout](../../docs/repository-layout.md), [governance](../governance.md) |
| [repository-governance-2026-09-14](repository-governance-2026-09-14/README.md) | Cross-check of a governance proposal; PR handoff template | intake closed | [architecture](../architecture.md), [repository layout](../../docs/repository-layout.md) |
| [semantic-governance-2026-09-11](semantic-governance-2026-09-11/README.md) | Semantic governance and alignment: dispositions and polish roadmap | intake closed | [product semantics](../design/product-semantics/README.md) |

### How are Paper publication, brand and returned Claude material accepted?

| Package | Answers | Effect | Owner or ruling |
|---|---|---|---|
| [paper-publishing-2026-09-11](paper-publishing-2026-09-11/README.md) | Paper publication surface input, Claude brief, PP items | intake closed | [PAPER.md](../../PAPER.md) |
| [claude-paper-return-2026-09-11](claude-paper-return-2026-09-11/v1/README.md) | Returned Paper reader candidates, rulings and local integration (entries: v1, prepublish-v1) | intake closed | [prepublish-v1](claude-paper-return-2026-09-11/prepublish-v1/README.md) |
| [claude-publication-return-2026-09-12](claude-publication-return-2026-09-12/README.md) | Publication-final return receipt | history | [frontend node ruling](../release/frontend-node-2026-09-12/README.md) |
| [claude-ui-followthrough-return-2026-09-11](claude-ui-followthrough-return-2026-09-11/v1/README.md) | UI follow-through return and reference images | history | [closure decision](../release/ui-publication-closure-2026-09-11/DECISION.md) |
| [se-control-design-return-2026-09-11](se-control-design-return-2026-09-11/README.md) | Independent Design return, byte-preserving source intake | intake closed | [return intake](../design/se-control-one-shot-2026-09-11/return-intake.md) |
| [le-brand-2026-09-11](le-brand-2026-09-11/README.md) | LE vendor-signature exploration | history | [brand package](../../brand/README.md) |

### Controlled writing and research-lab experiments

Operator-only and blind-writer packages must stay apart; read each package's boundary line before handing anything to a writer.

| Package | Answers | Effect | Owner or ruling |
|---|---|---|---|
| [lab-preparation-2026-09-11](lab-preparation-2026-09-11/README.md) | Research-lab preparation track and comparison axes | reference | none stated |
| [fakesnews-distillation-2026-09-11](fakesnews-distillation-2026-09-11/README.md) | Source dossier for a fictional third-party report | reference | none stated |
| [claude-fakesnews-report-handoff-2026-09-11](claude-fakesnews-report-handoff-2026-09-11/README.md) | Operator-facing explicit-label report handoff; not writer input | history | [claude-independent-report-handoff](claude-independent-report-handoff-2026-09-11/README.md) |
| [claude-independent-report-handoff-2026-09-11](claude-independent-report-handoff-2026-09-11/README.md) | Neutral blind-writer input and returned candidate | intake open | no owner, no trigger |
| [claude-independent-report-operator-2026-09-11](claude-independent-report-operator-2026-09-11/README.md) | Operator-only control notes for the blind run; not writer input | history | none stated |
| [independent-review-handoff-2026-09-11](independent-review-handoff-2026-09-11/README.md) | Source pack for a neutral third-party review | intake open | no owner, no trigger |
| [claude-brand-svg-handoff-2026-09-11](claude-brand-svg-handoff-2026-09-11/README.md) | Brand and SVG handoff built from a misread deliverable | superseded → [claude-fakesnews-report-handoff](claude-fakesnews-report-handoff-2026-09-11/README.md) | none |

### What do external tools, upstream projects and other implementations offer?

Upstream channels, source-card rules and legacy recall: [ecosystem](../ecosystem/README.md).

| Package | Answers | Effect | Owner or ruling |
|---|---|---|---|
| [codex-courtwork-comparison-2026-09-10](codex-courtwork-comparison-2026-09-10/README.md) | Codex versus Courtwork comparison; claims kept as unverified | intake closed | none stated |
| [google-workspace-cli-2026-09-11](google-workspace-cli-2026-09-11/README.md) | Workspace CLI as tool ABI and Attention source (EX-GWS items) | intake open | no owner, no trigger |
| [browser-capability-2026-09-09](browser-capability-2026-09-09/README.md) | Optional Browser Agent adapter and driver seam | intake closed | [contract draft](browser-capability-2026-09-09/contract-draft.md) |

## Open intakes

Packages whose effect is "intake open". Each is a candidate for a dormant-reference note unless an owner or trigger is given here.

| Package | Owner or trigger |
|---|---|
| [chat-attention-2026-09-11](chat-attention-2026-09-11/README.md) | CA-01: next authorised UI merge; no owner named |
| [claude-independent-report-handoff-2026-09-11](claude-independent-report-handoff-2026-09-11/README.md) | no owner, no trigger |
| [document-governance-2026-09-28](document-governance-2026-09-28/README.md) | open items and owner named in its README |
| [google-workspace-cli-2026-09-11](google-workspace-cli-2026-09-11/README.md) | no owner, no trigger |
| [harness-pro-2026-09-10](harness-pro-2026-09-10/README.md) | no owner, no trigger |
| [independent-review-handoff-2026-09-11](independent-review-handoff-2026-09-11/README.md) | no owner, no trigger |
| [micro-surface-review-20260910](micro-surface-review-20260910/README.md) | no owner, no trigger |
| [spark-explore-2026-09-13](spark-explore-2026-09-13/README.md) | form and async-attention references: no owner, no trigger |

## RD conventions

Evidence for a round records: date, executor, reviewer, input or plan revision, candidate version and commit, OS and tools, model and budget, sample source and hash, commands, expected and actual, log paths, failures and exits, scope limits, and the ruling link. If the environment cannot be fixed, say so item by item and do not claim strict replay. Label the material type: official documentation, source code, community report, local history, simulated run, real run, independent review. Unexecuted checks are written "not run", never a blank PASS. Failed samples and interrupted attempts stay in the denominator; samples used for tuning are not later presented as held out.

| Gate | Evidence required to pass |
|---|---|
| G1 execution | model→tool→model, errors and cancel are consistent; unknown usage is not forged as zero |
| G2 commit | a Candidate has no effect; unauthorized writes are rejected; same key with different content is rejected; a repeated request causes at most one state transition |
| G3 recovery | after kill and restart, version conflict, lost notification and session change, results and obligations are still right |
| G4 projection | Context, GUI and index cite the same formal version; a disconnected or stale page cannot commit by mistake |
| G5 isolation | model-reachable tools cannot bypass the formal write entry; missing permission or environment fails visibly |
| G6 compatibility | plugin or adapter changes need no domain-semantics change; unsupported capabilities are refused explicitly |
| G7 work result | a Reviewer accepts the exact result version in the declared scope; the end of a run is not completion |

These are RD check categories; the MVP work-package G0/G1/G2 are construction-stage admission gates and are not interchangeable with them. Record token, latency, cost, review time and maintenance surface first and set acceptable ranges from that baseline; never move a correctness gate afterwards to make a run pass. V numbers refer to the [Practice Index verification queue](../../PAPER.md) (historical path `../../papers/src/practice-index.md`); an engineering experiment supports only its own scope.

A new RD card states: the question, owning modules, candidates and sources, decision impact, fixed inputs, steps, negative cases, pass and stop conditions, evidence record, open obligations, and the ruling link. One card answers one independently decidable question; split it when owners, start conditions or migration responsibility differ.
