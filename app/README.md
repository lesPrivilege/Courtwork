# CourtWork runtime and Web application

The local host composes the Web UI, Pi AgentSession, runtime control plane and Work Core. Start it from the [repository README](../README.md); the current HTTP contract is [api-v6.md](docs/api-v6.md).

The [source preview support table](docs/supported-preview.md) distinguishes usable capabilities from product roles.

An explicitly connected external directory is governed by the separate
[Session repository-binding contract](docs/repository-binding.md).

For the first supported work path, follow [the synthetic NDA walkthrough](docs/first-work.md). It covers the existing GUI configuration, source binding, human Review and same-Matter continuation.

## Modules

| Directory | Responsibility |
|---|---|
| `server/` | HTTP routes, session/run service, durable runtime state and asynchronous read tasks |
| `harness/` | Explicit Thread membership, local communication and child contract conformance |
| `runtime/` | Pi integration, model connections, scoped tools, permissions, resources and MCP |
| `core/` | Python Work Core, Node bridge and shared ownership of Matter state |
| `extensions/` | Registered work adapters and review renderers |
| `domains/` | Domain rules, proposal validation and fixtures |
| `web/` | Browser application and reusable presentation components |
| `tests/` | Runtime, Core and interface regression tests |
| `docs/` | API and runtime implementation reference |

The host owns runtime state and session journals; the Core owns candidates, evidence, versions and decisions. Work adapters pass proposals and human decisions through the Core. The UI reads projections and calls the host API.

See [runtime control](../docs/runtime-control/INDEX.md), [runtime foundation](docs/runtime-foundation.md), [work API](../docs/work-core/README.md) and [module architecture](../engineering/architecture.md). Run `npm run smoke` for the local material → tool → result → restart → revision path.

## Model connections

- **`fake-openai-loopback`** — a loopback HTTP server (`runtime/fake-provider.mjs`)
  that never leaves the process, used by every test and by default. Ordinary
  replies say `SIMULATED`. Its credential is a well-known constant
  (`fake-local-loopback-key`), but it is resolved through the *same*
  `ModelRuntime`/`setRuntimeApiKey`/credential-store lane as a real provider —
  the fake route is a deterministic stand-in for the execution path, not a
  separate code path.
