import { readFile } from 'node:fs/promises';
import path from 'node:path';

// RP-2.11 chat|work 二段 + 顶栏秩序 + 字符推理 + 长消息收敛 + 附件 chip
const root = path.resolve(import.meta.dirname, '..');
const [app, rail, chrome, composer, css, copy] = await Promise.all([
  readFile(path.join(root, 'src/App.tsx'), 'utf8'),
  readFile(path.join(root, 'src/rail/CaseRail.tsx'), 'utf8'),
  readFile(path.join(root, 'src/chrome/WindowChrome.tsx'), 'utf8'),
  readFile(path.join(root, 'src/composer/Composer.tsx'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/chrome/copy.ts'), 'utf8'),
]);

const failures = [];
const need = (cond, msg) => { if (!cond) failures.push(msg); };

// —— ① 顶部秩序：案件标题迁顶栏（覆盖 RP-2 #19） ——
need(/chat-titlebar[\s\S]*data-testid="chat-case-title"/.test(app), '① 案件标题须居中栏标题带（chat-titlebar，与右卡首标题同基线、约束 chat 列不压 dock）');
need(/\.app-shell\s*\{[^}]*grid-template-rows:\s*minmax\(0, 1fr\)/.test(css) && /\.window-chrome\s*\{[^}]*position:\s*absolute/.test(css), '顶栏改判：window-chrome 为卡内绝对对位层，无独立顶栏行');
need(rail.includes('<WindowChrome') && chrome.includes('data-testid="mac-window-controls-anchor"') && chrome.includes("sync_macos_window_controls"), 'macOS Overlay：window chrome 须为左卡真实子层，并以动态锚框驱动 AppKit 原生按钮组');
need(app.includes('!rightCollapsed && <section className="right-workbench"') && app.includes('className="workspace-edge-control right-edge-control"'), '右栏收拢须整卡退出网格，仅保留 app-shell 边缘展开动作');
need(/\.workspace\.left-collapsed\.right-collapsed\s*\{[^}]*grid-template-columns:\s*minmax\(var\(--chat-min\), 1fr\)[^}]*padding-inline:\s*0/.test(css), '双侧收拢须撤右卡列并让 Chat 占满视口中线');
need(!/padding-left:\s*152px/.test(css), '收拢态不得用固定 152px 避让；标题须按内容测宽磁吸');
need(/chat-titlebar[\s\S]*?\{selectedCase &&/.test(app), '① 顶栏标题仅有容器时出现（chat-titlebar 内 selectedCase 门控）');

// —— chat|work 二段真路由 ——
need(app.includes("useState<'chat' | 'work'>('work')"), 'chat|work viewSegment 状态须存在');
need(/data-testid="view-segment"[\s\S]*segment-chat[\s\S]*segment-work/.test(rail), '段控须落左栏（segment-chat/work）');
need(app.includes('data-testid="chat-canvas"') && app.includes("viewSegment === 'chat'"), 'chat 面轻画布须真路由');
need(app.includes("viewSegment === 'work' && !isWelcome") || app.includes("viewSegment === 'work' &&"), '右栏（schema）须 work 面独有');
need(app.includes('unfiled={[]}'), '气泡行退场：左栏不再承未归档气泡行（Recents 纯容器）');
need(app.includes('storeChatIntoContainer') && app.includes('data-testid="store-chat"'), '存入须桥接容器化仪式（chat → 容器）');
need(copy.includes('segment:') && copy.includes('storeChat:'), 'chrome copy 须含 segment/storeChat 词条');

// —— ⑤ composer 五钮沉底（workmode = chat|work 同源） ——
need(composer.includes('data-testid="composer-workmode"') && composer.includes('onSegmentChange'), '⑤ workmode 钮须 = chat|work 同源');
// 2026-07-12 省并（RP-2.7「重复收『+』」）：独立 add-folder 沉底钮撤,能力折入「+」菜单 Add folder 项——
// 契约随设计迁移：add-folder 仍在（capability），只是唯一入口收敛到 composer-plus-folder，不再有重复的沉底钮。
need(composer.includes('data-testid="composer-plus-folder"'), '⑤ add-folder 能力须在「+」菜单内（composer-plus-folder）');
need(!composer.includes('data-testid="composer-add-folder"'), '⑤ 独立 add-folder 沉底钮须已撤（去重：与「+」菜单项重复）');

// —— ② 三栏间距 8→12 ——
need(/--elevation-shell-gap:\s*28px/.test(css) && /--elevation-float-inset:\s*8px/.test(css), '② 三栏 gap=28；左右浮卡外缘 inset=8（macOS Overlay 真机纠偏）');
// —— ⑥ message 按钮缩档 ——
need(/\.message-actions button\s*\{[^}]*width:\s*20px/.test(css), '⑥ message 按钮须缩至 20px');
// —— ⑦ hover 深色块 token（hover 与 selected 分离） ——
// B1 色阶批：刻本印页宗置换，--control-hover 由 #dae3ec 换为 #dde0e4
// （出处 color-mix(in srgb, text.primary 10%, bg.surface)）。「hover 与 selected 两语义两色」
// 的约束不变，只换值——两者可辨性实测 B−R：selected 29 / hover 6。
need(/--control-hover:\s*#dde0e4/.test(css), '⑦ --control-hover 须为 #dde0e4');
need(!/var\(--bg-hover\)/.test(css), '⑦ 扁平按钮 hover 须全迁 --control-hover（无残留 --bg-hover）');

// —— ⑧ 长消息收敛：渐隐遮罩 + Show more/less（过渡而非硬切；纯呈现层） ——
need(app.includes('<CollapsibleMessage'), '⑧ 长消息须走 CollapsibleMessage');
need(/\.collapsible-message\.is-overflowing:not\(\.is-expanded\) \.collapsible-body\s*\{[^}]*mask-image/.test(css), '⑧ 收敛须底部渐隐遮罩（过渡而非硬切）');
need(/\.collapse-toggle:hover\s*\{[^}]*var\(--control-hover\)/.test(css), '⑧ Show more/less 须 hover 深色块凡例');

// —— ⑨ 附件 chip：hairline 卡 + 阴影白名单 +1 ——
need(css.includes('.attachment-chip { box-shadow: var(--elevation-shadow)'), '⑨ composer 附件 chip 须入阴影白名单');

// 无 TSX 内联 svg。记号系豁免同 verify-icons.mjs：禁的是**几何**进 TSX，而 `<use href="#mark-*">`
// 零几何（引用不是图形），记号几何的唯一住所是件库且由 assert-schema-parts 逐条锁。剥完仍有即红。
const stripMarkRefs = (source) => source.replace(/<svg\b[^>]*>\s*<use\s+href="#mark-[a-z-]+"\s*\/>\s*<\/svg>/g, '');
if (/<svg\b/.test(stripMarkRefs(app)) || /<svg\b/.test(stripMarkRefs(rail))) failures.push('禁 TSX 内联 SVG');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('RP-2.11 chat|work/chrome/collapse/chip boundaries: OK');
