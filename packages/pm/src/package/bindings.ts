import type { VerticalPackageBindings } from '@courtwork/registry';
import type { ZodType } from 'zod';
import { ActionItemsSchema } from '../schemas/action-items.js';
import { FeedbackDigestSchema } from '../schemas/feedback-digest.js';
import { PrdReviewSchema } from '../schemas/prd-review.js';
import { PriorityScoreSchema } from '../schemas/priority-score.js';

export const PM_PACKAGE_BINDINGS: VerticalPackageBindings = {
  schemas: new Map<string, ZodType>([
    ['pm.FeedbackDigest', FeedbackDigestSchema],
    ['pm.PrdReview', PrdReviewSchema],
    ['pm.PriorityScore', PriorityScoreSchema],
    ['pm.ActionItems', ActionItemsSchema],
  ]),
};
