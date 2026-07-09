# packages/core（W6）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付 `packages/core`：provider 无关的最小 agent loop（形状借鉴 pi-mono，代码自写）、场景执行器（registry 声明 → 编排工具调用/生成 → schema 合规 artifact → 停在确认门禁）、可序列化事件流协议（含异步确认、session 续行两条预留）、信源等级传播与门禁、RevisionEvent 落盘捕获、demo 装配点（全仓库唯一 import `@courtwork/demo-data` 的运行时文件）。验收：CLI 脚本跑通 S3 全流程（CaseFile → party-verify → RiskList → 脚本模拟确认（含一条真实 RevisionEvent）→ RevisionInstructionSet → 调 output 产出 docx），事件流全程可回放。

**Architecture:** 单一新增 pnpm workspace 包 `@courtwork/core`，依赖 `@courtwork/schemas`/`@courtwork/registry`/`@courtwork/tools`/`@courtwork/output`/`@courtwork/demo-data`。八个内部子模块各管一段：`provider/`（Provider 抽象 + 录制回放假 provider）、`evidence/`（信源等级台账 + 通用门禁函数）、`events/`（可序列化事件类型 + 落盘事件日志 + 纯函数 replay）、`tools/`（工具注册表，toolId → {ToolDefinition, grade} 绑定）、`session/`（确认继续状态的落盘存储，pause/resume 的持久化边界）、`revision/`（JSON Pointer 应用 + RevisionEvent 落盘存储）、`scenario-executor/`（把以上全部编排起来的 `runScenario`/`resumeScenario`，唯一认识 `ScenarioDefinition` 形状的模块）、`composition/`（demo 装配点 + 验收脚本自己的 RiskList→RevisionInstructionSet 编译 glue，唯一允许法律味的角落）。场景执行的核心算法是数据驱动的：`outputArtifacts` 声明顺序即产出顺序（registry/SPEC.md 已补注该契约语义），`toolIds` 全部前置一次性执行，confirmationGates 命中即暂停——不认识任何具体场景 id。pause/resume 跨越的是**磁盘边界**而非内存边界：`PendingConfirmation` 把继续场景所需的一切（已产出 artifact、剩余产出序列、工具结果、证据台账快照）打包落盘，`resumeScenario` 允许调用方用全新构造的依赖实例（模拟另一进程）接续。

**Tech Stack:** 沿用 W1 monorepo 基线（pnpm workspaces、TypeScript 6.0.3 strict/ESM/NodeNext、vitest 4.1.10、ESLint 10.6.0 + typescript-eslint 8.63.0）。不新增第三方依赖——provider/loop 是自研代码（判断点 1：pi-mono 借形不借库，见 CLAUDE.md 6cc21bc）。`scripts/demo-s3-flow.ts` 用 workspace 级 `tsx` 二进制运行（沿用 `packages/schemas/scripts/generate-json-schema.ts` 的既有模式，不需要在本包声明 tsx 依赖）。

---

## File Structure

```
Courtwork/
  packages/core/
    package.json                                        [新建]
    tsconfig.json                                        [新建]
    SPEC.md                                              [修改] 状态区 + 验收记录
    src/
      provider/
        types.ts                                         [新建] Provider, GenerationRequest/Response
        scripted-provider.ts                              [新建] createScriptedProvider（录制回放假 provider）
        scripted-provider.test.ts                         [新建]
      evidence/
        grade.ts                                          [新建] EvidenceGrade, EvidenceLedger, assertCitationAdmissible（D4）
        grade.test.ts                                     [新建]
      events/
        types.ts                                          [新建] SessionEvent 判别联合, ConfirmationActor, EvidenceGradeAnnotation
        event-log.ts                                      [新建] createEventLog/createFileEventLog, replaySession（D3）
        event-log.test.ts                                 [新建]
      tools/
        tool-registry.ts                                  [新建] ToolRegistry（toolId → {tool, grade} 绑定）
        tool-registry.test.ts                             [新建]
      session/
        confirmation-store.ts                             [新建] ConfirmationStore（内存 + 落盘两种实现）
        confirmation-store.test.ts                         [新建]
      revision/
        json-pointer.ts                                   [新建] applyJsonPointer（RFC 6901 最小实现）
        json-pointer.test.ts                               [新建]
        revision-store.ts                                 [新建] RevisionEventStore（内存 + 落盘 JSONL，D5）
        revision-store.test.ts                             [新建]
      scenario-executor/
        artifact-schemas.ts                                [新建] ArtifactType → zod schema 映射表
        artifact-schemas.test.ts                           [新建]
        executor.ts                                        [新建] runScenario/resumeScenario（D2）
        executor.test.ts                                   [新建]
      composition/
        demo-assembly.ts                                   [新建] buildDemoS3Runtime——全仓库唯一 import @courtwork/demo-data 的运行时文件（D6）
        s3-risk-list-response.ts                           [新建] 生成节点录制回放响应（7 条风险，6 条转录自 demo-data 样例 + 1 条 party-verify 来源新增）
        compile-risk-list-to-revisions.ts                  [新建] 已确认 RiskList → RevisionInstructionSet 的 demo glue（过 D4 门禁）
        compile-risk-list-to-revisions.test.ts             [新建]
      acceptance/
        run-s3-demo.ts                                     [新建] 验收流程的可复用实现（CLI 脚本与集成测试共用）
        s3-flow.integration.test.ts                        [新建] 验收标准的自动化断言
      index.ts                                              [新建] 公开 barrel，逐任务追加
    scripts/
      demo-s3-flow.ts                                       [新建] CLI 入口，`tsx scripts/demo-s3-flow.ts`
  CLAUDE.md                                                 [已修改，独立 commit 6cc21bc]
  packages/registry/SPEC.md                                 [已修改，独立 commit 3814cc9]
  packages/schemas/SPEC.md                                  [修改] TODO 区记录：若未来需要跨 session 持久的信源等级角标，可能需要给 RiskBasis/Citation 加字段——非本层实现，留给架构拍板
```

---

## Task 1: 工程骨架（package.json + tsconfig.json）

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`

- [ ] **Step 1: 创建 `packages/core/package.json`**

```json
{
  "name": "@courtwork/core",
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
    "test": "vitest run",
    "lint": "eslint .",
    "demo:s3": "tsx scripts/demo-s3-flow.ts"
  },
  "dependencies": {
    "@courtwork/schemas": "workspace:*",
    "@courtwork/registry": "workspace:*",
    "@courtwork/tools": "workspace:*",
    "@courtwork/output": "workspace:*",
    "@courtwork/demo-data": "workspace:*",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/node": "^26.1.1"
  }
}
```

`test`/`lint` 脚本显式声明——W5 验收记录过"包缺脚本导致 `--filter` 静默 no-op 假绿"的先例（`packages/tools`/`packages/demo-data` 事后用 `fix-by-acceptance` 补的），本包从骨架阶段就不留这个坑。

`@courtwork/demo-data` 是常规 `dependencies` 而非 `devDependency`：与 `packages/tools` 不同（tools 只在测试里引用 demo-data），本包的 `composition/demo-assembly.ts` 是**运行时**装配点，`docs/21` 明确这是全仓库唯一允许运行时 import 的位置。

- [ ] **Step 2: 创建 `packages/core/tsconfig.json`**

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

`types: ["node"]` 必须显式声明——W1 验收记录已确认自动 `@types` 发现在当前 pnpm + TS 组合下不可靠。本包大量使用 `node:fs`/`node:path`/`node:crypto`/`node:os`。

`scripts/demo-s3-flow.ts` 故意不在 `include` 范围内（不参与 `tsc -p tsconfig.json` 的 build 产物），沿用 `packages/schemas/scripts/generate-json-schema.ts` 的既有模式——独立可执行脚本用 `tsx` 直接跑，不进 `dist/`。

- [ ] **Step 3: 安装依赖**

```bash
pnpm install
```

Expected：`pnpm-lock.yaml` 更新，`@courtwork/core` 出现在 workspace 成员列表，五个 workspace 依赖通过 `workspace:*` 协议链接。

- [ ] **Step 4: 提交**

```bash
git add packages/core/package.json packages/core/tsconfig.json pnpm-lock.yaml
git commit -m "$(cat <<'EOF'
chore(core): scaffold @courtwork/core package

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Provider 抽象 + 录制回放假 provider（D1）

**Files:**
- Create: `packages/core/src/provider/types.ts`
- Create: `packages/core/src/provider/scripted-provider.ts`
- Create: `packages/core/src/provider/scripted-provider.test.ts`
- Create: `packages/core/src/index.ts`

- [ ] **Step 1: 写 `packages/core/src/provider/types.ts`**

```ts
export interface GenerationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerationRequest {
  systemPrompt?: string;
  messages: GenerationMessage[];
}

export interface GenerationResponse {
  content: string;
}

/**
 * Provider 抽象：模型 id/参数在构造具体 provider 实例时固定（配置驱动），
 * generate() 本身不接受运行时可变的模型选择——防止调用方在业务代码里写死切换逻辑。
 * 不含工具调用能力：依据 docs/24，场景是声明式固定编排，工具调用由执行器编排，
 * 不是模型自主选择——不需要 ReAct 式的模型自主选工具循环。
 */
export interface Provider {
  readonly id: string;
  readonly modelId: string;
  generate(request: GenerationRequest): Promise<GenerationResponse>;
}
```

- [ ] **Step 2: 写失败测试 `packages/core/src/provider/scripted-provider.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { createScriptedProvider, ScriptedProviderExhaustedError } from './scripted-provider.js';

describe('createScriptedProvider', () => {
  it('exposes the given id and modelId', () => {
    const provider = createScriptedProvider('demo-provider', 'fake-v1', []);
    expect(provider.id).toBe('demo-provider');
    expect(provider.modelId).toBe('fake-v1');
  });

  it('returns scripted responses in call order', async () => {
    const provider = createScriptedProvider('demo-provider', 'fake-v1', [
      { content: 'first' },
      { content: 'second' },
    ]);
    const first = await provider.generate({ messages: [{ role: 'user', content: 'a' }] });
    const second = await provider.generate({ messages: [{ role: 'user', content: 'b' }] });
    expect(first.content).toBe('first');
    expect(second.content).toBe('second');
  });

  it('throws ScriptedProviderExhaustedError once the script runs out', async () => {
    const provider = createScriptedProvider('demo-provider', 'fake-v1', [{ content: 'only-one' }]);
    await provider.generate({ messages: [] });
    await expect(provider.generate({ messages: [] })).rejects.toThrow(ScriptedProviderExhaustedError);
  });

  it('does not require the request content to match anything (opaque passthrough)', async () => {
    const provider = createScriptedProvider('demo-provider', 'fake-v1', [{ content: 'x' }]);
    const response = await provider.generate({ systemPrompt: 'irrelevant', messages: [{ role: 'user', content: 'anything at all' }] });
    expect(response.content).toBe('x');
  });
});
```

- [ ] **Step 3: 确认测试按预期失败**

```bash
pnpm test -- packages/core
```

Expected：报错 `Cannot find module './scripted-provider.js'`（文件不存在）。

- [ ] **Step 4: 写最小实现 `packages/core/src/provider/scripted-provider.ts`**

```ts
import type { GenerationRequest, GenerationResponse, Provider } from './types.js';

export class ScriptedProviderExhaustedError extends Error {
  constructor(providerId: string, scriptLength: number) {
    super(
      `录制回放 provider "${providerId}" 的脚本（共 ${scriptLength} 条）已耗尽，收到了超出录制范围的第 ${scriptLength + 1} 次 generate() 调用`,
    );
    this.name = 'ScriptedProviderExhaustedError';
  }
}

/**
 * 录制回放假 provider：按调用顺序依次返回脚本里预置的响应，不依赖真实 API。
 * SPEC 要求"测试用假 provider/录制回放，不依赖真实 API"——本模块是该要求的落点。
 */
export function createScriptedProvider(id: string, modelId: string, script: GenerationResponse[]): Provider {
  let cursor = 0;
  return {
    id,
    modelId,
    async generate(_request: GenerationRequest): Promise<GenerationResponse> {
      if (cursor >= script.length) {
        throw new ScriptedProviderExhaustedError(id, script.length);
      }
      const response = script[cursor];
      cursor += 1;
      return response;
    },
  };
}
```

- [ ] **Step 5: 创建 `packages/core/src/index.ts`**

```ts
export * from './provider/types.js';
export * from './provider/scripted-provider.js';
```

- [ ] **Step 6: 确认测试通过**

```bash
pnpm test -- packages/core
```

Expected：4 例全绿。

- [ ] **Step 7: 提交**

```bash
git add packages/core/src/provider packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): Provider abstraction + scripted (record/replay) provider

D1：pi-mono 借形不借库——自研 Provider 接口，只借鉴其"极简协议化、
provider 无关"的设计形状。不含工具调用能力：场景是声明式固定编排
（docs/24），LLM 只在生成节点被调用，不需要 ReAct 式模型自主选工具
循环。ScriptedProvider 是测试与 CLI 演示用的录制回放实现，不依赖
真实 API。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: 信源等级台账 + 通用门禁函数（D4）

**Files:**
- Create: `packages/core/src/evidence/grade.ts`
- Create: `packages/core/src/evidence/grade.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/core/src/evidence/grade.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { assertCitationAdmissible, createEvidenceLedger, InadmissibleCitationError } from './grade.js';

describe('EvidenceLedger', () => {
  it('records and retrieves an evidence entry by key', () => {
    const ledger = createEvidenceLedger();
    ledger.record('party-verify', { grade: 'B', sourceId: 'demo-fixture', confirmed: false });
    expect(ledger.get('party-verify')).toEqual({ grade: 'B', sourceId: 'demo-fixture', confirmed: false });
  });

  it('returns undefined for an untracked key', () => {
    const ledger = createEvidenceLedger();
    expect(ledger.get('unknown-key')).toBeUndefined();
  });

  it('confirm() flips the confirmed flag without touching other fields', () => {
    const ledger = createEvidenceLedger();
    ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
    ledger.confirm('web-search');
    expect(ledger.get('web-search')).toEqual({ grade: 'C', sourceId: 'web-search', confirmed: true });
  });

  it('confirm() on an untracked key is a harmless no-op', () => {
    const ledger = createEvidenceLedger();
    expect(() => ledger.confirm('never-recorded')).not.toThrow();
  });

  it('snapshot() projects every recorded entry with its key', () => {
    const ledger = createEvidenceLedger();
    ledger.record('party-verify', { grade: 'B', sourceId: 'demo-fixture', confirmed: false });
    ledger.record('cite-check', { grade: 'A', sourceId: 'public-law-db', confirmed: false });
    const snapshot = ledger.snapshot();
    expect(snapshot).toHaveLength(2);
    expect(snapshot).toContainEqual({ key: 'party-verify', grade: 'B', sourceId: 'demo-fixture', confirmed: false });
    expect(snapshot).toContainEqual({ key: 'cite-check', grade: 'A', sourceId: 'public-law-db', confirmed: false });
  });
});

describe('assertCitationAdmissible', () => {
  it('admits an A-grade citation', () => {
    const ledger = createEvidenceLedger();
    ledger.record('cite-check', { grade: 'A', sourceId: 'public-law-db', confirmed: false });
    expect(() => assertCitationAdmissible(ledger, 'cite-check')).not.toThrow();
  });

  it('admits a B-grade citation', () => {
    const ledger = createEvidenceLedger();
    ledger.record('party-verify', { grade: 'B', sourceId: 'demo-fixture', confirmed: false });
    expect(() => assertCitationAdmissible(ledger, 'party-verify')).not.toThrow();
  });

  it('rejects an unconfirmed C-grade citation with InadmissibleCitationError', () => {
    const ledger = createEvidenceLedger();
    ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
    expect(() => assertCitationAdmissible(ledger, 'web-search')).toThrow(InadmissibleCitationError);
  });

  it('admits a C-grade citation once explicitly confirmed', () => {
    const ledger = createEvidenceLedger();
    ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
    ledger.confirm('web-search');
    expect(() => assertCitationAdmissible(ledger, 'web-search')).not.toThrow();
  });

  it('admits a key with no tracked evidence at all (not tool-sourced, e.g. a direct case-file quote)', () => {
    const ledger = createEvidenceLedger();
    expect(() => assertCitationAdmissible(ledger, '《中华人民共和国民法典》第五百八十五条')).not.toThrow();
  });
});
```

- [ ] **Step 2: 确认测试按预期失败**

```bash
pnpm test -- packages/core
```

Expected：报错 `Cannot find module './grade.js'`。

- [ ] **Step 3: 写最小实现 `packages/core/src/evidence/grade.ts`**

```ts
export type EvidenceGrade = 'A' | 'B' | 'C';

