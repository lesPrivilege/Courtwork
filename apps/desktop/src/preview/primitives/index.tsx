import type { ReactNode } from 'react';
import {
  assertFrozenViewModel,
  type AnchorView,
  type DecisionView,
  type EstimateView,
  type EvidenceView,
  type FieldView,
  type PartialView,
  type StatusView,
} from '../projection/view-model.js';

function guarded(view: object, render: () => ReactNode) {
  assertFrozenViewModel(view);
  return render();
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function Field({ view }: { view: FieldView }) {
  return guarded(view, () => {
    if (!nonEmpty(view.id) || !nonEmpty(view.label) || !['text', 'mono', 'tags'].includes(view.valueKind)) throw new Error('Field view is invalid');
    if (view.valueKind === 'tags' ? !Array.isArray(view.value) : typeof view.value !== 'string') throw new Error('Field value shape is invalid');
    return (
      <span className={`visual-field is-${view.valueKind}`} data-primitive="field" data-field-id={view.id} aria-label={view.label}>
        {Array.isArray(view.value) ? (view.value.length > 0 ? view.value.join(' · ') : '—') : view.value}
      </span>
    );
  });
}

function anchorBody(view: AnchorView) {
  return (
    <>
      <q>{view.quote}</q>
      <span className="visual-anchor-meta">
        {view.fileLabel}{view.page === undefined ? '' : ` · 第 ${view.page} 页`}
      </span>
    </>
  );
}

export function Anchor({ view, onOpen }: { view: AnchorView; onOpen?: (id: string) => void }) {
  return guarded(view, () => {
    if (!nonEmpty(view.id) || !nonEmpty(view.fileLabel) || !nonEmpty(view.quote) || !['quote_only', 'source_ready'].includes(view.availability)) throw new Error('Anchor view is invalid');
    if (view.page !== undefined && (!Number.isInteger(view.page) || view.page <= 0)) throw new Error('Anchor page is invalid');
    return view.availability === 'source_ready' && onOpen ? (
      <button
        type="button"
        className="visual-anchor is-source-ready"
        data-primitive="anchor"
        data-anchor-id={view.id}
        data-testid={view.id}
        onClick={() => onOpen(view.id)}
      >
        {anchorBody(view)}
      </button>
    ) : (
      <span className="visual-anchor is-quote-only" data-primitive="anchor" data-anchor-id={view.id} data-availability={view.availability}>
        {anchorBody(view)}
      </span>
    );
  });
}

export function Status({ view }: { view: StatusView }) {
  return guarded(view, () => {
    if (!nonEmpty(view.label) || !['neutral', 'generated', 'verified', 'warning', 'critical'].includes(view.tone)) throw new Error('Status view is invalid');
    return <span className={`visual-status tone-${view.tone}`} data-primitive="status" data-tone={view.tone}>{view.label}</span>;
  });
}

export function Evidence({ view, onOpen }: { view: EvidenceView; onOpen?: (id: string) => void }) {
  return guarded(view, () => {
    if (view.anchors.length === 0) throw new Error('Evidence requires at least one anchor');
    if (!nonEmpty(view.statement) || !['generated', 'verified', 'out_of_coverage'].includes(view.verification)) throw new Error('Evidence view is invalid');
    return (
      <section className={`visual-evidence is-${view.verification}`} data-primitive="evidence" data-verification={view.verification}>
        <p className="visual-evidence-statement">{view.statement}</p>
        <div className="visual-evidence-anchors">{view.anchors.map((item) => <Anchor key={item.id} view={item} onOpen={onOpen} />)}</div>
      </section>
    );
  });
}

export function Decision({ view, onAction }: { view: DecisionView; onAction?: (id: string) => void }) {
  const locked = !onAction || view.state === 'submitting' || view.state === 'resolved';
  return guarded(view, () => {
    const actionIds = new Set(view.actions.map((action) => action.id));
    if (!nonEmpty(view.requestId) || !['pending', 'submitting', 'resolved', 'failed'].includes(view.state)) throw new Error('Decision view is invalid');
    if (actionIds.size !== view.actions.length || view.actions.some((action) => !nonEmpty(action.id) || !nonEmpty(action.label))) throw new Error('Decision actions are invalid');
    if (view.resolvedActionId !== undefined && !actionIds.has(view.resolvedActionId)) throw new Error('Decision resolution is invalid');
    return (
    <fieldset className="visual-decision" data-primitive="decision" data-state={view.state} disabled={locked}>
      <legend>Decision</legend>
      <div className="visual-decision-actions">
        {view.actions.map((action) => (
          <button
            key={action.id}
            type="button"
            className={`question-option${action.id === 'skipped' ? ' question-skip' : ''}`}
            data-decision-action={action.id}
            data-testid={action.id === 'skipped' ? 'question-skip' : `question-option-${action.id}`}
            aria-pressed={view.resolvedActionId === action.id}
            disabled={locked}
            onClick={() => onAction?.(action.id)}
          >
            <strong>{action.label}</strong>
            {action.description && <span>{action.description}</span>}
          </button>
        ))}
      </div>
      {view.resolvedActionId && (
        <p className="interaction-recorded">
          <span>Recorded</span><code>{view.resolvedActionId}</code>
          <strong>{view.actions.find((action) => action.id === view.resolvedActionId)?.label}</strong>
        </p>
      )}
    </fieldset>
    );
  });
}

function estimateText(view: EstimateView): string {
  const shapes = Number(view.point !== undefined) + Number(view.range !== undefined) + Number(view.statusLabel !== undefined);
  if (shapes !== 1) throw new Error('Estimate must contain exactly one point, range, or status');
  if (view.point !== undefined) {
    if (!Number.isFinite(view.point)) throw new Error('Estimate point must be finite');
    return String(view.point);
  }
  if (view.range !== undefined) {
    if (!Number.isFinite(view.range.low) || !Number.isFinite(view.range.high) || view.range.high < view.range.low) {
      throw new Error('Estimate range is invalid');
    }
    return `${view.range.low}–${view.range.high}`;
  }
  return view.statusLabel!;
}

export function Estimate({ view }: { view: EstimateView }) {
  return guarded(view, () => (
    <span className="visual-estimate" data-primitive="estimate">
      <span>{estimateText(view)}</span>{view.unit && <small>{view.unit}</small>}
    </span>
  ));
}

export function Partial({ view }: { view: PartialView }) {
  return guarded(view, () => {
    if (![view.completed, view.pending, view.total].filter((value) => value !== undefined).every((value) => Number.isInteger(value) && value! >= 0)) {
      throw new Error('Partial counts must be non-negative integers');
    }
    if (view.total !== undefined && view.completed + view.pending > view.total) throw new Error('Partial counts exceed total');
    if (view.failures.some((failure) => !nonEmpty(failure))) throw new Error('Partial failure is invalid');
    return (
      <section className="visual-partial" data-primitive="partial">
        <dl>
          <div><dt>Completed</dt><dd>{view.total === undefined ? view.completed : `${view.completed}/${view.total}`}</dd></div>
          <div><dt>Pending</dt><dd>{view.pending}</dd></div>
        </dl>
        {view.failures.length > 0 && <ul role="alert">{view.failures.map((failure, index) => <li key={`${index}:${failure}`}>{failure}</li>)}</ul>}
      </section>
    );
  });
}
