import type { ReactNode } from 'react';

export type FiniteGridRatio = '1:1' | '2:1' | '1:2' | '1:1:1';
const FINITE_GRID_RATIOS: readonly FiniteGridRatio[] = ['1:1', '2:1', '1:2', '1:1:1'];

export function GridComposition({ ratio, children }: { ratio: FiniteGridRatio; children: ReactNode }) {
  if (!FINITE_GRID_RATIOS.includes(ratio)) throw new Error('Grid composition ratio is not registered');
  return <div className={`visual-composition-grid ratio-${ratio.replaceAll(':', '-')}`} data-ratio={ratio}>{children}</div>;
}

export function RepeatComposition<T>({ items, render }: { items: readonly T[]; render: (item: T, index: number) => ReactNode }) {
  return <div className="visual-composition-repeat">{items.map(render)}</div>;
}
