import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../workbench/Icon';

function relativeLabel(createdAt: number, now: number) {
  const minutes = Math.max(0, Math.floor((now - createdAt) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export function MessageActions({ messageId, text, createdAt }: { messageId: string; text: string; createdAt: number }) {
  const [now, setNow] = useState(() => Date.now());
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const absolute = useMemo(() => new Date(createdAt).toISOString(), [createdAt]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const record = (value: 'up' | 'down') => {
    setFeedback(value);
    const key = 'courtwork.message-feedback-ledger';
    const current = JSON.parse(window.localStorage.getItem(key) ?? '[]') as unknown[];
    window.localStorage.setItem(key, JSON.stringify([...current, { messageId, value, createdAt: Date.now() }]));
  };

  // frontier 形制（2026-07-12 用户参照）：按钮组在前、时间戳居尾部轻灰
  return <footer className="message-actions" data-testid={`message-actions-${messageId}`}>
    <button type="button" aria-label="Copy message" onClick={() => void navigator.clipboard.writeText(text).catch(() => { /* 权限被拒不抛裸异常（批次七 #6）；同 CopyButton 惯例不做破坏性兜底 */ })}><Icon name="clipboard" scope="turn" /></button>
    <button type="button" aria-label="Read aloud" disabled title="Coming later" data-state="unwired"><Icon name="volume-two" scope="turn" /></button>
    <button type="button" aria-label="Helpful" aria-pressed={feedback === 'up'} onClick={() => record('up')}><Icon name="thumbs-up" scope="turn" /></button>
    <button type="button" aria-label="Not helpful" aria-pressed={feedback === 'down'} onClick={() => record('down')}><Icon name="thumbs-down" scope="turn" /></button>
    <button type="button" aria-label="More message actions" disabled title="Message fork editing comes later" data-state="unwired"><Icon name="ellipsis" scope="turn" /></button>
    <time dateTime={absolute} title={absolute} data-testid="message-relative-time">{relativeLabel(createdAt, now)}</time>
  </footer>;
}

export { relativeLabel };
