import { useState } from 'react';
import { clearMemory, loadMemory, type MemoryBackend, type MemoryKind, type MemoryReadResult } from './chat-memory';

/**
 * CHAT-MEMORY-1（ADR-013 §2）用户面：长期记忆的「查看 + 一键清除」。
 * 明确拒绝（ADR-013）：不提供编辑、分条管理或导入导出——只读列表 + 单键清除。
 * memory 是可撤销缓存，清除是安全方向（无留人确认摩擦），点击即生效并回执。
 */

const KIND_LABEL: Record<MemoryKind, string> = {
  directive: '记事',
  preference: '偏好',
  entity: '实体',
};

export interface ChatMemoryPanelProps {
  /** 缺省用模块默认背板（localStorage）；测试注入内存背板。 */
  backend?: MemoryBackend;
  onFeedback?: (message: string, ok: boolean) => void;
}

export function ChatMemoryPanel({ backend, onFeedback }: ChatMemoryPanelProps) {
  const [state, setState] = useState<MemoryReadResult>(() => loadMemory(backend));

  const handleClear = () => {
    clearMemory(backend);
    setState(loadMemory(backend));
    onFeedback?.('长期记忆已清除', true);
  };

  const isEmpty = state.status === 'ok' && state.entries.length === 0;

  return (
    <div className="settings-row" data-testid="settings-memory-row">
      <div className="settings-memory">
        <strong>长期记忆</strong>
        <p>从既往对话自动蒸馏的偏好与要点，作参考不作裁决依据。案件内容与密钥永不进入，可随时清除。</p>

        {state.status === 'unreadable' ? (
          <p className="settings-memory-note" data-testid="settings-memory-unreadable" role="note">
            无法读取（版本不兼容或已损坏）。可一键清除重置。
          </p>
        ) : state.entries.length === 0 ? (
          <p className="settings-memory-note" data-testid="settings-memory-empty">
            暂无记忆。你在对话中提到的偏好或要点会自动蒸馏至此。
          </p>
        ) : (
          <ul className="settings-memory-list" data-testid="settings-memory-list">
            {state.entries.map((entry) => (
              <li key={entry.id} className="settings-memory-item" data-testid="settings-memory-item">
                <span className="settings-memory-kind">{KIND_LABEL[entry.kind]}</span>
                <span className="settings-memory-text">{entry.text}</span>
                <span
                  className="settings-memory-source"
                  data-testid="settings-memory-source"
                  title={`来源会话 ${entry.source.sessionId} · turn ${entry.source.turnId}`}
                >
                  来源：{entry.source.turnId}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="settings-row-actions">
        <button
          type="button"
          className="quiet-button"
          data-testid="settings-memory-clear"
          disabled={isEmpty}
          onClick={handleClear}
        >
          清除全部
        </button>
      </div>
    </div>
  );
}
