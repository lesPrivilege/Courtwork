# Design · Work Agent GUI

This directory holds the design rules the product is built against, the packets that produced them, and the earlier drafts they replaced. It routes; it does not carry status, which is [current](../current.md). State, facts and mutations are owned by the [core contracts](../core-contracts.md) and [RD-003](../research/RD-003-work-surface.md); design never invents an approve, cancelled or saved fact.

Effect labels: **rule** = current contract or rule; **accepted** = a delivery whose result is already carried by a rule or by code; **reference** = source material with its own limits; **superseded** = names its replacement; **unknown** = no owner text settles it. A packet's own README owns its scope and evidence.

## Start here for UI work

Read in this order and stop when you have the surface role, the grammar entries, the nearest precedent and the evidence to record.

1. [UX Grammar](ux-grammar.md): decision type to authoritative entry, with its adopted / proposed / superseded lifecycle.
2. [Frontend continuity contract](agent-interface-2026-09-10/frontend-contract.md), then only the entries you need from its [precedent index](agent-interface-2026-09-10/precedent-map.md). The [packet README](agent-interface-2026-09-10/README.md) gives the recall order.
3. [Visual / spatial grammar](visual-spatial-grammar.md): required for construction and density changes (surface role, token mapping, pointer and text-scale assumptions).
4. [Copy convention](copy-convention.md) for wording; [UI composition standard](ui-composition-standard.md) for layout, where struck-through rows are superseded.
5. [Atlas](atlas/README.md) for component behaviour.

