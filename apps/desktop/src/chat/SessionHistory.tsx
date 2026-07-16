import { useState } from 'react';
import { ChatMarkdown } from './ChatMarkdown';
import type { TranscriptSession } from './session-transcript';

/**
 * CHAT-SESSION-1（ADR-013 §1）：Chat 历史会话列表——只做导航。
 *
 * 「UI 只呈现会话列表作为导航；不提供显式 session 管理入口（重命名、归档、置顶等运营性操作不做）。」
 * 历史 session 是只读 transcript：选中后只回放助手 turn（journal 真源，按既有不变量不含 user prompt），
 * 无 composer、无可编辑控件。本组件是纯呈现件，数据与 fail-closed 错误由宿主注入。
 */

export interface SessionHistoryProps {
  sessions: readonly TranscriptSession[];
  /** journal 涂改/损坏时的 fail-closed 文案；出现时不渲染任何会话项。 */
  error?: string;
  /** 返回当前（实时）会话。 */
  onClose: () => void;
}

function sessionLabel(startedAt: number): string {
  return new Date(startedAt).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SessionHistory({ sessions, error, onClose }: SessionHistoryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ordered = [...sessions].sort((left, right) => right.startedAt - left.startedAt);
  const selected = selectedId ? ordered.find((session) => session.id === selectedId) : undefined;

  return (
    <section className="session-history" data-testid="session-history" aria-label="历史会话">
      <header className="session-history-head">
        <strong>历史会话</strong>
        <button type="button" className="quiet-button" data-testid="session-history-close" onClick={onClose}>
          返回当前会话
        </button>
      </header>

      {error ? (
        <p className="session-history-error" role="alert" data-testid="session-history-error">{error}</p>
      ) : selected ? (
        <div className="session-transcript-readonly" data-testid="session-transcript-readonly">
          <button type="button" className="quiet-button" data-testid="session-transcript-back" onClick={() => setSelectedId(null)}>
            返回列表
          </button>
          <p className="session-transcript-meta">{sessionLabel(selected.startedAt)} · 只读记录</p>
          {selected.turns.map((turn) => (
            <article
              key={turn.turnId}
              className="session-transcript-turn"
              data-testid="session-transcript-turn"
              data-status={turn.status}
            >
              {turn.assistantMessage
                ? <ChatMarkdown text={turn.assistantMessage} />
                : <p className="session-transcript-empty-turn">{turn.status === 'failed' ? '（此轮未完成）' : '（无正文）'}</p>}
              {turn.status === 'failed' && (
                <p className="session-transcript-failed" role="note">此轮请求未成功</p>
              )}
            </article>
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <div className="session-history-empty" role="status" data-testid="session-history-empty">暂无历史会话</div>
      ) : (
        <ul className="session-history-list">
          {ordered.map((session) => (
            <li key={session.id}>
              <button
                type="button"
                className="session-entry"
                data-testid="session-entry"
                data-session-id={session.id}
                onClick={() => setSelectedId(session.id)}
              >
                <span className="session-entry-time">{sessionLabel(session.startedAt)}</span>
                <span className="session-entry-count">{session.turns.length} 轮</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
