import { describe, expect, it } from 'vitest';
import { ArtifactTypeEnum } from '@courtwork/schemas';
import { ARTIFACT_SCHEMAS } from './artifact-schemas.js';

describe('ARTIFACT_SCHEMAS', () => {
  // F-4 验收补漏：改为从 ArtifactTypeEnum.options 派生。原断言写死六项字面量，
  // schemas 增补 FileOpsPlan 后既没更新 Record 也没更新本清单；派生后二者增删自动跟随，不再漂移。
  it('has an entry for every ArtifactType value (derived from enum, drift-proof)', () => {
    expect(Object.keys(ARTIFACT_SCHEMAS).sort()).toEqual([...ArtifactTypeEnum.options].sort());
  });

  it('CaseFile entry validates a well-formed CaseFile and rejects a malformed one', () => {
    expect(
      ARTIFACT_SCHEMAS.CaseFile.safeParse({ caseId: 'c1', files: [] }).success,
    ).toBe(true);
    expect(ARTIFACT_SCHEMAS.CaseFile.safeParse({ caseId: 'c1' }).success).toBe(false);
  });

  it('RiskList entry validates a well-formed RiskList and rejects a malformed one', () => {
    expect(ARTIFACT_SCHEMAS.RiskList.safeParse({ caseId: 'c1', risks: [] }).success).toBe(true);
    expect(ARTIFACT_SCHEMAS.RiskList.safeParse({ risks: [] }).success).toBe(false);
  });
});
