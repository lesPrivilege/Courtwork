import type {
  PiLanePort,
  PiLaneFailure,
  PiLaneSessionRef,
  PiLaneStartInput,
  PiLaneStartReply,
  PiWorkspaceResult,
} from './pi-lane-port';

/**
 * `PI-LANE-UI-1` · 浏览器（DEV/E2E）宿主樁 —— **scripted provider 的落地形**。
 *
 * 定位与 `host/browser-host-auth.ts` 同族：产品运行时装 Tauri 适配器，本樁只在没有
 * `__TAURI_INTERNALS__` 的开发/端到端环境装配，由 Playwright 经 `window.__courtworkPiLane`
 * 逐格驱动。ADR-022 六-C 的 harness 注入面允许它，条件是**它不假装自己是产品**：
 *
 * - 它产的是**账本形状**的记录行，不是产品事实：没有真 sidecar、没有真模型、没有真落盘。
 * - 逐次授权是**真等**的：`tool_proposed` 之后樁停住，直到 `decision()` 投回执才继续。
 *   这样 e2e 测的是「按钮只发 command、界面只认账本」这条真判据，而不是一段动画。
 * - 默认脚本为空：不点脚本就什么也不发生，不编造一段成功。
 */

/** 一步脚本。逐枚对应一（或一组）账本记录。 */
export type PiScriptStep =
  | { readonly kind: 'text'; readonly delta: string }
  | { readonly kind: 'reasoning'; readonly delta: string }
  | { readonly kind: 'tool'; readonly toolCallId: string; readonly toolName: string }
  | { readonly kind: 'toolEnd'; readonly toolCallId: string; readonly toolName: string; readonly outcome?: string }
  /** 提案 → **等回执** → 按回执落 `authorization_decided` 与 effect 三态之一。 */
  | {
      readonly kind: 'propose';
      readonly toolCallId: string;
      readonly operationId: string;
      readonly logicalPath: string;
      readonly byteLength: number;
      readonly contentSha256: string;
      readonly action?: string;
      /** 授权通过后的 effect 结局；缺省 `succeeded`。 */
      readonly effect?: 'succeeded' | 'failed' | 'uncertain';
      readonly failureCode?: string;
    }
  | { readonly kind: 'usage'; readonly costUsd: number | null }
  | { readonly kind: 'terminal'; readonly status: 'completed' | 'failed'; readonly message?: string }
  /** 直接投一行原始 journal：留给「未知记录 fail-closed」这类反例。 */
  | { readonly kind: 'raw'; readonly line: string };

interface Script {
  startFailure: PiLaneFailure | null;
  steps: PiScriptStep[];
  workspace: Record<string, { content: string; contentSha256: string; byteLength: number }>;
  workspaceFailure: PiLaneFailure | null;
}

function emptyScript(): Script {
  return { startFailure: null, steps: [], workspace: {}, workspaceFailure: null };
}

let script: Script = emptyScript();

export interface PiLaneTestHooks {
  setStartFailure(failure: PiLaneFailure | null): void;
  setScript(steps: PiScriptStep[]): void;
  setWorkspaceFile(
    logicalPath: string,
    file: { content: string; contentSha256: string; byteLength: number },
  ): void;
  setWorkspaceFailure(failure: PiLaneFailure | null): void;
  reset(): void;
}

export function installPiLaneTestHooks(): PiLaneTestHooks {
  const hooks: PiLaneTestHooks = {
    setStartFailure(failure) {
      script.startFailure = failure;
    },
    setScript(steps) {
      script.steps = [...steps];
    },
    setWorkspaceFile(logicalPath, file) {
      script.workspace[logicalPath] = file;
    },
    setWorkspaceFailure(failure) {
      script.workspaceFailure = failure;
    },
    reset() {
      script = emptyScript();
      live.clear();
    },
  };
  (window as unknown as { __courtworkPiLane?: PiLaneTestHooks }).__courtworkPiLane = hooks;
  return hooks;
}

