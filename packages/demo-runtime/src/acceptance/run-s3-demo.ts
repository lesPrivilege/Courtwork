import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createToolExecutor } from '@courtwork/tools';
import { applyRevisionInstructionSet, type InstructionOutcome } from '@courtwork/output';
import {
  compileConfirmedRiskListToRevisionInstructions,
  type CaseFile,
  type RiskList,
} from '@courtwork/legal';
import {
  assertEvidenceKeyAdmissible,
  createEvidenceLedger,
  createFileConfirmationStore,
  createFileEventLog,
  createFileRevisionEventStore,
  createFileTurnStore,
  replaySession,
  resumeScenario,
  runScenario,
  type ReplaySummary,
  type ScenarioExecutorDeps,
  type SessionEvent,
} from '@courtwork/core';
import type { Provider } from '@courtwork/provider/types';
import { buildDemoS3Runtime, loadDemoS3Materials } from '../composition/demo-assembly.js';

const ORIGINAL_DOCX_PATH = join(import.meta.dirname, '..', '..', '..', 'output', 'test', 'fixtures', 'original.docx');

const CASE_FILE: CaseFile = {
  caseId: 'case-linjiang-qiyun-2025',
  files: [
    { fileId: '04-设备采购合同.md', fileName: '04-设备采购合同.md', documentType: '合同', ingestStatus: 'done', pageCount: 1 },
  ],
};

export interface S3DemoResult {
  docx: Buffer;
  outcomes: InstructionOutcome[];
  replay: ReplaySummary;
  eventTypes: SessionEvent['type'][];
  workDir: string;
}

export const S3_GOLDEN_EVENT_TYPES = [
  'turn_linked',
  'artifact_produced',
  'todo_snapshot',
  'confirmation_requested',
  'confirmation_resolved',
  'revision_recorded',
  'artifact_produced',
  'todo_snapshot',
  'scenario_completed',
] as const satisfies readonly SessionEvent['type'][];

export const S3_PRELOADED_ANCHOR_QUOTES = [
  '百分之十的违约金',
  '提交甲方所在地人民法院诉讼解决',
  '质保期为交付之日起壹年',
  '本合同签订之日起三十日内',
  '规格、数量、单价详见本合同附表一',
  '甲方（买受人）：星辰科技有限公司',
  '起云智能装备（虚构）有限公司',
] as const;

/** 允许真模型的描述/id 不同，但必须命中至少 5/7 个样板合同预埋锚点。 */
export const S3_MINIMUM_PRELOADED_FINDINGS = 5;

export interface S3DemoGoldenReport {
  pass: boolean;
  structureMatches: boolean;
  matchedPreloadedFindings: number;
  issues: string[];
}

export function evaluateS3DemoGolden(input: {
  eventTypes: readonly SessionEvent['type'][];
  riskList: RiskList;
}): S3DemoGoldenReport {
  const issues: string[] = [];
  const structureMatches = JSON.stringify(input.eventTypes) === JSON.stringify(S3_GOLDEN_EVENT_TYPES);
  if (!structureMatches) {
    issues.push(`事件骨架 DIFF：预期 ${S3_GOLDEN_EVENT_TYPES.join(' -> ')}`);
  }

  const actualQuotes = input.riskList.risks.flatMap((risk) =>
    risk.basis.flatMap((basis) => basis.sourceAnchors.flatMap((anchor) => anchor.quote ? [anchor.quote] : [])),
  );
  // 单向包含（HARNESS-1 拍板：golden 单向规范化匹配）：模型引语必须复现预埋原文片段，
  // 反向 expected.includes(actual) 已证实可被通用法律词平凡骗过，废除。
  const matchedPreloadedFindings = S3_PRELOADED_ANCHOR_QUOTES.filter((expected) =>
    actualQuotes.some((actual) => actual.includes(expected)),
  ).length;
  if (matchedPreloadedFindings < S3_MINIMUM_PRELOADED_FINDINGS) {
    issues.push(`预埋考点仅命中 ${matchedPreloadedFindings}/${S3_PRELOADED_ANCHOR_QUOTES.length}，门槛为 ${S3_MINIMUM_PRELOADED_FINDINGS}`);
  }
  return { pass: issues.length === 0, structureMatches, matchedPreloadedFindings, issues };
}

/**
 * 验收流程的可复用实现：CLI 脚本（scripts/demo-s3-flow.ts）与集成测试
 * （s3-flow.integration.test.ts）共用同一份逻辑，不是两套平行实现。
 */
