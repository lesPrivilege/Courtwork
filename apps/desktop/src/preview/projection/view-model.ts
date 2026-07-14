export type StatusTone = 'neutral' | 'generated' | 'verified' | 'warning' | 'critical';

export interface FieldView {
  readonly id: string;
  readonly label: string;
  readonly value: string | readonly string[];
  readonly valueKind: 'text' | 'mono' | 'tags';
}

export interface AnchorView {
  readonly id: string;
  readonly fileLabel: string;
  readonly page?: number;
  readonly quote: string;
  readonly availability: 'quote_only' | 'source_ready';
}

export interface StatusView {
  readonly label: string;
  readonly tone: StatusTone;
}

export interface EvidenceView {
  readonly statement: string;
  readonly anchors: readonly AnchorView[];
  readonly verification: 'generated' | 'verified' | 'out_of_coverage';
}

export interface DecisionActionView {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
}

export interface DecisionView {
  readonly requestId: string;
  readonly state: 'pending' | 'submitting' | 'resolved' | 'failed';
  readonly actions: readonly DecisionActionView[];
  readonly resolvedActionId?: string;
}

export interface EstimateView {
  readonly point?: number;
  readonly range?: Readonly<{ low: number; high: number }>;
  readonly statusLabel?: string;
  readonly unit?: string;
}

export interface PartialView {
  readonly completed: number;
  readonly total?: number;
  readonly failures: readonly string[];
  readonly pending: number;
}

type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;

export function freezeViewModel<T>(value: T): DeepReadonly<T> {
  const seen = new Set<object>();
  const visit = (candidate: unknown) => {
    if (candidate === null || typeof candidate !== 'object' || seen.has(candidate)) return;
    seen.add(candidate);
    for (const child of Object.values(candidate)) visit(child);
    if (!Object.isFrozen(candidate)) Object.freeze(candidate);
  };
  visit(value);
  return value as DeepReadonly<T>;
}

export function assertFrozenViewModel(value: unknown): asserts value is Readonly<object> {
  const seen = new Set<object>();
  const visit = (candidate: unknown) => {
    if (candidate === null || typeof candidate !== 'object' || seen.has(candidate)) return;
    seen.add(candidate);
    if (!Object.isFrozen(candidate)) throw new Error('ViewModel must be recursively frozen');
    for (const child of Object.values(candidate)) visit(child);
  };
  visit(value);
}
