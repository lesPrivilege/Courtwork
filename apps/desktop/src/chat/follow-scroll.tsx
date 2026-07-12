import { useCallback, useEffect, useRef, useState } from 'react';
import type { UIEvent } from 'react';
import { Icon } from '../workbench/Icon';

/** 距底不超过此值视为"钉在底部"——流式增高时保持跟随（frontier 惯例）。 */
const PIN_THRESHOLD_PX = 48;

export interface FollowScroll {
  ref: (element: HTMLDivElement | null) => void;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
  hasNew: boolean;
  jumpToLatest: () => void;
}

/**
 * 会话流跟随滚动（批次七首例登记缺陷）：
 * 钉底时新内容自动滚底；用户上翻即暂停跟随；暂停期间新内容置 hasNew 供浮标提示。
 * 信号源是 MutationObserver 而非消息条数——流式逐字增高与整条追加同治。
 */
export function useFollowScroll(): FollowScroll {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const pinnedRef = useRef(true);
  const [hasNew, setHasNew] = useState(false);

  const syncPinned = useCallback((element: HTMLDivElement) => {
    const pinned = element.scrollHeight - element.scrollTop - element.clientHeight <= PIN_THRESHOLD_PX;
    pinnedRef.current = pinned;
    if (pinned) setHasNew(false);
  }, []);

  const ref = useCallback((element: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    elementRef.current = element;
    if (!element) return;
    pinnedRef.current = true;
    const observer = new MutationObserver(() => {
      if (pinnedRef.current) {
        element.scrollTop = element.scrollHeight;
      } else if (element.scrollHeight > element.clientHeight) {
        setHasNew(true);
      }
    });
    observer.observe(element, { childList: true, subtree: true, characterData: true });
    observerRef.current = observer;
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    syncPinned(event.currentTarget);
  }, [syncPinned]);

  const jumpToLatest = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollTo({ top: element.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' });
    pinnedRef.current = true;
    setHasNew(false);
  }, []);

  return { ref, onScroll, hasNew, jumpToLatest };
}

/** 新消息浮标：sticky 零高槽位驻容器底缘，不占流式布局；无字圆钮（frontier 形制）。 */
export function ScrollToLatest({ follow }: { follow: FollowScroll }) {
  if (!follow.hasNew) return null;
  return (
    <div className="scroll-latest-slot">
      <button
        type="button"
        className="scroll-latest-button"
        data-testid="scroll-to-latest"
        aria-label="回到最新消息"
        title="回到最新消息"
        onClick={follow.jumpToLatest}
      >
        <Icon name="chevron-down" />
      </button>
    </div>
  );
}
