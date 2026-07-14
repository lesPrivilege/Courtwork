import { describe, expect, it } from 'vitest';
import {
  createHostRendererRegistry,
  type HostRendererBlueprint,
} from './HostRendererRegistry.js';
import { createCourtworkHostRendererRegistry } from './courtwork-host-renderers.js';

describe('HostRendererRegistry（宿主以 uiTemplateId 绑定可执行工作面）', () => {
  it('Legal 既有工作面与通用表都由宿主 blueprint 显式登记', () => {
    const registry = createCourtworkHostRendererRegistry();

    expect(registry.get('timeline-panel')).toMatchObject({ kind: 'route', view: 'timeline' });
    expect(registry.get('party-graph-panel')).toMatchObject({ kind: 'route', view: 'graph' });
    expect(registry.get('risk-review-panel')).toMatchObject({ kind: 'route', view: 'revision' });
    expect(registry.get('matrix-review-panel')).toMatchObject({ kind: 'route', view: 'matrix' });
    expect(registry.get('draft-review-panel')).toMatchObject({ kind: 'route', view: 'draft' });
    expect(registry.get('courtwork.artifact-table.v1')).toMatchObject({ kind: 'component', view: 'artifact' });
  });

  it('拒绝同一 uiTemplateId 的宿主实现覆写', () => {
    const duplicate: HostRendererBlueprint[] = [
      { uiTemplateId: 'table.v1', kind: 'passive' },
      { uiTemplateId: 'table.v1', kind: 'passive' },
    ];

    expect(() => createHostRendererRegistry(duplicate)).toThrow(/duplicate host renderer/i);
  });
});
