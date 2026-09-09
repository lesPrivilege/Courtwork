# AM-B-T4 independent recovery receipt

Validator: Terra, who did not author A0/A1. Product under test: fixed
`35f4bf057392e67a9c9b3b91727d5895edb12e0c`. This delivery adds only an
independent test, a test-only loopback adapter/host child, and this receipt.

Each crash case starts the real `startServer` host and its real Pi tool path in
a separate process, with `SE_TEST_MODE=1` and one armed async hook. The adapter
uses the T2 local provider on a fresh port-0 endpoint and synthetic temporary
directories. No account, credential, or external provider is used.

The checks cover `async_intent`, `async_dispatch`, `async_result`, and
`async_delivery`. Restart preserves exactly one Run and retained original task
ID/source digest, marks the unfinished execution `unknown` with
`host_restart`, and does not create a Run or relaunch remotely. Intent and
dispatch are explicitly unknown after restart despite no remote launch. At the
delivery hook, its prepared record lacks `runtimeRecordedAt` and no
`async_get` tool-result event claims delivery.

The independent store checks use real schema 3/4 input bytes and verify exact
backup/reopen. Each backup is copied to its own directory and opened by the
corresponding fixed historical host (schema 3: `b26670c`; schema 4: `7c07ef6`),
then invalid UTF-8 is rejected before a decoder can substitute bytes or rewrite
the file. A local detached worktree at fixed old main
`7c07ef6b5a19f0eb2c45b8894ab9911de87ea979` imports that old RuntimeStore and
proves it refuses a schema-5 file without changing its bytes. This exercises a
version boundary; it does not claim machine-power-loss durability, automatic
provider resume, native provider async, or product acceptance.
