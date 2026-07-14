import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import type { VerticalPackageBindings, VerticalPackageDescriptorV1 } from './package-manifest.js';
import {
  assertNoRemoteSchemaRefs,
  exportPackageJsonSchemas,
  packageSchemaUrn,
} from './schema-export.js';

const descriptor: VerticalPackageDescriptorV1 = {
  abiVersion: 1,
  identity: { packageId: 'legal', version: '0.1.0', schemaVersion: 3 },
  artifacts: [
    {
      typeId: 'legal.RiskList',
      title: '风险清单',
      schemaId: 'legal.RiskList',
      draftSchemaId: 'legal.RiskListDraft',
      rehydrationProjection: { ops: [], rowBudget: 1 },
      uiTemplateId: 'risk-review-panel',
    },
  ],
  scenarios: [],
  promptSegments: [],
  renderers: [],
  vocabulary: {},
};

const bindings: VerticalPackageBindings = {
  schemas: new Map<string, z.ZodType>([
    ['legal.RiskList', z.object({ risks: z.array(z.string()) })],
    ['legal.RiskListDraft', z.object({ risks: z.array(z.string()), draft: z.literal(true) })],
  ]),
};

describe('package JSON Schema export（ABI-2A）', () => {
  it('逻辑 schema id + schemaVersion 确定生成绝对 URN，版本变化必改 id', () => {
    expect(packageSchemaUrn('legal.RiskList', 3)).toBe('urn:courtwork:schema:legal.RiskList:v3');
    expect(packageSchemaUrn('legal.RiskList', 4)).toBe('urn:courtwork:schema:legal.RiskList:v4');
  });

  it('final/draft 分别导出 Draft 2020-12 自包含文档', () => {
    const exported = exportPackageJsonSchemas(descriptor, bindings);

    expect([...exported.keys()]).toEqual(['legal.RiskList', 'legal.RiskListDraft']);
    expect(exported.get('legal.RiskList')).toMatchObject({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'urn:courtwork:schema:legal.RiskList:v3',
    });
    expect(exported.get('legal.RiskListDraft')).toMatchObject({
      $id: 'urn:courtwork:schema:legal.RiskListDraft:v3',
    });
    for (const document of exported.values()) expect(() => assertNoRemoteSchemaRefs(document)).not.toThrow();
  });

  it('任何非 fragment $ref 都 fail closed，禁止网络或外部文件解析', () => {
    expect(() => assertNoRemoteSchemaRefs({ $ref: '#/$defs/Local' })).not.toThrow();
    expect(() => assertNoRemoteSchemaRefs({ $defs: { bad: { $ref: 'https://evil.example/schema' } } })).toThrow(
      /remote|外部/i,
    );
    expect(() => assertNoRemoteSchemaRefs({ $ref: './other.schema.json' })).toThrow(/remote|外部/i);
  });

  it('动态与递归引用同样只允许本地 fragment', () => {
    expect(() => assertNoRemoteSchemaRefs({ $dynamicRef: '#Local' })).not.toThrow();
    expect(() => assertNoRemoteSchemaRefs({ $dynamicRef: 'https://evil.example/schema' })).toThrow(/remote|外部/i);
    expect(() => assertNoRemoteSchemaRefs({ $recursiveRef: './other.schema.json' })).toThrow(/remote|外部/i);
  });
});
