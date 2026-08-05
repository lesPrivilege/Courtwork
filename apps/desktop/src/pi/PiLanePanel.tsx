import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useExternalStoreRuntime,
  type ThreadMessageLike,
  type ToolCallMessagePartProps,
} from '@assistant-ui/react';

import { ChatMarkdown } from '../chat/ChatMarkdown';
import { PiDraftViewer, type PiViewerState } from './PiDraftViewer';
import { PiToolCard } from './PiToolCard';
import { PI_COPY } from './pi-copy';
import type { PiHistorySession } from './pi-history';
import type { PiSessionView, PiToolCallView } from './pi-projection';
import type { PiLaneSession } from './use-pi-lane';

/**
 * `PI-LANE-UI-1` · pi 线的基础 GUI。
 *
 * **薄**的含义逐条可验：整面没有第二本账——消息、工具卡、提案、预算、终态、工作稿索引
 * 全部来自 `session.view`，而它是账本的纯函数折叠。本组件自己只持三样与账本无关的东西：
 * 已投出但尚未落账的回执（用来收起按钮，不用来改状态）、查看面的开合、以及输入框
 * （由 assistant-ui composer 持有）。
 *
 * 依赖面按 ADR-022 六-D 收窄：只用 `@assistant-ui/react` 的 headless primitives 与公共
 * `useExternalStoreRuntime`；只提供 `onNew`／`onCancel` 两枚 callback，未提供的
 * edit／reload／branch／queue 因此保持关闭。零 LocalRuntime、零 Cloud、零 AI SDK adapter、
 * 零 thread persistence、零 `unstable_*`、零 stock 皮层。
 */

interface PiMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly text?: string;
  readonly parts?: PiSessionView['blocks'][number]['parts'];
}

interface PiCardContext {
  readonly toolCalls: Readonly<Record<string, PiToolCallView>>;
  readonly pendingToolCallId: string | null;
  readonly decidingOperationId: string | null;
  decide(operationId: string, verdict: 'approve' | 'deny'): void;
  open(logicalPath: string, options: { verify: boolean }): void;
}

const CardContext = createContext<PiCardContext | null>(null);

function useCardContext(): PiCardContext {
  const value = useContext(CardContext);
  if (!value) throw new Error('PiToolPart 只在 PiLanePanel 内渲染');
  return value;
}

/** 助手正文：复用 desktop 既有安全 renderer，raw HTML 不执行。 */
function PiText({ text }: { text: string }) {
  return <ChatMarkdown text={text} />;
}

/** 工具部件：assistant-ui 只给「这里有一枚 tool-call」，卡面事实全部来自我们的投影。 */
function PiToolPart({ toolCallId }: ToolCallMessagePartProps) {
  const context = useCardContext();
  const call = context.toolCalls[toolCallId];
  if (!call) return null;
  return (
    <PiToolCard
      call={call}
      pending={context.pendingToolCallId === toolCallId}
      busy={
        call.proposal !== undefined && context.decidingOperationId === call.proposal.operationId
      }
      onDecide={context.decide}
      onOpen={context.open}
    />
  );
}

function convertMessage(message: PiMessage): ThreadMessageLike {
  if (message.role === 'user') {
    return { id: message.id, role: 'user', content: [{ type: 'text', text: message.text ?? '' }] };
  }
  const content = (message.parts ?? []).map((part) =>
    part.kind === 'tool'
      ? ({
          type: 'tool-call' as const,
          toolCallId: part.toolCallId,
          toolName: 'workspace',
          args: {},
        })
      : ({ type: part.kind === 'reasoning' ? ('reasoning' as const) : ('text' as const), text: part.text }),
  );
  return {
    id: message.id,
    role: 'assistant',
    content: content.length > 0 ? content : [{ type: 'text', text: '' }],
  };
}

export interface PiLanePanelProps {
  readonly session: PiLaneSession;
  /** 当前容器有没有绑定文件夹。没绑就没有案件根可读，诚实拦在开始之前。 */
  readonly bound: boolean;
}

