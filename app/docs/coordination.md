# Thread and local messaging · API 1 / RuntimeStore 8

The Host owns a durable **interaction Thread**, distinct from Session, model
context, child execution and agent identity. This first slice stores Thread
membership and an ordered mailbox. It does not combine Session transcripts,
create an Expert registry or replace the Work Core's Matter/event/acceptance
owner. [Architecture adjudication](../../engineering/research/multi-agent-2026-09-10/README.md).

## Identity and scope

A human explicitly creates a Thread with a stable ID, title and initial Session.
It captures `{kind:global|project,projectId,matterId}` from that Session, never from
caller-supplied scope fields. Global Attention remains one role with multiple
conversations, not a synthetic Matter. Project/Matter relations are references
to existing owners; Thread creation does not create or update Matter facts.

An open Thread can attach another Session only with exactly the same scope and
the expected Thread revision. Each Session belongs to at most one Thread.
Membership does not copy permissions, model history or runtime hostSession IDs.
Removing or rebinding a Session makes its old membership historical; it never
silently rebinds the Thread. Deleting the last Session retains the Thread and its
messages. A new same-scope Session can explicitly attach to that retained open
Thread. A closed Thread retains history and admits no new membership or delivery.

Thread revisions change on attachment/close. They are routing/membership versions,
not Matter versions or evidence acceptance. Messages append in the RuntimeStore
transaction order; there is no promised causal order between independent senders.
Replies name an already delivered reverse-direction message explicitly.

## Authenticated human API

These endpoints are local-human operations behind the existing work token and
same-origin checks. Like existing `/sessions` and historical-work APIs, they can
inspect the local user's retained Threads across projects. They are **not** the
model's mailbox adapter or multi-user authorization API. Model arguments cannot
select this human identity; raw HTTP is not exposed as a model tool.

| Method/path (under `/api/v5`) | Input / result |
|---|---|
| `GET /coordination` | `{schemaVersion:1,threads,currentThreadId:null,capabilities}`; includes unavailable retained history |
| `GET /coordination/sessions/:sessionId` | Directory plus exact current membership if scope still matches |
| `POST /coordination/threads` | Exactly `{threadId,sessionId,title}`; returns `{schemaVersion:1,thread}` |
| `POST /coordination/threads/:id/attach` | Exactly `{sessionId,expectedRevision}` |
| `POST /coordination/threads/:id/close` | Exactly `{expectedRevision}` |
| `GET /coordination/threads/:id?offset=0&limit=20` | `{schemaVersion:1,thread,authority:'communication-only',messages,offset,total,nextOffset}` |
| `POST /coordination/messages` | Message input below; returns `{schemaVersion:1,message}` |

Message input is exactly `{messageId,sourceThreadId,targetThreadId,sourceSessionId,
expectedTargetRevision,kind,text,replyTo}`. Kind is `request|signal|reply|result`;
`replyTo` is null unless kind is reply. Sender Session must still be a member of
the source Thread at its captured scope. Source/target must be different, open
and backed by matching retained Sessions. Human cross-project communication is
allowed as an explicit local-human operation; it grants no model or Core access.

Host records actor `human` with null Run/call, or the actual model invocation's
`runtime` actor and host-bound Run/call. Caller fields cannot impersonate an actor,
grant, runtime origin or target revision. A model's “result” remains communication.

IDs/title are at most 200 characters; message text at most 16,000 characters;
the store admits at most 256 Threads, 64 Sessions per Thread and 1,024 messages.
Full capacity refuses new records without evicting evidence. Mailboxes and model
directories page by 0-based offset, default/max 20. Append-only retention keeps
mailbox pagination stable. Duplicate query keys, unknown fields, unsupported page
sizes and malformed payloads fail closed. There is no retention deletion API.

## Model tools and permission boundary

Only an unbound Session with explicit, still-valid Thread membership receives
the optional `thread_directory`, `thread_mailbox`, `message_other_agent` tools.
The existing Runtime composition/profile/exposure/policy snapshot and
`governTools` remain the execution boundary. Domain-bound Sessions do not receive
these tools: formal input-coverage integration is not yet delivered.

- A project model directory contains same-scope Threads only. Global Attention
  can discover local Thread metadata, consistent with its explicit global role;
  it does not receive other mailboxes' bodies from the directory. Paging limits
  apply, and returned metadata omits Session membership IDs and creation receipts.
