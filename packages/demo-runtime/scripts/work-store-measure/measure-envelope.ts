import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createToolExecutor } from '@courtwork/tools';
import { convertToReadingView } from '@courtwork/reading-view';
import type { CaseFile, RiskList } from '@courtwork/legal';
import type { RevisionEvent } from '@courtwork/schemas';
import {
  createEvidenceLedger,
  createFileConfirmationStore,
  createFileEventLog,
  createFileRevisionEventStore,
  createFileTurnStore,
  runScenario,
  resumeScenario,
  type ConfirmationStore,
  type EventLog,
  type MaterialInput,
  type PendingConfirmation,
  type PersistedTurn,
  type RevisionEventStore,
  type RevisionInput,
  type ScenarioExecutorDeps,
  type SessionEvent,
  type TurnStore,
} from '@courtwork/core';
import {
  buildLegalDemoRunRuntime,
  composeRuntimeTurnRunner,
  materialFromReadingView,
  LEGAL_DEMO_MATERIAL_PATHS,
} from '../../src/composition/demo-assembly.js';

/**
 * WORK-STORE-MEASURE · 度量一：whole-envelope 序列化 bytes 分布与单场景 write count。
 *
 * 本脚本不实现 WORK-STORE-1，也不改 store。它用真实 legal.S3 scripted 全链（同
 * `demo:legal` 的合成卷宗 fixture）驱动真实 executor，在每一次会真正落账的 store
 * 变更点，按 ADR-010「决定二」的 WorkStateEnvelopeV1 形状把当前四段账本（events /
 * turnEntries / pendingConfirmations / revisionEvents）+ 元数据组装成一份 whole
 * envelope，度量其紧凑 JSON 的 UTF-8 字节数。这样得到的是「若此刻做一次 whole-envelope
 * CAS，需要写多少字节」的真值序列——不是猜测，是观测真实执行机的真实写点。
 *
 * 输出（stdout，可复现）：每个写点的 bytes、峰值/终值 envelope、三种 write-count 模型
 * （barrier 最小 / per-revision 保守 / per-mutation 上界）及各自的累计写入量（写放大）。
 */

// ── ADR-010「决定二」的生产状态信封形状（此处本地镜像，尚未落 core；WORK-STORE-1 才实现）──
interface WorkStateEnvelopeV1 {
  storageVersion: 1;
  revision: number;
  caseId: string;
  sessionId: string;
  chainId: string;
  predecessorSessionId?: string;
  scenarioId: string;
  packageId: string;
  packageVersion: string;
  schemaVersion: number;
  scenarioFingerprint: string;
  modelRoute: { providerId: string; modelId: string; reasoning: 'standard' | 'deep' };
  materialRefs: string[];
  createdAt: string;
  runtimeBudget: {
    limits: { maxSteps?: number; maxSeconds?: number; maxToolCalls?: number; maxUsd?: number };
    costBasis: { currency: 'USD'; priceTableVersion?: string; priceTableEffectiveAt?: string; assumptions: string[] };
    consumed: { steps: number; toolCalls: number; executionMs: number; estimatedUsd: number; costCoverage: 'complete' | 'partial' };
  };
  events: SessionEvent[];
  turnEntries: PersistedTurn[];
  pendingConfirmations: PendingConfirmation[];
  revisionEvents: RevisionEvent[];
}

interface WritePoint {
  index: number;
  label: string;
  /** durable-before-effect 屏障类别（write-count 建模用）。 */
  barrier: 'header' | 'turn_linked' | 'turn_terminal' | 'pause_batch' | 'resume_resolve' | 'revision' | 'resume_tail';
  bytes: number;
}

const FIXED_NOW = '2026-07-13T09:00:00.000Z';
const SESSION_ID = 'legal-demo-scripted';
const CASE_ID = 'case-linjiang-qiyun-2025';

/**
 * 会话元数据（非四段账本部分）。这些是接近常量的小字段；whole-envelope 的字节主项是
 * events/turns/pending/revisions 的真实数据，元数据只是稳定的小常量项，随本报告披露。
 */
