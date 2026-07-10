import {
  assertWorkDraftWritable,
  workDraftPath,
  type CasePathResult,
} from '@courtwork/tools/case-path';

export interface WorkDraft {
  id: string;
  caseId: string;
  caseRoot: string;
  /** 相对案件根，如 工作稿/庭前笔记.md */
  fileName: string;
  title: string;
  /** 纯文本正文（md/txt） */
  content: string;
  updatedAt: string;
  absolutePath: string;
}

export interface WorkDraftWriteResult {
  ok: true;
  draft: WorkDraft;
}

export type WorkDraftDenied = {
  ok: false;
  message: string;
  code: string;
};

const drafts = new Map<string, WorkDraft>();

function denial(result: Extract<CasePathResult, { ok: false }>): WorkDraftDenied {
  return { ok: false, message: result.message, code: result.code };
}

function ensureMdOrTxt(fileName: string): string {
  const trimmed = fileName.trim();
  if (/\.(md|txt)$/i.test(trimmed)) return trimmed;
  return `${trimmed}.md`;
}

/**
 * 工作稿轨内存存储（浏览器/演示）。
 * 所有写入路径必须通过 assertWorkDraftWritable——原件与产出区结构上不可写。
 */
export const workDraftStore = {
  list(caseId: string): WorkDraft[] {
    return [...drafts.values()]
      .filter((item) => item.caseId === caseId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  get(id: string): WorkDraft | undefined {
    return drafts.get(id);
  },

  create(input: {
    caseId: string;
    caseRoot: string;
    title: string;
    fileName?: string;
    content?: string;
  }): WorkDraftWriteResult | WorkDraftDenied {
    const fileName = ensureMdOrTxt(input.fileName ?? `${input.title || '未命名工作稿'}`);
    const absolutePath = workDraftPath(input.caseRoot, fileName);
    const gate = assertWorkDraftWritable(input.caseRoot, absolutePath);
    if (!gate.ok) return denial(gate);

    const now = new Date().toISOString();
    const draft: WorkDraft = {
      id: `wd-${now}-${Math.random().toString(36).slice(2, 8)}`,
      caseId: input.caseId,
      caseRoot: input.caseRoot,
      fileName,
      title: input.title.trim() || fileName.replace(/\.(md|txt)$/i, ''),
      content: input.content ?? '',
      updatedAt: now,
      absolutePath: gate.absolute,
    };
    drafts.set(draft.id, draft);
    return { ok: true, draft };
  },

  /**
   * 自动保存。若调用方传入越界/原件路径，硬拒绝（不静默改写到工作稿）。
   */
  save(id: string, patch: { title?: string; content?: string; absolutePath?: string }): WorkDraftWriteResult | WorkDraftDenied {
    const existing = drafts.get(id);
    if (!existing) {
      return { ok: false, code: 'not_found', message: '找不到该工作稿。' };
    }

    const absolutePath = patch.absolutePath ?? existing.absolutePath;
    const gate = assertWorkDraftWritable(existing.caseRoot, absolutePath);
    if (!gate.ok) return denial(gate);

    const next: WorkDraft = {
      ...existing,
      title: patch.title ?? existing.title,
      content: patch.content ?? existing.content,
      absolutePath: gate.absolute,
      updatedAt: new Date().toISOString(),
    };
    drafts.set(id, next);
    return { ok: true, draft: next };
  },

  /** 测试用：尝试写入任意路径（应被白名单挡住） */
  attemptWriteAt(caseRoot: string, absolutePath: string, content: string): WorkDraftWriteResult | WorkDraftDenied {
    const gate = assertWorkDraftWritable(caseRoot, absolutePath);
    if (!gate.ok) return denial(gate);
    return this.create({
      caseId: 'probe',
      caseRoot,
      title: 'probe',
      fileName: absolutePath.split('/').pop() ?? 'probe.md',
      content,
    });
  },

  clear() {
    drafts.clear();
  },
};