export function PiLanePanel({ session, bound }: PiLanePanelProps) {
  const { view } = session;
  const [decidingOperationId, setDeciding] = useState<string | null>(null);
  const [viewer, setViewer] = useState<PiViewerState | null>(null);

  const messages = useMemo<PiMessage[]>(() => {
    const list: PiMessage[] = [];
    for (const block of view.blocks) {
      list.push({ id: `${block.requestId}:u`, role: 'user', text: block.prompt });
      if (block.parts.length > 0) {
        list.push({ id: `${block.requestId}:a`, role: 'assistant', parts: block.parts });
      }
    }
    return list;
  }, [view.blocks]);

  const onNew = useCallback(
    async (message: { content: readonly unknown[] }) => {
      const text = message.content
        .map((part) =>
          typeof part === 'object' && part !== null && (part as { type?: string }).type === 'text'
            ? ((part as { text?: string }).text ?? '')
            : '',
        )
        .join('');
      if (!text.trim()) return;
      await session.send(text);
    },
    [session],
  );

  const runtime = useExternalStoreRuntime<PiMessage>({
    messages,
    isRunning: view.running,
    isDisabled: session.status !== 'ready' || view.sessionTerminal !== undefined,
    convertMessage,
    onNew,
    onCancel: session.stop,
  });

  const openDraft = useCallback(
    async (sessionId: string, logicalPath: string, options: { verify: boolean; recordedSha256?: string }) => {
      setViewer({
        logicalPath,
        sessionId,
        loading: true,
        verify: options.verify,
        ...(options.recordedSha256 ? { recordedSha256: options.recordedSha256 } : {}),
      });
      const result = await session.open(sessionId, logicalPath);
      setViewer((current) => {
        if (!current || current.logicalPath !== logicalPath || current.sessionId !== sessionId) {
          return current;
        }
        return result.ok
          ? { ...current, loading: false, view: result.view }
          : { ...current, loading: false, failure: result.failure };
      });
    },
    [session],
  );

  const cardContext = useMemo<PiCardContext>(
    () => ({
      toolCalls: view.toolCalls,
      pendingToolCallId: view.pendingProposal?.toolCallId ?? null,
      decidingOperationId,
      decide(operationId, verdict) {
        setDeciding(operationId);
        void session.decide(operationId, verdict).finally(() => setDeciding(null));
      },
      open(logicalPath, options) {
        const recorded = view.drafts.find((draft) => draft.logicalPath === logicalPath);
        void openDraft(session.sessionId ?? '', logicalPath, {
          verify: options.verify,
          ...(recorded && !options.verify ? { recordedSha256: recorded.contentSha256 } : {}),
        });
      },
    }),
    [decidingOperationId, openDraft, session, view.drafts, view.pendingProposal, view.toolCalls],
  );

  if (session.status === 'idle' || session.status === 'unavailable') {
    return (
      <PiStartGate
        session={session}
        bound={bound}
        priorSessions={session.priorSessions}
        onOpenPrior={(sessionId, logicalPath, recordedSha256) =>
          void openDraft(sessionId, logicalPath, { verify: false, recordedSha256 })
        }
        viewer={viewer}
        onCloseViewer={() => setViewer(null)}
      />
    );
  }

  return (
    <CardContext.Provider value={cardContext}>
      <AssistantRuntimeProvider runtime={runtime}>
        <section className="pi-panel" data-testid="pi-panel" data-status={session.status}>
          <PiStatusBar view={view} sessionId={session.sessionId} onRestart={session.restart} />

          {view.decodeFailure && (
            <p className="pi-alert" data-testid="pi-decode-failure">
              {PI_COPY.decodeFailed}
            </p>
          )}
          {session.failure && (
            <p className="pi-alert" data-testid="pi-failure">
              {session.failure.message}
            </p>
          )}

          <ThreadPrimitive.Root className="pi-thread">
            <ThreadPrimitive.Viewport className="pi-thread-viewport" data-testid="pi-viewport">
              <ThreadPrimitive.Empty>
                <div className="pi-empty" data-testid="pi-empty">
                  <p className="pi-empty-title">{PI_COPY.emptyTitle}</p>
                  <p className="pi-empty-body">{PI_COPY.emptyBody}</p>
                </div>
              </ThreadPrimitive.Empty>
              <ThreadPrimitive.Messages
                components={{
                  UserMessage: PiUserMessage,
                  AssistantMessage: PiAssistantMessage,
                }}
              />
              <ThreadPrimitive.If running>
                <p className="pi-running" data-testid="pi-running" role="status">
                  {PI_COPY.running}
                </p>
              </ThreadPrimitive.If>
            </ThreadPrimitive.Viewport>

            <PiDraftIndex
              view={view}
              priorSessions={session.priorSessions}
              onOpen={(sessionId, logicalPath, recordedSha256) =>
                void openDraft(sessionId, logicalPath, { verify: false, recordedSha256 })
              }
            />

            <ComposerPrimitive.Root className="pi-composer" data-testid="pi-composer">
              <ComposerPrimitive.Input
                className="pi-composer-input"
                data-testid="pi-composer-input"
                aria-label={PI_COPY.inputLabel}
                placeholder={PI_COPY.inputPlaceholder}
                submitOnEnter
              />
              <ThreadPrimitive.If running={false}>
                <ComposerPrimitive.Send
                  className="pi-button pi-button-primary"
                  data-testid="pi-send"
                >
                  {PI_COPY.sendAction}
                </ComposerPrimitive.Send>
              </ThreadPrimitive.If>
              <ThreadPrimitive.If running>
                <ComposerPrimitive.Cancel
                  className="pi-button pi-button-quiet"
                  data-testid="pi-stop"
                >
                  {PI_COPY.stopAction}
                </ComposerPrimitive.Cancel>
              </ThreadPrimitive.If>
            </ComposerPrimitive.Root>
          </ThreadPrimitive.Root>

          {viewer && <PiDraftViewer state={viewer} onClose={() => setViewer(null)} />}
        </section>
      </AssistantRuntimeProvider>
    </CardContext.Provider>
  );
}

