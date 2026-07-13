import { useRef, useState, type ReactNode } from 'react';
import type {
  InteractionAnswer,
  InteractionRequestedEvent,
  InteractionResolvedEvent,
  TurnReplay,
} from '@courtwork/core/turn-protocol';
import type { ResolvedSourceAnchor } from '@courtwork/schemas';
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

export interface InteractionTurnView {
  turnId: string;
  state: 'pending' | 'resolved';
  request: InteractionRequestedEvent;
  resolution?: InteractionResolvedEvent;
}

export function interactionViewFromReplay(replay: TurnReplay): InteractionTurnView {
  const request = replay.events.find(
    (event): event is InteractionRequestedEvent => event.type === 'interaction_requested',
  );
  if (!request) throw new Error(`Turn ${replay.turnId} has no interaction request snapshot`);
  const resolution = replay.events.find(
    (event): event is InteractionResolvedEvent => event.type === 'interaction_resolved' && event.requestId === request.requestId,
  );
  return {
    turnId: replay.turnId,
    state: resolution ? 'resolved' : 'pending',
    request,
    ...(resolution ? { resolution } : {}),
  };
}

interface InteractionTurnCardProps {
  view: InteractionTurnView;
  onResolve: (answer: InteractionAnswer) => Promise<void>;
  onOpenSource?: (anchor: ResolvedSourceAnchor) => void | Promise<void>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : 'Unable to record response';
}

/** Generic protocol card: domain content and anchors are immutable core snapshots. */
export function InteractionTurnCard({ view, onResolve, onOpenSource }: InteractionTurnCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const submittingRef = useRef(false);
  const resolved = view.state === 'resolved';
  const answer = view.resolution?.answer;
  const answerId = answer?.kind === 'option' ? answer.optionId : answer?.kind === 'skip' ? 'skipped' : undefined;
  const recordedLabel = answer?.kind === 'option'
    ? view.request.options.find((option) => option.id === answer.optionId)?.label
    : answer?.kind === 'skip' ? 'Skipped' : undefined;

  const submit = async (next: InteractionAnswer) => {
    if (resolved || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(undefined);
    try {
      await onResolve(next);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const openSource = async (anchor: ResolvedSourceAnchor) => {
    if (!onOpenSource) return;
    setError(undefined);
    try {
      await onOpenSource(anchor);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };

  return (
    <section
      className="interaction-turn-card"
      data-testid="turn-card-question"
      data-kind="interaction"
      data-state={view.state}
      data-answer={answerId ?? 'unanswered'}
    >
      <header className="interaction-card-head">
        <span className="turn-card-icon"><Icon name="message-square-text" scope="turn" /></span>
        <strong>{view.request.question}</strong>
      </header>
      <div className="interaction-options">
        {view.request.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="question-option"
            data-testid={`question-option-${option.id}`}
            disabled={resolved || submitting}
            onClick={() => void submit({ kind: 'option', optionId: option.id })}
          >
            <strong>{option.label}</strong>
            {option.description && <span>{option.description}</span>}
          </button>
        ))}
        {view.request.skippable && (
          <button
            type="button"
            className="question-option question-skip"
            data-testid="question-skip"
            disabled={resolved || submitting}
            onClick={() => void submit({ kind: 'skip' })}
          >
            Skip
          </button>
        )}
      </div>
      {view.request.sourceAnchors.length > 0 && (
        <div className="interaction-anchor-ledger">
          {view.request.sourceAnchors.map((anchor, index) => {
            const body = (
              <>
                {anchor.quote && <q>{anchor.quote}</q>}
                <span className="interaction-anchor-meta">
                  {anchor.fileId}{anchor.page ? ` · p.${anchor.page}` : ''}
                </span>
              </>
            );
            return onOpenSource ? (
              <button
                key={`${anchor.fileId}-${index}`}
                type="button"
                className="interaction-anchor"
                data-testid={`interaction-source-${index}`}
                onClick={() => void openSource(anchor)}
              >
                {body}
              </button>
            ) : (
              <div key={`${anchor.fileId}-${index}`} className="interaction-anchor">{body}</div>
            );
          })}
        </div>
      )}
      {error && <p className="interaction-submit-error" role="alert">{error}</p>}
      {recordedLabel && (
        <p className="interaction-recorded">
          <span>Recorded</span><code>{answerId}</code><strong>{recordedLabel}</strong>
        </p>
      )}
    </section>
  );
}
