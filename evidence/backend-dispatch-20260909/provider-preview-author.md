# BE-PREVIEW author receipt · 2026-09-09

Author: Astra (`gpt-6-astra / low`). Branch `codex/astra-provider-preview`,
base `a431650b8c4726adc10905485aaadfdb1983689c`, initially clean isolated
worktree `cw-astra-provider-preview`. This is author evidence, not independent
acceptance. Root Astra owns diff review, integration and acceptance.

## Delivered boundary

Two authenticated POST routes perform an ephemeral OpenAI-compatible `/models`
request using only the supplied API root and optional key. The helper imports
no service, credential, store or model runtime. It never creates a Run or
registers discovered models. Existing GET catalog behavior is unchanged.

The [runtime contract](../../app/docs/runtime-foundation.md#unsaved-provider-preview-be-1718)
freezes request fields, trailing slash behavior, result fields, status mapping,
limits and unsupported behavior. A test handshake validates a directory and
returns no model list; it does not generate text or establish inference readiness.

Limits: 5-second complete-request deadline, 256 KiB decoded response stream,
1000 entries, 240-character IDs. Redirects are never followed. Rejected responses
are cancelled. Error responses use fixed messages and contain no upstream body,
headers, URL, key or exception. Models expose only IDs; echoed explicit keys in
IDs are rejected. No upstream capability claims are promoted.

## Author verification

All fixtures use independent temporary runtime data and loopback ports allocated
by the OS. No paid provider or personal credential store was used.

- `npm --prefix app ci`: passed, existing lockfile unchanged, 277 packages,
  0 audit vulnerabilities. npm emitted the existing node-domexception deprecation
  warning twice.
- `node --test app/tests/provider-preview.test.mjs app/tests/provider-protocol.test.mjs app/tests/credentials.test.mjs`:
  8/8 passed (12.5 s).
- `npm --prefix app test`: 209/209 passed (35.3 s), no failures/skips.
- `npm --prefix app run smoke`: passed all seven local-fake material/tool/artifact/
  reopen/continuation/revision/history checks; realProvider `not_run`.
- Strengthened the preview test after that full run to use an endless chunked
  response without Content-Length and await the upstream close event, proving
  actual stream cancellation. Targeted rerun: 1/1 passed (10.8 s).
- Added an existing completed synthetic Run before the snapshot, so unchanged
  Run bindings are tested on nonempty state. Final targeted rerun: 1/1 passed (11.4 s).
- `git diff --check`: passed.

The actual HTTP test covers both routes' token requirement, API-root path
construction, explicit Bearer forwarding and omitted-key behavior despite an
existing saved synthetic credential, successful/empty catalogs, 401/403,
404/405/501, 500, redirects and no target hit, invalid JSON/structure and
model fields/count, byte cap, header and body deadlines, closed-server
unreachability, invalid body/URL/protocol/key/unknown fields, duplicate IDs and
secret echo rejection. It compares pre/post public provider configuration,
installed catalog, Session, Runs, credentials file bytes, runtime-state bytes,
credential generation and ModelRuntime models; logs contain no probe secret.

No test failures were encountered. The initial source reconnaissance tried two
nonexistent test filenames; subsequent reads used the actual helpers and tests.

## Remaining

Saving/executing arbitrary compatible or local providers remains unsupported by
the existing provider/model allowlist. This requires a separate registry,
credential and Session-binding contract. No frontend changes, real provider
validation, deployment or full FE-02 acceptance are claimed.
