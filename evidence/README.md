# Evidence packet index

This directory holds dated, scoped evidence packets. A packet README owns its commands, source and receipt identity, scope, failures and `not_run` boundaries. This index is only a map of where each packet is, grouped by the work it belongs to; it is not a status ledger and it does not say what a packet proves. Current status is [engineering/current.md](../engineering/current.md), and the relevant contract owns each behavior.

A packet is history by default: a dated receipt pinned to the commits and inputs it names. It supports research or integration without being a product acceptance claim. Historical bytes stay addressable by packet path and receipt hashes; use a packet only when a question needs it, and read its README for boundaries.

## Where evidence is kept

- **Packets in this directory** cover work up to 2026-09-14, plus `gui-grammar-20260920`.
- **Later evidence** is kept with the execution packet that owns it, under [`engineering/execution/claude-frontend-harness-2026-09-16/evidence/`](../engineering/execution/claude-frontend-harness-2026-09-16/README.md). Find a subpacket through the owner record that cites it; `*-final-*` and `*-review-*` subpackets are the independent or parent receipts. Rules such as [verification](../engineering/verification.md) cite mostly those.
- **Research inputs** live in [research](../engineering/research/README.md); design specimens and captures live in [design](../engineering/design/README.md).
- Packets without a README (marked below) are linked by directory; their scripts and outputs are their only record.

## Packets that other documents read or cite

Do not move or edit these without following the citing document.

| Packet | Cited or read by |
|---|---|
| `main-cutover-20260908` | [AGENTS.md](../AGENTS.md), main-line lineage |
| `projectless-chat-20260913` | [app/docs/projectless-chat.md](../app/docs/projectless-chat.md) |
| `spark-agent-20260913` | [app/docs/spark-agent.md](../app/docs/spark-agent.md) |
| `backend-bounded-20260909`, `harness-next-20260909` | [app/docs/work-metrics.md](../app/docs/work-metrics.md), [app/docs/permission-cas.md](../app/docs/permission-cas.md) |
| `runtime-resolver-20260908` | [docs/runtime-control/source-resolver.md](../docs/runtime-control/source-resolver.md) |
| `be41-20260910`, `harness-core-20260908`, `work-review-actions-20260908`, `pro-review-remediation-20260908` | [docs/work-core/contract.md](../docs/work-core/contract.md) |
| `ui-maturity`, `wk10b-main-integration-20260908`, `markdown-reader-a1-20260910`, `home-composition-20260910` | [typography](../docs/typography-refinement.md), [surface assignment](../docs/surface-assignment.md), [output review](../docs/output-review.md), [interface components](../docs/interface-components.md) |
| `semantic-polish-merge-20260911` | [app/docs/example-workspace.md](../app/docs/example-workspace.md) |
| `publishing-surface-2026-09-09`, `publication-release-20260914` | Pages build pins and media manifests ([site/README.md](../site/README.md)) |
| `release-preflight-20260913` | Original public-facts map used by [public readiness](../engineering/execution/2026-09-08-main-round/public-readiness.md) |

## Packets by family

### Early acceptance and integration receipts (2026-09-07/08)

Receipts from the takeover period. `main-cutover-20260908` is the frozen cutover receipt cited by AGENTS.md.

| Packet | What it holds |
|---|---|
| [`ui-maturity`](ui-maturity/README.md) | Web UI maturity: work-surface coverage and focus continuity |
| [`final-ui-audit`](final-ui-audit/README.md) | Final UI audit |
| [`final-integration-20260908`](final-integration-20260908/README.md) | Web integration receipt after the Fable wrap-up |
| [`harness-core-20260908`](harness-core-20260908/README.md) | Harness Core implementation evidence |
| [`harness-main-integration-20260908`](harness-main-integration-20260908/README.md) | Harness Core and clean main integration |
| [`luna-two-orders-20260908`](luna-two-orders-20260908/README.md) | Luna two-order execution evidence |
| [`main-cutover-20260908`](main-cutover-20260908/README.md) | Main lineage takeover and cutover receipt |
| [`migration-independent`](migration-independent/README.md) | Independent acceptance of the Fresh integration |
| [`node2-independent`](node2-independent/README.md) | Independent second self-contained node integration |
| [`pro-review-remediation-20260908`](pro-review-remediation-20260908/README.md) | Consumption and remediation of a Pro review |
| [`reconciliation-20260908`](reconciliation-20260908/README.md) | Reconciliation, merge and directory freeze |
| [`remote-recovery-20260908`](remote-recovery-20260908/README.md) | Remote recovery acceptance |
| [`runtime-resolver-20260908`](runtime-resolver-20260908/README.md) | Runtime source resolver, isolated backend evidence |
| [`se-continuity-20260908`](se-continuity-20260908/README.md) | SE continuity benchmark starting evidence |
| [`work-review-actions-20260908`](work-review-actions-20260908/README.md) | Work review action and renderer seam |

