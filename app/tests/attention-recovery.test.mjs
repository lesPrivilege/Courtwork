import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { CoreClient } from '../core/client.mjs';

const crashHelper = new URL('./fixtures/work-core/attention-crash.py', import.meta.url).pathname;
const PYTHON = process.env.WORK_AGENT_PYTHON ?? 'python3';

const localContext = {
  actor: 'local-user',
  project_id: 'attention-recovery-project',
  purpose: 'human-attention',
  execution: null,
};

const provenance = [];

function createRequest() {
  return {
    schema_version: 1,
    request_id: 'attention-create',
    attention_id: 'attention-recovery-1',
    expected_revision: 0,
    action: 'create',
    payload: {
      descriptor: { title: 'Review required', summary: 'Synthetic recovery item' },
      reason: 'A human must review this item',
      next_action: { kind: 'inspect', label: 'Inspect', trigger: 'manual', due_at: null },
      source_refs: [],
      relation_refs: [],
    },
  };
}

function acknowledgeRequest(requestId = 'attention-ack') {
  return {
    schema_version: 1,
    request_id: requestId,
    attention_id: 'attention-recovery-1',
    expected_revision: 1,
    action: 'acknowledge',
    payload: {},
  };
}

function inspectQuery() {
  return { schema_version: 1, kind: 'inspect', attention_id: 'attention-recovery-1' };
}

function requestQuery(requestId) {
  return {
    schema_version: 1,
    kind: 'request',
    attention_id: 'attention-recovery-1',
    request_id: requestId,
  };
}

function eventQuery() {
  return {
    schema_version: 1,
    kind: 'events',
    attention_id: 'attention-recovery-1',
    offset: 0,
    limit: 50,
  };
}

async function attentionAction(core, request) {
  return core.call('attention_action', {
    context: localContext,
    request,
    provenance,
  });
}

async function attentionQuery(core, query) {
  return core.call('attention_query', { context: localContext, query });
}

async function seedAttention(dataDir) {
  const core = new CoreClient({ dataDir });
  await attentionAction(core, createRequest());
  await core.close();
}

for (const stage of ['before_commit', 'after_commit_before_ack']) {
  test(`Attention SIGKILL at ${stage} leaves zero or one complete request effect`, async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), 'cw-attention-recovery-'));
    const dbPath = path.join(dataDir, 'state.db');
    let reopened;
    try {
      await seedAttention(dataDir);
      const request = acknowledgeRequest(`attention-${stage}`);
      const child = spawnSync(
        PYTHON,
        [crashHelper, dbPath, stage, JSON.stringify(localContext), JSON.stringify(request), JSON.stringify(provenance)],
        { encoding: 'utf8', timeout: 10_000 },
      );
      assert.equal(child.signal, 'SIGKILL', child.stderr || child.stdout);

      reopened = new CoreClient({ dataDir });
      const inspected = await attentionQuery(reopened, inspectQuery());
      const receiptBeforeRetry = await attentionQuery(reopened, requestQuery(request.request_id));
      const eventsBeforeRetry = await attentionQuery(reopened, eventQuery());

      if (stage === 'before_commit') {
        assert.equal(inspected.revision, 1);
        assert.equal(inspected.seen, false);
        assert.equal(receiptBeforeRetry.result, null);
        assert.equal(eventsBeforeRetry.events.length, 1);

        const retried = await attentionAction(reopened, request);
        assert.equal(retried.revision, 2);
        assert.deepEqual(await attentionAction(reopened, request), retried);
        const afterRetry = await attentionQuery(reopened, eventQuery());
        assert.equal(afterRetry.events.length, 2);
      } else {
        assert.equal(inspected.revision, 2);
        assert.equal(inspected.seen, true);
        assert.equal(receiptBeforeRetry.result.revision, 2);
        assert.equal(eventsBeforeRetry.events.length, 2);
        assert.deepEqual(await attentionAction(reopened, request), receiptBeforeRetry.result);
        const afterRetry = await attentionQuery(reopened, eventQuery());
        assert.equal(afterRetry.events.length, 2);
      }
    } finally {
      await reopened?.close();
      await rm(dataDir, { recursive: true, force: true });
    }
  });
}
