/**
 * scheduler.test.mjs
 * ---------------------------------------------------------------------------
 * Tests for out/scheduler.mjs using only Node built-ins
 * (`node:test` + `node:assert/strict`).
 *
 * Run:
 *   node --test out/
 *   node out/scheduler.test.mjs
 *
 * STATUS: written but NOT executed here (no shell/exec tool in this
 * environment). The independent checker is expected to run them.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  VALID_TASK_STATES,
  validateGraph,
  topologicalOrder,
  getReadyTasks,
  getBlockedTasks,
} from './scheduler.mjs';

/** Build a tasks array from `[id, deps?]` pairs. */
const graph = (...pairs) => pairs.map(([id, deps = []]) => ({ id, deps }));

function deepFreeze(value) {
  if (value === null || typeof value !== 'object') return value;
  for (const key of Object.keys(value)) deepFreeze(value[key]);
  return Object.freeze(value);
}

const snapshot = (value) => structuredClone(value);

/* -------------------------------------------------------------------------- */
/* validateGraph                                                              */
/* -------------------------------------------------------------------------- */

test('validateGraph: 空图合法', () => {
  assert.deepEqual(validateGraph([]), { valid: true, errors: [] });
});

test('validateGraph: 非数组输入返回 invalid 且不抛错', () => {
  for (const input of [null, undefined, {}, 'a', 0, true, new Set(), () => {}]) {
    const result = validateGraph(input);
    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0], /must be an array/);
  }
});

test('validateGraph: 合法图（链 / 菱形 / 断开子图）', () => {
  const tasks = graph(
    ['a'],
    ['b', ['a']],
    ['c', ['a']],
    ['d', ['b', 'c']],
    ['x'],
    ['y', ['x']],
  );
  assert.deepEqual(validateGraph(tasks), { valid: true, errors: [] });
});

test('validateGraph: 任务项不是对象不合法', () => {
  for (const bad of [null, undefined, 42, 'a', [], true]) {
    const result = validateGraph([bad]);
    assert.equal(result.valid, false);
    assert.match(result.errors[0], /must be an object/);
  }
});

test('validateGraph: id 缺失或非字符串不合法', () => {
  assert.equal(validateGraph([{ deps: [] }]).valid, false);
  assert.equal(validateGraph([{ id: 1, deps: [] }]).valid, false);
  assert.equal(validateGraph([{ id: null, deps: [] }]).valid, false);
  assert.equal(validateGraph([{ id: ['a'], deps: [] }]).valid, false);
  assert.match(validateGraph([{ id: 1, deps: [] }]).errors[0], /id must be a string/);
});

test('validateGraph: 空白 id 不合法（不 trim 修复）', () => {
  for (const id of ['', ' ', '\t', '\n', '  \t ']) {
    const result = validateGraph([{ id, deps: [] }]);
    assert.equal(result.valid, false);
    assert.match(result.errors[0], /must not be blank/);
  }
});

test('validateGraph: 重复 id 不合法', () => {
  const result = validateGraph([
    { id: 'a', deps: [] },
    { id: 'b', deps: ['a'] },
    { id: 'a', deps: [] },
  ]);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' | '), /duplicates tasks\[0\]\.id/);
});

test('validateGraph: deps 缺失或非数组不合法', () => {
  assert.equal(validateGraph([{ id: 'a' }]).valid, false);
  assert.equal(validateGraph([{ id: 'a', deps: null }]).valid, false);
  assert.equal(validateGraph([{ id: 'a', deps: 'b' }]).valid, false);
  assert.equal(validateGraph([{ id: 'a', deps: {} }]).valid, false);
  assert.match(validateGraph([{ id: 'a', deps: 'b' }]).errors[0], /deps must be an array/);
});

test('validateGraph: 依赖项不是字符串不合法', () => {
  const result = validateGraph([
    { id: 'a', deps: [] },
    { id: 'b', deps: ['a', 2] },
  ]);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /deps\[1\] must be a string/);
});