function metadata(revision: number): Omit<WorkStateEnvelopeV1, 'events' | 'turnEntries' | 'pendingConfirmations' | 'revisionEvents'> {
  return {
    storageVersion: 1,
    revision,
    caseId: CASE_ID,
    sessionId: SESSION_ID,
    chainId: SESSION_ID,
    scenarioId: 'legal.S3',
    packageId: 'legal',
    packageVersion: '0.1.0',
    schemaVersion: 1,
    scenarioFingerprint: 'legal.S3@1+0000000000000000000000000000000000000000000000000000000000000000',
    modelRoute: { providerId: 'demo-scripted-provider', modelId: 'fake-scripted-v1', reasoning: 'standard' },
    materialRefs: [LEGAL_DEMO_MATERIAL_PATHS.contractPdf, LEGAL_DEMO_MATERIAL_PATHS.creditMd].map(
      (p) => p.split('/').pop() ?? p,
    ),
    createdAt: FIXED_NOW,
    runtimeBudget: {
      limits: { maxSteps: 32, maxSeconds: 600, maxToolCalls: 16, maxUsd: 2 },
      costBasis: { currency: 'USD', priceTableVersion: 'deepseek@2026-07', priceTableEffectiveAt: FIXED_NOW, assumptions: ['scripted tier：无真实 usage，估价覆盖不完整'] },
      consumed: { steps: 2, toolCalls: 1, executionMs: 0, estimatedUsd: 0, costCoverage: 'partial' },
    },
  };
}

function envelopeBytes(
  revision: number,
  events: SessionEvent[],
  turnEntries: PersistedTurn[],
  pendingConfirmations: PendingConfirmation[],
  revisionEvents: RevisionEvent[],
): number {
  const envelope: WorkStateEnvelopeV1 = {
    ...metadata(revision),
    events,
    turnEntries,
    pendingConfirmations,
    revisionEvents,
  };
  return Buffer.byteLength(JSON.stringify(envelope), 'utf-8');
}

