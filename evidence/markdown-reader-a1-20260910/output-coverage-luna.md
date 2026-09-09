# Output coverage and loss map

Date: 2026-09-10. Role: Luna source review for OR-A0. The inspected checkout
was `codex/markdown-reader-a1` at `b119fc3` with the existing uncommitted
reader and research files preserved. This note is source evidence only: it
does not add a runtime route, schema, dependency, renderer, or review state.

The inspection covered the locked Pi 0.85.1 packages, their installed type
declarations, the Pi adapter, the RuntimeStore/service and HTTP routes, the
thread projection and file inspector, and the existing event tests. A native
JSONL record is called *available by contract* below when the Pi
`SessionManager` has a field/entry for it and the runtime supplies that
manager; that is not the same as proving that every provider or every failed
run wrote that record. No real provider or personal session data was used.

## Pipeline and authority

The current path is:

```text
Pi AgentSession events
  -> createSessionRun subscriber
  -> mapSessionEvent (five mapped event families)
  -> RuntimeStore events / run fields
  -> GET /sessions/:id and GET /sessions/:id/events
  -> thread projection
  -> Chat / Inspector / file reader
```

Pi also writes a separate native session journal when the supplied
`SessionManager` persists an entry. The two paths are related by the
`hostSession` locator, but they are not the same record:

| Layer and identity | What is retained | Authority and access |
|---|---|---|
| Pi native session journal, `hostSession.id` + `hostSession.path` | Pi `SessionEntry` records include full `AgentMessage` values, including content arrays, and custom/compaction/model entries. The manager describes the file as an append-only JSONL tree. | Native continuity/recovery storage. The service creates it under `dataDir/pi-sessions/<session.id>` and stores only its `{id,path}` locator in the RuntimeStore session/run. No HTTP route in [`app/server/index.mjs:120-150`](../../app/server/index.mjs) reads or streams the native JSONL. |
| RuntimeStore session/run/event state, `session.id` + `run.id` + per-session `seq` | `createRun` records `user.message`, `run.status`, and optional `runtime.bound`; mapped assistant/tool events, durable questions/permissions, notices/errors/status/usage, and recorded file events are appended to the generic `{seq,runId,sessionId,type,data}` event list. | Host/UI event authority. The schema validates event shape but does not preserve the Pi event union. [`app/server/store.mjs:168-178`](../../app/server/store.mjs) and [`app/server/store.mjs:424-475`](../../app/server/store.mjs) show the generic journal and writes. |
| HTTP snapshot/stream, session id + `lastSeq`/`afterSeq` | `GET /sessions/:id` returns the RuntimeStore session, its app events, runs, and `lastSeq`; the incremental endpoint returns only RuntimeStore events. | Public host read surface. It is not a native-session export. [`app/server/service.mjs:478-487`](../../app/server/service.mjs) and [`app/server/service.mjs:1431-1449`](../../app/server/service.mjs). |
| Web projection, `runId:segment` or `runId:callId` | Converts known app event types to transient user/assistant/tool/question/permission/artifact/notice/error/status rows. Unknown types disappear. | Presentation only. It does not create a source identity or review record. [`app/web/thread-projection.mjs:1-130`](../../app/web/thread-projection.mjs). |
| Recorded file identity, `sessionId + runId + path + sha256 + kind` | `artifact.written` stores path, byte count, SHA-256, kind `content-version`, and timestamp. The artifact-history reader verifies the stored bytes and digest before returning them. | Immutable output/file reading identity. It does not mean the file was accepted by Core or reviewed. [`app/server/store.mjs:478-486`](../../app/server/store.mjs), [`app/web/inspector.mjs:311-325`](../../app/web/inspector.mjs). |
| Core Work identity, Candidate/Artifact/source/Decision ids and action descriptors | Work projections and typed `humanAction` descriptors carry domain facts and the only formal action path. | Formal review/acceptance authority. The reader explicitly says “Review acceptance is not recorded here”; a completed Run or visible file row is not acceptance. [`app/web/inspector.mjs:417-429`](../../app/web/inspector.mjs), [`app/server/service.mjs:866-875`](../../app/server/service.mjs). |

`createSessionRun` passes the SessionManager into Pi and forwards every native
event to the service subscriber, but the service immediately returns when
`mapSessionEvent` returns `null`; it persists only the mapped result. It also
redacts assistant error text before appending it. [`app/runtime/pi-session-runtime.mjs:241-295`](../../app/runtime/pi-session-runtime.mjs), [`app/server/service.mjs:1289-1298`](../../app/server/service.mjs).

