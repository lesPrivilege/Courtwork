/**
 * 案件文件夹分区约定（docs/decisions/ADR-004-documents-and-files.md 双轨 + docs/decisions/ADR-004-documents-and-files.md 文件操作分级）。
 * 路径运算使用纯 POSIX 语义（不依赖 node:path），以便 desktop WebView 与 Node 测试共用。
 */

export const CASE_ZONE_DIRS = {
  /** 上传的卷宗原件：内容只读（可 reveal/open；不可经工作稿轨写入） */
  original: '原件',
  /** 产品内创建的工作稿：md/txt 可新建/编辑 + 自动保存 */
  workDraft: '工作稿',
  /** 垂类交付产出（docx 等）：可 reveal/open；不经工作稿轨写入 */
  output: '产出',
} as const;

export type CaseZone = 'original' | 'work_draft' | 'output' | 'other';

export type CasePathDenial =
  | { ok: false; code: 'outside_case'; message: string }
  | { ok: false; code: 'original_write_forbidden'; message: string }
  | { ok: false; code: 'not_work_draft_zone'; message: string }
  | { ok: false; code: 'unsupported_extension'; message: string };

export type CasePathOk = { ok: true; absolute: string; relative: string; zone: CaseZone };

export type CasePathResult = CasePathOk | CasePathDenial;

/** 将 Windows 反斜杠归一为 POSIX，便于跨平台字符串比较。 */
export function normalizeSlashes(input: string): string {
  return input.replace(/\\/g, '/');
}

function isAbsolutePath(input: string): boolean {
  const value = normalizeSlashes(input);
  return value.startsWith('/') || /^[A-Za-z]:\//.test(value);
}

/**
 * 解析为绝对 POSIX 风格路径（去掉 . / ..，合并重复斜杠）。
 * 不以进程 cwd 为基准——相对路径会按字面拼接 base。
 */
export function resolvePath(base: string, target: string): string {
  const normalizedTarget = normalizeSlashes(target);
  const absolute = isAbsolutePath(normalizedTarget)
    ? normalizedTarget
    : `${normalizeSlashes(base).replace(/\/+$/, '')}/${normalizedTarget.replace(/^\/+/, '')}`;

  const isWin = /^[A-Za-z]:\//.test(absolute);
  const prefix = isWin ? absolute.slice(0, 2) : absolute.startsWith('/') ? '' : '';
  const body = isWin ? absolute.slice(2) : absolute;
  const parts = body.split('/').filter((part) => part.length > 0 && part !== '.');
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      if (stack.length > 0) stack.pop();
      continue;
    }
    stack.push(part);
  }
  if (isWin) return `${prefix}/${stack.join('/')}`;
  return `/${stack.join('/')}`;
}

export function joinPath(...parts: string[]): string {
  if (parts.length === 0) return '';
  const [head, ...rest] = parts;
  let current = normalizeSlashes(head);
  for (const part of rest) {
    const next = normalizeSlashes(part).replace(/^\/+/, '');
    current = current.endsWith('/') ? `${current}${next}` : `${current}/${next}`;
  }
  return current.replace(/\/+/g, '/');
}

export function basenamePath(input: string): string {
  const normalized = normalizeSlashes(input).replace(/\/+$/, '');
  const idx = normalized.lastIndexOf('/');
  return idx === -1 ? normalized : normalized.slice(idx + 1);
}

export function extnamePath(input: string): string {
  const base = basenamePath(input);
  const idx = base.lastIndexOf('.');
  if (idx <= 0) return '';
  return base.slice(idx).toLowerCase();
}

/** 计算 relative；若 target 不在 root 下返回 null。 */
export function relativePath(root: string, target: string): string | null {
  const rootAbs = resolvePath('/', normalizeSlashes(root));
  const targetAbs = resolvePath('/', normalizeSlashes(target));
  const rootPrefix = rootAbs === '/' ? '/' : `${rootAbs}/`;
  if (targetAbs === rootAbs) return '.';
  if (!targetAbs.startsWith(rootPrefix)) return null;
  return targetAbs.slice(rootPrefix.length);
}

/** 规范化案件根与目标路径，并判定是否落在案件文件夹内（含自身）。 */
export function resolveWithinCase(caseRoot: string, targetPath: string): CasePathResult {
  const root = resolvePath('/', normalizeSlashes(caseRoot));
  const absolute = resolvePath(root, normalizeSlashes(targetPath));
  const relative = relativePath(root, absolute);

  if (relative === null) {
    return {
      ok: false,
      code: 'outside_case',
      message: '路径不在本案文件夹内，已拒绝打开。',
    };
  }

  return {
    ok: true,
    absolute,
    relative,
    zone: classifyZone(relative),
  };
}

/** 按相对路径首段分区。 */
export function classifyZone(relativePathValue: string): CaseZone {
  if (relativePathValue === '.' || relativePathValue === '') return 'other';
  const first = relativePathValue.split('/').find((segment) => segment.length > 0) ?? '';
  if (first === CASE_ZONE_DIRS.original) return 'original';
  if (first === CASE_ZONE_DIRS.workDraft) return 'work_draft';
  if (first === CASE_ZONE_DIRS.output) return 'output';
  return 'other';
}

/**
 * reveal-in-folder / open-file 白名单：任意案件文件夹内路径均可（含原件只读打开）。
 * 越界一律拒绝，不静默。
 */
export function assertRevealOrOpenAllowed(caseRoot: string, targetPath: string): CasePathResult {
  return resolveWithinCase(caseRoot, targetPath);
}

/**
 * 工作稿轨写入白名单（docs/decisions/ADR-004-documents-and-files.md 原件只读红线）：
 * 1）必须在案件文件夹内；2）必须在「工作稿」子目录；3）扩展名仅 .md / .txt；
 * 4）分区为 original 时结构上拒绝。
 */
export function assertWorkDraftWritable(caseRoot: string, targetPath: string): CasePathResult {
  const resolved = resolveWithinCase(caseRoot, targetPath);
  if (!resolved.ok) return resolved;

  if (resolved.zone === 'original') {
    return {
      ok: false,
      code: 'original_write_forbidden',
      message: '卷宗原件不可修改，已拒绝写入。',
    };
  }

  if (resolved.zone !== 'work_draft') {
    return {
      ok: false,
      code: 'not_work_draft_zone',
      message: '仅可在「工作稿」文件夹内新建或编辑笔记与草稿。',
    };
  }

  const ext = extnamePath(resolved.absolute);
  if (ext !== '.md' && ext !== '.txt') {
    return {
      ok: false,
      code: 'unsupported_extension',
      message: '工作稿仅支持 Markdown（.md）或纯文本（.txt）。',
    };
  }

  return resolved;
}

/** 案件内标准分区绝对路径。 */
export function caseZonePath(caseRoot: string, zone: keyof typeof CASE_ZONE_DIRS): string {
  return joinPath(resolvePath('/', normalizeSlashes(caseRoot)), CASE_ZONE_DIRS[zone]);
}

export function workDraftPath(caseRoot: string, fileName: string): string {
  return joinPath(caseZonePath(caseRoot, 'workDraft'), fileName);
}

export function outputPath(caseRoot: string, fileName = ''): string {
  return fileName
    ? joinPath(caseZonePath(caseRoot, 'output'), fileName)
    : caseZonePath(caseRoot, 'output');
}

export function originalPath(caseRoot: string, fileName: string): string {
  return joinPath(caseZonePath(caseRoot, 'original'), fileName);
}
