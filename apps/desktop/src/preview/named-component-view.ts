import type { ComponentType } from 'react';
import type { PackageRegistries, RuntimeArtifactDescriptor } from '@courtwork/registry';
import { resolveHostArtifact } from './ArtifactHostView.js';
import type {
  HostRendererComponentProps,
  HostRendererRegistry,
  HostWorkbenchView,
} from './HostRendererRegistry.js';

/**
 * 具名工作面（矩阵审阅等）的 component blueprint 解析结果。
 *
 * `unregistered` 交回调用方继续原有分支，故仍是 route/passive 的工作面行为逐字不变。
 */
export type NamedComponentView =
  | { status: 'unregistered' }
  | { status: 'empty'; title: string }
  | { status: 'unsupported'; title: string }
  | {
      status: 'ready';
      title: string;
      descriptor: RuntimeArtifactDescriptor;
      component: ComponentType<HostRendererComponentProps>;
      payload: unknown;
    };

/**
 * descriptor → host blueprint → 组件的全链解析：宿主按 view 反查在册的 component blueprint，
 * 不按垂类 artifact type id 分支。
 *
 * 通用 `artifact` 页签不经此路——它自持 `activeArtifactType` 的多产出选择，是唯一的多对一席位。
 * 具名工作面的 blueprint 唯一性由 `createHostRendererRegistry` 拒载保证；此处剩下的多义只可能来自
 * 多个 artifact type 共享同一 uiTemplateId（PM 五个产出共享通用表即合法先例），那在具名工作面上
 * 无法判定该渲染哪一份，故整面 fail closed，不静默取其一。
 */
export function resolveNamedComponentView(
  view: HostWorkbenchView,
  payloadFor: (artifactType: string) => unknown,
  packageRegistries: PackageRegistries,
  hostRenderers: HostRendererRegistry,
): NamedComponentView {
  if (view === 'artifact') return { status: 'unregistered' };

  const candidates = packageRegistries.artifactSchemas.list().flatMap((entry) => {
    const artifactType = entry.descriptor.typeId;
    const resolved = resolveHostArtifact(artifactType, packageRegistries, hostRenderers);
    if (resolved.status !== 'ready') return [];
    if (resolved.renderer.kind !== 'component' || resolved.renderer.view !== view) return [];
    return [{ artifactType, title: resolved.title, descriptor: resolved.descriptor, renderer: resolved.renderer }];
  });

  const [candidate] = candidates;
  if (candidate === undefined) return { status: 'unregistered' };
  if (candidates.length > 1) return { status: 'unsupported', title: candidate.title };

  const payload = payloadFor(candidate.artifactType);
  // `handlesEmpty` 的 blueprint 自持空态：产出缺席时仍进 renderer（payload 为 undefined）。
  // 其余照旧落宿主空态。见 `HostRendererBlueprint.handlesEmpty` 的边界说明。
  if (payload === undefined && candidate.renderer.handlesEmpty !== true) {
    return { status: 'empty', title: candidate.title };
  }
  return {
    status: 'ready',
    title: candidate.title,
    descriptor: candidate.descriptor,
    component: candidate.renderer.component,
    payload,
  };
}
