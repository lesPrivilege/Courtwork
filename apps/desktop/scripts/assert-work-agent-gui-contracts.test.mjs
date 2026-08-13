import assert from 'node:assert/strict';
import test from 'node:test';
import { scanWorkAgentGuiContracts } from './assert-work-agent-gui-contracts.mjs';

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
