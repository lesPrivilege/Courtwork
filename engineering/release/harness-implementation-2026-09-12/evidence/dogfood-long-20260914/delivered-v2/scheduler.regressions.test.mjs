/**
 * scheduler.regressions.test.mjs
 * ---------------------------------------------------------------------------
 * Regression + invariant tests for the two externally reproduced defects:
 *
 *   #1 validateGraph threw `TypeError: undefined is not iterable` for a graph
 *      whose dependency points at an unknown task (Tarjan walked a node that
 *      had no entry in the adjacency map).
 *   #2 getBlockedTasks under-reported multi-level block cascades (the blocked
 *      flags were read before being computed, because propagation ran in the
 *      wrong direction).
 *
 * Run:
 *   node --test out/
 *   node out/scheduler.regressions.test.mjs
 *
 * STATUS: written after the fix but NOT executed here (no shell/exec tool in
 * this environment). The independent checker is expected to run it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateGraph,
  topologicalOrder,
  getReadyTasks,
  getBlockedTasks,
} from './scheduler.mjs';

/** Build a tasks array from `[id, deps?]` pairs. */
const graph = (...pairs) => pairs.map(([id, deps = []]) => ({ id, deps }));

const PENDING = 'pending';
const FAILED = 'failed';
const BLOCKED = 'blocked';

/**
 * Independent, deliberately naive reference implementation of
 * getBlockedTasks: explicit ancestor closure per task, no shared state.
 */
function bruteForceBlocked(tasks, states) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const stateOf = (id) =>
    Object.prototype.hasOwnProperty.call(states, id) ? states[id] : PENDING;

  const result = [];
  for (const task of tasks) {
    if (stateOf(task.id) !== PENDING) continue;

    const visited = new Set();
    const stack = task.deps.slice();
    let blocked = false;
    while (stack.length > 0) {
      const id = stack.pop();
      if (visited.has(id)) continue;
      visited.add(id);
      const state = stateOf(id);
      if (state === FAILED || state === BLOCKED) {
        blocked = true;
        break;
      }
      for (const dep of byId.get(id).deps) stack.push(dep);
    }
    if (blocked) result.push(task.id);
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/* 回归 #1：未知依赖不得让校验器抛错                                            */
/* -------------------------------------------------------------------------- */

test('回归#1: validateGraph 对未知依赖返回错误而不抛错（报告用例）', () => {
  const tasks = [{ id: 'a', deps: ['missing'] }];

  let result;
  assert.doesNotThrow(() => {
    result = validateGraph(tasks);
  });
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /references unknown task "missing"/);
});

test('回归#1: 多个未知依赖全部报出且不抛错', () => {
  const result = validateGraph([
    { id: 'a', deps: ['ghost1'] },
    { id: 'b', deps: ['a', 'ghost2'] },
  ]);
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0], /ghost1/);
  assert.match(result.errors[1], /ghost2/);
});

test('回归#1: 未知依赖出现在无其他边的节点上也不抛错', () => {
  const result = validateGraph([
    { id: 'solo', deps: ['nope'] },
    { id: 'ok', deps: [] },
  ]);
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /unknown task/);
});

test('回归#1: 未知依赖与真实环并存时两类错误都报出', () => {
  const result = validateGraph([
    { id: 'a', deps: ['b', 'ghost'] },
    { id: 'b', deps: ['a'] },
  ]);
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0], /unknown task/);
  assert.match(result.errors[1], /cycle detected/);
});

test('回归#1: 合法图的环检测未被削弱', () => {
  assert.deepEqual(validateGraph(graph(['a'], ['b', ['a']], ['c', ['b']])), {
    valid: true,
    errors: [],
  });

  const cyclic = validateGraph(graph(['a', ['c']], ['b', ['a']], ['c', ['b']], ['free']));
  assert.equal(cyclic.valid, false);
  assert.equal(cyclic.errors.length, 1);
  assert.match(cyclic.errors[0], /cycle detected/);

  const twoCycles = validateGraph(
    graph(['a', ['b']], ['b', ['a']], ['c', ['d']], ['d', ['c']]),
  );
  assert.equal(twoCycles.valid, false);
  assert.equal(twoCycles.errors.length, 2);
});

test('回归#1: 查询函数对未知依赖的图仍抛 INVALID_GRAPH', () => {
  const tasks = [{ id: 'a', deps: ['missing'] }];
  const calls = [
    () => topologicalOrder(tasks),
    () => getReadyTasks(tasks, {}),
    () => getBlockedTasks(tasks, {}),
  ];
  for (const call of calls) {
    assert.throws(
      call,
      (error) => error instanceof TypeError && error.code === 'INVALID_GRAPH',
    );
  }
});

/* -------------------------------------------------------------------------- */
/* 回归 #2：多层阻塞传播                                                        */
/* -------------------------------------------------------------------------- */

test('回归#2: 三层链路全量传播（报告用例）', () => {
  const tasks = graph(['a'], ['b', ['a']], ['c', ['b']]);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed' }), ['b', 'c']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', b: 'pending' }), ['b', 'c']);
});

