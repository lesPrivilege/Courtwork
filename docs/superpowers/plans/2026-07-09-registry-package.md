# packages/registry（W2）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付 `packages/registry`：场景定义 schema 与校验、YAML 声明文件加载器、触发匹配与场景清单查询 API，以及内置 MVP 四场景（S1–S4）声明文件。

**Architecture:** 单一新增 pnpm workspace 包 `@courtwork/registry`，依赖 `@courtwork/schemas`（复用其 `ArtifactTypeEnum` 作为"输入/产出 artifact 类型引用"的唯一名单来源，不平行定义）。场景以 `scenarios/*.yaml` 声明文件存在，加载器负责 parse + zod 校验 + 清晰报错，查询 API 在内存中对已加载的场景做触发匹配（跨维度 OR）。`confirmationGates[].artifact` 设计为可选字段：存在时必须是 `outputArtifacts` 的子集（跨字段 refine），缺席时仅凭 `label` 独立成立——这是为 S4（文书起草）过渡设计的，其真实产物类型（`RevisionInstructionSet`）待 W4 在 `packages/schemas` 提案落地后才能补上，S1 的"矛盾清单"同理待 W3 spike 结论。这两处缺口已与架构层（Cowork）确认，按"留空 + 记 TODO"处理，不强行凑数。

**Tech Stack:** 沿用 W1 已建立的 monorepo 基线（pnpm workspaces、TypeScript 6.0.3 strict/ESM/NodeNext、vitest 4.1.10、ESLint 10.6.0 + typescript-eslint 8.63.0）。新增：`yaml`（声明文件解析，MVP 场景选 YAML 而非 JSON 是为了"产品团队周级上新场景"的可读性/可维护性）。

---

## File Structure

```
Courtwork/
  packages/registry/
    package.json                          [新建]
    tsconfig.json                         [新建]
    SPEC.md                               [修改] 状态区 + TODO 区 + 验收记录
    src/
      scenario.ts                         [新建] ScenarioDefinitionSchema
      scenario.test.ts                    [新建]
      loader.ts                           [新建] parseScenarioYaml / loadScenarioFile / loadScenariosFromDir
      loader.test.ts                      [新建]
      query.ts                            [新建] createScenarioRegistry
      query.test.ts                       [新建]
      builtin-scenarios.test.ts           [新建] 验收标准①：四场景加载通过校验
      index.ts                            [新建] barrel，逐任务追加
    scenarios/
      S1.yaml                             [新建] 卷宗阅卷
      S2.yaml                             [新建] 矩阵审阅
      S3.yaml                             [新建] 合同审查
      S4.yaml                             [新建] 文书起草
  packages/schemas/SPEC.md                [修改] TODO 区记录 S1/S4 产物类型缺口的架构拍板路径
```

---

## Task 1: 工程骨架（package.json + tsconfig.json）

**Files:**
- Create: `packages/registry/package.json`
- Create: `packages/registry/tsconfig.json`

- [ ] **Step 1: 创建 `packages/registry/package.json`**

```json
{
  "name": "@courtwork/registry",
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
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "@courtwork/schemas": "workspace:*",
    "yaml": "^2.8.1",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/node": "^26.1.1"
  }
}
```

- [ ] **Step 2: 创建 `packages/registry/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

`types: ["node"]` 是必须的：`loader.ts` 会用 `node:fs`/`node:path` 读取声明文件，W1 已经踩过"不显式声明会导致 `@types/node` 自动发现不可靠"的坑（见 `packages/schemas/SPEC.md` 验收记录）。

- [ ] **Step 3: 安装依赖**

```bash
pnpm install
```

Expected：`pnpm-lock.yaml` 更新，`@courtwork/registry` 出现在 workspace 成员列表里，`@courtwork/schemas` 通过 workspace 协议链接（不走 npm registry），`yaml`/`zod` 被装进 `packages/registry/node_modules`。

- [ ] **Step 4: 提交**

```bash
git add packages/registry/package.json packages/registry/tsconfig.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore(registry): scaffold @courtwork/registry package

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: ScenarioDefinition schema

