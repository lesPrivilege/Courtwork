import type { RevisionEvent, SourceAnchor } from '@courtwork/schemas';
import { RevisionEventSchema } from '@courtwork/schemas';
import type { ArtifactSchemaRegistry, ProjectionRegistry, ScenarioRuntime } from '@courtwork/registry';
import type { ToolExecutor } from '@courtwork/tools';
import type { EventLog } from '../events/event-log.js';
import type { ConfirmationActor, ConfirmationInstrumentation } from '../events/types.js';
import type { EvidenceLedger } from '../evidence/grade.js';
import type { ToolRegistry } from '../tools/tool-registry.js';
import type { ConfirmationStore, PendingConfirmation } from '../session/confirmation-store.js';
import type { RevisionEventStore } from '../revision/revision-store.js';
import { applyJsonPointer } from '../revision/json-pointer.js';
import { deriveTodoSnapshot } from './todo-snapshot.js';
import { derivePendingProjection } from './pending-projection.js';
import {
  createRuntimeGuard,
  RuntimeBudgetConfigurationError,
  RuntimeLimitExceededError,
  type RuntimeBudgetPort,
  type RuntimeGuard,
  type RuntimeLimits,
} from './runtime-limits.js';
import { estimateCostUsd, PRICE_TABLE } from '@courtwork/provider/pricing';
import type { GenerationNotice, ProviderUsage } from '@courtwork/provider/types';
import { assembleScenarioRequest } from '../assembly/assemble.js';
import type { MaterialInput } from '../assembly/segments.js';
import {
  resolveDraftArtifact,
  resolveDraftArtifactWithPruning,
  type MaterialTextLayer,
} from '../citation/resolver.js';
import type { CitationFailure } from '@courtwork/schemas';
import type { CitationStats } from '../events/types.js';
import type { TurnRunnerPort } from '../turn/turn-runner.js';
import type { PersistedTurn } from '../turn/types.js';
import type { WorkModelRoute, WorkRuntimeBudget } from '../work-state/envelope.js';

export interface WorkTurnIdentity {
  turnId: string;
  providerRequestId: string;
}

export interface WorkTurnIdentityContext {
  sessionId: string;
  scenarioId: string;
  stepId: string;
  artifactType: string;
  attempt: number;
}

export type WorkTurnIdentityFactory = (context: WorkTurnIdentityContext) => WorkTurnIdentity;

export interface ScenarioExecutorDeps {
  tools: ToolRegistry;
  toolExecutor: ToolExecutor;
  turnRunner: TurnRunnerPort;
  createTurnIdentity?: WorkTurnIdentityFactory;
  signal?: AbortSignal;
  eventLog: EventLog;
  confirmationStore: ConfirmationStore;
  revisionStore: RevisionEventStore;
  ledger: EvidenceLedger;
  /**
   * 注入式 artifact schema registry（ABI 拍板①）：中央 ARTIFACT_SCHEMAS 退役。
   * 穷尽性保障从编译期 Record 迁到准入闭合（引用必在包内解析）+ 本执行器的
   * 缺失即抛（UnknownArtifactTypeError）——F-4 病根的注入式根治。
   */
  artifacts: ArtifactSchemaRegistry;
  /** 投影 registry（六段组装的续行投影段数据源）。 */
  projections: ProjectionRegistry;
  now?: () => string;
  /** 无持久 store 的纯逻辑测试/demo 兼容入口；与 runtimeBudget 同时注入会显式拒绝。 */
  limits?: RuntimeLimits;
  /** production 唯一预算真源；由 WorkStateStore.runtimeBudget 注入。 */
  runtimeBudget?: RuntimeBudgetPort;
  /** production 从同一信封冻结路由注入；不得从 UI/Settings 在 resume 时重读。 */
  expectedModelRoute?: Pick<WorkModelRoute, 'providerId' | 'modelId'>;
  nowMs?: () => number;
  /**
   * durable 屏障（WORK-STORE-1 / ADR-010 决定二）：在每个 durable-before-effect 顺序点，把当前
   * whole-envelope 持久落盘后才返回。生产由 WorkStateStore.commit 注入；缺省（纯逻辑单测）为 no-op，
   * 此时 store 视图仍是内存真源、行为与历史一致。effect（provider 调用、artifact/确认发布、
   * revision 记录）严格发生在对应屏障 await 之后——顺序反例（先 effect 后落盘）必须触红。
   */
  persistBarrier?: () => Promise<void>;
}

export interface ScenarioRunInput {
  inputArtifacts: Partial<Record<string, unknown>>;
  toolInputs: Record<string, unknown>;
  /** 容器材料（阅读视图全文 + 哈希），经会话与语料段在显式数据边界内注入。 */
  materials?: MaterialInput[];
}

/** 场景终局失败原因（对齐 ScenarioFailedEvent.reason，映射为 typed WorkCommandOutcome）。 */
export type ScenarioFailureReason = 'invalid_output' | 'runtime_limit' | 'configuration' | 'internal';

export type ScenarioRunResult =
  | { status: 'completed'; sessionId: string; artifacts: Partial<Record<string, unknown>> }
  | { status: 'paused'; sessionId: string; requestId: string }
  | { status: 'failed'; sessionId: string; reason: ScenarioFailureReason; message: string; retryable: false };

