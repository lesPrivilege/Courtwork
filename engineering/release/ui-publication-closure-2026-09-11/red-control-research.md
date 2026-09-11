# Red control grammar research

2026-09-11 · Luna bounded source review on integration candidate
1ae17844fce9cc4b45c70787fcf4ddd2b63fec6c, based on main
b771ed840bfb9e16383a441270e7ba7b7f976e8f.

This note records evidence and a proposal for the requested red control
direction. It does not change product code, define a new schema, accept a
visual baseline, or authorize a release. Root/Astra owns the name, value, and
integration of the new ordinary control accent role requested by the user.
The existing Review-red restrictions below describe the Review role; they are
not a veto on a separate ordinary-control accent role.

## Findings

The smallest coherent red scope has two independent groups:

1. Existing Review semantics: an authoritative Attention needs_you marker or
   a real Review candidate with a declared human decision action. The
   --attention-review role can mark the short label/indicator, and a
   decision control can use Review treatment only when its action contract
   advertises that decision. A question, permission card, waiting_user,
   failed run, or machine activity does not become Review merely because it
   asks for attention.
2. New ordinary control accent: the same new ordinary accent role may be
   applied to the on/selected visual state of the existing native control
   family (for example the Runtime switch and Settings segmented/radio
   controls) when its value is authoritative and the control is interactive.
   This color says “selected/on” and does not say “Review,” “failed,” or
   “danger.” Start with one real control specimen, then extend only to
   controls with the same contract.

The requested pale pink close to the old Pages button can support a disabled
or unavailable treatment only when the action is actually impossible. It
needs its own role family and explicit interaction semantics. It must not be
the ordinary accent, the Review role, the danger role, or the diff role.

## Source ledger

| Evidence | Exact source and coordinates | Consequence |
|---|---|---|
| UI work procedure | [frontend continuity contract](../../design/agent-interface-2026-09-10/frontend-contract.md), lines 5–11, 13–20, 36, 40–55 | Record a nearest implemented precedent, owner fact, changed relation, and local plus adjacent verification. Semantic, projection/control, visual, and placement contracts remain separate. |
| Color layers and existing policy | [color governance contract](../../mvp/execution/work-surface-kit/contracts/color-governance.md), lines 7–25, 31–40, 46–50, 74–76 | S→R→U is the current grammar. Role names are stable; usage consumes roles. Existing policy gives chromatic state treatment to failed/danger and waiting_user/accent, keeps completed/cancelled/unknown grey, limits soft fills, and requires text ≥4.5:1, non-text ≥3:1, focus ≥3:1. A new ordinary accent needs an explicit contract entry owned by Astra. |
| Review boundary | [Skin / Review contract](../../design/skin-injection-2026-09-10/skin-constitution.md), lines 1–20, 22–35, 37–50 | Review is stable and independent of skin. Existing --attention-review is for Needs you text/indicator; Review surface/border are reserved for local use. Failed/runtime error stays danger; queued/running/completed/new-message, selection/nav/focus/Send/activity do not inherit Review. |
| State vocabulary | [UI state vocabulary](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md), lines 1–17, 19–29, 31–48, 50–67 | Unknown is not failed; there is no queued or stale fact in this host. Pending questions and permission requests have separate words and actions. Attention needs_you, waiting, later, and resolved are distinct. A component cannot invent an unavailable or mixed state. |
| Control shape and read-only behavior | [Interface component contract](../../../docs/interface-components.md), lines 23–33, 39–45, 55–59, 83–91, 95–99 | Native controls retain their accessible name, focus, and hit region. Read-only groups stay readable; controls that would submit a change are disabled. Domain actions exist only when the packet advertises them, and unknown descriptors are non-executable. |
| Role implementation | [app/web/styles.css](../../../app/web/styles.css), lines 288–327, 460–471, 3211–3291, 4032–4082, 4377–4382 | Existing roles include accent, danger, success, and focus. Native disabled controls carry disabled, not-allowed, and opacity support. Segmented controls use native radios, a selected thumb, and independent focus. Runtime switches use an authoritative checked value and a 44px hit region; disabled switches use selected/line/muted. |
| Fixed semantic colors | [app/web/styles.css](../../../app/web/styles.css), lines 5327–5353, 5552–5609, 6007–6045 | Diff colors are explicitly “changed text,” never error/danger/Review/rejection. Current Review foreground is a dedicated light/dark value and is consumed by needs_you; fixed focus and danger colors belong to the scheme and remain separate from appearance skin. |
| Settings controls | [app/web/settings-view.mjs](../../../app/web/settings-view.mjs), lines 377–410, 519–529, 550–570, 1175–1200, 1628–1638, 1796–1825, 2290–2375 | Settings uses native radios, checkboxes, and segmented controls. Async changes lock the fieldset; busy/active/path gates disable actual writes. Contrast checks already keep focus, danger, Review, and diff pairs separate. PropertyRow exposes provenance and hides Reset at default rather than showing an inert disabled action. |
| Runtime authority | [app/web/runtime-view.mjs](../../../app/web/runtime-view.mjs), lines 594–625, 1538–1553 | The Runtime switch reads resource.exposed, emits native role=switch semantics, and disables only from capability/scope/frozen/parent-gate facts. Package fields and checks are disabled while busy/frozen; this is a control contract, not a Review signal. |
| Skin protection | [app/web/skin-policy.js](../../../app/web/skin-policy.js), lines 119–156, and [skin policy tests](../../../app/tests/skin-policy.test.mjs), lines 105–164 | Custom appearance projection excludes semantic danger/success and rejects attention-review/focus/material declarations. A new ordinary accent must be registered as a semantic role with an explicit skin policy; it must not be smuggled through Review or custom tokens. |
| Existing Pages collision | [site/src/site.css](../../../site/src/site.css), lines 699–711, 1032–1039, and [site/src/page.mjs](../../../site/src/page.mjs), lines 101–107, 318–327 | The candidate uses --campaign-attention-review for a pending-review marker and also as the background of the live Review the paper link. The link has an href, hover behavior, and forced-colors treatment, so it is actionable. The same token cannot become a disabled/unavailable role without splitting the CTA token first. |
| User reference input | [reference image ledger](../../research/claude-ui-followthrough-return-2026-09-11/references/README.md), lines 3–10 | The toggle screenshots are color references only and do not prove disabled semantics. The pale-red image is an old clickable Pages CTA; its reuse as unavailable treatment requires a semantic and token split. |

