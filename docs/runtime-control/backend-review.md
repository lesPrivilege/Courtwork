# Backend diff review

Worktree reviewed: `<isolated-checkout>`
Scope: read-only review of the runtime-control backend increment, MCP adapter, persistence migration, admission serialization, and related regression tests. No source files were changed by this review.

## Findings and resolution

- **Unknown MCP outcomes could be replayed within the same Run (high).** The initial implementation kept admission open after a transport-level `tools/call` failure. A fixture reproduced two remote calls and a second permission cycle after the first call's result was lost. The current implementation sets `entry.externalUnknown`, records `mcp_effect_unknown`, closes the tool admission gate, and finishes the Run as `unknown`. The regression test `MCP: a lost remote call result becomes an unknown Run, never an automatic replay` passes; the same-call unknown/replay test also passes.

- **Permission-mode and extension-binding mutations could race run admission (high/medium).** The initial direct service methods could mutate session configuration while `createRun` was between its preflight and persisted admission. The current `setPermissionMode` and `createExtensionBinding` route through `#withConfiguration`, and `createRun` snapshots the bound runtime inside that queue before `RuntimeStore.createRun`. The test `admission serializes permission changes and extension binding before runtime snapshots can diverge` passes.

- **MCP descriptors initially looked like built-ins and did not preserve provider scope.** Current descriptors mark the MCP server and its tools as `source.type: remote`, retain the endpoint/hash, and copy the server's owning scope onto discovered tools. The parent-exposure check also prevents discovered tools from being exposed while their server is hidden. No remaining source/scope bypass was reproduced.

- **Run binding is persisted atomically with run creation.** `RuntimeStore.createRun` appends `runtime.bound` in the same mutation as the run and initial events. Historical context reads the recorded binding rather than current configuration, and idempotent retries return the original receipt. The control-plane binding and replacement tests pass.

- **Schema 3 upgrade is validated and byte-preserving.** The store validates the old shape before writing schema 4, writes a content-addressed byte-for-byte schema 3 backup, then persists the upgraded state. Corrupt/future state fails closed, and the compatibility test passes.

- **Immediate shutdown after direct `service.createRun` did not reproduce a current race.** A standalone script ran the sequence 20 times (`createRun` with an `ask_user` script, then immediate `runtime.close`). Every stored run ended `cancelled` with `admissionOpen:false`; `service.active.size` was zero and the process exited cleanly. The returned `createRun` receipt object remains the pre-cancel snapshot (`status:'running'`), while `store.getRun(id)` is terminal; callers that inspect the receipt object instead of rereading the run can mistake this for a shutdown failure.

## Intentional/non-blocking boundaries

- `GET /runtime-resources/:id` is an authenticated local source inspector. It may return imported source content even when model exposure is disabled; model execution remains gated by the bound catalog and `runtime_load` wrapper.
- MCP is explicitly limited to unauthenticated Streamable HTTP, HTTPS for non-loopback endpoints, bounded discovery, and no automatic reconnect/replay. These are documented adapter limits.
- Existing trusted extensions remain in-process; the runtime-control layer does not claim OS/process isolation.

## Final verification

From `app/`:

```text
npm test
134 tests passed, 0 failed, 0 cancelled, 0 skipped
```

The final run includes control-plane scope/CAS, policy, context/composition, schema migration, modern and legacy MCP, unknown-effect admission, configuration-queue races, cancellation, durability, credentials, extension lifecycle, synchronization, and workspace/tool regressions.
