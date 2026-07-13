# packages/schemas（W1）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 初始化 pnpm workspaces 工程底座，并交付 `packages/schemas` 的 7 个领域 schema（TS 类型 + zod 校验器 + JSON Schema 导出 + drift 测试），作为全仓库其余各层（W2–W8）依赖的契约根。

**Architecture:** 单一 pnpm workspace，目前只有 `packages/schemas` 一个真实 Node 包（其余 `packages/*` 目录仅有 `SPEC.md` 占位，pnpm 会自动跳过无 `package.json` 的目录）。每个 schema 一个源文件 + 一个同名测试文件，`SourceAnchor` 最先实现，其余 6 个 schema 通过字段引用它。JSON Schema 导出走 zod v4 原生 `z.toJSONSchema()`，每个导出文件自包含（内联展开引用的子 schema，不用跨文件 `$ref`），用一个 vitest drift 测试防止导出文件与 zod 源码不同步。

**Tech Stack:** pnpm workspaces、TypeScript 6.0.3（strict，ESM/NodeNext）、zod 4.4.3、vitest 4.1.10、ESLint 10.6.0 + typescript-eslint 8.63.0、tsx（脚本运行）。

**关键版本决定：** `typescript` 锁定在 `^6.0.3`，不跳最新的 `7.0.2`（TypeScript 团队发布的原生 Go 编译器重写版）。原因：`typescript-eslint@8.63.0` 的 `peerDependencies` 目前是 `"typescript": ">=4.8.4 <6.1.0"`，装 TS7 会导致类型感知 lint 规则在不受支持的编译器版本上运行。6.0.3 是满足该上限的最新稳定版。此决定记录在根 `package.json` 注释级别不适用（package.json 无注释），故记录于本计划与 SPEC.md 验收记录中，供后续任何一层升级 TypeScript 前先检查 typescript-eslint 的兼容范围。

---

## File Structure

```
Courtwork/
  .gitignore                              [新建]
  .nvmrc                                  [新建]
  package.json                            [新建] 根 workspace 清单 + 共享 devDependencies
  pnpm-workspace.yaml                     [新建]
  tsconfig.json                           [新建] 共享 compilerOptions 基线（不可直接编译，只供 extends）
  eslint.config.js                        [新建] 根 flat config
  vitest.config.ts                        [新建] 根测试入口，glob 覆盖所有 packages/*/src
  packages/schemas/
    package.json                          [新建]
    tsconfig.json                         [新建] extends 根 tsconfig
    SPEC.md                               [修改] 状态区 + 验收记录
    src/
      source-anchor.ts                    [新建]
      source-anchor.test.ts               [新建]
      case-file.ts                        [新建]
      case-file.test.ts                   [新建]
      timeline.ts                         [新建]
      timeline.test.ts                    [新建]
      party-graph.ts                      [新建]
      party-graph.test.ts                 [新建]
      risk-list.ts                        [新建]
      risk-list.test.ts                   [新建]
      review-matrix.ts                    [新建]
      review-matrix.test.ts               [新建]
      revision-event.ts                   [新建]
      revision-event.test.ts              [新建]
      export-json-schema.ts               [新建] SCHEMA_REGISTRY + toJSONSchemaRecord()
      json-schema-drift.test.ts           [新建]
      index.ts                            [新建] barrel，逐任务追加
    scripts/
      generate-json-schema.ts             [新建] CLI：写 json-schema/*.schema.json
    json-schema/
      SourceAnchor.schema.json            [生成并提交]
      CaseFile.schema.json                [生成并提交]
      Timeline.schema.json                [生成并提交]
      PartyGraph.schema.json              [生成并提交]
      RiskList.schema.json                [生成并提交]
      ReviewMatrix.schema.json            [生成并提交]
      RevisionEvent.schema.json           [生成并提交]
  services/ingest/SPEC.md                 [修改] TODO 区追加一行
```

---

