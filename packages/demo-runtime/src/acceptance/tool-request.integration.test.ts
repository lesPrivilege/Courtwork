/**
 * TOOL-READ-1 裁定五 · E2E 樁消费场景（demo/acceptance 族）。
 *
 * 走**整条真链**：包准入 → registries 装配 → 真 executor → 真工具契约 → 真材料链。
 * 脚本 provider 只提供「模型这一轮说了什么」，其余每一环都是生产件。
 */
import { describe, expect, it } from 'vitest';
import {
  admitPackages,
  buildPackageRegistries,
  PackageScenarioSchema,
  PromptSegmentSchema,
  type VerticalPackageManifest,
} from '@courtwork/registry';
import { createToolExecutor } from '@courtwork/tools';
import {
  createEventLog,
  createEvidenceLedger,
  createInMemoryConfirmationStore,
  createInMemoryRevisionEventStore,
  createMemoryTurnStore,
  createTurnRunner,
  runScenario,
  type MaterialInput,
  type ScenarioExecutorDeps,
} from '@courtwork/core';
import { createScriptedProvider } from '@courtwork/provider/scripted';
import type { GenerationResponse } from '@courtwork/provider/types';
import { buildRequestableToolRegistry, loadDemoS3Materials } from '../composition/demo-assembly.js';

// R2 架构裁定四：不复用/新增 zod 直接依赖——复用 demo-runtime 已有直接依赖 @courtwork/registry
// 导出的 PromptSegmentSchema（registry 提供真实 ZodType 身份），只挑出同名 summary 字段。
const NOTE_SCHEMA = PromptSegmentSchema
  .extend({ summary: PromptSegmentSchema.shape.body })
  .pick({ summary: true });
const STEP_ID = 'produce-toolstake.ToolNote';

/** 樁包：只为消费本通道而存在，随 demo/acceptance 族走，不进任何生产垂类包。 */
function stakePackage(): VerticalPackageManifest {
  return {
    abiVersion: 1,
    identity: { packageId: 'toolstake', version: '1.0.0', schemaVersion: 1 },
    artifacts: [{
      typeId: 'toolstake.ToolNote',
      title: '工具请求樁产出',
      schemaId: 'toolstake.ToolNote',
      rehydrationProjection: { ops: [{ kind: 'field', path: '/summary', label: '摘要' }], rowBudget: 1 },
      uiTemplateId: 'toolstake.panel',
    }],
    scenarios: [PackageScenarioSchema.parse({
      id: 'toolstake.T1',
      name: '工具请求樁场景',
      trigger: { userActions: ['tool-request-stake'] },
      inputArtifacts: [],
      toolIds: [],
      requestableToolIds: ['dossier-list', 'material-read'],
      outputArtifacts: ['toolstake.ToolNote'],
      uiTemplateId: 'toolstake.panel',
      confirmationPolicy: { mode: 'none' },
      promptSegmentRef: 'toolstake.body',
      steps: [{ id: STEP_ID, title: '产出樁摘要', artifact: 'toolstake.ToolNote' }],
    })],
    promptSegments: [{ id: 'toolstake.body', body: '先看清单，再读需要的那一件，然后交货。' }],
    renderers: [{ uiTemplateId: 'toolstake.panel', kind: 'workspace', title: '樁面板' }],
    vocabulary: { 'container.noun': '工作区', 'stage.noun': '阶段', 'material.noun': '资料' },
    bindings: { schemas: new Map([['toolstake.ToolNote', NOTE_SCHEMA]]) },
  } as unknown as VerticalPackageManifest;
}

function request(toolId: string, input?: unknown): GenerationResponse {
  return {
    content: JSON.stringify({
      target: { stepId: STEP_ID, artifactType: 'toolstake.ToolNote' },
      request_tool: { toolId, ...(input !== undefined ? { input } : {}) },
    }),
  };
}

function deliver(summary: string): GenerationResponse {
  return { content: JSON.stringify({ target: { stepId: STEP_ID, artifactType: 'toolstake.ToolNote' }, artifact: { summary } }) };
}