- Model mailbox reads are always bound to the exact calling Session's Thread.
  A handle or another Thread ID does not grant mailbox access. Messages are
  untrusted communications, not higher-priority instructions or accepted facts.
- Project model sends are restricted to the same scope. Global Attention can
  send across scopes, but each send requires the existing exact-argument human
  permission decision. `read_only` denies sends and omits the sending tool from
  the model. Runtime inspector and executor share `hostToolCeiling`; profile or
  allow rules cannot widen it. Deny still overrides ask.
- Origin Run/Session/call are supplied by the host. The Run must remain admitted
  at enqueue. Message ID is deterministically derived from Run/call; repeated
  identity with changed payload conflicts. Neither model arguments nor a target
  agent's configuration grants new capabilities.

No callback wakes an agent, injects a turn into “latest”, accepts a Core candidate,
resolves Attention or transfers ownership. The target's next explicitly started
Run can read its mailbox through its own permitted tools. Directory/inbox reads
are selective tools, not automatic transcript stuffing.

## Persistence, outbox and recovery

`coordination:{threads,messages}` is part of the existing RuntimeStore single
writer, lock and atomic state publication. Enqueue persists a `queued` envelope
before delivery. Delivery is a second local transaction: check the exact target
revision and retained membership, then settle `delivered|stale_target|
target_unavailable`. Non-queued settlements are immutable; repeated delivery is
idempotent. Incoming mailbox visibility begins only at delivered; the sender can
inspect queued/failed outcomes. Delivery revision 1→2 is independent of Thread or
Matter revisions and does not represent model acknowledgement.

Restart reconciles queued local messages by their original IDs. This is safe local
inbox publication, not redispatch of an external action or replay of a model Run.
Deleting a source after authorized enqueue preserves its provenance; missing or
changed targets are never recreated or replaced by recent Sessions. Identical
send retries return retained receipts even if the original Run has since ended.

No Core mutation is part of this transaction. A future governed cross-Matter
proposal+outbox transaction must be implemented within the existing Work Core
owner; this JSON ledger cannot claim atomicity with SQLite acceptance.

## Schema 8 upgrade and restore

Schema7 was already allocated to model effort/request telemetry. Schema8 adds
coordination. Original schemas 3/4/5/6/7 are strictly validated before an exclusive
mode-0600 exact-byte backup (`runtime-state.schemaN.<sha256>.json`) is created.
Only then is the upgraded state atomically published. Global/project scope,
reasoning effort, old bindings/events and async task records are preserved.
Existing backup paths (including symlinks), malformed records or invalid UTF-8
refuse upgrade; they are never overwritten or normalized as a repair.

Old hosts reject 8. To restore, use the original backup and a matching old host
in a **separate** data directory. This does not downgrade or erase the upgraded
directory. Development and migration tests use independent synthetic data only.
Core3 / bridge app4 and Paper remain unchanged.

## Child-execution entry and UI

`harness/child-execution.mjs` is an executable conformance entry, not an installed
production scheduler. It takes an exact adapter ID/version and stable
Thread/Session/Run origin; `invoke` does not transfer ownership. Host action and
resource sets intersect and delegation depth decreases. Adapter tools are checked
again per call, with abort/deadline fencing. Trusted in-process adapter code is
not an OS sandbox; cancellation is cooperative. Timeout is unknown, and late
completion cannot mutate the returned settlement. No persistence or restart
replay is claimed for this helper.

The reducer deterministically preserves claims/evidence/artifacts/conflicts/gaps
and per-execution attribution; contradictory results for one execution ID refuse.
The result remains finding-only, undelivered and unaccepted. There is no synthesis
or Core commit path. Production capabilities truthfully report Explore, handoff
and Workflow as false; Pi native lanes are not wired to this contract yet.

Attention → **Threads & messages** hosts the human entry. Choose a working
conversation explicitly, create/attach a Thread, then choose a destination and
send. Raw message text uses textContent. Unknown send receipts keep the original
ID/payload for retry, including when the target becomes unavailable; changing a
conversation cannot retarget a pending send. Closing stops read refresh only.
Unsent drafts are per-conversation, in-page only. Thread membership shares this
inbox across its conversations; it does not import their model transcripts.
