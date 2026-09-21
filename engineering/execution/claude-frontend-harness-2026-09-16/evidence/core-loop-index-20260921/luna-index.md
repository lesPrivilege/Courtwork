# P03-C/D/E traceable core-loop index

Date: 2026-09-21
CW baseline: main b714c08143955339d63c06b9601179e42003d5eb
Scope: compact index for the next Host consumer. No provider, credential, native session, server, code edit, schema edit, or paid API call was performed.

## Provenance and current disposition

The accepted P03-C transport is finite SDK plumbing only. The acceptance record identifies source 32f4f8bb754db20b8c0c5c3e44ab4acbc994ca24, local merge 10b2d5229861762976417271713e3ece5ca3e978, and explicitly excludes production Host selection, a live Agents runtime, remote exactly-once behavior, and the next C consumer.

The accepted pinned JavaScript artifact is openai 7.15.0:

- app/package-lock.json:3874-3878 and app/docs/dependency-ledger.json:2270-2275 record registry integrity sha512-2DIwesnPSduw68MFx7nAdgvshrgvS8WOan5W8+tgUMlAy/tY+Q41g80Pa+w/v64rHA6rtn+dketa8QvMVxU96w==.
- The earlier artifact evidence records the verified tarball SHA-256 a9428a67...afb90, 2,654,336 bytes, at engineering/research/agents-api-first-2026-09-14/evidence/docs-20260915/npm-openai-7.15.0.json.
- The pinned SDK source references are recorded in implementation-plan-20260916.md:305,310: openai-node source commit 425502d2bf2da1bdd37efda3b0fa5add96fc8a51, with events.ts, sessions.ts and package manifest blob pins.

The current Host disposition is already recorded in evidence/p03c-host-preflight-20260921/README.md:7-17: keep Pi hostSession exactly {id,path}; add a separate remote binding; claim a native call before effect execution; retain exact result bytes before submission; fence unknown work after restart; keep full reconciliation in D and write/check parity in E.

## Official Agents API facts

Official pages fetched on 2026-09-21:

- [Agents API architecture](https://developers.openai.com/api/docs/guides/agents-api/architecture)
- [Run and continue sessions](https://developers.openai.com/api/docs/guides/agents-api/sessions)
- [Events and items](https://developers.openai.com/api/docs/guides/agents-api/sessions/events)
- [Create agent session reference](https://developers.openai.com/api/reference/go/resources/beta/subresources/agents/subresources/sessions/methods/create)
- [Create session input events reference](https://developers.openai.com/api/reference/python/resources/beta/subresources/agents/subresources/sessions/subresources/events/methods/create)
- [TypeScript Agents API reference](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/agents)

Verified and ready to consume:

1. With environment type none, the application can provide function tools; built-in Bash, apply-patch and workspace file capabilities are unavailable. The function is executed by the application, and the application returns the result.
2. An agent tool declaration is a function tool with type function, name, description and parameters. A minimal repo_read declaration therefore has this outer shape:

    {
      type: "function",
      name: "repo_read",
      description: "...",
      parameters: { type: "object", properties: { ... }, required: [ ... ], additionalProperties: false }
    }

   The exact properties must come from the existing CW repo_read owner at app/runtime/repository-tools.mjs:107-126: path is required; startLine and endLine are optional. The JSON Schema conversion and bounds are a narrow implementation contract, not invented here.
3. A none-mode session requires an initial input. The session create response and current session object can contain agent tools, status and required_actions. The current reference examples show required_actions function_call entries carrying name, arguments, call_id and turn_id.
4. The application receives an agent.session.requires_action event, reads the current required actions, executes the admitted function, and submits an agent.session.input.tool_result event carrying turn_id, call_id, success and output or error.
5. Root turn terminal events are turn.completed, turn.failed and turn.cancelled. Idle, stream close, text completion and an HTTP submission response are not sufficient proof of successful work. The official events guide says a completed turn does not guarantee every tool succeeded.
6. The event-create reference explicitly says HTTP 202 confirms acceptance, not durable completion. Therefore a successful submitToolResult transport call is a delivery fact, not a completed effect or remote Run settlement.

What remains unknown from official material: no dedicated public event is documented as a per-function-result consumption acknowledgement distinct from required-action progress and root turn state. The first consumer must define whether native subsequent turn progress is enough for its receipt, or whether the call remains pending/unknown until a stronger Host reconciliation rule. Do not infer exactly-once from the 202.

## Current CW adapter versus the pinned 7.15 transport

Current code owners:

- app/runtime/agents-api-adapter.mjs:82-145 owns capability exposure; none-mode function_call.required_action and function_call.result are fixture-supported, while unverified capabilities remain unavailable.
- app/runtime/agents-api-adapter.mjs:535-651 owns CW/native identity and in-memory state. It requires CW sessionId, runId and commandId, rejects non-none environments, passes model/agent/input to transport, and returns native session/environment references.
- app/runtime/agents-api-adapter.mjs:654-689 maps message, cancel and tool_result events. It requires turnId and callId and never auto-runs the function.
- app/runtime/agents-api-adapter.mjs:701-753 owns saved-item recovery and buffered event merge; it does not own durable Host receipts.
- app/runtime/openai-agents-transport.mjs:147-161 creates sessions; :164-172 sends caller-owned request IDs for events; :175-224 streams, retrieves sessions and lists items.

The narrow current-vs-reference differences are:

- The current transport's createSession body forwards only model/agent_id, instructions, environment:none and input (openai-agents-transport.mjs:147-161). It drops agent.tools. The next C slice must add an explicit, allowlisted function declaration path for repo_read; this is a transport/adapter extension, not a new runtime or tool policy.
- The current transport sends the caller key through the pinned SDK's explicit Idempotency-Key representation (openai-agents-transport.mjs:164-172). Current official reference signatures expose an idempotency_key/idempotencyKey event option. The wire shape must remain verified by a focused SDK probe before any SDK upgrade; do not silently rename or assume equivalent guarantees.
- Current code treats create as having no remote request identity, and message/tool-result/cancel request IDs as caller-owned. The transport has maxRetries 0 and classifies unresolved mutation delivery as possibly executed. This is consistent with the official 202 warning.
- Current adapter has no durable binding, command receipt, call/result receipt, or restart persistence. Its commands/states maps are process memory. That is intentionally incomplete, not a production recovery claim.
- Current adapter supports items pagination/recovery, but the official API's broader artifacts/subagents/environment surface is not thereby available to CW. Capability rows keep those lanes unavailable.

## Smallest C proof contract

Ready to freeze from existing evidence:

- environment:none only;
- one admitted function declaration for repo_read;
- Host validates function name, turn, call, arguments, binding/repository revision and permission before filesystem execution;
- durable native call claim before invoking the existing governed repo_read;
- exact bounded serialized result and digest persisted before submitToolResult;
- send result once with caller-owned request identity;
- root terminal and required-action observations remain separate from HTTP delivery;
- unresolved create, call or result delivery becomes unknown and blocks new effects;
- restart never re-reads, re-runs, or automatically resubmits.

Needs the narrow consumer contract before Fable implementation:

- exact JSON Schema generated from repo_read TypeBox and output byte/count bounds;
- transport/adapter forwarding of allowlisted function declarations;
- remote binding fields and migration beside Pi hostSession;
- call/result receipt statuses and retention owner in RuntimeStore;
- exact native association of CW Run, root turn and required action;
- honest transition from result-submitted to result-consumed/confirmed;
- explicit create-loss reconciliation, since the current transport has no create request identity or session-list correlation;
- one synthetic C fixture covering allowed, denied, out-of-scope, duplicate call, stale binding and lost submission;
- one later account-authorized live read milestone. No current source or fixture is live proof.

## Canonical P03-C/D/E ownership and tests

| Slice | Canonical owner and source | Existing evidence/tests | Status |
|---|---|---|---|
| P03-B Pi port | app/runtime/pi-runtime-port.mjs; Pi port owner keeps journal/execution behind injected port | app/tests/pi-runtime-port.test.mjs; P03-B acceptance | Accepted |
| Agents protocol adapter | app/runtime/agents-api-adapter.mjs; native normalization, event ledger, settlement recommendation, saved-item recovery | app/tests/drt03-agents-api-protocol.test.mjs, fixture agents-api-native.mjs | Accepted offline protocol slice; no live exposure |
| P03-C transport | app/runtime/openai-agents-transport.mjs; Fable transport owner | app/tests/drt03-agents-transport.test.mjs, fixtures/agents-api-wire.mjs, P03-C transport acceptance | Accepted synthetic SDK transport |
| P03-C Host consumer | RuntimeStore/RD-001 migration and Host/service owner; Fable implements the bounded consumer after the contract is frozen; Codex/Astra independently accepts | Existing store owners app/server/store.mjs, service.mjs, repository-tools.mjs, recordRepositoryRead; new C consumer tests are not yet present | Next slice; not implemented |
| P03-D | Original Agents recovery owner under implementation-plan-20260916; adapter/Host reconciliation, uncertain submission, disconnect/cancel/restart | Existing adapter recovery helpers and D requirements; no C acceptance should relabel them complete | Later, after C |
| P03-E / DF-04 / RD-009 | Existing repository write/check owners: repository candidate/write receipts, check-tools, check-runner, RuntimeStore check.started/check.settled | app/tests/governance-recovery.test.mjs plus existing check/repository tests and accepted core-check-revision evidence | Existing Pi parity baseline; Agents consumer parity follows C/D |

The original sequence remains P03-C Host binding/read first, then D recovery, then E exact repository write/check parity. No new roadmap or second ledger is needed.

## Final disposition

Adopt the official none-mode function envelope, required-action fields, turn/result event vocabulary, and the 202 acceptance warning as the next contract inputs. Reuse CW's RuntimeStore repository-write and check-receipt patterns rather than importing an external receipt framework. Keep all unverified hosted/self-hosted capabilities unavailable.

The next implementation is ready only after the narrow C contract adds allowlisted repo_read declaration forwarding and the RuntimeStore call/result receipt/migration fields. No claim is made that the current SDK transport or adapter can already execute a governed repo_read end to end.

