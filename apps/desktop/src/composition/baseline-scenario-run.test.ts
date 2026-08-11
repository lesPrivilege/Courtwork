/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { createInMemoryWorkStateHost, readWorkStateEnvelope, type PersistedTurn, type SessionEvent } from '@courtwork/core';
import type { StoredMaterial } from '../material/material-ref';
import type { ResolveResult } from '../material/material-store';
import type { WorkModelRoute } from '../protocol/client';
import { createDesktopPackageRuntime } from './package-runtime.js';
import { createCaseRegistriesResolver } from './matter-registries.js';
import { createDesktopWorkCommand, installWorkTestHooks } from '../work/work-runtime.js';
import { scopeRegistriesForRun } from './baseline-session-scope.js';
import {
  BASELINE_DECLARED_SCENARIO_IDS,
  BASELINE_SCENARIO_IDS,
  PRODUCTION_LAUNCHABLE_SCENARIO_IDS,
  VERTICAL_PRODUCTION_SCENARIO_IDS,
} from './production-scenarios.js';

/**
 * ADR-023 决定五验收律的机器形态：**零垂类绑定 matter 上，基线场景可启动、产物可落账**。
 *
 * 这是本票要消灭的结构性缺口——此前 production 命令端口的可启动闭集只有 legal 三枚，
 * 零绑定 matter 点什么都不会发生。闭集立在**受信组合根**（`composition/production-scenarios.ts`），
 * 端口只问「在不在闭集内」，不认识任何 id 语义。
 */

const MODEL_ROUTE: WorkModelRoute = { providerId: 'test-provider', modelId: 'test-model', reasoning: 'standard' };

function material(materialId: string, fileName: string): StoredMaterial {
  return {
    materialId,
    caseId: 'case-x',
    fileName,
    mediaType: 'text/markdown',
    byteLength: 32,
    contentSha256: `sha-${materialId}`,
    readingViewVersion: 'reading-view-material@1',
    readingViewSha256: `view-${materialId}`,
    status: 'ready',
    readingMarkdown: `# ${fileName}\n\n本文列了三条待办。`,
    blocks: [{ blockId: '0', page: 1, text: '本文列了三条待办。', rangeBase: 0, textLayerVersion: 'v1' }],
  };
}

const MATERIALS = [material('mat-1', '周会纪要.md'), material('mat-2', '进度说明.md')];

function harness(options: { packBinding: readonly string[]; batchItems?: unknown; assistant?: unknown }) {
  const runtime = createDesktopPackageRuntime();
  const hooks = installWorkTestHooks();
  /** 樁看见的模型请求：`startParams` 是否真的进了 task 段，只能由这一面作证。 */
  const requests: unknown[] = [];
  hooks.setTurnStub(({ turnId, providerRequestId, request }): PersistedTurn => {
    requests.push(request);
    return {
      status: 'completed',
      turnId,
      providerRequestId,
      providerId: 'test-provider',
      modelId: 'test-model',
      reasoning: { status: 'absent' },
      assistantMessage: JSON.stringify(options.assistant ?? {
        target: { stepId: 'produce-batch-report', artifactType: 'generic.BatchReport' },
        artifact: { items: options.batchItems ?? [] },
      }),
      finishReason: 'stop',
      completedAt: '2026-08-11T00:00:00.000Z',
    };
  });
  const byId = new Map(MATERIALS.map((item) => [item.materialId, item] as const));
  const host = createInMemoryWorkStateHost();
  const command = createDesktopWorkCommand({
    registries: runtime.packageRegistries,
    registriesForCase: createCaseRegistriesResolver({
      readCases: () => [{ id: 'case-x', packBinding: options.packBinding }],
      availablePackageIds: runtime.packageIds,
      registriesFor: runtime.registriesFor,
    }),
    materialResolver: {
      resolveForProvider(_caseId: string, materialId: string): Promise<ResolveResult> {
        const found = byId.get(materialId);
        return Promise.resolve(found ? { status: 'ready', material: found } : { status: 'blocked', reason: 'not_found' });
      },
    },
    packageIdentities: runtime.packageIdentities,
    launchableScenarioIds: PRODUCTION_LAUNCHABLE_SCENARIO_IDS,
    verticalScenarioIds: VERTICAL_PRODUCTION_SCENARIO_IDS,
    scopeRegistriesForRun,
    loadRuntimeLimits: () => ({}),
    host,
  });
  return { runtime, command, host, hooks, requests };
}

