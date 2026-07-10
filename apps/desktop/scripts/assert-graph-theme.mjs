import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tokens = JSON.parse(readFileSync(resolve('../../docs/32-设计语言包/tokens.json'), 'utf8'));
const theme = readFileSync(resolve('src/workbench/graph-theme.ts'), 'utf8');
const panel = readFileSync(resolve('src/workbench/GraphPanel.tsx'), 'utf8');
const runtime = readFileSync(resolve('src/workbench/g6-runtime.ts'), 'utf8');
const app = readFileSync(resolve('src/App.tsx'), 'utf8');
const vite = readFileSync(resolve('vite.config.ts'), 'utf8');
const violations = [];
const expected = {
  background: tokens.color.bg.raised.value,
  surface: tokens.color.bg.surface.value,
  hover: tokens.color.bg.hover.value,
  selected: tokens.color.bg.selected.value,
  ink: tokens.color.text.primary.value,
  textSecondary: tokens.color.text.secondary.value,
  border: tokens.color.border.hairline.value,
  borderStrong: tokens.color.border.strong.value,
  slate: tokens.color.semantic.gate.rejected.graphic,
  amber: tokens.color.semantic.gate.pending.graphic,
};

for (const [name, value] of Object.entries(expected)) {
  const declared = theme.match(new RegExp(`${name}:\\s*'([^']+)'`))?.[1];
  if (declared?.toLowerCase() !== value.toLowerCase()) {
    violations.push(`graphTokens.${name}=${declared ?? '未声明'}，应消费 tokens.json ${value}`);
  }
}

if (!panel.includes("datum.data?.contradiction ? graphTokens.amber : graphTokens.slate")) {
  violations.push('图谱边未封闭在琥珀/板岩灰两个五色语义 token 内');
}
if (/relationType\s*\.\s*includes|e-14|e-15/.test(panel)) {
  violations.push('矛盾边出现文本猜测或边 ID 硬编码，必须只消费结构化 marker');
}
if (/#[0-9a-f]{3,8}/i.test(panel)) {
  violations.push('GraphPanel 出现绕过主题的硬编码颜色');
}
if (!app.includes("lazy(() => import('./workbench/GraphPanel'))")) {
  violations.push('G6 未按关系图谱工作面懒加载');
}
for (const extension of ['Rect', 'Polyline', 'DagreLayout', 'DragCanvas', 'Minimap']) {
  if (!runtime.includes(extension)) violations.push(`G6 按需注册缺少 ${extension}`);
}
for (const transform of ['UpdateRelatedEdge', 'CollapseExpandNode', 'CollapseExpandCombo', 'GetEdgeActualEnds', 'ArrangeDrawOrder']) {
  if (!runtime.includes(transform)) violations.push(`G6 必需内部 transform 缺少 ${transform}`);
}
if (/Force|Circular|GridLayout|preset/.test(runtime.replace('all-in preset', ''))) {
  violations.push('G6 运行时混入 Stage 2 或全预设扩展');
}
if (!vite.includes("id.includes('/@antv/g6/esm/')") || !vite.includes("id.includes('/@antv/layout/')")) {
  violations.push('生产构建未对 G6/layout 启用按需 tree-shaking');
}

if (violations.length) throw new Error(`G6 主题审计失败：\n${violations.join('\n')}`);
globalThis.process.stdout.write('G6 主题审计通过：tokens.json 对齐 + 边色封闭 + 结构化矛盾 marker\n');
