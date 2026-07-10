import { describe, expect, it } from 'vitest';
import { computeTextLayerVersion } from './text-layer-version.js';

describe('computeTextLayerVersion', () => {
  it('相同命名空间与文本产出相同结果（确定性）', () => {
    const a = computeTextLayerVersion('reading-view-docx@1', '正文内容');
    const b = computeTextLayerVersion('reading-view-docx@1', '正文内容');
    expect(a).toBe(b);
  });

  it('文本不同则结果不同（内容哈希起效）', () => {
    const a = computeTextLayerVersion('reading-view-docx@1', '正文内容一');
    const b = computeTextLayerVersion('reading-view-docx@1', '正文内容二');
    expect(a).not.toBe(b);
  });

  it('命名空间不同则结果不同（转换器版本号起效）', () => {
    const a = computeTextLayerVersion('reading-view-docx@1', '正文内容');
    const b = computeTextLayerVersion('reading-view-docx@2', '正文内容');
    expect(a).not.toBe(b);
  });

  it('结果以命名空间为前缀，人肉可读', () => {
    const version = computeTextLayerVersion('reading-view-pdf@1+pdfjs5.4.296', '正文');
    expect(version.startsWith('reading-view-pdf@1+pdfjs5.4.296+')).toBe(true);
  });
});
