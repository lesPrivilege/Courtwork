import type { ReviewMatrix } from '@courtwork/legal';
import { MatrixPanel } from '../workbench/Panels';
import { UnsupportedArtifactView } from './ArtifactTableRenderer.js';
import type { HostRendererComponentProps } from './HostRendererRegistry.js';

/**
 * `courtwork.review-matrix.v1` 的宿主 renderer（PANEL-BLUEPRINT-1 首枚）。
 *
 * ADR-012 决定四的次序在此照办：**先对完整 payload 验证，再交呈现件**。矩阵的呈现形状由
 * `ReviewMatrix` schema 直接决定（问题 × 文书 × answers），非表格 `presentation.fields` 可表达，
 * 故本 blueprint 不另声明 presentation config（架构裁定 2026-07-27）——「先验证再投影」的要求
 * 由 `safeParse` 与整面 fail closed 满足，不新造一族只有一个消费者的配置。
 *
 * 漂移即整面拒绝，与通用表共用同一零泄漏兜底：不渲染半张矩阵、不暴露 wire。
 */
export function ReviewMatrixRenderer({ descriptor, payload }: HostRendererComponentProps) {
  const parsed = descriptor.schema.safeParse(payload);
  if (!parsed.success) return <UnsupportedArtifactView title={descriptor.title} />;
  return <MatrixPanel matrix={parsed.data as ReviewMatrix} />;
}
