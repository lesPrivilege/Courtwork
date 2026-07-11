import { readFile } from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const [component, app, css] = await Promise.all([
  readFile(path.join(appRoot, 'src', 'workbench', 'ThinkingStream.tsx'), 'utf8'),
  readFile(path.join(appRoot, 'src', 'App.tsx'), 'utf8'),
  readFile(path.join(appRoot, 'src', 'styles.css'), 'utf8'),
]);
const failures = [];

if (!component.includes("'thinking' | 'settled' | 'empty'")) failures.push('ThinkingStream must expose the closed three-state union');
if (!component.includes("if (state === 'empty') return null")) failures.push('Empty state must render no trace');
// RP-2.11 改判：最小字符版——竖线字符 terminal 式书写指示，非 SVG 图标（icon 本体动画待 post-P-4 另单）。
if (!component.includes('thinking-cursor')) failures.push('Reasoning indicator must be the terminal vertical-line cursor character');
if (/<svg|BrandMarkIcon|SparkLinesIcon|thinking-stream-glyph/.test(component)) failures.push('Character version must not use an SVG glyph');
if (/thinking-stream-skeleton|thinking-line/.test(component)) failures.push('Reasoning indicator may not be detached HTML skeleton bars');
const turnStart = app.indexOf('data-testid="assistant-turn-demo"');
const turnEnd = app.indexOf('</article>', turnStart);
const streamInTurn = app.indexOf('<ThinkingStream', turnStart);
if (turnStart < 0 || streamInTurn < turnStart || streamInTurn > turnEnd) failures.push('ThinkingStream must remain inside its owning assistant turn');

const cssStart = css.indexOf('/* docs/52 #7');
const cssEnd = css.indexOf('/* docs/52 #10', cssStart);
const thinkingCss = css.slice(cssStart, cssEnd);
if (!thinkingCss.includes('.thinking-stream-toggle') || !thinkingCss.includes('border: 0')) failures.push('Silent anchor must have no frame');
// 竖线字符用藏青（灰阶 shimmer 唯一例外）；terminal 式硬闪只作 opacity。
if (!/\.thinking-cursor\s*\{[^}]*color:\s*var\(--text-primary\)/.test(thinkingCss)) failures.push('Cursor must use the navy ink (竖线用藏青)');
if (!/@keyframes terminal-blink\s*\{[^}]*opacity/.test(thinkingCss)) failures.push('Terminal cursor must blink via opacity only');
if (!thinkingCss.includes('.thinking-stream-toggle .thinking-cursor { animation: none')) failures.push('Settled anchor cursor must be static (no blink)');
if (/--(?:red|amber|blue|green)-/.test(thinkingCss)) failures.push('Reasoning indicator may not consume semantic colors');
if (/signature-line/.test(thinkingCss) || /SignatureLine/.test(component)) failures.push('The legal signature line must not participate in reasoning feedback');
if (!/prefers-reduced-motion[^}]*\.thinking-cursor\s*\{\s*animation:\s*none/.test(css)) failures.push('Reduced motion must stop the cursor blink');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('ThinkingStream three-state/char boundaries: OK');
