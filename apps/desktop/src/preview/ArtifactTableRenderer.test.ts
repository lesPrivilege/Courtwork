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

const estimateAnchor = (fileId: string, quote: string) => ({
  fileId,
  textRange: { start: 0, end: quote.length },
  quote,
});

const PRIORITY_INTERVAL_FIXTURE = {
  projectId: 'project-1',
  formula: 'RICE',
  formulaVersion: 'rice-v1',
  rows: [
    {
      id: 'priority-1',
      item: '离线推送修复',
      requirementRef: 'req-1',
      params: {
        reach: { fill: 'auto', value: null, range: { low: 1000, high: 1200 }, sourceAnchors: [estimateAnchor('metrics.csv', '1000 至 1200')], status: 'filled' },
        impact: { fill: 'auto', value: 2, range: null, sourceAnchors: [estimateAnchor('research.md', '影响 2')], status: 'filled' },
        confidence: { fill: 'manual', value: null, range: { low: 0.6, high: 0.8 }, sourceAnchors: [estimateAnchor('review.md', '0.6 至 0.8')], status: 'filled' },
        effort: { fill: 'manual', value: 3, range: null, sourceAnchors: [estimateAnchor('estimate.md', '3 人周')], status: 'filled' },
      },
      score: { low: 400, high: 640 },
      rank: 1,
      band: 'P0',
    },
  ],
};

const PRIORITY_GAP_FIXTURE = {
  ...PRIORITY_INTERVAL_FIXTURE,
  rows: [{
    ...PRIORITY_INTERVAL_FIXTURE.rows[0],
    params: {
      ...PRIORITY_INTERVAL_FIXTURE.rows[0].params,
      reach: { fill: 'auto', value: null, range: null, sourceAnchors: [], status: 'out_of_coverage' },
    },
    score: 0,
  }],
};

function descriptor(): HostArtifactDescriptor {
  const runtime = createDesktopPackageRuntime();
  const entry = runtime.packageRegistries.artifactSchemas.get('pm.PrdReview');
  if (entry === undefined) throw new Error('fixture descriptor missing');
  return entry.descriptor as HostArtifactDescriptor;
}

function priorityDescriptor(): HostArtifactDescriptor {
  const runtime = createDesktopPackageRuntime();
  const entry = runtime.packageRegistries.artifactSchemas.get('pm.PriorityScore');
  if (entry === undefined) throw new Error('priority fixture descriptor missing');
  return entry.descriptor as HostArtifactDescriptor;
}

describe('ArtifactTableRenderer（schema first + presentation only）', () => {
  it('schema-valid PM fixture 只显示人读 label/valueLabel 与完整证据摘要', () => {
    const result = projectArtifactTable(descriptor(), FIXTURE);
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error('fixture projection failed');
    const projectedAnchor = result.rows[0]?.find((cell) => cell.kind === 'anchor');
    expect(projectedAnchor).toMatchObject({ kind: 'anchor', views: [{ fileLabel: 'prd' }] });

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

  it('完整 schema 必填项缺失时先于 presentation 整面拒绝', () => {
    const { documentId: _documentId, ...schemaInvalid } = FIXTURE;
    const result = projectArtifactTable(descriptor(), schemaInvalid);
    expect(result).toEqual({ status: 'unsupported' });
    const html = renderToStaticMarkup(createElement(ArtifactTableRenderer, {
      descriptor: descriptor(),
      payload: schemaInvalid,
    }));
    expect(html).toContain('当前版本不支持此工作面');
    expect(html).not.toContain('及时没有量化口径');
  });

  it('schema-valid PriorityScore 区间显示 low–high，不因单值 pointer 缺席整面降级', () => {
    expect(priorityDescriptor().schema.safeParse(PRIORITY_INTERVAL_FIXTURE).success).toBe(true);
    const html = renderToStaticMarkup(createElement(ArtifactTableRenderer, {
      descriptor: priorityDescriptor(),
      payload: PRIORITY_INTERVAL_FIXTURE,
    }));

    expect(html).toContain('需求优先级');
    expect(html).toContain('1000–1200');
    expect(html).toContain('0.6–0.8');
    expect(html).toContain('400–640');
    expect(html).not.toContain('当前版本不支持此工作面');
  });

  it('schema-valid estimate 缺口只显示 field-local status label，不泄漏 wire status', () => {
    expect(priorityDescriptor().schema.safeParse(PRIORITY_GAP_FIXTURE).success).toBe(true);
    const html = renderToStaticMarkup(createElement(ArtifactTableRenderer, {
      descriptor: priorityDescriptor(),
      payload: PRIORITY_GAP_FIXTURE,
    }));

    expect(html).toContain('未覆盖·需补材料');
    expect(html).not.toContain('out_of_coverage');
    expect(html).not.toContain('当前版本不支持此工作面');
  });

  it.each([
    ['双值', {
      ...PRIORITY_INTERVAL_FIXTURE,
      rows: [{
        ...PRIORITY_INTERVAL_FIXTURE.rows[0],
        params: {
          ...PRIORITY_INTERVAL_FIXTURE.rows[0].params,
          reach: { ...PRIORITY_INTERVAL_FIXTURE.rows[0].params.reach, value: 1100 },
        },
      }],
    }, '1100'],
    ['逆区间', {
      ...PRIORITY_INTERVAL_FIXTURE,
      rows: [{
        ...PRIORITY_INTERVAL_FIXTURE.rows[0],
        score: { low: 640, high: 400 },
      }],
    }, '640–400'],
    ['未知状态', {
      ...PRIORITY_GAP_FIXTURE,
      rows: [{
        ...PRIORITY_GAP_FIXTURE.rows[0],
        params: {
          ...PRIORITY_GAP_FIXTURE.rows[0].params,
          reach: { ...PRIORITY_GAP_FIXTURE.rows[0].params.reach, status: 'future-wire-status' },
        },
      }],
    }, 'future-wire-status'],
  ])('estimate %s 统一进入 zero-wire fallback', (_name, payload, leakedValue) => {
    const html = renderToStaticMarkup(createElement(ArtifactTableRenderer, {
      descriptor: priorityDescriptor(),
      payload,
    }));
    expect(html).toContain('当前版本不支持此工作面');
    expect(html).not.toContain(leakedValue);
  });
});
