import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateVersionalSite } from './versional-language-contract-lib.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const desktopCss = readFileSync(new URL('../../apps/desktop/src/styles.css', import.meta.url), 'utf8');
const galleryHtml = readFileSync(new URL('../../apps/desktop/visual-gallery.html', import.meta.url), 'utf8');
const galleryMain = readFileSync(new URL('../../apps/desktop/src/preview/gallery/main.tsx', import.meta.url), 'utf8');
const screenshotManifest = JSON.parse(readFileSync(new URL('../craft-evidence/VERSIONAL-LANG-3/screenshot-manifest.json', import.meta.url), 'utf8'));
const screenshotSha = (name, source = readFileSync(new URL(`../assets/screenshots/${name}`, import.meta.url))) =>
  createHash('sha256').update(source).digest('hex');

test('版本学 Pages 平框、组界与眉批契约全绿', () => {
  assert.deepEqual(validateVersionalSite({ html, css, desktopCss }), []);
});

test('注入 routine 竖格线复活时定点失败', () => {
  const mutated = css.replace('.scenario-proof li { min-width: 0; padding: 18px 4px; border-right: 0;', '.scenario-proof li { min-width: 0; padding: 18px 4px; border-right: 1px solid var(--border-hairline);');
  assert.match(validateVersionalSite({ html, css: mutated, desktopCss }).join('\n'), /routine 竖格线复活/);
});

test('注入刊记锚丢失时定点失败', () => {
  assert.match(validateVersionalSite({ html: html.replace(' id="release-colophon"', ''), css, desktopCss }).join('\n'), /平框刊记缺失/);
});

test('注入眉批退回四周卡框时定点失败', () => {
  const mutated = css.replace('border: 0; border-block: 0; background: transparent;', 'border: 1px solid var(--border-hairline); border-block: 0; background: transparent;');
  assert.match(validateVersionalSite({ html, css: mutated, desktopCss }).join('\n'), /眉批带退回卡框/);
});

test('注入参考浅宗色阶漂移时定点失败', () => {
  const mutated = css.replace('--bg-app: #F7F8FA;', '--bg-app: #F7F8FB;');
  assert.match(validateVersionalSite({ html, css: mutated, desktopCss }).join('\n'), /VL2-C01 Pages 浅宗色阶漂移/);
});

test('注入 hero 宋体退回轻端时定点失败', () => {
  const mutated = css.replace('h1.zh-title { font-weight: 700; }', 'h1.zh-title { font-weight: 400; }');
  assert.match(validateVersionalSite({ html, css: mutated, desktopCss }).join('\n'), /VL2-T01 hero 标题/);
});

test('注入 Pages 四栏 routine 竖线复活时定点失败', () => {
  const mutated = css.replace('.evidence-step { position: relative; min-width: 0; padding: 32px 24px 0; border-right: 0;', '.evidence-step { position: relative; min-width: 0; padding: 32px 24px 0; border-right: 1px solid var(--border-hairline);');
  assert.match(validateVersionalSite({ html, css: mutated, desktopCss }).join('\n'), /VL2-L01 Pages 连续叙事/);
});

test('注入 Agent 文书标题线复活时定点失败', () => {
  const mutated = desktopCss.replace('.document-preview header { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 8px; border-bottom: 0;', '.document-preview header { display: flex; justify-content: space-between; gap: 12px; padding-bottom: 8px; border-bottom: var(--rule-minor) solid var(--border);');
  assert.match(validateVersionalSite({ html, css, desktopCss: mutated }).join('\n'), /VL2-L02 Agent 文书与进度面/);
});

test('注入 composer focus 强边界透明时定点失败', () => {
  const mutated = desktopCss.replace(
    '.composer-shell:focus-within { border-color: var(--text-tertiary); }',
    '.composer-shell:focus-within { border-color: transparent; }',
  );
  assert.match(validateVersionalSite({ html, css, desktopCss: mutated }).join('\n'), /composer focus 强边界退场/);
});

test('注入 Pages 磁青宗 token 漂移时定点失败', () => {
  const mutated = css.replace('--bg-app: #0F1622;', '--bg-app: #101722;');
  assert.match(validateVersionalSite({ html, css: mutated, desktopCss }).join('\n'), /VL3-C01 Pages 磁青宗色阶漂移/);
});

