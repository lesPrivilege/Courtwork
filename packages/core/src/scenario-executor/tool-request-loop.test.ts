// TOOL-READ-1 裁定四/七/八/九 + 红证义务二/四：模型工具请求在 executor 里的整条 turn 间通道。
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import type { ArtifactSchemaRegistry, ScenarioRuntime } from '@courtwork/registry';
import type { ArtifactDescriptor, SideEffectClass } from '@courtwork/schemas';
import { createToolExecutor, defineTool } from '@courtwork/tools';
import { createEventLog } from '../events/event-log.js';
import { createEvidenceLedger } from '../evidence/grade.js';
import { createInMemoryConfirmationStore } from '../session/confirmation-store.js';
import { createInMemoryRevisionEventStore } from '../revision/revision-store.js';
import { createToolRegistry, type GradedToolBinding, type ToolRegistry } from '../tools/tool-registry.js';
import { createMemoryTurnStore } from '../turn/turn-store.js';
import { createTurnRunner, type TurnRunnerPort } from '../turn/turn-runner.js';
import { createScriptedProvider } from '@courtwork/provider/scripted';
import type { GenerationResponse } from '@courtwork/provider/types';
import { GenerationValidationError, runScenario, UnknownToolError, type ScenarioExecutorDeps } from './executor.js';
import {
  MODEL_TOOL_RESULT_MAX_BYTES,
  MODEL_TOOL_RESULT_TRUNCATION_MARK,
  REQUEST_TOOL_MAX_ROUNDS,
  RequestableToolPolicyError,
  TOOL_REQUEST_LIMIT_REASON,
} from './tool-request.js';

const NOTE_SCHEMA = z.object({ text: z.string().min(1) }).strict();
const DESCRIPTOR: ArtifactDescriptor = {
  typeId: 'test.Note',
  title: 'Note',
  schema: NOTE_SCHEMA,
  rehydrationProjection: { ops: [{ kind: 'field', path: '/text', label: '正文' }], rowBudget: 1 },
  uiTemplateId: 'test-panel',
};
const ARTIFACTS: ArtifactSchemaRegistry = {
  get: (typeId) => (typeId === 'test.Note' ? { descriptor: DESCRIPTOR, packageId: 'test' } : undefined),
  normalizeTypeId: (v) => (v === 'test.Note' ? v : undefined),
  list: () => [{ descriptor: DESCRIPTOR, packageId: 'test' }],
};

const STEP_ID = 'produce-test.Note';

function scenario(requestableToolIds?: string[]): ScenarioRuntime {
  return {
    id: 'test.ToolRequest',
    packageId: 'test',
    name: '工具请求樁场景',
    trigger: { fileTypes: [], userActions: ['start'], classifierTags: [] },
    inputArtifacts: [],
    toolIds: [],
    ...(requestableToolIds !== undefined ? { requestableToolIds } : {}),
    outputArtifacts: ['test.Note'],
    uiTemplateId: 'test-panel',
    confirmationPolicy: { mode: 'none' },
    promptBody: '正文',
    steps: [{ id: STEP_ID, title: '产出 Note', artifact: 'test.Note' }],
  };
}

function artifactEnvelope(text = 'ok'): string {
  return JSON.stringify({ target: { stepId: STEP_ID, artifactType: 'test.Note' }, artifact: { text } });
}

function requestEnvelope(toolId: string, input?: unknown): string {
  return JSON.stringify({
    target: { stepId: STEP_ID, artifactType: 'test.Note' },
    request_tool: { toolId, ...(input !== undefined ? { input } : {}) },
  });
}

/** 只读樁工具：回声入参，长度可控——用于观察回喂内容与截断边界。 */
function echoTool(payloadLength = 8) {
  return defineTool(
    {
      id: 'echo-read',
      inputSchema: z.object({ q: z.string().min(1) }).strict(),
      dataSchema: z.object({ echoed: z.string() }).strict(),
      timeoutMs: 1000,
    },
    { sourceId: 'stub', async run(input) { return { echoed: `${input.q}`.repeat(payloadLength) }; } },
  );
}