### Work Surface Kit (wk*)

Module rail, alignment, composer hierarchy and their main integrations.

| Packet | What it holds |
|---|---|
| [`wk6`](wk6/README.md) | Browser, Home composer and brand checks |
| [`wk7`](wk7/README.md) | Colour and contrast measurements |
| [`wk10a`](wk10a/README.md) | WK10a module rail, alignment band, composer hierarchy |
| [`wk10a-r2`](wk10a-r2/README.md) | WK10a recheck |
| [`wk10b-main-integration-20260908`](wk10b-main-integration-20260908/README.md) | WK10b first-stage main integration |
| [`wk10b2-main-integration-20260908`](wk10b2-main-integration-20260908/README.md) | WK10b second-stage main integration |
| [`wk11-main-integration-20260909`](wk11-main-integration-20260909/README.md) | WK11 and fourth-round handoff main integration |
| [`wk12-main-integration-20260909`](wk12-main-integration-20260909/README.md) | WK12 main integration |
| [`wk13-main-integration-20260908`](wk13-main-integration-20260908/README.md) | WK13 r2 main integration |

### Home, Settings and Work surfaces (cc-*)

| Packet | What it holds |
|---|---|
| [`cc-d0a`](cc-d0a/README.md) | Home module band and shell |
| [`cc-s`](cc-s/README.md) | Settings replaces global navigation |
| [`cc-w`](cc-w/README.md) | Work surface: primary/secondary switch and tab strip |
| [`cc-s-main-integration-20260909`](cc-s-main-integration-20260909/README.md) | Settings main integration |
| [`cc-w-main-integration-20260909`](cc-w-main-integration-20260909/README.md) | Work surface main integration |
| [`ccd0a-main-integration-20260910`](ccd0a-main-integration-20260910/README.md) | Home shell main integration |

### Frontend work orders (fe*, att-fe01, sd-01, pv-*, vg01, rc, ci-b-f)

The `pv-sd-independent-*` and `pv-verify-route-*` packets are independent (non-author) rechecks.

| Packet | What it holds |
|---|---|
| [`fe01-main-integration-20260909`](fe01-main-integration-20260909/README.md) | FE-01 main integration |
| [`fe02-main-integration-20260909`](fe02-main-integration-20260909/README.md) | FE-02 main integration |
| [`fe03`](fe03/README.md) | FE-03 Chat / Work / Memory shell |
| [`fe03-main-integration-20260909`](fe03-main-integration-20260909/README.md) | FE-03 main integration |
| [`fe04`](fe04/README.md) | FE-04 primitive reconciliation |
| [`fe04-main-integration-20260909`](fe04-main-integration-20260909/README.md) | FE-04 main integration |
| [`fe05a`](fe05a/README.md) | FE-05a defect fixes, shape grammar and type density |
| [`att-fe01`](att-fe01/README.md) | Attention disposition surface |
| [`sd-01`](sd-01/README.md) | Spark sample surface |
| [`pv-be02`](pv-be02/) | PV backend verification (no README) |
| [`pv-be03`](pv-be03/) | PV backend verification (no README) |
| [`pv-fe01`](pv-fe01/README.md) | Connection and model surfaces consuming real connections |
| [`pv-fe02`](pv-fe02/) | PV-FE02 verification (no README) |
| [`pv-sd-independent-backend-20260910`](pv-sd-independent-backend-20260910/README.md) | Independent PV backend probes |
| [`pv-sd-independent-frontend-20260910`](pv-sd-independent-frontend-20260910/README.md) | Independent PV-FE02 frontend review |
| [`pv-sd-independent-pv54-20260910`](pv-sd-independent-pv54-20260910/README.md) | Independent PV-54 extraction recheck |
| [`pv-sd-independent-spark-20260910`](pv-sd-independent-spark-20260910/README.md) | Independent SD-01 verification |
| [`pv-sd-integration-20260910`](pv-sd-integration-20260910/README.md) | PV and Spark sample integration receipt |
| [`pv-verify-route-independent-654411e-20260910`](pv-verify-route-independent-654411e-20260910/README.md) | Independent PV route and migration recheck |
| [`vg01-main-integration-20260910`](vg01-main-integration-20260910/README.md) | VG01 main integration |
| [`rc`](rc/README.md) | Runtime Control UI |
| [`ci-b-f`](ci-b-f/) | CI-B/F full-suite runs (no README) |
| [`cs01-ci-bf-integration`](cs01-ci-bf-integration/README.md) | CS-01 with CI-B/F integration |
| [`home-composer-independent`](home-composer-independent/README.md) | Independent Home composer acceptance |

### Backend deliveries (2026-09-09 to 2026-09-13)

