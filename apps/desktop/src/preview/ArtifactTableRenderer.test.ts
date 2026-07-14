import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDesktopPackageRuntime } from '../composition/package-runtime.js';
import {
  ArtifactTableRenderer,
  projectArtifactTable,
  type HostArtifactDescriptor,
} from './ArtifactTableRenderer.js';

const FIXTURE = {
  projectId: 'project-1',
  documentId: 'prd.md',
  findings: [
    {
      id: 'finding-1',
      section: '3.2',
      clause: '消息应及时送达',
      sourceAnchors: [
        {
          fileId: 'private/absolute/prd.md',
          page: 7,
          bbox: { x: 1, y: 2, width: 3, height: 4 },
          textRange: { start: 12, end: 20 },
          textLayerVersion: 'sha256-secret',
          quote: '消息应及时送达，且 P95 延迟不得超过 30 秒。',
        },
      ],
      defectType: 'vague-metric',
      severity: 'high',
      issue: '及时没有量化口径',
      suggestion: '补充 P95 时延',
      status: 'pending',
    },
  ],
};

function descriptor(): HostArtifactDescriptor {
  const runtime = createDesktopPackageRuntime();
  const entry = runtime.packageRegistries.artifactSchemas.get('pm.PrdReview');
  if (entry === undefined) throw new Error('fixture descriptor missing');
  return entry.descriptor as HostArtifactDescriptor;
}

describe('ArtifactTableRenderer（schema first + presentation only）', () => {
  it('schema-valid PM fixture 只显示人读 label/valueLabel 与完整证据摘要', () => {
    const result = projectArtifactTable(descriptor(), FIXTURE);
    expect(result.status).toBe('ready');

    const html = renderToStaticMarkup(
      createElement(ArtifactTableRenderer, { descriptor: descriptor(), payload: FIXTURE }),
    );
    expect(html).toContain('需求文档评审');
    expect(html).toContain('缺陷维度');
    expect(html).toContain('模糊指标');
    expect(html).toContain('严重度');
    expect(html).toContain('高');
    expect(html).toContain('1 个来源');
    expect(html).toContain('第 7 页');
    expect(html).toContain('消息应及时送达，且 P95 延迟不得超过 30 秒。');
    expect(html).not.toContain('vague-metric');
    expect(html).not.toContain('private/absolute');
    expect(html).not.toContain('sha256-secret');
    expect(html).not.toContain('bbox');
    expect(html).not.toContain('textRange');
  });

  it.each([
    ['payload malformed', { ...FIXTURE, findings: [{ ...FIXTURE.findings[0], severity: 'wire-secret' }] }],
    ['pointer drift', FIXTURE],
  ])('%s 统一 fail closed，不投影 raw payload', (name, payload) => {
    const base = descriptor();
    const candidate = name === 'pointer drift'
      ? { ...base, presentation: { ...base.presentation!, fields: [{ pointer: '/missing', label: '漂移', format: 'text' as const }] } }
      : base;
    const result = projectArtifactTable(candidate, payload);
    expect(result).toEqual({ status: 'unsupported' });

    const html = renderToStaticMarkup(
      createElement(ArtifactTableRenderer, { descriptor: candidate, payload }),
    );
    expect(html).toContain('当前版本不支持此工作面');
    expect(html).not.toContain('wire-secret');
    expect(html).not.toContain('missing');
  });
});
