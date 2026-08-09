import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createLegalWorkSurface } from './legal-work-surface.js';
import type { RuntimeArtifactDescriptor } from '@courtwork/registry';
import { createDesktopPackageRuntime } from '../../composition/package-runtime.js';
import { ReviewMatrixRenderer } from './ReviewMatrixRenderer.js';

/** LEGAL-FIVE-FACES-1：renderer 现在带面内门禁确认条，故须挂垂类工作面 Provider（无门禁即零渲染）。 */
const legalSurface = createLegalWorkSurface({ workCommand: {} as never });
const withSurface = (node: ReturnType<typeof createElement>) =>
  createElement(legalSurface.Provider, { value: { submission: {}, pendingGate: undefined, confirmGate: () => {} }, children: node });


function matrixDescriptor(): RuntimeArtifactDescriptor {
  const entry = createDesktopPackageRuntime().packageRegistries.artifactSchemas.get('legal.ReviewMatrix');
  if (entry === undefined) throw new Error('fixture descriptor missing');
  return entry.descriptor as RuntimeArtifactDescriptor;
}

const MATRIX: unknown = {
  caseId: 'demo-case',
  questions: [{ id: 'q1', text: '是否约定违约金比例（按合同总价）' }],
  rows: [{
    documentId: 'V1-采购合同',
    answers: {
      q1: {
        answer: '3%',
        sourceAnchors: [{
          fileId: 'V1-采购合同.docx',
          quote: '违约金为合同总价的百分之三',
          textRange: { start: 120, end: 134 },
        }],
        confidence: 'high',
      },
    },
  }],
};

describe('ReviewMatrixRenderer（先整体验证，再渲染）', () => {
  it('schema-valid payload 真渲矩阵：题头、单元格与图例计数俱在', () => {
    const html = renderToStaticMarkup(withSurface(createElement(ReviewMatrixRenderer, {
      descriptor: matrixDescriptor(),
      payload: MATRIX,
    })));

    expect(html).toContain('data-testid="matrix-panel"');
    expect(html).toContain('是否约定违约金比例（按合同总价）');
    expect(html).toContain('3%');
    expect(html).toContain('1 份文书 · 显示 1/1 个问题');
  });

  it('payload 与 schema 漂移时整面 fail closed，不渲染半张矩阵、不泄 wire', () => {
    const html = renderToStaticMarkup(withSurface(createElement(ReviewMatrixRenderer, {
      descriptor: matrixDescriptor(),
      payload: {
        caseId: 'demo-case',
        questions: [{ id: 'q1', text: '是否约定违约金比例' }],
        rows: [{ documentId: 'V1', answers: { q1: { answer: '3%', sourceAnchors: [], confidence: '很高' } } }],
        privateWireKey: 'must-not-render',
      },
    })));

    expect(html).toContain('矩阵审阅');
    expect(html).toContain('当前版本不支持此工作面');
    expect(html).not.toContain('matrix-panel');
    expect(html).not.toContain('3%');
    expect(html).not.toContain('must-not-render');
  });
});