test('validateGraph: 重复依赖不合法', () => {
  const result = validateGraph([
    { id: 'a', deps: [] },
    { id: 'b', deps: ['a', 'a'] },
  ]);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /duplicates dependency/);
});

test('validateGraph: 未知依赖不合法', () => {
  const result = validateGraph([{ id: 'a', deps: ['ghost'] }]);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /unknown task/);
});

test('validateGraph: 自依赖不合法', () => {
  const result = validateGraph([{ id: 'a', deps: ['a'] }]);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /self-dependency/);
});

test('validateGraph: 环（二元 / 三元 / 环+无关分支 / 长环）', () => {
  assert.equal(validateGraph(graph(['a', ['b']], ['b', ['a']])).valid, false);
  assert.equal(validateGraph(graph(['a', ['c']], ['b', ['a']], ['c', ['b']])).valid, false);
  assert.equal(
    validateGraph(graph(['a', ['d']], ['b', ['a']], ['c', ['b']], ['d', ['c']])).valid,
    false,
  );

  const withFreeBranch = validateGraph(graph(['free'], ['a', ['b']], ['b', ['a']]));
  assert.equal(withFreeBranch.valid, false);
  assert.equal(withFreeBranch.errors.length, 1);
  assert.match(withFreeBranch.errors[0], /cycle detected/);
});

test('validateGraph: 多个独立环各报一条', () => {
  const result = validateGraph(
    graph(['a', ['b']], ['b', ['a']], ['c', ['d']], ['d', ['c']]),
  );
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 2);
  for (const message of result.errors) assert.match(message, /cycle detected/);
});

test('validateGraph: id 不做 trim，按原字符串精确匹配', () => {
  assert.deepEqual(validateGraph(graph([' a', ['a']], ['a'])), { valid: true, errors: [] });

  const missing = validateGraph(graph(['a', [' a']], ['a']));
  assert.equal(missing.valid, false);
  assert.match(missing.errors[0], /unknown task/);
});

test('validateGraph: 特殊字符串 id（原型相关键）合法', () => {
  const tasks = graph(
    ['__proto__'],
    ['constructor', ['__proto__']],
    ['hasOwnProperty'],
    ['toString', ['hasOwnProperty']],
  );
  assert.deepEqual(validateGraph(tasks), { valid: true, errors: [] });
});

test('validateGraph: 多处错误一并收集', () => {
  const result = validateGraph([
    { id: 'a', deps: ['a'] },
    { id: 'a', deps: ['ghost'] },
    { id: '', deps: 'x' },
  ]);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.length >= 4,
    `expected >= 4 errors, got ${result.errors.length}: ${result.errors.join(' | ')}`,
  );
});

test('validateGraph: 4000 层深链不栈溢出', () => {
  const count = 4000;
  const tasks = [];
  for (let i = 0; i < count; i += 1) {
    tasks.push({ id: `t${i}`, deps: i === 0 ? [] : [`t${i - 1}`] });
  }
  assert.deepEqual(validateGraph(tasks), { valid: true, errors: [] });
});

/* -------------------------------------------------------------------------- */
/* topologicalOrder                                                           */
/* -------------------------------------------------------------------------- */

test('topologicalOrder: 空图返回空数组', () => {
  assert.deepEqual(topologicalOrder([]), []);
});

test('topologicalOrder: 单节点', () => {
  assert.deepEqual(topologicalOrder(graph(['only'])), ['only']);
});

test('topologicalOrder: 依赖先于被依赖者（输入顺序颠倒）', () => {
  assert.deepEqual(topologicalOrder(graph(['b', ['a']], ['a'])), ['a', 'b']);
  assert.deepEqual(topologicalOrder(graph(['c', ['b']], ['b', ['a']], ['a'])), ['a', 'b', 'c']);
});

test('topologicalOrder: 稳定 Kahn —— 取当前可选节点中原输入索引最小者', () => {
  // 初始可选 {a(0), c(2)} -> a；之后 c -> c；最后 b
  assert.deepEqual(topologicalOrder(graph(['a'], ['b', ['c']], ['c'])), ['a', 'c', 'b']);
});

