import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { boot } from './helpers.mjs';

/* Pi runs one turn's tool calls in parallel, and every call passed the parent's
 * admission gate before the first delegation closed it: two spark_explore calls
 * in one turn made two assignments, each with a full budget, from one parent
 * Run (2026-09-30 convergence loop, S13). One delegation per parent Run is now
 * enforced in the persisted assignment write. */
test('two spark_explore calls in one parent turn create one assignment; the other is refused', async () => {
  const delegates = (body) => body.tools?.some((t) => t.function?.name === 'spark_explore') && !body.messages.some((m) => m.role === 'tool');
  const h = await boot({ fakeResponder: ({ body, requestNumber }) => delegates(body) ? { kind: 'tool', id: `p${requestNumber}`, created: 1, calls: [
    { toolCallId: 'c1', name: 'spark_explore', arguments: { brief: 'first', sources: [] } },
    { toolCallId: 'c2', name: 'spark_explore', arguments: { brief: 'second', sources: [] } },
  ] } : null });
  try {
    const parent = await h.createSession({ permissionMode: 'draft' });
    const started = await h.api('POST', `/sessions/${parent.id}/runs`, { commandId: randomUUID(), input: 'explore twice' });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    await h.pollRun(started.json.run.id);
    const assignments = h.runtime.store.snapshot().subagents.assignments.filter((a) => a.origin?.runId === started.json.run.id);
    assert.equal(assignments.length, 1, 'one delegation per parent Run');
    const results = h.runtime.store.listEvents({ sessionId: parent.id }).filter((e) => e.type === 'tool.result' && e.data.name === 'spark_explore');
    assert.equal(results.length, 2);
    assert.equal(results.filter((e) => e.data.isError).length, 1, 'the second call is refused, not silently merged');
  } finally { await h.runtime.close(); }
});
