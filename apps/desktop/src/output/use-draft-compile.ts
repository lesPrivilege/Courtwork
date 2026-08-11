import { useState } from 'react';
import type { CaseBinding } from '../case/case-scope';
import { compileDraftToCaseOutput } from './draft-compile';

/**
 * 起草画布的定稿确认编排（GENERIC-SCENARIOS-1 收尾段「过手即拆」外提自 `App.tsx`）。
 *
 * 本票改了这条链的两端（中性产物名、原子 no-replace 落盘，见 `draft-compile.ts`），故按纪律
 * 把它在壳里剩下的那点状态一并搬出：确认弹层开关、写入在途标记、以及「写成才置存在性」的
 * 编排。语义逐字不变——未绑定案件文件夹不起跑、在途不重入、失败只报不置位。
 */
export function useDraftCompile(input: {
  binding: CaseBinding;
  draft: { title: string; paragraphs: readonly string[] };
  /** 写成与否的落点（产出目录存在性是定稿冻结的真源）。 */
  onWritten: (written: boolean) => void;
  onFeedback: (message: string, ok: boolean) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return {
    dialogOpen,
    pending,
    open: () => setDialogOpen(true),
    close: () => setDialogOpen(false),
    /** 切案即作废：弹层与在途标记一并归零（在途的那次落盘由其自身 finally 收尾）。 */
    reset: () => { setDialogOpen(false); setPending(false); },
    confirm: () => {
      if (input.binding.kind === 'unbound' || pending) return;
      setPending(true);
      void compileDraftToCaseOutput({ binding: input.binding, draft: input.draft }).then((outcome) => {
        input.onWritten(outcome.status === 'written');
        if (outcome.status === 'written') {
          setDialogOpen(false);
          input.onFeedback(`已写入本案「产出」目录：${outcome.fileName}`, true);
        } else {
          input.onFeedback(outcome.message, false);
        }
      }).finally(() => setPending(false));
    },
  };
}
