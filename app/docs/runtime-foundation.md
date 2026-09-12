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

- `GET /api/v5/provider-models` returns `{source:"installed-runtime-catalog", version, models:[{id,name,provider,api,baseUrl,contextWindow,maxTokens,reasoning,supportedEfforts,defaultEffort,reasoningCapability,reasoningByApi,origin,reasoningSource}], apiFormats}` filtered to the supported providers. Use its exact provider/model/api tuple for provider configuration. The catalog is the installed SDK snapshot, not a live network lookup. `origin` (WO-PV-BE03) is `"catalog"` for a row from the installed catalog itself and `"connection"` for a row from a connection's own saved model list (the WHOLE list for a compatible connection, only the extras for a catalog one); `reasoningSource` is `"catalog"` for a catalog row, `"user"` once a person has declared `reasoning` on a connection's model entry, `"unknown"` while it is still the PV-61 default.
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
Both, and any user-defined compatible connection, are reached through the
connection registry described below.
`GET /api/v5/provider-models` gives installed catalog model IDs and supported
adapter formats. First read `GET /api/v5/provider-config` and use its top-level `version` as `expectedVersion` in the write (the number below is illustrative). `PUT /api/v5/provider-config` accepts, for example:

```json
{"provider":"openai","model":"gpt-4.1-mini","api":"openai-responses","expectedVersion":7}
```

Choose `openai-completions` for Chat Completions. Optional `baseUrl` is actually
applied to the selected model. Model IDs must exist in the installed catalog;
the model and endpoint must support the chosen format. The descriptor exposes
provider/model/API/baseUrl and optional reasoningEffort only (`expectedVersion` is the command precondition): it does not accept custom headers, alternate
auth-header policies or compat overrides. For a user connection the model must
be one saved on that connection, and the connection owns its endpoint and
format. Gateways requiring
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

## Unsaved provider preview (BE-17/18)

Authenticated POST `/api/v5/provider-models/discover` and
`/api/v5/provider-connection/test` accept exactly:

```json
{"protocol":"openai-compatible","baseUrl":"http://127.0.0.1:1234/v1","apiKey":"explicit-optional-key"}
```

`protocol` and `baseUrl` are required. The only protocol is
`openai-compatible`; local deployment does not imply Ollama's native protocol.
`baseUrl` is an explicit HTTP(S) API root, at most 2048 characters, with no
whitespace, backslash, userinfo (including empty userinfo), query or fragment.
All trailing path slashes are removed before appending `/models`; `/v1` is
never added implicitly. HTTP and loopback are allowed. No other destinations
are searched. An optional key must contain 1–4096 printable ASCII characters
without spaces; omit it for unauthenticated endpoints. It is sent only as
`Authorization: Bearer …`. Custom headers and unknown request fields are rejected.
The existing JSON parser applies (1 MiB request cap; malformed/non-object JSON
400, unsupported media type 415, oversized request 413). Valid JSON with invalid
preview fields returns 400 `invalid_provider_preview`, with a fixed message.

Both endpoints return HTTP 200 for completed probe outcomes:

```json
{"operation":"discover","protocol":"openai-compatible","check":"model-directory","status":"ok","message":"Model directory handshake succeeded; generation was not tested.","models":[{"id":"example-model"}]}
```

`operation` is `discover` or `test`. `test` always returns an empty `models`
array, but validates the same complete directory. `discover` returns IDs only
on success. No context, reasoning, effort, display name or inference capability
is inferred. Empty `data` is a successful directory handshake with no available
models, not inference readiness. IDs remain untrusted display data.

| Status | Meaning |
|---|---|
| `ok` | Valid JSON object with a `data` array of models |
| `authentication_failed` | Upstream 401 or 403 |
| `unsupported` | Upstream 404, 405 or 501 |
| `http_error` | Other unsuccessful HTTP status |
| `redirect_rejected` | Any 3xx; never followed, even on the same origin |
| `malformed_directory` | Invalid UTF-8/JSON, missing data array, invalid/duplicate ID, excessive model count or echoed request key in an ID |
| `response_too_large` | Decoded response body exceeds 262144 bytes |
| `timeout` | 5000 ms elapsed, including headers and complete body |
| `unreachable` | Network/TLS/stream failure before completion |

