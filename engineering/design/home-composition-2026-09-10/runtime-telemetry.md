# Composer Control / Runtime Telemetry consumption · 2026-09-10

Astra read the supplied 36-result / four-workstream text in full; Luna performed a bounded local seam review. The research count is user-reported, not a rerun by this delivery. [Home delivery](README.md). This is a design/implementation map; no synthetic performance meter was added to the product.

## Decisions consumed

Configuration, current runtime observation and completed-turn records are separate surfaces and separate facts. L0 composer keeps the few useful controls and current state; L1 disclosure explains exact available metrics; L2 inspector carries breakdown and history. Model/route/effort may be configured only through declared capabilities. A model catalog entry is discovery metadata, not proof of the route actually used by a completed request.

The [assistant-ui model selector](https://www.assistant-ui.com/elements/model-selector) primary source was rechecked: it offers grouped searchable models, per-model effort options, runtime and standalone variants. It becomes the P0 interaction/anatomy donor for a future richer picker. Courtwork's host catalog/config validation remains authoritative; the present vanilla host does not import a React runtime to copy that appearance. The sample model names, windows, prices and TPS in the input are illustrative, not data for the local catalog.

Model and Route should remain distinguishable in the design. The current exact provider/model/api tuple is not replaced with a display string; a future route abstraction must define fallback policy and observed route identity before presenting route performance or choice as a new object.

## Measurement admission

| Metric / control | Required meaning | Admission / display rule |
|---|---|---|
| Compiled context | Pre-send estimate with its counting method and scope | Show estimate marker; never label as provider usage, remaining model capacity or billing. |
| Provider input/output | Reported usage for a defined request/turn/run | Keep source and aggregation scope. Missing is unavailable, never zero. |
| Context window / reserved output | Declared installed model capability and actual policy | Do not subtract unrelated catalog maxTokens or estimates into a claimed exact Available figure. |
| TTFT | Request dispatch to first provider token, with scope/clock defined | Total Run elapsed cannot substitute; tool and human waiting are different intervals. |
| Decode TPS | Token deltas divided by measured generation intervals | Run output / full wall time is not decode TPS. No guessed sparkline from UI chunks or character count. |
| Cache read/write/fresh | Provider-specific accounting with overlap/disjoint semantics | Existing `work-metrics` explicitly avoids combining input/cache; no 100% stacked composition or cache-hit ratio until denominator and overlapping fields are specified. |
| Cost | Reported/qualified estimate with pricing snapshot, not an invoice | Current retained usage is explicitly not billing. No displayed dollar amount inferred from this input's examples. |
| Streaming / compaction | Recorded runtime events and lifecycle | Display actual state only. Completion freezes a measured specimen; idle cannot continue simulated activity. |
| Route distribution | Enough timestamped route-specific observations and method | Network benchmarks are discovery hints. No red/yellow/green speed scale or “abnormal” label without defined comparable baseline. |

Even a provider reporting cache support does not make an omitted count equal to zero. Preserve reported zero, partial data and unavailable independently. Provider input, compiled context and Matter state must not collapse into a single “context tokens” field.

## Retained specimen scope

Priority specimen: TPS micro-sparkline with three supplied synthetic states (streaming, completed/frozen, idle), labelled as a design fixture. Pair it with model/effort selection, a clearly estimated context bar and a capability-aware cache breakdown. Compare 40–60px neutral metric loci, keyboard-accessible disclosure, reduced motion and mobile collapse. Live motion must follow sampled facts; source intervals and statistics must be inspectable. This is a specification, not an implemented or measured real-provider specimen.

Advanced temperature/top-p/max-output/provider JSON remains Runtime configuration rather than becoming a crowded composer footer. A future message footer may carry an immutable per-turn snapshot only once the host's completed-turn DTO exists; current Run aggregates must retain their Run label.

## Current source anchors

- [Runtime foundation](../../../app/docs/runtime-foundation.md): installed provider-model catalog (`provider`, `id`, `api`, `contextWindow`, `maxTokens`, `reasoning`) and exact configuration tuple.
- [Runtime API](../../../app/docs/api-v6.md): `run.usage` with input/output/cacheRead/cacheWrite/turns/missing.
- [Work metrics](../../../app/docs/work-metrics.md): retained recorded usage, incomplete accounting, unknown historical coverage and explicit `isBillingRecord:false`.

The input's Pi Pulse, OpenRouter performance/catalog, Unsloth timing, OpenCode context proposal and PostHog playground links remain scoped donor leads. This pass did not install or run them or reproduce their benchmark/cost claims. A separate runtime measurement contract must precede any live TPS/cache composition implementation.

Retained donor URLs for the next bounded pass: [OpenRouter model metadata](https://openrouter.ai/docs/guides/overview/models), [Pi Pulse](https://pi.dev/packages/pi-pulse), [Unsloth MessageTiming at the supplied revision](https://github.com/unslothai/unsloth/blob/6f443b5c/studio/frontend/src/components/assistant-ui/message-timing.tsx), [PostHog AI Playground](https://posthog.com/docs/ai-observability/playground). The input did not supply a fixed URL for the OpenCode community proposal; do not reconstruct one or treat it as a shipped API.


## Luna local seam findings consumed

| Existing seam | Current frontend / missing portion |
|---|---|
| `service.mjs` provider-models/runtime-info | Installed model capabilities and effective compaction policy exist; not live route performance. |
| `pi-session-runtime.mjs` usage collection; `store.mjs` Run usage | Reported input/output/cache fields, turns and missing; initial zeroes with missing=true are not reported zero. |
| `inspector.mjs` Run Usage | Input/output/cached input/cache writes/model turns already displayed. Missing accounting is labelled “At least” as a lower bound. `workspace-view.mjs` also reports model turns. |
| Runtime compaction start/end/limit/retry events | Run notes and Activity disclose text. No dedicated count/duration/token-composition projection. |
| `store.mjs` events | Current event shape carries sequence/run/session/type/data, without a first-token timestamp or timestamped token series sufficient for decode TPS. Run startedAt/endedAt alone do not fill that gap. |
| `app.mjs` “Working for Ns” | Browser elapsed reading from Run startedAt; not TTFT, provider decode duration or server duration. |

Luna found outdated “host reports no token usage” wording. This pass corrects the Planned capability row to **Per-source token counts**, acknowledging existing Run usage, and corrects the Effective Context Inspector comment. No metric behavior changed. Provider-native timing fields beyond the current persisted contract remain unverified.
