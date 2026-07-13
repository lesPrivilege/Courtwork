import { useEffect, useRef, useState } from 'react';
import { ChatMarkdown } from './ChatMarkdown';

/**
 * 打字机 reveal（用户拍板 2026-07-12）：UI 层逐字显示 assistant 回复，按刷新率推进。
 * 通行正宗是后端 SSE 流式 token 逐个 append；当前 provider.generate 非流式（等完整返回），
 * 先做前端 reveal——真流式接入后把数据源换成 stream chunks 即可，渲染层不变。
 * reveal 期间纯文本（pre-wrap 保换行，避免 md 中间态闪烁），完成切 ChatMarkdown 富渲染。
 * prefers-reduced-motion 瞬显（无逐字动画）。
 */
// 每帧步进自适应：短消息逐字（打字感），长消息加速，总时长封顶 ~1.5s（≈90 帧）。
const TARGET_FRAMES = 90;

export function Typewriter({ text, onDone }: { text: string; onDone?: () => void }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [len, setLen] = useState(reduce ? text.length : 0);
  const done = len >= text.length;
  const step = Math.max(2, Math.ceil(text.length / TARGET_FRAMES));
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (done) {
      onDoneRef.current?.();
      return;
    }
    const raf = requestAnimationFrame(() => setLen((l) => Math.min(text.length, l + step)));
    return () => cancelAnimationFrame(raf);
  }, [len, text.length, done, step]);

  if (done) return <ChatMarkdown text={text} />;
  return <p className="chat-typewriter" data-testid="chat-typewriter">{text.slice(0, len)}</p>;
}
