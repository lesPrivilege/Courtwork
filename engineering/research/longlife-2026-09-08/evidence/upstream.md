# Long-life architecture: external mechanism notes

**Scope.** Read-only source check for three local mechanisms that can inform the
Schema Engineering manifesto's long-life architecture. This is a reuse note,
not a dependency recommendation, implementation plan, or product acceptance
claim. Sources were accessed 2026-09-08. The cited behavior is attributed to
the source; the SE implications below are design inferences.

## 1. Temporal: durable execution with an explicit effect boundary

**Official evidence.** [Temporal Workflow Execution overview](https://docs.temporal.io/workflow-execution)
describes a Workflow Execution as durable and recoverable across failures,
with signals and Activities as communication boundaries. The same page
documents replay, commands, awaitables, timers, and execution state.
[How Temporal works](https://docs.temporal.io/encyclopedia/architecture/how-temporal-works)
describes persisted Event History, workers replaying workflow code, commands
for timers and Activities, and retryable Activity execution.

**Mechanism.** A long-running workflow is represented by durable history and
replayed deterministic workflow code. The workflow decides what should happen;
external I/O is performed by Activities, whose completion or failure is
recorded and which may be retried. Signals provide durable input from outside;
timers provide durable waits. Recovery resumes from persisted state/history,
and replay reconstructs the workflow without redoing already recorded effects.

**SE reuse implication.** Separate a durable, deterministic decision/state
machine from effectful adapters. Persist the command or event that requests an
effect, give the effect an idempotency key, record its outcome, and make retry
and recovery explicit. Model a pause or timer as durable state that can be
reopened after process loss, rather than as a live in-memory promise. This
supports the manifesto's claim that a Matter or other work item can outlive a
process, with a projection rebuilt from durable history even after the
original session is gone.

**Boundary.** Temporal's server, worker, event-history, and retry guarantees
are not supplied by this note. A local implementation would still need to
define its storage, idempotency, failure policy, cancellation semantics, and
history limits. Deterministic replay does not make arbitrary external effects
safe; those effects remain behind an explicit boundary.

## 2. LangGraph: persisted interrupt and resume semantics

**Official evidence.** [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts)
specifies that `interrupt()` saves graph state and waits indefinitely for
external input; a checkpointer and stable `thread_id` provide the persistent
cursor, and `Command` resumes the graph. It also states that resuming restarts
the interrupted node from its beginning, so side effects before an interrupt
must be idempotent or moved after the pause. [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence)
documents checkpointed graph state scoped to a thread and longer-lived stores
for data shared across threads.

**Mechanism.** A graph reaches an explicit interrupt payload, checkpoints its
state, and becomes resumable by an external value addressed to the same
thread. The waiting interval has no process-lifetime assumption. On resume,
the node is re-entered from its start, so replay/resume is a real execution
boundary rather than continuation of a suspended call stack. Checkpointed
state supplies the recovery cursor; a separate store can hold durable data
that is not one execution's cursor.

**SE reuse implication.** Give human approval, missing input, and other pauses a
first-class durable record containing a stable session/turn identity, the
question or payload, and the resume value. Re-enter work from a known boundary,
and make pre-boundary writes idempotent. Keep execution checkpoints distinct
from shared reference data. This yields a precise pause/resume contract for
long-lived interactions and makes crash recovery testable.

**Boundary.** An interrupt is a persistence and control-flow pattern, not a
claim that every model/tool call is replay-safe. The local contract must decide
which state is serializable, how stale or duplicate resumes are handled, who
may resume a thread, and what cancellation/expiry means. The source's Python
library behavior should not be copied as an API requirement.

## 3. VS Code Custom Editors: document model versus disposable views

**Official evidence.** [VS Code Custom Editors](https://code.visualstudio.com/api/extension-guides/custom-editors)
separates a document model from its editor view: one document can have multiple
views, each view has its own `WebviewPanel`, and view disposal is distinct from
disposing the document model after no editors remain. The guide also places
document edits and save handling on the document model and describes syncing
changes to views.

**Mechanism.** VS Code separates three lifetimes: a webview/editor view is a
disposable projection surface; a `CustomDocument` is the extension's in-memory
document model shared by its views; and persistence such as a file or backup is
owned by the host/document implementation. A webview can be created,
recreated, or disposed independently. Multiple views observe the same model;
per-view resources are released with that view, while VS Code may dispose the
in-memory document model after the last associated editor closes. That model
disposal does not mean that a file, backup, or already submitted Matter should
be deleted.

**SE reuse implication.** Keep the persistent SE record (for example, a
committed Matter/work history and its backup policy) above the view and the
in-memory document model. Register view-owned subscriptions and caches under
the view lifecycle; rebuild a view or recreate the in-memory model from
persistent state after reload. Host/document code must define save and backup
behavior. Closing all views may release the in-memory model, but must not
delete formal persistent data. If several views attach to one work item, route
edits through the canonical persistent/document contract so they converge
instead of each owning an authoritative copy.

**Boundary.** VS Code's extension host and `CustomDocument` APIs are not a
proposed SE dependency. The transferable invariant is ownership and disposal
across the three layers: view teardown releases view resources; model teardown
releases in-memory resources; persistent-data retention and deletion follow an
explicit host/work policy. A browser UI still needs its own transport,
authorization, backpressure, and stale-view policy.

## Cross-cutting reuse rule

The three sources support a narrow architecture rule: durable state/history
owns decisions and recovery; external effects have an explicit, retry-aware
boundary; a pause is a persisted state transition; and each UI view is a
rebuildable projection with scoped disposal. These are mechanisms and
invariants to test locally. Reusing the invariants does **not** mean selecting,
installing, or adding Temporal, LangGraph, or VS Code as a dependency.
