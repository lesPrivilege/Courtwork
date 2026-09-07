# HTTP contract, protocol v1

Use the existing `/api/v5` base, loopback/origin protections and `x-work-token` header. Append `?sessionId=<id>` to inspect/configure a session; without it only local-user scope is writable. Encode IDs in URL path segments. The typed seam is `app/runtime/control-contract.d.ts`; it is independent of the old frontend.

| Method and path | Result |
|---|---|
| GET `/runtime-control` | Authoritative snapshot, revision, scopes, kinds, resources, profile, policies, audit |
| PUT `/runtime-control` | CAS mutation, returns authoritative snapshot |
| GET `/runtime-resources?kind=skill` | Filtered descriptor catalog |
| GET `/runtime-resources/:id` | Local-user source inspector: descriptor and imported content if any |
| POST `/runtime-resources/:id/invoke` with `{}` | Exposed prompt template as `draft-only`; creates no Run |
| GET `/runtime-context` | Effective next-run context; tokenUsage is null |
| GET `/runtime-context?sessionId=...&runId=...` | Historical binding and explicit load events; enforces session ownership |
| POST `/runtime-permissions/evaluate` | Advisory effect and trace for a tool/resource |
| POST `/mcp/:id/lifecycle` | Connect/disconnect/restart and refreshed snapshot |

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
