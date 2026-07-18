import { describe, expect, it } from 'vitest';
import { DEMO_CASE_ID } from '../case/case-scope';
import { createDemoFileOpsPlan, executeDemoPlan } from './file-ops-demo';

describe('file-ops demo runtime case boundary', () => {
  it('rejects a non-demo caseId before reading or executing demo file state', async () => {
    expect(() => createDemoFileOpsPlan('case-real')).toThrow(/demo/i);

    const plan = createDemoFileOpsPlan(DEMO_CASE_ID);
    await expect(executeDemoPlan({ ...plan, caseId: 'case-real' })).rejects.toThrow(/demo/i);
  });
});
