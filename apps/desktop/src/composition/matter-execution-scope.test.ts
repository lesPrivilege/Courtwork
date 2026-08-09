import { describe, expect, it, vi } from 'vitest';
import {
  createArtifactEnvelopeCodec,
  createInMemoryWorkStateHost,
  type ConfirmationActor,
  type SessionEvent,
  type TurnRunnerPort,
  type WorkStateHostPort,
} from '@courtwork/core';
import type { TurnStore } from '@courtwork/core/turn-protocol';
import type { StoredMaterial } from '../material/material-ref';
import type { ResolveResult } from '../material/material-store';
import type { WorkModelRoute } from '../protocol/client';
import {
  LEGAL_S3_SCHEMA_VERSION,
  S2_SCENARIO_ID,
  buildArtifactVersioningSource,
} from '../work/legal-s3-binding';
import { createLegalWorkCommand } from '../work/work-command';
import { createDesktopPackageRuntime } from './package-runtime';
import { createCaseRegistriesResolver } from './matter-registries';

/**
 * PACK-INTERACT-1 2R · B：production execution seam 按 matter fail-closed。
 *
 * ADR-015 决定三（2026-08-08 补记）：matter 当前绑定是垂类执行授权的**唯一真源**；全局
 * registry 只供准入、目录与既有信封/产物解码。零绑定、只绑 `catalog-only` 包、未知/失效绑定
 * 的 matter 直调 `start` / `startWithPreflight` / `resume` / 垂类 review resolution，都必须在
 * provider、WorkState CAS、journal append 与确认 effect **之前**显式 `rejected/invalid_scope`。
 *
 * 授权面按 `caseId` 从 canonical case store 现读——调用方自报的 packageId/binding 一概不作数，
 * 故本谱一律经真实的 `createCaseRegistriesResolver`（与组合根同一条路径）构造依赖。
 */

const ACTOR: ConfirmationActor = { channelId: 'desktop', actorId: 'lawyer-1', role: '主办律师' };
const MODEL_ROUTE: WorkModelRoute = { providerId: 'test-provider', modelId: 'test-model', reasoning: 'standard' };

function storedMaterial(): StoredMaterial {
  return {
    materialId: 'mat-1',
    caseId: 'case-x',
    fileName: '设备买卖合同.docx',
    mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    byteLength: 24,
    contentSha256: 'sha-content',
    readingViewVersion: 'reading-view-material@1',
    readingViewSha256: 'sha-view',
    status: 'ready',
    readingMarkdown: '# 设备采购合同\n\n甲方应于三日内付款。',
    blocks: [{ blockId: '0', page: 1, text: '甲方应于三日内付款。', rangeBase: 0, textLayerVersion: 'v1' }],
  };
}

/** S2 单步 stub：产出最小合法 ReviewMatrix（正例用；拒绝例里它必须一次都不被调用）。 */
function matrixTurnRunner(onRun: () => void): (turnStore: TurnStore) => TurnRunnerPort {
  return (turnStore) => ({
    async run(input) {
      onRun();
      const turn = {
        status: 'completed' as const,
        turnId: input.turnId,
        providerRequestId: input.providerRequestId,
        providerId: 'test-provider',
        modelId: 'test-model',
        reasoning: { status: 'absent' as const },
        assistantMessage: JSON.stringify({
          target: { stepId: 'produce-review-matrix', artifactType: 'legal.ReviewMatrix' },
          artifact: { caseId: 'case-x', questions: [{ id: 'q1', text: '是否约定违约金上限' }], rows: [] },
        }),
        finishReason: 'stop' as const,
        completedAt: '2026-08-08T00:00:00.000Z',
      };
      turnStore.save(turn);
      return turn;
    },
  });
}

/**
 * 组装一枚与组合根同形的命令端口：授权面来自 canonical case store 的绑定记录，
 * 宿主写入（CAS）与 turn 调用逐次记账，用于「effect 恰为零」的直证。
 */