export class UnknownToolError extends Error {
  constructor(scenarioId: string, toolId: string) {
    super(`场景 ${scenarioId} 引用了未在工具注册表中登记的工具 "${toolId}"`);
    this.name = 'UnknownToolError';
  }
}

export class UnknownArtifactTypeError extends Error {
  constructor(scenarioId: string, artifactType: string) {
    super(`场景 ${scenarioId} 声明的产出类型 "${artifactType}" 未在 artifact schema registry 注册——包准入闭合被绕过或装配缺漏`);
    this.name = 'UnknownArtifactTypeError';
  }
}

export class ConfirmationPolicyViolationError extends Error {
  constructor(scenarioId: string, toolId: string, sideEffect: string) {
    super(
      `场景 ${scenarioId} 绑定工具 "${toolId}" 的副作用类为 ${sideEffect}——确认前工具只允许纯读取或 ADR-004 无损级 copy/mkdir，core 强制、包无权放宽`,
    );
    this.name = 'ConfirmationPolicyViolationError';
  }
}

function toolPermittedBeforeConfirmation(toolId: string, sideEffect: string): boolean {
  if (sideEffect === 'pure_read') return true;
  return sideEffect === 'file_write' && (toolId === 'copy-file' || toolId === 'mkdir');
}

export class GenerationValidationError extends Error {
  constructor(scenarioId: string, artifactType: string, issues: string) {
    super(`场景 ${scenarioId} 生成的 ${artifactType} 未通过 schema 校验：\n${issues}`);
    this.name = 'GenerationValidationError';
  }
}

export class WorkTurnIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkTurnIdentityError';
  }
}

export class WorkTurnFailedError extends Error {
  constructor(
    readonly turn: Extract<PersistedTurn, { status: 'failed' }>,
    readonly context: WorkTurnIdentityContext,
  ) {
    super(`场景 ${context.scenarioId} 的 ${context.artifactType} 模型步骤失败：${turn.failure.message}`);
    this.name = 'WorkTurnFailedError';
  }
}

class ScenarioTerminalizedError extends Error {
  constructor(readonly result: Extract<ScenarioRunResult, { status: 'failed' }>) {
    super(result.message);
    this.name = 'ScenarioTerminalizedError';
  }
}

export class UnknownConfirmationRequestError extends Error {
  constructor(requestId: string) {
    super(`未找到确认请求 "${requestId}"：可能已被处理或已过期`);
    this.name = 'UnknownConfirmationRequestError';
  }
}

/** toolIds 声明的全部工具在产出序列开始前一次性执行完毕（registry/SPEC.md 已补注的执行语义）。 */
async function runTools(
  scenario: ScenarioRuntime,
  toolInputs: Record<string, unknown>,
  deps: ScenarioExecutorDeps,
  guard: RuntimeGuard,
): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};
  for (const toolId of scenario.toolIds) {
    const binding = deps.tools.get(toolId);
    if (!binding) throw new UnknownToolError(scenario.id, toolId);
    // AUDIT-SEAL-1：toolIds 在任何 confirmationPolicy 模式下都会于门禁前执行，
    // 因此一律先过 sideEffect 门。只放行纯读取与 ADR-004 无损级 copy/mkdir；
    // 其他 effect 不能由事后 gate 追认。
    const sideEffect = binding.sideEffect ?? 'pure_read';
    if (!toolPermittedBeforeConfirmation(toolId, sideEffect)) {
      throw new ConfirmationPolicyViolationError(scenario.id, toolId, sideEffect);
    }
    guard.checkToolCall();
    // prospective tool call 已获准并 stage 后，须先随 whole-envelope CAS 落账，才可发生工具 effect。
    await deps.persistBarrier?.();
    const envelope = await deps.toolExecutor.execute(binding.tool, toolInputs[toolId]);
    guard.checkTime();
    results[toolId] = envelope;
    if (envelope.verified) {
      deps.ledger.record(toolId, { grade: binding.grade, sourceId: envelope.source, confirmed: false });
    } else {
      // 工具契约本身已经把失败降级为结构化的 verified:false（不抛异常）——这里只是把
      // "发生过一次工具级降级"显式发布到事件流（docs/architecture/system.md 长任务协议②，step_failed）。
      deps.eventLog.append({ type: 'step_failed', scope: 'tool', toolId, reason: envelope.reason, message: envelope.message });
    }
  }
  return results;
}

/** 本次产出对应的声明步 id（寻址制地址源）；声明未给步的类型走确定性缺省。 */
function stepIdForArtifact(scenario: ScenarioRuntime, artifactType: string): string {
  return scenario.steps.find((step) => step.artifact === artifactType)?.id ?? `produce-${artifactType}`;
}

/** 材料文本层：块由 reading-view 段落派生（MaterialInput.blocks），无块材料不参与公证。 */
function layersFromMaterials(materials: MaterialInput[]): MaterialTextLayer[] {
  return materials
    .filter((material) => (material.blocks ?? []).length > 0)
    .map((material) => ({ fileId: material.fileId, blocks: material.blocks! }));
}

function addUsageSlot(x: number | undefined, y: number | undefined): number | undefined {
  // unknown 传染：任一操作数未知则和未知，绝不用单边已知值冒充和，也不折叠为 0。
  return x === undefined || y === undefined ? undefined : x + y;
}

