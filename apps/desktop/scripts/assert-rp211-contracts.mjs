import { readFile } from 'node:fs/promises';
import path from 'node:path';

// RP-2.11 chat|work 二段 + 顶栏秩序 + 字符推理 + 长消息收敛 + 附件 chip
const root = path.resolve(import.meta.dirname, '..');
const [app, rail, composer, css, copy] = await Promise.all([
  readFile(path.join(root, 'src/App.tsx'), 'utf8'),
  readFile(path.join(root, 'src/rail/CaseRail.tsx'), 'utf8'),
  readFile(path.join(root, 'src/composer/Composer.tsx'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/chrome/copy.ts'), 'utf8'),
]);

const failures = [];
const need = (cond, msg) => { if (!cond) failures.push(msg); };

// —— ① 顶部秩序：案件标题迁顶栏（覆盖 RP-2 #19） ——
need(/chat-titlebar[\s\S]*data-testid="chat-case-title"/.test(app), '① 案件标题须居中栏顶栏（chat-titlebar，与红绿灯同排、约束 chat 列不压 dock）');
need(/\.app-shell\s*\{[^}]*grid-template-rows:\s*minmax\(0, 1fr\)/.test(css) && /\.window-chrome\s*\{[^}]*position:\s*absolute/.test(css), '顶栏改判：卡片上下贯通铺到红绿灯（window-chrome 降透明浮层，无独立顶栏行）');
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
need(composer.includes('data-testid="composer-add-folder"'), '⑤ add-folder 须提为独立沉底钮');

// —— ② 三栏间距 8→12 ——
need(/--elevation-shell-gap:\s*12px/.test(css) && /--elevation-float-inset:\s*12px/.test(css), '② 三栏间距须 8→12');
// —— ⑥ message 按钮缩档 ——
need(/\.message-actions button\s*\{[^}]*width:\s*20px/.test(css), '⑥ message 按钮须缩至 20px');
// —— ⑦ hover 深色块 token（hover 与 selected 分离） ——
need(/--control-hover:\s*#e6eaf0/.test(css), '⑦ --control-hover 须为 #e6eaf0');
need(!/var\(--bg-hover\)/.test(css), '⑦ 扁平按钮 hover 须全迁 --control-hover（无残留 --bg-hover）');

// —— ⑧ 长消息收敛：渐隐遮罩 + Show more/less（过渡而非硬切；纯呈现层） ——
need(app.includes('<CollapsibleMessage'), '⑧ 长消息须走 CollapsibleMessage');
need(/\.collapsible-message\.is-overflowing:not\(\.is-expanded\) \.collapsible-body\s*\{[^}]*mask-image/.test(css), '⑧ 收敛须底部渐隐遮罩（过渡而非硬切）');
need(/\.collapse-toggle:hover\s*\{[^}]*var\(--control-hover\)/.test(css), '⑧ Show more/less 须 hover 深色块凡例');

// —— ⑨ 附件 chip：hairline 卡 + 阴影白名单 +1 ——
need(css.includes('.attachment-chip { box-shadow: var(--elevation-shadow)'), '⑨ composer 附件 chip 须入阴影白名单');

// 无 TSX 内联 svg
if (/<svg\b/.test(app) || /<svg\b/.test(rail)) failures.push('禁 TSX 内联 SVG');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('RP-2.11 chat|work/chrome/collapse/chip boundaries: OK');
