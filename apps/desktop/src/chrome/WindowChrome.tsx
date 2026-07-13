import { CHROME_COPY } from './copy';
import { Icon } from '../workbench/Icon';
import { invoke } from '@tauri-apps/api/core';
import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface WindowChromeProps {
  leftCollapsed: boolean;
  detached?: boolean;
  onToggleLeft: () => void;
  onSearch: () => void;
}

interface MacWindowControlsMetrics {
  groupWidth: number;
  buttonHeight: number;
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * macOS Overlay 标题栏的 WebView 对位层。
 *
 * 三枚交通灯仍由 AppKit/Tauri 绘制；此处只保留其不可遮挡区，并承载应用自己的
 * sidebar/search 控件。展开态必须作为左卡子节点渲染，避免“视觉压在卡上、结构却在卡外”。
 */
export function WindowChrome({ leftCollapsed, detached = false, onToggleLeft, onSearch }: WindowChromeProps) {
  const nativeAnchorRef = useRef<HTMLSpanElement>(null);
  const [nativeMetrics, setNativeMetrics] = useState<MacWindowControlsMetrics>();

  useEffect(() => {
    const anchor = nativeAnchorRef.current;
    if (!anchor || !isTauriRuntime()) return;

    let frame = 0;
    let disposed = false;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = anchor.getBoundingClientRect();
        void invoke<MacWindowControlsMetrics>('sync_macos_window_controls', {
          anchor: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        }).then((metrics) => {
          if (!disposed) setNativeMetrics(metrics);
        }).catch(() => {
          // 浏览器预览/非 macOS 不接管 AppKit；CSS 回退锚框仍保布局稳定。
        });
      });
    };

    const observer = new ResizeObserver(sync);
    observer.observe(anchor);
    observer.observe(document.documentElement);
    window.addEventListener('resize', sync);
    sync();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [detached]);

  const nativeStyle = nativeMetrics ? {
    '--mac-window-controls-group-width': `${nativeMetrics.groupWidth}px`,
    '--mac-window-control-size': `${nativeMetrics.buttonHeight}px`,
  } as CSSProperties : undefined;

  return (
    <header
      className={`window-chrome ${detached ? 'is-detached' : ''}`.trim()}
      data-testid="window-chrome"
      data-tauri-drag-region
      style={nativeStyle}
    >
      <span
        ref={nativeAnchorRef}
        className="mac-window-controls-anchor"
        data-testid="mac-window-controls-anchor"
        data-layout="appkit-anchor"
        aria-hidden="true"
      />
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