function PiUserMessage() {
  return (
    <article className="pi-turn pi-turn-user" data-testid="pi-user-turn">
      <MessagePrimitive.Root>
        <MessagePrimitive.Parts components={{ Text: PiPlainText }} />
      </MessagePrimitive.Root>
    </article>
  );
}

function PiAssistantMessage() {
  return (
    <article className="pi-turn pi-turn-assistant" data-testid="pi-assistant-turn">
      <MessagePrimitive.Root>
        <MessagePrimitive.Parts
          components={{
            Text: ({ text }) => <PiText text={text} />,
            tools: { Override: PiToolPart },
          }}
        />
      </MessagePrimitive.Root>
    </article>
  );
}

function PiPlainText({ text }: { text: string }) {
  return <p className="pi-user-text">{text}</p>;
}

/** 目录学式状态条：段号、回合、开销。数字走等宽核验体（设计凡例 §4）。 */
function PiStatusBar({
  view,
  sessionId,
  onRestart,
}: {
  view: PiSessionView;
  sessionId: string | null;
  onRestart(): void;
}) {
  const usd = view.budget?.usd;
  // 面头复用既有已签署的 `.panel-head`（文武线在册），本面因此零新增线消费点。
  return (
    <header className="panel-head pi-status" data-testid="pi-status">
      <span className="pi-status-ident pi-mono">{sessionId ?? '—'}</span>
      <span className="pi-status-slot">
        {PI_COPY.turnsLabel}
        <b className="pi-mono">
          {view.turns}
          {view.maxTurns ? ` / ${view.maxTurns}` : ''}
        </b>
      </span>
      <span className="pi-status-slot">
        {PI_COPY.costLabel}
        <b className="pi-mono">{usd === null || usd === undefined ? PI_COPY.costUnknown : usd.toFixed(4)}</b>
      </span>
      {view.interrupted && (
        <span className="pi-status-note" data-testid="pi-resumed">
          {PI_COPY.interrupted}
        </span>
      )}
      {view.sessionTerminal && (
        <span className="pi-status-note pi-status-closed" data-testid="pi-session-closed">
          {view.sessionTerminal.type === 'session_budget_stopped'
            ? PI_COPY.budgetStopped
            : PI_COPY.sessionClosed}
        </span>
      )}
      {/* 另起一段：收摊这一条，回到未开工态；上一段的工作稿仍在只读入口里。 */}
      {!view.running && (
        <button
          type="button"
          className="pi-button pi-button-quiet pi-status-restart"
          data-testid="pi-restart"
          onClick={onRestart}
        >
          {PI_COPY.restartAction}
        </button>
      )}
    </header>
  );
}

