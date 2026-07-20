import assert from 'node:assert/strict';
import test from 'node:test';

import {
  retiredP5ProposalLines,
  signedR2LedgerRows,
  validateLedgerTargets,
  validateSignedR2Ledger,
} from './skin-r2-ledger-contract-lib.mjs';

const validFixture = () => signedR2LedgerRows.map(([approvedProposalLine, target, tier]) => ({
  approvedProposalLine,
  target,
  tier,
}));

test('签署后的 P2/P3/P4/P5/VERSIONAL-LANG 平铺账完整通过', () => {
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

test('注入七：版本学三档不得把 schema 行绑到 Agent 档', () => {
  const fixture = validFixture();
  fixture.find((entry) => entry.approvedProposalLine === 'VL-S03').tier = 'agent-interface';
  assert.match(validateSignedR2Ledger(fixture).join('\n'), /VL-S03 档位漂移/);
});

test('注入八：焦点态 Preview 的窗口安全区不得漏账', () => {
  const fixture = validFixture().filter((entry) => entry.approvedProposalLine !== 'P2-L21');
  assert.match(validateSignedR2Ledger(fixture).join('\n'), /已签提案行缺失：P2-L21/);
});

test('注入九：版本学二次减法与浅宗色阶不得漏账', () => {
  const fixture = validFixture().filter((entry) => entry.approvedProposalLine !== 'VL2-C01');
  assert.match(validateSignedR2Ledger(fixture).join('\n'), /已签提案行缺失：VL2-C01/);
});

// R-15（ARCH-SCOPE-2026-07-20）：target 可解析性。原缺口是「只比字符串、只覆盖已签行」，
// 且把从来不是锚的片段当锚读。本组反例逐条对应新校验的每一支。
const targetIO = ({ files = {}, dirs = [] } = {}) => ({
  exists: (file) => file in files || dirs.includes(file),
  isDirectory: (file) => dirs.includes(file),
  readText: (file) => files[file] ?? '',
});

test('R-15 target 校验覆盖全部条目的路径存在性，不再只看已签行', () => {
  const io = targetIO({ files: { 'docs/a.md': '# 标题\n' } });
  // 未签行同样受检：路径不存在即红（原实现对未签行零覆盖）。
  const failures = validateLedgerTargets(
    [{ approvedProposalLine: 'X-99', target: 'docs/missing.md#标题', fragmentKind: 'heading' }], io);
  assert.match(failures.join('\n'), /X-99 target 路径不存在/);
  assert.deepEqual(
    validateLedgerTargets([{ approvedProposalLine: 'X-01', target: 'docs/a.md#标题', fragmentKind: 'heading' }], io), []);
});

test('R-15 fragmentKind 必须显式声明，缺失或非法即红', () => {
  const io = targetIO({ files: { 'docs/a.md': '# 标题\n' } });
  assert.match(validateLedgerTargets([{ approvedProposalLine: 'X-02', target: 'docs/a.md#标题' }], io).join('\n'),
    /X-02 缺 fragmentKind/);
  assert.match(validateLedgerTargets(
    [{ approvedProposalLine: 'X-03', target: 'docs/a.md#标题', fragmentKind: 'anchor' }], io).join('\n'),
    /取值非法/);
});

test('R-15 heading 须解析到真标题，selector 须字面存在', () => {
  const io = targetIO({ files: { 'docs/a.md': '# 标题\n', 'src/a.css': '.real { color: red; }' } });
  assert.match(validateLedgerTargets(
    [{ approvedProposalLine: 'X-04', target: 'docs/a.md#不存在的标题', fragmentKind: 'heading', fragmentSection: '标题' }], io).join('\n'),
    /heading 片段解析不到标题/);
  assert.match(validateLedgerTargets(
    [{ approvedProposalLine: 'X-05', target: 'src/a.css#.ghost', fragmentKind: 'selector' }], io).join('\n'),
    /selector 片段在目标文件内不作为字面量存在/);
  assert.deepEqual(validateLedgerTargets(
    [{ approvedProposalLine: 'X-06', target: 'src/a.css#.real', fragmentKind: 'selector' }], io), []);
});

test('R-15 pointer 的豁免由声明赚取，且双向锁防止把可验的锚降格', () => {
  const io = targetIO({ files: { 'docs/a.md': '# 一级\n## 某节\n正文里的具名内容\n', 'src/a.css': '.real { color: red; }' } });
  // md pointer 必须报 fragmentSection，且该节须真实存在。
  assert.match(validateLedgerTargets(
    [{ approvedProposalLine: 'X-07', target: 'docs/a.md#某节内部的具名内容', fragmentKind: 'pointer' }], io).join('\n'),
    /缺 fragmentSection/);
  assert.match(validateLedgerTargets(
    [{ approvedProposalLine: 'X-08', target: 'docs/a.md#某节内部的具名内容', fragmentKind: 'pointer', fragmentSection: '查无此节' }], io).join('\n'),
    /fragmentSection 不是该文件的真实标题/);
  assert.deepEqual(validateLedgerTargets(
    [{ approvedProposalLine: 'X-09', target: 'docs/a.md#某节内部的具名内容', fragmentKind: 'pointer', fragmentSection: '某节' }], io), []);
  // 双向锁：真标题／真选择器不得降格为 pointer 来躲检查。
  assert.match(validateLedgerTargets(
    [{ approvedProposalLine: 'X-10', target: 'docs/a.md#某节', fragmentKind: 'pointer', fragmentSection: '某节' }], io).join('\n'),
    /不得降格为 pointer/);
  assert.match(validateLedgerTargets(
    [{ approvedProposalLine: 'X-11', target: 'src/a.css#.real', fragmentKind: 'pointer' }], io).join('\n'),
    /应声明为 selector 而非 pointer/);
});

test('R-15 目录目标与无片段目标各归其类', () => {
  const io = targetIO({ files: { 'docs/a.md': '# 标题\n' }, dirs: ['site/evidence'] });
  assert.deepEqual(validateLedgerTargets(
    [{ approvedProposalLine: 'X-12', target: 'site/evidence#some-batch', fragmentKind: 'directory' }], io), []);
  assert.match(validateLedgerTargets(
    [{ approvedProposalLine: 'X-13', target: 'site/evidence#some-batch', fragmentKind: 'selector' }], io).join('\n'),
    /target 是目录却声明为 selector/);
  assert.match(validateLedgerTargets(
    [{ approvedProposalLine: 'X-14', target: 'docs/a.md', fragmentKind: 'heading' }], io).join('\n'),
    /无片段却声明为 heading/);
});
