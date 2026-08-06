import { ArtifactTableRenderer } from './ArtifactTableRenderer.js';
import { ReviewMatrixRenderer } from './ReviewMatrixRenderer.js';
import { GraphRenderer } from './GraphRenderer.js';
import { RiskReviewRenderer } from './RiskReviewRenderer.js';
import { TimelineRenderer } from './TimelineRenderer.js';
import {
  createHostRendererRegistry,
  type HostRendererRegistry,
} from './HostRendererRegistry.js';

/**
 * 可执行 React/projection 只在 desktop 宿主登记。垂类包只声明稳定 uiTemplateId，
 * 不越过 Package ABI 注入组件、CSS 或路由函数。
 *
 * GENERIC-PACK-1：本文件同时是**具名工作面的排序与标题唯一真源**——页签条按此处的声明次序
 * 派生（`resolveWorkbenchViews`），标题取 `label`，默认落点取 `preferred`。壳里不再有
 * 垂类工作面的枚举、词表或默认值；未加载垂类时具名面自然为零。
 *
 * 声明次序即页签次序，故此处的顺序是**契约不是排版**：改动会改产品页签顺序。
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
      label: '时间线',
      component: TimelineRenderer,
      moduleTarget: 'timeline',
      autoOpen: true,
    },
    {
      // GENERIC-PACK-1 余三 panel 第二枚：当事人图谱由 route 迁为版本化 component blueprint。
      // 懒载点随渲染件迁入 GraphRenderer，g6 chunk 切分不变。
      uiTemplateId: 'courtwork.party-graph.v1',
      kind: 'component',
      view: 'graph',
      label: '关系图谱',
      component: GraphRenderer,
      moduleTarget: 'graph',
      autoOpen: true,
    },
    {
      // PANEL-BLUEPRINT-1 首枚：矩阵审阅由 route 迁为版本化 component blueprint。
      // 旧 id `matrix-review-panel` 不留 alias——artifact 事件只持 artifactType 与 payload，
      // 回放从当期 descriptor 解析模板，故改名不触历史 snapshot（架构裁定 2026-07-27）。
      uiTemplateId: 'courtwork.review-matrix.v1',
      kind: 'component',
      view: 'matrix',
      label: '矩阵审阅',
      component: ReviewMatrixRenderer,
      moduleTarget: 'matrix',
      autoOpen: true,
    },
    {
      // GENERIC-PACK-1 余三 panel 第三枚：风险审阅由 route 迁为版本化 component blueprint。
      // 唯一与前两枚不同处＝`handlesEmpty`：产出到来前那一格是场景起跑面，不是「尚未生成」。
      uiTemplateId: 'courtwork.risk-review.v1',
      kind: 'component',
      view: 'revision',
      label: '修订预览',
      component: RiskReviewRenderer,
      handlesEmpty: true,
      moduleTarget: 'revision',
      autoOpen: true,
      // 已加载合同审查垂类时的默认落点；未加载即落通用 `draft`（壳不写死垂类面名）。
      preferred: true,
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
