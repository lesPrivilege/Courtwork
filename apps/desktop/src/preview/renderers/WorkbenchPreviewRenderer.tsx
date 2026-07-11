import type { ReactNode } from 'react';
import { PreviewHost } from '../PreviewHost';

export interface PreviewTab {
  id: string;
  label: string;
}

interface WorkbenchPreviewRendererProps {
  title: string;
  meta?: string;
  tabs: readonly PreviewTab[];
  activeTab: string;
  onSelectTab: (id: string) => void;
  actions?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}

/** 首个 renderer 集；宿主本身不感知此处挂载的工作面语义。 */
export function WorkbenchPreviewRenderer({
  title,
  meta,
  tabs,
  activeTab,
  onSelectTab,
  actions,
  children,
  onClose,
}: WorkbenchPreviewRendererProps) {
  const navigation = (
    <div className="view-tabs" role="tablist" aria-label="结构化工作面">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={activeTab === tab.id ? 'active' : ''}
          onClick={() => onSelectTab(tab.id)}
          data-testid={`view-${tab.id}`}
        >
          <span>{tab.label}</span>
          <i className="tab-indicator" aria-hidden="true" />
        </button>
      ))}
      <span className="tab-spacer" />
      {actions}
    </div>
  );

  return (
    <PreviewHost title={title} meta={meta} navigation={navigation} onClose={onClose}>
      {children}
    </PreviewHost>
  );
}