/**
 * 两遍生成计量求和（USAGE-LEDGER-1）。数值槽位遇 unknown 显式传染；派生聚合不合成 rawUsage
 * ——聚合是派生总量，不存在单一 provider 原始响应真源。仅一侧计量在场时原样返回该侧。
 */
export function sumUsage(a?: ProviderUsage, b?: ProviderUsage): ProviderUsage | undefined {
  if (!a) return b;
  if (!b) return a;
  return {
    inputTokens: addUsageSlot(a.inputTokens, b.inputTokens),
    outputTokens: addUsageSlot(a.outputTokens, b.outputTokens),
    cacheHitInputTokens: addUsageSlot(a.cacheHitInputTokens, b.cacheHitInputTokens),
    cacheMissInputTokens: addUsageSlot(a.cacheMissInputTokens, b.cacheMissInputTokens),
    reasoningOutputTokens: addUsageSlot(a.reasoningOutputTokens, b.reasoningOutputTokens),
  };
}

function webCryptoRandomUUID(): string {
  if (typeof globalThis.crypto?.randomUUID !== 'function') {
    throw new Error('当前运行环境不支持 Web Crypto randomUUID，拒绝以时间戳或弱随机数降级');
  }
  return globalThis.crypto.randomUUID();
}

function defaultTurnIdentity(): WorkTurnIdentity {
  return { turnId: webCryptoRandomUUID(), providerRequestId: webCryptoRandomUUID() };
}

function assertFreshTurnIdentity(identity: unknown, deps: ScenarioExecutorDeps): asserts identity is WorkTurnIdentity {
  if (
    typeof identity !== 'object'
    || identity === null
    || Array.isArray(identity)
    || typeof (identity as Partial<WorkTurnIdentity>).turnId !== 'string'
    || typeof (identity as Partial<WorkTurnIdentity>).providerRequestId !== 'string'
  ) {
    throw new WorkTurnIdentityError('Work turnId/providerRequestId 必须是非空字符串');
  }
  const candidate = identity as WorkTurnIdentity;
  if (
    candidate.turnId.trim().length === 0
    || candidate.providerRequestId.trim().length === 0
    || candidate.turnId === candidate.providerRequestId
  ) {
    throw new WorkTurnIdentityError('Work turnId/providerRequestId 必须非空且彼此不同');
  }
  const linked = deps.eventLog.list().filter((event) => event.type === 'turn_linked');
  if (linked.some((event) => event.turnId === candidate.turnId)) {
    throw new WorkTurnIdentityError(`Work turnId 重复：${candidate.turnId}`);
  }
  if (linked.some((event) => event.providerRequestId === candidate.providerRequestId)) {
    throw new WorkTurnIdentityError(`Work providerRequestId 重复：${candidate.providerRequestId}`);
  }
}

function currentPriceBasis(): WorkRuntimeBudget['costBasis'] {
  return {
    currency: 'USD',
    priceTableVersion: PRICE_TABLE.version,
    priceTableEffectiveAt: PRICE_TABLE.effectiveAt,
    assumptions: [...PRICE_TABLE.assumptions],
  };
}

function priceTableMatches(budget: WorkRuntimeBudget): boolean {
  return budget.costBasis.priceTableVersion === PRICE_TABLE.version
    && budget.costBasis.priceTableEffectiveAt === PRICE_TABLE.effectiveAt;
}

function costConfigurationMessage(budget: WorkRuntimeBudget, detail: string): string {
  const assumptions = budget.costBasis.assumptions.length > 0
    ? budget.costBasis.assumptions.join('；')
    : '未提供';
  return [
    `成本预算配置阻断：${detail}`,
    `当前已知估算 $${budget.consumed.estimatedUsd.toFixed(6)}`,
    `覆盖状态 ${budget.consumed.costCoverage}`,
    `冻结假设：${assumptions}`,
    '下一步：核对该会话冻结的模型与价目版本；如成本覆盖无法补全，请新建会话并重新确认预算配置',
  ].join('；');
}

function failedResult(
  deps: ScenarioExecutorDeps,
  reason: 'runtime_limit' | 'configuration',
  message: string,
): Extract<ScenarioRunResult, { status: 'failed' }> {
  return {
    status: 'failed',
    sessionId: deps.eventLog.sessionId,
    reason,
    message,
    retryable: false,
  };
}

function appendScenarioFailure(
  deps: ScenarioExecutorDeps,
  reason: 'runtime_limit' | 'configuration',
  message: string,
): void {
  deps.eventLog.append({
    type: 'scenario_failed',
    scope: 'scenario',
    reason,
    message,
    retryable: false,
  });
}

function assertPaidTurnPreflight(guard: RuntimeGuard): void {
  const budget = guard.snapshot();
  if (budget.limits.maxUsd === undefined) return;
  if (budget.consumed.costCoverage === 'partial') {
    throw new RuntimeBudgetConfigurationError('既有 paid Turn 成本覆盖不完整');
  }
  if (
    !budget.costBasis.priceTableVersion
    || !budget.costBasis.priceTableEffectiveAt
    || !priceTableMatches(budget)
  ) {
    throw new RuntimeBudgetConfigurationError('冻结价目版本/核验时点在当前进程中不可用或不匹配');
  }
}

