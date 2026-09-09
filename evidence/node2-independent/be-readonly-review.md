# BE-4 / BE-13 read-only review

Date: 2026-09-08  
Checkout: \`<isolated-checkout>\`\
Branch / commit: \`codex/astra-node2\` / \`0a307802b61a6847ee88bfea870bdf340647caee\`  
Scope: trace BE-4 (B-1, B-2, B-4, B-10) and BE-13 through the runtime-control API, MCP manager, and runtime UI. This review did not edit product files, run tests, start a service, or send an application task. The checkout has only the separately created \`evidence/node2-independent/\` directory as an untracked evidence addition.

The request list in the main fresh checkout names BE-4 at
\`engineering/mvp/execution/work-surface-kit/backend-requests.md:8\` and BE-13 at
line 17. The runtime-control acceptance says that writes return authoritative snapshots,
MCP configured/connected/exposed are separate, and unknown remote effects require
reconciliation rather than retry (\`docs/runtime-control/acceptance.md:33-41\`).

## End-to-end ownership

- HTTP routes are present at \`app/server/index.mjs:119-125\`: runtime resources,
  context, permissions, MCP lifecycle, and runtime-control read/write.
- \`RuntimeService.mcpLifecycle\` serializes through \`#withConfiguration\`,
  checks revision and active runs, calls connect/disconnect, and returns a fresh
  \`getRuntimeControl\` snapshot (\`app/server/service.mjs:278-294\`). The queue is
  promise-serialized at \`app/server/service.mjs:556-561\`.
- \`RuntimeControlPlane.inspect\` projects MCP server and discovered tool rows at
  \`app/runtime/control-plane.mjs:142-150\`, then applies overrides and parent/profile
  gates at \`159-201\`, and builds \`context[]\` at \`203-206\`. Prompt compilation is
  separate at \`app/runtime/control-plane.mjs:215-219\`.
- \`MCPManager.inspect/disconnect/connect\` owns live transport state:
  \`app/runtime/mcp-manager.mjs:22-76\`. A disconnect sets \`connected=false\`,
  closes the client, and removes the map entry (\`27-33\)); a subsequent inspect
  therefore returns disconnected with empty catalogs (\`22-25\`).
- The UI reads with an abort/generation guard and replaces its snapshot
  (\`app/web/runtime-view.mjs:141-162\`). Every mutation sends the current revision,
  replaces the snapshot with the response, and renders in \`finally\`
  (\`167-199\`). MCP lifecycle posts to the lifecycle endpoint
  (\`212-216\)); state words derive from \`resource.running\` and \`resource.exposed\`
  (\`95-103\), \`682-706\`).

## Findings

| Item | Verdict | Evidence and impact |
|---|---|---|
| BE-4 / B-1 — MCP server gate in \`provenance[]\` | **Real backend contract gap** | Remote tool rows start with \`exposed: connection.connected\` at \`control-plane.mjs:146\`. Scope overrides update \`exposed\` and append provenance at \`159-165\`. The parent gate at \`167\` can then force a child false when its server is unexposed or disconnected, but appends no provenance entry. Thus a child can return \`exposed:false\` while its final provenance value remains true. The UI has to detect this mismatch and name the server at \`runtime-view.mjs:368-380\`; that workaround confirms the missing causal edge. |
| BE-4 / B-2 — \`catalog-only\` character semantics | **Real semantic/contract gap; UI exclusion is deliberate** | Imported content gets \`characters: item.content.length\` at \`control-plane.mjs:149-150\`. For a manual skill/reference, \`context[]\` instead reports \`(description ?? title).length\` at \`203\`. The compiled catalog inserts a full \`id (kind): description\` line plus a shared header at \`217-218\`. Therefore the snapshot number is a catalog-line number, while the typed contract only says “measured characters” (\`control-contract.d.ts:90-98\`). The UI deliberately excludes catalog-only items from the bar and shows a dash (\`runtime-view.mjs:971-1047\`), so the browser projection is consistent with the current intake decision; it does not resolve what the API number means. |
| BE-4 / B-4 — \`prompt_template\` in \`context[]\` | **Real shape mismatch against the requested effective-context meaning; no execution bug** | \`context[]\` includes exposed prompt templates and labels them \`user-invoked\` at \`control-plane.mjs:203\`. \`compileControlContext\` admits only instruction, skill, and reference content at \`215-218\`; it never inserts a prompt template. The existing test records this exact boundary at \`app/tests/control-plane.test.mjs:71-82\`, and the invocation endpoint returns \`draft-only\` at \`app/server/service.mjs:326-330\`. The UI's dash and “Use as draft” treatment (\`runtime-view.mjs:564-580\`, \`971-1047\`) is an intentional projection of the current shape, not proof that a template reaches the model. |
| BE-4 / B-10 — browser fixture entry for unknown remote effects | **Fixture/coverage gap, not missing runtime handling** | The MCP manager calls \`onUnknown\` and raises the no-retry error at \`app/runtime/mcp-manager.mjs:78-95\`. The Run surface maps it to an unknown run; the runtime UI has the reconciliation banner branch at \`runtime-view.mjs:192-194\`, \`790-796\`. Existing loopback tests create RPC-error and dropped-response conditions at \`app/tests/control-plane.test.mjs:200-218\`, \`257-297\`, but the runtime-module browser suite does not drive an actual Run through that path. A deterministic local-only fixture/harness path is needed if B-10 must be browser-verified; it should exercise the Run surface and preserve the no-retry rule. |
| BE-13 — disconnect state “does not flip” | **Not reproduced; prior result is a fixture/setup or observation error** | The implementation path is coherent: \`mcpLifecycle\` calls \`disconnect\` at \`service.mjs:289\`, \`MCPManager.disconnect\` removes the live entry at \`mcp-manager.mjs:27-33\`, and \`getRuntimeControl\` immediately re-inspects it at \`service.mjs:293\`. The UI replaces its local snapshot with that response at \`runtime-view.mjs:174-199\`, while \`mcpStateWords\` reads the returned \`running\` at \`95-103\`. The independent loopback evidence at \`evidence/node2-independent/mcp-api-baseline.json\` records HTTP 200 and \`running: true, false, true\` for connect, disconnect, reconnect; the disconnect also reports zero tools. The prior RC README says its seed points at \`https://example.org/mcp\` and requires re-import to \`http://127.0.0.1:8851\` before lifecycle verification (\`evidence/rc/README.md:19-21\`). The integration delivery explicitly says that manual step was not run and marks the old result pending (\`engineering/mvp/execution/work-surface-kit/delivery-integration.md:32-34\`; \`delivery-wk10a-r2.md:47-55\`). |

## Minimal follow-ups

### B-1

At the parent-gate branch (\`app/runtime/control-plane.mjs:167\`), append a provenance record whenever the gate changes a child from true to false. The record should identify the parent scope and a stable reason such as “server not exposed” or “server not running,” while leaving the authoritative \`resource.exposed=false\` and permission denial intact. The precise reason vocabulary is a contract choice for Astra.

Minimal counterexample:

\`\`\`text
server: exposed=false
remote child: default/provenance value=true, connection.connected=true
returned child: exposed=false, provenance[-1].value=true
\`\`\`

A scoped server override plus a child override makes the same mismatch after \`159-167\`.

### B-2

Resolve the API meaning before changing the bar. The current implementation has two observable quantities:

- the catalog text actually inserted by \`compileControlContext\` (\`217-218\`);
- the body text that would load later through \`runtime_load\`.

Either make the field explicitly represent the admitted catalog contribution (including a defined allocation of the shared header), or add separate fields for catalog and deferred body characters and update \`ContextItem\`/UI together. Do not infer the intended meaning from the fixture or silently relabel the existing number.

Minimal counterexample:

\`\`\`text
content = "---\\nname: x\\ndescription: short\\n---\\nlong body"
context item = { admission: "catalog-only", characters: 5 }
compiled text includes "local:x (skill): short" plus the shared catalog header
\`\`\`

The value 5 is neither the source-body length nor the complete compiled contribution.

### B-4

Choose one contract and align both surfaces:

1. remove \`prompt_template\` entries from \`context[]\`, retaining them as resources available to the explicit draft invocation; or
2. define \`context[]\` as a broader capability/admission catalog, keep \`user-invoked\`, and document that it is not compiled next-run context.

If option 1 is chosen, the current UI dash must be sourced from the resource catalog or removed with its acceptance assertion. In both cases, keep \`invokeRuntimePrompt\` draft-only and keep the existing test guard.

### B-10

Add a local deterministic fixture hook or browser harness sequence that:

1. connects the loopback MCP fixture;
2. exposes the remote tool and starts a Run;
3. makes the fixture drop the \`tools/call\` response or return an uncertain transport error;
4. verifies the Run becomes unknown, the reconciliation message appears, and a second call is not admitted.

The existing backend fixture is already sufficient at \`app/tests/control-plane.test.mjs:281-297\`; the missing piece is a browser-verifiable entry, not a Retry action.

### BE-13

Re-run the lifecycle browser sequence only after seeding/re-importing the loopback endpoint and selecting a connected server row. The existing script dereferences the MCP row and its buttons before checking that the row is a usable fixture (\`evidence/rc/runtime-ui-counterexamples.mjs:129-140\`); with the documented endpoint still at \`example.org\`, a failed/unavailable connection can make a subsequent observation look like a stale state. Compare three values after each action: the returned snapshot's \`running\`, the fresh GET's \`running\`, and the rendered \`data-mcp-state\`. No code change is indicated by the current API evidence.

## Bottom-line handoff

B-1 and B-4 are real backend contract/shape gaps; B-2 is a real unresolved character-accounting contract that the current UI intentionally projects as deferred; B-10 needs a fixture entry for browser coverage; BE-13 is currently a false-positive/setup issue, with the current API and UI path verified by source and the independent loopback evidence.