One native-journal edge is material: Pi's `_persist` defers creating/writing
the JSONL file until an assistant message exists. Therefore a user-only,
pre-assistant, or no-assistant failed/cancelled attempt can still have a
RuntimeStore `user.message` while having no flushed native journal. The
RuntimeStore remains the host record for that fact. Pi's
[`session-manager.d.ts:23-26,97-103,174-218`](../../app/node_modules/@earendil-works/pi-coding-agent/dist/core/session-manager.d.ts) and [`session-manager.js:739-766`](../../app/node_modules/@earendil-works/pi-coding-agent/dist/core/session-manager.js) define the entry shape and flush behavior.

## Variant matrix

Pi 0.85.1 declares `TextContent`, `ThinkingContent`, `ImageContent`, and
`ToolCall`; `AssistantMessage` contains text/thinking/tool-call blocks and
provider metadata; `ToolResultMessage` contains text/image content, details,
usage, dynamic tool names, and an error bit. Its assistant stream also has
separate start/delta/end events for text, thinking, and tool calls. [`app/node_modules/@earendil-works/pi-ai/dist/types.d.ts:237-347`](../../app/node_modules/@earendil-works/pi-ai/dist/types.d.ts), [`app/node_modules/@earendil-works/pi-ai/dist/types.d.ts:410-463`](../../app/node_modules/@earendil-works/pi-ai/dist/types.d.ts).