**Files:**
- Create: `packages/registry/src/scenario.ts`
- Create: `packages/registry/src/scenario.test.ts`
- Create: `packages/registry/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/registry/src/scenario.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { ScenarioDefinitionSchema } from './scenario.js';

describe('ScenarioDefinitionSchema', () => {
  it('accepts a scenario with one output artifact and an artifact-tied gate', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S3',
      name: '合同审查',
      trigger: { fileTypes: ['docx', 'pdf'], userActions: [], classifierTags: [] },
      inputArtifacts: ['CaseFile'],
      toolIds: ['party-verify'],
      outputArtifacts: ['RiskList'],
      uiTemplateId: 'risk-review-panel',
      confirmationGates: [{ artifact: 'RiskList', label: '确认风险清单后再生成修订文书' }],
      promptTemplateRef: 'S3-contract-review-v0',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a scenario with multiple output artifacts and no input artifacts', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S1',
      name: '卷宗阅卷',
      trigger: { fileTypes: ['pdf', 'jpg', 'png'], userActions: ['upload-case-files'], classifierTags: [] },
      inputArtifacts: [],
      toolIds: [],
      outputArtifacts: ['CaseFile', 'Timeline', 'PartyGraph'],
      uiTemplateId: 'case-intake-panel',
      confirmationGates: [
        { artifact: 'Timeline', label: '确认时间线事件' },
        { artifact: 'PartyGraph', label: '确认当事人关系图谱' },
      ],
      promptTemplateRef: 'S1-case-intake-v0',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a label-only confirmation gate with no artifact reference', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S4',
      name: '文书起草',
      trigger: { fileTypes: [], userActions: ['start-drafting'], classifierTags: [] },
      inputArtifacts: ['CaseFile', 'Timeline', 'PartyGraph'],
      toolIds: [],
      outputArtifacts: [],
      uiTemplateId: 'draft-review-panel',
      confirmationGates: [{ label: '确认起诉状/答辩状草稿内容' }],
      promptTemplateRef: 'S4-pleading-draft-v0',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a trigger with all three dimensions empty', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S-bad-1',
      name: '无触发条件场景',
      trigger: { fileTypes: [], userActions: [], classifierTags: [] },
      inputArtifacts: [],
      toolIds: [],
      outputArtifacts: ['RiskList'],
      uiTemplateId: 'x',
      confirmationGates: [{ label: '确认' }],
      promptTemplateRef: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an inputArtifacts entry that is not a known ArtifactType', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S-bad-2',
      name: '非法输入引用场景',
      trigger: { userActions: ['x'], fileTypes: [], classifierTags: [] },
      inputArtifacts: ['ContradictionList'],
      toolIds: [],
      outputArtifacts: ['RiskList'],
      uiTemplateId: 'x',
      confirmationGates: [{ label: '确认' }],
      promptTemplateRef: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a confirmationGates artifact not present in outputArtifacts', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S-bad-3',
      name: '门禁引用越界场景',
      trigger: { userActions: ['x'], fileTypes: [], classifierTags: [] },
      inputArtifacts: [],
      toolIds: [],
      outputArtifacts: ['RiskList'],
      uiTemplateId: 'x',
      confirmationGates: [{ artifact: 'Timeline', label: '确认时间线' }],
      promptTemplateRef: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty confirmationGates array', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S-bad-4',
      name: '无确认节点场景',
      trigger: { userActions: ['x'], fileTypes: [], classifierTags: [] },
      inputArtifacts: [],
      toolIds: [],
      outputArtifacts: ['RiskList'],
      uiTemplateId: 'x',
      confirmationGates: [],
      promptTemplateRef: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate toolIds', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S-bad-5',
      name: '工具重复场景',
      trigger: { userActions: ['x'], fileTypes: [], classifierTags: [] },
      inputArtifacts: [],
      toolIds: ['party-verify', 'party-verify'],
      outputArtifacts: ['RiskList'],
      uiTemplateId: 'x',
      confirmationGates: [{ label: '确认' }],
      promptTemplateRef: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a scenario missing uiTemplateId', () => {
    const result = ScenarioDefinitionSchema.safeParse({
      id: 'S-bad-6',
      name: '缺少 UI 模板场景',
      trigger: { userActions: ['x'], fileTypes: [], classifierTags: [] },
      inputArtifacts: [],
      toolIds: [],
      outputArtifacts: ['RiskList'],
      confirmationGates: [{ label: '确认' }],
      promptTemplateRef: 'x',
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- packages/registry/src/scenario.test.ts`
Expected: FAIL —— 找不到模块 `./scenario.js`（`scenario.ts` 尚不存在）。

- [ ] **Step 3: 实现 `packages/registry/src/scenario.ts`**

