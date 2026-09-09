# Home composition · 2026-09-10

Astra implements and adjudicates from `00b2f2886e04aa7b7facb588d4375a246f3e341d`; Luna provides bounded source and non-author verification. This document supersedes the geometry/admission assumptions of CC-D0-a for this delivery, following the user's explicit Home composition request. [Evidence](../../../evidence/home-composition-20260910/README.md).

## Composition and service boundaries

Default `Modules`: Attention + Activity precede the desktop composer, then Today and concrete work. Mobile retains reading order with the composer docked below. Explicit `Simple` preference remains. Modules use a finite 24px composer lead instead of the former 56%-height anchor; 820px column maximum, 24px desktop card gap and 16px narrow gap. Attention has a raised paper surface; Activity a recessed instrument surface. No decorative left rail. The two-item Attention page leaves room for the first human request.

| Surface | Source and meaning | Interaction |
|---|---|---|
| Activity | `/work-activity?days=28|84`; server UTC startedAt buckets, run.id dedup, retained records complete, historical coverage unknown | Exact daily count, roving arrow-key inspection; no inference from summary paging or deleted history |
| Home Attention | Project-scoped `/attention/query` registry; page size 2; first-item inspect only when identity and revision match | Independent project scope, paging, read-only detail, independent workspace entrance |
| Attention workspace | Same registry/exact status query and detail routes; page size 20 | Master-detail, recorded sources/basis/relations as inert text; no acknowledge/resolve controls |
| Assistant | Local frontend design preview, per explicit user authorization | Suggestions and editable prompt preview only; no response, Run, message, mutation, scheduler or persistence promise |
| Today | Existing all-current `/work-summary` | Existing three sets; Activity date choice cannot hide a pending request |
| Models | Footer navigation to Settings › Models | No duplicate connection facts; source is not applicable |
| Sidebar | `/projects`, `/sessions?projectId`; 8 initial sessions/project, +10 Show more | Fresh device opens first two projects; explicit saved collapse preserved; manual refresh covers every expanded project |

Each Home read has independent request generations. Same-scope failure retains last successful facts and labels them; period/project change clears old facts. Activity confirmation time is server observedAt; Attention “Last loaded” is browser receipt time, not domain freshness. Unknown Attention freshness is not painted as a state. Unsupported DTOs fail closed before follow-on inspect or pagination. Independent workspace uses explicit loading/error/empty/retry states and cancels stale writes on exit; its draft is local to the controller. Opening and returning preserve the underlying composer/session.

## State and visual roles

`nav.current` is neutral persistent navigation tone plus aria-current; object selection is a flat surface aligned with the detail plane, not an elevated card nested in a card. Keyboard focus remains a distinct ring. Hover is weaker than selection. `needs_you` uses a short review label; never a red selected-row background. No review color on send/activity/focus/navigation. Attention state remains distinct from Today “Waiting for you”.

Default slate uses neutral frame / paper / raised / sunken roles throughout Home, Settings, chat, hover and popovers. `--attention-review` is a semantic role: default slate maps to the new review scale; explicit custom and gray-steel map to their existing accent-ink, preserving complete skin ownership. Danger/success roles retain their own meaning. New neutral text/review pairs are included in the contrast report.

Window controls share the brand header: reserved area left of CourtWork, no extra top strip. Host controls remain native and no fake traffic lights are drawn. Plain browser mode reserves nothing. See [Apple/native contract](../../../evidence/home-composition-20260910/apple-window-controls.md).

## Input consumption, in supplied order

The user's pasted research is design input, not independent proof of its source claims or instructions to execute every example. Repeated material is linked to the existing record instead of establishing a second authority.

