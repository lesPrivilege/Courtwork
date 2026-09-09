# Data visualization · Activity and model usage

2026-09-10 · Astra · baseline `42f2ae9`. Consumes the user's two usage screenshots and complete accompanying research text. Screenshots are visual references, not Courtwork records. This is a design/data-seam disposition, not a delivered chart workspace or independent acceptance. [Home contract](README.md); [authoritative metrics contract](../../../app/docs/work-metrics.md).

## Composition and component choices

Keep a compact heading, Overview / Models view switch, scope and period controls, then metric and chart content with a footer for coverage and an exact-value table. These views are Usage-local tabs, not sibling conversations. Use the existing [tab grammar](tab-view-grammar.md). Home keeps its small Activity instrument; a detailed Usage surface may carry richer charts without expanding Home into a dashboard.

| Input | Decision | Implementation boundary |
|---|---|---|
| assistant-ui heat-graph | Preferred React heatmap donor: headless compound Root, labels, Grid/Cell, Legend and Tooltip; custom classification | Current host is vanilla modules. Preserve its existing keyboard inspection and run-count semantics; do not install React for this intake. |
| Recharts + shadcn Chart | Preferred React model-series donor; regular stacked bars plus ranked table | shadcn documentation currently specifies Recharts v3. Dependency/version choice belongs to an actual implementation, not this document. No dashboard framework. |
| Supabase / Stripe | Adapt metric/header/content/footer composition and explicit states | Stable chart space during loading; errors offer retry, missing usage has its own explanation. Reuse Courtwork surface roles rather than importing SDK containers. |
| Tremor | Visual pattern index | Not another installed component system. |
| OpenRouter / Langfuse / Portkey | Research leads for metric × dimension × interval × rollup and trace/log drilldown | Do not import enterprise billing, observability or retention promises. These links remain supplied leads, not audited product equivalence. |
| react-activity-calendar / Nivo Calendar | Retained alternatives | No simultaneous competing chart stack or new selection decision needed now. |

## Available facts and missing projections

Current `/api/v5/work-activity` and `/api/v5/work-usage` accept 1–366 UTC days and an optional project. Scope is retained recorded Runs, historical coverage is unknown, and allocation uses Run `startedAt`. Different requests are different observations.

| Screenshot element | Current capability | Required decision / projection |
|---|---|---|
| Daily heatmap | Activity has daily deduplicated Run counts | Keep label “recorded Runs”; no substitution with sessions, messages or tokens. |
| Input / output totals | Usage has interval sums, separate cache fields and missing-accounting metadata | Show reporting coverage; never add cache to input as though disjoint or infer invoice cost. |
| Daily tokens / model bars | No daily token buckets or model dimension in these DTOs | Backend projection needed before live rendering; do not reconstruct from paged summaries. |
| Sessions / messages | Not provided by metrics DTOs | Define counting unit, inclusion and deduplication before adding cards. Tool events are not automatically user messages. |
| Active days / streak / peak hour | Run-day activity can derive retained active days only; hourly facts absent | Name the measured unit and timezone. Unknown history prevents a complete-history streak claim. Omit productivity judgments. |
| Favorite model | No model projection | Prefer “most used by reported tokens” with explicit metric and tie rule; this is not a preference. |
| All / 30d / 7d | Bounded day queries available; no all-history watermark | Offer named bounded periods; do not label 366 days as All. |
| Book-equivalent token comparison | No domain need or reliable universal conversion | Omit from product metrics. |

The proposed `UsageDay{date,sessions,messages,inputTokens,outputTokens}` and `ModelUsageDay{date,model,inputTokens,outputTokens}` are sketch shapes only. A backend-owned versioned extension must also carry scope, observation time, interval/timezone, allocation field, coverage, source, billing exclusion and per-bucket missing/reporting counts. Distinguish no retained Runs, unavailable usage, reported zero and partial usage. Numeric partial sums must not silently become complete totals.

Model identity needs a stable grouping key and declared requested-versus-observed identity. Preserve provider/route distinctions where semantically required; do not merge equal display names or assign historical Runs to today's configured model. Unknown identities stay explicit. Define inclusion of failed/cancelled/active Runs and safe integer/overflow behavior using the current domain contract. An empty unknown-coverage day is not verified historical inactivity.

