import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ModuleId } from '../modules/module-stack';
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
  mode: 'dock';
  items: readonly UtilityItem[];
}

/**
 * 通用能力栏（ch12 三卡一纸）：两态皆为坐底纸的三 tap 行，永不成卡——schema 唯一右卡。
 * dock 态 = 其下承 schema 卡；base 态 = 无 schema 卡，末附 reopen 入口（仍坐底纸）。
 * 严禁 import 任何垂类 renderer。
 */
export function UtilityRail({ mode, items }: UtilityRailProps) {
  const [dockItemId, setDockItemId] = useState<UtilityItem['id'] | null>(null);
  const dockRef = useRef<HTMLElement>(null);
  const dockItem = items.find((item) => item.id === dockItemId);

  useEffect(() => {
    if (!dockItemId) return;
    const closeOutside = (event: PointerEvent) => {
      if (dockRef.current?.contains(event.target as Node)) return;
      setDockItemId(null);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [dockItemId]);

  return (
    <section ref={dockRef} className="utility-dock" data-testid="utility-rail" data-mode={mode}>
      <div className="utility-dock-taps">
        {items.map((item) => (
          <section key={item.id} className="utility-dock-item stack-module" data-testid={`module-${item.id}`} data-open={item.open ? 'true' : 'false'}>
            <button type="button" data-testid={`module-${item.id}-toggle`} aria-expanded={dockItemId === item.id} onClick={() => setDockItemId((open) => open === item.id ? null : item.id)}>
              <span className="stack-module-title">{item.title}</span>
              <strong className="stack-module-count" data-testid={item.id === 'progress' ? 'progress-module-count' : undefined}>{item.count}</strong>
            </button>
            {item.dockAction}
          </section>
        ))}
      </div>
      {dockItem && (
        <aside className="utility-dock-popover" data-testid="utility-dock-popover" aria-label={dockItem.title}>
          <header><strong>{dockItem.title}</strong><span>{dockItem.count}</span></header>
          <div
            className="utility-dock-popover-body"
            onClick={(event) => {
              if ((event.target as Element).closest('button, a')) setDockItemId(null);
            }}
          >{dockItem.body}</div>
        </aside>
      )}
    </section>
  );
}