export interface EvidenceRecord {
  grade: EvidenceGrade;
  sourceId: string;
  confirmed: boolean;
}

export interface EvidenceGradeAnnotation extends EvidenceRecord {
  key: string;
}

export interface EvidenceLedger {
  record(key: string, evidence: EvidenceRecord): void;
  get(key: string): EvidenceRecord | undefined;
  confirm(key: string): void;
  snapshot(): EvidenceGradeAnnotation[];
}

/**
 * 通用证据台账：orchestration 过程中把"这条引用背后是哪次工具调用、什么等级"
 * 记进本次运行的台账。不塞进 schemas 定义的 artifact 本体（docs/20"嵌入形状归
 * schemas、映射归 core"——现在不嵌，将来要嵌走 schemas 提案）。
 */
export function createEvidenceLedger(): EvidenceLedger {
  const entries = new Map<string, EvidenceRecord>();
  return {
    record(key, evidence) {
      entries.set(key, evidence);
    },
    get(key) {
      return entries.get(key);
    },
    confirm(key) {
      const existing = entries.get(key);
      if (existing === undefined) return;
      entries.set(key, { ...existing, confirmed: true });
    },
    snapshot() {
      return [...entries.entries()].map(([key, evidence]) => ({ key, ...evidence }));
    },
  };
}

export class InadmissibleCitationError extends Error {
  constructor(
    public readonly key: string,
    public readonly grade: EvidenceGrade,
  ) {
    super(
      `证据 "${key}" 等级为 C（网络参考）且未经确认，不得进入修订指令集的 citation（docs/20：C 级事实不得未经确认流入 docx 批注依据）`,
    );
    this.name = 'InadmissibleCitationError';
  }
}

/**
 * 通用门禁：C 级且未确认 → 拒绝；A/B 级或已确认的 C 级 → 放行；台账里没有记录
 * （非工具来源的证据，如直接引用卷宗原文）→ 放行，不适用信源分级。
 * 不认识任何具体工具 id 或场景 id——等级判定的具体绑定关系由调用方（装配点）决定。
 */
export function assertCitationAdmissible(ledger: EvidenceLedger, key: string): void {
  const evidence = ledger.get(key);
  if (evidence === undefined) return;
  if (evidence.grade === 'C' && !evidence.confirmed) {
    throw new InadmissibleCitationError(key, evidence.grade);
  }
}
```

- [ ] **Step 4: 更新 `packages/core/src/index.ts`**

```ts
export * from './provider/types.js';
export * from './provider/scripted-provider.js';
export * from './evidence/grade.js';
```

- [ ] **Step 5: 确认测试通过**

```bash
pnpm test -- packages/core
```

Expected：新增 10 例全绿（累计 14 例）。

- [ ] **Step 6: 提交**

```bash
git add packages/core/src/evidence packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): evidence grade ledger + admissibility gate (D4)

通用机制，不写任何场景特判：等级判定（sourceId→grade）留给调用方
（装配点）声明，本模块只提供台账存取与"C 级且未确认→拒绝"的门禁
函数。不改 packages/schemas——等级不塞进 artifact 本体，走 core 自己
的事件流协议传播（判断点 3，与用户确认过的方案）。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 事件类型 + 落盘事件日志 + 纯函数 replay（D3 核心）

**Files:**
- Create: `packages/core/src/events/types.ts`
- Create: `packages/core/src/events/event-log.ts`
- Create: `packages/core/src/events/event-log.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 写 `packages/core/src/events/types.ts`**

```ts
import type { ArtifactType } from '@courtwork/schemas';
import type { EvidenceGradeAnnotation } from '../evidence/grade.js';

/**
 * 渠道无关身份标识：不隐含确认方与 core 同进程/同机/同客户端（SPEC TODO 异步确认预留）。
 * channelId 对应未来的 IM/工作流通道网关（企微/飞书/钉钉/律所内部 OA），actorId 对应
 * RevisionEvent.actor.userId。
 */
export interface ConfirmationActor {
  channelId: string;
  actorId: string;
  role?: string;
}

/**
 * 确认质量埋点透传字段（docs/09 防呆调研 + docs/30 拍板"防呆三原则"之三，2026-07-09
 * 追加）：core 只记录，不解读、不告警——告警/重新设计判定是 MVP 后 eval/运营面板的职责。
 */
export interface ConfirmationInstrumentation {
  dwellMs?: number;
  expandedEvidenceKeys?: string[];
}

interface BaseEvent {
  sessionId: string;
  seq: number;
  emittedAt: string;
}

export type SessionEvent =
  | (BaseEvent & { type: 'progress'; message: string })
  | (BaseEvent & {
      type: 'artifact_produced';
      artifactType: ArtifactType;
      artifact: unknown;
      /** D4 台账的投影：W9 渲染信源等级角标的数据源，不需要改 schemas（判断点 3 追加要求）。 */
      evidenceGrades: EvidenceGradeAnnotation[];
    })
  | (BaseEvent & {
      type: 'confirmation_requested';
      requestId: string;
      gateLabel: string;
      artifactType?: ArtifactType;
    })
  | (BaseEvent & {
      type: 'confirmation_resolved';
      requestId: string;
      actor: ConfirmationActor;
      decision: 'confirm' | 'reject';
      instrumentation?: ConfirmationInstrumentation;
    })
  | (BaseEvent & { type: 'revision_recorded'; revisionEventId: string })
  | (BaseEvent & { type: 'scenario_completed' })
  | (BaseEvent & { type: 'error'; message: string });

export type SessionEventInput = Omit<SessionEvent, 'seq' | 'emittedAt' | 'sessionId'>;
```

- [ ] **Step 2: 写失败测试 `packages/core/src/events/event-log.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEventLog, createFileEventLog, replaySession } from './event-log.js';

describe('createEventLog (in-memory)', () => {
  it('assigns a monotonic seq starting at 0 and stamps sessionId/emittedAt', () => {
    const log = createEventLog('session-1', () => '2026-07-10T00:00:00.000Z');
    const first = log.append({ type: 'progress', message: 'starting' });
    const second = log.append({ type: 'progress', message: 'still going' });
    expect(first).toEqual({ type: 'progress', message: 'starting', sessionId: 'session-1', seq: 0, emittedAt: '2026-07-10T00:00:00.000Z' });
    expect(second.seq).toBe(1);
  });

  it('list() returns a defensive copy', () => {
    const log = createEventLog('session-1');
    log.append({ type: 'progress', message: 'a' });
    const snapshot = log.list();
    snapshot.push({ type: 'progress', message: 'injected', sessionId: 'x', seq: 99, emittedAt: 'x' });
    expect(log.list()).toHaveLength(1);
  });
});

describe('createFileEventLog (durable, simulates cross-process resume)', () => {
  it('a fresh instance pointed at the same file sees everything a prior instance appended', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-eventlog-'));
    const filePath = join(dir, 'events.jsonl');
    try {
      const first = createFileEventLog('session-1', filePath, () => '2026-07-10T00:00:00.000Z');
      first.append({ type: 'progress', message: 'from first instance' });

      const second = createFileEventLog('session-1', filePath, () => '2026-07-10T00:01:00.000Z');
      second.append({ type: 'scenario_completed' });

      const events = second.list();
      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({ type: 'progress', message: 'from first instance', seq: 0 });
      expect(events[1]).toMatchObject({ type: 'scenario_completed', seq: 1 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('replaySession', () => {
  it('reconstructs produced artifacts, confirmation outcomes, revision ids, and completion purely from events', () => {
    const summary = replaySession([
      { type: 'artifact_produced', artifactType: 'RiskList', artifact: { caseId: 'c1', risks: [] }, evidenceGrades: [], sessionId: 's', seq: 0, emittedAt: 't0' },
      { type: 'confirmation_requested', requestId: 'req-1', gateLabel: '确认', artifactType: 'RiskList', sessionId: 's', seq: 1, emittedAt: 't1' },
      {
        type: 'confirmation_resolved',
        requestId: 'req-1',
        actor: { channelId: 'cli', actorId: 'u1' },
        decision: 'confirm',
        sessionId: 's',
        seq: 2,
        emittedAt: 't2',
      },
      { type: 'revision_recorded', revisionEventId: 'rev-1', sessionId: 's', seq: 3, emittedAt: 't3' },
      { type: 'scenario_completed', sessionId: 's', seq: 4, emittedAt: 't4' },
    ]);
    expect(summary.artifacts.RiskList).toEqual({ caseId: 'c1', risks: [] });
    expect(summary.confirmations['req-1']).toEqual({ actor: { channelId: 'cli', actorId: 'u1' }, decision: 'confirm' });
    expect(summary.revisionEventIds).toEqual(['rev-1']);
    expect(summary.completed).toBe(true);
  });

  it('completed is false when no scenario_completed event is present', () => {
    const summary = replaySession([{ type: 'progress', message: 'x', sessionId: 's', seq: 0, emittedAt: 't0' }]);
    expect(summary.completed).toBe(false);
  });
});
```

- [ ] **Step 3: 确认测试按预期失败**

```bash
pnpm test -- packages/core
```

Expected：报错 `Cannot find module './event-log.js'`。

- [ ] **Step 4: 写最小实现 `packages/core/src/events/event-log.ts`**

```ts
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ArtifactType } from '@courtwork/schemas';
import type { ConfirmationActor, SessionEvent, SessionEventInput } from './types.js';

export interface EventLog {
  readonly sessionId: string;
  append(event: SessionEventInput): SessionEvent;
  list(): SessionEvent[];
}

export function createEventLog(sessionId: string, now: () => string = () => new Date().toISOString()): EventLog {
  const events: SessionEvent[] = [];
  return {
    sessionId,
    append(input) {
      const event = { ...input, sessionId, seq: events.length, emittedAt: now() } as SessionEvent;
      events.push(event);
      return event;
    },
    list() {
      return [...events];
    },
  };
}

/**
 * 落盘实现：append 追加一行 JSONL，list()/append() 每次都从磁盘重新读取整段历史——
 * 用一个指向同一文件的新实例，就是"另一个进程接续同一 session"的忠实模拟，
 * 覆盖异步确认预留要求的"事件流不隐含单进程/单机/单客户端假设"。
 */
export function createFileEventLog(
  sessionId: string,
  filePath: string,
  now: () => string = () => new Date().toISOString(),
): EventLog {
  mkdirSync(dirname(filePath), { recursive: true });
  const readAll = (): SessionEvent[] => {
    if (!existsSync(filePath)) return [];
    return readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as SessionEvent);
  };
  return {
    sessionId,
    append(input) {
      const seq = readAll().length;
      const event = { ...input, sessionId, seq, emittedAt: now() } as SessionEvent;
      appendFileSync(filePath, `${JSON.stringify(event)}\n`, 'utf-8');
      return event;
    },
    list() {
      return readAll();
    },
  };
}

export interface ReplaySummary {
  artifacts: Partial<Record<ArtifactType, unknown>>;
  confirmations: Record<string, { actor: ConfirmationActor; decision: 'confirm' | 'reject' }>;
  revisionEventIds: string[];
  completed: boolean;
}

/** 纯函数：只靠事件流本身重建产出与确认结果，证明"事件流可回放"不是一句空话。 */
export function replaySession(events: SessionEvent[]): ReplaySummary {
  const summary: ReplaySummary = { artifacts: {}, confirmations: {}, revisionEventIds: [], completed: false };
  for (const event of events) {
    if (event.type === 'artifact_produced') {
      summary.artifacts[event.artifactType] = event.artifact;
    } else if (event.type === 'confirmation_resolved') {
      summary.confirmations[event.requestId] = { actor: event.actor, decision: event.decision };
    } else if (event.type === 'revision_recorded') {
      summary.revisionEventIds.push(event.revisionEventId);
    } else if (event.type === 'scenario_completed') {
      summary.completed = true;
    }
  }
  return summary;
}
```

- [ ] **Step 5: 更新 `packages/core/src/index.ts`**

```ts
export * from './provider/types.js';
export * from './provider/scripted-provider.js';
export * from './evidence/grade.js';
export * from './events/types.js';
export * from './events/event-log.js';
```

- [ ] **Step 6: 确认测试通过**

```bash
pnpm test -- packages/core
```

Expected：新增 4 例全绿（累计 18 例）。

- [ ] **Step 7: 提交**

```bash
git add packages/core/src/events packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): serializable session event protocol + durable event log (D3)

SessionEvent 判别联合覆盖 progress/artifact_produced/
confirmation_requested/confirmation_resolved/revision_recorded/
scenario_completed/error 七种。ConfirmationActor 是渠道无关身份
标识，不隐含确认方与 core 同进程/同机/同客户端。artifact_produced
携带 D4 证据台账的投影（evidenceGrades），W9 渲染信源角标不需要
改 schemas。confirmation_resolved 携带可选的确认质量埋点透传字段
（docs/09+docs/30 防呆三原则之三）——core 只记录不解读。

createFileEventLog + 测试证明：指向同一文件的全新实例能看到此前
实例写入的完整历史，这是"另一进程接续同一 session"的忠实模拟。
replaySession 是纯函数，只靠事件流重建产出/确认/completed 状态。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 确认继续状态存储（异步确认预留的落盘边界）

**Files:**
- Create: `packages/core/src/session/confirmation-store.ts`
- Create: `packages/core/src/session/confirmation-store.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/core/src/session/confirmation-store.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileConfirmationStore, createInMemoryConfirmationStore, type PendingConfirmation } from './confirmation-store.js';

function samplePending(requestId: string): PendingConfirmation {
  return {
    requestId,
    sessionId: 'session-1',
    scenarioId: 'S3',
    gateLabel: '确认风险清单',
    artifactType: 'RiskList',
    producedArtifacts: { RiskList: { caseId: 'c1', risks: [] } },
    remainingArtifactTypes: [],
    toolResults: { 'party-verify': { verified: true, source: 'demo-fixture' } },
    evidenceLedgerSnapshot: [{ key: 'party-verify', grade: 'B', sourceId: 'demo-fixture', confirmed: false }],
    createdAt: '2026-07-10T00:00:00.000Z',
  };
}

describe('createInMemoryConfirmationStore', () => {
  it('save then take round-trips the pending confirmation', () => {
    const store = createInMemoryConfirmationStore();
    store.save(samplePending('req-1'));
    expect(store.take('req-1')).toEqual(samplePending('req-1'));
  });

  it('take() removes the entry — a second take() returns undefined', () => {
    const store = createInMemoryConfirmationStore();
    store.save(samplePending('req-1'));
    store.take('req-1');
    expect(store.take('req-1')).toBeUndefined();
  });

  it('take() on an unknown requestId returns undefined', () => {
    const store = createInMemoryConfirmationStore();
    expect(store.take('never-saved')).toBeUndefined();
  });
});

describe('createFileConfirmationStore (durable, simulates cross-process resume)', () => {
  it('a fresh instance pointed at the same directory can take() what a prior instance saved', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-confirmstore-'));
    try {
      const writer = createFileConfirmationStore(dir);
      writer.save(samplePending('req-1'));

      const reader = createFileConfirmationStore(dir);
      expect(reader.take('req-1')).toEqual(samplePending('req-1'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('take() deletes the backing file so a second take() (even via a new instance) returns undefined', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-confirmstore-'));
    try {
      const writer = createFileConfirmationStore(dir);
      writer.save(samplePending('req-1'));
      writer.take('req-1');
      const reader = createFileConfirmationStore(dir);
      expect(reader.take('req-1')).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: 确认测试按预期失败**

```bash
pnpm test -- packages/core
```

Expected：报错 `Cannot find module './confirmation-store.js'`。

- [ ] **Step 3: 写最小实现 `packages/core/src/session/confirmation-store.ts`**

```ts
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ArtifactType } from '@courtwork/schemas';
import type { EvidenceGradeAnnotation } from '../evidence/grade.js';

/**
 * 场景暂停时"继续所需的一切"：已产出 artifact、剩余产出序列、工具结果、
 * 证据台账快照（resume 时用它重建一个全新 EvidenceLedger 实例，见 executor.ts）。
 * 打包成一份可序列化数据，是 pause/resume 跨越磁盘边界而非内存边界的关键。
 */
export interface PendingConfirmation {
  requestId: string;
  sessionId: string;
  scenarioId: string;
  gateLabel: string;
  artifactType?: ArtifactType;
  producedArtifacts: Partial<Record<ArtifactType, unknown>>;
  remainingArtifactTypes: ArtifactType[];
  toolResults: Record<string, unknown>;
  evidenceLedgerSnapshot: EvidenceGradeAnnotation[];
  createdAt: string;
}

export interface ConfirmationStore {
  save(pending: PendingConfirmation): void;
  /** 读取并移除——一次性消费，防止同一确认请求被 resume 两次。 */
  take(requestId: string): PendingConfirmation | undefined;
}

export function createInMemoryConfirmationStore(): ConfirmationStore {
  const pending = new Map<string, PendingConfirmation>();
  return {
    save(p) {
      pending.set(p.requestId, p);
    },
    take(requestId) {
      const found = pending.get(requestId);
      if (found) pending.delete(requestId);
      return found;
    },
  };
}

/**
 * 落盘实现：证明"确认响应可在任意更晚时间、任意别的进程回流"不是类型层面的
 * 空话——新构造一个指向同一目录的 ConfirmationStore 实例（模拟另一个进程）
 * 依然能 take() 到（SPEC TODO 异步确认预留）。
 */
export function createFileConfirmationStore(dir: string): ConfirmationStore {
  mkdirSync(dir, { recursive: true });
  const pathFor = (requestId: string) => join(dir, `${requestId}.json`);
  return {
    save(p) {
      writeFileSync(pathFor(p.requestId), JSON.stringify(p), 'utf-8');
    },
    take(requestId) {
      const filePath = pathFor(requestId);
      if (!existsSync(filePath)) return undefined;
      const raw = readFileSync(filePath, 'utf-8');
      rmSync(filePath);
      return JSON.parse(raw) as PendingConfirmation;
    },
  };
}
```

- [ ] **Step 4: 更新 `packages/core/src/index.ts`**（追加一行）

```ts
export * from './session/confirmation-store.js';
```

- [ ] **Step 5: 确认测试通过**

```bash
pnpm test -- packages/core
```

Expected：新增 5 例全绿（累计 23 例）。

- [ ] **Step 6: 提交**

```bash
git add packages/core/src/session packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): durable confirmation continuation store

PendingConfirmation 打包场景暂停时续行所需的一切（已产出 artifact、
剩余产出序列、工具结果、证据台账快照），是异步确认预留（SPEC TODO）
落盘而非常驻内存的关键载体。file store 测试用"指向同一目录的全新
实例"模拟另一进程接续，证明协议不隐含确认方与 core 同进程/同机。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: JSON Pointer 应用工具（RevisionEvent 落地续行的基础）

**Files:**
- Create: `packages/core/src/revision/json-pointer.ts`
- Create: `packages/core/src/revision/json-pointer.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/core/src/revision/json-pointer.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { applyJsonPointer, JsonPointerError } from './json-pointer.js';

describe('applyJsonPointer', () => {
  it('sets a top-level field', () => {
    const target: Record<string, unknown> = { name: 'old' };
    applyJsonPointer(target, '/name', 'new');
    expect(target.name).toBe('new');
  });

  it('sets a nested array-index field', () => {
    const target = { risks: [{ id: 'risk-01', dispositionStatus: 'pending' }] };
    applyJsonPointer(target, '/risks/0/dispositionStatus', 'confirmed');
    expect(target.risks[0].dispositionStatus).toBe('confirmed');
  });

  it('throws JsonPointerError when the pointer does not start with "/"', () => {
    expect(() => applyJsonPointer({}, 'name', 'x')).toThrow(JsonPointerError);
  });

  it('throws JsonPointerError on the bare root pointer "/"', () => {
    expect(() => applyJsonPointer({}, '/', 'x')).toThrow(JsonPointerError);
  });

  it('throws JsonPointerError when an intermediate segment does not exist', () => {
    expect(() => applyJsonPointer({}, '/risks/0/dispositionStatus', 'x')).toThrow(JsonPointerError);
  });
});
```

- [ ] **Step 2: 确认测试按预期失败**

```bash
pnpm test -- packages/core
```

Expected：报错 `Cannot find module './json-pointer.js'`。

- [ ] **Step 3: 写最小实现 `packages/core/src/revision/json-pointer.ts`**

```ts
export class JsonPointerError extends Error {}

/** RFC 6901 最小实现：只支持 core 需要的"定位到具体字段并赋新值"这一种操作。 */
export function applyJsonPointer(target: Record<string, unknown> | unknown[], pointer: string, value: unknown): void {
  if (!pointer.startsWith('/')) {
    throw new JsonPointerError(`fieldPath 必须是 JSON Pointer（以 / 开头）：收到 "${pointer}"`);
  }
  const tokens = pointer
    .split('/')
    .slice(1)
    .map((token) => token.replace(/~1/g, '/').replace(/~0/g, '~'));
  if (tokens.length === 0) {
    throw new JsonPointerError(`fieldPath 不能是根指针 "/"：必须定位到具体字段`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cursor: any = target;
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const token = tokens[i];
    const next = Array.isArray(cursor) ? cursor[Number(token)] : cursor[token];
    if (next === undefined || next === null) {
      throw new JsonPointerError(`JSON Pointer "${pointer}" 在第 ${i + 1} 段 "${token}" 处找不到对应节点`);
    }
    cursor = next;
  }
  const lastToken = tokens[tokens.length - 1];
  if (Array.isArray(cursor)) {
    cursor[Number(lastToken)] = value;
  } else {
    cursor[lastToken] = value;
  }
}
```

- [ ] **Step 4: 更新 `packages/core/src/index.ts`**（追加一行）

```ts
export * from './revision/json-pointer.js';
```

- [ ] **Step 5: 确认测试通过**

```bash
pnpm test -- packages/core
```

Expected：新增 5 例全绿（累计 28 例）。

- [ ] **Step 6: 提交**

```bash
git add packages/core/src/revision/json-pointer.ts packages/core/src/revision/json-pointer.test.ts packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): JSON Pointer apply utility

RFC 6901 最小实现，只支持"定位到具体字段并赋新值"——RevisionEvent
的 fieldPath 是 JSON Pointer，resume 时需要把用户的字段级修正真正
应用回已产出的 artifact，供后续生成节点/编译步骤看到修正后的值。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: RevisionEvent 落盘存储（D5）

**Files:**
- Create: `packages/core/src/revision/revision-store.ts`
- Create: `packages/core/src/revision/revision-store.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/core/src/revision/revision-store.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RevisionEventSchema, type RevisionEvent } from '@courtwork/schemas';
import { createFileRevisionEventStore, createInMemoryRevisionEventStore } from './revision-store.js';

