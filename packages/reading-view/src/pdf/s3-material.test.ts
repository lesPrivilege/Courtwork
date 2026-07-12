import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { convertPdfToReadingView } from './pdf-to-reading-view.js';

const CONTRACT_PATH = resolve(import.meta.dirname, '../../../demo-data/data/contracts/设备采购合同.pdf');
const CONTRACT_SOURCE_PATH = resolve(import.meta.dirname, '../../../demo-data/data/contracts/main-contract.md');
const FILE_ID = '设备采购合同.pdf';
const EXPECTED_QUOTES = [
  '乙方逾期支付任何一期款项的，每逾期一日应按未付金额的1%向甲方支付违约金。',
  '本合同未对甲方逾期交付或交付瑕疵约定相应违约金标准。',
  '验收标准以甲方提供的技术参数为准',
  '设备交付即视为风险转移至乙方',
  '验收合格前设备所有权仍归甲方所有',
  '因地震、洪水、战争等不可抗力致使本合同不能履行的，双方互不承担违约责任。',
  '提交甲方所在地有管辖权的人民法院管辖',
] as const;

async function convertFresh() {
  return convertPdfToReadingView({
    fileId: FILE_ID,
    fileName: FILE_ID,
    data: new Uint8Array(await readFile(CONTRACT_PATH)),
  });
}

describe('S3 MATERIAL-0 生成合同 PDF', () => {
  it('含真实文本层、页码锚点与七条预登记引语', async () => {
    const outcome = await convertFresh();
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') return;

    const pageCount = outcome.pageCount;
    expect(pageCount).toBeDefined();
    if (pageCount === undefined) return;
    expect(pageCount).toBeGreaterThan(0);
    expect(outcome.view.paragraphs).toHaveLength(pageCount);
    expect(outcome.view.markdown).toContain('虚构样板案');
    expect(outcome.view.markdown).toContain('自动生成的测试素材');
    const sourceSha256 = createHash('sha256').update(await readFile(CONTRACT_SOURCE_PATH)).digest('hex');
    expect(outcome.view.markdown).toContain(`source-sha256:${sourceSha256}`);
    expect(outcome.view.markdown).toMatch(/第 1 \/ 2 页/);
    expect(outcome.view.markdown).toMatch(/第 2 \/ 2 页/);
    for (const quote of EXPECTED_QUOTES) expect(outcome.view.markdown).toContain(quote);

    for (const paragraph of outcome.view.paragraphs) {
      const { anchor } = paragraph;
      expect(anchor.page).toBeGreaterThan(0);
      expect(anchor.textLayerVersion).toMatch(/^reading-view-pdf@1\+/);
      expect(anchor.quote).toBe(paragraph.markdown.slice(anchor.textRange!.start, anchor.textRange!.end));
    }
  });

  it('同一 PDF 以独立字节数组重复转换时 ReadingView 字节稳定', async () => {
    const first = await convertFresh();
    const second = await convertFresh();
    expect(first.status).toBe('ok');
    expect(second.status).toBe('ok');
    if (first.status !== 'ok' || second.status !== 'ok') return;

    expect(first.view.markdown).toBe(second.view.markdown);
    expect(first.view.paragraphs).toEqual(second.view.paragraphs);
  });
});