```ts
import * as z from 'zod';
import { ArtifactTypeEnum } from '@courtwork/schemas';

const TriggerConditionSchema = z
  .object({
    fileTypes: z.array(z.string().min(1)).default([]),
    userActions: z.array(z.string().min(1)).default([]),
    classifierTags: z.array(z.string().min(1)).default([]),
  })
  .refine(
    (value) =>
      value.fileTypes.length > 0 || value.userActions.length > 0 || value.classifierTags.length > 0,
    {
      message: '触发条件（文件类型/用户动作/分类器标签）至少提供一项，否则场景永远不会被触发',
      path: ['fileTypes'],
    },
  );
export type TriggerCondition = z.infer<typeof TriggerConditionSchema>;

/**
 * artifact 可选：存在时必须 ⊆ outputArtifacts（见下方跨字段 refine），
 * 缺席时仅凭 label 独立成立——用于产物尚无对应 schema 类型的场景（如 S4 文书起草，
 * 真实产物类型 RevisionInstructionSet 待 W4 在 packages/schemas 提案落地）。
 */
const ConfirmationGateSchema = z.object({
  artifact: ArtifactTypeEnum.optional(),
  label: z.string().min(1),
});
export type ConfirmationGate = z.infer<typeof ConfirmationGateSchema>;

function uniqueStrings(values: string[]): boolean {
  return new Set(values).size === values.length;
}

const ScenarioDefinitionObjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  trigger: TriggerConditionSchema,
  inputArtifacts: z.array(ArtifactTypeEnum).default([]),
  /** 结构校验 only：不针对具体 id 做白名单限制。packages/tools（W5）尚未开工，
   * 硬编码工具 id 会违背"注册表不用改代码就能上新场景/工具"的设计初衷。 */
  toolIds: z.array(z.string().min(1)).default([]),
  outputArtifacts: z.array(ArtifactTypeEnum).default([]),
  uiTemplateId: z.string().min(1),
  /** 非空：把"留人确认是产品纪律"落到校验层，场景定义漏掉确认节点在加载时即报错。 */
  confirmationGates: z.array(ConfirmationGateSchema).min(1),
  promptTemplateRef: z.string().min(1),
});

export const ScenarioDefinitionSchema = ScenarioDefinitionObjectSchema.refine(
  (value) => uniqueStrings(value.toolIds),
  {
    message: 'toolIds 数组内存在重复的工具 id',
    path: ['toolIds'],
  },
)
  .refine(
    (value) =>
      value.confirmationGates.every(
        (gate) => gate.artifact === undefined || value.outputArtifacts.includes(gate.artifact),
      ),
    {
      message: 'confirmationGates 中某一项引用了 artifact 字段，但该类型不在 outputArtifacts 声明范围内',
      path: ['confirmationGates'],
    },
  )
  .meta({
    title: 'ScenarioDefinition',
    description:
      '场景注册表的场景声明：触发条件 + 输入/产出 artifact 类型引用 + 工具集 + UI 模板标识 + 确认节点 + 提示词模板引用。',
  });

export type ScenarioDefinition = z.infer<typeof ScenarioDefinitionSchema>;
```

- [ ] **Step 4: 创建 barrel `packages/registry/src/index.ts`**

```ts
export * from './scenario.js';
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `pnpm test -- packages/registry/src/scenario.test.ts`
Expected: PASS —— 9 tests passed。

- [ ] **Step 6: 提交**

```bash
git add packages/registry/src/scenario.ts packages/registry/src/scenario.test.ts packages/registry/src/index.ts
git commit -m "$(cat <<'EOF'
feat(registry): add ScenarioDefinition schema

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: YAML 声明文件加载器

**Files:**
- Create: `packages/registry/src/loader.ts`
- Create: `packages/registry/src/loader.test.ts`
- Modify: `packages/registry/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/registry/src/loader.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseScenarioYaml,
  loadScenarioFile,
  loadScenariosFromDir,
  ScenarioValidationError,
} from './loader.js';

const VALID_YAML = `
id: S-test
name: 测试场景
trigger:
  fileTypes: [pdf]
  userActions: []
  classifierTags: []
inputArtifacts: []
toolIds: []
outputArtifacts: [RiskList]
uiTemplateId: test-panel
confirmationGates:
  - label: 确认测试产物
