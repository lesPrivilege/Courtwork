import { useEffect, useRef } from 'react';

import { ChatMarkdown } from '../chat/ChatMarkdown';
import { PI_COPY } from './pi-copy';
import type { PiLaneFailure, PiWorkspaceMarkdown } from './pi-lane-port';

/**
 * `PI-LANE-UI-1` · 工作稿的**只读**查看面。
 *
 * ADR-022 六-D 的边界逐条落在这里：正文只经 desktop 既有 `ChatMarkdown` 安全 renderer
 * （raw HTML 不执行）；只读、可关闭；**没有**编辑、保存、改名、删除、diff、晋升或任何
 * filesystem 动作；正文不写回账本、不进任何持久面。
 *
 * 两条如实显示：
 * - 打开的是**当刻**内容。当前 hash 与已确认 hash 不同即明说，不拿当前内容冒充历史成功版本。
 * - `not_found` 就是没有了。缓存里的索引救不回一份不在盘上的文件。
 */
export interface PiViewerState {
  readonly logicalPath: string;
  /** 从哪一段打开的。历史段与当前段共用同一条只读通道。 */
  readonly sessionId: string;
  /** 已落账的 hash；`undefined` 表示这次是核验一枚未确认的写入。 */
  readonly recordedSha256?: string;
  readonly loading: boolean;
  readonly view?: PiWorkspaceMarkdown;
  readonly failure?: PiLaneFailure;
  /** 核验入口打开的（uncertain）：一律标未确认，核验结果不补写成成功。 */
  readonly verify: boolean;
}

export function PiDraftViewer({
  state,
  onClose,
}: {
  state: PiViewerState;
  onClose(): void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    closeRef.current?.focus();
  }, [state.logicalPath, state.sessionId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const differs =
    state.view !== undefined &&
    state.recordedSha256 !== undefined &&
    state.view.contentSha256 !== state.recordedSha256;

  return (
    <aside
      className="pi-viewer"
      data-testid="pi-viewer"
      role="dialog"
      aria-modal="false"
      aria-label={`${PI_COPY.openDraft} ${state.logicalPath}`}
      data-verify={state.verify ? 'true' : 'false'}
    >
      <header className="pi-viewer-head">
        <div className="pi-viewer-ident">
          <span className="pi-viewer-path">{state.logicalPath}</span>
          <span className="pi-viewer-note">{PI_COPY.viewerReadOnly}</span>
        </div>
        <button
          type="button"
          ref={closeRef}
          className="pi-button pi-button-quiet"
          data-testid="pi-viewer-close"
          onClick={onClose}
        >
          {PI_COPY.closeViewer}
        </button>
      </header>

      {state.verify && (
        <p className="pi-viewer-flag" data-testid="pi-viewer-unverified">
          {PI_COPY.unverified}
        </p>
      )}
      {differs && (
        <p className="pi-viewer-flag pi-viewer-alert" data-testid="pi-viewer-hash-differs">
          {PI_COPY.hashDiffers}
        </p>
      )}

      {state.loading && <p className="pi-viewer-note">{PI_COPY.viewerLoading}</p>}

      {state.failure && (
        <p className="pi-viewer-flag pi-viewer-alert" data-testid="pi-viewer-failure">
          {state.failure.message}
        </p>
      )}

      {state.view && (
        <div className="pi-viewer-body" data-testid="pi-viewer-body">
          <details className="pi-viewer-details" data-testid="pi-viewer-details">
            <summary>{PI_COPY.viewerDetails}</summary>
            <dl className="pi-viewer-meta">
              <div>
                <dt>{PI_COPY.bytesLabel}</dt>
                <dd className="pi-mono">{state.view.byteLength}</dd>
              </div>
              <div>
                <dt>{PI_COPY.hashLabel}</dt>
                <dd className="pi-mono">{state.view.contentSha256}</dd>
              </div>
            </dl>
          </details>
          <ChatMarkdown text={state.view.content} />
        </div>
      )}
    </aside>
  );
}
