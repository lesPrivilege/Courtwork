import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StackModule } from '../modules/ModuleStack';
import type { ModuleId } from '../modules/module-stack';
import { SurfaceCard } from '../surface/SurfaceCard';
import { CHROME_COPY } from '../chrome/copy';

interface UtilityItem {
  id: Extract<ModuleId, 'progress' | 'working-folders' | 'context'>;
  title: string;
  count: string;
  status: 'idle' | 'active' | 'done' | 'warn';
  open: boolean;
  body: ReactNode;
  onToggle: () => void;
  dockAction?: ReactNode;
}

interface UtilityRailProps {
  mode: 'base' | 'dock';
  items: readonly UtilityItem[];
  onOpenPreview: () => void;
}

/** 通用能力栏；严禁 import 任何垂类 renderer。 */
export function UtilityRail({ mode, items, onOpenPreview }: UtilityRailProps) {
  const [dockItemId, setDockItemId] = useState<UtilityItem['id'] | null>(null);
  const dockRef = useRef<HTMLElement>(null);
  const dockItem = items.find((item) => item.id === dockItemId);

  useEffect(() => {
    if (mode !== 'dock') setDockItemId(null);
  }, [mode]);

  useEffect(() => {
    if (!dockItemId) return;
    const closeOutside = (event: PointerEvent) => {
      if (dockRef.current?.contains(event.target as Node)) return;
      setDockItemId(null);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [dockItemId]);

  if (mode === 'dock') {
    return (
      <section ref={dockRef} className="utility-dock" data-testid="utility-rail" data-mode="dock">
        {items.map((item) => (
          <section key={item.id} className="utility-dock-item stack-module" data-testid={`module-${item.id}`} data-open={item.open ? 'true' : 'false'}>
            <button type="button" data-testid={`module-${item.id}-toggle`} aria-expanded={dockItemId === item.id} onClick={() => setDockItemId((open) => open === item.id ? null : item.id)}>
              <span className="stack-module-title">{item.title}</span>
              <strong className="stack-module-count" data-testid={item.id === 'progress' ? 'progress-module-count' : undefined}>{item.count}</strong>
            </button>
            {item.dockAction}
          </section>
        ))}
        {dockItem && (
          <aside className="utility-dock-popover" data-testid="utility-dock-popover" aria-label={dockItem.title}>
            <header><strong>{dockItem.title}</strong><span>{dockItem.count}</span></header>
            <div className="utility-dock-popover-body">{dockItem.body}</div>
          </aside>
        )}
      </section>
    );
  }

  return (
    <div className="utility-rail" data-testid="utility-rail" data-mode="base">
      <SurfaceCard elevation="raised" className="utility-preview-entry">
        <button type="button" data-testid="preview-open" onClick={onOpenPreview}>
          <span>{CHROME_COPY.utility.preview}</span><strong>{CHROME_COPY.utility.open}</strong>
        </button>
      </SurfaceCard>
      {items.map((item) => (
        <SurfaceCard elevation="raised" key={item.id} className="utility-card">
          <StackModule
            id={item.id}
            title={item.title}
            count={item.count}
            status={item.status}
            open={item.open}
            onToggle={item.onToggle}
            testId={`module-${item.id}`}
          >
            {item.body}
          </StackModule>
        </SurfaceCard>
      ))}
    </div>
  );
}
