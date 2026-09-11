# Independent final-combination review · candidate `89e437d`

Review date: 2026-09-11. The product review target is the exact candidate
commit `89e437d43a5e6e19ee556811aca3127aad5fe0e2`, checked out separately in a
clean detached tree. This is a bounded non-author review of the combined
semantic-polish App slice and the VS-05 Pages path. It makes no browser,
visual, VoiceOver, forced-colors, 200% reflow, deployment, or whole-product
acceptance claim. The active preparation worktree also contains the test-only
follow-up `1eca099`; that follow-up is excluded from the product target and
does not change the candidate bytes reviewed here.

## Contract and source comparison

The semantic contract requires a presentation-only registry, a surface-aware
adapter, explicit `none` representations, preserved Runtime/Core authority,
and incremental consumer migration ([semantic-registry-plan.md:26-40,57-63](../../engineering/execution/2026-09-11-semantic-polish/semantic-registry-plan.md)).
The candidate registry has schema version 1 and 47 entries. The reserved
Attention, Spark, Matter, and Expert entries use `glyphPolicy: "none"` with
`app` and `pages` text representations; question, approval, candidate,
decision, recorded-fact, and fallback rows consume the same no-glyph meaning.
`semanticPresentation` resolves the selected surface representation, and
`setSemanticControl` keeps the existing button node and handler while forcing a
visible label when the selected representation has no glyph
([semantic-controls.mjs:4-33](../../app/web/semantic-controls.mjs),
[ui-controls.mjs:98-139](../../app/web/ui-controls.mjs)).

The VS-05 contract keeps the 13 capture slots and existing provenance while
reordering the public product path, retaining Spark/Attention identity, and
deriving the product route list from the renderer ([pages.md:1-17](../../engineering/execution/2026-09-11-semantic-polish/pages.md)).
The source route list contains nine pages at
[product-pages.mjs:8-65](../../site/src/product-pages.mjs); the primary header
is Product, Experts, Eval, Pricing, Download at
[copy.mjs:9-15](../../site/src/copy.mjs), with non-home hash links rewritten by
[page.mjs:92-94](../../site/src/page.mjs).

## Independent checks

All commands below ran against the exact candidate in the clean detached tree.

| Check | Result |
|---|---|
| `node --test app/tests/product-semantics.test.mjs app/tests/semantic-guards.test.mjs app/tests/work-surface-tabs.test.mjs app/tests/home-presentation.test.mjs app/tests/card-disclosure.test.mjs app/tests/shell-layout.test.mjs` | pass: 38/38 |
| `node tools/check-semantic-consumers.mjs` | pass: 6 guarded glyph families, 38 ledger entries |
| `node tools/check-product-copy.mjs` | pass: 3 disclosed diagnostic exceptions |
| `node tools/check-pages-semantics.mjs` | pass: 13 capture slots, 10 figures |
| `node --test site/scripts/capture-plan.test.mjs site/scripts/public-data.test.mjs` | pass: 5/5 |
| `node site/build.mjs` | pass: generated product pages and manifest |
| `node site/scripts/check-links.mjs` | pass: 76 files, 258 local references, 0 problems |
| `node site/scripts/check-figures.mjs` | pass: 10 figures, 0 problems |
| `node site/scripts/check-material.mjs` | pass: 1 sheet, 0 problems |

The focused suite covers semantic source/output agreement, no-icon control
anatomy, handler retention, raw-consumer/copy/Page-map negatives, Home and
Attention projections, disclosure behavior, surface tabs, and shell layout.
The syntax checks for `ui-controls.mjs`, `semantic-controls.mjs`, and
`site/build.mjs` also passed.

The build manifest contains nine `product_pages`, preserves legacy specimen
source `9e5384fcabdac432259b3ffab7928251bea49859`, and records product media
source `e818463ab31aa06a4c9d52a968a68099fdb02c3e`. The capture batch remains
`pending` with a null source and `renderCapture` emits a labeled blank capture
space in that state ([capture-plan.mjs:1-41](../../site/src/capture-plan.mjs)).
The legacy specimen, the pending capture plan, and main media are therefore
kept as separate provenance records; no current screenshot acceptance follows
from the successful static build.

## Blocking finding on candidate `89e437d`

**P1 · Non-empty Home Waiting and Needs-a-look rows call `icon(null)` and can
abort Home rendering.** The candidate changes `setGlyphs.pendingItems` and
`setGlyphs.inspectionCandidates` to `null` at
[home-view.mjs:48-52](../../app/web/home-view.mjs), but the non-empty row
builders still unconditionally call `icon(setGlyphs.pendingItems, ...)` and
`icon(setGlyphs.inspectionCandidates, ...)` at
[home-view.mjs:401-413](../../app/web/home-view.mjs) and
[home-view.mjs:431-442](../../app/web/home-view.mjs). `icon` rejects a name that
is not in its static set with `Error("Unknown static icon")`
([ui-controls.mjs:25-68](../../app/web/ui-controls.mjs)).

