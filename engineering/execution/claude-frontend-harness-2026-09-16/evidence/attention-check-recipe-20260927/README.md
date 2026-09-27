# Attention fixed check recipe · preflight

Original owner: [DF-04 order03](../../03-check-recipe.md#2026-09-27--fixed-attention-contract-recipe-sol-assignment). Author: Sol when dispatched; Astra selects/integrates, Luna independently verifies. [Luna source/fixture inventory](luna-preflight.md.txt), SHA-256 `30d1df4bfe437f852da375ba221a7959433f7687fb6f411aec3b1740d4d2d96f`.

Astra adopts one fixed recipe as a bounded response to RL-1's recorded inability to run a narrow check. **Correction to Luna's proposed argv:** include `--test` explicitly before `--test-concurrency=1`; otherwise passing multiple paths does not establish all six Node test files ran. Private candidate dependency preparation must be explicit in evidence; do not silently install or add a runner fallback. A synthetic Host invocation is integration evidence, not a real-model dogfood claim. No product result is claimed by this preflight.
