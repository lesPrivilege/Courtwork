# SE Runtime Control / Search Reference Index

只读核验报告。产品源码、测试和 lockfile 未修改。

## 1. Fixed upstream sources

### microsoft/tgrep

- Repository: <https://github.com/microsoft/tgrep>
- `main` at verification time: `e2007b52d2b8fe4176159d0da20c9ba4a46d5aab`.
- Latest formal release verified: [`v1.0.4`](https://github.com/microsoft/tgrep/releases/tag/v1.0.4), released 2026-09-07.
- Annotated tag object: `a99fb3d59fa0ba4bb4f6000dfc6d44ca3c4e939f`.
- Pin the peeled release commit, not the moving branch or tag object:
  `75894b124c4e53586032d7a41524168dfa02f480`.
- Fixed README/source views:
  - [README at v1.0.4](https://github.com/microsoft/tgrep/blob/75894b124c4e53586032d7a41524168dfa02f480/README.md)
  - [client/server search path](https://github.com/microsoft/tgrep/blob/75894b124c4e53586032d7a41524168dfa02f480/tgrep-cli/src/search.rs)
  - [TCP server, watcher and reconciliation](https://github.com/microsoft/tgrep/blob/75894b124c4e53586032d7a41524168dfa02f480/tgrep-cli/src/serve.rs)

The release README documents a trigram index, client/server TCP JSON-RPC,
multiple clients, a live watcher, `--files`, `-l/--files-with-matches`,
`-c/--count`, `-A/-B/-C`, `--json`, and a `--no-index` walk fallback. The
server also has a lock and a `serve.json` PID/port discovery file.

### GitHub Copilot CLI reference

- [Official command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference)
- The `USE_TGREP` setting can force tgrep, force ripgrep, or leave selection to
  a platform-specific repository-size threshold. This is evidence for an
  internal backend policy, not a model-visible `tgrep` tool contract.
- The same reference keeps MCP and plugins as separate control surfaces and
  allows read-only MCP listing while a turn is busy, while mutations wait for
  the turn to finish.

## 2. Benchmark and cold-index corrections

The current pinned v1.0.4 README reports a maximum measured speedup of about
52x and says the margin depends on result volume. The measurements are
index-prebuilt, per-query averages across a finite benchmark matrix; they are
not a runtime guarantee for this workspace. The supplied material's older
“up to 72x” statement must not be carried forward as the current release
claim.

The current README also distinguishes “queries are accepted while background
indexing runs” from result completeness: on the first build from no index, the
server answers from an empty index until that initial build finishes. It must
not be described as partial coverage. Existing-index startup and subsequent
watcher updates are different paths.

Other relevant release semantics:

- Index and serve membership flags must agree (`--no-require-git`,
  `--no-ignore`, `--max-filesize`, `--exclude`).
- The default file-size cap is 64 MiB, unlike ripgrep's uncapped default.
- tgrep does not share all ripgrep text semantics: it has its own binary,
  invalid-UTF-8, multiline, and size-limit behavior even though `--json` is
  described as ripgrep-compatible.
- `serve.json` contains only PID and port. A host adapter must own the index
  directory, validate process/lifecycle ownership, and not blindly trust a
  stale discovery file.

## 3. Local source evidence

Worktree checked:
`<isolated-checkout>`

- ``app/runtime/workspace-tools.mjs:139`` (source: <isolated-checkout>)
  `listTree()` recursively enumerates files, reads every file, and hashes the
  bytes before returning entries.
- ``app/runtime/workspace-tools.mjs:321`` (source: <isolated-checkout>)
  `createWsGrepTool()` uses `listTree()` for a directory search, so a `.` query
  performs a full read/hash pre-scan before the worker starts matching.
- ``app/runtime/workspace-tools.mjs:289`` (source: <isolated-checkout>)
  runs the regex in a disposable worker with a 2,000 ms timeout and awaits
  termination on cancellation.
- ``app/runtime/workspace-tools.mjs:19`` (source: <isolated-checkout>)
  defines a 512 KiB read/grep file limit and a 200-result cap.
- ``app/runtime/grep-worker.mjs:5`` (source: <isolated-checkout>)
  accepts only host-enumerated relative paths and returns `{path, line, text}`
  matches. It has no files-only, count, context, or explicit query-limit mode.
- ``app/runtime/control-plane.mjs:7`` (source: <isolated-checkout>)
  enumerates distinct runtime resource kinds and scopes.
- ``app/runtime/control-plane.mjs:130`` (source: <isolated-checkout>)
  projects installed/running/exposed/health/provenance/permission state and
  binds a snapshot for a Run.
- ``app/runtime/control-tools.mjs:6`` (source: <isolated-checkout>)
  implements metadata-first `runtime_load`; content loading does not grant
  tools or plugin authority.

Targeted verification already completed before this report was requested:

```text
node --test tests/workspace.test.mjs tests/control-plane.test.mjs
25 passed, 0 failed
```

## 4. Borrow / do not borrow

Borrow the concept of a persistent lexical index, live file updates, bounded
files/count/anchor/context outputs, and a ripgrep-shaped machine-readable
stream. Keep `ws_grep` as the stable model-facing contract.

Do not expose the tgrep CLI as the runtime contract. Do not pass model-chosen
`--follow`, `--no-ignore`, `--no-index`, or arbitrary `--index-path` flags. Do
not inherit the 64 MiB cap, tgrep's longer client timeout, or its UTF-8/binary
semantics without an explicit host normalization policy. Do not run an
unpinned or unverified binary.

## 5. Required fix and adapter seam

The concrete current search issue is the `listTree()` pre-scan: adding a tgrep
backend without removing or bypassing that path would still read and hash the
whole workspace before searching. At minimum, directory grep needs a
path/stat-only enumeration or a backend-owned index path. The existing path
guard, no-symlink behavior, 512 KiB/200-result ceilings, and 2-second
cancellation boundary must remain host-owned.

The later adapter should be internal and replaceable:

```text
SearchBackend.search({
  root, pattern, mode, scope, output, limit, context, signal
}) -> {
  backend, matches, truncated, diagnostics
}
```

Use tgrep v1.0.4 at the pinned commit for large/hot workspaces and ripgrep (or
the current worker) for small/cold/fallback cases. Runtime service should own
per-workspace index/process startup, shutdown, stale PID/lock handling,
cancellation, freshness diagnostics, and JSON normalization. The model should
see lexical progressive disclosure—files first, then bounded anchors/context,
then explicit `ws_read`—rather than a backend name.

Unverified/postponed items are binary provenance/checksum, process ownership
under the runtime data directory, tgrep/rg output parity against current
`ws_grep`, cold-start/index-lag behavior, and backend cancellation tests.
