import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { checkBrandLineage, checkColorGrammar, checkDemoMotion, checkDisplayFont, checkFontProvenance, checkP5DataStatic, checkP5FontCoverage, checkSchemaParts, measureWoff2, scanSources } from './deslop-scan-lib.mjs';
import {
  loadFixtureClaimInputs,
  validateFixtureClaims,
} from './fixture-claims.mjs';

const source = (path, content) => ({ path, content });
const rules = (sources) => scanSources(sources).map((failure) => failure.rule);
const hex = (value) => `#${value}`;
const repoRoot = new URL('../../', import.meta.url);

const GOOD_FIXTURE_CLAIMS = String.raw`
<section data-site-generalization>
  <article data-runtime-state="accepted"><span>已验收工作链</span></article>
  <article>
    <strong data-fixture-count="dossier-materials">20</strong><span>份卷宗材料</span>
    <strong data-fixture-count="timeline-events">47</strong><span>个事件</span>
    <strong data-fixture-count="party-nodes">14</strong><span>个主体节点</span>
    <strong data-fixture-count="contradiction-events">8</strong><span>个矛盾事件</span>
  </article>
  <article data-pm-finding-id="prd-finding-05" data-pm-defect-type="conflicting-requirement" data-pm-status="pending" data-runtime-state="catalog">
    <blockquote data-pm-clause>所有成员都能编辑路线图，但路线图只有负责人可以修改。</blockquote>
    <span data-pm-defect-label>冲突需求</span>
    <p data-pm-suggestion>区分评论、提议和正式修改，并给出唯一权限矩阵。</p>
    <span data-pm-disposition>待确认</span>
    <small>Schema catalog preview / 尚未接通运行链</small>
  </article>
</section>
`;

const fixtureFailures = (html = GOOD_FIXTURE_CLAIMS, mutate = () => {}) => {
  const inputs = JSON.parse(JSON.stringify(loadFixtureClaimInputs(repoRoot)));
  mutate(inputs);
  return validateFixtureClaims(html, inputs);
};

const GOOD_SITE_MOTION = String.raw`
document.documentElement.classList.add('js');
const revealTargets = [...document.querySelectorAll('.evidence-step, [data-reveal]')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reduceMotion || !('IntersectionObserver' in window)) {
  revealTargets.forEach((target) => target.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.55 });
  revealTargets.forEach((target) => observer.observe(target));
}
`;

test('raw colors are tied to an exact token consumer, including icon audit', () => {
  assert.deepEqual(rules([source('apps/desktop/src/icons/icon-audit.css',
    ':root { color: #232b38; background: #f7f8fa; }\n.icon-audit-card { background: #fff; }')]), []);
  assert.ok(rules([source('apps/desktop/src/icons/icon-audit.css',
    '.icon-audit-card { color: #ff00ff; }')]).includes('raw-color'));
  assert.ok(rules([source('site/rogue.css', ':root { --rogue-neon: #ff00ff; }')]).includes('raw-color'));
  assert.ok(rules([source('site/rogue.js', `document.body.style.color = '${hex('123456')}';`)]).includes('raw-color'));
  assert.ok(rules([source('site/rogue.js', `document.body.style.setProperty('color', '${hex('123456')}');`)]).includes('raw-color'));
});

test('graph theme literals are exact token consumers, not a whole-file escape', () => {
  assert.deepEqual(rules([source('apps/desktop/src/workbench/graph-theme.ts',
    `export const graphTokens = { background: '${hex('FFFFFF')}', amber: '${hex('8F6420')}' } as const;`)]), []);
  assert.ok(rules([source('apps/desktop/src/workbench/graph-theme.ts',
    `export const graphTokens = { background: '${hex('ff00ff')}' } as const;`)]).includes('raw-color'));
});

test('shadow allowlist binds file, selector, property, and exact token value', () => {
  const good = source('apps/desktop/src/styles.css',
    '.case-rail.surface-float, .surface-card-raised, .rail-module, .scroll-latest-button, .attachment-chip { box-shadow: var(--elevation-shadow); }');
  assert.deepEqual(rules([good]), []);
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.feature-card { box-shadow: var(--elevation-shadow); }')]).includes('shadow'));
  assert.ok(rules([source('site/rogue.css',
    '.feature-card { box-shadow: 0 12px 30px rgba(0,0,0,.2); }')]).includes('shadow'));
});

test('8/12/16 radius values remain inside exact approved domains', () => {
  assert.deepEqual(rules([source('apps/desktop/src/styles.css',
    '.composer-shell { border-radius: 12px; }\n.rail-segment { border-radius: 8px; }')]), []);
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.feature-card { border-radius: 16px; }')]).includes('radius'));
  assert.ok(rules([source('site/rogue.css',
    '.feature-card { border-radius: 24px; }')]).includes('radius'));
});

