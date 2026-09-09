# AM-C offline request baseline

Date: 2026-09-09. Runtime base: `fd3861b15ce4875b37af674d8c9dd0798d258fd4`. This evidence records the bounded local-fake check only; it does not accept a provider, prove cache hits, or claim native async support.

## Reproduction

```text
node --test app/tests/architecture-maintenance.test.mjs
```

Result: 3 tests passed. The fixture uses `startServer` and the installed fake provider's loopback HTTP server. `app/runtime/fake-provider.mjs:203-228` parses and records the actual request body before responding. `app/tests/architecture-maintenance.test.mjs` canonicalizes only the temporary workspace path in the system message; all other wire fields, message order, and tool order remain intact.

The checked-in golden is [request-baseline.json](../../app/tests/fixtures/architecture-maintenance/request-baseline.json). It covers the local `fake-openai-loopback × openai-completions × fake-model × pi-coding-agent@0.85.1/AgentSession` path. The test separately checks:

- complete request envelope equality for the no-op golden;
- independent envelope-shape equality, exact prior message prefix, and tool-definition stability across a continued session;
- changed tool description, changed schema, and `read_only` permission removing `ws_write` as expected semantic diffs.

The host context path is intentionally not asserted as a whole-request hash: a changed context may append a new turn while the historical prefix remains stable. `app/runtime/pi-session-runtime.mjs:165-172` supplies the sorted custom tool list, and `:185-194` is the transport seam used by the SDK.

The prefix assertion is scoped to the messages captured by this local fake completions run. Full tool-loop, cache-usage, and restart continuity remain evidenced by the separate existing protocol tests below; this AM-C fixture does not expand those claims.

## AM-A compatibility index consumed by this baseline

| Provider/API/model/adapter/mode | Evidence | Status |
|---|---|---|
| `fake-openai-loopback / openai-completions / fake-model / pi-coding-agent@0.85.1 AgentSession / local simulation` | `app/runtime/fake-provider.mjs:203-228,259-292`; `app/runtime/pi-session-runtime.mjs:88-98`; this file's reproduction | `fixture-tested` |
| `openai / openai-completions / gpt-4.1-mini / same AgentSession / loopback protocol fixture` | `app/tests/provider-protocol.test.mjs:47-74` | `fixture-tested` (existing protocol test) |
| `openai / openai-responses / gpt-4.1-mini / same AgentSession / loopback protocol fixture` | `app/tests/provider-protocol.test.mjs:18-27,47-71`; API dispatch registration at `app/runtime/pi-session-runtime.mjs:67-76` | `fixture-tested` (existing protocol test; not this golden) |
| `deepseek` catalog/API rows | API formats and native dispatch are registered at `app/runtime/pi-session-runtime.mjs:21-23,67-76`; provider selection is validated at `app/server/service.mjs:594-604` | `catalog-observed`; real generation `not-tested` |
| arbitrary compatible preview endpoint | Preview is a model-directory operation; `app/server/service.mjs:592-604` requires a catalog model and explicit endpoint for non-catalog API format | `probe-only`; generation `not-tested` |

The local fake itself exposes only the completions route (`app/runtime/fake-provider.mjs:208-213,281-283`). The responses row therefore relies on the separate protocol fixture, and this evidence makes that distinction explicit.

## Attention ownership conflict index

Attention remains a design-only peer capability. Current RuntimeStore is the execution ledger: `app/server/store.mjs:394-405` deletes session runs/events/questions, and `:422-465` owns run admission, events, and artifacts. `app/server/work-summary.mjs` is a derived projection. Neither provides a cross-session request CAS, durable attention execution identity, or authoritative delivery/result receipt.

Core currently owns Matter/source/candidate/artifact/request-result/decision/event tables (`app/core/core.py:178-275`) and has no Attention tables or operations. The proposed Attention backend must therefore wait for the Core owner to choose the relation (`attention_execution`/`session_ref` or equivalent) and migration. Do not make `app_run.matter_id` nullable: the bridge contract requires it (`app/core/bridge.py:53-99`). Stop before SDK/scheduler work if one Core transaction cannot atomically maintain current state, event, request result, and revision/CAS; absent a second consumer and failure evidence, retain the design-only status.
