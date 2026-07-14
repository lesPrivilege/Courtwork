import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDesktopPackageRuntime } from '../composition/package-runtime.js';
import { projectArtifactTable } from './projection/artifact-table.js';
import {
  assertFrozenViewModel,
  freezeViewModel,
  type AnchorView,
  type DecisionView,
  type EstimateView,
  type EvidenceView,
  type FieldView,
  type PartialView,
  type StatusView,
} from './projection/view-model.js';
import {
  Anchor,
  Decision,
  Estimate,
  Evidence,
  Field,
  Partial,
  Status,
} from './primitives/index.js';

const anchor: AnchorView = freezeViewModel({
  id: 'source-1',
  fileLabel: '需求说明',
  page: 7,
  quote: '这是一段必须完整呈现、不能被省略的证据引语。',
  availability: 'source_ready',
});
const field: FieldView = freezeViewModel({ id: 'field-1', label: '事项', value: '提醒延迟', valueKind: 'text' });
const status: StatusView = freezeViewModel({ label: '待确认', tone: 'warning' });
const evidence: EvidenceView = freezeViewModel({ statement: '提醒未在约定时限内送达', anchors: [anchor], verification: 'verified' });
const decision: DecisionView = freezeViewModel({
  requestId: 'request-1',
  state: 'pending',
  actions: [
    { id: 'confirm', label: '确认', description: '采用当前结论' },
    { id: 'revise', label: '修正' },
  ],
});
const estimate: EstimateView = freezeViewModel({ range: { low: 0.6, high: 0.8 }, unit: '置信区间' });
const partial: PartialView = freezeViewModel({ completed: 2, total: 4, failures: ['一项来源漂移'], pending: 1 });

describe('VISUAL-KIT-1 frozen host ViewModel and primitives', () => {
  it('七类 primitive 只渲染递归冻结的宿主 ViewModel 与语义 HTML', () => {
    const html = renderToStaticMarkup(createElement('div', null,
      createElement(Field, { view: field }),
      createElement(Anchor, { view: anchor }),
      createElement(Status, { view: status }),
      createElement(Evidence, { view: evidence }),
      createElement(Decision, { view: decision }),
      createElement(Estimate, { view: estimate }),
      createElement(Partial, { view: partial }),
    ));

    for (const name of ['field', 'anchor', 'status', 'evidence', 'decision', 'estimate', 'partial']) {
      expect(html).toContain(`data-primitive="${name}"`);
    }
    expect(html).toContain(anchor.quote);
    expect(html).toContain('<fieldset');
    expect(html).toContain('0.6–0.8');
    expect(html).toContain('2/4');
    expect(html).not.toContain('linear-gradient');
    expect(html).not.toContain('<button type="button" class="visual-anchor');
    expect(html).toContain('<fieldset class="visual-decision"');
    expect(html).toContain('disabled=""');
  });

  it('primitive 对未冻结或形状非法的 VM fail closed', () => {
    expect(() => assertFrozenViewModel({ ...field })).toThrow(/frozen/i);
    expect(() => renderToStaticMarkup(createElement(Estimate, {
      view: freezeViewModel({ range: { low: 8, high: 2 } }) as EstimateView,
    }))).toThrow(/estimate/i);
    expect(() => renderToStaticMarkup(createElement(Status, {
      view: freezeViewModel({ label: '未知', tone: 'future-tone' }) as unknown as StatusView,
    }))).toThrow(/status/i);
    expect(() => renderToStaticMarkup(createElement(Anchor, {
      view: freezeViewModel({ ...anchor, quote: '' }) as AnchorView,
    }))).toThrow(/anchor/i);
  });

  it('freezeViewModel 收敛外部浅冻结对象，不留下可变子节点', () => {
    const nested = { label: '仍可变' };
    const shallow = Object.freeze({ nested });
    const frozen = freezeViewModel(shallow);
    expect(frozen).toBe(shallow);
    expect(Object.isFrozen(frozen.nested)).toBe(true);
    expect(() => assertFrozenViewModel(frozen)).not.toThrow();
  });
});

const PM_FIXTURE = {
  projectId: 'project-1',
  documentId: 'prd.md',
  findings: [{
    id: 'finding-1', section: '3.2', clause: '消息应及时送达',
    sourceAnchors: [{ fileId: 'prd.md', page: 7, textRange: { start: 1, end: 9 }, quote: '消息应及时送达，且延迟不得超过三十秒。' }],
    defectType: 'vague-metric', severity: 'high', issue: '缺少量化口径', suggestion: '补充时限', status: 'pending',
  }],
};

describe('VISUAL-KIT-1 namespace-blind artifact projection', () => {
  it('PM 与 Legal namespace 反例产生同一 primitive VM，不读取 typeId 或 wire fallback', () => {
    const runtime = createDesktopPackageRuntime();
    const entry = runtime.packageRegistries.artifactSchemas.get('pm.PrdReview');
    if (!entry) throw new Error('PM descriptor missing');
    const pm = entry.descriptor as Parameters<typeof projectArtifactTable>[0];
    const legalCounterexample = { ...pm, typeId: 'legal.VisualCounterexample' };
    const pmProjection = projectArtifactTable(pm, PM_FIXTURE);
    const legalProjection = projectArtifactTable(legalCounterexample, PM_FIXTURE);

    expect(pmProjection).toEqual(legalProjection);
    expect(pmProjection.status).toBe('ready');
    expect(Object.isFrozen(pmProjection)).toBe(true);
    if (pmProjection.status !== 'ready') throw new Error('projection unexpectedly unsupported');
    expect(pmProjection.rows.flat().map((cell) => cell.kind)).toEqual(expect.arrayContaining(['field', 'anchor', 'status']));
    expect(JSON.stringify(pmProjection)).not.toContain('vague-metric');
    expect(JSON.stringify(pmProjection)).not.toContain('legal.VisualCounterexample');
    expect(JSON.stringify(pmProjection)).not.toContain('pm.PrdReview');
  });
});