test('gradient allowlist checks the complete value, including internal colors', () => {
  assert.deepEqual(rules([source('apps/desktop/src/styles.css',
    '.usage-ring { background: conic-gradient(var(--slate-graphic) var(--usage), var(--border) 0); }')]), []);
  assert.ok(rules([source('apps/desktop/src/icons/icon-audit.css',
    '.icon-audit figure > span { background-image: linear-gradient(#e3e9ef 1px, transparent 1px), linear-gradient(90deg, #e3e9ef 1px, transparent 1px); }')]).includes('raw-color'));
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.usage-ring { background: conic-gradient(#ff00ff, #00ff00); }')]).includes('gradient'));
  assert.ok(rules([source('site/rogue.css',
    '.hero { background: linear-gradient(red, blue); }')]).includes('gradient'));
});

test('L1 nesting detects default SurfaceCard, raised elevation, and static className expressions', () => {
  assert.ok(rules([source('apps/desktop/src/Nested.tsx',
    'export const Nested = () => <SurfaceCard><SurfaceCard /></SurfaceCard>;')]).includes('l1-nesting'));
  assert.ok(rules([source('apps/desktop/src/Nested.tsx',
    'export const Nested = () => <SurfaceCard elevation="raised"><div className={"surface-card-raised"} /></SurfaceCard>;')]).includes('l1-nesting'));
  assert.deepEqual(rules([source('apps/desktop/src/Siblings.tsx',
    'export const Siblings = () => <><SurfaceCard /><SurfaceCard elevation="raised" /></>;')]), []);
  assert.ok(rules([source('site/index.html',
    '<div class="mac-window"><section class="feature-card">nested</section></div>')]).includes('l1-nesting'));
});

test('archive references cover markdown, URL, fetch, import, require, and path consumers', () => {
  const archive = ['..', 'archive', 'legacy.json'].join('/');
  const directArchive = ['archive', 'legacy.json'].join('/');
  const archiveName = ['arch', 'ive'].join('');
  const cases = [
    source('docs/live.md', `[legacy](${archive})`),
    source('docs/direct-live.md', `[legacy](${directArchive})`),
    source('site/live.js', `fetch('${archive}')`),
    source('site/direct-live.js', `fetch('${directArchive}')`),
    source('site/live.js', `import data from '${archive}'`),
    source('site/direct-live.js', `import data from '${directArchive}'`),
    source('site/live.cjs', `require('${archive}')`),
    source('site/direct-live.cjs', `require('${directArchive}')`),
    source('site/live.js', `new URL('${archive}', import.meta.url)`),
    source('site/direct-live.js', `new URL('${directArchive}', import.meta.url)`),
    source('site/direct-live.html', `<a href="${directArchive}">legacy</a><img src="${directArchive}">`),
    source('site/live.mjs', `readFile(path.resolve('${archiveName}', 'legacy.json'))`),
  ];
  for (const fixture of cases) assert.ok(rules([fixture]).includes('archive-reference'), fixture.content);
  assert.deepEqual(rules([source('docs/policy.md', '历史材料只在 `archive/`，现行文档不得引用归档内容。')]), []);
});

test('site motion is an exact observer/reduced-motion AST shape', () => {
  assert.deepEqual(rules([source('site/main.js', GOOD_SITE_MOTION)]), []);
  assert.ok(rules([source('site/main.js', `${GOOD_SITE_MOTION}\nrequestAnimationFrame(() => confetti());`)]).includes('site-motion'));
  assert.ok(rules([source('site/main.js', GOOD_SITE_MOTION.replace('entry.target', 'document.body'))]).includes('site-motion'));
  assert.ok(rules([source('site/main.js', GOOD_SITE_MOTION.replace('observer.unobserve(entry.target);', 'entry.target.animate([], {});'))]).includes('site-motion'));
  // SITE-CRAFT-1: the broadened reveal selector and the JS-off progressive-enhancement flag are part of the locked shape.
  assert.ok(rules([source('site/main.js', GOOD_SITE_MOTION.replace(', [data-reveal]', ''))]).includes('site-motion'));
  assert.ok(rules([source('site/main.js', GOOD_SITE_MOTION.replace("document.documentElement.classList.add('js');\n", ''))]).includes('site-motion'));
});

test('SITE-CRAFT-1 reduced Ghosty uses a real opacity keyframe without phantom transitions', () => {
  const styles = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const reducedGhostyContract = String.raw`@keyframes ghosty-reduced-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .js .work-crop[data-reveal] img {
    -webkit-mask-image: none;
    mask-image: none;
    opacity: 0;
    transition: none;
  }
  .js .work-crop[data-reveal].is-visible img {
    animation: ghosty-reduced-fade 420ms var(--ease-out) both;
  }
}`;

  assert.ok(styles.includes(reducedGhostyContract), 'reduced Ghosty CSS contract drifted');
});

test('press feedback is restricted, tactile, keyboard-visible, and reduced-motion safe', () => {
  const good = source('apps/desktop/src/styles.css', String.raw`
:root { --motion-press: 120ms; }
button:focus-visible { outline: 2px solid var(--blue-graphic); }
:is(.primary-button, .scene-primary, .continuation-button, .question-option, .composer-send, .composer-icon-button, .icon-button, .copy-button, .case-archive-button, .window-chrome-button, .collapse-right-button, .rail-seam-toggle, .workspace-edge-control, .model-config-trigger, .shortcut-trigger):active:not(:focus-visible):not(:disabled):not(.is-disabled-feature) { transform: scale(.98); transition-duration: var(--motion-press); }
@media (prefers-reduced-motion: reduce) { :is(.primary-button, .scene-primary, .continuation-button, .question-option, .composer-send, .composer-icon-button, .icon-button, .copy-button, .case-archive-button, .window-chrome-button, .collapse-right-button, .rail-seam-toggle, .workspace-edge-control, .model-config-trigger, .shortcut-trigger):active:not(:focus-visible):not(:disabled):not(.is-disabled-feature) { transform: none; } }
`);
  assert.deepEqual(rules([good]), []);
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.data-row:active { transform: scale(.98); transition-duration: 120ms; }')]).includes('press-feedback'));
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.primary-button:active { transform: scale(.9); transition-duration: 300ms; }')]).includes('press-feedback'));
});

test('popover motion is tied to direction and has a reduced-motion branch', () => {
  const good = source('apps/desktop/src/styles.css', String.raw`
.case-card .archive-popover { animation: popover-from-top var(--motion-overlay) var(--motion-overlay-ease) both; transform-origin: top right; }
@keyframes popover-from-top { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .case-card .archive-popover { animation: none; transform: none; } }
`);
  assert.deepEqual(rules([good]), []);
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.archive-popover { animation: spin 2s linear infinite; }')]).includes('popover-motion'));
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.popover { animation: popover-from-top 120ms ease-out both; transform-origin: top left; }')]).includes('popover-motion'));
  assert.ok(rules([source('apps/desktop/src/styles.css',
    '.cell-peek { animation: popover-from-top 120ms ease-out both; transform-origin: top left; }')]).includes('popover-motion'));
});

test('placeholder scaffolding and generic marketing copy remain red', () => {
  assert.ok(rules([source('site/index.html', '<section><b>01</b><p>Q</p></section>')]).includes('placeholder-scaffold'));
  assert.ok(rules([source('site/index.html', '<p>一站式赋能，打造革命性体验。</p>')]).includes('generic-copy'));
});

test('Pages deploy executes the complete root guard instead of the scanner alone', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/pages.yml', import.meta.url), 'utf8');
  assert.match(workflow, /run:\s*pnpm site:guard/);
  assert.doesNotMatch(workflow, /run:\s*node site\/scripts\/deslop-scan\.mjs/);
});

const GOOD_DISPLAY_MANIFEST = {
  family: 'Zhuque Fangsong (technical preview)',
  upstreamVersion: '0.212',
  license: 'SIL OFL 1.1',
  text: '模型只生成，不裁决。',
  woff2Sha256: 'a'.repeat(64),
};
// 好例刻意在消费者之后放清单外文案：门只约束 zh-display 消费者，不得把整页吞进覆盖检查。
const GOOD_DISPLAY_HTML = '<h1 class="zh-display"><span class="tc">模</span>型只生成，<br>不裁决。</h1><p>页面其余文案与清单无关，含漂移二字也不触红。</p>';
const GOOD_DISPLAY_CSS = [
  '@font-face { font-family: "Zhuque Fangsong"; src: url(assets/fonts/zhuque-fangsong-subset.woff2) format("woff2"); font-display: swap; }',
  ':root { --display: "Zhuque Fangsong", "STFangsong", "FangSong", "Noto Serif SC", serif; }',
  '.zh-display { font-family: var(--display); font-weight: 400; font-synthesis: none; }',
].join('\n');
const displayRules = (overrides = {}) => checkDisplayFont({
  html: GOOD_DISPLAY_HTML,
  css: GOOD_DISPLAY_CSS,
  manifest: GOOD_DISPLAY_MANIFEST,
  woff2Sha256: GOOD_DISPLAY_MANIFEST.woff2Sha256,
  ...overrides,
}).map((failure) => failure.rule);

test('SITE-CRAFT-2 display font subset binds manifest text, bytes, and consumers fail-closed', () => {
  assert.deepEqual(displayRules(), []);
  // 文案新增字未进子集清单 → 缺字静默回退必须触红。
  assert.ok(displayRules({ html: GOOD_DISPLAY_HTML.replace('不裁决。', '不裁决与漂移。') }).includes('display-font'));
  // 清单与 woff2 字节脱钩（改清单不重子集）→ 触红。
  assert.ok(displayRules({ woff2Sha256: 'b'.repeat(64) }).includes('display-font'));
  // 字体资产零消费者 → 死资产触红。
  assert.ok(displayRules({ html: '<h1>模型只生成，不裁决。</h1>' }).includes('display-font'));
  // CSS 未接 @font-face 或 .zh-display 未消费 --display → 消费者静默回退系统字 → 触红。
  assert.ok(displayRules({ css: '.zh-display { font-weight: 400; }' }).includes('display-font'));
  assert.ok(displayRules({ css: GOOD_DISPLAY_CSS.replace('font-family: var(--display);', '') }).includes('display-font'));
});

const GOOD_DEMO_CSS = String.raw`
.schema-demo mark { border-bottom: 1px solid color-mix(in srgb, var(--focus) 45%, transparent); }
@keyframes demo-attn-a { 0%, 4% { background-color: transparent; border-color: var(--border-hairline); } 6%, 30% { background-color: color-mix(in srgb, var(--ink) 6%, transparent); border-color: var(--ink); } 32%, 100% { background-color: transparent; border-color: var(--border-hairline); } }
@keyframes demo-anchor-a { 0%, 4% { background-color: transparent; } 6%, 30% { background-color: color-mix(in srgb, var(--focus) 15%, transparent); } 32%, 100% { background-color: transparent; } }
@media (prefers-reduced-motion: reduce) {
  .schema-demo * { animation: none; }
}
`;

// P0 驳回判例：**分支在场 ≠ 分支胜出**。旧门只查 reduce 分支字面串在不在，
// 而更高特异性的消费点会把它压掉——覆盖类断言必须解析层叠，不能查字面。
const REDUCE_DEMO_CSS = String.raw`
.demo-basis { animation: demo-attn-a 12s linear infinite; }
.demo-actions span { animation: demo-zhu-b 12s linear infinite; }
@keyframes demo-attn-a { 5% { background-color: transparent; } }
@keyframes demo-zhu-b { 38% { border-color: transparent; } }
@media (prefers-reduced-motion: reduce) {
  .schema-demo *, .schema-demo *::before, .schema-demo *::after { animation: none !important; }
}
`;
const demoRules = (css) => checkDemoMotion(css).map((failure) => failure.rule);

test('SITE-CRAFT-2 reduced-motion assertion resolves the cascade, not literal presence', () => {
  assert.deepEqual(demoRules(REDUCE_DEMO_CSS), []);
  // 分支在场但特异性输给 `.demo-actions span`(0,1,1) → 旧门全绿、新门触红（这正是 P0 缺陷本体）。
  const outranked = REDUCE_DEMO_CSS.replace(
    '.schema-demo *, .schema-demo *::before, .schema-demo *::after { animation: none !important; }',
    '.schema-demo * { animation: none; }');
  assert.ok(/\.schema-demo \* \{ animation: none; \}/.test(outranked), '反例里 reduce 分支确实字面在场');
  assert.ok(demoRules(outranked).includes('demo-motion'));
  // 同特异性时后写者胜，`.demo-basis`(0,1,0) 不应被误报——门要精确，不能一律喊红。
  assert.ok(!checkDemoMotion(outranked).some((f) => f.message.includes('.demo-basis')));
  // reduce 分支整块缺席 → 触红。
  assert.ok(demoRules(REDUCE_DEMO_CSS.replace(/@media \(prefers-reduced-motion: reduce\)[\s\S]*$/, '')).includes('demo-motion'));
});

// P1 驳回判例：manifest 有「清单↔字节」双锚而出处记录裸奔＝族内漏铺；立门要以族为单位铺满。
test('SITE-CRAFT-2 font provenance keeps SOURCE.md anchored to the built bytes', () => {
  const record = (source) => [{ sourcePath: 'zhuque/SOURCE.md', source,
    artifacts: [{ file: 'a.woff2', sha256: 'a'.repeat(64) }, { file: 'b.woff2', sha256: 'b'.repeat(64) }] }];
  const provRules = (source) => checkFontProvenance(record(source)).map((failure) => failure.rule);
  assert.deepEqual(provRules(`a.woff2 ${'a'.repeat(64)} b.woff2 ${'b'.repeat(64)}`), []);
  // 子集扩容而 SOURCE.md 未随动（P1 缺陷本体）→ 触红。
  assert.ok(provRules(`a.woff2 ${'c'.repeat(64)} b.woff2 ${'b'.repeat(64)}`).includes('font-provenance'));
  // 新制品根本没进出处记录 → 触红。
  assert.ok(provRules(`a.woff2 ${'a'.repeat(64)}`).includes('font-provenance'));
  // 出处记录整块缺席 → 触红。
  assert.ok(provRules('').includes('font-provenance'));
});

// 二轮驳回判例：**SHA 只锚内容，不锚声称**。制品换一字节 SHA 必变，但制品链中的 glyph/byte 声称
// 这类人读数字可以在 SHA 全对的前提下静默撒谎（同族于 B2-0 的 SPEC 记 6,205KB 而实物 8,137KB）。
// 故权威记录里的**可解析数字都要有各自的机器对应**——三个数字全部从制品自身量出。
test('SITE-CRAFT-2 woff2 measurement reads bytes, glyphs and codepoints from the artifact', () => {
  const buffer = readFileSync(new URL('site/assets/fonts/zhuque-fangsong-subset.woff2', repoRoot));
  const measured = measureWoff2(buffer);
  assert.equal(measured.bytes, buffer.length);
  // 与 fontTools 独立实现互校过的定值（文书轨子集）。
  assert.equal(measured.glyphs, 439);
  assert.equal(measured.chars, 348);
  assert.throws(() => measureWoff2(Buffer.from('not a font at all!!')), /not a woff2/);
});

test('SITE-CRAFT-2 provenance numbers are measured contracts, not narrative', () => {
  const measured = { file: 'a.woff2', sha256: 'a'.repeat(64), bytes: 33036, glyphs: 128, chars: 104 };
  const row = (text) => [{ sourcePath: 'zhuque/SOURCE.md', source: `| a.woff2 | ${text} | \`${'a'.repeat(64)}\` |`, artifacts: [measured] }];
  const provRules = (text) => checkFontProvenance(row(text)).map((failure) => failure.rule);
  assert.deepEqual(provRules('104 字 / 128 glyphs / 33,036 bytes'), []);
  // 三向：任一人读数字与实测不符即红——SHA 全对也拦不住的那一类谎。
  assert.ok(provRules('104 字 / 128 glyphs / 33,037 bytes').includes('font-provenance'));
  assert.ok(provRules('104 字 / 127 glyphs / 33,036 bytes').includes('font-provenance'));
  assert.ok(provRules('105 字 / 128 glyphs / 33,036 bytes').includes('font-provenance'));
  // 千分位写法必须照样解析，否则门会被格式差异绕过。
  assert.deepEqual(provRules('104 字 / 128 glyphs / 33036 bytes'), []);
  // 逃逸口：把数字整个删掉而不是改对——「没有数字」不等于「没有谎」，同样触红。
  assert.ok(provRules('入库子集').includes('font-provenance'));
});

// P1 驳回判例：「一致性闭合」的口径是几何 + 单源，只换描边色不算闭合；
// 且门不能锁死字面几何——那只是把硬编码换个位置，须从 master 现算比例。
const MASTER_SVG = String.raw`<svg viewBox="0 0 512 512">
  <rect width="512" height="512" rx="116"/>
  <rect x="148" y="124" width="56" height="264" rx="10"/>
  <rect x="252" y="140" width="140" height="48" rx="14"/>
  <rect x="252" y="232" width="140" height="48" rx="14"/>
  <rect x="252" y="324" width="96" height="48" rx="14"/>
</svg>`;
const lineageRules = (variant, master = MASTER_SVG) =>
  checkBrandLineage({ master, variant }).map((failure) => failure.rule);

test('SITE-CRAFT-2 site brand mark is a registered variant re-derived from the master', () => {
  const variant = readFileSync(new URL('site/assets/icon.svg', repoRoot), 'utf8');
  assert.deepEqual(lineageRules(variant), []);
  // 旧线标重上色（P1③ 缺陷本体）：零 rect，不是 5/6-rect 体系的变体 → 触红。
  assert.ok(lineageRules('<svg viewBox="0 0 24 24"><g stroke="#E4E9F1"><path d="M8 5v14"/></g></svg>').includes('brand-lineage'));
  // 比例脱钩：文书行三拉成等宽，长/长/短母题丢失 → 触红。
  assert.ok(lineageRules(variant.replace('width="5" height="2.5"', 'width="7.5" height="2.5"')).includes('brand-lineage'));
  // 单源真绑定：master 改了而变体不跟 → 触红（证明不是又一处硬编码）。
  assert.ok(lineageRules(variant, MASTER_SVG.replace('width="96"', 'width="140"')).includes('brand-lineage'));
});

test('SITE-CRAFT-2 hero demo keyframes stay inside the attention property whitelist', () => {
  assert.deepEqual(checkDemoMotion(GOOD_DEMO_CSS).map((failure) => failure.rule), []);
  // 演示 keyframe 混入位移/变形/遮罩 → 数据区静止承诺破口，必须触红。
  assert.ok(checkDemoMotion(GOOD_DEMO_CSS.replace('background-color: color-mix(in srgb, var(--ink) 6%, transparent);', 'transform: translateY(-2px);'))
    .map((failure) => failure.rule).includes('demo-motion'));
  assert.ok(checkDemoMotion(GOOD_DEMO_CSS.replace('background-color: color-mix(in srgb, var(--focus) 15%, transparent);', 'mask-position: 0 0;'))
    .map((failure) => failure.rule).includes('demo-motion'));
  // reduced-motion 全灭分支被删 → 触红。
  assert.ok(checkDemoMotion(GOOD_DEMO_CSS.replace('.schema-demo * { animation: none; }', ''))
    .map((failure) => failure.rule).includes('demo-motion'));
});

// SITE-CRAFT-2 磁青宗批：色彩语法四位的反例集。好例即站面真形状——朱两处、泥金一处 + 其显影 keyframe。
const GOOD_GRAMMAR_CSS = String.raw`
:root { --zhu-graphic: #D75A3C; --gold: #D9AE6A; }
.tc { color: var(--gold); }
.settle-seal { color: var(--zhu-graphic); }
.demo-actions span { border: 1px solid var(--border-strong); color: var(--text-primary); animation: demo-zhu-b 12s linear infinite; }
@keyframes demo-zhu-b { 0%, 35% { border-color: var(--border-strong); } 38%, 60% { border-color: var(--zhu-graphic); } 63%, 100% { border-color: var(--border-strong); } }
@keyframes typer-develop { 40% { background-color: var(--gold); } }
@keyframes demo-attn-a { 5% { background-color: color-mix(in srgb, var(--text-primary) 6%, transparent); } }
`;
const grammarRules = (css) => checkColorGrammar(css).map((failure) => failure.rule);

test('SITE-CRAFT-2 colour grammar keeps 朱 on adjudication and 泥金 in the hero', () => {
  assert.deepEqual(grammarRules(GOOD_GRAMMAR_CSS), []);
  // 朱漫出裁决面（当成普通强调色用）→ 「彩色只在人做决定处出现」破口，触红。
  assert.ok(grammarRules(`${GOOD_GRAMMAR_CSS}\n.hero-lead { color: var(--zhu-fg); }`).includes('color-grammar'));
  // 泥金离开 hero（当成第二强调色铺开）→ 「唯一强调」破口，触红。
  assert.ok(grammarRules(`${GOOD_GRAMMAR_CSS}\n.promise-ledger dt { color: var(--gold); }`).includes('color-grammar'));
  // 动效层是声明层之外的逃逸通道：keyframe 里夹带同样触红。
  assert.ok(grammarRules(GOOD_GRAMMAR_CSS.replace('background-color: color-mix(in srgb, var(--text-primary) 6%, transparent);', 'background-color: var(--gold);')).includes('color-grammar'));
  assert.ok(grammarRules(`${GOOD_GRAMMAR_CSS}\n@keyframes seal-pulse { to { color: var(--zhu-graphic); } }`).includes('color-grammar'));
  // 白名单不许烂掉：登记了却零消费＝允许面虚增，同样触红。
  assert.ok(grammarRules(GOOD_GRAMMAR_CSS.replace('.settle-seal { color: var(--zhu-graphic); }', '')).includes('color-grammar'));
  assert.ok(grammarRules(GOOD_GRAMMAR_CSS.replace('.tc { color: var(--gold); }', '')).includes('color-grammar'));
});

// 架构定谳：朱＝人工裁决之痕，**不作环境色**——描边只在人工处置那一幕现形（与 line.settled
// 前向守卫同语义）。裁定若只写在文档里，下一次顺手把朱写回基态就恒亮了，故写成门。
test('SITE-CRAFT-2 朱 stays inside the adjudication frame instead of becoming ambient', () => {
  assert.deepEqual(grammarRules(GOOD_GRAMMAR_CSS), []);
  // 朱写回基态声明 → 恒亮＝环境色，帧边界落空，触红。
  assert.ok(grammarRules(GOOD_GRAMMAR_CSS.replace(
    '.demo-actions span { border: 1px solid var(--border-strong);',
    '.demo-actions span { border: 1px solid var(--zhu-graphic);')).includes('color-grammar'));
  // 帧 keyframe 声明了却没人跑 → 该面的朱整个消失，同样触红（双向守）。
  assert.ok(grammarRules(GOOD_GRAMMAR_CSS.replace('animation: demo-zhu-b 12s linear infinite; ', '')).includes('color-grammar'));
  // 朱借未登记的 keyframe 逃逸 → 触红。
  assert.ok(grammarRules(`${GOOD_GRAMMAR_CSS}\n@keyframes seal-pulse { to { border-color: var(--zhu-graphic); } }`).includes('color-grammar'));
});

test('SITE-CRAFT-2 site palette is bound to themes.dark by name, not by a frozen copy', () => {
  // 解冻后 site 的 :root 只有一份真源（tokens.json）。逐项反例：任一槽位漂离 themes.dark 即触红——
  // 这同时证明「按名绑定」是真绑定，不是碰巧值相等。
  const board = readFileSync(new URL('site/styles.css', repoRoot), 'utf8');
  assert.deepEqual(rules([source('site/styles.css', board)]), []);
  for (const [property, drifted] of [
    ['--bg-app', hex('0F1623')],
    ['--text-primary', hex('E4E9F0')],
    ['--border-focus', hex('6A94F0')],
    ['--zhu-graphic', hex('D75A3D')],
    ['--gold', hex('D9AE6B')],
  ]) {
    const mutated = board.replace(new RegExp(`(${property}: )#[0-9A-Fa-f]{6};`), `$1${drifted};`);
    assert.notEqual(mutated, board, `mutation probe failed to bite ${property}`);
    assert.ok(rules([source('site/styles.css', mutated)]).includes('raw-color'), `${property} drift went unnoticed`);
  }
  // 冻结表的到期指针已兑现。此处不复述退役值（SKIN-B1 判例三：退役值只可述比值不可复述色值）——
  // 上面的逐项 deepEqual 已是更强的证明：允许面只认 themes.dark，旧板任一枚值都无处落脚。
});

// SITE-CRAFT-2 磁青宗批：SchemaParts 三条解耦预留的反例集（回迁 R2 零重绘的机器可验形态）。
const GOOD_PARTS_HTML = String.raw`
<svg class="schema-parts" aria-hidden="true" hidden>
  <symbol id="mark-fishtail" viewBox="0 0 16 8"><path d="M0 0 L8 4 L16 0 Z" fill="currentColor"/></symbol>
  <symbol id="mark-rule" viewBox="0 0 5 24"><rect x="0" y="0" width="2" height="24" fill="currentColor"/></symbol>
</svg>
<p class="eyebrow"><svg class="mark mark-fishtail"><use href="#mark-fishtail"/></svg>卷一</p>
<div class="ruled"><svg class="mark mark-rule"><use href="#mark-rule"/></svg><blockquote>原句</blockquote></div>
`;
const partsRules = (html) => checkSchemaParts(html).map((failure) => failure.rule);

test('SITE-CRAFT-2 SchemaParts keeps the three decoupling reservations machine-checkable', () => {
  assert.deepEqual(partsRules(GOOD_PARTS_HTML), []);
  // 预留①单源：几何被抄成第二份（内联而非 <use>）→ 回迁必重画，触红。
  assert.ok(partsRules(`${GOOD_PARTS_HTML}\n<svg class="seam"><path d="M6 4v16"/></svg>`).includes('schema-parts'));
  // 预留②不带值：件里写死色值 → 件从此择纸温，触红。
  assert.ok(partsRules(GOOD_PARTS_HTML.replace('fill="currentColor"/></symbol>\n  <symbol id="mark-rule"', 'fill="#D75A3C"/></symbol>\n  <symbol id="mark-rule"')).includes('schema-parts'));
  // 预留③：件零消费者＝死件，回迁时白重画，触红。
  assert.ok(partsRules(GOOD_PARTS_HTML.replace('<svg class="mark mark-rule"><use href="#mark-rule"/></svg>', '')).includes('schema-parts'));
  // <use> 指向未声明的件 → 渲染静默为空，触红。
  assert.ok(partsRules(GOOD_PARTS_HTML.replace('href="#mark-rule"', 'href="#mark-ghost"')).includes('schema-parts'));
  // 件库整块缺席 → 记号无单源，触红。
  assert.ok(partsRules('<p>卷一</p>').includes('schema-parts'));
});

// 三轨字体制（字体策略二次修订）：一套 display-font 门守三枚子集，逐轨可配消费类与清单。
const GOOD_TITLE_HTML = String.raw`<h2 class="zh-title">判断条款风险</h2><h3 class="zh-title">逐字回到材料</h3>`;
const GOOD_TITLE_CSS = String.raw`
@font-face { font-family: "Noto Serif SC"; src: url(assets/fonts/noto-serif-sc-regular-subset.woff2) format("woff2"); font-weight: 400; font-display: swap; }
@font-face { font-family: "Noto Serif SC"; src: url(assets/fonts/noto-serif-sc-bold-subset.woff2) format("woff2"); font-weight: 700; font-display: swap; }
:root { --font-title: "Noto Serif SC", "Songti SC", serif; }
.zh-title { font-family: var(--font-title); font-synthesis: none; }
`;
const TITLE_TRACK = {
  manifest: { text: '判断条款风险逐字回到材料', woff2Sha256: 'c'.repeat(64) },
  woff2Sha256: 'c'.repeat(64),
  consumerClasses: ['zh-title'],
  manifestPath: 'site/assets/fonts/noto-subset.json',
  faceFamily: 'Noto Serif SC',
  faceFiles: ['assets/fonts/noto-serif-sc-regular-subset.woff2', 'assets/fonts/noto-serif-sc-bold-subset.woff2'],
  tokenRule: { selector: '\\.zh-title', token: '--font-title' },
};
const titleRules = (over = {}) => checkDisplayFont({ html: GOOD_TITLE_HTML, css: GOOD_TITLE_CSS, ...TITLE_TRACK, ...over })
  .map((failure) => failure.rule);

test('SITE-CRAFT-2 display-font gate guards the title track as well as the document track', () => {
  assert.deepEqual(titleRules(), []);
  // 标题文案新增字未进清单 → 缺字静默回退，触红。
  assert.ok(titleRules({ html: GOOD_TITLE_HTML.replace('判断条款风险', '判断条款风险鑫') }).includes('display-font'));
  // 双字重之一未接线（只加载了 Regular）→ 700 消费点静默回退，触红。
  assert.ok(titleRules({ css: GOOD_TITLE_CSS.replace(/^.*noto-serif-sc-bold-subset.*$/m, '') }).includes('display-font'));
  // 消费类未真的消费 --font-title → 整轨回退系统字，触红。
  assert.ok(titleRules({ css: GOOD_TITLE_CSS.replace('font-family: var(--font-title); ', '') }).includes('display-font'));
  // 清单与字节脱钩 → 触红。
  assert.ok(titleRules({ woff2Sha256: 'd'.repeat(64) }).includes('display-font'));
  // 页面零标题轨消费者 → 死资产，触红。
  assert.ok(titleRules({ html: '<h2>判断条款风险</h2>' }).includes('display-font'));
});

test('SITE-CRAFT-2 keeps titles in the Song track and editorial body copy in the Fangsong track', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  // 标题轨不能把 hero 或卷尾标题留在品牌仿宋例外；标题的字号再大也仍是标题。
  assert.match(html, /<h1 class="zh-title"/);
  assert.match(html, /<h2 class="zh-title">签字之前/);
  assert.doesNotMatch(html, /<h1 class="zh-display"/);
  // 站面叙事正文是文书轨，工具位（导航、按钮、元信息）仍由 --sans 承担。
  for (const selector of ['hero-lead', 'section-body', 'evidence-body', 'work-body', 'scenario-body', 'boundary-body', 'footer-body']) {
    assert.match(html, new RegExp(`class="[^"]*${selector}[^"]*zh-doc|class="[^"]*zh-doc[^"]*${selector}`));
  }
  assert.match(css, /\.zh-title \{ font-family: var\(--font-title\); font-synthesis: none; \}/);
  assert.match(css, /\.zh-doc \{ font-family: var\(--font-doc\); font-weight: 400; font-synthesis: none;/);
});

// 奖级工艺裁定「单点，不铺开」：裁定若只写在文档里就会被下一次顺手铺开，故写成门。
const GOOD_INK_HTML = String.raw`
<svg class="schema-parts" hidden>
  <symbol id="mark-rule" viewBox="0 0 5 24"><rect width="2" height="24" fill="currentColor"/></symbol>
  <filter id="ink-bleed"><feTurbulence baseFrequency="0.6"/><feDisplacementMap in="SourceGraphic" scale="1.7"/></filter>
</svg>
<svg class="mark mark-rule" filter="url(#ink-bleed)"><use href="#mark-rule"/></svg>
<svg class="mark mark-rule"><use href="#mark-rule"/></svg>
`;

test('SITE-CRAFT-2 ink-bleed stays a single-point experiment', () => {
  assert.deepEqual(partsRules(GOOD_INK_HTML), []);
  // 铺到第二处 → 裁定要拦的正是这一步，触红。
  assert.ok(partsRules(GOOD_INK_HTML.replace('<svg class="mark mark-rule"><use', '<svg class="mark mark-rule" filter="url(#ink-bleed)"><use')).includes('schema-parts'));
  // 零消费 → 死滤镜，触红。
  assert.ok(partsRules(GOOD_INK_HTML.replace(' filter="url(#ink-bleed)"', '')).includes('schema-parts'));
});

test('SITE-GEN fixture claims accept the authoritative Legal and PM snapshot', () => {
  assert.deepEqual(fixtureFailures(), []);
});

test('SITE-GEN rejects a 46-event page claim', () => {
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS.replace('>47</strong>', '>46</strong>')).some((failure) => failure.includes('timeline-events')));
});

