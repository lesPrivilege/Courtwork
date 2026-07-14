import { readFile } from 'node:fs/promises';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '..');
const [component, projection, app, css] = await Promise.all([
  readFile(path.join(appRoot, 'src', 'chat', 'ProcessTrace.tsx'), 'utf8'),
  readFile(path.join(appRoot, 'src', 'chat', 'process-trace-projection.ts'), 'utf8'),
  readFile(path.join(appRoot, 'src', 'App.tsx'), 'utf8'),
  readFile(path.join(appRoot, 'src', 'styles.css'), 'utf8'),
]);
const failures = [];

if (!component.includes("'running' | 'settled' | 'empty' | 'failed'")) failures.push('ProcessTrace must expose the closed four-state union');
if (!component.includes("'reasoning' | 'progress'")) failures.push('ProcessTrace must distinguish reasoning and progress modes');
if (!component.includes("if (view.state === 'empty') return null")) failures.push('Empty state must render no trace');
if (!component.includes('<BrandThinking')) failures.push('Running state must render the shared BrandThinking mark');
if (!component.includes('process-trace-cursor')) failures.push('Settled anchor must keep the navy terminal cursor character');
if (/<svg|BrandMarkIcon|SparkLinesIcon|thinking-stream-glyph/.test(component)) failures.push('Process trace may not use a second SVG glyph');
if (/thinking-stream-skeleton|thinking-line/.test(component)) failures.push('Process trace may not add detached skeleton bars');
if (!projection.includes("turn.reasoning.status === 'absent'")) failures.push('Turn adapter must preserve explicit reasoning absence');
if (!projection.includes("projection.progress.join('；')")) failures.push('Work adapter body must come only from projected progress events');
if (/已梳理请求目标|fallback/.test(projection)) failures.push('Process projection may not invent fallback content');
if (!projection.includes("projection.phase === 'canceled'") || !projection.includes("state: 'failed'")) failures.push('Canceled Work must never project as settled');

const turnStart = app.indexOf('data-testid="assistant-turn-demo"');
const turnEnd = app.indexOf('</article>', turnStart);
const traceInTurn = app.indexOf('<ProcessTrace', turnStart);
if (turnStart < 0 || traceInTurn < turnStart || traceInTurn > turnEnd) failures.push('Work ProcessTrace must remain inside its owning assistant turn');
if (!app.includes('processTraceFromTurn(turn)')) failures.push('Chat reasoning must consume the Turn projection adapter');
if (!app.includes('const workTraceView = processTraceFromWorkProjection({ ...session, phase: workPhase })')) failures.push('Work progress must consume events and phase from the Work projection adapter');
if (!app.includes("const workStopped = workTraceView.state === 'failed'") || !app.includes('!workStopped && (session.confirmation || session.completed)')) failures.push('Failed or canceled Work may not render a completed event');
if (app.includes('<ThinkingStream') || app.includes('<details className="chat-reasoning"')) failures.push('Parallel reasoning/progress implementations are forbidden');
if (app.includes('chat-reasoning-absent') || app.includes('无可用推理内容')) failures.push('Absent reasoning must leave no fabricated UI trace');

const cssStart = css.indexOf('/* TRACE-UI-1');
const cssEnd = css.indexOf('/* 状态条模型配置 */', cssStart);
const traceCss = css.slice(cssStart, cssEnd);
if (!traceCss.includes('.process-trace-toggle') || !traceCss.includes('border: 0')) failures.push('Settled disclosure anchor must have no frame');
if (!/\.process-trace-cursor\s*\{[^}]*color:\s*var\(--text-primary\)/.test(traceCss)) failures.push('Cursor must use the navy ink');
if (/terminal-blink/.test(css)) failures.push('The settled cursor must remain static');
if (!/@keyframes brand-line-write\s*\{[^}]*transform/.test(css)) failures.push('BrandThinking must remain transform-only');
if (/--(?:red|amber|blue|green)-/.test(traceCss)) failures.push('Process trace may not consume semantic colors');
if (/signature-line/.test(traceCss) || /SignatureLine/.test(component)) failures.push('The legal signature line must not participate in process feedback');
if (!css.includes('prefers-reduced-motion') || !css.includes('animation-duration: .01ms')) failures.push('Global reduced-motion guard must remain in place');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('ProcessTrace shared lifecycle boundaries: OK');
