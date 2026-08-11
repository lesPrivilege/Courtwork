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
  CorruptEnvelopeError,
  UnknownConfirmationRequestError,
  UnknownEnvelopeVersionError,
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
  WorkStateEnvelopeV1,
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
  WorkReplayResult,
  WorkSessionRef,
} from '../../protocol/client';
import { WorkReplayError } from '../../protocol/client';
import type { StoredMaterial } from '../../material/material-ref';
import {
  deriveCaseFileFromMaterials,
  deriveS3CaseFile,
  MissingPrimaryContractError,
  PrimaryContractNotInSessionError,
} from './primary-contract';
import {
  IncompleteReviewError,
  InvalidReviewCorrectionError,
  DuplicateReviewItemError,
  LEGAL_S3_SCHEMA_VERSION,
  MaterialResolutionBlockedError,
  MissingContractPartyError,
  MissingToolInputError,
  S3_RISK_LIST_TYPE,
  S3_SCENARIO_ID,
  UnknownReviewItemError,
  buildIntakeRunInput,
  buildS3RunInput,
  createLegalS3ScenarioDeps,
  createProductionS3ToolRegistry,
  getProductionScenario,
  mapReviewResolutionToResume,
  resolveSessionMaterials,
  toMaterialInputs,
  type ContractPartySubject,
  type MaterialResolver,
} from './legal-s3-binding';
import type { ToolRegistry } from '@courtwork/core/work-protocol';