test('SITE-GEN rejects a deleted contradiction marker', () => {
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS, (inputs) => {
    delete inputs.legal.timeline.events.find((event) => event.markers?.includes('contradiction')).markers;
  }).some((failure) => failure.includes('contradiction-events')));
});

test('SITE-GEN rejects a 15-party page claim', () => {
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS.replace('>14</strong>', '>15</strong>')).some((failure) => failure.includes('party-nodes')));
});

test('SITE-GEN requires the contradiction-event unit instead of claiming eight contradictions', () => {
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS.replace('个矛盾事件', '个矛盾')).some((failure) => failure.includes('矛盾事件')));
});

test('SITE-GEN rejects a PM UTF-16 anchor offset drift', () => {
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS, (inputs) => {
    inputs.pm.prdReview.findings.find((finding) => finding.id === 'prd-finding-05').sourceAnchors[0].textRange.start += 1;
  }).some((failure) => failure.includes('UTF-16')));
});

test('SITE-GEN rejects a confirmed PM fixture presented as pending', () => {
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS, (inputs) => {
    inputs.pm.prdReview.findings.find((finding) => finding.id === 'prd-finding-05').status = 'confirmed';
  }).some((failure) => failure.includes('pending')));
});

test('SITE-GEN rejects a live PM claim while the descriptor has no scenario', () => {
  const live = GOOD_FIXTURE_CLAIMS
    .replace('data-runtime-state="catalog"', 'data-runtime-state="live"')
    .replace('Schema catalog preview / 尚未接通运行链', 'Live / 已接通运行链');
  assert.ok(fixtureFailures(live).some((failure) => failure.includes('catalog')));
});

