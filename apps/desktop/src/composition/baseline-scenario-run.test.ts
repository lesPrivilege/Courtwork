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

function harness(options: { packBinding: readonly string[]; batchItems: unknown }) {
  const runtime = createDesktopPackageRuntime();
  const hooks = installWorkTestHooks();
  hooks.setTurnStub(({ turnId, providerRequestId }): PersistedTurn => ({
    status: 'completed',
    turnId,
    providerRequestId,
    providerId: 'test-provider',
    modelId: 'test-model',
    reasoning: { status: 'absent' },
    assistantMessage: JSON.stringify({
      target: { stepId: 'produce-batch-report', artifactType: 'generic.BatchReport' },
      artifact: { items: options.batchItems },
    }),
    finishReason: 'stop',
    completedAt: '2026-08-11T00:00:00.000Z',
  }));
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
  return { runtime, command, host, hooks };
}

describe('受信组合根：production 可启动场景闭集', () => {
  it('闭集＝垂类三枚 ∪ 基线两枚；基线子集单独在册（供续行侧的垂类判据取用）', () => {
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
