import { describe, expect, it } from 'vitest';
import {
  admitPackages,
  type ArtifactDescriptorDataV1,
  type VerticalPackageManifest,
} from '@courtwork/registry';
import {
  PM_PACKAGE,
  PM_PACKAGE_BINDINGS,
  PM_PACKAGE_DESCRIPTOR,
} from './manifest.js';

const anchor = (fileId: string, quote: string) => ({
  fileId,
  textRange: { start: 0, end: quote.length },
  quote,
});

const FIXTURES: Record<string, unknown> = {
  'pm.FeedbackDigest': {
    projectId: 'p-1',
    clusters: [
      {
        id: 'cluster-1',
        name: '离线推送延迟',
        memberIds: ['feedback-1'],
        evidence: [anchor('feedback.csv', '推送很慢')],
      },
    ],
    items: [
      {
        id: 'feedback-1',
        quote: '推送很慢',
        sourceAnchors: [anchor('feedback.csv', '推送很慢')],
        channel: 'support-ticket',
        clusterId: 'cluster-1',
        rootCause: '离线通道延迟',
        volume: 12,
        severity: 'high',
        status: 'triaged',
      },
    ],
  },
  'pm.PrdReview': {
    projectId: 'p-1',
    documentId: 'prd.md',
    findings: [
      {
        id: 'finding-1',
        section: '3.2',
        clause: '及时送达消息',
        sourceAnchors: [anchor('prd.md', '及时送达消息')],
        defectType: 'vague-metric',
        severity: 'mid',
        issue: '及时没有量化口径',
        suggestion: '补充 P95 时延',
        status: 'pending',
      },
    ],
  },
  'pm.PriorityScore': {
    projectId: 'p-1',
    formula: 'RICE',
    formulaVersion: 'rice-v1',
    rows: [
      {
        id: 'priority-1',
        item: '离线推送修复',
        requirementRef: 'req-1',
        params: {
          reach: { fill: 'auto', value: 1200, range: null, sourceAnchors: [anchor('metrics.csv', '1200')], status: 'filled' },
          impact: { fill: 'auto', value: 2, range: null, sourceAnchors: [anchor('research.md', '影响高')], status: 'filled' },
          confidence: { fill: 'manual', value: 0.8, range: null, sourceAnchors: [anchor('review.md', '置信度 0.8')], status: 'filled' },
          effort: { fill: 'manual', value: 3, range: null, sourceAnchors: [anchor('estimate.md', '3 人周')], status: 'filled' },
        },
        score: 640,
        rank: 1,
        band: 'P0',
      },
    ],
  },
  'pm.ActionItems': {
    projectId: 'p-1',
    items: [
      {
        id: 'action-1',
        action: '补充推送时延口径',
        owner: '产品负责人',
        due: '2026-07-20',
        sourceAnchors: [anchor('minutes.md', '产品负责人补充口径')],
        markers: ['unclosed'],
        carryOvers: [],
        status: 'open',
      },
    ],
  },
};

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

function clonePackage(): VerticalPackageManifest {
  return {
    ...(structuredClone(PM_PACKAGE_DESCRIPTOR) as typeof PM_PACKAGE_DESCRIPTOR),
    bindings: PM_PACKAGE_BINDINGS,
  };
}

function presentationOf(typeId: string): NonNullable<ArtifactDescriptorDataV1['presentation']> {
  const artifact = PM_PACKAGE_DESCRIPTOR.artifacts.find((candidate) => candidate.typeId === typeId);
  if (artifact?.presentation === undefined) throw new Error(`${typeId} missing presentation`);
  return artifact.presentation;
}