test('SITE-GEN rejects a PriorityScore fixture or score claim', () => {
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS, (inputs) => {
    inputs.pm.fixtureFiles.push('artifacts/priority-score.json');
  }).some((failure) => failure.includes('PriorityScore')));
  assert.ok(fixtureFailures(GOOD_FIXTURE_CLAIMS.replace('</section>', '<p>PriorityScore · RICE 排序</p></section>'))
    .some((failure) => failure.includes('PriorityScore')));
});

const GOOD_P5_MANIFEST = {
  schemaVersion: 'courtwork.font-subset.v1',
  family: 'Courtwork Manuscript Latin',
  upstream: 'Junicode',
  upstreamVersion: '2.226',
  license: 'SIL OFL 1.1',
  text: 'Courtwork',
  codepoints: ['U+0043', 'U+006B', 'U+006F', 'U+0072', 'U+0074', 'U+0075', 'U+0077'],
  glyphs: 8,
  woff2Sha256: 'a'.repeat(64),
  sourceWoff2Sha256: 'b'.repeat(64),
  releaseArchiveSha256: 'c'.repeat(64),
  oflSha256: 'd'.repeat(64),
};
const GOOD_P5_HTML = String.raw`
<a class="wordmark"><span>Courtwork</span></a>
<section class="promise-heading"><h2>有些事，<span class="latin-manuscript">Courtwork</span> 不做。</h2></section>
<section class="closing"><p class="eyebrow">卷尾 · <span class="latin-manuscript">Courtwork</span></p></section>
<blockquote class="zh-doc">原句不消费写本类。</blockquote>
<strong class="mono" data-fixture-count="dossier-materials">20</strong>`;
const GOOD_P5_CSS = String.raw`
@font-face { font-family: "Courtwork Manuscript Latin"; src: url(assets/fonts/manuscript-latin-subset.woff2) format("woff2"); font-weight: 400; font-display: swap; unicode-range: U+0043,U+006B,U+006F,U+0072,U+0074,U+0075,U+0077; }
.wordmark > span, .promise-heading h2 .latin-manuscript, .closing .eyebrow .latin-manuscript { font-family: "Courtwork Manuscript Latin"; font-synthesis: none; }
`;
const GOOD_P5_OG = String.raw`
<style>@font-face { font-family: "Courtwork Manuscript Latin"; src: url(assets/fonts/manuscript-latin-subset.woff2) format("woff2"); font-weight: 400; font-display: swap; unicode-range: U+0043,U+006B,U+006F,U+0072,U+0074,U+0075,U+0077; } .wordmark { font-family: "Courtwork Manuscript Latin"; font-synthesis: none; }</style>
<div class="wordmark">Courtwork</div>`;
const GOOD_P5_SOURCE = 'Junicode 2.226\nrelease archive SHA-256: ' + 'c'.repeat(64)
  + '\nsource WOFF2 SHA-256: ' + 'b'.repeat(64) + '\nOFL SHA-256: ' + 'd'.repeat(64);