interface Harness {
  deps: ScenarioExecutorDeps;
  requests: string[];
  toolCalls: unknown[];
}

function buildHarness(options: {
  script: GenerationResponse[];
  tools?: ToolRegistry;
  payloadLength?: number;
  limits?: ScenarioExecutorDeps['limits'];
}): Harness {
  const requests: string[] = [];
  const toolCalls: unknown[] = [];
  const tools = options.tools ?? (() => {
    const registry = createToolRegistry();
    const base = echoTool(options.payloadLength ?? 8);
    registry.register('echo-read', {
      tool: { ...base, run: (input, ctx) => { toolCalls.push(input); return base.run(input, ctx); } },
      grade: 'B',
      sideEffect: 'pure_read',
    });
    return registry;
  })();

  const provider = createScriptedProvider('test-provider', 'fake-v1', options.script);
  const turnRunner: TurnRunnerPort = (() => {
    const inner = createTurnRunner(provider, createMemoryTurnStore());
    return {
      async run(input) {
        requests.push(input.request.messages.map((m) => m.content).join('\n'));
        return inner.run(input);
      },
    };
  })();

  return {
    requests,
    toolCalls,
    deps: {
      tools,
      toolExecutor: createToolExecutor(),
      turnRunner,
      eventLog: createEventLog('session-1', () => '2026-07-10T00:00:00.000Z'),
      confirmationStore: createInMemoryConfirmationStore(),
      revisionStore: createInMemoryRevisionEventStore(),
      ledger: createEvidenceLedger(),
      artifacts: ARTIFACTS,
      projections: { get: (typeId: string) => ARTIFACTS.get(typeId)?.descriptor.rehydrationProjection },
      ...(options.limits !== undefined ? { limits: options.limits } : {}),
    },
  };
}

async function run(harness: Harness, scenarioRuntime = scenario(['echo-read'])) {
  return runScenario(scenarioRuntime, { inputArtifacts: {}, toolInputs: {} }, harness.deps);
}

describe('request_tool 通道（TOOL-READ-1 裁定一/八）', () => {
  it('模型请求 → 本 turn 终结 → 系统执行只读工具 → 结果回喂下一 turn', async () => {
    const harness = buildHarness({
      script: [{ content: requestEnvelope('echo-read', { q: 'AB' }) }, { content: artifactEnvelope() }],
    });
    const result = await run(harness);

    expect(result.status).toBe('completed');
    // 两次 model 步：请求轮 + 产出轮。回合内不循环。
    expect(harness.requests).toHaveLength(2);
    expect(harness.toolCalls).toEqual([{ q: 'AB' }]);

    const events = harness.deps.eventLog.list();
    expect(events.map((e) => e.type)).toEqual([
      'turn_linked', 'model_tool_result', 'turn_linked', 'artifact_produced', 'todo_snapshot', 'scenario_completed',
    ]);
    expect(events[1]).toMatchObject({
      type: 'model_tool_result', stepId: STEP_ID, artifactType: 'test.Note',
      round: 1, toolId: 'echo-read', verified: true, truncated: false,
    });

    // 回喂：第二次请求的会话与语料段里带得到工具结果（裁定八，复用既有 toolResults 通道）。
    expect(harness.requests[0]).not.toContain('ABABAB');
    expect(harness.requests[1]).toContain('ABABAB');
  });

  it('模型请求所得等级进既有 EvidenceLedger 链（事实等级由系统判定，不因通道换而失守）', async () => {
    const harness = buildHarness({
      script: [{ content: requestEnvelope('echo-read', { q: 'A' }) }, { content: artifactEnvelope() }],
    });
    await run(harness);
    expect(harness.deps.ledger.get('echo-read')).toEqual({ grade: 'B', sourceId: 'stub', confirmed: false });
  });

  it('工具入参不合本工具 schema 时落失败结果回喂，不炸掉整个场景', async () => {
    const harness = buildHarness({
      script: [{ content: requestEnvelope('echo-read', { wrong: 1 }) }, { content: artifactEnvelope() }],
    });
    const result = await run(harness);
    expect(result.status).toBe('completed');
    const entry = harness.deps.eventLog.list().find((e) => e.type === 'model_tool_result');
    expect(entry).toMatchObject({ type: 'model_tool_result', verified: false });
    expect(harness.toolCalls).toEqual([]);
  });

  it('未声明白名单的场景：模型吐 request_tool 即在校验层拒收（通道不可发现）', async () => {
    const harness = buildHarness({ script: [{ content: requestEnvelope('echo-read', { q: 'A' }) }] });
    await expect(run(harness, scenario())).rejects.toBeInstanceOf(GenerationValidationError);
  });
});

