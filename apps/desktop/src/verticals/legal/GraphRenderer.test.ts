import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createLegalWorkSurface } from './legal-work-surface.js';
import type { RuntimeArtifactDescriptor } from '@courtwork/registry';
import { createDesktopPackageRuntime } from '../../composition/package-runtime.js';
import { GraphRenderer } from './GraphRenderer.js';
import { WorkbenchRenderProvider } from '../../preview/workbench-render-context.js';

/** LEGAL-FIVE-FACES-1：renderer 现在带面内门禁确认条，故须挂垂类工作面 Provider（无门禁即零渲染）。 */
const legalSurface = createLegalWorkSurface({ workCommand: {} as never });
const withSurface = (node: ReturnType<typeof createElement>) =>
  createElement(legalSurface.Provider, { value: { submission: {}, pendingGate: undefined, confirmGate: () => {} }, children: node });


function graphDescriptor(): RuntimeArtifactDescriptor {
  const entry = createDesktopPackageRuntime().packageRegistries.artifactSchemas.get('legal.PartyGraph');
  if (entry === undefined) throw new Error('fixture descriptor missing');
  return entry.descriptor as RuntimeArtifactDescriptor;
}

const GRAPH: unknown = {
  caseId: 'demo-case',
  nodes: [
    { id: 'p1', kind: 'organization', primaryName: '云章科技（虚构）', aliases: [] },
    { id: 'p2', kind: 'individual', primaryName: '李某', aliases: [] },
  ],
  edges: [{
    id: 'e1',
    sourcePartyId: 'p1',
    targetPartyId: 'p2',
    relationType: '法定代表人',
    sourceAnchors: [{
      fileId: 'V1-采购合同.docx',
      quote: '法定代表人：李某',
      textRange: { start: 0, end: 8 },
    }],
  }],
};

const render = (payload: unknown) => renderToStaticMarkup(createElement(
  WorkbenchRenderProvider,
  { value: { evidenceGrades: [] } },
  withSurface(createElement(GraphRenderer, { descriptor: graphDescriptor(), payload })),
));

describe('GraphRenderer（先整体验证，再渲染）', () => {
  it('schema-valid payload 过验证并落到懒载边界——渲染出图谱载入态而非拒载态', () => {
    const html = render(GRAPH);

    // 图谱本体拖着独立 chunk，静态渲染只到 Suspense fallback 为止；判据是**没有落到 fail closed**。
    expect(html).toContain('关系图谱载入中');
    expect(html).not.toContain('当前版本不支持此工作面');
  });

  it('payload 与 schema 漂移时整面 fail closed，不进懒载边界、不泄 wire', () => {
    const html = render({
      caseId: 'demo-case',
      nodes: [{ id: 'p1', kind: '公司', primaryName: '云章科技（虚构）', aliases: [] }],
      edges: [],
      privateWireKey: 'must-not-render',
    });

    expect(html).toContain('当事人图谱');
    expect(html).toContain('当前版本不支持此工作面');
    expect(html).not.toContain('关系图谱载入中');
    expect(html).not.toContain('must-not-render');
  });

  it('缺 Provider 即抛：装配缺失是显式失败，不是静默降级', () => {
    expect(() => renderToStaticMarkup(
      withSurface(createElement(GraphRenderer, { descriptor: graphDescriptor(), payload: GRAPH })),
    )).toThrow(/workbench render context is not mounted/);
  });
});
