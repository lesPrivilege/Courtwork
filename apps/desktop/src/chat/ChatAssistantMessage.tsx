import type { TurnProjection } from '../provider/turn-protocol-client';

import { ChatMarkdown } from './ChatMarkdown';
import { CollapsibleMessage } from './CollapsibleMessage';
import { MessageActions } from './MessageActions';
import { ProcessTrace } from './ProcessTrace';
import { processTraceFromTurn } from './process-trace-projection';
import { formatUsageMetering } from '../provider/usage-metering';
import { Icon } from '../workbench/Icon';

/**
 * chat / work 两面共用的助手气泡与其消息型。
 *
 * **过手即拆**（`PI-LANE-UI-1` 触碰 `App.tsx` 时按纪律外提）：这一段与 App 的状态无关——
 * 它只吃一枚 `TurnProjection` 和四枚回调，是最纯的一块。行为一字未改：
 * 逐字节移出，`App.tsx` 侧只余一次 import。
 */
export type ChatMessage =
  | {
      role: 'user';
      /** 展示气泡文本（用户原文，可空）；附件与粘贴块另由 chip / PasteBlock 呈现。 */
      text: string;
      /** 送入模型的正文（text + 就绪附件 readingMarkdown + 粘贴块，逐字）；亦作多轮 history 的用户内容。 */
      content: string;
      files: string[];
      pasteBlocks?: string[];
      createdAt: number;
    }
  | {
      role: 'assistant';
      text: string;
      files: [];
      createdAt: number;
      turn: TurnProjection;
    };

export function ChatAssistantMessage({ message, index, latest, onStop, onRetry, testIdPrefix = 'chat' }: {
  message: Extract<ChatMessage, { role: 'assistant' }>;
  index: number;
  /** PILOT-LIVE-2 E：最新回复默认全文展开（折叠仅限历史轮次）；推理轨迹折叠不随此豁免（辅助信息）。 */
  latest?: boolean;
  onStop?: () => void;
  onRetry?: () => void;
  testIdPrefix?: 'chat' | 'work-chat';
}) {
  const { turn } = message;
  const terminal = turn.status === 'completed' || turn.status === 'failed';
  return (
    <div
      className={`assistant-message${turn.status === 'failed' ? ' is-failed' : ''}`}
      data-testid={turn.status === 'failed' ? `${testIdPrefix}-assistant-failed` : `${testIdPrefix}-assistant-message`}
      data-turn-id={turn.turnId}
      data-status={turn.status}
    >
      <ProcessTrace
        view={processTraceFromTurn(turn)}
        actions={onStop && (
          <button type="button" className="quiet-button chat-stop" data-testid="chat-stop" onClick={onStop}>Stop</button>
        )}
        renderContent={(content) => turn.status === 'running'
          ? <div className="chat-reasoning-stream">{content}</div>
          : <CollapsibleMessage lines={12}><ChatMarkdown text={content} /></CollapsibleMessage>}
      />
      {turn.assistantMessage && (turn.status === 'running' ? (
        <div className="chat-stream-content" data-testid="chat-stream-content">{turn.assistantMessage}</div>
      ) : latest ? (
        <ChatMarkdown text={turn.assistantMessage} />
      ) : (
        <CollapsibleMessage lines={12}><ChatMarkdown text={turn.assistantMessage} /></CollapsibleMessage>
      ))}
      {turn.status === 'failed' && (
        <>
          <p className="chat-turn-failure" role="alert" data-testid="chat-turn-failure">
            {turn.failure?.kind === 'canceled' ? '已停止' : turn.failure?.message}
          </p>
          {onRetry && (
            <button type="button" className="quiet-button chat-retry" data-testid="chat-retry" onClick={onRetry}>
              <Icon name="rotate-clockwise" scope="turn" />Retry
            </button>
          )}
        </>
      )}
      {terminal && turn.usage && (
        <p className="chat-turn-usage" data-testid="chat-turn-usage">
          {formatUsageMetering(turn.usage)}
        </p>
      )}
      {turn.status === 'completed' && (
        <MessageActions messageId={`${testIdPrefix}-${index}`} text={turn.assistantMessage} createdAt={message.createdAt} />
      )}
    </div>
  );
}