const p5FontRules = (overrides = {}) => checkP5FontCoverage({
  html: GOOD_P5_HTML,
  css: GOOD_P5_CSS,
  ogHtml: GOOD_P5_OG,
  manifest: GOOD_P5_MANIFEST,
  sourceRecord: GOOD_P5_SOURCE,
  licenseSha256: 'd'.repeat(64),
  woff2Sha256: 'a'.repeat(64),
  woff2Metrics: { cmapCodepoints: 7, glyphs: 8 },
  ...overrides,
}).map((failure) => failure.rule);

test('SKIN-R2-P5 font coverage binds source, bytes, cmap, glyphs, and only four signed consumers', () => {
  assert.deepEqual(p5FontRules(), []);
  assert.ok(p5FontRules({ woff2Sha256: 'e'.repeat(64) }).includes('p5-font-coverage'));
  assert.ok(p5FontRules({ woff2Metrics: { cmapCodepoints: 6, glyphs: 8 } }).includes('p5-font-coverage'));
  assert.ok(p5FontRules({ css: `${GOOD_P5_CSS}\n.zh-doc { font-family: "Courtwork Manuscript Latin"; }` }).includes('p5-font-coverage'));
  assert.ok(p5FontRules({ html: GOOD_P5_HTML.replace('<span>Courtwork</span>', '<span>Casework</span>') }).includes('p5-font-coverage'));
  assert.ok(p5FontRules({ ogHtml: GOOD_P5_OG.replace('.wordmark { font-family', '.wordmark { color: inherit; } .other { font-family') }).includes('p5-font-coverage'));
});

