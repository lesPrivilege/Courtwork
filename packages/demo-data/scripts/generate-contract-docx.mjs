import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/**
 * 生成主合同的 docx 孪生（LEGAL-DEMO-RUN，2026-07-13）：与 generate-contract-pdf.mjs
 * 同源自 data/contracts/main-contract.md——PDF 是"卷宗里被审的原件"，本 docx 是
 * "修订落笔的 Word 原件"。两者文本同源，才能让 RiskList 锚点引语（出自 PDF 文本层）
 * 在 docx 里精确定位（packages/output locate 按段落精确子串匹配）。
 *
 * 这补的是 S3_RISK_LIST_RESPONSE 注释里如实记录的缺口："demo-data 主合同只有
 * markdown 形态，还没有对应的 docx"（旧 W4.1 挂账），旧演示因此被迫混用另一份
 * 黄金样例 docx。孪生落地后，材料（PDF）、修订目标（docx）、剧本（引语）首次同源。
 *
 * 零 npm 依赖（demo-data 零依赖纪律）：OOXML 手写 + 系统 zip 打包，与 output/
 * reading-view 的"手写 OOXML"路线同哲学。产物提交入库，脚本仅供再生成。
 * 部件清单以 packages/output 消费为准：writeCommentsPart 硬性要求
 * word/_rels/document.xml.rels 存在；_rels/.rels 使 Word/WPS 可直接打开。
 */

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const sourcePath = resolve(packageRoot, 'data/contracts/main-contract.md');
const outputPath = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(packageRoot, 'data/contracts/设备采购合同.docx');

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

/** 与 PDF 生成器同规约：去 markdown 装饰（**、#），保留列表编号与全角空格，逐行成段。 */
function paragraphsFromContractMarkdown(markdown) {
  const source = createHash('sha256').update(markdown).digest('hex');
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const paragraphs = [`虚构样板案 · 自动生成的测试素材 · 内容源：main-contract.md · source-sha256:${source}`];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === '---') continue;
    paragraphs.push(line.replace(/^#\s+/, '').replaceAll('**', ''));
  }
  return paragraphs;
}

function documentXml(paragraphs) {
  const body = paragraphs
    .map((text) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W_NS}"><w:body>${body}</w:body></w:document>`;
}

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '</Types>';

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
  '</Relationships>';

const DOCUMENT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>';

const markdown = readFileSync(sourcePath, 'utf-8');
const stageDir = mkdtempSync(join(tmpdir(), 'courtwork-contract-docx-'));
try {
  mkdirSync(join(stageDir, '_rels'));
  mkdirSync(join(stageDir, 'word'));
  mkdirSync(join(stageDir, 'word', '_rels'));
  writeFileSync(join(stageDir, '[Content_Types].xml'), CONTENT_TYPES);
  writeFileSync(join(stageDir, '_rels', '.rels'), ROOT_RELS);
  writeFileSync(join(stageDir, 'word', 'document.xml'), documentXml(paragraphsFromContractMarkdown(markdown)));
  writeFileSync(join(stageDir, 'word', '_rels', 'document.xml.rels'), DOCUMENT_RELS);

  const zipPath = join(stageDir, 'out.zip');
  // -X 去平台附加字段；条目序固定（Content_Types 首位是 OPC 惯例）。
  execFileSync('zip', ['-X', '-q', zipPath, '[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/_rels/document.xml.rels'], {
    cwd: stageDir,
  });
  copyFileSync(zipPath, outputPath);
  console.log(`docx 孪生已生成：${outputPath}`);
  console.log(`sha256：${createHash('sha256').update(readFileSync(outputPath)).digest('hex')}`);
} finally {
  rmSync(stageDir, { recursive: true, force: true });
}