promptTemplateRef: test-v0
`;

describe('parseScenarioYaml', () => {
  it('parses a well-formed scenario declaration', () => {
    const scenario = parseScenarioYaml(VALID_YAML, 'inline-valid');
    expect(scenario.id).toBe('S-test');
    expect(scenario.outputArtifacts).toEqual(['RiskList']);
  });

  it('throws ScenarioValidationError naming the source label and the missing field', () => {
    const badYaml = VALID_YAML.replace('uiTemplateId: test-panel\n', '');
    expect(() => parseScenarioYaml(badYaml, 'inline-missing-ui-template')).toThrow(ScenarioValidationError);
    expect(() => parseScenarioYaml(badYaml, 'inline-missing-ui-template')).toThrow('inline-missing-ui-template');
    expect(() => parseScenarioYaml(badYaml, 'inline-missing-ui-template')).toThrow(/uiTemplateId/);
  });

  it('throws naming the field when outputArtifacts references an unknown artifact type', () => {
    const badYaml = VALID_YAML.replace('outputArtifacts: [RiskList]', 'outputArtifacts: [ContradictionList]');
    expect(() => parseScenarioYaml(badYaml, 'inline-unknown-artifact')).toThrow(/outputArtifacts/);
  });

  it('throws a clear error on malformed YAML syntax', () => {
    const brokenYaml = 'id: S-test\noutputArtifacts: [RiskList\n';
    expect(() => parseScenarioYaml(brokenYaml, 'inline-broken-syntax')).toThrow(ScenarioValidationError);
    expect(() => parseScenarioYaml(brokenYaml, 'inline-broken-syntax')).toThrow('inline-broken-syntax');
  });
});

describe('loadScenarioFile / loadScenariosFromDir', () => {
  it('loads a single valid scenario file from disk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'registry-loader-'));
    const filePath = join(dir, 'S-test.yaml');
    writeFileSync(filePath, VALID_YAML, 'utf-8');
    try {
      const scenario = loadScenarioFile(filePath);
      expect(scenario.id).toBe('S-test');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('loads all yaml files in a directory, sorted by filename', () => {
    const dir = mkdtempSync(join(tmpdir(), 'registry-loader-'));
    try {
      writeFileSync(join(dir, 'b.yaml'), VALID_YAML.replace('S-test', 'S-b'), 'utf-8');
      writeFileSync(join(dir, 'a.yaml'), VALID_YAML.replace('S-test', 'S-a'), 'utf-8');
      writeFileSync(join(dir, 'notes.txt'), 'ignore me', 'utf-8');
      const scenarios = loadScenariosFromDir(dir);
      expect(scenarios.map((s) => s.id)).toEqual(['S-a', 'S-b']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fails fast on the first invalid file in a directory, naming the file in the error', () => {
    const dir = mkdtempSync(join(tmpdir(), 'registry-loader-'));
    try {
      writeFileSync(join(dir, 'a-good.yaml'), VALID_YAML.replace('S-test', 'S-a'), 'utf-8');
      writeFileSync(
        join(dir, 'b-bad.yaml'),
        VALID_YAML.replace('S-test', 'S-b').replace(
          'confirmationGates:\n  - label: 确认测试产物\n',
          'confirmationGates: []\n',
        ),
        'utf-8',
      );
      expect(() => loadScenariosFromDir(dir)).toThrow(/b-bad\.yaml/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws when two scenario files declare the same id', () => {
    const dir = mkdtempSync(join(tmpdir(), 'registry-loader-'));
    try {
      writeFileSync(join(dir, 'a.yaml'), VALID_YAML, 'utf-8');
      writeFileSync(join(dir, 'b.yaml'), VALID_YAML, 'utf-8');
      expect(() => loadScenariosFromDir(dir)).toThrow('S-test');
      expect(() => loadScenariosFromDir(dir)).toThrow('重复');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- packages/registry/src/loader.test.ts`
Expected: FAIL —— 找不到模块 `./loader.js`。

- [ ] **Step 3: 实现 `packages/registry/src/loader.ts`**

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import * as z from 'zod';
import { ScenarioDefinitionSchema, type ScenarioDefinition } from './scenario.js';

