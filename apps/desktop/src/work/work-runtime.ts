/**
 * WORK-LIVE-1 · desktop 组合根的 Work 生产装配缝。
 *
 * 把已验收前置（LEGAL-S3 装配件、WorkStateStore host、ArtifactEnvelope codec、Turn 引擎、MaterialStore）
 * 组装成 `LegalS3WorkCommand`。provider 无关的 Turn 引擎：生产走注入的 `ProviderTransport`（DeepSeek），
 * DEV/E2E 走注入的 Work turn 樁（绝不进正式 Tauri composition）。
 *
 * **WorkState host 边界**：生产（Tauri 运行时）由组合根（`main.tsx`）注入 WORK-HOST-1 的 Tauri WorkState
 * opaque-blob 宿主（`createTauriWorkStateHost`，ADR-010 决定二：临时文件 + F_FULLFSYNC + rename 原子替换 +
 * whole-envelope CAS + 软/硬大小上限），跨真机重启耐久持久。未注入 `host` 时（DEV/E2E）缺省
 * `createInMemoryWorkStateHost` 参考实现：browser-safe、跨 store 实例存活（故 store-driven 的
 * replay/resume/crash-inject 反例在樁宿主成立），但不跨真机重启。两条路径都零改 `work-command.ts`。
 */
import { createInMemoryWorkStateHost, createArtifactEnvelopeCodec } from '@courtwork/core/work-protocol';
import { createTurnRunner } from '@courtwork/core/turn-protocol';
import { createOpenAICompatibleProvider } from '@courtwork/provider/openai';
import { getProviderDescriptor } from '@courtwork/provider/registry';
import { PRICE_TABLE } from '@courtwork/provider/pricing';
import type { Provider, ProviderTransport } from '@courtwork/provider/types';
import type { TurnStore } from '@courtwork/core/turn-protocol';
import type { ConfirmationActor, PersistedTurn, TurnRunnerPort, WorkRuntimeBudget, WorkStateHostPort } from '@courtwork/core';
import type { PackageRegistries } from '@courtwork/registry';
import type { WorkModelRoute, WorkSessionRef } from '../protocol/client';
import { buildArtifactVersioningSource, LEGAL_S3_SCHEMA_VERSION } from './legal-s3-binding';
import { createLegalS3WorkCommand, type LegalS3WorkCommand } from './work-command';
import type { MaterialResolver } from './legal-s3-binding';

const KEYCHAIN_PLACEHOLDER = '__keychain__';

/**
 * 真实 identity dependency 未装配（current.md 已登记边界）——沿用 interaction actor 的 desktop 写死身份。
 * 真实组织身份/principal 注入属后续 ADR（`[需架构拍板]`），本单不自造第二套。
 */
const DESKTOP_WORK_ACTOR: ConfirmationActor = { channelId: 'desktop', actorId: 'desktop/local-user', role: '主办律师' };

/** DEV/E2E 注入的 Work turn 樁：给定调用身份 + 请求 + 取消信号，返回脚本化 PersistedTurn（绝不进正式 Tauri composition）。 */
export type WorkTurnStub = (input: {
  turnId: string;
  providerRequestId: string;
  request: unknown;
  modelRoute: Readonly<WorkModelRoute>;
  signal?: AbortSignal;
}) => PersistedTurn | Promise<PersistedTurn>;

let workTurnStub: WorkTurnStub | null = null;
let resetHost: (() => void) | null = null;
let readHost: ((ref: WorkSessionRef) => ReturnType<WorkStateHostPort['read']>) | null = null;

/** Playwright/DEV 探针注入点（非 demo 装配；仅 main.tsx 在 DEV+E2E mode 安装）。 */
export function installWorkTestHooks(): {
  setTurnStub(stub: WorkTurnStub | null): void;
  reset(): void;
  readState(ref: WorkSessionRef): ReturnType<WorkStateHostPort['read']>;
} {
  const hooks = {
    setTurnStub(stub: WorkTurnStub | null) {
      workTurnStub = stub;
    },
    reset() {
      workTurnStub = null;
      resetHost?.();
    },
    readState(ref: WorkSessionRef) {
      return readHost ? readHost(ref) : Promise.resolve({ found: false as const });
    },
  };
  (window as typeof window & { __courtworkWorkHooks?: typeof hooks }).__courtworkWorkHooks = hooks;
  return hooks;
}

function workProvider(route: Readonly<WorkModelRoute>, transport: ProviderTransport): Provider {
  return createOpenAICompatibleProvider(getProviderDescriptor(route.providerId), {
    auth: { kind: 'api_key', apiKey: KEYCHAIN_PLACEHOLDER },
    billing: { kind: 'metered' },
    modelId: route.modelId,
    reasoningLevel: route.reasoning,
    transport,
  });
}

