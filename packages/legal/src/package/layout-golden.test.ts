import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { LEGAL_PACKAGE_DESCRIPTOR } from './index.js';
import {
  S3_PDF_DOSSIER_DRAFT,
  S3_RISK_LIST_DRAFT,
  S3_RISK_LIST_RESPONSE,
} from '../testing/index.js';

function sha256(value: unknown): string {
  const bytes = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(bytes).digest('hex');
}

function promptBlob(): string {
  return LEGAL_PACKAGE_DESCRIPTOR.promptSegments
    .map(({ id, body }) => `${id}\0${body}`)
    .join('\0\0');
}

describe('VPKG-LAYOUT-1 Legal content golden', () => {
  it('descriptor 保持纯 JSON 深等价、整面 hash 与 prompt blob 字节不漂移', () => {
    expect(structuredClone(LEGAL_PACKAGE_DESCRIPTOR)).toStrictEqual(LEGAL_PACKAGE_DESCRIPTOR);
    expect(sha256(LEGAL_PACKAGE_DESCRIPTOR)).toBe('6d0b6ea2a1144acc7307dac890314612d675968be0a4266b3b00a2f312efb7bf');
    expect(sha256(promptBlob())).toBe('41b8073be2f7d5b6e20a0d940ba300ce476046f642e21fecb2d14ad0de43618a');
  });

  it('三份 testing fixture 的序列化内容不漂移', () => {
    expect(sha256(S3_RISK_LIST_RESPONSE)).toBe('8cd77784331b51166c46012b51480290d5f942eee25ddfa825a9c142e8a36487');
    expect(sha256(S3_RISK_LIST_DRAFT)).toBe('e8713e923b136ce63f0d82015ee3e2fe268b0ba48d7e7efe3d6801b801a37a14');
    expect(sha256(S3_PDF_DOSSIER_DRAFT)).toBe('33f6b705d15965aa3ce8ccc405caf7928bf21023c962674c4d38466c1b83cb1b');
  });

  it('守卫自检：descriptor 与 prompt 任一变异都会改变 hash', () => {
    const descriptorDrift = structuredClone(LEGAL_PACKAGE_DESCRIPTOR);
    descriptorDrift.identity.version = '9.9.9';
    expect(sha256(descriptorDrift)).not.toBe(sha256(LEGAL_PACKAGE_DESCRIPTOR));
    expect(sha256(`${promptBlob()}\n额外提示`)).not.toBe(sha256(promptBlob()));
  });
});