interface LiveSession {
  containerId: string;
  sessionId: string;
  seq: number;
  onRecord(line: string): void;
  requestId: string | null;
  /** 悬置提案：等一枚回执。与宿主同形——至多一枚。 */
  pending: { operationId: string; resume(verdict: 'approve' | 'deny'): void } | null;
  canceled: boolean;
}

const live = new Map<string, LiveSession>();

function key(ref: PiLaneSessionRef): string {
  return `${ref.containerId}/${ref.sessionId}`;
}

function emit(
  session: LiveSession,
  type: string,
  payload: Record<string, unknown>,
  operationId?: string,
): void {
  session.seq += 1;
  session.onRecord(
    JSON.stringify({
      schemaVersion: 1,
      eventId: `event_${session.seq}`,
      seq: session.seq,
      containerId: session.containerId,
      sessionId: session.sessionId,
      leg: 1,
      requestId: session.requestId,
      ...(operationId ? { operationId } : {}),
      type,
      recordedAt: session.seq,
      payload,
    }),
  );
}

const BUDGET = { turns: 1, usd: null as number | null, turnLimit: 'open', usdLimit: 'disabled' };

async function runScript(session: LiveSession): Promise<void> {
  for (const step of script.steps) {
    if (session.canceled) break;
    // 逐步让出一帧：e2e 因此看得见「运行中」这一态，而不是一帧内跳到终局。
    await new Promise((resolve) => setTimeout(resolve, 0));
    switch (step.kind) {
      case 'text':
        emit(session, 'agent_event', { kind: 'assistant_text_delta', delta: step.delta });
        break;
      case 'reasoning':
        emit(session, 'agent_event', { kind: 'assistant_reasoning_delta', delta: step.delta });
        break;
      case 'tool':
        emit(session, 'agent_event', {
          kind: 'tool_started',
          toolCallId: step.toolCallId,
          toolName: step.toolName,
        });
        break;
      case 'toolEnd':
        emit(session, 'agent_event', {
          kind: 'tool_finished',
          toolCallId: step.toolCallId,
          toolName: step.toolName,
          outcome: step.outcome ?? 'ok',
        });
        break;
      case 'usage':
        emit(session, 'turn_usage_recorded', {
          turn: 1,
          countedTowardTurnLimit: true,
          usage: {
            inputTokens: 100,
            outputTokens: 20,
            cacheReadTokens: null,
            cacheWriteTokens: null,
            costUsd: step.costUsd,
          },
          stopReason: 'end_turn',
        });
        break;
      case 'raw':
        session.seq += 1;
        session.onRecord(step.line);
        break;
      case 'terminal':
        if (step.status === 'completed') {
          emit(session, 'prompt_completed', { status: 'completed', budget: BUDGET });
        } else {
          emit(session, 'prompt_failed', {
            status: 'failed',
            error: {
              code: 'provider_error',
              message: step.message ?? '服务未响应',
              retryable: true,
            },
            budget: BUDGET,
          });
        }
        session.requestId = null;
        return;
      case 'propose': {
        emit(
          session,
          'tool_proposed',
          {
            toolCallId: step.toolCallId,
            toolName: 'write',
            capability: 'workspace_write',
            logicalPath: step.logicalPath,
            proposalHash: 'a'.repeat(64),
            contentSha256: step.contentSha256,
            byteLength: step.byteLength,
            action: step.action ?? 'created',
          },
          step.operationId,
        );
        const verdict = await new Promise<'approve' | 'deny'>((resolve) => {
          session.pending = { operationId: step.operationId, resume: resolve };
        });
        session.pending = null;
        emit(
          session,
          'authorization_decided',
          {
            toolCallId: step.toolCallId,
            decision: verdict === 'approve' ? 'approved' : 'denied',
            code: verdict === 'approve' ? null : 'user_denied',
          },
          step.operationId,
        );
        if (verdict === 'deny') break;
        emit(
          session,
          'effect_started',
          {
            toolCallId: step.toolCallId,
            logicalPath: step.logicalPath,
            proposalHash: 'a'.repeat(64),
            action: step.action ?? 'created',
            contentSha256: step.contentSha256,
            byteLength: step.byteLength,
          },
          step.operationId,
        );
        const outcome = step.effect ?? 'succeeded';
        if (outcome === 'succeeded') {
          emit(
            session,
            'effect_succeeded',
            {
              toolCallId: step.toolCallId,
              logicalPath: step.logicalPath,
              disposition: step.action ?? 'created',
              contentSha256: step.contentSha256,
              byteLength: step.byteLength,
            },
            step.operationId,
          );
        } else if (outcome === 'failed') {
          emit(
            session,
            'effect_failed',
            { toolCallId: step.toolCallId, code: step.failureCode ?? 'io' },
            step.operationId,
          );
        } else {
          emit(
            session,
            'effect_uncertain',
            { toolCallId: step.toolCallId, code: 'durability_unknown' },
            step.operationId,
          );
        }
        break;
      }
    }
  }
  if (!session.canceled && session.requestId) {
    emit(session, 'prompt_completed', { status: 'completed', budget: BUDGET });
    session.requestId = null;
  }
}

