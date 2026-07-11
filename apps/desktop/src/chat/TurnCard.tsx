import { useState, type ReactNode } from 'react';
import { CopyButton } from '../workbench/CopyButton';
import { Icon, type IconName } from '../workbench/Icon';

export type TurnCardKind = 'event' | 'artifact' | 'file' | 'gate';

interface TurnCardProps {
  kind: TurnCardKind;
  icon: IconName;
  title: string;
  eyebrow?: string;
  summary?: string;
  status?: 'idle' | 'active' | 'success';
  testId?: string;
  routeLabel?: string;
  onOpen?: () => void;
  actions?: ReactNode;
  copyText?: string;
}

/**
 * Chat 侧四类封闭 turn 卡词表。机制不解释领域内容，只承载摘要与路由。
 */
export function TurnCard({
  kind,
  icon,
  title,
  eyebrow,
  summary,
  status = 'idle',
  testId = `turn-card-${kind}`,
  routeLabel = title,
  onOpen,
  actions,
  copyText,
}: TurnCardProps) {
  if (kind === 'event') {
    return (
      <div className={`turn-event-row is-${status}`} data-testid={testId}>
        <span className="turn-card-icon"><Icon name={icon} /></span>
        {eyebrow && <span className="domain-badge">{eyebrow}</span>}
        <span>{title}</span>
      </div>
    );
  }

  return (
    <section className={`turn-card turn-card-${kind} ${kind === 'artifact' ? 'data-card' : ''}`} data-testid={testId} data-kind={kind}>
      <button type="button" className="turn-card-route" aria-label={routeLabel} onClick={onOpen} disabled={!onOpen}>
        <span className="turn-card-icon"><Icon name={icon} /></span>
        <span className="turn-card-copy">
          <span className="turn-card-title">{eyebrow && <span className="domain-badge">{eyebrow}</span>}<strong>{title}</strong></span>
          {summary && <span className="turn-card-summary">{summary}</span>}
        </span>
        {onOpen && <Icon name="chevron-right" />}
      </button>
      {actions && <div className="turn-card-actions">{actions}</div>}
      {copyText && <CopyButton label="复制卡片内容" getText={() => copyText} />}
    </section>
  );
}

interface ToolCallRowProps {
  label: string;
  tool: string;
  args: string;
  result: string;
}

/** 工具透明度：默认一行，参数/结果摘要按需展开。 */
export function ToolCallRow({ label, tool, args, result }: ToolCallRowProps) {
  const [open, setOpen] = useState(false);
  return (
    <details className="tool-call-row" data-testid="tool-call-row" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <Icon name="chevron-right" />
        <span>{label}</span>
        <code>{tool}</code>
      </summary>
      {open && (
        <dl className="tool-call-details" data-testid="tool-call-details">
          <dt>args</dt><dd>{args}</dd>
          <dt>result</dt><dd>{result}</dd>
        </dl>
      )}
    </details>
  );
}