test('注入 Agent 重要标题 token 不同源时定点失败', () => {
  const mutated = desktopCss.replace('--important-title: #d9ae6a;', '--important-title: #d8ae6a;');
  assert.match(validateVersionalSite({ html, css, desktopCss: mutated }).join('\n'), /VL3-C02 Agent／Pages/);
});

test('注入泥金进入正文时定点失败', () => {
  const mutated = css.replace('.hero-lead {', '.hero-lead { color: var(--important-title);');
  assert.match(validateVersionalSite({ html, css: mutated, desktopCss }).join('\n'), /VL3-T02 泥金越界/);
});

test('VL3-S01 六枚 Pages 截图逐字节绑定重摄 manifest', () => {
  assert.equal(screenshotManifest.schemaVersion, 'courtwork.versional-screenshot-manifest.v1');
  assert.deepEqual(Object.keys(screenshotManifest.pagesAssets).sort(), [
    '11-milestone-dossier-1440.webp',
    '11-milestone-dossier-720.webp',
    '12-milestone-risklist-1440.webp',
    '12-milestone-risklist-720.webp',
    '13-milestone-redline-1440.webp',
    '13-milestone-redline-720.webp',
  ]);
  for (const [name, expected] of Object.entries(screenshotManifest.pagesAssets)) assert.equal(screenshotSha(name), expected, name);
  const [first] = Object.keys(screenshotManifest.pagesAssets);
  const mutated = Buffer.concat([readFileSync(new URL(`../assets/screenshots/${first}`, import.meta.url)), Buffer.from([0])]);
  assert.notEqual(screenshotSha(first, mutated), screenshotManifest.pagesAssets[first], '截图字节漂移反例必须触红');
});

test('VL3-T01 图谱总题真实入口安装同一主题控制器', () => {
  assert.match(galleryHtml, /<meta name="color-scheme" content="light dark"/);
  assert.match(galleryMain, /import \{ installDesktopThemeController \} from '\.\.\/\.\.\/settings\/theme-controller';/);
  assert.match(galleryMain, /installDesktopThemeController\(\);/);
});

// R-13（ARCH-SCOPE-2026-07-20）：og 卡字节绑定，照 VL3-S01 截图双绑先例。
// 缘由：og.html **从不发布**（build.mjs 不拷贝它），读者只经 og.png 看到这张卡——
// 于是「改了 og.html 却没重渲」是一种对外可见、对内无声的漂移，此前既无重渲入口
// 也无绑定，实测产物 SHA 与唯一留档已不一致。三条断言分别锁：产物与 manifest 逐
// 字节相等、manifest 自述的字节数与实物相等、以及**卡面确实承载了当期口径**——
// 最后一条是关键：只锁哈希只能证明「没变过」，不能证明「变对了」。
test('R-13 og 卡与 manifest 逐字节绑定，且承载当期成熟度口径', () => {
  const manifest = JSON.parse(readFileSync(new URL('../assets/og-manifest.json', import.meta.url), 'utf8'));
  const bytes = readFileSync(new URL('../assets/og.png', import.meta.url));
  assert.equal(manifest.schemaVersion, 'courtwork.og-card.v1');
  assert.equal(manifest.source, 'site/og.html');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256, 'og.png 字节与 manifest 脱钩——改了源却没重渲？跑 node site/scripts/render-og.mjs');
  assert.equal(bytes.byteLength, manifest.bytes);

  // 字节漂移反例必须触红（否则绑定形同虚设）。
  const mutated = createHash('sha256').update(Buffer.concat([bytes, Buffer.from([0])])).digest('hex');
  assert.notEqual(mutated, manifest.sha256, 'og 卡字节漂移反例必须触红');

  // 源侧口径：撤下不可自证的断言、补上受门强制的制品边界。此三条与 og.png 同源，
  // 故哈希相等即意味着卡面也是这个口径。
  const ogHtml = readFileSync(new URL('../og.html', import.meta.url), 'utf8');
  assert.ok(!ogHtml.includes('案件内容永不训练'), 'og 卡不得断言第三方数据处理政策——本项目无验证手段');
  assert.ok(ogHtml.includes('未公证'), 'og 卡须与 index.html 同样携带制品边界');
  assert.ok(ogHtml.includes('合成数据试点'), 'og 卡须携成熟度限定词，不得是零对冲面');
});
