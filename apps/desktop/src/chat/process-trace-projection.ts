import type { WorkProjectionPhase } from '../protocol/client';
import type { TurnProjection } from '../provider/turn-protocol-client';
import type { ProcessTraceView } from './ProcessTrace';

interface WorkTraceProjection {
  progress: readonly string[];
  failures: readonly unknown[];
  completed: boolean;
  confirmation?: unknown;
  phase?: WorkProjectionPhase;
}

function hasContent(content: string): boolean {
  return content.trim().length > 0;
}

/** Mechanical Turn projection adapter. Explicit `absent` always leaves zero trace. */
export function processTraceFromTurn(turn: TurnProjection): ProcessTraceView {
  if (turn.reasoning.status === 'absent') return { mode: 'reasoning', state: 'empty' };
  if (turn.reasoning.status === 'pending') {
    return turn.status === 'running'
      ? { mode: 'reasoning', state: 'running' }
      : { mode: 'reasoning', state: 'empty' };
  }
  if (!hasContent(turn.reasoning.content)) return { mode: 'reasoning', state: 'empty' };
  if (turn.status === 'running') return { mode: 'reasoning', state: 'running', content: turn.reasoning.content };
  if (turn.status === 'failed') return { mode: 'reasoning', state: 'failed', content: turn.reasoning.content };
  if (turn.status === 'completed') return { mode: 'reasoning', state: 'settled', content: turn.reasoning.content };
  return { mode: 'reasoning', state: 'empty' };
}

/** Mechanical Work projection adapter. Progress events are the only body content. */
export function processTraceFromWorkProjection(projection: WorkTraceProjection): ProcessTraceView {
  const content = projection.progress.join('；');
  const stopped = projection.failures.length > 0
    || projection.phase === 'failed'
    || projection.phase === 'canceled'
    || projection.phase === 'interrupted';
  if (stopped) return {
    mode: 'progress',
    state: 'failed',
    ...(hasContent(content) ? { content } : {}),
  };
  if (!hasContent(content)) return { mode: 'progress', state: 'empty' };
  const terminal = projection.completed
    || projection.confirmation !== undefined
    || projection.phase === 'paused'
    || projection.phase === 'completed';
  return { mode: 'progress', state: terminal ? 'settled' : 'running', content };
}
