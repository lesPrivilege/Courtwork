import { describe, expect, it } from 'vitest';
import {
  splitBlankLineBlocks,
  escapeBlockLeadingMarker,
  convertTextToReadingView,
} from './text-to-reading-view.js';

describe('splitBlankLineBlocks', () => {
  it('单段落文本返回一个块，偏移量能精确 slice 回原文', () => {
    const text = '只有一段。';
    const blocks = splitBlankLineBlocks(text);
    expect(blocks).toHaveLength(1);
    expect(text.slice(blocks[0]!.start, blocks[0]!.end)).toBe(blocks[0]!.text);
  });

  it('LF 空行分隔的多段落，每块偏移量都能精确 slice 回原文', () => {
    const text = '第一段。\n\n第二段第一行。\n第二段第二行。\n\n第三段。';
    const blocks = splitBlankLineBlocks(text);
    expect(blocks.map((b) => b.text)).toEqual(['第一段。', '第二段第一行。\n第二段第二行。', '第三段。']);
    for (const block of blocks) {
      expect(text.slice(block.start, block.end)).toBe(block.text);
    }
  });

  it('CRLF 空行分隔同样正确切分（解析必须吃原始字节，不能先归一化换行符）', () => {
    const text = '第一段。\r\n\r\n第二段。';
    const blocks = splitBlankLineBlocks(text);
    expect(blocks.map((b) => b.text)).toEqual(['第一段。', '第二段。']);
    for (const block of blocks) {
      expect(text.slice(block.start, block.end)).toBe(block.text);
    }
  });

  it('多个连续空行（含仅含空格的"空行"）视为一个分隔符', () => {
    const text = '第一段。\n   \n\n\n第二段。';
    const blocks = splitBlankLineBlocks(text);
    expect(blocks.map((b) => b.text)).toEqual(['第一段。', '第二段。']);
  });

  it('首尾空白不产生空块', () => {
    const text = '\n\n第一段。\n\n';
    const blocks = splitBlankLineBlocks(text);
    expect(blocks.map((b) => b.text)).toEqual(['第一段。']);
  });

  it('全空白文本返回空数组', () => {
    expect(splitBlankLineBlocks('   \n\n  ')).toEqual([]);
  });
});

describe('escapeBlockLeadingMarker', () => {
  it('井号开头转义为标题标记', () => {
    expect(escapeBlockLeadingMarker('# 不是标题')).toBe('\\# 不是标题');
  });

  it('数字加点开头转义为有序列表标记', () => {
    expect(escapeBlockLeadingMarker('1. 不是列表')).toBe('1\\. 不是列表');
  });

  it('连字符加空格开头转义为无序列表标记', () => {
    expect(escapeBlockLeadingMarker('- 不是列表')).toBe('\\- 不是列表');
  });

  it('普通文本不受影响', () => {
    expect(escapeBlockLeadingMarker('普通段落文本')).toBe('普通段落文本');
  });

  it('数字后面不是点号/右括号时不转义（如日期）', () => {
    expect(escapeBlockLeadingMarker('2024年8月17日')).toBe('2024年8月17日');
  });

  it('连字符后紧跟数字（非列表语法）不转义', () => {
    expect(escapeBlockLeadingMarker('-5000元的违约金')).toBe('-5000元的违约金');
  });
});

describe('convertTextToReadingView', () => {
  it('多段落 txt 产出 ok 状态与逐段锚点，md/txt 路径不填 textLayerVersion', async () => {
    const text = '第一段。\n\n第二段。';
    const outcome = await convertTextToReadingView({
      fileId: 'f1',
      fileName: 'a.txt',
      data: new TextEncoder().encode(text),
    });
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.paragraphs).toHaveLength(2);
    expect(outcome.view.paragraphs[0]!.anchor.textLayerVersion).toBeUndefined();
    expect(outcome.view.paragraphs[0]!.anchor.quote).toBe('第一段。');
    expect(outcome.view.paragraphs[0]!.anchor.textRange).toEqual({ start: 0, end: 4 });
  });

  it('非法 UTF-8 字节判定为 disabled/corrupt_file', async () => {
    const outcome = await convertTextToReadingView({
      fileId: 'f2',
      fileName: 'bad.txt',
      data: new Uint8Array([0xff, 0xfe, 0xfd]),
    });
    expect(outcome).toMatchObject({ status: 'disabled', reason: 'corrupt_file' });
  });

  it('空文件返回 ok 状态与空段落列表，不是 disabled', async () => {
    const outcome = await convertTextToReadingView({ fileId: 'f3', fileName: 'empty.txt', data: new Uint8Array() });
    expect(outcome.status).toBe('ok');
    if (outcome.status !== 'ok') throw new Error('unreachable');
    expect(outcome.view.paragraphs).toEqual([]);
  });
});