describe('受信组合根：production 可启动场景闭集', () => {
  /**
   * 票面 §六 二批裁定三：通用预检值槽 `startParams` 落地后，临时排除解除——
   * 原「排除断言」在此**翻转为在场断言**（反向红证）。声明面与可启动面自此逐字相等。
   */
  it('基线声明面两枚，当期可启动面同为两枚——临时排除已随预检值通道解除', () => {
    expect([...BASELINE_DECLARED_SCENARIO_IDS]).toEqual(['generic.draft', 'generic.batch']);
    expect([...BASELINE_SCENARIO_IDS]).toEqual(['generic.draft', 'generic.batch']);
    expect([...PRODUCTION_LAUNCHABLE_SCENARIO_IDS]).toEqual([
      'legal.S1', 'legal.S2', 'legal.S3', 'generic.draft', 'generic.batch',
    ]);
  });
});

describe('零垂类绑定 matter 上的 generic.batch 全链', () => {
  it('跑通到 completed，账本头记 generic.batch 且包身份是 generic（不被顶名 legal）', async () => {
    const { command, host } = harness({
      packBinding: [],
      batchItems: [
        { materialId: 'mat-1', summary: '本文列了三条待办。', status: 'summarized' },
        { materialId: 'mat-2', summary: '进度已到七成。', status: 'summarized' },
      ],
    });
    const events: SessionEvent[] = [];
    const { sessionId, done } = command.start(
      { commandId: 'c1', caseId: 'case-x', scenarioId: 'generic.batch', materialRefs: ['mat-1', 'mat-2'], modelRoute: MODEL_ROUTE },
      (event) => events.push(event),
    );
    const outcome = await done;
    expect(outcome.status).toBe('completed');
    expect(events.some((e) => e.type === 'artifact_produced' && e.artifactType === 'generic.BatchReport')).toBe(true);
    expect(events.some((e) => e.type === 'scenario_completed')).toBe(true);

    const read = await host.read({ caseId: 'case-x', sessionId });
    if (!read.found) throw new Error('unreachable');
    const envelope = readWorkStateEnvelope(read.bytes);
    expect(envelope.scenarioId).toBe('generic.batch');
    expect(envelope.packageId).toBe('generic');
  });

  it('模型漏行 → 账本里补出显式 missing 行（系统裁决，不由模型自证）', async () => {
    const { command } = harness({
      packBinding: [],
      batchItems: [{ materialId: 'mat-1', summary: '本文列了三条待办。', status: 'summarized' }],
    });
    const events: SessionEvent[] = [];
    const outcome = await command.start(
      { commandId: 'c2', caseId: 'case-x', scenarioId: 'generic.batch', materialRefs: ['mat-1', 'mat-2'], modelRoute: MODEL_ROUTE },
      (event) => events.push(event),
    ).done;
    expect(outcome.status).toBe('completed');
    const produced = events.find((e) => e.type === 'artifact_produced' && e.artifactType === 'generic.BatchReport');
    expect((produced as { artifact: { items: unknown[] } }).artifact.items).toEqual([
      { materialId: 'mat-1', summary: '本文列了三条待办。', status: 'summarized' },
      { materialId: 'mat-2', summary: '', status: 'missing' },
    ]);
  });

  it('模型编造闭集外 materialId → 整面拒（step_failed，产物零落账）', async () => {
    const { command } = harness({
      packBinding: [],
      batchItems: [{ materialId: 'mat-9', summary: '编造的地址', status: 'summarized' }],
    });
    const events: SessionEvent[] = [];
    const outcome = await command.start(
      { commandId: 'c3', caseId: 'case-x', scenarioId: 'generic.batch', materialRefs: ['mat-1', 'mat-2'], modelRoute: MODEL_ROUTE },
      (event) => events.push(event),
    ).done;
    expect(outcome.status).not.toBe('completed');
    expect(events.some((e) => e.type === 'artifact_produced')).toBe(false);
  });

  it('绑定垂类的 matter 上基线场景照样可启动（基线是地，不与绑定互斥）', async () => {
    const { command } = harness({
      packBinding: ['legal'],
      batchItems: [
        { materialId: 'mat-1', summary: 'a', status: 'summarized' },
        { materialId: 'mat-2', summary: 'b', status: 'summarized' },
      ],
    });
    const outcome = await command.start(
      { commandId: 'c4', caseId: 'case-x', scenarioId: 'generic.batch', materialRefs: ['mat-1', 'mat-2'], modelRoute: MODEL_ROUTE },
      () => {},
    ).done;
    expect(outcome.status).toBe('completed');
  });

  it('垂类 fail-closed 零削弱：零绑定 matter 起 legal.S2 仍 rejected/invalid_scope', async () => {
    const { command } = harness({ packBinding: [], batchItems: [] });
    const outcome = await command.start(
      { commandId: 'c5', caseId: 'case-x', scenarioId: 'legal.S2', materialRefs: ['mat-1'], modelRoute: MODEL_ROUTE },
      () => {},
    ).done;
    expect(outcome).toMatchObject({ status: 'rejected', reason: 'invalid_scope' });
  });

  it('闭集外场景仍显式拒绝（legal.S6 不在可启动闭集内）', async () => {
    const { command } = harness({ packBinding: ['legal'], batchItems: [] });
    const outcome = await command.start(
      { commandId: 'c6', caseId: 'case-x', scenarioId: 'legal.S6', materialRefs: ['mat-1'], modelRoute: MODEL_ROUTE },
      () => {},
    ).done;
    expect(outcome).toMatchObject({ status: 'rejected', reason: 'invalid_scope' });
  });
});

