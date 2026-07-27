import type { ComponentType } from 'react';
import type { RuntimeArtifactDescriptor } from '@courtwork/registry';
import type { ModuleId } from '../modules/module-stack.js';

export type HostWorkbenchView = 'timeline' | 'graph' | 'matrix' | 'revision' | 'draft' | 'artifact';

export interface HostRendererComponentProps {
  descriptor: RuntimeArtifactDescriptor;
  payload: unknown;
}

export type HostRendererBlueprint =
  | {
      uiTemplateId: string;
      kind: 'route';
      view: Exclude<HostWorkbenchView, 'artifact'>;
      moduleTarget?: ModuleId;
      autoOpen?: boolean;
    }
  | {
      uiTemplateId: string;
      kind: 'component';
      /**
       * PANEL-BLUEPRINT-1（架构裁定 2026-07-27）：由字面量 `'artifact'` 扩至全 `HostWorkbenchView`。
       * `kind` 三态语义未动——route 仍是「只声明工作面、组件归宿主」，component 仍是「blueprint 携组件」；
       * 解除的只是「携组件者只能住通用 artifact 页签」这条偶然限制。它源于当时唯一的 component
       * blueprint 恰是通用表，不是协议要求；`kind:'route'` 载荷不携组件正是四 panel 迁移债的根因。
       */
      view: HostWorkbenchView;
      component: ComponentType<HostRendererComponentProps>;
      moduleTarget?: ModuleId;
      autoOpen?: boolean;
    }
  | {
      uiTemplateId: string;
      kind: 'passive';
      moduleTarget?: ModuleId;
    };

export interface HostRendererRegistry {
  get(uiTemplateId: string): HostRendererBlueprint | undefined;
  list(): HostRendererBlueprint[];
}

export function createHostRendererRegistry(
  blueprints: readonly HostRendererBlueprint[],
): HostRendererRegistry {
  const entries = new Map<string, HostRendererBlueprint>();
  // 具名工作面至多一枚 blueprint：通用 artifact 页签是唯一的多对一席位（它自持多产出选择）。
  // 同名争夺必须拒载而非 last-wins——两条渲染路径同时在册，正是本票要退役的形态。
  const namedViews = new Set<HostWorkbenchView>();
  for (const blueprint of blueprints) {
    if (entries.has(blueprint.uiTemplateId)) {
      throw new Error(`duplicate host renderer: ${blueprint.uiTemplateId}`);
    }
    if (blueprint.kind !== 'passive' && blueprint.view !== 'artifact') {
      if (namedViews.has(blueprint.view)) {
        throw new Error(`duplicate host view: ${blueprint.view} (${blueprint.uiTemplateId})`);
      }
      namedViews.add(blueprint.view);
    }
    entries.set(blueprint.uiTemplateId, Object.freeze({ ...blueprint }));
  }
  return {
    get: (uiTemplateId) => entries.get(uiTemplateId),
    list: () => [...entries.values()],
  };
}
