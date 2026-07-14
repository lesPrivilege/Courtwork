import type { ReactNode } from 'react';

export type FiniteGridRatio = '1:1' | '2:1' | '1:2' | '1:1:1';

export function SectionComposition({ children }: { children: ReactNode }) {
  return <section className="visual-composition-section">{children}</section>;
}

export function GridComposition({ ratio, children }: { ratio: FiniteGridRatio; children: ReactNode }) {
  return <div className={`visual-composition-grid ratio-${ratio.replaceAll(':', '-')}`} data-ratio={ratio}>{children}</div>;
}

export function RepeatComposition<T>({ items, render }: { items: readonly T[]; render: (item: T, index: number) => ReactNode }) {
  return <div className="visual-composition-repeat">{items.map(render)}</div>;
}