function sampleEvent(id: string): RevisionEvent {
  return {
    id,
    timestamp: '2026-07-10T00:00:00.000Z',
    actor: { userId: 'demo-lawyer', role: '主办律师' },
    caseId: 'case-linjiang-qiyun-2025',
    artifactType: 'RiskList',
    artifactId: 'case-linjiang-qiyun-2025',
    fieldPath: '/risks/0/dispositionStatus',
    previousValue: 'pending',
    newValue: 'confirmed',
    reason: '与主办律师电话确认，风险属实',
  };
}

describe('createInMemoryRevisionEventStore', () => {
  it('record then list returns what was recorded, in order', () => {
    const store = createInMemoryRevisionEventStore();
    store.record(sampleEvent('rev-1'));
    store.record(sampleEvent('rev-2'));
    expect(store.list().map((e) => e.id)).toEqual(['rev-1', 'rev-2']);
  });
});

describe('createFileRevisionEventStore (append-only JSONL, durable)', () => {
  it('records survive as a fresh instance pointed at the same file (捕获落盘)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-revisionstore-'));
    const filePath = join(dir, 'revision-events.jsonl');
    try {
      const writer = createFileRevisionEventStore(filePath);
      writer.record(sampleEvent('rev-1'));

      const reader = createFileRevisionEventStore(filePath);
      reader.record(sampleEvent('rev-2'));

      expect(reader.list().map((e) => e.id)).toEqual(['rev-1', 'rev-2']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a round-tripped record still satisfies RevisionEventSchema (JSON roundtrip does not corrupt the shape)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-revisionstore-'));
    const filePath = join(dir, 'revision-events.jsonl');
    try {
      const store = createFileRevisionEventStore(filePath);
      store.record(sampleEvent('rev-1'));
      const [roundTripped] = store.list();
      expect(RevisionEventSchema.safeParse(roundTripped).success).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('list() on a file that does not exist yet returns an empty array', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-revisionstore-'));
    try {
      const store = createFileRevisionEventStore(join(dir, 'never-written.jsonl'));
      expect(store.list()).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: 确认测试按预期失败**

```bash
pnpm test -- packages/core
```

Expected：报错 `Cannot find module './revision-store.js'`。

- [ ] **Step 3: 写最小实现 `packages/core/src/revision/revision-store.ts`**

```ts
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { RevisionEvent } from '@courtwork/schemas';

export interface RevisionEventStore {
  record(event: RevisionEvent): void;
  list(): RevisionEvent[];
}

export function createInMemoryRevisionEventStore(): RevisionEventStore {
  const events: RevisionEvent[] = [];
  return {
    record(event) {
      events.push(event);
    },
    list() {
      return [...events];
    },
  };
}

/** 追加写 JSONL：SPEC 要求 RevisionEvent"捕获落盘"——每条修正独立一行，永不改写既有行。 */
export function createFileRevisionEventStore(filePath: string): RevisionEventStore {
  mkdirSync(dirname(filePath), { recursive: true });
  return {
    record(event) {
      appendFileSync(filePath, `${JSON.stringify(event)}\n`, 'utf-8');
    },
    list() {
      if (!existsSync(filePath)) return [];
      return readFileSync(filePath, 'utf-8')
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => JSON.parse(line) as RevisionEvent);
    },
  };
}
```

- [ ] **Step 4: 更新 `packages/core/src/index.ts`**（追加一行）

```ts
export * from './revision/revision-store.js';
```

- [ ] **Step 5: 确认测试通过**

```bash
pnpm test -- packages/core
```

Expected：新增 4 例全绿（累计 32 例）。

- [ ] **Step 6: 提交**

```bash
git add packages/core/src/revision/revision-store.ts packages/core/src/revision/revision-store.test.ts packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): RevisionEvent capture to disk (D5)

客户端对 artifact 的每次 schema 级修正经 core 记录为
@courtwork/schemas 的 RevisionEvent，追加写 JSONL 落盘（永不改写
既有行）。file store 测试证明记录跨实例可读，且 JSON 往返不破坏
RevisionEventSchema 校验。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: 工具注册表

**Files:**
- Create: `packages/core/src/tools/tool-registry.ts`
- Create: `packages/core/src/tools/tool-registry.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/core/src/tools/tool-registry.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { defineTool, type ToolAdapter } from '@courtwork/tools';
import { createToolRegistry } from './tool-registry.js';

function fakeTool() {
  const adapter: ToolAdapter<{ x: string }, { y: string }> = {
    sourceId: 'fake',
    async run(input) {
      return { y: input.x };
    },
  };
  return defineTool(
    { id: 'fake-tool', inputSchema: z.object({ x: z.string() }), dataSchema: z.object({ y: z.string() }), timeoutMs: 1000 },
    adapter,
  );
}

describe('createToolRegistry', () => {
  it('registers and retrieves a tool binding by toolId', () => {
    const registry = createToolRegistry();
    const tool = fakeTool();
    registry.register('fake-tool', { tool, grade: 'B' });
    expect(registry.get('fake-tool')).toEqual({ tool, grade: 'B' });
  });

  it('returns undefined for an unregistered toolId', () => {
    const registry = createToolRegistry();
    expect(registry.get('never-registered')).toBeUndefined();
  });
});
```

- [ ] **Step 2: 确认测试按预期失败**

```bash
pnpm test -- packages/core
```

Expected：报错 `Cannot find module './tool-registry.js'`。

- [ ] **Step 3: 写最小实现 `packages/core/src/tools/tool-registry.ts`**

```ts
import type { ToolDefinition } from '@courtwork/tools';
import type { EvidenceGrade } from '../evidence/grade.js';

export interface GradedToolBinding {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tool: ToolDefinition<any, any>;
  grade: EvidenceGrade;
}

/**
 * toolId → {ToolDefinition, EvidenceGrade} 绑定。等级判定在这里声明（由装配点填充），
 * 不是工具契约本身的一部分——tools 包保持不认识"等级"这个概念。
 */
export interface ToolRegistry {
  register(toolId: string, binding: GradedToolBinding): void;
  get(toolId: string): GradedToolBinding | undefined;
}

export function createToolRegistry(): ToolRegistry {
  const bindings = new Map<string, GradedToolBinding>();
  return {
    register(toolId, binding) {
      bindings.set(toolId, binding);
    },
    get(toolId) {
      return bindings.get(toolId);
    },
  };
}
```

若 `pnpm lint` 对 `eslint-disable-next-line` 行仍有异议（版本差异），改用 `ToolDefinition<unknown, unknown>` 并在 `scenario-executor/executor.ts` 调用处显式 cast——异构工具注册表在类型层面本就没有比“受控 any”更干净的表达，实现阶段以 lint 实测结果为准。

- [ ] **Step 4: 更新 `packages/core/src/index.ts`**

```ts
export * from './provider/types.js';
export * from './provider/scripted-provider.js';
export * from './evidence/grade.js';
export * from './events/types.js';
export * from './events/event-log.js';
export * from './tools/tool-registry.js';
```

- [ ] **Step 5: 确认测试通过**

```bash
pnpm test -- packages/core
pnpm lint
```

Expected：新增 2 例全绿（累计 34 例）；lint 无 error（若报 `no-explicit-any`，按上方备注调整后重跑至干净）。

- [ ] **Step 6: 提交**

```bash
git add packages/core/src/tools packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): tool registry (toolId -> graded tool binding)

工具与信源等级的绑定关系在这里声明，由装配点填充——通用机制本身
不认识任何具体工具 id，也不内置任何等级判定表。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: artifact 类型 → zod schema 映射表

**Files:**
- Create: `packages/core/src/scenario-executor/artifact-schemas.ts`
- Create: `packages/core/src/scenario-executor/artifact-schemas.test.ts`
- Modify: `packages/core/src/index.ts`

**背景**：场景执行器要把生成节点的输出按 `ScenarioDefinition.outputArtifacts` 声明的 `ArtifactType` 动态校验——需要一张从枚举值到具体 zod schema 的映射表。这张表只在 core 内部使用（不导出到 `@courtwork/schemas` 之外的公开面），执行器是唯一消费方。

- [ ] **Step 1: 写失败测试 `packages/core/src/scenario-executor/artifact-schemas.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { ARTIFACT_SCHEMAS } from './artifact-schemas.js';

describe('ARTIFACT_SCHEMAS', () => {
  it('has an entry for all six ArtifactType values', () => {
    expect(Object.keys(ARTIFACT_SCHEMAS).sort()).toEqual(
      ['CaseFile', 'PartyGraph', 'ReviewMatrix', 'RevisionInstructionSet', 'RiskList', 'Timeline'].sort(),
    );
  });

  it('CaseFile entry validates a well-formed CaseFile and rejects a malformed one', () => {
    expect(
      ARTIFACT_SCHEMAS.CaseFile.safeParse({ caseId: 'c1', files: [] }).success,
    ).toBe(true);
    expect(ARTIFACT_SCHEMAS.CaseFile.safeParse({ caseId: 'c1' }).success).toBe(false);
  });

  it('RiskList entry validates a well-formed RiskList and rejects a malformed one', () => {
    expect(ARTIFACT_SCHEMAS.RiskList.safeParse({ caseId: 'c1', risks: [] }).success).toBe(true);
    expect(ARTIFACT_SCHEMAS.RiskList.safeParse({ risks: [] }).success).toBe(false);
  });
});
```

- [ ] **Step 2: 确认测试按预期失败**

```bash
pnpm test -- packages/core
```

Expected：报错 `Cannot find module './artifact-schemas.js'`。

- [ ] **Step 3: 写最小实现 `packages/core/src/scenario-executor/artifact-schemas.ts`**

```ts
import * as z from 'zod';
import {
  CaseFileSchema,
  TimelineSchema,
  PartyGraphSchema,
  RiskListSchema,
  ReviewMatrixSchema,
  RevisionInstructionSetSchema,
  type ArtifactType,
} from '@courtwork/schemas';

export const ARTIFACT_SCHEMAS: Record<ArtifactType, z.ZodTypeAny> = {
  CaseFile: CaseFileSchema,
  Timeline: TimelineSchema,
  PartyGraph: PartyGraphSchema,
  RiskList: RiskListSchema,
  ReviewMatrix: ReviewMatrixSchema,
  RevisionInstructionSet: RevisionInstructionSetSchema,
};
```

- [ ] **Step 4: 更新 `packages/core/src/index.ts`**（追加一行）

```ts
export * from './scenario-executor/artifact-schemas.js';
```

- [ ] **Step 5: 确认测试通过**

```bash
pnpm test -- packages/core
```

Expected：新增 3 例全绿（累计 37 例）。

- [ ] **Step 6: 提交**

```bash
git add packages/core/src/scenario-executor/artifact-schemas.ts packages/core/src/scenario-executor/artifact-schemas.test.ts packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): ArtifactType -> zod schema lookup table

场景执行器按 ScenarioDefinition.outputArtifacts 声明的枚举值动态
校验生成节点输出，需要这张表把枚举值接回 @courtwork/schemas 的
具体 zod schema。执行器是唯一消费方。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: 场景执行器——工具执行阶段 + 产出序列 + 首次暂停（D2 核心之一）

**背景**：registry 的 `confirmationGates` 强制 `.min(1)`——任何真实场景声明至少有一个门禁，因此 `runScenario` 的首次调用在真实场景下**总会**在某个产出点暂停（永远不会一路跑到 `completed`，那是 `resumeScenario` 处理确认之后才会发生的状态）。本任务只覆盖到"首次暂停"为止；确认后续行是 Task 11。

**Files:**
- Create: `packages/core/src/scenario-executor/executor.ts`
- Create: `packages/core/src/scenario-executor/executor.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/core/src/scenario-executor/executor.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import type { ScenarioDefinition } from '@courtwork/registry';
import { createMockPartyVerifyAdapter, createPartyVerifyTool, createToolExecutor } from '@courtwork/tools';
import { createEventLog } from '../events/event-log.js';
import { createEvidenceLedger } from '../evidence/grade.js';
import { createInMemoryConfirmationStore } from '../session/confirmation-store.js';
import { createInMemoryRevisionEventStore } from '../revision/revision-store.js';
import { createToolRegistry } from '../tools/tool-registry.js';
import { createScriptedProvider } from '../provider/scripted-provider.js';
import { GenerationValidationError, runScenario, UnknownToolError, type ScenarioExecutorDeps } from './executor.js';

const SINGLE_GATE_SCENARIO: ScenarioDefinition = {
  id: 'S-test-single',
  name: '单产出测试场景',
  trigger: { fileTypes: ['pdf'], userActions: [], classifierTags: [] },
  inputArtifacts: ['CaseFile'],
  toolIds: ['party-verify'],
  outputArtifacts: ['RiskList'],
  uiTemplateId: 'test-panel',
  confirmationGates: [{ artifact: 'RiskList', label: '确认风险清单' }],
  promptTemplateRef: 'test-v0',
};

const VALID_RISK_LIST = {
  caseId: 'c1',
  risks: [
    {
      id: 'risk-01',
      description: 'x',
      level: 'low',
      basis: [{ citation: 'x', sourceAnchors: [{ fileId: 'f1', textRange: { start: 0, end: 1 } }] }],
      dispositionStatus: 'pending',
    },
  ],
};

function buildDeps(providerScript: { content: string }[]): ScenarioExecutorDeps {
  const tools = createToolRegistry();
  tools.register('party-verify', { tool: createPartyVerifyTool(createMockPartyVerifyAdapter()), grade: 'A' });
  return {
    tools,
    toolExecutor: createToolExecutor(),
    provider: createScriptedProvider('test-provider', 'fake-v1', providerScript),
    eventLog: createEventLog('session-1', () => '2026-07-10T00:00:00.000Z'),
    confirmationStore: createInMemoryConfirmationStore(),
    revisionStore: createInMemoryRevisionEventStore(),
    ledger: createEvidenceLedger(),
  };
}

describe('runScenario', () => {
  it('runs the declared tool, records its evidence grade, generates the sole output artifact, and pauses at its gate', async () => {
    const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
    const result = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );

    expect(result).toEqual({ status: 'paused', sessionId: 'session-1', requestId: expect.any(String) });
    expect(deps.ledger.get('party-verify')).toEqual({ grade: 'A', sourceId: 'mock', confirmed: false });

    const events = deps.eventLog.list();
    expect(events.map((e) => e.type)).toEqual(['artifact_produced', 'confirmation_requested']);
    expect(events[0]).toMatchObject({ type: 'artifact_produced', artifactType: 'RiskList', artifact: VALID_RISK_LIST });
    expect(events[0]).toMatchObject({ evidenceGrades: [{ key: 'party-verify', grade: 'A', sourceId: 'mock', confirmed: false }] });
  });

  it('throws UnknownToolError when a scenario references a toolId absent from the tool registry', async () => {
    const deps = buildDeps([]);
    const scenario: ScenarioDefinition = { ...SINGLE_GATE_SCENARIO, toolIds: ['nonexistent-tool'] };
    await expect(
      runScenario(scenario, { inputArtifacts: {}, toolInputs: {} }, deps),
    ).rejects.toThrow(UnknownToolError);
  });

  it('throws GenerationValidationError when the provider returns content that fails the target artifact schema', async () => {
    const deps = buildDeps([{ content: JSON.stringify({ notARiskList: true }) }]);
    await expect(
      runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        deps,
      ),
    ).rejects.toThrow(GenerationValidationError);
  });

  it('throws GenerationValidationError when the provider returns content that is not valid JSON', async () => {
    const deps = buildDeps([{ content: 'not json at all' }]);
    await expect(
      runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        deps,
      ),
    ).rejects.toThrow(GenerationValidationError);
  });
});
```

- [ ] **Step 2: 确认测试按预期失败**

```bash
pnpm test -- packages/core
```

Expected：报错 `Cannot find module './executor.js'`。

- [ ] **Step 3: 写最小实现 `packages/core/src/scenario-executor/executor.ts`**

```ts
import { randomUUID } from 'node:crypto';
import type { ArtifactType, ScenarioDefinition } from '@courtwork/schemas';
import type { ToolExecutor } from '@courtwork/tools';
import type { Provider } from '../provider/types.js';
import type { EventLog } from '../events/event-log.js';
import type { EvidenceLedger } from '../evidence/grade.js';
import type { ToolRegistry } from '../tools/tool-registry.js';
import type { ConfirmationStore, PendingConfirmation } from '../session/confirmation-store.js';
import type { RevisionEventStore } from '../revision/revision-store.js';
import { ARTIFACT_SCHEMAS } from './artifact-schemas.js';

export interface ScenarioExecutorDeps {
  tools: ToolRegistry;
  toolExecutor: ToolExecutor;
  provider: Provider;
  eventLog: EventLog;
  confirmationStore: ConfirmationStore;
  revisionStore: RevisionEventStore;
  ledger: EvidenceLedger;
  now?: () => string;
}

export interface ScenarioRunInput {
  inputArtifacts: Partial<Record<ArtifactType, unknown>>;
  toolInputs: Record<string, unknown>;
}

export type ScenarioRunResult =
  | { status: 'completed'; sessionId: string; artifacts: Partial<Record<ArtifactType, unknown>> }
  | { status: 'paused'; sessionId: string; requestId: string };

export class UnknownToolError extends Error {
  constructor(scenarioId: string, toolId: string) {
    super(`场景 ${scenarioId} 引用了未在工具注册表中登记的工具 "${toolId}"`);
    this.name = 'UnknownToolError';
  }
}

export class GenerationValidationError extends Error {
  constructor(scenarioId: string, artifactType: ArtifactType, issues: string) {
    super(`场景 ${scenarioId} 生成的 ${artifactType} 未通过 schema 校验：\n${issues}`);
    this.name = 'GenerationValidationError';
  }
}

export class UnknownConfirmationRequestError extends Error {
  constructor(requestId: string) {
    super(`未找到确认请求 "${requestId}"：可能已被处理或已过期`);
    this.name = 'UnknownConfirmationRequestError';
  }
}

/** toolIds 声明的全部工具在产出序列开始前一次性执行完毕（registry/SPEC.md 已补注的执行语义）。 */
async function runTools(
  scenario: ScenarioDefinition,
  toolInputs: Record<string, unknown>,
  deps: ScenarioExecutorDeps,
): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};
  for (const toolId of scenario.toolIds) {
    const binding = deps.tools.get(toolId);
    if (!binding) throw new UnknownToolError(scenario.id, toolId);
    const envelope = await deps.toolExecutor.execute(binding.tool, toolInputs[toolId]);
    results[toolId] = envelope;
    if (envelope.verified) {
      deps.ledger.record(toolId, { grade: binding.grade, sourceId: envelope.source, confirmed: false });
    }
  }
  return results;
}