The directory is limited to 1000 entries. Each ID must be a nonblank string
of at most 240 JavaScript characters, without ASCII control characters.
Unknown upstream fields are discarded. Responses contain fixed messages;
upstream bodies, headers, URLs, error messages/stacks and request keys are not
included in errors or logged. The response body is cancelled after rejected
statuses/limits; no redirected target receives the supplied key.

The helper has no store, ModelRuntime or credential-file dependency. It does
not read saved keys, persist configuration, register models, create Runs or
change Session bindings. The connection save path below calls the same helper
and supplies the key itself; the helper is still the only prober. Existing GET `/api/v5/provider-models` remains the
installed runtime catalog. Probe success means the directory endpoint accepted this request. Success does
not prove a supplied key was checked or valid: an endpoint that permits anonymous
access may ignore it. Saving arbitrary compatible/local providers
and binding them for execution is delivered by the connection slice below.

## Provider connections (WO-PV-BE02)

A CONNECTION is the unit of provider identity: one endpoint, one wire format,
one credential, one model list. The three catalog providers are connections too
(`catalog-openai`, `catalog-deepseek`, `catalog-fake-openai-loopback`), so there
is one shape and one key space rather than two.

| Field | Meaning |
|---|---|
| `id` | `catalog-<provider>` for the shipped catalog, `conn-<12 hex>` for a user connection. The credential-file key. |
| `kind` | `catalog` or `compatible` |
| `providerIdentity` | The runtime provider id. For a catalog connection it is the catalog id; for a user connection it is the connection id, so a compatible endpoint never registers onto a catalog identity whose credential slot is single. |
| `api` | `openai-completions` or `openai-responses` |
| `baseUrl` | The endpoint, `null` for a catalog connection |
| `models` | `[{id, contextWindow, reasoning, reasoningEfforts}]`; `contextWindow` is `null` when nobody reported one, `reasoning` is `true`/`false`/`null` (WO-PV-BE03, PV-61) — `null` means nobody has declared it either way |
| `credentialStatus` | Derived from the credential file, never stored on the record |

`GET /api/v5/provider-connections` lists them. `POST /api/v5/provider-connections`
and `PUT /api/v5/provider-connections/:id` save one compatible connection from
`{api, baseUrl, models, apiKey?}`; `DELETE /api/v5/provider-connections/:id`
removes one, unregisters its provider and deletes its key. All four share the
configuration queue and are frozen during a Run, exactly like provider config and
credentials. A save probes the directory with the key that will actually be used
and separates three failures: `connection_authentication_failed` and
`connection_directory_unavailable` (consuming the BE-17/18 status enum, reported
in `error.status`) and `connection_model_not_in_directory`, which the probe enum
does not name. Probe success still means only that the directory accepted the
request.

`PUT /api/v5/provider-credential` and its DELETE now take `{connectionId, …}`.
`credentials.json` is keyed by connection id: two connections onto the same
protocol keep separate keys instead of overwriting one another. On first start
after this change the old provider-id keys are migrated once onto the default
catalog connections and anything naming no connection is dropped; both are
logged. There is no compatibility layer, and a provider id no longer resolves.

A user connection's model records carry an explicit zero cost, because pi-ai's
cost calculation dereferences the field; no endpoint or view of this host states
a price, so that zero cannot be read as a reported charge. An unreported
`contextWindow` stays `null`: the host does not guess and does not borrow a
same-named catalog model's value. Such a route runs with compaction switched
off, and `GET /api/v5/provider-config` (`capability`) and the run record
(`contextWindowSource`, `capabilityNotice`) both state
`context window unknown, compaction disabled`. Typing a window turns compaction
back on and records `contextWindowSource: "user"`.

Every run record carries `connectionId` and `credentialSource`, the latter taken
verbatim from `ModelRuntime.getProviderAuthStatus` (`runtime` / `stored` /
`environment`), so which connection ran and where its key came from is
recoverable from the run alone. Saved connections are re-registered on the
ModelRuntime after it exists and before the service serves a request; a
connection whose models no longer resolve still registers and fails at the
existing 503 `provider_unsupported` Run gate instead of stopping the host.


### Main integration: RuntimeStore 10 (2026-09-10)

Main schema 9 already records Run `supersedes`. The independent Provider
Connections branch also proposed schema 9; its unshipped shape is not the main
schema. The combined host uses schema 10. Validated main schemas 3–9 are backed
up byte for byte before upgrade. Schema 9 Run lineage is preserved; only
schemas 3–8 receive `supersedes: null`. Connections start empty and are initialized
by the service owner. Provider connection provenance on Run descriptors belongs
to schema 10. Older hosts must not share the upgraded directory. No personal
store is migrated by this integration.