function harness(cases: Array<{ id: string; packBinding?: readonly string[] }>) {
  const runtime = createDesktopPackageRuntime();
  const inner = createInMemoryWorkStateHost();
  const writes: string[] = [];
  const reads: string[] = [];
  const turnRuns: string[] = [];
  const host: WorkStateHostPort = {
    read: (ref) => { reads.push(ref.sessionId); return inner.read(ref); },
    compareAndSwap: (cas) => { writes.push(cas.ref.sessionId); return inner.compareAndSwap(cas); },
  };
  const material = storedMaterial();
  const command = createLegalWorkCommand({
    host,
    registriesForCase: createCaseRegistriesResolver({
      readCases: () => cases,
      availablePackageIds: runtime.packageIds,
      registriesFor: runtime.registriesFor,
    }),
    codec: createArtifactEnvelopeCodec(
      buildArtifactVersioningSource(runtime.packageRegistries, { legal: LEGAL_S3_SCHEMA_VERSION }),
    ),
    actor: ACTOR,
    materialResolver: {
      resolveForProvider: (caseId: string, materialId: string): Promise<ResolveResult> => (
        caseId === material.caseId && materialId === material.materialId
          ? Promise.resolve({ status: 'ready' as const, material })
          : Promise.resolve({ status: 'blocked', reason: 'not_found' as const })
      ),
    },
    makeTurnRunner: matrixTurnRunner(() => turnRuns.push('run')),
    createRuntimeBudget: () => ({
      limits: {},
      costBasis: { currency: 'USD', assumptions: [] },
      consumed: { steps: 0, toolCalls: 0, executionMs: 0, estimatedUsd: 0, costCoverage: 'partial' },
    }),
    now: () => '2026-08-08T00:00:00.000Z',
    mintSessionId: (() => { let seq = 0; return () => `session-${++seq}`; })(),
  });
  return { command, writes, reads, turnRuns };
}

/** 四类未授权 matter：零绑定 / 只绑 catalog-only 包 / 未知包 / 案件根本不在账本里。 */
const UNAUTHORIZED: Array<[string, Array<{ id: string; packBinding?: readonly string[] }>]> = [
  ['显式零绑定', [{ id: 'case-x', packBinding: [] }]],
  ['只绑 catalog-only 包（PM）', [{ id: 'case-x', packBinding: ['pm'] }]],
  ['失效绑定（本制品未准入）', [{ id: 'case-x', packBinding: ['tender'] }]],
  ['案件不在 canonical 账本内', []],
];

