# WO-VS-01 final surface disposition

2026-09-11 · Astra architecture, implementation and author visual judgement. Product `f99af4695aa5796e703286b0875ec5663cc22c85`; baseline `590739fa3d1bc401905261172260143e36e82c5e`. Local candidate completion, no main integration or deployment. Fixed source inventories remain historical; this page closes their per-surface disposition without rewriting baseline facts.

The [source inventory](inventory/app-surfaces.json) owns the baseline entry paths, datum/action owners, capabilities, states, nearest implementations and test methods. The [Pages inventory](inventory/pages-surfaces.json), [donor decisions](inventory/donor-review.md) and [glyph inventory](inventory/glyph-consumers.json) are complementary. Source counts do not imply all runtime states were visually exercised. The tables below distinguish new visual evidence from retained behavior covered by source review and tests. Every row's backend authority remains its existing owner; a KEEP decision is a deliberate unchanged path, not a new capability claim.

## App surfaces

| Inventory surface | Disposition and final representation | Nearest precedent / affected grammar | Verification and residual boundary |
|---|---|---|---|
| home | COMPRESS false time/status buckets to Your work / Continue; Attention items queue; text-only reserved identities | homeSets, work-summary adapters; default glance and navigation | 1440 light baseline/dark candidate; pending question render and failed row route regression; non-author f99 closure. No new today or model measurement. |
| chat | KEEP summary/composer; ADAPT Copy/Edit/More and response actions; Work summary, Question and Approval semantics | user-message, ui-controls, archived 2361a83 renderer; message actions, tooltip/ARIA, stable captured identity | Production 1440 dark plus real pending/answered 390 light/large; synthetic action matrix light/dark/error/streaming. G01–06 remain missing production lifecycle contracts. |
| work.workspace | KEEP Workspace, current-file tree and disclosure; map file/object controls through shared registry where migrated | work-surface-tabs, workspace-view, surface modules; tab/close/focus grammar | Source/render/full-suite checks and actual adjacent Inspector/Workspace navigation. No independent complete extension renderer matrix. |
| work.run | COMPRESS visible tab/title to Work; retain stopping/unknown and exact run identifiers in inspection | summary-disclosure and Inspector; summary versus exact information | Summary/card/shell tests plus real narrow/wide entry; stopping drilldown correction independently verified. No lifecycle rename in API. |
| review | KEEP rules/findings/candidate/decision authority; remove borrowed identity glyphs | WorkPacket projection, surface-modules and fallback reader; sparse evidence and decisions | Source semantics and existing Work Core/review/recovery tests in full suite. Visual redesign not undertaken; no new formal acceptance. |
| work.file | DISCLOSE full hash in Version details; preserve current versus recorded target, compact contextual menu | execution-file/content-version reader, existing file menu; exact target and disclosure | Inspector real file preview plus exact path/hash/epoch negative tests. Open-with/Save/Reveal remain unavailable without lifecycle contract. |
| work.inspector | VISUALIZE per-request host duration; COMPRESS input/output/turn facts; DISCLOSE tool activity, exact requests, recorded context and trace | telemetry-view, projectThread, native details; Glance → Inspect → Trace | 1440/1280/390 light/dark captures, refresh preserves disclosure, final 390 follow-up. No span tree or provider clock inferred. |
| attention.queue | KEEP service states/actions and refusal/recovery; clarify Attention items versus assistant identity | attention-view and attention API; queue/detail and approval action | Baseline populated queue/detail browser; attention/triage/recovery tests and semantic gate. No extra Inbox authority or scheduler. |
| attention.assistant | DISCLOSE Conversations by existing control; use shared response/file actions and Approval request | attention-conversation, attention-agent-view; management disclosure and action row | Empty assistant real browser, shared action fixtures and agent/recovery tests; no claim of live cross-project memory. |
| attention.coordination | KEEP existing communication-only disclosure and thread receipt states | coordination-projection/view; existing disclosure and status vocabulary | Source review and coordination tests. No new handoff/execution centre; no new standalone visual matrix. |
| spark | COMPRESS explanation to recorded source changes, keep stale/current/no-source/sample distinction; text identity | spark-projection/view, existing live/sample boundary; freshness description and dialog tabs | Real Overview/Activity and Escape; existing live/snapshot/sample/recovery tests. Rebuild and full recovery gates remain separate. |
| settings | COMPRESS repeated facts; DISCLOSE low-frequency setup/host data, preserve decisive scope/policy/binding | settingsRow, preferences governance, runtime projection; nine groups below | Actual narrow sweep and selected screenshots, 120-test independent slice plus full regression. Does not add missing integrations. |
| usage | VISUALIZE oriented Monday-first calendar and model comparison; DISCLOSE exact day/model tables and definitions | home calendar, usage-projection and snapshot drilldown; measured comparison and accessible navigation | Matched-observation comparison; ArrowRight/End/Enter/Escape; 390/1440 screenshots. UTC, incomplete and cache overlap retained; no billing/quota claim. |
| telemetry | VISUALIZE host elapsed per request with first-output/text marks; DISCLOSE exact values/absence | request-telemetry owner and requestMeasurements; each row's own time origin | Invalid/partial/zero/negative/order test cases and non-author closure. Provider TTFT/decode TPS remain BE-42, not synthesized. |

