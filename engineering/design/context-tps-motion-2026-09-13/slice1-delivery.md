# P1 Telemetry · slice 1 delivery record

Status: paused before product implementation on 2026-09-14 after the parent redirected priority to Access UX grammar and repository mounting. This is a scoped work record, not an acceptance report.

## Responsibility and boundaries recorded before implementation

- Responsibility: verify and minimally map provider/Pi request telemetry for DeepSeek through the existing `ModelRuntime` stream boundary and `observeRequestStream` owner. The intended claim is only what the provider protocol, installed SDK mapping, and deterministic fixtures prove.
- State owner: existing Pi provider response/usage mapping and the existing `runtime.request.telemetry` event. Do not introduce a second measurement owner. A need for a new public field, event, schema, or cross-layer semantic requires Astra's decision before implementation.
- Nearest precedent: [`app/runtime/request-telemetry.mjs`](../../../app/runtime/request-telemetry.mjs), [`app/docs/request-telemetry.md`](../../../app/docs/request-telemetry.md), and [`app/tests/request-telemetry.test.mjs`](../../../app/tests/request-telemetry.test.mjs). The existing raw request-input/cache observer in `app/runtime/context-capacity.mjs` is adjacent protocol evidence, not the normalized usage owner.
- Cross-layer boundary: none planned. This slice excludes UI, app styles, cache last-confirmed behavior, animation, schema, permission, credentials, paid provider calls, push, and deployment.

## Baseline and source inspection

- Implementation checkout: `/tmp/courtwork-telemetry-slice1-20260914`, branch `codex/telemetry-slice1-20260914`, created from `7e1a1ff047721e1ca6c871deba7f367ccea55a06`. It was clean before this record. The shared `main` working tree was `main@7e1a1ff` with many unrelated in-flight edits; it was not changed by this slice.
- The task contract was read from the shared working tree at `engineering/design/context-tps-motion-2026-09-13/telemetry-p1-20260914.md`. That input was untracked at the starting HEAD, so it is not present in this isolated branch; it was not copied into the branch.
- Source inspection at the starting HEAD found `observeRequestStream` reads normalized `message.usage` only on successful completion, retains nullable `input`, `output`, `cacheRead`, and `cacheWrite`, and freezes `providerTtftMs` / `decodeTokensPerSecond` as null. Its `firstOutputMs` is measured from host-observed semantic deltas. `pi-session-runtime.mjs` wraps the existing SDK stream with this observer and a byte-preserving raw SSE observer; it increments a per-session request ordinal and sets purpose (`agent`/`compaction`).
- `context-capacity.mjs` already recognizes raw OpenAI-compatible Completions cache hit/miss fields and raw inclusive prompt-token totals. Existing code comments state normalized input excludes cache counts, so adding normalized input and raw cache counts must not double count. This is adjacent request diagnostic behavior; no claim is made here about the Pi DeepSeek usage mapping.
- `app/package.json` pins `@earendil-works/pi-ai`, `pi-agent-core`, and `pi-coding-agent` at `0.85.1`. The installed package source was not inspected in this paused run. The deterministic `deepseek-loopback.mjs` fixture emits raw prompt/completion/total and cache hit/miss fields; no fixture command was run.
- The current project entry read from the shared working tree records that the official DeepSeek KV-cache guide exposes `prompt_cache_hit_tokens` and `prompt_cache_miss_tokens`, while its Chat API page was not fully retrieved; it records no verified per-token counter or provider token clock. This slice did not independently fetch those official pages.

## Unfinished verification and implementation

- Reopen the current repository mount and Access UX grammar priority before resuming.
- Then inspect the official DeepSeek protocol pages and the installed pinned Pi SDK source; record exact versions/source coordinates. Use only synthetic loopback/fixture traffic to verify cache hit/miss, normalized usage accounting, per-token deltas, and provider timing.
- If current owners can express the supported facts without adding shared public semantics, implement the smallest adapter/request-telemetry mapping and focused tests. If a new public field/event/schema is required, pause for Astra's specific boundary decision.
- Independent non-author Luna verification and user Chrome inspection remain outstanding. This record is not independent acceptance.

No product source was changed, no test or provider request was run, and nothing was staged, committed, pushed, or synchronized into the shared `main` tree.