async function generateArtifact(
  scenario: ScenarioDefinition,
  artifactType: ArtifactType,
  context: {
    inputArtifacts: Partial<Record<ArtifactType, unknown>>;
    toolResults: Record<string, unknown>;
    producedSoFar: Partial<Record<ArtifactType, unknown>>;
  },
  provider: Provider,
): Promise<unknown> {
  const response = await provider.generate({
    systemPrompt: scenario.promptTemplateRef,
    messages: [{ role: 'user', content: JSON.stringify({ artifactType, ...context }) }],
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(response.content);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new GenerationValidationError(scenario.id, artifactType, `provider 返回的内容不是合法 JSON：${reason}`);
  }
  const schema = ARTIFACT_SCHEMAS[artifactType];
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new GenerationValidationError(scenario.id, artifactType, issues);
  }
  return result.data;
}

interface SequenceState {
  sessionId: string;
  scenarioId: string;
  toolResults: Record<string, unknown>;
  producedSoFar: Partial<Record<ArtifactType, unknown>>;
  inputArtifacts: Partial<Record<ArtifactType, unknown>>;
}

function pauseAt(
  gateLabel: string,
  artifactType: ArtifactType | undefined,
  remainingArtifactTypes: ArtifactType[],
  state: SequenceState,
  deps: ScenarioExecutorDeps,
  now: () => string,
): ScenarioRunResult {
  const requestId = randomUUID();
  const pending: PendingConfirmation = {
    requestId,
    sessionId: state.sessionId,
    scenarioId: state.scenarioId,
    gateLabel,
    artifactType,
    producedArtifacts: state.producedSoFar,
    remainingArtifactTypes,
    toolResults: state.toolResults,
    evidenceLedgerSnapshot: deps.ledger.snapshot(),
    createdAt: now(),
  };
  deps.confirmationStore.save(pending);
  deps.eventLog.append({ type: 'confirmation_requested', requestId, gateLabel, artifactType });
  return { status: 'paused', sessionId: state.sessionId, requestId };
}

/** outputArtifacts 声明顺序即产出顺序（registry/SPEC.md 已补注的执行语义）。命中门禁即暂停。 */
async function produceSequence(
  scenario: ScenarioDefinition,
  remainingArtifactTypes: ArtifactType[],
  state: SequenceState,
  deps: ScenarioExecutorDeps,
): Promise<ScenarioRunResult> {
  const now = deps.now ?? (() => new Date().toISOString());

  for (let i = 0; i < remainingArtifactTypes.length; i += 1) {
    const artifactType = remainingArtifactTypes[i];
    const artifact = await generateArtifact(
      scenario,
      artifactType,
      { inputArtifacts: state.inputArtifacts, toolResults: state.toolResults, producedSoFar: state.producedSoFar },
      deps.provider,
    );
    state.producedSoFar[artifactType] = artifact;
    deps.eventLog.append({ type: 'artifact_produced', artifactType, artifact, evidenceGrades: deps.ledger.snapshot() });

    const gate = scenario.confirmationGates.find((g) => g.artifact === artifactType);
    if (gate) {
      return pauseAt(gate.label, artifactType, remainingArtifactTypes.slice(i + 1), state, deps, now);
    }
  }

  const labelOnlyGate = scenario.confirmationGates.find((g) => g.artifact === undefined);
  if (labelOnlyGate) {
    return pauseAt(labelOnlyGate.label, undefined, [], state, deps, now);
  }

  deps.eventLog.append({ type: 'scenario_completed' });
  return { status: 'completed', sessionId: state.sessionId, artifacts: state.producedSoFar };
}

export async function runScenario(
  scenario: ScenarioDefinition,
  input: ScenarioRunInput,
  deps: ScenarioExecutorDeps,
): Promise<ScenarioRunResult> {
  const toolResults = await runTools(scenario, input.toolInputs, deps);
  return produceSequence(
    scenario,
    scenario.outputArtifacts,
    {
      sessionId: deps.eventLog.sessionId,
      scenarioId: scenario.id,
      toolResults,
      producedSoFar: { ...input.inputArtifacts },
      inputArtifacts: input.inputArtifacts,
    },
    deps,
  );
}
```

注意：`produceSequence`/`pauseAt` 已经把 Task 13 需要的"多产出顺序遍历"与"label-only 门禁落序列尾"逻辑一次写完——这是因为该逻辑是一个不可拆分的循环体，拆成两次 TDD 增量反而会先写出一个残缺分支再回来补，不如一次写对、用 Task 13 的新测试去覆盖当前测试没触达的分支（多产出、label-only）。这不违反"先写测试再实现"——Task 10 的测试仍然是先写、先看到因 `Cannot find module` 失败，再实现；Task 13 是给同一份实现补充**新的**失败测试覆盖尚未验证的分支，而不是不写测试就先写这部分代码。

- [ ] **Step 4: 更新 `packages/core/src/index.ts`**（追加一行）

```ts
export * from './scenario-executor/executor.js';
```

- [ ] **Step 5: 确认测试通过**

```bash
pnpm test -- packages/core
```

Expected：新增 4 例全绿（累计 41 例）。

- [ ] **Step 6: 提交**

```bash
git add packages/core/src/scenario-executor/executor.ts packages/core/src/scenario-executor/executor.test.ts packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): scenario executor — tool phase + produce sequence + pause (D2)

runScenario：toolIds 全部前置一次性执行（结果记入证据台账，D4）→
outputArtifacts 按声明顺序逐个生成（provider 返回内容过对应 zod
schema 校验，不合规直接 GenerationValidationError，不吞掉坏产出）→
命中 confirmationGates 即落盘暂停续行状态并返回 'paused'。

registry 的 confirmationGates 强制非空，真实场景首次调用总会暂停——
'completed' 只会从 resumeScenario 产生（Task 11 起）。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: 场景执行器——resumeScenario 确认/驳回续行（D2 核心之二）

**Files:**
- Modify: `packages/core/src/scenario-executor/executor.ts`
- Modify: `packages/core/src/scenario-executor/executor.test.ts`

- [ ] **Step 1: 追加失败测试到 `packages/core/src/scenario-executor/executor.test.ts`**（文件末尾追加，import 行也要相应补充）