## All Settings groups

All nine groups were read through the source inventory. Appearance was exercised to change and restore theme, text and motion. The other eight groups were visited during the combined real browser work; the seven-group 390 large-text sweep records DOM widths in the evidence JSON. This is not a screenshot claim for every state of every group.

| Group | Disposition / nearest precedent | Evidence and limit |
|---|---|---|
| General | DISCLOSE Host details; KEEP New chats/file access; settingsRow | Baseline and final 390 light large screenshot; polling/open-state tests |
| Appearance | KEEP local preference controls and preview; createPreferenceGovernance | Actual Light/Dark/System, Medium/Large, reduced-motion selection; restored defaults at handoff |
| Models | COMPRESS Saved/default/bound facts, DISCLOSE diagnostics; existing model picker/catalog | Baseline screenshot, real final narrow visit; provider/catalog matching and configuration tests |
| Tools & Integrations | COMPRESS plain tool inventory; DISCLOSE MCP setup/installed lifecycle; runtime resource row | Final 390 screenshot, null-child regression and unchanged exposure/policy scope tests; setup remains host-configured |
| Skills | KEEP lifecycle/exposure control, share null-child fix; runtime resource row | Final narrow visit + runtime tests; no new lifecycle |
| Memory | KEEP truthful absent adapter state; settingsRow | Final narrow visit + Settings tests; no memory backend invented |
| Permissions | KEEP explicit ceilings/scopes and per-action distinction; permission policy view | Final narrow visit + permission/recovery tests; no authorization expansion |
| Keyboard | KEEP existing shortcuts; keyboard preference rows | Final narrow visit + navigation tests; native/IME not exercised |
| Developer | KEEP diagnostics and extension lifecycle; existing runtime workbench | Final narrow visit + runtime tests; low-level vocabulary is deliberate diagnostic context |

## Seven overlay families

| Inventory overlay | Disposition / affected grammar | Verification and limitation |
|---|---|---|
| run_history | COMPRESS visible navigation to Work history; KEEP Session/Run scope and native dialog | Existing card/startup/history tests; original run identities unchanged |
| edit_message | KEEP immutable edit-as-new draft; ADAPT Chat action entry | Real action fixture and handler tests; no auto-send or original rewrite |
| context_summary | KEEP contextual navigation; align Work and Matter words | Actual Chat overview entry and card/UI-event tests; navigation conveys no new authority |
| connection | KEEP requested/saved/bound distinction, file-access scope and model picker | Model/provider/UI-event tests; no new paid provider or live credential test |
| materials | KEEP Session file list, validation/retry and exact open target | Material/Markdown tests and file menu fixture; upload/network states not all freshly screenshot |
| project_and_session | KEEP native creation and uncertain-receipt recovery | Synthetic fixture creates both through real HTTP; startup/idempotency/recovery suite; no new lifecycle actions |
| toast_and_connection_status | KEEP status live region; shared actions report error/unavailable truthfully | Synthetic error/busy action browser state and startup/UI-event tests; native SR and physical network-loss not run |

