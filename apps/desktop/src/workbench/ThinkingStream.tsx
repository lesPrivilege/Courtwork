import { useState } from 'react';
import { BrandThinking } from '../chat/BrandThinking';

export type ThinkingStreamState = 'thinking' | 'settled' | 'empty';

interface ThinkingStreamProps {
  /** 推理生命周期：进行中 / 静默可回看 / 无推理内容。 */
  state?: ThinkingStreamState;
  /** 静默锚展开后的真实或录制思考摘要。 */
  content?: string;
  defaultOpen?: boolean;
}

/**
 * 推理/思考流折叠容器（docs/52 #7 · RP-2.11 改判 · 批次七⑦品牌换装/RP-2.12⑩ 既裁）。
 * 进行态＝品牌三横写开（BrandThinking，与 chat 面 pending 同件收敛）；静默锚保留藏青竖线字符（terminal 式，quiet）。
 * 三态闭环：进行（品牌动画）→ 静默（字符折叠锚）→ 无（零痕迹）。
 * 四纪律守全：数据区静止 / 内容 0ms 硬切 / 法理之线不参与 / 动画只走 transform（motion 白名单）。
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
        <BrandThinking />
        <span className="thinking-label">Thinking…</span>
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
        <span className="thinking-cursor" aria-hidden="true">▏</span>
        <span className="thinking-label">Thought process</span>
      </button>
      {open && (
        <div className="thinking-stream-body" data-testid="thinking-stream-body" role="region" aria-label="Reasoning">
          <p>{content}</p>
        </div>
      )}
    </div>
  );
}
