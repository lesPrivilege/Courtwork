/**
 * scheduler.mjs
 * ---------------------------------------------------------------------------
 * Zero-dependency, synchronous, pure helpers for dependency-graph task
 * scheduling.
 *
 * Public API
 *   validateGraph(tasks)            -> { valid: boolean, errors: string[] }
 *   topologicalOrder(tasks)         -> string[]              (throws TypeError)
 *   getReadyTasks(tasks, states)    -> string[]              (throws TypeError)
 *   getBlockedTasks(tasks, states)  -> string[]              (throws TypeError)
 *   VALID_TASK_STATES               -> frozen string[]       (convenience)
 *
 * Data model
 *   tasks  : Array<{ id: string, deps: string[] }>
 *   states : Record<taskId, 'pending'|'running'|'succeeded'|'failed'|'blocked'>
 *
 * Guarantees
 *   * Pure: neither `tasks` nor `states` is ever mutated.
 *   * Ids are compared as exact strings; ids are never trimmed, normalised or
 *     coerced. A whitespace-only id is *rejected*, not repaired.
 *   * Every failure path throws a `TypeError` carrying a stable `err.code`, so
 *     a caller can catch with `err instanceof TypeError` (or `Error`) and then
 *     branch on `err.code`:
 *       INVALID_GRAPH       graph is not schedulable (shape/id/dep/cycle)
 *       INVALID_STATES      `states` is not a plain object
 *       UNKNOWN_TASK        `states` mentions an id absent from the graph
 *       INVALID_STATE       `states` value is not one of VALID_TASK_STATES
 *       INTERNAL_INVARIANT  defensive guard, unreachable for validated graphs
 *   * `validateGraph` never throws, for any input, including graphs whose
 *     dependencies point at unknown tasks.
 *   * Deterministic: same inputs -> same outputs. No reliance on object key
 *     ordering, randomness, clocks, locale or I/O.
 */

export const VALID_TASK_STATES = Object.freeze([
  'pending',
  'running',
  'succeeded',
  'failed',
  'blocked',
]);

const VALID_STATE_SET = new Set(VALID_TASK_STATES);
const PENDING = 'pending';
const SUCCEEDED = 'succeeded';
const FAILED = 'failed';
const BLOCKED = 'blocked';

/** Shared empty edge list for nodes that are absent from an adjacency map. */
const NO_EDGES = Object.freeze([]);

const CODE = Object.freeze({
  invalidGraph: 'INVALID_GRAPH',
  invalidStates: 'INVALID_STATES',
  unknownTask: 'UNKNOWN_TASK',
  invalidState: 'INVALID_STATE',
  internal: 'INTERNAL_INVARIANT',
});

/* -------------------------------------------------------------------------- */
/* small helpers                                                              */
/* -------------------------------------------------------------------------- */

function fail(code, message) {
  const error = new TypeError(message);
  error.code = code;
  throw error;
}

/** Human readable type description used in error messages. */
function describeValue(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'object':
      return 'an object';
    case 'function':
      return 'a function';
    default:
      return String(value);
  }
}

/** Accepts any non-null, non-array object (duck typed task entries). */
function isObjectLike(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Accepts only `{}`-literals, `Object.create(null)` and similar plain maps. */
function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

/** Index ordered min-heap (keys are non-negative integers). */
class MinHeap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(value) {
    const heap = this.items;
    heap.push(value);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent] <= heap[i]) break;
      const swap = heap[parent];
      heap[parent] = heap[i];
      heap[i] = swap;
      i = parent;
    }
  }

  pop() {
    const heap = this.items;
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < heap.length && heap[left] < heap[smallest]) smallest = left;
        if (right < heap.length && heap[right] < heap[smallest]) smallest = right;
        if (smallest === i) break;
        const swap = heap[smallest];
        heap[smallest] = heap[i];
        heap[i] = swap;
        i = smallest;
      }
    }
    return top;
  }
}

/* -------------------------------------------------------------------------- */
/* 1. validateGraph                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Validate a task graph.
 *
 * Invalid: non-array input, malformed task entries, non-string / blank ids,
 * duplicate ids, malformed `deps`, non-string deps, duplicate deps, unknown
 * deps, self-dependencies and cycles. The empty graph is valid.
 *
 * Never throws (including for graphs with unknown dependencies). `errors` is
 * empty iff `valid` is true. Error order is stable: per-task shape/id/dep
 * errors (input order), then unknown dependencies (input order), then one
 * message per cyclic component (ordered by the smallest input index inside the
 * component).
 */