| Output or lifecycle variant | Pi/native record | RuntimeStore / HTTP | Web presentation | Loss class and evidence |
|---|---|---|---|---|
| User text input | Pi can model a `UserMessage` as a string or text/image content array. The current HTTP run contract accepts only a string. | `user.message {text}` is written before provider work, keyed by run and event sequence. | A user row renders that text. | Text is covered. Image user input has no current HTTP ingress or UI path; do not infer image coverage from the Pi type. [`app/server/store.mjs:424-444`](../../app/server/store.mjs), [`app/web/thread-projection.mjs:21-30`](../../app/web/thread-projection.mjs). |
| Assistant text blocks and streaming text | Native assistant messages can retain full content blocks. `assistantMessageText()` filters `content` to `type === "text"` and joins it; `message_update` becomes `assistant.delta` with the full accumulated text, and `message_end` becomes `assistant.message`. | App event keeps `text`; final event also keeps `stopReason` and `errorMessage` (the latter redacted by service). Usage is separately aggregated into `run.usage`. | Assistant rows are keyed by run/segment, marked pending for deltas, and rendered through the existing sanitized Markdown primitive. Empty assistant text is skipped. The segment counter advances on tool/question/permission rows, not on assistant messages. | Text display is covered for one streamed assistant segment, but provider/model/response identity, signatures, timestamps, and other message metadata do not enter the app event. Two consecutive assistant `message_end` events in one run share `runId:0`; the later row overwrites the earlier text. A direct projection probe with `first` then `second` returns one assistant row containing only `second`. Blank final/error messages have no assistant body; run error/status is the separate visible failure path. [`app/runtime/pi-session-runtime.mjs:358-389`](../../app/runtime/pi-session-runtime.mjs), [`app/web/thread-projection.mjs:15-40`](../../app/web/thread-projection.mjs), [`app/web/thread-projection.mjs:41-80`](../../app/web/thread-projection.mjs), [`app/web/app.mjs:2333-2337,2546-2569`](../../app/web/app.mjs), [`app/web/ui-controls.mjs:150-218`](../../app/web/ui-controls.mjs). |
| Assistant thinking/reasoning blocks | Native `thinking` blocks and thinking stream events are part of Pi's message/event declarations and may be present in the native message. | `textFromContent` ignores them; the generic assistant event contains no thinking field. | No thinking row or unavailable marker is rendered. | **App/web silent loss** of thinking content and signature/redaction metadata. Native retention is conditional on Pi flushing its full message; no host HTTP/native-reader bridge was found. |
| Assistant tool-call blocks | Native `toolCall` carries id, name, arguments, thought signature, and optional namespace. | `message_update`/`message_end` reduce the assistant message to text; execution start keeps only `callId` and `name`. `tool_execution_start.args` is not copied. | Tool rows have a name and result phase; the Request section stays empty for host-mapped start events because no `request`/`args` field was emitted. | **App storage loss** of model tool-call arguments/signatures/namespace. The projection accepts `args` when synthetic/manual events supply it, but the runtime mapper never supplies them. [`app/runtime/pi-session-runtime.mjs:375-405`](../../app/runtime/pi-session-runtime.mjs), [`app/web/thread-projection.mjs:41-65`](../../app/web/thread-projection.mjs), [`app/web/app.mjs:2355-2387`](../../app/web/app.mjs). |
| Assistant metadata and terminal reason | Pi's `AssistantMessage` has provider, API, model, response id, thinking level, diagnostics, usage, stop reason, deferred handle, raw stop reason, end-turn flag, and timestamp. | Only text, `stopReason`, and redacted `errorMessage` survive the final mapped event. Token counters become the narrower `run.usage` record; missing accounting is marked explicitly. | The projection ignores final stop/error fields; run error/status and the Inspector usage section show host-level facts. | **App-field loss plus presentation loss** for metadata. The run-level usage record is not a substitute for a reviewable assistant output identity. [`app/node_modules/@earendil-works/pi-ai/dist/types.d.ts:307-329`](../../app/node_modules/@earendil-works/pi-ai/dist/types.d.ts), [`app/server/service.mjs:1204-1242`](../../app/server/service.mjs), [`app/web/inspector.mjs:177-208`](../../app/web/inspector.mjs). |
| Tool execution start | Pi event contains `toolCallId`, `toolName`, and validated `args`. | `tool.start` stores only call id/name. | A started tool row is shown. | **Arguments are silently dropped before RuntimeStore.** Tool identity and ordering remain through the app event sequence. [`app/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts:608-613`](../../app/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts), [`app/runtime/pi-session-runtime.mjs:390-392`](../../app/runtime/pi-session-runtime.mjs). |
| Tool execution update | Pi event carries args and a partial result. A partial result can have text/image content, details, usage, and added tool names. | `tool.update` stores call id/name, concatenated text-only content, and `isError:false`; raw args/details/image/usage/dynamic-tool fields are absent. | The same tool row is updated as a result preview. | **App storage loss** of non-text partial data and arguments. Repeated partial text is a display snapshot, not a durable block stream. [`app/runtime/pi-session-runtime.mjs:393-396`](../../app/runtime/pi-session-runtime.mjs), [`app/node_modules/@earendil-works/pi-agent-core/dist/types.d.ts` (AgentToolResult declaration)](../../app/node_modules/@earendil-works/pi-agent-core/dist/types.d.ts). |
| Tool execution end / result | Pi event carries arbitrary `result` and `isError`; the native `ToolResultMessage` shape includes text/image content, details, usage, and added tool names. | `tool.result` stores call id/name, text-only result content, and error bit. Async results may receive an extra durable bookkeeping path, but it still begins from this text/error projection. | Result is a `<pre>` text block; error coloring uses only `isError`. | **App/web silent loss** of result images, details, tool usage, added names, and arbitrary structured values. The UI does not provide a structured-result reader. [`app/runtime/pi-session-runtime.mjs:397-405`](../../app/runtime/pi-session-runtime.mjs), [`app/node_modules/@earendil-works/pi-ai/dist/types.d.ts:330-346`](../../app/node_modules/@earendil-works/pi-ai/dist/types.d.ts), [`app/web/app.mjs:2355-2387`](../../app/web/app.mjs). |
| `ask_user` and permission interactions | These are host tools rather than Pi assistant content blocks. The service opens a durable question/permission record with a run-scoped id and payload. | `question.open`/`permission.open`, `question.resolved`/`permission.resolved`, and `run.status` are stored; permission payloads include tool identity, path, byte count, content digest, and preview, with CAS checks on answer. | Question and permission cards expose answer/allow/deny only while the run is live and admitted. | **Covered as interaction state**, but this is permission/question authority, not model-output review. [`app/server/service.mjs:1316-1378`](../../app/server/service.mjs), [`app/server/store.mjs:501-515`](../../app/server/store.mjs), [`app/web/thread-projection.mjs:66-87,132-180`](../../app/web/thread-projection.mjs). |
| Workspace/file output | A tool may write bytes; the host records a content-version artifact with path, byte count, digest, and timestamp. | `artifact.written` and `run.artifacts` preserve file identity. The recorded-byte route verifies `runId`, path, SHA-256, byte count, and history scope. | The output row opens the recorded version; the inspector/file reader can show Markdown, text, or a fallback. | **File identity is covered.** The reader explicitly says saved/recorded files have not been accepted by a review; a written file is not a Core Artifact/Decision. [`app/server/store.mjs:478-486`](../../app/server/store.mjs), [`app/web/app.mjs:2920-2950`](../../app/web/app.mjs), [`app/web/inspector.mjs:169-175,417-429`](../../app/web/inspector.mjs). |
| Compaction, retries, and notices | Pi emits compaction, summarization retry, and provider retry lifecycle events. | Runtime turns these into selected `run.notice` facts; it intentionally omits raw provider errors and summary text. Turn count and compaction usage affect `run.usage`; failed/partial accounting marks `missing`. | Known notice kinds receive short labels; unknown notice kinds fall back to their kind. | **Intentional summarized presentation**, not an output-content record. The notice cannot reconstruct a compaction summary or provider response. [`app/runtime/pi-session-runtime.mjs:241-295`](../../app/runtime/pi-session-runtime.mjs), [`app/web/inspector.mjs:298-310`](../../app/web/inspector.mjs). |
| Other AgentSession lifecycle events | Pi declares agent/turn/message start/end, model/thinking selection, and tool lifecycle events; assistant stream subevents include start/delta/end for text, thinking, and tool calls. | Only message update/end and tool execution start/update/end map to app events. `turn_start` is consumed for usage/turn limits; compaction/retry events become notices; other events fall through to `null`. | No lifecycle rows beyond known run status/notices. | **Raw lifecycle loss** in the app event stream. This prevents reconstructing exact provider stream phases or model-selection history from HTTP events alone. [`app/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts:578-628`](../../app/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts), [`app/runtime/pi-session-runtime.mjs:375-410`](../../app/runtime/pi-session-runtime.mjs). |
| Custom messages and host context | Pi's native session format supports `custom`, `custom_message`, string or text/image content, details, and a display flag. The runtime injects `runtime.context` as a hidden custom message when needed. | No generic app event is emitted for this native context injection. | It is not shown as user/model output. | **Intentional internal-context omission** from the output UI. It must not be counted as a missing user-visible model result. Native custom-entry retention still has the same first-assistant flush caveat. [`app/node_modules/@earendil-works/pi-coding-agent/dist/core/session-manager.d.ts:59-103`](../../app/node_modules/@earendil-works/pi-coding-agent/dist/core/session-manager.d.ts), [`app/runtime/pi-session-runtime.mjs:297-325`](../../app/runtime/pi-session-runtime.mjs). |
| Cancellation, budget, or provider failure | Pi can end an assistant message with `error`/`aborted`, but cancellation can occur before a final assistant message. | Host records `run.status`, redacted/classified `run.error`, and usage completeness; it does not synthesize a partial assistant message. | Run status/error remains visible; an empty assistant body is skipped. | **Failure status is covered; partial native content is not guaranteed in the app stream.** This is a status/recovery fact, not acceptance or review. [`app/server/service.mjs:1180-1242`](../../app/server/service.mjs), [`app/web/app.mjs:2565-2569,2958-2985`](../../app/web/app.mjs). |

