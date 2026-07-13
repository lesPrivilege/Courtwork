import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createToolExecutor } from '@courtwork/tools';
import { applyRevisionInstructionSet, type InstructionOutcome } from '@courtwork/output';
import { convertToReadingView } from '@courtwork/reading-view';
import {
  compileConfirmedRiskListToRevisionInstructions,
  S3_PDF_CONTRACT_FILE_ID,
  S3_PDF_CREDIT_FILE_ID,
  S3_PDF_MINIMUM_PRELOADED_FINDINGS,
  S3_PDF_PRELOADED_ANCHOR_QUOTES,
  type CaseFile,
  type RiskList,
} from '@courtwork/legal';
import { assertEvidenceKeyAdmissible, createEvidenceLedger } from '../evidence/grade.js';
import { createFileEventLog, replaySession, type ReplaySummary } from '../events/event-log.js';
import type { CitationStats, SessionEvent } from '../events/types.js';
import { createFileConfirmationStore } from '../session/confirmation-store.js';
import { createFileRevisionEventStore } from '../revision/revision-store.js';
import { runScenario, resumeScenario, type ScenarioExecutorDeps, type RevisionInput } from '../scenario-executor/executor.js';
import type { GenerationRequest, Provider } from '@courtwork/provider/types';
import type { PackageRegistries } from '@courtwork/registry';
import {
  buildLegalDemoRunRuntime,
  materialFromReadingView,
  LEGAL_DEMO_MATERIAL_PATHS,
} from '../composition/demo-assembly.js';
import { buildRealS3Runtime, assertNoDemoInReal } from './run-s3-real.js';
import type { MaterialInput } from '../assembly/segments.js';

/**
 * LEGAL-DEMO-RUN 全链穿越（2026-07-13）：合成卷宗从上传到带修订 Word 的首次全链——
 *
 *   合同 PDF ─→ ReadingView ─→ 六段组装 ─→ 模型（Scripted / 真 key 双档）
 *     ─→ RiskList 真锚（resolver 铸造）─→ 门禁逐条处置 ─→ 编译修订指令 ─→ 修订 docx
 *
 * 每站产出结构化目击记录（stations[]），随产物一并落 workDir——这不是日志美化，
 * 是"每站事件与 UI 呈现逐一目击"的机器可核形态。双档规则：
 *   - Scripted 档（缺省）：装配点剧本回放，引语仍须过 resolver 对真实 PDF 文本层
 *     的唯一精确匹配——演示管线与真管线过同一道公证门，剧本没有免检通道。
 *   - 真 key 档（provider 注入）：与 real:s3 同规格，跑完门禁与 docx 全程，并执行
 *     assert-no-demo-in-real 四断言。
 */

export interface StationRecord {
  station: string;
  detail: Record<string, unknown>;
}

export interface CapturedWire {
  call: number;
  systemPromptSha256: string;
  userMessageSha256: string;
  /** 六段组装的 wire 标记物逐一在场（目击断言的对象，非实现细节复读）。 */
  segmentMarkers: Record<string, boolean>;
}

export interface LegalDemoResult {
  tier: 'scripted' | 'real';
  workDir: string;
  stations: StationRecord[];
  wires: CapturedWire[];
  riskList: RiskList;
  citationStats?: CitationStats;
  outcomes: InstructionOutcome[];
  docx: Buffer;
  eventTypes: SessionEvent['type'][];
  replay: ReplaySummary;
  goldenIssues: string[];
}

/** 全链黄金事件骨架：暂停前 3 + 续行后（确认、8 条逐条处置、修正重发、快照、完成）。 */
export const LEGAL_DEMO_GOLDEN_EVENT_TYPES = [
  'artifact_produced',
  'todo_snapshot',
  'confirmation_requested',
  'confirmation_resolved',
  'revision_recorded',
  'revision_recorded',
  'revision_recorded',
  'revision_recorded',
  'revision_recorded',
  'revision_recorded',
  'revision_recorded',
  'revision_recorded',
  'artifact_produced',
  'todo_snapshot',
  'scenario_completed',
] as const satisfies readonly SessionEvent['type'][];