## Task 1: 工程底座（pnpm workspace + TS + ESLint + vitest + git）

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `eslint.config.js`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.nvmrc`

- [ ] **Step 1: 创建根 `package.json`**

```json
{
  "name": "courtwork",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "test": "vitest run",
    "lint": "eslint .",
    "build": "pnpm -r run build"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/node": "^26.1.1",
    "eslint": "^10.6.0",
    "tsx": "^4.23.0",
    "typescript": "^6.0.3",
    "typescript-eslint": "^8.63.0",
    "vitest": "^4.1.10"
  }
}
```

- [ ] **Step 2: 创建 `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
```

只声明 `packages/*`：`services/ingest` 是 Python 服务，不进 pnpm workspace；`apps/desktop` 按 CLAUDE.md 要求在 core MVP 验收前不开工，其目录暂无 `package.json`，等 W9 会话启动时再加 `apps/*` glob。`packages/*` 下目前只有 `packages/schemas` 有 `package.json`，其余（core/output/registry/tools）只有 `SPEC.md`——pnpm 对无 `package.json` 的匹配目录会自动跳过，不会报错。

- [ ] **Step 3: 创建根 `tsconfig.json`（共享基线，供各包 extends，本身不直接编译）**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 4: 创建根 `eslint.config.js`（flat config）**

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/json-schema/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
```

- [ ] **Step 5: 创建根 `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts'],
  },
});
```

- [ ] **Step 6: 创建 `.gitignore`**

```
node_modules/
dist/
*.log
.DS_Store
coverage/
```

- [ ] **Step 7: 创建 `.nvmrc`**

```
22
```

- [ ] **Step 8: 初始化 git 仓库并安装依赖**

```bash
git init
pnpm install
```

Expected：`pnpm install` 生成 `pnpm-lock.yaml`，无 `ERR_PNPM` 报错（此时 workspace 里还没有 `packages/schemas/package.json`，是正常的——只装根 devDependencies）。

- [ ] **Step 9: 首次提交**

```bash
git add package.json pnpm-workspace.yaml tsconfig.json eslint.config.js vitest.config.ts .gitignore .nvmrc pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore: bootstrap pnpm workspace monorepo baseline

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: packages/schemas 包骨架

**Files:**
- Create: `packages/schemas/package.json`
- Create: `packages/schemas/tsconfig.json`

- [ ] **Step 1: 创建 `packages/schemas/package.json`**

```json
{
  "name": "@courtwork/schemas",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "generate:json-schema": "tsx scripts/generate-json-schema.ts"
  },
  "dependencies": {
    "zod": "^4.4.3"
  }
}
```

零运行时依赖原则：`dependencies` 只有 `zod`。`typescript`/`vitest`/`tsx` 都是根 devDependencies，pnpm workspace 会让它们在本包的脚本里可解析（`.bin` 由 pnpm 处理），不必在本包重复声明。

- [ ] **Step 2: 创建 `packages/schemas/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: 安装依赖**

```bash
pnpm install
```

Expected：`pnpm-lock.yaml` 更新，`packages/schemas` 出现在 workspace 成员列表里，`zod@4.4.3` 被装进 `packages/schemas/node_modules`（或 workspace 根据 pnpm 的符号链接策略解析）。

- [ ] **Step 4: 提交**

```bash
git add packages/schemas/package.json packages/schemas/tsconfig.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
feat(schemas): scaffold @courtwork/schemas package

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: SourceAnchor（地基 schema，其余 6 个都依赖它）

**Files:**
- Create: `packages/schemas/src/source-anchor.ts`
- Create: `packages/schemas/src/source-anchor.test.ts`
- Create: `packages/schemas/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/schemas/src/source-anchor.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { SourceAnchorSchema } from './source-anchor.js';

describe('SourceAnchorSchema', () => {
  it('accepts a bbox anchor with page', () => {
    const result = SourceAnchorSchema.safeParse({
      fileId: 'file-001',
      page: 3,
      bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a textRange anchor without page or bbox', () => {
    const result = SourceAnchorSchema.safeParse({
      fileId: 'file-002',
      textRange: { start: 120, end: 180 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a fully populated anchor with quote and textLayerVersion', () => {
    const result = SourceAnchorSchema.safeParse({
      fileId: 'file-003',
      page: 1,
      bbox: { x: 0, y: 0, width: 1, height: 0.1 },
      textRange: { start: 0, end: 42 },
      textLayerVersion: 'ocr-run-2026-07-01',
      quote: '本合同自双方签字盖章之日起生效。',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an anchor with neither bbox nor textRange', () => {
    const result = SourceAnchorSchema.safeParse({
      fileId: 'file-004',
      page: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a bbox anchor missing page', () => {
    const result = SourceAnchorSchema.safeParse({
      fileId: 'file-005',
      bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an anchor missing fileId', () => {
    const result = SourceAnchorSchema.safeParse({
      page: 1,
      bbox: { x: 0, y: 0, width: 0.5, height: 0.5 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a bbox with non-positive width', () => {
    const result = SourceAnchorSchema.safeParse({
      fileId: 'file-006',
      page: 1,
      bbox: { x: 0, y: 0, width: 0, height: 0.2 },
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- packages/schemas/src/source-anchor.test.ts`
Expected: FAIL —— 找不到模块 `./source-anchor.js`（`source-anchor.ts` 尚不存在）。

- [ ] **Step 3: 实现 `packages/schemas/src/source-anchor.ts`**

```ts
import * as z from 'zod';

const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

const TextRangeSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
});

const SourceAnchorObjectSchema = z.object({
  fileId: z.string().min(1),
  page: z.number().int().positive().optional(),
  bbox: BoundingBoxSchema.optional(),
  textRange: TextRangeSchema.optional(),
  /**
   * 本区间相对哪个 OCR 文本层版本（版本号或内容哈希，由 ingest 侧填写）。
   * 重跑 OCR 会导致文本层重新分段，旧的 textRange 偏移量随之失配；
   * 该字段用于标记 textRange 的有效范围，现在加是一个字段的成本，
   * 以后加是全量数据迁移的成本。
   */
  textLayerVersion: z.string().optional(),
  /**
   * 展示与重锚定辅助用的可读原文片段，不是权威定位器。
   * 权威定位只认 bbox / textRange；quote 不参与匹配逻辑，仅供 UI 显示
   * 或在源文件不可达时提供可读上下文。
   */
  quote: z.string().optional(),
});

export const SourceAnchorSchema = SourceAnchorObjectSchema.refine(
  (value) => value.bbox !== undefined || value.textRange !== undefined,
  {
    message: 'bbox 与 textRange 至少提供一个，否则不构成可溯源锚点',
    path: ['bbox'],
  },
)
  .refine((value) => value.bbox === undefined || value.page !== undefined, {
    message: 'bbox 存在时 page 必填：无页码的坐标区域没有意义',
    path: ['page'],
  })
  .meta({
    title: 'SourceAnchor',
    description:
      '来源引用锚：一切可溯源交互的地基。定位到具体文件的页面坐标区域（bbox）和/或文本层字符区间（textRange）。quote 仅作展示与重锚定辅助，不是权威定位器。',
  });

export type SourceAnchor = z.infer<typeof SourceAnchorSchema>;
```

- [ ] **Step 4: 创建 barrel `packages/schemas/src/index.ts`**

```ts
export * from './source-anchor.js';
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `pnpm test -- packages/schemas/src/source-anchor.test.ts`
Expected: PASS —— 7 tests passed。

- [ ] **Step 6: 提交**

```bash
git add packages/schemas/src/source-anchor.ts packages/schemas/src/source-anchor.test.ts packages/schemas/src/index.ts
git commit -m "$(cat <<'EOF'
feat(schemas): add SourceAnchor schema

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: CaseFile

**Files:**
- Create: `packages/schemas/src/case-file.ts`
- Create: `packages/schemas/src/case-file.test.ts`
- Modify: `packages/schemas/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/schemas/src/case-file.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { CaseFileSchema } from './case-file.js';

