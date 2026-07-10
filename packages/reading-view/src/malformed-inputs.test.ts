import { describe, expect, it } from 'vitest';
import { convertToReadingView } from './convert.js';
import {
  buildDocxFixture,
  buildDocxWithDoctype,
  buildZipBombFixture,
  buildCorruptDocx,
} from './test-fixtures/build-docx-fixture.js';
import { buildCorruptPdf, buildPdfWithoutTextLayer } from './test-fixtures/build-pdf-fixture.js';

describe('刻意构造的坏文件：降级路径贯穿顶层入口', () => {
  it('zip 炸弹形态的 docx 判定为 disabled/zip_bomb_suspected', async () => {
    const outcome = await convertToReadingView({ fileId: 'f1', fileName: 'bomb.docx', data: buildZipBombFixture() });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'zip_bomb_suspected' });
  });

  it('含 DOCTYPE/ENTITY 的 docx 判定为 disabled/malicious_content', async () => {
    const outcome = await convertToReadingView({ fileId: 'f2', fileName: 'xxe.docx', data: buildDocxWithDoctype() });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'malicious_content' });
  });

  it('含 vbaProject.bin 的 docx 判定为 disabled/malicious_content', async () => {
    const data = buildDocxFixture({ blocks: [{ type: 'paragraph', paragraph: { text: '正文' } }], includeVbaProject: true });
    const outcome = await convertToReadingView({ fileId: 'f3', fileName: 'macro.docx', data });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'malicious_content' });
  });

  it('.docm 扩展名判定为 disabled/unsupported_format，不进入解析（扩展名级拦截先于内容检查）', async () => {
    const data = buildDocxFixture({ blocks: [{ type: 'paragraph', paragraph: { text: '正文' } }] });
    const outcome = await convertToReadingView({ fileId: 'f4', fileName: 'contract.docm', data });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'unsupported_format' });
  });

  it('含合并单元格表格的 docx 判定为 disabled/fidelity_insufficient', async () => {
    const data = buildDocxFixture({
      blocks: [{ type: 'table', table: { rows: [['期次', '金额'], ['预付款', '114万']], merged: true } }],
    });
    const outcome = await convertToReadingView({ fileId: 'f5', fileName: 'merged.docx', data });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'fidelity_insufficient' });
  });

  it('不合法 zip 的 docx 判定为 disabled/corrupt_file', async () => {
    const outcome = await convertToReadingView({ fileId: 'f6', fileName: 'bad.docx', data: buildCorruptDocx() });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'corrupt_file' });
  });

  it('损坏的 PDF 判定为 disabled/corrupt_file', async () => {
    const outcome = await convertToReadingView({ fileId: 'f7', fileName: 'broken.pdf', data: buildCorruptPdf() });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'corrupt_file' });
  });

  it('超过大小上限的文件判定为 disabled/file_too_large', async () => {
    const outcome = await convertToReadingView(
      { fileId: 'f8', fileName: 'huge.txt', data: new Uint8Array(1024) },
      { maxFileSizeBytes: 100 },
    );
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'file_too_large' });
  });

  it('非法 UTF-8 字节的 txt 判定为 disabled/corrupt_file', async () => {
    const outcome = await convertToReadingView({ fileId: 'f9', fileName: 'bad-encoding.txt', data: new Uint8Array([0xff, 0xfe, 0xfd]) });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'corrupt_file' });
  });

  it('未知扩展名判定为 disabled/unsupported_format', async () => {
    const outcome = await convertToReadingView({ fileId: 'f10', fileName: 'weird.xyz', data: new Uint8Array([1]) });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'unsupported_format' });
  });

  it('jpg 扩展名短路为 needs_ocr（缺口三态里的禁用态，非 disabled）', async () => {
    const outcome = await convertToReadingView({ fileId: 'f11', fileName: 'scan.jpg', data: new Uint8Array([1, 2, 3]) });
    expect(outcome.status).toBe('needs_ocr');
  });

  it('无文本层的 PDF 判定为 needs_ocr', async () => {
    const outcome = await convertToReadingView({ fileId: 'f12', fileName: 'scan.pdf', data: buildPdfWithoutTextLayer() });
    expect(outcome.status).toBe('needs_ocr');
  });
});
