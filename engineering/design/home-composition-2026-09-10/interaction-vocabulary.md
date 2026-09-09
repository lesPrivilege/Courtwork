# Interaction vocabulary · Semantic registry → Glyph registry → renderer

2026-09-10 · Astra · baseline `c788764`. Consumes the complete supplied 38-source / 4-workstream text; counts are user-reported. Extends, rather than replaces, [icon controls](../icon-controls.md), [existing glyph mappings](../../mvp/execution/work-surface-kit/contracts/glyph-semantics.md), [state vocabulary](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md) and [copy convention](../copy-convention.md).

Reuse a familiar concept, then a familiar visual metaphor. Custom glyphs need a demonstrated semantic gap. Labels describe product meaning; asset names describe geometry. A visual registry cannot create domain objects, states, lifecycle capabilities or permission.

## Five admission classes

| Class | Policy | Rendering / evidence |
|---|---|---|
| Universal UI | Do not redesign Search/Add/Close/Back/More/Edit/Copy/Delete/Pin/Archive/Refresh/Download and other established actions as bespoke symbols | Current canonical family; explicit intent and target label. Admit a missing canonical asset with source/license manifest, not a decorative replacement. |
| Agent-common | Prefer familiar terms and canonical glyph + text; bespoke glyph discouraged | Tool/Model/Context/Reasoning/Files/Terminal/Browser etc only where local capability exists. Sparkle cannot mean Agent, Tool, Expert, Model and Reasoning interchangeably. |
| Courtwork domain | Custom permitted after established metaphor fails and object ownership is established | Evidence/Proposition/governed record/Expert are candidates, not new objects created by this registry. Folder + Matter may suffice where the domain actually supplies a Matter. |
| Runtime visualization | Data-driven local SVG/CSS is appropriate, separate from static icons | Context gauge, TPS sparkline and cache composition require actual measurements, units, provenance and missing states. Never animate invented samples. Cache is not automatically a cached/fresh partition. |
| Brand / provider | Self-owned brand or official third-party asset | Preserve provenance and license; do not imitate third-party logos or normalize their geometry as ordinary line icons. Brand package remains separately usable. |

## Local vocabulary boundaries

| Term | Courtwork interpretation / limit |
|---|---|
| Tool | A callable capability, not every registered resource. |
| MCP server | A service exposing MCP capabilities; tools/resources/prompts remain distinct. Do not label every server or tool a Plugin. |
| Plugin / Skill | A package versus instructions/methods where the runtime supports them. Use the existing extension contract and supported lifecycle, not an assumed universal install model. |
| Model / Provider / Route | Model identity, execution source and routing are different facts. Display observed/configured identity according to the relevant contract. |
| Agent | An execution role/configuration where it exists; not a synonym for every Run or a decorative AI badge. |
| Project / Workspace / Matter | Project is a container; workspace is a folder binding; Matter needs its domain identity/binding. No global rename of Projects to Matters. |
| Session / Chat / Work | Current Session owns conversation/runtime. Existing `sessionMode` uses `extensionBinding` to display Chat/Work modes; the supplied Session → Chat lane hierarchy is not implemented. See [tab grammar](tab-view-grammar.md). |
| Approval / Attention / Review | Write permission, Attention registry state and formal output acceptance have separate contracts. A shield/check cannot merge them. Keep explicit scope and consequence text. |
| Context / Reasoning | Distinguish configured budget, reported usage and reasoning setting/output. Follow [runtime telemetry](runtime-telemetry.md); no abstract brain icon required. |

External product vocabulary is a familiarity reference, not local storage authority. Proposed labels such as New chat, Scheduled, Plugins or Changes must be mapped to actual routes/actions before use. This intake does not rename New session or create a Scheduled destination.

## Registry contract and initial mapping

Each semantic entry records: stable semantic key, meaning/owner reference, action/destination/object/telemetry role, visible label and contextual accessible-name template, capability predicate, glyph key or visualization renderer, admission class/custom policy, state projection, tooltip rule, source/version/license and consuming surfaces. Each glyph entry records geometry name, canonical family/variant, source asset/hash, optical normalization and size. State belongs to the semantic entry/owner, not the asset filename.

