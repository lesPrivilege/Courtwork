/**
 * 测试专用：手工拼装最小 docx（合法 zip + 最小 OOXML 部件），不依赖任何 docx 写入库。
 * 与 packages/output 的"手写 OOXML"技术路线保持同一哲学，且刻意保持最小——
 * 只包含本包转换器实际会读的部件。
 */
import { zipSync, strToU8 } from 'fflate';

export const DOCX_WORD_NAMESPACE = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

export interface FixtureParagraph {
  text: string;
  bold?: boolean;
}
export interface FixtureTable {
  rows: string[][];
  /** true 时给第一行第一个单元格加 gridSpan，模拟合并单元格。 */
  merged?: boolean;
}
export type FixtureBlock = { type: 'paragraph'; paragraph: FixtureParagraph } | { type: 'table'; table: FixtureTable };

export interface BuildDocxOptions {
  blocks: FixtureBlock[];
  contentTypesOverride?: string;
  includeVbaProject?: boolean;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderParagraphXml(p: FixtureParagraph): string {
  const rPr = p.bold ? '<w:rPr><w:b/></w:rPr>' : '';
  return `<w:p><w:r>${rPr}<w:t xml:space="preserve">${escapeXml(p.text)}</w:t></w:r></w:p>`;
}

function renderTableXml(t: FixtureTable): string {
  const rows = t.rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cellText, cellIndex) => {
          const tcPr = t.merged && rowIndex === 0 && cellIndex === 0 ? '<w:tcPr><w:gridSpan w:val="2"/></w:tcPr>' : '';
          return `<w:tc>${tcPr}<w:p><w:r><w:t xml:space="preserve">${escapeXml(cellText)}</w:t></w:r></w:p></w:tc>`;
        })
        .join('');
      return `<w:tr>${cells}</w:tr>`;
    })
    .join('');
  return `<w:tbl>${rows}</w:tbl>`;
}

const DEFAULT_CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';

export function buildDocxFixture(options: BuildDocxOptions): Uint8Array {
  const bodyXml = options.blocks
    .map((b) => (b.type === 'paragraph' ? renderParagraphXml(b.paragraph) : renderTableXml(b.table)))
    .join('');
  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${DOCX_WORD_NAMESPACE}">` +
    `<w:body>${bodyXml}</w:body></w:document>`;

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(options.contentTypesOverride ?? DEFAULT_CONTENT_TYPES),
    'word/document.xml': strToU8(documentXml),
  };
  if (options.includeVbaProject) {
    files['word/vbaProject.bin'] = new Uint8Array([0, 1, 2, 3]);
  }
  return zipSync(files, { level: 6 });
}

/** XXE 探测专用 fixture：document.xml 本身携带 DOCTYPE + ENTITY 声明。 */
export function buildDocxWithDoctype(): Uint8Array {
  const documentXml =
    `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>` +
    `<w:document xmlns:w="${DOCX_WORD_NAMESPACE}"><w:body><w:p><w:r><w:t>&xxe;</w:t></w:r></w:p></w:body></w:document>`;
  return zipSync(
    { '[Content_Types].xml': strToU8('<Types/>'), 'word/document.xml': strToU8(documentXml) },
    { level: 6 },
  );
}

/** 解压比例上限探测专用 fixture：5MB 全零内容在 deflate level 9 下压出 ~975:1 的真实比例。 */
export function buildZipBombFixture(): Uint8Array {
  const huge = new Uint8Array(5 * 1024 * 1024);
  return zipSync(
    { '[Content_Types].xml': strToU8('<Types/>'), 'word/document.xml': huge },
    { level: 9 },
  );
}

/** 损坏文件探测专用 fixture：不是合法 zip。 */
export function buildCorruptDocx(): Uint8Array {
  return new Uint8Array([0x50, 0x4b, 0x00, 0x00, 1, 2, 3, 4, 5]);
}