/**
 * 票面 §六 二批裁定一：通用预检值槽 `startParams`。三条语义边界各带用例——
 * ①提交值随 task 段进请求（用户填格进请求，模型只读不改址）；②fieldId 越集在 effect 之前
 * fail-closed 拒；③缺省空对象不进请求（不给模型一个恒空字段去解读，也不动既有场景的请求字节）。
 */
describe('startParams · 通用预检值槽', () => {
  const DRAFT_ARTIFACT = {
    target: { stepId: 'produce-draft', artifactType: 'generic.DraftDocument' },
    artifact: { title: '季度工作说明', paragraphs: ['进度已到七成。', '下一步先补齐验收口径。'] },
  };

  it('提交值随 task 段进请求，且 generic.draft 全链产出 DraftDocument', async () => {
    const { command, requests } = harness({ packBinding: [], assistant: DRAFT_ARTIFACT });
    const events: SessionEvent[] = [];
    const outcome = await command.start(
      {
        commandId: 'd1', caseId: 'case-x', scenarioId: 'generic.draft',
        materialRefs: ['mat-1'], modelRoute: MODEL_ROUTE,
        startParams: { requirement: '写一份三段的季度工作说明' },
      },
      (event) => events.push(event),
    ).done;
    expect(outcome.status).toBe('completed');
    expect(events.some((e) => e.type === 'artifact_produced' && e.artifactType === 'generic.DraftDocument')).toBe(true);
    expect(JSON.stringify(requests)).toContain('写一份三段的季度工作说明');
    expect(JSON.stringify(requests)).toContain('startParams');
  });

  it('独立验收探针：调用方后改 startParams 不得改写已起跑命令的冻结快照', async () => {
    const { command, requests } = harness({ packBinding: [], assistant: DRAFT_ARTIFACT });
    const startParams = { requirement: '冻结前的起草要求' };
    const pending = command.start(
      {
        commandId: 'd-freeze', caseId: 'case-x', scenarioId: 'generic.draft',
        materialRefs: ['mat-1'], modelRoute: MODEL_ROUTE, startParams,
      },
      () => {},
    ).done;
    startParams.requirement = '调用方事后篡改';
    expect((await pending).status).toBe('completed');
    expect(JSON.stringify(requests)).toContain('冻结前的起草要求');
    expect(JSON.stringify(requests)).not.toContain('调用方事后篡改');
  });

  it('fieldId 越出该场景声明的 formFields id 集 → effect 前 fail-closed 拒（零 turn、零事件）', async () => {
    const { command, requests } = harness({ packBinding: [], assistant: DRAFT_ARTIFACT });
    const events: SessionEvent[] = [];
    const outcome = await command.start(
      {
        commandId: 'd2', caseId: 'case-x', scenarioId: 'generic.draft',
        materialRefs: ['mat-1'], modelRoute: MODEL_ROUTE,
        startParams: { requirement: '正常值', smuggled: '越集字段' },
      },
      (event) => events.push(event),
    ).done;
    expect(outcome).toMatchObject({ status: 'rejected', reason: 'invalid_scope' });
    expect(requests).toEqual([]);
    expect(events).toEqual([]);
  });

  it('无 formFields 的场景收到任何提交值即越集拒（generic.batch 是无预检直启）', async () => {
    const { command, requests } = harness({ packBinding: [], assistant: DRAFT_ARTIFACT });
    const outcome = await command.start(
      {
        commandId: 'd3', caseId: 'case-x', scenarioId: 'generic.batch',
        materialRefs: ['mat-1'], modelRoute: MODEL_ROUTE,
        startParams: { requirement: '不该有的值' },
      },
      () => {},
    ).done;
    expect(outcome).toMatchObject({ status: 'rejected', reason: 'invalid_scope' });
    expect(requests).toEqual([]);
  });

  it('缺省空对象：不带 startParams 的场景请求里零 startParams 键', async () => {
    const { command, requests } = harness({
      packBinding: [],
      batchItems: [{ materialId: 'mat-1', summary: 'a', status: 'summarized' }, { materialId: 'mat-2', summary: 'b', status: 'summarized' }],
    });
    const outcome = await command.start(
      { commandId: 'd4', caseId: 'case-x', scenarioId: 'generic.batch', materialRefs: ['mat-1', 'mat-2'], modelRoute: MODEL_ROUTE },
      () => {},
    ).done;
    expect(outcome.status).toBe('completed');
    expect(JSON.stringify(requests)).not.toContain('startParams');
  });
});