describe('轮次上界（TOOL-READ-1 裁定四 · 红证义务四）', () => {
  it(`第 ${REQUEST_TOOL_MAX_ROUNDS + 1} 轮请求显式 step_failed 而非执行`, async () => {
    const harness = buildHarness({
      script: Array.from({ length: REQUEST_TOOL_MAX_ROUNDS + 1 }, () => ({ content: requestEnvelope('echo-read', { q: 'A' }) })),
    });
    await expect(run(harness)).rejects.toThrow(/工具请求超限/);

    // 上界内的 3 轮真执行；第 4 轮一次都不执行。
    expect(harness.toolCalls).toHaveLength(REQUEST_TOOL_MAX_ROUNDS);
    const events = harness.deps.eventLog.list();
    expect(events.filter((e) => e.type === 'model_tool_result')).toHaveLength(REQUEST_TOOL_MAX_ROUNDS);
    const failed = events.filter((e) => e.type === 'step_failed');
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ type: 'step_failed', scope: 'tool', toolId: 'echo-read', reason: TOOL_REQUEST_LIMIT_REASON });
  });

  it(`恰好 ${REQUEST_TOOL_MAX_ROUNDS} 轮请求后交货是允许的（上界不提前一轮收口）`, async () => {
    const harness = buildHarness({
      script: [
        ...Array.from({ length: REQUEST_TOOL_MAX_ROUNDS }, () => ({ content: requestEnvelope('echo-read', { q: 'A' }) })),
        { content: artifactEnvelope() },
      ],
    });
    expect((await run(harness)).status).toBe('completed');
    expect(harness.toolCalls).toHaveLength(REQUEST_TOOL_MAX_ROUNDS);
  });
});

describe('步骤闭集不扩（TOOL-READ-1 红证义务三 · 执行面）', () => {
  it('模型请求的执行落既有 deterministic_tool 步：走同一 ToolExecutor 端口并计入同一 maxToolCalls 预算', async () => {
    const harness = buildHarness({
      script: [
        { content: requestEnvelope('echo-read', { q: 'A' }) },
        { content: requestEnvelope('echo-read', { q: 'B' }) },
        { content: artifactEnvelope() },
      ],
      limits: { maxToolCalls: 1 },
    });
    const result = await run(harness);
    // 第二次请求撞既有工具调用上界——若另起第六种步、绕开 guard.checkToolCall，本断言必失守。
    expect(result).toMatchObject({ status: 'failed', reason: 'runtime_limit' });
    expect(harness.toolCalls).toHaveLength(1);
  });
});

