import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

import { checkBrandLineage, checkColorGrammar, checkDemoMotion, checkDisplayFont, checkFontProvenance, checkMaturityClaims, checkP3Evidence, checkP5DataStatic, checkP5FontCoverage, checkSchemaParts, checkSourceHashes, checkThemeBoundary, measureWoff2, partitionByRole, scanSources } from './deslop-scan-lib.mjs';
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
// 品牌记号谱系（P1 回炉）：site 小记号是壳侧 512 master 的登记变体，几何比例从 master 现算，
// 不再锁死字面路径——锁字面只是把硬编码换个位置，master 一改变体照样能悄悄脱钩。
if (!/viewBox="0 0 24 24"/.test(icon)) failures.push('site/assets/icon.svg: wordmark variant must stay on the 24 grid');
if (/<rect[^>]*\brx="1[0-9][0-9]"/.test(icon) || /<(?:circle|ellipse|polygon)\b/.test(icon)) {
  failures.push('site/assets/icon.svg: wordmark takes the core geometry only — no plate, no new primitives');
}
for (const failure of checkBrandLineage({
  master: readFileSync(resolve('docs/design/icon-light.svg'), 'utf8'),
  variant: icon,
})) {
  failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
}
// og 卡的记号必须是同一枚 SVG 的单源消费，不得手写 CSS 复刻（复刻＝第二份几何真源）。
if (!/<img[^>]*src="assets\/icon\.svg"[^>]*class="mark-art"|<img[^>]*class="mark-art"[^>]*src="assets\/icon\.svg"/.test(sources['site/og.html'])) {
  failures.push('site/og.html: brand mark must consume assets/icon.svg as a single source, not a hand-drawn CSS replica');
}

