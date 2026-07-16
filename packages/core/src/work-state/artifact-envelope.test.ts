import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import {
  createArtifactEnvelopeCodec,
  UnregisteredArtifactTypeError,
  type ArtifactEnvelope,
  type ArtifactVersioningSource,
} from './artifact-envelope.js';

const RiskSchema = z.object({ caseId: z.string().min(1), risks: z.array(z.unknown()) });

function source(overrides: Partial<{ packageId: string; schemaVersion: number }> = {}): ArtifactVersioningSource {
  const packageId = overrides.packageId ?? 'legal';
  const schemaVersion = overrides.schemaVersion ?? 1;
  return {
    resolve(typeId) {
      if (typeId !== 'legal.RiskList') return undefined;
      return {
        packageId,
        schemaVersion,
        validate(payload) {
          const parsed = RiskSchema.safeParse(payload);
          return parsed.success ? { ok: true, value: parsed.data } : { ok: false, issues: parsed.error.message };
        },
      };
    },
  };
}

describe('ArtifactEnvelope codec（ADR-010 决定三）', () => {
  it('encode 把 artifactType+artifact 封为版本信封（payload 是唯一真源）', () => {
    const codec = createArtifactEnvelopeCodec(source());
    const env = codec.encode('legal.RiskList', { caseId: 'c1', risks: [] });
    expect(env).toEqual({ packageId: 'legal', typeId: 'legal.RiskList', schemaVersion: 1, payload: { caseId: 'c1', risks: [] } });
  });

  it('encode 未登记类型 → 抛（装配缺漏，绝不静默）', () => {
    const codec = createArtifactEnvelopeCodec(source());
    expect(() => codec.encode('legal.Unknown', {})).toThrow(UnregisteredArtifactTypeError);
  });

  it('合法信封 round-trip 回迁移后的 artifact', () => {
    const codec = createArtifactEnvelopeCodec(source());
    const env = codec.encode('legal.RiskList', { caseId: 'c1', risks: [1, 2] });
    expect(codec.decode(env)).toEqual({ status: 'ready', typeId: 'legal.RiskList', artifact: { caseId: 'c1', risks: [1, 2] } });
  });

  it('未知 schemaVersion → 隔离 fail-closed（v1 无迁移阶梯，禁 raw fallback）', () => {
    const codec = createArtifactEnvelopeCodec(source({ schemaVersion: 1 }));
    const future: ArtifactEnvelope = {
      packageId: 'legal',
      typeId: 'legal.RiskList',
      schemaVersion: 2,
      payload: { caseId: 'c1', risks: [] },
    };
    const out = codec.decode(future);
    expect(out.status).toBe('isolated');
    if (out.status === 'isolated') expect(out.reason).toBe('unknown_version');
  });

  it('未登记 typeId → 隔离 unknown_type', () => {
    const codec = createArtifactEnvelopeCodec(source());
    const out = codec.decode({ packageId: 'legal', typeId: 'legal.Ghost', schemaVersion: 1, payload: {} });
    expect(out.status).toBe('isolated');
    if (out.status === 'isolated') expect(out.reason).toBe('unknown_type');
  });

  it('packageId 不符 → 隔离 package_mismatch', () => {
    const codec = createArtifactEnvelopeCodec(source({ packageId: 'legal' }));
    const out = codec.decode({ packageId: 'pm', typeId: 'legal.RiskList', schemaVersion: 1, payload: { caseId: 'c1', risks: [] } });
    expect(out.status).toBe('isolated');
    if (out.status === 'isolated') expect(out.reason).toBe('package_mismatch');
  });

  it('迁移后 payload 不过当前 schema → 隔离 schema_mismatch（不 raw fallback）', () => {
    const codec = createArtifactEnvelopeCodec(source());
    const out = codec.decode({ packageId: 'legal', typeId: 'legal.RiskList', schemaVersion: 1, payload: { caseId: '', risks: 'not-array' } });
    expect(out.status).toBe('isolated');
    if (out.status === 'isolated') expect(out.reason).toBe('schema_mismatch');
  });

  it('信封结构本身畸形 → 隔离 malformed', () => {
    const codec = createArtifactEnvelopeCodec(source());
    const out = codec.decode({ packageId: 'legal', typeId: '', schemaVersion: Number.NaN, payload: undefined } as unknown as ArtifactEnvelope);
    expect(out.status).toBe('isolated');
    if (out.status === 'isolated') expect(out.reason).toBe('malformed');
  });
});
