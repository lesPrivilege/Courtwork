import { useState } from 'react';
import { SparkLinesIcon } from '../icons/custom-icons.generated';

export type ThinkingStreamState = 'thinking' | 'settled' | 'empty';

interface ThinkingStreamProps {
  /** 推理生命周期：进行中 / 静默可回看 / 无推理内容。 */
  state?: ThinkingStreamState;
  /** 静默锚展开后的真实或录制思考摘要。 */
  content?: string;
  defaultOpen?: boolean;
}

/**
 * 推理/思考流折叠容器（docs/52 #7）。
 * 仅做容器与折叠交互；内容由 T-provider.1 接流式后注入。
 * spark-lines 标识 = 「机器的话」区隔语义。
 */
export function ThinkingStream({
  state = 'settled',
  content = '已梳理请求目标、材料范围与下一步工作面。',
  defaultOpen = false,
}: ThinkingStreamProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (state === 'empty') return null;

  if (state === 'thinking') {
    return (
      <div className="thinking-stream is-thinking" data-testid="thinking-stream" data-state="thinking" role="status" aria-label="Reasoning in progress">
        <SparkLinesIcon
          className="line-icon thinking-stream-glyph"
          viewBox="0 0 24 24"
          preserveAspectRatio="none"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className={`thinking-stream is-settled ${open ? 'is-open' : ''}`} data-testid="thinking-stream" data-state="settled" data-open={open ? 'true' : 'false'}>
      <button
        type="button"
        className="thinking-stream-toggle"
        data-testid="thinking-stream-toggle"
        aria-expanded={open}
        aria-label={open ? 'Hide reasoning' : 'Show reasoning'}
        title={open ? 'Hide reasoning' : 'Show reasoning'}
        onClick={() => setOpen((value) => !value)}
      >
        <SparkLinesIcon
          className="line-icon thinking-stream-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="thinking-stream-body" data-testid="thinking-stream-body" role="region" aria-label="Reasoning">
          <p>{content}</p>
        </div>
      )}
    </div>
  );
}
