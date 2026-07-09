import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadScenarioFile } from '@courtwork/registry';
import { createToolExecutor } from '@courtwork/tools';
import { applyRevisionInstructionSet, type InstructionOutcome } from '@courtwork/output';
import type { CaseFile, RiskList } from '@courtwork/schemas';
import { createEvidenceLedger } from '../evidence/grade.js';
import { createFileEventLog, replaySession, type ReplaySummary } from '../events/event-log.js';
import type { SessionEvent } from '../events/types.js';
import { createFileConfirmationStore } from '../session/confirmation-store.js';
import { createFileRevisionEventStore } from '../revision/revision-store.js';
import { runScenario, resumeScenario, type ScenarioExecutorDeps } from '../scenario-executor/executor.js';
import { buildDemoS3Runtime } from '../composition/demo-assembly.js';
import { compileConfirmedRiskListToRevisionInstructions } from '../composition/compile-risk-list-to-revisions.js';

const S3_YAML_PATH = join(import.meta.dirname, '..', '..', '..', 'registry', 'scenarios', 'S3.yaml');
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

/**
 * 验收流程的可复用实现：CLI 脚本（scripts/demo-s3-flow.ts）与集成测试
 * （s3-flow.integration.test.ts）共用同一份逻辑，不是两套平行实现。
 */
export async function runS3Demo(
  workDir: string = mkdtempSync(join(tmpdir(), 'courtwork-core-s3-demo-')),
): Promise<S3DemoResult> {
  const sessionId = 'demo-s3-session';
  const runtime = buildDemoS3Runtime();
  const eventsPath = join(workDir, 'events.jsonl');
  const pendingDir = join(workDir, 'pending');
  const revisionEventsPath = join(workDir, 'revision-events.jsonl');

  const firstDeps: ScenarioExecutorDeps = {
    tools: runtime.tools,
    toolExecutor: createToolExecutor(),
    provider: runtime.provider,
    eventLog: createFileEventLog(sessionId, eventsPath),
    confirmationStore: createFileConfirmationStore(pendingDir),
    revisionStore: createFileRevisionEventStore(revisionEventsPath),
    ledger: createEvidenceLedger(),
  };

  const scenario = loadScenarioFile(S3_YAML_PATH);

  const firstRun = await runScenario(scenario, { inputArtifacts: { CaseFile: CASE_FILE }, toolInputs: runtime.toolInputs }, firstDeps);
  if (firstRun.status !== 'paused') {
    throw new Error(`预期 S3 在 RiskList 确认门禁处暂停，实际状态是 "${firstRun.status}"`);
  }

  // 模拟"另一个进程"接续：每个依赖都通过磁盘路径重新获取，不复用 firstDeps 的内存
  // 闭包——异步确认预留的忠实模拟，与执行器的同款证明手法一致。
  const secondDeps: ScenarioExecutorDeps = {
    ...firstDeps,
    eventLog: createFileEventLog(sessionId, eventsPath),
    confirmationStore: createFileConfirmationStore(pendingDir),
    ledger: createEvidenceLedger(),
  };

  const secondRun = await resumeScenario(
    firstRun.requestId,
    {
      actor: { channelId: 'cli', actorId: 'demo-lawyer', role: '主办律师' },
      decision: 'confirm',
      revisions: [
        {
          artifactType: 'RiskList',
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

  const riskList = secondRun.artifacts.RiskList as RiskList;
  const revisionSet = compileConfirmedRiskListToRevisionInstructions(riskList, '04-设备采购合同.docx', secondDeps.ledger);

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