async function main(): Promise<void> {
  const workDir = mkdtempSync(join(tmpdir(), 'courtwork-work-store-measure-'));
  const points: WritePoint[] = [];

  // ── 真实 legal.S3 scripted 材料（合成卷宗 fixture，同 demo:legal）──
  const pdfBytes = new Uint8Array(readFileSync(LEGAL_DEMO_MATERIAL_PATHS.contractPdf));
  const creditBytes = new Uint8Array(readFileSync(LEGAL_DEMO_MATERIAL_PATHS.creditMd));
  const pdfOutcome = await convertToReadingView({ fileId: '设备采购合同.pdf', fileName: '设备采购合同.pdf', data: pdfBytes });
  const creditOutcome = await convertToReadingView({ fileId: '20-企业信用信息查询单.md', fileName: '20-企业信用信息查询单.md', data: creditBytes });
  const materials: MaterialInput[] = [
    materialFromReadingView(pdfOutcome, pdfBytes),
    materialFromReadingView(creditOutcome, creditBytes),
  ];

  const runtime = buildLegalDemoRunRuntime();
  const scenario = runtime.registries.scenarios.get('legal.S3');
  if (!scenario) throw new Error('legal.S3 未注册——legal 包装载异常');

  // ── 真实 file 账本 + 观测包装：每次真实落账后组装 whole-envelope 度量字节 ──
  const eventsPath = join(workDir, 'events.jsonl');
  const turnsPath = join(workDir, 'turns.jsonl');
  const pendingDir = join(workDir, 'pending');
  const revisionEventsPath = join(workDir, 'revision-events.jsonl');

  const realEventLog = createFileEventLog(SESSION_ID, eventsPath, () => FIXED_NOW);
  const realTurnStore = createFileTurnStore(turnsPath, () => FIXED_NOW);
  const realConfirmationStore = createFileConfirmationStore(pendingDir);
  const realRevisionStore = createFileRevisionEventStore(revisionEventsPath);

  let livePending: PendingConfirmation[] = [];
  let writeIndex = 0;
  const record = (label: string, barrier: WritePoint['barrier']): void => {
    writeIndex += 1;
    const bytes = envelopeBytes(
      writeIndex,
      realEventLog.list(),
      realTurnStore.list(),
      livePending,
      realRevisionStore.list(),
    );
    points.push({ index: writeIndex, label, barrier, bytes });
  };

  const barrierForEvent = (type: SessionEvent['type']): WritePoint['barrier'] => {
    if (type === 'turn_linked') return 'turn_linked';
    if (type === 'confirmation_requested' || type === 'artifact_produced' || type === 'todo_snapshot') return 'pause_batch';
    if (type === 'confirmation_resolved') return 'resume_resolve';
    if (type === 'revision_recorded') return 'revision';
    return 'resume_tail';
  };

  const observingEventLog: EventLog = {
    sessionId: realEventLog.sessionId,
    append(input) {
      const event = realEventLog.append(input);
      // pause 前 confirmation_requested 前的 pending/artifact/todo 归 pause_batch；
      // resume 后 artifact/todo/completed 归 resume_tail。以是否已消费 pending 判所处段。
      const inResumeTail = livePending.length === 0 && (event.type === 'artifact_produced' || event.type === 'todo_snapshot' || event.type === 'scenario_completed') && realRevisionStore.list().length > 0;
      record(`event:${event.type}`, inResumeTail ? 'resume_tail' : barrierForEvent(event.type));
      return event;
    },
    list: () => realEventLog.list(),
  };

  const observingTurnStore: TurnStore = {
    save(turn) {
      realTurnStore.save(turn);
      record('turn:terminal', 'turn_terminal');
    },
    get: (id) => realTurnStore.get(id),
    list: () => realTurnStore.list(),
    appendInteractionRequested: (input) => realTurnStore.appendInteractionRequested(input),
    resolveInteraction: (input) => realTurnStore.resolveInteraction(input),
    events: (id) => realTurnStore.events(id),
    replayTurn: (id) => realTurnStore.replayTurn(id),
  };

  const observingConfirmationStore: ConfirmationStore = {
    save(pending) {
      realConfirmationStore.save(pending);
      livePending = [pending];
      record('pending:save', 'pause_batch');
    },
    peek: (id) => realConfirmationStore.peek(id),
    consume(id, version) {
      const consumed = realConfirmationStore.consume(id, version);
      if (consumed) livePending = [];
      record('pending:consume', 'resume_resolve');
      return consumed;
    },
  };

  const observingRevisionStore: RevisionEventStore = {
    record(event) {
      realRevisionStore.record(event);
      record('revision:payload', 'revision');
    },
    list: () => realRevisionStore.list(),
  };

  const makeDeps = (): ScenarioExecutorDeps => ({
    tools: runtime.tools,
    toolExecutor: createToolExecutor(),
    turnRunner: composeRuntimeTurnRunner(runtime.provider, observingTurnStore),
    eventLog: observingEventLog,
    confirmationStore: observingConfirmationStore,
    revisionStore: observingRevisionStore,
    ledger: createEvidenceLedger(),
    artifacts: runtime.registries.artifactSchemas,
    projections: runtime.registries.projections,
    now: () => FIXED_NOW,
  });

  const caseFile: CaseFile = {
    caseId: CASE_ID,
    files: [
      { fileId: '设备采购合同.pdf', fileName: '设备采购合同.pdf', documentType: '合同', ingestStatus: 'done', pageCount: 2 },
      { fileId: '20-企业信用信息查询单.md', fileName: '20-企业信用信息查询单.md', documentType: '证据', ingestStatus: 'done', pageCount: 1 },
    ],
  };

  // ── CAS #0：session header（ADR-010 决定二①：header 持久后才能跑工具/provider）──
  record('session:header', 'header');

  // ── 站 1：runScenario → 暂停在 RiskList 确认门 ──
  const firstRun = await runScenario(
    scenario,
    { inputArtifacts: { 'legal.CaseFile': caseFile }, toolInputs: runtime.toolInputs, materials },
    makeDeps(),
  );
  if (firstRun.status !== 'paused') throw new Error(`预期暂停，实际 ${firstRun.status}`);

  // 捕获 pause 快照（真实 events/turns/pending），供上界曲线用真实结构、只变材料文本大小。
  const pauseSnapshot = {
    events: realEventLog.list(),
    turns: realTurnStore.list(),
    pending: livePending[0],
  };

  // ── 站 2：resumeScenario（7 确认 + risk-05 驳回，全 8 条留痕）→ 完成 ──
  const draftList = realEventLog.list().find((e) => e.type === 'artifact_produced');
  if (draftList?.type !== 'artifact_produced') throw new Error('未见 artifact_produced');
  const risks = (draftList.artifact as RiskList).risks;
  const dispositions: RevisionInput[] = risks.map((risk, i) => ({
    artifactType: 'legal.RiskList',
    artifactId: (draftList.artifact as RiskList).caseId,
    fieldPath: `/risks/${i}/dispositionStatus`,
    previousValue: 'pending',
    newValue: risk.id === 'risk-05' ? 'rejected' : 'confirmed',
    reason: risk.id === 'risk-05' ? '不可抗力为常规列举式表述，本次谈判不作为修订点（律师逐条审阅后驳回）' : '逐条审阅依据原文与锚点后确认',
    caseId: (draftList.artifact as RiskList).caseId,
  }));
  const secondRun = await resumeScenario(
    firstRun.requestId,
    { actor: { channelId: 'cli', actorId: 'demo-lawyer', role: '主办律师' }, decision: 'confirm', revisions: dispositions, instrumentation: { dwellMs: 6400, expandedEvidenceKeys: ['party-verify'] } },
    scenario,
    makeDeps(),
  );
  if (secondRun.status !== 'completed') throw new Error(`预期完成，实际 ${secondRun.status}`);

  report(points, materials);
  reportUpperBound(pauseSnapshot);
  rmSync(workDir, { recursive: true, force: true });
}

