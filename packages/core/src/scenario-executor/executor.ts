import { randomUUID } from 'node:crypto';
import type { ArtifactType, RevisionEvent, SourceAnchor } from '@courtwork/schemas';
import { RevisionEventSchema } from '@courtwork/schemas';
import type { ScenarioDefinition } from '@courtwork/registry';
import type { ToolExecutor } from '@courtwork/tools';
import type { Provider } from '../provider/types.js';
import type { EventLog } from '../events/event-log.js';
import type { ConfirmationActor, ConfirmationInstrumentation } from '../events/types.js';
import type { EvidenceLedger } from '../evidence/grade.js';
import type { ToolRegistry } from '../tools/tool-registry.js';
import type { ConfirmationStore, PendingConfirmation } from '../session/confirmation-store.js';
import type { RevisionEventStore } from '../revision/revision-store.js';
import { applyJsonPointer } from '../revision/json-pointer.js';
import { ARTIFACT_SCHEMAS } from './artifact-schemas.js';
import { deriveTodoSnapshot } from './todo-snapshot.js';
import { createRuntimeGuard, type RuntimeGuard, type RuntimeLimits } from './runtime-limits.js';

export interface ScenarioExecutorDeps {
  tools: ToolRegistry;
  toolExecutor: ToolExecutor;
  provider: Provider;
  eventLog: EventLog;
  confirmationStore: ConfirmationStore;
  revisionStore: RevisionEventStore;
  ledger: EvidenceLedger;
  now?: () => string;
  /**
   * 运行时保护四件套（docs/12 长任务协议③），按次 runScenario/resumeScenario 调用
   * 单独计额——不跨暂停边界累计（每次续行是新的一段执行，不是同一预算的延续）。
   * 缺省不限制，MVP 默认行为不变。
   */
  limits?: RuntimeLimits;
  nowMs?: () => number;
}

export interface ScenarioRunInput {
  inputArtifacts: Partial<Record<ArtifactType, unknown>>;
  toolInputs: Record<string, unknown>;
}

export type ScenarioRunResult =
  | { status: 'completed'; sessionId: string; artifacts: Partial<Record<ArtifactType, unknown>> }
  | { status: 'paused'; sessionId: string; requestId: string };

export class UnknownToolError extends Error {
  constructor(scenarioId: string, toolId: string) {
    super(`场景 ${scenarioId} 引用了未在工具注册表中登记的工具 "${toolId}"`);
    this.name = 'UnknownToolError';
  }
}

export class GenerationValidationError extends Error {
  constructor(scenarioId: string, artifactType: ArtifactType, issues: string) {
    super(`场景 ${scenarioId} 生成的 ${artifactType} 未通过 schema 校验：\n${issues}`);
    this.name = 'GenerationValidationError';
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
  scenario: ScenarioDefinition,
  toolInputs: Record<string, unknown>,
  deps: ScenarioExecutorDeps,
  guard: RuntimeGuard,
): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};
  for (const toolId of scenario.toolIds) {
    guard.checkToolCall();
    const binding = deps.tools.get(toolId);
    if (!binding) throw new UnknownToolError(scenario.id, toolId);
    const envelope = await deps.toolExecutor.execute(binding.tool, toolInputs[toolId]);
    results[toolId] = envelope;
    if (envelope.verified) {
      deps.ledger.record(toolId, { grade: binding.grade, sourceId: envelope.source, confirmed: false });
    } else {
      // 工具契约本身已经把失败降级为结构化的 verified:false（不抛异常）——这里只是把
      // "发生过一次工具级降级"显式发布到事件流（docs/12 长任务协议②，step_failed）。
      deps.eventLog.append({ type: 'step_failed', scope: 'tool', toolId, reason: envelope.reason, message: envelope.message });
    }
  }
  return results;
}

async function generateArtifact(
  scenario: ScenarioDefinition,
  artifactType: ArtifactType,
  context: {
    inputArtifacts: Partial<Record<ArtifactType, unknown>>;
    toolResults: Record<string, unknown>;
    producedSoFar: Partial<Record<ArtifactType, unknown>>;
  },
  provider: Provider,
): Promise<unknown> {
  // todo 复述进请求末尾（Manus 抗注意力漂移技巧，docs/12，套在声明式步骤上）：
  // todo 字段放在展开运算符之后插入，JSON.stringify 按插入顺序输出键，
  // 因此序列化后的字符串里 todo 真的落在末尾，不只是字段存在而已。
  const response = await provider.generate({
    systemPrompt: scenario.promptTemplateRef,
    messages: [
      {
        role: 'user',
        content: JSON.stringify({ artifactType, ...context, todo: deriveTodoSnapshot(scenario, context.producedSoFar) }),
      },
    ],
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(response.content);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new GenerationValidationError(scenario.id, artifactType, `provider 返回的内容不是合法 JSON：${reason}`);
  }
  const schema = ARTIFACT_SCHEMAS[artifactType];
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new GenerationValidationError(scenario.id, artifactType, issues);
  }
  return result.data;
}

