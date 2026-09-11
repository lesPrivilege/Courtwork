# Pages visual comparison · first-principles adjudication

2026-09-11 · Astra author/architect review. The fixed prior source is `9bc6090b5b463bdf6286a0c42bdcd399781fc067`, whose `site` tree equals main `590739f`. The new IA is `89e437d` through `2bbcdf6`; the research-figure correction is fixed at `0ddb854`. This is a real in-app-browser comparison of locally built sources, not an inference from Git diff or old screenshots. It is author visual judgement; the separate Luna reports own non-author source review.

The user requested commit/decision/PR/RD review and actual visual diff before integration, followed by Luna capture of the merged product and then push/deployment. The older publish-first exception is historical: this publication must complete the new screenshot batch, not use ALLOW_PENDING_CAPTURES. The prior request to leave slots empty is superseded for the forthcoming capture work.

## Final composition and reasons

Source review: [branch decisions](pages-branch-review.md), [construction sessions](pages-session-review.md), and [publication/attribution review](release-review.md). The five old Pages source patches already have equivalents in main; no duplicate cherry-pick is needed. Later five-link navigation, proof-first ordering and wholesale Research folding came from an assistant proposal. The initial comparison mistakenly treated that proposal as a user override; that attribution and IA acceptance are withdrawn.

The old user directions sought a stronger Paper/Tour presence (ideas versus orchestration), aligned cards with a concise Tour contents list, Spark immediately after Hero, and Runtime later at the author's discretion. These are reasons to preserve a useful composition, not a rule that old pixels can never change.

| Area | Final decision and reason | Actual author evidence |
|---|---|---|
| Header | Keep quiet Tour / Paper / Release, direct Paper → SE, and one narrow row. These are three distinct reader intentions; five peer links added complexity without establishing a new task. Experts/Eval/Pricing remain contextual and footer destinations. | baseline vs `rejudged-hero-1440.jpg`; `rejudged-hero-320.jpg`; baseline vs `rejudged-tour-320.jpg`, `rejudged-tour-390.jpg` |
| Hero | Keep archive object, headline and brand geometry. Two actions distinguish getting the product from exploring it; the global Paper entry and upcoming Paper card make the third hero action redundant. At 320 both buttons now occupy a full row: the intermediate two-column grid wrapped the second label. | Hero images above; visible wrap was fixed and recaptured |
| Reading path | Hero → Spark/Attention → Paper/Tour → actual Home → work/Review → continuing-work pipeline and small figures. Explain the distinctive behavior, offer conceptual/practical entrances, then show the working product. This absorbs the old reasoning while adding useful actual Home proof at the start of practical detail. | AX order inspected; baseline vs `rejudged-paper-tour-1440.jpg` (same expanded state, scroll positions differ) |
| Ideas and depth | Ideas initially open and the Tour contents remain aligned. Paper is an intentional reader entrance, not low-confidence material. Only architecture and event projections stay in the lower native Research disclosure, preserving their deep links. | Paper cards inspected expanded; original volume links retained |
| Figures | Keep original pipeline plus three `long-work-stages` figures in the main flow after work/Review. Reject the intermediate standalone Roles figure (1280px wide, ~916px tall). The restored three figures are each 400×342 at desktop and retain their geometry; the Roles label/description now says only the active execution configuration, removing Pi and replacing the public Runtime labels with execution/configuration language in line with the public-copy boundary. | baseline vs `candidate-roles-before-1440.jpg`, `candidate-three-figures-fixed-1440.jpg`, then `rejudged-three-figures-1440.jpg` and final `rejudged-execution-final-1440.jpg`; earlier corrected 390 grouping remains the same CSS |
| Tour / acquisition | Keep five task groups and remove the duplicate nine-link secondary nav. The shared three-link header preserves orientation while the page's own tasks are easier to reach. Existing acquisition content and later source-identity correction remain separate. | baseline and rejudged Tour 320; document width equals 320; Tour 390 width equals 390 and each nav target is 44px high |

The initial five-link and folded-Paper screenshots are retained in the manifest as rejected/provisional phases, not final acceptance. The new images pin the current source files by hash in addition to base HEAD. Luna's independent source review is separate from this author visual judgement. No product-capture batch is made ready by these Pages comparison images.

## Evidence format and checks

[Visual manifest](visual-diff-manifest.json) records actual decoded JPEG dimensions, SHA-256 and source phase. Files are `.jpg`, matching browser output. The earlier polish evidence had incorrectly used `.png` extensions and PNG dimension offsets for JPEG bytes; [metadata verification](metadata-verification.json) proves all 41 original image byte sequences are unchanged while the format/names/dimensions are corrected. The invalid original manifest is retained for audit. No image was redrawn or altered to make a state appear real.

After the figure correction: static build, links (260 local references), figures (10), material check and five public-data/capture-plan tests pass. The new pair guard at `9298e48` additionally rejects missing dark images, wrong source, wrong state identity and duplicate captures. App source is unchanged from the earlier fixed product f99af46 and its 767/767 + smoke receipt; these tests are not presented as freshly rerun on the documentation tail.

## Integration versus publication

Local integration may proceed after the fixed source-review closures. Publication remains dependent on (1) actual merged-source screenshots for all 13 slots, light/dark pairs with matching state; (2) new media manifest/current-source link handoff so Get/Run locally no longer points to e818463; (3) final build/hash/readiness checks and real Pages checks with the new images; (4) push and successful GitHub Pages workflow/live verification. Historical specimen 9e5384f and old media bytes stay separate. The same source must not be inferred from an image filename alone.

Native VoiceOver/IME/forced-colors and no-JS/true-200% checks are not proven by this comparison. The final capture/visual receipt must say what was actually exercised; this document neither silently passes unperformed checks nor transforms the commercial concept diagrams into runtime evidence.

Final public-language correction at `e12d2e1` follows Luna’s P1 finding: the visible group/header/description now describes execution and configuration; the internal registry still records the runtime concept and research maturity. Author actual browser image confirms the labels and unchanged layout.