### Direct silent-loss list

The following losses are demonstrated by the current source path rather than
inferred from a missing renderer:

1. `mapSessionEvent` has only five mapped event families. Its default returns
   `null`, so native lifecycle events are absent from RuntimeStore; assistant
   thinking/tool-call blocks reach a mapped assistant event only after their
   non-text content has been omitted.
2. `textFromContent` keeps only text parts. This drops image blocks and all
   non-text assistant/tool content before the generic event is appended.
3. Tool execution arguments are present in Pi start/update events but are
   never copied. The web projection's support for `data.args` is therefore
   unused by the real adapter.
4. Tool result details, images, usage, added tool names, and arbitrary
   structured values are not represented in `tool.update` or `tool.result`.
5. Assistant provider/model/response/signature/diagnostic/deferred metadata is
   absent from the app event. Usage is reduced to a run aggregate, and the web
   projection ignores even the retained final stop/error fields.
6. `projectThread` does not allocate a new segment for an assistant message.
   Consecutive assistant messages in one run therefore share the same
   `runId:segment` key and the later text replaces the earlier row. This is a
   presentation/source-identity loss distinct from the mapper's cumulative
   streaming text behavior; provider retries or multiple assistant messages
   need an explicit segment contract before review can treat them separately.
7. No HTTP endpoint exposes the native Pi JSONL path as a readable output
   journal. A future reader cannot recover the omitted fields through the
   current session/events API.
8. The Inspector intentionally displays only the latest 100 RuntimeStore
   events. That is a diagnostic presentation limit, not deletion of older
   events, but it must not be presented as a complete output trace.

