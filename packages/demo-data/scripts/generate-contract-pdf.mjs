import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const sourcePath = resolve(packageRoot, 'data/contracts/main-contract.md');
const defaultOutputPath = resolve(packageRoot, 'data/contracts/设备采购合同.pdf');
const fontPath = resolve(packageRoot, 'assets/courtwork-contract-subset.woff2');

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderInline(markdown) {
  return escapeHtml(markdown).replaceAll(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function renderContract(markdown) {
  const lines = markdown.replaceAll('\r\n', '\n').split('\n');
  const title = lines.shift()?.replace(/^#\s+/, '').trim();
  if (!title) throw new Error('合同 Markdown 缺少一级标题');

  const blocks = [];
  let listOpen = false;
  const closeList = () => {
    if (listOpen) blocks.push('</ol>');
    listOpen = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }

    const section = line.match(/^\*\*(第[一二三四五六七八九十]+条\s+.+)\*\*$/);
    if (section) {
      closeList();
      blocks.push(`<h2>${escapeHtml(section[1])}</h2>`);
      continue;
    }

    const listItem = line.match(/^(\d+)\.\s+(.+)$/);
    if (listItem) {
      if (!listOpen) {
        blocks.push('<ol>');
        listOpen = true;
      }
      blocks.push(`<li value="${listItem[1]}">${renderInline(listItem[2])}</li>`);
      continue;
    }

    closeList();
    const signature = /^(甲方（盖章）|法定代表人\/授权代表|签订日期：)/.test(line);
    const metadata = /^(\*\*(合同编号|签订日期|签订地点|卖方（甲方）|买方（乙方）)\*\*|统一社会信用代码：|住所：|法定代表人：|联系人：)/.test(line);
    const className = signature ? 'signature' : metadata ? 'metadata' : '';
    blocks.push(`<p${className ? ` class="${className}"` : ''}>${renderInline(line)}</p>`);
  }
  closeList();

  return { title, body: blocks.join('\n') };
}

function buildHtml(markdown, fontBase64, sourceSha256) {
  const { title, body } = renderContract(markdown);
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} · 虚构样板案生成物</title>
<style>
  @font-face {
    font-family: "Courtwork Contract Subset";
    src: url("data:font/woff2;base64,${fontBase64}") format("woff2");
    font-weight: 100 900;
    font-style: normal;
  }
  :root {
    --tx-1: #0A2540;
    --tx-2: #425466;
    --tx-3: #6E8098;
    --bd-hair: #EBEBEB;
    --sans: "Courtwork Contract Subset", sans-serif;
  }
  @page { size: A4; margin: 18mm 22mm 20mm; }
  * { box-sizing: border-box; }
  html { background: #FFF; }
  body {
    width: 100%;
    max-width: 720px;
    margin: 0 auto;
    color: var(--tx-1);
    background: #FFF;
    font-family: var(--sans);
    font-size: 15px;
    line-height: 1.6;
    text-align: justify;
    text-justify: inter-ideograph;
    line-break: strict;
    font-variant-numeric: tabular-nums;
  }
  .generated-note {
    margin: 0 0 12px;
    padding: 6px 10px;
    border: 1px solid var(--bd-hair);
    color: var(--tx-3);
    font-size: 10px;
    line-height: 1.4;
    text-align: center;
  }
  h1 { margin: 0 0 10px; font-size: 20px; font-weight: 600; letter-spacing: .08em; text-align: center; }
  h2 { margin: 16px 0 4px; font-size: 15px; font-weight: 600; text-align: left; break-after: avoid; }
  p { margin: 0 0 6px; orphans: 2; widows: 2; }
  strong { font-weight: 600; }
  .metadata { margin-bottom: 2px; color: var(--tx-2); font-size: 13px; text-align: left; }
  ol { margin: 0 0 6px; padding-left: 1.7em; }
  li { margin-bottom: 3px; padding-left: .2em; }
  .signature { margin: 2px 0; text-align: left; white-space: pre-wrap; }
  .signature:first-of-type { margin-top: 28px; }
</style>
</head>
<body>
  <div class="generated-note">虚构样板案 · 自动生成的测试素材 · 内容源：main-contract.md · source-sha256:${sourceSha256}</div>
  <h1>${escapeHtml(title)}</h1>
  ${body}
</body>
</html>`;
}

async function generate(outputPath) {
  const [markdown, font] = await Promise.all([readFile(sourcePath, 'utf8'), readFile(fontPath)]);
  const sourceSha256 = createHash('sha256').update(markdown).digest('hex');
  const html = buildHtml(markdown, font.toString('base64'), sourceSha256);
  await mkdir(dirname(outputPath), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => globalThis.document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div style="width:100%;font-size:8px;color:#6E8098;text-align:center">Courtwork 虚构样板案 · 生成物</div>',
      footerTemplate: '<div style="width:100%;font-size:8px;color:#6E8098;text-align:center">由 packages/demo-data/scripts/generate-contract-pdf.mjs 生成 · 第 <span class="pageNumber"></span> / <span class="totalPages"></span> 页</div>',
      margin: { top: '18mm', right: '22mm', bottom: '20mm', left: '22mm' },
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}

const outputArgIndex = process.argv.indexOf('--output');
const outputPath = outputArgIndex >= 0
  ? resolve(process.cwd(), process.argv[outputArgIndex + 1] ?? '')
  : defaultOutputPath;

if (outputArgIndex >= 0 && !process.argv[outputArgIndex + 1]) {
  throw new Error('--output 必须提供目标路径');
}

await generate(outputPath);
process.stdout.write(`已生成 ${outputPath}\n`);
