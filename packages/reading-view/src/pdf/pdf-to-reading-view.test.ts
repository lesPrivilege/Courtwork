import { describe, expect, it } from 'vitest';
import { convertPdfToReadingView } from './pdf-to-reading-view.js';
import {
  buildPdfWithTextLayer,
  buildPdfWithoutTextLayer,
  buildPdfWithMixedTextLayers,
  buildCorruptPdf,
} from '../test-fixtures/build-pdf-fixture.js';

describe('convertPdfToReadingView', () => {
  it('含文本层的单页 PDF 判定为 ok，anchor 携带 page 与 textLayerVersion', async () => {
    const data = buildPdfWithTextLayer('Hello World');
    const outcome = await convertPdfToReadingView({ fileId: 'f1', fileName: 'a.pdf', data });
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.pageCount).toBe(1);
    expect(outcome.view.paragraphs[0]!.markdown).toContain('Hello World');
    expect(outcome.view.paragraphs[0]!.anchor.page).toBe(1);
    expect(outcome.view.paragraphs[0]!.anchor.textLayerVersion).toBeDefined();
  });

  it('全篇无文本层的 PDF 判定为 needs_ocr', async () => {
    const data = buildPdfWithoutTextLayer();
    const outcome = await convertPdfToReadingView({ fileId: 'f2', fileName: 'scan.pdf', data });
    expect(outcome.status).toBe('needs_ocr');
  });

  it('部分页面有文本、部分没有时仍判定为 ok（只要有一页有文本）', async () => {
    const data = buildPdfWithMixedTextLayers();
    const outcome = await convertPdfToReadingView({ fileId: 'f3', fileName: 'mixed.pdf', data });
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.paragraphs).toHaveLength(1);
    expect(outcome.view.paragraphs[0]!.anchor.page).toBe(1);
  });

  it('损坏的 PDF 判定为 disabled/corrupt_file，不抛异常', async () => {
    const data = buildCorruptPdf();
    const outcome = await convertPdfToReadingView({ fileId: 'f4', fileName: 'bad.pdf', data });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'corrupt_file' });
  });
});