## State grammar

| State | Required fact | Visual role proposal | Interaction and accessibility rule |
|---|---|---|---|
| On / selected | Authoritative value is true or the option is selected; control is interactive | New ordinary control accent may color the selected track/thumb/segment according to the control precedent | Native checked/selected semantics stay in the DOM; label and value remain readable. |
| Off / unselected | Authoritative value is false; control remains available | Neutral panel/line/muted roles; no red is required | Keep the control interactive. Off is not disabled and must not be inferred from a faded appearance. |
| Hover | Pointer or equivalent interaction is over an available control | Control-accent hover derivation or the existing hover role, depending on the selected control precedent | Hover changes affordance only; it does not change the value or state word. |
| Focus | Keyboard focus is visible | Scheme-owned --focus, with the required adjacent-surface contrast | Focus must remain visible in keyboard navigation and never be represented only by Review, danger, or ordinary accent hue. |
| Disabled / unavailable | Action contract says the action cannot be performed now | A separate pale-pink unavailable treatment may be explored, with a tested dark ink on the pale fill | Use native disabled where possible, or guarded aria-disabled with no click/action path. Do not rely on opacity alone. No href or live action remains on the disabled surface. |
| Read-only | Value/explanation is readable but this surface cannot mutate it | Neutral readable text and existing read-only treatment | Preserve provenance, explanation, and focus order as applicable. Do not dim the reading surface into illegibility or label it as disabled when it is a read-only fact. |
| Indeterminate / mixed | The control contract exposes a mixed value | A distinct mixed indicator only where the native/API contract supports one | Use the supported mixed semantics, such as aria-checked="mixed" for a checkbox-like control. Do not approximate mixed with off, on, or Review red. Radios and two-option segmented controls have no invented mixed state. |
| Unknown / loading | No authoritative value is available yet | Neutral/muted treatment and an explicit Unknown, Not reported, or loading sentence | Do not project unknown as off, disabled, failed, or Review. Preserve the distinction in copy and data attributes. |
| Review pending | Authoritative Attention/review fact exists; any decision action is separately advertised | Existing Review role for the marker; a decision control may use Review treatment only when its action contract qualifies | Keep the state word and action scope visible. waiting_user, question, permission, and machine activity require their own owners. |
| Failed / destructive | Failed result or an action with a danger consequence | Existing danger roles | Keep danger independent from Review, ordinary accent, and diff; a red hue alone must not decide authority or consequence. |
| Changed text / diff | Source comparison says text was added or changed | Existing diff-change roles | Keep the ±, line number, and text readable. Diff red communicates change, never acceptance, failure, Review, or disabled. |

