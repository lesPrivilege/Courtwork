import { useState } from 'react';
import { SparkLinesIcon } from '../icons/custom-icons.generated';

interface ThinkingStreamProps {
  /** 折叠区内占位或真实思考文本；流式接通前用占位。 */
  content?: string;
  defaultOpen?: boolean;
}

/**
 * 推理/思考流折叠容器（docs/52 #7）。
 * 仅做容器与折叠交互；内容由 T-provider.1 接流式后注入。
 * spark-lines 标识 = 「机器的话」区隔语义。
 */
export function ThinkingStream({
  content = '思考过程将在接通流式生成后显示。',
  defaultOpen = false,
}: ThinkingStreamProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="thinking-stream" data-testid="thinking-stream" data-open={open ? 'true' : 'false'}>
      <button
        type="button"
        className="thinking-stream-toggle"
        data-testid="thinking-stream-toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <SparkLinesIcon className="line-icon thinking-stream-icon" aria-hidden="true" />
        <span>思考过程</span>
        <span className="thinking-stream-hint">{open ? '收起' : '展开'}</span>
      </button>
      {open && (
        <div className="thinking-stream-body" data-testid="thinking-stream-body" role="region" aria-label="思考过程内容">
          <p>{content}</p>
        </div>
      )}
    </div>
  );
}