When a ruling changes a rule, revise the affected section so the current text stands alone and keep the ruling in its owner ([governance](../governance.md#status-and-history)).

## Use now

### Registries and entry contracts

| Entry | Serves | Effect |
|---|---|---|
| [ux-grammar.md](ux-grammar.md) | Which rule decides a UI question | rule |
| [agent-interface-2026-09-10/](agent-interface-2026-09-10/README.md) | Frontend continuity contract, precedent index, change template, checklist | rule |
| [visual-spatial-grammar.md](visual-spatial-grammar.md) | Roles (chrome, reading/review, action), density mapping, cross-dimension ownership | rule |
| [copy-convention.md](copy-convention.md) | What UI text says and what it leaves out | rule |
| [ui-composition-standard.md](ui-composition-standard.md) | Text and composition standard | rule |
| [atlas/](atlas/README.md) | Component-level behaviour index | rule |
| [product-semantics/](product-semantics/README.md) | Names, glyph admission and presentation mapping per semantic key. `registry.json` is the source; `node tools/product-semantics.mjs` generates `app/web/product-semantics.generated.mjs` and, without `--write`, rejects stale output or missing owner paths; `node tools/check-semantic-consumers.mjs` checks raw glyph consumers | rule (tool-enforced) |
| [role-composer-20260922/](role-composer-20260922/README.md) | Role-first Composer (06e): specimen, the accepted E1 delivery and its backend requests. Read its top note first; body sections keep selection-stage wording | accepted; owner task [06e](../execution/claude-frontend-harness-2026-09-16/06e-role-composer-selection-20260922.md) |

### Rules by topic

| Entry | Serves | Effect |
|---|---|---|
| [work-surface-boundaries.md](work-surface-boundaries.md) | Chrome / Domain / Expert responsibilities; Review and commit semantics; projection and adapter boundaries | rule |
| [frontend-layering-spec.md](frontend-layering-spec.md) | Layering and custom-entry invariants (FN-01…29) with counterexamples; tests read it | rule |
| [surface-hierarchy.md](surface-hierarchy.md) | Line / surface / card / overlay convention | rule |
| [icon-controls.md](icon-controls.md) | SVG action, text and secondary-hint convention | rule |
| [object-command-grammar-20260914.md](object-command-grammar-20260914.md) | Object command and context-action grammar | rule |
| [skin-injection-2026-09-10/](skin-injection-2026-09-10/README.md) | Appearance boundary; `skin-constitution.md` keeps Review independent of skin | rule |
| [shell-control-plane-2026-09-12/](shell-control-plane-2026-09-12/README.md) | Back, notify and observe grammar (navigation, observability, notifications) | rule |
| [chat-product-page-2026-09-11/](chat-product-page-2026-09-11/DECISION.md) | Chat as an independent product page; owner reference of the product-semantics registry; no README | rule |
| [chat-reading-2026-09-11.md](chat-reading-2026-09-11.md) | Chat reading and text-reveal contract CR-01…05 | rule |
| [chat-reading-2026-09-11/](chat-reading-2026-09-11/reference.json) | Reference assets for the contract above; no README | reference |
| [spark-surface-2026-09-10/](spark-surface-2026-09-10/be41-dto.md) | Spark surface DTO, integration ruling and naming; no README, start at `be41-dto.md` | rule |
| [attention-agent-2026-09-10/](attention-agent-2026-09-10/README.md) | Global Attention agent and Runtime composition decision | rule |
| [context-capacity-ring-2026-09-14/](context-capacity-ring-2026-09-14/README.md) | Context capacity ring and cache diagnostics; `contract.md` is canonical | rule |
| [product-icons-2026-09-11/](product-icons-2026-09-11/README.md) | Product glyph set and sprite; feeds the vendor manifest | rule |
| [home-composition-2026-09-10/](home-composition-2026-09-10/README.md) | Home composition and disclosure / tab / material grammar; module order and geometry are superseded by [grammar-convergence-20260921](grammar-convergence-20260921/README.md) | partly superseded |
| [grammar-convergence-20260921/](grammar-convergence-20260921/README.md) | Intake, audit and migrations behind the visual / spatial grammar | source of a rule; audit history |

### Related outside this directory

- [Local decoupling and async-task integration design](../research/architecture-maintenance-2026-09-09/integration-design.md): later semantic design, run through the existing single-writer frontend queue.
- [UX Polish research pack](../research/ux-polish-2026-09-08/README.md): its old hero, two-place brand and wait-shimmer are not to be revived.
- [Execution packets](../execution/README.md): assignments and owner records; the active UX record is linked from [current](../current.md).

## References and samples

| Entry | Serves | Effect |
|---|---|---|
| [ux-conventions.md](ux-conventions.md) | Index of adjudicated UX rules from 2026-09-07; some rows are superseded; code comments still cite it | reference |
| [type-density-constraints.md](type-density-constraints.md) | Type and control density constraints (FE-05a); roles are now mapped by the visual / spatial grammar | reference; formal supersession unknown |
| [sources.md](sources.md) | Design source list S01…S22, a snapshot and unpinned | reference |
| [scout/](scout/README.md) | Design Scout index: capture schema, disposition rules, consumption chain | reference |
| [apple-hig-track-20260914.md](apple-hig-track-20260914.md) | Apple HIG consumption for Agency, feedback and continuity; official checks and local inference kept apart | reference |
| [les-privilege-paper-2026-09-11.md](les-privilege-paper-2026-09-11.md) | Signature semantics and display boundary for the Paper | reference |
| [icon-specimen/](icon-specimen/README.md) | Icon family comparison (outcome: no family migration, recorded in `icon-controls.md`); contains third-party licences | accepted |
| [identity-specimen/](identity-specimen/README.md) | Generative identity directions; none adopted, `brand/` owns marks | history |
| [material-specimen-2026-09-10/](material-specimen-2026-09-10/README.md) | Material and blur specimen and its decisions | accepted |
| [tps-specimen-2026-09-10/](tps-specimen-2026-09-10/README.md) | Decode TPS sparkline specimen (synthetic); later work in context-tps-motion | history; supersession unknown |
| [type-density-ablation/](type-density-ablation/README.md) | Static type / density measurements behind `type-density-constraints.md` | history (measurement evidence) |
| [agent-presence-2026-09-11/](agent-presence-2026-09-11/return-v1/README.md) | Returned presence specimen; no top-level README, start at `return-v1/`; intake in [research](../research/agent-presence-2026-09-11/README.md) | accepted |

## History

Read these only when a question needs the earlier reasoning. None is a current series and none overrides the rules above.

### 2026-09-05/06 drafts

| Entry | What it was | Effect |
|---|---|---|
| [principles.md](principles.md) | Design goals and the strangeness boundary | reference for intent; superseded by the grammar documents |
| [completion-surface.md](completion-surface.md) | Mature-GUI state, action and recovery coverage (UI01…) | reference |
| [directions.md](directions.md) | Three text design-direction candidates | superseded: the direction lives in the grammar documents |
| [prototype-plan.md](prototype-plan.md) | Prototype steps and gates D0-D4 | history |
| [decisions.md](decisions.md) | Local design decisions DS-001…006 (DS-005 has reopen conditions) | history |
| [reference-consumption.md](reference-consumption.md) | Selection of legacy design and web advice | history |

### Handoffs and design inputs

| Entry | What it was | Effect |
|---|---|---|
| [web-gpt-design-handoff-20260910.md](web-gpt-design-handoff-20260910.md) | Handoff to a web GPT against a 2026-09-10 baseline | history |
| [clean-cool-2026-09-09/](clean-cool-2026-09-09/README.md) | Frontend review and image package; the later shell-refinement direction replaced its Models double sidebar | history |
| [se-control-one-shot-2026-09-11/](se-control-one-shot-2026-09-11/START-HERE.md) | Independent Design one-shot; rulings in `return-intake.md`; no README | accepted |
| [attention-surface-2026-09-09/](attention-surface-2026-09-09/README.md) | Reference re-read and Human Attention UI route | history |
| [attention-triage-2026-09-10/](attention-triage-2026-09-10/README.md) | Attention triage ruling WK-152…160 | history |
| [attention-ui-handoff-2026-09-13/](attention-ui-handoff-2026-09-13/README.md) | Attention UI handoff, Claude return and the acceptance record in `astra-acceptance/integration.md` | accepted |
| [sidebar-product-model-2026-09-12/](sidebar-product-model-2026-09-12/README.md) | Product-model-first sidebar review; Matter and Expert notes | unknown |

### Delivery and implementation records

| Entry | What it was | Effect |
|---|---|---|
| [action-copy-cleanup-2026-09-14/](action-copy-cleanup-2026-09-14/README.md) | Entry-verb simplification and Workspace popover regrid | accepted |
| [chat-controls-2026-09-10/](chat-controls-2026-09-10/README.md) | Product icon grammar and Chat full-control inventory | accepted |
| [chat-flow-2026-09-10/](chat-flow-2026-09-10/README.md) | Chat Flow intake; the 2026-09-14 polish slices and Run-surface PR are registered inside it | unknown |
| [context-tps-motion-2026-09-13/](context-tps-motion-2026-09-13/README.md) | Context ring and request-activity candidate; production integration under `production/` | mixed; read its production README |
| [developer-control-panel-2026-09-13/](developer-control-panel-2026-09-13/README.md) | Developer panel implementation and evidence; ruling in [research](../research/developer-control-panel-2026-09-13/README.md) | accepted |
| [settings-resource-management-2026-09-13/](settings-resource-management-2026-09-13/README.md) | Settings Plugins / Developer split; author check only | history |
| [frontend-audit-2026-09-13/](frontend-audit-2026-09-13/PLAN.md) | Audit plan and evidence (icons, grammar, copy, hierarchy); no README; `hierarchy-polish-registration.md` still feeds the composition standard | history |
| [home-backlog-2026-09-10/](home-backlog-2026-09-10/README.md) | Home slice ledger frozen when construction stopped; not a live backlog | history |

## Granularity

A design unit is one question, such as the relation between long-running input and stop, evidence jump-back and return position, or the expiry conflict on candidate acceptance; it is not a source component or a whole skin. Each keeps its goal, required states, candidates, trade-offs, evidence, accessible alternative, version and recovery requirements and ruling. Split a document only when a prototype shows a divergence that can be verified on its own.
