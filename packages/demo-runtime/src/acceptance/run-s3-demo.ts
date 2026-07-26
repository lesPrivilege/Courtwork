import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createToolExecutor } from '@courtwork/tools';
import { applyRevisionInstructionSet, NonAppliedInstructionsError, type InstructionOutcome } from '@courtwork/output';
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

/**
 * 逐条处置表：六项确认 + risk-07 驳回。真实 gate 不允许留 pending 续行，本表让脚本与产品同形
 * （旧脚本只处置首项、其余留 pending，靠旧编译器「非 rejected 即编译」蒙混过关）。
 * 索引对应 `S3_RISK_LIST_RESPONSE` 的 risks 顺序。
 */
const RISK_DISPOSITIONS: ReadonlyArray<{ index: number; disposition: 'confirmed' | 'rejected'; reason: string }> = [
  { index: 0, disposition: 'confirmed', reason: '与主办律师电话确认，风险属实' },
  { index: 1, disposition: 'confirmed', reason: '管辖条款确需调整' },
  { index: 2, disposition: 'confirmed', reason: '质保期确需延长' },
  { index: 3, disposition: 'confirmed', reason: '交付期限确需细化' },
  { index: 4, disposition: 'confirmed', reason: '附表缺失确需补齐' },
  { index: 5, disposition: 'confirmed', reason: '主体名称确需核对' },
  // risk-07 的依据只有支持材料（企业信用查询单）锚，没有主合同锚。旧脚本让它带着支持材料的
  // 引语去主合同碰运气、拿一个 `locator_not_found` 收场；新契约不允许这样冒充定位，故显式驳回。
  { index: 6, disposition: 'rejected', reason: '仅有支持材料依据，无主合同定位，本次不作批注' },
];

/**
 * demo 主合同件：**materials 语料、RiskList 锚、CaseFile 条目与编译目标共用这一个 fileId**。
 *
 * 旧脚本三处不同源——CaseFile 写 `04-设备采购合同.md`、materials 实际加载
 * `sample-sale-contract-v1.docx`、锚也挂在后者上，编译目标却传 `04-设备采购合同.docx`。
 * 谁都没发现，因为旧编译器不按 fileId 选锚。CONTRACT-OUTPUT-TRUTH-1 的同源判据把它暴露出来。
 */
const S3_DEMO_PRIMARY_FILE_ID = 'sample-sale-contract-v1.docx';

const CASE_FILE: CaseFile = {
  caseId: 'case-linjiang-qiyun-2025',
  files: [
    { fileId: S3_DEMO_PRIMARY_FILE_ID, fileName: S3_DEMO_PRIMARY_FILE_ID, documentType: '合同', ingestStatus: 'done', pageCount: 1 },
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
      // CONTRACT-OUTPUT-TRUTH-1：真实产品的 gate 要求**逐条**处置后才可续行，编译器亦以
      // 任一 pending 为 typed blocker。旧脚本只处置首项、其余留 pending，是与产品流不一致的
      // 简写；改为首项确认、其余驳回，与「逐条填满才提交」同形。
      revisions: RISK_DISPOSITIONS.map(({ index, disposition, reason }) => ({
        artifactType: 'legal.RiskList' as const,
        artifactId: CASE_FILE.caseId,
        fieldPath: `/risks/${index}/dispositionStatus`,
        previousValue: 'pending',
        newValue: disposition,
        reason,
        caseId: CASE_FILE.caseId,
      })),
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
  // CONTRACT-OUTPUT-TRUTH-1：与锚 fileId 同源（旧写法传 .docx，锚却挂在 .md 上）。
  const revisionSet = compileConfirmedRiskListToRevisionInstructions(riskList, S3_DEMO_PRIMARY_FILE_ID, gatekeeper);

  const originalDocx = readFileSync(ORIGINAL_DOCX_PATH);
  const now = new Date('2026-07-10T09:00:00.000Z');
  // 落盘门禁：合成合同里 instr-risk-07 定位不上。真实产品会把未应用项交用户逐条处置；
  // 本脚本化 demo 先撞门禁拿到未应用项、再以显式针对性确认继续演示"确认→docx"终链——
  // 绝不静默跳过后照常交付。
  const { docx, outcomes } = (() => {
    try {
      return applyRevisionInstructionSet(originalDocx, revisionSet, { now });
    } catch (error) {
      if (!(error instanceof NonAppliedInstructionsError)) throw error;
      return applyRevisionInstructionSet(originalDocx, revisionSet, {
        now,
        onNonApplied: 'confirm',
        confirmNonApplied: error.nonApplied.map((o) => o.id),
      });
    }
  })();

  const finalEvents = createFileEventLog(sessionId, eventsPath).list();
  const replay = replaySession(finalEvents);

  writeFileSync(join(workDir, 'redline.docx'), docx);
  writeFileSync(join(workDir, 'revision-instruction-set.json'), JSON.stringify(revisionSet, null, 2));

  return { docx, outcomes, replay, eventTypes: finalEvents.map((e) => e.type), workDir };
}