Independent TinyDOM reproduction against `89e437d` supplied one valid pending
item and one failed inspection item, then called `renderHome` for each active
set. Both calls returned:

```text
pendingItems Error: Unknown static icon
inspectionCandidates Error: Unknown static icon
```

The existing adapter tests verify the row data only
([presentation-adapters.test.mjs:152-167](../../app/tests/presentation-adapters.test.mjs));
the focused UI set does not render a non-empty Home pending or inspection row.
The empty-list path consequently does not expose this failure. This is a
candidate blocker: the no-glyph policy is not safe on the production non-empty
paths until those calls conditionally omit the child and the direct render
regression passes.

The raw-consumer gate is intentionally lexical and only scans literal names;
it cannot detect a dynamic `icon(null)` call. This repro is evidence for the
required render-level regression, not a reason to widen the gate's scope
without a contract decision.

## Bounded limitations and closure criteria

The semantic and Pages checks are source/build checks. The raw-consumer scan
excludes vendor, static allowlists, and generated projections, and the copy
check is limited to the reviewed hard-coded fields and shell HTML. They do not
prove every dynamic runtime path. The passing static Pages checks also do not
publish or visually approve the still-pending capture batch.

Disposition: **candidate blocked pending the Home no-glyph fix**. Re-review
must use the fix SHA, exercise both non-empty pending and failed/unknown
inspection rows through `renderHome`, rerun the focused Home/semantic tests and
the three semantic gates, and confirm the existing route/provenance checks
remain green. Until then, the positive checks above are evidence for the
bounded source/build slices only.

## Closure review · fixed candidate `f99af46`

Review date: 2026-09-11. The exact fix target is
`f99af4695aa5796e703286b0875ec5663cc22c85`, reviewed from a fresh clean
detached checkout. The four-file fix changes only the two Home row builders,
their focused regression fixture support, and the Chat stream stylesheet
([commit diff](https://github.com/lesPrivilege/Courtwork/commit/f99af4695aa5796e703286b0875ec5663cc22c85)).

The prior Home failure is closed at the render boundary. `pendingRow` and
`inspectionRow` now conditionally omit their no-glyph child while retaining the
trailing navigation chevron at
[home-view.mjs:401-456](../../app/web/home-view.mjs). The new regression
renders one pending question and one failed inspection item, clicks both rows,
and asserts the exact `{question, inspect}` navigation scope and one remaining
SVG per row ([home-presentation.test.mjs:268-282](../../app/tests/home-presentation.test.mjs)).
The TinyDOM support adds `childElementCount`, which is required by the
production list branch ([tiny-dom.mjs:54-58](../../app/tests/tiny-dom.mjs)).

Targeted fix checks from the clean detached checkout:

| Check | Result |
|---|---|
| `node --test app/tests/home-presentation.test.mjs` | pass: 9/9, including the new pending/failed render and navigation regression |
| `node --test app/tests/chat-shell-proportion.test.mjs` | pass: 7/7 |
| `node --check app/web/home-view.mjs` | pass |
| `git diff --check f99af46^ f99af46` | pass |

The narrow large-text layout fix scopes absolutely positioned accessibility
labels to the actual `.message-stream` scroll owner by adding
`position: relative` at [styles.css:1066-1075](../../app/web/styles.css). The
author's real UI matrix reported these before/after values at 390px, light,
large text while focusing the pending question: before, `chat-panel`
`scrollHeight=1216`, `scrollTop=24`, and a header from `y=-24` with only
21.5px of the 44px nav visible; after, `scrollHeight=844`, `scrollTop=0`, and
the header at `0..48` with the nav at `1.5..45.5` (44px visible). The supplied
fixed capture is
`evidence/semantic-polish-20260911/baseline/app-vs06-question-light-large-fixed-390.jpg`.
Those browser measurements and the capture are author evidence; this source
review does not claim independent visual or accessibility acceptance.

Disposition for `f99af46`: **the prior Home blocker is closed for the bounded
source/render regression**. The large-text correction is source-verified and
supported by the author's real UI metrics, with visual acceptance intentionally
left open. The original `89e437d` blocker remains recorded above as the reason
the unfixed candidate was not acceptable; the fix SHA is the reviewed target
for subsequent combination work. Full-suite and final product acceptance stay
with the parent review.
