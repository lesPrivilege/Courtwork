// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PiHistoryBackend } from './pi-history';
import { PI_HISTORY_SCHEMA_VERSION, PI_HISTORY_STORAGE_KEY } from './pi-history';
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

function historyBackend(store: Map<string, string>): PiHistoryBackend {
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
  };
}

function draft(logicalPath: string) {
  return {
    logicalPath,
    byteLength: 12,
    contentSha256: 'c'.repeat(64),
    disposition: 'created',
    recordedAt: 1,
  };
}

/** v1 旧缓存（无 `grantId` 字段）：升级后不得迁移、不得猜测归属，整库当空。 */
function v1History(): PiHistoryBackend {
  return historyBackend(
    new Map([[
      'courtwork.pi-drafts.v1',
      JSON.stringify({
        version: 1,
        sessions: [{
          containerId: 'matter-1',
          sessionId: 'session-prior',
          recordedAt: 1,
          drafts: [draft('上一段.md')],
        }],
      }),
    ]]),
  );
}

function v2History(sessions: unknown[]): PiHistoryBackend {
  return historyBackend(
    new Map([[
      PI_HISTORY_STORAGE_KEY,
      JSON.stringify({ version: PI_HISTORY_SCHEMA_VERSION, sessions }),
    ]]),
  );
}

function makePort(): PiLanePort {
  return {
    start: vi.fn(async () => ({ capabilities: [], leg: 1, records: [] })),
    prompt: vi.fn(async () => undefined),
    cancel: vi.fn(async () => undefined),
    decision: vi.fn(async () => undefined),
    teardown: vi.fn(async () => undefined),
    openWorkspaceMarkdown: vi.fn(async () => ({
      ok: true as const,
      view: { logicalPath: '上一段.md', content: '# 旧授权', contentSha256: 'c'.repeat(64), byteLength: 12 },
    })),
  };
}

function Harness({ port, grantId, historyBackend, mintSessionId }: {
  port: PiLanePort;
  grantId: string;
  historyBackend: PiHistoryBackend;
  mintSessionId?: () => string;
}) {
  currentSession = usePiLaneSession({
    port,
    containerId: 'matter-1',
    grantId,
    modelId: 'deepseek-v4-flash',
    maxTurns: 12,
    maxUsd: null,
    mintSessionId,
    historyBackend,
  });
  return null;
}

function mount(grantId: string, historyBackend: PiHistoryBackend, port: PiLanePort, mintSessionId?: () => string) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(createElement(Harness, { port, grantId, historyBackend, mintSessionId })));
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
    const historyBackend = v2History([{
      containerId: 'matter-1',
      grantId: 'grant-old',
      sessionId: 'session-prior',
      recordedAt: 1,
      drafts: [draft('上一段.md')],
    }]);
    mount('grant-old', historyBackend, port);
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

  it('R1 · v1 旧授权缓存＋全新挂载/reload＋同 container new grant：prior 为 0、open 为 0', async () => {
    const port = makePort();
    // 全新挂载直接用 grant-new 初始渲染，模拟「reload 后以新 grant 首挂」：
    // 正确性不得依赖「本次进程里清过缓存」这个 effect 发生过。
    mount('grant-new', v1History(), port);
    await act(async () => undefined);

    expect({ prior: currentSession?.priorSessions.length }).toEqual({ prior: 0 });

    await act(async () => {
      await currentSession?.open('session-prior', '上一段.md');
    });
    expect(vi.mocked(port.openWorkspaceMarkdown).mock.calls.length).toBe(0);
  });

  it('R1 · 持有旧 grant 的 start closure 在换 grant 后调用：mint/state/coalescer/port 全部零 effect', async () => {
    const port = makePort();
    const mint = vi.fn(() => 'session-current');
    mount('grant-old', historyBackend(new Map()), port, mint);
    // 捕获 grant-old 这一轮的 start closure，再切到 grant-new。
    const staleStart = currentSession!.start;
    act(() => root?.render(createElement(Harness, { port, grantId: 'grant-new', historyBackend: historyBackend(new Map()), mintSessionId: mint })));

    await act(async () => { await staleStart(); });

    expect(mint).not.toHaveBeenCalled();
    expect(vi.mocked(port.start)).not.toHaveBeenCalled();
    expect(currentSession?.sessionId).toBeNull();
    expect(currentSession?.status).toBe('idle');
    expect(currentSession?.view.blocks).toHaveLength(0);
  });

  it('R1 · v2 中旧 grant 与当前 grant 并存：只当前 grant 可见、可 open', async () => {
    const port = makePort();
    const historyBackend = v2History([
      {
        containerId: 'matter-1',
        grantId: 'grant-old',
        sessionId: 'session-prior',
        recordedAt: 1,
        drafts: [draft('旧段.md')],
      },
      {
        containerId: 'matter-1',
        grantId: 'grant-new',
        sessionId: 'session-new',
        recordedAt: 2,
        drafts: [draft('新段.md')],
      },
    ]);
    mount('grant-new', historyBackend, port);
    await act(async () => undefined);

    expect(currentSession?.priorSessions.map((s) => s.sessionId)).toEqual(['session-new']);

    await act(async () => {
      await currentSession?.open('session-prior', '旧段.md');
    });
    expect(vi.mocked(port.openWorkspaceMarkdown).mock.calls.length).toBe(0);

    await act(async () => {
      await currentSession?.open('session-new', '新段.md');
    });
    expect(vi.mocked(port.openWorkspaceMarkdown).mock.calls.length).toBe(1);
  });

  it('R1 · 同 grant 历史跨 reload 仍可见可 open；新 grant start 正常', async () => {
    const port = makePort();
    const historyBackend = v2History([{
      containerId: 'matter-1',
      grantId: 'grant-new',
      sessionId: 'session-prior',
      recordedAt: 1,
      drafts: [draft('上一段.md')],
    }]);
    mount('grant-new', historyBackend, port, () => 'session-current');
    await act(async () => undefined);

    expect(currentSession?.priorSessions.map((s) => s.sessionId)).toEqual(['session-prior']);

    await act(async () => {
      await currentSession?.open('session-prior', '上一段.md');
    });
    expect(vi.mocked(port.openWorkspaceMarkdown).mock.calls.length).toBe(1);

    await act(async () => { await currentSession?.start(); });
    expect(currentSession?.sessionId).toBe('session-current');
    expect(vi.mocked(port.start).mock.calls.length).toBe(1);
  });
});