describe('PM_PACKAGE（ABI-2B catalog-only 第二垂类包）', () => {
  const result = admitPackages([PM_PACKAGE]);

  it('identity、四 schema bindings 与 catalog-only 边界固定', () => {
    expect(PM_PACKAGE_DESCRIPTOR.identity).toEqual({ packageId: 'pm', version: '0.1.1', schemaVersion: 1 });
    expect([...PM_PACKAGE_BINDINGS.schemas.keys()]).toEqual([
      'pm.FeedbackDigest',
      'pm.PrdReview',
      'pm.PriorityScore',
      'pm.ActionItems',
    ]);
    expect(PM_PACKAGE_DESCRIPTOR.scenarios).toEqual([]);
    expect(PM_PACKAGE_DESCRIPTOR.promptSegments).toEqual([]);
    expect(PM_PACKAGE_DESCRIPTOR.interactionTemplates).toBeUndefined();
  });

  it('同一 Package ABI 准入，descriptor 纯 JSON 且 renderer 声明闭合', () => {
    expect(result.rejected).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.admitted).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(PM_PACKAGE_DESCRIPTOR))).toEqual(PM_PACKAGE_DESCRIPTOR);
    expect(PM_PACKAGE_DESCRIPTOR.artifacts.every((artifact) => artifact.uiTemplateId === 'courtwork.artifact-table.v1')).toBe(true);
  });

  it('golden：collection 从 artifact 根、field 从 item 根命中，枚举显示只取同 field valueLabels', () => {
    for (const artifact of PM_PACKAGE_DESCRIPTOR.artifacts) {
      const fixture = FIXTURES[artifact.typeId];
      const schema = PM_PACKAGE_BINDINGS.schemas.get(artifact.schemaId);
      expect(schema?.safeParse(fixture).success, artifact.typeId).toBe(true);

      const presentation = artifact.presentation!;
      const collection = resolvePointer(fixture, presentation.collectionPointer!);
      expect(Array.isArray(collection), `${artifact.typeId} collection`).toBe(true);
      const item = (collection as unknown[])[0];

      for (const field of presentation.fields) {
        const raw = resolvePointer(item, field.pointer);
        expect(raw, `${artifact.typeId}${field.pointer}`).not.toBeUndefined();
        if (['enum', 'status', 'grade'].includes(field.format)) {
          const display = field.valueLabels?.[String(raw)];
          expect(display, `${artifact.typeId}${field.pointer}:${String(raw)}`).toBeTruthy();
          expect(display).not.toBe(String(raw));
        }
        if (field.format === 'tags') {
          for (const value of raw as unknown[]) {
            const display = field.valueLabels?.[String(value)];
            expect(display, `${artifact.typeId}${field.pointer}:${String(value)}`).toBeTruthy();
            expect(display).not.toBe(String(value));
          }
        }
      }
    }
  });

  it('四类证据锚全部进入 presentation', () => {
    expect(presentationOf('pm.FeedbackDigest').fields.some((field) => field.pointer === '/sourceAnchors' && field.format === 'anchor')).toBe(true);
    expect(presentationOf('pm.PrdReview').fields.some((field) => field.pointer === '/sourceAnchors' && field.format === 'anchor')).toBe(true);
    expect(presentationOf('pm.ActionItems').fields.some((field) => field.pointer === '/sourceAnchors' && field.format === 'anchor')).toBe(true);
    expect(
      presentationOf('pm.PriorityScore').fields
        .filter((field) => field.format === 'anchor')
        .map((field) => field.pointer),
    ).toEqual([
      '/params/reach/sourceAnchors',
      '/params/impact/sourceAnchors',
      '/params/confidence/sourceAnchors',
      '/params/effort/sourceAnchors',
    ]);
  });

  it('PriorityScore 参数以完整 envelope 投影，score 以同一 estimate 格式覆盖单值与区间', () => {
    const estimateFields = presentationOf('pm.PriorityScore').fields
      .filter((field) => String(field.format) === 'estimate')
      .map((field) => ({ pointer: field.pointer, valueLabels: field.valueLabels }));

    expect(estimateFields).toEqual([
      { pointer: '/params/reach', valueLabels: { filled: '已填充', out_of_coverage: '未覆盖·需补材料' } },
      { pointer: '/params/impact', valueLabels: { filled: '已填充', out_of_coverage: '未覆盖·需补材料' } },
      { pointer: '/params/confidence', valueLabels: { filled: '已填充', out_of_coverage: '未覆盖·需补材料' } },
      { pointer: '/params/effort', valueLabels: { filled: '已填充', out_of_coverage: '未覆盖·需补材料' } },
      { pointer: '/score', valueLabels: undefined },
    ]);
  });

  it('漏一枚 valueLabels 或 pointer 漂移时 PM 整包拒载', () => {
    const missingLabel = clonePackage();
    const channel = missingLabel.artifacts[0]!.presentation!.fields.find((field) => field.pointer === '/channel')!;
    delete channel.valueLabels!['community'];
    expect(admitPackages([missingLabel]).rejected[0]!.issues.join()).toContain('community');

    const drifted = clonePackage();
    drifted.artifacts[1]!.presentation!.fields[0]!.pointer = '/missing';
    expect(admitPackages([drifted]).rejected[0]!.issues.join()).toMatch(/pointer|命中/);
  });

  it('坏 PM 包逐包隔离，不污染后到合法包', () => {
    const badPm = clonePackage();
    badPm.artifacts[0]!.presentation!.collectionPointer = '/missing';
    const legalCatalog: VerticalPackageManifest = {
      abiVersion: 1,
      identity: { packageId: 'legal', version: '0.1.0', schemaVersion: 1 },
      artifacts: [],
      scenarios: [],
      promptSegments: [],
      renderers: [],
      vocabulary: { 'container.noun': '卷宗', 'stage.noun': '阶段', 'material.noun': '材料' },
      bindings: { schemas: new Map() },
    };

    const mixed = admitPackages([badPm, legalCatalog]);

    expect(mixed.rejected.map((entry) => entry.packageId)).toEqual(['pm']);
    expect(mixed.admitted.map((manifest) => manifest.identity.packageId)).toEqual(['legal']);
  });

  it('非法 estimate pointer 只拒载 PM，不污染同批 Legal catalog', () => {
    const badPm = clonePackage();
    const score = badPm.artifacts[2]!.presentation!.fields.find((field) => field.pointer === '/score')!;
    score.pointer = '/id';
    (score as unknown as { format: string }).format = 'estimate';
    const legalCatalog: VerticalPackageManifest = {
      abiVersion: 1,
      identity: { packageId: 'legal', version: '0.1.0', schemaVersion: 1 },
      artifacts: [],
      scenarios: [],
      promptSegments: [],
      renderers: [],
      vocabulary: { 'container.noun': '卷宗', 'stage.noun': '阶段', 'material.noun': '材料' },
      bindings: { schemas: new Map() },
    };

    const mixed = admitPackages([badPm, legalCatalog]);
    expect(mixed.rejected.map((entry) => entry.packageId)).toEqual(['pm']);
    expect(mixed.admitted.map((manifest) => manifest.identity.packageId)).toEqual(['legal']);
    expect(mixed.rejected[0]!.issues.join()).toContain('estimate');
  });
});
