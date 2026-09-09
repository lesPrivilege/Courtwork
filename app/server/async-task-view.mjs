import { sameSource } from './async-task-state.mjs';

/**
 * Pure, side-effect-free projection of one retained async task for reads
 * (schemaVersion: 1).
 *
 * `projectAsyncTask(task, context, options)` renders exactly the view the host
 * used to build inside `AsyncTasks.view`, extracted into a standalone function
 * so an authenticated read surface can project stored facts without touching
 * the store, the adapter registry, the clock or the writer. It never queries
 * the store, never invokes adapter methods, never reads the current time and
 * never writes state.
 *
 * - `task` is an immutable stored task object, exactly as retained by the
 *   RuntimeStore (the caller supplies a validated task).
 * - `context.sessionExists` reports whether the task's origin Session still
 *   exists; the caller performs that lookup. When it is false (or omitted),
 *   the task is `orphaned`, which takes priority over every other condition.
 * - `context.adapter` is the caller's current adapter for `task.adapter.id`,
 *   or null when the adapter is absent. Only `version` and `sources` are ever
 *   read from it; the projection cannot launch, query, cancel or observe.
 * - `options` mirror the previous view: `{ result = true, deliveries = true }`.
 *   `result: false` / `deliveries: false` omit those sections from the output,
 *   as the list surface does.
 *
 * Availability follows the frozen priority and infers no new fact:
 *
 *   session missing (context.sessionExists false)  -> 'orphaned'
 *   adapter missing or version mismatch            -> 'adapter_unavailable'
 *   source id/version/digest mismatch              -> 'historical'
 *   otherwise                                      -> 'current'
 *
 * Everything else is copied verbatim into an independent output: the terminal
 * execution state, the cancellation request/attempt, the delivery receipts
 * (prepared-but-unrecorded stays prepared; `runtimeRecordedAt` stays null) and
 * `provider: 'unknown'` are all preserved byte-for-byte. The input task is
 * never mutated and mutating the returned object cannot affect the owner.
 * Nothing is added or repaired: no `accepted` status, no permission/action
 * inference, no auto-recovery, no UI copy. An older snapshot is projected as
 * the older snapshot; the projection never "fixes" it into a newer fact.
 */
export function projectAsyncTask(task, context, options = {}) {
  const { result = true, deliveries = true } = options;
  const sessionExists = context != null && context.sessionExists === true;
  const adapter = context == null || context.adapter == null ? null : context.adapter;

  let availability;
  if (!sessionExists) {
    availability = 'orphaned';
  } else if (adapter == null || adapter.version !== task.adapter.version) {
    availability = 'adapter_unavailable';
  } else if (!adapter.sources.some(source => sameSource(source, task.source))) {
    availability = 'historical';
  } else {
    availability = 'current';
  }

  const view = { schemaVersion: 1, ...structuredClone(task), availability };
  if (!result) delete view.result;
  if (!deliveries) delete view.deliveries;
  return view;
}
