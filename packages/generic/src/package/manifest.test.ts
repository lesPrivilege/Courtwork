import { describe, expect, it } from 'vitest';
import { admitPackages, type VerticalPackageManifest } from '@courtwork/registry';
import { GENERIC_PACKAGE, GENERIC_PACKAGE_BINDINGS, GENERIC_PACKAGE_DESCRIPTOR } from './index.js';

/**
 * ADR-023 决定一：通用基线包按**同一 ABI** 成立——目录 `packages/generic`、npm
 * `@courtwork/generic`、`identity.packageId` 为 `generic` 三者一致；经同一 `admitPackages`
 * 准入、同一 descriptor/bindings 双平面、同一场景与 launch 声明契约进入宿主。
 *
 * 本谱只咬「基线包是不是一枚合规的包」；`baseline` 成熟度与并集语义是宿主发行事实，
 * 由 `apps/desktop/src/composition/**` 立谱。
 */

function clonePackage(): VerticalPackageManifest {
  return {
    ...(structuredClone(GENERIC_PACKAGE_DESCRIPTOR) as typeof GENERIC_PACKAGE_DESCRIPTOR),
    bindings: GENERIC_PACKAGE_BINDINGS,
  };
}

function resolvePointer(root: unknown, pointer: string): unknown {
  if (pointer === '') return root;
  return pointer
    .slice(1)
    .split('/')
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce<unknown>((value, segment) => {
      if (value === null || typeof value !== 'object') return undefined;
      return (value as Record<string, unknown>)[segment];
    }, root);
}

const FIXTURES: Record<string, unknown> = {
  'generic.DraftDocument': {
    title: '季度工作说明',
    paragraphs: ['第一段正文。', '第二段正文。'],
  },
  'generic.BatchReport': {
    items: [
      { materialId: 'mat-1', summary: '这份材料记述了三个待办事项。', status: 'summarized' },
      { materialId: 'mat-2', summary: '', status: 'missing' },
    ],
  },
};

describe('GENERIC_PACKAGE（ADR-023 通用基线包）', () => {
  const result = admitPackages([GENERIC_PACKAGE]);

  it('identity 三者一致、两 schema bindings、两场景两产物', () => {
    expect(GENERIC_PACKAGE_DESCRIPTOR.identity).toEqual({
      packageId: 'generic',
      version: '0.1.0',
      schemaVersion: 1,
    });
    expect([...GENERIC_PACKAGE_BINDINGS.schemas.keys()]).toEqual([
      'generic.DraftDocument',
      'generic.BatchReport',
    ]);
    expect(GENERIC_PACKAGE_DESCRIPTOR.scenarios.map((scenario) => scenario.id)).toEqual([
      'generic.draft',
      'generic.batch',
    ]);
    expect(GENERIC_PACKAGE_DESCRIPTOR.artifacts.map((artifact) => artifact.typeId)).toEqual([
      'generic.DraftDocument',
      'generic.BatchReport',
    ]);
  });

  it('同一 Package ABI 准入通过，descriptor 纯 JSON', () => {
    expect(result.rejected).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.admitted).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(GENERIC_PACKAGE_DESCRIPTOR))).toEqual(GENERIC_PACKAGE_DESCRIPTOR);
  });

  /** ADR-023 决定六：不新增 renderer 注册机制——两枚产物同走既有宿主通用产物表。 */
  it('两枚产物都走既有宿主 blueprint courtwork.artifact-table.v1（零新 renderer 机制）', () => {
    expect(GENERIC_PACKAGE_DESCRIPTOR.artifacts.every((a) => a.uiTemplateId === 'courtwork.artifact-table.v1')).toBe(true);
    expect(GENERIC_PACKAGE_DESCRIPTOR.renderers).toEqual([
      { uiTemplateId: 'courtwork.artifact-table.v1', kind: 'workspace', title: '通用产物表' },
    ]);
  });

  /** 票面裁定 B1：launch 元素集不扩员——① 一枚 text 必填，③ 无表单直启。 */
  it('场景① 携一枚必填 text 预检字段；场景③ 零表单（无预检直启）', () => {
    const draft = GENERIC_PACKAGE_DESCRIPTOR.scenarios.find((s) => s.id === 'generic.draft')!;
    expect(draft.launch?.kind).toBe('scenario');
    expect(draft.launch?.formFields).toEqual([
      {
        kind: 'text',
        id: 'requirement',
        label: '起草要求',
        required: true,
        placeholder: '例如：写一份三段的季度工作说明，交代进度、阻碍与下一步',
      },
    ]);

    const batch = GENERIC_PACKAGE_DESCRIPTOR.scenarios.find((s) => s.id === 'generic.batch')!;
    expect(batch.launch?.kind).toBe('scenario');
    expect(batch.launch?.formFields).toBeUndefined();
  });

  /** 票面 A3：`collectionPointer` 的首个生产消费者——数组 payload + 逐项状态。 */
  it('golden：collection 命中数组、field 从 item 根命中，状态枚举只取同 field valueLabels', () => {
    for (const artifact of GENERIC_PACKAGE_DESCRIPTOR.artifacts) {
      const fixture = FIXTURES[artifact.typeId];
      const schema = GENERIC_PACKAGE_BINDINGS.schemas.get(artifact.schemaId);
      expect(schema?.safeParse(fixture).success, artifact.typeId).toBe(true);

      const presentation = artifact.presentation!;
      const collection = resolvePointer(fixture, presentation.collectionPointer!);
      expect(Array.isArray(collection), `${artifact.typeId} collection`).toBe(true);

      for (const item of collection as unknown[]) {
        for (const field of presentation.fields) {
          const raw = resolvePointer(item, field.pointer);
          expect(raw, `${artifact.typeId}${field.pointer}`).not.toBeUndefined();
          if (['enum', 'status'].includes(field.format)) {
            const display = field.valueLabels?.[String(raw)];
            expect(display, `${artifact.typeId}${field.pointer}:${String(raw)}`).toBeTruthy();
            expect(display).not.toBe(String(raw));
          }
        }
      }
    }
  });

  it('漏一枚 status valueLabels 即整包拒载（禁 wire 值回落）', () => {
    const missingLabel = clonePackage();
    const report = missingLabel.artifacts.find((a) => a.typeId === 'generic.BatchReport')!;
    const status = report.presentation!.fields.find((field) => field.pointer === '/status')!;
    delete status.valueLabels!['missing'];
    expect(admitPackages([missingLabel]).rejected[0]!.issues.join()).toContain('missing');
  });

  it('collectionPointer 漂移到非数组即整包拒载', () => {
    const drifted = clonePackage();
    drifted.artifacts.find((a) => a.typeId === 'generic.BatchReport')!.presentation!.collectionPointer = '/missing';
    expect(admitPackages([drifted]).rejected[0]!.issues.join()).toContain('collectionPointer');
  });

  /** ADR-023 决定四：基线包不得引用任何垂类包——`generic.` 命名空间自足。 */
  it('产物、场景与 schema id 全部落 generic 命名空间（零垂类引用）', () => {
    const ids = [
      ...GENERIC_PACKAGE_DESCRIPTOR.artifacts.flatMap((a) => [a.typeId, a.schemaId]),
      ...GENERIC_PACKAGE_DESCRIPTOR.scenarios.flatMap((s) => [s.id, ...s.inputArtifacts, ...s.outputArtifacts]),
      ...GENERIC_PACKAGE_BINDINGS.schemas.keys(),
    ];
    expect(ids.every((id) => id.startsWith('generic.'))).toBe(true);
  });
});
