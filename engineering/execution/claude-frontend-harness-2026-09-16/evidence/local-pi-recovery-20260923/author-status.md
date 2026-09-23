# LP-R6 author status

2026-09-23 · Ready for Luna non-author review and Astra integration. Author checks do not confer acceptance.

## Result matrix

| Case | Result |
| --- | --- |
| Actual process completed; exact result and completed terminal retained; Host crashed before assistant/publication | Authenticated `reconcile` publishes result revision 1; `GET result` returns exact UTF-8 text and survives another reopen |
| Historical Host/attempt state | Run remains `unknown`; attempt remains `unknown`; assignment remains `blocked` with its prior reason; `localPiRunUnresolved` remains true |
| Coverage and authority | No runtime source-read receipt is added; coverage says exact versions were provided but model reading is unverified; authority remains `finding-only`; no acceptance is implied |
| Same command replay / conflicting or stale command | Same command returns the existing single revision; conflicting command returns `spark_conflict`; stale CAS returns `spark_stale` |
| Retry, new Run admission and child/parent deletion | Continue to refuse under the existing Local Pi/Spark fences; zero new spawn/provider request |
| Missing terminal / result-only receipt | `local_pi_unreconciled`; no mutation |
| Missing or corrupt retained bytes | `local_pi_result`; no mutation |
| Cross-attempt receipt | Existing state validator rejects the association |
| Cancelled assignment | Recovery refuses; unknown fence and bytes remain |
| Source revision changed | `local_pi_source_changed`; no publication |
| Policy revoked in payload-read/publication gap | Atomic recheck returns `spark_source_policy`; no publication |
| Normal Local Pi completion and non-local Spark reconciliation | Existing adjacent suites remain green |

No negative terminal is resolved. No process history, retry fence, deletion fence, source coverage, Work acceptance, schema, route, provider, permission or runtime capability changes.

## Source identity

- `app/harness/subagents.mjs`: `a73fbd18ef2a6521724a8fdd89bbec6103e28d7a8883f9f9bf3e79768e3659fa`
- `app/tests/local-pi-retained-recovery.test.mjs`: `4a0b4cb9108e2876e8b867697c1b4e7637468a4e19d99e5d27d72f803972ab8e`
- `app/tests/local-pi-host.test.mjs`: `140201b460a97a0ab60b4a737fe39d9b46c2c6f165f37e5c575855826b187d93`
- `pre-edit-crash.log`: `4ef32c1d5010ef702651cdd9538c0623781db4a51dad64e7a8b982e320e79c80`
- `author-tests.log`: `d6c6856b888d0ef8355419c167d328a07173747e19fc63dd811387b2a8994fa6`

Writer released. No merge, push, cleanup, frontend change, browser acceptance or user-service operation was performed.
