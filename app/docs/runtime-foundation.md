# Runtime foundation and integration contract

The runtime runs independently of the Web UI. Its current deployable scope is
one agent per active session, constrained text workspace tools, permission
questions, persistent conversation and content versions, cancellation, usage,
and native compaction. It does not claim shell, browser, fork, child-agent or
scheduler support. Those capabilities can be added when needed through explicit
execution and lifecycle adapters.

## Ownership and extension seams

`server/runtime.mjs` exports `createRuntime({dataDir, extensionCatalog?, budget?, compaction?})`.
It opens the data lock, store, provider catalog and execution service; `close()`
stops admission, settles active Runs, closes extensions/providers and releases
the lock. It does not open a product HTTP server. The loopback test provider is
local and uses the same Pi provider/SDK lane as ordinary execution.

The default extension catalog is empty. `server/index.mjs` is the Web application
composition root and explicitly passes its installed domain extension catalog.
Domain tools and current domain context enter through `ExtensionRegistry.begin`;
the generic runtime imports no domain catalog. In-process callers are trusted
application components; remote callers use the authenticated `/api/v5` HTTP API.

Call `runtime.service` commands and queries from an orchestration component.
`store`, registry and SDK handles are returned for application composition and
diagnostics, not an alternative public mutation protocol. Keep parent/child,
trigger/plan and scheduling state in the caller; preserve `commandId`, single
active Run, real permission gates and explicit human Review. Generated files
and a completed Run do not imply formal acceptance.

```js
import { createRuntime } from './server/runtime.mjs';
const runtime = await createRuntime({ dataDir: '/absolute/persistent/data' });
try {
  const { project } = await runtime.service.createProject({ name: 'Work' });
  const { session } = await runtime.service.createSession({ projectId: project.id, title: 'Draft' });
  // Configure provider/credential through the existing service/API before real work.
  const receipt = await runtime.service.createRun(session.id, {
    commandId: crypto.randomUUID(), input: 'Read the materials and prepare a draft in out/.',
  });
  // Poll/query the receipt and answer any persisted question through the service.
} finally {
  await runtime.close(); // Cancellation waits for execution to settle.
}
```

## One Run

Service admission records the command before creating its native session. Setup
errors become a terminal Run. The adapter is created first; its abort/usage owner
is installed before `run()` starts any model request. The execution deadline
includes setup and summarization but pauses during human questions.

The system prompt and sorted tool definitions form a stable prefix. Changing
extension context is appended to the native journal as a hidden `runtime.context`
message before the next user input, only when changed (or absent after compaction).
The latest context applies; older context is historical and grants no permissions.
Workspace files become model input only through tools. Permission enforcement
remains in the tool implementations.

Pi owns conversation JSONL, summary generation, retry and the tool loop. The
adapter tracks asynchronous host event writes because AgentSession's public
event emitter does not await subscribers. A Run settles after primary event
writes; their persistence failure produces `runtime_projection_failed`, never
a completed receipt. Informational `run.notice` writes are explicitly
best-effort and may be absent after a storage failure. The Pi journal and host
store record different facts and are not one cross-store transaction. Each per-Run
AgentSession is disposed after idle; the persistent SessionManager journal is
reopened by the next Run. No second transcript or orchestration loop is added.

## HTTP additions

All require the existing work token. These are local configuration/capability
queries; they do not call a provider or verify a key.

- `GET /api/v5/provider-models` returns `{source:"installed-runtime-catalog", models:[{id,name,provider,api,contextWindow,maxTokens,reasoning}], apiFormats}` filtered to the supported providers. Use its exact provider/model/api tuple for provider configuration. The catalog is the installed SDK snapshot, not a live network lookup.
- `GET /api/v5/runtime-info` returns `apiVersion`, `adapterId`, host `state`, existing provider/configuration status, `capabilities`, `limits`, effective `compaction`, restart `recovery`, and the ownership/acceptance boundary. `ready` describes the host, not real-provider reachability. The tool list is the base capability set; each session's permission mode determines which tools are actually admitted.
- During graceful shutdown, new Run admission is `503 runtime_closing`. The HTTP listener closes; clients reconnect after startup and obtain a fresh work token.

A newly admitted receipt may have `hostSession:null` while its native session is
being prepared. Query the Run for its final locator and state. Never interpret a
missing locator as a failed or unaccepted command.

