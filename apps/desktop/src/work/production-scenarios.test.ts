import { describe, expect, it } from 'vitest';
import {
  createArtifactEnvelopeCodec,
  createInMemoryWorkStateHost,
  readWorkStateEnvelope,
  type ConfirmationActor,
  type SessionEvent,
  type TurnRunnerPort,
} from '@courtwork/core';
import type { TurnStore } from '@courtwork/core/turn-protocol';
import type { ResolveResult } from '../material/material-store';
import type { StoredMaterial } from '../material/material-ref';
import type { WorkModelRoute } from '../protocol/client';
import {
  LEGAL_S3_SCHEMA_VERSION,
  PRODUCTION_SCENARIO_IDS,
  S1_SCENARIO_ID,
  S2_SCENARIO_ID,
  S3_SCENARIO_ID,
  admitLegalS3Package,
  buildArtifactVersioningSource,
  buildIntakeRunInput,
  getProductionScenario,
} from './legal-s3-binding';
import { deriveCaseFileFromMaterials } from './primary-contract';
import { createLegalWorkCommand } from './work-command';

/**
 * LEGAL-FIVE-FACES-1 · 缺陷 D2 的红证与判据：production 命令端口此前把「可启动场景」
 * 硬编码成单枚 `legal.S3`，S1（时间线/关系图谱）与 S2（矩阵审阅）在真实案上根本无从起跑。
 * 本谱把「闭集」立成契约：闭集内可跑、闭集外显式拒绝、账本头逐字记实际场景。
 */

const ACTOR: ConfirmationActor = { channelId: 'desktop', actorId: 'lawyer-1', role: '主办律师' };
const MODEL_ROUTE: WorkModelRoute = { providerId: 'test-provider', modelId: 'test-model', reasoning: 'standard' };

function storedMaterial(overrides: Partial<StoredMaterial> = {}): StoredMaterial {
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
    ...overrides,
  };
}

function materialResolver(materials: StoredMaterial[]) {
  const byKey = new Map(materials.map((m) => [`${m.caseId} ${m.materialId}`, m] as const));
  return {
    resolveForProvider(caseId: string, materialId: string): Promise<ResolveResult> {
      const material = byKey.get(`${caseId} ${materialId}`);
      if (!material) return Promise.resolve({ status: 'blocked', reason: 'not_found' as const });
      return Promise.resolve({ status: 'ready' as const, material });
    },
  };
}

/** S2 单步 stub：产出最小合法 ReviewMatrix（rows 可空、cell anchors 可空）。 */
function matrixTurnRunner(): (turnStore: TurnStore) => TurnRunnerPort {
  return (turnStore) => ({
    async run(input) {
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
        completedAt: '2026-08-07T00:00:00.000Z',
      };
      turnStore.save(turn);
      return turn;
    },
  });
}

function harness(materials: StoredMaterial[] = [storedMaterial()]) {
  const registries = admitLegalS3Package();
  const host = createInMemoryWorkStateHost();
  let seq = 0;
  const command = createLegalWorkCommand({
    host,
    registries,
    codec: createArtifactEnvelopeCodec(buildArtifactVersioningSource(registries, { legal: LEGAL_S3_SCHEMA_VERSION })),
    actor: ACTOR,
    materialResolver: materialResolver(materials),
    makeTurnRunner: matrixTurnRunner(),
    createRuntimeBudget: () => ({
      limits: {},
      costBasis: { currency: 'USD', assumptions: [] },
      consumed: { steps: 0, toolCalls: 0, executionMs: 0, estimatedUsd: 0, costCoverage: 'partial' },
    }),
    now: () => '2026-08-07T00:00:00.000Z',
    mintSessionId: () => `session-${++seq}`,
  });
  return { command, host, registries };
}