| Proposed semantic key | Meaning / label rule | Glyph or renderer | Status |
|---|---|---|---|
| `session.new` | New session; project-local accessible name includes project | `square-pen` globally / `plus` in project | Existing glyph mappings retained; no Chat child creation. |
| `navigation.search` | Search / filter the named collection | `search` | Existing canonical asset; control semantics determine input decoration vs action. |
| `project.object` | Actual project name | `folder` | Existing asset; does not confer Matter identity. |
| `surface.close` | Close named surface | `x` | Distinct from cancellation and Back. |
| `run.cancel` | Cancel run, then actual request/Run state | `square` | Existing action contract; not a Close command. |
| `content.copy` | Copy named content | `copy` | Existing; feedback does not change record status. |
| `disclosure.toggle` | Expand/collapse named region | `chevron-right` / `chevron-down` or native marker | Driven by actual expanded state. |
| `object.more` | More actions for named object | Canonical ellipsis, if admitted | Not currently in the 24-name renderer allowlist; no invented menu. |
| `runtime.context` | Context + measured/estimated/unknown text | Future data-driven gauge | Static icon optional; renderer awaits its measurement contract. |
| `courtwork.evidence` | Evidence with real owner identity | Existing metaphor first; custom candidate only if needed | No `evidence-v1` asset implied by the example. |

The supplied YAML is an illustrative schema, not a production registry. Current `app/web/ui-controls.mjs` already centralizes a 24-name static allowlist through `icon(name)` and `action/setAction` labels; it does not yet route every consumer through semantic keys. A later bounded implementation can add a semantic adapter, migrate explicit consumers and reject unknown keys. Do not claim registry enforcement from documentation alone. Preserve `icon(name)` as the renderer boundary rather than introducing a second inline-SVG path.

## Family and interaction decisions

Lucide's shipped static subset remains canonical. MingCute Regular/Fill is the leading product visual candidate in the existing [source intake](../../mvp/execution/work-surface-kit/inputs/icon-sourcing-mingcute-2026-09-09.md); this strengthens candidate priority without declaring selection or swapping assets. Keep the existing EX-IC1 comparison matrix. Phosphor/Remix and other libraries remain exploration donors, not per-page gap fillers. The earlier IC-6 donor path remains possible only for a documented missing semantic, normalized and reviewed into the canonical geometry; convenience or taste is insufficient. Universal semantics cannot use that exception to justify bespoke redesign.

Use Lucide optical construction rules for any admitted local glyph. Do not force regular stroke attributes onto future filled assets without a variant-aware renderer. Preserve immutable source/license evidence, static allowlist and no runtime CDN/model-provided markup. Runtime visualizations and official brand assets have their own renderers and provenance rules.

Primary navigation uses glyph + stable text. Icon-only requires a familiar action, real space constraint, accessible name and keyboard/hover tooltip; tooltip is supplementary and touch retains a usable path. Dangerous decisions retain visible labels and consequences. Keep SVG aria-hidden/nonfocusable when decorative, native button/link semantics, separate glyph and 32/44 hit-area sizes. Selected/focused/current/open and domain state remain separate; fill/line is only a redundant cue. [Overlay grammar](disclosure-overlay.md) owns chevrons, menus and disclosure behavior.

Acceptance for future registry wiring: enumerate migrated consumers and semantic keys; unknown-key failure; visible/accessibility label agreement including object names; disabled/in-flight/expanded/current behavior; no family mixing; trusted static source/manifest integrity; light/dark optical comparison; keyboard/touch/200% zoom; unavailable telemetry without fake glyph-state. Authors report implementation tests separately from independent acceptance. No assets, registry code, family migration or completed specimen are delivered here.

## Sources and limits

Checked primary [Lucide naming](https://lucide.dev/contribute/icons/naming-conventions) supports separating visual asset names from product usage; [Carbon Button](https://carbondesignsystem.com/components/button/usage/) supports action labels and recognizable icon-only controls. Earlier MingCute/Lucide primary-source findings are retained in the linked source intake and Home record; supplied counts are not rerun here.

Apple Icons, Atlassian Iconography, VS Code Agents, AI Elements and assistant-ui remain supplied vocabulary/design leads in this intake, not proof that all products share the same object hierarchy. No product vocabulary sweep or default-family acceptance is claimed.
