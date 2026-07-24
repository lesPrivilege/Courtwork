import type { ReviewDispositionState, ReviewGateItemProjection, ReviewResolution } from './client';

const DISPOSITION_TO_PROTOCOL = {
  confirmed: 'confirm',
  rejected: 'reject',
} as const;

export interface BuildReviewResolutionOptions {
  originalDescriptions?: Readonly<Record<string, string>>;
  correctedDescriptions?: Readonly<Record<string, string>>;
  instrumentation?: ReviewResolution['instrumentation'];
}

function isBuildOptions(
  value: BuildReviewResolutionOptions | ReviewResolution['instrumentation'],
): value is BuildReviewResolutionOptions {
  return value !== undefined
    && ('originalDescriptions' in value || 'correctedDescriptions' in value || 'instrumentation' in value);
}

/**
 * 批量只是界面手势；返回核心时仍按门禁投影的稳定 itemRef 逐条带回处置。
 */
export function buildReviewResolution(
  items: ReviewGateItemProjection[],
  dispositions: Record<string, ReviewDispositionState>,
  optionsOrInstrumentation: BuildReviewResolutionOptions | ReviewResolution['instrumentation'] = {},
): ReviewResolution {
  const options = isBuildOptions(optionsOrInstrumentation)
    ? optionsOrInstrumentation
    : { instrumentation: optionsOrInstrumentation };
  return {
    items: items.map((item) => {
      const disposition = dispositions[item.itemRef];
      if (!disposition) throw new Error(`风险条目 ${item.itemRef} 尚未处置`);
      if (disposition !== 'revision') {
        return { itemRef: item.itemRef, disposition: DISPOSITION_TO_PROTOCOL[disposition] };
      }
      const submitted = options.correctedDescriptions?.[item.itemRef];
      if (submitted === undefined) throw new Error(`风险条目 ${item.itemRef} 的修正尚未提交`);
      const correctedDescription = submitted.trim();
      if (!correctedDescription) throw new Error(`风险条目 ${item.itemRef} 的修正结论不能为空`);
      const originalDescription = options.originalDescriptions?.[item.itemRef]?.trim();
      if (originalDescription === undefined) throw new Error(`风险条目 ${item.itemRef} 缺少原结论`);
      if (correctedDescription === originalDescription) {
        throw new Error(`风险条目 ${item.itemRef} 的修正结论必须不同于原结论`);
      }
      return { itemRef: item.itemRef, disposition: 'revise', correctedDescription };
    }),
    ...(options.instrumentation ? { instrumentation: options.instrumentation } : {}),
  };
}
