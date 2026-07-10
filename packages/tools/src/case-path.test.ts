import { describe, expect, it } from 'vitest';
import {
  assertRevealOrOpenAllowed,
  assertWorkDraftWritable,
  CASE_ZONE_DIRS,
  caseZonePath,
  classifyZone,
  originalPath,
  outputPath,
  resolveWithinCase,
  workDraftPath,
} from './case-path.js';

const ROOT = '/tmp/courtwork-cases/临江案';

describe('resolveWithinCase', () => {
  it('accepts paths inside the case folder', () => {
    const target = `${ROOT}/${CASE_ZONE_DIRS.output}/报告.docx`;
    const result = resolveWithinCase(ROOT, target);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.zone).toBe('output');
      expect(result.relative).toBe(`${CASE_ZONE_DIRS.output}/报告.docx`);
    }
  });

  it('accepts the case root itself', () => {
    const result = resolveWithinCase(ROOT, ROOT);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.relative).toBe('.');
      expect(result.zone).toBe('other');
    }
  });

  it('rejects paths outside the case folder without silent pass', () => {
    const result = resolveWithinCase(ROOT, '/tmp/other/secret.txt');
    expect(result).toEqual({
      ok: false,
      code: 'outside_case',
      message: '路径不在本案文件夹内，已拒绝打开。',
    });
  });

  it('rejects parent-directory escape attempts', () => {
    const result = resolveWithinCase(ROOT, `${ROOT}/../escape.txt`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('outside_case');
  });
});

describe('classifyZone', () => {
  it('maps the three case zones', () => {
    expect(classifyZone(CASE_ZONE_DIRS.original)).toBe('original');
    expect(classifyZone(`${CASE_ZONE_DIRS.workDraft}/笔记.md`)).toBe('work_draft');
    expect(classifyZone(`${CASE_ZONE_DIRS.output}/a.docx`)).toBe('output');
    expect(classifyZone('杂项/x')).toBe('other');
  });
});

describe('assertRevealOrOpenAllowed', () => {
  it('allows originals to be revealed or opened (read path)', () => {
    const target = originalPath(ROOT, '合同.pdf');
    const result = assertRevealOrOpenAllowed(ROOT, target);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.zone).toBe('original');
  });

  it('denies out-of-case paths for reveal/open', () => {
    const result = assertRevealOrOpenAllowed(ROOT, '/etc/passwd');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('outside_case');
  });
});

describe('assertWorkDraftWritable — 原件只读红线', () => {
  it('allows md/txt under 工作稿', () => {
    const md = workDraftPath(ROOT, '庭前笔记.md');
    const txt = workDraftPath(ROOT, '备忘.txt');
    expect(assertWorkDraftWritable(ROOT, md).ok).toBe(true);
    expect(assertWorkDraftWritable(ROOT, txt).ok).toBe(true);
  });

  it('structurally rejects writes into 原件', () => {
    const result = assertWorkDraftWritable(ROOT, originalPath(ROOT, '证据.pdf'));
    expect(result).toEqual({
      ok: false,
      code: 'original_write_forbidden',
      message: '卷宗原件不可修改，已拒绝写入。',
    });
  });

  it('rejects writes into 产出 or other zones', () => {
    const output = assertWorkDraftWritable(ROOT, outputPath(ROOT, '报告.docx'));
    expect(output.ok).toBe(false);
    if (!output.ok) expect(output.code).toBe('not_work_draft_zone');

    const other = assertWorkDraftWritable(ROOT, `${ROOT}/杂项/x.md`);
    expect(other.ok).toBe(false);
    if (!other.ok) expect(other.code).toBe('not_work_draft_zone');
  });

  it('rejects non-md/txt under 工作稿', () => {
    const result = assertWorkDraftWritable(ROOT, workDraftPath(ROOT, '扫描.pdf'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('unsupported_extension');
  });

  it('rejects out-of-case writes', () => {
    const result = assertWorkDraftWritable(ROOT, '/tmp/outside.md');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('outside_case');
  });
});

describe('case zone helpers', () => {
  it('builds stable absolute zone paths', () => {
    expect(caseZonePath(ROOT, 'workDraft')).toBe(`${ROOT}/${CASE_ZONE_DIRS.workDraft}`);
    expect(outputPath(ROOT)).toBe(`${ROOT}/${CASE_ZONE_DIRS.output}`);
    expect(workDraftPath(ROOT, 'a.md')).toBe(`${ROOT}/${CASE_ZONE_DIRS.workDraft}/a.md`);
  });
});
