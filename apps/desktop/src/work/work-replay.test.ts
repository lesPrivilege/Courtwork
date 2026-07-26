import { describe, expect, it, vi } from 'vitest';
import {
  createArtifactEnvelopeCodec,
  createInMemoryWorkStateHost,
  type ArtifactEnvelopeCodec,
  type ConfirmationActor,
  type SessionEvent,
  type TurnRunnerPort,
  type WorkStateHostPort,
} from '@courtwork/core';
import type { TurnStore } from '@courtwork/core/turn-protocol';
import type { ResolveResult } from '../material/material-store';
import type { StoredMaterial } from '../material/material-ref';
import { WorkReplayError, type WorkModelRoute } from '../protocol/client';
import { LEGAL_S3_SCHEMA_VERSION, admitLegalS3Package, buildArtifactVersioningSource } from './legal-s3-binding';
import { createLegalS3WorkCommand, type LegalS3WorkCommand } from './work-command';
import { createDemoWorkFixture, DEMO_S1_SESSION_ID, DEMO_S3_SESSION_ID } from '../demo/client';
import { DEMO_CASE_ID } from '../case/case-scope';

/**
 * CONTRACT-OUTPUT-TRUTH-1 · O3：`replay()` 的逐字判别联合与 typed 失败闭集。
 *
 * 映射只住 desktop replay adapter，不扩 host wire 或 core schema。
 */
const ACTOR: ConfirmationActor = { channelId: 'desktop', actorId: 'lawyer-1', role: '主办律师' };
const MODEL_ROUTE: WorkModelRoute = { providerId: 'test-provider', modelId: 'test-model', reasoning: 'standard' };
const REF = { caseId: 'case-x', sessionId: 'session-1' };

function storedMaterial(): StoredMaterial {
  return {
    materialId: 'mat-1',
    caseId: 'case-x',
    fileName: '合同.md',
    mediaType: 'text/markdown',
    byteLength: 24,
    contentSha256: 'sha-content',
    readingViewVersion: 'reading-view-material@1',
    readingViewSha256: 'sha-view',
    status: 'ready',
    readingMarkdown: '# 合同\n\n第六条 违约金按日计。',
    blocks: [
      {
        blockId: 'b1',
        text: '第六条 违约金按日计。',
        rangeBase: 0,
        textLayerVersion: 'text-layer@1',
      },
    ],
  };
}

function codecFor(registries: ReturnType<typeof admitLegalS3Package>): ArtifactEnvelopeCodec {
  return createArtifactEnvelopeCodec(buildArtifactVersioningSource(registries, { legal: LEGAL_S3_SCHEMA_VERSION }));
}

/** 永远不产任何事件的 runner：本组只关心读侧，不跑真实场景。 */
const idleTurnRunner: (turnStore: TurnStore, route: Readonly<WorkModelRoute>) => TurnRunnerPort = () =>
  ({
    async run() {
      throw new Error('本组不应触发 Turn 运行');
    },
  }) as unknown as TurnRunnerPort;

function commandWith(host: WorkStateHostPort): LegalS3WorkCommand {
  const registries = admitLegalS3Package();
  return createLegalS3WorkCommand({
    host,
    registries,
    codec: codecFor(registries),
    actor: ACTOR,
    materialResolver: {
      async resolveForProvider(): Promise<ResolveResult> {
        return { status: 'ready', material: storedMaterial() };
      },
    },
    makeTurnRunner: idleTurnRunner,
    createRuntimeBudget: () => ({
      limits: {},
      costBasis: { currency: 'USD', assumptions: [] },
      consumed: { steps: 0, toolCalls: 0, executionMs: 0, estimatedUsd: 0, costCoverage: 'partial' },
    }),
    now: () => '2026-07-17T00:00:00.000Z',
    mintSessionId: () => 'session-1',
  });
}

/** 直接铸一枚合法 v1 信封写进宿主：读侧测试不需要真跑场景。 */
async function seedEnvelope(
  host: WorkStateHostPort,
  overrides: Record<string, unknown> = {},
  ref = REF,
): Promise<void> {
  const envelope = {
    storageVersion: 1,
    revision: 1,
    caseId: ref.caseId,
    sessionId: ref.sessionId,
    chainId: 'chain-1',
    scenarioId: 'legal.S3',
    packageId: 'legal',
    packageVersion: '1.0.0',
    schemaVersion: 1,
    scenarioFingerprint: 'fp-1',
    modelRoute: MODEL_ROUTE,
    materialRefs: ['mat-primary', 'mat-supporting'],
    createdAt: '2026-07-20T11:22:33.444Z',
    runtimeBudget: {
      limits: {},
      costBasis: { currency: 'USD', assumptions: [] },
      consumed: { steps: 0, toolCalls: 0, executionMs: 0, estimatedUsd: 0, costCoverage: 'partial' },
    },
    events: [],
    turnEntries: [],
    pendingConfirmations: [],
    revisionEvents: [],
    ...overrides,
  };
  await host.compareAndSwap({
    ref,
    expectedVersion: null,
    bytes: new TextEncoder().encode(JSON.stringify(envelope)),
  });
}

