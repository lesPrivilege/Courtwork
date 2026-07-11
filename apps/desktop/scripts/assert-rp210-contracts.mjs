import { readFile } from 'node:fs/promises';
import path from 'node:path';

// RP-2.10 三卡一纸 + 线影凡例 + chat 卡片清算（docs/49 第十二章）
const root = path.resolve(import.meta.dirname, '..');
const [css, app, utility] = await Promise.all([
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/App.tsx'), 'utf8'),
  readFile(path.join(root, 'src/utility/UtilityRail.tsx'), 'utf8'),
]);

const failures = [];
const has = (re, message) => { if (!re.test(css)) failures.push(message); };

// —— Item 2：线影凡例 ——
// composer 外框略重（含按钮区）：border-strong，非 hairline、非 text-tertiary、无影
has(/\.composer-box\s*\{[^}]*border:\s*1px solid var\(--border-strong\)/, 'composer 外框须略重 = border-strong（色与两侧一致微深）');
if (/\.composer-box\s*\{[^}]*box-shadow/.test(css)) failures.push('composer 外框须无影');
// 默认按钮扁平专点才框：composer 图标按钮无边框；唯 send 保留实底主动作
has(/\.composer-icon-button\s*\{[^}]*border:\s*0/, '默认 composer 按钮须扁平无框');
has(/\.composer-send\s*\{[^}]*background:\s*var\(--text-primary\)/, '唯 send 为专点主动作（实底）');
// user message 扁平略深底（藏青微加深），仍 border: 0（编辑态才描边）
has(/\.user-message\s*\{[^}]*border:\s*0;[^}]*background:\s*color-mix\(in srgb, var\(--bg-selected\) 90%, var\(--text-primary\) 10%\)/, 'user message 须扁平略深底（藏青微加深）');
// 留空即结构：chat 区两侧留空放大，文字不贴边
has(/\.conversation-scroll\s*\{[^}]*padding:\s*12px 16px/, '留空即结构：chat 两侧留空须放大（文字不贴边）');

// —— Item 3：chat 内卡片清算 ——
// 唯 question/门禁为轻卡
has(/\.turn-card-gate,\s*\.turn-card-question\s*\{[^}]*border:\s*1px solid var\(--border-strong\);\s*border-radius:\s*6px;\s*background:\s*var\(--bg-raised\)/, 'question/门禁须为轻卡（描边+圆角+纯白底）');
// turn-card 基座保持扁平 message 行（event/artifact/file）
has(/\.turn-card\s*\{[^}]*border-radius:\s*0;\s*background:\s*transparent/, 'turn-card 基座须保持扁平 message 行');
// 动作进行时文本惯例式闪烁（灰阶 opacity breathe）
has(/\.turn-event-row\.is-active\s*>\s*span:last-child\s*\{[^}]*animation:\s*breathe/, '进行态须文本惯例式闪烁（breathe）');
if (/\.turn-event-row\.is-active\s*>\s*span:last-child\s*\{[^}]*var\(--(?:red|amber|blue|green)-/.test(css)) failures.push('进行态闪烁须灰阶，不落语义色');
// 进行态诚实：settle 后不再 active（demo 收敛为 success）
if (!app.includes("status={session.confirmation ? 'success' : 'active'}")) failures.push('demo 进行态须在 settle 后收敛（不永久闪烁）');

// —— Item 1：三卡一纸 ——
// utility 两态皆坐底纸、永不成卡（schema 唯一右卡）
if (/<SurfaceCard/.test(utility)) failures.push('utility rail 两态皆无卡（schema 唯一右卡）');
if (!app.includes('<div className="right-rail-chrome">')) failures.push('折叠钮须住 right-rail-chrome 底纸留空');
has(/\.right-rail-chrome\s*\{[^}]*place-items:\s*center/, '折叠钮居留空上部居中（right-rail-chrome）');
has(/\.utility-dock\s*\{\s*position:\s*relative;[^}]*background:\s*transparent/, 'dock 坐底纸（L0 透明带，非白卡）');
has(/\.utility-reopen\s*\{/, 'base 态 reopen 入口坐底纸不占卡');

// —— 图标管线：无 TSX 内联 svg（品牌 mark 走 SVG-as-code） ——
if (/<svg\b/.test(utility)) failures.push('UtilityRail 禁 TSX 内联 SVG');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('RP-2.10 三卡一纸/线影凡例/卡片清算 boundaries: OK');