describe('字节上界（TOOL-READ-1 裁定九 · R1-2 统一 UTF-8 字节）', () => {
  it('超上界尾部截断并附系统标记，标记同时进账本条目', async () => {
    const harness = buildHarness({
      script: [{ content: requestEnvelope('echo-read', { q: 'x'.repeat(1000) }) }, { content: artifactEnvelope() }],
      payloadLength: 40, // 40 * 1000 = 40000 字符 > 20000 字节上界
    });
    await run(harness);
    const entry = harness.deps.eventLog.list().find((e) => e.type === 'model_tool_result');
    expect(entry).toMatchObject({ type: 'model_tool_result', truncated: true });
    if (entry?.type === 'model_tool_result') {
      expect(entry.content.endsWith(MODEL_TOOL_RESULT_TRUNCATION_MARK)).toBe(true);
      // 「保留正文 + 标记」的 UTF-8 总字节数不得越过上界——string.length 口径在此必红。
      expect(new TextEncoder().encode(entry.content).byteLength).toBeLessThanOrEqual(MODEL_TOOL_RESULT_MAX_BYTES);
      expect(entry.content).not.toContain('\uFFFD');
    }
    // 回喂给下一 turn 的字节与账本同源：界面事件面就是账本本身。
    expect(harness.requests[1]).toContain(MODEL_TOOL_RESULT_TRUNCATION_MARK.trim());
  });

  it('账本 content 与下一轮 prompt 回喂逐字同源（裁定八/九）', async () => {
    const harness = buildHarness({
      script: [{ content: requestEnvelope('echo-read', { q: 'x'.repeat(1000) }) }, { content: artifactEnvelope() }],
      payloadLength: 40,
    });
    await run(harness);
    const entry = harness.deps.eventLog.list().find((e) => e.type === 'model_tool_result');
    expect(entry?.type === 'model_tool_result').toBe(true);
    if (entry?.type === 'model_tool_result') {
      expect(entry.truncated).toBe(true);
      // taskInstruction = JSON.stringify(task)，task.toolResults[key] 必须逐字等于账本 content；
      // 断言其 JSON 转义形态逐字在场——账本与回喂任一字节漂移都立即失守。
      expect(harness.requests[1]).toContain(JSON.stringify(entry.content).slice(1, -1));
    }
  });
});

describe('白名单准入与运行时双侧（TOOL-READ-1 红证义务二）', () => {
  it('准入侧：白名单含非 pure_read 工具时，一次 provider 调用都不发生', async () => {
    const tools = createToolRegistry();
    tools.register('echo-read', { tool: echoTool(), grade: 'B', sideEffect: 'file_write' });
    const harness = buildHarness({ script: [{ content: artifactEnvelope() }], tools });
    await expect(run(harness)).rejects.toBeInstanceOf(RequestableToolPolicyError);
    expect(harness.requests).toHaveLength(0);
  });

  it('准入侧：白名单点名未注册工具时，一次 provider 调用都不发生', async () => {
    const harness = buildHarness({ script: [{ content: artifactEnvelope() }] });
    await expect(run(harness, scenario(['nope']))).rejects.toBeInstanceOf(UnknownToolError);
    expect(harness.requests).toHaveLength(0);
  });

  it('运行时侧：准入后 binding 改成非 pure_read（TOCTOU），执行前仍再判一次', async () => {
    const base = echoTool();
    let sideEffect: SideEffectClass = 'pure_read';
    const flipping: ToolRegistry = {
      register() { throw new Error('本樁不接受注册'); },
      get(toolId): GradedToolBinding | undefined {
        if (toolId !== 'echo-read') return undefined;
        const binding: GradedToolBinding = { tool: base, grade: 'B', sideEffect };
        sideEffect = 'file_write'; // 准入读过之后翻面
        return binding;
      },
    };
    const harness = buildHarness({
      script: [{ content: requestEnvelope('echo-read', { q: 'A' }) }, { content: artifactEnvelope() }],
      tools: flipping,
    });
    await expect(run(harness)).rejects.toBeInstanceOf(RequestableToolPolicyError);
    // 准入放行了（provider 已调用一次），拦截发生在真执行之前。
    expect(harness.requests).toHaveLength(1);
  });
});
