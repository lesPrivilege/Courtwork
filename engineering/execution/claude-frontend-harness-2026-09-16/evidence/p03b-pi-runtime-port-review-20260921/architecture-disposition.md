# Astra architecture disposition — P03-B

Candidate c2be5945b2a8eecd3e5213c0a345b7b1d00e2943; 2026-09-21. These choices concern the bounded Pi extraction; behavioral acceptance is recorded separately.

- D1 adopt: constructing the required port in server/runtime.mjs is the necessary composition-root edit. No default Pi runtime belongs inside RuntimeService. This is a justified, minimal widening of the source list.
- D2 adopt with scope clarification: new start/continue and manual compaction are capability-checked before their Run/operation records; command retries still return the original receipt first. recover and submitToolResult throw named port refusals, not new HTTP endpoints. No capability registry or second runtime is claimed.
- D3 adopt: keep steer on the returned active execution handle through the existing beforeExtraInput wrapper. It preserves the exercised file-coverage invariant while removing the raw AgentSession reach-through. Native handle support does not advertise an HTTP/UI steering action.
- D4 adopt: retain the existing Host observation vocabulary and map it inside the Pi adapter. Host still redacts, admits and persists observations. P03-C owns the actual second consumer and its explicit translation/schema; do not preempt it with a replacement event ledger.
- D5 adopt for this slice: ModelRuntime/provider helpers remain shared with the existing provider plane. This is not a fully runtime-neutral Host. The next transport consumer must map configuration and outcomes explicitly rather than pretending current Pi options are universal.

Journal locator/path/version and schema remain unchanged. AgentSession disposal stays in the unchanged createSessionRun terminal/setup-error paths; no extra public dispose method is needed merely to match a vocabulary list. The outcome remains a native report; Host final status, permissions, fixed checks, effects, budgets and Core decisions retain authority.

Process adjustment: Sonnet's 26 calls exceeded the authorized 20-call exploration bound. Preserve the author's disclosure and do not call it compliant; future preflights stop at the bound and return uncertainty. The missed steer consumer and unexplained author full-suite failures remain historical evidence. Later passing tests do not reconstruct missing failure messages.

No P03-C–F, hosted API access, local CLI delegation, credential migration, hooks or second-runtime compatibility is accepted by P03-B. Composer working-location remains the separate next frontend assignment. No automatic all-lanes dispatch follows this review.
