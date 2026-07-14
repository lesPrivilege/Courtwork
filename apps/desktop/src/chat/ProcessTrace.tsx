import { useEffect, useState, type ReactNode } from 'react';
import { BrandThinking } from './BrandThinking';

export type ProcessTraceMode = 'reasoning' | 'progress';
export type ProcessTraceState = 'running' | 'settled' | 'empty' | 'failed';

export interface ProcessTraceView {
  mode: ProcessTraceMode;
  state: ProcessTraceState;
  content?: string;
}

interface ProcessTraceProps {
  view: ProcessTraceView;
  actions?: ReactNode;
  defaultOpen?: boolean;
  renderContent?: (content: string) => ReactNode;
}

const COPY = {
  reasoning: {
    running: 'Thinking…',
    settled: 'Thought process',
    failed: 'Thought process · Stopped',
    show: 'Show reasoning',
    hide: 'Hide reasoning',
    region: 'Reasoning',
  },
  progress: {
    running: 'Working…',
    settled: 'Work progress',
    failed: 'Work progress · Stopped',
    show: 'Show progress',
    hide: 'Hide progress',
    region: 'Work progress',
  },
} as const;

/**
 * Domain-blind lifecycle disclosure shared by Chat reasoning and Work progress.
 * The caller supplies a mechanical protocol projection; this component never
 * infers content, completion, or vertical semantics.
 */
export function ProcessTrace({
  view,
  actions,
  defaultOpen = false,
  renderContent = (content) => <p>{content}</p>,
}: ProcessTraceProps) {
  const [open, setOpen] = useState(defaultOpen);
  const copy = COPY[view.mode];

  useEffect(() => {
    if (view.state === 'running' || view.state === 'empty') setOpen(false);
  }, [view.mode, view.state]);

  if (view.state === 'empty') return null;

  if (view.state === 'running') {
    return (
      <div
        className="process-trace is-running"
        data-testid="process-trace"
        data-mode={view.mode}
        data-state="running"
        role="status"
        aria-label={copy.running}
      >
        <div className="process-trace-head">
          <BrandThinking />
          <span className="process-trace-label">{copy.running}</span>
          {actions && <span className="process-trace-actions">{actions}</span>}
        </div>
        {view.content && (
          <div className="process-trace-body is-live" data-testid="process-trace-body">
            {renderContent(view.content)}
          </div>
        )}
      </div>
    );
  }

  if (!view.content) {
    return view.state === 'failed' ? (
      <div
        className="process-trace is-failed"
        data-testid="process-trace"
        data-mode={view.mode}
        data-state="failed"
        role="status"
      >
        <span className="process-trace-cursor" aria-hidden="true">▏</span>
        <span className="process-trace-label">{copy.failed}</span>
        {actions && <span className="process-trace-actions">{actions}</span>}
      </div>
    ) : null;
  }

  const toggleLabel = open ? copy.hide : copy.show;
  return (
    <div
      className={`process-trace is-${view.state} ${open ? 'is-open' : ''}`}
      data-testid="process-trace"
      data-mode={view.mode}
      data-state={view.state}
      data-open={open ? 'true' : 'false'}
    >
      <div className="process-trace-head">
        <button
          type="button"
          className="process-trace-toggle"
          data-testid="process-trace-toggle"
          aria-expanded={open}
          aria-label={toggleLabel}
          title={toggleLabel}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="process-trace-cursor" aria-hidden="true">▏</span>
          <span className="process-trace-label">{view.state === 'failed' ? copy.failed : copy.settled}</span>
        </button>
        {actions && <span className="process-trace-actions">{actions}</span>}
      </div>
      {open && (
        <div
          className="process-trace-body"
          data-testid="process-trace-body"
          role="region"
          aria-label={copy.region}
        >
          {renderContent(view.content)}
        </div>
      )}
    </div>
  );
}
