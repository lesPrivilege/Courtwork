import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const [tokens, css, app, tauri, messageActions] = await Promise.all([
  readFile(path.resolve(root, '../../docs/32-设计语言包/tokens.json'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
  readFile(path.join(root, 'src/App.tsx'), 'utf8'),
  readFile(path.join(root, 'src-tauri/tauri.conf.json'), 'utf8'),
  readFile(path.join(root, 'src/chat/MessageActions.tsx'), 'utf8'),
]);

const failures = [];
const parsed = JSON.parse(tokens);
const expected = { inset: 16, sectionGap: 20, itemGap: 12, rowHeight: 36, iconSize: 18, controlRadius: 8, surfaceRadius: 16, welcomeMeasure: 560 };
for (const [key, value] of Object.entries(expected)) {
  if (parsed.home?.[key]?.value !== value) failures.push(`home.${key} must remain ${value}`);
}
const serifConsumers = [...css.matchAll(/font-family:[^;]*(?:Songti|STSong|Noto Serif)/gi)];
if (serifConsumers.length !== 1 || !css.includes('.welcome-slogan')) failures.push('Serif must have exactly one welcome-slogan consumer');
// RP-2.12：welcome 从卡片改居中 home 布局,surfaceRadius 低密度大面消费退役（零消费合法,token 留待未来大面）
if ((css.match(/var\(--home-surface-radius\)/g) ?? []).length > 1) failures.push('home.surfaceRadius 消费漂移（至多一处低密度大面）');
if (!tauri.includes('"titleBarStyle": "Overlay"') || !tauri.includes('"hiddenTitle": true')) failures.push('macOS title bar must use native Overlay with hidden title');
if (/probeCredentials\(\);\s*const onProbe/.test(app)) failures.push('cold start must not probe credentials');
if (!app.includes('data-credential-probed')) failures.push('credential probe timing must stay observable');
if (!messageActions.includes('courtwork.message-feedback-ledger') || !messageActions.includes('createdAt')) failures.push('message feedback and timestamps must remain ledger-backed');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('RP-2.9 lazy-probe/home/titlebar/message-ledger boundaries: OK');