function PiDraftIndex({
  view,
  priorSessions,
  onOpen,
}: {
  view: PiSessionView;
  priorSessions: readonly PiHistorySession[];
  onOpen(sessionId: string, logicalPath: string, recordedSha256: string): void;
}) {
  const prior = priorSessions[0];
  return (
    <section className="pi-drafts" data-testid="pi-drafts">
      <h3 className="pi-drafts-title">{PI_COPY.draftsTitle}</h3>
      {view.drafts.length === 0 ? (
        <p className="pi-drafts-empty" data-testid="pi-drafts-empty">
          {PI_COPY.draftsEmpty}
        </p>
      ) : (
        <ol className="pi-drafts-list">
          {view.drafts.map((draft, index) => (
            <li key={draft.logicalPath} className="pi-draft-row">
              <span className="pi-draft-index pi-mono">
                {String(index + 1).padStart(3, '0')}
              </span>
              <button
                type="button"
                className="pi-draft-open"
                data-testid="pi-draft-open"
                data-logical-path={draft.logicalPath}
                onClick={() => onOpen(view.sessionId, draft.logicalPath, draft.contentSha256)}
              >
                {draft.logicalPath}
              </button>
              <span className="pi-draft-bytes pi-mono">{draft.byteLength}</span>
            </li>
          ))}
        </ol>
      )}

      {prior && (
        <div className="pi-drafts-prior" data-testid="pi-prior-drafts">
          <h3 className="pi-drafts-title">{PI_COPY.priorDraftsTitle}</h3>
          <ol className="pi-drafts-list">
            {prior.drafts.map((draft) => (
              <li key={draft.logicalPath} className="pi-draft-row">
                <button
                  type="button"
                  className="pi-draft-open"
                  data-testid="pi-prior-draft-open"
                  data-logical-path={draft.logicalPath}
                  onClick={() => onOpen(prior.sessionId, draft.logicalPath, draft.contentSha256)}
                >
                  {draft.logicalPath}
                </button>
                <span className="pi-draft-bytes pi-mono">{draft.byteLength}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

/** 未开工时的门面：空态、失败态与历史工作稿入口——三者都不假装有一段工作在跑。 */
function PiStartGate({
  session,
  bound,
  priorSessions,
  onOpenPrior,
  viewer,
  onCloseViewer,
}: {
  session: PiLaneSession;
  bound: boolean;
  priorSessions: readonly PiHistorySession[];
  onOpenPrior(sessionId: string, logicalPath: string, recordedSha256: string): void;
  viewer: PiViewerState | null;
  onCloseViewer(): void;
}) {
  const prior = priorSessions[0];
  return (
    <section className="pi-panel pi-panel-gate" data-testid="pi-panel" data-status={session.status}>
      <div className="pi-empty" data-testid="pi-empty">
        <p className="pi-empty-title">{PI_COPY.emptyTitle}</p>
        <p className="pi-empty-body">{bound ? PI_COPY.emptyBody : PI_COPY.emptyUnbound}</p>
        {session.failure && (
          <p className="pi-alert" data-testid="pi-failure">
            {session.failure.message}
          </p>
        )}
        <button
          type="button"
          className="pi-button pi-button-primary"
          data-testid="pi-start"
          disabled={!bound || session.status === 'starting'}
          onClick={() => void session.start()}
        >
          {PI_COPY.startAction}
        </button>
      </div>

      {prior && (
        <div className="pi-drafts-prior" data-testid="pi-prior-drafts">
          <h3 className="pi-drafts-title">{PI_COPY.priorDraftsTitle}</h3>
          <ol className="pi-drafts-list">
            {prior.drafts.map((draft) => (
              <li key={draft.logicalPath} className="pi-draft-row">
                <button
                  type="button"
                  className="pi-draft-open"
                  data-testid="pi-prior-draft-open"
                  data-logical-path={draft.logicalPath}
                  onClick={() => onOpenPrior(prior.sessionId, draft.logicalPath, draft.contentSha256)}
                >
                  {draft.logicalPath}
                </button>
                <span className="pi-draft-bytes pi-mono">{draft.byteLength}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {viewer && <PiDraftViewer state={viewer} onClose={onCloseViewer} />}
    </section>
  );
}