function buildDeps(script: GenerationResponse[], materials: MaterialInput[], requests: string[]): ScenarioExecutorDeps {
  const registries = (() => {
    const admission = admitPackages([stakePackage()]);
    if (admission.rejected.length > 0) {
      throw new Error(`樁包未通过 ABI 准入：${admission.rejected.map((r) => r.issues.join('；')).join('\n')}`);
    }
    return buildPackageRegistries(admission.admitted);
  })();
  const inner = createTurnRunner(createScriptedProvider('demo-scripted-provider', 'fake-scripted-v1', script), createMemoryTurnStore());
  return {
    tools: buildRequestableToolRegistry(materials),
    toolExecutor: createToolExecutor(),
    turnRunner: {
      async run(input) {
        requests.push(input.request.messages.map((m) => m.content).join('\n'));
        return inner.run(input);
      },
    },
    eventLog: createEventLog('tool-request-stake', () => '2026-08-11T00:00:00.000Z'),
    confirmationStore: createInMemoryConfirmationStore(),
    revisionStore: createInMemoryRevisionEventStore(),
    ledger: createEvidenceLedger(),
    artifacts: registries.artifactSchemas,
    projections: registries.projections,
  };
}

function stakeScenario() {
  const admission = admitPackages([stakePackage()]);
  const scenario = buildPackageRegistries(admission.admitted).scenarios.get('toolstake.T1');
  if (!scenario) throw new Error('樁场景未装配');
  return scenario;
}

describe('TOOL-READ-1 E2E 樁：模型请求只读工具 → 系统执行 → 结果回喂 → 交货', () => {
  it('清单 → 读正文 → 交货：两轮请求全程真链，账本逐条可回放', async () => {
    const materials = await loadDemoS3Materials();
    const primary = materials[0].fileId;
    const requests: string[] = [];
    const deps = buildDeps(
      [request('dossier-list', {}), request('material-read', { materialId: primary }), deliver('已读主材料')],
      materials,
      requests,
    );

    const result = await runScenario(stakeScenario(), { inputArtifacts: {}, toolInputs: {} }, deps);
    expect(result.status).toBe('completed');

    const events = deps.eventLog.list();
    expect(events.map((e) => e.type)).toEqual([
      'turn_linked', 'model_tool_result',
      'turn_linked', 'model_tool_result',
      'turn_linked', 'artifact_produced', 'todo_snapshot', 'scenario_completed',
    ]);
    expect(events[1]).toMatchObject({ type: 'model_tool_result', round: 1, toolId: 'dossier-list', verified: true });
    expect(events[3]).toMatchObject({ type: 'model_tool_result', round: 2, toolId: 'material-read', verified: true });

    // 第一轮请求前模型看不到任何材料清单；两轮之后正文进了 prompt。
    expect(requests[0]).not.toContain(primary);
    expect(requests[1]).toContain(primary);
    expect(requests[2]).toContain('readingMarkdown');
  });

  it('闭集外工具被点名：不执行、不入账本——它只是一段普通不可信文本', async () => {
    const materials = await loadDemoS3Materials();
    const requests: string[] = [];
    const deps = buildDeps([request('party-verify', { name: '任意主体' })], materials, requests);
    await expect(runScenario(stakeScenario(), { inputArtifacts: {}, toolInputs: {} }, deps)).rejects.toThrow();
    expect(deps.eventLog.list().some((e) => e.type === 'model_tool_result')).toBe(false);
  });

  it('读不存在的材料：blocked 原样透出为工具失败并回喂，场景不因此中断', async () => {
    const materials = await loadDemoS3Materials();
    const requests: string[] = [];
    const deps = buildDeps(
      [request('material-read', { materialId: '不存在的材料.docx' }), deliver('目标材料当前不可读')],
      materials,
      requests,
    );
    const result = await runScenario(stakeScenario(), { inputArtifacts: {}, toolInputs: {} }, deps);
    expect(result.status).toBe('completed');

    const entry = deps.eventLog.list().find((e) => e.type === 'model_tool_result');
    expect(entry).toMatchObject({ type: 'model_tool_result', toolId: 'material-read', verified: false });
    if (entry?.type === 'model_tool_result') expect(entry.content).toContain('not_found');
    // 拒因进了下一轮 prompt：模型知道自己没读到，而不是以为读到了空文件。
    expect(requests[1]).toContain('not_found');
  });
});
