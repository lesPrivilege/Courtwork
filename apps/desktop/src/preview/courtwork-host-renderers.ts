import { ArtifactTableRenderer } from './ArtifactTableRenderer.js';
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
    { uiTemplateId: 'timeline-panel', kind: 'route', view: 'timeline', moduleTarget: 'timeline', autoOpen: true },
    { uiTemplateId: 'party-graph-panel', kind: 'route', view: 'graph', moduleTarget: 'graph', autoOpen: true },
    { uiTemplateId: 'risk-review-panel', kind: 'route', view: 'revision', moduleTarget: 'revision', autoOpen: true },
    { uiTemplateId: 'matrix-review-panel', kind: 'route', view: 'matrix', moduleTarget: 'matrix', autoOpen: true },
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
