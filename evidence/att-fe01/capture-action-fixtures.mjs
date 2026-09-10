/* Captures the action descriptors the running Core actually advertises, for
 * both an open and a resolved object, into
 * `app/tests/fixtures/attention-actions.json`. The view tests read that file
 * rather than a hand-written action list, so the editors can never be built
 * against a broader set than the backend advertises.
 *
 * Run from the repository root: node evidence/att-fe01/capture-action-fixtures.mjs */
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { boot } from '../../app/tests/helpers.mjs';

const ok = (response, label) => {
  if (response.status !== 200) throw new Error(`${label}: ${JSON.stringify(response.json)}`);
  return response.json;
};

const h = await boot();
try {
  const attentionId = `capture-${randomUUID()}`;
  ok(await h.api('POST', '/attention', { projectId: h.projectId, request: {
    schema_version: 1, request_id: randomUUID(), attention_id: attentionId, expected_revision: 0, action: 'create',
    payload: {
      descriptor: { title: 'Contract renewal reply', summary: 'Synthetic triage fixture' },
      reason: 'A recorded decision is waiting for a person.',
      next_action: { kind: 'decide', label: 'Decide whether to renew', trigger: 'manual', due_at: null },
      source_refs: [], relation_refs: [],
    },
  } }), 'create');
  const open = ok(await h.api('GET', `/attention/${attentionId}?projectId=${h.projectId}`), 'inspect open');
  ok(await h.api('POST', `/attention/${attentionId}/actions`, { projectId: h.projectId, request: {
    schema_version: 1, request_id: randomUUID(), attention_id: attentionId, expected_revision: open.revision,
    action: 'resolve', payload: { reason: 'Recorded as handled by the fixture capture.' },
  } }), 'resolve');
  const resolved = ok(await h.api('GET', `/attention/${attentionId}?projectId=${h.projectId}`), 'inspect resolved');
  const fixture = {
    captured_from: 'app/core/attention.py via POST /api/v5/attention/:id/actions',
    open: { revision: open.revision, status: open.status, human_actions: open.human_actions, policy: open.policy },
    resolved: { revision: resolved.revision, status: resolved.status, human_actions: resolved.human_actions, policy: resolved.policy },
  };
  const out = path.join(process.cwd(), 'app/tests/fixtures/attention-actions.json');
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(`wrote ${out}`);
} finally {
  await h.runtime.close();
  await rm(h.dataDir, { recursive: true, force: true });
}
