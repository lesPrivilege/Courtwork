# Runtime source resolver · independent review

Date: 2026-09-08 (Asia/Singapore)

Scope: isolated `codex/runtime-source-resolver` worktree based on `b0173deab477b9be577df75a712f446d14e3c356`. Reviewed only the R2 local declarative slice: `source-resolver.mjs`, its `.d.ts`, the shared validator extraction in `control-plane.mjs`, the focused tests, and the source-resolver contract. No product/UI/model-tool changes were made by this review.

## Result

**Pass for the stated slice; no blocking finding remains after the shared validator fix.** The resolver is synchronous and inspect-only. It does not add an authority path, persist configuration, expose resources, connect MCP, execute content, read a path, fetch a locator, install a package, or register an HTTP/model-tool entry.

## Evidence

- `app/runtime/source-resolver.mjs:1-3,18-22` imports only `node:crypto` and the shared validator. A source scan found no filesystem, HTTP, fetch, child-process, configuration mutation, or execution call. The module has no top-level I/O; the imported control-plane module only defines functions at module load.
- The focused test `R2: MCP and locators never fetch, connect or read their declared target` installs a throwing `globalThis.fetch` sentinel. Inline MCP is accepted through syntax parsing only, and all five known locators return `unsupported` with `source_acquisition_not_implemented` and no identity.
- `control-plane.mjs:44-65` now validates IDs/scope at the importer and delegates kind/content validation to `validateRuntimeSource`. The existing control-plane suite still passes, so CAS, scope, persistence, context, MCP lifecycle and policy behavior survived extraction.
- The shared validator now normalizes malformed Pi YAML to status 400/code `invalid_runtime_config` and rejects cyclic `allowed-tools`/`compatibility` values before persistence. The added regression proves both resolver and importer leave revision 0, resources empty, and the config file absent.
- `source-resolver.mjs:71-80` hashes exact content bytes with SHA-256, distinguishes UTF-8 bytes from UTF-16 characters, and binds `{kind,title,content}` in a fixed-order artifact hash. The input/output copy test confirms origin and portable source ownership; changing caller input does not mutate the result. `capabilities.granted` is always empty and `trust` remains `unverified`.
- `source-resolver.mjs:42-66,81-87` projects only declarative skill/profile/MCP metadata. Profile resource IDs and MCP connection are `unchecked`; skill `allowed-tools`, compatibility, scripts and assets remain metadata/diagnostics. `native` is empty and the adapter marker is explicitly syntax-only, so no R3 compatibility or execution claim is introduced.
- `source-resolver.d.ts` matches the runtime result and unsupported-locator branches, including the six imported kinds, inspect-only disposition, unverified inline provenance, empty grants/native arrays, unchecked requirements and stable adapter marker. There is no TypeScript compiler in the worktree, so no standalone `tsc` check is claimed.

## Reproduction

Commands run independently after the malformed-YAML/cyclic-metadata fix:

```text
node --test app/tests/source-resolver.test.mjs app/tests/control-plane.test.mjs
22 tests passed, 0 failed

npm test   # from app/
145 tests passed, 0 failed, 0 cancelled, 0 skipped

node --check app/runtime/source-resolver.mjs
node --check app/runtime/control-plane.mjs
node --check app/tests/source-resolver.test.mjs
git diff --check
all passed
```

The full suite used temporary test directories and did not invoke real providers or the Web UI. The result is acceptance of this isolated parser/contract slice only; external acquisition, proposals, apply/rollback, R3 compatibility, Expert snapshots, HTTP integration and model-side primitives remain outside this review.