## Run, stop and verify

Node >=22.19.0, Python 3 with POSIX flock, and Git >=2.36 are required. Windows is
not supported by the current lock adapter. Exact npm dependencies remain pinned
in package-lock.json. `dependency-ledger.json` records every lockfile package's
license and integrity metadata, including platform-optional entries. Pi's three
direct packages are MIT; no dependency was upgraded in this increment.

From `app/`:

```sh
npm ci --ignore-scripts
npm start -- --data-dir /absolute/persistent/data --port 8787
# SIGINT or SIGTERM closes the application cleanly.
npm run smoke
npm test
```

Use a persistent data directory outside the executable checkout for actual use.
The default `./data` is a convenience for local starts, not a migration mechanism.
Back up the whole data directory while the runtime is stopped: runtime-state,
credentials, workspaces, Pi sessions and artifact history belong together.
Existing schema-3 records contain absolute workspace/journal locators, so moving
that data directory to another path requires a separately implemented migration;
copying source code does not migrate data. Restarting at the same data path is
supported. An interrupted Run is reconciled as unknown, not secretly replayed.

`npm run smoke` runs the real runtime service/SDK and tools with a local fake
provider, writes a result, closes/reopens the runtime, revises it, and verifies
both current and historical bytes. It removes its temporary data. Real-model
quality, GUI input of credentials and the final Web UI work path remain the
integration stage; the smoke output labels this distinction explicitly.

For a host upgrade, replace the Pi adapter against the same service commands,
event projection and permission behavior. For orchestration, consume those
commands from a separate component. For formal SE state, retain the domain
extension's explicit Review/commit route. None requires the frontend to become
a second authority or requires a generic workflow engine inside the runtime.

## API selection and cache continuity

Real providers are `openai` and `deepseek`; the deterministic fixture is separate.
`GET /api/v5/provider-models` gives installed catalog model IDs and supported
adapter formats. `PUT /api/v5/provider-config` accepts, for example:

```json
{"provider":"openai","model":"gpt-4.1-mini","api":"openai-responses"}
```

Choose `openai-completions` for Chat Completions. Optional `baseUrl` is actually
applied to the selected model. Model IDs must exist in the installed catalog;
the model and endpoint must support the chosen format. The descriptor exposes
provider/model/API/baseUrl only: it does not accept custom headers, alternate
auth-header policies, custom model IDs or compat overrides. Gateways requiring
those options are outside this interface. DeepSeek defaults to its
Chat API; choosing Responses requires an explicit compatible endpoint and does
not assert that DeepSeek's official endpoint implements Responses. Credentials
continue to enter through the application credential UI/API, never from a shell
key or global agent configuration. Configuration, credential changes and Run
admission share one queue; the selected configuration stays frozen during a Run.

The public Pi provider API dispatch map selects each format's native encoder and
stream parser. Responses uses native manual history with `store:false`; the host
does not add a second `previous_response_id` conversation owner. Normal requests
preserve the native session ID, short cache retention, stable system/tools and
append-only conversation. No per-turn timestamp or nonce is injected. Responses
receives the stable prompt cache key; Chat sends it where the SDK supports the
endpoint. Changing model, protocol, tool permissions or compacting history can
create a new cache boundary. Actual cache hits remain provider-controlled; only
reported cache usage is counted. See [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
and [Responses migration](https://developers.openai.com/api/docs/guides/migrate-to-responses).

The two local wire tests cover native tool execution, successive requests,
restart continuation, exact prior-input prefix preservation, stable tool schemas,
session cache identity and reported cached usage for both formats. These are
protocol/host checks, not measurements of a real provider's cache hit rate.
See [turn ownership review](turn-ownership-review.md) for each lifecycle seam.

## Persisted extension activation

At restart the installed catalog consumes its persisted status and generation.
An unchanged, previously loaded extension recreates its process resources so a
bound session can continue. Unloaded or invalidated entries retain that status;
a changed manifest version becomes invalidated with the next generation and
requires explicit reload. An extension startup failure fails initialization;
the host does not pretend it loaded. An empty or partial catalog preserves
records for absent extensions without importing or starting them. Lifecycle
changes share the configuration/admission queue and remain frozen during Runs.

See [upstream integration boundaries](upstream-integration.md) for the source
comparison and the difference between inherited, adapted and host-owned behavior.
