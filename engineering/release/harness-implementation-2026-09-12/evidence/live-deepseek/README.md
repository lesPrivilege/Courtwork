# DeepSeek live GUI / Host integration · 2026-09-12

User authorized real-provider integration after personally saving the key in the prepared app. Astra conducted GUI operations and local receipt checks. No key or credential store was inspected/copied; no raw headers, native reasoning text or signatures are in this evidence. Only synthetic prompts and one synthetic output file were sent/written. Runtime filesystem roots are replaced with `<runtime-data>` in exported receipts; existing binding hashes are source identifiers, not hashes recomputed over this redacted projection.

## Outcome and boundary

Five Runs completed across eight recorded model turns. Four initial Runs cover text/table output, same-chat continuity, one denied exact write, then a new approved write plus actual `ws_read`. A fifth short no-tool Run verifies graceful Host restart/native-session continuity and the provider-identity projection fix. This is a positive plumbing/protocol probe, not a capability benchmark or evidence that Pi fully elicits the model's possible performance. Live cancellation, injected errors, compaction, cross-model/provider switching and a second runtime are not covered here; earlier synthetic tests remain separate.

Source: first four Runs used `b087e9fa14c700a38ae200a412194a891c060c0c` (product source `6522eb1`). Fifth used `4720027c13adefc1eac28f89bb3862a92fb9d9e0`. Config stayed `deepseek` / `deepseek-v4-flash` / `openai-completions` / `high` at the provider default endpoint. The test Host was limited to four turns and 60 seconds per Run. These are runtime limits, not a currency cap or provider-side attempt counter. Original 8804 was not restarted.

| Run | Result | Model turns | Evidence |
|---|---|---:|---|
| `fa574074` | Chinese text, two bullets and Markdown table rendered; marker correct | 1 | [Initial receipts](trace.json) |
| `07dcf2de` | Recalled `CW-DS-LIVE-01` in same Chat | 1 | [Initial receipts](trace.json) |
| `c26b79ac` | Exact 58-byte write denied; no artifact; workspace GET returned 404 before next Run | 2 | [Pending card](permission-pending.png), [denied](denied.png) |
| `80e0c765` | Fresh exact approval; `ws_write` then `ws_read`; one recorded artifact with exact bytes | 3 | [Write/readback](approved-readback.png), [raw file reader](recorded-raw.png) |
| `5aa0bfa1` | After graceful service restart, recalled `CW-DS-FILE-03`; same native session; response alias/ID recorded | 1 | [Post-fix receipts](after-identity-fix.json), [identity detail](identity-detail.png) |

Expected file: `out/ds-live-check.md`, 58 bytes including final newline, SHA-256 `90fb1d1215a5fe2b2c74cef42493dda1db32fba180054b61d247debd3f8c6537`. Permission preview/hash, actual workspace bytes and artifact receipt agree. The file reader states that saving does not establish review acceptance. Refresh returns to Home; reopening the existing Chat retains the conversation, rejection/approval history and recorded file. [Restored accessibility state](restored-ax.txt) was captured before the fifth Run.

Run usage totals (SDK normalization): input 2,189, output 1,504, cacheRead 14,336, cacheWrite 0. Output includes the SDK/provider's reported output accounting, not a count of visible text tokens. No currency estimate is made. The eight completed semantic-request durations ranged from 0.84 to 11.01 seconds; permission waiting adds to Run elapsed but is outside individual provider-request duration. These single observations do not isolate network/provider/adapter causes or establish a speed distribution. No Host retry notice was recorded; lower-level transport retry attempts were not separately counted.

## Identity gap discovered and repaired

All seven initial native assistant metadata records retained `responseModel=deepseek-flash` and a response ID, while `message.model` and old telemetry's `observedModel` remained `deepseek-v4-flash`. This matches the alias issue investigated in Luna's [research](../../research/deepseek-behavior.md); provider-reported names still do not identify immutable weights.

`4720027` adds bounded optional SDK response identifiers to the existing telemetry owner. It preserves the legacy `observedModel` field and labels that value **Runtime model**, then separately shows **Provider-reported model** and **Provider response ID** when recorded. No alias rewrite, provider switch, fallback adapter or SDK upgrade was introduced. Historical receipts are not backfilled. The fifth real request proves that the new field reaches the UI, while the raw original evidence preserves what the earlier version omitted.

The native private session retains thinking blocks/signatures for protocol replay. Evidence stores only content types, character counts and presence flags, not reasoning text. The initial seven turns produced 1,391 public cumulative text-snapshot events, 1,093 with empty visible text. This reflects the current projection of non-text updates and is not token timing. Deduplicating redundant events may merit profiling, but this trace does not prove a user-visible performance bottleneck. No such optimization was bundled into the identity fix.

## Verification and UI continuity record

- [Author focused tests](identity-tests.txt): 16/16, actual SDK loopback alias propagation, malformed/missing metadata, historical rendering, ordinary protocol/restart/error/cancel cases. No paid calls in these tests.
- Luna independently reviewed exact `4720027` and ran the same 16/16. No material contract regression; source identity, historical compatibility and null TPS semantics preserved. This is bounded non-author review, not whole-product acceptance.
- [Adjacent usage regression](usage-adjacent.txt): 10/10; [interaction lint](interaction-lint.txt): pass. The full suite from the earlier source remains 838/839 with an isolated 13/13 lifecycle rerun; it is not relabeled as a new all-green full suite.
- [Layout checks](layout-checks.json): 390/1280/1440 × 900, expanded request detail, no horizontal overflow, both identifiers present. [390](identity-390.png), [1280](identity-1280.png), [1440](identity-1440.png) are candidate captures, not new accepted visual baselines. Long response ID wraps in the existing data list.
- [Keyboard check](focus-check.json): Escape hides the connection card and restores focus to `model-settings-button`. Temporary viewport overrides reset after testing.

Nearest implemented precedent: `app/web/telemetry-view.mjs::renderRequestMeasurements` at `b087e9f`, with `app/docs/request-telemetry.md` as owner contract and `projection.value` in the active frontend precedent map. Affected grammar is the existing request-detail definition list, shared by composer connection card and Inspector. New terms clarify provenance; no colors, tokens, motion, permissions, global model selection or authority changed. The added rows use the existing component/layout. Separate theme/forced-colors/200% zoom matrices were not rerun: there is no styling or control change, and this bounded review focused on identifier wrapping, retained records, full Chat context and keyboard return. This is not a general responsive/accessibility acceptance.

## Serial plan disposition

The Node 1 real-provider GUI criterion now has positive evidence and a reviewed targeted projection fix. It does not close all model-behavior questions or G1–G5. Node 2 runtime replacement and Node 3 Work loop remain separate implementations; this turn's further work is the requested DeepSeek/composer exploration and source/evidence integration.

Astra architecture reading: this Host uses Pi's native AgentSession/tool loop and native session persistence, while `noTools: "builtin"`, the empty resource loader and governed CW tools deliberately replace the stock CLI tool/resource environment (`app/runtime/pi-session-runtime.mjs::createSessionRun`). The work-session system prompt and `ws_list/read/write/grep` declarations come from the Host (`app/server/service.mjs::#runSystemPrompt`, `app/runtime/workspace-tools.mjs`). Therefore stock Pi coding-agent community results are not a direct benchmark for this combination. Compare task capability, tool grammar, permission policy, model/effort, history and budgets before inferring a model limitation or prescribing a broader adapter.
