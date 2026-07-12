import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const [app, rail, css] = await Promise.all([
  readFile(path.join(root, 'src/App.tsx'), 'utf8'),
  readFile(path.join(root, 'src/rail/CaseRail.tsx'), 'utf8'),
  readFile(path.join(root, 'src/styles.css'), 'utf8'),
]);

const failures = [];
if (!app.includes('data-testid="window-chrome"') || !app.includes('data-tauri-drag-region')) failures.push('window chrome must be explicit and draggable');
if (/aria-label="(?:Back|Forward)"/.test(app)) failures.push('window chrome must not invent browser history actions');
if (app.includes('chat-global-action') || app.includes('shortcut-trigger')) failures.push('chat header must contain zero global action buttons');
if (!css.includes('.right-rail-modules')) failures.push('右列须为四模块手风琴（right-rail-modules）');
if (!css.includes('.user-message {') || !css.includes('.user-message { align-self: flex-end; max-width: 78%; padding: 7px 10px; border: 0;')) failures.push('user message must remain flat until edit mode exists');
if (!css.includes('.case-card { position: relative; border: 0;')) failures.push('case rows must remain outline-flat');
if (!css.includes('.turn-card {') || !css.includes('border-radius: 0;\n  background: transparent')) failures.push('chat turn cards must remain flat ledger rows');
if (rail.includes('data-testid="collapse-left-rail"')) failures.push('sidebar control belongs to window chrome, not rail content');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('RP-2.9.1 chrome/flat-controls/dock/rail boundaries: OK');