async function runWorkTurn(
  context: WorkTurnIdentityContext,
  request: Parameters<TurnRunnerPort['run']>[0]['request'],
  deps: ScenarioExecutorDeps,
  guard: RuntimeGuard,
): Promise<Extract<PersistedTurn, { status: 'completed' }>> {
  // paid effect 的配置门必须早于 turn identity/link/provider；unknown 不能被当作零再多打一笔。
  assertPaidTurnPreflight(guard);
  const identity = (deps.createTurnIdentity ?? defaultTurnIdentity)(context);
  assertFreshTurnIdentity(identity, deps);
  deps.eventLog.append({
    type: 'turn_linked',
    stepId: context.stepId,
    artifactType: context.artifactType,
    attempt: context.attempt,
    turnId: identity.turnId,
    providerRequestId: identity.providerRequestId,
  });
  // 屏障②（ADR-010 决定二第 2 条）：turn_linked 成功持久后才能调用 Turn/provider。
  // 这是 durable-before-effect 的关键点——provider 调用严格发生在本次落盘之后。
  await deps.persistBarrier?.();
  const turn = await deps.turnRunner.run({
    ...identity,
    request,
    ...(deps.signal ? { signal: deps.signal } : {}),
  });
  if (turn.turnId !== identity.turnId || turn.providerRequestId !== identity.providerRequestId) {
    throw new WorkTurnIdentityError('TurnRunnerPort 返回的终态身份与 Work 链接身份不一致');
  }

  const routeMismatch = deps.expectedModelRoute !== undefined
    && (
      turn.providerId !== deps.expectedModelRoute.providerId
      || turn.modelId !== deps.expectedModelRoute.modelId
    );

  if (turn.status === 'failed') {
    deps.eventLog.append({
      type: 'step_failed',
      scope: 'model',
      stepId: context.stepId,
      artifactType: context.artifactType,
      attempt: context.attempt,
      turnId: turn.turnId,
      providerRequestId: turn.providerRequestId,
      reason: turn.failure.kind,
      message: turn.failure.message,
      retryable: turn.failure.retryable,
    });
  }

  let runtimeLimit: RuntimeLimitExceededError | undefined;
  if (routeMismatch) {
    guard.markCostCoveragePartial();
  } else {
    const frozen = guard.snapshot();
    const estimate = priceTableMatches(frozen)
      ? estimateCostUsd(turn.providerId, turn.modelId, turn.usage)
      : undefined;
    if (estimate === undefined) {
      guard.markCostCoveragePartial();
    } else {
      try {
        guard.checkUsd(estimate.usd);
      } catch (error) {
        if (error instanceof RuntimeLimitExceededError) runtimeLimit = error;
        else throw error;
      }
    }
  }
  try {
    guard.checkTime();
  } catch (error) {
    if (error instanceof RuntimeLimitExceededError) runtimeLimit ??= error;
    else throw error;
  }

  let terminalized: Extract<ScenarioRunResult, { status: 'failed' }> | undefined;
  if (routeMismatch) {
    const budget = guard.snapshot();
    const message = costConfigurationMessage(
      budget,
      `Turn terminal 路由 ${turn.providerId}/${turn.modelId} 与冻结路由 ${deps.expectedModelRoute!.providerId}/${deps.expectedModelRoute!.modelId} 不匹配`,
    );
    appendScenarioFailure(deps, 'configuration', message);
    terminalized = failedResult(deps, 'configuration', message);
  } else if (runtimeLimit) {
    appendScenarioFailure(deps, 'runtime_limit', runtimeLimit.message);
    terminalized = failedResult(deps, 'runtime_limit', runtimeLimit.message);
  }

  // terminal、最新预算、step_failed（如有）与 scenario_failed（如有）恰好一次 whole-envelope CAS。
  await deps.persistBarrier?.();

  if (terminalized) throw new ScenarioTerminalizedError(terminalized);
  if (turn.status === 'failed') throw new WorkTurnFailedError(turn, context);
  return turn;
}