test('topologicalOrder: 断开子图交错时仍按索引最小优先', () => {
  assert.deepEqual(
    topologicalOrder(graph(['a1'], ['b1'], ['a2', ['a1']], ['b2', ['b1']])),
    ['a1', 'b1', 'a2', 'b2'],
  );
});

test('topologicalOrder: 菱形依赖', () => {
  assert.deepEqual(
    topologicalOrder(graph(['a'], ['b', ['a']], ['c', ['a']], ['d', ['b', 'c']])),
    ['a', 'b', 'c', 'd'],
  );
});

test('topologicalOrder: 结果满足拓扑约束且包含全部 id', () => {
  const tasks = graph(['x'], ['y', ['x']], ['z', ['x']], ['w', ['y', 'z']], ['v', ['z']]);
  const order = topologicalOrder(tasks);

  assert.equal(order.length, tasks.length);
  assert.equal(new Set(order).size, tasks.length);

  const position = new Map(order.map((id, i) => [id, i]));
  for (const task of tasks) {
    for (const dep of task.deps) {
      assert.ok(position.get(dep) < position.get(task.id), `${dep} must precede ${task.id}`);
    }
  }
});

test('topologicalOrder: 无效图抛 TypeError', () => {
  assert.throws(() => topologicalOrder(null), TypeError);
  assert.throws(() => topologicalOrder(graph(['a'], ['a'])), /invalid task graph/);
  assert.throws(() => topologicalOrder(graph(['a', ['ghost']])), TypeError);
  assert.throws(() => topologicalOrder(graph(['a', ['b']], ['b', ['a']])), TypeError);
});

test('topologicalOrder: 返回新数组且不修改输入', () => {
  const tasks = graph(['a']);
  const first = topologicalOrder(tasks);
  const second = topologicalOrder(tasks);
  assert.notEqual(first, second);
  first.push('mutated');
  assert.deepEqual(topologicalOrder(tasks), ['a']);
});

test('topologicalOrder: 深链（颠倒输入）不栈溢出', () => {
  const count = 4000;
  const tasks = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    tasks.push({ id: `t${i}`, deps: i === 0 ? [] : [`t${i - 1}`] });
  }
  const order = topologicalOrder(tasks);
  assert.equal(order.length, count);
  assert.equal(order[0], 't0');
  assert.equal(order[count - 1], `t${count - 1}`);
});

/* -------------------------------------------------------------------------- */
/* getReadyTasks                                                              */
/* -------------------------------------------------------------------------- */

test('getReadyTasks: 空图返回空数组', () => {
  assert.deepEqual(getReadyTasks([], {}), []);
});

test('getReadyTasks: 无依赖任务在空 states 下均 ready', () => {
  assert.deepEqual(getReadyTasks(graph(['a'], ['b'], ['c']), {}), ['a', 'b', 'c']);
});

test('getReadyTasks: 仅当直接依赖全部 succeeded 才 ready', () => {
  const tasks = graph(['a'], ['b', ['a']], ['c', ['b']], ['d', ['b', 'c']]);
  assert.deepEqual(getReadyTasks(tasks, {}), ['a']);
  assert.deepEqual(getReadyTasks(tasks, { a: 'succeeded' }), ['b']);
  assert.deepEqual(getReadyTasks(tasks, { a: 'succeeded', b: 'succeeded' }), ['c']);
  assert.deepEqual(
    getReadyTasks(tasks, { a: 'succeeded', b: 'succeeded', c: 'succeeded' }),
    ['d'],
  );
});

test('getReadyTasks: 依赖处于 running / failed / blocked 均不 ready', () => {
  const tasks = graph(['a'], ['b', ['a']], ['c', ['a']], ['d', ['a']]);
  assert.deepEqual(getReadyTasks(tasks, { a: 'running' }), []);
  assert.deepEqual(getReadyTasks(tasks, { a: 'failed' }), []);
  assert.deepEqual(getReadyTasks(tasks, { a: 'blocked' }), []);
  assert.deepEqual(
    getReadyTasks(tasks, { a: 'running', b: 'pending', c: 'pending', d: 'pending' }),
    [],
  );
});

