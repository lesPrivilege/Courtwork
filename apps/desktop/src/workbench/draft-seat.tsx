import { DraftPanel, type DraftDocument } from './Panels';

/**
 * 起草面席位（GENERIC-SCENARIOS-1 收尾段「过手即拆」外提自 `App.tsx`）。
 *
 * 声明式 Scenes 的起草交付席位。只承载 generic/垂类 artifact 的显式 handoff，
 * 与 Pi Work 的 workspace/journal 分立。
 */
export function DraftSeat({
  draft,
  onDraftChange,
  frozen,
  onCompile,
  onOpenDocx,
}: {
  draft: DraftDocument;
  onDraftChange: (value: DraftDocument) => void;
  frozen: boolean;
  onCompile: () => void;
  onOpenDocx?: () => void;
}) {
  return (
    <DraftPanel
      value={draft}
      onChange={onDraftChange}
      frozen={frozen}
      onCompile={onCompile}
      {...(onOpenDocx ? { onOpenDocx } : {})}
    />
  );
}
