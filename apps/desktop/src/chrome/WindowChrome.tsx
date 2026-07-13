import { CHROME_COPY } from './copy';
import { Icon } from '../workbench/Icon';

interface WindowChromeProps {
  leftCollapsed: boolean;
  detached?: boolean;
  onToggleLeft: () => void;
  onSearch: () => void;
}

/**
 * macOS Overlay 标题栏的 WebView 对位层。
 *
 * 三枚交通灯仍由 AppKit/Tauri 绘制；此处只保留其不可遮挡区，并承载应用自己的
 * sidebar/search 控件。展开态必须作为左卡子节点渲染，避免“视觉压在卡上、结构却在卡外”。
 */
export function WindowChrome({ leftCollapsed, detached = false, onToggleLeft, onSearch }: WindowChromeProps) {
  return (
    <header
      className={`window-chrome ${detached ? 'is-detached' : ''}`.trim()}
      data-testid="window-chrome"
      data-tauri-drag-region
    >
      <span className="mac-window-controls-safe-area" data-testid="mac-window-controls-safe-area" aria-hidden="true" />
      <button
        type="button"
        className="window-chrome-button"
        data-testid="collapse-left-rail"
        aria-label={leftCollapsed ? CHROME_COPY.navigation.expandLeft : CHROME_COPY.navigation.collapseLeft}
        title={leftCollapsed ? CHROME_COPY.navigation.expandLeft : CHROME_COPY.navigation.collapseLeft}
        onClick={onToggleLeft}
      >
        <Icon name="panel-left" />
      </button>
      <button type="button" className="window-chrome-button" aria-label="Search" title="Search" onClick={onSearch}>
        <Icon name="search" />
      </button>
      <span className="spacer" />
    </header>
  );
}