export function createBrowserPiLane(): PiLanePort {
  return {
    async start(input: PiLaneStartInput, onRecord): Promise<PiLaneStartReply> {
      if (script.startFailure) throw script.startFailure;
      const session: LiveSession = {
        containerId: input.containerId,
        sessionId: input.sessionId,
        seq: 0,
        onRecord,
        requestId: null,
        pending: null,
        canceled: false,
      };
      live.set(key(input), session);
      session.seq = 1;
      const started = JSON.stringify({
        schemaVersion: 1,
        eventId: 'event_1',
        seq: 1,
        containerId: input.containerId,
        sessionId: input.sessionId,
        leg: 1,
        requestId: null,
        type: 'session_started',
        recordedAt: 1,
        payload: {
          routeId: 'node22-runtime-sealed-cjs-v1',
          routeManifestSha256: '0'.repeat(64),
          nodeVersion: '22.23.1',
          targetTriple: 'aarch64-apple-darwin',
          grantId: input.grantId,
          caseRoot: '/case',
          promptId: 'md-work-v1',
          provider: { id: 'deepseek', modelId: input.modelId },
          limits: { maxTurns: input.limits.maxTurns, maxUsd: input.limits.maxUsd },
          capabilities: ['case_read', 'workspace_read', 'workspace_write'],
        },
      });
      return {
        capabilities: ['case_read', 'workspace_read', 'workspace_write'],
        leg: 1,
        records: [started],
      };
    },

    async prompt(input): Promise<void> {
      const session = live.get(key(input));
      if (!session) throw { code: 'session_missing', message: '这一段工作尚未开始 · 请重新开始' };
      session.requestId = input.requestId;
      session.canceled = false;
      emit(session, 'user_prompted', { text: input.text });
      void runScript(session);
    },

    async cancel(ref): Promise<void> {
      const session = live.get(key(ref));
      if (!session) return;
      session.canceled = true;
      // Stop 蕴含拒绝（六-C.1）：悬置提案随之以 `user_denied` 收束。
      if (session.pending) session.pending.resume('deny');
      emit(session, 'prompt_canceled', { status: 'canceled', reason: 'user', budget: BUDGET });
      session.requestId = null;
    },

    async decision(input): Promise<void> {
      const session = live.get(key(input));
      if (!session?.pending) return;
      if (session.pending.operationId !== input.operationId) return;
      session.pending.resume(input.verdict);
    },

    async teardown(ref): Promise<void> {
      live.delete(key(ref));
    },

    async openWorkspaceMarkdown(input): Promise<PiWorkspaceResult> {
      if (script.workspaceFailure) return { ok: false, failure: script.workspaceFailure };
      const file = script.workspace[input.logicalPath];
      if (!file) {
        return {
          ok: false,
          failure: { code: 'not_found', message: '这份工作稿已经不在了 · 可能已被清理' },
        };
      }
      return { ok: true, view: { logicalPath: input.logicalPath, ...file } };
    },
  };
}
