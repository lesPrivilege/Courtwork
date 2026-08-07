import { lazy, Suspense } from 'react';
import type { PartyGraph } from '@courtwork/legal';
import { GateConfirmBar } from './GateConfirmBar';
import { UnsupportedArtifactView } from '../../preview/ArtifactTableRenderer.js';
import type { HostRendererComponentProps } from '../../preview/HostRendererRegistry.js';
import { useWorkbenchRenderContext } from '../../preview/workbench-render-context.js';

/**
 * `courtwork.party-graph.v1` 的宿主 renderer（GENERIC-PACK-1 · 余三 panel 第二枚）。
 *
 * 同矩阵/时间线先例：先整面 `safeParse`，漂移即 fail closed，不渲染半张图谱、不暴露 wire。
 *
 * **懒载点随渲染件迁来**：`GraphPanel` 拖着 g6 的独立 chunk（约 800KB），原先由 App 顶层
 * `lazy()` 持有。迁到本 renderer 内部后 chunk 切分不变——本文件由宿主注册表静态引用，
 * 真正的动态边界仍在 `import('./GraphPanel')` 这一处，不是 App 是谁持有它。
 */
const GraphPanel = lazy(() => import('./GraphPanel'));

export function GraphRenderer({ descriptor, payload }: HostRendererComponentProps) {
  const { evidenceGrades } = useWorkbenchRenderContext();
  const parsed = descriptor.schema.safeParse(payload);
  if (!parsed.success) return <UnsupportedArtifactView title={descriptor.title} />;
  return <>
    <GateConfirmBar artifactType={descriptor.typeId} />
    <Suspense fallback={<div className="empty-state" role="status">关系图谱载入中…</div>}>
      <GraphPanel graph={parsed.data as PartyGraph} grade={evidenceGrades[0]?.grade} />
    </Suspense>
  </>;
}
