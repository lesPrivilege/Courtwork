// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
// @ts-expect-error Node built-in is available to Vitest; the desktop app tsconfig intentionally omits node typings.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptySessionView, type PiToolCallView } from './pi-projection';
import { PiLanePanel } from './PiLanePanel';
import { PiDraftViewer } from './PiDraftViewer';
import { PiToolCard } from './PiToolCard';
import { PI_COPY } from './pi-copy';
import type { PiLaneSession } from './use-pi-lane';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserver }).ResizeObserver = ResizeObserver;

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

function render(node: React.ReactNode) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(node));
}

function clearRender() {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
}

function makeSession(overrides: Partial<PiLaneSession> = {}): PiLaneSession {
  return {
    status: 'idle',
    failure: null,
    sessionId: null,
    view: emptySessionView('matter-1', ''),
    priorSessions: [],
    start: vi.fn(async () => undefined),
    send: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
    decide: vi.fn(async () => undefined),
    open: vi.fn(async () => ({
      ok: true as const,
      view: { logicalPath: '纪要.md', content: '# 纪要', contentSha256: 'c'.repeat(64), byteLength: 12 },
    })),
    restart: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('WORK-AGENT-SHOWCASE-1 · Work 纵切 born-red', () => {
  it('未绑定：绑定文件夹是主动作，点击真调用既有 callback，且没有 disabled Start 占视觉主角', () => {
    const onBindFolder = vi.fn();
    render(
      createElement(PiLanePanel, {
        session: makeSession(),
        bound: false,
        matterTitle: '设备采购案',
        onBindFolder,
        onOpenModelSettings: vi.fn(),
      }),
    );
    expect(container!.querySelector('[data-testid="pi-start"]')).toBeNull();
    const bind = container!.querySelector('[data-testid="pi-bind-folder"]');
    expect(bind).not.toBeNull();
    act(() => bind!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onBindFolder).toHaveBeenCalledTimes(1);
  });

  it('unavailable：主动作是打开既有模型设置，普通 idle 不显示恢复动作', () => {
    const onOpenModelSettings = vi.fn();
    render(
      createElement(PiLanePanel, {
        session: makeSession({
          status: 'unavailable',
          failure: { code: 'model_unavailable', message: '模型不可用' },
        }),
        bound: true,
        matterTitle: '设备采购案',
        bindingLabel: '设备采购案卷',
        onBindFolder: vi.fn(),
        onOpenModelSettings,
      }),
    );
    expect(container!.querySelector('[data-testid="pi-start"]')).toBeNull();
    const openSettings = container!.querySelector('[data-testid="pi-open-model-settings"]');
    expect(openSettings).not.toBeNull();
    act(() => openSettings!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onOpenModelSettings).toHaveBeenCalledTimes(1);

    container!.remove();
    root = undefined;
    container = undefined;
    render(
      createElement(PiLanePanel, {
        session: makeSession({ status: 'idle' }),
        bound: true,
        matterTitle: '设备采购案',
        bindingLabel: '设备采购案卷',
        onBindFolder: vi.fn(),
        onOpenModelSettings: vi.fn(),
      }),
    );
    expect(container!.querySelector('[data-testid="pi-open-model-settings"]')).toBeNull();
  });

  it('matter 身份与授权文件夹进入 Work 面主层', () => {
    render(
      createElement(PiLanePanel, {
        session: makeSession({ status: 'ready', sessionId: 'session-1', view: emptySessionView('matter-1', 'session-1') }),
        bound: true,
        matterTitle: '设备采购案',
        bindingLabel: '设备采购案卷',
        onBindFolder: vi.fn(),
        onOpenModelSettings: vi.fn(),
      }),
    );
    expect(container!.querySelector('[data-testid="pi-work-head"]')?.textContent).toContain('设备采购案');
    expect(container!.querySelector('[data-testid="pi-binding-label"]')?.textContent).toBe('设备采购案卷');
  });

  it('session id 默认收进运行详情，不占主阅读层；展开后仍可达', () => {
    render(
      createElement(PiLanePanel, {
        session: makeSession({ status: 'ready', sessionId: 'session-1', view: emptySessionView('matter-1', 'session-1') }),
        bound: true,
        matterTitle: '设备采购案',
        bindingLabel: '设备采购案卷',
        onBindFolder: vi.fn(),
        onOpenModelSettings: vi.fn(),
      }),
    );
    expect(container!.querySelector('[data-testid="pi-status-ident"]')).toBeNull();
    const details = container!.querySelector('[data-testid="pi-run-details"]');
    expect(details).not.toBeNull();
    expect(details!.textContent).toContain('session-1');
  });

  it('write proposal 先说人类动作与目标文件，bytes/hash 收进默认折叠的运行详情', () => {
    const call: PiToolCallView = {
      toolCallId: 'tc-1',
      toolName: 'write',
      running: false,
      proposal: {
        operationId: 'op-1',
        logicalPath: '纪要.md',
        byteLength: 137,
        contentSha256: 'a'.repeat(64),
        action: 'created',
      },
      effect: {
        state: 'succeeded',
        logicalPath: '纪要.md',
        contentSha256: 'a'.repeat(64),
        byteLength: 137,
      },
    };
    render(
      createElement(PiToolCard, {
        call,
        pending: false,
        busy: false,
        onDecide: vi.fn(),
        onOpen: vi.fn(),
      }),
    );
    const request = container!.querySelector('[data-testid="pi-tool-request"]');
    expect(request).not.toBeNull();
    expect(request!.textContent).toContain('新建工作稿');
    expect(request!.textContent).toContain('纪要.md');
    expect(container!.querySelector('[data-tool="write"] .pi-tool-name')?.textContent).toBe('write');
    const details = container!.querySelector('[data-testid="pi-tool-details"]');
    expect(details).not.toBeNull();
    expect(details!.textContent).toContain('137');
    expect(details!.textContent).toContain('a'.repeat(12));
  });

  it('未决定的 proposal 不得先显示已新建工作稿', () => {
    const call: PiToolCallView = {
      toolCallId: 'tc-pending',
      toolName: 'write',
      running: true,
      proposal: {
        operationId: 'op-pending',
        logicalPath: '纪要.md',
        byteLength: 137,
        contentSha256: 'a'.repeat(64),
        action: 'created',
      },
    };
    render(
      createElement(PiToolCard, {
        call,
        pending: true,
        busy: false,
        onDecide: vi.fn(),
        onOpen: vi.fn(),
      }),
    );
    const request = container!.querySelector('[data-testid="pi-tool-request"]');
    expect(request).not.toBeNull();
    expect(request!.textContent).toContain('新建工作稿');
    expect(request!.textContent).toContain('纪要.md');
    expect(request!.textContent).not.toContain('已新建');
    expect(container!.querySelector('[data-testid="pi-proposal"]')?.textContent).toContain('待你决定');
  });

  it('运行详情默认收起：未知开销仍在详情中明确显示，不折成 0', () => {
    render(
      createElement(PiLanePanel, {
        session: makeSession({
          status: 'ready',
          sessionId: 'session-unknown-cost',
          view: emptySessionView('matter-1', 'session-unknown-cost'),
        }),
        bound: true,
        matterTitle: '设备采购案',
        onBindFolder: vi.fn(),
        onOpenModelSettings: vi.fn(),
      }),
    );

    const details = container!.querySelector('[data-testid="pi-run-details"]');
    expect(details).not.toBeNull();
    expect(details!.hasAttribute('open')).toBe(false);
    expect(details!.querySelector('[data-testid="pi-runtime-cost"]')?.textContent).toBe(PI_COPY.costUnknown);
    expect(container!.querySelector('.pi-status-slot:nth-of-type(2)')).toBeNull();
  });

  it('终态只留下工作稿查看或另起一段：不再显示可提交的当前段 composer', () => {
    const view = emptySessionView('matter-1', 'session-terminal');
    render(
      createElement(PiLanePanel, {
        session: makeSession({
          status: 'ready',
          sessionId: 'session-terminal',
          view: {
            ...view,
            sessionTerminal: { type: 'session_completed' },
            drafts: [{
              logicalPath: '纪要.md',
              byteLength: 12,
              contentSha256: 'c'.repeat(64),
              disposition: 'created',
              recordedAt: 1,
            }],
          },
        }),
        bound: true,
        matterTitle: '设备采购案',
        onBindFolder: vi.fn(),
        onOpenModelSettings: vi.fn(),
      }),
    );

    expect(container!.querySelector('[data-testid="pi-send"]')).toBeNull();
    expect(container!.querySelector('[data-testid="pi-composer-input"]')).toBeNull();
    expect(container!.querySelector('[data-testid="pi-draft-open"]')).not.toBeNull();
    expect(container!.querySelector('[data-testid="pi-restart"]')).not.toBeNull();
  });

  it('工具卡默认先说人类动作与目标：工具名和 bytes/hash 只在收起的详情中出现', () => {
    const call: PiToolCallView = {
      toolCallId: 'tc-human-first',
      toolName: 'write',
      running: false,
      proposal: {
        operationId: 'op-human-first',
        logicalPath: '长中文纪要.md',
        byteLength: 137,
        contentSha256: 'a'.repeat(64),
        action: 'created',
      },
    };
    render(
      createElement(PiToolCard, {
        call,
        pending: true,
        busy: false,
        onDecide: vi.fn(),
        onOpen: vi.fn(),
      }),
    );

    expect(container!.querySelector('[data-testid="pi-tool-action"]')?.textContent).toContain('新建工作稿');
    expect(container!.querySelector('[data-testid="pi-tool-action"]')?.textContent).toContain('长中文纪要.md');
    expect(container!.querySelector('.pi-tool-head .pi-tool-name')).toBeNull();
    const details = container!.querySelector('[data-testid="pi-tool-details"]');
    expect(details).not.toBeNull();
    expect(details!.hasAttribute('open')).toBe(false);
    expect(details!.querySelector('.pi-tool-name')?.textContent).toBe('write');
    expect(details!.textContent).toContain('137');
    expect(details!.textContent).toContain('a'.repeat(12));
  });
});

describe('WORK-SURFACE-COMPOSITION-1 · 冷调工作面 born-red', () => {
  it('无当前工作稿时，非终态不渲染索引；终态诚实显示空结果', () => {
    render(
      createElement(PiLanePanel, {
        session: makeSession({
          status: 'ready',
          sessionId: 'session-running',
          view: emptySessionView('matter-1', 'session-running'),
        }),
        bound: true,
        matterTitle: '设备采购案',
        onBindFolder: vi.fn(),
        onOpenModelSettings: vi.fn(),
      }),
    );
    expect(container!.querySelector('[data-testid="pi-drafts"]')).toBeNull();

    clearRender();
    const terminal = emptySessionView('matter-1', 'session-terminal');
    render(
      createElement(PiLanePanel, {
        session: makeSession({
          status: 'ready',
          sessionId: 'session-terminal',
          view: { ...terminal, sessionTerminal: { type: 'session_completed' } },
        }),
        bound: true,
        matterTitle: '设备采购案',
        onBindFolder: vi.fn(),
        onOpenModelSettings: vi.fn(),
      }),
    );
    expect(container!.querySelector('[data-testid="pi-drafts-empty"]')).not.toBeNull();
  });

  it('当前工作稿索引位于 viewport 内，并排在消息/工具投影之后', () => {
    const view = emptySessionView('matter-1', 'session-terminal');
    render(
      createElement(PiLanePanel, {
        session: makeSession({
          status: 'ready',
          sessionId: 'session-terminal',
          view: {
            ...view,
            sessionTerminal: { type: 'session_completed' },
            blocks: [{
              requestId: 'request-1',
              prompt: '整理材料并写成工作稿',
              reasoning: '',
              text: '已完成',
              parts: [{ kind: 'text', text: '已完成' }],
              toolCallIds: [],
              terminal: { status: 'completed' },
            }],
            drafts: [{
              logicalPath: '纪要.md',
              byteLength: 12,
              contentSha256: 'c'.repeat(64),
              disposition: 'created',
              recordedAt: 1,
            }],
          },
        }),
        bound: true,
        matterTitle: '设备采购案',
        onBindFolder: vi.fn(),
        onOpenModelSettings: vi.fn(),
      }),
    );
    const viewport = container!.querySelector('[data-testid="pi-viewport"]');
    const drafts = viewport?.querySelector('[data-testid="pi-drafts"]');
    const assistant = viewport?.querySelector('[data-testid="pi-assistant-turn"]');
    expect(drafts).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(viewport!.contains(drafts!)).toBe(true);
    expect(assistant).not.toBeNull();
    expect(assistant!.compareDocumentPosition(drafts!) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it('成功写入只保留工作稿索引入口；uncertain 仍保留核验入口', () => {
    const call: PiToolCallView = {
      toolCallId: 'tc-success-single-entry',
      toolName: 'write',
      running: false,
      proposal: {
        operationId: 'op-success-single-entry',
        logicalPath: '纪要.md',
        byteLength: 12,
        contentSha256: 'c'.repeat(64),
        action: 'created',
      },
      effect: {
        state: 'succeeded',
        logicalPath: '纪要.md',
        contentSha256: 'c'.repeat(64),
        byteLength: 12,
      },
    };
    render(createElement(PiToolCard, {
      call,
      pending: false,
      busy: false,
      onDecide: vi.fn(),
      onOpen: vi.fn(),
    }));
    expect(container!.querySelector('[data-testid="pi-open-from-card"]')).toBeNull();

    clearRender();
    render(createElement(PiToolCard, {
      call: { ...call, toolCallId: 'tc-uncertain', effect: { ...call.effect!, state: 'uncertain' } },
      pending: false,
      busy: false,
      onDecide: vi.fn(),
      onOpen: vi.fn(),
    }));
    expect(container!.querySelector('[data-testid="pi-verify-uncertain"]')).not.toBeNull();
  });

  it('非终态不显示 prior draft；终态与 restart 后的 StartGate 仍可到达', () => {
    const prior = {
      containerId: 'matter-1',
      grantId: 'grant-1',
      sessionId: 'session-prior',
      recordedAt: 1,
      drafts: [{
        logicalPath: '上一段.md',
        byteLength: 8,
        contentSha256: 'p'.repeat(64),
        disposition: 'created',
        recordedAt: 1,
      }],
    };
    render(createElement(PiLanePanel, {
      session: makeSession({
        status: 'ready',
        sessionId: 'session-current',
        view: emptySessionView('matter-1', 'session-current'),
        priorSessions: [prior],
      }),
      bound: true,
      matterTitle: '设备采购案',
      onBindFolder: vi.fn(),
      onOpenModelSettings: vi.fn(),
    }));
    expect(container!.querySelector('[data-testid="pi-prior-drafts"]')).toBeNull();

    clearRender();
    const terminal = emptySessionView('matter-1', 'session-current');
    render(createElement(PiLanePanel, {
      session: makeSession({
        status: 'ready',
        sessionId: 'session-current',
        view: { ...terminal, sessionTerminal: { type: 'session_completed' } },
        priorSessions: [prior],
      }),
      bound: true,
      matterTitle: '设备采购案',
      onBindFolder: vi.fn(),
      onOpenModelSettings: vi.fn(),
    }));
    expect(container!.querySelector('[data-testid="pi-prior-drafts"]')).not.toBeNull();

    clearRender();
    render(createElement(PiLanePanel, {
      session: makeSession({ status: 'idle', priorSessions: [prior] }),
      bound: true,
      matterTitle: '设备采购案',
      onBindFolder: vi.fn(),
      onOpenModelSettings: vi.fn(),
    }));
    expect(container!.querySelector('[data-testid="pi-prior-drafts"]')).not.toBeNull();
  });

  it('静态构图门锁定 Pi 私有版心、既有字阶消费与工具声部', () => {
    const source = readFileSync('src/styles.css', 'utf8');
    expect(source).toContain('--pi-content-measure: 760px;');
    expect(source).toContain('--type-title-sm-size: 16px;');
    expect(source).toContain('--type-title-sm-line-height: 1.45;');
    expect(source).toContain('--type-title-size: 18px;');
    expect(source).toContain('--type-title-line-height: 1.4;');
    expect(source).toContain('--type-display-size: 20px;');
    expect(source).toContain('--type-display-line-height: 1.35;');
    expect(source).toMatch(/\.pi-work-head-title\s*\{[^}]*font-size:\s*var\(--type-display-size\)/s);
    expect(source).toMatch(/\.pi-user-text\s*\{[^}]*font-size:\s*var\(--type-title-size\)/s);
    expect(source).toMatch(/\.pi-turn-assistant \.chat-markdown\s*\{[^}]*font-size:\s*var\(--type-reading-size\)/s);
    expect(source).toMatch(/\.pi-drafts-title\s*\{[^}]*font-size:\s*var\(--type-title-sm-size\)/s);
    expect(source).toMatch(/\.pi-work-head,\s*\.pi-status,\s*\.pi-thread-viewport\s*\{[^}]*var\(--pi-content-measure\)/s);
    expect(source).toMatch(/\.pi-thread-viewport > \.pi-drafts\s*\{[^}]*padding-inline:\s*0/s);
    expect(source).toContain('--content-measure: 640px;');
    expect(source).not.toMatch(/\.pi-thread-viewport,\n\.pi-drafts,\n\.pi-composer \{[^}]*var\(--content-measure\)/s);
    // GUI-COMPOSITION-1 GC-C01-c：工具记录降为账行——分隔由横界（满版心的带）改为竖界（缩进 + 界行）。
    expect(source).toMatch(/\.pi-tool-card\s*\{[^}]*margin-left:\s*14px;\s*margin-right:\s*14px[^}]*border-left:\s*var\(--rule-minor\) solid var\(--border\)/s);
    expect(source).not.toMatch(/\.pi-tool-card:not\(\[data-state="proposed"\]\)/s);
    expect(source).toMatch(/\.pi-tool-card\[data-state="proposed"\]\s*\{[^}]*background:\s*var\(--bg-surface\)/s);
    expect(source).not.toMatch(/\.pi-tool-card\s*\{[^}]*background:/s);
  });

  it('status/details、proposal 决定、Stop、restart 与 viewer 入口保持可达', () => {
    const onDecide = vi.fn();
    const call: PiToolCallView = {
      toolCallId: 'tc-guardrails',
      toolName: 'write',
      running: true,
      proposal: {
        operationId: 'op-guardrails',
        logicalPath: '纪要.md',
        byteLength: 12,
        contentSha256: 'c'.repeat(64),
        action: 'created',
      },
    };
    render(createElement(PiToolCard, {
      call,
      pending: true,
      busy: false,
      onDecide,
      onOpen: vi.fn(),
    }));
    act(() => container!.querySelector('[data-testid="pi-approve"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    act(() => container!.querySelector('[data-testid="pi-deny"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onDecide).toHaveBeenNthCalledWith(1, 'op-guardrails', 'approve');
    expect(onDecide).toHaveBeenNthCalledWith(2, 'op-guardrails', 'deny');
  });

  it('Stop 与 restart 继续只回调既有 session port', () => {
    const stop = vi.fn(async () => undefined);
    const running = emptySessionView('matter-1', 'session-running');
    render(createElement(PiLanePanel, {
      session: makeSession({
        status: 'ready',
        sessionId: 'session-running',
        view: { ...running, running: true },
        stop,
      }),
      bound: true,
      matterTitle: '设备采购案',
      onBindFolder: vi.fn(),
      onOpenModelSettings: vi.fn(),
    }));
    const stopButton = container!.querySelector('[data-testid="pi-stop"]');
    expect(stopButton).not.toBeNull();
    act(() => stopButton!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(stop).toHaveBeenCalledTimes(1);

    clearRender();
    const restart = vi.fn(async () => undefined);
    render(createElement(PiLanePanel, {
      session: makeSession({
        status: 'ready',
        sessionId: 'session-ready',
        restart,
      }),
      bound: true,
      matterTitle: '设备采购案',
      onBindFolder: vi.fn(),
      onOpenModelSettings: vi.fn(),
    }));
    const restartButton = container!.querySelector('[data-testid="pi-restart"]');
    expect(restartButton).not.toBeNull();
    act(() => restartButton!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(restart).toHaveBeenCalledTimes(1);
  });

  it('工作稿 viewer 继续走 open 回调并诚实显示 hash 漂移', async () => {
    const draftHash = 'c'.repeat(64);
    const open = vi.fn(async () => ({
      ok: true as const,
      view: {
        logicalPath: '纪要.md',
        content: '# 当前内容',
        contentSha256: 'd'.repeat(64),
        byteLength: 15,
      },
    }));
    const view = emptySessionView('matter-1', 'session-terminal');
    render(createElement(PiLanePanel, {
      session: makeSession({
        status: 'ready',
        sessionId: 'session-terminal',
        view: {
          ...view,
          sessionTerminal: { type: 'session_completed' },
          drafts: [{
            logicalPath: '纪要.md',
            byteLength: 12,
            contentSha256: draftHash,
            disposition: 'created',
            recordedAt: 1,
          }],
        },
        open,
      }),
      bound: true,
      matterTitle: '设备采购案',
      onBindFolder: vi.fn(),
      onOpenModelSettings: vi.fn(),
    }));
    const openButton = container!.querySelector('[data-testid="pi-draft-open"]');
    expect(openButton).not.toBeNull();
    await act(async () => {
      openButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(open).toHaveBeenCalledWith('session-terminal', '纪要.md');
    expect(container!.querySelector('[data-testid="pi-viewer"]')).not.toBeNull();
    expect(container!.querySelector('[data-testid="pi-viewer-hash-differs"]')).not.toBeNull();
  });
});

describe('GUI-OPTICAL-POLISH-1 · GOP-C01 born-red', () => {
  it('composer 是版心内唯一 L1 浮面，并与输入形成同心圆角', () => {
    const source = readFileSync('src/styles.css', 'utf8');
    expect(source).toMatch(
      /\.pi-composer\s*\{[^}]*width:\s*min\(calc\(100% - 32px\),\s*var\(--pi-content-measure\)\)[^}]*margin-inline:\s*auto/s,
    );
    expect(source).toMatch(/\.pi-composer\s*\{[^}]*border:\s*1px solid var\(--elevation-float-border\)/s);
    expect(source).toMatch(/\.pi-composer\s*\{[^}]*border-radius:\s*var\(--elevation-float-radius\)/s);
    expect(source).toMatch(/\.pi-composer-input\s*\{[^}]*border-radius:\s*6px/s);
  });

  it('proposal 只获得必要的 6px 卡片圆角，普通账行维持直角', () => {
    const source = readFileSync('src/styles.css', 'utf8');
    expect(source).toMatch(/\.pi-tool-card\[data-state="proposed"\]\s*\{[^}]*border-radius:\s*6px/s);
    expect(source).toMatch(/\.pi-tool-card\s*\{[^}]*border-radius:\s*0/s);
    const shadowProperty = ['box', 'shadow'].join('-');
    expect(source).not.toMatch(new RegExp(`\\.pi-tool-card\\s*\\{[^}]*${shadowProperty}:`, 's'));
  });

  it('proposal 决定按拒绝在前、允许收尾，并把主动作推到 trailing edge', () => {
    const source = readFileSync('src/styles.css', 'utf8');
    expect(source).toMatch(/\.pi-tool-actions\s*\{[^}]*justify-content:\s*flex-end/s);
    const call: PiToolCallView = {
      toolCallId: 'tc-optical-order',
      toolName: 'write',
      running: true,
      proposal: {
        operationId: 'op-optical-order',
        logicalPath: '纪要.md',
        byteLength: 12,
        contentSha256: 'a'.repeat(64),
        action: 'created',
      },
    };
    render(createElement(PiToolCard, {
      call,
      pending: true,
      busy: false,
      onDecide: vi.fn(),
      onOpen: vi.fn(),
    }));
    const actions = [...container!.querySelectorAll<HTMLButtonElement>('[data-testid^="pi-"]')]
      .filter((button) => button.dataset.testid === 'pi-deny' || button.dataset.testid === 'pi-approve');
    expect(actions.map((button) => button.dataset.testid)).toEqual(['pi-deny', 'pi-approve']);
  });

  it('rail 包状态与管理入口使用同一行网格', () => {
    const source = readFileSync('src/styles.css', 'utf8');
    expect(source).toMatch(/\.rail-pack-section\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto/s);
    expect(source).toMatch(/\.rail-pack-section \.rail-label\s*\{[^}]*grid-column:\s*1 \/ -1/s);
    expect(source).toMatch(/\.rail-pack-state\s*\{[^}]*grid-column:\s*1/s);
    expect(source).toMatch(/\.rail-pack-manage\s*\{[^}]*grid-column:\s*2/s);
  });

  it('proposal 不渲染空的 tool header，并且 primary button 仅按指针按压缩放', () => {
    const source = readFileSync('src/styles.css', 'utf8');
    expect(source).toMatch(/\.pi-button\s*\{[^}]*display:\s*inline-flex[^}]*align-items:\s*center/s);
    expect(source).toMatch(/\.pi-tool-actions\s+\.pi-button-primary\s*\{[^}]*min-height:\s*var\(--control-height-md\)/s);
    expect(source).toMatch(/:is\([^)]*\.pi-button-primary[^)]*\):active:not\(:focus-visible\)/s);
    expect(source).not.toMatch(/:is\([^)]*\.pi-button-primary[^)]*\)\s*\{[^}]*transition:\s*all/s);

    const call: PiToolCallView = {
      toolCallId: 'tc-optical-head',
      toolName: 'write',
      running: true,
      proposal: {
        operationId: 'op-optical-head',
        logicalPath: '纪要.md',
        byteLength: 12,
        contentSha256: 'a'.repeat(64),
        action: 'created',
      },
    };
    render(createElement(PiToolCard, {
      call,
      pending: true,
      busy: false,
      onDecide: vi.fn(),
      onOpen: vi.fn(),
    }));
    expect(container!.querySelector('[data-testid="pi-tool-card"][data-state="proposed"] .pi-tool-head')).toBeNull();
  });
});

describe('GUI-OPTICAL-POLISH-1 · GOP-C02 born-red', () => {
  it('composer is the flex tail with a 16px bottom safety edge and an independently scrolling viewport', () => {
    const source = readFileSync('src/styles.css', 'utf8');
    expect(source).toMatch(/\.pi-panel\s*\{[^}]*display:\s*flex[^}]*flex-direction:\s*column/s);
    expect(source).toMatch(/\.pi-thread\s*\{[^}]*flex:\s*1\s+1\s+auto/s);
    expect(source).toMatch(/\.pi-thread-viewport\s*\{[^}]*flex:\s*1[^}]*min-height:\s*0[^}]*overflow:\s*auto/s);
    expect(source).toMatch(/\.pi-composer\s*\{[^}]*flex:\s*0\s+0\s+auto[^}]*margin-bottom:\s*16px/s);
  });

  it('the twelve Agent/Pi Work action buttons are icon-only with names and titles', () => {
    const panel = readFileSync('src/pi/PiLanePanel.tsx', 'utf8');
    const card = readFileSync('src/pi/PiToolCard.tsx', 'utf8');
    const viewer = readFileSync('src/pi/PiDraftViewer.tsx', 'utf8');
    const rail = readFileSync('src/rail/CaseRail.tsx', 'utf8');
    const sources = [panel, card, viewer, rail];
    for (const source of sources) {
      for (const button of source.match(/<button\b[\s\S]*?<\/button>/g) ?? []) {
        expect(button).not.toMatch(/>\s*\{PI_COPY\.[A-Za-z]+\}/);
      }
    }
    for (const name of [
      'pi-bind-folder', 'pi-open-model-settings', 'pi-start', 'pi-restart', 'pi-send', 'pi-stop',
      'pi-deny', 'pi-approve', 'pi-verify-uncertain', 'pi-draft-open', 'pi-viewer-close',
    ]) {
      expect(sources.join('\n')).toMatch(new RegExp(`data-testid="${name}"`));
    }
    expect(rail).toMatch(/data-testid=\{`rail-pack-manage-\$\{item\.id\}`\}/);
    expect(sources.join('\n')).toMatch(/<PiActionIcon[\s\S]*?aria-label=/);
    expect(sources.join('\n')).toMatch(/title=\{[^}]+\}/);
  });

  it('rendered Pi action chrome has no visible text and exactly one accessible SVG', () => {
    const assertIconButton = (testid: string) => {
      const button = container!.querySelector<HTMLButtonElement>(`[data-testid="${testid}"]`);
      expect(button).not.toBeNull();
      expect(button!.textContent?.trim()).toBe('');
      expect(button!.querySelectorAll('svg')).toHaveLength(1);
      expect(button!.getAttribute('aria-label')).toBeTruthy();
      expect(button!.getAttribute('title')).toBeTruthy();
    };
    render(createElement(PiLanePanel, {
      session: makeSession(),
      bound: false,
      matterTitle: '设备采购案',
      onBindFolder: vi.fn(),
      onOpenModelSettings: vi.fn(),
    }));
    assertIconButton('pi-bind-folder');

    clearRender();
    render(createElement(PiLanePanel, {
      session: makeSession({ status: 'unavailable' }),
      bound: true,
      matterTitle: '设备采购案',
      onBindFolder: vi.fn(),
      onOpenModelSettings: vi.fn(),
    }));
    assertIconButton('pi-open-model-settings');

    clearRender();
    render(createElement(PiLanePanel, {
      session: makeSession({ status: 'idle' }),
      bound: true,
      matterTitle: '设备采购案',
      onBindFolder: vi.fn(),
      onOpenModelSettings: vi.fn(),
    }));
    assertIconButton('pi-start');

    clearRender();
    render(createElement(PiLanePanel, {
      session: makeSession({ status: 'ready', sessionId: 'session-1' }),
      bound: true,
      matterTitle: '设备采购案',
      onBindFolder: vi.fn(),
      onOpenModelSettings: vi.fn(),
    }));
    assertIconButton('pi-send');
    assertIconButton('pi-restart');

    clearRender();
    render(createElement(PiLanePanel, {
      session: makeSession({
        status: 'ready',
        sessionId: 'session-1',
        view: { ...emptySessionView('matter-1', 'session-1'), running: true },
      }),
      bound: true,
      matterTitle: '设备采购案',
      onBindFolder: vi.fn(),
      onOpenModelSettings: vi.fn(),
    }));
    assertIconButton('pi-stop');

    const proposal: PiToolCallView = {
      toolCallId: 'tc-c02',
      toolName: 'write',
      running: true,
      proposal: {
        operationId: 'op-c02',
        logicalPath: '纪要.md',
        byteLength: 12,
        contentSha256: 'a'.repeat(64),
        action: 'created',
      },
    };
    clearRender();
    render(createElement(PiToolCard, {
      call: proposal,
      pending: true,
      busy: false,
      onDecide: vi.fn(),
      onOpen: vi.fn(),
    }));
    assertIconButton('pi-deny');
    assertIconButton('pi-approve');
    expect(container!.querySelector('[data-testid="pi-deny"] svg')?.getAttribute('data-icon-name')).toBe('split-gate-slash');
    expect(container!.querySelector('[data-testid="pi-approve"] svg')?.getAttribute('data-icon-name')).toBe('split-gate-check');

    clearRender();
    render(createElement(PiToolCard, {
      call: { ...proposal, running: false, effect: { state: 'uncertain' } },
      pending: false,
      busy: false,
      onDecide: vi.fn(),
      onOpen: vi.fn(),
    }));
    assertIconButton('pi-verify-uncertain');

    clearRender();
    render(createElement(PiLanePanel, {
      session: makeSession({
        status: 'ready',
        sessionId: 'session-1',
        view: {
          ...emptySessionView('matter-1', 'session-1'),
          sessionTerminal: { type: 'completed' },
          drafts: [{ logicalPath: '纪要.md', byteLength: 12, contentSha256: 'a'.repeat(64), disposition: 'created', recordedAt: 1 }],
        },
      }),
      bound: true,
      matterTitle: '设备采购案',
      onBindFolder: vi.fn(),
      onOpenModelSettings: vi.fn(),
    }));
    assertIconButton('pi-draft-open');
    expect(container!.querySelector('.pi-draft-path')?.textContent).toBe('纪要.md');
    expect(container!.querySelector('[data-testid="pi-draft-open"]')?.getAttribute('aria-label')).toContain('纪要.md');

    clearRender();
    render(createElement(PiDraftViewer, {
      state: { logicalPath: '纪要.md', sessionId: 'session-1', loading: true, verify: false },
      onClose: vi.fn(),
    }));
    assertIconButton('pi-viewer-close');
  });

  it('draft paths remain a sibling data column instead of button children', () => {
    const source = readFileSync('src/pi/PiLanePanel.tsx', 'utf8');
    expect(source).toMatch(/className="pi-draft-path"/);
    expect(source).toMatch(/className="[^"]*pi-draft-open[^"]*"[\s\S]*?<PiActionIcon name="agent-open"/);
    expect(source).not.toMatch(/<button[\s\S]*className="pi-draft-open"[\s\S]*>\s*\{draft\.logicalPath\}/);
  });

  it('custom icon manifest includes the six GOP-C02 source concepts', () => {
    const manifest = JSON.parse(readFileSync('src/icons/manifest.json', 'utf8')) as Array<{ name: string; addedInSpec: string }>;
    const c02 = manifest.filter((entry) => entry.addedInSpec === 'GUI-OPTICAL-POLISH-1').map((entry) => entry.name).sort();
    expect(c02).toEqual(['agent-close', 'agent-open', 'agent-restart', 'agent-send', 'agent-settings', 'agent-stop']);
  });
});
