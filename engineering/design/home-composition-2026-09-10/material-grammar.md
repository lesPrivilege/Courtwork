# Material grammar · token draft and component mapping

2026-09-10 · Astra. Baseline `f666c09`. Consumes the user's inline Material Constitution and the complete attached 135-candidate / 13-primary-page research summary. Counts are user-reported, not a new Exa sweep. Extends [existing material input](../../mvp/execution/work-surface-kit/inputs/material-grammar-2026-09-09.md) and [blur/identity input](../../mvp/execution/work-surface-kit/inputs/material-grammar-2-generative-identity-2026-09-09.md); the narrower product rules below govern new material work. [Home delivery](README.md).

## Local decisions

1. Product reading surfaces are neutral solid. Geometry, typography, grouping and boundaries establish hierarchy first.
2. Glass is an optional material for short floating controls and transient surfaces. It is not the default for every eligible component.
3. Smoke accompanies actual modal obstruction and the corresponding focus/inert contract. An inline ask-user question, pending review or irreversible action does not automatically become a modal.
4. Product chromatic material is limited to `attention.review.*`. It does not recolor text roles, default surfaces/borders, selected, focus or success/warning/danger. Those semantic status colors may still appear in their own roles; they are not material-theme slots.
5. Review tint must retain an explicit human-decision label and existing structure/icon. Color alone cannot convey the state. No new decorative left rail is required.
6. No product refraction, glass-on-glass, continuous decorative blur animation, or blur over long text/diff/table content. No parent-opacity shortcut for material transparency.
7. Product and publishing material namespaces are separate. `provider.atmosphere.*` is a Pages exploration namespace, not an app token import or permission to change the published site.

## Token draft

Names are design-contract names, not a claim that unused CSS aliases have been installed. Reuse existing CSS roles where they express the same fact; add aliases only when the approved component consumes them.

| Semantic token | Existing implementation / proposed mapping | Constraint |
|---|---|---|
| `material.surface.base` | `--panel` | Opaque reading plane |
| `material.surface.raised` | `--float`, with governed line/rim/shadow where needed | Solid fallback for all glass |
| `material.surface.glass` | `--glass` + `--blur-chrome` | Registered short floating chrome only |
| `material.surface.glass-strong` | `--glass-muted` + `--blur-transient` | Registered transient surface; “strong” is contextual, not permission for more blur |
| `material.overlay.smoke` | `--scrim` | Modal obstruction only; cannot substitute for interaction blocking |
| `effect.blur.none` | `none` | Content and all fallback states |
| `effect.blur.soft` | Existing chrome blur band | Values owned by material implementation, never business components |
| `effect.blur.regular` | Existing transient blur band | No per-component px literals |
| `effect.blur.strong` | Reserved, not enabled | Requires a specific specimen and performance/readability evidence |
| `color.attention.review.indicator` | Existing `--attention-review` short-label role | Explicit Needs you / decision label; independent of selection |
| `color.attention.review.surface` | Proposed low-concentration overlay on a neutral short surface | Start with 5% and 10% specimen variants, not a universal contrast guarantee |
| `color.attention.review.border` | Proposed localized boundary | Must not become default border or focus ring |
| `color.attention.review.glass-tint` | Proposed tint input to one registered material recipe | Not a standalone colored-glass component; neutral raised fallback |

New review themes may override only the four review slots. Current `Custom tokens` / gray-steel are older whole-skin interfaces and **do not yet meet that narrower customization boundary**. This delivery does not silently reinterpret or delete saved whole-skin preferences. A future compatibility change must separate full accessibility palettes from review themes, validate immutable semantic roles, and explicitly migrate the settings contract. Current Home's custom/gray-steel review role falls back to their accent-ink; this is not claimed to be the completed review-theme API.

## Component mapping

