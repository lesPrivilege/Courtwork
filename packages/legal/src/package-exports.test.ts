import { describe, expect, it } from 'vitest';
import * as legalRoot from '@courtwork/legal';
import {
  LEGAL_PACKAGE,
  LEGAL_PACKAGE_BINDINGS,
  LEGAL_PACKAGE_DESCRIPTOR,
} from '@courtwork/legal/package';
import { RiskListDraftSchema, RiskListSchema } from '@courtwork/legal/schemas';
import {
  S3_PDF_DOSSIER_DRAFT,
  S3_RISK_LIST_DRAFT,
  S3_RISK_LIST_RESPONSE,
} from '@courtwork/legal/testing';

describe('@courtwork/legal public export surfaces', () => {
  it('root remains browser-safe and does not resell testing fixtures', () => {
    expect(legalRoot.LEGAL_PACKAGE).toBe(LEGAL_PACKAGE);
    expect(legalRoot.RiskListSchema).toBe(RiskListSchema);
    expect('S3_RISK_LIST_RESPONSE' in legalRoot).toBe(false);
    expect('S3_RISK_LIST_DRAFT' in legalRoot).toBe(false);
    expect('S3_PDF_DOSSIER_DRAFT' in legalRoot).toBe(false);
  });

  it('/package and /schemas expose the same stable descriptor, bindings and schema identities', () => {
    expect(LEGAL_PACKAGE_DESCRIPTOR).toBe(legalRoot.LEGAL_PACKAGE_DESCRIPTOR);
    expect(LEGAL_PACKAGE_BINDINGS).toBe(legalRoot.LEGAL_PACKAGE_BINDINGS);
    expect(LEGAL_PACKAGE.bindings).toBe(LEGAL_PACKAGE_BINDINGS);
    expect(LEGAL_PACKAGE.bindings.schemas.get('legal.RiskList')).toBe(RiskListSchema);
    expect(LEGAL_PACKAGE.bindings.schemas.get('legal.RiskListDraft')).toBe(RiskListDraftSchema);
  });

  it('/testing is the only explicit fixture surface and preserves all three payloads', () => {
    expect(RiskListSchema.parse(S3_RISK_LIST_RESPONSE)).toStrictEqual(S3_RISK_LIST_RESPONSE);
    expect(RiskListDraftSchema.parse(S3_RISK_LIST_DRAFT)).toStrictEqual(S3_RISK_LIST_DRAFT);
    expect(RiskListDraftSchema.parse(S3_PDF_DOSSIER_DRAFT)).toStrictEqual(S3_PDF_DOSSIER_DRAFT);
  });
});
