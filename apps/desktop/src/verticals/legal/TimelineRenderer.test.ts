import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createLegalWorkSurface } from './legal-work-surface.js';
import type { RuntimeArtifactDescriptor } from '@courtwork/registry';
import { createDesktopPackageRuntime } from '../../composition/package-runtime.js';
import { TimelineRenderer } from './TimelineRenderer.js';
import { WorkbenchRenderProvider } from '../../preview/workbench-render-context.js';

/** LEGAL-FIVE-FACES-1：renderer 现在带面内门禁确认条，故须挂垂类工作面 Provider（无门禁即零渲染）。 */
const legalSurface = createLegalWorkSurface({ workCommand: {} as never });
const withSurface = (node: ReturnType<typeof createElement>) =>
  createElement(legalSurface.Provider, { value: { submission: {}, pendingGate: undefined, confirmGate: () => {} }, children: node });


function timelineDescriptor(): RuntimeArtifactDescriptor {
  const entry = createDesktopPackageRuntime().packageRegistries.artifactSchemas.get('legal.Timeline');
  if (entry === undefined) throw new Error('fixture descriptor missing');
  return entry.descriptor as RuntimeArtifactDescriptor;
}

const TIMELINE: unknown = {
  caseId: 'demo-case',
  events: [{
    id: 'evt-01',
    description: '双方签署设备采购合同',
    date: { kind: 'exact', date: '2024-03-11' },
    partyIds: ['p1'],
    sourceAnchors: [{
      fileId: 'V1-采购合同.docx',
      quote: '本合同自双方签字之日起生效',
      textRange: { start: 10, end: 24 },
    }],
  }],
};

const render = (payload: unknown, grades: readonly { key: string; grade: 'A' | 'B' | 'C'; sourceId: string; confirmed: boolean }[] = []) =>
  renderToStaticMarkup(createElement(
    WorkbenchRenderProvider,
    { value: { evidenceGrades: grades } },
    withSurface(createElement(TimelineRenderer, { descriptor: timelineDescriptor(), payload })),
  ));

describe('TimelineRenderer（先整体验证，再渲染）', () => {
  it('schema-valid payload 真渲时间线：事件行与日期俱在', () => {
    const html = render(TIMELINE);

    expect(html).toContain('data-testid="timeline-panel"');
    expect(html).toContain('双方签署设备采购合同');
    expect(html).toContain('2024-03-11');
  });

  it('证据等级取自宿主渲染上下文，不由 payload 携带', () => {
    const html = render(TIMELINE, [{ key: 'dossier-corpus', grade: 'B', sourceId: 'fixture', confirmed: true }]);

    expect(html).toContain('信源 B');
    // 阴性对照：上下文为空时同一 payload 不得渲染出任何等级章——否则该断言对上下文零区分力。
    expect(render(TIMELINE)).not.toContain('信源 ');
  });

  it('payload 与 schema 漂移时整面 fail closed，不渲染半条时间线、不泄 wire', () => {
    const html = render({
      caseId: 'demo-case',
      events: [{
        id: 'evt-01',
        description: '双方签署设备采购合同',
        date: { kind: 'exact', date: '2024-03-11' },
        sourceAnchors: [],
        privateWireKey: 'must-not-render',
      }],
    });

    expect(html).toContain('事件时间线');
    expect(html).toContain('当前版本不支持此工作面');
    expect(html).not.toContain('timeline-panel');
    expect(html).not.toContain('双方签署设备采购合同');
    expect(html).not.toContain('must-not-render');
  });

  it('缺 Provider 即抛：装配缺失是显式失败，不是「渲染成没有等级」的静默降级', () => {
    expect(() => renderToStaticMarkup(
      withSurface(createElement(TimelineRenderer, { descriptor: timelineDescriptor(), payload: TIMELINE })),
    )).toThrow(/workbench render context is not mounted/);
  });
});
