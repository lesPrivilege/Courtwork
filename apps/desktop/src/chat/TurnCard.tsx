import { useState, type ReactNode } from 'react';
import { CopyButton } from '../workbench/CopyButton';
import { Icon, type IconName } from '../workbench/Icon';

export type TurnCardKind = 'event' | 'artifact' | 'file' | 'gate' | 'question';

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
        <span className="turn-card-icon"><Icon name={icon} scope="turn" /></span>
        {eyebrow && <span className="domain-badge">{eyebrow}</span>}
        <span>{title}</span>
      </div>
    );
  }

  return (
    <section className={`turn-card turn-card-${kind} ${kind === 'artifact' ? 'data-card' : ''}`} data-testid={testId} data-kind={kind}>
      <button type="button" className="turn-card-route" aria-label={routeLabel} onClick={onOpen} disabled={!onOpen}>
        <span className="turn-card-icon"><Icon name={icon} scope="turn" /></span>
        <span className="turn-card-copy">
          <span className="turn-card-title">{eyebrow && <span className="domain-badge">{eyebrow}</span>}<strong>{title}</strong></span>
          {summary && <span className="turn-card-summary">{summary}</span>}
        </span>
        {onOpen && <Icon name="chevron-right" scope="turn" />}
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
    // 批次七 #7：全受控——open prop 与原生 toggle 打架致展开后收不起,preventDefault 后由 state 单源驱动
    <details className="tool-call-row" data-testid="tool-call-row" open={open}>
      <summary onClick={(event) => { event.preventDefault(); setOpen((value) => !value); }}>
        <Icon name="chevron-right" scope="turn" />
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

interface QuestionOption {
  value: string;
  label: string;
}

interface QuestionTurnCardProps {
  question: string;
  options: readonly QuestionOption[];
  onAnswer?: (value: string) => void;
}

/** 可跳过、不阻塞的封闭提问；答案以 enum value 留痕。 */
export function QuestionTurnCard({ question, options, onAnswer }: QuestionTurnCardProps) {
  const [answer, setAnswer] = useState<string>();
  const recordedLabel = answer === 'skipped' ? 'Skipped' : options.find((option) => option.value === answer)?.label;
  const record = (value: string) => {
    setAnswer(value);
    onAnswer?.(value);
  };

  return (
    <section className="turn-card turn-card-question" data-testid="turn-card-question" data-kind="question" data-answer={answer ?? 'unanswered'}>
      <header className="question-card-head">
        <span className="turn-card-icon"><Icon name="message-square-text" scope="turn" /></span>
        <strong>{question}</strong>
      </header>
      <div className="question-card-options">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="quiet-button question-option"
            data-testid={`question-option-${option.value}`}
            disabled={Boolean(answer)}
            onClick={() => record(option.value)}
          >
            {option.label}
          </button>
        ))}
        <button type="button" className="quiet-button question-skip" data-testid="question-skip" disabled={Boolean(answer)} onClick={() => record('skipped')}>Skip</button>
      </div>
      {recordedLabel && <p className="question-recorded"><span>Recorded</span><code>{answer}</code><strong>{recordedLabel}</strong></p>}
    </section>
  );
}
