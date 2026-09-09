// Independent A1 boundary review: direct AsyncTasks + production RuntimeStore.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { RuntimeStore } from '../server/store.mjs';
import { AsyncTasks } from '../server/async-tasks.mjs';
import { digestText } from '../server/async-task-state.mjs';

async function until(check, message = 'condition timed out') {
  const deadline = Date.now() + 2_000;
  while (!await check()) {
    assert(Date.now() < deadline, message);
    await delay(2);
  }
}

async function setup(adapter, canUse = () => true) {
  const dir = await mkdtemp(path.join(tmpdir(), 'cw-boundary-'));
  const store = await new RuntimeStore({ dataDir: dir }).open();
  const project = await store.createProject('p');
  const session = await store.createSession({ projectId: project.id, title: 's' });
  const made = await store.createRun({
    sessionId: session.id, input: 'i', adapterId: 'a', provider: {},
    commandId: 'c', credentialGeneration: 0,
  });
  const tasks = new AsyncTasks({ store, adapters: [adapter], canUse });
  return {
    dir, store, project, session, run: made.run, tasks,
    async close() {
      await tasks.close();
      await store.close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}

function reader(hooks = {}) {
  const text = 'independent immutable bytes';
  const source = { id: 'source', version: 'v1', digest: digestText(text) };
  const calls = { launch: 0, query: 0, cancel: 0 };
  const response = (taskId, status = 'running') => ({
    taskId, source, status,
    ...(status === 'succeeded' ? { result: { text } } : {}),
  });
  return {
    source, text, calls,
    adapter: {
      id: 'reader', version: 'impl1', sources: [source],
      async launch({ taskId }) {
        calls.launch++;
        return hooks.launch?.(taskId, response) ?? response(taskId);
      },
      async query({ taskId }) {
        calls.query++;
        return hooks.query?.(taskId, response) ?? response(taskId);
      },
      async cancel({ taskId }) {
        calls.cancel++;
        return hooks.cancel?.(taskId, response) ?? response(taskId, 'cancelled');
      },
    },
  };
}

async function launch(fixture, callId = 'launch') {
  const task = await fixture.tasks.launch(fixture.run.id, callId, {
    adapterId: 'reader', sourceId: 'source',
  });
  await until(() => {
    const status = fixture.store.state.asyncTasks.find(item => item.id === task.id)?.execution.status;
    return ['running', 'succeeded', 'failed', 'cancelled', 'unknown'].includes(status);
  }, 'launch did not pass dispatching');
  return task;
}

test('catalog staleness keeps durable result readable and refuses further adapter work', async () => {
  const adapter = reader({ launch: (id, response) => response(id, 'succeeded') });
  const fixture = await setup(adapter.adapter);
  try {
    const task = await launch(fixture);
    await until(() => fixture.tasks.inspect(task.id, { projectId: fixture.project.id }).execution.status === 'succeeded');
    assert.equal(fixture.tasks.inspect(task.id, { projectId: fixture.project.id }).result.text, adapter.text);
    fixture.tasks.adapters.set('reader', { ...adapter.adapter, sources: [] });
    assert.equal(fixture.tasks.inspect(task.id, { projectId: fixture.project.id }).availability, 'historical');
    await assert.rejects(fixture.tasks.reconcile(task.id, { projectId: fixture.project.id }), { code: 'task_source_stale' });
    assert.equal(fixture.tasks.inspect(task.id, { projectId: fixture.project.id }).result.digest, adapter.source.digest);
  } finally {
    await fixture.close();
  }
});

test('policy rejection records dependency before adapter I/O, leaving Run unresolved', async () => {
  let permitGet = true;
  const adapter = reader();
  const fixture = await setup(adapter.adapter, name => name === 'async_launch' || permitGet);
  try {
    const task = await launch(fixture);
    permitGet = false;
    await assert.rejects(fixture.tasks.consume(fixture.run.id, 'denied', 'get', { taskId: task.id }), { code: 'task_policy_denied' });
    assert.equal(adapter.calls.query, 0);
    assert.equal(fixture.store.state.asyncTasks[0].deliveries.length, 1);
    assert.deepEqual(fixture.tasks.unresolved(fixture.run.id), [task.id]);
  } finally {
    await fixture.close();
  }
});

test('late query cannot overwrite cancellation and lost cancel ACK remains unresolved', async () => {
  let releaseQuery;
  let queryEntered;
  const queryEnteredPromise = new Promise(resolve => { queryEntered = resolve; });
  const queryGate = new Promise(resolve => { releaseQuery = resolve; });
  const adapter = reader({
    query: async (id, response) => {
      queryEntered();
      await queryGate;
      return response(id, 'succeeded');
    },
  });
  const fixture = await setup(adapter.adapter);
  try {
    const task = await launch(fixture);
    const query = fixture.tasks.reconcile(task.id, { projectId: fixture.project.id });
    await queryEnteredPromise;
    assert.equal((await fixture.tasks.cancel(task.id, { projectId: fixture.project.id })).execution.status, 'cancelled');
    releaseQuery();
    await assert.rejects(query, { code: 'task_settlement_conflict' });
    assert.equal(fixture.tasks.inspect(task.id, { projectId: fixture.project.id }).execution.status, 'cancelled');
  } finally {
    await fixture.close();
  }

  const lostAck = reader({ cancel: () => { throw new Error('lost ACK'); } });
  const lostFixture = await setup(lostAck.adapter);
  try {
    const task = await launch(lostFixture);
    assert.equal((await lostFixture.tasks.cancel(task.id, { projectId: lostFixture.project.id })).execution.status, 'unknown');
    assert.deepEqual(lostFixture.tasks.unresolved(lostFixture.run.id), [task.id]);
  } finally {
    await lostFixture.close();
  }
});

test('stopped Run forbids dispatch and wait stays inside local budget', async () => {
  const adapter = reader();
  const fixture = await setup(adapter.adapter);
  try {
    await fixture.store.updateRun(fixture.run.id, { status: 'cancelled', admissionOpen: false });
    await assert.rejects(fixture.tasks.launch(fixture.run.id, 'after-stop', {
      adapterId: 'reader', sourceId: 'source',
    }), { code: 'task_admission_closed' });
    assert.equal(adapter.calls.launch, 0);
  } finally {
    await fixture.close();
  }

  const waitingAdapter = reader();
  const waitingFixture = await setup(waitingAdapter.adapter);
  try {
    const task = await launch(waitingFixture);
    const startedAt = Date.now();
    const seen = await waitingFixture.tasks.consume(waitingFixture.run.id, 'wait', 'wait', { taskId: task.id, waitMs: 25 });
    assert(Date.now() - startedAt < 350);
    assert.equal(seen.execution.status, 'running');
    assert(waitingAdapter.calls.query > 0);
  } finally {
    await waitingFixture.close();
  }
});
