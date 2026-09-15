#!/usr/bin/env node
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const outDir = path.resolve(process.argv[2] ?? 'out');
const modulePath = path.join(outDir, 'scheduler.mjs');
let api;
try {
  api = await import(pathToFileURL(modulePath).href);
} catch (error) {
  console.error(`Cannot load ${modulePath}: ${error.message}`);
  process.exit(1);
}

let checks = 0;
let failures = 0;
function check(name, run) {
  try {
    run();
    checks += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}: ${error.stack ?? error}`);
  }
}

check('required exports', () => {
  for (const name of ['validateGraph', 'topologicalOrder', 'getReadyTasks', 'getBlockedTasks']) {
    assert.equal(typeof api[name], 'function', `missing export ${name}`);
  }
});

function valid(tasks) {
  const result = api.validateGraph(tasks);
  assert.equal(result.valid, true, `expected valid graph: ${JSON.stringify(result)}`);
  assert.deepEqual(result.errors, []);
}

function invalid(tasks) {
  const result = api.validateGraph(tasks);
  assert.equal(result.valid, false, `expected invalid graph: ${JSON.stringify(result)}`);
  assert.ok(Array.isArray(result.errors) && result.errors.length > 0);
  assert.ok(result.errors.every(error => typeof error === 'string'));
  assert.deepEqual(api.validateGraph(tasks), result, 'validation result must be deterministic');
}

check('empty graph and exact case-sensitive IDs', () => {
  valid([]);
  assert.deepEqual(api.topologicalOrder([]), []);
  const tasks = [{ id: 'A', deps: [] }, { id: 'a', deps: [] }, { id: ' a', deps: [] }];
  valid(tasks);
  assert.deepEqual(api.topologicalOrder(tasks), ['A', 'a', ' a']);
  const spacedDependency = [{ id: ' a ', deps: [] }, { id: 'consumer', deps: [' a '] }];
  valid(spacedDependency);
  assert.deepEqual(api.topologicalOrder(spacedDependency), [' a ', 'consumer']);
});

check('topological ties use original input position, not ID order', () => {
  const tasks = [
    { id: 'z', deps: [] },
    { id: 'a', deps: ['z'] },
    { id: 'b', deps: [] },
    { id: 'c', deps: ['z'] },
    { id: 'done', deps: ['a', 'b', 'c'] },
  ];
  valid(tasks);
  assert.deepEqual(api.topologicalOrder(tasks), ['z', 'a', 'b', 'c', 'done']);
});

check('ready tasks need pending state and succeeded direct dependencies', () => {
  const tasks = [
    { id: 'z', deps: [] },
    { id: 'a', deps: ['z'] },
    { id: 'root', deps: [] },
    { id: 'b', deps: ['z'] },
    { id: 'done', deps: ['a', 'b'] },
    { id: 'finished', deps: [] },
  ];
  const states = {
    z: 'succeeded',
    a: 'pending',
    b: 'running',
    done: 'pending',
    finished: 'succeeded',
  };
  assert.deepEqual(api.getReadyTasks(tasks, states), ['a', 'root']);
});

check('blocked query follows failed and blocked ancestors through multiple levels', () => {
  const tasks = [
    { id: 'source', deps: [] },
    { id: 'compile', deps: ['source'] },
    { id: 'unit', deps: ['compile'] },
    { id: 'publish', deps: ['unit'] },
    { id: 'docs', deps: [] },
    { id: 'announce', deps: ['docs'] },
    { id: 'inflight', deps: ['source'] },
    { id: 'complete', deps: [] },
  ];
  const states = {
    source: 'failed',
    docs: 'blocked',
    inflight: 'running',
    complete: 'succeeded',
  };
  assert.deepEqual(api.getBlockedTasks(tasks, states), ['compile', 'unit', 'publish', 'announce']);
  // Only omitted entries default to pending; the states argument is explicit.
  assert.deepEqual(api.getBlockedTasks([{ id: 'root', deps: [] }], {}), []);
});

check('invalid graph cases are rejected by validator and query APIs', () => {
  const invalidGraphs = [
    [{ id: 'x', deps: [] }, { id: 'x', deps: [] }],
    [{ id: '', deps: [] }],
    [{ id: '  ', deps: [] }],
    [{ id: 'x', deps: null }],
    [{ id: 'x', deps: ['x'] }],
    [{ id: 'x', deps: ['missing'] }],
    [{ id: 'x', deps: ['y', 'y'] }, { id: 'y', deps: [] }],
    [{ id: 'x', deps: ['y'] }, { id: 'y', deps: ['x'] }],
  ];
  for (const tasks of invalidGraphs) {
    invalid(tasks);
    assert.throws(() => api.topologicalOrder(tasks));
    assert.throws(() => api.getReadyTasks(tasks, {}));
    assert.throws(() => api.getBlockedTasks(tasks, {}));
  }
});

check('unknown state IDs, unknown states, and malformed state maps throw', () => {
  const tasks = [{ id: 'x', deps: [] }];
  for (const states of [{ other: 'pending' }, { x: 'waiting' }, null, []]) {
    assert.throws(() => api.getReadyTasks(tasks, states));
    assert.throws(() => api.getBlockedTasks(tasks, states));
  }
});

check('all operations leave frozen task and state inputs unchanged', () => {
  const tasks = Object.freeze([
    Object.freeze({ id: 'source', deps: Object.freeze([]) }),
    Object.freeze({ id: 'build', deps: Object.freeze(['source']) }),
  ]);
  const states = Object.freeze({ source: 'succeeded', build: 'pending' });
  const before = JSON.stringify({ tasks, states });

  valid(tasks);
  assert.deepEqual(api.topologicalOrder(tasks), ['source', 'build']);
  assert.deepEqual(api.getReadyTasks(tasks, states), ['build']);
  assert.deepEqual(api.getBlockedTasks(tasks, states), []);
  assert.equal(JSON.stringify({ tasks, states }), before);
});

console.log(`Oracle: ${checks} checks passed, ${failures} failed for ${modulePath}`);
if (failures > 0) process.exitCode = 1;