- **`deepseek` and `openai`** — installed catalog models, with native Chat
  Completions or Responses dispatch. DeepSeek's non-default Responses format
  requires an explicit compatible endpoint. See the current
  [provider and cache contract](docs/runtime-foundation.md#api-selection-and-cache-continuity).
- The server never reads `~/.pi/agent/auth.json`, never reads an API key from
  its own process environment for its own use, and if it inherits
  `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `OPENAI_ADMIN_KEY`, `OPENAI_ORG_ID`,
  `OPENAI_PROJECT_ID`, `OPENAI_BASE_URL`, `OPENAI_WEBHOOK_SECRET`,
  `OPENAI_CUSTOM_HEADERS` or `OPENAI_LOG` from its parent process, it deletes
  them at startup (names logged, values never logged) so pi-ai's own
  per-provider env-var fallback cannot silently activate.

## Configuring a key

```sh
curl -X PUT http://127.0.0.1:<port>/api/v5/provider-credential \
  -H "content-type: application/json" -H "x-work-token: <token>" \
  -d '{"provider":"deepseek","apiKey":"sk-..."}'
```

The key is written only to `<dataDir>/credentials.json` (mode 0600),
independent of `runtime-state.json`, and is never echoed back by any endpoint,
event, or log line. `DELETE` the same path with `{"provider":"deepseek"}` to
clear it. Both endpoints (and `PUT /provider-config`) return `409 active_run`
while a Run is active — credentials and provider descriptor are frozen for
the duration of a Run, same as before.

## Governed object reads

Global Attention can discover explicitly disclosed Matter/Attention objects and progressively read bounded source/accepted Artifact pages. Human disclosure is an authenticated API in this backend slice; no new policy editor UI is included. Core4/app5 adds three same-owner disclosure tables, with an exclusive `.pre-governance-core-v4-app-v5.bak` before upgrading validated Core3/app4 (older supported pairs migrate in stages). Old Core3 hosts refuse the upgraded database; restore only into a separate directory with the matching host. See the [governance contract](../docs/work-core/governance.md) for scope, current-content grants, revocation, schema support and recovery.

## Run

Node.js >=22.19.0 on PATH and Git >=2.36 at `/usr/bin/git`. The Host runs Git
from that path with a closed environment, not through PATH. Git is required for
artifact writes; unavailable Git fails the write before workspace publication. From the `app` directory:

```sh
npm ci --ignore-scripts
SE_RUNTIME_DATA_DIR=/absolute/path/to/new-data-dir PORT=8804 node server/index.mjs
```

Use a fresh, independent data directory per instance — the host holds a POSIX
flock on it (`server/runtime-lock.py`, needs `python3` on `PATH`, or set
`WORK_AGENT_PYTHON`); do not run two hosts against the same data directory.
`python3` is a hard requirement, not a nicety: the lock has to live in a
separate process so an owner SIGKILL releases it. If it is missing, the server
refuses to start with `LOCK_NO_PYTHON` naming the reason — it never degrades to
running without a lock.
Stop with a normal signal (SIGINT/SIGTERM to the process, or call the
programmatic `close()`); do not leave a server listening past the end of a
task.

## Data directory layout

```
<dataDir>/
  runtime-state.json        # RuntimeStore (see "Store schema")
  runtime-state.schema<N>.<sha256>.json # exact pre-upgrade backup of a schema N store, one per upgrade
  runtime-control.json      # declarative resource/policy config schema 1, 0600
  runtime-state.json.*.tmp  # only ever transient; a leftover means a crash mid-write, and is swept and logged at startup
  credentials.json          # {connectionId: apiKey}, 0600, never in the store
  workspaces/<sessionId>/
    materials/               # POST .../materials writes here
    out/                      # where the model is expected to write results
  repository-candidates/<sha256(sessionId)>/<candidateId>/ # private Git worktree; never merged into its source
  artifact-history/<sha256(sessionId)>/objects.git/ # private reachable content blobs
  pi-agent/                  # AgentSession agentDir; nothing under ~/.pi is read or written
  pi-sessions/<sessionId>/   # one Pi JSONL session file per app session (the only conversation journal)
```

<a id="store-schema-v5-validated-v3v4-upgrade"></a>
<a id="store-schema-v7-validated-v3v4v5v6-upgrade"></a>
<a id="store-schema-v8-validated-v3v4v5v6v7-upgrade"></a>
<a id="store-schema-v9-validated-v3v4v5v6v7v8-upgrade"></a>
<a id="store-schema-v10-validated-v3v4v5v6v7v8v9-upgrade"></a>
<a id="store-schema-v11-validated-v3v4v5v6v7v8v9v10-upgrade"></a>
<a id="store-schema-v12-validated-v3v4v5v6v7v8v9v10v11-upgrade"></a>
<a id="store-schema-v13-validated-v3v4v5v6v7v8v9v10v11v12-upgrade"></a>
<a id="store-schema-v17-validated-v3v4v5v6v7v8v9v10v11v12v13v14v15v16-upgrade"></a>
<a id="store-schema-v18-validated-v3-v17-upgrade"></a>
<a id="store-schema-v19-validated-v3v18-upgrade"></a>
## Store schema

The Host RuntimeStore (`runtime-state.json`) is at `schemaVersion` 22. Core user
schema 4 and bridge app schema 5 are versioned separately by the Work Core and are
not affected by Store upgrades.

**Upgrade.** A valid schema 3 through 21 store is fully validated in its old shape
before anything is written, then upgraded in place. The exact original bytes are first
written, exclusively and with mode 0600, to `runtime-state.schema<N>.<sha256>.json`;
an existing backup path is never followed or overwritten, and recovery after an
interrupted upgrade is explicit. The upgraded state then replaces the store
atomically. Schema 1/2, malformed and future stores are rejected with `INVALID_STATE`
without overwriting the input. An older Host refuses a newer store without rewriting
it, so upgraded data must not be opened by an old Host; restore a backup only in a
separate directory with its matching Host. See the
[upgrade boundary](../docs/runtime-control/architecture.md#persistence-upgrade).

**Schema 22 records.** Each Session has a typed `executorChoice` and each Run an
`executorBinding` for the actual Runtime Port. Migration gives every older Session a
null executor factory reference and every older non-child Run a legacy binding; the
first new Run pins an explicitly configured matching port and increments the Session
choice revision once in the same Store transaction. Spark child Runs keep their
separate owner and a null ordinary executor binding. In-process Pi is the default and
the only executor a production Host registers; the managed Agents option becomes
available only when a trusted factory is injected into the Host and does not gain
availability from the offline fixture. A Run's immutable `kitBinding` (null for
older/no-Kit Runs) is projected atomically by `runtime.bound`; exact plan and context
bytes stay in ArtifactHistory and are verified before inference and recorded-context
reads. Only explicit Session-selected ordinary Chat on in-process Pi admits
reference-only Kits. Profile-v2 declarations do not grant permissions or prove
compatibility, and current configuration cannot reinterpret a recorded Run; see the
[K3 contract](../engineering/execution/claude-frontend-harness-2026-09-16/kit-run-binding-20260922.md)
and [Runtime Control API](../docs/runtime-control/api.md).

**History.** Each item names the schema that introduced the record; a store upgraded
from an earlier version gains it in its null/empty form and existing records keep
their bytes.

- 5: host-owned `asyncTasks` ([async tasks](docs/async-tasks.md)).
- 6: explicit Session scope, global or project ([Attention](docs/attention-agent.md)).
- 8: the coordination ledger ([Thread and local messaging](docs/coordination.md)).
- 9: one immutable `supersedes` link per Run ([Run attempts and lineage](docs/run-attempts.md)); older Runs receive a null predecessor.
- 10: the Provider Connections ledger.
- 11: durable pending configuration markers.
- 12: `providerConfigVersion` (a monotonic counter bumped by any `providerConfig` or `providerConnections` write), `providerVerifications` (one verify receipt per connection id, bound to `{providerConfigVersion, credentialGeneration}`; either changing invalidates it) and a per-model `reasoning: true | false | null`, defaulting to `null` (never declared).
- 13: exact `reasoningEfforts: null | string[]` on connection models; legacy booleans never create a ladder. The v12 upgrade increments `providerConfigVersion` and keeps historical verification receipts, which become stale through their existing binding. New Runs freeze `reasoningBinding`; `GET /provider-config` and `/provider-models` expose `version`, and `PUT /provider-config` requires `expectedVersion` (`409 config_conflict` when stale).
- 14: ordinary `unassigned` Chat scope, distinct from global Attention ([optional workspace chats](docs/projectless-chat.md)).
- 15: stable Spark assignment, attempt and mount state.
- 16: per-Session external repository binding and per-Run source binding snapshots; older Sessions gain no external binding and managed workspaces stay intact.
- 17: per-Session private Git candidate state, candidate command receipts, durable write-effect records; Runs freeze the candidate identity and revision.
- 18: the `operations` ledger (manual compaction excludes Runs while it runs and is recorded `unknown` after a restart).
- 19: `remoteBinding` and bounded `remoteActions` on Sessions and the `remoteBinding` each Run was admitted against; Pi's `hostSession={id,path}` is unchanged.
- 20: strict validation of Run-owned local Pi dispatch, process and retained-result events; no second ledger, valid schema 19 records keep their fields and event bytes. See the [Spark contract](docs/spark-agent.md#local-pi-process-consultation) and `tests/local-pi-schema20.test.mjs`.
- 21: Run-owned `kitBinding`.
- 22: Session `executorChoice` and Run `executorBinding`.

Optional model reasoning effort is frozen with the provider descriptor and request
telemetry is retained as host events; neither is a Store schema change. Core schemas
are unchanged by the durable read task contract.

### Session and Run records

Sessions do not keep a private
`_history` array: the reopened Pi JSONL session (via `SessionManager.open`)
is the only conversation journal, restored automatically into `AgentSession`
on the next Run for that app session. Session fields include `workspaceDir`,
`permissionMode` (`read_only` | `draft` | `ask`), `hostSession` (`{id,path}`
or `null` until the first Run), and `repositoryBinding`,
`repositoryBindingRevision`, `repositoryBindingCommands` for optional external
repository access, one private candidate and bounded candidate/write receipts. Each Session keeps at most 512 candidate lifecycle receipts and 512 write effects without eviction; new candidate lifecycle commands and writes are rejected at those receipt limits. Candidate writes also retain at most 64 MiB of prepared/unknown payloads, with capacity checked before payload pinning and again before the effect is stored. Candidate write bytes are pinned in session-scoped ArtifactHistory; prepared/unknown effects retain a bound reference, while confirmed/failed settlement clears only that effect reference. ArtifactHistory has no automatic deletion/GC policy, so the 64 MiB outstanding-effect payload budget is not a lifetime storage quota. A restarted prepared write is recorded as unknown and is never replayed. Run fields include `commandId`, `artifacts[]`,
`usage` (`{input,output,cacheRead,cacheWrite,turns,missing}`), `hostSession`,
`credentialGeneration`, `repositoryBindingSnapshot`, and `repositoryCandidateSnapshot`. Source `repo_*` reads keep using the connected directory; `candidate_*` tools read the private worktree, `repo_write` changes only that candidate, and `repo_diff` compares it with its fixed creation commit. See [repository binding and candidate tools](docs/repository-binding.md). Top-level `credentialGeneration` (added in v3) is the
persisted counter those run records freeze: it survives a restart, so a
post-restart credential change can never reuse a generation a pre-restart run
already recorded.

State is written to a temp file and renamed into place, so `runtime-state.json`
is always a complete version. A process killed between those two steps leaves a
`.tmp` behind; the next start deletes it and logs that it did, because the tmp
was never a source of truth.

## Artifacts: current file vs content version

`run.artifacts[]` and the `artifact.written` event record a **content version**
— `{path, bytes, sha256, kind: "content-version", writtenAt}`, the bytes as
written at one instant. `GET /sessions/:id/workspace/file` returns the
**current file** — `kind: "current"` plus the file's present `sha256`. Writing
the same path twice produces two content versions and one current file. A
Review or accept step may only quote a content version; a path on its own is
not a reference to content.

## Usage accounting

`run.usage` counters are accumulated in the host handle and read once on the
way out, so cancel and provider-failure paths keep whatever the provider
already reported. `missing: true` means the accounting is *incomplete*, never
that the numbers were reset — read it as "at least this much".

## Tools available to the model

The baseline exposes `ask_user`, bounded workspace tools (`ws_list`, `ws_read`,
`ws_write`, `ws_grep`), admitted domain-extension tools and explicit
`runtime_load`. Configured MCP Streamable HTTP servers can supply remote tools
under the control-plane exposure/permission contract. A network-capable MCP
tool is different from the built-in filesystem tools; remote provenance,
connection state, effect classification and unknown-result handling remain
visible and enforced. There is no arbitrary shell/browser tool or package
installer in this candidate. The [support table](docs/supported-preview.md) lists
what is usable per area.

Default Pi coding tools and automatic home-directory/repository resource
discovery stay disabled. Explicit host-registered skills/instructions/profiles
are governed by the [control plane](../docs/runtime-control/architecture.md).
Read-only/ask/deny and profile restrictions are checked at actual execution,
not inferred from an icon or UI switch.

An explicitly connected repository exposes bounded source reads through
`repo_list`, `repo_read` and `repo_grep`. If a separate Host-owned candidate is
active, that Run also gets `candidate_list`, `candidate_read`,
`candidate_grep`, `repo_write` and `repo_diff`; writes affect only the private
candidate. Managed `ws_*` tools keep using the separate Session workspace.
This is not arbitrary shell access or an OS sandbox. See
[repository binding and candidate tools](docs/repository-binding.md).

## Idempotent Run creation

`POST /api/v5/sessions/:id/runs` requires a client-supplied `commandId`. The
same `commandId` with the same `input` returns the original Run (200, same
id); the same `commandId` with a different `input` is `409 command_conflict`.
The uniqueness check runs inside the store's serialized mutation queue, so
this also holds for two concurrent requests racing on the same `commandId`.

## Cancel, failure, and restart

- **Cancel**: `stopping` → `AgentSession.abort()` → settle → `cancelled` (or
  `unknown` if this process never owned the Run). The tool wrapper layer
  receives the same abort signal; `ws_write` writes to a temp file and only
  renames it into place after a successful, non-aborted write, so a
  cancelled write never leaves a half-written file.
- **Failure**: provider/transport errors end the Run `failed` with
  `run.error.code` one of `credential_missing`, `provider_auth_failed`, or
  `provider_error` (known keys are redacted from provider error bodies before Pi writes its
  session journal, and from verify's observed model, request telemetry and log
  lines; a key echoed inside a successful 2xx stream, or spelled with `\uXXXX` or
  percent encoding, is not redacted).
- **Questions outliving their Run**: whatever ends a Run, a still-pending
  question or permission is closed with status `cancelled` and a recorded
  `question.resolved`/`permission.resolved` event. An answer that arrives
  afterwards is `409`, never a silently dropped request — and never a write.
- **Restart**: any in-flight Run becomes `unknown`, with `error.code`
  `mcp_effect_unknown` when an MCP dispatch has no settled result, else
  `repository_write_unknown` when a repository write was prepared, else
  `restart_unknown`; partial assistant text and a `run.status` event are kept.
  **Every** pending question or
  permission (not just those on affected Runs) is marked `expired_restart` —
  nothing is left permanently unanswerable. The host JSONL session survives;
  the next Run for that app session reopens it with `SessionManager.open`
  and continues the same conversation. Re-sending the same `commandId` after a
  restart returns that original `unknown` Run; it does not re-execute anything.
- **Reconciliation after a restart**: a crash can land between `ws_write`'s
  rename and its artifact record, leaving bytes on disk that the store never
  witnessed. At startup each interrupted session's workspace is compared once
  against the recorded content versions, and anything unaccounted for is
  reported as a `run.notice {kind: "unrecorded_files", files:[{path,sha256}]}`.
  The file is neither back-filled as an artifact nor rewritten: an artifact
  record asserts that the service saw the write happen, and manufacturing one
  after the fact would forge the very evidence a Review relies on.

## Reconnecting a client

`GET /sessions/:id` returns `lastSeq` alongside the snapshot; resume with
`GET /sessions/:id/events?afterSeq=<lastSeq>`. Reads are pure — the same cursor
always returns the same page. A cursor *past* the server's high-water mark is
`400 cursor_ahead` with the current `nextSeq` in the error body, because such a
client can never catch up by waiting and must re-snapshot instead.

## Execution budget

`deadlineMs` (default 600000) is an *execution* budget: it only counts while
a Run is `running`, and is paused for the entire time a Run spends
`waiting_user` (a question or permission open). `maxTurns` (default 40) is
unchanged in spirit — the AgentSession is aborted once exceeded. Both are
overridable via `startServer({ budget })`.

## Checks

From `app`:

```sh
npm test
npm run smoke
node ../tools/check-doc-links.mjs
```

`npm test` runs the synthetic suite with at most four test files in parallel.
It covers the Host, Work Core, model and tool integration, UI contracts,
permission waits, idempotency, cancellation, reconnection and recovery. The
smoke check uses a local deterministic provider. Neither command needs a real
provider credential.

`npm run check:product` runs the default test, smoke and repository link checks
in sequence. Use `npm run test:load` separately to run the same suite with a
bounded concurrency of eight when diagnosing resource contention; it is not the
default acceptance command.

## Test-only crash points

`runtime/test-hooks.mjs` can SIGKILL the process at named points
(`before_tool`, `after_history`, `after_write`, `after_record`, `store_write`) so the durability
tests can observe what actually survives on disk. Two rules govern it:

- `SE_TEST_CRASH_POINT` **alone does nothing**. The hook only arms when
  `SE_TEST_MODE=1` is also set.
- Whenever either variable is present, startup logs one line saying whether the
  point is armed or inert.

Neither variable is set in normal operation, and with them unset the hook
compiles to a name comparison that never matches.

## Historical artifacts and compaction

Historical text bytes are now retrieved by `GET /api/v5/sessions/:id/artifacts/file`
with the exact recorded `runId`, `path` and raw content `sha256`. Git blobs are
pinned per session before workspace publication. Old records without a stored
object return 410; current files are never substituted. References have no
automatic deletion policy, so storage grows with distinct saved contents.

Real providers enable Pi native automatic compaction by default. Server-only
`compaction` options are `enabled`, `reserveTokens`, `keepRecentTokens`, and
`maxCompactions` (default 4 per Run). At the cap, the current compaction finishes
and future automatic compactions are disabled for that Run. This cap does not
terminate ordinary turns; existing turn and execution deadline budgets still
apply. Cancel is sticky at the model request boundary, including cancellation
during pre-prompt summarization. Summary usage is counted once; missing failed
or retried summary usage is explicitly incomplete. See [MX-R1 API](docs/api-runtime-mx-r1.md).
