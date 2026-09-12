# HTTP contract, protocol v1

Use the existing `/api/v5` base, loopback/origin protections and `x-work-token` header. Append `?sessionId=<id>` to inspect/configure a session; without it only local-user scope is writable. Encode IDs in URL path segments. The typed seam is `app/runtime/control-contract.d.ts`; it is independent of the old frontend.

| Method and path | Result |
|---|---|
| GET `/runtime-control` | Authoritative snapshot, revision, scopes, kinds, resources, profile, policies, audit |
| PUT `/runtime-control` | CAS mutation, returns authoritative snapshot |
| GET `/runtime-resources?kind=skill` | Filtered descriptor catalog |
| GET `/runtime-resources/:id` | Local-user source inspector: descriptor and imported content if any |
| POST `/runtime-resources/:id/invoke` with `{}` | Exposed prompt template as `draft-only`; creates no Run |
| GET `/runtime-context` | Next-run admission catalog, including deferred and draft-only entries; tokenUsage is null |
| GET `/runtime-context?sessionId=...&runId=...` | Historical binding and explicit load events; enforces session ownership |
| POST `/runtime-permissions/evaluate` | Advisory effect and trace for a tool/resource |
| POST `/mcp/:id/lifecycle` | Connect/disconnect/restart and refreshed snapshot |
| POST `/runtime-sources/resolve` | Inspect-only declarative source resolution; 200 for `resolved` and explicit `unsupported` |

Use the existing provider, credentials, permission mode, extension and Run APIs for their owned lifecycle. All new mutation bodies reject unknown keys. A stale revision returns `409 runtime_conflict`; an active Run returns `409 active_run`. Refresh and show the actual state rather than silently resubmitting a stale edit. MCP lifecycle checks configuration revision; connection health is live, and connection changes do not increment configuration revision.

## Example sequence

Read a snapshot and use its current revision for each mutation. These bodies are examples, not shell commands. Replace project/session IDs with returned IDs.

Import a local instruction:

```json
{"revision":0,"operation":"put","resource":{"id":"local:writing","kind":"instruction","title":"Writing conventions","scope":{"type":"user","id":"local"},"content":"Use concise prose and cite source material."}}
```

Disable a tool for one session (to inherit again send `exposed:null`):

```json
{"revision":1,"operation":"exposure","id":"tool:ws_write","scope":{"type":"session","id":"SESSION_ID"},"exposed":false}
```

Set policy; rules replace the rule list in this scope:

```json
{"revision":2,"operation":"policy","scope":{"type":"workspace","id":"PROJECT_ID"},"rules":[{"action":"ws_write","resource":"materials/*","effect":"deny"},{"action":"ws_write","resource":"out/*","effect":"ask"}]}
```

Import a skill with YAML frontmatter `name` and `description`, followed by Markdown. Import a profile as JSON source text with this shape:

```json
{"schemaVersion":1,"version":"1.0.0","resourceIds":["tool:ws_read","tool:runtime_load","local:writing"],"rules":[{"action":"*","resource":"*","effect":"ask"}],"uiSlots":["runtime.inspector"]}
```

Select it with `operation:"profile"`, its `local:` ID and a scope; select `agent:general` explicitly or `null` to inherit. Selection is separate from exposure.

Import an `mcp_server` with this JSON source text:

```json
{"transport":"streamable-http","protocol":"2026-07-28","url":"https://example.org/mcp"}
```

Then POST lifecycle `{"revision":CURRENT_REVISION,"action":"connect"}`. Inspect remote descriptors, explicitly expose the server using an exposure mutation, and retain default per-call ask or write an explicit scoped policy for its readable `mcp.<server-id>.<remote-tool-name>` action. A connected server alone does not grant model access. Model tool calls use the descriptor's `executionName`, not its policy action. A failed/unknown remote effect is never a reason to automatically resend the same work.

## Declarative source resolution (`POST /runtime-sources/resolve`)

This route exposes the pure runtime resolver (see [source-resolver](source-resolver.md)) over the same authenticated loopback/origin boundary as the rest of `/api/v5`: the `x-work-token` header, origin protections and the 1 MiB body cap are enforced exactly as on other POST routes. The body **is** the resolver input (`type: 'inline'` with `kind`, `title`, `content`, optional `origin`; or `type: 'locator'` with `locator` and `value`) — there is no proposal envelope, session/target/scope selection, revision or mutation. The response is the existing `ResolvedRuntimeArtifact | UnsupportedRuntimeSource` union, unchanged.

