import assert from 'node:assert/strict';
import test from 'node:test';
import { scanWorkAgentGuiContracts, scanWorkAgentR1Contracts } from './assert-work-agent-gui-contracts.mjs';

test('旧 producer/import/testid 逐枚注入即红', () => {
  for (const source of [
    "import { WorkDraftPanel } from './system/WorkDraftPanel';",
    'const workDraftStore = new Map();',
    "import { workDraftStore } from './system/work-draft-store';",
    'const workDraftMode = true;',
    'const openWorkDrafts = () => {};',
    '<DraftSeat workTrack />',
    'data-testid="scene-unloaded-draft"',
    'data-testid="wf-open-work-drafts"',
    'workDraftPath(caseRoot, name)',
  ]) {
    assert.notEqual(scanWorkAgentGuiContracts([['src/probe.tsx', source]]).length, 0, source);
  }
});

test("caseRoot='' 的工作稿写法注入即红", () => {
  assert.deepEqual(
    scanWorkAgentGuiContracts([['src/probe.ts', "const caseRoot = ''; const target = `工作稿/${name}`;"]]),
    ["src/probe.ts: caseRoot='' 工作稿假写回流"],
  );
});

test('R1 · pi-history 退回 v1（key/version/grantId 校验）逐枚注入即红', () => {
  const goodHistory = `
export const PI_HISTORY_STORAGE_KEY = 'courtwork.pi-drafts.v2';
export const PI_HISTORY_SCHEMA_VERSION = 2 as const;
    session.grantId === 'string' &&
    session.grantId.length > 0 &&
`;
  for (const probe of [
    goodHistory.replace(/pi-drafts\.v2/, 'pi-drafts.v1'),
    goodHistory.replace(/= 2 as const/, '= 1 as const'),
    goodHistory.replace(/session\.grantId\.length > 0 &&\n/, ''),
  ]) {
    assert.notEqual(scanWorkAgentR1Contracts(probe, '').length, 0, probe);
  }
});

test('R1 · start 前置门或 open grantId 比对缺失即红', () => {
  const goodLane = `
  const start = useCallback(async () => {
    const startIdentity = identityKey;
    if (identityRef.current !== startIdentity) return;
    const nextSessionId = mint();
    history.some((entry) => entry.grantId === grantId)
`;
  for (const probe of [
    goodLane.replace('    if (identityRef.current !== startIdentity) return;\n', ''),
    goodLane.replace('entry.grantId === grantId', 'entry.sessionId === targetSessionId'),
  ]) {
    assert.notEqual(scanWorkAgentR1Contracts('', probe).length, 0, probe);
  }
});