async function generateArtifact(
  scenario: ScenarioRuntime,
  artifactType: string,
  context: {
    inputArtifacts: Partial<Record<string, unknown>>;
    toolResults: Record<string, unknown>;
    producedSoFar: Partial<Record<string, unknown>>;
    materials: MaterialInput[];
  },
  deps: ScenarioExecutorDeps,
  guard: RuntimeGuard,
): Promise<{
  artifact: unknown;
  usage?: ProviderUsage;
  notices?: GenerationNotice[];
  citationStats?: CitationStats;
}> {
  const entry = deps.artifacts.get(artifactType);
  if (!entry) throw new UnknownArtifactTypeError(scenario.id, artifactType);
  // 引用闭环：descriptor 带 draftSchema 时模型侧按草稿形状出格（引语无坐标），
  // 铸锚发生在 resolver；无草稿声明则最终 schema 即模型侧。
  const modelSchema = entry.descriptor.draftSchema ?? entry.descriptor.schema;
  const stepId = stepIdForArtifact(scenario, artifactType);

  // 六段组装（HARNESS-1）：契约→声明→租户→投影→会话与语料→视图映射。
  // producedSoFar 经续行投影段进 context（声明式投影，非原文回放）；
  // todo 复述归视图映射段尾（docs/architecture/system.md 技巧的正名归宿）。
  const generateOnce = async (attempt: number, repairFailures?: CitationFailure[]) => {
    const task: Record<string, unknown> = {
      artifactType,
      inputArtifacts: context.inputArtifacts,
      toolResults: context.toolResults,
    };
    if (repairFailures !== undefined) {
      // 受限修复重试（docs/architecture/schema-engineering.md 校准语义）：携原判与失败原因，只修引语不重写判断。
      task.repair = {
        instruction: '以下引语未通过原文精确匹配公证。只修正这些引语（必须与材料原文一字不差、且在声明的页/块内唯一），其余判断与字段保持不变。',
        failures: repairFailures,
      };
    }
    const assembled = assembleScenarioRequest({
      scenario,
      stepId,
      artifactType,
      modelSchema,
      projection: {
        ledgerSeq: deps.eventLog.list().length,
        artifacts: context.producedSoFar,
        // PROJECTION-RESUME-1：账本既有失败经确定性归并入「未产出/待执行」子节——续行会话
        // 由此分清「曾失败」与「没开始」（interrupted/停门态归 Turn journal/停门持有方供给）。
        pending: derivePendingProjection(deps.eventLog.list()),
      },
      materials: context.materials,
      taskInstruction: JSON.stringify(task),
      todo: deriveTodoSnapshot(scenario, context.producedSoFar),
      registries: { projections: deps.projections, artifacts: deps.artifacts },
    });
    const turn = await runWorkTurn({
      sessionId: deps.eventLog.sessionId,
      scenarioId: scenario.id,
      stepId,
      artifactType,
      attempt,
    }, assembled.request, deps, guard);
    // runWorkTurn 已把 terminal 与最新预算（及可能的失败事件）同一次屏障持久；返回后才可解析。
    guard.checkTime();
    let parsed: unknown;
    try {
      parsed = JSON.parse(turn.assistantMessage);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new GenerationValidationError(scenario.id, artifactType, `provider 返回的内容不是合法 JSON：${reason}`);
    }
    // 按址收货（四知·知回填）：信封 target 以 literal 锁死，错址与形状错误同层拒收。
    const result = assembled.envelopeSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
      throw new GenerationValidationError(scenario.id, artifactType, issues);
    }
    const envelope = result.data as { target: { stepId: string; artifactType: string }; artifact: unknown };
    return { draft: envelope.artifact, usage: turn.usage, notices: turn.notices };
  };

  const first = await generateOnce(1);
  const binding = entry.descriptor.citationBinding;
  if (!binding) {
    return { artifact: first.draft, usage: first.usage, notices: first.notices };
  }

  // 引用闭环三拍：首过公证 → 拒收即受限修复重试一轮 → 终局剪枝（不收敛入 out_of_coverage）。
  const layers = layersFromMaterials(context.materials);
  const firstPass = resolveDraftArtifact({ draft: first.draft, binding, layers });
  if (firstPass.status === 'resolved') {
    const final = entry.descriptor.schema.safeParse(firstPass.artifact);
    if (!final.success) {
      const issues = final.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
      throw new GenerationValidationError(scenario.id, artifactType, `公证后的最终形未过 schema：\n${issues}`);
    }
    return {
      artifact: final.data,
      usage: first.usage,
      notices: first.notices,
      citationStats: {
        claims: firstPass.stats.claims,
        firstPassResolved: firstPass.stats.resolved,
        retryRounds: 0,
        resolvedAfterRetry: firstPass.stats.resolved,
        outOfCoverage: 0,
      },
    };
  }

  const second = await generateOnce(2, firstPass.failures);
  const pruned = resolveDraftArtifactWithPruning({ draft: second.draft, binding, layers });
  const final = entry.descriptor.schema.safeParse(pruned.artifact);
  if (!final.success) {
    const issues = final.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new GenerationValidationError(scenario.id, artifactType, `剪枝后的最终形未过 schema：\n${issues}`);
  }
  return {
    artifact: final.data,
    usage: sumUsage(first.usage, second.usage),
    notices: [...(first.notices ?? []), ...(second.notices ?? [])],
    citationStats: {
      claims: firstPass.stats.claims,
      firstPassResolved: firstPass.stats.resolved,
      retryRounds: 1,
      resolvedAfterRetry: pruned.stats.resolved,
      outOfCoverage: pruned.outOfCoverage.length,
    },
  };
}

interface SequenceState {
  sessionId: string;
  scenarioId: string;
  toolResults: Record<string, unknown>;
  producedSoFar: Partial<Record<string, unknown>>;
  inputArtifacts: Partial<Record<string, unknown>>;
  materials: MaterialInput[];
}

function findGate(scenario: ScenarioRuntime, artifactType: string | undefined) {
  if (scenario.confirmationPolicy.mode !== 'gates') return undefined;
  return scenario.confirmationPolicy.gates.find((gate) => gate.artifact === artifactType);
}

