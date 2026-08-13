// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PiHistoryBackend } from './pi-history';
import { PI_HISTORY_STORAGE_KEY } from './pi-history';
import type { PiLanePort } from './pi-lane-port';
import { usePiLaneSession, type PiLaneSession } from './use-pi-lane';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
let currentSession: PiLaneSession | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  currentSession = undefined;
});

function record(
  seq: number,
  type: string,
  payload: Record<string, unknown>,
  extra: Record<string, unknown> = {},
): string {
  return JSON.stringify({
    schemaVersion: 1,
    eventId: `event_${seq}`,
    seq,
    containerId: 'matter-1',
    sessionId: 'session-current',
    leg: 1,
    requestId: 'request-1',
    type,
    recordedAt: seq,
    payload,
    ...extra,
  });
}

const PENDING_RECORDS = [
  record(1, 'session_started', {
    routeId: 'node22-runtime-sealed-cjs-v1',
    routeManifestSha256: '0'.repeat(64),
    nodeVersion: '22.23.1',
    targetTriple: 'aarch64-apple-darwin',
    grantId: 'grant-old',
    caseRoot: '/case',
    promptId: 'md-work-v1',
    provider: { id: 'deepseek', modelId: 'deepseek-v4-flash' },
    limits: { maxTurns: 12, maxUsd: null },
    capabilities: ['case_read', 'workspace_read', 'workspace_write'],
  }),
  record(2, 'user_prompted', { text: '写一份工作稿' }),
  record(3, 'agent_event', { kind: 'tool_started', toolCallId: 'tc-1', toolName: 'write' }),
  record(4, 'tool_proposed', {
    toolCallId: 'tc-1',
    toolName: 'write',
    capability: 'workspace_write',
    logicalPath: '旧授权.md',
    proposalHash: 'a'.repeat(64),
    contentSha256: 'b'.repeat(64),
    byteLength: 18,
    action: 'created',
  }, { operationId: 'op-old' }),
];

function memoryHistory(): PiHistoryBackend {
  const values = new Map<string, string>([[
    PI_HISTORY_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      sessions: [{
        containerId: 'matter-1',
        sessionId: 'session-prior',
        recordedAt: 1,
        drafts: [{
          logicalPath: '上一段.md',
          byteLength: 12,
          contentSha256: 'c'.repeat(64),
          disposition: 'created',
          recordedAt: 1,
        }],
      }],
    }),
  ]]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
  };
}

function Harness({ port, grantId, historyBackend }: {
  port: PiLanePort;
  grantId: string;
  historyBackend: PiHistoryBackend;
}) {
  currentSession = usePiLaneSession({
    port,
    containerId: 'matter-1',
    grantId,
    modelId: 'deepseek-v4-flash',
    maxTurns: 12,
    maxUsd: null,
    mintSessionId: () => 'session-current',
    historyBackend,
  });
  return null;
}

describe('WORK-AGENT-GUI-1 · Pi session 授权身份', () => {
  it('同 matter 换 grant 立即清旧 projection/history/pending，旧授权命令失效', async () => {
    const port: PiLanePort = {
      start: vi.fn(async () => ({ capabilities: [], leg: 1, records: PENDING_RECORDS })),
      prompt: vi.fn(async () => undefined),
      cancel: vi.fn(async () => undefined),
      decision: vi.fn(async () => undefined),
      teardown: vi.fn(async () => undefined),
      openWorkspaceMarkdown: vi.fn(async () => ({
        ok: true as const,
        view: { logicalPath: '上一段.md', content: '# 旧授权', contentSha256: 'c'.repeat(64), byteLength: 12 },
      })),
    };
    const historyBackend = memoryHistory();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    act(() => root?.render(createElement(Harness, { port, grantId: 'grant-old', historyBackend })));
    await act(async () => { await currentSession?.start(); });
    expect(currentSession?.view.pendingProposal?.operationId).toBe('op-old');
    expect(currentSession?.priorSessions).toHaveLength(1);

    act(() => root?.render(createElement(Harness, { port, grantId: 'grant-new', historyBackend })));
    await act(async () => undefined);
    await act(async () => {
      await currentSession?.decide('op-old', 'approve');
      await currentSession?.open('session-prior', '上一段.md');
    });

    expect({
      sessionId: currentSession?.sessionId,
      pending: currentSession?.view.pendingProposal?.operationId ?? null,
      prior: currentSession?.priorSessions.length,
      decisions: vi.mocked(port.decision).mock.calls.length,
      opens: vi.mocked(port.openWorkspaceMarkdown).mock.calls.length,
    }).toEqual({ sessionId: null, pending: null, prior: 0, decisions: 0, opens: 0 });
  });
});