The native journal can retain more than the app projection because Pi's
`SessionMessageEntry` stores a full `AgentMessage`; however, that statement is
conditional on Pi having flushed the entry and is not a current web-readable
coverage guarantee. In particular, this source review did not execute a
provider fixture that proves image/thinking/custom-entry persistence for every
adapter path.

## Review boundary

The current implementation has three distinct kinds of fact:

* **Storage identity:** Pi host-session locator and native message tree;
  RuntimeStore session/run/sequence; and recorded file path/byte-count/hash.
  These identify where an output or continuation can be recovered.
* **Presentation:** projected rows, Markdown sanitization, copy controls,
  `<pre>` tool details, notices, and the file reader. These are derived views;
  they do not create source identity, review state, or permission.
* **Formal review/acceptance:** Core Work projections and explicitly advertised
  `humanAction` descriptors. A Run reaching `completed`, a tool returning
  text, or a file row being visible cannot change Candidate/Artifact/Decision
  state. The existing file reader states this directly.

The current output events have run and sequence identity, but no
variant-specific immutable output-part identity that the web or Core can use
to review a thinking block, image, tool-call arguments, or structured tool
result. Permission answers are durable host decisions with their own payload
and CAS; they are not formal output review. No direct model-output annotation
or acceptance route was found in this chain.

## OR-A0 decisions to freeze before a writer

These are contract questions surfaced by the evidence, not implementation
decisions made in this note:

1. Decide whether the native Pi journal is an allowed review/read source. If
   yes, define a scoped, integrity-checked read path and limits for its full
   message variants. If no, the host must persist the required variants in an
   explicit app-owned record before any renderer can claim coverage.
2. Define stable output-part identity and ordering across assistant text,
   thinking, tool-call blocks, tool results, media, file writes, retries, and
   failures. `runId:segment` is currently a presentation key, not a durable
   source contract.
3. Separate content-origin fields (model, user, tool, host context), raw/native
   metadata, safe display representation, and unsupported/unavailable reasons.
   An empty text projection must not stand in for an image, structured result,
   or omitted provider payload.
4. Specify what is reviewable and which owner accepts it. Copy/open/read and
   permission are different actions from a formal Candidate/Artifact/Decision
   review. Run completion must remain only a lifecycle fact.
5. Add independent fixtures for non-text content, tool args/details, native
   journal flush/restart, producer absence, truncation, and late/cancelled
   output before claiming full Output Review coverage.

## Source and verification index

* Pi dependency pins: [`app/package-lock.json:7-14`](../../app/package-lock.json).
* Pi content/message types and assistant stream variants: [`pi-ai/types.d.ts:237-347,410-463`](../../app/node_modules/@earendil-works/pi-ai/dist/types.d.ts).
* Pi AgentSession event declarations: [`pi-coding-agent/extensions/types.d.ts:578-628`](../../app/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts).
* Runtime text-only mapper: [`app/runtime/pi-session-runtime.mjs:358-410`](../../app/runtime/pi-session-runtime.mjs).
* Service native-session locator, event persistence, outcomes, and durable questions: [`app/server/service.mjs:885-893,1039-1042,1147-1242,1289-1379`](../../app/server/service.mjs).
* RuntimeStore schema/event writes: [`app/server/store.mjs:80-178,217-223,424-509`](../../app/server/store.mjs).
* HTTP snapshot/events surface: [`app/server/index.mjs:120-150`](../../app/server/index.mjs), [`app/server/service.mjs:478-487,1431-1449`](../../app/server/service.mjs).
* Web projection and rendering: [`app/web/thread-projection.mjs:1-130`](../../app/web/thread-projection.mjs), [`app/web/app.mjs:983-1049,2333-2387,2546-2569,2918-2995`](../../app/web/app.mjs).
* Recorded file provenance/review boundary and Inspector limits: [`app/web/inspector.mjs:169-208,259-289,311-429`](../../app/web/inspector.mjs).
* Existing mapping/lifecycle assertions: [`app/tests/work-settlement.test.mjs:67-82`](../../app/tests/work-settlement.test.mjs), [`app/tests/lifecycle.test.mjs:271-286`](../../app/tests/lifecycle.test.mjs), [`app/tests/ui-event-mapping.test.mjs:67-97`](../../app/tests/ui-event-mapping.test.mjs).

The targeted existing checks were run from this checkout:

```text
node --test app/tests/work-settlement.test.mjs app/tests/ui-event-mapping.test.mjs
```

They exercise the mapped tool event sequence and projection behavior. They do
not prove full native JSONL retention or non-text output coverage; those remain
the explicit OR-A0 gaps above.
