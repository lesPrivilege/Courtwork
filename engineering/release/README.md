# Engineering release and publication records

Release packets hold handoffs, publication preparation, deployment receipts and the rulings behind public wording. They are records and preparation contracts. A release note does not by itself mean that a build was deployed, a gate was accepted or a desktop artifact shipped. Current status is [current](../current.md); the Pages source and generated-output rules are owned by [site/README.md](../../site/README.md).

Effect labels: **active** = an owner record for an open thread in [current](../current.md); **rule** = a ruling or contract other documents cite; **accepted** = a delivery whose result is already carried elsewhere; **superseded** = names its replacement; **unknown** = the packet's text does not settle it. An order that names an author to "claim" it is an order, not a claim that the work is open: follow the row's replacement or return record.

## Use now

| Question | Read | Effect |
|---|---|---|
| Which gates and pins govern public README, Pages and media, and what is open | [public-readiness](../execution/2026-09-08-main-round/public-readiness.md), then [current](../current.md#open-work) | active (owner in execution) |
| What is the latest publication receipt and its live check | [product-node-2026-09-15/deployment.md](product-node-2026-09-15/deployment.md) and [live-verification.json](product-node-2026-09-15/live-verification.json) | accepted; latest release baseline |
| What public README and Pages claims the product node ruled | [product-node-2026-09-15/](product-node-2026-09-15/README.md) | accepted |
| How Work-first wording and the definition of Court were ruled | [work-first-narrative-2026-09-11/](work-first-narrative-2026-09-11/DECISION.md); no README | rule |
| How Host check recipes and dogfooding are contracted (DF-04) | [harness-implementation-2026-09-12/harness-dogfooding.md](harness-implementation-2026-09-12/harness-dogfooding.md); the packet README is the adoption record | rule |
| How the Pages build source and evidence pins are handled | [publishing-surface-2026-09-09/](publishing-surface-2026-09-09/README.md), with [site/README.md](../../site/README.md) | rule (inputs are pinned by the build) |

## History

Read only when a question needs the earlier order, receipt or reasoning.

### Orders whose return or replacement exists

| Packet | What it was | Effect |
|---|---|---|
| [claude-paper-2026-09-11/](claude-paper-2026-09-11/PRE-PUBLISH.md) | Claude Paper serial order and pre-publish order (`ONE-SHOT.md`, `PRE-PUBLISH.md`); no README | superseded: the return is the [prepublish-v1 receipt](../research/claude-paper-return-2026-09-11/prepublish-v1/README.md) |
| [claude-ui-followthrough-2026-09-11/](claude-ui-followthrough-2026-09-11/ONE-SHOT.md) | Claude diff, Settings and Chat order; no README | superseded by [ui-publication-closure-2026-09-11](ui-publication-closure-2026-09-11/README.md) |
| [fresh-claude-pages-2026-09-11/](fresh-claude-pages-2026-09-11/README.md) | Claude A/B v2 receipt and independent Pages task preparation | superseded: Pages shipped through later packets |
| [harness-next-node-2026-09-12/](harness-next-node-2026-09-12/README.md) | Next-node index for a real Runtime and generic Harness | superseded by its own README note |
| [architecture-reconciliation-2026-09-11.md](architecture-reconciliation-2026-09-11.md) | Architecture / README figure reconciliation contract (F1-F5) | accepted |

### Publication line, in order

| Packet | What it was | Effect |
|---|---|---|
| [2026-09-08/](2026-09-08/README.md) | Merge, two-line iteration and publication handoff | accepted |
| [publishing-surface-2026-09-09/](publishing-surface-2026-09-09/README.md) | Pages candidate intake, work orders and delivery receipts | accepted (also see Use now) |
| [merged-ui-captures-2026-09-10/](merged-ui-captures-2026-09-10/README.md) | Post-merge unified captures and publication authorization | accepted |
| [public-narrative-2026-09-10/](public-narrative-2026-09-10/README.md) | Public product narrative editorial scope | accepted |
| [publishing-visuals-2026-09-10/](publishing-visuals-2026-09-10/README.md) | Pages imaging layer: semantic registry, visual grammar, QA | accepted |
| [pages-ordered-integration-2026-09-11/](pages-ordered-integration-2026-09-11/README.md) | Pages ordered integration decisions | accepted |
| [ui-publication-closure-2026-09-11/](ui-publication-closure-2026-09-11/README.md) | Icons, secondary chrome, red control and preview order and decision; replaced its predecessor | accepted |
| [work-first-narrative-2026-09-11/](work-first-narrative-2026-09-11/DECISION.md) | Work-first narrative decision (also see Use now) | rule |
| [frontend-node-2026-09-12/](frontend-node-2026-09-12/README.md) | Frontend node convergence and unified preview | accepted |
| [governed-work-loop-2026-09-12/](governed-work-loop-2026-09-12/README.md) | Governed-work-state direction ruling and deployment run | accepted |
| [harness-implementation-2026-09-12/](harness-implementation-2026-09-12/README.md) | Harness implementation package: adoption, DF-04 contract, raw v2 inputs (`inputs/*.zip` and `receipt.json` hashes are frozen) | accepted (contract text: see Use now) |
| [final-preparation-2026-09-13/](final-preparation-2026-09-13/README.md) | Pre-release preparation, merge / push / deploy receipt and audits; its own "current" wording is a snapshot, replaced by `product-node-2026-09-15` | accepted |
| [review-intake-2026-09-13/](review-intake-2026-09-13/README.md) | Release independent-review local increment decision | accepted |
| [independent-review-2026-09-14/](independent-review-2026-09-14/README.md) | GitHub independent review: local consumption and ruling; `REVIEW.md` is byte-preserved | accepted |
| [product-node-2026-09-15/](product-node-2026-09-15/README.md) | Public-node consumption and deployment receipt (also see Use now) | accepted |
