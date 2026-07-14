import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TurnProjection } from '../provider/turn-protocol-client';
import { ProcessTrace } from './ProcessTrace';
import { processTraceFromTurn, processTraceFromWorkProjection } from './process-trace-projection';

function turn(overrides: Partial<TurnProjection>): TurnProjection {
  return {
    turnId: 'turn-trace',
    status: 'running',
    assistantMessage: '',
    reasoning: { status: 'pending' },
    ...overrides,
  };
}

describe('ProcessTrace protocol projection', () => {
  it('maps pending and streamed chat reasoning from the Turn projection only', () => {
    expect(processTraceFromTurn(turn({}))).toEqual({ mode: 'reasoning', state: 'running' });
    expect(processTraceFromTurn(turn({
      reasoning: { status: 'present', content: '先核对请求边界。' },
    }))).toEqual({ mode: 'reasoning', state: 'running', content: '先核对请求边界。' });
  });

  it('leaves no trace when a terminal Turn explicitly has no reasoning', () => {
    const view = processTraceFromTurn(turn({ status: 'completed', reasoning: { status: 'absent' } }));
    expect(view).toEqual({ mode: 'reasoning', state: 'empty' });
    expect(renderToStaticMarkup(createElement(ProcessTrace, { view }))).toBe('');
  });

  it('maps Work progress without calling it reasoning or inventing fallback content', () => {
    expect(processTraceFromWorkProjection({
      progress: ['正在读取原件', '正在核对锚点'], failures: [], completed: false,
    })).toEqual({ mode: 'progress', state: 'running', content: '正在读取原件；正在核对锚点' });
    expect(processTraceFromWorkProjection({ progress: [], failures: [], completed: false }))
      .toEqual({ mode: 'progress', state: 'empty' });
  });

  it('never projects failed or canceled Work as settled', () => {
    expect(processTraceFromWorkProjection({
      progress: ['已读取原件'], failures: [{ type: 'step_failed' }], completed: true,
    })).toMatchObject({ mode: 'progress', state: 'failed' });
    expect(processTraceFromWorkProjection({
      progress: ['已读取原件'], failures: [], completed: true, phase: 'canceled',
    })).toMatchObject({ mode: 'progress', state: 'failed' });
  });
});

describe('ProcessTrace generic rendering', () => {
  it('uses one component identity for reasoning and progress while keeping labels distinct', () => {
    const reasoning = renderToStaticMarkup(createElement(ProcessTrace, {
      view: { mode: 'reasoning', state: 'running', content: '流式推理' },
    }));
    const progress = renderToStaticMarkup(createElement(ProcessTrace, {
      view: { mode: 'progress', state: 'running', content: '工作事件' },
    }));
    expect(reasoning).toContain('data-testid="process-trace"');
    expect(progress).toContain('data-testid="process-trace"');
    expect(reasoning).toContain('data-mode="reasoning"');
    expect(progress).toContain('data-mode="progress"');
    expect(progress).not.toContain('reasoning');
    expect(progress).not.toContain('Thought process');
  });

  it('renders settled content behind a native disclosure button', () => {
    const html = renderToStaticMarkup(createElement(ProcessTrace, {
      view: { mode: 'reasoning', state: 'settled', content: '已核对请求范围。' },
    }));
    expect(html).toContain('data-state="settled"');
    expect(html).toContain('<button');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('已核对请求范围。');
  });
});