The contracts these delivered live in `docs/work-core/` and `app/docs/`; several packets are cited from there (see the dependency list below).

| Packet | What it holds |
|---|---|
| [`async-loop-20260909`](async-loop-20260909/README.md) | AM-B adapted read loop |
| [`async-loop-20260910`](async-loop-20260910/README.md) | AsyncTasks projection and integration |
| [`attention-agent-20260910`](attention-agent-20260910/README.md) | Global Attention agent |
| [`attention-backend-20260909`](attention-backend-20260909/README.md) | ATT-BE-01 backend delivery |
| [`attention-human-loop-20260909`](attention-human-loop-20260909/README.md) | Attention human-loop fixtures |
| [`attention-independent-20260909`](attention-independent-20260909/README.md) | Independent Attention counterexamples and integration review |
| [`backend-attempts-20260910`](backend-attempts-20260910/README.md) | Run attempt lineage (BG-02) |
| [`backend-bounded-20260909`](backend-bounded-20260909/README.md) | Bounded backend delivery receipt |
| [`backend-bounded-main-integration-20260909`](backend-bounded-main-integration-20260909/README.md) | Bounded backend main integration |
| [`backend-dispatch-20260909`](backend-dispatch-20260909/README.md) | Backend dispatch evidence |
| [`backend-governance-20260910`](backend-governance-20260910/README.md) | Governed object directory and Matter disclosure (BG-01) |
| [`be41-20260910`](be41-20260910/README.md) | BE-41 backend author delivery |
| [`bg02-main-integration-20260910`](bg02-main-integration-20260910/README.md) | BG-02 main integration |
| [`harness-next-20260909`](harness-next-20260909/README.md) | Next Harness backend delivery |
| [`harness-next-main-integration-20260909`](harness-next-main-integration-20260909/README.md) | BE-30, AM and ES-01 main integration |
| [`multi-agent-20260910`](multi-agent-20260910/README.md) | Multi-agent first slice |
| [`runtime-source-service-20260910`](runtime-source-service-20260910/README.md) | Runtime source resolver HTTP seam (BE-5) |
| [`runtime-source-service-integration-20260910`](runtime-source-service-integration-20260910/README.md) | BE-5 non-author review and integration |
| [`rv26-20260910`](rv26-20260910/README.md) | RV26 baseline and first slice |
| [`rv26-q02-20260910`](rv26-q02-20260910/README.md) | RV26-Q02 configuration validation and failed publication |
| [`rv26-q02-independent`](rv26-q02-independent/) | RV26-Q02 edge check (no README) |
| [`spark-delivery-20260910`](spark-delivery-20260910/README.md) | Spark integration repairs, author check |
| [`spark-agent-20260913`](spark-agent-20260913/README.md) | Spark Agent implementation |

### Summary, semantics, skin, Home, Chat and presence

| Packet | What it holds |
|---|---|
| [`summary-be41-construction-20260911`](summary-be41-construction-20260911/README.md) | Summary, SD-ENTRY and BE-41 self-contained node |
| [`summary-disclosure-20260910`](summary-disclosure-20260910/README.md) | Summary directory and stable reading hierarchy |
| [`semantic-polish-20260911`](semantic-polish-20260911/README.md) | WO-VS-01 local candidate delivery |
| [`semantic-polish-merge-20260911`](semantic-polish-merge-20260911/README.md) | Semantic polish and Pages integration |
| [`skin-boundary-sk2-20260910`](skin-boundary-sk2-20260910/README.md) | Appearance boundary and compatibility |
| [`skin-review-sk1-20260910`](skin-review-sk1-20260910/README.md) | Fixed Review semantic role |
| [`dystopia-sk3-20260910`](dystopia-sk3-20260910/README.md) | Dystopia and live appearance verification |
| [`home-backlog-20260910`](home-backlog-20260910/) | Home backlog slices (no README) |
| [`home-composition-20260910`](home-composition-20260910/README.md) | Home composition delivery |
| [`chat-shell-proportion-20260910`](chat-shell-proportion-20260910/) | Chat shell proportion before/after captures (no README) |
| [`delivery-rollup-20260910`](delivery-rollup-20260910/README.md) | Sequential delivery rollup |
| [`convergence-20260911`](convergence-20260911/README.md) | Convergence node |
| [`design-handoff-20260911`](design-handoff-20260911/README.md) | SE control Design handoff and scoped acceptance |
| [`attention-chat-closure-20260910`](attention-chat-closure-20260910/README.md) | Attention Chat closure, author evidence |
| [`markdown-reader-a1-20260910`](markdown-reader-a1-20260910/README.md) | Fixed Markdown reading delivery |
| [`markdown-review-20260910`](markdown-review-20260910/README.md) | Markdown Review A0 |
| [`expert-sidebar-glyph-20260912`](expert-sidebar-glyph-20260912/README.md) | Expert sidebar in-work verification |
| [`agent-presence-convergence-20260912`](agent-presence-convergence-20260912/README.md) | Presence final convergence |
| [`agent-presence-review-20260912`](agent-presence-review-20260912/README.md) | Presence visual ruling and scrape fix |
| [`response-action-audit-20260912`](response-action-audit-20260912/README.md) | Response actions optical audit |
| [`work-review-object-card-20260913`](work-review-object-card-20260913/README.md) | Independent work-object card |
| [`projectless-chat-20260913`](projectless-chat-20260913/README.md) | Optional-workspace Chat |

