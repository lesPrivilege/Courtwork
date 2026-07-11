import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const [turnCard, composer, utility, app, css] = await Promise.all([
  readFile(path.join(root, 'src/chat/TurnCard.tsx'), 'utf8'),
  readFile(path.join(root, 'src/composer/Composer.tsx'), 'utf8'),
  readFile(path.join(root, 'src/utility/UtilityRail.tsx'), 'utf8'),
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
if (!utility.includes('utility-dock-popover') || !utility.includes('pointerdown')) failures.push('Dock must use an outside-dismissed L2 popover');
if (/setPreviewOpen|onExpandItem/.test(utility)) failures.push('Utility dock may not replace or close the Preview host');
const dockBranch = utility.slice(utility.indexOf("if (mode === 'dock')"), utility.indexOf("return (\n    <div className=\"utility-rail\""));
if (dockBranch.includes('<SurfaceCard') || !dockBranch.includes('<section ref={dockRef} className="utility-dock"')) failures.push('Preview dock must be an L0 embedded band, not a raised SurfaceCard');
if (!css.includes('.tool-call-details') || !css.includes('var(--type-dense-mono)')) failures.push('Tool details must consume the dense mono token');
if (/<svg\b/.test(turnCard)) failures.push('Turn cards must use the registered Icon SVG pipeline');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('RP-2.8 turn-card/dock/composer boundaries: OK');
