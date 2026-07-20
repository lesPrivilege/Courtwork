import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

// LAYOUT-CONVERGE-1（Grok 四准则审计 P1×3 + P2×2 修复的静态门）：
// 收拢/收敛属净删除单——锁定死支、幽灵列与测宽 token 不再回潮。
const root = path.resolve(import.meta.dirname, '..');

/** 递归收集 src/ 与 scripts/ 下的源码文本（含扩展名过滤）。 */
async function collectSources(dir, exts) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await collectSources(full, exts)));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push([path.relative(root, full), await readFile(full, 'utf8')]);
    }
  }
  return out;
}

const selfFile = path.relative(root, new URL(import.meta.url).pathname);
const production = [
  ...(await collectSources(path.join(root, 'src'), ['.ts', '.tsx', '.css'])),
  ...(await collectSources(path.join(root, 'scripts'), ['.mjs'])),
].filter(([file]) => file !== selfFile); // 门自身持有禁用字面量，排除自证
const css = await readFile(path.join(root, 'src/styles.css'), 'utf8');
const rail = await readFile(path.join(root, 'src/rail/CaseRail.tsx'), 'utf8');
const app = await readFile(path.join(root, 'src/App.tsx'), 'utf8');

const failures = [];
const need = (cond, msg) => { if (!cond) failures.push(msg); };

// —— ①/R1·R2·R3：左栏窄条死支零残留（审计复验步骤 6 的生产源码口径） ——
for (const forbidden of ['expand-left-rail', 'case-rail.is-collapsed', 'collapsed-case-icons', 'rail-expand-button']) {
  const hits = production
    .filter(([, text]) => text.includes(forbidden))
    .map(([file]) => file);
  need(hits.length === 0, `死支残留：生产源码不得再含 "${forbidden}"（命中：${hits.join(', ')}）`);
}
// CaseRail 收拢分支的 props 一并退役（单一展开控件 = WindowChrome collapse-left-rail）
need(!/\bonExpandLeft\b/.test(rail), 'R1：CaseRail 须退役 onExpandLeft（收拢窄条死支的唯一消费者）');
need(!/if \(leftCollapsed\)/.test(rail), 'R1：CaseRail 须删除 is-collapsed 窄条分支（leftCollapsed 守卫）');

// —— ②/R4：旧窄轨类已整套退役（FILE-PREVIEW-1 顺带条款，四步执行完毕）——
// 存在锁转**零出现反向锁**：LAYOUT-CONVERGE-1 已实测坐实它恒不触发，留着就是一条幽灵
// 规则——读者以为存在一种窄轨形态，实际永远走不到。窄轨语义由 `.right-narrow` 独家承担。
// 三面同锁（CSS 规则 / 类名拼装 / App 派生），防的是「删了 CSS 却留着派生」这类半退役。
// 退役名只在本门内以正则出现一次，属立门必需；产品源码与注释一律不复述（判例：
// 描述禁形不得复现禁形本身）。
// 锁定面＝**整个生产源码集**（src/**.ts|tsx|css + scripts/**.mjs，门自身已由 production 排除），
// 不是只锁 styles.css 与 App.tsx。首版只锁两文件，结果同一枚提交在第三个文件（本门同集内的
// assert-test-count.mjs）里又写了一次退役名——「描述禁形不得复现禁形本身」在修它的批次里复发。
// 沿用上方 R1 死支锁同一集合，一行加宽即覆盖全部生产面；沿革注释改为不具名表述，计数含义不损。
const RETIRED_COMPACT = /rails-compact|compactLayout/;
{
  const hits = production.filter(([, text]) => RETIRED_COMPACT.test(text)).map(([file]) => file);
  need(hits.length === 0, `R4：旧窄轨类与其派生已退役，生产源码不得再出现（含注释复述；命中：${hits.join(', ')}）`);
}

// —— SKIN-R2 P2-L17/L18：比较态沿同一撤卡语义，不能另留 48px 无宿主轨 ——
need(/const effectiveLeftCollapsed = leftCollapsed \|\| narrowRailRequired \|\| comparing;/.test(app),
  'P2-L18：comparing 必须进入 effectiveLeftCollapsed，CaseRail 才会真撤挂而非只藏内容');
const comparingCollapsed = css.match(/\.workspace\.comparing\.left-collapsed\s*\{([^}]*)\}/);
need(comparingCollapsed !== null, 'P2-L17/L18：须有 comparing.left-collapsed 两轨显式规则以压过窄面媒体规则');
need(comparingCollapsed !== null && !/grid-template-columns:\s*48px/.test(comparingCollapsed[1]),
  'P2-L18：comparing.left-collapsed 不得再申请 48px 幽灵轨');
need(!/\.workspace\.comparing\s+\.case-expanded\s*\{/.test(css),
  'P2-L18：不得以隐藏 case-expanded 冒充撤卡；CaseRail 必须由 App 真卸载');

// —— ③/P1-3：work 单列态（双侧收拢）正文列套用 --content-measure（跨模式阅读宽度一致） ——
need(/\.workspace\.left-collapsed\.right-collapsed\s+\.composer-stack\s*\{[^}]*max-width:\s*var\(--content-measure\)/.test(css),
  'P1-3：双侧收拢 work composer-stack 须封顶 --content-measure');
need(/\.workspace\.left-collapsed\.right-collapsed\s+\.conversation-scroll\s*\{[^}]*var\(--content-measure\)/.test(css),
  'P1-3：双侧收拢 work conversation-scroll 须按 --content-measure 收拢正文列');

// —— ④/P2-4：测宽 token 单源——welcome 收敛到 --home-welcome-measure，不再硬编码 720px ——
need(/\.welcome-home\s*\{[^}]*var\(--home-welcome-measure\)/.test(css),
  'P2-4：welcome-home 须消费 --home-welcome-measure（token 单源）');
need(!/\.welcome-home\s*\{[^}]*min\(720px/.test(css),
  'P2-4：welcome-home 不得再硬编码 min(720px, …)');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('LAYOUT-CONVERGE-1 dead-branch / ghost-column / measure-token boundaries: OK');