### Q02: RuntimeStore 11 configuration publication (2026-09-10)

Runtime11 adds `providerConfigurationPending: [{ connectionId, operation }]` to the existing store. Operations are `connection_save`, `connection_delete`, `credential_set`, `credential_delete`; markers contain no credential or target configuration. Valid schemas 3–10 migrate only after validation and an exact original-byte SHA-256 backup. Schema10 connections are preserved. Older hosts reject schema11; use the backup in a separate data directory for rollback, never open upgraded data with an old host.

Runtime12 preserves every validated Runtime11 pending marker, including operations whose connection record is absent. Upgrade and restart do not complete or abandon those operations. The same recovery retry rules below continue to apply; no old host may open the upgraded data directory.

New connection/config/Run writes share model ID ≤240, endpoint ≤2048, the two installed OpenAI wire formats, and context window null or integer 4–100,000,000. API keys use 1–4000 printable non-space ASCII characters at both credential entry points. ASCII controls are rejected; endpoint whitespace, backslashes, userinfo, query and fragment are rejected. Historical descriptors and unchanged historical connections remain readable without normalization; newly changed records must satisfy the current domain. Startup fences historical connections outside that domain, and Run admission checks the selected descriptor again. Credential mutation validates the saved connection before creating a marker, so a historical invalid connection can still be repaired by connection PUT. A missing connection or invalid selected descriptor reports `unavailable`. Read compatibility is not execution authorization.

Connection and credential changes are serialized with Run admission. After input validation and discovery, the host writes a pending marker, persists the connection, reserves credential generation before writing any new key, activates the SDK using the credential file, then removes the marker. This is not a cross-file transaction. Partial failure returns HTTP503 `configuration_incomplete`, including `connectionId`, `operation` and `configurationStatus`. A failure before the marker is persisted leaves the unchanged connection ready; after the marker it is `recovery_required`. Failed SDK cleanup cannot bypass Host admission. Startup skips pending registration/key activation; SDK startup failures appear as `unavailable` and block new Runs. Prior command receipts remain queryable.

GET connections includes per-connection `configurationStatus` (`ready`, `recovery_required`, `unavailable`) and `pendingConfigurations` (marker fields plus `stored`). Credential status is `not_configured` while blocked. Retry the same complete operation to recover; a failed create can be retried with PUT using the returned connection ID even if its record was not saved. DELETE of an unselected compatible connection can abandon any pending operation; credential DELETE can abandon credential SET. Different operations return409 `configuration_recovery_required`. Pending deletion without a remaining connection record remains inspectable. Generation may contain gaps after failed attempts; it must never attribute new key bytes to an old generation. No marker stores a key, and errors never echo provider exceptions or key content.

A synthetic failure shape for frontend consumption (connection creation failed after the marker but before its record was saved):

```json
{"error":{"code":"configuration_incomplete","message":"provider configuration update did not complete","connectionId":"conn-0123456789ab","configurationStatus":"recovery_required","operation":"connection_save"}}
```

The corresponding GET ledger includes `{"connectionId":"conn-0123456789ab","operation":"connection_save","stored":false}` in `pendingConfigurations`. This is a recovery fact, not a configured connection. The executable loopback fixture and assertions are in [Q02 roundtrip tests](../tests/review-provider-roundtrip.test.mjs).

### WO-PV-BE03: open admission and verify (2026-09-10)

RuntimeStore 12. PV-59: a model id is admissible on a connection when it is
registered in pi under the connection's own provider identity — for a catalog
connection that is the installed catalog UNION the connection's own saved
`models` (the EXTRAS a person added beyond it; the empty list it ships with),
for a compatible connection it is exactly the connection's saved list, same as
before. `PUT /api/v5/provider-connections/:id` on a CATALOG id now accepts
`{models}` only (`api`/`baseUrl`/`apiKey` present is `400 invalid_connection`;
the credential route is unchanged); an id already in the installed catalog is
`400 invalid_connection` too — an extra cannot shadow a native definition.
Saving re-registers the connection's extras onto its native provider id with
`registerNativeProvider`, recomposed fresh from the native baseline captured
at startup plus the just-saved extras every time, never through
`ModelRuntime.registerProvider` (which deletes that native registration and
replaces the whole model list rather than merging into it — see
`app/runtime/pi-session-runtime.mjs`'s `registerCatalogExtraModels` for the
evidence and file:line citations). The credential slot, keyed by provider id
in an entirely separate store, is never touched by this. `#setProviderConfig`
and Run admission share one check (`#admissibleModel`): a `getModel` lookup
after registration, plus (compatible only) membership on the connection's own
list. "Hits the installed catalog" is no longer a separate, narrower gate.

