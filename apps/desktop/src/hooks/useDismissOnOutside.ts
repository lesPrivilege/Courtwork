import { useEffect, type RefObject } from 'react';

/**
 * popover 收敛纪律(GOAL-1/#31 同族):点击容器外或 Esc 即收敛。
 * 容器 ref 含触发钮时,触发钮自身的 toggle 不受影响(pointerdown 在容器内)。
 */
export function useDismissOnOutside(
  open: boolean,
  onDismiss: () => void,
  ref: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      onDismiss();
      // 防穿透(UI-RESIDUE-1):吞掉本次外点手势尾随的 click,避免收敛的同一次 pointer
      // 继续激活底层可交互控件(WorkBuddy Settings→search 反例)。捕获阶段抢在 React
      // 根委托之前 stop+prevent;首个 click 后自摘,无 click 的手势(拖拽/右键)由兜底撤除。
      const swallowClick = (click: Event) => {
        click.stopPropagation();
        click.preventDefault();
        document.removeEventListener('click', swallowClick, true);
      };
      document.addEventListener('click', swallowClick, true);
      window.setTimeout(() => document.removeEventListener('click', swallowClick, true), 0);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onDismiss, ref]);
}
