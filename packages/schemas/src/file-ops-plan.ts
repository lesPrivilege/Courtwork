import * as z from 'zod';

/**
 * 文件操作动词（docs/decisions/ADR-004-documents-and-files.md 三级分级）。
 * 故意 **不包含** delete / overwrite——销毁级永不进入能力面。
 * 类型层即证明：此枚举是全仓文件操作动词的唯一权威词表。
 */
export const FileOpsVerbEnum = z.enum(['move', 'rename', 'copy', 'mkdir']);
export type FileOpsVerb = z.infer<typeof FileOpsVerbEnum>;

/**
 * 整理计划单条（docs/decisions/ADR-004-documents-and-files.md 移形级计划 artifact 的行）。
 * - 勾选态 `selected`：确认门禁前用户可逐条勾选
 * - 内容哈希前后：证明移形零字节变动（原件红线精细化）
 * - originalFileName：移动/重命名后永久保留原始文件名
 */
const FileOpsPlanEntryObjectSchema = z
  .object({
    id: z.string().min(1),
    verb: FileOpsVerbEnum,
    /**
     * 源路径（案件文件夹内）。mkdir 无源；其余动词必填。
     * 路径字符串形态由消费方（tools 白名单）解释，schema 只约束非空。
     */
    sourcePath: z.string().min(1).optional(),
    /** 目标路径（案件文件夹内）。mkdir 的目标即新目录。 */
    targetPath: z.string().min(1),
    /** 整理理由（分类归档 / 规范重命名 / 版本归组 / 重复项隔离等）。 */
    reason: z.string().min(1),
    /** 勾选态：未勾选条目在执行时跳过。 */
    selected: z.boolean(),
    /** 执行前内容哈希（sha256 hex）；mkdir 无内容时可缺省。 */
    contentHashBefore: z.string().min(1).optional(),
    /** 执行后内容哈希；move/rename 应与 before 相等（证据零字节变动）。 */
    contentHashAfter: z.string().min(1).optional(),
    /** 原始文件名永久记录（docs/decisions/ADR-004-documents-and-files.md 原件红线精细化）。 */
    originalFileName: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((entry, ctx) => {
    if (entry.verb === 'mkdir') {
      if (entry.sourcePath !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['sourcePath'],
          message: 'mkdir 不得携带 sourcePath',
        });
      }
      return;
    }
    if (entry.sourcePath === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['sourcePath'],
        message: `${entry.verb} 必须携带 sourcePath`,
      });
    }
  });

export const FileOpsPlanEntrySchema = FileOpsPlanEntryObjectSchema;
export type FileOpsPlanEntry = z.infer<typeof FileOpsPlanEntrySchema>;

/**
 * 卷宗整理计划（docs/decisions/ADR-004-documents-and-files.md 杀手场景产出）。
 * 执行形状：计划 artifact → 确认门禁 → 执行 + 报告 → 一键撤销。
 * 本 schema 只描述计划本身；事务日志/撤销由 tools 执行器承载，不进 artifact。
 */
export const FileOpsPlanSchema = z
  .object({
    id: z.string().min(1),
    caseId: z.string().min(1),
    /** 案件文件夹根（白名单边界由 tools 强制）。 */
    caseRoot: z.string().min(1),
    entries: z.array(FileOpsPlanEntrySchema).min(1),
    createdAt: z.iso.datetime(),
    /** 可选标题，供 UI 计划表头展示。 */
    title: z.string().min(1).optional(),
  })
  .strict()
  .meta({
    title: 'FileOpsPlan',
    description:
      '卷宗整理计划：逐条可勾选的文件操作表（move/rename/copy/mkdir）。销毁级动词不在词表内。',
  });

export type FileOpsPlan = z.infer<typeof FileOpsPlanSchema>;
