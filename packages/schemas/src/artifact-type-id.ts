import * as z from 'zod';

/**
 * namespaced artifact 类型 id（ABI 拍板①，2026-07-12）：`<namespace>.<TypeName>`。
 * namespace = 包 id（小写字母开头，允许数字与连字符）；TypeName = PascalCase。
 * 中央 ArtifactTypeEnum 退役后，一切 artifact 类型引用走本形制；
 * 通用基座类型（SourceAnchor/RevisionEvent/EvidenceGrade）不是 artifact 类型，不受此约束。
 */
export const ARTIFACT_TYPE_ID_PATTERN = /^[a-z][a-z0-9-]*\.[A-Z][A-Za-z0-9]*$/;

export const ArtifactTypeIdSchema = z
  .string()
  .regex(ARTIFACT_TYPE_ID_PATTERN, 'artifact 类型 id 必须是 namespaced 形制（如 legal.RiskList）')
  .meta({
    title: 'ArtifactTypeId',
    description: 'namespaced artifact 类型 id：`包id.类型名`。裸类型名（旧形制）不再合法。',
  });

export type ArtifactTypeId = z.infer<typeof ArtifactTypeIdSchema>;

export function parseArtifactTypeId(id: ArtifactTypeId): { namespace: string; name: string } {
  const dot = id.indexOf('.');
  return { namespace: id.slice(0, dot), name: id.slice(dot + 1) };
}

/**
 * 账本读侧映射（迁移协议）：ledger/revision-events 为 append-only，存量事件带旧裸类型名，
 * 禁止改写历史文件——读取时经包声明的别名表归一。未登记的旧名返回 undefined（拒收，不猜）。
 */
export function normalizeArtifactTypeId(
  value: string,
  legacyAliases: Readonly<Record<string, string>>,
): ArtifactTypeId | undefined {
  if (ARTIFACT_TYPE_ID_PATTERN.test(value)) return value;
  const mapped = legacyAliases[value];
  if (mapped !== undefined && ARTIFACT_TYPE_ID_PATTERN.test(mapped)) return mapped;
  return undefined;
}
