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