export interface LegalWorkCommandDeps {
  host: WorkStateHostPort;
  /**
   * 按 `caseId` 取该 matter **当下生效**的 registry（ADR-015 决定三 2026-08-08 补记：
   * matter 绑定是垂类执行授权的唯一真源）。
   *
   * 由受信组合根注入——它从 canonical case store 逐次读绑定再解析，**不信任调用方自报的
   * packageId/binding**。全局 registry 只供准入、目录与既有信封/产物解码，绝不作为 production
   * 命令的授权凭据。零绑定/仅绑定其他包/失效绑定一律得到不含该场景的 registry，
   * 于是每个 effect 之前就显式 `rejected/invalid_scope`。
   */
  registriesForCase: (caseId: string) => PackageRegistries;
  /**
   * production 可启动场景闭集（受信组合根声明，`composition/production-scenarios.ts`）。
   * 本端口只问「在不在闭集内」，不认识任何 id 语义——基线场景经同一条链接入即在此加员。
   */
  launchableScenarioIds: readonly string[];
  /**
   * **垂类**可启动子集：续行侧「这枚 matter 有没有任何可执行场景」的兜底判据只认它。
   * 基线恒在生效 registry 内，拿全集去问会让答案恒为真，垂类续行授权就被基线顶穿。
   */
  verticalScenarioIds: readonly string[];
  /** 已准入包的身份表（packageId → version/schemaVersion）：账本头逐字记**产出该场景的包**。 */
  packageIdentities: Readonly<Record<string, { version: string; schemaVersion: number }>>;
  /**
   * 会话作用域的 registry 收窄缝（受信组合根注入）。基线批处理据此把「就绪材料闭集」编进
   * `generic.BatchReport` 的 schema——逐项完整性裁决于是落在产物成形之前，而不是读侧补丁。
   * 缺省恒等：垂类路径零行为变化。
   */
  scopeRegistriesForRun?: (
    registries: PackageRegistries,
    context: { scenarioId: string; materialIds: readonly string[] },
  ) => PackageRegistries;
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
const NOT_CONFIGURED_MESSAGE = '当前工作暂未就绪，请在桌面应用内重试';

/** 本 matter 未加载该工作所需的包（ADR-015 执行授权真源；产品语言，不暴露 registry 概念）。 */
const OUT_OF_MATTER_SCOPE_MESSAGE = '本工作区未加载这项工作所需的包，无法开始';

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
export interface LegalWorkCommand extends WorkCommandPort, WorkProjectionPort {
  startWithPreflight(
    input: LegalS3StartInput,
    publish: (event: SessionEvent) => void,
  ): { sessionId: string; done: Promise<WorkCommandOutcome> };
  resolveReview(
    input: LegalS3ReviewResolveInput,
    publish: (event: SessionEvent) => void,
  ): Promise<WorkCommandOutcome>;
}

type StartPayload = {
  kind: 'start';
  caseId: string;
  scenarioId: string;
  materialRefs: string[];
  modelRoute: WorkModelRoute;
  subject: ContractPartySubject | null;
};

type ResolveReviewPayload = {
  kind: 'resolve_review';
  caseId: string;
  sessionId: string;
  requestId: string;
  resolution: ReviewResolution;
};

type CommandPayload = StartPayload | ResolveReviewPayload;

interface CommandRecord {
  sessionId: string;
  payloadKey: string;
  done: Promise<WorkCommandOutcome>;
}

const CANCELED_SENTINEL = Symbol('work-live-canceled');

/**
 * `resolve_review` 的 first-wins 键与实际 resume 共用这一份冻结值。
 * revise 文本的边界语义是 trim；不在键与执行之间保留空格差异。
 */
function normalizeReviewResolution(resolution: ReviewResolution): ReviewResolution {
  return {
    items: resolution.items.map((item) => (
      item.disposition === 'revise'
        ? {
            itemRef: item.itemRef,
            disposition: item.disposition,
            correctedDescription: item.correctedDescription.trim(),
          }
        : { itemRef: item.itemRef, disposition: item.disposition }
    )),
    ...(resolution.instrumentation
      ? { instrumentation: structuredClone(resolution.instrumentation) }
      : {}),
  };
}

function normalizeStartPayload(payload: StartPayload): StartPayload {
  return {
    kind: 'start',
    caseId: payload.caseId,
    scenarioId: payload.scenarioId,
    materialRefs: [...payload.materialRefs],
    modelRoute: { ...payload.modelRoute },
    subject: payload.subject
      ? {
          ...payload.subject,
          partyName: payload.subject.partyName.trim(),
        }
      : null,
  };
}

function stableKey(payload: CommandPayload): string {
  if (payload.kind === 'start') {
    return JSON.stringify({
      kind: payload.kind,
      caseId: payload.caseId,
      scenarioId: payload.scenarioId,
      materialRefs: [...payload.materialRefs],
      modelRoute: { ...payload.modelRoute },
      subject: payload.subject ? { ...payload.subject } : null,
    });
  }
  return JSON.stringify({
    kind: payload.kind,
    caseId: payload.caseId,
    sessionId: payload.sessionId,
    requestId: payload.requestId,
    resolution: {
      items: payload.resolution.items.map((item) => (
        item.disposition === 'revise'
          ? { itemRef: item.itemRef, disposition: item.disposition, correctedDescription: item.correctedDescription }
          : { itemRef: item.itemRef, disposition: item.disposition }
      )),
      ...(payload.resolution.instrumentation
        ? {
            instrumentation: {
              ...(payload.resolution.instrumentation.dwellMs !== undefined
                ? { dwellMs: payload.resolution.instrumentation.dwellMs }
                : {}),
              ...(payload.resolution.instrumentation.expandedEvidenceKeys
                ? { expandedEvidenceKeys: [...payload.resolution.instrumentation.expandedEvidenceKeys] }
                : {}),
            },
          }
        : {}),
    },
  });
}

/** 账本头的包身份（GENERIC-SCENARIOS-1 最小中性化：此前逐字写死 legal，非 legal 场景会被顶名）。 */
interface HeaderPackageIdentity {
  packageId: string;
  version: string;
  schemaVersion: number;
}

/** 结构化 scenario fingerprint（drift 检测契约位；本单不强制 re-validate，故用稳定结构串非 crypto hash）。 */
function scenarioFingerprint(scenarioId: string, identity: HeaderPackageIdentity): string {
  return JSON.stringify({
    id: scenarioId,
    packageId: identity.packageId,
    version: identity.version,
    schemaVersion: identity.schemaVersion,
  });
}

export function createLegalWorkCommand(deps: LegalWorkCommandDeps): LegalWorkCommand {
  const now = deps.now ?? (() => new Date().toISOString());
  const mintSessionId = deps.mintSessionId ?? (() => globalThis.crypto.randomUUID());
  const tools = deps.tools ?? createProductionS3ToolRegistry();

  /** 每 case 至多一个活跃 command（ADR-010 决定一）：从 start 起、到达终态止；paused 仍活跃。 */
  const activeByCase = new Map<string, string>();
  /** commandId first-wins：同 id+同 payload 复用既有结果；同 id+异 payload → command_conflict。 */
  const commands = new Map<string, CommandRecord>();
  /** 活跃 leg 的 AbortController（cancel 只取消当前活跃 Turn；无 leg 即无 controller）。 */
  const controllers = new Map<string, AbortController>();

  /** 场景 → 产出它的包身份。查不到即回落 legal（既有唯一垂类），缺登记不猜版本。 */
  function identityFor(scenarioId: string, caseId: string): HeaderPackageIdentity {
    const packageId = deps.registriesForCase(caseId).scenarios.get(scenarioId)?.packageId;
    const registered = packageId === undefined ? undefined : deps.packageIdentities[packageId];
    if (packageId === undefined || registered === undefined) {
      return {
        packageId: LEGAL_PACKAGE.identity.packageId,
        version: LEGAL_PACKAGE.identity.version,
        schemaVersion: LEGAL_S3_SCHEMA_VERSION,
      };
    }
    return { packageId, version: registered.version, schemaVersion: registered.schemaVersion };
  }

  function buildHeader(input: StartPayload, sessionId: string, runtimeBudget: WorkRuntimeBudget): WorkStateHeader {
    const identity = identityFor(input.scenarioId, input.caseId);
    return {
      caseId: input.caseId,
      sessionId,
      chainId: sessionId,
      scenarioId: input.scenarioId,
      packageId: identity.packageId,
      packageVersion: identity.version,
      schemaVersion: identity.schemaVersion,
      scenarioFingerprint: scenarioFingerprint(input.scenarioId, identity),
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
    if (error instanceof MissingPrimaryContractError) return { status: 'rejected', reason: 'invalid_scope', message: '请先选定一份 Word 主合同再开始审查' };
    if (error instanceof PrimaryContractNotInSessionError) return { status: 'rejected', reason: 'invalid_scope', message: '所选主合同已不在本案可用材料中，请重新选择' };
    if (error instanceof IncompleteReviewError) return { status: 'rejected', reason: 'invalid_scope', message: '尚有风险条目未处置，无法继续' };
    if (error instanceof UnknownReviewItemError) return { status: 'rejected', reason: 'invalid_scope', message: '审阅清单与风险清单不一致，请重新开始审查' };
    if (error instanceof DuplicateReviewItemError) return { status: 'rejected', reason: 'invalid_scope', message: '同一风险不能重复提交处置，请重新核对' };
    if (error instanceof InvalidReviewCorrectionError) return { status: 'rejected', reason: 'invalid_scope', message: '修正结论无效，请重新编辑后提交' };
    if (error instanceof UnknownConfirmationRequestError) return { status: 'rejected', reason: 'invalid_scope', message: '这次审阅已提交或已过期，请重新打开当前进度' };
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
    let baseline = 0;
    try {
      const loaded = await loadStore(ref, header);
      baseline = loaded.store.eventLog.list().length;
      const result = await leg({
        store: loaded.store,
        turnStore: loaded.turnStore,
        signal: controller.signal,
        publishNew: () => { baseline = publishFrom(loaded.store, publish, baseline); },
      });
      const outcome = mapResult(result, ref);
      releaseActive(ref.caseId, ref.sessionId, outcome);
      return outcome;
    } catch (error) {
      if (controller.signal.aborted || error === CANCELED_SENTINEL) {
        const outcome: WorkCommandOutcome = { status: 'canceled', ref };
        releaseActive(ref.caseId, ref.sessionId, outcome);
        return outcome;
      }
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
    let scenario: ReturnType<typeof getProductionScenario>;
    let runInput: ReturnType<typeof buildS3RunInput>;
    let runRegistries: PackageRegistries = deps.registriesForCase(input.caseId);
    try {
      const materials: StoredMaterial[] = await resolveSessionMaterials(deps.materialResolver, input.caseId, input.materialRefs);
      // 场景身份只从**本 matter 生效 registry**取（全局集不作执行授权）。
      scenario = getProductionScenario(deps.registriesForCase(input.caseId), input.scenarioId, deps.launchableScenarioIds);
      const materialInputs: MaterialInput[] = toMaterialInputs(materials);
      // 会话作用域收窄（缺省恒等）：把本次运行的就绪材料闭集编进 registry，供基线批处理的
      // 逐项完整性裁决在产物成形之前生效。
      runRegistries = deps.scopeRegistriesForRun
        ? deps.scopeRegistriesForRun(deps.registriesForCase(input.caseId), {
            scenarioId: input.scenarioId,
            materialIds: materials.map((item) => item.materialId),
          })
        : deps.registriesForCase(input.caseId);
      if (input.scenarioId === S3_SCENARIO_ID) {
        // CONTRACT-OUTPUT-TRUTH-1：materialRefs[0] 就是用户显式选定的主合同，CaseFile 从同一
        // 输入机械派生——S3 声明了 legal.CaseFile input，此前一直收到空 artifacts。
        const primaryMaterialId = input.materialRefs[0];
        if (primaryMaterialId === undefined) throw new MissingPrimaryContractError();
        const caseFile = deriveS3CaseFile(input.caseId, primaryMaterialId, materials);
        runInput = buildS3RunInput({ scenario, subject: input.subject ?? undefined, materials: materialInputs, caseFile });
      } else {
        // LEGAL-FIVE-FACES-1：无预检场景（S1 阅卷 / S2 矩阵）——零工具输入，声明要 CaseFile 才带，
        // 且一律 supporting（无主合同语义即不造一个）。
        const needsCaseFile = scenario.inputArtifacts.includes('legal.CaseFile');
        runInput = buildIntakeRunInput({
          scenario,
          materials: materialInputs,
          ...(needsCaseFile ? { caseFile: deriveCaseFileFromMaterials(input.caseId, materials) } : {}),
        });
      }
    } catch (error) {
      controllers.delete(ref.sessionId);
      const outcome = mapError(error, ref);
      releaseActive(ref.caseId, ref.sessionId, outcome);
      return outcome;
    }
    return runLeg(ref, publish, async ({ store, turnStore, signal, publishNew }) => {
      const route = { ...store.snapshot().modelRoute };
      const scenarioDeps = createLegalS3ScenarioDeps({
        store,
        tools,
        turnRunner: deps.makeTurnRunner(turnStore, { ...route }),
        expectedModelRoute: { ...route },
        ledger: createEvidenceLedger(),
        registries: runRegistries,
        signal,
        afterCommit: publishNew,
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
      {
        kind: 'start',
        caseId: ref.caseId,
        scenarioId: S3_SCENARIO_ID,
        materialRefs: [],
        modelRoute: { providerId: '', modelId: '', reasoning: 'standard' },
        subject: null,
      },
      ref.sessionId,
      { limits: {}, costBasis: { currency: 'USD', assumptions: [] }, consumed: { steps: 0, toolCalls: 0, executionMs: 0, estimatedUsd: 0, costCoverage: 'partial' } },
    );
    return runLeg(ref, publish, async ({ store, turnStore, signal, publishNew }) => {
      // 残缺会话（turn_linked 无 terminal）不得当 paused 续行：显式拒绝，须以全新 start 身份重发（ADR-010）。
      if (store.interruptedTurns().length > 0) {
        throw new UnknownReviewItemError('__interrupted__');
      }
      const resumeInput = build(store);
      // 续行的场景身份**只认账本头**（信封是持久真源）；此前写死 S3，非 S3 会话续行会以错误场景
      // 声明重放——闭集化后必须逐字取回。
      const scenario = getProductionScenario(deps.registriesForCase(ref.caseId), store.snapshot().scenarioId, deps.launchableScenarioIds);
      const route = { ...store.snapshot().modelRoute };
      const scenarioDeps = createLegalS3ScenarioDeps({
        store,
        tools,
        turnRunner: deps.makeTurnRunner(turnStore, { ...route }),
        expectedModelRoute: { ...route },
        ledger: createEvidenceLedger(),
        registries: deps.registriesForCase(ref.caseId),
        signal,
        afterCommit: publishNew,
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

  /** 越出本 matter 授权面的拒绝（闭集内既有 reason，不扩 wire）。 */
  function outOfScopeOutcome(): WorkCommandOutcome {
    return { status: 'rejected', reason: 'invalid_scope', message: OUT_OF_MATTER_SCOPE_MESSAGE };
  }

  /**
   * 续行侧的 matter 授权：目标会话的场景必须在该 matter 当下生效 registry 内。
   *
   * 只读账本头——`host.read` 是只读的，不落任何 effect（ADR-015：read-only replay 与既有账本
   * 读取不因卸载被禁止）。账本读不到时退回更宽的判据「这枚 matter 有没有任何可执行的
   * production 场景」，零绑定/仅绑定 catalog-only 包/失效绑定于是同样拦在 effect 之前。
   */
  async function resumeAuthorized(ref: WorkSessionRef): Promise<boolean> {
    const registries = deps.registriesForCase(ref.caseId);
    let scenarioId: string | undefined;
    try {
      const existing = await deps.host.read(ref);
      if (existing.found) scenarioId = readWorkStateEnvelope(existing.bytes).scenarioId;
    } catch {
      scenarioId = undefined;
    }
    if (scenarioId !== undefined) return registries.scenarios.get(scenarioId) !== undefined;
    return deps.verticalScenarioIds.some((id) => registries.scenarios.get(id) !== undefined);
  }

  function conflictOutcome(): WorkCommandOutcome {
    return { status: 'rejected', reason: 'command_conflict', message: '此次审查请求正在处理，请勿重复发起' };
  }

  /** commandId first-wins 闸门：命中既有 → 复用；异 payload（含跨 kind）→ command_conflict。 */
  function existingCommand(
    commandId: string,
    payload: CommandPayload,
  ): { record: CommandRecord } | { reject: WorkCommandOutcome; sessionId: string } | undefined {
    const payloadKey = stableKey(payload);
    const existing = commands.get(commandId);
    if (!existing) return undefined;
    if (existing.payloadKey === payloadKey) return { record: existing };
    return { reject: conflictOutcome(), sessionId: existing.sessionId };
  }

  function beginStart(commandId: string, rawPayload: StartPayload, publish: (event: SessionEvent) => void): { sessionId: string; done: Promise<WorkCommandOutcome> } {
    const payload = normalizeStartPayload(rawPayload);
    const prior = existingCommand(commandId, payload);
    if (prior) {
      if ('record' in prior) return { sessionId: prior.record.sessionId, done: prior.record.done };
      return { sessionId: prior.sessionId, done: Promise.resolve(prior.reject) };
    }
    const payloadKey = stableKey(payload);
    const sessionId = mintSessionId();
    if (!deps.launchableScenarioIds.includes(payload.scenarioId)) {
      const done = Promise.resolve<WorkCommandOutcome>({
        status: 'rejected',
        reason: 'invalid_scope',
        message: '这个场景当前还不能在本案启动',
      });
      commands.set(commandId, { sessionId, payloadKey, done });
      return { sessionId, done };
    }
    // ADR-015 决定三（2026-08-08）：执行授权取自本 matter 当下绑定，早于 provider、
    // WorkState CAS、journal append 与确认 effect——拒绝时 effect 恰为零。
    if (deps.registriesForCase(payload.caseId).scenarios.get(payload.scenarioId) === undefined) {
      const done = Promise.resolve<WorkCommandOutcome>(outOfScopeOutcome());
      commands.set(commandId, { sessionId, payloadKey, done });
      return { sessionId, done };
    }
    // ADR-010 决定一：production composition 未装配时返回闭集中的 not_configured。
    // 拒绝结果仍进入 process-local first-wins 表，同 id 不得在配置变化后变成第二个命令。
    if (deps.isConfigured && !deps.isConfigured()) {
      const done = Promise.resolve<WorkCommandOutcome>({ status: 'rejected', reason: 'not_configured', message: NOT_CONFIGURED_MESSAGE });
      commands.set(commandId, { sessionId, payloadKey, done });
      return { sessionId, done };
    }
    if (activeByCase.has(payload.caseId)) {
      const done = Promise.resolve<WorkCommandOutcome>({
        status: 'rejected',
        reason: 'case_busy',
        message: '本案已有进行中的工作，请先等待或停止当前运行',
      });
      commands.set(commandId, { sessionId, payloadKey, done });
      return { sessionId, done };
    }
    const frozenRoute = { ...payload.modelRoute };
    const frozenPayload: StartPayload = { ...payload, modelRoute: frozenRoute };
    const runtimeBudget = deps.createRuntimeBudget({ ...frozenRoute });
    activeByCase.set(payload.caseId, sessionId);
    const done = runStart({ ...frozenPayload, commandId }, sessionId, structuredClone(runtimeBudget), publish);
    const record: CommandRecord = { sessionId, payloadKey, done };
    commands.set(commandId, record);
    return { sessionId, done };
  }

  return {
    startWithPreflight(input, publish) {
      return beginStart(input.commandId, {
        kind: 'start',
        caseId: input.caseId,
        scenarioId: S3_SCENARIO_ID,
        materialRefs: input.materialRefs,
        modelRoute: input.modelRoute,
        subject: input.subject,
      }, publish);
    },

    start(command: StartWorkCommand, publish) {
      // 通用 wire 无 preflight slot：S3 缺显式主体 → buildS3RunInput 抛 → rejected/invalid_scope（不默认补全）。
      return beginStart(command.commandId, {
        kind: 'start',
        caseId: command.caseId,
        scenarioId: command.scenarioId,
        materialRefs: command.materialRefs,
        modelRoute: command.modelRoute,
        subject: null,
      }, publish);
    },

    resolveReview(input, publish) {
      const payload: ResolveReviewPayload = {
        kind: 'resolve_review',
        caseId: input.caseId,
        sessionId: input.sessionId,
        requestId: input.requestId,
        resolution: normalizeReviewResolution(input.resolution),
      };
      const prior = existingCommand(input.commandId, payload);
      if (prior) return 'record' in prior ? prior.record.done : Promise.resolve(prior.reject);
      // 垂类审阅处置会继续垂类执行：与 start 同一条授权判据，落在任何 effect 之前。
      // 授权先于 `runResume` 求值（`.then` 里才构造），故拒绝时一次 effect 都不发生；
      // 同时 `done` 仍是**同一枚** Promise，first-wins 的身份判据一字不动。
      const done = resumeAuthorized({ caseId: payload.caseId, sessionId: payload.sessionId }).then(
        (authorized) => (authorized
          ? runResume(
            { caseId: payload.caseId, sessionId: payload.sessionId },
            payload.requestId,
            (store) => mapReviewResolutionToResume(payload.resolution, latestRiskList(store), deps.actor),
            publish,
          )
          : outOfScopeOutcome()),
      );
      commands.set(input.commandId, {
        sessionId: payload.sessionId,
        payloadKey: stableKey(payload),
        done,
      });
      return done;
    },

    async resume(command: ResumeWorkCommand, publish) {
      // 续行同样须过 matter 授权：卸载后不得凭全局集把一条垂类会话接着跑下去。
      if (!(await resumeAuthorized({ caseId: command.caseId, sessionId: command.sessionId }))) return outOfScopeOutcome();
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

    async replay(query): Promise<WorkReplayResult> {
      const ref = { caseId: query.caseId, sessionId: query.sessionId };

      // 宿主读取拒绝或未分类异常 → unavailable。宿主明确说「没有」才是 found:false，那不是异常。
      let existing: Awaited<ReturnType<WorkStateHostPort['read']>>;
      try {
        existing = await deps.host.read(ref);
      } catch (error) {
        throw new WorkReplayError('unavailable', readReplayMessage(error, '暂时无法读取上次审查进度'));
      }
      if (!existing.found) {
        return { found: false, ref, phase: 'interrupted', events: [] };
      }

      let envelope: WorkStateEnvelopeV1;
      try {
        envelope = readWorkStateEnvelope(existing.bytes);
      } catch (error) {
        if (error instanceof UnknownEnvelopeVersionError) {
          throw new WorkReplayError('unsupported_version', readReplayMessage(error, '上次审查进度由更新版本写入'));
        }
        if (error instanceof CorruptEnvelopeError) {
          throw new WorkReplayError('corrupt', readReplayMessage(error, '上次审查进度已损坏'));
        }
        throw new WorkReplayError('unavailable', readReplayMessage(error, '暂时无法读取上次审查进度'));
      }

      // 读出 envelope 之后才显式比较 query ref 与 header ref；只有该不等才是 ref_mismatch。
      if (envelope.caseId !== ref.caseId || envelope.sessionId !== ref.sessionId) {
        throw new WorkReplayError(
          'ref_mismatch',
          `读到的审查进度不属于本次查询（信封 ${envelope.caseId}/${envelope.sessionId}）`,
        );
      }

      // artifact isolation 是账本外层的隔离事实，不伪装 corrupt：hydrate 照常返回可用事件。
      const hydrated = hydrateStoredEvents(envelope.events, deps.codec);
      const events = hydrated.events.filter((event) => event.seq > (query.afterSeq ?? -1));
      return {
        found: true,
        ref,
        phase: phaseFromEnvelope(hydrated.events, envelope.turnEntries),
        events,
        // 防御性复制：调用方拿到的数组/字符串不与信封解析结果共享引用。
        materialRefs: [...envelope.materialRefs],
        sessionCreatedAt: envelope.createdAt,
      };
    },
  };
}

function readReplayMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
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
