import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const [tokens, css, app, tauri, messageActions] = await Promise.all([
  readFile(path.resolve(root, '../../docs/design/tokens.json'), 'utf8'),
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
// RP-2.9 的克制律「衬线只许一处」随 B2-1 三轨制改写形态，**约束反而更紧**：
// 旧法＝盘一条字面 serif 栈挂在 .welcome-slogan；新法＝衬线只能经两条轨 token 进入产品，
// 任何地方都不许再直呼 Songti/STSong/Noto Serif。故断言由「字面栈恰一处」改为：
//   ① 裸 font-family 里零个 serif 家族名（全部按名消费）；
//   ② serif 家族名只出现在 --font-title / --font-body 两条轨声明里，别处一个不许有。
const rawSerifConsumers = [...css.matchAll(/font-family:\s*[^;]*(?:Songti|STSong|Noto Serif)/gi)];
if (rawSerifConsumers.length !== 0) {
  failures.push(`Serif must be consumed by track token only; found ${rawSerifConsumers.length} raw font-family consumer(s)`);
}
// 逐处判其归属，不数个数——「衬线家族名只许住在两条轨声明里」这条规则本身可以直接断言，
// 用计数去逼近它就得背一个「标题轨恰好写了两个衬线回退」的巧合常数，改天多写一个回退就误红。
const SERIF_NAME = /(?:Songti|STSong|Noto Serif)/i;
const straySerifLines = css.split('\n')
  .map((line, index) => ({ line: line.trim(), no: index + 1 }))
  .filter(({ line }) => SERIF_NAME.test(line))
  .filter(({ line }) => !/^--font-(?:title|body):/.test(line));
if (straySerifLines.length > 0) {
  failures.push(`Serif family names must live only in --font-title/--font-body; stray at line(s) ${straySerifLines.map((x) => x.no).join(', ')}`);
}
if (!css.includes('.welcome-slogan')) failures.push('welcome-slogan consumer missing');
// RP-2.12：welcome 从卡片改居中 home 布局,surfaceRadius 低密度大面消费退役（零消费合法,token 留待未来大面）
if ((css.match(/var\(--home-surface-radius\)/g) ?? []).length > 1) failures.push('home.surfaceRadius 消费漂移（至多一处低密度大面）');
if (!tauri.includes('"titleBarStyle": "Overlay"') || !tauri.includes('"hiddenTitle": true')) failures.push('macOS title bar must use native Overlay with hidden title');
// KEY-PERSIST-1 后：无 stored credential 的冷启动仍不跑 provider probe；stored 启动则必须自动恢复。
if (/probeCredentials\(\);\s*const onProbe/.test(app)) failures.push('cold start must not unconditionally probe credentials');
if (!app.includes("status.credential.phase !== 'stored'")) failures.push('startup provider restore must stay conditional on stored credential');
if (!app.includes('data-credential-probed')) failures.push('credential probe timing must stay observable');
if (!messageActions.includes('courtwork.message-feedback-ledger') || !messageActions.includes('createdAt')) failures.push('message feedback and timestamps must remain ledger-backed');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('RP-2.9 lazy-probe/home/titlebar/message-ledger boundaries: OK');
