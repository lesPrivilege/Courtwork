import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { freezeViewModel } from '../projection/view-model.js';
import {
  GALLERY_SPECIMEN_KINDS,
  VisualizationGallery,
  type VisualizationGalleryView,
} from './VisualizationGallery.js';

const STATES = ['implemented', 'candidate', 'deferred'] as const;
const view: VisualizationGalleryView = freezeViewModel({
  title: 'Schema Visualization Kit',
  provenance: '非业务数据 · 由 demo/test composition 注入',
  specimens: GALLERY_SPECIMEN_KINDS.map((kind, index) => ({
    id: `specimen-${index + 1}`,
    kind,
    title: `结构样板 ${index + 1}`,
    state: index === 2 ? 'implemented' : STATES[(index % 2) + 1],
    lines: ['字段 A', '字段 B', '来源可核对'],
    ...(index === 2 ? { primitive: { kind: 'status' as const, view: freezeViewModel({ label: '已验证', tone: 'verified' as const }) } } : {}),
  })),
});

describe('VISUAL-KIT-1 native gallery', () => {
  it('原生绘制十二族并诚实标记 implemented/candidate/deferred', () => {
    const html = renderToStaticMarkup(createElement(VisualizationGallery, { view }));
    expect(GALLERY_SPECIMEN_KINDS).toHaveLength(12);
    expect((html.match(/data-gallery-specimen=/g) ?? [])).toHaveLength(12);
    for (const state of STATES) expect(html).toContain(`data-state="${state}"`);
    expect(html).toContain('非业务数据');
    expect(html).not.toContain('<canvas');
    expect(html).not.toContain('style="background:#');
    expect(html).not.toMatch(/>\s*0\d\s*[/.·-]/);
  });

  it('拒绝没有真实 primitive 的假 implemented 样板', () => {
    const specimens = view.specimens.map((specimen, index) => index === 1
      ? { ...specimen, state: 'implemented' as const }
      : specimen);
    const fake = freezeViewModel({ ...view, specimens });
    expect(() => renderToStaticMarkup(createElement(VisualizationGallery, { view: fake }))).toThrow(/implemented/i);
  });

  it('缺失任一登记族时整面拒绝', () => {
    const missing = freezeViewModel({ ...view, specimens: view.specimens.slice(0, -1) });
    expect(() => renderToStaticMarkup(createElement(VisualizationGallery, { view: missing }))).toThrow(/12 specimens|family drift/i);
  });
});