test('SKIN-R2-P5 rejects manuscript family propagation through custom font slots', () => {
  assert.ok(p5FontRules({
    css: `:root { --sans: "Courtwork Manuscript Latin", sans-serif; }\n${GOOD_P5_CSS}`,
  }).includes('p5-font-coverage'));
  assert.ok(p5FontRules({
    css: `:root { --brand-face: "Courtwork Manuscript Latin"; }\nbody { font-family: var(--brand-face); }\n${GOOD_P5_CSS}`,
  }).includes('p5-font-coverage'));
  assert.ok(p5FontRules({
    ogHtml: GOOD_P5_OG.replace('<style>', '<style>:root { --og-body: "Courtwork Manuscript Latin"; } body { font-family: var(--og-body); }'),
  }).includes('p5-font-coverage'));
  assert.ok(p5FontRules({
    css: String.raw`:root { --escaped-face: "Courtwork\20 Manuscript\20 Latin"; }
body { font-family: var(--escaped-face); }
${GOOD_P5_CSS}`,
  }).includes('p5-font-coverage'));
});

test('SKIN-R2-P5 data-static rejects character, mono, and motion drift', () => {
  const html = String.raw`<strong class="mono" data-fixture-count="dossier-materials">20</strong><article data-pm-finding-id="prd-finding-05"><span data-pm-defect-label>冲突需求</span><span data-pm-disposition>待确认</span></article>`;
  const css = ':root { --mono: ui-monospace, "SF Mono", Menlo, monospace; }';
  const expected = {
    'data-fixture-count:dossier-materials': '20',
    'data-pm-defect-label': '冲突需求',
    'data-pm-disposition': '待确认',
  };
  const run = (overrides = {}) => checkP5DataStatic({ html, css, expected, expectedMono: 'ui-monospace, "SF Mono", Menlo, monospace', ...overrides })
    .map((failure) => failure.rule);
  assert.deepEqual(run(), []);
  assert.ok(run({ html: html.replace('>20<', '>21<') }).includes('p5-data-static'));
  assert.ok(run({ css: css.replace('ui-monospace', 'Courtwork Manuscript Latin') }).includes('p5-data-static'));
  assert.ok(run({ css: `${css}\n[data-fixture-count] { animation: count-up 1s; }` }).includes('p5-data-static'));
});
