/**
 * WORK-LIVE-1 · 概念一：`WorkCommandPort` 的**生产实现**（进程内 callback，ADR-009 语义）。
 *
 * 替换 WORK-PORT-1 的「仅类型声明」现状：production run / replay / resume / cancel 全链，只装配已验收前置
 * （LEGAL-S3 装配件、WorkStateStore、resolveForProvider、ArtifactEnvelope codec），零 recording/fixture/demo 原文。
 *
 * store-driven：每笔命令都从注入的 `WorkStateHostPort` 读回信封重建投影再续行——跨重启 resume 由此自然成立
 * （换 Tauri host 即得真机跨重启，零改本模块；host 生产实现属下一环 `[需架构拍板]`）。
 *
 * **browser-safe**：runtime 只走 `@courtwork/core/work-protocol`、`@courtwork/core/turn-protocol`、
 * `@courtwork/legal/package` 与 `./legal-s3-binding`（零 `node:*`）；类型走 `import type`。
 * **零 demo**：绝不 import demo/recording/DEMO_ARTIFACTS/GATES/contractSourceMd——静态门守卫。
 */
import {
  createEvidenceLedger,
  hydrateStoredEvents,
  loadWorkStateStore,
  readWorkStateEnvelope,
  resumeScenario,
  runScenario,
} from '@courtwork/core/work-protocol';
import { createMemoryTurnStore } from '@courtwork/core/turn-protocol';
import { LEGAL_PACKAGE } from '@courtwork/legal/package';
import type { TurnStore } from '@courtwork/core/turn-protocol';
import type {
  ArtifactEnvelopeCodec,
  ConfirmationActor,
  MaterialInput,
  ScenarioResumeInput,
  ScenarioRunResult,
  SessionEvent,
  SoftLimitWarning,
  TurnJournalEntry,
  TurnRunnerPort,
  WorkStateHeader,
  WorkStateHostPort,
  WorkStateStore,
  WorkRuntimeBudget,
} from '@courtwork/core';
import type { PackageRegistries } from '@courtwork/registry';
import type { RiskList } from '@courtwork/legal';
import type {
  CancelWorkCommand,
  ResumeWorkCommand,
  ReviewResolution,
  StartWorkCommand,
  WorkCommandOutcome,
  WorkCommandPort,
  WorkModelRoute,
  WorkProjectionPhase,
  WorkProjectionPort,
  WorkSessionRef,
} from '../protocol/client';
import type { StoredMaterial } from '../material/material-ref';
import {
  IncompleteReviewError,
  LEGAL_S3_SCHEMA_VERSION,
  MaterialResolutionBlockedError,
  MissingContractPartyError,
  MissingToolInputError,
  ReviseNotTerminalError,
  S3_RISK_LIST_TYPE,
  S3_SCENARIO_ID,
  UnknownReviewItemError,
  buildS3RunInput,
  createLegalS3ScenarioDeps,
  createProductionS3ToolRegistry,
  getS3Scenario,
  mapReviewResolutionToResume,
  resolveSessionMaterials,
  toMaterialInputs,
  type ContractPartySubject,
  type MaterialResolver,
} from './legal-s3-binding';
import type { ToolRegistry } from '@courtwork/core/work-protocol';

export interface LegalS3WorkCommandDeps {
  host: WorkStateHostPort;
  registries: PackageRegistries;
  codec: ArtifactEnvelopeCodec;
  /** desktop identity 注入的 actor（ADR-010：React 不得自报 actor）。真实 identity dependency 未装配为已知边界。 */
  actor: ConfirmationActor;
  materialResolver: MaterialResolver;
  /** provider 无关的 Turn 引擎装配缝：生产 = createTurnRunner(provider, turnStore)；E2E = 樁。 */
  makeTurnRunner: (turnStore: TurnStore, modelRoute: Readonly<WorkModelRoute>) => TurnRunnerPort;
  createRuntimeBudget: (modelRoute: Readonly<WorkModelRoute>) => WorkRuntimeBudget;
  tools?: ToolRegistry;
  now?: () => string;
  mintSessionId?: () => string;
  onSoftLimitWarning?: (warning: SoftLimitWarning) => void;
  /**
   * production composition 是否已装配可运行 Turn 引擎（transport/provider 或 DEV/E2E stub）。
   * 缺省视为已装配。未装配时 `start` 返回 ADR-010 决定一闭集中的 `rejected/not_configured`，
   * 不得落 `failed/internal`、抛裸 Promise rejection 或回退 demo。
   */
  isConfigured?: () => boolean;
}

