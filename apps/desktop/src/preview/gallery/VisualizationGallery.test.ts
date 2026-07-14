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
    state: STATES[index % STATES.length],
    lines: ['字段 A', '字段 B', '来源可核对'],
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
  });
});
