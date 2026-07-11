import { readFile } from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const repoRoot = path.resolve(appRoot, '..', '..');
const [component, app, css, icon, tokensRaw] = await Promise.all([
  readFile(path.join(appRoot, 'src', 'workbench', 'ThinkingStream.tsx'), 'utf8'),
  readFile(path.join(appRoot, 'src', 'App.tsx'), 'utf8'),
  readFile(path.join(appRoot, 'src', 'styles.css'), 'utf8'),
  readFile(path.join(appRoot, 'src', 'icons', 'custom', 'brand-mark.svg'), 'utf8'),
  readFile(path.join(repoRoot, 'docs', '32-设计语言包', 'tokens.json'), 'utf8'),
]);
const tokens = JSON.parse(tokensRaw);
const failures = [];

if (tokens.motion?.reasoningLine?.value !== '360ms') failures.push('reasoningLine token must remain 360ms');
if (!component.includes("'thinking' | 'settled' | 'empty'")) failures.push('ThinkingStream must expose the closed three-state union');
if (!component.includes("if (state === 'empty') return null")) failures.push('Empty state must render no trace');
// #26.3：推理指示 = app icon 本体（藏青竖线 + 三横杠），四路径 = 一竖线 + 三横杠。
if (icon.match(/<path/g)?.length !== 4) failures.push('brand-mark must be one vertical stem plus three horizontal bars');
if (!component.includes('BrandMarkIcon')) failures.push('Reasoning anchor must be the brand mark (app icon body)');
if (/SparkLinesIcon|spark-lines/.test(component)) failures.push('Spark star anchor is retired by #26.2/#26.3');
if (!component.includes('thinking-stream-glyph')) failures.push('Thinking state must use the single brand-mark glyph');
if (/thinking-stream-skeleton|thinking-line/.test(component)) failures.push('Thinking bars may not be detached HTML skeleton bars');
const turnStart = app.indexOf('data-testid="assistant-turn-demo"');
const turnEnd = app.indexOf('</article>', turnStart);
const streamInTurn = app.indexOf('<ThinkingStream', turnStart);
if (turnStart < 0 || streamInTurn < turnStart || streamInTurn > turnEnd) failures.push('ThinkingStream must remain inside its owning assistant turn');

const cssStart = css.indexOf('/* docs/52 #7 / #26');
const cssEnd = css.indexOf('/* docs/52 #10', cssStart);
const thinkingCss = css.slice(cssStart, cssEnd);
if (!thinkingCss.includes('.thinking-stream-toggle') || !thinkingCss.includes('border: 0')) failures.push('Silent icon anchor must have no frame');
if (!thinkingCss.includes('transition: none')) failures.push('Reasoning state body must hard-cut without transition');
if (!thinkingCss.includes('path:first-child')) failures.push('Vertical stem must stand static (path:first-child)');
if (!thinkingCss.includes('path:nth-of-type(3)') || !thinkingCss.includes('path:nth-of-type(4)') || !thinkingCss.includes('calc(var(--motion-reasoning-line) + var(--motion-reasoning-line))')) {
  failures.push('Reasoning bars must use tokenized sequential delays');
}
// 品牌线用藏青（灰阶 shimmer 唯一例外）：glyph 消费 --text-primary，不得落语义色。
if (!/\.thinking-stream-glyph[^{]*\{[^}]*color:\s*var\(--text-primary\)/.test(thinkingCss)) failures.push('Brand mark must use the navy ink (品牌线用藏青)');
if (/--(?:red|amber|blue|green)-/.test(thinkingCss)) failures.push('Reasoning skeleton may not consume semantic colors');
if (/signature-line/.test(thinkingCss) || /SignatureLine/.test(component)) failures.push('The legal signature line must not participate in reasoning feedback');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('ThinkingStream three-state/motion boundaries: OK');
