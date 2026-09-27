# Hermes protocol first-slice parent review · 2026-09-27

Reviewed original Claude head `fc7dec8`, product `a0d6ea735799472c98c42a48d3144795bdd174aa`, based on `67cc742`. **Hold integration for HPR-R1 and HPR-R2.** These are bounded return findings under the original P03 task, not a new roadmap. Native Hermes/process/provider and Host/Store exposure remain outside this slice.

## HPR-R1 · intent and continuation identity

**Adopt.** `Object.isFrozen` establishes immutability, not origin or validity. Parent [executable probe](parent-identity-probe.mjs) (set `CW_REVIEW_SOURCE` to the reviewed checkout) and [result](parent-identity-probe.json) show:

- Adapter B accepts a status observed through adapter A at another endpoint and sends A's session ID to B's endpoint as a continuation.
- A caller-built frozen outer object with a mutable body, arbitrary session ID and unsupported `toolsets` field is accepted by `admit` and forwarded unchanged.

The probe uses deterministic injected transports and records the exact outgoing call; it makes no network request, native run or effect. [Luna's reproduction](luna-identity-probe.stdout.txt) agrees. This violates the declared same-adapter observed-session and exact bounded-body contract, regardless of the future Host's independent authority.

**Required correction:** enforce validated intent/body and endpoint/revision/observation binding at dispatch. Reject cross-endpoint/cross-adapter continuation, forged or altered records, unsupported body fields, and mutable or otherwise invalid intent payloads before the transport is called. Keep legitimate new admission, explicit observed-session continuation and same-key/same-body lost-answer recovery working. Make re-created-adapter/restart behavior explicit; do not silently substitute a new key, native session, endpoint or Pi execution. `Object.freeze` alone is not a trust check. Author chooses the smallest sound provenance/validation mechanism and documents its recovery limits.

## HPR-R2 · bounded configuration must be validated

**Adopt.** Both constructors spread arbitrary limit overrides without checking them. [Independent probe](luna-provenance-limits.stdout.txt) accepts NaN frame limits, infinite stream/diagnostic limits and negative idle limits. NaN/Infinity can bypass size comparisons; invalid timers are not the configured guarantee.

**Required correction:** reject non-finite/non-integer/zero/negative/out-of-policy limit values and unknown fields before opening sockets or constructing an executable adapter. Use documented finite ceilings appropriate to this bounded slice, while preserving supported smaller positive limits and existing defaults. Validate the transport/adapter configuration shape needed by their operations. Do not increase limits to make tests green or add dynamic execution parameters. Test both invalid configuration with zero requests and valid boundary values with actual bounded streams/output.

## Evidence and return scope

[Independent51/51](luna-tests.stdout.txt) cover the existing22 Hermes cases and29 adjacent checks; green tests do not cover away the counterexamples. Keep source-grounded HTTP/SSE identity, no replay/dedupe invention, terminal output versus streamed text, stop intent and owner-loss unknown behavior. No rewrite of the accepted Pi/Agents paths, Host schema, runtime registration, frontend, dependency or native tool policy is requested.

Original Claude owns both corrections in the preserved branch. Add focused failing-before/passing-after cases, retain source-specific evidence, commit the finite correction and return to Astra. Do not start the broader Attention consumer. No user Host restart, push, deployment or production capability claim.

[Luna final review](luna-review.md.txt) independently confirms the same three defects, grouped above as identity/body and bounded-configuration returns. No additional source blocker was identified in its bounded scope.

**Actual return receipt:** parent sent committed `0dfb863` HPR-R1/R2 instructions to the same original Claude/Opus Code conversation; UI shows submitted message and Running/Waiting. [Capture](return-dispatch.png). The original author is correcting, not a new parallel writer.

## Intermediate return check · a5e3e96

The original author's fixed product commit `a5e3e96` is under delta review while its evidence/main-document merge is finished. Parent's portable [11-case return probe](parent-return-probe.mjs) records [10 failures/1 pass before](parent-return-before.json) on exported `a0d6ea7`, and [11/11 after](parent-return-after-a5e3e96.json) on byte-matched `a5e3e96`. It tests cross-endpoint provenance, forged body rejection, valid owned admission and invalid bound values. These results do not constitute final acceptance.

**Residual HPR-R2 adopted:** the instance accepts and describes `maxErrorChars:1`, but status of a matching failed run with `error:"abcdefghij"` returns all10 characters because readStatus still uses the default constant. Parent notified the original Claude in the same running return to enforce the chosen error bound consistently in status/event/reconcile/stop results and add a focused test. No broader scope, duplicate writer or full-suite rerun is requested. The actual message is visible in the same conversation; current work remains active.
