import { describe, expect, it } from 'vitest';
import { convertMarkdownToReadingView } from './markdown-to-reading-view.js';

describe('convertMarkdownToReadingView', () => {
  it('标题/段落/表格各自成块，markdown 字段与原文子串逐字相同', async () => {
    const source = '# 证据清单\n\n案号：(2025)云章03民初472号\n\n| 序号 | 证据名称 |\n|------|----------|\n| 1 | 采购询价函 |\n';
    const outcome = await convertMarkdownToReadingView({
      fileId: 'f1',
      fileName: '03-证据清单.md',
      data: new TextEncoder().encode(source),
    });
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    const { paragraphs } = outcome.view;
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0]!.markdown).toBe('# 证据清单');
    expect(paragraphs[1]!.markdown).toBe('案号：(2025)云章03民初472号');
    expect(paragraphs[2]!.markdown).toContain('| 序号 | 证据名称 |');
  });

  it('每个段落的 anchor.textRange 精确对应原文子串（textRange 相对原始字节，不是渲染后的 markdown）', async () => {
    const source = '第一段。\n\n第二段。';
    const outcome = await convertMarkdownToReadingView({
      fileId: 'f2',
      fileName: 'a.md',
      data: new TextEncoder().encode(source),
    });
    if (outcome.status !== 'ok') throw new Error('unreachable');
    for (const p of outcome.view.paragraphs) {
      const { start, end } = p.anchor.textRange!;
      expect(source.slice(start, end)).toBe(p.anchor.quote);
    }
  });

  it('md/txt 路径不填 textLayerVersion（原件本身即文本层，无派生漂移风险）', async () => {
    const outcome = await convertMarkdownToReadingView({
      fileId: 'f3',
      fileName: 'a.md',
      data: new TextEncoder().encode('段落。'),
    });
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.paragraphs[0]!.anchor.textLayerVersion).toBeUndefined();
  });

  it('非法 UTF-8 字节判定为 disabled/corrupt_file', async () => {
    const outcome = await convertMarkdownToReadingView({
      fileId: 'f4',
      fileName: 'bad.md',
      data: new Uint8Array([0xff, 0xfe, 0xfd]),
    });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'corrupt_file' });
  });
});
