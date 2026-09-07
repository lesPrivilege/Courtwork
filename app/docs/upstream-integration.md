# Upstream integration and completion boundaries

The three Pi dependencies are locked to official `earendil-works/pi` v0.85.1,
commit `d981de1229ef899957bbe968bc8dcda02a21f477`.
[Release source](https://github.com/earendil-works/pi/tree/d981de1229ef899957bbe968bc8dcda02a21f477).
Independent review compared installed source maps with the tagged source;
package provenance does not substitute for local behavior evidence.

| Responsibility | Actual implementation | Boundary |
| --- | --- | --- |
| Model/tool loop, retry, summary | Pi AgentSession directly executes them | Native SDK path with local fixtures; real-model quality remains unverified |
| Chat/Responses | Public Pi createProvider API dispatch map | Catalog models and standard API-key endpoints; no custom headers/auth policy/compat descriptor |
| Conversation | Persistent Pi SessionManager JSONL, reopened per Run | No second transcript; no active-session fork/import/replacement UI |
| Host context/tools/cache | ResourceLoader system prefix, native custom context tail, sorted customTools, persistent session identity | Conditional provider cache support, not a guaranteed hit rate |
| Run lifecycle and permissions | RuntimeService and serialized RuntimeStore mutations | Host-owned behavior; not inherited from Pi's maturity |
| File history | Whole-file workspace tools, Git pinned content, host authorization rows | Logical content versions; not a transaction across every store/filesystem |
| SE extensions | Explicit trusted catalog and local ABI | Not an arbitrary Pi extension loader; formal acceptance remains an explicit domain operation |

The [single-session SDK](https://github.com/earendil-works/pi/blob/v0.85.1/packages/coding-agent/docs/sdk.md)
fits the Run-scoped lifecycle. The host installs abort/usage ownership before
prompt, waits for native idle and primary event projection writes, then disposes
the native session. Pi's full AgentSessionRuntime replaces entire active
sessions and cwd-bound services; adopting that layer is a separate capability
change, not a prerequisite for continuation in the current fixed workspace.

The [provider implementation](https://github.com/earendil-works/pi/blob/v0.85.1/packages/ai/src/models.ts)
requires an API-keyed dispatch map for a provider that exposes both formats.
Model.api alone is not enough with a single-stream provider. The host applies
its selected baseUrl and API to the catalog model. `modelsPath:null` in this
fixed ModelRuntime also selects an in-memory models store; an independent
sentinel experiment verified that global model configuration/cache is ignored.

Restart now restores extension activation and generation, rather than resetting
every catalog entry to unloaded/gen0. Loaded same-version bindings can continue;
unload/invalidation survives; changed versions require explicit reload. The
host reconstructs fresh instances from its trusted catalog. This is local ABI
state restoration, not compatibility with arbitrary upstream extension modules.

Remaining boundaries are concrete:

- Primary event projections are awaited. Informational run.notice writes are
  best-effort. Pi JSONL and product state are separate stores, not one atomic commit.
- SIGKILL fixtures cover named write windows, not physical power-loss durability.
  A failed metadata append after a successful workspace rename can leave an
  unrecorded current file; it never manufactures an accepted content version.
- Whole-file concurrent writes do not promise model call order. A future
  read-modify-write tool needs per-file serialization, as described in
  [upstream extension guidance](https://github.com/earendil-works/pi/blob/v0.85.1/packages/coding-agent/docs/extensions.md).
- Shell, browser, subagents, scheduler, global skill/extension discovery and
  custom provider schemas are not exposed by this host. Workspace tool guards
  are not an OS sandbox.
- Both local wire formats exercise actual SDK tools and persistent history.
  Chat on the loopback endpoint does not emit prompt_cache_key under the SDK's
  short-retention policy; the test proves prefix continuity, not real Chat
  cache identity/hits. Responses explicitly checks its request cache key.

The detailed independent reports and source/archive receipts are held with the
engineering handoff. Those reports separate source-supported implementation,
fixture behavior, explicit missing capabilities and real-provider/UI work.
