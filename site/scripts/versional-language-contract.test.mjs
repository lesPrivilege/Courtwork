import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { validateVersionalSite } from './versional-language-contract-lib.mjs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const readme = readFileSync(new URL('../../README.md', import.meta.url), 'utf8');
const publicSurfaceEvidenceReadme = readFileSync(new URL('../craft-evidence/PUBLIC-SURFACE-REAL-1/README.md', import.meta.url), 'utf8');
const ogHtml = readFileSync(new URL('../og.html', import.meta.url), 'utf8');
const captureScript = readFileSync(new URL('../../apps/desktop/scripts/capture-pi-lane-states.mjs', import.meta.url), 'utf8');
const desktopCss = readFileSync(new URL('../../apps/desktop/src/styles.css', import.meta.url), 'utf8');
const galleryHtml = readFileSync(new URL('../../apps/desktop/visual-gallery.html', import.meta.url), 'utf8');
const galleryMain = readFileSync(new URL('../../apps/desktop/src/preview/gallery/main.tsx', import.meta.url), 'utf8');
const PUBLIC_SURFACE_PRODUCT_SHA = '5187c797c6ced84188c0b4e8ae7b00ecb8e50922';
const screenshotManifest = JSON.parse(readFileSync(new URL('../craft-evidence/VERSIONAL-LANG-3/screenshot-manifest.json', import.meta.url), 'utf8'));
const screenshotSha = (name, source = readFileSync(new URL(`../assets/screenshots/${name}`, import.meta.url))) =>
  createHash('sha256').update(source).digest('hex');
const sourceFrameSha = (name, source = readFileSync(new URL(`../craft-evidence/VERSIONAL-LANG-3/frames/${name}`, import.meta.url))) =>
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
  const mutated = css.replace('--bg-app: #FBFCFE;', '--bg-app: #FBFCFB;');
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

