import { describe, expect, it } from 'vitest';
import * as pmRoot from '@courtwork/pm';
import {
  PM_PACKAGE,
  PM_PACKAGE_BINDINGS,
  PM_PACKAGE_DESCRIPTOR,
} from '@courtwork/pm/package';
import {
  ActionItemsSchema,
  FeedbackDigestSchema,
  PrdReviewSchema,
  PriorityScoreSchema,
} from '@courtwork/pm/schemas';

describe('@courtwork/pm public export surfaces', () => {
  it('root and /package share one descriptor and bindings identity', () => {
    expect(pmRoot.PM_PACKAGE).toBe(PM_PACKAGE);
    expect(pmRoot.PM_PACKAGE_DESCRIPTOR).toBe(PM_PACKAGE_DESCRIPTOR);
    expect(pmRoot.PM_PACKAGE_BINDINGS).toBe(PM_PACKAGE_BINDINGS);
  });

  it('/schemas exposes all four catalog schema identities without a parallel registry', () => {
    expect(PM_PACKAGE.bindings.schemas.get('pm.FeedbackDigest')).toBe(FeedbackDigestSchema);
    expect(PM_PACKAGE.bindings.schemas.get('pm.PrdReview')).toBe(PrdReviewSchema);
    expect(PM_PACKAGE.bindings.schemas.get('pm.PriorityScore')).toBe(PriorityScoreSchema);
    expect(PM_PACKAGE.bindings.schemas.get('pm.ActionItems')).toBe(ActionItemsSchema);
  });
});