/** 六段在 wire 上的标记物（assembly/segments.ts 的段首约定与材料信封）。 */
const SEGMENT_WIRE_MARKERS: Record<string, (wire: { system: string; user: string }) => boolean> = {
  contract: ({ system }) => system.includes('[Courtwork 握手契约]'),
  declaration: ({ system }) => system.includes('[场景声明：'),
  tenant: ({ system }) => system.includes('[租户段]'),
  projection: ({ system }) => system.includes('[续行投影 v'),
  session_corpus: ({ user }) => user.includes('<<<材料:开始 fileId='),
  view_mapping: ({ user }) => user.includes('[输出通道]'),
};

const sha256 = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');

/** provider 接缝目击器：透传生成，记录每次请求的 wire 摘要（哈希 + 六段标记物在场性）。 */
function withWireWitness(provider: Provider, wires: CapturedWire[]): Provider {
  return {
    id: provider.id,
    modelId: provider.modelId,
    async generate(request: GenerationRequest) {
      const system = request.systemPrompt ?? '';
      const user = request.messages.map((m) => m.content).join('\n');
      wires.push({
        call: wires.length + 1,
        systemPromptSha256: sha256(system),
        userMessageSha256: sha256(user),
        segmentMarkers: Object.fromEntries(
          Object.entries(SEGMENT_WIRE_MARKERS).map(([id, probe]) => [id, probe({ system, user })]),
        ),
      });
      return provider.generate(request);
    },
  };
}

/**
 * 逐锚复算（luna 判例：不采信自述）：锚点坐标切回材料文本层必须逐字等于引语。
 *
 * 消费方契约（本跑器首跑目击）：textRange 的坐标系是"块自己的坐标系"——PDF 为
 * 页内（每页 rangeBase=0，两页区间重叠），md/docx 为文档级。裸拿 range 找块必错页；
 * 必须先按 textLayerVersion（携 page 佐证）选块，再在块内做区间与逐字校验。
 * 任何锚点消费面（溯源 hover/click 等）接真 PDF 卷宗时同守此约。
 */
export function recomputeAnchors(riskList: RiskList, materials: MaterialInput[]): string[] {
  const violations: string[] = [];
  for (const risk of riskList.risks) {
    for (const basis of risk.basis) {
      for (const anchor of basis.sourceAnchors) {
        const material = materials.find((m) => m.fileId === anchor.fileId);
        const range = anchor.textRange;
        if (!material || !range || !anchor.quote) {
          violations.push(`${risk.id}: 锚点缺材料/坐标/引语（fileId=${anchor.fileId}）`);
          continue;
        }
        const block = (material.blocks ?? []).find(
          (b) =>
            b.textLayerVersion === anchor.textLayerVersion &&
            (anchor.page === undefined || b.page === anchor.page) &&
            range.start >= b.rangeBase &&
            range.end <= b.rangeBase + b.text.length,
        );
        if (!block) {
          violations.push(
            `${risk.id}: 无块匹配（textLayerVersion=${anchor.textLayerVersion} page=${anchor.page} range=[${range.start},${range.end})）`,
          );
          continue;
        }
        const slice = block.text.slice(range.start - block.rangeBase, range.end - block.rangeBase);
        if (slice !== anchor.quote) {
          violations.push(`${risk.id}: quote!==slice（fileId=${anchor.fileId} @${range.start}）`);
        }
      }
    }
  }
  return violations;
}

export interface RunLegalDemoOptions {
  workDir?: string;
  /** 真 key 档：注入真 provider（工具面同步换 real 运行时并启用 assert-no-demo-in-real）。 */
  provider?: Provider;
  qccApiKey?: string;
  now?: () => string;
}