/**
 * 上界曲线：拿真实 pause 快照（真实 events/turns/pending 结构），只把 pending.materials
 * 的 readingMarkdown 总量替换为不同「案件抽取文本总字节」M，度量峰值 envelope。peak 随 M
 * 近似线性（材料在 envelope 内只出现在 pending.materials 一处）。用于判断真实大案的峰值上界。
 */
function reportUpperBound(pause: { events: SessionEvent[]; turns: PersistedTurn[]; pending: PendingConfirmation | undefined }): void {
  if (!pause.pending) throw new Error('pause 快照缺 pending');
  const actualMaterialBytes = (pause.pending.materials ?? []).reduce((a, m) => a + Buffer.byteLength(m.readingMarkdown, 'utf-8'), 0);
  const baseBytes = envelopeBytes(7, pause.events, pause.turns, [pause.pending], []);
  const resize = (targetTotalBytes: number): PendingConfirmation => {
    const first = (pause.pending!.materials ?? [])[0];
    if (!first) return pause.pending!;
    // 把首个材料的 readingMarkdown 撑到目标总字节（其余材料保持真实），只变文本长度不变结构。
    const otherBytes = (pause.pending!.materials ?? []).slice(1).reduce((a, m) => a + Buffer.byteLength(m.readingMarkdown, 'utf-8'), 0);
    const targetFirst = Math.max(0, targetTotalBytes - otherBytes);
    return {
      ...pause.pending!,
      materials: [{ ...first, readingMarkdown: 'x'.repeat(targetFirst) }, ...(pause.pending!.materials ?? []).slice(1)],
    };
  };
  console.log('');
  console.log('— 峰值上界曲线（真实结构，仅变案件抽取文本总字节 M）—');
  console.log(`  实测 M=${actualMaterialBytes}B → peak=${baseBytes}B (${(baseBytes / 1024).toFixed(2)} KiB)`);
  for (const M of [50 * 1024, 200 * 1024, 1024 * 1024, 5 * 1024 * 1024]) {
    const peak = envelopeBytes(7, pause.events, pause.turns, [resize(M)], []);
    console.log(`  M=${(M / 1024).toFixed(0).padStart(5)}KiB → peak=${String(peak).padStart(8)}B (${(peak / 1024 / 1024).toFixed(3)} MiB)`);
  }
  console.log('  （近似线性：peak ≈ 非材料基线 + M。非材料基线含 events+turn+pending 内 artifact/toolResults/ledger。）');
}

function pct(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sortedAsc.length) - 1;
  return sortedAsc[Math.min(Math.max(rank, 0), sortedAsc.length - 1)];
}

