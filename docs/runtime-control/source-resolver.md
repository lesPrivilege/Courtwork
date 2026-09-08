# Runtime R2: explicit declarative source resolution

Status: isolated backend slice, 2026-09-08. This is the local source parser for BE-5 / WK-64–65; it does not complete the Runtime R2 acquisition stage, the Roadmap R2 gate, R3 adapter compatibility, R4 proposals or R5 apply/rollback. Frontend integration waits for Fable's new delivery. No HTTP route or model tool is enabled by this slice.

The implementation is `app/runtime/source-resolver.mjs`; the input/result contract is `app/runtime/source-resolver.d.ts`. It reuses `validateRuntimeSource` from the existing control-plane import validator. The existing importer still owns IDs, target scope, inventory limits, CAS, persistence and exposure. No persisted schema changes.

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
