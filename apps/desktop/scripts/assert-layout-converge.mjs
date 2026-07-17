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

// —— ②/R4：rails-compact 幽灵列——左栏已撤卡时不得再申请 48px 首列 ——
const railsCompact = css.match(/\.workspace\.rails-compact\s*\{([^}]*)\}/);
need(railsCompact !== null, 'R4：.workspace.rails-compact 规则须存在');
need(railsCompact !== null && !/grid-template-columns:\s*48px/.test(railsCompact[1]),
  'R4：rails-compact 不得以 48px 首列打头（撤卡后该列无宿主，实测挤压正文列）');

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
