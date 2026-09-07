# Architecture and compatibility

## Ownership

`RuntimeControlPlane` owns declarative configuration in `runtime-control.json` (config schema 1). The service owns configuration serialization, provider/extension/MCP lifecycle and Run admission. Pi AgentSession owns execution and native session history. Domain extensions retain their existing canonical state, generation/fencing and commit rules. The HTTP API/renderer projects these facts; it never becomes their owner.

A resource has kind, identity, source, owning scope, activation, installation, running status (`null` when inapplicable), exposure, health and provenance. Tools also carry permission explanations. Remote MCP tools inherit the server scope and carry a remote URI/config hash; they are not host builtin tools.

## Configuration and scopes

Writable scopes are user (`local`), workspace (project ID) and session (session ID). `org`, `agent`, and `invocation` are reserved contract categories, not user-selectable impersonation. Profile policy is a derived restrictive agent layer. Resource kind and owning scope are immutable; replacement changes content/title under the same identity. Scope operations must belong to the selected session.

Exposure uses scoped inheritance; `null` removes an override. Policies use last matching rule inside each scope and the most restrictive effect across scopes. `*` is a glob; other characters are literal. A narrower scope cannot relax an outer deny/ask, and a profile cannot create host permission. Existing `read_only`/`ask` write ceilings remain enforced. MCP defaults to ask; only explicit host policy can authorize it without per-call consent. Preview evaluation is advisory; the tool wrapper reevaluates against actual canonical workspace paths and bound arguments.

All configuration mutations, permission-mode changes, extension bindings, provider/credential lifecycle, MCP lifecycle and Run admission share the configuration queue. Active Runs freeze mutable runtime configuration. Store atomic admission still owns idempotency and active-run uniqueness. A new Run persists `runtime.bound` atomically with creation, including resources, content hashes and exact imported source, profile, policies and context. Calls after cancellation or an unknown remote effect are refused, including calls already waiting for human approval.

Defaults are live inheritance at the next Run for existing sessions. This is explicitly not a future-sessions-only default. Historical bindings remain unchanged after edits. Disconnected MCP sessions are not automatically reconnected after host restart.

## Progressive context and composition

Instructions enter the system context; skills and references contribute metadata then load bodies only through `runtime_load`. Loading emits `runtime.context.loaded`. Disabling the loader suppresses the corresponding catalog. Skill `allowed-tools` is descriptive metadata and never a grant. Prompt templates are user-invoked drafts and are absent from the model tool/catalog surface.

A profile is JSON with schema/version/resource IDs/restrictive rules/declarative UI slots. Selecting it filters capabilities and context. Missing requirements or a removed selected profile block new admission. UI slots are declarations only. No imported JavaScript, hooks or renderer executes. Trusted built-in extension code remains in process and is not a security sandbox.

The authenticated local-user source inspector may read imported source even when model exposure is disabled. This is necessary for managing disabled resources and is distinct from model access through `runtime_load`. The host exposes no generic shell or HTTP-fetch tool to bypass that boundary. Exact source is persisted for historical explainability; do not store credentials in instructions or MCP source.

## MCP adapter

Pinned official `@modelcontextprotocol/client@2.0.0`, with explicit protocol negotiation: pin `2026-07-28` or legacy negotiation. The SDK default would otherwise select legacy behavior. Discovery and connections live outside AgentSession. Tool names are namespaced for the model; readable permission actions retain server and remote tool names. Tool lists, resources and prompts are bounded on import. Resources and prompts are catalog-only.

Remote endpoints require HTTPS except HTTP loopback. Only unauthenticated Streamable HTTP is supported; credential-bearing URLs, OAuth and stdio are rejected/not implemented. Remote failures with known error results are failures; ambiguous call transport failures mark the Run unknown, close subsequent tool admission, and require reconciliation. No automatic replay or reconnect is attempted.

## Persistence upgrade

Runtime store schema 3 is validated before upgrade, backed up byte-for-byte to `runtime-state.schema3.<sha256>.json` with mode 0600, then atomically persisted as schema 4. A preexisting backup must match. Invalid or newer state/config fails closed. Earlier host validators reject schema 4 rather than silently executing without the new policy layer. There is no transparent downgrade: restoring the schema 3 backup intentionally discards subsequent work and must be an explicit operational recovery decision. Control config is separate and mode 0600. This remains the host's existing local durability model, not a distributed transaction system.

## Search boundary

The search investigation identified that directory `ws_grep` previously read and hashed the entire tree before starting its regex timeout. Traversal and bounded reads now execute inside the same disposable worker and 2-second deadline as matching, preserving the tool's matches contract, 512 KiB/file and 200-match limits. `listWorkspaceTree` keeps its separate inventory semantics. tgrep is not installed or selected: provenance, cold-index completeness, semantic parity and lifecycle tests are required before an internal search adapter can use it.
