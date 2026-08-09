import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createLegalWorkSurface } from './legal-work-surface.js';

/** 驱动只在此处被重新识型；壳把它当不透明体，故这一枚校验是唯一的把关处。 */
const surface = createLegalWorkSurface({ workCommand: {} as never });

describe('垂类工作面驱动的装配边界（GENERIC-PACK-1 ⑤）', () => {
  it('Provider 收到外来驱动值即抛，不静默渲染成「没有驱动」', () => {
    for (const foreign of [{}, { other: 1 }, null, 'legal', 42]) {
      expect(() => renderToStaticMarkup(
        createElement(surface.Provider, { value: foreign, children: null }),
      )).toThrow(/foreign driver value/);
    }
  });

  it('携本驱动自有形状的值可挂载——校验不是「一律拒绝」的空门', () => {
    expect(() => renderToStaticMarkup(
      createElement(surface.Provider, { value: { submission: {} }, children: null }),
    )).not.toThrow();
  });
});