Per the user ruling for the current Pages diff, both old and new line
numbers remain present where the diff model supplies them. This research does
not alter that dual-number grammar; color remains a supplementary change cue.

The state rows describe semantics before styling. A pale surface or faded
color can reinforce disabled, but only the action contract and DOM behavior
make the action unavailable. A read-only value and an unavailable action are
different facts.

## Contrast evidence

The dominant colors sampled from
[muted-red-disabled-direction.jpg](../../research/claude-ui-followthrough-return-2026-09-11/references/muted-red-disabled-direction.jpg)
(1260×320, Pillow RGB counts) are background #212224 and CTA fill
#df9798. WCAG relative-luminance calculation gives:

- #df9798 on #212224: 6.84:1.
- #df9798 on white: 2.33:1.

Therefore the pale fill can carry dark graphite ink on the dark reference
surface, but it cannot carry white text on a light surface at normal text
size. The current fixed Review pairs also pass their recorded checks:
#ae3630 on #f4f5f6 is 5.71:1, and #efaaa4 on #212224 is 8.31:1.
Current danger pairs are 5.92:1 (#9b3c35 on #feebec) and 7.75:1
(#ff9592 on #3b1219). Any new ordinary accent or pale unavailable role
still needs the repository contrast report across panel, float, muted, dark,
light, and forced-colors paths; these samples do not establish a baseline.

## Pages CTA collision

The candidate comment at site/src/site.css:1032 says the paper link carries
no pending-review state, but site/src/site.css:1034 gives that link
background: var(--campaign-attention-review). Meanwhile the same token is
declared at lines 699–704 and is used by .review-attention at line 701.
The generated link is visible at site/src/page.mjs:107 and points to the
paper entry. This is a semantic collision:

- the Review marker is a status projection;
- Review the paper is an active navigation action;
- a disabled/unavailable pale-pink surface would communicate that an action
  cannot occur.

Split the action token from the Review marker before using the old pale CTA
color as an unavailable treatment. Keep the active link actionable and give
it its own action role. Forced-colors must continue to expose the link as a
button/link affordance through system colors and borders.

## Recommended staged verification

1. Astra records the new ordinary control accent in the role/contrast
   contract, names its eligible control states, and keeps it independent from
   Review, danger, diff, focus, and skin overrides.
2. Split the Pages action token from the Review marker. Verify that the live
   link keeps its href, keyboard focus, hover affordance, and forced-colors
   behavior.
3. Implement one real native control specimen, preferably the authoritative
   Runtime switch or one Settings segmented/radio group. Verify on, off,
   hover, focus, disabled, read-only, and unknown/loading fixtures against
   its actual contract. Within the authorized one-shot, inspect the specimen first and then
   extend the same candidate. Non-author review follows the returned package;
   it is not a new permission gate between implementation stages.
4. Add the pale-pink unavailable specimen only where the action contract
   supplies an impossible-action fact. Check dark ink on pale fill and all
   panel combinations; make the DOM action impossible at the same time.
5. For an implementation change, run the contract's targeted checks:
   node tools/check-doc-links.mjs for this record,
   node tools/lint-colors.mjs and node tools/contrast-report.mjs for
   color changes, node tools/lint-interaction.mjs plus precise unit/behavior
   tests for control changes, and the affected 1440 / 1280 / 390 light/dark,
   keyboard, long-text, processing/failure, 200% impact, reduced-motion, and
   forced-colors scenarios. A non-author reviewer must inspect the candidate
   against the same fixed fixtures before a new baseline is accepted.

This research pass writes only this document. No product source, schema,
appearance policy, CTA, test, commit, merge, push, or deployment was changed.
