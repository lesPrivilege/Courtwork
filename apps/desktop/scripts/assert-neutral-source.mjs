// 中性色单源律门禁（docs/design/tokens.json）
// 1) tokens 中性组自查:禁无色相灰(R==G==B,白卡 #FFFFFF 豁免)、禁暖调中性(R>B);
//    语义色预算(semantic/action/focus/link)豁免——暖色是语义,不是中性。
// 2) 消费面(src/**.css|ts|tsx)出现的一切 hex 必须 ∈ tokens 声明集(单源:组件内禁造色)。
// 3) 废除值黑名单:旧无色相/暖灰族与旧中性值永不回流(含 tokens 自身)。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const tokens = JSON.parse(readFileSync(resolve('../../docs/design/tokens.json'), 'utf8'));
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
        || path === 'color.line'; // 法理之线五种处置语义色豁免
      walk(value, path ? `${path}.${key}` : key, nextSemantic);
    }
  }
};
walk(tokens, '', false);

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
  // —— B1 色阶批退役族（2026-07-19，锚 #0A2540/H=210° → #232B38/H≈217°）——
  // 验收缺陷二：本门原只验「消费值 ∈ 当前声明集」，故 tokens 自身可把旧锚重新声明为合法，
  // 「原子性」不成立。退役值入黑名单后，回注任一旧值即红（含 tokens 声明侧与 src 消费侧）。
  // 作用域说明：本门只扫 tokens.json 非 $ 块与 apps/desktop/src；site/、packages/ 与
  // scripts/ 不在扫描面——site 按裁定仍持旧色板（「仅同步 token 命名」），不受本表约束。
  '#f6f9fc', '#eaeff4', '#e2e9f0', '#dae3ec', '#dde7f2', // 旧三级台阶与交互底
  '#0a2540', '#425466', '#6e8098', '#98a9ba', // 旧锚与文字四级
  '#e3e9ef', '#cdd8e3', '#1a3a5c', '#eef4fa', // 旧线、主操作 hover、核验底纹
  '#dc2626', '#b91c1c', '#fef2f2', // 旧红族
  '#d97706', '#b45309', '#fcf6e8', // 旧琥珀族
  '#64748b', '#475569', '#f1f5f9', // 旧板岩族
  // 绿族（#16a34a/#15803d/#f0fdf4）与蓝族（#2563eb/#1d4ed8/#eff6ff）未退役，不入表：
  // 裁定③「绿的全部既有槽零触碰」＋「记号色古、交互语义色今」蓝绿沿现行。
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
