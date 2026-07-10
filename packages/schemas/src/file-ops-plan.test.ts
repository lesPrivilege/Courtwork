import { describe, expect, it } from 'vitest';
import { FileOpsPlanSchema, FileOpsVerbEnum } from './file-ops-plan.js';

const base = {
  id: 'plan-1',
  caseId: 'case-demo',
  caseRoot: '/tmp/case',
  createdAt: '2026-07-10T12:00:00.000Z',
};

describe('FileOpsVerbEnum — 销毁级永不', () => {
  it('only allows move/rename/copy/mkdir', () => {
    expect(FileOpsVerbEnum.options).toEqual(['move', 'rename', 'copy', 'mkdir']);
  });

  it('rejects delete and overwrite at the type boundary', () => {
    expect(FileOpsVerbEnum.safeParse('delete').success).toBe(false);
    expect(FileOpsVerbEnum.safeParse('overwrite').success).toBe(false);
    expect(FileOpsVerbEnum.safeParse('rm').success).toBe(false);
  });
});

describe('FileOpsPlanSchema', () => {
  it('accepts a mixed plan with selected move/rename/copy/mkdir', () => {
    const result = FileOpsPlanSchema.safeParse({
      ...base,
      title: '入库整理',
      entries: [
        {
          id: 'e1',
          verb: 'move',
          sourcePath: '/tmp/case/inbox/a.pdf',
          targetPath: '/tmp/case/原件/a.pdf',
          reason: '归入原件',
          selected: true,
          originalFileName: 'a.pdf',
        },
        {
          id: 'e2',
          verb: 'rename',
          sourcePath: '/tmp/case/原件/合同v2.docx',
          targetPath: '/tmp/case/原件/设备采购合同.docx',
          reason: '规范命名',
          selected: true,
          originalFileName: '合同v2.docx',
        },
        {
          id: 'e3',
          verb: 'copy',
          sourcePath: '/tmp/case/原件/a.pdf',
          targetPath: '/tmp/case/产出/a-副本.pdf',
          reason: '备份至产出',
          selected: false,
        },
        {
          id: 'e4',
          verb: 'mkdir',
          targetPath: '/tmp/case/重复项',
          reason: '隔离重复件',
          selected: true,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts content hash fields for move provenance', () => {
    const result = FileOpsPlanSchema.safeParse({
      ...base,
      entries: [
        {
          id: 'e1',
          verb: 'move',
          sourcePath: '/tmp/case/x.pdf',
          targetPath: '/tmp/case/原件/x.pdf',
          reason: '归卷',
          selected: true,
          contentHashBefore: 'abc',
          contentHashAfter: 'abc',
          originalFileName: 'x.pdf',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty entries', () => {
    const result = FileOpsPlanSchema.safeParse({ ...base, entries: [] });
    expect(result.success).toBe(false);
  });

  it('rejects move without sourcePath', () => {
    const result = FileOpsPlanSchema.safeParse({
      ...base,
      entries: [
        {
          id: 'e1',
          verb: 'move',
          targetPath: '/tmp/case/原件/a.pdf',
          reason: '归卷',
          selected: true,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects mkdir with sourcePath', () => {
    const result = FileOpsPlanSchema.safeParse({
      ...base,
      entries: [
        {
          id: 'e1',
          verb: 'mkdir',
          sourcePath: '/tmp/case/x',
          targetPath: '/tmp/case/重复项',
          reason: '建目录',
          selected: true,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown verb delete', () => {
    const result = FileOpsPlanSchema.safeParse({
      ...base,
      entries: [
        {
          id: 'e1',
          verb: 'delete',
          sourcePath: '/tmp/case/a.pdf',
          targetPath: '/tmp/case/trash/a.pdf',
          reason: '删除',
          selected: true,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty reason', () => {
    const result = FileOpsPlanSchema.safeParse({
      ...base,
      entries: [
        {
          id: 'e1',
          verb: 'copy',
          sourcePath: '/tmp/case/a.pdf',
          targetPath: '/tmp/case/b.pdf',
          reason: '',
          selected: true,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing caseRoot', () => {
    const result = FileOpsPlanSchema.safeParse({
      id: 'plan-1',
      caseId: 'c',
      createdAt: '2026-07-10T12:00:00.000Z',
      entries: [
        {
          id: 'e1',
          verb: 'mkdir',
          targetPath: '/x',
          reason: '建目录',
          selected: true,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
