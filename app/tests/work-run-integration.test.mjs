import assert from 'node:assert/strict';
import test from 'node:test';
import { createBuiltinWorkRunIntegration } from '../server/work-run-integration.mjs';

function fixture() {
  const record = { path: 'out/memo.txt', sha256: 'a'.repeat(64), bytes: 4, kind: 'content-version', writtenAt: '2026-09-30T00:00:00.000Z' };
  const state = { records: [record], open: true, binding: { binding: { matterId: 'matter-one' } } };
  let input;
  const integration = createBuiltinWorkRunIntegration({
    extensionRun: { fileMemo: { initialize: value => { input = value; }, beforeTool() {}, markUnknown() {} } },
    sessionId: 'session-one', runId: 'run-one', binding: state.binding,
    runtimeProfile: { revision: 3, hash: 'frozen-profile' },
    readRecordedArtifacts: () => state.records,
    readRunSessionId: () => 'session-one', readSessionBinding: () => state.binding,
    isAdmissionOpen: () => state.open, historyIsEmpty: () => true,
    sessionRunCount: () => 1, compactionEnabled: false,
    readHistory: async () => Buffer.from('memo'),
  });
  integration.beforeInitialInput({ systemPrompt: 'actual prompt', currentContext: 'frozen context', cleanHistory: true });
  return { integration, state, record, input };
}

test('Work write projection requires a durable matching record and never promotes unconfirmed placement', async () => {
  const { integration, state, record } = fixture();
  const details = { path: record.path, sha256: record.sha256, bytes: record.bytes };
  let result = { content: [{ type: 'text', text: 'occurred effect with exact hash' }], details };
  const [tool] = integration.decorateWorkspaceTools([{ name: 'ws_write', execute: async () => result }]);
  const confirmed = await tool.execute();
  assert.deepEqual(JSON.parse(confirmed.content[1].text), { recordedFile: details });
  state.records = [];
  assert.equal(await tool.execute(), result, 'no record means no model receipt');
  state.records = [record];
  result = { ...result, details: { ...details, placement: 'unconfirmed' } };
  assert.equal(await tool.execute(), result, 'a prior identical recorded version cannot confirm this placement');
});

test('Work selectors import the earliest exact recorded history version, not current path bytes', async () => {
  const { state, record, input } = fixture();
  state.records.push({ ...record, writtenAt: '2026-09-30T00:01:00.000Z' });
  const [selected] = await input.readRecordedFiles([{ path: record.path, sha256: record.sha256 }]);
  assert.deepEqual(selected, { ...record, recordIndex: 0, sessionId: 'session-one', runId: 'run-one', content: 'memo' });
  await assert.rejects(input.readRecordedFiles([{ path: record.path, sha256: 'b'.repeat(64) }]), { code: 'BINDING_MISMATCH' });
  state.binding = { binding: { matterId: 'another-matter' } };
  await assert.rejects(input.readRecordedFiles([{ path: record.path, sha256: record.sha256 }]), { code: 'BINDING_MISMATCH' });
});

test('Work admission is rechecked after awaited history and revoked readers cannot return file content', async () => {
  const { record } = fixture();
  let open = true;
  let reader;
  const integration = createBuiltinWorkRunIntegration({
    extensionRun: { fileMemo: { initialize: ({ readRecordedFiles }) => { reader = readRecordedFiles; } } },
    sessionId: 'session-one', runId: 'run-one', binding: { binding: { matterId: 'matter-one' } },
    runtimeProfile: { revision: 3, hash: 'frozen-profile' },
    readRecordedArtifacts: () => [record], readRunSessionId: () => 'session-one',
    readSessionBinding: () => ({ binding: { matterId: 'matter-one' } }),
    isAdmissionOpen: () => open, historyIsEmpty: () => true, sessionRunCount: () => 1,
    compactionEnabled: false,
    readHistory: async () => { open = false; return Buffer.from('memo'); },
  });
  integration.beforeInitialInput({ systemPrompt: 'prompt', currentContext: '', cleanHistory: true });
  await assert.rejects(reader([{ path: record.path, sha256: record.sha256 }]), { code: 'CANDIDATE_CLOSED' });
});

test('ordinary execution does not call Work readers or install domain input callbacks', () => {
  const refusedRead = () => { throw new Error('ordinary execution crossed the Work boundary'); };
  const integration = createBuiltinWorkRunIntegration({ readRecordedArtifacts: refusedRead, historyIsEmpty: refusedRead });
  const tools = [{ name: 'ws_write' }];
  assert.equal(integration.decorateWorkspaceTools(tools), tools);
  assert.equal(integration.beforeInitialInput, undefined);
  assert.equal(integration.beforeTool, undefined);
  assert.equal(integration.beforeExtraInput, undefined);
});
