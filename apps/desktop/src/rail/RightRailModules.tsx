/**
 * 右列四模块序（docs/decisions/ADR-006-ui-host.md 十四章,2026-07-12 拍板）：Progress → Preview → Working folders → Context。
 * 手风琴列（Cowork 同构）；Preview 展开=大纲目录（schema 编排声明渲染,零依赖）,
 * 点大纲行进入浏览器态（App 层切换）;原件行走同一 Preview（视图汇流定理）。
 */

import type { ReactNode } from 'react';
import { Icon } from '../workbench/Icon';

export interface RailModuleItem {
  id: 'progress' | 'working-folders' | 'context';
  title: string;
  count: string;
  open: boolean;
  onToggle: () => void;
  body: ReactNode;
}

export interface OutlineEntry {
  id: string;
  label: string;
  meta: string;
}

export interface ReaderEntry {
  name: string;
  disabled?: boolean;
  onOpen?: () => void;
}

interface RightRailModulesProps {
  modules: readonly RailModuleItem[];
  outline: readonly OutlineEntry[];
  previewOpenState: boolean;
  onPreviewToggle: () => void;
  onOpenOutline: (viewId: string) => void;
  readerEntries: readonly ReaderEntry[];
}

export function RightRailModules({
  modules, outline, previewOpenState, onPreviewToggle, onOpenOutline, readerEntries,
}: RightRailModulesProps) {
  const [progress, workingFolders, context] = [
    modules.find((item) => item.id === 'progress'),
    modules.find((item) => item.id === 'working-folders'),
    modules.find((item) => item.id === 'context'),
  ];

  const renderModule = (item: RailModuleItem | undefined, extra?: ReactNode) => item && (
    <section key={item.id} className="rail-module" data-testid={`module-${item.id}`} data-open={item.open ? 'true' : 'false'}>
      <button type="button" className="rail-module-head" data-testid={`module-${item.id}-toggle`} aria-expanded={item.open} onClick={item.onToggle}>
        <span className="rail-module-title">{item.title}</span>
        <strong className="rail-module-count" data-testid={item.id === 'progress' ? 'progress-module-count' : undefined}>{item.count}</strong>
        <Icon name={item.open ? 'chevron-down' : 'chevron-right'} />
      </button>
      {item.open && <div className="rail-module-body">{item.body}{extra}</div>}
    </section>
  );

  return (
    <div className="right-rail-modules" data-testid="utility-rail" data-mode="modules">
      {renderModule(progress)}

      {/* Preview 模块：展开即大纲目录（声明渲染）;点行进浏览器态 */}
      <section className="rail-module" data-testid="module-preview" data-open={previewOpenState ? 'true' : 'false'}>
        <button type="button" className="rail-module-head" data-testid="module-preview-toggle" aria-expanded={previewOpenState} onClick={onPreviewToggle}>
          <span className="rail-module-title">Preview</span>
          <strong className="rail-module-count">{outline.length}</strong>
          <Icon name={previewOpenState ? 'chevron-down' : 'chevron-right'} />
        </button>
        {previewOpenState && (
          <div className="rail-module-body" data-testid="preview-outline">
            {outline.map((entry) => (
              <button key={entry.id} type="button" className="preview-outline-row" data-testid={`outline-${entry.id}`} onClick={() => onOpenOutline(entry.id)}>
                <span className="truncate">{entry.label}</span>
                <small>{entry.meta}</small>
                <Icon name="chevron-right" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* READER-ISOLATION-1：零入口即整块缺席（不留悬空「原件阅读」标头）——demo 语料入口只随
          demo 案供给，真实案的原件预览归 FILE-PREVIEW-1。 */}
      {renderModule(workingFolders, readerEntries.length === 0 ? undefined : (
        <div className="rail-reader-entries" data-testid="reader-entries">
          <p className="rail-label">原件阅读 · 同一 Preview</p>
          {readerEntries.map((entry) => (
            <button
              key={entry.name}
              type="button"
              className="preview-outline-row"
              data-testid="reader-entry"
              data-state={entry.disabled ? 'unwired' : undefined}
              disabled={entry.disabled}
              title={entry.disabled ? '阅读视图即将开通' : `在 Preview 中阅读 ${entry.name}`}
              onClick={entry.onOpen}
            >
              <span className="truncate">{entry.name}</span>
              {entry.disabled ? <small>即将开通</small> : <Icon name="chevron-right" />}
            </button>
          ))}
        </div>
      ))}
      {renderModule(context)}
    </div>
  );
}