```ts
// 追加到文件顶部既有 import 之后：
import { resumeScenario, UnknownConfirmationRequestError } from './executor.js';

// 追加到文件末尾：
describe('resumeScenario', () => {
  it('confirming a single-gate scenario with no revisions completes it and returns the produced artifacts', async () => {
    const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');

    const result = await resumeScenario(
      paused.requestId,
      { actor: { channelId: 'cli', actorId: 'demo-lawyer', role: '主办律师' }, decision: 'confirm' },
      SINGLE_GATE_SCENARIO,
      deps,
    );

    expect(result).toEqual({ status: 'completed', sessionId: 'session-1', artifacts: { CaseFile: { caseId: 'c1', files: [] }, RiskList: VALID_RISK_LIST } });

    const events = deps.eventLog.list();
    expect(events.map((e) => e.type)).toEqual(['artifact_produced', 'confirmation_requested', 'confirmation_resolved', 'scenario_completed']);
    expect(events[2]).toMatchObject({
      type: 'confirmation_resolved',
      requestId: paused.requestId,
      actor: { channelId: 'cli', actorId: 'demo-lawyer', role: '主办律师' },
      decision: 'confirm',
    });
  });

  it('rejecting a gate completes the scenario immediately without producing further artifacts', async () => {
    const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');

    const result = await resumeScenario(
      paused.requestId,
      { actor: { channelId: 'cli', actorId: 'demo-lawyer' }, decision: 'reject' },
      SINGLE_GATE_SCENARIO,
      deps,
    );

    expect(result.status).toBe('completed');
    const events = deps.eventLog.list();
    expect(events.map((e) => e.type)).toEqual(['artifact_produced', 'confirmation_requested', 'confirmation_resolved', 'scenario_completed']);
  });

  it('resuming an unknown or already-consumed requestId throws UnknownConfirmationRequestError', async () => {
    const deps = buildDeps([]);
    await expect(
      resumeScenario('never-issued', { actor: { channelId: 'cli', actorId: 'x' }, decision: 'confirm' }, SINGLE_GATE_SCENARIO, deps),
    ).rejects.toThrow(UnknownConfirmationRequestError);
  });

  it('a confirmation request can only be resumed once — the second resume on the same requestId throws', async () => {
    const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
    const paused = await runScenario(
      SINGLE_GATE_SCENARIO,
      { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
      deps,
    );
    if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');
    await resumeScenario(paused.requestId, { actor: { channelId: 'cli', actorId: 'x' }, decision: 'confirm' }, SINGLE_GATE_SCENARIO, deps);

    await expect(
      resumeScenario(paused.requestId, { actor: { channelId: 'cli', actorId: 'x' }, decision: 'confirm' }, SINGLE_GATE_SCENARIO, deps),
    ).rejects.toThrow(UnknownConfirmationRequestError);
  });
});
```

- [ ] **Step 2: 确认测试按预期失败**

```bash
pnpm test -- packages/core
```

Expected：报错 `resumeScenario is not a function` / `UnknownConfirmationRequestError is not exported`（导出尚不存在）。

- [ ] **Step 3: 在 `packages/core/src/scenario-executor/executor.ts` 追加实现**（在 `runScenario` 定义之后追加）

```ts
export interface ConfirmationActor {
  channelId: string;
  actorId: string;
  role?: string;
}

export interface ScenarioResumeInput {
  actor: ConfirmationActor;
  decision: 'confirm' | 'reject';
}

export class UnknownConfirmationRequestError extends Error {
  constructor(requestId: string) {
    super(`未找到确认请求 "${requestId}"：可能已被处理或已过期`);
    this.name = 'UnknownConfirmationRequestError';
  }
}

export async function resumeScenario(
  requestId: string,
  response: ScenarioResumeInput,
  scenario: ScenarioDefinition,
  deps: ScenarioExecutorDeps,
): Promise<ScenarioRunResult> {
  const pending = deps.confirmationStore.take(requestId);
  if (!pending) throw new UnknownConfirmationRequestError(requestId);

  for (const entry of pending.evidenceLedgerSnapshot) {
    deps.ledger.record(entry.key, { grade: entry.grade, sourceId: entry.sourceId, confirmed: entry.confirmed });
  }

  deps.eventLog.append({
    type: 'confirmation_resolved',
    requestId,
    actor: response.actor,
    decision: response.decision,
  });

  if (response.decision === 'reject') {
    deps.eventLog.append({ type: 'scenario_completed' });
    return { status: 'completed', sessionId: pending.sessionId, artifacts: pending.producedArtifacts };
  }

  return produceSequence(
    scenario,
    pending.remainingArtifactTypes,
    {
      sessionId: pending.sessionId,
      scenarioId: pending.scenarioId,
      toolResults: pending.toolResults,
      producedSoFar: pending.producedArtifacts,
      inputArtifacts: pending.producedArtifacts,
    },
    deps,
  );
}
```

`ConfirmationActor`/`ScenarioResumeInput` 在这里先定义一个**不含** `revisions`/`instrumentation` 的最小版本，让本任务的测试（只传 `actor`+`decision`）先通过；Task 12 会扩展这两个接口并重新导出——TypeScript 结构化类型下，Task 12 给 `ScenarioResumeInput` 加可选字段不破坏本任务已通过的调用点。

- [ ] **Step 4: 更新 `packages/core/src/index.ts`**

无需改动——`export * from './scenario-executor/executor.js'` 已在 Task 10 加入，新增的 `resumeScenario`/`ConfirmationActor`/`ScenarioResumeInput`/`UnknownConfirmationRequestError` 自动一并导出。

- [ ] **Step 5: 确认测试通过**

```bash
pnpm test -- packages/core
```

Expected：新增 4 例全绿（累计 45 例）。

- [ ] **Step 6: 提交**

```bash
git add packages/core/src/scenario-executor/executor.ts packages/core/src/scenario-executor/executor.test.ts
git commit -m "$(cat <<'EOF'
feat(core): scenario executor — resumeScenario confirm/reject (D2)

resumeScenario 从 ConfirmationStore 一次性取出续行状态（取即删，
防止同一确认请求被消费两次）、用快照重建的证据台账继续记账、追加
confirmation_resolved 事件；confirm 继续跑剩余产出序列，reject
直接终止。confirm 分支已支持从 pending 恢复出的 ledger 快照——
Task 13 会用"跨全新依赖实例续行"的测试验证这条路径真的不依赖
内存闭包。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: 场景执行器——确认时附带的字段修正（RevisionEvent 落地，D5 接入 D2）

**背景**：确认门禁不只是"是/否"——用户可能在确认前编辑了产出的某个字段（如把风险的 `dispositionStatus` 从 `pending` 改成 `confirmed`）。这类 schema 级修正必须经 `RevisionEventStore` 落盘（D5），且要真实应用回 `producedArtifacts`，让后续（编译 RevisionInstructionSet 等）看到修正后的值。

**Files:**
- Modify: `packages/core/src/scenario-executor/executor.ts`
- Modify: `packages/core/src/scenario-executor/executor.test.ts`

- [ ] **Step 1: 追加失败测试到 `packages/core/src/scenario-executor/executor.test.ts`**

```ts
// 追加到文件顶部既有 import 之后：
import { RevisionEventSchema } from '@courtwork/schemas';

