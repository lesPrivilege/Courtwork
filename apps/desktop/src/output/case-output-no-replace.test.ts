import { beforeEach, describe, expect, it } from 'vitest';
import { compileDraftToDocx } from '@courtwork/output';
import type { CaseBinding } from '../case/case-scope';
import { caseOutputClient } from './case-output-client';

/**
 * CONTRACT-OUTPUT-TRUTH-1 · O6：browser bridge 必须**镜像同一结果语义**，而不是按路径猜。
 * Rust 强实现的对应断言住 `src-tauri/src/case_output_fs.rs` 的 macOS 测试组。
 */
const GRANT_A: CaseBinding = { kind: 'grant', grantId: 'grant-a' };
const GRANT_B: CaseBinding = { kind: 'grant', grantId: 'grant-b' };
const UNBOUND: CaseBinding = { kind: 'unbound' };
const FILE = '合同审查批注稿-20260311-074123-456-abc.docx';

function docx(text: string): Uint8Array {
  return new Uint8Array(compileDraftToDocx({ title: '合同审查批注稿', paragraphs: [text] }));
}

describe('statDocx 三态', () => {
  beforeEach(() => caseOutputClient.resetBrowserFiles());

  it('未写入 → missing（不是 failed，也不是 boolean false）', async () => {
    expect(await caseOutputClient.statDocx(GRANT_A, FILE)).toEqual({ status: 'missing' });
  });

  it('已写入 → found 携真实 byteLength 与 SHA-256', async () => {
    const bytes = docx('一');
    await caseOutputClient.writeDocxNoReplace(GRANT_A, FILE, bytes);
    const stat = await caseOutputClient.statDocx(GRANT_A, FILE);
    expect(stat.status).toBe('found');
    if (stat.status !== 'found') throw new Error('unreachable');
    expect(stat.byteLength).toBe(bytes.byteLength);
    expect(stat.sha256).toMatch(/^[0-9a-f]{64}$/);
    // hash 必须真随内容变，不是常量。
    caseOutputClient.resetBrowserFiles();
    await caseOutputClient.writeDocxNoReplace(GRANT_A, FILE, docx('二二二二'));
    const other = await caseOutputClient.statDocx(GRANT_A, FILE);
    if (other.status !== 'found') throw new Error('unreachable');
    expect(other.sha256).not.toBe(stat.sha256);
  });

  it('未绑定 → failed/unbound；非法文件名 → failed/invalid_input', async () => {
    expect(await caseOutputClient.statDocx(UNBOUND, FILE)).toEqual({ status: 'failed', reason: 'unbound' });
    expect(await caseOutputClient.statDocx(GRANT_A, '../escape.docx')).toEqual({
      status: 'failed',
      reason: 'invalid_input',
    });
    expect(await caseOutputClient.statDocx(GRANT_A, '报告.pdf')).toEqual({
      status: 'failed',
      reason: 'invalid_input',
    });
  });

  it('宿主失败 → failed 携 reason，**绝不**伪装 missing', async () => {
    caseOutputClient.setBrowserFault({ kind: 'stat_failed', reason: 'unavailable' });
    expect(await caseOutputClient.statDocx(GRANT_A, FILE)).toEqual({ status: 'failed', reason: 'unavailable' });
  });

  it('跨案隔离：A 案产物在 B 案查为 missing', async () => {
    await caseOutputClient.writeDocxNoReplace(GRANT_A, FILE, docx('一'));
    expect(await caseOutputClient.statDocx(GRANT_B, FILE)).toEqual({ status: 'missing' });
  });
});

