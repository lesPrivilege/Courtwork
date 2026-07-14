import type { PackageRegistries, RuntimeArtifactDescriptor } from '@courtwork/registry';
import type { HostRendererBlueprint, HostRendererRegistry } from './HostRendererRegistry.js';
import { UnsupportedArtifactView } from './ArtifactTableRenderer.js';

export type ResolvedHostArtifact =
  | {
      status: 'ready';
      title: string;
      descriptor: RuntimeArtifactDescriptor;
      renderer: HostRendererBlueprint;
    }
  | { status: 'unsupported'; title: string };

const NEUTRAL_ARTIFACT_TITLE = '结构化产出';

export function resolveHostArtifact(
  artifactType: string,
  packageRegistries: PackageRegistries,
  hostRenderers: HostRendererRegistry,
): ResolvedHostArtifact {
  const entry = packageRegistries.artifactSchemas.get(artifactType);
  if (entry === undefined) return { status: 'unsupported', title: NEUTRAL_ARTIFACT_TITLE };
  // buildPackageRegistries 的唯一 compatibility 适配器产出 RuntimeArtifactDescriptor；
  // registry 的窄旧类型不在此工单扩约，宿主仅在准入后局部恢复 data-plane 只读形状。
  const descriptor = entry.descriptor as RuntimeArtifactDescriptor;
  const title = descriptor.title || NEUTRAL_ARTIFACT_TITLE;
  if (packageRegistries.renderers.get(descriptor.uiTemplateId) === undefined) {
    return { status: 'unsupported', title };
  }
  const renderer = hostRenderers.get(descriptor.uiTemplateId);
  if (renderer === undefined) return { status: 'unsupported', title };
  return { status: 'ready', title, descriptor, renderer };
}

export function ArtifactHostView({
  artifactType,
  payload,
  packageRegistries,
  hostRenderers,
}: {
  artifactType: string;
  payload: unknown;
  packageRegistries: PackageRegistries;
  hostRenderers: HostRendererRegistry;
}) {
  const resolved = resolveHostArtifact(artifactType, packageRegistries, hostRenderers);
  if (resolved.status === 'unsupported') return <UnsupportedArtifactView title={resolved.title} />;
  if (resolved.renderer.kind !== 'component') return <UnsupportedArtifactView title={resolved.title} />;
  const Component = resolved.renderer.component;
  return <Component descriptor={resolved.descriptor} payload={payload} />;
}
