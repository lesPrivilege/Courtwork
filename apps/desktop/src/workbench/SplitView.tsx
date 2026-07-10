import { useRef, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

export type SplitDirection = 'rows' | 'columns';

interface SplitViewProps {
  direction: SplitDirection;
  ratio: number;
  onRatioChange: (ratio: number) => void;
  primary: ReactNode;
  secondary: ReactNode;
}

export function SplitView({ direction, ratio, onRatioChange, primary, secondary }: SplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const beginResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const resize = (pointerEvent: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const raw = direction === 'rows'
        ? ((pointerEvent.clientY - rect.top) / rect.height) * 100
        : ((pointerEvent.clientX - rect.left) / rect.width) * 100;
      onRatioChange(Math.min(75, Math.max(25, raw)));
    };
    const finish = () => {
      window.removeEventListener('pointermove', resize);
      window.removeEventListener('pointerup', finish);
    };
    window.addEventListener('pointermove', resize);
    window.addEventListener('pointerup', finish, { once: true });
  };

  const resizeWithKeyboard = (delta: number) => onRatioChange(Math.min(75, Math.max(25, ratio + delta)));

  return <div
    ref={containerRef}
    className={`split-grid ${direction}`}
    data-testid="split-grid"
    data-direction={direction}
    style={{ '--split-ratio': `${ratio}%` } as CSSProperties}
  >
    <div className="split-pane">{primary}</div>
    <div
      className="split-divider"
      role="separator"
      aria-label="调整对照区域大小"
      aria-orientation={direction === 'rows' ? 'horizontal' : 'vertical'}
      aria-valuenow={Math.round(ratio)}
      tabIndex={0}
      onPointerDown={beginResize}
      onKeyDown={(event) => {
        const decrease = direction === 'rows' ? event.key === 'ArrowUp' : event.key === 'ArrowLeft';
        const increase = direction === 'rows' ? event.key === 'ArrowDown' : event.key === 'ArrowRight';
        if (!decrease && !increase) return;
        event.preventDefault();
        resizeWithKeyboard(decrease ? -5 : 5);
      }}
    ><span /></div>
    <div className="split-pane">{secondary}</div>
  </div>;
}
