# Runtime R2: explicit declarative source resolution

Status: isolated backend slice, 2026-09-08, with a bounded HTTP service seam added 2026-09-10 (BE-5). This is the local source parser for BE-5 / WK-64–65; it does not complete the Runtime R2 acquisition stage, the Roadmap R2 gate, R3 adapter compatibility, R4 proposals or R5 apply/rollback. Frontend integration waits for Fable's new delivery. No model tool or install path is enabled by this slice.

The implementation is `app/runtime/source-resolver.mjs`; the input/result contract is `app/runtime/source-resolver.d.ts`. It reuses `validateRuntimeSource` from the existing control-plane import validator. The existing importer still owns IDs, target scope, inventory limits, CAS, persistence and exposure. No persisted schema changes.

## HTTP service seam (BE-5, 2026-09-10)

A thin, sessionless seam exposes the same pure resolver over the authenticated HTTP boundary as `POST /api/v5/runtime-sources/resolve` (`RuntimeService#resolveRuntimeSource` in `app/server/service.mjs`, one route in `app/server/index.mjs`). The request body is directly the resolver input — no proposal envelope — and the response is directly the `ResolvedRuntimeArtifact | UnsupportedRuntimeSource` union. The route inherits the host `x-work-token`, origin protections and 1 MiB body cap. Resolver 400s carry their own code on a plain `Error`; the service adapts them to the host `ServiceError` shape so the HTTP layer reports the same 4xx (`invalid_runtime_source` / `invalid_runtime_config`). See the [HTTP contract](api.md) for the request/response examples and exact boundaries.

The seam changes none of the resolver semantics: inline keeps exact bytes/hash, declared `origin` stays `verified: false`, `capabilities.granted` stays empty, disposition stays `inspect-only`, and locators stay explicitly `unsupported`. Resolution touches no store, configuration, revision, resource directory or mutation queue, so it also works while a Run is active without altering that Run's binding or capabilities, and it never imports. No model tool is registered and request bodies are not logged.

## Contract

`resolveRuntimeSource(input)` is synchronous and inspect-only. It accepts supplied inline `kind`, `title` and exact `content` for the six existing imported kinds: instruction, skill, reference, prompt_template, agent_profile and mcp_server. No target is chosen during resolution: source identity differs from an installed resource's `local:<name>` and owning scope. Optional `origin: {uri, version?}` is a caller assertion, retained under `provenance.declaredOrigin` with `verified: false`; it is never fetched or used as an authenticity claim.

A resolved artifact contains:

| Field | Meaning |
|---|---|
| identity.contentSha256 | SHA-256 of the supplied UTF-8 content bytes, without whitespace/newline normalization |
| identity.artifactSha256 | SHA-256 of JSON serialization of the ordered `{kind,title,content}` object; binds the interpretation and display title to those bytes |
| identity.bytes / characters | UTF-8 bytes / JavaScript UTF-16 code units; neither is a token count |
| portable | Those three exact source fields, suitable for subsequent target-aware validation; not an operation or approval |
| provenance / trust | Supplied inline, unverified; a claimed URI/version does not become a verified source |
| native | Empty: no native executable contribution or package subtree was acquired or inspected |
| capabilities.declared | Skill metadata or profile references/slots or MCP transport/protocol declarations, where present |
| capabilities.granted | Always empty; resolution grants no permissions |
| requirements | Profile resource references and MCP connection remain unchecked, without querying a runtime |
| adapters | Only `courtwork-declarative-source-v1: syntax-accepted`; this is not a Native/Semantic/Lossy compatibility grade |
| disposition | Always inspect-only; no install, exposure, connection, execution or formal acceptance |

Skill parsing uses the already locked Pi 0.85.1 public frontmatter parser. Script references, bundled assets, allowed-tools and compatibility do not trigger execution or dependency acquisition. Malformed YAML returns a 400 validation error; cyclic projected metadata is rejected before import, preventing an unserializable runtime snapshot. Profiles use the existing versioned JSON rules and two allowed declarative UI slots; missing referenced resources stay unchecked. MCP uses `parseMcpConfig` only; the existing HTTPS/loopback, no-credential-URL, explicit transport/protocol rules apply. No server discovery happens. A syntactically accepted endpoint is not a verified or usable connection. Prompt templates retain draft semantics.

Known locator inputs have `{type:'locator', locator:'url'|'repository'|'package'|'path'|'manifest', value}`. They return `status:'unsupported'`, reason `source_acquisition_not_implemented`, and no content identity. No source target is read, fetched, cloned or installed. Malformed input, unknown discriminants, extra fields, unsupported inline kinds and invalid content throw a 400 error (`invalid_runtime_source` for the resolver envelope, existing `invalid_runtime_config` for source validation). The resolver never guesses a kind from a URL suffix or silently drops executable fields.

Example:

```js
resolveRuntimeSource({
  type: 'inline', kind: 'reference', title: 'Synthetic reference',
  content: 'Exact source bytes\n',
  origin: { uri: 'https://example.invalid/declared', version: 'v1' },
});
```

## Ownership and next steps

This is a callable backend module, not a UI-ready service. Future source acquisition requires a separate bounded contract for URL/repository/package/path authority, byte limits, immutable source version, errors and credential handling. Future proposals must bind the resolved bytes, target identity/scope, target revision, effective changes and permission consequences. Apply must revalidate against current state under the existing configuration queue/CAS; neither a resolver hash nor `portable` constitutes approval. No proposal store, installer, registry, new skill execution, custom UI renderer or model-side resolve tool is introduced here.

The frozen local source investigations are sufficient for this slice: [existing source boundaries](sources.md) (Pi public parser, declarative skills and profiles) and [DSH investigation](../../engineering/mvp/execution/work-surface-kit/explore/ex-wk6-dsh-plugins-webui.md) (no equivalent external Source Resolver; its code define/run lifecycle is not adopted). Their historical versions are preserved. No new dependency, external source fetch or upstream parity claim.

Validation and independent review: [isolated backend evidence](../../evidence/runtime-resolver-20260908/README.md). Real providers and browser integration are not part of this slice.