/** 未装配反馈（voice.md §9 产品语言，零技术概念暴露；工程细节不进用户可见文案）。 */
const NOT_CONFIGURED_MESSAGE = '合同审查暂未就绪，请在桌面应用内重试';

/** 显式结构化 preflight（S3 主体输入）+ 冻结 model route + 材料引用——ADR-010 决定五。 */
export interface LegalS3StartInput {
  commandId: string;
  caseId: string;
  materialRefs: string[];
  modelRoute: WorkModelRoute;
  subject: ContractPartySubject;
}

export interface LegalS3ReviewResolveInput extends WorkSessionRef {
  commandId: string;
  requestId: string;
  resolution: ReviewResolution;
}

/**
 * 生产命令端口：满足 ADR-010 `WorkCommandPort` + `WorkProjectionPort`，并暴露 legal.S3 垂类入口
 * `startWithPreflight`（携显式主体）与 `resolveReview`（审阅处置 → 逐条 revision → resume）。
 * 通用 `start(StartWorkCommand)` 无 preflight slot：S3 缺主体即显式 `rejected/invalid_scope`（不默认补全）。
 */
export interface LegalS3WorkCommand extends WorkCommandPort, WorkProjectionPort {
  startWithPreflight(
    input: LegalS3StartInput,
    publish: (event: SessionEvent) => void,
  ): { sessionId: string; done: Promise<WorkCommandOutcome> };
  resolveReview(
    input: LegalS3ReviewResolveInput,
    publish: (event: SessionEvent) => void,
  ): Promise<WorkCommandOutcome>;
}

type StartPayload = { caseId: string; materialRefs: string[]; modelRoute: WorkModelRoute; subject?: ContractPartySubject };

interface CommandRecord {
  sessionId: string;
  payloadKey: string;
  done: Promise<WorkCommandOutcome>;
}

const CANCELED_SENTINEL = Symbol('work-live-canceled');

function stableKey(payload: StartPayload): string {
  return JSON.stringify({
    caseId: payload.caseId,
    materialRefs: [...payload.materialRefs],
    modelRoute: payload.modelRoute,
    subject: payload.subject ?? null,
  });
}

/** 结构化 scenario fingerprint（drift 检测契约位；本单不强制 re-validate，故用稳定结构串非 crypto hash）。 */
function scenarioFingerprint(): string {
  return JSON.stringify({
    id: S3_SCENARIO_ID,
    packageId: LEGAL_PACKAGE.identity.packageId,
    version: LEGAL_PACKAGE.identity.version,
    schemaVersion: LEGAL_S3_SCHEMA_VERSION,
  });
}

