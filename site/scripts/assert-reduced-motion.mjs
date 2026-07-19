// SITE-CRAFT-2 · reduced-motion 计算态实测（P0 驳回的回炉件）。
//
// 判例：**分支在场 ≠ 分支胜出**。静态门只能看到 reduce 分支写没写，看不到它是否被更高特异性的
// 消费点压掉——`.demo-actions span`(0,1,1) 曾压过 blanket `.schema-demo *`(0,1,0)，
// 令朱在 reduce 下照常走完幕二。`deslop-scan-lib` 的 checkDemoMotion 已升级为层叠解析（静态侧），
// 本脚本是运行侧的对应实测：直接读 computed animation-name 与四相位计算色。
//
// 不挂 site:guard——site 构建面保持零依赖零浏览器；本脚本按需运行（验收清单项）：
//   (cd site && python3 -m http.server 18902 --bind 127.0.0.1) &
//   node site/scripts/assert-reduced-motion.mjs http://127.0.0.1:18902/ apps/desktop
// `page.evaluate` 的回调体在**浏览器页面上下文**里执行，不在本 Node 进程里——
// 故此处显式声明这两个浏览器全局，而不是把整份脚本标成 browser 环境（它主体仍是 Node）。
/* global document, getComputedStyle */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const [, , url = 'http://127.0.0.1:18902/', desktopDir = 'apps/desktop'] = process.argv;
const require = createRequire(resolve(process.cwd(), desktopDir, 'package.json'));
const { chromium } = require('@playwright/test');

// reduce 下唯一许可的动画**按名**登记，不按条数：条数是计数不是白名单，
// 少跑一条就能把新混进来的一条吃掉。ghosty-reduced-fade 是 SITE-CRAFT-1-FADE 契约里
// reduce **专用**的 opacity 淡入（不是常规态动画漏出），故许可。
const ALLOWED_UNDER_REDUCE = new Set(['ghosty-reduced-fade']);
const ZHU = 'rgb(215, 90, 60)';
const failures = [];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// ① 运行时动画普查：按名核，不按条数核
const census = await page.evaluate(() => document.getAnimations().map((a) => ({
  name: a.animationName ?? a.constructor.name,
  target: a.effect?.target?.tagName?.toLowerCase() ?? '?',
})));
for (const entry of census) {
  if (!ALLOWED_UNDER_REDUCE.has(entry.name)) {
    failures.push(`reduce 下有未登记动画在跑：${entry.name} @ ${entry.target}`);
  }
}

// ② 演示层逐点 computed animation-name 必须真的归零
const computed = await page.evaluate(() => Object.fromEntries(
  ['.demo-actions span', '.demo-basis', '.demo-gate', '.demo-compare', '.demo-phase-a', '.demo-phase-b', '.demo-phase-c', '.demo-anchor']
    .map((sel) => {
      const el = document.querySelector(sel);
      return [sel, el ? getComputedStyle(el).animationName : 'MISSING'];
    })));
for (const [sel, name] of Object.entries(computed)) {
  if (name === 'MISSING') failures.push(`演示消费点缺席：${sel}`);
  else if (name !== 'none') failures.push(`reduce 下 ${sel} 的 animation-name 未归零：${name}`);
}

// ③ 四相位朱检测：把相位推到幕二也不得现朱（裁定「朱不作环境色」在 reduce 下更须成立）
const phases = {};
for (const [label, pct] of [['幕一', 15], ['幕二', 48], ['幕三', 80], ['循环末', 97]]) {
  phases[`${label}@${pct}%`] = await page.evaluate((p) => {
    const el = document.querySelector('.demo-actions span');
    el.style.animationDelay = `${-(12 * p / 100)}s`;
    el.style.animationPlayState = 'paused';
    void el.offsetWidth;
    const colour = getComputedStyle(el).borderTopColor;
    el.style.animationDelay = '';
    el.style.animationPlayState = '';
    return colour;
  }, pct);
}
for (const [label, colour] of Object.entries(phases)) {
  if (colour === ZHU) failures.push(`reduce 下 ${label} 处置格仍现朱（${colour}）`);
}

await browser.close();

console.log('reduce 运行动画：', JSON.stringify(census));
console.log('演示层 computed animation-name：', JSON.stringify(computed));
console.log('四相位处置格描边：', JSON.stringify(phases));
if (failures.length) {
  console.error(`\nreduced-motion 计算态实测失败：\n${failures.map((f) => `  - ${f}`).join('\n')}`);
  process.exit(1);
}
console.log(`\nreduced-motion: PASS（运行动画 ${census.length} 条全部在名册内；演示层 8 点全归零；四相位零朱）`);
