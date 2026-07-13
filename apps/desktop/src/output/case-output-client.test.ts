import { beforeEach, describe, expect, it } from 'vitest';
import { compileDraftToDocx } from '@courtwork/output';
import { caseOutputClient } from './case-output-client';

describe('caseOutputClient browser host', () => {
  beforeEach(() => caseOutputClient.resetBrowserFiles());

  it('只有宿主写成后，案件产出目录的存在性才成立', async () => {
    const caseRoot = '/Cases/临江案';
    const fileName = '答辩意见.docx';

    await expect(caseOutputClient.exists(caseRoot, fileName)).resolves.toBe(false);
    const bytes = compileDraftToDocx({ title: '答辩意见', paragraphs: ['请求驳回诉讼请求。'] });
    const artifact = await caseOutputClient.writeDocx(caseRoot, fileName, bytes);

    expect(artifact).toEqual({
      absolutePath: '/Cases/临江案/产出/答辩意见.docx',
      byteLength: bytes.byteLength,
    });
    await expect(caseOutputClient.exists(caseRoot, fileName)).resolves.toBe(true);
    await expect(caseOutputClient.exists('/Cases/别案', fileName)).resolves.toBe(false);

    caseOutputClient.resetBrowserFiles();
    await expect(caseOutputClient.exists(caseRoot, fileName)).resolves.toBe(false);
  });

  it('拒绝目录穿越、子路径与非 docx 文件名', async () => {
    const bytes = compileDraftToDocx({ title: '答辩意见', paragraphs: ['正文。'] });
    await expect(caseOutputClient.writeDocx('/Cases/A', '../escape.docx', bytes)).rejects.toThrow('文件名');
    await expect(caseOutputClient.writeDocx('/Cases/A', 'sub/a.docx', bytes)).rejects.toThrow('文件名');
    await expect(caseOutputClient.writeDocx('/Cases/A', '报告.pdf', bytes)).rejects.toThrow('docx');
  });
});