async function pauseAt(
  scenario: ScenarioRuntime,
  gateLabel: string,
  artifactType: string | undefined,
  remainingArtifactTypes: string[],
  state: SequenceState,
  deps: ScenarioExecutorDeps,
  now: () => string,
): Promise<ScenarioRunResult> {
  const requestId = webCryptoRandomUUID();
  const pending: PendingConfirmation = {
    requestId,
    sessionId: state.sessionId,
    scenarioId: state.scenarioId,
    gateLabel,
    artifactType,
    producedArtifacts: state.producedSoFar,
    remainingArtifactTypes,
    toolResults: state.toolResults,
    evidenceLedgerSnapshot: deps.ledger.snapshot(),
    createdAt: now(),
    materials: state.materials,
  };
  deps.confirmationStore.save(pending);
  // 进度快照先发（docs/architecture/system.md 长任务协议①）：反映"停在哪一步"，再发确认请求本身。
  deps.eventLog.append({ type: 'todo_snapshot', steps: deriveTodoSnapshot(scenario, state.producedSoFar, artifactType) });
  deps.eventLog.append({ type: 'confirmation_requested', requestId, gateLabel, artifactType });
  // 屏障④（ADR-010 决定二第 4 条）：pending confirmation（含材料快照）成功持久后才能发布
  // confirmation_requested。whole-envelope CAS 让 pending 与 confirmation_requested 同一次落盘原子在场，
  // reload 绝不会看到「有确认请求却无 pending」的残缺态。
  await deps.persistBarrier?.();
  return { status: 'paused', sessionId: state.sessionId, requestId };
}

/** outputArtifacts 声明顺序即产出顺序（registry/SPEC.md 已补注的执行语义）。命中门禁即暂停。 */
async function produceSequence(
  scenario: ScenarioRuntime,
  remainingArtifactTypes: string[],
  state: SequenceState,
  deps: ScenarioExecutorDeps,
  guard: RuntimeGuard,
): Promise<ScenarioRunResult> {
  const now = deps.now ?? (() => new Date().toISOString());

  for (let i = 0; i < remainingArtifactTypes.length; i += 1) {
    // 每个 artifact 产出都将进入 paid Turn：价格覆盖/冻结价目漂移必须先拒绝，
    // 再把这一 prospective step 计入累计预算。工具与其他无 paid effect 的位置不走此门。
    assertPaidTurnPreflight(guard);
    guard.checkStep();
    const artifactType = remainingArtifactTypes[i];
    const { artifact, notices, citationStats } = await generateArtifact(
      scenario,
      artifactType,
      {
        inputArtifacts: state.inputArtifacts,
        toolResults: state.toolResults,
        producedSoFar: state.producedSoFar,
        materials: state.materials,
      },
      deps,
      guard,
    );
    guard.checkTime();
    state.producedSoFar[artifactType] = artifact;
    deps.eventLog.append({
      type: 'artifact_produced', artifactType, artifact, evidenceGrades: deps.ledger.snapshot(), providerNotices: notices, citationStats,
    });
    // artifact_produced 本身不再在此单开一次屏障：其终态 Turn 已经在 generateOnce 里屏障③落盘，
    // 本条 artifact_produced 与该屏障共享同一份内存 whole-envelope，必定被本函数返回前的下一次
    // 屏障（下一件 artifact 的 turn_linked、pauseAt 的 pending，或本函数末尾的终局屏障）一并落盘——
    // 三者必居其一，故"发布前必须已落盘"仍然成立，且不额外增加落盘次数（归并 ~6 次/场景不变）。

    const gate = findGate(scenario, artifactType);
    if (gate) {
      return await pauseAt(scenario, gate.label, artifactType, remainingArtifactTypes.slice(i + 1), state, deps, now);
    }
  }

  const labelOnlyGate = findGate(scenario, undefined);
  if (labelOnlyGate) {
    return await pauseAt(scenario, labelOnlyGate.label, undefined, [], state, deps, now);
  }

  deps.eventLog.append({ type: 'todo_snapshot', steps: deriveTodoSnapshot(scenario, state.producedSoFar) });
  deps.eventLog.append({ type: 'scenario_completed' });
  // 终局屏障：完成事件持久后才算终态落盘。
  await deps.persistBarrier?.();
  return { status: 'completed', sessionId: state.sessionId, artifacts: state.producedSoFar };
}

function createGuardForCall(deps: ScenarioExecutorDeps): RuntimeGuard {
  const nowMs = deps.nowMs ?? Date.now;
  const startedAtMs = nowMs();
  if (deps.runtimeBudget && deps.limits !== undefined) {
    throw new RuntimeBudgetConfigurationError('runtimeBudget 与 legacy limits 不得同时注入');
  }
  if (deps.runtimeBudget) {
    if (
      !deps.expectedModelRoute
      || deps.expectedModelRoute.providerId.trim().length === 0
      || deps.expectedModelRoute.modelId.trim().length === 0
    ) {
      throw new RuntimeBudgetConfigurationError('production runtimeBudget 必须同时注入冻结 expectedModelRoute');
    }
    return createRuntimeGuard(deps.runtimeBudget, () => (nowMs() - startedAtMs) / 1000);
  }
  return createRuntimeGuard(
    deps.limits ?? {},
    () => (nowMs() - startedAtMs) / 1000,
    currentPriceBasis(),
  );
}