test('VL3-S01 三源帧与六枚 Pages 截图逐字节双绑重摄 manifest', () => {
  assert.equal(screenshotManifest.schemaVersion, 'courtwork.versional-screenshot-manifest.v1');
  assert.deepEqual(Object.keys(screenshotManifest.sourceFrames).sort(), [
    '01-chat-markdown-dark-1440x900.png',
    '02-risklist-settled-dark-1440x900.png',
    '03-revision-focus-dark-1440x900.png',
  ]);
  for (const [name, expected] of Object.entries(screenshotManifest.sourceFrames)) assert.equal(sourceFrameSha(name), expected, name);
  assert.deepEqual(Object.keys(screenshotManifest.pagesAssets).sort(), [
    '11-milestone-markdown-1440.webp',
    '11-milestone-markdown-720.webp',
    '12-milestone-risklist-1440.webp',
    '12-milestone-risklist-720.webp',
    '13-milestone-redline-1440.webp',
    '13-milestone-redline-720.webp',
  ]);
  for (const [name, expected] of Object.entries(screenshotManifest.pagesAssets)) assert.equal(screenshotSha(name), expected, name);
  const [firstSource] = Object.keys(screenshotManifest.sourceFrames);
  const mutatedSource = Buffer.concat([readFileSync(new URL(`../craft-evidence/VERSIONAL-LANG-3/frames/${firstSource}`, import.meta.url)), Buffer.from([0])]);
  assert.notEqual(sourceFrameSha(firstSource, mutatedSource), screenshotManifest.sourceFrames[firstSource], '源帧字节漂移反例必须触红');
  const [firstPage] = Object.keys(screenshotManifest.pagesAssets);
  const mutatedPage = Buffer.concat([readFileSync(new URL(`../assets/screenshots/${firstPage}`, import.meta.url)), Buffer.from([0])]);
  assert.notEqual(screenshotSha(firstPage, mutatedPage), screenshotManifest.pagesAssets[firstPage], 'Pages 截图字节漂移反例必须触红');
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
  const ogSource = readFileSync(new URL('../og.html', import.meta.url));
  assert.equal(manifest.schemaVersion, 'courtwork.og-card.v2');
  assert.equal(manifest.source, 'site/og.html');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256, 'og.png 字节被动过——manifest 与产物脱钩');
  assert.equal(bytes.byteLength, manifest.bytes);
  // 源哈希：唯一守得住「改了源没重渲」的判据。独立验收实测 v1 只锁产物 SHA 时，
  // 改 og.html 标语不重渲可全链绿——绑定锁了产物却漏了它要代表的东西。
  assert.equal(createHash('sha256').update(ogSource).digest('hex'), manifest.sourceSha256,
    'og.html 已改而 og.png 未重渲——跑 node site/scripts/render-og.mjs');

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

test('PUBLIC-SURFACE-REAL-1 公开定位、成熟度与历史制品边界相邻且不回退', () => {
  assert.match(readme, /^# Courtwork\n\nCourtwork 是与垂类解耦的本地优先通用 Work Agent GUI[：。]/);
  assert.doesNotMatch(readme, /案件文件夹级协作|现行称谓只到“法律工作台”/);
  assert.match(readme, /scripted/);
  assert.match(readme, /PI-BASE-GUI-ACCEPT.*external-validated blocked/s);
  assert.match(readme, /Stage 0 — 真实 MVP/);
  assert.match(readme, /packages\/pi-lane[^\n]*已装配/);
  assert.match(readme, /apps\/desktop/);
  assert.match(readme, /当前 main 的\s+scripted GUI 不在 `?v0\.1\.2/);
  assert.match(html, /<title>[^<]*本地优先[^<]*通用 Work Agent GUI/);
  assert.match(html, /<meta property="og:title" content="[^"]*本地优先[^"通用]*通用 Work Agent GUI/);
  assert.match(html, /<h1[^>]*aria-label="[^"]*本地优先[^"通用]*通用 Work Agent GUI/);
  assert.match(html, /<p class="eyebrow">本地优先 · Work Agent GUI<\/p>/);
  assert.match(html, /<span class="tc" style="--i:0">本<\/span>[\s\S]*<span class="tc" style="--i:4">面<\/span>/);
  assert.match(html, /Legal 第一垂类 · scripted 验收微演示/);
  assert.match(html, /aria-label="Legal 第一垂类的 scripted 微演示/);
  assert.match(html, /正在闭合/);
  assert.match(html, /由人逐条确认|人工决定/);
  assert.match(html, /历史开发版，不含当前 main 的 Work Agent 主线/);
  assert.match(ogHtml, /本地优先/);
  assert.match(ogHtml, /通用 Work Agent GUI/);
  assert.match(ogHtml, /未公证/);
});

test('PUBLIC-SURFACE-REAL-1 Work 三段与当前 scripted 证据资产均有机器绑定', () => {
  for (const phrase of ['真实本地容器', '写入提案先由人决定', '结果只读核验']) assert.match(html, new RegExp(phrase));
  const workRows = [...html.matchAll(/<article class="work-row"[\s\S]*?<\/article>/g)].map(([row]) => row);
  assert.equal(workRows.length, 3);
  for (const row of workRows) {
    assert.match(row, /scripted|脚本化验收/);
    assert.match(row, /assets\/screenshots\/PUBLIC-SURFACE-REAL-1-[^" ]+-(?:1440|720)\.webp/);
    assert.match(row, /alt="[^"]*(?:scripted|脚本化验收)/);
    assert.match(row, /<figcaption>[^<]*(?:scripted|脚本化验收)/);
  }
  const manifestPath = '../craft-evidence/PUBLIC-SURFACE-REAL-1/screenshot-manifest.json';
  assert.ok(existsSync(new URL(manifestPath, import.meta.url)), '本票资产 manifest 缺失');
  const manifest = JSON.parse(readFileSync(new URL(manifestPath, import.meta.url), 'utf8'));
  assert.equal(manifest.schemaVersion, 'courtwork.public-surface-screenshot-manifest.v1');
  assert.equal(Object.keys(manifest.sourceFrames).length, 3);
  assert.equal(Object.keys(manifest.pagesAssets).length, 6);
  for (const [name, expected] of Object.entries({ ...manifest.sourceFrames, ...manifest.pagesAssets })) {
    const assetPath = name.endsWith('.png')
      ? `../craft-evidence/PUBLIC-SURFACE-REAL-1/frames/${name}`
      : `../assets/screenshots/${name}`;
    const assetUrl = new URL(assetPath, import.meta.url);
    assert.ok(existsSync(assetUrl), `${name} 缺失`);
    assert.match(expected, /^[0-9a-f]{64}$/);
    assert.equal(createHash('sha256').update(readFileSync(assetUrl)).digest('hex'), expected, `${name} SHA 与实物脱钩`);
  }
  assert.equal(manifest.viewport.width, 1440);
  assert.equal(manifest.viewport.height, 900);
  assert.equal(manifest.productSha, PUBLIC_SURFACE_PRODUCT_SHA, 'productSha 必须锁定本票精确产品 tip');
  const productShaLine = publicSurfaceEvidenceReadme.split('\n').find((line) => line.startsWith('productSha:'));
  assert.equal(productShaLine, 'productSha: `' + PUBLIC_SURFACE_PRODUCT_SHA + '`', '证据 README 必须逐字绑定同一精确 productSha');
});

test('PUBLIC-SURFACE-REAL-1 capture 从真实容器起步，不再引导样板或 provider', () => {
  assert.match(captureScript, /new-case-open/);
  assert.match(captureScript, /setNextAuthorize/);
  assert.doesNotMatch(captureScript, /welcome-demo-start|welcome-sample-open|先查看演示|provider-skip/);
});
