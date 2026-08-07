import type { Timeline } from '@courtwork/legal';
import { TimelinePanel } from './panels';
import { GateConfirmBar } from './GateConfirmBar';
import { UnsupportedArtifactView } from '../../preview/ArtifactTableRenderer.js';
import type { HostRendererComponentProps } from '../../preview/HostRendererRegistry.js';
import { useWorkbenchRenderContext } from '../../preview/workbench-render-context.js';

/**
 * `courtwork.timeline.v1` 的宿主 renderer（GENERIC-PACK-1 · 余三 panel 第一枚）。
 *
 * 循矩阵先例：ADR-012 决定四的次序照办——先对完整 payload 验证，再交呈现件；漂移即整面
 * fail closed，与通用表共用同一零泄漏兜底。呈现形状由 `Timeline` schema 直接决定，
 * 非表格 `presentation.fields` 可表达，故不另声明 presentation config（同矩阵裁定）。
 *
 * 证据等级取自宿主渲染上下文而非 props：blueprint 入参契约恒为 `{descriptor, payload}`，
 * 会话派生量走 `WorkbenchRenderProvider`（见 `workbench-render-context.tsx` 的边界三条）。
 */
export function TimelineRenderer({ descriptor, payload }: HostRendererComponentProps) {
  const { evidenceGrades } = useWorkbenchRenderContext();
  const parsed = descriptor.schema.safeParse(payload);
  if (!parsed.success) return <UnsupportedArtifactView title={descriptor.title} />;
  return <>
    <GateConfirmBar artifactType={descriptor.typeId} />
    <TimelinePanel timeline={parsed.data as Timeline} grade={evidenceGrades[0]?.grade} />
  </>;
}
