import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_CASE_ROOT, DEMO_ORIGINALS, DEMO_OUTPUT_DOCX } from './demo-case-layout';
import { workDraftStore } from './work-draft-store';

describe('workDraftStore — 工作稿轨与原件只读', () => {
  beforeEach(() => {
    workDraftStore.clear();
  });

  it('creates md work drafts under 工作稿', () => {
    const result = workDraftStore.create({
      caseId: 'demo',
      caseRoot: DEMO_CASE_ROOT,
      title: '庭前笔记',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.draft.absolutePath).toContain('/工作稿/');
      expect(result.draft.absolutePath.endsWith('.md')).toBe(true);
      expect(result.draft.fileName).toBe('庭前笔记.md');
    }
  });

  it('auto-saves content on work draft paths', () => {
    const created = workDraftStore.create({
      caseId: 'demo',
      caseRoot: DEMO_CASE_ROOT,
      title: '备忘',
      fileName: '备忘.txt',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const saved = workDraftStore.save(created.draft.id, { content: '明天核对验收条款' });
    expect(saved.ok).toBe(true);
    if (saved.ok) expect(saved.draft.content).toBe('明天核对验收条款');
  });

  it('structurally rejects writes to originals', () => {
    const result = workDraftStore.attemptWriteAt(
      DEMO_CASE_ROOT,
      DEMO_ORIGINALS[0].path,
      '篡改原件',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('original_write_forbidden');
      expect(result.message).toContain('原件不可修改');
    }
  });

  it('structurally rejects writes to output zone', () => {
    const result = workDraftStore.attemptWriteAt(DEMO_CASE_ROOT, DEMO_OUTPUT_DOCX, 'nope');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('not_work_draft_zone');
  });

  it('rejects save that retargets path into 原件', () => {
    const created = workDraftStore.create({
      caseId: 'demo',
      caseRoot: DEMO_CASE_ROOT,
      title: '笔记',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const hijack = workDraftStore.save(created.draft.id, {
      absolutePath: DEMO_ORIGINALS[1].path,
      content: 'evil',
    });
    expect(hijack.ok).toBe(false);
    if (!hijack.ok) expect(hijack.code).toBe('original_write_forbidden');
  });
});