describe('production execution seam · 按 matter fail-closed', () => {
  it.each(UNAUTHORIZED)('%s：start 在任何 effect 之前 rejected/invalid_scope', async (_label, cases) => {
    const { command, writes, turnRuns } = harness(cases);
    const events: SessionEvent[] = [];
    const outcome = await command.start(
      { commandId: 'c1', caseId: 'case-x', scenarioId: S2_SCENARIO_ID, materialRefs: ['mat-1'], modelRoute: MODEL_ROUTE },
      (event) => events.push(event),
    ).done;
    expect(outcome).toMatchObject({ status: 'rejected', reason: 'invalid_scope' });
    // effect 恰为零：无 provider/turn 调用、无 WorkState CAS、无事件（故也无 journal append）。
    expect(turnRuns).toEqual([]);
    expect(writes).toEqual([]);
    expect(events).toEqual([]);
  });

  it.each(UNAUTHORIZED)('%s：startWithPreflight（垂类预检入口）同样拦在 effect 之前', async (_label, cases) => {
    const { command, writes, turnRuns } = harness(cases);
    const events: SessionEvent[] = [];
    const outcome = await command.startWithPreflight(
      {
        commandId: 'c2',
        caseId: 'case-x',
        materialRefs: ['mat-1'],
        modelRoute: MODEL_ROUTE,
        subject: { partyName: '合川器材有限公司' },
      },
      (event) => events.push(event),
    ).done;
    expect(outcome).toMatchObject({ status: 'rejected', reason: 'invalid_scope' });
    expect(turnRuns).toEqual([]);
    expect(writes).toEqual([]);
    expect(events).toEqual([]);
  });

  it.each(UNAUTHORIZED)('%s：resume 与垂类 review resolution 同样拦在 effect 之前', async (_label, cases) => {
    const { command, writes, turnRuns } = harness(cases);
    const events: SessionEvent[] = [];
    const resumed = await command.resume(
      { commandId: 'r1', caseId: 'case-x', sessionId: 'session-1', requestId: 'req-1', decision: 'confirm' },
      (event) => events.push(event),
    );
    expect(resumed).toMatchObject({ status: 'rejected', reason: 'invalid_scope' });

    const resolved = await command.resolveReview(
      {
        commandId: 'r2',
        caseId: 'case-x',
        sessionId: 'session-1',
        requestId: 'req-1',
        resolution: { items: [{ itemRef: 'risk-1', disposition: 'confirm' }] },
      },
      (event) => events.push(event),
    );
    expect(resolved).toMatchObject({ status: 'rejected', reason: 'invalid_scope' });
    expect(turnRuns).toEqual([]);
    expect(writes).toEqual([]);
    expect(events).toEqual([]);
  });

  it('未授权 matter 的只读面照常可用：replay 与 cancel 不因卸载被禁止', async () => {
    const { command } = harness([{ id: 'case-x', packBinding: [] }]);
    // 只读 replay：没有账本就诚实答「没有」，不是拒绝。
    await expect(command.replay({ caseId: 'case-x', sessionId: 'session-1' }))
      .resolves.toMatchObject({ found: false });
    // cancel：没有在跑的 leg 就答 not_running，同样不是授权拒绝。
    await expect(command.cancel({ commandId: 'x1', caseId: 'case-x', sessionId: 'session-1' }))
      .resolves.toEqual({ accepted: false, reason: 'not_running' });
  });

  it('已绑定 Legal 的 matter：同一条命令照跑（授权面不误伤正例）', async () => {
    const { command, writes, turnRuns } = harness([{ id: 'case-x', packBinding: ['legal'] }]);
    const events: SessionEvent[] = [];
    const outcome = await command.start(
      { commandId: 'c3', caseId: 'case-x', scenarioId: S2_SCENARIO_ID, materialRefs: ['mat-1'], modelRoute: MODEL_ROUTE },
      (event) => events.push(event),
    ).done;
    expect(outcome.status).toBe('paused');
    expect(turnRuns.length).toBeGreaterThan(0);
    expect(writes.length).toBeGreaterThan(0);
    expect(events.some((event) => event.type === 'artifact_produced')).toBe(true);
  });

  it('授权面按 caseId 现读绑定：同一枚命令端口上，卸载后立刻拒绝（不吃缓存）', async () => {
    const cases: Array<{ id: string; packBinding?: readonly string[] }> = [{ id: 'case-x', packBinding: ['legal'] }];
    const { command, turnRuns } = harness(cases);
    const first = await command.start(
      { commandId: 'c4', caseId: 'case-x', scenarioId: S2_SCENARIO_ID, materialRefs: ['mat-1'], modelRoute: MODEL_ROUTE },
      () => {},
    ).done;
    expect(first.status).toBe('paused');
    const runsBefore = turnRuns.length;

    // 卸载（canonical 账本改写），随后同一端口再起一条新命令。
    cases[0] = { id: 'case-x', packBinding: [] };
    const second = await command.start(
      { commandId: 'c5', caseId: 'case-x', scenarioId: S2_SCENARIO_ID, materialRefs: ['mat-1'], modelRoute: MODEL_ROUTE },
      () => {},
    ).done;
    expect(second).toMatchObject({ status: 'rejected', reason: 'invalid_scope' });
    expect(turnRuns.length).toBe(runsBefore);
  });

  it('调用方自报的 packageId/binding 不作数：授权只认 canonical case store', async () => {
    const readCases = vi.fn(() => [{ id: 'case-x', packBinding: [] as readonly string[] }]);
    const runtime = createDesktopPackageRuntime();
    const resolve = createCaseRegistriesResolver({
      readCases,
      availablePackageIds: runtime.packageIds,
      registriesFor: runtime.registriesFor,
    });
    expect(resolve('case-x').scenarios.list()).toEqual([]);
    // 每次调用都现读——绑定可变，缓存一份就等于把授权停在卸载之前的世界。
    resolve('case-x');
    expect(readCases).toHaveBeenCalledTimes(2);
  });
});