export class ScenarioValidationError extends Error {
  constructor(sourceLabel: string, issues: string) {
    super(`场景声明校验失败 [${sourceLabel}]：\n${issues}`);
    this.name = 'ScenarioValidationError';
  }
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

export function parseScenarioYaml(content: string, sourceLabel = '(inline)'): ScenarioDefinition {
  let raw: unknown;
  try {
    raw = parseYaml(content);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ScenarioValidationError(sourceLabel, `  - YAML 语法错误：${reason}`);
  }
  const result = ScenarioDefinitionSchema.safeParse(raw);
  if (!result.success) {
    throw new ScenarioValidationError(sourceLabel, formatIssues(result.error));
  }
  return result.data;
}

export function loadScenarioFile(filePath: string): ScenarioDefinition {
  const content = readFileSync(filePath, 'utf-8');
  return parseScenarioYaml(content, filePath);
}

export function loadScenariosFromDir(dirPath: string): ScenarioDefinition[] {
  const fileNames = readdirSync(dirPath)
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
    .sort();
  const scenarios = fileNames.map((name) => loadScenarioFile(join(dirPath, name)));
  const seenIds = new Set<string>();
  for (const scenario of scenarios) {
    if (seenIds.has(scenario.id)) {
      throw new ScenarioValidationError(
        dirPath,
        `  - id: 场景 id "${scenario.id}" 重复出现，每个场景 id 必须唯一`,
      );
    }
    seenIds.add(scenario.id);
  }
  return scenarios;
}
```

- [ ] **Step 4: 追加 barrel 导出，`packages/registry/src/index.ts` 变为**

```ts
export * from './scenario.js';
export * from './loader.js';
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `pnpm test -- packages/registry/src/loader.test.ts`
Expected: PASS —— 8 tests passed。

- [ ] **Step 6: 提交**

```bash
git add packages/registry/src/loader.ts packages/registry/src/loader.test.ts packages/registry/src/index.ts
git commit -m "$(cat <<'EOF'
feat(registry): add YAML scenario loader

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 触发匹配与场景清单查询 API

**Files:**
- Create: `packages/registry/src/query.ts`
- Create: `packages/registry/src/query.test.ts`
- Modify: `packages/registry/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/registry/src/query.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { createScenarioRegistry } from './query.js';
import type { ScenarioDefinition } from './scenario.js';

const s1: ScenarioDefinition = {
  id: 'S1',
  name: '卷宗阅卷',
  trigger: { fileTypes: ['pdf', 'jpg'], userActions: ['upload-case-files'], classifierTags: [] },
  inputArtifacts: [],
  toolIds: [],
  outputArtifacts: ['CaseFile', 'Timeline', 'PartyGraph'],
  uiTemplateId: 'case-intake-panel',
  confirmationGates: [{ artifact: 'Timeline', label: '确认时间线事件' }],
  promptTemplateRef: 'S1-v0',
};

const s3: ScenarioDefinition = {
  id: 'S3',
  name: '合同审查',
  trigger: { fileTypes: ['docx'], userActions: [], classifierTags: ['contract'] },
  inputArtifacts: ['CaseFile'],
  toolIds: ['party-verify'],
  outputArtifacts: ['RiskList'],
  uiTemplateId: 'risk-review-panel',
  confirmationGates: [{ artifact: 'RiskList', label: '确认风险清单' }],
  promptTemplateRef: 'S3-v0',
};

describe('createScenarioRegistry', () => {
  it('list() returns every registered scenario', () => {
    const registry = createScenarioRegistry([s1, s3]);
    expect(registry.list().map((s) => s.id)).toEqual(['S1', 'S3']);
  });

  it('list() returns a snapshot that does not expose the internal array for mutation', () => {
    const registry = createScenarioRegistry([s1, s3]);
    const first = registry.list();
    first.push(s1);
    expect(registry.list()).toHaveLength(2);
  });

  it('findByTrigger matches on fileType', () => {
    const registry = createScenarioRegistry([s1, s3]);
    const matched = registry.findByTrigger({ fileType: 'jpg' });
    expect(matched.map((s) => s.id)).toEqual(['S1']);
  });

  it('findByTrigger matches on userAction', () => {
    const registry = createScenarioRegistry([s1, s3]);
    const matched = registry.findByTrigger({ userAction: 'upload-case-files' });
    expect(matched.map((s) => s.id)).toEqual(['S1']);
  });

  it('findByTrigger matches on classifierTags via set intersection', () => {
    const registry = createScenarioRegistry([s1, s3]);
    const matched = registry.findByTrigger({ classifierTags: ['contract', 'something-else'] });
    expect(matched.map((s) => s.id)).toEqual(['S3']);
  });

  it('findByTrigger returns scenarios matching any dimension (OR semantics)', () => {
    const registry = createScenarioRegistry([s1, s3]);
    const matched = registry.findByTrigger({ fileType: 'docx', userAction: 'upload-case-files' });
    expect(matched.map((s) => s.id).sort()).toEqual(['S1', 'S3']);
  });

  it('findByTrigger returns an empty array when nothing matches', () => {
    const registry = createScenarioRegistry([s1, s3]);
    const matched = registry.findByTrigger({ fileType: 'xlsx' });
    expect(matched).toEqual([]);
  });

  it('findByTrigger returns an empty array when the context has no fields set', () => {
    const registry = createScenarioRegistry([s1, s3]);
    const matched = registry.findByTrigger({});
    expect(matched).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- packages/registry/src/query.test.ts`
Expected: FAIL —— 找不到模块 `./query.js`。

- [ ] **Step 3: 实现 `packages/registry/src/query.ts`**

```ts
import type { ScenarioDefinition } from './scenario.js';

export interface TriggerContext {
  fileType?: string;
  userAction?: string;
  classifierTags?: string[];
}

export interface ScenarioRegistry {
  list(): ScenarioDefinition[];
  findByTrigger(context: TriggerContext): ScenarioDefinition[];
}

/** 跨维度 OR：MVP 阶段注册表是推荐器不是准入门禁，命中任一维度即算匹配；不做排序/优先级。 */
function matches(scenario: ScenarioDefinition, context: TriggerContext): boolean {
  const { trigger } = scenario;
  const fileTypeMatches =
    context.fileType !== undefined && trigger.fileTypes.includes(context.fileType);
  const userActionMatches =
    context.userAction !== undefined && trigger.userActions.includes(context.userAction);
  const classifierTagMatches =
    context.classifierTags !== undefined &&
    context.classifierTags.some((tag) => trigger.classifierTags.includes(tag));
  return fileTypeMatches || userActionMatches || classifierTagMatches;
}

export function createScenarioRegistry(scenarios: ScenarioDefinition[]): ScenarioRegistry {
  const snapshot = [...scenarios];
  return {
    list(): ScenarioDefinition[] {
      return [...snapshot];
    },
    findByTrigger(context: TriggerContext): ScenarioDefinition[] {
      return snapshot.filter((scenario) => matches(scenario, context));
    },
  };
}
```

- [ ] **Step 4: 追加 barrel 导出，`packages/registry/src/index.ts` 变为**

```ts
export * from './scenario.js';
export * from './loader.js';
export * from './query.js';
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `pnpm test -- packages/registry/src/query.test.ts`
Expected: PASS —— 8 tests passed。

- [ ] **Step 6: 提交**

```bash
git add packages/registry/src/query.ts packages/registry/src/query.test.ts packages/registry/src/index.ts
git commit -m "$(cat <<'EOF'
feat(registry): add scenario query API

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 内置 MVP 四场景声明文件（S1–S4）

**Files:**
- Create: `packages/registry/scenarios/S1.yaml`
- Create: `packages/registry/scenarios/S2.yaml`
- Create: `packages/registry/scenarios/S3.yaml`
- Create: `packages/registry/scenarios/S4.yaml`
- Create: `packages/registry/src/builtin-scenarios.test.ts`

- [ ] **Step 1: 写失败测试 `packages/registry/src/builtin-scenarios.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenariosFromDir } from './loader.js';

const SCENARIOS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'scenarios');

describe('built-in MVP scenarios', () => {
  it('loads and validates all four built-in scenario declarations', () => {
    const scenarios = loadScenariosFromDir(SCENARIOS_DIR);
    expect(scenarios.map((s) => s.id)).toEqual(['S1', 'S2', 'S3', 'S4']);
  });

  it('S1 卷宗阅卷 produces CaseFile, Timeline, and PartyGraph', () => {
    const scenarios = loadScenariosFromDir(SCENARIOS_DIR);
    const s1 = scenarios.find((s) => s.id === 'S1');
    expect(s1?.outputArtifacts).toEqual(['CaseFile', 'Timeline', 'PartyGraph']);
  });

  it('S3 合同审查 requires party-verify and produces RiskList', () => {
    const scenarios = loadScenariosFromDir(SCENARIOS_DIR);
    const s3 = scenarios.find((s) => s.id === 'S3');
    expect(s3?.toolIds).toEqual(['party-verify']);
    expect(s3?.outputArtifacts).toEqual(['RiskList']);
  });

  it('S4 文书起草 has no output artifact yet, pending the W4 RevisionInstructionSet proposal', () => {
    const scenarios = loadScenariosFromDir(SCENARIOS_DIR);
    const s4 = scenarios.find((s) => s.id === 'S4');
    expect(s4?.outputArtifacts).toEqual([]);
    expect(s4?.confirmationGates[0]?.artifact).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `pnpm test -- packages/registry/src/builtin-scenarios.test.ts`
Expected: FAIL —— `packages/registry/scenarios/` 目录尚不存在，`loadScenariosFromDir` 内部 `readdirSync` 抛出 `ENOENT: no such file or directory`，测试因未捕获异常而失败。

- [ ] **Step 3: 创建 `packages/registry/scenarios/S1.yaml`（卷宗阅卷）**

```yaml
id: S1
name: 卷宗阅卷
trigger:
  fileTypes:
    - pdf
    - jpg
    - png
  userActions:
    - upload-case-files
  classifierTags: []
inputArtifacts: []
toolIds: []
outputArtifacts:
  - CaseFile
  - Timeline
  - PartyGraph
uiTemplateId: case-intake-panel
confirmationGates:
  - artifact: Timeline
    label: 确认事件时间线后再据此生成其他产物
  - artifact: PartyGraph
    label: 确认当事人关系图谱
promptTemplateRef: S1-case-intake-v0
```

- [ ] **Step 4: 创建 `packages/registry/scenarios/S2.yaml`（矩阵审阅）**

```yaml
id: S2
name: 矩阵审阅
trigger:
  fileTypes: []
  userActions:
    - start-matrix-review
  classifierTags: []
inputArtifacts:
  - CaseFile
toolIds: []
outputArtifacts:
  - ReviewMatrix
uiTemplateId: matrix-review-panel
confirmationGates:
  - artifact: ReviewMatrix
    label: 确认矩阵审阅结果
promptTemplateRef: S2-matrix-review-v0
```

- [ ] **Step 5: 创建 `packages/registry/scenarios/S3.yaml`（合同审查）**

```yaml
id: S3
name: 合同审查
trigger:
  fileTypes:
    - docx
    - pdf
  userActions:
    - start-contract-review
  classifierTags:
    - contract
inputArtifacts:
  - CaseFile
toolIds:
  - party-verify
outputArtifacts:
  - RiskList
uiTemplateId: risk-review-panel
confirmationGates:
  - artifact: RiskList
    label: 确认风险清单后再生成修订与批注文书
promptTemplateRef: S3-contract-review-v0
```

- [ ] **Step 6: 创建 `packages/registry/scenarios/S4.yaml`（文书起草）**

```yaml
id: S4
name: 文书起草
trigger:
  fileTypes: []
  userActions:
    - start-drafting
  classifierTags: []
inputArtifacts:
  - CaseFile
  - Timeline
  - PartyGraph
toolIds: []
outputArtifacts: []
uiTemplateId: draft-review-panel
confirmationGates:
  - label: 确认起诉状/答辩状草稿内容（产物契约待 W4 RevisionInstructionSet 落地后补充结构化引用）
promptTemplateRef: S4-pleading-draft-v0
```

- [ ] **Step 7: 运行测试，确认通过**

Run: `pnpm test -- packages/registry/src/builtin-scenarios.test.ts`
Expected: PASS —— 4 tests passed。

- [ ] **Step 8: 提交**

```bash
git add packages/registry/scenarios/S1.yaml packages/registry/scenarios/S2.yaml packages/registry/scenarios/S3.yaml packages/registry/scenarios/S4.yaml packages/registry/src/builtin-scenarios.test.ts
git commit -m "$(cat <<'EOF'
feat(registry): add built-in S1-S4 scenario declarations

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 跨层 TODO 记录（S1/S4 产物类型缺口）

**Files:**
- Modify: `packages/schemas/SPEC.md`
- Modify: `packages/registry/SPEC.md`

- [ ] **Step 1: 修改 `packages/schemas/SPEC.md` 的 TODO 区**

找到：

```markdown
## TODO（跨层放入区）

（空）

## 验收记录
```

替换为：

```markdown
## TODO（跨层放入区）

- [架构拍板 2026-07-09] 文书起草/修订指令集产物类型待 W4 提案（架构已拍板路径，见 `packages/output/SPEC.md` TODO：暂名 `RevisionInstructionSet`，含 `ArtifactTypeEnum` 增量扩展）；矛盾清单（`ContradictionList`，供 S1 卷宗阅卷使用）产物类型待 W3 spike 结论后定。两者合入前，`packages/registry` 的 S4 声明以 label-only 确认门禁过渡（不声明 outputArtifacts），S1 声明不含矛盾清单产出。

## 验收记录
```

- [ ] **Step 2: 修改 `packages/registry/SPEC.md` 的 TODO 区**

找到：

```markdown
## TODO（跨层放入区）

（空）
```

替换为：

```markdown
## TODO（跨层放入区）

- [架构拍板 2026-07-09] S4（文书起草）当前不声明 `outputArtifacts`，`confirmationGates` 用 label-only 门禁过渡；真正的产物类型（`RevisionInstructionSet`）由 W4 在 `packages/schemas` 提案落地后，S4 声明需同步更新为引用该类型（详见 `packages/schemas/SPEC.md` TODO、`packages/output/SPEC.md` TODO）。
- [架构拍板 2026-07-09] S1（卷宗阅卷）当前 `outputArtifacts` 不含"供述/证据矛盾清单"，因为对应的 `ContradictionList` 产物类型待 W3 spike 结论后另行判断是否新增（详见 `packages/schemas/SPEC.md` TODO）。若新增，S1 声明需同步更新。
```

- [ ] **Step 3: 提交**

```bash
git add packages/schemas/SPEC.md packages/registry/SPEC.md
git commit -m "$(cat <<'EOF'
docs(registry): record cross-layer TODO for S1/S4 artifact-type gaps

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: 全量验证与完工记录

**Files:**
- Modify: `packages/registry/SPEC.md`

- [ ] **Step 1: 干净环境验证**

```bash
rm -rf node_modules packages/*/node_modules
pnpm install
pnpm test
pnpm lint
pnpm -r run build
```

Expected：`pnpm install` 无 `ERR_PNPM`；`pnpm test` 全绿（`packages/schemas` 原有 57 例 + `packages/registry` 新增 30 例：scenario 9 + loader 9 + query 8 + builtin-scenarios 4）；`pnpm lint` 无 error；`pnpm -r run build` 两个包（schemas、registry）都编译通过。

- [ ] **Step 2: 修改 `packages/registry/SPEC.md` 状态区**

找到：

```markdown
状态：未开工（依赖 W1 schemas）
```

替换为：

```markdown
状态：已完成
```

- [ ] **Step 3: 在 `packages/registry/SPEC.md` 末尾追加验收记录**

在文件末尾（TODO 区之后）追加：

```markdown

## 验收记录

- 2026-07-09：W2 完成。场景定义 schema（`ScenarioDefinitionSchema`）、YAML 声明文件加载器（`parseScenarioYaml`/`loadScenarioFile`/`loadScenariosFromDir`）、触发匹配与场景清单查询 API（`createScenarioRegistry`）、内置 S1–S4 四场景声明文件全部交付。`pnpm test` 全绿，`pnpm lint` 无 error，`pnpm -r run build` 通过。全部在移除 node_modules 后的干净环境重新 `pnpm install` 复核过。
  - 设计取舍：
    - `inputArtifacts`/`outputArtifacts` 复用 `@courtwork/schemas` 的 `ArtifactTypeEnum`（从 `revision-event.ts` 经 barrel 导出），不平行定义一份产物类型名单——避免两处名单漂移。
    - `confirmationGates[].artifact` 为可选字段：存在时必须 ⊆ `outputArtifacts`（跨字段 refine 校验）；缺省时仅凭 `label` 独立成立，用于产物尚无对应 schema 类型的场景（S4）。门禁的本体是"此处必须留人"，产物引用是它的强化形式，非必要条件——已与架构层确认。
    - `confirmationGates` 强制非空（`.min(1)`）：把 CLAUDE.md"留人确认是产品纪律"落到校验层，场景定义漏掉确认节点会在加载时报错，而非等到运行时才发现产品纪律被违反。
    - `toolIds` 只做结构校验（非空字符串、数组内不重复），不针对具体 id 做白名单限制：`packages/tools`（W5）尚未开工，硬编码具体工具 id 会违背"注册表不用改代码就能上新场景/工具"的设计初衷。
    - 声明文件格式选 YAML（新增 `yaml` 依赖）而非 JSON：更符合"产品团队周级上新场景"的可读性/可维护性目标。
    - `loadScenariosFromDir` 按文件名排序后逐个加载，遇到第一个非法文件即抛出（fail-fast），错误信息包含文件路径与具体字段路径；额外做了场景 id 跨文件查重。非契约行为，以后若嫌不够友好可切换为收集全部错误再一次性报告。
    - `findByTrigger` 用跨维度 OR（文件类型/用户动作/分类器标签任一命中即算匹配），不做排序/优先级——MVP 阶段注册表是推荐器不是准入门禁，排序留给真实用量数据之后。
  - 已知内容缺口（架构已拍板路径，见上方 TODO）：
    - S1（卷宗阅卷）的"供述/证据矛盾清单"当前不在 `outputArtifacts` 里——对应的 `ContradictionList` 产物类型待 W3 spike 结论后另行判断是否新增。
    - S4（文书起草）当前 `outputArtifacts` 为空数组——真正的产物类型（`RevisionInstructionSet`）由 W4 在 `packages/schemas` 提案落地后再补上，现以 label-only 确认门禁过渡。
  - 跨层动作：已在 `packages/schemas/SPEC.md` 的 TODO 区记录上述两处缺口的架构决定路径。
```

- [ ] **Step 4: 提交**

```bash
git add packages/registry/SPEC.md
git commit -m "$(cat <<'EOF'
docs(registry): update SPEC status and record W2 completion

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: 最终检查**

```bash
git status
git log --oneline -10
```

Expected：工作树干净；最近提交按任务分层（工程骨架 → schema → loader → query → 内置场景 → 跨层 TODO → 完工记录）。
