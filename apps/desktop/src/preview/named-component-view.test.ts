import { describe, expect, it } from 'vitest';
import type { ArtifactSchemaRegistryEntry, PackageRegistries } from '@courtwork/registry';
import { createDesktopPackageRuntime } from '../composition/package-runtime.js';
import { resolveNamedComponentView } from './named-component-view.js';

/** schema-valid 的最小矩阵：一题一行，answers 走 record 键。 */
const MATRIX: unknown = {
  caseId: 'demo-case',
  questions: [{ id: 'q1', text: '是否约定违约金比例' }],
  rows: [{
    documentId: 'V1-采购合同',
    answers: { q1: { answer: '3%', sourceAnchors: [], confidence: 'high' } },
  }],
};

const matrixOnly = (artifactType: string) => artifactType === 'legal.ReviewMatrix' ? MATRIX : undefined;
const nothing = () => undefined;

describe('具名工作面的 component blueprint 分发', () => {
  it('矩阵审阅由 descriptor 解析出可执行 renderer 与其 payload', () => {
    const runtime = createDesktopPackageRuntime();

    const resolved = resolveNamedComponentView(
      'matrix',
      matrixOnly,
      runtime.packageRegistries,
      runtime.hostRenderers,
    );

    expect(resolved.status).toBe('ready');
    if (resolved.status !== 'ready') throw new Error('unreachable');
    expect(resolved.title).toBe('矩阵审阅');
    expect(resolved.payload).toBe(MATRIX);
    expect(typeof resolved.component).toBe('function');
  });

  it('产出缺席时给出 descriptor 标题派生的显式空态——标题不在宿主侧另抄一份', () => {
    const runtime = createDesktopPackageRuntime();

    expect(resolveNamedComponentView('matrix', nothing, runtime.packageRegistries, runtime.hostRenderers))
      .toEqual({ status: 'empty', title: '矩阵审阅' });
  });

  it('仍是 route 的工作面不被具名分发接管', () => {
    const runtime = createDesktopPackageRuntime();

    for (const view of ['timeline', 'graph', 'revision', 'draft'] as const) {
      expect(resolveNamedComponentView(view, matrixOnly, runtime.packageRegistries, runtime.hostRenderers))
        .toEqual({ status: 'unregistered' });
    }
  });

  it('通用 artifact 页签自持多产出选择，不经具名分发', () => {
    const runtime = createDesktopPackageRuntime();

    expect(resolveNamedComponentView('artifact', () => ({}), runtime.packageRegistries, runtime.hostRenderers))
      .toEqual({ status: 'unregistered' });
  });

  it('同一具名工作面被两个 artifact 类型争夺时整面 fail closed，不静默取其一', () => {
    const runtime = createDesktopPackageRuntime();
    const entry = runtime.packageRegistries.artifactSchemas.get('legal.ReviewMatrix');
    if (entry === undefined) throw new Error('fixture descriptor missing');
    const rival: ArtifactSchemaRegistryEntry = {
      ...entry,
      descriptor: { ...entry.descriptor, typeId: 'legal.RivalMatrix' },
    };
    const packageRegistries: PackageRegistries = {
      ...runtime.packageRegistries,
      artifactSchemas: {
        ...runtime.packageRegistries.artifactSchemas,
        list: () => [entry, rival],
        get: (typeId) => typeId === 'legal.RivalMatrix' ? rival : runtime.packageRegistries.artifactSchemas.get(typeId),
      },
    };

    expect(resolveNamedComponentView('matrix', matrixOnly, packageRegistries, runtime.hostRenderers))
      .toEqual({ status: 'unsupported', title: '矩阵审阅' });
  });
});