| Component / situation | Permitted material | Current / action |
|---|---|---|
| Message stream, long document, evidence, diff, table | Solid only | Preserve readable neutral content planes |
| Home Attention/Activity cards, standalone Attention detail | Solid / raised only by default | Current cards use surface/rim/shadow; no backdrop blur |
| Resting composer and persistent sidebar | Solid by default | Floating state/header may be a future glass specimen; no blanket conversion |
| Jump to latest | Neutral glass → raised fallback | Already registered chrome; keep small |
| Context popover | Neutral glass-strong → raised fallback | Already registered transient; keep keyboard access and dismissal semantics |
| Model picker, menu, command palette | Raised default; glass eligible | Each actual component must be registered and tested before glass is installed |
| Preview toolbar, side-panel header, active preview chrome | Short neutral glass eligible | Keep body opaque; no nested glass if parent already samples backdrop |
| Dialog / truly blocking sheet | Solid elevated surface + smoke behind | Background input/focus blocking remains required; smoke is not security or redaction |
| Human-decision header/chip/small callout | Optional review tint, mostly neutral | Text/icon/structure remains sufficient without chroma |
| Failed run, success, keyboard focus, nav/item selection | Their stable semantic roles | No review-theme tint routing |
| Pages / provider showcase | Separate `provider.atmosphere.glow/blur/gradient/tint/media` proposals | No product import; existing Pages no-motion decisions are not revoked |

A conflict/provenance dispute qualifies for review tint only when a domain projection actually asks for human adjudication. A final destructive confirmation retains danger semantics; review tint must not replace its destructive warning.

## Fallback and verification

Current `styles.css` has two registered blur consumers; `tools/lint-materials.mjs` enforces their allowed classes, blur tokens and reduced-transparency fallback. Both had `prefers-reduced-transparency` solid fallbacks. This pass additionally supplies a solid `--float` fallback when neither standard nor prefixed `backdrop-filter` is supported. Forced-colors also disables their filters. No new blur consumer is added.

Before admitting another material: compare the same content in solid/glass/fallback; check light/dark, high contrast, reduced transparency, keyboard focus, text over changing backdrops and the actual target WebView. No automated contrast calculation on one static base color can prove contrast over every translucent backdrop. Keep color on the material's background rather than fading the ancestor containing crisp text. Check compositing boundaries before nesting and do not animate backdrop-filter.

The existing context-popover recipe has `saturate(1.4)`. This is a current implementation fact, not an approved review hue. A future neutral-material specimen should compare it with saturation 1 against colored content; no global saturation change is claimed here.

## Sources and corrections

- [Fluent Material](https://fluent2.microsoft.design/material): solid is the common base; acrylic fits transient/light-dismiss surfaces; smoke dims beneath modal interactions. Mica is **opaque** with environment tint, not another blur level. These are donor roles, not literal WinUI materials installed in CSS.
- [Microsoft Acrylic](https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic): favors opaque vertical content panes, avoids multiple acrylic layers, and provides solid accessibility/device fallbacks. Supports the narrow eligibility matrix above.
- [Linear Liquid Glass](https://linear.app/now/linear-liquid-glass): a **mobile/iOS** navigation example, useful as a professional-clarity donor. Its authors explicitly omit refraction because of dense-interface readability, alongside technical constraints. It is not evidence that every desktop panel should be glass.
- [WCAG Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html): supports retaining non-color information. An arbitrary 5–10% tint does not itself satisfy WCAG contrast.
- [MDN backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter): implementation reference for backdrop sampling, transparency and support; capability detection and opaque fallback remain necessary for older/native hosts.

Those primary/reference pages were checked in this pass. The pasted citation handles for SGDS/NYSDS do not provide durable page URLs; their exact quotations were not independently verified and are not used as proof that all systems prescribe Courtwork's review-only skin boundary. That boundary is the user's local design decision.

Other supplied index leads are retained by role: [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Geist materials](https://vercel.com/geist/materials) / [Vercel design](https://vercel.com/design) for structural/calm surfaces; [Clerk](https://clerk.com/design.md), [Spline](https://spline.design/), Framer for publishing explorations; [Anthropic](https://www.anthropic.com/), [OpenAI](https://openai.com/), [Mistral brand](https://mistral.ai/brand/), [Resend design](https://resend.com/handbook/design/whats-the-role-of-design-at-resend) for publishing restraint/atmosphere. No new broad sweep, asset copying, refraction implementation, Pages edit or visual-specimen acceptance is claimed.
