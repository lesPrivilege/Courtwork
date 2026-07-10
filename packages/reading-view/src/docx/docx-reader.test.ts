import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { readDocxBlocks, DocxReadError } from './docx-reader.js';
import { DEFAULT_LIMITS } from '../security/limits.js';
import {
  buildDocxFixture,
  buildDocxWithDoctype,
  buildZipBombFixture,
  buildCorruptDocx,
} from '../test-fixtures/build-docx-fixture.js';

describe('readDocxBlocks', () => {
  it('按文档序抽取段落，加粗段落标记 heading:true', () => {
    const data = buildDocxFixture({
      blocks: [
        { type: 'paragraph', paragraph: { text: '标题段落', bold: true } },
        { type: 'paragraph', paragraph: { text: '正文段落' } },
      ],
    });
    const blocks = readDocxBlocks(data, DEFAULT_LIMITS);
    expect(blocks).toEqual([
      { kind: 'paragraph', text: '标题段落', heading: true },
      { kind: 'paragraph', text: '正文段落', heading: false },
    ]);
  });

  it('表格按行列抽取纯文本，未合并单元格时 merged:false', () => {
    const data = buildDocxFixture({
      blocks: [{ type: 'table', table: { rows: [['期次', '金额'], ['预付款', '114万']] } }],
    });
    const blocks = readDocxBlocks(data, DEFAULT_LIMITS);
    expect(blocks).toEqual([
      { kind: 'table', rows: [['期次', '金额'], ['预付款', '114万']], merged: false },
    ]);
  });

  it('表格含合并单元格时 merged:true（不在这一层降级，只如实上报）', () => {
    const data = buildDocxFixture({
      blocks: [{ type: 'table', table: { rows: [['期次', '金额'], ['预付款', '114万']], merged: true } }],
    });
    const blocks = readDocxBlocks(data, DEFAULT_LIMITS);
    expect(blocks[0]).toMatchObject({ kind: 'table', merged: true });
  });

  it('空段落（无文本内容）被跳过', () => {
    const data = buildDocxFixture({ blocks: [{ type: 'paragraph', paragraph: { text: '' } }] });
    const blocks = readDocxBlocks(data, DEFAULT_LIMITS);
    expect(blocks).toEqual([]);
  });

  it('含 word/vbaProject.bin 时抛 DocxReadError(malicious_content)', () => {
    const data = buildDocxFixture({ blocks: [{ type: 'paragraph', paragraph: { text: '正文' } }], includeVbaProject: true });
    expect(() => readDocxBlocks(data, DEFAULT_LIMITS)).toThrow(DocxReadError);
    try {
      readDocxBlocks(data, DEFAULT_LIMITS);
    } catch (err) {
      expect((err as DocxReadError).reason).toBe('malicious_content');
    }
  });

  it('[Content_Types].xml 声明宏使能类型时抛 DocxReadError(malicious_content)', () => {
    const macroContentTypes =
      '<Types><Override PartName="/word/document.xml" ContentType="application/vnd.ms-word.document.macroEnabled.main+xml"/></Types>';
    const data = buildDocxFixture({
      blocks: [{ type: 'paragraph', paragraph: { text: '正文' } }],
      contentTypesOverride: macroContentTypes,
    });
    expect(() => readDocxBlocks(data, DEFAULT_LIMITS)).toThrow(DocxReadError);
  });

  it('document.xml 含 DOCTYPE/ENTITY 时抛 DocxReadError(malicious_content)', () => {
    const data = buildDocxWithDoctype();
    try {
      readDocxBlocks(data, DEFAULT_LIMITS);
      throw new Error('应该抛错但没有抛');
    } catch (err) {
      expect(err).toBeInstanceOf(DocxReadError);
      expect((err as DocxReadError).reason).toBe('malicious_content');
    }
  });

  it('解压比例超限时抛 DocxReadError(zip_bomb_suspected)，且在解压前拒绝', () => {
    const data = buildZipBombFixture();
    try {
      readDocxBlocks(data, DEFAULT_LIMITS);
      throw new Error('应该抛错但没有抛');
    } catch (err) {
      expect(err).toBeInstanceOf(DocxReadError);
      expect((err as DocxReadError).reason).toBe('zip_bomb_suspected');
    }
  });

  it('不合法的 zip 抛 DocxReadError(corrupt_file)', () => {
    const data = buildCorruptDocx();
    try {
      readDocxBlocks(data, DEFAULT_LIMITS);
      throw new Error('应该抛错但没有抛');
    } catch (err) {
      expect(err).toBeInstanceOf(DocxReadError);
      expect((err as DocxReadError).reason).toBe('corrupt_file');
    }
  });

  it('合法 zip 但缺少 word/document.xml 时抛 DocxReadError(corrupt_file)', () => {
    const data = zipSync({ '[Content_Types].xml': strToU8('<Types/>') }, { level: 6 });
    try {
      readDocxBlocks(data, DEFAULT_LIMITS);
      throw new Error('应该抛错但没有抛');
    } catch (err) {
      expect(err).toBeInstanceOf(DocxReadError);
      expect((err as DocxReadError).reason).toBe('corrupt_file');
    }
  });
});
