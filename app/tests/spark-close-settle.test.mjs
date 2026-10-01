import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { boot } from './helpers.mjs';

/* A Spark child Run turns terminal before #executeRun settles its attempt.
 * close() waited only for non-terminal Runs, so a close in that window released
 * the Store under the settle: the attempt stayed `active` beside a `completed`
 * Run, the findings were lost, and the next start blocked the assignment for
 * review (2026-09-30 convergence loop, S13). close() now waits for every Run's
 * settlement. The window is a few ticks wide, so the close is aimed at it
 * several times. */
const terminal = (status) => ['completed', 'failed', 'unknown', 'cancelled'].includes(status);

for (let round = 0; round < 5; round++) {
  test(`closing right after a Spark child Run ends keeps its settled attempt and findings (${round})`, async () => {
    const h = await boot();
    const spark = h.runtime.service.subagents;
    const parent = await h.createSession();
    await spark.create({ id: randomUUID(), parentSessionId: parent.id, brief: 'b', sources: [] });
    void spark.pump();
    for (let i = 0; i < 2000; i++) {
      const child = h.runtime.store.snapshot().runs.find((run) => run.sessionId !== parent.id);
      if (child && terminal(child.status)) break;
      await new Promise((resolve) => setImmediate(resolve));
    }
    await h.runtime.close();
    const state = JSON.parse(await readFile(path.join(h.dataDir, 'runtime-state.json'), 'utf8'));
    const assignment = state.subagents.assignments[0];
    const run = state.runs.find((item) => item.id === assignment.attempts[0]?.runId);
    assert.equal(run.status, 'completed');
    assert.equal(assignment.attempts[0].status, 'completed', 'the attempt settled before the Store closed');
    assert.equal(assignment.status, 'resolved');
    assert.ok(assignment.result, 'the findings were kept');
  });
}
