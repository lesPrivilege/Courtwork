import * as z from 'zod';
import { ARTIFACT_TYPE_ID_PATTERN } from './artifact-type-id.js';

/** 包 id = artifact 命名空间 = 词表容器主体：小写字母开头，允许数字与连字符。 */
export const PACKAGE_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?$/;

/**
 * 包身份（ABI 拍板，入 SCHEMA-SPEC-1）：packageId + version + schemaVersion + 迁移协议。
 * schemaVersion 是包内 schema 契约的单调版本号（准入拒载的比对基准）；
 * legacyTypeAliases 是账本读侧迁移协议——append-only 历史带旧裸类型名，读取时归一，
 * 永不改写历史文件。
 */
export const PackageIdentitySchema = z
  .object({
    packageId: z.string().regex(PACKAGE_ID_PATTERN, '包 id 必须是小写命名空间形制（如 legal）'),
    version: z.string().regex(SEMVER_PATTERN, 'version 必须是 semver（如 0.1.0）'),
    schemaVersion: z.number().int().positive(),
    legacyTypeAliases: z
      .record(
        z.string().min(1),
        z.string().regex(ARTIFACT_TYPE_ID_PATTERN, '别名目标必须是 namespaced id'),
      )
      .optional(),
  })
  .strict()
  .meta({
    title: 'PackageIdentity',
    description: '垂类包身份：id/版本/schema 版本/账本读侧迁移别名表。同 id 拒载在 ABI 准入层执行。',
  });

export type PackageIdentity = z.infer<typeof PackageIdentitySchema>;
