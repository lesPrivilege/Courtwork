# OpenRouter docs — raw excerpts (curl + HTML-strip, captured 2026-09-10)

Source 1: https://openrouter.ai/docs/guides/overview/models (sort parameter table)
```
sort
throughput-high-to-low : Highest tokens/second first (p50 throughput from routing heuristics)
latency-low-to-high    : Lowest time-to-first-token first (p50 latency)
```

Source 2: https://openrouter.ai/docs/guides/best-practices/latency-and-performance
```
Time to First Token (TTFT): Network transit + provider queue wait time + prompt prefill.
Token Throughput (TPS): Decode and generation streaming speed.
Total Latency = TTFT (Network + Queue + Prefill) + (Output Tokens / Generation TPS)

Recipe 1: preferred_max_latency uses a "Rolling 5-Minute Window: Evaluates performance
over the last 5 minutes, rapidly adapting when a host starts queueing."

Recipe 2: preferred_min_throughput — "OpenRouter filters for hosts that have sustained
at least 40 tokens/second for 90% of requests over the last 5 minutes."
```
These rolling-5-minute windows feed OpenRouter's own routing decisions (server-side,
provider selection), not a displayed client metric.

Source 3: benchmarks object (same models page) — third-party Design Arena Elo/win-rate
only; no throughput/latency time series exposed via this field.

Source 4: https://openrouter.ai/docs/guides/overview/models — "Different models tokenize
text in different ways... Costs are displayed and billed according to the tokenizer for
the model in use. You can use the usage field in the response to get the token counts."
→ token counts are provider/tokenizer-reported via `usage`, not client-estimated.
