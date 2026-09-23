# Runtime selection baseline — Sol 6, 2026-09-23

Source: /Users/lesprivilege/Projects/Courtwork, branch main, HEAD 159ca0050b70881a463ab41926ff16ec15363ef1. Working tree had only pre-existing untracked .agents/, .obsidian/, skills-lock.json. No repository edits.

Command (cwd app): env -u OPENAI_API_KEY -u DEEPSEEK_API_KEY TMPDIR=/tmp/cw-runtime-binding-sol6-20260923/test-tmp node --test --test-concurrency=1 tests/pi-runtime-port.test.mjs tests/drt03-agents-transport.test.mjs tests/p03c-host-consumer.test.mjs tests/kit-run-binding.test.mjs tests/kit-binding-store.test.mjs
Exit: 0; tests 52, passed 52, failed 0. Full output: targeted-tests.log. Installed app/node_modules and Node v25.9.0; no package change, personal store, paid provider, user service or browser.

| Executable baseline | Actual fixture / source pin | What the next slice can demonstrate |
| --- | --- | --- |
| Host runtime injection | app/server/runtime.mjs createRuntime(runtimePort) defaults to createPiRuntimePort; app/tests/pi-runtime-port.test.mjs wraps production Pi port through HTTP. | New selection can be checked through production Host with an injected executor while preserving default Pi. Current construction is one port per Host, not a persisted per-Session selector. |
| Pi identity and continuation | pi-runtime-port.test.mjs first/second Run, pre-port journal, command replay, capability refusal; PI_RUNTIME_ADAPTER_ID = pi-coding-agent@0.85.1/agent-session. | Existing journal locator and adapterId must survive repeat/reopen; unsupported operations refuse before side effects. |
| Agents wire and Host consumer | drt03-agents-transport.test.mjs exact wire identity/once-only attempts; p03c-host-consumer.test.mjs production Host + loopback API + synthetic repository. | Reuse this fixture for one supported alternate executor and frozen remote identity, without a live account claim. |
| Existing Chat ownership | p03c-host-consumer.test.mjs final test rejects Pi→Agents and Agents→Pi with runtime_mismatch after crash copy/reopen; changed remote credential generation rejects remote_binding_mismatch. | Persisted choice must keep this no-hot-swap behavior; no inferred migration. |
| Profile/Kit gate | app/server/service.mjs binds runtime control and checks runtimeSelection revision/profileId/sourceHash, compatibility, then retainKitContext(adapter: runtimePort.describe()); kit-run-binding.test.mjs stale intent/zero-provider-call refusals and frozen context; kit-binding-store.test.mjs schema21 reopen/corruption checks. | Next fixture should prove configured executor eligibility and Kit constraints before Run/provider dispatch, then frozen Run identity and restart. |

Known fences: Agents API tests use offline loopback, not account-authorized live execution. The default Host currently has one injected runtimePort; these tests do not establish persisted Session/Run runtime selection or arbitrary profile/Kit portability. They also do not authorize native Pi tools, Hermes, remote code, or active-Run hot swap. Architecture and persisted DTO contract remain with parent Astra/Luna.