| Input | Consumption now | Deferred / decision boundary |
|---|---|---|
| Control Grammar, 56 results / 5 workstreams | Re-read [existing input](../../mvp/execution/work-surface-kit/inputs/control-grammar-2026-09-09.md). 28/84 period uses compact mutually exclusive controls; project/state use native selects; list hierarchy uses disclosure; readonly due times remain text. Controls display schema; server validation owns constraints. | React Aria/Base UI behavior donors for future React surfaces, NumberField/ScrubArea, inspector property rows, waveform/transport, contextual toolbar and policy editor retained in existing CC-I/Control specimen scope. No dependency or invented config fields added to the vanilla host. |
| Iconography / MingCute, 26 results / 4 workstreams | Re-read [existing source index](../../mvp/execution/work-surface-kit/inputs/icon-sourcing-mingcute-2026-09-09.md). Fresh primary-source check: [MingCute repository](https://github.com/mingcute-design/mingcute-icons) confirms 24×24, 2px Regular, 1,663 Regular/Fill pairs, framework-neutral definitions and Apache-2.0. [Lucide principles](https://lucide.dev/contribute/icons/design-principles) remain the engineering donor. Existing `ui-controls.icon(name)` → vendored SVG is the single entry. | No default-family replacement or arbitrary family mixing. EX-IC1 matrix: Matter/Evidence/Review/Approve/Reject/Run/Pause/Tool/Expert/Search/Download/History × Lucide/MingCute Regular/Fill/Phosphor Regular/Fill/Remix Line; test 32/44 controls, sidebar/inspector/contextual slots, selected/disabled, light/dark, optical weight. This is a retained specimen specification, not a completed board. |
| Sidebar, 32 results / 4 workstreams | Project-first/session-second preserved; actual session rows increase to 8, Show more/active-row inclusion retained; expanded projects refresh together; navigation remains textual. Attention is a destination link, not a duplicate status dashboard. | Do not rename Projects to Matters: current project DTO is not Matter authority. Runtime/unread/pin/archive/status-priority sorting and Recent need their own declared projections; no inferred status badges. Reveal active session and row-action specimens retained for sidebar follow-up. |
| Selection / List Grammar, 42 results / 4 workstreams | Current nav, project scope, selected object, keyboard focus and required attention separated. Standalone Attention list loses enclosing card; selected row shares raised tone with flat detail pane, no selection shadow. No new rail, honoring the user's earlier rejection. | Source-list / rail / sunken alternatives are recorded exploration options, not three simultaneously installed grammars. No mass hover removal without interaction testing. Existing app-wide controls continue one shared role system. |

The three supplied attachments were read fully. Their research counts remain user-reported; this delivery did not rerun those Exa sweeps. Icon facts above were rechecked; sidebar/selection precedent links remain source leads unless separately verified. [Scout index](../scout/README.md) points here for current consumption.

## Delivery limits

This delivers Home and a read-only Attention frontend slice plus a clearly named Assistant preview. It does not close full ATT-FE-01 actions, ATT runtime/model integration, CC-I, icon selection, native GUI acceptance or G1–G5. No personal data upgraded, paid provider run, external message or deployment.

## Additional inputs received during verification

The Composer Control/Runtime Telemetry text and two Tab/View-Switch texts were also read in full. Their current implementation seams and retained specimen requirements are recorded in [runtime telemetry consumption](runtime-telemetry.md) and [Tab/View-Switch grammar](tab-view-grammar.md). This extends the input disposition without inventing runtime measurements, sibling Chat identities or lifecycle controls.

Material continuation: [token draft and component map](material-grammar.md) consumes the Material Constitution and 135-candidate research summary, separates product/review/publishing namespaces, and records the older whole-skin compatibility gap. The only immediate implementation is solid fallback for the two existing blur consumers on unsupported/forced-colors hosts; no new glass surfaces.

Data visualization continuation: [Activity / model-usage grammar](data-visualization.md) consumes both usage screenshots and the chart research. It fixes donor choices, scale/series rules, data coverage and drilldown boundaries. Daily/model token projections and chart specimens remain future work; current Home retains recorded-Run semantics.

Disclosure/overlay and interaction-vocabulary continuation: [family contracts and D0–D4 specimens](disclosure-overlay.md) separate value selection, commands, inline content and rich overlays; [semantic → glyph governance](interaction-vocabulary.md) establishes five admission classes and local terminology boundaries. These are design contracts; specimen boards, semantic adapter and icon-family migration remain pending.
