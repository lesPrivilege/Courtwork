import { useState, type CSSProperties, type ReactNode, type UIEvent } from 'react';
import { SurfaceCard } from '../surface/SurfaceCard';
import { Icon } from '../workbench/Icon';
import type { PreviewProgressModel } from './contracts';

interface PreviewHostProps {
  title: string;
  meta?: string;
  navigation: ReactNode;
  children: ReactNode;
  onClose: () => void;
  progress?: PreviewProgressModel;
}

/** 领域无关的 Preview 宿主；业务语义只由 renderer 以 props 注入。 */
export function PreviewHost({ title, meta, navigation, children, onClose, progress }: PreviewHostProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const updateProgress = (event: UIEvent<HTMLDivElement>) => {
    if (!progress) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const distance = target.scrollHeight - target.clientHeight;
    if (distance <= 0) return;
    setScrollProgress(Math.min(1, Math.max(0, target.scrollTop / distance)));
  };

  return (
    <SurfaceCard elevation="raised" className="preview-host" data-testid="preview-host" data-template-host="preview">
      <header className="panel-head preview-host-head">
        <h2>{title}</h2>
        {meta && <span>{meta}</span>}
        <span className="spacer" />
        <button type="button" className="icon-button" data-testid="preview-close" onClick={onClose} aria-label="Close preview" title="Close preview">
          <Icon name="x" />
        </button>
      </header>
      {navigation}
      <div className="preview-host-body">
        <div className="preview-host-content" onScrollCapture={updateProgress}>{children}</div>
        {progress && <aside
          className="preview-scroll-progress"
          data-testid="preview-scroll-progress"
          role="progressbar"
          aria-label="Preview scroll progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(scrollProgress * 100)}
          aria-readonly="true"
          style={{ '--preview-scroll-progress': scrollProgress } as CSSProperties}
        >
          <span className="preview-progress-track" data-testid="preview-progress-track">
            <i className="preview-progress-fill" />
            {progress.markers?.map((marker) => <b
              key={marker.id}
              className={`preview-progress-marker tone-${marker.tone ?? 'neutral'}`}
              title={marker.label}
              style={{ '--preview-marker-position': Math.min(1, Math.max(0, marker.position)) } as CSSProperties}
            />)}
          </span>
        </aside>}
      </div>
    </SurfaceCard>
  );
}