const firstRisk = riskFixture.risks?.[0];
const sourceAnchor = firstRisk?.basis?.[0]?.sourceAnchors?.[0];
// 定位器容许 blockquote 带属性（文书轨 zh-doc 上身后必然带类）——放宽的只是**定位**，
// 逐字核验仍在下一行：捕获串必须是 fixture 锚点引语的逐字切片，断言强度未变。
const displayedQuote = html.match(/data-stage="quote"[\s\S]*?<blockquote[^>]*>“?([^<”]+)”?<\/blockquote>/)?.[1];
if (sourceAnchor?.fileId !== '04-设备采购合同.md' || !contractFixture.includes(sourceAnchor?.quote ?? '')) failures.push('site: Evidence Line source anchor is not backed by the dossier fixture');
if (!displayedQuote || !sourceAnchor.quote.includes(displayedQuote)) failures.push('site/index.html: displayed quote is not a verbatim slice of the fixture anchor');
if (!html.includes(sourceAnchor.quote) || !html.includes('04-设备采购合同 · 第 1 页')) failures.push('site/index.html: original node does not identify the fixture source and quote');
if (firstRisk?.level !== 'high' || firstRisk?.dispositionStatus !== 'pending' || !html.includes('高风险 · 依据已核验') || !html.includes('待确认 · 不自动送出')) failures.push('site/index.html: conclusion and confirmation states drift from the fixture');
for (const failure of validateFixtureClaims(html, loadFixtureClaimInputs(resolve('.')))) {
  failures.push(`site: fixture claim ${failure}`);
}
const sha256 = (path) => createHash('sha256').update(readFileSync(resolve(path))).digest('hex');
for (const failure of checkThemeBoundary(readFileSync(resolve('apps/desktop/src/styles.css'), 'utf8'))) {
  failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
}
const p3Directory = 'site/craft-evidence/SKIN-R2-P3';
for (const failure of checkP3Evidence({
  measurements: JSON.parse(readFileSync(resolve(p3Directory, 'hanging-measurements.json'), 'utf8')),
  ink: JSON.parse(readFileSync(resolve(p3Directory, 'ink-ab-measurements.json'), 'utf8')),
  digests: Object.fromEntries([
    ['fixtureHtml', 'hanging-fixture.html'],
    ['fixtureCss', 'hanging-fixture.css'],
    ['fixtureJs', 'hanging-fixture.js'],
    ['tauriConfig', 'tauri-evidence.conf.json'],
    ['comparisonFrame', 'tauri-wkwebview-hanging-1280x720.png'],
    ['measurementsFrame', 'tauri-wkwebview-hanging-measurements-1280x720.png'],
    ['measurementsRecord', 'hanging-measurements.json'],
    ['inkAFrame', 'ink-a-clean.png'],
    ['inkBFrame', 'ink-b-bleed.png'],
    ['inkRecord', 'ink-ab-measurements.json'],
  ].map(([key, file]) => [key, sha256(`${p3Directory}/${file}`)])),
})) {
  failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
}
const p5Manifest = JSON.parse(readFileSync(resolve('site/assets/fonts/manuscript-latin-subset.json'), 'utf8'));
const p5Metrics = measureWoff2(readFileSync(resolve('site/assets/fonts/manuscript-latin-subset.woff2')));
for (const failure of checkP5FontCoverage({
  html,
  css,
  ogHtml: sources['site/og.html'],
  manifest: p5Manifest,
  sourceRecord: readFileSync(resolve('site/craft-evidence/SKIN-R2-P5/junicode/SOURCE.md'), 'utf8'),
  licenseSha256: sha256('site/craft-evidence/SKIN-R2-P5/junicode/LICENSE.txt'),
  woff2Sha256: sha256('site/assets/fonts/manuscript-latin-subset.woff2'),
  woff2Metrics: { bytes: p5Metrics.bytes, cmapCodepoints: p5Metrics.chars, glyphs: p5Metrics.glyphs },
})) {
  failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
}
for (const failure of checkP5DataStatic({
  html,
  css,
  expectedMono: 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
  expected: {
    'data-fixture-count:dossier-materials': '20',
    'data-fixture-count:timeline-events': '47',
    'data-fixture-count:party-nodes': '14',
    'data-fixture-count:contradiction-events': '8',
    'data-pm-clause': '所有成员都能编辑路线图，但路线图只有负责人可以修改。',
    'data-pm-defect-label': '冲突需求',
    'data-pm-suggestion': '区分评论、提议和正式修改，并给出唯一权限矩阵。',
    'data-pm-disposition': '待确认',
  },
})) {
  failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
}
const notoManifest = JSON.parse(readFileSync(resolve('site/assets/fonts/noto-subset.json'), 'utf8'));
// 三轨字体制：文书轨（朱雀，zh-display + zh-doc）与标题轨（Noto 双字重，h1/h2/h3）各自三向绑定。
const fontTracks = [
  {
    manifest: JSON.parse(readFileSync(resolve('site/assets/fonts/zhuque-subset.json'), 'utf8')),
    woff2Sha256: sha256('site/assets/fonts/zhuque-fangsong-subset.woff2'),
    consumerClasses: ['zh-display', 'zh-doc'],
    manifestPath: 'site/assets/fonts/zhuque-subset.json',
    faceFamily: 'Zhuque Fangsong',
    faceFiles: ['assets/fonts/zhuque-fangsong-subset.woff2'],
    tokenRule: { selector: '\\.zh-display', token: '--display' },
  },
  // 标题轨双字重共用一份清单与一枚 family；两枚字节各自锚定（下方逐权重复核）。
  {
    manifest: { ...notoManifest, woff2Sha256: notoManifest.weights['400'].woff2Sha256 },
    woff2Sha256: sha256('site/assets/fonts/noto-serif-sc-regular-subset.woff2'),
    consumerClasses: ['zh-title'],
    manifestPath: 'site/assets/fonts/noto-subset.json',
    faceFamily: 'Noto Serif SC',
    faceFiles: ['assets/fonts/noto-serif-sc-regular-subset.woff2', 'assets/fonts/noto-serif-sc-bold-subset.woff2'],
    tokenRule: { selector: '\\.zh-title', token: '--font-title' },
  },
];
for (const track of fontTracks) {
  for (const failure of checkDisplayFont({ html, css, ...track })) {
    failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
  }
}
// 标题轨 Bold 字节单独锚定（清单 weights.700），否则换了 Bold 子集不会被发现。
if (sha256('site/assets/fonts/noto-serif-sc-bold-subset.woff2') !== notoManifest.weights['700'].woff2Sha256) {
  failures.push('[display-font] site/assets/fonts/noto-subset.json:1 bold subset bytes drifted from weights.700 anchor');
}
// 出处链：每一枚入库子集的实测字节都必须在其 SOURCE.md 里逐字登记（按族铺满，不留裸奔的一侧）。
// SHA 只锚内容不锚声称，故字节/glyph/字数三个人读数字各自对实测（glyph 由 woff2 直读，
// 字数对清单 text 长度）——权威记录里的可解析数字都要有机器对应。
const provenanceOf = (path) => { try { return readFileSync(resolve(path), 'utf8'); } catch { return ''; } };
// 三个数字全部从**制品自身**量出（字节=文件长度 / glyph=maxp / 字数=cmap 映射码位），
// 不取自清单——取自清单只是把抄写链拉长一环，谎照样过门。
const artifact = (file) => ({
  file,
  sha256: sha256(`site/assets/fonts/${file}`),
  ...measureWoff2(readFileSync(resolve(`site/assets/fonts/${file}`))),
});
for (const failure of checkFontProvenance([
  {
    sourcePath: 'site/craft-evidence/SITE-CRAFT-2/zhuque/SOURCE.md',
    source: provenanceOf('site/craft-evidence/SITE-CRAFT-2/zhuque/SOURCE.md'),
    artifacts: [artifact('zhuque-fangsong-subset.woff2'), artifact('doc-latin-subset.woff2')],
  },
  {
    sourcePath: 'site/craft-evidence/SITE-CRAFT-2/noto/SOURCE.md',
    source: provenanceOf('site/craft-evidence/SITE-CRAFT-2/noto/SOURCE.md'),
    artifacts: [artifact('noto-serif-sc-regular-subset.woff2'), artifact('noto-serif-sc-bold-subset.woff2')],
  },
])) {
  failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
}
for (const failure of checkDemoMotion(css)) {
  failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
}
for (const failure of checkColorGrammar(css)) {
  failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
}
for (const failure of checkSchemaParts(html)) {
  failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
}
// 成熟度断言黑名单（R-12）：扫全部对外文件——四份站面件 + 仓库门面 README。
// og.html 必须在内：它是本轮唯一越界面，且从不发布（只经 og.png 抵达读者），
// 无门看着就没有第二双眼睛。
const outwardFacing = { ...sources, 'README.md': readFileSync(resolve('README.md'), 'utf8') };
for (const failure of checkMaturityClaims(outwardFacing)) {
  failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
}

