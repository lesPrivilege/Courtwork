import { readFile } from 'node:fs/promises';
import path from 'node:path';

// RP-2.10 三卡一纸 + 线影凡例 + chat 卡片清算（docs/49 第十二章）
const root = path.resolve(import.meta.dirname, '..');
const [css, app, utility] = await Promise.all([
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/App.tsx'), 'utf8'),
  readFile(path.join(root, 'src/rail/RightRailModules.tsx'), 'utf8'),
]);

const failures = [];
const has = (re, message) => { if (!re.test(css)) failures.push(message); };

// —— Item 2：线影凡例 ——
// composer 外框略重（含按钮区）：border-strong，非 hairline、非 text-tertiary、无影
has(/\.composer-shell\s*\{[^}]*border:\s*1px solid var\(--border-strong\)/, 'composer 外框须略重且落在整卡 shell（含附件与沉底钮排；文本块扁平）');
if (/\.composer-shell\s*\{[^}]*box-shadow/.test(css)) failures.push('composer 外框须无影');
// 默认按钮扁平专点才框：composer 图标按钮无边框；唯 send 保留实底主动作
has(/\.composer-icon-button\s*\{[^}]*border:\s*0/, '默认 composer 按钮须扁平无框');
has(/\.composer-send\s*\{[^}]*background:\s*var\(--text-primary\)/, '唯 send 为专点主动作（实底）');
// user message 扁平浅底（2026-07-12 用户拍板：色块过重改浅——selected 向白卡冲淡），仍 border: 0（编辑态才描边）
has(/\.user-message\s*\{[^}]*border:\s*0;[^}]*background:\s*color-mix\(in srgb, var\(--bg-selected\) 55%, var\(--bg-raised\) 45%\)/, 'user message 须扁平浅底（selected 55% 向白卡冲淡，单源不散值）');
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
if (/<SurfaceCard/.test(utility)) failures.push('模块列禁 SurfaceCard（schema 唯一 raised 卡；模块白卡由 CSS 表达）');
// RP-2.11 顶栏改判：dock 为右卡顶部、折叠钮迁顶栏浮层（right-rail-chrome 退役）；此处只守 schema 唯一卡不回归。
has(/\.rail-module\s*\{[^}]*background:\s*var\(--bg-raised\)/, '四模块=白卡列（十四章：Progress→Preview→Working folders→Context,Cowork 同构）');
has(/\.utility-reopen\s*\{/, 'base 态 reopen 入口坐底纸不占卡');

// —— 图标管线：无 TSX 内联 svg（品牌 mark 走 SVG-as-code） ——
if (/<svg\b/.test(utility)) failures.push('RightRailModules 禁 TSX 内联 SVG');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('RP-2.10 三卡一纸/线影凡例/卡片清算 boundaries: OK');
