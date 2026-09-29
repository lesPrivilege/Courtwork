# Engineering execution packets

Execution packets record assignments, authors, contracts and deliveries. A packet README owns its scope, writer, dependencies and boundaries; these packets are not a status ledger. Where the work stands is [current](../current.md); each active thread there links its owner record in this directory.

Effect labels: **active** = an owner record for a thread that [current](../current.md) lists; **rule** = contract or method text that other documents cite; **accepted** = a delivery whose contracts now live elsewhere; **superseded** = names its replacement; **frozen input** = read byte-for-byte by a build; **unknown** = the packet's text does not settle it.

## Use now

### The live packet: claude-frontend-harness-2026-09-16

[claude-frontend-harness-2026-09-16/](claude-frontend-harness-2026-09-16/README.md) is the serial frontend and real-Harness integration packet and the owner of almost all work since 2026-09-16, including its `evidence/` subpackets. The name `claude-frontend-harness-20260916` seen in prose (verification, node acceptance, intake) is a worktree and branch label, not a second packet; there is no such directory in the repository.

Its README is a construction order with dated banners. Its "Current continuation (2026-09-24)" section and the two earlier "Current" banners are historical snapshots, superseded by [current](../current.md). Route by owner record, not by the banners.

| Owner record | Serves | Effect |
|---|---|---|
| [ux-polish-release-20260924.md](claude-frontend-harness-2026-09-16/ux-polish-release-20260924.md) | UX queue and the UX ownership rulings | active |
| [core-runtime-loop-20260921.md](claude-frontend-harness-2026-09-16/core-runtime-loop-20260921.md) | Host, Runtime and Core lane; Hermes boundary; external-recall ownership ruling | active |
| [03-check-recipe.md](claude-frontend-harness-2026-09-16/03-check-recipe.md) | Fixed check recipes run from the product (DF-04, writes back to [RD-009](../research/RD-009-trusted-harness-extensions.md)) | rule |
| [next-dispatch-20260921.md](claude-frontend-harness-2026-09-16/next-dispatch-20260921.md) | Routing record for bounded author batches; its newest section is the routing note | rule (routing) |
| [06b-dogfood-friction-20260920.md](claude-frontend-harness-2026-09-16/06b-dogfood-friction-20260920.md) | Dogfood friction and request-summary work; dormant residuals in current | accepted; residuals in [current](../current.md#dormant-residuals) |
| [06c-runtime-management-20260921.md](claude-frontend-harness-2026-09-16/06c-runtime-management-20260921.md) | Runtime management surface; live management deferred in current | accepted; deferred row in [current](../current.md#open-work) |

Contracts of delivered capabilities (final receipts are the `*-final-*` subpackets under `evidence/`):

| Contract | Serves | Effect |
|---|---|---|
| [kit-run-binding-20260922.md](claude-frontend-harness-2026-09-16/kit-run-binding-20260922.md) | Kit and Role to Run binding; cited by [architecture](../architecture.md) | rule |
| [runtime-selection-contract-20260923.md](claude-frontend-harness-2026-09-16/runtime-selection-contract-20260923.md), [runtime-selection-r1-20260923.md](claude-frontend-harness-2026-09-16/runtime-selection-r1-20260923.md) | Runtime selection | rule |
| [p03c-host-consumer-contract-20260921.md](claude-frontend-harness-2026-09-16/p03c-host-consumer-contract-20260921.md), [p03c-agents-transport-20260921.md](claude-frontend-harness-2026-09-16/p03c-agents-transport-20260921.md), [p03b-pi-runtime-port-20260921.md](claude-frontend-harness-2026-09-16/p03b-pi-runtime-port-20260921.md) | Host consumer, Agents API transport and Pi Runtime port | rule |
| [local-pi-worker-loop-20260922.md](claude-frontend-harness-2026-09-16/local-pi-worker-loop-20260922.md), [live-assistant-text-streaming-20260916.md](claude-frontend-harness-2026-09-16/live-assistant-text-streaming-20260916.md) | Local Pi worker and live streaming; their headers are pickup-time statements | accepted; residuals in [current](../current.md#dormant-residuals) |
| [kit-context-core-20260922.md](claude-frontend-harness-2026-09-16/kit-context-core-20260922.md), [kit-profile-preview-20260923.md](claude-frontend-harness-2026-09-16/kit-profile-preview-20260923.md), [kit-profile-editor-20260923.md](claude-frontend-harness-2026-09-16/kit-profile-editor-20260923.md) | Kit context, profile preview and profile editor | accepted |

### Public readiness

[2026-09-08-main-round/](2026-09-08-main-round/README.md): the README, the resolver-service order and the Core handoff are the first post-takeover dispatch (accepted). [public-readiness.md](2026-09-08-main-round/public-readiness.md) (with [g5-fact-map-20260928.md](2026-09-08-main-round/g5-fact-map-20260928.md)) is the owner of the public gates and stays active; see also [release](../release/README.md).

### Frozen input to the Pages build

[2026-09-10-benchmark-series/](2026-09-10-benchmark-series/README.md): its `README.md` is byte-pinned by `site/build.mjs`, and the whole directory is part of the Pages content digest. Do not edit it without updating the pin. Individual briefs BM-02…05 carry their own state.

## History

Read only when a question needs the earlier assignment or its reasoning.

### Accepted slice records in the live packet

These per-slice construction records were accepted at [node-acceptance-20260919.md](claude-frontend-harness-2026-09-16/node-acceptance-20260919.md) (which keeps the N-list of residuals); contract authority sits in their owner documents, not here. Opening headers are dated pickup statements.

[00-intake](claude-frontend-harness-2026-09-16/00-intake.md), [01-workspace-binding](claude-frontend-harness-2026-09-16/01-workspace-binding.md), [02-candidate-write](claude-frontend-harness-2026-09-16/02-candidate-write.md), [04-run-surface](claude-frontend-harness-2026-09-16/04-run-surface.md), [05-models-composer](claude-frontend-harness-2026-09-16/05-models-composer.md), [06-capability-consumption](claude-frontend-harness-2026-09-16/06-capability-consumption.md), [07-commands-compaction](claude-frontend-harness-2026-09-16/07-commands-compaction.md), [08-presentation](claude-frontend-harness-2026-09-16/08-presentation.md), [09-navigation-commands](claude-frontend-harness-2026-09-16/09-navigation-commands.md), [p-home-identity](claude-frontend-harness-2026-09-16/p-home-identity.md), [frontend-entry-audit](claude-frontend-harness-2026-09-16/frontend-entry-audit.md), [sidebar-trace-review](claude-frontend-harness-2026-09-16/sidebar-trace-review.md).

Later accepted slices and orders: [06-agents-frontend-first-20260920](claude-frontend-harness-2026-09-16/06-agents-frontend-first-20260920.md), [06a-agents-profile-journey-20260920](claude-frontend-harness-2026-09-16/06a-agents-profile-journey-20260920.md), [06d-surface-continuity-20260921](claude-frontend-harness-2026-09-16/06d-surface-continuity-20260921.md), [06e-role-composer-selection-20260922](claude-frontend-harness-2026-09-16/06e-role-composer-selection-20260922.md), [11-coding-dogfood-handoff-20260920](claude-frontend-harness-2026-09-16/11-coding-dogfood-handoff-20260920.md), [gui-grammar-convergence-20260919](claude-frontend-harness-2026-09-16/gui-grammar-convergence-20260919.md), [orchestra-start-node-20260919](claude-frontend-harness-2026-09-16/orchestra-start-node-20260919.md).

Superseded in the live packet: [home-layout-zoning-pr-20260919](claude-frontend-harness-2026-09-16/home-layout-zoning-pr-20260919.md) (absorbed by the grammar convergence order) and [frontend-backend-live-integration-20260922](claude-frontend-harness-2026-09-16/frontend-backend-live-integration-20260922.md) (routing snapshot, replaced by `next-dispatch-20260921.md`).

Unknown: [orchestra-pages-registration-20260919](claude-frontend-harness-2026-09-16/orchestra-pages-registration-20260919.md), a deferred Pages revision that `site/README.md` cites.

### Other packets

Every one of these is accepted history unless marked otherwise; the contracts they delivered live in `docs/`, `app/docs/` and the owner documents named in each README.

| Packet | What it was | Effect |
|---|---|---|
| [2026-09-08-luna-two-orders/](2026-09-08-luna-two-orders/README.md) | Luna clarity pilot and Core capability verification orders | accepted |
| [2026-09-08-two-lines/](2026-09-08-two-lines/README.md) | Merge recheck and publishing-surface line; its `evidence/` and `explore/` are packet-owned supporting material | accepted |
| [2026-09-09-async-loop/](2026-09-09-async-loop/README.md) | AM-B adapted read-task contract | accepted |
| [2026-09-09-attention/](2026-09-09-attention/README.md) | ATT-BE-01 Attention backend contract; live contract is [docs/work-core/attention.md](../../docs/work-core/attention.md) | accepted |
| [2026-09-09-backend-bounded/](2026-09-09-backend-bounded/README.md) | Activity and Usage backend batch | accepted |
| [2026-09-09-backend-dispatch/](2026-09-09-backend-dispatch/README.md) | Independent backend dispatch | accepted |
| [2026-09-09-execution-state/](2026-09-09-execution-state/README.md) | ES-01 exact-file candidate PR preparation | accepted |
| [2026-09-09-harness-next/](2026-09-09-harness-next/README.md) | Next-round parallel and serial plan | accepted |
| [2026-09-10-backend-governance/](2026-09-10-backend-governance/README.md) | BG-01/02 claims, rulings and delivery; contract in [docs/work-core/governance.md](../../docs/work-core/governance.md); `input.txt` is a raw user input | accepted |
| [2026-09-10-chat-shell-proportion/](2026-09-10-chat-shell-proportion/README.md) | WO-CS-01 shell proportion, author delivery only | unknown |
| [2026-09-10-harness-pro-review.md](2026-09-10-harness-pro-review.md) | Pro architecture review request packet | accepted |
| [2026-09-10-next-round/](2026-09-10-next-round/README.md) | Next-round preparation and consumption audit | superseded by `2026-09-11-merge-node` |
| [2026-09-10-summary-disclosure/](2026-09-10-summary-disclosure/README.md) | R2-SD01 summary, local disclosure and same-object tab | accepted |
| [2026-09-11-claude-handoff/](2026-09-11-claude-handoff/README.md) | Claude frontend-line wrap-up handed to Astra | accepted (received by `2026-09-11-claude-intake`) |
| [2026-09-11-claude-intake/](2026-09-11-claude-intake/README.md) | Receipt and adjudication of that handoff | accepted |
| [2026-09-11-merge-node/](2026-09-11-merge-node/README.md) | Merge and push node ruling with three-way audit; includes machine inventories | accepted |
| [2026-09-11-semantic-polish/](2026-09-11-semantic-polish/README.md) | WO-VS-01 semantic polish roadmap and registry plan; the registry lives in [design/product-semantics](../design/product-semantics/README.md) | accepted |
| [2026-09-11-summary-be41-dispatch/](2026-09-11-summary-be41-dispatch/README.md) | Summary and BE-41 claim order | accepted |
