// 中性色单源律门禁(docs/55 2026-07-12 拍板,MVP-FULL 批 0)
// 1) tokens 中性组自查:禁无色相灰(R==G==B,白卡 #FFFFFF 豁免)、禁暖调中性(R>B);
//    语义色预算(semantic/action/focus/link)豁免——暖色是语义,不是中性。
// 2) 消费面(src/**.css|ts|tsx)出现的一切 hex 必须 ∈ tokens 声明集(单源:组件内禁造色)。
// 3) 废除值黑名单:旧无色相/暖灰族与旧中性值永不回流(含 tokens 自身)。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const tokens = JSON.parse(readFileSync(resolve('../../docs/32-设计语言包/tokens.json'), 'utf8'));
const violations = [];

const norm = (hex) => {
  let h = hex.toLowerCase();
  if (h.length === 4) h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  return h;
};
const rgb = (hex) => {
  const h = norm(hex);
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
};

// —— 收集 tokens 声明集(全树一切 hex),并分区:语义豁免区 vs 中性受检区
const declared = new Set();
const semanticDeclared = new Set();
const neutralEntries = [];
const walk = (node, path, semanticScope) => {
  if (typeof node === 'string') {
    for (const m of node.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []) {
      const hex = norm(m.length === 4 || m.length === 7 ? m : m.slice(0, 7));
      declared.add(hex);
      if (semanticScope) semanticDeclared.add(hex);
      else neutralEntries.push({ path, hex });
    }
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$')) continue; // $meta/$description 为叙述文字,非 token 值
      const nextSemantic = semanticScope
        || key === 'semantic' || key === 'action' || key === 'focus' || key === 'link'
        || path === 'color.line'; // 法理之线语义五色豁免;line.rest 单独受检(下方显式追加)
      walk(value, path ? `${path}.${key}` : key, nextSemantic);
    }
  }
};
walk(tokens, '', false);
// line.rest 是中性阶成员(冷灰),显式纳入受检
neutralEntries.push({ path: 'color.line.rest', hex: norm(tokens.color.line.rest.value) });

// —— 1) tokens 中性组结构断言(值 ∈ 语义集时豁免:中性位引用语义值合法,如 elevation.warn*)
for (const { path, hex } of neutralEntries) {
  const [r, g, b] = rgb(hex);
  if (hex === '#ffffff' || hex === '#000000') continue; // 白卡/纯黑锚点豁免(纯黑当前无消费)
  if (semanticDeclared.has(hex)) continue;
  if (r === g && g === b) violations.push(`tokens ${path}=${hex} 为无色相灰(R==G==B),违单源律`);
  if (r > b) violations.push(`tokens ${path}=${hex} 为暖调中性(R>B),违单源律(锚色 H=210° 冷调族要求 B≥R)`);
}

// —— 3) 废除值黑名单(防回流;含 tokens 自身与消费面)
const banned = new Set([
  '#ededed', '#fafafa', '#f1f2f3', '#ebebeb', // 旧无色相灰族(rauno/vercel 时代)
  '#e6eaf0', '#e9eef4', '#f5f7f9', '#cbd3dc', '#d5dbe2', '#9dabbc', // 旧中性值(重铸前)
  '#f9fafb', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', // Tailwind gray
  '#fafaf9', '#f5f5f4', '#e7e5e4', '#d6d3d1', '#a8a29e', // Tailwind stone(暖灰)
  '#f4f4f5', '#e4e4e7', '#d4d4d8', '#a1a1aa', // Tailwind zinc
  '#f5f5f5', '#e5e5e5', '#d4d4d4', '#a3a3a3', // Tailwind neutral
]);
for (const hex of declared) {
  if (banned.has(hex)) violations.push(`tokens 声明集含废除值 ${hex}(黑名单回流)`);
}

// —— 2) 消费面扫描:src 内一切 hex ∈ 声明集
const SCAN_ROOT = resolve('src');
const files = [];
const collect = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) collect(full);
    else if (/\.(css|ts|tsx)$/.test(name)) files.push(full);
  }
};
collect(SCAN_ROOT);
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const rel = file.slice(SCAN_ROOT.length + 1);
  for (const m of text.match(/#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b/g) ?? []) {
    const hex = norm(m);
    if (banned.has(hex)) { violations.push(`src/${rel} 使用废除值 ${m}`); continue; }
    if (!declared.has(hex)) violations.push(`src/${rel} 出现 tokens 未声明色 ${m}(组件内禁造色)`);
  }
  // rgba 无色相灰/纯黑白检查(藏青 rgba(10,37,64,*) 为合法透明用法)
  for (const m of text.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g) ?? []) {
    const [r, g, b] = m.match(/\d+/g).map(Number);
    if (r === g && g === b && r !== 255) violations.push(`src/${rel} 出现无色相 rgba(${r},${g},${b},…)`);
    if (r > b) violations.push(`src/${rel} 出现暖调 rgba(${r},${g},${b},…)`);
  }
}

if (violations.length) {
  console.error(`中性色单源律审计失败(${violations.length} 项):\n${violations.join('\n')}`);
  process.exit(1);
}
process.stdout.write(`中性色单源律审计通过:tokens 中性组 ${neutralEntries.length} 值冷调同源;src ${files.length} 文件全部色值 ∈ tokens 声明集;废除族零回流\n`);