## Pages routes and media

The nine generated product routes plus the homepage share Product · Experts · Eval · Pricing · Download; Paper and research depth remain reachable. The homepage archive-paper hero geometry is retained, two CTAs remain, and product proof moves directly after it. The [Pages ruling](pages.md) records the superseded navigation/IA choices and nearest existing rendering/figure precedents.

| Route | Disposition | Evidence and boundary |
|---|---|---|
| index | KEEP archive hero; COMPRESS primary path; DISCLOSE architecture/research | Side-by-side baseline/candidate 1440 author comparison; old specimen bytes unchanged |
| tour | VISUALIZE via preserved 13 blank capture slots, grouped Start/Know/Judge/Specialize/Control | 390 author screenshot and navigation check; five links ≥44px, document width 390 after fix |
| features | COMPRESS pillars around actual product concepts, Models/tools replaces Runtime pillar | Build/link/semantic source checks; no separate final full-page visual claim |
| experts | COMPRESS roles around Matter/Experts/Review, technical explanation secondary | 1280 author screenshot and figure checks |
| eval | KEEP existing evaluation/method content; ADAPT shared navigation and secondary research links | Build/link/public-data checks; no new measured benchmark claims |
| cli | KEEP frozen CLI specimen and provenance; ADAPT shared navigation | Build/link/capture provenance checks; no new CLI execution capture |
| models | COMPRESS choice/integration language; DISCLOSE diagnostic depth | Build/link/copy source review; no claim all providers were live-tested |
| data | KEEP accurate local/external boundary, COMPRESS engineering terminology | Build/link/source checks; no new privacy or hosting capabilities |
| get | COMPRESS acquisition path, retain source installation detail | Actual desktop acquisition dialog/Escape/focus-return check; no download invented |
| changelog | COMPRESS visible entries to user outcomes, preserve dated source links | Build/link/source checks; no rewriting historical artifacts |
| index#pricing (homepage section, not a separate route) | KEEP user-specified fictional offers/prices; ADAPT Professional/Organization product wording | 390 selection and ArrowRight focus/selection, correct diagram; no purchase/subscription action |

The route list in build metadata is derived from rendered pages. The same semantic keys map 13 capture slots and 10 figure records; existing file-backed SVG bytes remain unchanged. Capture status stays pending and source remains null. These are intentional user-requested blank slots, not failed evidence or screenshots from the current candidate.

## Closure and deliberately bounded checks

[Final delivery](../../../evidence/semantic-polish-20260911/README.md) contains the 767/767 suite, smoke, lint/build checks and independent review closures. The registry/raw-copy gates cover their declared lexical/mapping scope; they do not prove every dynamic error string or every translated locale. New product copy is primarily English; existing Chinese Pages content is retained, not a complete localization audit.

Astra accepts this local polish candidate within the enumerated evidence. Authors do not claim independent acceptance of their code. Native VoiceOver, IME, forced-colors, actual browser 200% reflow, a full Pages dark matrix, all multi-model/long-path end-to-end permutations, and an end-user five-second study were not performed. Existing automated counterexamples and the selected real-browser narrow/large-text checks provide bounded coverage; native/release qualification remains open. None of these is silently converted to “pass” or treated as a reason to invent a new backend. No known blocking defect remains in the newly implemented paths after the documented fixes.
