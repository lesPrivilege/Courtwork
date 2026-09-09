# Runtime telemetry / model picker

Astra implementation on top of `27d37da`. [Contract](../../../app/docs/request-telemetry.md), [sequential backlog](../../../engineering/design/home-backlog-2026-09-10/README.md).

Author: full suite423/423; final targeted5/5 including malformed measurement and schema6 mixed global/project migration; color/material lints passed. Full suite predates the final DTO guard, admission recheck and two new tests. Local SDK Chat/Responses wire tests also passed (15/15 grouped target tests); no paid provider call.

Live browser with independent synthetic data: nested Attention model picker; search no matches disables save; local model exposes only Off; save updates global configuration and returns focus to Attention model button; unsent draft retained; real loopback Run completes; inline telemetry shows host first-output/text, request time, effective effort, heuristic context and independent usage. Decode TPS visibly unavailable. Wide layout and one-line rounded rectangular composer visually inspected.

Luna independently ran3/3 telemetry tests and reviewed source. Reported malformed telemetry could throw; fixed by validating before render and tested. Close-during-save completion is deliberately retained (closing does not cancel committed configuration); per-opening busy state prevents a closed save locking a reopened picker. Hidden filtered selection cannot be saved. These are bounded independent findings, not independent whole-product acceptance. Provider-native TTFT/TPS, exact tokenizer counts, native host and G1–G5 remain outside the claims.
