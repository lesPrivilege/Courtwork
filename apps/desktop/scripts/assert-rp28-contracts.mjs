import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const [turnCard, composer, utility, app, css] = await Promise.all([
  readFile(path.join(root, 'src/chat/TurnCard.tsx'), 'utf8'),
  readFile(path.join(root, 'src/composer/Composer.tsx'), 'utf8'),
  readFile(path.join(root, 'src/rail/RightRailModules.tsx'), 'utf8'),
  readFile(path.join(root, 'src/App.tsx'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
]);

const failures = [];
if (!turnCard.includes("'event' | 'artifact' | 'file' | 'gate' | 'question'")) failures.push('TurnCard vocabulary must remain closed to event/artifact/file/gate/question');
if (/preview\/renderers|\.\.\/preview/.test(turnCard)) failures.push('Generic turn-card mechanism may not import Preview renderers');
for (const kind of ['event', 'artifact', 'file', 'gate']) {
  if (!app.includes(`kind="${kind}"`)) failures.push(`App must declare the ${kind} turn-card route`);
}
if (!app.includes('<QuestionTurnCard') || !turnCard.includes("data-kind=\"question\"")) failures.push('Question cards must use the generic closed-option ledger component');
if (!turnCard.includes("record('skipped')") || !turnCard.includes('data-answer={answer')) failures.push('Question cards must remain skippable and record enum answers');
if (!app.includes('<ToolCallRow')) failures.push('Tool calls must use the auditable generic row');
if (!composer.includes('!hasBoundContainer && <div className="case-picker"')) failures.push('Composer folder picker must be conditional on an unbound conversation');
// 十四章：模块列为手风琴（body 内联展开,非 L2 popover）——旧 dock popover 语义退役
if (!utility.includes('rail-module-body') || !utility.includes('data-mode="modules"')) failures.push('右列须为四模块手风琴（rail-module-body 内联展开）');
if (/setPreviewOpen|onExpandItem/.test(utility)) failures.push('Utility dock may not replace or close the Preview host');
// ch12 三卡一纸：utility 两态皆坐底纸，永不成卡（schema 唯一右卡）——比 RP-2.8 更严。
if (/<SurfaceCard/.test(utility)) failures.push('模块列禁 SurfaceCard（白卡由 CSS rail-module 表达,schema 唯一 raised 卡）');
if (!utility.includes("data-testid={`module-${item.id}`}") && !utility.includes('data-testid={`module-')) failures.push('模块须带 module-<id> testid（Cowork 四模块序）');
if (!css.includes('.tool-call-details') || !css.includes('var(--type-dense-mono)')) failures.push('Tool details must consume the dense mono token');
if (/<svg\b/.test(turnCard)) failures.push('Turn cards must use the registered Icon SVG pipeline');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('RP-2.8 turn-card/dock/composer boundaries: OK');
