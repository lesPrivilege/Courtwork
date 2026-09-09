# AM-B adapted read tasks v1 (Astra)

This contract freezes the first host-owned async slice. It is opt-in through trusted
`asyncTaskAdapters` in `createRuntime`/`startServer`, with no adapters installed by
default. Only bounded, immutable document reads are admitted. Adapter registration
is an embedding seam, not a model-installable plugin, HTTP URL input or scheduler.
Pi remains the model loop. Core3/app4 and Attention are unchanged.

## Identity, storage and migration

RuntimeStore owns `asyncTasks` under its existing single writer/lock and atomic
state publication. Runtime schema5 adds this collection. A fully validated old
schema3 or schema4 is backed up by exact bytes before upgrade; unsupported/malformed
shapes and existing backup paths (including symlinks) refuse migration. Restore
the backup in a separate directory using its matching old host. Old hosts reject
schema5. No running user directory is part of development or tests.

The host mints a task UUID, binding project, Session, Run, tool call ID, adapter
ID/implementation version and immutable source ID/version/SHA-256. Reusing an
origin call with changed input conflicts. A handle is a lookup key, never authority.
No fork or cross-Session inheritance is implicit. An explicit later Run in the
same retained Session can get/wait the original task. Deleting the Session retains
the task as an orphan, queryable by the authenticated local human in that project;
no callback recreates the Session or selects a recent one.

At most 128 tasks per project, 64 KiB UTF-8 per result, 128 delivery records per
task. Full queues refuse new work rather than evict recovery evidence. The first
slice has no automatic retention deletion or unbounded result stream. All adapter
source registrations are bounded (16 adapters, 128 total sources, 64 KiB catalog) and frozen when the host starts.

## Read adapter and execution

A trusted adapter declares `{id,version,sources:[{id,version,digest}],launch,query,cancel}`.
Methods receive `{taskId,source,signal}` and return
`{taskId,source,status,result?}`; status is `running|succeeded|failed|cancelled|missing`.
Succeeded requires `{text}` whose exact UTF-8 digest equals the source digest.
The same task/source identity must round-trip. There are no caller-supplied URLs,
credentials, executable code or arbitrary external mutation arguments.

Persist intent before dispatch, and mark the single dispatch attempt before calling
the adapter. A failure/lost acknowledgement is `unknown`; never dispatch that task
again. `query` can reconcile it by the original task identity. A missing remote
record does not prove an earlier execution never happened. Adapter absence/version
mismatch preserves history and blocks remote calls. Input version changes make
the result historical/stale; they do not rewrite old bytes.

Execution states: `queued|dispatching|running|succeeded|failed|cancelled|unknown`.
Terminal evidence is immutable; a contradictory terminal response is refused.
Cancellation intent and its attempt are recorded separately from settlement;
cancel/success races preserve provider evidence. Cancellation of a wait stops that
wait, not an unrelated older task. Stop requests cancellation of tasks launched by
the stopped Run. Budget/Run closure prevents new dispatch. On restart, unsettled
tasks become unknown and are query-only; old prompts and launches are never replayed.

Adapter I/O is bounded by host deadlines and AbortSignal; a timed-out promise cannot
later publish a different outcome. Adapters are trusted in-process code, not an OS
sandbox. Actual remote cancellation is cooperative. Background task execution does
not hold a model turn open; get/wait polls only the selected task with bounded waits. Positive waitMs bounds the polling/I/O budget (persistence adds overhead); zero or get performs one query with the host I/O timeout.

## Model consumption and work completion

Unbound Sessions expose `async_launch`, `async_get`, `async_wait` through the same
Runtime resource/policy and tool admission boundary. The host context supplies
the registered source catalog. Bound domain Sessions are unsupported in v1:
these inputs must not silently bypass ES complete-input coverage. Policy exposure
and the current binding are checked again at dispatch and read boundaries.

Launch returns the persisted identity. Get/wait produces its own ordinary tool
result, not a late result spliced into the original launch call. Each consumption
records a valid scoped requested dependency before the policy wrapper or adapter access, then updates task revision, execution status and result digest before returning;
the tool-result event and runtime-recorded receipt commit together. Provider delivery
remains `unknown`: a tool result in local transcript is not provider acknowledgement
or proof of model understanding. Repeated explicit get/wait calls may return the same
immutable evidence without re-execution.

Tasks launched or requested by a Run form its observed dependency set. A model final
with unresolved tasks, stale sources or without a runtime-recorded terminal get/wait
does not produce a completed Run; the host reports unknown with a dependency reason.
This is a deterministic execution condition, not a legal/professional quality check.
Reported failure/cancellation can be explained by a completed model Run after the
terminal tool result is recorded. Neither a completed Run nor a succeeded task accepts
a Core candidate or resolves Attention.

The existing single-active-Run gate serializes model continuation; callbacks only
settle their tasks and never create or inject model turns. Original interrupted
AgentSession/permission recovery remains unknown/expired_restart. Persisted task
reconciliation is not native provider continuation. A later authorized Run explicitly
reads the old task; native async needs a separate serializer/parser/loop/continuation
acceptance and no native support is claimed here.

## Human read/control and compatibility

Authenticated `/api/v5/async-tasks?projectId=…` and `/async-tasks/:id?projectId=…`
read retained facts only. POST `/:id/reconcile` and `/:id/cancel` carry
`{projectId,expectedRevision}`; CAS is checked before the action. Cancellation is
at most one dispatch attempt, including after uncertain acknowledgement. A stale
response is not the current state; refetch instead of silently updating the revision.
Runtime policy still limits adapter calls. Unknown fields and duplicate query keys
are refused. Scope mismatch is uniformly unavailable.

Turning off new launches preserves retained reads and explicit reconciliation where
the matching authorized adapter remains available. Adapter absence reports unavailable;
it never erases records. The first slice does not install a UI, automatic follow-ups,
MCP Tasks transport, email/GitHub writers or external-effect rollback.

Acceptance uses two independently delayed source reads, complete-parameter admission,
out-of-order/duplicate callbacks, cancel races, lost ACK, SIGKILL/restart query, deleted
origin, source/implementation changes, policy denial, premature final and fixed-SHA
migration/old-host refusal. Fixture self-tests, real host/Pi loopback tests and real
model quality evidence are reported separately.