test('getReadyTasks: 自身非 pending 的任务不 ready', () => {
  const tasks = graph(['a'], ['b', ['a']]);
  assert.deepEqual(getReadyTasks(tasks, { a: 'succeeded', b: 'pending' }), ['b']);
  assert.deepEqual(getReadyTasks(tasks, { a: 'succeeded', b: 'running' }), []);
  assert.deepEqual(getReadyTasks(tasks, { a: 'succeeded', b: 'succeeded' }), []);
  assert.deepEqual(getReadyTasks(tasks, { a: 'succeeded', b: 'blocked' }), []);
});

test('getReadyTasks: states 遗漏的任务视为 pending', () => {
  const tasks = graph(['a'], ['b', ['a']], ['c', ['b']]);
  // a succeeded 且 b 被遗漏（=> pending）：b 的直接依赖已 succeeded，故 b ready
  assert.deepEqual(getReadyTasks(tasks, { a: 'succeeded' }), ['b']);
  // 只声明 c：a、b 都被遗漏（=> pending），只有 a 无依赖可选
  assert.deepEqual(getReadyTasks(tasks, { c: 'pending' }), ['a']);
  assert.deepEqual(getReadyTasks(tasks, { a: 'succeeded', b: 'succeeded' }), ['c']);
});

test('getReadyTasks: 按原输入顺序返回', () => {
  assert.deepEqual(getReadyTasks(graph(['c'], ['a'], ['b']), {}), ['c', 'a', 'b']);
  assert.deepEqual(
    getReadyTasks(graph(['z'], ['y'], ['x']), { z: 'pending', y: 'pending', x: 'pending' }),
    ['z', 'y', 'x'],
  );
});

test('getReadyTasks: 不纠正非法状态组合（依赖 succeeded 但祖先是 failed 仍 ready）', () => {
  const tasks = graph(['a'], ['b', ['a']], ['c', ['b']]);
  assert.deepEqual(getReadyTasks(tasks, { a: 'failed', b: 'succeeded' }), ['c']);
});

test('getReadyTasks: 未知 id / 非法状态 / states 非对象 / 无效图 抛 TypeError', () => {
  const tasks = graph(['a'], ['b', ['a']]);
  assert.throws(() => getReadyTasks(tasks, { ghost: 'pending' }), TypeError);
  assert.throws(() => getReadyTasks(tasks, { ghost: 'pending' }), /unknown task/);
  assert.throws(() => getReadyTasks(tasks, { a: 'done' }), TypeError);
  assert.throws(() => getReadyTasks(tasks, { a: 'done' }), /must be one of/);
  assert.throws(() => getReadyTasks(tasks, { a: 'succeeded', b: 1 }), TypeError);
  assert.throws(() => getReadyTasks(tasks, { a: undefined }), TypeError);

  for (const badStates of [null, undefined, [], ['a'], 'pending', 42, true, new Map()]) {
    assert.throws(() => getReadyTasks(tasks, badStates), TypeError);
  }

  assert.throws(() => getReadyTasks(graph(['a'], ['a']), {}), /invalid task graph/);
  assert.throws(() => getReadyTasks(graph(['a', ['ghost']]), {}), TypeError);
});

test('getReadyTasks: 不修改 tasks / states', () => {
  const tasks = deepFreeze(graph(['a'], ['b', ['a']]));
  const states = deepFreeze({ a: 'succeeded' });
  const tasksBefore = snapshot(tasks);
  const statesBefore = snapshot(states);

  assert.deepEqual(getReadyTasks(tasks, states), ['b']);
  assert.deepEqual(tasks, tasksBefore);
  assert.deepEqual(states, statesBefore);
  assert.equal(Object.isFrozen(states), true);
});

