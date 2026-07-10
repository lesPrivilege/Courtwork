import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_CASE_ROOT, DEMO_OUTPUT_DIR, DEMO_OUTPUT_DOCX, DEMO_ORIGINALS } from './demo-case-layout';
import { systemOpenClient } from './system-open-client';

describe('systemOpenClient (browser mock host)', () => {
  beforeEach(() => {
    systemOpenClient.resetBrowserLog();
  });

  it('reveal-in-folder returns 已在访达中显示 for case output', async () => {
    const feedback = await systemOpenClient.revealInFolder(DEMO_OUTPUT_DOCX, DEMO_CASE_ROOT);
    expect(feedback).toEqual({ ok: true, message: '已在访达中显示' });
    expect(systemOpenClient.getBrowserLog().reveals).toEqual([DEMO_OUTPUT_DOCX]);
  });

  it('open-file returns filename feedback', async () => {
    const feedback = await systemOpenClient.openFile(DEMO_OUTPUT_DOCX, DEMO_CASE_ROOT);
    expect(feedback.ok).toBe(true);
    if (feedback.ok) {
      expect(feedback.message).toBe('已为您打开〔合同审查报告.docx〕');
    }
    expect(systemOpenClient.getBrowserLog().opens).toEqual([DEMO_OUTPUT_DOCX]);
  });

  it('rejects out-of-case paths without silent success', async () => {
    const feedback = await systemOpenClient.revealInFolder('/tmp/outside', DEMO_CASE_ROOT);
    expect(feedback.ok).toBe(false);
    if (!feedback.ok) {
      expect(feedback.message).toContain('不在本案文件夹内');
    }
    expect(systemOpenClient.getBrowserLog().reveals).toEqual([]);
  });

  it('allows reveal of output directory and originals (read)', async () => {
    const dir = await systemOpenClient.revealInFolder(DEMO_OUTPUT_DIR, DEMO_CASE_ROOT);
    expect(dir.ok).toBe(true);
    const original = await systemOpenClient.openFile(DEMO_ORIGINALS[0].path, DEMO_CASE_ROOT);
    expect(original.ok).toBe(true);
  });
});
