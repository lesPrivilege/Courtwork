import { randomUUID } from 'node:crypto';
import type { ArtifactType, ScenarioDefinition } from '@courtwork/schemas';
import type { ToolExecutor } from '@courtwork/tools';
import type { Provider } from '../provider/types.js';
import type { EventLog } from '../events/event-log.js';
import type { EvidenceLedger } from '../evidence/grade.js';
import type { ToolRegistry } from '../tools/tool-registry.js';
import type { ConfirmationStore, PendingConfirmation } from '../session/confirmation-store.js';
import type { RevisionEventStore } from '../revision/revision-store.js';
import { ARTIFACT_SCHEMAS } from './artifact-schemas.js';

export interface ScenarioExecutorDeps {
  tools: ToolRegistry;
  toolExecutor: ToolExecutor;
  provider: Provider;
  eventLog: EventLog;
  confirmationStore: ConfirmationStore;
  revisionStore: RevisionEventStore;
  ledger: EvidenceLedger;
  now?: () => string;
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
): Promise<Record<string, unknown>> {
  const results: Record<string, unknown> = {};
  for (const toolId of scenario.toolIds) {
    const binding = deps.tools.get(toolId);
    if (!binding) throw new UnknownToolError(scenario.id, toolId);
    const envelope = await deps.toolExecutor.execute(binding.tool, toolInputs[toolId]);
    results[toolId] = envelope;
    if (envelope.verified) {
      deps.ledger.record(toolId, { grade: binding.grade, sourceId: envelope.source, confirmed: false });
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
  const response = await provider.generate({
    systemPrompt: scenario.promptTemplateRef,
    messages: [{ role: 'user', content: JSON.stringify({ artifactType, ...context }) }],
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
  deps.eventLog.append({ type: 'confirmation_requested', requestId, gateLabel, artifactType });
  return { status: 'paused', sessionId: state.sessionId, requestId };
}

/** outputArtifacts 声明顺序即产出顺序（registry/SPEC.md 已补注的执行语义）。命中门禁即暂停。 */
async function produceSequence(
  scenario: ScenarioDefinition,
  remainingArtifactTypes: ArtifactType[],
  state: SequenceState,
  deps: ScenarioExecutorDeps,
): Promise<ScenarioRunResult> {
  const now = deps.now ?? (() => new Date().toISOString());

  for (let i = 0; i < remainingArtifactTypes.length; i += 1) {
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
      return pauseAt(gate.label, artifactType, remainingArtifactTypes.slice(i + 1), state, deps, now);
    }
  }

  const labelOnlyGate = scenario.confirmationGates.find((g) => g.artifact === undefined);
  if (labelOnlyGate) {
    return pauseAt(labelOnlyGate.label, undefined, [], state, deps, now);
  }

  deps.eventLog.append({ type: 'scenario_completed' });
  return { status: 'completed', sessionId: state.sessionId, artifacts: state.producedSoFar };
}

export async function runScenario(
  scenario: ScenarioDefinition,
  input: ScenarioRunInput,
  deps: ScenarioExecutorDeps,
): Promise<ScenarioRunResult> {
  const toolResults = await runTools(scenario, input.toolInputs, deps);
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
  );
}

export interface ConfirmationActor {
  channelId: string;
  actorId: string;
  role?: string;
}

export interface ScenarioResumeInput {
  actor: ConfirmationActor;
  decision: 'confirm' | 'reject';
}

export async function resumeScenario(
  requestId: string,
  response: ScenarioResumeInput,
  scenario: ScenarioDefinition,
  deps: ScenarioExecutorDeps,
): Promise<ScenarioRunResult> {
  const pending = deps.confirmationStore.take(requestId);
  if (!pending) throw new UnknownConfirmationRequestError(requestId);

  for (const entry of pending.evidenceLedgerSnapshot) {
    deps.ledger.record(entry.key, { grade: entry.grade, sourceId: entry.sourceId, confirmed: entry.confirmed });
  }

  deps.eventLog.append({
    type: 'confirmation_resolved',
    requestId,
    actor: response.actor,
    decision: response.decision,
  });

  if (response.decision === 'reject') {
    deps.eventLog.append({ type: 'scenario_completed' });
    return { status: 'completed', sessionId: pending.sessionId, artifacts: pending.producedArtifacts };
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
  );
}