/* -------------------------------------------------------------------------- */
/* getBlockedTasks                                                            */
/* -------------------------------------------------------------------------- */

test('getBlockedTasks: 空图 / 无失败来源时为空', () => {
  assert.deepEqual(getBlockedTasks([], {}), []);
  assert.deepEqual(getBlockedTasks(graph(['a'], ['b', ['a']]), {}), []);
  assert.deepEqual(getBlockedTasks(graph(['a'], ['b', ['a']]), { a: 'succeeded' }), []);
  assert.deepEqual(getBlockedTasks(graph(['a'], ['b', ['a']]), { a: 'running' }), []);
});

test('getBlockedTasks: 自身 pending 且有 failed 直接依赖', () => {
  const tasks = graph(['a'], ['b', ['a']]);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed' }), ['b']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', b: 'pending' }), ['b']);
});

test('getBlockedTasks: 多层传播', () => {
  const tasks = graph(['a'], ['b', ['a']], ['c', ['b']], ['d', ['c']]);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed' }), ['b', 'c', 'd']);
  assert.deepEqual(getBlockedTasks(tasks, { b: 'failed' }), ['c', 'd']);
  assert.deepEqual(getBlockedTasks(tasks, { c: 'failed' }), ['d']);
});

test('getBlockedTasks: blocked 祖先继续向下传播', () => {
  const tasks = graph(['a'], ['b', ['a']], ['c', ['b']]);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'blocked' }), ['b', 'c']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'blocked', b: 'pending' }), ['b', 'c']);
});

test('getBlockedTasks: 菱形依赖', () => {
  const tasks = graph(['a'], ['b', ['a']], ['c', ['a']], ['d', ['b', 'c']]);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed' }), ['b', 'c', 'd']);
  assert.deepEqual(getBlockedTasks(tasks, { b: 'failed' }), ['d']);
  assert.deepEqual(getBlockedTasks(tasks, { c: 'failed' }), ['d']);
});

test('getBlockedTasks: 不重列其他状态的任务', () => {
  const tasks = graph(['a'], ['b', ['a']], ['c', ['b']]);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', b: 'failed', c: 'pending' }), ['c']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', b: 'succeeded', c: 'pending' }), ['c']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', b: 'blocked', c: 'running' }), []);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', b: 'running' }), ['c']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', b: 'succeeded', c: 'succeeded' }), []);
});

test('getBlockedTasks: 失败节点的上游与旁支不受影响', () => {
  const tasks = graph(['root'], ['mid', ['root']], ['leaf', ['mid']], ['other']);
  assert.deepEqual(getBlockedTasks(tasks, { mid: 'failed' }), ['leaf']);
  // ready 只看直接依赖：上游 root 与旁支 other 仍可运行
  assert.deepEqual(getReadyTasks(tasks, { mid: 'failed' }), ['root', 'other']);
});