/**
 * runtime/configuration 触线 → 持久终态并映射 typed failed。已在 runWorkTurn 与 paid terminal
 * 同批落账的 ScenarioTerminalizedError 直接复用结果，不重复追加或多开屏障。
 */
async function terminalizeRuntimeFailure(error: unknown, deps: ScenarioExecutorDeps): Promise<ScenarioRunResult> {
  if (error instanceof ScenarioTerminalizedError) return error.result;
  if (error instanceof RuntimeLimitExceededError) {
    appendScenarioFailure(deps, 'runtime_limit', error.message);
    await deps.persistBarrier?.();
    return failedResult(deps, 'runtime_limit', error.message);
  }
  if (error instanceof RuntimeBudgetConfigurationError) {
    const fallback: WorkRuntimeBudget = {
      limits: { ...(deps.limits ?? {}) },
      costBasis: currentPriceBasis(),
      consumed: {
        steps: 0,
        toolCalls: 0,
        executionMs: 0,
        estimatedUsd: 0,
        costCoverage: 'complete',
      },
    };
    let budget = fallback;
    if (deps.runtimeBudget) {
      try {
        budget = deps.runtimeBudget.snapshot();
      } catch {
        // 装配损坏本身仍须形成可见 configuration 终态；不以二次 snapshot 异常吞掉原始 blocker。
      }
    }
    const message = costConfigurationMessage(budget, error.message);
    appendScenarioFailure(deps, 'configuration', message);
    await deps.persistBarrier?.();
    return failedResult(deps, 'configuration', message);
  }
  throw error;
}

export async function runScenario(
  scenario: ScenarioRuntime,
  input: ScenarioRunInput,
  deps: ScenarioExecutorDeps,
): Promise<ScenarioRunResult> {
  try {
    const guard = createGuardForCall(deps);
    // 屏障①（ADR-010 决定二第 1 条）：session header 成功持久后才能执行工具或调用 provider。
    await deps.persistBarrier?.();
    const toolResults = await runTools(scenario, input.toolInputs, deps, guard);
    return await produceSequence(
      scenario,
      scenario.outputArtifacts,
      {
        sessionId: deps.eventLog.sessionId,
        scenarioId: scenario.id,
        toolResults,
        producedSoFar: { ...input.inputArtifacts },
        inputArtifacts: input.inputArtifacts,
        materials: input.materials ?? [],
      },
      deps,
      guard,
    );
  } catch (error) {
    return await terminalizeRuntimeFailure(error, deps);
  }
}

export interface RevisionInput {
  artifactType: string;
  artifactId: string;
  fieldPath: string;
  previousValue: unknown;
  newValue: unknown;
  reason?: string;
  sourceAnchors?: SourceAnchor[];
  caseId?: string;
}

export interface ScenarioResumeInput {
  actor: ConfirmationActor;
  decision: 'confirm' | 'reject';
  revisions?: RevisionInput[];
  instrumentation?: ConfirmationInstrumentation;
}

function buildRevisionEvent(input: RevisionInput, actor: ConfirmationActor, sessionId: string, now: () => string): RevisionEvent {
  const candidate = {
    id: webCryptoRandomUUID(),
    timestamp: now(),
    actor: { userId: actor.actorId, role: actor.role },
    caseId: input.caseId,
    artifactType: input.artifactType,
    artifactId: input.artifactId,
    fieldPath: input.fieldPath,
    previousValue: input.previousValue,
    newValue: input.newValue,
    reason: input.reason,
    sourceAnchors: input.sourceAnchors,
    sessionId,
  };
  const result = RevisionEventSchema.safeParse(candidate);
  if (!result.success) {
    throw new Error(`构造的 RevisionEvent 未通过 schema 校验：${result.error.message}`);
  }
  return result.data;
}

interface PreparedResume {
  producedArtifacts: Partial<Record<string, unknown>>;
  revisionEvents: RevisionEvent[];
  revisedArtifactTypes: Set<string>;
}

function assertResumeIdentity(
  requestId: string,
  pending: PendingConfirmation,
  scenario: ScenarioRuntime,
  deps: ScenarioExecutorDeps,
): void {
  if (typeof requestId !== 'string' || requestId.trim().length === 0) {
    throw new Error('confirmation request identity 必须是非空字符串');
  }
  if (pending.requestId !== requestId) {
    throw new Error(`confirmation identity 不匹配：请求 "${requestId}" 读到 "${pending.requestId}"`);
  }
  if (typeof pending.scenarioId !== 'string' || pending.scenarioId.trim().length === 0) {
    throw new Error('confirmation scenario identity 必须是非空字符串');
  }
  if (pending.scenarioId !== scenario.id) {
    throw new Error(`confirmation scenario identity 不匹配：待确认属于 "${pending.scenarioId}"，收到 "${scenario.id}"`);
  }
  if (typeof pending.sessionId !== 'string' || pending.sessionId.trim().length === 0) {
    throw new Error('confirmation session identity 必须是非空字符串');
  }
  if (pending.sessionId !== deps.eventLog.sessionId) {
    throw new Error(`confirmation session identity 不匹配：待确认属于 "${pending.sessionId}"，事件账本为 "${deps.eventLog.sessionId}"`);
  }
}

