import { describe, expect, it } from 'vitest';
import { truncateFileName } from './truncate.js';

describe('truncateFileName', () => {
  it('returns short names unchanged', () => {
    expect(truncateFileName('合同.docx')).toBe('合同.docx');
  });

  it('middle-truncates long names while keeping the extension', () => {
    const name = '临江精铸设备采购合同_2026年修订版补充协议最终确认稿-签字页.docx';
    const out = truncateFileName(name, 28);
    expect(out.endsWith('.docx')).toBe(true);
    expect(out.includes('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(28);
  });

  it('handles names without extension', () => {
    const out = truncateFileName('abcdefghijklmnopqrstuvwxyz0123456789', 20);
    expect(out.includes('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(20);
  });
});
