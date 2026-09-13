# Command surfaces and compaction availability

This page describes the current CourtWork Host, not the standalone Pi terminal
application. The installed execution SDK is Pi 0.85.1. CourtWork supplies its own
admitted tools and context and deliberately disables Pi filesystem resource
discovery. Installing the SDK does not install its terminal command interface in
the CourtWork composer.

## Current support

| Operation | Supported path today |
|---|---|
| Change model or reasoning effort | Existing model picker and versioned `PUT /api/v5/provider-config`. This is the Host's saved configuration for later Runs, not a new session-local model override. Existing Run bindings remain historical. |
| Inspect available runtime resources | Existing Runtime/Settings views and session Runtime Control Plane APIs. A visible or exposed resource is not proof of execution. |
| Stop a Run | Existing Stop action and `POST /api/v5/runs/:id/cancel`. Cancellation requested is distinct from a settled terminal Run. |
| Automatic compaction | Native Pi threshold and overflow recovery, within the Host's compaction policy and execution deadline. |
| Manual `/compact`, `/status`, `/model`, `/effort`, `/tools`, `/skill:name` | No Host slash dispatcher or public manual-compaction operation is currently implemented. Use the supported GUI/API operations above where available. |

The ordinary Run `input` is text. A slash-prefixed input is not a Host control
operation: `/compact ...` can reach the model as ordinary text and does not invoke
native compaction. `/fixture ...` is the deterministic local test provider's
script notation, not a production command registry. Do not use either behavior
as evidence that a Host slash command succeeded. A model's response saying that
it changed a setting or compressed context is not an authoritative receipt.

`commandId` on Run creation is the existing idempotency/receipt key. It is not a
command name and must not be repurposed as one.

## Automatic compaction boundaries

Native compaction begins when the SDK context estimate exceeds
`contextWindow - reserveTokens`; it need not wait for a full window. Provider
overflow can also trigger recovery. Real-provider compaction is enabled by
default when a valid context window is available; Local test is opt-in. A route
with an unknown window cannot use automatic compaction until configured with a
valid window. See the [policy and usage contract](api-runtime-mx-r1.md) and
[model-window behavior](runtime-foundation.md).

The default cap is four compactions per Run. The current compaction may finish
at the cap, while subsequent automatic compactions are disabled for that Run;
this does not terminate normal work and is not a monetary cap. The deadline and
cancel path cover summarization too. Summary retries can incur additional
requests, and missing reported usage remains missing.

Pi owns the persistent conversation summary. The Host reconstructs current
admitted tools and context from their original owners and reasserts
`runtime.context` if compaction removed it. Neither a summary nor old loaded
text grants current permissions or changes Core acceptance. Reassertion is not
a claim that all earlier conversation details or revoked source bodies are
erased or perfectly preserved.

Current sanitized `run.notice` compaction events expose reason and outcome;
they do not expose native summary text or public before/after token counts.
Request telemetry distinguishes agent and compaction requests. A future
`estimatedTokensAfter` must remain an estimate, not be labeled provider-exact
usage or decode TPS.

## Planned command contract

[RD-008](../../engineering/research/RD-008-command-compaction.md) records the
typed command and manual-compaction gaps. Slash is one possible projection of
typed capabilities. Tools keep their own schema, authorization and execution
lifecycle; extension/project/MCP are provenance, not interchangeable effects.
An eventual command dispatcher must reject unsupported command invocations
without a model request and provide explicit literal-text behavior. That is a
future acceptance condition, not a claim about today's ordinary text channel.
