import { describe, expect, it } from 'vitest';
import {
  createHostRendererRegistry,
  type HostRendererBlueprint,
} from './HostRendererRegistry.js';
import { createCourtworkHostRendererRegistry } from './courtwork-host-renderers.js';

describe('HostRendererRegistry（宿主以 uiTemplateId 绑定可执行工作面）', () => {
  it('Legal 既有工作面与通用表都由宿主 blueprint 显式登记', () => {
    const registry = createCourtworkHostRendererRegistry();

    expect(registry.get('case-intake-panel')).toEqual({ uiTemplateId: 'case-intake-panel', kind: 'passive' });
    expect(registry.get('timeline-panel')).toBeUndefined();
    expect(registry.get('courtwork.timeline.v1')).toMatchObject({
      kind: 'component', view: 'timeline', moduleTarget: 'timeline', autoOpen: true,
    });
    expect(registry.get('party-graph-panel')).toEqual({
      uiTemplateId: 'party-graph-panel', kind: 'route', view: 'graph', moduleTarget: 'graph', autoOpen: true,
    });
    expect(registry.get('risk-review-panel')).toEqual({
      uiTemplateId: 'risk-review-panel', kind: 'route', view: 'revision', moduleTarget: 'revision', autoOpen: true,
    });
    expect(registry.get('matrix-review-panel')).toBeUndefined();
    expect(registry.get('courtwork.review-matrix.v1')).toMatchObject({
      kind: 'component', view: 'matrix', moduleTarget: 'matrix', autoOpen: true,
    });
    expect(registry.get('draft-review-panel')).toEqual({
      uiTemplateId: 'draft-review-panel', kind: 'route', view: 'draft', autoOpen: false,
    });
    expect(registry.get('file-ops-plan-panel')).toEqual({
      uiTemplateId: 'file-ops-plan-panel', kind: 'passive', moduleTarget: 'working-folders',
    });
    expect(registry.get('courtwork.artifact-table.v1')).toMatchObject({ kind: 'component', view: 'artifact' });
  });

  it('拒绝同一 uiTemplateId 的宿主实现覆写', () => {
    const duplicate: HostRendererBlueprint[] = [
      { uiTemplateId: 'table.v1', kind: 'passive' },
      { uiTemplateId: 'table.v1', kind: 'passive' },
    ];

    expect(() => createHostRendererRegistry(duplicate)).toThrow(/duplicate host renderer/i);
  });

  it('拒绝两个 component blueprint 争夺同一具名工作面（禁 silent last-wins）', () => {
    const component = () => null;
    const rivals: HostRendererBlueprint[] = [
      { uiTemplateId: 'matrix.v1', kind: 'component', view: 'matrix', component },
      { uiTemplateId: 'matrix.v2', kind: 'component', view: 'matrix', component },
    ];

    expect(() => createHostRendererRegistry(rivals)).toThrow(/duplicate host view/i);
  });

  it('通用 artifact 页签承载多个 component blueprint，不受具名工作面唯一性约束', () => {
    const component = () => null;
    const shared: HostRendererBlueprint[] = [
      { uiTemplateId: 'table.v1', kind: 'component', view: 'artifact', component },
      { uiTemplateId: 'table.v2', kind: 'component', view: 'artifact', component },
    ];

    expect(() => createHostRendererRegistry(shared)).not.toThrow();
  });
});
