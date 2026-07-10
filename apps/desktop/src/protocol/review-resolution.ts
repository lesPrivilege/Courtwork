import type { ReviewDispositionState, ReviewGateItemProjection, ReviewResolution } from './client';

const DISPOSITION_TO_PROTOCOL = {
  confirmed: 'confirm',
  rejected: 'reject',
  revision: 'revise',
} as const;

/**
 * 批量只是界面手势；返回核心时仍按门禁投影的稳定 itemRef 逐条带回处置。
 */
export function buildReviewResolution(
  items: ReviewGateItemProjection[],
  dispositions: Record<string, ReviewDispositionState>,
  instrumentation?: ReviewResolution['instrumentation'],
): ReviewResolution {
  return {
    items: items.map((item) => {
      const disposition = dispositions[item.itemRef];
      if (!disposition) throw new Error(`风险条目 ${item.itemRef} 尚未处置`);
      return { itemRef: item.itemRef, disposition: DISPOSITION_TO_PROTOCOL[disposition] };
    }),
    ...(instrumentation ? { instrumentation } : {}),
  };
}