describe('writeDocxNoReplace 原子 no-replace', () => {
  beforeEach(() => caseOutputClient.resetBrowserFiles());

  it('首写 → written 携字节数', async () => {
    const bytes = docx('一');
    expect(await caseOutputClient.writeDocxNoReplace(GRANT_A, FILE, bytes)).toEqual({
      status: 'written',
      byteLength: bytes.byteLength,
    });
  });

  it('同名再写 → exists，且原文件一字不变（零覆盖）', async () => {
    const first = docx('第一版内容');
    await caseOutputClient.writeDocxNoReplace(GRANT_A, FILE, first);
    const before = await caseOutputClient.statDocx(GRANT_A, FILE);

    expect(await caseOutputClient.writeDocxNoReplace(GRANT_A, FILE, docx('完全不同的第二版'))).toEqual({
      status: 'exists',
    });

    const after = await caseOutputClient.statDocx(GRANT_A, FILE);
    expect(after).toEqual(before);
  });

  it('发布竞态：写前目标被抢先建出 → exists', async () => {
    caseOutputClient.setBrowserFault({ kind: 'write_exists' });
    expect(await caseOutputClient.writeDocxNoReplace(GRANT_A, FILE, docx('一'))).toEqual({ status: 'exists' });
  });

  it('effect unknown：回执 failed 但目标已在——调用方必须靠 post-stat 才能判定', async () => {
    const bytes = docx('一');
    caseOutputClient.setBrowserFault({ kind: 'write_effect_unknown', reason: 'unavailable' });
    expect(await caseOutputClient.writeDocxNoReplace(GRANT_A, FILE, bytes)).toEqual({
      status: 'failed',
      reason: 'unavailable',
    });
    // 仅凭 write 回执会得出「没写成」的错误结论；post-stat 才是真相。
    const stat = await caseOutputClient.statDocx(GRANT_A, FILE);
    expect(stat.status).toBe('found');
  });

  it('宿主失败 → failed 携 reason，且不落任何字节', async () => {
    caseOutputClient.setBrowserFault({ kind: 'write_failed', reason: 'revoked' });
    expect(await caseOutputClient.writeDocxNoReplace(GRANT_A, FILE, docx('一'))).toEqual({
      status: 'failed',
      reason: 'revoked',
    });
    caseOutputClient.setBrowserFault(null);
    expect(await caseOutputClient.statDocx(GRANT_A, FILE)).toEqual({ status: 'missing' });
  });

  it('未绑定 / 非法名 / 非 docx 输入各自 typed failed，零写入', async () => {
    expect(await caseOutputClient.writeDocxNoReplace(UNBOUND, FILE, docx('一'))).toEqual({
      status: 'failed',
      reason: 'unbound',
    });
    expect(await caseOutputClient.writeDocxNoReplace(GRANT_A, 'sub/a.docx', docx('一'))).toEqual({
      status: 'failed',
      reason: 'invalid_input',
    });
    expect(
      await caseOutputClient.writeDocxNoReplace(GRANT_A, FILE, new TextEncoder().encode('not a zip')),
    ).toEqual({ status: 'failed', reason: 'invalid_input' });
    expect(await caseOutputClient.statDocx(GRANT_A, FILE)).toEqual({ status: 'missing' });
  });

  it('同名异内容预放：写入不覆盖，stat 仍是预放那份', async () => {
    const planted = docx('别人预先放的产物');
    caseOutputClient.seedBrowserFile(GRANT_A, FILE, planted);
    expect(await caseOutputClient.writeDocxNoReplace(GRANT_A, FILE, docx('本次编译的产物'))).toEqual({
      status: 'exists',
    });
    const stat = await caseOutputClient.statDocx(GRANT_A, FILE);
    if (stat.status !== 'found') throw new Error('unreachable');
    expect(stat.byteLength).toBe(planted.byteLength);
  });

  it('两案换 grant：写 A 不出现在 B（不是按路径猜的）', async () => {
    await caseOutputClient.writeDocxNoReplace(GRANT_A, FILE, docx('一'));
    expect(await caseOutputClient.writeDocxNoReplace(GRANT_B, FILE, docx('一'))).toMatchObject({
      status: 'written',
    });
  });
});

describe('起草画布通用写入不受本票影响', () => {
  beforeEach(() => caseOutputClient.resetBrowserFiles());

  it('writeDocx 仍是覆盖语义——本票窄改只限合同审查批注稿', async () => {
    await caseOutputClient.writeDocx(GRANT_A, '答辩意见.docx', docx('第一稿'));
    const second = docx('第二稿内容更长一些');
    await caseOutputClient.writeDocx(GRANT_A, '答辩意见.docx', second);
    const stat = await caseOutputClient.statDocx(GRANT_A, '答辩意见.docx');
    if (stat.status !== 'found') throw new Error('unreachable');
    expect(stat.byteLength).toBe(second.byteLength);
  });
});