// 参考件落仓校验（R-14）。同时产出「证据实物面」清单，供下方按角色分面使用。
const sourceHashesPath = 'site/craft-evidence/VERSIONAL-LANG-1/SOURCE-HASHES.json';
const sourceHashes = JSON.parse(readFileSync(resolve(sourceHashesPath), 'utf8'));
const sha256Of = (file) => {
  try {
    return createHash('sha256').update(readFileSync(resolve(file))).digest('hex');
  } catch {
    return undefined;
  }
};
const crossReferenceContents = Object.fromEntries(
  (sourceHashes.crossReferences ?? []).flatMap((reference) => {
    try {
      return [[reference, readFileSync(resolve(reference), 'utf8')]];
    } catch {
      return [];
    }
  }),
);
for (const failure of checkSourceHashes({
  manifest: sourceHashes,
  manifestPath: sourceHashesPath,
  artifactSha256: sha256Of,
  crossReferenceContents,
})) {
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

// ── 按角色分面（R-14 拍板：不再加目录黑名单）────────────────────────────────
//
// 两类文件的正确性条件不同，用同一套规则是范畴错误：
//   **产品面**（站面、壳、包、文档）——我们著作、我们发布，故受全规则约束：色值必须是
//     tokens 精确消费者、禁营销腔、禁裸 hex……
//   **证据实物面**（外部原型、采集帧一类冻结件）——不是我们著作的，且**按定义不可编辑**：
//     它的正确性条件是「字节与登记的哈希相等」，不是「内容符合我们的设计法」。这两条
//     互斥——真把它改成 token 合规了，证据本身就毁了。
//
// 关键：**豁免由「已被哈希绑定」赚取，不由「住在某个目录」赚取**。清单来自
// SOURCE-HASHES.json 的 path 字段，而那些 path 刚被上面的 checkSourceHashes 逐位核过。
// 换言之——想进证据面，先接受哈希绑定；往 sources/ 里丢个文件不产生豁免，只产生一条红。
// 这样分面不是给扫描器开口子，是把「谁在管这个文件」讲清楚：产品面归内容规则管，
// 证据面归字节规则管，没有第三类「谁都不管」。
const { productSurface } = partitionByRole(
  collectActiveText(resolve('.')).map((file) => relative(resolve('.'), file)),
  sourceHashes,
);
const activeSources = productSurface.map((path) => ({ path, content: readFileSync(resolve(path), 'utf8') }));
for (const failure of scanSources(activeSources, { repository: true })) {
  failures.push(`[${failure.rule}] ${failure.file}:${failure.line} ${failure.message}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`deslop: PASS (${activeSources.length} active text files; archive excluded from scan roots)`);