describe('CaseFileSchema', () => {
  it('accepts a case file with an empty file list', () => {
    const result = CaseFileSchema.safeParse({
      caseId: 'case-001',
      files: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a case file with one pending entry', () => {
    const result = CaseFileSchema.safeParse({
      caseId: 'case-002',
      files: [
        {
          fileId: 'file-001',
          fileName: '起诉状.pdf',
          documentType: 'complaint',
          ingestStatus: 'pending',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts multiple entries with mixed statuses and pageCount', () => {
    const result = CaseFileSchema.safeParse({
      caseId: 'case-003',
      files: [
        {
          fileId: 'file-001',
          fileName: '起诉状.pdf',
          documentType: 'complaint',
          ingestStatus: 'done',
          pageCount: 4,
        },
        {
          fileId: 'file-002',
          fileName: '证据材料.pdf',
          documentType: 'evidence',
          ingestStatus: 'processing',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a case file missing caseId', () => {
    const result = CaseFileSchema.safeParse({
      files: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an entry with an invalid ingestStatus', () => {
    const result = CaseFileSchema.safeParse({
      caseId: 'case-004',
      files: [
        {
          fileId: 'file-001',
          fileName: '起诉状.pdf',
          documentType: 'complaint',
          ingestStatus: 'unknown-status',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an entry missing fileName', () => {
    const result = CaseFileSchema.safeParse({
      caseId: 'case-005',
      files: [
        {
          fileId: 'file-001',
          documentType: 'complaint',
          ingestStatus: 'pending',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an entry with a non-positive pageCount', () => {
    const result = CaseFileSchema.safeParse({
      caseId: 'case-006',
      files: [
        {
          fileId: 'file-001',
          fileName: '起诉状.pdf',
          documentType: 'complaint',
          ingestStatus: 'pending',
          pageCount: 0,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- packages/schemas/src/case-file.test.ts`
Expected: FAIL —— 找不到模块 `./case-file.js`。

- [ ] **Step 3: 实现 `packages/schemas/src/case-file.ts`**

```ts
import * as z from 'zod';

export const IngestStatusEnum = z.enum(['pending', 'processing', 'done', 'failed']);
export type IngestStatus = z.infer<typeof IngestStatusEnum>;

const CaseFileEntrySchema = z.object({
  fileId: z.string().min(1),
  fileName: z.string().min(1),
  /**
   * 文书类型分类。刻意不设枚举：真实分类体系由 ingest（W8）的分类器
   * 结果决定，在此提前锁定会在分类体系调整时构成 breaking change。
   */
  documentType: z.string().min(1),
  ingestStatus: IngestStatusEnum,
  pageCount: z.number().int().positive().optional(),
});
export type CaseFileEntry = z.infer<typeof CaseFileEntrySchema>;

export const CaseFileSchema = z
  .object({
    caseId: z.string().min(1),
    files: z.array(CaseFileEntrySchema),
  })
  .meta({
    title: 'CaseFile',
    description: '案件档案：卷内文件清单、文书类型分类、摄取状态。',
  });

export type CaseFile = z.infer<typeof CaseFileSchema>;
```

- [ ] **Step 4: 追加 barrel 导出，`packages/schemas/src/index.ts` 变为**

```ts
export * from './source-anchor.js';
export * from './case-file.js';
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `pnpm test -- packages/schemas/src/case-file.test.ts`
Expected: PASS —— 7 tests passed。

- [ ] **Step 6: 提交**

```bash
git add packages/schemas/src/case-file.ts packages/schemas/src/case-file.test.ts packages/schemas/src/index.ts
git commit -m "$(cat <<'EOF'
feat(schemas): add CaseFile schema

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Timeline

**Files:**
- Create: `packages/schemas/src/timeline.ts`
- Create: `packages/schemas/src/timeline.test.ts`
- Modify: `packages/schemas/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/schemas/src/timeline.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { TimelineSchema } from './timeline.js';

describe('TimelineSchema', () => {
  it('accepts an event with an exact date', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-001',
      events: [
        {
          id: 'evt-001',
          description: '签订合同',
          date: { kind: 'exact', date: '2024-03-15' },
          sourceAnchors: [{ fileId: 'file-001', page: 1, bbox: { x: 0, y: 0, width: 0.5, height: 0.1 } }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an event with a fuzzy date range', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-002',
      events: [
        {
          id: 'evt-002',
          description: '双方开始协商',
          date: {
            kind: 'fuzzy',
            text: '2024年初',
            rangeStart: '2024-01-01',
            rangeEnd: '2024-02-29',
          },
          sourceAnchors: [{ fileId: 'file-002', textRange: { start: 0, end: 10 } }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an event with multiple partyIds and sourceAnchors', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-003',
      events: [
        {
          id: 'evt-003',
          description: '双方代表会面',
          date: { kind: 'exact', date: '2024-05-01' },
          partyIds: ['party-001', 'party-002'],
          sourceAnchors: [
            { fileId: 'file-003', page: 2, bbox: { x: 0, y: 0, width: 1, height: 0.2 } },
            { fileId: 'file-004', textRange: { start: 5, end: 20 } },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an event with zero sourceAnchors', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-004',
      events: [
        {
          id: 'evt-004',
          description: '无来源事件',
          date: { kind: 'exact', date: '2024-01-01' },
          sourceAnchors: [],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a fuzzy date missing text', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-005',
      events: [
        {
          id: 'evt-005',
          description: '模糊日期缺文本',
          date: { kind: 'fuzzy' },
          sourceAnchors: [{ fileId: 'file-005', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid date kind literal', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-006',
      events: [
        {
          id: 'evt-006',
          description: '非法 kind',
          date: { kind: 'approximate', text: '大概三月' },
          sourceAnchors: [{ fileId: 'file-006', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an event missing description', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-007',
      events: [
        {
          id: 'evt-007',
          date: { kind: 'exact', date: '2024-01-01' },
          sourceAnchors: [{ fileId: 'file-007', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- packages/schemas/src/timeline.test.ts`
Expected: FAIL —— 找不到模块 `./timeline.js`。

- [ ] **Step 3: 实现 `packages/schemas/src/timeline.ts`**

```ts
import * as z from 'zod';
import { SourceAnchorSchema } from './source-anchor.js';

const EventDateSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('exact'), date: z.iso.date() }),
  z.object({
    kind: z.literal('fuzzy'),
    text: z.string().min(1),
    rangeStart: z.iso.date().optional(),
    rangeEnd: z.iso.date().optional(),
  }),
]);
export type EventDate = z.infer<typeof EventDateSchema>;

const TimelineEventSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  date: EventDateSchema,
  partyIds: z.array(z.string().min(1)).default([]),
  /** 事件必须至少有一个来源锚点：没有证据支撑的"事件"在法律审阅场景下不可信。 */
  sourceAnchors: z.array(SourceAnchorSchema).min(1),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const TimelineSchema = z
  .object({
    caseId: z.string().min(1),
    events: z.array(TimelineEventSchema),
  })
  .meta({
    title: 'Timeline',
    description: '事件时间线：事件 + 日期（含模糊日期表达）+ 当事人关联 + 来源锚点。',
  });

export type Timeline = z.infer<typeof TimelineSchema>;
```

- [ ] **Step 4: 追加 barrel 导出，`packages/schemas/src/index.ts` 变为**

```ts
export * from './source-anchor.js';
export * from './case-file.js';
export * from './timeline.js';
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `pnpm test -- packages/schemas/src/timeline.test.ts`
Expected: PASS —— 7 tests passed。

- [ ] **Step 6: 提交**

```bash
git add packages/schemas/src/timeline.ts packages/schemas/src/timeline.test.ts packages/schemas/src/index.ts
git commit -m "$(cat <<'EOF'
feat(schemas): add Timeline schema

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: PartyGraph

**Files:**
- Create: `packages/schemas/src/party-graph.ts`
- Create: `packages/schemas/src/party-graph.test.ts`
- Modify: `packages/schemas/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/schemas/src/party-graph.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { PartyGraphSchema } from './party-graph.js';

describe('PartyGraphSchema', () => {
  it('accepts a single individual node with no edges', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-001',
      nodes: [{ id: 'party-001', kind: 'individual', primaryName: '张三' }],
      edges: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an organization node with aliases', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-002',
      nodes: [
        {
          id: 'party-002',
          kind: 'organization',
          primaryName: '某某有限公司',
          aliases: ['某某公司', '某某有限责任公司'],
        },
      ],
      edges: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts two nodes connected by an edge with sourceAnchors', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-003',
      nodes: [
        { id: 'party-003', kind: 'individual', primaryName: '李四' },
        { id: 'party-004', kind: 'organization', primaryName: '某某银行' },
      ],
      edges: [
        {
          id: 'edge-001',
          sourcePartyId: 'party-003',
          targetPartyId: 'party-004',
          relationType: '债务人',
          sourceAnchors: [{ fileId: 'file-001', page: 1, bbox: { x: 0, y: 0, width: 0.5, height: 0.1 } }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a node with an invalid kind', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-004',
      nodes: [{ id: 'party-005', kind: 'robot', primaryName: '张三' }],
      edges: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an edge with zero sourceAnchors', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-005',
      nodes: [
        { id: 'party-006', kind: 'individual', primaryName: '王五' },
        { id: 'party-007', kind: 'individual', primaryName: '赵六' },
      ],
      edges: [
        {
          id: 'edge-002',
          sourcePartyId: 'party-006',
          targetPartyId: 'party-007',
          relationType: '担保人',
          sourceAnchors: [],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a node missing primaryName', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-006',
      nodes: [{ id: 'party-008', kind: 'individual' }],
      edges: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an edge missing sourcePartyId', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-007',
      nodes: [{ id: 'party-009', kind: 'individual', primaryName: '孙七' }],
      edges: [
        {
          id: 'edge-003',
          targetPartyId: 'party-009',
          relationType: '原告',
          sourceAnchors: [{ fileId: 'file-002', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- packages/schemas/src/party-graph.test.ts`
Expected: FAIL —— 找不到模块 `./party-graph.js`。

- [ ] **Step 3: 实现 `packages/schemas/src/party-graph.ts`**

```ts
import * as z from 'zod';
import { SourceAnchorSchema } from './source-anchor.js';

export const PartyKindEnum = z.enum(['individual', 'organization']);
export type PartyKind = z.infer<typeof PartyKindEnum>;

const PartyNodeSchema = z.object({
  id: z.string().min(1),
  kind: PartyKindEnum,
  primaryName: z.string().min(1),
  /** 别名数组：服务跨文档实体对齐（同一当事人在不同文书中的不同写法归一）。 */
  aliases: z.array(z.string().min(1)).default([]),
});
export type PartyNode = z.infer<typeof PartyNodeSchema>;

const PartyEdgeSchema = z.object({
  id: z.string().min(1),
  sourcePartyId: z.string().min(1),
  targetPartyId: z.string().min(1),
  /** 关系类型：开放字符串，法律关系类型繁多，不在 schema 层预设枚举。 */
  relationType: z.string().min(1),
  /** 关系必须至少有一个来源锚点：一条关系断言应当有证据支撑。 */
  sourceAnchors: z.array(SourceAnchorSchema).min(1),
});
export type PartyEdge = z.infer<typeof PartyEdgeSchema>;

export const PartyGraphSchema = z
  .object({
    caseId: z.string().min(1),
    nodes: z.array(PartyNodeSchema),
    edges: z.array(PartyEdgeSchema),
  })
  .meta({
    title: 'PartyGraph',
    description: '当事人关系图谱：节点（自然人/法人 + 别名数组）+ 边（关系类型 + 证据锚点）。',
  });

export type PartyGraph = z.infer<typeof PartyGraphSchema>;
```

- [ ] **Step 4: 追加 barrel 导出，`packages/schemas/src/index.ts` 变为**

```ts
export * from './source-anchor.js';
export * from './case-file.js';
export * from './timeline.js';
export * from './party-graph.js';
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `pnpm test -- packages/schemas/src/party-graph.test.ts`
Expected: PASS —— 7 tests passed。

- [ ] **Step 6: 提交**

```bash
git add packages/schemas/src/party-graph.ts packages/schemas/src/party-graph.test.ts packages/schemas/src/index.ts
git commit -m "$(cat <<'EOF'
feat(schemas): add PartyGraph schema

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: RiskList

**Files:**
- Create: `packages/schemas/src/risk-list.ts`
- Create: `packages/schemas/src/risk-list.test.ts`
- Modify: `packages/schemas/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/schemas/src/risk-list.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { RiskListSchema } from './risk-list.js';

describe('RiskListSchema', () => {
  it('accepts a risk list with no risks', () => {
    const result = RiskListSchema.safeParse({ caseId: 'case-001', risks: [] });
    expect(result.success).toBe(true);
  });

  it('accepts a high risk item pending confirmation', () => {
    const result = RiskListSchema.safeParse({
      caseId: 'case-002',
      risks: [
        {
          id: 'risk-001',
          description: '合同条款存在重大违约风险',
          level: 'high',
          basis: [
            {
              citation: '《民法典》第577条',
              sourceAnchors: [{ fileId: 'file-001', page: 2, bbox: { x: 0, y: 0, width: 0.5, height: 0.1 } }],
            },
          ],
          dispositionStatus: 'pending',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a confirmed risk with multiple basis entries', () => {
    const result = RiskListSchema.safeParse({
      caseId: 'case-003',
      risks: [
        {
          id: 'risk-002',
          description: '管辖条款可能无效',
          level: 'medium',
          basis: [
            { citation: '《民事诉讼法》第35条', sourceAnchors: [{ fileId: 'file-002', textRange: { start: 0, end: 20 } }] },
            { citation: '（2023）某民终123号', sourceAnchors: [{ fileId: 'file-003', textRange: { start: 5, end: 30 } }] },
          ],
          dispositionStatus: 'confirmed',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid risk level', () => {
    const result = RiskListSchema.safeParse({
      caseId: 'case-004',
      risks: [
        {
          id: 'risk-003',
          description: '非法等级',
          level: 'critical',
          basis: [{ citation: '某条款', sourceAnchors: [{ fileId: 'file-004', textRange: { start: 0, end: 5 } }] }],
          dispositionStatus: 'pending',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a risk with an empty basis array', () => {
    const result = RiskListSchema.safeParse({
      caseId: 'case-005',
      risks: [
        {
          id: 'risk-004',
          description: '无依据风险',
          level: 'low',
          basis: [],
          dispositionStatus: 'pending',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid dispositionStatus', () => {
    const result = RiskListSchema.safeParse({
      caseId: 'case-006',
      risks: [
        {
          id: 'risk-005',
          description: '非法处置状态',
          level: 'low',
          basis: [{ citation: '某条款', sourceAnchors: [{ fileId: 'file-005', textRange: { start: 0, end: 5 } }] }],
          dispositionStatus: 'ignored',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a basis entry with zero sourceAnchors', () => {
    const result = RiskListSchema.safeParse({
      caseId: 'case-007',
      risks: [
        {
          id: 'risk-006',
          description: '依据无锚点',
          level: 'low',
          basis: [{ citation: '某条款', sourceAnchors: [] }],
          dispositionStatus: 'pending',
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- packages/schemas/src/risk-list.test.ts`
Expected: FAIL —— 找不到模块 `./risk-list.js`。

- [ ] **Step 3: 实现 `packages/schemas/src/risk-list.ts`**

```ts
import * as z from 'zod';
import { SourceAnchorSchema } from './source-anchor.js';

export const RiskLevelEnum = z.enum(['high', 'medium', 'low']);
export type RiskLevel = z.infer<typeof RiskLevelEnum>;

export const DispositionStatusEnum = z.enum(['pending', 'confirmed', 'rejected']);
export type DispositionStatus = z.infer<typeof DispositionStatusEnum>;

const RiskBasisSchema = z.object({
  citation: z.string().min(1),
  sourceAnchors: z.array(SourceAnchorSchema).min(1),
});
export type RiskBasis = z.infer<typeof RiskBasisSchema>;

const RiskItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  level: RiskLevelEnum,
  basis: z.array(RiskBasisSchema).min(1),
  dispositionStatus: DispositionStatusEnum,
});
export type RiskItem = z.infer<typeof RiskItemSchema>;

export const RiskListSchema = z
  .object({
    caseId: z.string().min(1),
    risks: z.array(RiskItemSchema),
  })
  .meta({
    title: 'RiskList',
    description: '风险清单：风险点 + 等级 + 依据（法条/判例引用 + 来源锚点）+ 处置状态。',
  });

export type RiskList = z.infer<typeof RiskListSchema>;
```

- [ ] **Step 4: 追加 barrel 导出，`packages/schemas/src/index.ts` 变为**

```ts
export * from './source-anchor.js';
export * from './case-file.js';
export * from './timeline.js';
export * from './party-graph.js';
export * from './risk-list.js';
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `pnpm test -- packages/schemas/src/risk-list.test.ts`
Expected: PASS —— 7 tests passed。

- [ ] **Step 6: 提交**

```bash
git add packages/schemas/src/risk-list.ts packages/schemas/src/risk-list.test.ts packages/schemas/src/index.ts
git commit -m "$(cat <<'EOF'
feat(schemas): add RiskList schema

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: ReviewMatrix

**Files:**
- Create: `packages/schemas/src/review-matrix.ts`
- Create: `packages/schemas/src/review-matrix.test.ts`
- Modify: `packages/schemas/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/schemas/src/review-matrix.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { ReviewMatrixSchema } from './review-matrix.js';

describe('ReviewMatrixSchema', () => {
  it('accepts a matrix with questions and no rows yet', () => {
    const result = ReviewMatrixSchema.safeParse({
      caseId: 'case-001',
      questions: [{ id: 'q1', text: '合同金额是多少？' }],
      rows: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a row with an answered cell backed by sourceAnchors', () => {
    const result = ReviewMatrixSchema.safeParse({
      caseId: 'case-002',
      questions: [{ id: 'q1', text: '合同金额是多少？' }],
      rows: [
        {
          documentId: 'doc-001',
          answers: {
            q1: {
              answer: '人民币100万元',
              sourceAnchors: [{ fileId: 'file-001', page: 1, bbox: { x: 0, y: 0, width: 0.3, height: 0.05 } }],
              confidence: 'high',
            },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a cell with empty sourceAnchors for a "not mentioned" answer', () => {
    const result = ReviewMatrixSchema.safeParse({
      caseId: 'case-003',
      questions: [{ id: 'q2', text: '是否约定违约金？' }],
      rows: [
        {
          documentId: 'doc-002',
          answers: {
            q2: { answer: '该文档未提及此问题', sourceAnchors: [], confidence: 'low' },
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a matrix with zero questions', () => {
    const result = ReviewMatrixSchema.safeParse({
      caseId: 'case-004',
      questions: [],
      rows: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a cell with an invalid confidence value', () => {
    const result = ReviewMatrixSchema.safeParse({
      caseId: 'case-005',
      questions: [{ id: 'q1', text: '合同金额是多少？' }],
      rows: [
        {
          documentId: 'doc-003',
          answers: {
            q1: { answer: '人民币100万元', sourceAnchors: [], confidence: 'certain' },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a cell missing answer', () => {
    const result = ReviewMatrixSchema.safeParse({
      caseId: 'case-006',
      questions: [{ id: 'q1', text: '合同金额是多少？' }],
      rows: [
        {
          documentId: 'doc-004',
          answers: {
            q1: { sourceAnchors: [], confidence: 'low' },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a row missing documentId', () => {
    const result = ReviewMatrixSchema.safeParse({
      caseId: 'case-007',
      questions: [{ id: 'q1', text: '合同金额是多少？' }],
      rows: [
        {
          answers: {
            q1: { answer: '人民币100万元', sourceAnchors: [], confidence: 'low' },
          },
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- packages/schemas/src/review-matrix.test.ts`
Expected: FAIL —— 找不到模块 `./review-matrix.js`。

- [ ] **Step 3: 实现 `packages/schemas/src/review-matrix.ts`**

```ts
import * as z from 'zod';
import { SourceAnchorSchema } from './source-anchor.js';

export const ConfidenceEnum = z.enum(['high', 'medium', 'low']);
export type Confidence = z.infer<typeof ConfidenceEnum>;

const ReviewQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});
export type ReviewQuestion = z.infer<typeof ReviewQuestionSchema>;

const ReviewCellSchema = z.object({
  answer: z.string().min(1),
  /**
   * 允许为空数组：矩阵审阅的合法答案之一是"该文档未提及此问题"，
   * 此时没有可引用的锚点——与 Timeline/PartyGraph 的断言型字段不同，
   * 这里"没有证据"本身就是有效答案，不强制 min(1)。
   */
  sourceAnchors: z.array(SourceAnchorSchema),
  confidence: ConfidenceEnum,
});
export type ReviewCell = z.infer<typeof ReviewCellSchema>;

const ReviewRowSchema = z.object({
  documentId: z.string().min(1),
  answers: z.record(z.string(), ReviewCellSchema),
});
export type ReviewRow = z.infer<typeof ReviewRowSchema>;

export const ReviewMatrixSchema = z
  .object({
    caseId: z.string().min(1),
    questions: z.array(ReviewQuestionSchema).min(1),
    rows: z.array(ReviewRowSchema),
  })
  .meta({
    title: 'ReviewMatrix',
    description: '矩阵审阅：行 = 文档，列 = 问题，格 = 答案 + 来源锚点 + 置信标记。',
  });

export type ReviewMatrix = z.infer<typeof ReviewMatrixSchema>;
```

- [ ] **Step 4: 追加 barrel 导出，`packages/schemas/src/index.ts` 变为**

```ts
export * from './source-anchor.js';
export * from './case-file.js';
export * from './timeline.js';
export * from './party-graph.js';
export * from './risk-list.js';
export * from './review-matrix.js';
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `pnpm test -- packages/schemas/src/review-matrix.test.ts`
Expected: PASS —— 7 tests passed。

- [ ] **Step 6: 提交**

```bash
git add packages/schemas/src/review-matrix.ts packages/schemas/src/review-matrix.test.ts packages/schemas/src/index.ts
git commit -m "$(cat <<'EOF'
feat(schemas): add ReviewMatrix schema

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: RevisionEvent

**Files:**
- Create: `packages/schemas/src/revision-event.ts`
- Create: `packages/schemas/src/revision-event.test.ts`
- Modify: `packages/schemas/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/schemas/src/revision-event.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { RevisionEventSchema } from './revision-event.js';

describe('RevisionEventSchema', () => {
  it('accepts a minimal event with no optional fields', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-001',
      timestamp: '2026-07-09T10:00:00Z',
      actor: { userId: 'user-001' },
      artifactType: 'RiskList',
      artifactId: 'risk-list-case-001',
      fieldPath: '/risks/0/level',
      previousValue: 'medium',
      newValue: 'high',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an event with reason, sourceAnchors, and caseId', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-002',
      timestamp: '2026-07-09T10:05:00Z',
      actor: { userId: 'user-002', role: 'lawyer' },
      caseId: 'case-001',
      artifactType: 'Timeline',
      artifactId: 'timeline-case-001',
      fieldPath: '/events/2/date',
      previousValue: { kind: 'fuzzy', text: '2024年初' },
      newValue: { kind: 'exact', date: '2024-01-15' },
      reason: '找到了明确的签订日期证据',
      sourceAnchors: [{ fileId: 'file-001', page: 1, bbox: { x: 0, y: 0, width: 0.3, height: 0.05 } }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts nested object previousValue/newValue', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-003',
      timestamp: '2026-07-09T10:10:00Z',
      actor: { userId: 'user-003' },
      artifactType: 'PartyGraph',
      artifactId: 'party-graph-case-001',
      fieldPath: '/nodes/0/aliases',
      previousValue: ['某某公司'],
      newValue: ['某某公司', '某某有限责任公司'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a fieldPath not starting with /', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-004',
      timestamp: '2026-07-09T10:00:00Z',
      actor: { userId: 'user-001' },
      artifactType: 'RiskList',
      artifactId: 'risk-list-case-001',
      fieldPath: 'risks.0.level',
      previousValue: 'medium',
      newValue: 'high',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid artifactType', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-005',
      timestamp: '2026-07-09T10:00:00Z',
      actor: { userId: 'user-001' },
      artifactType: 'UnknownArtifact',
      artifactId: 'x',
      fieldPath: '/x',
      previousValue: 1,
      newValue: 2,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing timestamp', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-006',
      actor: { userId: 'user-001' },
      artifactType: 'RiskList',
      artifactId: 'x',
      fieldPath: '/x',
      previousValue: 1,
      newValue: 2,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-ISO timestamp', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-007',
      timestamp: '2026年7月9日',
      actor: { userId: 'user-001' },
      artifactType: 'RiskList',
      artifactId: 'x',
      fieldPath: '/x',
      previousValue: 1,
      newValue: 2,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an actor missing userId', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-008',
      timestamp: '2026-07-09T10:00:00Z',
      actor: {},
      artifactType: 'RiskList',
      artifactId: 'x',
      fieldPath: '/x',
      previousValue: 1,
      newValue: 2,
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- packages/schemas/src/revision-event.test.ts`
Expected: FAIL —— 找不到模块 `./revision-event.js`。

- [ ] **Step 3: 实现 `packages/schemas/src/revision-event.ts`**

```ts
import * as z from 'zod';
import { SourceAnchorSchema } from './source-anchor.js';

export const ArtifactTypeEnum = z.enum([
  'CaseFile',
  'Timeline',
  'PartyGraph',
  'RiskList',
  'ReviewMatrix',
]);
export type ArtifactType = z.infer<typeof ArtifactTypeEnum>;

const RevisionActorSchema = z.object({
  userId: z.string().min(1),
  role: z.string().optional(),
});
export type RevisionActor = z.infer<typeof RevisionActorSchema>;

export const RevisionEventSchema = z
  .object({
    id: z.string().min(1),
    timestamp: z.iso.datetime(),
    actor: RevisionActorSchema,
    /**
     * 训练管线按案件维度切分/脱敏时需要——只靠 artifactId 反查案件会让
     * 下游多背一个依赖。可选是因为部分修正事件不必然挂在具体案件下。
     */
    caseId: z.string().min(1).optional(),
    artifactType: ArtifactTypeEnum,
    artifactId: z.string().min(1),
    /** JSON Pointer（RFC 6901），定位到被修正的具体字段，使训练管线可程序化重放/应用这条修正。 */
    fieldPath: z.string().regex(/^\//, 'fieldPath 必须是 JSON Pointer（以 / 开头）'),
    previousValue: z.unknown(),
    newValue: z.unknown(),
    /** 人工修正理由：训练信号里价值很高，但不是每次修正都会填写，故可选。 */
    reason: z.string().optional(),
    /** 本次修正依据的证据锚点。 */
    sourceAnchors: z.array(SourceAnchorSchema).optional(),
  })
  .meta({
    title: 'RevisionEvent',
    description:
      'schema 级修正事件：反馈标注的统一记录格式。字段设计假设本类型未来直接进训练管线消费，因此不依赖会话上下文即可独立使用。',
  });

export type RevisionEvent = z.infer<typeof RevisionEventSchema>;
```

- [ ] **Step 4: 追加 barrel 导出，`packages/schemas/src/index.ts` 变为**

```ts
export * from './source-anchor.js';
export * from './case-file.js';
export * from './timeline.js';
export * from './party-graph.js';
export * from './risk-list.js';
export * from './review-matrix.js';
export * from './revision-event.js';
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `pnpm test -- packages/schemas/src/revision-event.test.ts`
Expected: PASS —— 8 tests passed。

- [ ] **Step 6: 提交**

```bash
git add packages/schemas/src/revision-event.ts packages/schemas/src/revision-event.test.ts packages/schemas/src/index.ts
git commit -m "$(cat <<'EOF'
feat(schemas): add RevisionEvent schema

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: JSON Schema 导出 + drift 测试

**Files:**
- Create: `packages/schemas/src/export-json-schema.ts`
- Create: `packages/schemas/scripts/generate-json-schema.ts`
- Create: `packages/schemas/src/json-schema-drift.test.ts`
- Create (generated, then committed): `packages/schemas/json-schema/*.schema.json` ×7

- [ ] **Step 1: 实现 `packages/schemas/src/export-json-schema.ts`**

```ts
import * as z from 'zod';
import { SourceAnchorSchema } from './source-anchor.js';
import { CaseFileSchema } from './case-file.js';
import { TimelineSchema } from './timeline.js';
import { PartyGraphSchema } from './party-graph.js';
import { RiskListSchema } from './risk-list.js';
import { ReviewMatrixSchema } from './review-matrix.js';
import { RevisionEventSchema } from './revision-event.js';

export const SCHEMA_REGISTRY = [
  { name: 'SourceAnchor', schema: SourceAnchorSchema },
  { name: 'CaseFile', schema: CaseFileSchema },
  { name: 'Timeline', schema: TimelineSchema },
  { name: 'PartyGraph', schema: PartyGraphSchema },
  { name: 'RiskList', schema: RiskListSchema },
  { name: 'ReviewMatrix', schema: ReviewMatrixSchema },
  { name: 'RevisionEvent', schema: RevisionEventSchema },
] as const;

export function toJSONSchemaRecord(): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const entry of SCHEMA_REGISTRY) {
    record[entry.name] = z.toJSONSchema(entry.schema);
  }
  return record;
}
```

这个文件不进 `index.ts` barrel——它是构建期工具，不是包的公开运行时 API（消费方要做 zod 校验直接 import 对应的 `XxxSchema`，不需要走 JSON Schema）。

- [ ] **Step 2: 实现 `packages/schemas/scripts/generate-json-schema.ts`**

```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toJSONSchemaRecord } from '../src/export-json-schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'json-schema');

mkdirSync(outDir, { recursive: true });

const record = toJSONSchemaRecord();
for (const [name, schema] of Object.entries(record)) {
  const filePath = join(outDir, `${name}.schema.json`);
  writeFileSync(filePath, `${JSON.stringify(schema, null, 2)}\n`, 'utf-8');
  console.log(`wrote ${filePath}`);
}
```

- [ ] **Step 3: 运行生成脚本，产出并检查 7 个文件**

Run: `pnpm --filter @courtwork/schemas run generate:json-schema`
Expected: 打印 7 行 `wrote .../json-schema/<Name>.schema.json`；`packages/schemas/json-schema/` 目录下出现 `SourceAnchor.schema.json`、`CaseFile.schema.json`、`Timeline.schema.json`、`PartyGraph.schema.json`、`RiskList.schema.json`、`ReviewMatrix.schema.json`、`RevisionEvent.schema.json` 共 7 个文件。

Run: `cat packages/schemas/json-schema/SourceAnchor.schema.json`
Expected: 看到一个 `"$schema": "https://json-schema.org/draft/2020-12/schema"` 起头的 JSON Schema 文档，`properties` 里有 `fileId`/`page`/`bbox`/`textRange`/`textLayerVersion`/`quote`，并带有 `title`/`description`（来自 `.meta()`）。

- [ ] **Step 4: 写 drift 测试 `packages/schemas/src/json-schema-drift.test.ts`**

```ts
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { toJSONSchemaRecord } from './export-json-schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonSchemaDir = join(__dirname, '..', 'json-schema');

describe('JSON Schema export drift', () => {
  const record = toJSONSchemaRecord();

  for (const [name, generated] of Object.entries(record)) {
    it(`${name}.schema.json matches the current zod definition`, () => {
      const committedRaw = readFileSync(join(jsonSchemaDir, `${name}.schema.json`), 'utf-8');
      const committed = JSON.parse(committedRaw);
      expect(generated).toEqual(committed);
    });
  }
});
```

- [ ] **Step 5: 运行 drift 测试，确认通过**

Run: `pnpm test -- packages/schemas/src/json-schema-drift.test.ts`
Expected: PASS —— 7 tests passed（每个 schema 一条）。

- [ ] **Step 6: 验证 drift 测试真的能检测漂移（手动制造一次不一致再恢复）**

Run: 手动编辑 `packages/schemas/json-schema/RiskList.schema.json`，随便改一个字段名（例如把 `"level"` 改成 `"levelX"`），保存。

Run: `pnpm test -- packages/schemas/src/json-schema-drift.test.ts`
Expected: FAIL —— `RiskList.schema.json matches the current zod definition` 这一条报错，diff 里能看到 `levelX` vs `level` 的不一致。这一步证明 drift 测试不是摆设。

Run: `pnpm --filter @courtwork/schemas run generate:json-schema` 重新生成，恢复文件为与 zod 源一致。

Run: `pnpm test -- packages/schemas/src/json-schema-drift.test.ts`
Expected: PASS —— 恢复绿。

- [ ] **Step 7: 提交**

```bash
git add packages/schemas/src/export-json-schema.ts packages/schemas/scripts/generate-json-schema.ts packages/schemas/src/json-schema-drift.test.ts packages/schemas/json-schema/
git commit -m "$(cat <<'EOF'
feat(schemas): export JSON Schema per artifact with drift test

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: 全量校验 + SPEC.md 更新 + 跨层 TODO

**Files:**
- Modify: `packages/schemas/SPEC.md`
- Modify: `services/ingest/SPEC.md`

- [ ] **Step 1: 全量跑测试、lint、build**

Run: `pnpm test`
Expected: 全绿。7 个 schema 文件（各 7 条，RevisionEvent 8 条）+ drift 测试 7 条 = 57 条测试全部通过。记下实际输出的通过总数，下一步要写进 SPEC.md。

Run: `pnpm lint`
Expected: 无 error（如有 warning 需逐条确认是否需要处理，不应有 `@typescript-eslint` recommended 规则触发的 error）。

Run: `pnpm -r run build`
Expected: `packages/schemas/dist/` 生成 `.js` + `.d.ts` 文件，`tsc` 无类型错误。

- [ ] **Step 2: 更新 `packages/schemas/SPEC.md`**

将第 3 行的 `状态：未开工` 改为 `状态：已完成`。

在"## 验收"小节后追加"JSON Schema 导出路径"说明，并在文件末尾追加"## 验收记录"小节。修改后的完整文件内容：

```markdown
# SPEC: packages/schemas（W1）

状态：已完成

## 职责

全仓库的契约根。定义领域 artifact 的 TS 类型 + JSON Schema + 运行时校验器。零运行时依赖（校验器可用 zod）。

## 交付清单

- `SourceAnchor`：来源引用锚（fileId + page + bbox/文本区间）。一切可溯源交互的地基，所有 artifact 的引用字段必须用它。
- `CaseFile`：案件档案——卷内文件清单、文书类型分类、摄取状态。
- `Timeline`：事件时间线——事件、日期（含模糊日期表达）、当事人关联、SourceAnchor[]。
- `PartyGraph`：当事人关系图谱——节点（主体：自然人/法人，含别名数组，服务实体对齐）、边（关系类型 + 证据 SourceAnchor[]）。
- `RiskList`：风险清单——风险点、等级、依据（法条/判例引用 + SourceAnchor）、处置状态（待确认/已确认/已否决）。
- `ReviewMatrix`：矩阵审阅——行=文档、列=问题、格=答案+SourceAnchor[]+置信标记。
- `RevisionEvent`：schema 级修正事件——谁、对哪个 artifact 的哪个字段、原值/新值、时间。反馈标注的统一载体，设计时假设它未来直接进训练管线。

## 验收

每个 schema：合法样例 ≥3、非法样例 ≥3 的校验测试；导出 JSON Schema 文件供 Python 侧（services/ingest）校验复用。

**JSON Schema 导出路径（正式契约）**：`packages/schemas/json-schema/<Name>.schema.json`（`SourceAnchor` / `CaseFile` / `Timeline` / `PartyGraph` / `RiskList` / `ReviewMatrix` / `RevisionEvent` 共 7 个文件），由 `pnpm --filter @courtwork/schemas run generate:json-schema` 生成并提交进 git，Python 侧无需装 Node 工具链即可直接读取静态文件。每个文件自包含：引用的子 schema（如 `SourceAnchor` 出现在 `Timeline`/`PartyGraph`/`RiskList`/`ReviewMatrix`/`RevisionEvent` 里）以内联方式展开，不使用跨文件 `$ref`。`src/json-schema-drift.test.ts` 在测试套件里重新生成并与已提交文件 diff，zod 源变更后忘记重新生成会导致该测试报红。

## 纪律

改任何已发布 schema = breaking change，需在本文件记录变更与受影响消费方。

## TODO（跨层放入区）

（空）

## 验收记录

- 2026-07-09：W1 完成。七个 schema（SourceAnchor / CaseFile / Timeline / PartyGraph / RiskList / ReviewMatrix / RevisionEvent）的 TS 类型 + zod 校验器 + JSON Schema 导出全部交付。`pnpm test` 全绿（<实际通过用例数，从上一步命令输出读取，替换本占位>），`pnpm lint` 无 error，`pnpm -r run build` 通过。
  - 设计取舍：
    - `SourceAnchor.textLayerVersion?`：为未来 OCR 重跑导致 `textRange` 偏移失配预留的版本标记字段，由 ingest（W8）填写；现在加是一个字段的成本，以后加是全量数据迁移的成本。
    - `SourceAnchor.quote?`：展示/重锚定辅助，非权威定位器，权威定位只认 `bbox`/`textRange`（已在 JSDoc 中注明）。
    - `SourceAnchor` 校验规则：`bbox`/`textRange` 至少一个；`bbox` 存在时 `page` 必填。
    - `CaseFile.documentType` / `PartyGraph.relationType`：故意用开放字符串而非枚举——真实分类/关系体系是 ingest 分类器（W8）与产品侧后续决定的，此处提前锁定会在体系调整时构成 breaking change。
    - `RevisionEvent.fieldPath` 用 JSON Pointer（RFC 6901）而非任意字符串，使训练管线可程序化重放/应用修正；额外保留 `reason?`/`sourceAnchors?`/`caseId?` 三个 SPEC 字面之外的可选字段（训练信号与按案件切分/脱敏的需要）。
    - 工具链固定 `typescript@^6.0.3`，未跳最新的 `7.0.2`（TypeScript 原生 Go 编译器重写版）：`typescript-eslint@8.63.0` 的 `peerDependencies` 目前是 `typescript >=4.8.4 <6.1.0`，装 TS7 会破坏类型感知 lint。后续任何一层升级 TypeScript 前应先核实 typescript-eslint 的兼容范围。
  - 跨层动作：已在 `services/ingest/SPEC.md` 的 TODO 区留言，指向 JSON Schema 导出路径与生成命令。
```

- [ ] **Step 3: 更新 `services/ingest/SPEC.md` 的 TODO 区**

将文件末尾的：

```markdown
## TODO（跨层放入区）

（空）
```

替换为：

```markdown
## TODO（跨层放入区）

- [W1 → W3/W8] `packages/schemas` 导出的 JSON Schema 位于 `packages/schemas/json-schema/*.schema.json`（`CaseFile.schema.json` / `Timeline.schema.json` / `PartyGraph.schema.json` 等，共 7 个文件），已提交进 git，可直接用 Python `jsonschema` 库加载做输出校验，无需装 Node 工具链。每个文件自包含（无跨文件 `$ref`），不需要额外的 schema resolver。生成命令：`pnpm --filter @courtwork/schemas run generate:json-schema`；这批文件是权威的、随 `packages/schemas` 包同步更新，ingest 侧只需在每次拉取新代码后确认这些文件是否有变更即可，不需要自己关心 zod 源码。
```

- [ ] **Step 4: 提交**

```bash
git add packages/schemas/SPEC.md services/ingest/SPEC.md
git commit -m "$(cat <<'EOF'
docs(schemas): mark W1 complete, record acceptance and cross-layer TODO

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes（写计划时的自查记录，非执行步骤）

- **Spec 覆盖**：7 个 schema 全部对应到 Task 3–9；≥3/≥3 样例测试每个 schema 都满足（RevisionEvent 3 合法/5 非法，其余均 3 合法/4 非法）；JSON Schema 导出 + drift 测试 = Task 10；SPEC.md 状态与验收记录 + services/ingest 跨层 TODO = Task 11；用户确认的 4 项默认方案（导出目录+drift测试+ingest TODO、ESM+NodeNext、`@courtwork/*` scope、`.nvmrc`+`engines`）与 SourceAnchor/RevisionEvent 的全部补充字段/校验规则均已写入对应任务的实现代码。
- **占位符扫描**：唯一残留的"待填"是 Task 11 Step 2 中的 `<实际通过用例数...>`——这是刻意设计：要求执行者从上一步命令的真实输出读取数字后再填入，不是模糊占位，而是"跑真实命令、记录真实结果"的 TDD 精神延伸到验收记录本身。
- **类型一致性**：`SourceAnchorSchema` 在 Timeline/PartyGraph/RiskList/ReviewMatrix/RevisionEvent 五处引用的导入路径与导出名一致；`toJSONSchemaRecord()`/`SCHEMA_REGISTRY` 在 Task 10 的三个文件（export-json-schema.ts、generate-json-schema.ts、json-schema-drift.test.ts）间命名一致；barrel `index.ts` 的追加顺序与任务顺序一致，Task 9 结束时七个 `export *` 齐全。
