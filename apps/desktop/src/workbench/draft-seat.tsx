import { WorkDraftPanel } from '../system/WorkDraftPanel';
import { DraftPanel, type DraftDocument } from './Panels';

/**
 * 起草面席位（GENERIC-SCENARIOS-1 收尾段「过手即拆」外提自 `App.tsx`）。
 *
 * 通用 `draft` 工作面上并存两条轨，此件只做二选一的落座，逐字保留既有行为：
 *
 *  - **工作稿轨**（`WorkDraftPanel`）：pi 线的 Markdown 工作稿；用户从卷宗树显式进入，
 *    以及零垂类绑定 matter 的默认落座（GENERIC-PACK-1 ⑧ 的显式诚实呈现分支）。
 *  - **起草画布**（`DraftPanel`）：可编译为 Word 并定稿冻结的交付轨。
 *
 * 席位本身零判定：落哪条轨由壳算好后交进来（判据见 `App.tsx` 的 `draftSeatUsesWorkTrack`）。
 */
export function DraftSeat({
  workTrack,
  caseId,
  caseRoot,
  onFeedback,
  draft,
  onDraftChange,
  frozen,
  onCompile,
  onOpenDocx,
}: {
  /** true＝落工作稿轨；false＝落起草画布。 */
  workTrack: boolean;
  caseId: string;
  caseRoot: string;
  onFeedback: (message: string, ok: boolean) => void;
  draft: DraftDocument;
  onDraftChange: (value: DraftDocument) => void;
  frozen: boolean;
  onCompile: () => void;
  onOpenDocx?: () => void;
}) {
  if (workTrack) return <WorkDraftPanel caseId={caseId} caseRoot={caseRoot} onFeedback={onFeedback} />;
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