function report(points: WritePoint[], materials: MaterialInput[]): void {
  const bytes = points.map((pt) => pt.bytes);
  const sorted = [...bytes].sort((a, b) => a - b);
  const peak = Math.max(...bytes);
  const peakPoint = points.find((pt) => pt.bytes === peak);
  const final = bytes[bytes.length - 1];

  // write-count 三模型（同一份 per-point 字节，按屏障归并）：
  // barrier 最小：每个 durable-before-effect 屏障一次 CAS，取该屏障组内最后一点字节（已含组内全部落账）。
  const barrierOrder: WritePoint['barrier'][] = ['header', 'turn_linked', 'turn_terminal', 'pause_batch', 'resume_resolve', 'revision', 'resume_tail'];
  const lastOfBarrier = (b: WritePoint['barrier']): WritePoint | undefined => [...points].reverse().find((pt) => pt.barrier === b);
  // per-revision 保守：resume 尾把每条 revision 算一次 CAS（payload+revision_recorded 同一信封落一次），
  // 取 revision_recorded 事件点的字节为该次代表值（此时该条 payload 已在信封内）。
  const revisionPoints = points.filter((pt) => pt.label === 'event:revision_recorded');

  const barrierWrites: number[] = [];
  for (const b of barrierOrder) {
    if (b === 'revision') continue; // revision 归入 resume_tail 的单次
    const last = lastOfBarrier(b);
    if (last) barrierWrites.push(last.bytes);
  }
  // barrier 最小把 revision + resume_tail 合成 1 次（取 resume_tail 末点=终值），已由 resume_tail 覆盖。

  const perRevisionWrites: number[] = [];
  for (const b of barrierOrder) {
    if (b === 'revision') { revisionPoints.forEach((pt) => perRevisionWrites.push(pt.bytes)); continue; }
    const last = lastOfBarrier(b);
    if (last) perRevisionWrites.push(last.bytes);
  }

  const perMutationWrites = bytes; // 每个真实落账点各一次 CAS（上界）

  const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
  const kib = (n: number): string => (n / 1024).toFixed(2);

  const materialBytes = materials.map((m) => Buffer.byteLength(m.readingMarkdown, 'utf-8'));

  console.log('==== WORK-STORE-MEASURE · 度量一：whole-envelope bytes 分布 + write count ====');
  console.log(`fixture：legal.S3 scripted 全链（合成卷宗，同 demo:legal）；8 风险 / 单 Turn / 7 确认+1 驳回`);
  console.log(`材料 readingMarkdown 字节：合同=${materialBytes[0]}B，信用单=${materialBytes[1]}B（进入 pending.materials 快照）`);
  console.log('');
  console.log(`真实落账写点数（per-mutation 上界）：${points.length}`);
  console.log('');
  console.log('— 逐写点 whole-envelope 字节 —');
  for (const pt of points) {
    console.log(`  #${String(pt.index).padStart(2)} [${pt.barrier.padEnd(14)}] ${pt.label.padEnd(26)} ${String(pt.bytes).padStart(7)} B  (${kib(pt.bytes)} KiB)`);
  }
  console.log('');
  console.log('— 分布 —');
  console.log(`  min=${sorted[0]}B  p50=${pct(sorted, 50)}B  p95=${pct(sorted, 95)}B  max(peak)=${peak}B (${kib(peak)} KiB) @ "${peakPoint?.label}"`);
  console.log(`  final=${final}B (${kib(final)} KiB)`);
  console.log('');
  console.log('— write count × 累计写入量（写放大）三模型 —');
  console.log(`  barrier 最小        : ${barrierWrites.length} 次 CAS，累计 ${sum(barrierWrites)}B (${kib(sum(barrierWrites))} KiB)`);
  console.log(`  per-revision 保守   : ${perRevisionWrites.length} 次 CAS，累计 ${sum(perRevisionWrites)}B (${kib(sum(perRevisionWrites))} KiB)`);
  console.log(`  per-mutation 上界   : ${perMutationWrites.length} 次 CAS，累计 ${sum(perMutationWrites)}B (${kib(sum(perMutationWrites))} KiB)`);
  console.log('');
  console.log(`峰值 envelope = ${peak}B (${kib(peak)} KiB)；这是单次 whole-envelope CAS 的最大写入量。`);
  console.log('（阈值判读见 REPORT.md）');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