export function validateGraph(tasks) {
  const errors = [];

  if (!Array.isArray(tasks)) {
    return { valid: false, errors: ['tasks must be an array'] };
  }

  const count = tasks.length;
  const ids = new Array(count).fill(null);
  const firstIndexOf = new Map();

  let shapesOk = true;
  let idsOk = true;
  let idsUnique = true;
  let depsAreArrays = true;
  let depsAreStrings = true;

  /* ---- pass 1: per-task shape, ids, dependency lists -------------------- */
  for (let i = 0; i < count; i += 1) {
    const task = tasks[i];

    if (!isObjectLike(task)) {
      errors.push(`tasks[${i}] must be an object with an "id" string and a "deps" array`);
      shapesOk = false;
      idsOk = false;
      idsUnique = false;
      depsAreArrays = false;
      depsAreStrings = false;
      continue;
    }

    const id = task.id;
    if (typeof id !== 'string') {
      errors.push(`tasks[${i}].id must be a string, received ${describeValue(id)}`);
      idsOk = false;
    } else if (id.trim() === '') {
      errors.push(`tasks[${i}].id must not be blank`);
      idsOk = false;
    } else {
      ids[i] = id;
      if (firstIndexOf.has(id)) {
        errors.push(
          `tasks[${i}].id duplicates tasks[${firstIndexOf.get(id)}].id: ${JSON.stringify(id)}`,
        );
        idsUnique = false;
      } else {
        firstIndexOf.set(id, i);
      }
    }

    const deps = task.deps;
    if (!Array.isArray(deps)) {
      errors.push(`tasks[${i}].deps must be an array of strings, received ${describeValue(deps)}`);
      depsAreArrays = false;
      continue;
    }

    const seenDeps = new Set();
    for (let j = 0; j < deps.length; j += 1) {
      const dep = deps[j];
      if (typeof dep !== 'string') {
        errors.push(`tasks[${i}].deps[${j}] must be a string, received ${describeValue(dep)}`);
        depsAreStrings = false;
        continue;
      }
      if (typeof id === 'string' && dep === id) {
        errors.push(`tasks[${i}].deps[${j}] is a self-dependency: ${JSON.stringify(dep)}`);
      }
      if (seenDeps.has(dep)) {
        errors.push(`tasks[${i}].deps[${j}] duplicates dependency ${JSON.stringify(dep)}`);
      }
      seenDeps.add(dep);
    }
  }

  /** Only a graph whose ids/deps are fully resolvable gets the deep checks. */
  const resolvable = shapesOk && idsOk && idsUnique && depsAreArrays && depsAreStrings;

  /* ---- pass 2: unknown dependencies ------------------------------------- */
  if (resolvable) {
    for (let i = 0; i < count; i += 1) {
      const deps = tasks[i].deps;
      for (let j = 0; j < deps.length; j += 1) {
        if (!firstIndexOf.has(deps[j])) {
          errors.push(
            `tasks[${i}].deps[${j}] references unknown task ${JSON.stringify(deps[j])}`,
          );
        }
      }
    }
  }

  /* ---- pass 3: cycles (iterative Tarjan, no recursion) ------------------- */
  if (resolvable) {
    // Adjacency over *task* ids only. Edges pointing at unknown tasks are
    // skipped here: they were reported in pass 2, and a missing node has no
    // outgoing edges, so it can never be part of a cycle. Without this filter
    // the adjacency map would be missing those keys entirely.
    const successors = new Map();
    for (let i = 0; i < count; i += 1) successors.set(ids[i], new Set());
    for (let i = 0; i < count; i += 1) {
      const outgoing = successors.get(ids[i]);
      for (const dep of tasks[i].deps) {
        if (dep !== ids[i] && successors.has(dep)) outgoing.add(dep);
      }
    }

    const minIndex = (component) =>
      component.reduce((acc, id) => Math.min(acc, firstIndexOf.get(id)), Infinity);

    const cyclic = stronglyConnectedComponents(ids, successors)
      .filter((component) => component.length > 1)
      .sort((a, b) => minIndex(a) - minIndex(b));

    for (const component of cyclic) {
      const names = component
        .slice()
        .sort((a, b) => firstIndexOf.get(a) - firstIndexOf.get(b))
        .map((id) => JSON.stringify(id))
        .join(', ');
      errors.push(`cycle detected among tasks: [${names}]`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Iterative Tarjan strongly-connected-components.
 * `nodes` is an array of node keys in the desired traversal order;
 * `successors` maps a node key to a Set of successor keys.
 *
 * Nodes that are absent from `successors` are treated as having no outgoing
 * edges (defensive: a node without out-edges can never join a non-trivial SCC,
 * so callers may safely pass adjacency maps that omit some referenced keys).
 */
function stronglyConnectedComponents(nodes, successors) {
  const index = new Map();
  const lowLink = new Map();
  const onStack = new Set();
  const stack = [];
  const components = [];
  let counter = 0;

  const outgoingOf = (node) => {
    const entry = successors.get(node);
    return entry === undefined ? NO_EDGES : Array.from(entry);
  };

  for (const root of nodes) {
    if (index.has(root)) continue;

    index.set(root, counter);
    lowLink.set(root, counter);
    counter += 1;
    stack.push(root);
    onStack.add(root);

    const work = [{ node: root, next: 0, outgoing: outgoingOf(root) }];

    while (work.length > 0) {
      const frame = work[work.length - 1];
      const { node } = frame;

      if (frame.next < frame.outgoing.length) {
        const next = frame.outgoing[frame.next];
        frame.next += 1;

        if (!index.has(next)) {
          index.set(next, counter);
          lowLink.set(next, counter);
          counter += 1;
          stack.push(next);
          onStack.add(next);
          work.push({ node: next, next: 0, outgoing: outgoingOf(next) });
        } else if (onStack.has(next)) {
          if (index.get(next) < lowLink.get(node)) lowLink.set(node, index.get(next));
        }
        continue;
      }

      // All successors handled: finish this frame.
      work.pop();
      if (work.length > 0) {
        const parent = work[work.length - 1].node;
        if (lowLink.get(node) < lowLink.get(parent)) lowLink.set(parent, lowLink.get(node));
      }
      if (lowLink.get(node) === index.get(node)) {
        const component = [];
        for (;;) {
          const member = stack.pop();
          onStack.delete(member);
          component.push(member);
          if (member === node) break;
        }
        components.push(component);
      }
    }
  }

  return components;
}

/* -------------------------------------------------------------------------- */
/* internal graph analysis (shared by the query functions)                     */
/* -------------------------------------------------------------------------- */

/** Validates the graph (throws) and derives every index we need. */
function analyze(tasks) {
  const result = validateGraph(tasks);
  if (!result.valid) {
    fail(CODE.invalidGraph, `invalid task graph: ${result.errors.join('; ')}`);
  }

  const count = tasks.length;
  const ids = new Array(count);
  const indexOfId = new Map();
  for (let i = 0; i < count; i += 1) {
    ids[i] = tasks[i].id;
    indexOfId.set(ids[i], i);
  }

  const deps = new Array(count);
  const depIndices = new Array(count);
  const inDegree = new Array(count);
  const dependents = new Array(count);
  for (let i = 0; i < count; i += 1) dependents[i] = [];

  for (let i = 0; i < count; i += 1) {
    const unique = Array.from(new Set(tasks[i].deps));
    deps[i] = unique;
    depIndices[i] = unique.map((dep) => indexOfId.get(dep));
    inDegree[i] = unique.length;
    for (const j of depIndices[i]) dependents[j].push(i);
  }

  return { count, ids, indexOfId, deps, depIndices, inDegree, dependents };
}

/** Stable Kahn ordering over task indices; ties broken by input index. */
function topoOrderIndices(analysis) {
  const inDegree = analysis.inDegree.slice();
  const heap = new MinHeap();
  for (let i = 0; i < analysis.count; i += 1) {
    if (inDegree[i] === 0) heap.push(i);
  }

  const order = [];
  while (heap.size > 0) {
    const i = heap.pop();
    order.push(i);
    for (const dependent of analysis.dependents[i]) {
      inDegree[dependent] -= 1;
      if (inDegree[dependent] === 0) heap.push(dependent);
    }
  }

  if (order.length !== analysis.count) {
    fail(
      CODE.internal,
      'internal invariant broken: a validated acyclic graph could not be ordered completely',
    );
  }
  return order;
}

/** Validates `states` eagerly and returns a total state lookup. */
function buildStateLookup(analysis, states) {
  if (!isPlainObject(states)) {
    fail(
      CODE.invalidStates,
      `states must be a plain object keyed by task id, received ${describeValue(states)}`,
    );
  }

  for (const key of Object.keys(states)) {
    if (!analysis.indexOfId.has(key)) {
      fail(CODE.unknownTask, `states references unknown task id ${JSON.stringify(key)}`);
    }
    const value = states[key];
    if (!VALID_STATE_SET.has(value)) {
      fail(
        CODE.invalidState,
        `states[${JSON.stringify(key)}] must be one of ${VALID_TASK_STATES.join(' | ')}, ` +
          `received ${describeValue(value)}`,
      );
    }
  }

  return (id) => (hasOwn(states, id) ? states[id] : PENDING);
}

/* -------------------------------------------------------------------------- */
/* 2. topologicalOrder                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Stable topological order of task ids (dependencies first).
 * Ties are broken by the smallest original input index.
 * Throws TypeError (code INVALID_GRAPH) for any invalid graph.
 */
export function topologicalOrder(tasks) {
  const analysis = analyze(tasks);
  return topoOrderIndices(analysis).map((i) => analysis.ids[i]);
}

/* -------------------------------------------------------------------------- */
/* 3. getReadyTasks                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Ids of tasks that are themselves `pending` (an omitted state counts as
 * pending) and whose direct dependencies are *all* `succeeded`.
 * Returned in original input order. Throws TypeError on invalid input.
 */
export function getReadyTasks(tasks, states) {
  const analysis = analyze(tasks);
  const stateOf = buildStateLookup(analysis, states);

  const ready = [];
  for (let i = 0; i < analysis.count; i += 1) {
    if (stateOf(analysis.ids[i]) !== PENDING) continue;
    let allDepsSucceeded = true;
    for (const j of analysis.depIndices[i]) {
      if (stateOf(analysis.ids[j]) !== SUCCEEDED) {
        allDepsSucceeded = false;
        break;
      }
    }
    if (allDepsSucceeded) ready.push(analysis.ids[i]);
  }
  return ready;
}

/* -------------------------------------------------------------------------- */
/* 4. getBlockedTasks                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Ids of tasks that are themselves `pending` and that have at least one
 * ancestor (direct or transitive dependency) in state `failed` or `blocked`.
 *
 * Propagation runs in the *ancestor -> descendant* direction: every
 * `failed` / `blocked` task is a source, and the block flows downstream along
 * the `dependents` edges (a -> b means "b depends on a", so b becomes blocked
 * when a fails). Each node is visited at most once, so a source always has its
 * own blocked flag resolved before its dependents are examined — that is what
 * makes multi-level cascades (including diamonds and reversed input order)
 * propagate all the way down, regardless of task order in the input array.
 *
 * Tasks in any other state are never reported, and unrelated / disconnected
 * subgraphs are unaffected. Returned in original input order.
 * Throws TypeError on invalid input.
 */
export function getBlockedTasks(tasks, states) {
  const analysis = analyze(tasks);
  const stateOf = buildStateLookup(analysis, states);

  // Sources: every task whose own state blocks its downstream tasks.
  const reached = new Array(analysis.count).fill(false);
  const queue = [];
  for (let i = 0; i < analysis.count; i += 1) {
    const state = stateOf(analysis.ids[i]);
    if (state === FAILED || state === BLOCKED) {
      reached[i] = true;
      queue.push(i);
    }
  }

  // Flow strictly downstream (dependencies -> dependents). `reached[i]` means
  // "i is a source, or i has a failed/blocked ancestor".
  while (queue.length > 0) {
    const i = queue.pop();
    for (const dependent of analysis.dependents[i]) {
      if (reached[dependent]) continue;
      reached[dependent] = true;
      queue.push(dependent);
    }
  }

  // Only tasks that are themselves still pending are reported, in input order.
  const result = [];
  for (let i = 0; i < analysis.count; i += 1) {
    if (reached[i] && stateOf(analysis.ids[i]) === PENDING) result.push(analysis.ids[i]);
  }
  return result;
}
