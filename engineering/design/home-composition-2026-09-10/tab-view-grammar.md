# Tab / View-Switch input consumption · 2026-09-10

Astra consumed both supplied Tab research texts in full after the user's instruction to work through the design material. This records semantic decisions and the next specimen contract; it does not claim the suggested tab systems are all implemented. [Home delivery](README.md).

## Semantic classification

| Class | Identity / lifecycle | Current Courtwork seam | Decision |
|---|---|---|---|
| Preview / document chrome | An opened object, scope + identity + revision/read type; close may dismiss a view without deleting bytes | `app.mjs` surface document records, `surface-document-tab`, scoped file/source readers | Active surface continuity; inactive label/icon quiet. Preserve existing read-vs-domain-review boundary. Preview/pin/dirty/reorder/split need explicit state contracts; opening is never formal acceptance. |
| Agent chat lifecycle | Independent conversation and execution identity | Current Courtwork Session is the conversation/runtime owner; the external Session → sibling Chat hierarchy is not the local data model | Do not insert a new Chat owner or invent unread/running fields from visual precedent. Any sibling conversation layer requires Astra architecture/identity work first. |
| Page / Settings navigation | Stable section key, deep link, no close/reorder/new | Settings `#settings/<section>`, nine-group secondary sidebar, `settings-view.mjs` manual-activation tabs | Keep secondary navigation for many sections. Small peer groups may use line tabs; do not replace nine categories with a crowded chrome strip. |
| Inspector lens | Same selected object, different inspection type | `surface-tabs` has existing inspection and document entries; `surfaceViewSwitch`, immutable subject identities | Lens controls should be light and local. Mixed existing strip is a bounded follow-up seam, not grounds for changing storage or adding fake tabs now. Stable ordering, explicit unavailable/fallback behavior required. |
| Representation / filter | Same data or object; selected value changes its projection | Markdown Raw source/Rendered view button, Home 28d/84d controls, Attention state select | Retain button/radio/select semantics, not tablist. It does not open another object or grant new authority. |
| Primary navigation | Current product destination | Home/Attention/sidebar with aria-current | Stays navigation, not a closable tab. |

Primer’s referenced view switch uses ordinary focusable buttons and explicitly rejects tablist semantics. This does not reclassify Courtwork’s separate native-radio form preferences; preserve each control’s keyboard contract rather than importing its appearance alone.

Current implementation already separates native radio-based segmented preferences from Settings tab navigation (`settings-view.mjs`) and Markdown representation switching (`markdown-reader.mjs`). No generic `Tabs` replacement was introduced. Existing surface object keys, close behavior and keyboard focus are retained. Home's Activity period switch controls its own metric range, never the Today query or a second route.

## Visual grammar for subsequent specimens

| Surface | Baseline candidate | Alternatives / limits |
|---|---|---|
| Preview chrome | Active surface joined to content, upper corners 6–8, lower corners 0 | Material continuity is experimental; no animated blur. Ultra-flat editor alternative. |
| Agent conversation, if identity exists | Text + restrained active indicator, distinct recorded state | Tonal+line or editor surface. No synthetic pulse/TPS or “agent sparkle”; active is not running. |
| Page / Settings | Text + line; secondary sidebar for many/hierarchical categories | Quiet tonal; native toolbar panes only in a separately implemented native Settings scene. |
| Inspector | Micro-line or quiet small tonal region | Icon-only requires stable semantics and accessible labels; no close/+ for a lens. |
| View switcher | Inset track 8 / inset 2 / inner 6 as a starting geometry | Flat or familiar icon representation at appropriate density; not a navigation tab. |

Unifying contract: same semantic layer has family resemblance; different layers retain visual distance. Current ≠ selected ≠ focused ≠ attention. Close, pin, dirty, unread, loading and authority remain separate fields. The user earlier rejected decorative left rails; none is reintroduced by this classification.

Specimen admission record: T0 Preview (ephemeral/open/pin/loading); T1 Agent (only after local identity exists); T2 four stable route-backed sections; T3 inspector versus representation switch. The later supplied matrix actually lists **15 candidates (5 groups × 3)**, despite describing it as 12. Retain the matrix as an exploration menu, not a requirement to install fifteen variants in the app. Compare within a real shell using the same content, keyboard, light/dark, selected/unselected and reduced-motion conditions. No board has been claimed complete in this Home slice.

Ephemeral → durable is a candidate lifecycle, not domain acceptance. A future annotation/edit would need explicit draft retention and close handling; mere “human attention” must not silently submit, accept, pin or grant anything. Auto-opening successive agent results should reuse a transient seat only once the owner contract exists.

## Source status

[Primer Segmented Control](https://primer.github.io/design/components/segmented-control/) and [VS Code session management](https://code.visualstudio.com/docs/agents/run/sessions/manage-sessions) were opened as primary sources in this pass. Their component/product semantics are donors, not Courtwork's Session schema. The remaining visual-source claims in the supplied texts (Chromium, Create UI, SAP, TanStack and macOS pane examples) are retained as leads; this pass did not rerun a broad research sweep or assert their current APIs. [Earlier EX-CC1](../../mvp/execution/work-surface-kit/explore/ex-cc1-three-pane-tabs.md) remains historical evidence; this table records today's local seams.

Additional supplied primary-source leads retained for a scoped specimen pass: [VS Code editor UI](https://code.visualstudio.com/docs/editing/userinterface), [SAP tab navigation](https://www.sap.com/design-system/digital/patterns/tab-navigation/usage), [SwiftUI Settings](https://developer.apple.com/documentation/swiftui/settings). The visual note did not provide fixed Chromium/Create UI/TanStack source URLs; no URL or version was invented.

2026-09-10 user decision: [Chat / Attention Assistant construction handoff](construction-handoff.md) authorizes peer product surfaces and frontend-first temporary web Chatbot. Earlier absence-of-Chat-entity statements describe the backend baseline, not a prohibition on this surface.