interface SequenceState {
  sessionId: string;
  scenarioId: string;
  toolResults: Record<string, unknown>;
  producedSoFar: Partial<Record<ArtifactType, unknown>>;
  inputArtifacts: Partial<Record<ArtifactType, unknown>>;
}

function pauseAt(
  scenario: ScenarioDefinition,
  gateLabel: string,
  artifactType: ArtifactType | undefined,
  remainingArtifactTypes: ArtifactType[],
  state: SequenceState,
  deps: ScenarioExecutorDeps,
  now: () => string,
): ScenarioRunResult {
  const requestId = randomUUID();
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
  };
  deps.confirmationStore.save(pending);
  // 进度快照先发（docs/12 长任务协议①）：反映"停在哪一步"，再发确认请求本身。
  deps.eventLog.append({ type: 'todo_snapshot', steps: deriveTodoSnapshot(scenario, state.producedSoFar, artifactType) });
  deps.eventLog.append({ type: 'confirmation_requested', requestId, gateLabel, artifactType });
  return { status: 'paused', sessionId: state.sessionId, requestId };
}

/** outputArtifacts 声明顺序即产出顺序（registry/SPEC.md 已补注的执行语义）。命中门禁即暂停。 */
async function produceSequence(
  scenario: ScenarioDefinition,
  remainingArtifactTypes: ArtifactType[],
  state: SequenceState,
  deps: ScenarioExecutorDeps,
  guard: RuntimeGuard,
): Promise<ScenarioRunResult> {
  const now = deps.now ?? (() => new Date().toISOString());

  for (let i = 0; i < remainingArtifactTypes.length; i += 1) {
    guard.checkStep();
    const artifactType = remainingArtifactTypes[i];
    const artifact = await generateArtifact(
      scenario,
      artifactType,
      { inputArtifacts: state.inputArtifacts, toolResults: state.toolResults, producedSoFar: state.producedSoFar },
      deps.provider,
    );
    state.producedSoFar[artifactType] = artifact;
    deps.eventLog.append({ type: 'artifact_produced', artifactType, artifact, evidenceGrades: deps.ledger.snapshot() });

    const gate = scenario.confirmationGates.find((g) => g.artifact === artifactType);
    if (gate) {
      return pauseAt(scenario, gate.label, artifactType, remainingArtifactTypes.slice(i + 1), state, deps, now);
    }
  }

  const labelOnlyGate = scenario.confirmationGates.find((g) => g.artifact === undefined);
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
  scenario: ScenarioDefinition,
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
    },
    deps,
    guard,
  );
}

export interface RevisionInput {
  artifactType: ArtifactType;
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

function buildRevisionEvent(input: RevisionInput, actor: ConfirmationActor, now: () => string): RevisionEvent {
  const candidate = {
    id: randomUUID(),
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
  };
  const result = RevisionEventSchema.safeParse(candidate);
  if (!result.success) {
    throw new Error(`构造的 RevisionEvent 未通过 schema 校验：${result.error.message}`);
  }
  return result.data;
}

export async function resumeScenario(
  requestId: string,
  response: ScenarioResumeInput,
  scenario: ScenarioDefinition,
  deps: ScenarioExecutorDeps,
): Promise<ScenarioRunResult> {
  const pending = deps.confirmationStore.take(requestId);
  if (!pending) throw new UnknownConfirmationRequestError(requestId);
  const now = deps.now ?? (() => new Date().toISOString());

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
    return { status: 'completed', sessionId: pending.sessionId, artifacts: pending.producedArtifacts };
  }

  const revisedArtifactTypes = new Set<ArtifactType>();
  for (const revision of response.revisions ?? []) {
    const event = buildRevisionEvent(revision, response.actor, now);
    deps.revisionStore.record(event);
    deps.eventLog.append({ type: 'revision_recorded', revisionEventId: event.id });
    const artifact = pending.producedArtifacts[revision.artifactType];
    if (artifact && typeof artifact === 'object') {
      applyJsonPointer(artifact as Record<string, unknown>, revision.fieldPath, revision.newValue);
      revisedArtifactTypes.add(revision.artifactType);
    }
  }
  // 修正过的 artifact 重新发一次 artifact_produced（同一 artifactType 的最新一条对
  // replaySession 生效）——否则事件流"可回放"只能重建出修正前的原始产出，不是真话。
  for (const artifactType of revisedArtifactTypes) {
    deps.eventLog.append({
      type: 'artifact_produced',
      artifactType,
      artifact: pending.producedArtifacts[artifactType],
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
      producedSoFar: pending.producedArtifacts,
      inputArtifacts: pending.producedArtifacts,
    },
    deps,
    createGuardForCall(deps),
  );
}
