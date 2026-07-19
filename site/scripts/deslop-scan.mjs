import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

import { checkColorGrammar, checkDemoMotion, checkDisplayFont, scanSources } from './deslop-scan-lib.mjs';
import { loadFixtureClaimInputs, validateFixtureClaims } from './fixture-claims.mjs';

const files = ['site/index.html', 'site/styles.css', 'site/main.js', 'site/og.html'];
const sources = Object.fromEntries(files.map((file) => [file, readFileSync(resolve(file), 'utf8')]));
const icon = readFileSync(resolve('site/assets/icon.svg'), 'utf8');
const contractFixture = readFileSync(resolve('packages/demo-data/data/dossier/04-设备采购合同.md'), 'utf8');
const riskFixture = JSON.parse(readFileSync(resolve('packages/demo-data/data/artifacts/risk-list.json'), 'utf8'));
const failures = [];
const bannedCopy = ['赋能', '打造', '一站式', 'streamline', 'empower', 'supercharge', 'scroll to explore'];
const bannedVisual = ['linear-gradient', 'radial-gradient', 'conic-gradient', 'gradient-text', 'aurora', 'mesh-gradient', 'drop-shadow'];
const tailwindHex = ['#0f172a', '#111827', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#f9fafb'];

for (const [file, source] of Object.entries(sources)) {
  const lower = source.toLowerCase();
  for (const word of [...bannedCopy, ...bannedVisual, ...tailwindHex]) {
    if (lower.includes(word.toLowerCase())) failures.push(`${file}: banned tell ${word}`);
  }
  if (/\b(bg|text|border|from|via|to)-gray-\d{2,3}\b/.test(source)) failures.push(`${file}: Tailwind gray utility`);
  if (/#[0-9a-fA-F]{6}/.test(source) && !['site/styles.css', 'site/og.html'].includes(file)) failures.push(`${file}: raw hex outside token source`);
  if (/\b(?:TBD|TODO|BUILD_PENDING|待发布回填|发布前替换|v0\.1\.x)\b/.test(source)) failures.push(`${file}: unresolved release placeholder`);
  if (/archive\//i.test(source)) failures.push(`${file}: active site references archive`);
}

const html = sources['site/index.html'];
const css = sources['site/styles.css'];
for (const line of css.split('\n')) {
  if (/#[0-9a-fA-F]{6}/.test(line) && !/^\s*--[a-z-]+:\s*#[0-9a-fA-F]{6};\s*$/.test(line)) failures.push(`site/styles.css: raw hex outside :root token: ${line.trim()}`);
  const achromatic = line.match(/#([0-9a-fA-F]{2})\1\1\b/);
  if (achromatic && achromatic[0].toUpperCase() !== '#FFFFFF') failures.push(`site/styles.css: achromatic gray ${achromatic[0]}`);
  if (/box-shadow\s*:/i.test(line) && !/box-shadow\s*:\s*none\b/i.test(line)) failures.push(`site/styles.css: unauthorized shadow consumption: ${line.trim()}`);
}

const stageOrder = ['original', 'quote', 'conclusion', 'confirmation'];
let cursor = -1;
for (const stage of stageOrder) {
  const next = html.indexOf(`data-stage="${stage}"`);
  if (next <= cursor) failures.push(`site/index.html: evidence stage missing or out of order: ${stage}`);
  cursor = next;
}
if ((html.match(/class="mac-window/g) ?? []).length !== 1) failures.push('site/index.html: exactly one complete workbench window is allowed');
if (/scene-mark|>\s*0[1-9]\s*</i.test(html)) failures.push('site/index.html: placeholder section scaffolding is not allowed');
if (/trust-list|feature-card|card-grid/i.test(`${html}\n${css}`)) failures.push('site: card-grid trust/feature scaffolding is not allowed');
if (!/<a class="wordmark"[^>]*><img[^>]*><span>Courtwork<\/span><\/a>/.test(html)) failures.push('site/index.html: core mark must sit immediately left of Courtwork');
const releaseHref = html.match(/href="([^"]+\.dmg)"/i)?.[1];
const releaseSha = html.match(/data-release-sha[^>]*>([0-9a-f]{64})</i)?.[1];
if (html.includes('Download for macOS')) failures.push('site/index.html: macOS CTA must use the product language');
if (releaseHref) {
  if (!html.includes('下载 macOS 版') || !releaseSha) failures.push('site/index.html: published macOS CTA requires Chinese copy and a 64-character artifact SHA');
  if (html.includes('macOS 制品尚未发布')) failures.push('site/index.html: published and unpublished release states cannot coexist');
} else {
  if (!html.includes('macOS 制品尚未发布')) failures.push('site/index.html: missing macOS artifact must be stated explicitly');
  if (releaseSha || /releases\/(?:download|tag)\//i.test(html)) failures.push('site/index.html: unpublished macOS state must not expose an artifact SHA or release link');
}
if (!html.includes('原件') || !html.includes('引语') || !html.includes('人工确认')) failures.push('site/index.html: Evidence Line semantics are incomplete');
const settleSeal = html.match(/<svg class="settle-seal[\s\S]*?<\/svg>/)?.[0];
if (settleSeal && (settleSeal.replace(/<[^>]*>/g, '').replace(/\s/g, '') !== '不改原件' || !html.includes('<dt class="zh-display">不改原件</dt>'))) {
  failures.push('site/index.html: settle seal must mirror the first covenant 不改原件');
}
if (!/viewBox="0 0 24 24"/.test(icon) || /<(?:rect|circle|ellipse|polygon)\b/.test(icon)) failures.push('site/assets/icon.svg: wordmark mark must be core path geometry without a base');
if ((icon.match(/<path\b/g) ?? []).length !== 4) failures.push('site/assets/icon.svg: core brand geometry must contain four paths');
const brandPaths = [...icon.matchAll(/<path d="([^"]+)"\/>/g)].map((match) => match[1]);
if (JSON.stringify(brandPaths) !== JSON.stringify(['M8 5v14', 'M11.5 8H18', 'M11.5 12H18', 'M11.5 16h4'])) failures.push('site/assets/icon.svg: core brand geometry drifted from the line + long/long/short document motif');

const firstRisk = riskFixture.risks?.[0];
const sourceAnchor = firstRisk?.basis?.[0]?.sourceAnchors?.[0];
const displayedQuote = html.match(/data-stage="quote"[\s\S]*?<blockquote>“?([^<”]+)”?<\/blockquote>/)?.[1];
if (sourceAnchor?.fileId !== '04-设备采购合同.md' || !contractFixture.includes(sourceAnchor?.quote ?? '')) failures.push('site: Evidence Line source anchor is not backed by the dossier fixture');
if (!displayedQuote || !sourceAnchor.quote.includes(displayedQuote)) failures.push('site/index.html: displayed quote is not a verbatim slice of the fixture anchor');
if (!html.includes(sourceAnchor.quote) || !html.includes('04-设备采购合同 · 第 1 页')) failures.push('site/index.html: original node does not identify the fixture source and quote');
if (firstRisk?.level !== 'high' || firstRisk?.dispositionStatus !== 'pending' || !html.includes('高风险 · 依据已核验') || !html.includes('待确认 · 不自动送出')) failures.push('site/index.html: conclusion and confirmation states drift from the fixture');
for (const failure of validateFixtureClaims(html, loadFixtureClaimInputs(resolve('.')))) {
  failures.push(`site: fixture claim ${failure}`);
}
for (const failure of checkDisplayFont({
  html,
  css,
  manifest: JSON.parse(readFileSync(resolve('site/assets/fonts/zhuque-subset.json'), 'utf8')),
  woff2Sha256: createHash('sha256').update(readFileSync(resolve('site/assets/fonts/zhuque-fangsong-subset.woff2'))).digest('hex'),
})) {
  failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
}
for (const failure of checkDemoMotion(css)) {
  failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
}
for (const failure of checkColorGrammar(css)) {
  failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
}

// `.claude` 与 .git/node_modules 同类：工具目录，非仓内容。不排除时根遍历会扫到
// 陈旧 worktree 副本（如 .claude/worktrees/*/site/styles.css），其路径不在
// cssColorAllowlist 的 file|selector|property 键内，逐条误报为「非 tokens 精确消费者」
// ——本机既存 109 项红全部源于此，live tree 零失败（2026-07-19 拍板排除）。
const excludedDirectories = new Set([
  '.claude', '.git', 'archive', 'coverage', 'dist', 'node_modules', 'playwright-report',
  'site-dist', 'target', 'test-results',
]);
const activeExtensions = new Set(['.cjs', '.css', '.html', '.js', '.jsx', '.md', '.mjs', '.svg', '.ts', '.tsx']);
function collectActiveText(directory) {
  const collected = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) collected.push(...collectActiveText(target));
    } else if (activeExtensions.has(extname(entry.name))) {
      collected.push(target);
    }
  }
  return collected;
}

const activeSources = collectActiveText(resolve('.')).map((file) => ({
  path: relative(resolve('.'), file),
  content: readFileSync(file, 'utf8'),
}));
for (const failure of scanSources(activeSources, { repository: true })) {
  failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`deslop: PASS (${activeSources.length} active text files; archive excluded from scan roots)`);
