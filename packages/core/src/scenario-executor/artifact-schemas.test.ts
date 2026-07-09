import { describe, expect, it } from 'vitest';
import { ARTIFACT_SCHEMAS } from './artifact-schemas.js';

describe('ARTIFACT_SCHEMAS', () => {
  it('has an entry for all six ArtifactType values', () => {
    expect(Object.keys(ARTIFACT_SCHEMAS).sort()).toEqual(
      ['CaseFile', 'PartyGraph', 'ReviewMatrix', 'RevisionInstructionSet', 'RiskList', 'Timeline'].sort(),
    );
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
