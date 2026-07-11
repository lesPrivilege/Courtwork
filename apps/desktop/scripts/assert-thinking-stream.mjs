import { readFile } from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const [component, app, css, icon, tokensRaw] = await Promise.all([
  readFile(path.join(appRoot, 'src', 'workbench', 'ThinkingStream.tsx'), 'utf8'),
  readFile(path.join(appRoot, 'src', 'App.tsx'), 'utf8'),
  readFile(path.join(appRoot, 'src', 'styles.css'), 'utf8'),
  readFile(path.join(appRoot, 'src', 'icons', 'custom', 'spark-lines.svg'), 'utf8'),
  readFile(path.join(repoRoot, 'docs', '32-设计语言包', 'tokens.json'), 'utf8'),
]);
const tokens = JSON.parse(tokensRaw);
const failures = [];

if (tokens.motion?.reasoningLine?.value !== '360ms') failures.push('reasoningLine token must remain 360ms');
if (!component.includes("'thinking' | 'settled' | 'empty'")) failures.push('ThinkingStream must expose the closed three-state union');
if (!component.includes("if (state === 'empty') return null")) failures.push('Empty state must render no trace');
if (icon.match(/<path/g)?.length !== 4) failures.push('spark-lines must be one core path plus three inherited line paths');
if (!component.includes('thinking-stream-glyph')) failures.push('Thinking state must use the single inherited spark-lines glyph');
if (!component.includes('preserveAspectRatio="none"')) failures.push('Thinking glyph must extend its registered SVG line paths without detached bars');
if (/thinking-stream-skeleton|thinking-line/.test(component)) failures.push('Thinking lines may not be detached HTML skeleton bars');
const turnStart = app.indexOf('data-testid="assistant-turn-demo"');
const turnEnd = app.indexOf('</article>', turnStart);
const streamInTurn = app.indexOf('<ThinkingStream', turnStart);
if (turnStart < 0 || streamInTurn < turnStart || streamInTurn > turnEnd) failures.push('ThinkingStream must remain inside its owning assistant turn');

const cssStart = css.indexOf('/* docs/52 #7 / #26');
const cssEnd = css.indexOf('/* docs/52 #10', cssStart);
const thinkingCss = css.slice(cssStart, cssEnd);
if (!thinkingCss.includes('.thinking-stream-toggle') || !thinkingCss.includes('border: 0')) failures.push('Silent icon anchor must have no frame');
if (!thinkingCss.includes('transition: none')) failures.push('Reasoning state body must hard-cut without transition');
if (!thinkingCss.includes('path:nth-of-type(3)') || !thinkingCss.includes('path:nth-of-type(4)') || !thinkingCss.includes('calc(var(--motion-reasoning-line) + var(--motion-reasoning-line))')) {
  failures.push('Reasoning lines must use tokenized sequential delays');
}
if (/--(?:red|amber|blue|green)-/.test(thinkingCss)) failures.push('Reasoning skeleton may not consume semantic colors');
if (/signature-line/.test(thinkingCss) || /SignatureLine/.test(component)) failures.push('The legal signature line must not participate in reasoning feedback');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('ThinkingStream three-state/motion boundaries: OK');
