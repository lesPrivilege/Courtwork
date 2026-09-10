# VS-04 independent review · e65cac1

Review target: fixed commit `e65cac1af7ed92afa487cdffe8c478876f4577db` in a detached clean snapshot. The author is Astra; this is a source and behavior review, not product acceptance or visual acceptance. Scope is the Chat action renderer/adapters and Chat/Attention/file wiring, plus the bounded Home, Attention, Settings and saved model/catalog wording changes.

## Evidence

- The candidate contract records the intended identity as session/opening epoch, projection and original bytes, and says detached async results cannot update a replacement (`engineering/execution/2026-09-11-semantic-polish/chat-actions.md:7,19-29`). The production caller puts session, epoch, row kind and row id into `target.key` (`app/web/app.mjs:2486-2495`); Attention does the same with its opening epoch (`app/web/attention-agent-view.mjs:36-47`).
- The renderer's actual replacement gate compares only `key`, `role`, `text`, `pending`, `path` and `sha256` (`app/web/chat-actions.mjs:41-42,49-62`). It omits `sessionId`, `runId` and `projectionId`, despite capturing those fields in production targets (`app/web/app.mjs:2488-2489`).
- Reproduction: in `app/tests/tiny-dom.mjs`, mount `createChatActions` with target `{key:'same',role:'assistant',text:'same',pending:false,sessionId:'s',runId:'r1',projectionId:'p1'}`, make `getTarget()` return the same values with `runId:'r2',projectionId:'p2'`, invoke `like`, then resolve `{state:'selected',selection:'like',message:'stale'}`. The current gate accepts it (`stale? true`, `aria-pressed=true`). A replacement with changed text is covered; this same-bytes/different-record case is not.
- `createProductionActionAdapter.availability()` treats every function-valued handler as available (`app/web/chat-actions.mjs:25-30`), while `invoke()` discards the handler result and always returns `{state:'success'}` unless the handler returns `false` (`:32-37`). A supplied `like`, `dislike`, `pin` or `read-aloud` handler therefore advertises capability but cannot return the `selection`, `pinned` or playback state that `createChatActions` validates (`:123-135`). Current production wiring supplies only copy/edit or copy-path/copy-hash (`app/web/app.mjs:2492-2495,3000-3003`), so this is latent at this commit rather than a visible enabled control.
- The production route admits `chat-actions.mjs` as a browser module (`app/server/index.mjs:14-27`); the synthetic fixture remains separate. The checked standalone synthetic server is GET-only, maps only `/demo/*` and `/web/*`, rejects traversal and has no API proxy (`evidence/semantic-polish-20260911/chat-demo-server.mjs:1-16`).
- Home labels and set boundaries are wired through the existing adapters (`app/web/home-view.mjs:29-52,95-171,501-635`; `app/web/presentation-adapters.mjs:40-114`), and Home retains all `sessionCandidates` rows including no-run rows (`presentation-adapters.mjs:97-113`).
- Settings preserves Host details disclosure across data refresh (`app/web/settings-view.mjs:2525-2549`), sends the same fetched catalog to Runtime (`:916-924,1538-1553`), and Runtime matches context capacity on exact provider/model identity (`app/web/runtime-view.mjs:2246-2305`). Installed tools without lifecycle keep Installed/Running in expanded detail while Exposed/Permitted stay beside the name (`runtime-view.mjs:997-1098`).

## Checks

In the clean fixed snapshot:

```text
node --test app/tests/chat-actions.test.mjs app/tests/home-presentation.test.mjs app/tests/presentation-adapters.test.mjs app/tests/attention-agent.test.mjs app/tests/attention-actions.test.mjs app/tests/settings-navigation.test.mjs app/tests/settings-preferences.test.mjs app/tests/runtime-projection.test.mjs app/tests/runtime-workbench.test.mjs app/tests/provider-config-module.test.mjs app/tests/models-connections.test.mjs app/tests/coordination-view.test.mjs
120 passed, 0 failed
```

The checks cover intended behavior and the author’s listed regression cases, but do not cover same-key record replacement or non-copy structured production handlers. No browser or visual acceptance claim is made.

## Handoff

P1: strengthen the replacement identity comparison (or enforce a collision-proof key at the adapter boundary) so a same-text replacement from another run/projection cannot accept a detached result.

P2: either keep production availability closed to the currently supported copy/edit/file-copy handlers, or pass through and validate structured handler results before advertising feedback/playback/pin availability. Add negative tests for both seams before claiming the corresponding lifecycle controls are host-ready.

## Closure · d6c75ef

Review date: 2026-09-11. Astra's fixed commit
`d6c75ef54ccb826d25226f35ed056723a26ed893` was checked in the active
worktree at that exact `HEAD`; concurrent Site edits and unrelated untracked
evidence were left untouched.

Both reported seams are closed in the fixed source:

- `sameTarget` now requires `sessionId`, `runId` and `projectionId` in addition
  to the existing key, role, text, pending, path and hash fields
  (`app/web/chat-actions.mjs:42-44`). The added regression iterates each of
  those three fields with identical key and message bytes and confirms that a
  detached result cannot set stale feedback (`app/tests/chat-actions.test.mjs:49-60`).
- `createProductionActionAdapter` uses the explicit four-intent set
  `copy`, `edit`, `copy-path`, `copy-hash`; supplied lifecycle handlers remain
  unavailable and are never invoked (`app/web/chat-actions.mjs:23-37`). The
  added regression covers supplied `like`, `dislike`, `pin`, `read-aloud`,
  `share` and `regenerate` handlers (`app/tests/chat-actions.test.mjs:40-48`).

Focused verification against the fixed commit:

```text
node --test app/tests/chat-actions.test.mjs
8 passed, 0 failed
```

An independent harness also passed 11/11 supplied undeclared-handler
rejections, 4/4 declared-handler admissions, and 3/3 same-byte replacement
checks for the three identity fields. The prior two findings are closed for
this bounded source and focused-test review. No browser, visual, accessibility,
or full-product acceptance is claimed.
