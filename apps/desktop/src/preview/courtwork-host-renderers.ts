import { ArtifactTableRenderer } from './ArtifactTableRenderer.js';
import { ReviewMatrixRenderer } from './ReviewMatrixRenderer.js';
import { TimelineRenderer } from './TimelineRenderer.js';
import {
  createHostRendererRegistry,
  type HostRendererRegistry,
} from './HostRendererRegistry.js';

/**
 * 可执行 React/projection 只在 desktop 宿主登记。垂类包只声明稳定 uiTemplateId，
 * 不越过 Package ABI 注入组件、CSS 或路由函数。
 */
export function createCourtworkHostRendererRegistry(): HostRendererRegistry {
  return createHostRendererRegistry([
    { uiTemplateId: 'case-intake-panel', kind: 'passive' },
    {
      // GENERIC-PACK-1 余三 panel 第一枚：事件时间线由 route 迁为版本化 component blueprint。
      // 同矩阵先例，旧 id `timeline-panel` 不留 alias——artifact 事件只持 artifactType 与 payload。
      uiTemplateId: 'courtwork.timeline.v1',
      kind: 'component',
      view: 'timeline',
      component: TimelineRenderer,
      moduleTarget: 'timeline',
      autoOpen: true,
    },
    { uiTemplateId: 'party-graph-panel', kind: 'route', view: 'graph', moduleTarget: 'graph', autoOpen: true },
    { uiTemplateId: 'risk-review-panel', kind: 'route', view: 'revision', moduleTarget: 'revision', autoOpen: true },
    {
      // PANEL-BLUEPRINT-1 首枚：矩阵审阅由 route 迁为版本化 component blueprint。
      // 旧 id `matrix-review-panel` 不留 alias——artifact 事件只持 artifactType 与 payload，
      // 回放从当期 descriptor 解析模板，故改名不触历史 snapshot（架构裁定 2026-07-27）。
      uiTemplateId: 'courtwork.review-matrix.v1',
      kind: 'component',
      view: 'matrix',
      component: ReviewMatrixRenderer,
      moduleTarget: 'matrix',
      autoOpen: true,
    },
    { uiTemplateId: 'draft-review-panel', kind: 'route', view: 'draft', autoOpen: false },
    { uiTemplateId: 'file-ops-plan-panel', kind: 'passive', moduleTarget: 'working-folders' },
    {
      uiTemplateId: 'courtwork.artifact-table.v1',
      kind: 'component',
      view: 'artifact',
      component: ArtifactTableRenderer,
      autoOpen: true,
    },
  ]);
}