`reasoning` retains the historical `true | false | null` declaration when the new
`reasoningEfforts` list is unknown (`null`). An exact current list supersedes
that coarse boolean and normalizes it to whether the list is nonempty, matching
SDK registration. No boolean produces a ladder. Schema13 adds this exact list,
with `null` on migration; see [production adaptation](../../engineering/research/chat-memory-broker-2026-09-12/model-adaptation/production.md).
Native values come only from string entries in the installed model's exact
`thinkingLevelMap`, intersected with the Host's supported encoder. Compatible
connections explicitly use generic OpenAI reasoning grammar; URL substrings do
not select another vendor's reasoning mode. Native catalog routes retain their
registered provider adapter. Unknown values stay unknown; `defaultEffort:null`
means omit the parameter, and `off` is available only if explicitly supported.

GET config/Models share `providerConfigVersion` as `version`. PUT requires a
nonnegative integer `expectedVersion`; a missing/invalid version is
`400 invalid_config_version`, a stale version `409 config_conflict`. Active Run
writes remain `409 active_run`. New Runs freeze `reasoningBinding`; schema12
migration preserves previous Run records and receipts, advances the version, and
keeps an exact source-file backup. Verification coverage identifies one request,
its API/adapter and omitted reasoning parameter, without claiming effort or tool
coverage. Measurements separate requested effort, SDK setting and unreported
Provider effective effort, including summary requests consumed via `.result()`.

For the currently selected provider identity, verification applies the same
configured API and optional endpoint override as Run, including when probing
another admissible model on that identity. An inactive connection uses its own
registered route; it never inherits another identity's override. The existing
configuration-version binding invalidates receipts when this route changes.

`POST /api/v5/provider-connections/:id/verify` (`{model}`, BE-39) asks one
admissible model to answer a single fixed, short prompt through the exact
same pi path a Run uses (`ModelRuntime.complete`, the same runtime credential
resolution) — no tools, no workspace, nothing added to any session's history,
bounded output (16 tokens) and wall clock (20s). `400 invalid_provider` if the
model is not admissible, `400 credential_missing` if the connection has none,
`409 active_run` during a Run, routed through the same configuration queue as
every other connection write. The receipt — `{connectionId, model, status,
message, observedModel, replyFirstLine, latencyMs, checkedAt,
credentialSource, httpStatus, binding:{providerConfigVersion,
credentialGeneration}}` — is the newest addition to the store
(`providerVerifications`, one per connection id) and is read back by
`GET /api/v5/provider-connections` as each connection's `lastVerification`,
`null` once its binding no longer matches the current `providerConfigVersion`
(a new monotonic counter, bumped by any `providerConnections` or
`providerConfig` write — deliberately coarse: PV-42 would rather
over-invalidate than let a stale receipt read as current) or
`credentialGeneration`. `status` is one of `ok | authentication_failed |
model_not_found | unreachable | timeout | http_error | malformed_response |
unknown`. `httpStatus` (`number | null`, PV-84) is captured through a wrapped
`fetch` passed to `ModelRuntime.complete` (not `onResponse` alone — the
vendored OpenAI SDK throws before calling `onResponse` on any non-2xx
response, so that hook only ever fires on success; the wrapped `fetch` sees
the raw `Response` on every path). With a real status available,
`authentication_failed` (401/403), `http_error` (any other non-2xx),
`malformed_response` (a 2xx whose body pi then failed to parse into a
complete message), `unreachable` (the fetch never resolved a response at
all) join `ok` and `timeout` (this host's own bounded wait) as reachable.
`model_not_found` stays unreachable: the hook that supplies `httpStatus`
carries no response body, so there is no structured way to tell a 404 for a
bad model id apart from any other non-2xx status without parsing prose,
which PV-62 ① forbids. See `classifyVerifyOutcome` in
`app/runtime/pi-session-runtime.mjs` for the full citation trail. The
delivery page for WO-PV-BE03 carries the complete class-to-evidence table.