test('getBlockedTasks: 按原输入顺序返回（输入顺序 != 拓扑序）', () => {
  const tasks = graph(['d', ['c']], ['c', ['b']], ['b', ['a']], ['a']);
  assert.deepEqual(topologicalOrder(tasks), ['a', 'b', 'c', 'd']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed' }), ['d', 'c', 'b']);
});

test('getBlockedTasks: 断开子图互不影响', () => {
  const tasks = graph(['a'], ['b', ['a']], ['x'], ['y', ['x']]);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed' }), ['b']);
  assert.deepEqual(getBlockedTasks(tasks, { x: 'failed' }), ['y']);
  assert.deepEqual(getBlockedTasks(tasks, { a: 'failed', x: 'succeeded' }), ['b']);
});

test('getBlockedTasks: 深链传播不栈溢出', () => {
  const count = 2000;
  const tasks = [];
  for (let i = 0; i < count; i += 1) {
    tasks.push({ id: `t${i}`, deps: i === 0 ? [] : [`t${i - 1}`] });
  }
  const blocked = getBlockedTasks(tasks, { t0: 'failed' });
  assert.equal(blocked.length, count - 1);
  assert.equal(blocked[0], 't1');
  assert.equal(blocked[blocked.length - 1], `t${count - 1}`);
});

test('getBlockedTasks: 未知 id / 非法状态 / states 非对象 / 无效图 抛 TypeError', () => {
  const tasks = graph(['a'], ['b', ['a']]);
  assert.throws(() => getBlockedTasks(tasks, { ghost: 'pending' }), TypeError);
  assert.throws(() => getBlockedTasks(tasks, { ghost: 'pending' }), /unknown task/);
  assert.throws(() => getBlockedTasks(tasks, { a: 'nope' }), /must be one of/);

  for (const badStates of [null, undefined, [], 'pending', 42]) {
    assert.throws(() => getBlockedTasks(tasks, badStates), TypeError);
  }

  assert.throws(() => getBlockedTasks(graph(['a', ['b']], ['b', ['a']]), {}), TypeError);
  assert.throws(
    () => getBlockedTasks(graph(['a', ['b']], ['b', ['a']]), {}),
    /invalid task graph/,
  );
});

test('getBlockedTasks: 不修改 tasks / states', () => {
  const tasks = deepFreeze(graph(['a'], ['b', ['a']]));
  const states = deepFreeze({ a: 'failed' });
  const tasksBefore = snapshot(tasks);
  const statesBefore = snapshot(states);

  assert.deepEqual(getBlockedTasks(tasks, states), ['b']);
  assert.deepEqual(tasks, tasksBefore);
  assert.deepEqual(states, statesBefore);
});

/* -------------------------------------------------------------------------- */
/* 跨函数一致性 / 错误契约                                                     */
/* -------------------------------------------------------------------------- */

test('ready 与 blocked 在非法状态组合下可以重叠（不做状态纠正）', () => {
  const tasks = graph(['a'], ['b', ['a']], ['c', ['b']]);
  const states = { a: 'failed', b: 'succeeded' };
  assert.deepEqual(getReadyTasks(tasks, states), ['c']);
  assert.deepEqual(getBlockedTasks(tasks, states), ['c']);
});

test('VALID_TASK_STATES 暴露合法状态集合', () => {
  assert.deepEqual([...VALID_TASK_STATES], [
    'pending',
    'running',
    'succeeded',
    'failed',
    'blocked',
  ]);
  assert.ok(Object.isFrozen(VALID_TASK_STATES));
});

test('抛错统一为 TypeError 且带稳定 code', () => {
  assert.equal(validateGraph(null).valid, false); // validateGraph 从不抛错

  assert.throws(
    () => topologicalOrder(graph(['a', ['ghost']])),
    (error) => error instanceof TypeError && error.code === 'INVALID_GRAPH',
  );
  assert.throws(
    () => getReadyTasks(graph(['a']), { ghost: 'pending' }),
    (error) => error instanceof TypeError && error.code === 'UNKNOWN_TASK',
  );
  assert.throws(
    () => getReadyTasks(graph(['a']), { a: 'done' }),
    (error) => error instanceof TypeError && error.code === 'INVALID_STATE',
  );
  assert.throws(
    () => getReadyTasks(graph(['a']), null),
    (error) => error instanceof TypeError && error.code === 'INVALID_STATES',
  );
  assert.throws(
    () => getBlockedTasks(graph(['a']), []),
    (error) => error instanceof TypeError && error.code === 'INVALID_STATES',
  );
});

test('四个函数组合的综合小场景', () => {
  const tasks = graph(['parse'], ['lint', ['parse']], ['test', ['lint']], ['docs']);

  assert.deepEqual(validateGraph(tasks), { valid: true, errors: [] });
  assert.deepEqual(topologicalOrder(tasks), ['parse', 'lint', 'test', 'docs']);

  const states = { parse: 'succeeded', lint: 'failed' };
  assert.deepEqual(getReadyTasks(tasks, states), ['docs']);
  assert.deepEqual(getBlockedTasks(tasks, states), ['test']);
});
