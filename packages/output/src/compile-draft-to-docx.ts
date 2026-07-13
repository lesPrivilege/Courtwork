import { strToU8 } from 'fflate';
import { saveDocx, type DocxFiles } from './docx-zip.js';
import { BODY_EAST_ASIA_FONT, HEADING_EAST_ASIA_FONT, LATIN_FONT } from './fonts.js';

export interface DraftDocxInput {
  title: string;
  paragraphs: readonly string[];
}

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function escapeXml(value: string): string {
  // XML 1.0 不接受这些控制字符；不可静默删改法律文书正文。
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      throw new Error('草稿包含无法写入 Word 的控制字符');
    }
  }
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function run(text: string, role: 'heading' | 'body'): string {
  const eastAsia = role === 'heading' ? HEADING_EAST_ASIA_FONT : BODY_EAST_ASIA_FONT;
  const bold = role === 'heading' ? '<w:b/><w:bCs/>' : '';
  const size = role === 'heading' ? '32' : '24';
  return `<w:r><w:rPr><w:rFonts w:ascii="${LATIN_FONT}" w:eastAsia="${eastAsia}" w:hAnsi="${LATIN_FONT}" w:cs="${LATIN_FONT}"/>${bold}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function paragraph(text: string, role: 'heading' | 'body'): string {
  const properties = role === 'heading'
    ? '<w:pPr><w:jc w:val="center"/><w:spacing w:after="360"/></w:pPr>'
    : '<w:pPr><w:spacing w:line="480" w:lineRule="auto" w:after="160"/><w:ind w:firstLineChars="200"/></w:pPr>';
  return `<w:p>${properties}${run(text, role)}</w:p>`;
}

/** 起草画布 → 新 Word 文书（docs/decisions/ADR-004-documents-and-files.md W4.1）；不含修订痕迹。 */
export function compileDraftToDocx(input: DraftDocxInput): Buffer {
  const title = input.title.trim();
  const paragraphs = input.paragraphs.map((text) => text.trim()).filter(Boolean);
  if (!title) throw new Error('文书标题不能为空');
  if (paragraphs.length === 0) throw new Error('文书正文不能为空');

  const body = [paragraph(title, 'heading'), ...paragraphs.map((text) => paragraph(text, 'body'))].join('');
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}" xmlns:r="${R}"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="851" w:footer="992" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  const files: DocxFiles = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    ),
    'word/document.xml': strToU8(documentXml),
    'word/_rels/document.xml.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    ),
    'word/styles.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${LATIN_FONT}" w:eastAsia="${BODY_EAST_ASIA_FONT}" w:hAnsi="${LATIN_FONT}" w:cs="${LATIN_FONT}"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`,
    ),
  };

  return saveDocx(files);
}
