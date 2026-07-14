import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PackageRegistries, RuntimeArtifactDescriptor } from '@courtwork/registry';
import { createDesktopPackageRuntime } from '../composition/package-runtime.js';
import { ArtifactHostView, resolveHostArtifact } from './ArtifactHostView.js';
import { createHostRendererRegistry } from './HostRendererRegistry.js';

describe('ArtifactHostView（未知与 drift 共用 zero-wire fallback）', () => {
  it('未知 artifact 只显示中性标题，不显示 type id 或 payload', () => {
    const runtime = createDesktopPackageRuntime();
    const html = renderToStaticMarkup(createElement(ArtifactHostView, {
      artifactType: 'secret.UnknownArtifact',
      payload: { absolutePath: '/Users/private/secret.pdf', wireStatus: 'private-enum' },
      packageRegistries: runtime.packageRegistries,
      hostRenderers: runtime.hostRenderers,
    }));

    expect(html).toContain('结构化产出');
    expect(html).toContain('当前版本不支持此工作面');
    expect(html).not.toContain('secret.UnknownArtifact');
    expect(html).not.toContain('/Users/private');
    expect(html).not.toContain('private-enum');
  });

  it('host blueprint 缺席时保留 descriptor 人读标题且不猜 renderer', () => {
    const runtime = createDesktopPackageRuntime();
    const resolved = resolveHostArtifact(
      'pm.PrdReview',
      runtime.packageRegistries,
      createHostRendererRegistry([]),
    );
    expect(resolved).toEqual({ status: 'unsupported', title: '需求文档评审' });
  });

  it('未知 template 即使有 package 声明也只进同一零泄漏 fallback', () => {
    const runtime = createDesktopPackageRuntime();
    const entry = runtime.packageRegistries.artifactSchemas.get('pm.PrdReview');
    if (entry === undefined) throw new Error('fixture descriptor missing');
    const descriptor = {
      ...(entry.descriptor as RuntimeArtifactDescriptor),
      uiTemplateId: 'future.private-table.v9',
    };
    const packageRegistries: PackageRegistries = {
      ...runtime.packageRegistries,
      artifactSchemas: {
        ...runtime.packageRegistries.artifactSchemas,
        get: (typeId) => typeId === 'pm.PrdReview' ? { ...entry, descriptor } : undefined,
      },
      renderers: {
        get: (uiTemplateId) => uiTemplateId === 'future.private-table.v9'
          ? { uiTemplateId, kind: 'workspace', title: '未来工作面' }
          : undefined,
      },
    };
    const html = renderToStaticMarkup(createElement(ArtifactHostView, {
      artifactType: 'pm.PrdReview',
      payload: { privateWireKey: 'must-not-render' },
      packageRegistries,
      hostRenderers: runtime.hostRenderers,
    }));

    expect(html).toContain('需求文档评审');
    expect(html).toContain('当前版本不支持此工作面');
    expect(html).not.toContain('future.private-table.v9');
    expect(html).not.toContain('must-not-render');
  });
});
