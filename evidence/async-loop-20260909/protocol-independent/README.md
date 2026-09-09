# Independent AM-B-T1 review

Reviewer: Luna, non-author. This directory is an independent review artifact;
it does not alter the Terra T1 source, the Courtwork product, package locks, or
the author test. The pinned Terra source is
`/private/tmp/cw-terra-async-protocol` at
`aaba970520a76aefd6a6e612bf7d089992349a00`.

Run the probe against that source tree:

```sh
node evidence/async-loop-20260909/protocol-independent/run-modern-legacy.mjs \
  /private/tmp/cw-terra-async-protocol
```

The script starts two local HTTP loopbacks and drives the pinned
`app/runtime/mcp-manager.mjs` directly. The modern loopback negotiates
`2026-07-28`, uses `server/discover`, advertises
`io.modelcontextprotocol/tasks`, and returns the current inline
`resultType: "task"` shape. The legacy loopback negotiates `2025-11-25`, uses
`initialize`, and returns the incompatible old `{ task: ... }` shape. Both
ordinary tools complete; both task calls are rejected by the current manager as
an unknown result, with no task runtime or polling method. This is a packet and
negotiation check, not evidence of native task continuation.

Expected independent observations from the pinned source:

```text
modern: negotiated=2026-07-28, era=modern,
        methods=server/discover,tools/list,tools/call,tools/call,
        tools/call _meta.protocolVersion=2026-07-28
legacy: negotiated=2025-11-25, era=legacy,
        methods=initialize,notifications/initialized,tools/list,tools/call,tools/call,
        tools/call has no modern _meta envelope
```

T1's own four tests passed separately (`node --test tests/async-protocol.test.mjs`:
4/4). Its Pi test is a real local `AgentSession` → Pi OpenAI-completions → SSE
HTTP loopback, so its narrow observations about completed streamed tool
arguments, the follow-up request, and omission of an arbitrary `async` schema
field are reproducible. It does not test a legacy task runtime; that remains
`not-tested`.

Protocol references used for the shape distinction:

- [MCP Tasks extension draft](https://tasks.extensions.modelcontextprotocol.io/specification/draft/tasks)
- [SEP-2663 Tasks Extension](https://modelcontextprotocol.io/seps/2663-tasks-extension)