export function createLegalS3WorkCommand(deps: LegalS3WorkCommandDeps): LegalS3WorkCommand {
  const now = deps.now ?? (() => new Date().toISOString());
  const mintSessionId = deps.mintSessionId ?? (() => globalThis.crypto.randomUUID());
  const tools = deps.tools ?? createProductionS3ToolRegistry();

  /** 每 case 至多一个活跃 command（ADR-010 决定一）：从 start 起、到达终态止；paused 仍活跃。 */
  const activeByCase = new Map<string, string>();
  /** commandId first-wins：同 id+同 payload 复用既有结果；同 id+异 payload → command_conflict。 */
  const commands = new Map<string, CommandRecord>();
  /** 活跃 leg 的 AbortController（cancel 只取消当前活跃 Turn；无 leg 即无 controller）。 */
  const controllers = new Map<string, AbortController>();

  function buildHeader(input: StartPayload, sessionId: string, runtimeBudget: WorkRuntimeBudget): WorkStateHeader {
    return {
      caseId: input.caseId,
      sessionId,
      chainId: sessionId,
      scenarioId: S3_SCENARIO_ID,
      packageId: LEGAL_PACKAGE.identity.packageId,
      packageVersion: LEGAL_PACKAGE.identity.version,
      schemaVersion: LEGAL_S3_SCHEMA_VERSION,
      scenarioFingerprint: scenarioFingerprint(),
      modelRoute: { ...input.modelRoute },
      materialRefs: [...input.materialRefs],
      createdAt: now(),
      runtimeBudget: structuredClone(runtimeBudget),
    };
  }

  /** reload：读回信封的 turnEntries 种入内存 turn journal（否则 commit 会以空账本覆盖，丢 interrupted 证据）。 */
  async function loadStore(ref: WorkSessionRef, header: WorkStateHeader): Promise<{ store: WorkStateStore; turnStore: TurnStore }> {
    const existing = await deps.host.read(ref);
    const turnStore = createMemoryTurnStore(now);
    if (existing.found) {
      const envelope = readWorkStateEnvelope(existing.bytes);
      for (const entry of envelope.turnEntries) turnStore.save(entry as Extract<TurnJournalEntry, { status: 'completed' | 'failed' }>);
    }
    const store = await loadWorkStateStore({
      host: deps.host,
      ref,
      header,
      readTurnEntries: () => turnStore.list(),
      artifactCodec: deps.codec,
      ...(deps.onSoftLimitWarning ? { onSoftLimitWarning: deps.onSoftLimitWarning } : {}),
      now,
    });
    return { store, turnStore };
  }

  function publishFrom(store: WorkStateStore, publish: (event: SessionEvent) => void, baseline: number): number {
    const events = store.eventLog.list();
    for (let i = baseline; i < events.length; i += 1) publish(events[i]);
    return events.length;
  }

  function mapResult(result: ScenarioRunResult, ref: WorkSessionRef): WorkCommandOutcome {
    if (result.status === 'completed') return { status: 'completed', ref };
    if (result.status === 'paused') return { status: 'paused', ref, requestId: result.requestId };
    return { status: 'failed', ref, reason: result.reason, message: result.message, retryable: false };
  }

  function mapError(error: unknown, ref: WorkSessionRef): WorkCommandOutcome {
    // 材料 provider 前阻断 / 缺显式主体 / 逐条处置不合法 → 命令级拒绝（不入 provider，不默认补全）；
    // 产品语言（零技术概念暴露，voice.md §6）——工程细节留在 error 本体，不进用户可见文案。
    if (error instanceof MissingContractPartyError) return { status: 'rejected', reason: 'invalid_scope', message: '请先填写对方主体名称再开始审查' };
    if (error instanceof MissingToolInputError) return { status: 'rejected', reason: 'invalid_scope', message: '缺少开始审查所需的信息，请补全后重试' };
    if (error instanceof MaterialResolutionBlockedError) return { status: 'rejected', reason: 'invalid_scope', message: '合同原件复验未通过，未能开始审查' };
    if (error instanceof IncompleteReviewError) return { status: 'rejected', reason: 'invalid_scope', message: '尚有风险条目未处置，无法继续' };
    if (error instanceof UnknownReviewItemError) return { status: 'rejected', reason: 'invalid_scope', message: '审阅清单与风险清单不一致，请重新开始审查' };
    if (error instanceof ReviseNotTerminalError) return { status: 'rejected', reason: 'invalid_scope', message: '尚有条目待修改，无法继续' };
    const message = error instanceof Error ? error.message : String(error);
    return { status: 'failed', ref, reason: 'internal', message, retryable: false };
  }

  function releaseActive(caseId: string, sessionId: string, outcome: WorkCommandOutcome): void {
    // paused 仍活跃（等待 resume）；其余终态释放 case 占用。
    if (outcome.status === 'paused') return;
    if (activeByCase.get(caseId) === sessionId) activeByCase.delete(caseId);
  }

  async function runLeg(
    ref: WorkSessionRef,
    publish: (event: SessionEvent) => void,
    leg: (context: { store: WorkStateStore; turnStore: TurnStore; signal: AbortSignal; publishNew: () => void }) => Promise<ScenarioRunResult>,
    header: WorkStateHeader,
    existingController?: AbortController,
  ): Promise<WorkCommandOutcome> {
    const controller = existingController ?? new AbortController();
    if (!existingController) controllers.set(ref.sessionId, controller);
    let store: WorkStateStore | undefined;
    let baseline = 0;
    try {
      const loaded = await loadStore(ref, header);
      store = loaded.store;
      baseline = loaded.store.eventLog.list().length;
      const result = await leg({
        store: loaded.store,
        turnStore: loaded.turnStore,
        signal: controller.signal,
        publishNew: () => { baseline = publishFrom(loaded.store, publish, baseline); },
      });
      publishFrom(loaded.store, publish, baseline);
      const outcome = mapResult(result, ref);
      releaseActive(ref.caseId, ref.sessionId, outcome);
      return outcome;
    } catch (error) {
      if (controller.signal.aborted || error === CANCELED_SENTINEL) {
        if (store) publishFrom(store, publish, baseline);
        const outcome: WorkCommandOutcome = { status: 'canceled', ref };
        releaseActive(ref.caseId, ref.sessionId, outcome);
        return outcome;
      }
      if (store) publishFrom(store, publish, baseline);
      const outcome = mapError(error, ref);
      releaseActive(ref.caseId, ref.sessionId, outcome);
      return outcome;
    } finally {
      controllers.delete(ref.sessionId);
    }
  }

  async function runStart(
    input: StartPayload & { commandId: string },
    sessionId: string,
    runtimeBudget: WorkRuntimeBudget,
    publish: (event: SessionEvent) => void,
  ): Promise<WorkCommandOutcome> {
    const ref = { caseId: input.caseId, sessionId };
    const header = buildHeader(input, sessionId, runtimeBudget);
    const controller = new AbortController();
    controllers.set(ref.sessionId, controller);
    let scenario: ReturnType<typeof getS3Scenario>;
    let runInput: ReturnType<typeof buildS3RunInput>;
    try {
      const materials: StoredMaterial[] = await resolveSessionMaterials(deps.materialResolver, input.caseId, input.materialRefs);
      scenario = getS3Scenario(deps.registries);
      const materialInputs: MaterialInput[] = toMaterialInputs(materials);
      runInput = buildS3RunInput({ scenario, subject: input.subject, materials: materialInputs });
    } catch (error) {
      controllers.delete(ref.sessionId);
      const outcome = mapError(error, ref);
      releaseActive(ref.caseId, ref.sessionId, outcome);
      return outcome;
    }
    return runLeg(ref, publish, async ({ store, turnStore, signal }) => {
      const route = { ...store.snapshot().modelRoute };
      const scenarioDeps = createLegalS3ScenarioDeps({
        store,
        tools,
        turnRunner: deps.makeTurnRunner(turnStore, { ...route }),
        expectedModelRoute: { ...route },
        ledger: createEvidenceLedger(),
        registries: deps.registries,
        signal,
      });
      return runScenario(scenario, runInput, scenarioDeps);
    }, header, controller);
  }

  async function runResume(
    ref: WorkSessionRef,
    requestId: string,
    build: (store: WorkStateStore) => ScenarioResumeInput,
    publish: (event: SessionEvent) => void,
  ): Promise<WorkCommandOutcome> {
    const header = buildHeader(
      { caseId: ref.caseId, materialRefs: [], modelRoute: { providerId: '', modelId: '', reasoning: 'standard' } },
      ref.sessionId,
      { limits: {}, costBasis: { currency: 'USD', assumptions: [] }, consumed: { steps: 0, toolCalls: 0, executionMs: 0, estimatedUsd: 0, costCoverage: 'partial' } },
    );
    return runLeg(ref, publish, async ({ store, turnStore, signal }) => {
      // 残缺会话（turn_linked 无 terminal）不得当 paused 续行：显式拒绝，须以全新 start 身份重发（ADR-010）。
      if (store.interruptedTurns().length > 0) {
        throw new UnknownReviewItemError('__interrupted__');
      }
      const resumeInput = build(store);
      const scenario = getS3Scenario(deps.registries);
      const route = { ...store.snapshot().modelRoute };
      const scenarioDeps = createLegalS3ScenarioDeps({
        store,
        tools,
        turnRunner: deps.makeTurnRunner(turnStore, { ...route }),
        expectedModelRoute: { ...route },
        ledger: createEvidenceLedger(),
        registries: deps.registries,
        signal,
      });
      return resumeScenario(requestId, resumeInput, scenario, scenarioDeps);
    }, header);
  }

  function latestRiskList(store: WorkStateStore): RiskList {
    let list: RiskList | undefined;
    for (const event of store.eventLog.list()) {
      if (event.type === 'artifact_produced' && event.artifactType === S3_RISK_LIST_TYPE) list = event.artifact as RiskList;
    }
    if (!list) throw new UnknownReviewItemError('__no_risk_list__');
    return list;
  }

  /** commandId first-wins 闸门：命中既有 → 复用；异 payload → command_conflict；case 忙 → case_busy。 */
  function guardStart(commandId: string, payload: StartPayload): { record: CommandRecord } | { reject: WorkCommandOutcome; sessionId: string } {
    const payloadKey = stableKey(payload);
    const existing = commands.get(commandId);
    if (existing) {
      if (existing.payloadKey === payloadKey) return { record: existing };
      return { reject: { status: 'rejected', reason: 'command_conflict', message: '此次审查请求正在处理，请勿重复发起' }, sessionId: existing.sessionId };
    }
    const busy = activeByCase.get(payload.caseId);
    if (busy) {
      return { reject: { status: 'rejected', reason: 'case_busy', message: '本案已有进行中的合同审查，请先等待或停止当前审查' }, sessionId: mintSessionId() };
    }
    return { record: { sessionId: '', payloadKey, done: Promise.resolve({ status: 'canceled', ref: { caseId: payload.caseId, sessionId: '' } }) } };
  }

  function beginStart(commandId: string, payload: StartPayload, publish: (event: SessionEvent) => void): { sessionId: string; done: Promise<WorkCommandOutcome> } {
    // ADR-010 决定一：production composition 未装配时返回闭集中的 not_configured（先于任何 case/命令闸门与 run）。
    // 不入 provider、不落 header/artifact，绝非 failed/internal。
    if (deps.isConfigured && !deps.isConfigured()) {
      return { sessionId: mintSessionId(), done: Promise.resolve({ status: 'rejected', reason: 'not_configured', message: NOT_CONFIGURED_MESSAGE }) };
    }
    const guard = guardStart(commandId, payload);
    if ('record' in guard && guard.record.sessionId) {
      return { sessionId: guard.record.sessionId, done: guard.record.done };
    }
    if ('reject' in guard) {
      return { sessionId: guard.sessionId, done: Promise.resolve(guard.reject) };
    }
    const sessionId = mintSessionId();
    const payloadKey = stableKey(payload);
    const frozenRoute = { ...payload.modelRoute };
    const frozenPayload: StartPayload = {
      caseId: payload.caseId,
      materialRefs: [...payload.materialRefs],
      modelRoute: { ...frozenRoute },
      ...(payload.subject ? { subject: { ...payload.subject } } : {}),
    };
    const runtimeBudget = deps.createRuntimeBudget({ ...frozenRoute });
    activeByCase.set(payload.caseId, sessionId);
    const done = runStart({ ...frozenPayload, commandId }, sessionId, structuredClone(runtimeBudget), publish);
    const record: CommandRecord = { sessionId, payloadKey, done };
    commands.set(commandId, record);
    return { sessionId, done };
  }

  return {
    startWithPreflight(input, publish) {
      return beginStart(input.commandId, { caseId: input.caseId, materialRefs: input.materialRefs, modelRoute: input.modelRoute, subject: input.subject }, publish);
    },

    start(command: StartWorkCommand, publish) {
      // 通用 wire 无 preflight slot：S3 缺显式主体 → buildS3RunInput 抛 → rejected/invalid_scope（不默认补全）。
      return beginStart(command.commandId, { caseId: command.caseId, materialRefs: command.materialRefs, modelRoute: command.modelRoute }, publish);
    },

    async resolveReview(input, publish) {
      return runResume(
        { caseId: input.caseId, sessionId: input.sessionId },
        input.requestId,
        (store) => mapReviewResolutionToResume(input.resolution, latestRiskList(store), deps.actor),
        publish,
      );
    },

    async resume(command: ResumeWorkCommand, publish) {
      // 通用 wire：revisions 已在 React/binding 侧构造；actor 由 desktop identity 注入（React 不自报）。
      return runResume(
        { caseId: command.caseId, sessionId: command.sessionId },
        command.requestId,
        () => ({ actor: deps.actor, decision: command.decision, ...(command.revisions ? { revisions: command.revisions } : {}) }),
        publish,
      );
    },

    async cancel(command: CancelWorkCommand) {
      const controller = controllers.get(command.sessionId);
      if (!controller) {
        return { accepted: false, reason: 'not_running' };
      }
      if (controller.signal.aborted) return { accepted: false, reason: 'already_requested' };
      controller.abort();
      return { accepted: true };
    },

    async replay(query) {
      const ref = { caseId: query.caseId, sessionId: query.sessionId };
      const existing = await deps.host.read(ref);
      if (!existing.found) {
        return { ref, phase: 'interrupted' as WorkProjectionPhase, events: [] };
      }
      const envelope = readWorkStateEnvelope(existing.bytes);
      const hydrated = hydrateStoredEvents(envelope.events, deps.codec);
      const events = hydrated.events.filter((event) => event.seq > (query.afterSeq ?? -1));
      return { ref, phase: phaseFromEnvelope(hydrated.events, envelope.turnEntries), events };
    },
  };
}

/** 场景终局 > 门禁 pending > 残缺（turn_linked 无 terminal）> running（ADR-010 决定二/一）。 */
function phaseFromEnvelope(events: SessionEvent[], turnEntries: readonly TurnJournalEntry[]): WorkProjectionPhase {
  if (events.some((e) => e.type === 'scenario_completed')) return 'completed';
  if (events.some((e) => e.type === 'scenario_failed')) return 'failed';
  if (events.some((e) => e.type === 'confirmation_requested' && !isResolved(events, e.requestId))) return 'paused';
  const terminals = new Set(turnEntries.filter((entry) => 'status' in entry).map((entry) => (entry as { turnId: string }).turnId));
  const interrupted = events.some((e) => e.type === 'turn_linked' && !terminals.has(e.turnId));
  if (interrupted) return 'interrupted';
  if (events.some((e) => e.type === 'step_failed')) return 'failed';
  return 'running';
}

function isResolved(events: SessionEvent[], requestId: string): boolean {
  return events.some((e) => e.type === 'confirmation_resolved' && e.requestId === requestId);
}
