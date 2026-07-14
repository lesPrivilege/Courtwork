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
      view: 'artifact';
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
  for (const blueprint of blueprints) {
    if (entries.has(blueprint.uiTemplateId)) {
      throw new Error(`duplicate host renderer: ${blueprint.uiTemplateId}`);
    }
    entries.set(blueprint.uiTemplateId, Object.freeze({ ...blueprint }));
  }
  return {
    get: (uiTemplateId) => entries.get(uiTemplateId),
    list: () => [...entries.values()],
  };
}
