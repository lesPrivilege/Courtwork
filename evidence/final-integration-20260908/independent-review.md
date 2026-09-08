# MCP permission projection · independent review

Date: 2026-09-08 (Asia/Singapore)

Scope: read-only review of the uncommitted MCP permission projection patch on
`/private/tmp/courtwork-final-integration-20260908` at HEAD `c1b19f6`.
The only file written by this review is this evidence receipt; product and
browser-chain files were not changed.

## Result

The runtime-to-UI mapping passes the reviewed MCP slice. The shared permission
envelope remains usable for both file writes and remote actions, while the
Write branch is selected only by the recorded `payload.tool === "ws_write"`
identity. A path, byte count, preview, or hash by itself cannot acquire Write
copy. A remote action is matched by `tool:<executionName>` in that Run's
recorded `runtime.bound` resources and displays the bound MCP name, server
id, and source URI. Missing tool/binding data falls back to Action and does
not consult the current catalog.

The earlier copy-contract P2 is **closed by the documentation clarification**.
`engineering/design/copy-convention.md:47` now explicitly separates the
non-write status word (`Action`), decision buttons (`Allow this action` /
`Deny action`), and fact-specific headings (`Allow this tool action?` /
`Allow this remote tool call?`). This matches
`app/web/thread-projection.mjs:165-173` and the button strings at
`app/web/app.mjs:4330-4333`; retaining the remote heading therefore preserves
the intended UI consequence.

`engineering/mvp/execution/work-surface-kit/contracts/review-projection.md:60-62`
also records the same runtime fact boundary: only `ws_write` receives write
semantics, other tools bind argument metadata, and missing historical tool
identity uses conservative generic action wording. No permission authority,
write classification, replay, or MCP transport issue remains in the reviewed
scope.

## Evidence

- Focused runtime/UI command:

  `node --test app/tests/ui-event-mapping.test.mjs app/tests/control-plane.test.mjs app/tests/permission.test.mjs`

  **25 tests passed, 0 failed**. This includes modern and legacy MCP
  discovery, parent exposure and execution consent, unknown remote outcomes,
  permission races, exact write checks, and the new remote/missing-binding
  projection cases.

- Syntax checks passed for
  `app/web/thread-projection.mjs`, `app/web/app.mjs`,
  `app/web/home-view.mjs`, and
  `app/tests/ui-event-mapping.test.mjs`. `git diff --check` passed.

- An independent loopback Streamable HTTP fixture used random ports and the
  actual service path. The fixture advertised an `echo` tool; after connect
  and parent exposure, the run opened a permission before any
  `tools/call`. The persisted records were:

  ```text
  permission.open.data.tool   = mcp_<host-generated-name>
  permission.open.data.path   = *
  runtime.bound resource.mcp  = { name: "echo", serverId: "local:remote-fixture" }
  runtime.bound source.uri     = http://127.0.0.1:<ephemeral-port>
  presentation.noun           = action
  presentation.title          = Allow this remote tool call?
  presentation.target        = echo · local:remote-fixture
  presentation.source         = http://127.0.0.1:<ephemeral-port>
  MCP calls before answer    = server/discover, tools/list, resources/list, prompts/list
  tools/call before answer   = 0
  ```

- Source trace: `app/runtime/control-tools.mjs:22-41` creates the permission
  payload from the exact remote arguments and asks when the bound descriptor
  is MCP; `app/runtime/control-plane.mjs:159-162` binds the host execution
  name to original MCP name/server/source; `app/server/store.mjs:414-416`
  persists `runtime.bound` before the run proceeds and
  `app/server/store.mjs:457-464` persists `permission.open`;
  `app/web/app.mjs:4242-4340` reads the same-run binding and uses the shared
  projection.

- The matrix check covered explicit `ws_write` → `noun: write`, bound MCP
  → `noun: action`, missing binding/path-only → `noun: action`, and
  `ws_read` → `noun: action`.

## Bounded Home status-width follow-up

The pre-fix capture `home-empty-geometry-before.json` recorded a desktop
status paragraph at `left: 278, width: 1134`, while the composer form was
`left: 475, width: 740`; the paragraph was already outside the form, but its
content column was too wide. The bounded CSS change at
`app/web/styles.css:2811` adds `max-width: var(--column)`, centered margins,
and the shared inline padding. The rerun in `home-empty-geometry.json` passes
all four combinations (1440/390 × light/dark): desktop status is
`left: 475, width: 740`, narrow status is `left: 16, width: 358`, the status
remains outside and below the form, overflow is zero, and the input remains
64px high. This closes the geometry finding without changing the Home layout
or its responsive breakpoint.

## Reviewed source fingerprints

```text
app/web/thread-projection.mjs       8c968393744a4bbdeeb6e63d6a9d0cd09c686bfcd36bf93ff414ae9f124a7a52
app/web/app.mjs                     0f26e8eb9c517b90ae2af86a9a91ccfbe3344f6f6d872bdf370a442ef460ce6e
app/web/home-view.mjs               14db1aeec588d9489dd5a43216220e96a9a2ccab9f4c039182a341a924c51cde
app/web/styles.css                  0543fb9588895358a507c1ebd718f50445dddfd50ebe8953275b639ce91ed468
app/tests/ui-event-mapping.test.mjs 9c7c7c1de1d17819ea1606804f2cb7319ce9bfbce43d7c766fc140c970c56421
engineering/design/copy-convention.md 513d489a7752dc6f086836144d2c5f43127bfc548c57e45dd3661df5994a12f6
engineering/mvp/execution/work-surface-kit/contracts/review-projection.md dbede31dbf7c0f25561a806b98a05e48ede765fc94911d885b9b86df20bd2b78
```
