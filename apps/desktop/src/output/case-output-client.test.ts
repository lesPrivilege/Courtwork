import { beforeEach, describe, expect, it } from 'vitest';
import { compileDraftToDocx } from '@courtwork/output';
import type { CaseBinding } from '../case/case-scope';
import { caseOutputClient } from './case-output-client';

const grantA: CaseBinding = { kind: 'grant', grantId: 'grant-a' };
const grantB: CaseBinding = { kind: 'grant', grantId: 'grant-b' };
const demo: CaseBinding = { kind: 'demo' };
const unbound: CaseBinding = { kind: 'unbound' };

describe('caseOutputClient browser host', () => {
  beforeEach(() => caseOutputClient.resetBrowserFiles());

  it('写入回执只报字节数，绝不携带绝对路径', async () => {
    const fileName = '答辩意见.docx';
    const bytes = compileDraftToDocx({ title: '答辩意见', paragraphs: ['请求驳回诉讼请求。'] });
    const artifact = await caseOutputClient.writeDocx(grantA, fileName, bytes);
    expect(artifact).toEqual({ byteLength: bytes.byteLength });
    expect(JSON.stringify(artifact)).not.toContain('/');
  });

  it('只有宿主写成后，案件产出的存在性才成立；重置后归零', async () => {
    const fileName = '答辩意见.docx';
    await expect(caseOutputClient.exists(grantA, fileName)).resolves.toBe(false);
    const bytes = compileDraftToDocx({ title: '答辩意见', paragraphs: ['请求驳回诉讼请求。'] });
    await caseOutputClient.writeDocx(grantA, fileName, bytes);
    await expect(caseOutputClient.exists(grantA, fileName)).resolves.toBe(true);

    caseOutputClient.resetBrowserFiles();
    await expect(caseOutputClient.exists(grantA, fileName)).resolves.toBe(false);
  });

  it('跨案隔离：案 A 写入不被案 B（或样板案）的 grant 读到', async () => {
    const fileName = '答辩意见.docx';
    const bytes = compileDraftToDocx({ title: '答辩意见', paragraphs: ['正文。'] });
    await caseOutputClient.writeDocx(grantA, fileName, bytes);
    await expect(caseOutputClient.exists(grantA, fileName)).resolves.toBe(true);
    await expect(caseOutputClient.exists(grantB, fileName)).resolves.toBe(false);
    await expect(caseOutputClient.exists(demo, fileName)).resolves.toBe(false);
  });

  it('未绑定文件夹的案件显式阻断写入，存在性恒为 false', async () => {
    const bytes = compileDraftToDocx({ title: '答辩意见', paragraphs: ['正文。'] });
    await expect(caseOutputClient.writeDocx(unbound, '答辩意见.docx', bytes)).rejects.toThrow('尚未绑定');
    await expect(caseOutputClient.exists(unbound, '答辩意见.docx')).resolves.toBe(false);
  });

  it('样板案走内存宿主，写读往返成立（不触真实文件系统）', async () => {
    const fileName = '合同审查报告.docx';
    const bytes = compileDraftToDocx({ title: '报告', paragraphs: ['结论。'] });
    await caseOutputClient.writeDocx(demo, fileName, bytes);
    await expect(caseOutputClient.exists(demo, fileName)).resolves.toBe(true);
  });

  it('拒绝目录穿越、子路径与非 docx 文件名', async () => {
    const bytes = compileDraftToDocx({ title: '答辩意见', paragraphs: ['正文。'] });
    await expect(caseOutputClient.writeDocx(grantA, '../escape.docx', bytes)).rejects.toThrow('文件名');
    await expect(caseOutputClient.writeDocx(grantA, 'sub/a.docx', bytes)).rejects.toThrow('文件名');
    await expect(caseOutputClient.writeDocx(grantA, '报告.pdf', bytes)).rejects.toThrow('docx');
  });
});