describe('LEGAL-FIVE-FACES-1 · production 可启动场景闭集', () => {
  it('闭集恰是包声明的三枚可启动场景（S1/S2/S3）', () => {
    expect([...PRODUCTION_SCENARIO_IDS]).toEqual([S1_SCENARIO_ID, S2_SCENARIO_ID, S3_SCENARIO_ID]);
  });

  it('闭集外场景取用即显式失败（不静默当作 S3）', () => {
    const { registries } = harness();
    expect(() => getProductionScenario(registries, 'legal.S6')).toThrow(/legal\.S6/);
    expect(getProductionScenario(registries, S1_SCENARIO_ID).id).toBe(S1_SCENARIO_ID);
  });

  it('闭集外场景的 start 命令返回 rejected/invalid_scope', async () => {
    const { command } = harness();
    const outcome = await command.start(
      { commandId: 'c1', caseId: 'case-x', scenarioId: 'legal.S6', materialRefs: ['mat-1'], modelRoute: MODEL_ROUTE },
      () => {},
    ).done;
    expect(outcome).toMatchObject({ status: 'rejected', reason: 'invalid_scope' });
  });

  it('S2 在真实案上跑通到门禁，账本头记的是 legal.S2（不是被顶名的 S3）', async () => {
    const { command, host } = harness();
    const events: SessionEvent[] = [];
    const { sessionId, done } = command.start(
      { commandId: 'c2', caseId: 'case-x', scenarioId: S2_SCENARIO_ID, materialRefs: ['mat-1'], modelRoute: MODEL_ROUTE },
      (event) => events.push(event),
    );
    const outcome = await done;
    expect(outcome.status).toBe('paused');
    expect(events.some((e) => e.type === 'artifact_produced' && e.artifactType === 'legal.ReviewMatrix')).toBe(true);
    const read = await host.read({ caseId: 'case-x', sessionId });
    if (!read.found) throw new Error('unreachable');
    expect(readWorkStateEnvelope(read.bytes).scenarioId).toBe(S2_SCENARIO_ID);
  });

  it('门禁确认经通用 resume 续行到 scenario_completed（非 S3 场景无逐条处置）', async () => {
    const { command } = harness();
    const first = await command.start(
      { commandId: 'c3', caseId: 'case-x', scenarioId: S2_SCENARIO_ID, materialRefs: ['mat-1'], modelRoute: MODEL_ROUTE },
      () => {},
    ).done;
    if (first.status !== 'paused') throw new Error(`expected paused: ${JSON.stringify(first)}`);
    const events: SessionEvent[] = [];
    const outcome = await command.resume(
      { commandId: 'c3-resume', caseId: 'case-x', sessionId: first.ref.sessionId, requestId: first.requestId, decision: 'confirm' },
      (event) => events.push(event),
    );
    expect(outcome.status).toBe('completed');
    expect(events.some((e) => e.type === 'scenario_completed')).toBe(true);
  });
});

describe('LEGAL-FIVE-FACES-1 · 无预检场景的运行输入', () => {
  it('阅卷类场景零工具输入即可装配（S1 未声明 toolIds）', () => {
    const { registries } = harness();
    const scenario = getProductionScenario(registries, S1_SCENARIO_ID);
    const input = buildIntakeRunInput({ scenario, materials: [], caseFile: undefined });
    expect(input.toolInputs).toEqual({});
    expect(input.inputArtifacts).toEqual({});
  });

  it('声明了 toolIds 的场景走本路径即显式阻断（不默认补全）', () => {
    const { registries } = harness();
    const scenario = getProductionScenario(registries, S3_SCENARIO_ID);
    expect(() => buildIntakeRunInput({ scenario, materials: [] })).toThrow(/party-verify/);
  });

  it('声明 CaseFile 输入的场景带入机械派生的卷宗清单（全部为支持材料，零主合同猜测）', () => {
    const materials = [storedMaterial(), storedMaterial({ materialId: 'mat-2', fileName: '验收单.pdf', mediaType: 'application/pdf' })];
    const caseFile = deriveCaseFileFromMaterials('case-x', materials);
    expect(caseFile.files.map((file) => file.fileId)).toEqual(['mat-1', 'mat-2']);
    expect(caseFile.files.every((file) => file.documentType === 'supporting')).toBe(true);
  });

  it('未就绪材料不进卷宗清单（ready 之外不入 provider 视图）', () => {
    const materials = [storedMaterial(), storedMaterial({ materialId: 'mat-3', status: 'needs_ocr' })];
    expect(deriveCaseFileFromMaterials('case-x', materials).files.map((f) => f.fileId)).toEqual(['mat-1']);
  });
});
