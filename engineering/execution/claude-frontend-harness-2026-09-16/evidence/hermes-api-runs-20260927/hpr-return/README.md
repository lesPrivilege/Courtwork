# Hermes protocol slice · HPR-R1 / HPR-R2 return · author evidence — 2026-09-27

Author: Claude (Opus 5.5), original owner, same branch `claude/runtime-settings-i1-20260927`. The fix is `a5e3e96`, on top of the reviewed `a0d6ea7` / `fc7dec8`. Main `0dfb863`, which holds the [parent review](../../hermes-protocol-review-20260927/README.md), was merged in afterwards. The scope and the source pin (`d7b836ab`) are unchanged. This is author evidence, not acceptance.

## HPR-R1 · provenance, not freezing

**Cause.** `admit` and `continuationIntent` trusted `Object.isFrozen` and field presence. A frozen caller-built object is frozen, but that says nothing about who made it.

**Correction** (`app/runtime/hermes-api-runs-adapter.mjs`). Each adapter keeps two private `WeakSet`s: one for the intents it issued, one for the status, settlement and reconciliation records it validated. Each record carries this adapter's endpoint identity.

- **`admit`** accepts only an issued intent. At dispatch it re-checks the intent's endpoint and revision against its own, and requires a frozen body of exactly `input` plus an optional string `session_id`. It then sends a fresh copy of those two fields. Anything else gives `invalid_intent` with `delivery: not_sent`, and the transport is never called.
- **`continuationIntent`** accepts only a record this adapter observed at its own endpoint and carrying a string session id. Anything else gives `session_unknown`. This includes a second adapter at the same endpoint, a copied or forged frozen record, and a record from another endpoint.
- **Preserved.**
  - A new admission.
  - An observed-session continuation.
  - Lost-answer recovery with the same intent.
  - Recovery across a **re-created adapter**, which is now explicit. The old intent object is refused. The Host rebuilds the same key and body, which replays the one native run. A continuation first re-reads the earlier run through the new adapter. Nothing substitutes a new key, session, endpoint or Pi execution. This is documented in [`app/docs/hermes-api-runs.md`](../../../../../../app/docs/hermes-api-runs.md).

## HPR-R2 · validated bounded configuration

**Cause.** Both constructors spread the limit overrides into place without checking them.

**Correction.** `transportLimits` (exported) and the adapter's `adapterLimits` accept only known names, each a positive safe integer at or below a documented ceiling. The ceilings are `HERMES_TRANSPORT_CEILINGS` and `HERMES_ADAPTER_CEILINGS`, and additionally `maxFrameBytes` may not exceed `maxStreamBytes`. Unknown option names, non-object limits, and a transport missing any of its five operations or its endpoint identity are refused with `invalid_configuration`. This happens at construction, before any socket. Defaults and smaller limits are unchanged.

## HPR-R2 residual · configured error limit (parent delta review)

**Cause.** `readStatus` bounded error text with the module default (500), not the adapter's configured `maxErrorChars`. With `limits: { maxErrorChars: 1 }`, `describe()` reported 1 but `status()` returned the whole error.

**Correction (`b685e17`).** `readStatus(json, runId, { maxErrorChars })` takes the limit. Standalone callers keep the documented default. The adapter passes its validated limit on every path that reads a terminal error: `status`, `follow` terminal events, `reconcile` and the `stop` terminal answer.

**Test.** One new focused case covers all four paths at limit 1. It also checks a short error kept whole at the ceiling (4000) and the standalone default of 500.
- On `a5e3e96`: [27 pass, 1 fail](error-limit-before-a5e3e96.log).
- After: [28/28](after.log), stable over 3 runs.

Rerun on `b685e17`:
- The identity/limits probe is [unchanged: all counterexamples refused](identity-probe-after.json).
- Adjacent tests [29/29](adjacent-tests.log).

## Before / after

| Check | `a0d6ea7` | `a5e3e96` |
| --- | --- | --- |
| New focused tests in `hermes-api-runs.test.mjs` (5) | [4 fail](before-a0d6ea7.log). The 5th, valid smaller limits and ceilings accepted, is the preservation side and passes on both | 27/27 at `a5e3e96`; 28/28 with the residual case, [`after.log`](after.log) |
| [Identity/limits probe](identity-probe.mjs): the parent's counterexamples with a complete transport | [all accepted](identity-probe-a0d6ea7.json). Cross-adapter continuation sent A's session to B; the forged body with `toolsets` was sent; NaN / Infinity / negative limits were accepted | [all refused](identity-probe-after.json) (`session_unknown`, `invalid_intent`, `invalid_configuration`) with no request. The legitimate continuation is still sent |
| Parent's original probe, unchanged | accepted | [refused at construction](parent-probe-unchanged-after.txt): its transport lacks `stopRun` and `events`, now required |

Notes:
- Stability: the fixed source passed 27/27 three times in a row.
- The before run stubs only the two ceiling exports that don't exist at `a0d6ea7`, so the test file can import.

## Checks

- Hermes focused suite: 28/28 after the residual fix. The original 22 still pass unchanged, except one assertion that now checks the error code rather than its old message text.
- Adjacent `drt03-agents-transport`, `drt03-agents-api-protocol`, `runtime-inventory` and `runtime-selection-construction`: [29/29](adjacent-tests.log).
- Doc links: [clean](doc-links.log).
- No full suite: no shared module changed.
- No `process.env` read in either module.

## Not in this return

- The broader Attention consumer.
- Host, Store or UI changes, the executor allowlist or schema.
- Dependencies.
- A native Hermes process or provider.
- Luna's MCP-only toolset research, which is future contract work only.
