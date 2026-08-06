import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VerticalArtifactUnloadedView } from './vertical-artifact-unloaded';

describe('VerticalArtifactUnloadedView（ADR-015 决定四：垂类产物包未加载的显式退化）', () => {
  it('诚实呈现产物存在＋加载提示，零伪装通用产物', () => {
    const html = renderToStaticMarkup(createElement(VerticalArtifactUnloadedView, {
      title: '风险清单',
      packageId: 'legal',
    }));
    expect(html).toContain('风险清单');
    expect(html).toContain('该产出由 legal 包生成 · 加载 legal 包以获得结构化视图');
    expect(html).toContain('data-testid="vertical-artifact-unloaded"');
    expect(html).not.toContain('当前版本不支持');
  });
});