## Heatmap scale

The existing Home fixed Run-count scale remains. For a future heavy-tailed token metric, compare quantile and log1p specimens using the same synthetic data. Quantile candidate: zero at level 0; positive values below P50/P75/P90 at levels 1/2/3; remaining positives at level 4. Calculate quantiles on positive, measured values within the displayed scope and period; disclose thresholds and relative scaling. Ties may collapse levels and must never split identical values. All-zero data avoids percentile division; missing values have a separate textual/pattern state, never an invented zero.

Tooltip and keyboard/touch inspection expose exact date, metric, value, timezone and reporting status. A scale that recomputes after period changes must not imply fixed color-to-value comparability. Unknown historical coverage stays visible even when retained-record values are complete.

## Model chart and drilldown

Choose Total / Input / Output as the metric, then stack by model. “Total” requires the contract to define input + output as reported token counts with compatible semantics; cache stays separately disclosed. Do not encode model and direction as a dozen near-identical series. At most five plotted series: top four plus Other, ranked over the whole selected interval with deterministic tie handling. Preserve a full model table, explicit unknown identity, exact values and percentages of the declared reported metric; zero denominators show no percentage. Keep series identity and ordering stable across dates. Other drilldown must preserve its model membership for that observation.

A click needs a real filtered Run/log projection with matching scope, model grouping, start-time interval and accounting semantics. Current dated `/work-summary` filters three current collections by different timestamps and cannot implement this drilldown. Until that projection exists, inspection is an exact-value table/tooltip, not a misleading log link. Today continues showing unfiltered pending work.

## Tokens and review boundary

Proposed names, not installed CSS: `dataviz.activity.0..4` for ordered intensity, `dataviz.series.1..5` for model categories; missing data has a separate role. Compare restrained blue and neutral activity scales in light/dark specimens. Categorical series need distinguishable marks and labels, not five subtly different blues alone. Review skin must not recolor chart meaning; review red is reserved for an actual review annotation. Focus and selection stay separate from series color. No color-only legend, hover-only facts or animated count inflation.

## Implementation sequence and acceptance cases

1. Backend freezes the daily/model projection and matching drilldown contract, with UTC boundary, duplicate Run, deletion, partial/zero/absent usage, unknown model, overflow and cross-midnight examples.
2. Build bounded chart specimens in the actual host: empty, loading, failure/retry, partial reporting, all-zero, single outlier, tied quantiles, six-plus models, long names, narrow width, light/dark, keyboard/touch and reduced motion. Preserve exact-value table access.
3. Wire the selected surface to that projection. Confirm chart/table totals and Other membership match, scope changes cannot show stale facts, and failures are not empty successes. Runtime schema changes, if any, require their own contract.

No new chart code, metrics endpoint, specimen board, dependency or deployment is included in this intake. Existing runtime verification is not presented as evidence that these future charts work.

## Sources

Primary pages checked 2026-09-10: [assistant-ui pinned heat-graph documentation](https://github.com/assistant-ui/assistant-ui/blob/a989eb0a75b914f92263b3691621226997a5d43e/apps/docs/content/docs/utilities/heat-graph.mdx) confirms React/headless composition and custom classify; [shadcn Chart](https://ui.shadcn.com/docs/components/base/chart) confirms Recharts v3 composition and measurable container height; [Supabase charts](https://supabase.com/design-system/docs/ui-patterns/charts) documents header, metric, content, footer and loading/empty states; [Stripe chart layout](https://docs.stripe.com/stripe-apps/patterns/chart-layout) demonstrates metric headers above bounded chart areas. Courtwork choices and thresholds above are our design decisions, not claims those sources prescribe them.

Supplied leads retained: [Recharts](https://recharts.github.io/), [OpenRouter activity](https://openrouter.ai/blog/announcements/activity-dashboard/), [Tremor](https://tremor.so/), [Langfuse dashboards](https://langfuse.com/docs/metrics/features/custom-dashboards), [Portkey analytics](https://portkey.ai/docs/product/observability/analytics), [Primer visualization](https://primer.style/product/ui-patterns/data-visualization/), [react-activity-calendar](https://github.com/grubersjoe/react-activity-calendar), [Nivo Calendar](https://nivo.rocks/calendar). No full comparative sweep or source-asset copy was performed.