test('回归#2: 深链逐层传播到末端', () => {
  const tasks = graph(['a'], ['b', ['a']], ['c', ['b']], ['d', ['c']], ['e', ['d']]);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed' }), ['b', 'c', 'd', 'e']);
  assert.deepEqual(getBlockedTasks(tasks, { c: 'failed' }), ['d', 'e']);
  assert.deepEqual(getBlockedTasks(tasks, { e: 'failed' }), []);
  assert.deepEqual(getBlockedTasks(tasks, { e: 'blocked' }), []);
});

test('回归#2: 菱形两侧与汇合点', () => {
  const tasks = graph(['a'], ['b', ['a']], ['c', ['a']], ['d', ['b', 'c']], ['e', ['d']]);
  assert.deepEqual(getBlockedTasks(tasks, { b: 'failed' }), ['d', 'e']);
  assert.deepEqual(getBlockedTasks(tasks, { b: 'blocked' }), ['d', 'e']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'succeeded', b: 'failed' }), ['d', 'e']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed' }), ['b', 'c', 'd', 'e']);
});

test('回归#2: blocked 祖先传播且穿过非 pending 中间节点', () => {
  const tasks = graph(['a'], ['b', ['a']], ['c', ['b']], ['d', ['c']]);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'blocked' }), ['b', 'c', 'd']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', b: 'succeeded' }), ['c', 'd']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', b: 'succeeded', c: 'running' }), ['d']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', b: 'succeeded', c: 'succeeded' }), ['d']);
  // b 自身 blocked、c 处于 running：传播必须继续越过它们才能命中末端 d
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', b: 'blocked', c: 'running' }), ['d']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'running' }), []);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'succeeded', b: 'succeeded', c: 'succeeded' }), []);
});

test('回归#2: 输入顺序颠倒时输出仍按原输入顺序', () => {
  const tasks = graph(['d', ['c']], ['c', ['b']], ['b', ['a']], ['a']);
  assert.deepEqual(topologicalOrder(tasks), ['a', 'b', 'c', 'd']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed' }), ['d', 'c', 'b']);
});

test('回归#2: 断开子图与无关分支不受影响', () => {
  const tasks = graph(['a'], ['b', ['a']], ['x'], ['y', ['x']], ['z']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed' }), ['b']);
  assert.deepEqual(getBlockedTasks(tasks, { x: 'failed' }), ['y']);
  assert.deepEqual(getBlockedTasks(tasks, { z: 'failed' }), []);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', x: 'succeeded', z: 'running' }), ['b']);
});

test('回归#2: 只输出自身 pending 的节点', () => {
  const tasks = graph(['a'], ['b', ['a']], ['c', ['b']]);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', b: 'succeeded', c: 'succeeded' }), []);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', b: 'blocked' }), ['c']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', c: 'running' }), ['b']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', b: 'failed' }), ['c']);
});

test('回归#2: 与独立暴力祖先闭包实现逐组合一致', () => {
  const graphs = [
    graph(['a'], ['b', ['a']], ['c', ['b']]),
    graph(['a'], ['b', ['a']], ['c', ['a']], ['d', ['b', 'c']], ['e', ['d']]),
    graph(['d', ['c']], ['c', ['b']], ['b', ['a']], ['a'], ['solo']),
  ];
  const statuses = ['pending', 'running', 'succeeded', 'failed', 'blocked'];

  for (const tasks of graphs) {
    const ids = tasks.map((task) => task.id);
    const total = statuses.length ** ids.length;

    for (let mask = 0; mask < total; mask += 1) {
      const states = {};
      let rest = mask;
      for (const id of ids) {
        states[id] = statuses[rest % statuses.length];
        rest = Math.floor(rest / statuses.length);
      }

      const actual = getBlockedTasks(tasks, states);
      const expected = bruteForceBlocked(tasks, states);
      assert.deepEqual(actual, expected, `mismatch for ${JSON.stringify({ ids, states })}`);
    }
  }
});

test('回归#2: 与暴力实现一致（深链，抽样状态）', () => {
  const count = 60;
  const tasks = [];
  for (let i = 0; i < count; i += 1) {
    tasks.push({ id: `t${i}`, deps: i === 0 ? [] : [`t${i - 1}`] });
  }

  const states = { t0: 'failed', t7: 'succeeded', t20: 'running', t41: 'blocked' };
  assert.deepEqual(getBlockedTasks(tasks, states), bruteForceBlocked(tasks, states));

  const terminal = { t59: 'failed' };
  assert.deepEqual(getBlockedTasks(tasks, terminal), bruteForceBlocked(tasks, terminal));
});

test('回归#2: 传播顺序与任务在输入数组中的位置无关', () => {
  const forward = graph(['a'], ['b', ['a']], ['c', ['b']], ['d', ['c']]);
  const reversed = graph(['d', ['c']], ['c', ['b']], ['b', ['a']], ['a']);

  assert.deepEqual(getBlockedTasks(forward, { a: 'failed' }), ['b', 'c', 'd']);
  assert.deepEqual(getBlockedTasks(reversed, { a: 'failed' }), ['d', 'c', 'b']);

  // 同一集合（与输入数组顺序无关的语义一致性）
  assert.deepEqual(
    new Set(getBlockedTasks(forward, { b: 'failed' })),
    new Set(getBlockedTasks(reversed, { b: 'failed' })),
  );
});
