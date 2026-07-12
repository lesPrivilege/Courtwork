import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { HOMED_ARTIFACT_TYPES, toStructureRows, unhomedArtifacts } from './generic-structure.js';
import { GenericStructurePanel } from './GenericStructurePanel.js';

describe('渲染兜底路由（兜底③：有 schema 无 renderer → 通用结构视图）', () => {
  it('legal 七类全部有归宿，不落兜底', () => {
    const artifacts = { 'legal.RiskList': { caseId: 'c1' }, 'legal.CaseFile': { caseId: 'c1' } };
    expect(unhomedArtifacts(artifacts)).toEqual([]);
    expect(HOMED_ARTIFACT_TYPES.size).toBe(7);
  });

  it('未知类型落兜底清单（新垂类 schema 先行时的着陆点）', () => {
    const artifacts = { 'legal.RiskList': { caseId: 'c1' }, 'pm.PrdReview': { projectId: 'p1', items: [] } };
    expect(unhomedArtifacts(artifacts)).toEqual([{ typeId: 'pm.PrdReview', artifact: { projectId: 'p1', items: [] } }]);
  });
});

describe('toStructureRows（确定性树化）', () => {
  it('对象/数组/标量混合结构逐层展开，同输入同输出', () => {
    const value = { caseId: 'c1', items: [{ note: '第一项', done: true }, { note: '第二项', done: false }] };
    const rows = toStructureRows(value);
    expect(rows).toEqual(toStructureRows(value));
    expect(rows).toEqual([
      { depth: 0, label: 'caseId', value: 'c1' },
      { depth: 0, label: 'items（2 项）' },
      { depth: 1, label: '#1' },
      { depth: 2, label: 'note', value: '第一项' },
      { depth: 2, label: 'done', value: 'true' },
      { depth: 1, label: '#2' },
      { depth: 2, label: 'note', value: '第二项' },
      { depth: 2, label: 'done', value: 'false' },
    ]);
  });

  it('深层与超长数组诚实截断（防巨物，不假装全量）', () => {
    const deep = { a: { b: { c: { d: { e: { f: 1 } } } } } };
    expect(toStructureRows(deep).some((row) => row.value === '（层级过深，已折叠）')).toBe(true);
    const wide = { list: Array.from({ length: 25 }, (_, i) => i) };
    expect(toStructureRows(wide).some((row) => row.label.includes('其余 5 项未展开'))).toBe(true);
  });
});

describe('GenericStructurePanel（永不白屏的只读保底）', () => {
  it('渲染 typeId 标题 + 结构行 + 诚实说明（无专用工作面）', () => {
    const html = renderToStaticMarkup(
      createElement(GenericStructurePanel, {
        entries: [{ typeId: 'pm.PrdReview', artifact: { projectId: 'p1', score: 42 } }],
      }),
    );
    expect(html).toContain('generic-structure-panel');
    expect(html).toContain('pm.PrdReview');
    expect(html).toContain('projectId');
    expect(html).toContain('p1');
    expect(html).toContain('42');
    expect(html).toContain('暂无专用工作面');
    // 只读：无 input/button/交互元素
    expect(html).not.toContain('<input');
    expect(html).not.toContain('<button');
  });
});