describe('replay 判别联合', () => {
  it('宿主明确「没有」时返回 found:false，仍带原 query ref 与 interrupted 相位', async () => {
    const command = commandWith(createInMemoryWorkStateHost());
    const result = await command.replay(REF);
    expect(result.found).toBe(false);
    expect(result.ref).toEqual(REF);
    expect(result.phase).toBe('interrupted');
    expect(result.events).toEqual([]);
    // found:false 分支结构上不携 metadata。
    expect(result).not.toHaveProperty('materialRefs');
  });

  /**
   * 只断言可观测的：值来自 envelope 既有字段，顺序不变，`materialRefs[0]` 就是主合同。
   *
   * **不**断言「防御性复制」——`readWorkStateEnvelope` 每次读都从 bytes 重新解析，返回数组本就
   * 逐次新建，删掉 spread 也观察不到差别（实测：该 mutation 不触红）。实现里保留 spread 是习惯，
   * 不是本层能证明的性质；写成断言只会得到一条零区分力的绿灯。
   */
  it('found:true 携 envelope 既有 materialRefs 与 createdAt，顺序不变', async () => {
    const host = createInMemoryWorkStateHost();
    await seedEnvelope(host);
    const result = await commandWith(host).replay(REF);
    if (!result.found) throw new Error('expected found');
    expect(result.materialRefs).toEqual(['mat-primary', 'mat-supporting']);
    expect(result.materialRefs[0]).toBe('mat-primary');
    expect(result.sessionCreatedAt).toBe('2026-07-20T11:22:33.444Z');
  });

  it('materialRefs 顺序按信封原样，不按文件名或清单排序重算', async () => {
    const host = createInMemoryWorkStateHost();
    await seedEnvelope(host, { materialRefs: ['zz-primary', 'aa-supporting', 'mm-supporting'] });
    const result = await commandWith(host).replay(REF);
    if (!result.found) throw new Error('expected found');
    expect(result.materialRefs).toEqual(['zz-primary', 'aa-supporting', 'mm-supporting']);
  });

  it('合法但残缺的信封（turn_linked 无终态）仍是 found:true，相位必须是 interrupted 而非 running', async () => {
    const host = createInMemoryWorkStateHost();
    await seedEnvelope(host, {
      events: [
        {
          type: 'turn_linked',
          sessionId: REF.sessionId,
          seq: 1,
          emittedAt: '2026-07-20T11:23:00.000Z',
          turnId: 'turn-unterminated',
          stepId: 'risk-scan',
          artifactType: 'legal.RiskList',
          attempt: 1,
        } as SessionEvent,
      ],
      turnEntries: [],
    });
    const result = await commandWith(host).replay(REF);
    expect(result.found).toBe(true);
    expect(result.phase).toBe('interrupted');
  });
});

describe('replay typed 失败闭集', () => {
  function throwingHost(error: unknown): WorkStateHostPort {
    return {
      read: vi.fn(async () => {
        throw error;
      }),
      compareAndSwap: vi.fn(async () => ({ applied: false, version: 'v0' })),
    } as unknown as WorkStateHostPort;
  }

  it('宿主读取拒绝 → unavailable（不是 corrupt，也不是 missing）', async () => {
    const command = commandWith(throwingHost(new Error('宿主拒绝读取')));
    await expect(command.replay(REF)).rejects.toMatchObject({
      name: 'WorkReplayError',
      code: 'work_replay_failed',
      reason: 'unavailable',
    });
  });

  it('未分类异常同样收敛为 unavailable，不外泄裸异常', async () => {
    const command = commandWith(throwingHost('字符串异常'));
    await expect(command.replay(REF)).rejects.toBeInstanceOf(WorkReplayError);
  });

  it('未知 storageVersion → unsupported_version', async () => {
    const host = createInMemoryWorkStateHost();
    await host.compareAndSwap({
      ref: REF,
      expectedVersion: null,
      bytes: new TextEncoder().encode(JSON.stringify({ storageVersion: 99 })),
    });
    await expect(commandWith(host).replay(REF)).rejects.toMatchObject({ reason: 'unsupported_version' });
  });

  it('字节损坏 / v1 结构不符 → corrupt', async () => {
    const host = createInMemoryWorkStateHost();
    await host.compareAndSwap({
      ref: REF,
      expectedVersion: null,
      bytes: new TextEncoder().encode('这不是 JSON'),
    });
    await expect(commandWith(host).replay(REF)).rejects.toMatchObject({ reason: 'corrupt' });
  });

  it('只有读出 envelope 后显式比较 ref 不等才是 ref_mismatch', async () => {
    const host = createInMemoryWorkStateHost();
    // 宿主槽位是 REF，但信封头写着别的 session——只有这种情况才是 ref_mismatch。
    await seedEnvelope(host, { sessionId: 'session-other' });
    await expect(commandWith(host).replay(REF)).rejects.toMatchObject({ reason: 'ref_mismatch' });
  });

  it('查不到不是 ref_mismatch，也不是任何异常', async () => {
    const command = commandWith(createInMemoryWorkStateHost());
    await expect(command.replay({ caseId: 'case-x', sessionId: 'never-existed' })).resolves.toMatchObject({
      found: false,
    });
  });
});

describe('demo projection 与 production 同形', () => {
  it('S3 固定 materialRefs 与 sessionCreatedAt，found 恒 true', async () => {
    const fixture = createDemoWorkFixture({ replayDelayMs: 0 });
    const result = await fixture.projection.replay({ caseId: DEMO_CASE_ID, sessionId: DEMO_S3_SESSION_ID });
    expect(result.found).toBe(true);
    if (!result.found) throw new Error('expected found');
    expect(result.materialRefs).toEqual(['04-设备采购合同.md']);
    expect(result.sessionCreatedAt).toBe('2026-07-10T09:00:00.000Z');
  });

  it('S1 固定空 materialRefs，同一 sessionCreatedAt', async () => {
    const fixture = createDemoWorkFixture({ replayDelayMs: 0 });
    const result = await fixture.projection.replay({ caseId: DEMO_CASE_ID, sessionId: DEMO_S1_SESSION_ID });
    if (!result.found) throw new Error('expected found');
    expect(result.materialRefs).toEqual([]);
    expect(result.sessionCreatedAt).toBe('2026-07-10T09:00:00.000Z');
  });
});