export interface DesktopWorkRuntimeInput {
  registries: PackageRegistries;
  materialResolver: MaterialResolver;
  loadRuntimeLimits: () => WorkRuntimeBudget['limits'];
  transport?: ProviderTransport;
  host?: WorkStateHostPort;
}

/**
 * 组合根装配：注入 host（缺省内存参考实现）、Turn 引擎工厂（樁优先，否则 transport provider）、
 * ArtifactEnvelope codec（首个真实生产者，legal.RiskList 版本源）与 desktop actor。
 */
export function createDesktopWorkCommand(input: DesktopWorkRuntimeInput): LegalS3WorkCommand {
  let host = input.host;
  if (!host) {
    let inner = createInMemoryWorkStateHost();
    resetHost = () => { inner = createInMemoryWorkStateHost(); };
    host = {
      read: (ref) => inner.read(ref),
      compareAndSwap: (cas) => inner.compareAndSwap(cas),
    };
  }
  readHost = (ref) => host!.read(ref);

  const codec = createArtifactEnvelopeCodec(
    buildArtifactVersioningSource(input.registries, { legal: LEGAL_S3_SCHEMA_VERSION }),
  );

  const makeTurnRunner = (turnStore: TurnStore, modelRoute: Readonly<WorkModelRoute>): TurnRunnerPort => {
    const frozenRoute = { ...modelRoute };
    if (workTurnStub) {
      const stub = workTurnStub;
      return {
        async run(runInput) {
          const turn = await stub({
            turnId: runInput.turnId,
            providerRequestId: runInput.providerRequestId,
            request: runInput.request,
            modelRoute: { ...frozenRoute },
            ...(runInput.signal ? { signal: runInput.signal } : {}),
          });
          turnStore.save(turn);
          return turn;
        },
      };
    }
    return {
      run(runInput) {
        if (!input.transport) {
          return Promise.reject(new Error('合同审查仅在桌面应用内可用（缺 provider transport）'));
        }
        return createTurnRunner(workProvider(frozenRoute, input.transport), turnStore).run(runInput);
      },
    };
  };

  const createRuntimeBudget = (route: Readonly<WorkModelRoute>): WorkRuntimeBudget => {
    const base: WorkRuntimeBudget = {
      limits: { ...input.loadRuntimeLimits() },
      costBasis: { currency: 'USD', assumptions: [] },
      consumed: { steps: 0, toolCalls: 0, executionMs: 0, estimatedUsd: 0, costCoverage: 'partial' },
    };
    if (route.providerId !== 'deepseek') return base;
    const metadataValid = typeof PRICE_TABLE.version === 'string' && PRICE_TABLE.version.length > 0
      && typeof PRICE_TABLE.effectiveAt === 'string' && PRICE_TABLE.effectiveAt.length > 0
      && Array.isArray(PRICE_TABLE.assumptions)
      && PRICE_TABLE.assumptions.every((item) => typeof item === 'string')
      && Number.isFinite(PRICE_TABLE.rmbToUsdRate) && PRICE_TABLE.rmbToUsdRate > 0;
    if (!metadataValid) return base;
    const price = PRICE_TABLE.prices.deepseek?.[route.modelId];
    const complete = price !== undefined
      && Number.isFinite(price.inputPerMillionRmb) && price.inputPerMillionRmb >= 0
      && Number.isFinite(price.outputPerMillionRmb) && price.outputPerMillionRmb >= 0;
    return {
      ...base,
      costBasis: {
        currency: 'USD',
        priceTableVersion: PRICE_TABLE.version,
        priceTableEffectiveAt: PRICE_TABLE.effectiveAt,
        assumptions: [...PRICE_TABLE.assumptions],
      },
      consumed: { ...base.consumed, costCoverage: complete ? 'complete' : 'partial' },
    };
  };

  return createLegalS3WorkCommand({
    host,
    registries: input.registries,
    codec,
    actor: DESKTOP_WORK_ACTOR,
    materialResolver: input.materialResolver,
    makeTurnRunner,
    createRuntimeBudget,
    // ADR-010 决定一：未注入 provider transport 且无 DEV/E2E stub 即「production composition 未装配」——
    // start 返回 rejected/not_configured（动态求值：E2E stub 在 runtime 安装，故不能构造期定死）。
    isConfigured: () => Boolean(workTurnStub) || Boolean(input.transport),
  });
}