// 追加到 describe('resumeScenario', ...) 内部：
it('applies a field-level revision before confirming, records it via RevisionEventStore, and emits revision_recorded', async () => {
  const deps = buildDeps([{ content: JSON.stringify(VALID_RISK_LIST) }]);
  const paused = await runScenario(
    SINGLE_GATE_SCENARIO,
    { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
    deps,
  );
  if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');

  const result = await resumeScenario(
    paused.requestId,
    {
      actor: { channelId: 'cli', actorId: 'demo-lawyer', role: '主办律师' },
      decision: 'confirm',
      revisions: [
        {
          artifactType: 'RiskList',
          artifactId: 'c1',
          fieldPath: '/risks/0/dispositionStatus',
          previousValue: 'pending',
          newValue: 'confirmed',
          reason: '与主办律师电话确认，风险属实',
          caseId: 'c1',
        },
      ],
      instrumentation: { dwellMs: 4200, expandedEvidenceKeys: ['party-verify'] },
    },
    SINGLE_GATE_SCENARIO,
    deps,
  );

  if (result.status !== 'completed') throw new Error('unreachable');
  const finalRiskList = result.artifacts.RiskList as typeof VALID_RISK_LIST;
  expect(finalRiskList.risks[0].dispositionStatus).toBe('confirmed');

  const recorded = deps.revisionStore.list();
  expect(recorded).toHaveLength(1);
  expect(RevisionEventSchema.safeParse(recorded[0]).success).toBe(true);
  expect(recorded[0]).toMatchObject({
    artifactType: 'RiskList',
    artifactId: 'c1',
    fieldPath: '/risks/0/dispositionStatus',
    previousValue: 'pending',
    newValue: 'confirmed',
    actor: { userId: 'demo-lawyer', role: '主办律师' },
  });

  const events = deps.eventLog.list();
  expect(events.map((e) => e.type)).toEqual([
    'artifact_produced',
    'confirmation_requested',
    'confirmation_resolved',
    'revision_recorded',
    'scenario_completed',
  ]);
  expect(events[2]).toMatchObject({ instrumentation: { dwellMs: 4200, expandedEvidenceKeys: ['party-verify'] } });
  expect(events[3]).toMatchObject({ type: 'revision_recorded', revisionEventId: recorded[0].id });
});

it('applies multiple revisions in order and records each independently', async () => {
  const twoRiskList = { caseId: 'c1', risks: [VALID_RISK_LIST.risks[0], { ...VALID_RISK_LIST.risks[0], id: 'risk-02' }] };
  const deps = buildDeps([{ content: JSON.stringify(twoRiskList) }]);
  const paused = await runScenario(
    SINGLE_GATE_SCENARIO,
    { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
    deps,
  );
  if (paused.status !== 'paused') throw new Error('setup assumption broken: expected paused');

  await resumeScenario(
    paused.requestId,
    {
      actor: { channelId: 'cli', actorId: 'demo-lawyer' },
      decision: 'confirm',
      revisions: [
        { artifactType: 'RiskList', artifactId: 'c1', fieldPath: '/risks/0/dispositionStatus', previousValue: 'pending', newValue: 'confirmed' },
        { artifactType: 'RiskList', artifactId: 'c1', fieldPath: '/risks/1/dispositionStatus', previousValue: 'pending', newValue: 'rejected' },
      ],
    },
    SINGLE_GATE_SCENARIO,
    deps,
  );

  expect(deps.revisionStore.list()).toHaveLength(2);
});
```

- [ ] **Step 2: 确认测试按预期失败**

```bash
pnpm test -- packages/core
```

Expected：TypeScript 报 `revisions`/`instrumentation` 不是 `ScenarioResumeInput` 的已知字段（或运行期忽略后断言失败——取决于 vitest 的 esbuild 转译是否做严格属性检查；若类型层面未报错，运行期断言 `deps.revisionStore.list()` 长度为 0 而非 1，同样是预期的失败）。

- [ ] **Step 3: 在 `packages/core/src/scenario-executor/executor.ts` 修改实现**

替换 Task 11 写的 `ScenarioResumeInput` 定义与 `resumeScenario` 函数体（其余不变）：

```ts
import type { RevisionEvent, SourceAnchor } from '@courtwork/schemas';
import { RevisionEventSchema } from '@courtwork/schemas';
import { applyJsonPointer } from '../revision/json-pointer.js';
import type { ConfirmationInstrumentation } from '../events/types.js';

export interface RevisionInput {
  artifactType: ArtifactType;
  artifactId: string;
  fieldPath: string;
  previousValue: unknown;
  newValue: unknown;
  reason?: string;
  sourceAnchors?: SourceAnchor[];
  caseId?: string;
}

export interface ScenarioResumeInput {
  actor: ConfirmationActor;
  decision: 'confirm' | 'reject';
  revisions?: RevisionInput[];
  instrumentation?: ConfirmationInstrumentation;
}

function buildRevisionEvent(input: RevisionInput, actor: ConfirmationActor, now: () => string): RevisionEvent {
  const candidate = {
    id: randomUUID(),
    timestamp: now(),
    actor: { userId: actor.actorId, role: actor.role },
    caseId: input.caseId,
    artifactType: input.artifactType,
    artifactId: input.artifactId,
    fieldPath: input.fieldPath,
    previousValue: input.previousValue,
    newValue: input.newValue,
    reason: input.reason,
    sourceAnchors: input.sourceAnchors,
  };
  const result = RevisionEventSchema.safeParse(candidate);
  if (!result.success) {
    throw new Error(`构造的 RevisionEvent 未通过 schema 校验：${result.error.message}`);
  }
  return result.data;
}

export async function resumeScenario(
  requestId: string,
  response: ScenarioResumeInput,
  scenario: ScenarioDefinition,
  deps: ScenarioExecutorDeps,
): Promise<ScenarioRunResult> {
  const pending = deps.confirmationStore.take(requestId);
  if (!pending) throw new UnknownConfirmationRequestError(requestId);
  const now = deps.now ?? (() => new Date().toISOString());

  for (const entry of pending.evidenceLedgerSnapshot) {
    deps.ledger.record(entry.key, { grade: entry.grade, sourceId: entry.sourceId, confirmed: entry.confirmed });
  }

  deps.eventLog.append({
    type: 'confirmation_resolved',
    requestId,
    actor: response.actor,
    decision: response.decision,
    instrumentation: response.instrumentation,
  });

  if (response.decision === 'reject') {
    deps.eventLog.append({ type: 'scenario_completed' });
    return { status: 'completed', sessionId: pending.sessionId, artifacts: pending.producedArtifacts };
  }

  for (const revision of response.revisions ?? []) {
    const event = buildRevisionEvent(revision, response.actor, now);
    deps.revisionStore.record(event);
    deps.eventLog.append({ type: 'revision_recorded', revisionEventId: event.id });
    const artifact = pending.producedArtifacts[revision.artifactType];
    if (artifact && typeof artifact === 'object') {
      applyJsonPointer(artifact as Record<string, unknown>, revision.fieldPath, revision.newValue);
    }
  }

  return produceSequence(
    scenario,
    pending.remainingArtifactTypes,
    {
      sessionId: pending.sessionId,
      scenarioId: pending.scenarioId,
      toolResults: pending.toolResults,
      producedSoFar: pending.producedArtifacts,
      inputArtifacts: pending.producedArtifacts,
    },
    deps,
  );
}
```

去掉 Task 11 里那个不含 `revisions`/`instrumentation` 的 `ScenarioResumeInput`/`resumeScenario` 旧定义，本步骤是替换而非新增。`ConfirmationActor`/`UnknownConfirmationRequestError` 定义不变，保留。

- [ ] **Step 4: 确认测试通过**

```bash
pnpm test -- packages/core
```

Expected：新增 2 例全绿（累计 47 例）。

- [ ] **Step 5: 提交**

```bash
git add packages/core/src/scenario-executor/executor.ts packages/core/src/scenario-executor/executor.test.ts
git commit -m "$(cat <<'EOF'
feat(core): apply field-level revisions on confirm (D5 wired into D2)

确认响应可携带 revisions[]：每条经 buildRevisionEvent 构造并校验
为合规的 @courtwork/schemas RevisionEvent，交给 RevisionEventStore
落盘（D5），再用 applyJsonPointer 真实应用回 producedArtifacts——
后续生成节点/编译步骤看到的是修正后的值，不是原始产出。
confirmation_resolved 事件透传可选的确认质量埋点字段
（docs/09+docs/30 防呆三原则之三），core 只记录不解读。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: 场景执行器——多产出顺序门禁泛化 + label-only 门禁 + 跨进程续行实测（D2 收尾）

**背景**：Task 10–12 只用了 S3 形状（1 产出/1 门禁）的场景验证执行器。本任务用 S1 形状（3 产出/2 门禁，`registry/scenarios/S1.yaml` 的真实连线）证明"声明顺序即执行顺序"不是只对单产出场景成立；再补 label-only 门禁（无 `artifact` 锚点，落序列尾）与"全新依赖实例接续"（file-backed 存储，忠实模拟另一进程）两类此前未覆盖的分支。

**Files:**
- Modify: `packages/core/src/scenario-executor/executor.test.ts`（不改 `executor.ts`——Task 10 已经把完整循环体一次写对，本任务只是新增测试覆盖此前未触达的分支）

- [ ] **Step 1: 追加失败测试到 `packages/core/src/scenario-executor/executor.test.ts`**

```ts
// 追加到文件顶部既有 import 之后：
import { createFileEventLog } from '../events/event-log.js';
import { createFileConfirmationStore } from '../session/confirmation-store.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// 追加到文件末尾，新 describe 块：
const MULTI_GATE_SCENARIO: ScenarioDefinition = {
  id: 'S-test-multi',
  name: '多产出测试场景',
  trigger: { fileTypes: ['pdf'], userActions: [], classifierTags: [] },
  inputArtifacts: [],
  toolIds: [],
  outputArtifacts: ['CaseFile', 'Timeline', 'PartyGraph'],
  uiTemplateId: 'test-panel',
  confirmationGates: [
    { artifact: 'Timeline', label: '确认事件时间线' },
    { artifact: 'PartyGraph', label: '确认当事人关系图谱' },
  ],
  promptTemplateRef: 'test-v0',
};

const CASE_FILE_RESPONSE = { caseId: 'c1', files: [] };
const TIMELINE_RESPONSE = { caseId: 'c1', events: [] };
const PARTY_GRAPH_RESPONSE = { caseId: 'c1', nodes: [], edges: [] };

describe('runScenario / resumeScenario — multi-artifact sequential gates (S1 shape)', () => {
  it('produces CaseFile ungated, pauses at Timeline, then pauses at PartyGraph after Timeline is confirmed, matching declared order', async () => {
    const deps = buildDeps([
      { content: JSON.stringify(CASE_FILE_RESPONSE) },
      { content: JSON.stringify(TIMELINE_RESPONSE) },
      { content: JSON.stringify(PARTY_GRAPH_RESPONSE) },
    ]);

    const firstPause = await runScenario(MULTI_GATE_SCENARIO, { inputArtifacts: {}, toolInputs: {} }, deps);
    if (firstPause.status !== 'paused') throw new Error('expected pause at Timeline');
    expect(deps.eventLog.list().map((e) => e.type)).toEqual([
      'artifact_produced', // CaseFile, ungated
      'artifact_produced', // Timeline
      'confirmation_requested',
    ]);
    expect(deps.eventLog.list()[2]).toMatchObject({ gateLabel: '确认事件时间线', artifactType: 'Timeline' });

    const secondPause = await resumeScenario(
      firstPause.requestId,
      { actor: { channelId: 'cli', actorId: 'u1' }, decision: 'confirm' },
      MULTI_GATE_SCENARIO,
      deps,
    );
    if (secondPause.status !== 'paused') throw new Error('expected pause at PartyGraph');
    const eventsAfterSecondPause = deps.eventLog.list();
    expect(eventsAfterSecondPause[eventsAfterSecondPause.length - 1]).toMatchObject({
      gateLabel: '确认当事人关系图谱',
      artifactType: 'PartyGraph',
    });

    const done = await resumeScenario(
      secondPause.requestId,
      { actor: { channelId: 'cli', actorId: 'u1' }, decision: 'confirm' },
      MULTI_GATE_SCENARIO,
      deps,
    );
    expect(done).toEqual({
      status: 'completed',
      sessionId: 'session-1',
      artifacts: { CaseFile: CASE_FILE_RESPONSE, Timeline: TIMELINE_RESPONSE, PartyGraph: PARTY_GRAPH_RESPONSE },
    });
  });
});

describe('runScenario — label-only confirmation gate (no artifact anchor)', () => {
  const LABEL_ONLY_SCENARIO: ScenarioDefinition = {
    id: 'S-test-label-only',
    name: '无锚点门禁测试场景',
    trigger: { fileTypes: [], userActions: ['x'], classifierTags: [] },
    inputArtifacts: [],
    toolIds: [],
    outputArtifacts: ['CaseFile'],
    uiTemplateId: 'test-panel',
    confirmationGates: [{ label: '整体确认（无产物锚点）' }],
    promptTemplateRef: 'test-v0',
  };

  it('produces the sole output artifact ungated, then pauses on the label-only gate at the end of the sequence', async () => {
    const deps = buildDeps([{ content: JSON.stringify(CASE_FILE_RESPONSE) }]);
    const result = await runScenario(LABEL_ONLY_SCENARIO, { inputArtifacts: {}, toolInputs: {} }, deps);
    expect(result.status).toBe('paused');
    const events = deps.eventLog.list();
    expect(events.map((e) => e.type)).toEqual(['artifact_produced', 'confirmation_requested']);
    expect(events[1]).toMatchObject({ gateLabel: '整体确认（无产物锚点）', artifactType: undefined });
  });
});

describe('resumeScenario — genuinely fresh dependency instances (simulated cross-process resume)', () => {
  it('a resume using brand-new EventLog/ConfirmationStore/EvidenceLedger instances pointed at the same durable state completes correctly', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-executor-crossproc-'));
    try {
      const eventsPath = join(dir, 'events.jsonl');
      const pendingDir = join(dir, 'pending');
      const tools = createToolRegistry();
      tools.register('party-verify', { tool: createPartyVerifyTool(createMockPartyVerifyAdapter()), grade: 'A' });

      const firstDeps: ScenarioExecutorDeps = {
        tools,
        toolExecutor: createToolExecutor(),
        provider: createScriptedProvider('p', 'v1', [{ content: JSON.stringify(VALID_RISK_LIST) }]),
        eventLog: createFileEventLog('session-x', eventsPath),
        confirmationStore: createFileConfirmationStore(pendingDir),
        revisionStore: createInMemoryRevisionEventStore(),
        ledger: createEvidenceLedger(),
      };
      const paused = await runScenario(
        SINGLE_GATE_SCENARIO,
        { inputArtifacts: { CaseFile: { caseId: 'c1', files: [] } }, toolInputs: { 'party-verify': { name: '张三' } } },
        firstDeps,
      );
      if (paused.status !== 'paused') throw new Error('expected pause');

      // 模拟"另一个进程"：全新构造的 eventLog/confirmationStore/ledger 实例，只共享磁盘路径。
      const secondDeps: ScenarioExecutorDeps = {
        ...firstDeps,
        eventLog: createFileEventLog('session-x', eventsPath),
        confirmationStore: createFileConfirmationStore(pendingDir),
        ledger: createEvidenceLedger(),
      };
      const done = await resumeScenario(
        paused.requestId,
        { actor: { channelId: 'wecom', actorId: 'lawyer-42' }, decision: 'confirm' },
        SINGLE_GATE_SCENARIO,
        secondDeps,
      );

      expect(done.status).toBe('completed');
      // ledger 从 pending.evidenceLedgerSnapshot 重建，而不是继承 firstDeps 的内存实例：
      expect(secondDeps.ledger.get('party-verify')).toEqual({ grade: 'A', sourceId: 'mock', confirmed: false });
      // 完整历史（含 firstDeps 阶段写入的事件）在全新 eventLog 实例里依然可读：
      expect(secondDeps.eventLog.list()).toHaveLength(4);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: 确认测试按预期失败**

```bash
pnpm test -- packages/core
```

Expected：三个新 `describe` 块的断言应全部通过（因为 `executor.ts` 的循环体在 Task 10 已经完整实现了这些分支）——**除非**发现某个分支确实有 bug。若某条断言失败，说明 Task 10 的实现有遗漏，此时才去修 `executor.ts`（这是本任务存在的意义：用新场景形状把 Task 10 写的循环体逼出潜在缺陷）。

- [ ] **Step 3: 若测试全部一次通过，无需改动 `executor.ts`；若有断言失败，定位并修复对应分支后重跑至全绿**

```bash
pnpm test -- packages/core
```

Expected：新增 4 例全绿（累计 51 例）。

- [ ] **Step 4: 提交**

```bash
git add packages/core/src/scenario-executor/executor.test.ts
git commit -m "$(cat <<'EOF'
test(core): scenario executor — multi-gate sequencing, label-only gate,
cross-process resume (D2 generalization proof)

用 S1 真实连线形状（3 产出/2 门禁）证明"outputArtifacts 声明顺序即
执行顺序"对多产出场景成立，不是只服务 S3 单产出场景的特例。补
label-only 门禁（落序列尾）与"全新 EventLog/ConfirmationStore/
EvidenceLedger 实例接续同一份磁盘状态"两类此前未覆盖的分支——后者
是异步确认预留（SPEC TODO"协议不许隐含确认方与 core 同进程/同机"）
的直接实测，不只是类型层面的承诺。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: demo 装配点（D6，全仓库唯一 import @courtwork/demo-data 的运行时文件）

**Files:**
- Create: `packages/core/src/composition/s3-risk-list-response.ts`
- Create: `packages/core/src/composition/demo-assembly.ts`
- Create: `packages/core/src/composition/demo-assembly.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 写 `packages/core/src/composition/s3-risk-list-response.ts`**（生成节点录制回放响应，非测试代码——它是装配点的数据，不需要先写失败测试；下一步的 `demo-assembly.test.ts` 会验证消费它的代码）

```ts
import type { RiskList } from '@courtwork/schemas';

/**
 * S3 生成节点的录制回放响应。本演示有意分成两层，不假装无缝——如实记录原因：
 *
 * 1. **案件/主体层**：caseId 与 party-verify 查询目标沿用 packages/demo-data 的真实
 *    样板案语料（临江精铸诉起云智能），risk-07 的核验结果就是本次场景真实调用
 *    party-verify（demo-fixture 适配器）拿到的，用来在验收演示里真正走一遍信源
 *    等级台账的记账路径（而不仅仅在 evidence/grade.test.ts 里用合成数据验证机制
 *    本身）。
 * 2. **被改的 docx 文本层**：risk-01–06 的 sourceAnchor.quote 改为取自
 *    packages/output/src/test-fixtures/instruction-set.ts 的黄金样例合同真实文本
 *    （而非 demo-data 主合同的文本）——因为验收要把修订指令集喂给
 *    packages/output/test/fixtures/original.docx（SPEC 明确允许"输入 docx 可用
 *    output 包的 sample"），而 demo-data 主合同目前只有 markdown 形态，还没有对应
 *    的 docx（"markdown → 新建 docx"是 W4.1 挂账工单，未排期，见
 *    packages/output/SPEC.md TODO）。把 demo-data 合同的引文硬套进一份文本完全
 *    不同的 docx 只会让每条指令定位失败——那不是更真实，只是自欺。
 *
 * risk-07 的 quote 取自 demo-data 自己的卷宗文件（'20-企业信用信息查询单.md'），
 * 不出现在 original.docx 里——编译进 RevisionInstructionSet 后，output 侧对它的
 * 处理结果预期就是 'locator_not_found'，这是"定位失败时报错并跳过，不错插"纪律
 * 的真实展示，不是缺陷（见 Task 16 验收测试的显式断言）。
 */
export const S3_RISK_LIST_RESPONSE: RiskList = {
  caseId: 'case-linjiang-qiyun-2025',
  risks: [
    {
      id: 'risk-01',
      description:
        '违约金比例未与实际迟延损失挂钩：合同约定的百分之十违约金属固定比例条款，未考虑逾期时长与实际损失的对应关系，一旦买方逾期时间较短、损失有限，该比例仍可能被认定畸高而被法院酌减，建议与迟延天数或实际损失挂钩分级约定。',
      level: 'medium',
      basis: [
        {
          citation: '《中华人民共和国民法典》第五百八十五条',
          sourceAnchors: [{ fileId: 'sample-sale-contract-v1.docx', quote: '百分之十的违约金', textRange: { start: 0, end: 8 } }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-02',
      description:
        '管辖条款单方倾斜：约定争议提交甲方（卖方）所在地人民法院管辖，排除买方就近应诉或就近勘验标的物的便利，若该条款系甲方单方拟定的格式条款且未采取合理方式提示乙方注意，乙方可主张该条款未成为合同内容。建议改为标的物所在地法院管辖，便于纠纷发生时勘验现场设备。',
      level: 'medium',
      basis: [
        {
          citation: '《中华人民共和国民法典》第四百九十六条',
          sourceAnchors: [{ fileId: 'sample-sale-contract-v1.docx', quote: '提交甲方所在地人民法院诉讼解决', textRange: { start: 0, end: 16 } }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-03',
      description:
        '质保期短于行业惯例：合同约定质保期为交付之日起壹年，同类精密设备行业惯例通常为两年，且法律对产品质量瑕疵责任期间另有规定，过短的合同约定质保期可能在实际质量纠纷中对买方保护不足，建议参照行业惯例延长。',
      level: 'low',
      basis: [
        {
          citation: '《中华人民共和国产品质量法》第四十条',
          sourceAnchors: [{ fileId: 'sample-sale-contract-v1.docx', quote: '质保期为交付之日起壹年', textRange: { start: 0, end: 11 } }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-04',
      description:
        '交付期限偏紧存在违约风险：合同约定签订之日起三十日内交付，未预留设备生产周期的合理缓冲，若卖方产能或供应链出现波动，三十日内交付存在较高的逾期违约风险，建议核实卖方实际产能后适当延长交付期限或增加合理免责事由。',
      level: 'medium',
      basis: [
        {
          citation: '《中华人民共和国民法典》第五百七十七条',
          sourceAnchors: [{ fileId: 'sample-sale-contract-v1.docx', quote: '本合同签订之日起三十日内', textRange: { start: 0, end: 12 } }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-05',
      description:
        '标的物规格依赖未见附表：合同约定规格、数量、单价详见附表一，但本次送审文本未见该附表随附，若附表缺失或未与合同一并签署，标的物范围与价款约定将失去可核验的具体依据，建议核实附表一是否已作为合同附件一并签署。',
      level: 'high',
      basis: [
        {
          citation: '《中华人民共和国民法典》第四百七十条',
          sourceAnchors: [{ fileId: 'sample-sale-contract-v1.docx', quote: '规格、数量、单价详见本合同附表一', textRange: { start: 0, end: 16 } }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-06',
      description:
        '买受人名称核验存在滞后风险：合同抬头载明的买受人名称若未与最新营业执照/企业信用信息核对，可能存在企业名称变更（如有限公司改制为股份有限公司）未及时更新导致合同主体表述不准确的风险，建议核对最新登记信息后确认。',
      level: 'low',
      basis: [
        {
          citation: '《中华人民共和国民法典》第四百七十条',
          sourceAnchors: [{ fileId: 'sample-sale-contract-v1.docx', quote: '甲方（买受人）：星辰科技有限公司', textRange: { start: 0, end: 16 } }],
        },
      ],
      dispositionStatus: 'pending',
    },
    {
      id: 'risk-07',
      description:
        '买方主体核验（演示库/B 级信源）：起云智能装备（虚构）有限公司工商状态存续，未见涉诉记录；核验结果来自内部演示库（非官方接口），建议在正式出具意见前改用 A 级信源（企查查/天眼查）复核一次。',
      level: 'low',
      basis: [
        {
          citation: '主体核验：party-verify（demo-fixture，B 级信源）',
          sourceAnchors: [
            { fileId: '20-企业信用信息查询单.md', quote: '起云智能装备（虚构）有限公司', textRange: { start: 0, end: 14 } },
          ],
        },
      ],
      dispositionStatus: 'pending',
    },
  ],
};
```

- [ ] **Step 2: 写失败测试 `packages/core/src/composition/demo-assembly.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { createToolExecutor } from '@courtwork/tools';
import { buildDemoS3Runtime } from './demo-assembly.js';

describe('buildDemoS3Runtime', () => {
  it('registers a B-grade party-verify tool wired to the real demo-data corpus (not a hand-rolled fixture)', async () => {
    const runtime = buildDemoS3Runtime();
    const binding = runtime.tools.get('party-verify');
    expect(binding?.grade).toBe('B');

    const executor = createToolExecutor();
    const result = await executor.execute(binding!.tool, runtime.toolInputs['party-verify']);
    expect(result.verified).toBe(true);
    if (!result.verified) throw new Error('unreachable');
    expect(result.source).toBe('demo-fixture');
    expect(result.data.businessStatus).toBe('存续');
  });

  it('provides a scripted provider that yields the S3 risk list fixture on first generate() call', async () => {
    const runtime = buildDemoS3Runtime();
    const response = await runtime.provider.generate({ messages: [] });
    const parsed = JSON.parse(response.content);
    expect(parsed.caseId).toBe('case-linjiang-qiyun-2025');
    expect(parsed.risks).toHaveLength(7);
  });
});
```

- [ ] **Step 3: 确认测试按预期失败**

```bash
pnpm test -- packages/core
```

Expected：报错 `Cannot find module './demo-assembly.js'`。

- [ ] **Step 4: 写最小实现 `packages/core/src/composition/demo-assembly.ts`**

```ts
import { findPartyRecord, type PartyCorpusRecord } from '@courtwork/demo-data';
import {
  createDemoFixturePartyVerifyAdapter,
  createPartyVerifyTool,
  type PartyVerifyData,
  type PartyVerifyInput,
} from '@courtwork/tools';
import { createToolRegistry, type ToolRegistry } from '../tools/tool-registry.js';
import { createScriptedProvider } from '../provider/scripted-provider.js';
import type { Provider } from '../provider/types.js';
import { S3_RISK_LIST_RESPONSE } from './s3-risk-list-response.js';

/**
 * 富语料 → 核验字段子集的投影。参考 packages/tools/src/party-verify.test.ts 的
 * projectPartyRecord（那里明确标注是"提前演示装配点长什么样"，非生产代码）——
 * 这里是生产标准的正式落地，真正的装配点。
 */
function projectPartyRecord(record: PartyCorpusRecord): PartyVerifyData {
  return {
    matchedName: record.entityName,
    unifiedSocialCreditCode: record.unifiedSocialCreditCode,
    businessStatus: record.registrationStatus,
    litigationSummary:
      record.litigationSummary === '无公开涉诉记录'
        ? []
        : [{ caseNumber: '(2025)云章03民初472号', summary: record.litigationSummary }],
  };
}

function corpusLookup(input: PartyVerifyInput): PartyVerifyData | undefined {
  const record = findPartyRecord(input.name);
  return record ? projectPartyRecord(record) : undefined;
}

export interface DemoS3Runtime {
  tools: ToolRegistry;
  provider: Provider;
  toolInputs: Record<string, unknown>;
}

/**
 * 全仓库唯一 import @courtwork/demo-data 的运行时文件（docs/21 定义的装配点例外）。
 * 真实数据接入 = 换这一个文件的 wiring，其余板块零改动。
 */
export function buildDemoS3Runtime(): DemoS3Runtime {
  const tools = createToolRegistry();
  tools.register('party-verify', {
    tool: createPartyVerifyTool(createDemoFixturePartyVerifyAdapter(corpusLookup)),
    grade: 'B',
  });

  const provider = createScriptedProvider('demo-scripted-provider', 'fake-scripted-v1', [
    { content: JSON.stringify(S3_RISK_LIST_RESPONSE) },
  ]);

  return {
    tools,
    provider,
    toolInputs: { 'party-verify': { name: '起云智能装备（虚构）有限公司' } },
  };
}
```

- [ ] **Step 5: 更新 `packages/core/src/index.ts`**（追加一行——只导出 `demo-assembly.js`，`s3-risk-list-response.ts` 是其内部细节，不单独导出）

```ts
export * from './composition/demo-assembly.js';
```

- [ ] **Step 6: 确认测试通过**

```bash
pnpm test -- packages/core
```

Expected：新增 2 例全绿（累计 53 例）。

- [ ] **Step 7: 提交**

```bash
git add packages/core/src/composition/s3-risk-list-response.ts packages/core/src/composition/demo-assembly.ts packages/core/src/composition/demo-assembly.test.ts packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): demo composition root (D6) — the sole runtime importer of
@courtwork/demo-data

buildDemoS3Runtime 装配 party-verify 的 demo-fixture 适配器（B 级
信源，注入真实语料查找函数）+ 录制回放 provider（S3 生成节点响应）。
projectPartyRecord 是 packages/tools/src/party-verify.test.ts 里
"提前演示装配点长什么样"投影函数的生产标准正式落地。真实数据接入
= 换这一个文件的 wiring，其余板块零改动（docs/21 装配点边界）。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: 已确认 RiskList → RevisionInstructionSet 编译（demo glue，过 D4 门禁）

**背景**：`registry/scenarios/S3.yaml` 的 `outputArtifacts` 只到 `RiskList`，没有声明 `RevisionInstructionSet` 第二产出——这段编译逻辑不通过场景执行器跑（不存在"S3 之后接着跑哪个场景"这件事），是验收脚本自己的 demo glue，用 core 暴露的通用原语（`EvidenceLedger`/`assertCitationAdmissible`）拼起来。依据 docs/40（S5 合同对比设计）先例：即便产出也是 `RevisionInstructionSet`，编译逻辑仍归场景/演示自己，不进 core 通用库——领域判断（"这条风险该配什么样的批注"）不属于通用层。

**Files:**
- Create: `packages/core/src/composition/compile-risk-list-to-revisions.ts`
- Create: `packages/core/src/composition/compile-risk-list-to-revisions.test.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/core/src/composition/compile-risk-list-to-revisions.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import type { RiskList } from '@courtwork/schemas';
import { createEvidenceLedger, InadmissibleCitationError } from '../evidence/grade.js';
import { compileConfirmedRiskListToRevisionInstructions, MissingLocatorQuoteError } from './compile-risk-list-to-revisions.js';

function riskList(overrides: Partial<RiskList['risks'][number]> = {}): RiskList {
  return {
    caseId: 'c1',
    risks: [
      {
        id: 'risk-01',
        description: '违约金过高',
        level: 'high',
        basis: [{ citation: '《民法典》第585条', sourceAnchors: [{ fileId: 'f1', quote: '逾期违约金', textRange: { start: 0, end: 4 } }] }],
        dispositionStatus: 'confirmed',
        ...overrides,
      },
    ],
  };
}

describe('compileConfirmedRiskListToRevisionInstructions', () => {
  it('compiles each non-rejected risk into a commentOnly instruction citing its basis', () => {
    const ledger = createEvidenceLedger();
    const result = compileConfirmedRiskListToRevisionInstructions(riskList(), 'main-contract.docx', ledger);
    expect(result).toMatchObject({
      id: 'revset-c1',
      caseId: 'c1',
      targetDocument: { fileId: 'main-contract.docx' },
    });
    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0]).toMatchObject({
      id: 'instr-risk-01',
      kind: 'commentOnly',
      locator: { strategy: 'text', quote: '逾期违约金' },
      annotation: { text: '违约金过高', citations: [{ citation: '《民法典》第585条' }] },
    });
  });

  it('excludes risks with dispositionStatus "rejected"', () => {
    const ledger = createEvidenceLedger();
    const result = compileConfirmedRiskListToRevisionInstructions(riskList({ dispositionStatus: 'rejected' }), 'x.docx', ledger);
    expect(result.instructions).toHaveLength(0);
  });

  it('throws MissingLocatorQuoteError when the primary basis anchor has no quote', () => {
    const ledger = createEvidenceLedger();
    const noQuote = riskList({ basis: [{ citation: 'x', sourceAnchors: [{ fileId: 'f1', textRange: { start: 0, end: 1 } }] }] });
    expect(() => compileConfirmedRiskListToRevisionInstructions(noQuote, 'x.docx', ledger)).toThrow(MissingLocatorQuoteError);
  });

  it('rejects (via the D4 gate) a citation whose evidence is C-grade and unconfirmed', () => {
    const ledger = createEvidenceLedger();
    ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
    const webSourced = riskList({
      basis: [{ citation: 'web-search', sourceAnchors: [{ fileId: 'f1', quote: 'x', textRange: { start: 0, end: 1 } }] }],
    });
    expect(() => compileConfirmedRiskListToRevisionInstructions(webSourced, 'x.docx', ledger)).toThrow(InadmissibleCitationError);
  });

  it('admits the same C-grade citation once the ledger entry is explicitly confirmed', () => {
    const ledger = createEvidenceLedger();
    ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
    ledger.confirm('web-search');
    const webSourced = riskList({
      basis: [{ citation: 'web-search', sourceAnchors: [{ fileId: 'f1', quote: 'x', textRange: { start: 0, end: 1 } }] }],
    });
    expect(() => compileConfirmedRiskListToRevisionInstructions(webSourced, 'x.docx', ledger)).not.toThrow();
  });
});
```

- [ ] **Step 2: 确认测试按预期失败**

```bash
pnpm test -- packages/core
```

Expected：报错 `Cannot find module './compile-risk-list-to-revisions.js'`。

- [ ] **Step 3: 写最小实现 `packages/core/src/composition/compile-risk-list-to-revisions.ts`**

```ts
import type { RevisionInstruction, RevisionInstructionSet, RiskList } from '@courtwork/schemas';
import { assertCitationAdmissible, type EvidenceLedger } from '../evidence/grade.js';

export class MissingLocatorQuoteError extends Error {
  constructor(riskId: string) {
    super(`风险 ${riskId} 的首个依据缺少可用于定位的 sourceAnchor.quote，无法编译为修订指令`);
    this.name = 'MissingLocatorQuoteError';
  }
}

/**
 * 验收脚本自己的 demo glue：把已确认的风险清单编译成修订指令集。
 * 领域判断不属于通用层——docs/40（S5 设计）先例：即便产出也是
 * RevisionInstructionSet，编译逻辑仍归场景/演示自己，不进 core 通用库。
 */
export function compileConfirmedRiskListToRevisionInstructions(
  riskList: RiskList,
  targetFileId: string,
  ledger: EvidenceLedger,
): RevisionInstructionSet {
  const instructions: RevisionInstruction[] = [];
  for (const risk of riskList.risks) {
    if (risk.dispositionStatus === 'rejected') continue;
    const primaryBasis = risk.basis[0];
    const quote = primaryBasis.sourceAnchors[0]?.quote;
    if (!quote) throw new MissingLocatorQuoteError(risk.id);

    const citations = risk.basis.map((basis) => {
      assertCitationAdmissible(ledger, basis.citation);
      return { citation: basis.citation, sourceAnchors: basis.sourceAnchors };
    });

    instructions.push({
      id: `instr-${risk.id}`,
      kind: 'commentOnly',
      locator: { strategy: 'text', quote },
      annotation: { text: risk.description, citations },
    });
  }
  return {
    id: `revset-${riskList.caseId}`,
    caseId: riskList.caseId,
    targetDocument: { fileId: targetFileId },
    instructions,
  };
}
```

- [ ] **Step 4: 更新 `packages/core/src/index.ts`**（追加一行）

```ts
export * from './composition/compile-risk-list-to-revisions.js';
```

- [ ] **Step 5: 确认测试通过**

```bash
pnpm test -- packages/core
```

Expected：新增 5 例全绿（累计 58 例）。

- [ ] **Step 6: 提交**

```bash
git add packages/core/src/composition/compile-risk-list-to-revisions.ts packages/core/src/composition/compile-risk-list-to-revisions.test.ts packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): compile confirmed RiskList -> RevisionInstructionSet (demo glue)

不进 core 通用库，是验收脚本自己的领域编译逻辑（docs/40 S5 先例：
产出是 RevisionInstructionSet 不代表编译逻辑归通用层）。每条 citation
在组装前都过 D4 的 assertCitationAdmissible 门禁——测试用合成 C 级
未确认证据证明门禁真的会拒绝，确认后才放行，不是只在
evidence/grade.test.ts 里孤立验证机制本身。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: 验收——S3 全流程 CLI 脚本 + 集成测试

**背景**：这是 SPEC 验收标准的落点："无 UI 用 CLI 脚本跑通 S3 全流程演示装配——样板案主体过 party-verify（demo-fixture 适配器）→ RiskList artifact（依据含信源等级）→ 脚本模拟确认 → RevisionInstructionSet → 调 output 产出带修订与批注的 docx（输入 docx 可用 output 包的 sample）。全程事件流可回放。" CLI 脚本与自动化集成测试调用**同一个**可复用函数（`runS3Demo`），不是两套平行实现——这样 `pnpm test` 能在 CI 语境下断言验收标准，人/Codex 也能用 `pnpm demo:s3` 跑一遍看到真实产物文件。

**Files:**
- Create: `packages/core/src/acceptance/run-s3-demo.ts`
- Create: `packages/core/src/acceptance/s3-flow.integration.test.ts`
- Create: `packages/core/scripts/demo-s3-flow.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: 写失败测试 `packages/core/src/acceptance/s3-flow.integration.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runS3Demo } from './run-s3-demo.js';

describe('S3 end-to-end acceptance flow', () => {
  it('runs CaseFile -> party-verify -> RiskList -> simulated confirmation (with a real RevisionEvent) -> RevisionInstructionSet -> redlined docx, with a fully replayable event stream', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'courtwork-core-s3-acceptance-'));
    try {
      const result = await runS3Demo(workDir);

      // party-verify 真实经过 demo-fixture 适配器，落进证据台账（B 级信源）。
      expect(result.replay.artifacts.RiskList).toBeDefined();
      const riskList = result.replay.artifacts.RiskList as { risks: { id: string; dispositionStatus: string }[] };
      expect(riskList.risks).toHaveLength(7);

      // 脚本模拟的确认 + 一条真实 RevisionEvent 被记录且体现在最终产出里。
      expect(Object.keys(result.replay.confirmations)).toHaveLength(1);
      expect(result.replay.revisionEventIds).toHaveLength(1);
      expect(riskList.risks[0].dispositionStatus).toBe('confirmed');
      expect(result.replay.completed).toBe(true);

      // RevisionInstructionSet 编译出 7 条指令（6 条 clause 级 + 1 条 party-verify 级）。
      expect(result.outcomes).toHaveLength(7);
      const byId = Object.fromEntries(result.outcomes.map((o) => [o.id, o.status]));
      for (const riskId of ['risk-01', 'risk-02', 'risk-03', 'risk-04', 'risk-05', 'risk-06']) {
        expect(['applied', 'applied_fuzzy']).toContain(byId[`instr-${riskId}`]);
      }
      // risk-07 的依据锚点在 demo-data 卷宗文件里，不在 output 的 stand-in docx 里——
      // 报错并跳过是预期行为（SPEC："定位失败时报错并跳过，不错插"），不是缺陷。
      expect(byId['instr-risk-07']).toBe('locator_not_found');

      // 产出的 docx 是真实非空的 Word 文档（zip 格式以 PK 开头）。
      expect(result.docx.length).toBeGreaterThan(0);
      expect(result.docx.subarray(0, 2).toString('utf-8')).toBe('PK');

      // 全程事件流可回放：类型序列体现"产出→确认请求→确认解决→修正记录→完成"的完整生命周期。
      expect(result.eventTypes).toEqual([
        'artifact_produced',
        'confirmation_requested',
        'confirmation_resolved',
        'revision_recorded',
        'scenario_completed',
      ]);
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: 确认测试按预期失败**

```bash
pnpm test -- packages/core
```

Expected：报错 `Cannot find module './run-s3-demo.js'`。

- [ ] **Step 3: 写最小实现 `packages/core/src/acceptance/run-s3-demo.ts`**

```ts
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadScenarioFile } from '@courtwork/registry';
import { createToolExecutor } from '@courtwork/tools';
import { applyRevisionInstructionSet, type InstructionOutcome } from '@courtwork/output';
import type { CaseFile, RiskList } from '@courtwork/schemas';
import { createEvidenceLedger } from '../evidence/grade.js';
import { createFileEventLog, replaySession, type ReplaySummary, type SessionEvent } from '../events/event-log.js';
import { createFileConfirmationStore } from '../session/confirmation-store.js';
import { createFileRevisionEventStore } from '../revision/revision-store.js';
import { runScenario, resumeScenario, type ScenarioExecutorDeps } from '../scenario-executor/executor.js';
import { buildDemoS3Runtime } from '../composition/demo-assembly.js';
import { compileConfirmedRiskListToRevisionInstructions } from '../composition/compile-risk-list-to-revisions.js';

const S3_YAML_PATH = join(import.meta.dirname, '..', '..', '..', 'registry', 'scenarios', 'S3.yaml');
const ORIGINAL_DOCX_PATH = join(import.meta.dirname, '..', '..', '..', 'output', 'test', 'fixtures', 'original.docx');

const CASE_FILE: CaseFile = {
  caseId: 'case-linjiang-qiyun-2025',
  files: [
    { fileId: '04-设备采购合同.md', fileName: '04-设备采购合同.md', documentType: '合同', ingestStatus: 'done', pageCount: 1 },
  ],
};

export interface S3DemoResult {
  docx: Buffer;
  outcomes: InstructionOutcome[];
  replay: ReplaySummary;
  eventTypes: SessionEvent['type'][];
  workDir: string;
}

/**
 * 验收流程的可复用实现：CLI 脚本（scripts/demo-s3-flow.ts）与集成测试
 * （s3-flow.integration.test.ts）共用同一份逻辑，不是两套平行实现。
 */
export async function runS3Demo(
  workDir: string = mkdtempSync(join(tmpdir(), 'courtwork-core-s3-demo-')),
): Promise<S3DemoResult> {
  const sessionId = 'demo-s3-session';
  const runtime = buildDemoS3Runtime();
  const eventsPath = join(workDir, 'events.jsonl');
  const pendingDir = join(workDir, 'pending');
  const revisionEventsPath = join(workDir, 'revision-events.jsonl');

  const firstDeps: ScenarioExecutorDeps = {
    tools: runtime.tools,
    toolExecutor: createToolExecutor(),
    provider: runtime.provider,
    eventLog: createFileEventLog(sessionId, eventsPath),
    confirmationStore: createFileConfirmationStore(pendingDir),
    revisionStore: createFileRevisionEventStore(revisionEventsPath),
    ledger: createEvidenceLedger(),
  };

  const scenario = loadScenarioFile(S3_YAML_PATH);

  const firstRun = await runScenario(scenario, { inputArtifacts: { CaseFile }, toolInputs: runtime.toolInputs }, firstDeps);
  if (firstRun.status !== 'paused') {
    throw new Error(`预期 S3 在 RiskList 确认门禁处暂停，实际状态是 "${firstRun.status}"`);
  }

  // 模拟"另一个进程"接续：每个依赖都通过磁盘路径重新获取，不复用 firstDeps 的内存
  // 闭包——异步确认预留的忠实模拟，与 Task 13 的同款证明手法一致。
  const secondDeps: ScenarioExecutorDeps = {
    ...firstDeps,
    eventLog: createFileEventLog(sessionId, eventsPath),
    confirmationStore: createFileConfirmationStore(pendingDir),
    ledger: createEvidenceLedger(),
  };

  const secondRun = await resumeScenario(
    firstRun.requestId,
    {
      actor: { channelId: 'cli', actorId: 'demo-lawyer', role: '主办律师' },
      decision: 'confirm',
      revisions: [
        {
          artifactType: 'RiskList',
          artifactId: CASE_FILE.caseId,
          fieldPath: '/risks/0/dispositionStatus',
          previousValue: 'pending',
          newValue: 'confirmed',
          reason: '与主办律师电话确认，风险属实',
          caseId: CASE_FILE.caseId,
        },
      ],
      instrumentation: { dwellMs: 4200, expandedEvidenceKeys: ['party-verify'] },
    },
    scenario,
    secondDeps,
  );
  if (secondRun.status !== 'completed') {
    throw new Error(`预期确认后场景直接完成，实际状态是 "${secondRun.status}"`);
  }

  const riskList = secondRun.artifacts.RiskList as RiskList;
  const revisionSet = compileConfirmedRiskListToRevisionInstructions(riskList, '04-设备采购合同.docx', secondDeps.ledger);

  const originalDocx = readFileSync(ORIGINAL_DOCX_PATH);
  const { docx, outcomes } = applyRevisionInstructionSet(originalDocx, revisionSet, {
    now: new Date('2026-07-10T09:00:00.000Z'),
  });

  const finalEvents = createFileEventLog(sessionId, eventsPath).list();
  const replay = replaySession(finalEvents);

  writeFileSync(join(workDir, 'redline.docx'), docx);
  writeFileSync(join(workDir, 'revision-instruction-set.json'), JSON.stringify(revisionSet, null, 2));

  return { docx, outcomes, replay, eventTypes: finalEvents.map((e) => e.type), workDir };
}
```

- [ ] **Step 4: 写 CLI 入口 `packages/core/scripts/demo-s3-flow.ts`**

```ts
import { runS3Demo } from '../src/acceptance/run-s3-demo.js';

const result = await runS3Demo();

console.log(`S3 演示完成，产物写入：${result.workDir}`);
console.log(`  - redline.docx（${result.docx.length} bytes）`);
console.log('  - revision-instruction-set.json');
console.log('  - events.jsonl（事件流，可回放）');
console.log('');
console.log('指令处理结果：');
for (const outcome of result.outcomes) {
  console.log(`  ${outcome.id}: ${outcome.status}${outcome.detail ? ` (${outcome.detail})` : ''}`);
}
console.log('');
console.log('事件流回放摘要：');
console.log(`  事件类型序列：${result.eventTypes.join(' -> ')}`);
console.log(`  产出 artifact 类型：${Object.keys(result.replay.artifacts).join(', ')}`);
console.log(`  确认记录：${Object.keys(result.replay.confirmations).length} 条`);
console.log(`  RevisionEvent 记录：${result.replay.revisionEventIds.length} 条`);
console.log(`  场景完成：${result.replay.completed}`);
```

- [ ] **Step 5: 更新 `packages/core/src/index.ts`**（追加一行）

```ts
export * from './acceptance/run-s3-demo.js';
```

- [ ] **Step 6: 确认测试通过**

```bash
pnpm test -- packages/core
```

Expected：新增 1 例全绿（累计 59 例）。

- [ ] **Step 7: 手动跑一遍 CLI 脚本，人工核对产物**

```bash
pnpm --filter @courtwork/core demo:s3
```

Expected：控制台打印产物路径与逐条指令结果（6 条 `applied`/`applied_fuzzy` + 1 条 `instr-risk-07: locator_not_found`）；打开打印路径下的 `redline.docx`（Word 或 WPS）应能看到带修订痕迹/批注的文档。

- [ ] **Step 8: 提交**

```bash
git add packages/core/src/acceptance packages/core/scripts packages/core/src/index.ts
git commit -m "$(cat <<'EOF'
feat(core): S3 end-to-end acceptance flow (CLI script + integration test)

runS3Demo 是 CLI 脚本与集成测试共用的唯一实现：加载 registry 的
真实 S3.yaml → runScenario（party-verify 走 demo-fixture 适配器，
B 级信源记入证据台账）→ 在 RiskList 确认门禁处落盘暂停 → 用全新
依赖实例模拟另一进程 resumeScenario（confirm + 一条真实
RevisionEvent 修正）→ 编译确认后的 RiskList 为 RevisionInstructionSet
（过 D4 门禁）→ 调 output.applyRevisionInstructionSet 用 output 包
自带 sample docx 产出带修订痕迹与批注的 docx → 全新 EventLog 实例
重读磁盘上的完整事件历史并 replaySession。

7 条指令里 6 条（clause 级）定位成功，1 条（risk-07，依据锚点在
demo-data 卷宗文件、不在 output 的 stand-in docx 里）报
locator_not_found 后被跳过——这是"报错并跳过，不错插"纪律的真实
展示，测试显式断言这一结果，不是放过一个失败案例。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: 收尾——SPEC.md 状态区/验收记录、跨层 TODO、干净环境全量复核

**Files:**
- Modify: `packages/core/SPEC.md`
- Modify: `packages/schemas/SPEC.md`

- [ ] **Step 1: 干净环境复核（不采信任何中途跑分结论）**

```bash
find . -name node_modules -type d -prune -exec rm -rf {} +
pnpm install
pnpm test -- packages/
pnpm lint
pnpm --filter '!@courtwork/eval' -r run build
```

Expected：`packages/` 定向测试口径为此前各包累计（schemas 178 + registry 93（86+7 的 W2.1 增量）+ tools 66 + demo-data 15 + output 196... 注意：这四个数字里 tools/demo-data/output 已含各自既有累计，实际总数以命令真实输出为准，不预先断言精确总和）+ core 59 例，全绿；`lint` 无 error；6 个非 eval workspace 包（含新增的 core）`build` 全部通过。

- [ ] **Step 2: 更新 `packages/core/SPEC.md`**——在文件末尾追加验收记录，并把状态区第 3 行从"未开工（依赖 W1/W2/W4/W5）"改为"已完成"

```markdown
状态：已完成
```

在文件末尾追加：

```markdown

## 验收记录

- 2026-07-10：W6 完成。W2.1 微工单（registry YAML 声明加载 strict 化）先行独立提交，随后交付 packages/core：
  - **D1 Provider 抽象**（`src/provider/`）：判断点 1（用户确认）——pi-mono 借形不借库，license 未核实且据 docs/24 通用 agent loop 的核心能力（模型自主选工具）本就用不上，自研 Provider 接口只借鉴其极简协议化设计形状。`ScriptedProvider` 是测试/演示用的录制回放实现。CLAUDE.md 技术基线已同步更正（独立 commit，先于本层交付）。
  - **D2 场景执行器**（`src/scenario-executor/`）：`runScenario`/`resumeScenario`，数据驱动、不含任何场景特判——`outputArtifacts` 声明顺序即产出顺序（判断点 2，已同步补注 `packages/registry/SPEC.md` 契约语义），`toolIds` 全部前置一次性执行。用 S3（单产出单门禁）与 S1 真实连线（三产出两门禁）两种形状验证泛化性，非只服务单一场景。
  - **D3 事件协议**（`src/events/`、`src/session/`）：`SessionEvent` 判别联合 + 落盘事件日志（`createFileEventLog`）+ 纯函数 `replaySession`。异步确认预留：`ConfirmationActor` 渠道无关身份标识，`PendingConfirmation` 打包续行所需的一切并落盘（`ConfirmationStore`），`resumeScenario` 用全新构造的依赖实例（模拟另一进程）验证过能正确接续，不依赖内存闭包。session 续行/会话链预留：本层不实现续行本身，`sessionId` 贯穿事件与确认记录，未来接 `chainId`/`predecessorSessionId` 不需要改动现有协议形状。
  - **D4 信源等级传播与门禁**（`src/evidence/`）：判断点 3（用户确认，追加"事件流携带等级投影"要求）——`EvidenceLedger` 通用台账 + `assertCitationAdmissible` 门禁函数，等级判定（sourceId→grade）在装配点声明，通用机制不认识任何具体工具/场景。`artifact_produced` 事件携带 `evidenceGrades` 投影，W9 渲染信源角标不需要改 schemas。`packages/schemas/SPEC.md` 已留 TODO：若未来需要跨 session 持久角标，可能需要给 `RiskBasis`/`Citation` 加字段，非本层实现。
  - **D5 RevisionEvent 落盘**（`src/revision/`）：`RevisionEventStore` 追加写 JSONL，永不改写既有行；`resumeScenario` 确认时若携带 `revisions[]`，构造并校验为合规 `RevisionEvent` 后落盘，并用 `applyJsonPointer` 真实应用回已产出 artifact。
  - **D6 装配点**（`src/composition/`）：`demo-assembly.ts` 是全仓库唯一 import `@courtwork/demo-data` 的运行时文件，`projectPartyRecord` 是 `packages/tools` 测试里"提前演示装配点长什么样"投影函数的生产标准正式落地。`compile-risk-list-to-revisions.ts` 是验收脚本自己的领域编译逻辑（docs/40 S5 先例：编译逻辑不进 core 通用层），过 D4 门禁。
  - **防呆三原则透传**（docs/09 调研 + docs/30 拍板，2026-07-09 补充判断点）：事件协议已支持①（`risk.level` + `evidenceGrades` 供未来 UI 做分层门禁）、②（RiskList 的 `description`/`basis` 字段结构已区隔生成解释与确定性引用）、③（`ConfirmationInstrumentation` 透传确认质量埋点，core 只记录不解读/不告警）——均为协议层预留，不实现 UI 交互本身。
  - **验收**：`src/acceptance/run-s3-demo.ts` 是 CLI 脚本（`pnpm --filter @courtwork/core demo:s3`）与集成测试共用的唯一实现。全流程：`CaseFile` → `party-verify`（demo-fixture 适配器，B 级信源记入证据台账）→ `RiskList`（7 个风险点，含真实工具调用来源的一条）→ 落盘暂停 → 全新依赖实例模拟另一进程 `resumeScenario`（确认 + 一条真实 `RevisionEvent`）→ 编译为 `RevisionInstructionSet` → 调 `output.applyRevisionInstructionSet`（复用 `packages/output` 自带 sample docx）产出带修订与批注的 docx → 全新 `EventLog` 实例重读磁盘完整历史并 `replaySession`。7 条指令 6 条定位成功、1 条（依据锚点不在 stand-in docx 里）报 `locator_not_found` 后跳过——测试显式断言这一结果，是"报错并跳过、不错插"纪律的真实展示。
  - 设计取舍：（执行阶段如有偏离本计划的现场判断，在此如实补记，不改写以上已完成部分的描述）
  - 跨层动作：`packages/registry/SPEC.md`"场景定义 schema"一节已补注执行语义（判断点 2，独立 commit，先于本层交付）；`packages/schemas/SPEC.md` TODO 区已记录信源等级角标持久化的未来可能性（本次一并追加，见 Step 3）。

## TODO（跨层放入区）

- 无新增遗留——`packages/core/SPEC.md` 原有的两条协议预留（异步确认、session 续行与会话链）均已在事件协议设计中兑现为"协议不堵死"，未实现的部分（真实网关适配器、一键续行按钮、跨 session 结构化再水化）明确留给 W9 及之后。
```

- [ ] **Step 3: 在 `packages/schemas/SPEC.md` 的 TODO 区追加一条**（找到 `## TODO（跨层放入区）` 小节，追加）

```markdown
- [观察，非缺陷，2026-07-10 W6 core 会话记录] 信源等级（A/B/C，docs/20）当前不是 `RiskBasis`/`Citation` 的字段——等级判定与传播走 `packages/core` 自己的事件流协议（`artifact_produced` 事件携带的 `evidenceGrades` 投影），不落进 schemas 定义的 artifact 本体（判断点 3，架构已确认此方案，理由见 `packages/core/SPEC.md` 验收记录）。若未来 W9 需要跨 session 持久化的信源等级角标（当前会话内的事件流回放已够用，跨 session 尚不确定是否需要），可能需要给 `RiskBasis`/`Citation` 加可选的 `evidenceGrade` 字段——按 docs/20"嵌入形状归 schemas、映射归 core"的既有原则，这类字段需要走 schemas 提案与架构拍板，不在本层预先加。
```

- [ ] **Step 4: 提交**

```bash
git add packages/core/SPEC.md packages/schemas/SPEC.md
git commit -m "$(cat <<'EOF'
docs(core): W6 验收记录 + SPEC 状态区收尾

packages/core/SPEC.md 状态区改为已完成，追加完整验收记录（六项
交付、三个判断点的最终落地方式、防呆三原则的协议层透传、验收流程
的实测结果）。packages/schemas/SPEC.md TODO 区记录信源等级角标
未来若需跨 session 持久化的可能路径——非本层实现，供架构拍板参考。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes（写计划时的自查记录）

- **Spec 覆盖**：六项交付（D1–D6）分别对应 Task 2（D1）/Task 10–13（D2）/Task 4+5+6（D3 的事件协议+确认存储部分）/Task 3+15（D4）/Task 7+12（D5）/Task 14（D6）；W2.1 微工单已在本文件之外独立完成（先于本计划开工，见 git 历史 `21c4492`）；CLAUDE.md 与 registry/SPEC.md 的两处文档修正同样已独立完成（`6cc21bc`/`3814cc9`）；验收标准对应 Task 16；docs/09+docs/30 防呆三原则对应 Task 4 的 `ConfirmationInstrumentation` 字段。
- **占位符扫描**：全文没有 TBD/TODO 字样的未完成代码块；"若某条断言失败，定位并修复"（Task 13 Step 3）不是占位符而是诚实标注"这一步的产出取决于 Task 10 实现是否已经写对"，属于泛化验证任务的正常表述，不是跳过实现细节。
- **类型一致性**：`ScenarioExecutorDeps`/`PendingConfirmation`/`EvidenceGradeAnnotation`/`ConfirmationActor`/`ScenarioResumeInput` 等跨任务复用的类型在 Task 4–13 之间字段名保持一致（`evidenceLedgerSnapshot`、`toolResults`、`producedArtifacts`、`remainingArtifactTypes` 等字段名从首次出现到最后一次使用未漂移）；`Task 5`（工具注册表）与 `Task 8` 的重复编号问题已发现并修正（原稿因追加顺序导致编号冲突，已重新核对 File Structure 与全部"累计 N 例"计数至一致：14→18→23→28→32→34→37→41→45→47→51→53→58→59）。

