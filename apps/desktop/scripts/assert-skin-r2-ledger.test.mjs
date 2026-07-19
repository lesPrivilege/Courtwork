import assert from 'node:assert/strict';
import test from 'node:test';

import {
  retiredP5ProposalLines,
  signedR2LedgerRows,
  validateSignedR2Ledger,
} from './skin-r2-ledger-contract-lib.mjs';

const validFixture = () => signedR2LedgerRows.map(([approvedProposalLine, target, tier]) => ({
  approvedProposalLine,
  target,
  tier,
}));

test('签署后的 P2/P3/P4/P5 平铺账完整通过', () => {
  assert.deepEqual(validateSignedR2Ledger(validFixture()), []);
});

test('注入一：漏签署行定点失败', () => {
  const fixture = validFixture().filter((entry) => entry.approvedProposalLine !== 'P2-L18');
  assert.match(validateSignedR2Ledger(fixture).join('\n'), /已签提案行缺失：P2-L18/);
});

test('注入二：错档位定点失败', () => {
  const fixture = validFixture();
  fixture.find((entry) => entry.approvedProposalLine === 'P2-L04').tier = 'agent-interface';
  assert.match(validateSignedR2Ledger(fixture).join('\n'), /P2-L04 档位漂移/);
});

test('注入三：一个 target 绑两行定点失败', () => {
  const fixture = validFixture();
  fixture.find((entry) => entry.approvedProposalLine === 'P2-L18').target = fixture.find(
    (entry) => entry.approvedProposalLine === 'P2-L17',
  ).target;
  const failures = validateSignedR2Ledger(fixture).join('\n');
  assert.match(failures, /P2-L18 target 漂移/);
  assert.match(failures, /target 未唯一绑定/);
});

test('注入四：退场的 P5 UI 覆盖行不得复活', () => {
  const fixture = validFixture();
  fixture.push({ approvedProposalLine: retiredP5ProposalLines[0], target: 'site/styles.css#:root|--sans', tier: 'pages-experimental' });
  assert.match(validateSignedR2Ledger(fixture).join('\n'), /退场提案行不得进入活档位账：P5-F06/);
});

test('注入五：P3 每件巧思必须各占唯一签署行', () => {
  const fixture = validFixture().filter((entry) => entry.approvedProposalLine !== 'P3-H01');
  assert.match(validateSignedR2Ledger(fixture).join('\n'), /已签提案行缺失：P3-H01/);
});

test('注入六：P4 根宗映射与 schema 双宗断言不得漏账', () => {
  const fixture = validFixture().filter((entry) => entry.approvedProposalLine !== 'P4-D04');
  assert.match(validateSignedR2Ledger(fixture).join('\n'), /已签提案行缺失：P4-D04/);
});