Resolve an inline source (a caller-asserted `origin` is echoed under `provenance.declaredOrigin` with `verified: false` and is never fetched):

```json
{"type":"inline","kind":"reference","title":"Synthetic reference","content":"Exact source bytes\n","origin":{"uri":"https://example.invalid/declared","version":"v1"}}
```

Request a locator (always explicit `unsupported` — nothing is fetched, read, cloned or installed):

```json
{"type":"locator","locator":"path","value":"/not/read/by/this/host"}
```

Semantics and boundaries:

- A successfully resolved artifact and an explicitly `unsupported` locator both return `200`. Resolution is inspection only: it returns the exact UTF-8 byte/hash identity, `disposition: "inspect-only"`, `capabilities.granted: []`, `trust: "unverified"` and `adapters[0].status: "syntax-accepted"`. It never reads the declared path/URI, never fetches, clones, installs or connects (no MCP connection), and never executes source content.
- Malformed input, unknown discriminants, extra fields, unsupported inline kinds and invalid content return `400` with the resolver's own codes (`invalid_runtime_source` for the resolver envelope, `invalid_runtime_config` for source validation), identical to the pure module. Wrong/absent `x-work-token` is `401`, a disallowed origin is `403`, a non-JSON content type is `415`, invalid JSON/arrays are `400 invalid_json`, and a body over the host 1 MiB cap is discarded by the shared body reader (existing behavior for every POST route).
- The route is sessionless and stateless: it touches no store, configuration, revision, audit, resource directory or mutation queue, so pure resolution also works while a Run is active. It never changes that Run's binding or capabilities and never imports — a later import still requires the existing target validation/CAS (`PUT /runtime-control` with `operation: "put"`) and a resolver hash is not approval.
- No model tool is registered and request bodies are never logged.


## Admission and provenance detail (second UI integration node)

`context[]` is an admission catalog, not a claim that every listed body has entered the model. Instructions are injected; skill/reference catalog text is injected while its body remains deferred; `user-invoked` templates stay explicit draft actions and contribute zero automatic context. Template presence here does not authorize execution.

New context entries add `admittedCharacters` and `deferredCharacters`. The former measures UTF-16 code units of the exact `compileControlContext` contribution: instruction labels and separators are included, a separator belongs to the following item, and the shared catalog heading belongs to the first catalog item. Its sum equals that compiler's output length. It excludes session history, other host instructions, tool schemas and later loads; it is neither a whole-model-context total nor a token estimate. `deferredCharacters` measures the source body not automatically injected. The existing `characters` field remains the legacy instruction-body or catalog-description/title length. Historical bindings without the new fields are displayed as partial counts and are never retroactively recomputed from current sources.

Resource `provenance[]` also records enforced parent gates with `parentId` and reason `parent not exposed` or `parent not running`. The authoritative `exposed` value remains decisive. A parent/profile gate is an explanation, not a scope override: only `reason: 'explicit override'` supports the remove-override action. Connecting an MCP server still grants no exposure or permission.

### Harness P01 · MCP discovery completeness (2026-09-12)

The pinned MCP client 2.0.0 aggregates catalog pages for both supported protocol modes. Host validates each decoded page before aggregation: unique tool/prompt names and resource URIs, at most 100 entries per catalog, a combined 200,000 UTF-8 byte page budget, and no repeated cursor. The SDK retains its 64-page limit, protocol checks and header-tool filtering. These limits apply after SDK response decoding; they are not a streaming transport memory bound.

Catalog publication is atomic, including the final mapped descriptor byte check. Failed discovery exposes no partial catalog. Connect reserves a new connection identity before asynchronous close/discovery; superseded or disconnected discovery cannot publish or report the replacement as its own success. Reconnect is explicit and does not replay tool calls.

### Harness P02 · MCP effect uncertainty (2026-09-12)

Both a remote business error (`isError`) and an unavailable call result fence further tool admission for that Run. A business error preserves its distinct `tool-reported-error` failure kind; it does not establish absence of remote effects. The existing store transaction records admission closure, `mcp_effect_unknown`, and correlated call/server/tool/config/binding metadata. Arguments are excluded. A failed receipt write retains the in-memory fence and the terminal event retries the correlation; persistent storage failure is not reported as success. Startup and orphan cancellation preserve this error identity, so the existing `supersedes` continuation gate continues to refuse unreconciled effects. A known pre-dispatch refusal is separate and does not manufacture an external effect.
