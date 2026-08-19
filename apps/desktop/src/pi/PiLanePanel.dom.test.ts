// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptySessionView, type PiToolCallView } from './pi-projection';
import { PiLanePanel } from './PiLanePanel';
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
