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
import { createRuntimeGuard, type RuntimeGuard, type RuntimeLimits } from './runtime-limits.js';
import { estimateCostUsd } from '@courtwork/provider/pricing';
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
import type { PersistedTurn, TurnEvent } from '../turn/types.js';

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
  onTurnEvent?: (event: TurnEvent) => void;
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
  /**
   * 运行时保护四件套（docs/architecture/system.md 长任务协议③），按次 runScenario/resumeScenario 调用
   * 单独计额——不跨暂停边界累计（每次续行是新的一段执行，不是同一预算的延续）。
   * 缺省不限制，MVP 默认行为不变。
   */
  limits?: RuntimeLimits;
  nowMs?: () => number;
}

export interface ScenarioRunInput {
  inputArtifacts: Partial<Record<string, unknown>>;
  toolInputs: Record<string, unknown>;
  /** 容器材料（阅读视图全文 + 哈希），经会话与语料段在显式数据边界内注入。 */
  materials?: MaterialInput[];
}

export type ScenarioRunResult =
  | { status: 'completed'; sessionId: string; artifacts: Partial<Record<string, unknown>> }
  | { status: 'paused'; sessionId: string; requestId: string };

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
      `场景 ${scenarioId} 声明 confirmationPolicy: none，但绑定工具 "${toolId}" 的副作用类为 ${sideEffect}——none 仅限纯读取，core 强制、包无权放宽`,
    );
    this.name = 'ConfirmationPolicyViolationError';
  }
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
    guard.checkToolCall();
    const binding = deps.tools.get(toolId);
    if (!binding) throw new UnknownToolError(scenario.id, toolId);
    // ABI 拍板③运行时门：none 策略场景的工具必须全为 pure_read（准入层只能核 artifact
    // 副作用，工具在装配点才绑定——双门的第二道在此）。
    if (scenario.confirmationPolicy.mode === 'none') {
      const sideEffect = binding.sideEffect ?? 'pure_read';
      if (sideEffect !== 'pure_read') {
        throw new ConfirmationPolicyViolationError(scenario.id, toolId, sideEffect);
      }
    }
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

async function runWorkTurn(
  context: WorkTurnIdentityContext,
  request: Parameters<TurnRunnerPort['run']>[0]['request'],
  deps: ScenarioExecutorDeps,
): Promise<Extract<PersistedTurn, { status: 'completed' }>> {
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
  const turn = await deps.turnRunner.run({
    ...identity,
    request,
    ...(deps.signal ? { signal: deps.signal } : {}),
    ...(deps.onTurnEvent ? { onEvent: deps.onTurnEvent } : {}),
  });
  if (turn.turnId !== identity.turnId || turn.providerRequestId !== identity.providerRequestId) {
    throw new WorkTurnIdentityError('TurnRunnerPort 返回的终态身份与 Work 链接身份不一致');
  }
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
    throw new WorkTurnFailedError(turn, context);
  }
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
        pendingGateLabels: [],
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
    }, assembled.request, deps);
    guard.checkTime();
    // 派生估价与原始计量分开：只取版本化 estimate 的美元数交给护栏，不改写 turn.usage 计量真源。
    const estimate = estimateCostUsd(turn.providerId, turn.modelId, turn.usage);
    if (estimate !== undefined) guard.checkUsd(estimate.usd);
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

function pauseAt(
  scenario: ScenarioRuntime,
  gateLabel: string,
  artifactType: string | undefined,
  remainingArtifactTypes: string[],
  state: SequenceState,
  deps: ScenarioExecutorDeps,
  now: () => string,
): ScenarioRunResult {
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

    const gate = findGate(scenario, artifactType);
    if (gate) {
      return pauseAt(scenario, gate.label, artifactType, remainingArtifactTypes.slice(i + 1), state, deps, now);
    }
  }

  const labelOnlyGate = findGate(scenario, undefined);
  if (labelOnlyGate) {
    return pauseAt(scenario, labelOnlyGate.label, undefined, [], state, deps, now);
  }

  deps.eventLog.append({ type: 'todo_snapshot', steps: deriveTodoSnapshot(scenario, state.producedSoFar) });
  deps.eventLog.append({ type: 'scenario_completed' });
  return { status: 'completed', sessionId: state.sessionId, artifacts: state.producedSoFar };
}

/** 每次 runScenario/resumeScenario 调用各建一份新的运行时预算——不跨暂停边界累计。 */
function createGuardForCall(deps: ScenarioExecutorDeps): RuntimeGuard {
  const nowMs = deps.nowMs ?? Date.now;
  const startedAtMs = nowMs();
  return createRuntimeGuard(deps.limits ?? {}, () => (nowMs() - startedAtMs) / 1000);
}

export async function runScenario(
  scenario: ScenarioRuntime,
  input: ScenarioRunInput,
  deps: ScenarioExecutorDeps,
): Promise<ScenarioRunResult> {
  const guard = createGuardForCall(deps);
  const toolResults = await runTools(scenario, input.toolInputs, deps, guard);
  return produceSequence(
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

  if (response.decision === 'reject') {
    deps.eventLog.append({ type: 'scenario_completed' });
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

  return produceSequence(
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
    createGuardForCall(deps),
  );
}
