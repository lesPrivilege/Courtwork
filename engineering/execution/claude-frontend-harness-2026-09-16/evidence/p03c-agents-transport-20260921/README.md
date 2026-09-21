# P03-C transport increment — author delivery, 2026-09-21

Author packet for the [Agents API transport order](../../p03c-agents-transport-20260921.md), first bounded increment inside P03-C / DRT-03 under [RD-001](../../../../research/RD-001-runtime-adapter.md). It is an author's delivery awaiting Codex's independent verification. It accepts nothing, closes no part of C beyond the transport, and shows nothing about the live service, account access, a Host consumer or restart recovery.

## Pickup and scope

- Actual main at pickup `2b57d7b` (the order's inspected baseline `5554560` plus the docs commit carrying the order). Main's dirty paths: untracked `.agents/`, `.obsidian/`, `skills-lock.json`; untouched. Other worktree `claude-work-location-20260921` (Composer) preserved and not read or written.
- Main moved to `87183f9` during the work (the control-plane precedents record). It touches none of the files below; the branch was not rebased, so the source base stays `2b57d7b`. That record's rule that local transport disposal must not map to a native close or cancel is what case 3 asserts.
- Writer worktree `../.worktrees/courtwork-agents-transport-20260921`, branch `claude-agents-transport-20260921`, from `2b57d7b`.
- Touched: `app/runtime/openai-agents-transport.mjs` (new), `app/runtime/agents-api-adapter.mjs`, `app/runtime/agents-api-contract.d.ts`, `app/tests/drt03-agents-transport.test.mjs` (new), `app/tests/fixtures/agents-api-wire.mjs` (new), `app/package.json`, `app/package-lock.json`, `app/docs/dependency-ledger.json`. Nothing in `server/`, Store, Pi modules, WebUI, Settings or provider configuration. Production runtime selection is unchanged: nothing imports the transport outside its test.
- No server on any fixed port (tests bind loopback port 0), 8787/8899 untouched, no credential read, no API or paid call. The only network use was `npm pack` / `npm view` / `npm install` of the one named package from the public registry.

## Artifact decision

**Adopt `openai@7.15.0` exactly, the artifact the protocol slice already pinned.** `npm pack openai@7.15.0` gives SHA-256 `a9428a67be47b7039468d534118a9fd258862978cd6862fcf3f9dd2f687afb90`, identical to `AGENTS_API_PROTOCOL.sdkPin.tarballSha256`. Registry integrity `sha512-2DIwesnP…VxU96w==` equals the lockfile entry. License Apache-2.0, no runtime dependencies, engines `node >=22.0.0` (repo requires >=22.19). Every method the transport needs exists; nothing essential is missing, so the plan's `7.16.0` candidate was not evaluated and stays a distinct, unverified record.

Lockfile effect, complete: `pi-ai` already depended on `openai@6.40.0`, hoisted at the root. The root entry is now 7.15.0 and the same 6.40.0 (same integrity) moved to `node_modules/@earendil-works/pi-ai/node_modules/openai`. Pi resolves the version it resolved before; no Pi package changed. `npm install` ran with `--ignore-scripts`.

`dependency-ledger.json` was regenerated from the lockfile in its existing format. **It was already stale on main**: its `lockfileSha256` did not match and 13 packages from the earlier MCP client addition were missing. Regeneration reproduces all 288 untouched entries exactly, changes `node_modules/openai`, and adds 14 (those 13 plus the relocated 6.40.0). The 13 are someone else's gap that I closed because a ledger with a wrong lock hash is not a ledger; please rule on whether that belongs here.

## Sonnet preflight

Twelve tool calls against the extracted, hash-verified artifact; it stopped at the bound and listed what it had not read. Used: the `beta.agents.sessions` class path and signatures; `events.create` takes a literal `'Idempotency-Key'` params field; `events.stream` returns `APIPromise<Stream<…>>`; `items.list` returns a `CursorPage`; defaults `maxRetries: 2`, timeout 10 minutes; env defaults for key, base URL, organization, project.

Its open items I settled by running the real SDK over an injected `fetch` rather than by more reading (probe kept out of the repo; every finding is now an assertion in the test file):

| Question | Observed with `openai@7.15.0` |
|---|---|
| Does `RequestOptions.idempotencyKey` reach the wire on `sessions.create`? | **No header at all.** The client has no idempotency header configured. Create has no request identity in this artifact. |
| What is retried by default? | POST create is attempted 3 times on HTTP 500, 429, 409, 408 and on connection failure; 400 once. With `maxRetries: 0`, once in every case. |
| Stream URL | `GET /v1/agents/sessions/{id}/events` with `Accept: text/event-stream`, **no `?stream=true`**. |
| Cursor exposure | The SDK page object keeps `data` and `has_more` only; `last_id` / `first_id` survive on `page.body`. |
| 2xx with unparsable JSON / with `text/html` | Raw `SyntaxError` / the body returned as a string. |
| Error text | `APIError.message` embeds the response body. |
| Ambient configuration | `OPENAI_CUSTOM_HEADERS` is read from the environment and no client option turns that off. |

**Differences from the 2026-09-15 record, not rewritten there:** the frozen `endpoints.streamEvents` string says `?stream=true`; the pinned SDK sends none. The current official reference (Astra's recheck) shows `idempotencyKey` on `events.create`; this artifact's field is `'Idempotency-Key'`. `AGENTS_API_PROTOCOL` is left as the historical protocol record. The adapter and contract files changed, so their hashes no longer equal `evidence/tests-20260915/environment.json`; that file remains the record of the slice it describes.

## What the transport does

`createOpenAiAgentsTransport({ apiKey, baseURL, fetch?, timeoutMs? })` implements the existing five-method `AgentsApiTransport` over `client.beta.agents.sessions`.

- **Connection is the caller's.** `apiKey` and `baseURL` are required; there is no default endpoint, so nothing can reach the live service by omission. The SDK client is built with `adminAPIKey`, `organization`, `project`, `webhookSecret` null and `logLevel: 'off'`, and headers are rebuilt from an allowlist (`accept`, `authorization`, `content-type`, `idempotency-key`, `openai-beta`, `user-agent`) at the fetch seam, which is what keeps `OPENAI_CUSTOM_HEADERS` and the `x-stainless-*` host fingerprint off the wire. The key lives only inside the SDK client in the closure.
- **Request identity.** `sendEvents` requires a caller-owned `requestId` and sends it as `Idempotency-Key`; without one the call is refused locally (`invalid_request`, `not_sent`). The transport never generates a key. `createSession` takes none because the artifact has nowhere to put it. `AGENTS_TRANSPORT_REQUEST_IDENTITY` states per kind what is on the wire and what is guaranteed: create — nothing; message — the SDK documents the key for submitted messages; tool result and cancel — carried, guarantee undocumented.
- **One attempt.** Every SDK call is made with `maxRetries: 0`. A failed mutation carries `delivery`: `not_sent`, `rejected` (4xx other than 408: the service answered and refused) or `unresolved` (408, 5xx, timeout, connection loss, abort in flight, unreadable 2xx). `unresolved` is never evidence of non-execution.
- **Streaming.** `streamEvents` returns the SDK's iterator inside `{ events, abort() }`. `abort()` works before headers, during the body and after the end, is idempotent, sends nothing to the service and settles nothing. There is no reconnect.
- **Answers are validated, not defaulted.** A create or retrieve that is not an object with the expected `id`, or an items page without `data[]` and boolean `has_more`, is `malformed_response`. `listItems` returns the service's page body so `last_id` survives.
- **Errors** are `AgentsTransportError` with `code`, `operation`, `status`, optional `delivery`, and a request id / native code only when they match `^[\w.:-]{1,64}$`. Messages are written here; no SDK message, response body, header or `cause` is attached.

Adapter and contract additions are forwarding only: `createSession({…, signal})`, `submitInput({text, requestId, signal})`, `cancelTurn(binding, {requestId, signal})`, `submitToolResult({…, requestId, signal})`, a new `AgentsApiCallOptions` type, and optional `options` on the transport methods. A supplied `requestId` must be a non-empty string; an absent one stays absent. Normalization, ledger, settlement, recovery and `exposureOf` are untouched.

## Evidence

Production SDK, real loopback HTTP server (`tests/fixtures/agents-api-wire.mjs`, real sockets, records every attempt), real protocol adapter on top. No fake SDK.

| Order item | Case in `tests/drt03-agents-transport.test.mjs` | Shown |
|---|---|---|
| 1 | create, later input, cancel intent, function result | Exact method, path, headers and bodies, asserted by deep equality; capture in [wire-captures.json](wire-captures.json). The function result uses the `turn_id` / `call_id` the streamed `requires_action` issued. Run with ambient `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_ORG_ID`, `OPENAI_PROJECT_ID` and `OPENAI_CUSTOM_HEADERS` set: none reaches the wire. |
| 1 | refused before the wire | Missing, empty or control-character `requestId`; missing turn or call id (adapter's own codes); path-like session id; non-input event type; empty batch; hosted environment; no model or agent id; blank input; no key; no base URL. Zero HTTP attempts. |
| 2 | fragmented frames | Frames split every 37 bytes, mid-line and mid-JSON; deltas reassembled; `done` without deltas delivered; a redelivered event id dropped by the adapter. Root terminal → `completed` / `native-terminal`. Child-turn terminal, idle only, and a stream that just closes → each `unknown` / `stream_closed_before_terminal`. |
| 3 | abort and disposal | Stop before headers (server had the request and never answered), during a held-open body, after completion, each twice; an abandoned `for await`; an iterator aborted before first use opens nothing. Afterwards: no request still open on the server, no `Timeout` handle above the baseline, and the only non-GET request in the whole case is the one create. |
| 4 | pages and unusable answers | Two pages where `last_id` is deliberately not an item id: the second request carries that cursor. 502 HTML, 401 JSON, 2xx invalid JSON, 2xx HTML, 2xx without page fields, 2xx for another session: each an `AgentsTransportError`, none an empty success; no error contains the response body or the key; `reconcile` rejects rather than returning an empty history. |
| 4 | one attempt | HTTP 500, 429, 409, 408, no answer (150 ms timeout), reply destroyed after the request arrived, unreadable 2xx; for both create and tool result: expected code and `delivery`, and **exactly one POST counted at the server** each time. A caller retry of the result reuses the one key; no create ever carries a key. Abort before the call → `not_sent`, zero POSTs; abort in flight → `unresolved`, one POST. All capability rows still `unavailable`. |

Runs, all from the writer worktree under `caffeinate -is`:

| Check | Result | Log |
|---|---|---|
| transport + existing protocol + architecture boundaries | 22/22, exit 0 | [focused.log](focused.log) |
| `npm test` after the final source change | 1340/1340, exit 0, 248 s | [full-suite.log](full-suite.log) |
| `npm run smoke` (Pi path with relocated `openai@6.40.0`) | exit 0 | [smoke.log](smoke.log) |

**Failures seen on the way, and their cause.** (a) Two first-run assertion failures were my wrong guesses at the adapter's observation kind and settlement source names; corrected to the adapter's real values, no source change. (b) One 17-second failure of the items case in a three-file run, whose error text I did not keep. (c) In a 36-process contention run, 24 of 24 passed in rounds 1–2; in round 3 five runs failed with `connection_failed` / `timeout` and ~406 s durations. `pmset -g log` shows the laptop in Maintenance Sleep for 409 s from 15:10:08, and a 19 s sleep at 14:10:08, seconds before (b). The host was cycling sleep on battery with the lid closed; sockets do not survive it. 12 isolated and 10 combined reruns passed. This is evidence for (c) and a matching time for (b), not proof of (b). An acceptor should run under `caffeinate` or on mains.

## Completed / not executed

| | |
|---|---|
| Done | Production SDK transport; request identity carried to the verified wire slot; single-attempt mutations with HTTP attempts counted; stream lifecycle; cursors; bounded errors; ambient-configuration isolation; exact pin with hash, integrity and license; existing protocol tests unchanged and green. |
| Not executed | Any live request, account or model check; the `7.16.0` candidate; a Host consumer; Store/schema; process-restart behaviour; reconnect/resume of a dropped stream; SDK behaviour on Node versions other than 25.9; a proxy or TLS endpoint (loopback HTTP only). |
| Not claimed | Remote idempotency of anything. The header is proven to be *sent*; what the service does with it, for messages or otherwise, is untested. Exactly-once across a restart. That stream end or idle means completion. |

## Obligations left to the next C increment (caller / Host)

1. **Create has no wire identity.** After an `unresolved` create the Host must hold the command as unknown and look the Session up; it must not call create again. The adapter still records `commandId` only after the transport returns (A-2, deferred to D), so that fence has to exist in the Host before a real create is ever issued. Whether to stamp the CW command into the documented `metadata` field so a lookup is possible is a contract decision I did not take.
2. **Mint and persist `requestId` before sending**, one per operation, reused verbatim on retry, distinct per kind. The adapter-local duplicate check is memory only and is not a receipt.
3. **Persist the bounded tool result before `submitToolResult`**, and on `unresolved` resend that stored result with the same key; never rerun the function. On failure the adapter leaves the pending call uncleared, which is the correct input to `settle`.
4. **Treat `delivery` as the only statement about a failed mutation.** `rejected` may be surfaced as refused; `unresolved` keeps the Run's effect unknown.
5. **One stream per binding.** The transport will open as many as it is asked for; `observe` and `reconcile` can still overlap (deferred to D). Reconnection policy is the Host's.
6. **Credential and endpoint come from the Host's provider plane** by explicit argument. A remote locator needs the binding record the order reserves; nothing here writes `{id,path}`.
7. `cancelTurn` returning is intent only; releasing a stream is neither cancel nor settlement. Both already hold in the adapter and are now also true of the wire.

## Writer release

One commit on `claude-agents-transport-20260921`; tree clean after it. Writer released; all files above are free for verification and integration. Not pushed, not merged, `engineering/current.md` and shared acceptance summaries not edited. I stop here; no next-slice work started.