export async function runS3Demo(
  workDir: string = mkdtempSync(join(tmpdir(), 'courtwork-core-s3-demo-')),
  /** GOAL-1 真模型首跑：注入真 Provider 覆盖 demo ScriptedProvider；缺省行为零变。 */
  overrides?: { provider?: Provider },
): Promise<S3DemoResult> {
  const sessionId = 'demo-s3-session';
  const materials = await loadDemoS3Materials();
  const eventsPath = join(workDir, 'events.jsonl');
  const pendingDir = join(workDir, 'pending');
  const revisionEventsPath = join(workDir, 'revision-events.jsonl');
  const turnsPath = join(workDir, 'turns.jsonl');
  const runtime = buildDemoS3Runtime({
    provider: overrides?.provider,
    turnStore: createFileTurnStore(turnsPath),
  });

  const firstDeps: ScenarioExecutorDeps = {
    tools: runtime.tools,
    toolExecutor: createToolExecutor(),
    turnRunner: runtime.turnRunner,
    eventLog: createFileEventLog(sessionId, eventsPath),
    confirmationStore: createFileConfirmationStore(pendingDir),
    revisionStore: createFileRevisionEventStore(revisionEventsPath),
    ledger: createEvidenceLedger(),
    artifacts: runtime.registries.artifactSchemas,
    projections: runtime.registries.projections,
  };

  const scenario = runtime.registries.scenarios.get('legal.S3');
  if (!scenario) throw new Error('legal.S3 未在场景注册表中——legal 包装载异常');

  const firstRun = await runScenario(
    scenario,
    { inputArtifacts: { 'legal.CaseFile': CASE_FILE }, toolInputs: runtime.toolInputs, materials },
    firstDeps,
  );
  if (firstRun.status !== 'paused') {
    throw new Error(`预期 S3 在 RiskList 确认门禁处暂停，实际状态是 "${firstRun.status}"`);
  }

  // 模拟"另一个进程"接续：全部依赖重新构造，只共享磁盘路径与可序列化配置，
  // 不复用 firstDeps 的任何实例/闭包。
  const secondRuntime = buildDemoS3Runtime({
    provider: overrides?.provider,
    turnStore: createFileTurnStore(turnsPath),
  });
  const secondDeps: ScenarioExecutorDeps = {
    tools: secondRuntime.tools,
    toolExecutor: createToolExecutor(),
    turnRunner: secondRuntime.turnRunner,
    eventLog: createFileEventLog(sessionId, eventsPath),
    confirmationStore: createFileConfirmationStore(pendingDir),
    revisionStore: createFileRevisionEventStore(revisionEventsPath),
    ledger: createEvidenceLedger(),
    artifacts: secondRuntime.registries.artifactSchemas,
    projections: secondRuntime.registries.projections,
  };

  const secondRun = await resumeScenario(
    firstRun.requestId,
    {
      actor: { channelId: 'cli', actorId: 'demo-lawyer', role: '主办律师' },
      decision: 'confirm',
      revisions: [
        {
          artifactType: 'legal.RiskList',
          artifactId: CASE_FILE.caseId,
          fieldPath: '/risks/0/dispositionStatus',
          previousValue: 'pending',
          newValue: 'confirmed',
          reason: '与主办律师电话确认，风险属实',
          caseId: CASE_FILE.caseId,
        },
      ],
      instrumentation: { dwellMs: 4200, expandedEvidenceKeys: ['party-verify'] },
    },
    scenario,
    secondDeps,
  );
  if (secondRun.status !== 'completed') {
    throw new Error(`预期确认后场景直接完成，实际状态是 "${secondRun.status}"`);
  }

  const riskList = secondRun.artifacts['legal.RiskList'] as RiskList;
  // 信源门禁经注入口绑定 core 台账（legal 包零 core 依赖，包域律）。
  const gatekeeper = {
    issueKey: (citation: string) => secondDeps.ledger.issueKey(citation),
    assertAdmissible: (key: string) => assertEvidenceKeyAdmissible(secondDeps.ledger, key),
  };
  const revisionSet = compileConfirmedRiskListToRevisionInstructions(riskList, '04-设备采购合同.docx', gatekeeper);

  const originalDocx = readFileSync(ORIGINAL_DOCX_PATH);
  const { docx, outcomes } = applyRevisionInstructionSet(originalDocx, revisionSet, {
    now: new Date('2026-07-10T09:00:00.000Z'),
  });

  const finalEvents = createFileEventLog(sessionId, eventsPath).list();
  const replay = replaySession(finalEvents);

  writeFileSync(join(workDir, 'redline.docx'), docx);
  writeFileSync(join(workDir, 'revision-instruction-set.json'), JSON.stringify(revisionSet, null, 2));

  return { docx, outcomes, replay, eventTypes: finalEvents.map((e) => e.type), workDir };
}