### Pages, publication, brand and Paper

`publishing-surface-2026-09-09` and `publication-release-20260914` are read by the Pages build or its media manifests; treat their paths as pinned.

| Packet | What it holds |
|---|---|
| [`pages-first-edition-20260910`](pages-first-edition-20260910/README.md) | First Pages edition integration |
| [`pages-main-20260910`](pages-main-20260910/README.md) | Current-main product-page media |
| [`pages-main-visual-20260910`](pages-main-visual-20260910/README.md) | Pages and parallel delivery integration |
| [`pages-polish-20260910`](pages-polish-20260910/README.md) | Pages polish |
| [`pages-primary-entries-20260910`](pages-primary-entries-20260910/README.md) | Primary Paper and Tour chapters |
| [`pages-product-life-20260910`](pages-product-life-20260910/README.md) | Pages product-life surfaces |
| [`pages-v3-20260911`](pages-v3-20260911/README.md) | Pages v3 integration and verification |
| [`pages-common-red-20260911`](pages-common-red-20260911/README.md) | Pages common-red repair |
| [`publishing-surface-2026-09-09`](publishing-surface-2026-09-09/README.md) | Pages continuity inputs and tests |
| [`publishing-visuals-20260910`](publishing-visuals-20260910/README.md) | Publishing visuals figure verification |
| [`publication-final-20260911`](publication-final-20260911/) | Final publication media scripts (no README) |
| [`publication-fast-review-20260912`](publication-fast-review-20260912/README.md) | Post-merge fast review of public surfaces |
| [`publication-integrated-20260912`](publication-integrated-20260912/README.md) | Integrated frontend publication |
| [`publication-release-20260914`](publication-release-20260914/README.md) | Publication screenshots |
| [`cleanup-20260910`](cleanup-20260910/README.md) | Publication and brand interface cleanup |
| [`public-repository-cleanup-20260910`](public-repository-cleanup-20260910/README.md) | Repository navigation and public-data cleanup |
| [`dark-authored-20260911`](dark-authored-20260911/README.md) | Dark authored surface correction |
| [`paper-release-review-20260911`](paper-release-review-20260911/) | Paper release review (no README) |
| [`work-loop-public-copy-20260912`](work-loop-public-copy-20260912/README.md) | Work loop public copy |
| [`ui-followthrough-integration-20260911`](ui-followthrough-integration-20260911/README.md) | UI follow-through integration |
| [`se-design-return-20260911`](se-design-return-20260911/README.md) | Design return review delivery |
| [`fable-partial-review-20260911`](fable-partial-review-20260911/README.md) | Fable partial review |
| [`fable-stage1-integration-20260911`](fable-stage1-integration-20260911/README.md) | Fable Stage 1 independent receipt and composition check |
| [`claude-v2-intake-20260911`](claude-v2-intake-20260911/README.md) | Claude v2 intake and Pages handoff verification |
| [`deepseek-runtime-intake-20260911`](deepseek-runtime-intake-20260911/README.md) | Runtime architecture document preparation, author verification |
| [`secondary-material-review-20260912`](secondary-material-review-20260912/README.md) | Secondary floating surfaces review |

### Release preflight (2026-09-13)

Pre-release gates for the 2026-09-13/14 publication.

| Packet | What it holds |
|---|---|
| [`release-core-summary-20260913`](release-core-summary-20260913/README.md) | Core Review summary delivery |
| [`release-input-binding-20260913`](release-input-binding-20260913/README.md) | Synthetic input binding combinations |
| [`release-mcp-failures-20260913`](release-mcp-failures-20260913/README.md) | MCP failure combinations (DF-06) |
| [`release-preflight-20260913`](release-preflight-20260913/README.md) | Serial preflight; `public-facts.md` is the original public-facts map |
| [`release-readiness-20260913`](release-readiness-20260913/README.md) | Release readiness |
| [`release-test-contract-20260913`](release-test-contract-20260913/README.md) | Default test and independent Runtime check |

### Grammar convergence

| Packet | What it holds |
|---|---|
| [`gui-grammar-20260920`](gui-grammar-20260920/README.md) | G4 cross-surface visual state matrix, candidate evidence |