function assertResumeResponse(response: ScenarioResumeInput): void {
  if (!response || typeof response !== 'object') throw new Error('confirmation response 必须是对象');
  if (!response.actor || typeof response.actor !== 'object') throw new Error('confirmation actor 必须是对象');
  if (typeof response.actor.channelId !== 'string' || response.actor.channelId.trim().length === 0) {
    throw new Error('confirmation actor.channelId 必须是非空字符串');
  }
  if (typeof response.actor.actorId !== 'string' || response.actor.actorId.trim().length === 0) {
    throw new Error('confirmation actor.actorId 必须是非空字符串');
  }
  if (response.actor.role !== undefined && (typeof response.actor.role !== 'string' || response.actor.role.trim().length === 0)) {
    throw new Error('confirmation actor.role 如提供必须是非空字符串');
  }
  if (response.decision !== 'confirm' && response.decision !== 'reject') {
    throw new Error(`confirmation decision 必须是 confirm 或 reject：收到 "${String(response.decision)}"`);
  }
  if (response.revisions !== undefined && !Array.isArray(response.revisions)) {
    throw new Error('confirmation revisions 如提供必须是数组');
  }
}

function prepareResume(
  pending: PendingConfirmation,
  response: ScenarioResumeInput,
  now: () => string,
): PreparedResume {
  const producedArtifacts = structuredClone(pending.producedArtifacts);
  const validationArtifacts = response.decision === 'confirm'
    ? producedArtifacts
    : structuredClone(pending.producedArtifacts);
  const revisionEvents: RevisionEvent[] = [];
  const revisedArtifactTypes = new Set<string>();

  for (const revision of response.revisions ?? []) {
    const event = buildRevisionEvent(revision, response.actor, pending.sessionId, now);
    const artifact = validationArtifacts[revision.artifactType];
    if (!artifact || typeof artifact !== 'object') {
      throw new Error(`revision artifactType "${revision.artifactType}" 不存在或不可修正`);
    }
    applyJsonPointer(artifact as Record<string, unknown>, revision.fieldPath, revision.newValue);
    if (response.decision === 'confirm') {
      revisionEvents.push(event);
      revisedArtifactTypes.add(revision.artifactType);
    }
  }

  return { producedArtifacts, revisionEvents, revisedArtifactTypes };
}

export async function resumeScenario(
  requestId: string,
  response: ScenarioResumeInput,
  scenario: ScenarioRuntime,
  deps: ScenarioExecutorDeps,
): Promise<ScenarioRunResult> {
  const snapshot = deps.confirmationStore.peek(requestId);
  if (!snapshot) throw new UnknownConfirmationRequestError(requestId);
  const now = deps.now ?? (() => new Date().toISOString());
  assertResumeIdentity(requestId, snapshot.pending, scenario, deps);
  assertResumeResponse(response);
  const prepared = prepareResume(snapshot.pending, response, now);

  const pending = deps.confirmationStore.consume(requestId, snapshot.version);
  if (!pending) throw new UnknownConfirmationRequestError(requestId);

  for (const entry of pending.evidenceLedgerSnapshot) {
    deps.ledger.record(entry.key, { grade: entry.grade, sourceId: entry.sourceId, confirmed: entry.confirmed });
  }

  deps.eventLog.append({
    type: 'confirmation_resolved',
    requestId,
    actor: response.actor,
    decision: response.decision,
    instrumentation: response.instrumentation,
  });

  try {
    const guard = createGuardForCall(deps);
    if (response.decision === 'reject') {
      deps.eventLog.append({ type: 'scenario_completed' });
      // 屏障⑤（ADR-010 决定二第 5 条）：条件消费与 confirmation_resolved（含 reject 终态）同一次 CAS 落盘。
      await deps.persistBarrier?.();
      return { status: 'completed', sessionId: pending.sessionId, artifacts: prepared.producedArtifacts };
    }

    for (const event of prepared.revisionEvents) {
      deps.revisionStore.record(event);
      deps.eventLog.append({ type: 'revision_recorded', revisionEventId: event.id });
    }
    // 修正过的 artifact 重新发一次 artifact_produced（同一 artifactType 的最新一条对
    // replaySession 生效）——否则事件流"可回放"只能重建出修正前的原始产出，不是真话。
    for (const artifactType of prepared.revisedArtifactTypes) {
      deps.eventLog.append({
        type: 'artifact_produced',
        artifactType,
        artifact: prepared.producedArtifacts[artifactType],
        evidenceGrades: deps.ledger.snapshot(),
      });
    }
    // 屏障⑤+⑥（ADR-010 决定二第 5、6 条）：pending 条件消费、confirmation_resolved、revision 载荷与
    // revision_recorded 作为同一次 whole-envelope CAS 原子落盘——revision 载荷与其记录事件同批持久。
    await deps.persistBarrier?.();

    return await produceSequence(
      scenario,
      pending.remainingArtifactTypes,
      {
        sessionId: pending.sessionId,
        scenarioId: pending.scenarioId,
        toolResults: pending.toolResults,
        producedSoFar: prepared.producedArtifacts,
        inputArtifacts: prepared.producedArtifacts,
        materials: pending.materials ?? [],
      },
      deps,
      guard,
    );
  } catch (error) {
    return await terminalizeRuntimeFailure(error, deps);
  }
}