export async function runLegalDemo(options: RunLegalDemoOptions = {}): Promise<LegalDemoResult> {
  const tier: LegalDemoResult['tier'] = options.provider ? 'real' : 'scripted';
  const workDir = options.workDir ?? mkdtempSync(join(tmpdir(), 'courtwork-legal-demo-'));
  const stations: StationRecord[] = [];
  const wires: CapturedWire[] = [];
  const goldenIssues: string[] = [];

  // ── 站 1 · 合成卷宗材料（自产 PDF 原件 + docx 修订孪生 + 信用查询单）──
  const pdfBytes = new Uint8Array(readFileSync(LEGAL_DEMO_MATERIAL_PATHS.contractPdf));
  const creditBytes = new Uint8Array(readFileSync(LEGAL_DEMO_MATERIAL_PATHS.creditMd));
  const twinBytes = readFileSync(LEGAL_DEMO_MATERIAL_PATHS.contractDocxTwin);
  stations.push({
    station: 'material',
    detail: {
      contractPdf: { fileId: S3_PDF_CONTRACT_FILE_ID, bytes: pdfBytes.length, sha256: sha256(pdfBytes) },
      creditMd: { fileId: S3_PDF_CREDIT_FILE_ID, bytes: creditBytes.length, sha256: sha256(creditBytes) },
      docxTwin: { bytes: twinBytes.length, sha256: sha256(new Uint8Array(twinBytes)) },
    },
  });

  // ── 站 2 · ReadingView（PDF 文本层判定 + md 块派生）──
  const pdfOutcome = await convertToReadingView({
    fileId: S3_PDF_CONTRACT_FILE_ID,
    fileName: S3_PDF_CONTRACT_FILE_ID,
    data: pdfBytes,
  });
  const creditOutcome = await convertToReadingView({
    fileId: S3_PDF_CREDIT_FILE_ID,
    fileName: S3_PDF_CREDIT_FILE_ID,
    data: creditBytes,
  });
  const contractMaterial = materialFromReadingView(pdfOutcome, pdfBytes);
  const creditMaterial = materialFromReadingView(creditOutcome, creditBytes);
  const materials = [contractMaterial, creditMaterial];
  stations.push({
    station: 'reading_view',
    detail: {
      contract: {
        status: pdfOutcome.status,
        pageCount: pdfOutcome.status === 'ok' ? pdfOutcome.pageCount : undefined,
        blocks: contractMaterial.blocks?.length,
        textLayerVersions: contractMaterial.blocks?.map((b) => b.textLayerVersion),
      },
      credit: { status: creditOutcome.status, blocks: creditMaterial.blocks?.length },
    },
  });

  // ── 站 3 · 运行时装配（双档在此分流；其余各站两档共用同一条管线）──
  let runtime: { tools: ScenarioExecutorDeps['tools']; registries: PackageRegistries };
  let baseProvider: Provider;
  let toolInputs: Record<string, unknown>;
  if (options.provider) {
    runtime = buildRealS3Runtime(options.qccApiKey);
    baseProvider = options.provider;
    toolInputs = { 'party-verify': { name: '临江精铸科技有限公司' } };
  } else {
    const demoRuntime = buildLegalDemoRunRuntime();
    runtime = demoRuntime;
    baseProvider = demoRuntime.provider;
    toolInputs = demoRuntime.toolInputs;
  }
  const scenario = runtime.registries.scenarios.get('legal.S3');
  if (!scenario) throw new Error('legal.S3 未在场景注册表中——legal 包装载异常');
  const provider = withWireWitness(baseProvider, wires);
  stations.push({
    station: 'runtime',
    detail: { tier, providerId: baseProvider.id, modelId: baseProvider.modelId, scenario: scenario.id },
  });

  const sessionId = `legal-demo-${tier}`;
  const eventsPath = join(workDir, 'events.jsonl');
  const pendingDir = join(workDir, 'pending');
  const revisionEventsPath = join(workDir, 'revision-events.jsonl');
  const makeDeps = (): ScenarioExecutorDeps => ({
    tools: runtime.tools,
    toolExecutor: createToolExecutor(),
    provider,
    eventLog: createFileEventLog(sessionId, eventsPath),
    confirmationStore: createFileConfirmationStore(pendingDir),
    revisionStore: createFileRevisionEventStore(revisionEventsPath),
    ledger: createEvidenceLedger(),
    artifacts: runtime.registries.artifactSchemas,
    projections: runtime.registries.projections,
    ...(options.now ? { now: options.now } : {}),
  });

  const caseFile: CaseFile = {
    caseId: 'case-linjiang-qiyun-2025',
    files: [
      { fileId: S3_PDF_CONTRACT_FILE_ID, fileName: S3_PDF_CONTRACT_FILE_ID, documentType: '合同', ingestStatus: 'done', pageCount: 2 },
      { fileId: S3_PDF_CREDIT_FILE_ID, fileName: S3_PDF_CREDIT_FILE_ID, documentType: '证据', ingestStatus: 'done', pageCount: 1 },
    ],
  };

  // ── 站 4 · 六段组装 + 模型生成 + 真锚铸造（runScenario 内联完成，wire 由接缝目击）──
  const firstRun = await runScenario(
    scenario,
    { inputArtifacts: { 'legal.CaseFile': caseFile }, toolInputs, materials },
    makeDeps(),
  );
  if (firstRun.status !== 'paused') {
    throw new Error(`预期 S3 在 RiskList 确认门禁处暂停，实际状态是 "${firstRun.status}"`);
  }
  const pausedEvents = createFileEventLog(sessionId, eventsPath).list();
  const producedEvent = pausedEvents.find((e) => e.type === 'artifact_produced');
  if (producedEvent?.type !== 'artifact_produced') throw new Error('未见 artifact_produced 事件');
  const draftList = producedEvent.artifact as RiskList;
  const citationStats = producedEvent.citationStats;
  stations.push({
    station: 'model_and_anchor',
    detail: {
      generateCalls: wires.length,
      segmentMarkers: wires[0]?.segmentMarkers,
      risks: draftList.risks.length,
      outOfCoverage: draftList.outOfCoverage.length,
      citationStats,
      anchorRecompute: recomputeAnchors(draftList, materials),
    },
  });

  // ── 站 5 · 门禁暂停（confirmation_requested + todo 快照先行）──
  stations.push({
    station: 'gate_paused',
    detail: {
      requestId: firstRun.requestId,
      gateLabel: pausedEvents.find((e) => e.type === 'confirmation_requested')?.type === 'confirmation_requested'
        ? (pausedEvents.find((e) => e.type === 'confirmation_requested') as Extract<SessionEvent, { type: 'confirmation_requested' }>).gateLabel
        : undefined,
      eventTypesSoFar: pausedEvents.map((e) => e.type),
    },
  });

  // ── 站 6 · 门禁逐条处置（律师逐项定夺：7 条确认 + risk-05 驳回，全量留痕）──
  const dispositions: RevisionInput[] = draftList.risks.map((risk) => ({
    artifactType: 'legal.RiskList',
    artifactId: draftList.caseId,
    fieldPath: `/risks/${draftList.risks.indexOf(risk)}/dispositionStatus`,
    previousValue: 'pending',
    newValue: risk.id === 'risk-05' ? 'rejected' : 'confirmed',
    reason:
      risk.id === 'risk-05'
        ? '不可抗力为常规列举式表述，本次谈判不作为修订点（律师逐条审阅后驳回）'
        : '逐条审阅依据原文与锚点后确认',
    caseId: draftList.caseId,
  }));
  const secondRun = await resumeScenario(
    firstRun.requestId,
    {
      actor: { channelId: 'cli', actorId: 'demo-lawyer', role: '主办律师' },
      decision: 'confirm',
      revisions: dispositions,
      instrumentation: { dwellMs: 6400, expandedEvidenceKeys: ['party-verify'] },
    },
    scenario,
    makeDeps(),
  );
  if (secondRun.status !== 'completed') {
    throw new Error(`预期确认后场景完成，实际状态是 "${secondRun.status}"`);
  }
  const riskList = secondRun.artifacts['legal.RiskList'] as RiskList;
  stations.push({
    station: 'gate_resolved',
    detail: {
      decisions: dispositions.map((d) => ({ fieldPath: d.fieldPath, newValue: d.newValue })),
      confirmed: riskList.risks.filter((r) => r.dispositionStatus === 'confirmed').length,
      rejected: riskList.risks.filter((r) => r.dispositionStatus === 'rejected').length,
    },
  });

  // ── 站 7 · 编译修订指令（信源门禁经注入口绑定台账）──
  const finalDeps = makeDeps();
  const gatekeeper = {
    issueKey: (citation: string) => finalDeps.ledger.issueKey(citation),
    assertAdmissible: (key: string) => assertEvidenceKeyAdmissible(finalDeps.ledger, key),
  };
  const revisionSet = compileConfirmedRiskListToRevisionInstructions(riskList, '设备采购合同.docx', gatekeeper);
  stations.push({
    station: 'compile_revisions',
    detail: {
      instructions: revisionSet.instructions.length,
      skippedRejected: riskList.risks.length - revisionSet.instructions.length,
      targetDocument: revisionSet.targetDocument.fileId,
    },
  });

  // ── 站 8 · 修订 docx 落产出（定位失败即跳过不错插；产物 + 指令集落盘）──
  const { docx, outcomes } = applyRevisionInstructionSet(twinBytes, revisionSet, {
    now: new Date('2026-07-13T09:00:00.000Z'),
  });
  writeFileSync(join(workDir, 'redline.docx'), docx);
  writeFileSync(join(workDir, 'revision-instruction-set.json'), JSON.stringify(revisionSet, null, 2));
  stations.push({
    station: 'redline_docx',
    detail: {
      bytes: docx.length,
      sha256: sha256(new Uint8Array(docx)),
      outcomes: outcomes.map((o) => ({ id: o.id, status: o.status })),
    },
  });

  const finalEvents = createFileEventLog(sessionId, eventsPath).list();
  const eventTypes = finalEvents.map((e) => e.type);
  const replay = replaySession(finalEvents);

  // ── 黄金对照：事件骨架 + 预埋考点命中 + 锚点复算 + 产出处置 ──
  if (JSON.stringify(eventTypes) !== JSON.stringify(LEGAL_DEMO_GOLDEN_EVENT_TYPES)) {
    goldenIssues.push(`事件骨架 DIFF：实际 ${eventTypes.join(' -> ')}`);
  }
  const anchorQuotes = riskList.risks.flatMap((r) =>
    r.basis.flatMap((b) => b.sourceAnchors.flatMap((a) => (a.quote ? [a.quote] : []))),
  );
  const preloadedHits = S3_PDF_PRELOADED_ANCHOR_QUOTES.filter((expected) =>
    anchorQuotes.some((actual) => actual.includes(expected)),
  ).length;
  if (preloadedHits < S3_PDF_MINIMUM_PRELOADED_FINDINGS) {
    goldenIssues.push(`预埋考点仅命中 ${preloadedHits}/${S3_PDF_PRELOADED_ANCHOR_QUOTES.length}，门槛 ${S3_PDF_MINIMUM_PRELOADED_FINDINGS}`);
  }
  const anchorViolations = recomputeAnchors(riskList, materials);
  if (anchorViolations.length > 0) goldenIssues.push(...anchorViolations);
  const appliedCount = outcomes.filter((o) => o.status === 'applied').length;
  if (appliedCount === 0) goldenIssues.push('修订指令零命中——docx 孪生与引语失配');
  for (const wire of wires) {
    const missing = Object.entries(wire.segmentMarkers).filter(([, present]) => !present).map(([id]) => id);
    if (missing.length > 0) goldenIssues.push(`第 ${wire.call} 次请求缺六段标记：${missing.join(',')}`);
  }
  if (tier === 'real') {
    const violations = assertNoDemoInReal({
      providerId: baseProvider.id,
      events: finalEvents,
      materials,
      realMaterialFileIds: [S3_PDF_CONTRACT_FILE_ID, S3_PDF_CREDIT_FILE_ID],
    });
    if (violations.length > 0) goldenIssues.push(...violations.map((v) => `no-demo-in-real: ${v}`));
  }

  const result: LegalDemoResult = {
    tier,
    workDir,
    stations,
    wires,
    riskList,
    citationStats,
    outcomes,
    docx,
    eventTypes,
    replay,
    goldenIssues,
  };
  writeFileSync(
    join(workDir, 'legal-demo-evidence.json'),
    JSON.stringify(
      {
        tier,
        stations,
        wires,
        eventTypes,
        goldenIssues,
        preloadedHits,
        replaySummary: {
          completed: replay.completed,
          artifactTypes: Object.keys(replay.artifacts),
          confirmations: Object.keys(replay.confirmations).length,
          revisionEvents: replay.revisionEventIds.length,
        },
      },
      null,
      2,
    ),
  );
  return result;
}
