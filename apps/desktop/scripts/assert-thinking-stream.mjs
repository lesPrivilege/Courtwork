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
// 批次七⑦（2026-07-12,RP-2.12⑩ 既裁）：thinking 态品牌换装＝BrandThinking（与 chat 面 pending 同件收敛）；
// settled 静锚保留藏青竖线字符（RP-2.11 字符版遗产只余此位）。链注记：RP-2.11 改判 → 本批换装。
if (!component.includes('<BrandThinking')) failures.push('Thinking state must render the BrandThinking mark (批次七⑦)');
if (!component.includes('thinking-cursor')) failures.push('Settled anchor must keep the terminal vertical-line cursor character');
if (/<svg|BrandMarkIcon|SparkLinesIcon|thinking-stream-glyph/.test(component)) failures.push('Reasoning indicator must not use an SVG glyph');
if (/thinking-stream-skeleton|thinking-line/.test(component)) failures.push('Reasoning indicator may not be detached HTML skeleton bars');
const turnStart = app.indexOf('data-testid="assistant-turn-demo"');
const turnEnd = app.indexOf('</article>', turnStart);
const streamInTurn = app.indexOf('<ThinkingStream', turnStart);
if (turnStart < 0 || streamInTurn < turnStart || streamInTurn > turnEnd) failures.push('ThinkingStream must remain inside its owning assistant turn');

const cssStart = css.indexOf('/* docs/52 #7');
const cssEnd = css.indexOf('/* docs/52 #10', cssStart);
const thinkingCss = css.slice(cssStart, cssEnd);
if (!thinkingCss.includes('.thinking-stream-toggle') || !thinkingCss.includes('border: 0')) failures.push('Silent anchor must have no frame');
// 竖线字符用藏青（settled 静锚,无闪烁——blink 随批次七⑦换装退役）；品牌三横只走 transform（motion 白名单同源）。
if (!/\.thinking-cursor\s*\{[^}]*color:\s*var\(--text-primary\)/.test(thinkingCss)) failures.push('Cursor must use the navy ink (竖线用藏青)');
if (/terminal-blink/.test(css)) failures.push('Retired terminal-blink must not resurface (批次七⑦ 换装后字符光标恒静)');
if (!/@keyframes brand-line-write\s*\{[^}]*transform/.test(css)) failures.push('BrandThinking lines must animate via transform-only keyframes');
if (/--(?:red|amber|blue|green)-/.test(thinkingCss)) failures.push('Reasoning indicator may not consume semantic colors');
if (/signature-line/.test(thinkingCss) || /SignatureLine/.test(component)) failures.push('The legal signature line must not participate in reasoning feedback');
if (!css.includes('prefers-reduced-motion') || !css.includes('animation-duration: .01ms')) failures.push('Global reduced-motion guard must remain in place');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('ThinkingStream three-state/char boundaries: OK');
