import type { ReactNode } from 'react';
import { SurfaceCard } from '../surface/SurfaceCard';

interface PreviewHostProps {
  title: string;
  meta?: string;
  navigation: ReactNode;
  children: ReactNode;
  onClose: () => void;
}

/** 领域无关的 Preview 宿主；业务语义只由 renderer 以 props 注入。 */
export function PreviewHost({ title, meta, navigation, children, onClose }: PreviewHostProps) {
  return (
    <SurfaceCard elevation="raised" className="preview-host" data-testid="preview-host" data-template-host="preview">
      <header className="panel-head preview-host-head">
        <h2>{title}</h2>
        {meta && <span>{meta}</span>}
        <span className="spacer" />
        <button type="button" className="icon-button" data-testid="preview-close" onClick={onClose} aria-label="关闭预览" title="关闭预览">
          ×
        </button>
      </header>
      {navigation}
      <div className="preview-host-content">{children}</div>
    </SurfaceCard>
  );
}
