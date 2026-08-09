import { describe, expect, it } from 'vitest';
import {
  createEventLog,
  createEvidenceLedger,
  createInMemoryConfirmationStore,
  createInMemoryRevisionEventStore,
  createToolRegistry,
  runScenario,
  resumeScenario,
  type ScenarioExecutorDeps,
} from '@courtwork/core';
import type { TurnRunnerPort } from '@courtwork/core';
import type { PartyGraph, ReviewMatrix, Timeline } from '@courtwork/legal';
import { LEGAL_PACKAGE } from '@courtwork/legal/package';
import { admitPackages, buildPackageRegistries, type ScenarioRuntime } from '@courtwork/registry';
import { createToolExecutor } from '@courtwork/tools';

/**
 * LEGAL-ANCHOR-BINDING-1 · S1／S2 引用闭环的执行器级证据（票面第四条：
 * 「S1/S2 真模型结构性失败风险的评测证据随票登记」）。
 *
 * 装配走真实包：`LEGAL_PACKAGE` 准入 → registries → `runScenario`。模型回合由 scripted
 * turn runner 承载（**真 key 真模型回合未执行，登记为 external-validated blocked**，
 * 承 `LEGAL-FIVE-FACES-1` 同一条边界）。本谱要证的不是模型的能力，而是**通道的形状**：
 * 债票落地后模型交的是引语、坐标由 resolver 铸；旧形态（模型自产 `sourceAnchors`）
 * 结构性走不通且失败是 typed 的，不静默。
 */

const CONTRACT_TEXT = '第一条 甲方晨曦印务有限公司与乙方起云智能装备股份有限公司签订本设备采购合同。\n第二条 买方应于验收后三十日内付清全部款项。';
const TEXT_LAYER_VERSION = 'source-text@1+ab12cd34';
const FILE_ID = '设备采购合同.md';

const MATERIAL = {
  fileId: FILE_ID,
  sha256: 'a'.repeat(64),
  readingMarkdown: CONTRACT_TEXT,
  blocks: [{ blockId: '0', text: CONTRACT_TEXT, rangeBase: 0, textLayerVersion: TEXT_LAYER_VERSION }],
};

const PARTIES_QUOTE = '甲方晨曦印务有限公司与乙方起云智能装备股份有限公司签订本设备采购合同';
const PAYMENT_QUOTE = '买方应于验收后三十日内付清全部款项';

const admission = admitPackages([LEGAL_PACKAGE]);
if (admission.rejected.length > 0) throw new Error(`legal package rejected: ${JSON.stringify(admission.rejected)}`);
const REGISTRIES = buildPackageRegistries(admission.admitted);

function scenario(id: string): ScenarioRuntime {
  const found = REGISTRIES.scenarios.list().find((item) => item.id === id);
  if (!found) throw new Error(`scenario missing: ${id}`);
  return found;
}

/** 按「本次产出目标地址」的 stepId 选脚本产物（承 LEGAL-FIVE-FACES-1 登记的樁纪律：不按调用计数选）。 */
function scriptedRunner(scriptFor: (stepId: string, attempt: number) => unknown): {
  runner: TurnRunnerPort;
  prompts: string[];
} {
  const prompts: string[] = [];
  const attempts = new Map<string, number>();
  const runner: TurnRunnerPort = {
    async run(input) {
      const content = input.request.messages[input.request.messages.length - 1]!.content;
      prompts.push(content);
      const match = content.match(/本次产出目标地址：\{"stepId":"([^"]+)","artifactType":"([^"]+)"\}/);
      if (!match) throw new Error('assembled request lost its target address segment');
      const [, stepId, artifactType] = match;
      const attempt = (attempts.get(stepId!) ?? 0) + 1;
      attempts.set(stepId!, attempt);
      return {
        status: 'completed',
        turnId: input.turnId,
        providerRequestId: input.providerRequestId,
        providerId: 'scripted',
        modelId: 'anchor-binding-fixture',
        assistantMessage: JSON.stringify({
          target: { stepId, artifactType },
          artifact: scriptFor(stepId!, attempt),
        }),
        reasoning: { status: 'absent' },
        finishReason: 'stop',
        completedAt: '2026-08-09T00:00:00.000Z',
      };
    },
  };
  return { runner, prompts };
}

function buildDeps(sessionId: string, runner: TurnRunnerPort): ScenarioExecutorDeps {
  return {
    tools: createToolRegistry(),
    toolExecutor: createToolExecutor(),
    turnRunner: runner,
    eventLog: createEventLog(sessionId, () => '2026-08-09T00:00:00.000Z'),
    confirmationStore: createInMemoryConfirmationStore(),
    revisionStore: createInMemoryRevisionEventStore(),
    ledger: createEvidenceLedger(),
    artifacts: REGISTRIES.artifactSchemas,
    projections: REGISTRIES.projections,
  };
}

function producedArtifact(deps: ScenarioExecutorDeps, artifactType: string) {
  const events = deps.eventLog.list().filter(
    (event) => event.type === 'artifact_produced' && event.artifactType === artifactType,
  );
  const last = events[events.length - 1];
  if (last?.type !== 'artifact_produced') throw new Error(`no artifact_produced for ${artifactType}`);
  return last;
}

/** 公证自检：铸出的坐标切回文本层必须逐字等于引语——「系统出坐标」的可核形态。 */
function assertMintedAnchor(anchor: { fileId: string; textRange?: { start: number; end: number }; textLayerVersion?: string; quote?: string }) {
  expect(anchor.fileId).toBe(FILE_ID);
  expect(anchor.textLayerVersion).toBe(TEXT_LAYER_VERSION);
  expect(anchor.textRange).toBeDefined();
  expect(CONTRACT_TEXT.slice(anchor.textRange!.start, anchor.textRange!.end)).toBe(anchor.quote);
}

const CASE_FILE_DRAFT = {
  caseId: 'anchor-binding',
  files: [{ fileId: FILE_ID, fileName: FILE_ID, documentType: 'supporting', ingestStatus: 'done', contentHash: 'sha' }],
};

const timelineDraft = (quote: string) => ({
  caseId: 'anchor-binding',
  events: [{
    id: 'evt-01',
    description: '双方签署设备采购合同',
    date: { kind: 'exact', date: '2024-03-11' },
    partyIds: [],
    quoteClaims: [{ fileId: FILE_ID, exactQuote: quote }],
  }],
});

const partyGraphDraft = (quote: string) => ({
  caseId: 'anchor-binding',
  nodes: [
    { id: 'p1', kind: 'organization', primaryName: '晨曦印务有限公司', aliases: [] },
    { id: 'p2', kind: 'organization', primaryName: '起云智能装备股份有限公司', aliases: [] },
  ],
  edges: [{
    id: 'e1',
    sourcePartyId: 'p1',
    targetPartyId: 'p2',
    relationType: '买卖合同相对方',
    quoteClaims: [{ fileId: FILE_ID, exactQuote: quote }],
  }],
});

const matrixDraft = (quote: string) => ({
  caseId: 'anchor-binding',
  questions: [{ id: 'q1', text: '付款期限如何约定' }, { id: 'q2', text: '是否约定违约金' }],
  rows: [{
    documentId: FILE_ID,
    answers: {
      q1: { answer: '验收后三十日内付清', quoteClaims: [{ fileId: FILE_ID, exactQuote: quote }], confidence: 'high' },
      // 「该文档未提及此问题」是合法答案：零引语 → 铸出零锚，格照常在册。
      q2: { answer: '该文档未提及此问题', quoteClaims: [], confidence: 'low' },
    },
  }],
});

const S1_INPUT = { inputArtifacts: {}, toolInputs: {}, materials: [MATERIAL] };

describe('LEGAL-ANCHOR-BINDING-1 · S1 卷宗阅卷的引用闭环', () => {
  it('模型只交引语，Timeline／PartyGraph 的坐标全部由 resolver 铸造（含续行第二枚产物）', async () => {
    const { runner } = scriptedRunner((stepId) => {
      if (stepId === 'intake-files') return CASE_FILE_DRAFT;
      if (stepId === 'build-timeline') return timelineDraft(PARTIES_QUOTE);
      return partyGraphDraft(PARTIES_QUOTE);
    });
    const deps = buildDeps('s1-anchor', runner);
    const s1 = scenario('legal.S1');

    const first = await runScenario(s1, S1_INPUT, deps);
    expect(first.status).toBe('paused');

    const timelineEvent = producedArtifact(deps, 'legal.Timeline');
    const timeline = timelineEvent.artifact as Timeline;
    expect(timeline.events).toHaveLength(1);
    assertMintedAnchor(timeline.events[0]!.sourceAnchors[0]!);
    expect(timeline.outOfCoverage).toEqual([]);
    expect(timelineEvent.citationStats).toEqual({
      claims: 1, firstPassResolved: 1, retryRounds: 0, resolvedAfterRetry: 1, outOfCoverage: 0,
    });

    // 门禁确认后续行产出关系图谱（第二道门禁）。
    const resumed = await resumeScenario(
      (first as { requestId: string }).requestId,
      { actor: { channelId: 'test', actorId: 'lawyer-01', role: '主办律师' }, decision: 'confirm' },
      s1,
      deps,
    );
    expect(resumed.status).toBe('paused');
    const graph = producedArtifact(deps, 'legal.PartyGraph').artifact as PartyGraph;
    expect(graph.edges).toHaveLength(1);
    assertMintedAnchor(graph.edges[0]!.sourceAnchors[0]!);
    expect(graph.outOfCoverage).toEqual([]);
  });

  it('模型自报坐标的旧形态结构性走不通：draft 无 quoteClaims 即 typed 拒收，绝不落格', async () => {
    // 本票之前 Timeline 的模型侧就是最终形，模型必须自己写 fileId/textRange/textLayerVersion。
    // 债票落地后那套输出连字段都不存在：缺 quoteClaims ⇒ 信封校验失败 ⇒ 显式 typed 失败。
    const { runner } = scriptedRunner((stepId) => {
      if (stepId === 'intake-files') return CASE_FILE_DRAFT;
      return {
        caseId: 'anchor-binding',
        events: [{
          id: 'evt-01',
          description: '双方签署设备采购合同',
          date: { kind: 'exact', date: '2024-03-11' },
          partyIds: [],
          sourceAnchors: [{ fileId: FILE_ID, textRange: { start: 0, end: 12 }, textLayerVersion: TEXT_LAYER_VERSION, quote: '第一条' }],
        }],
      };
    });
    const deps = buildDeps('s1-legacy-shape', runner);
    // 按址收货同层拒收：信封校验失败抛具名 GenerationValidationError，理由逐字点名缺的字段。
    await expect(runScenario(scenario('legal.S1'), S1_INPUT, deps)).rejects.toMatchObject({
      name: 'GenerationValidationError',
      message: expect.stringContaining('quoteClaims'),
    });
    // 失败是终态诚实：没有任何 Timeline 落格，模型自报的 textRange 一个字都没进账本。
    expect(deps.eventLog.list().some(
      (event) => event.type === 'artifact_produced' && event.artifactType === 'legal.Timeline',
    )).toBe(false);
    expect(JSON.stringify(deps.eventLog.list())).not.toContain('textRange');
  });

  it('编造的引语：受限修复重试携原判 → 仍不收敛的事件移入 outOfCoverage（诚实 partial）', async () => {
    const { runner, prompts } = scriptedRunner((stepId, attempt) => {
      if (stepId === 'intake-files') return CASE_FILE_DRAFT;
      return timelineDraft(attempt === 1 ? '本合同不存在的句子' : '仍然编造的句子');
    });
    const deps = buildDeps('s1-drift', runner);
    const result = await runScenario(scenario('legal.S1'), S1_INPUT, deps);
    expect(result.status).toBe('paused');

    // 重试请求携原判与拒收理由（只修引语，不重写判断）。
    expect(prompts.some((prompt) => prompt.includes('"repair"') && prompt.includes('not_found'))).toBe(true);

    const event = producedArtifact(deps, 'legal.Timeline');
    const timeline = event.artifact as Timeline;
    expect(timeline.events).toEqual([]);
    expect(timeline.outOfCoverage).toHaveLength(1);
    expect(timeline.outOfCoverage[0]!.summary).toBe('双方签署设备采购合同');
    expect(timeline.outOfCoverage[0]!.failures[0]!.reason).toBe('not_found');
    expect(event.citationStats).toMatchObject({ retryRounds: 1, outOfCoverage: 1 });
  });
});

describe('LEGAL-ANCHOR-BINDING-1 · S2 矩阵审阅的引用闭环（record 嵌套的格）', () => {
  it('格内引语经 resolver 铸锚；零引语的「未提及」格照常在册且零锚', async () => {
    const { runner } = scriptedRunner(() => matrixDraft(PAYMENT_QUOTE));
    const deps = buildDeps('s2-anchor', runner);
    const result = await runScenario(scenario('legal.S2'), S1_INPUT, deps);
    expect(result.status).toBe('paused');

    const event = producedArtifact(deps, 'legal.ReviewMatrix');
    const matrix = event.artifact as ReviewMatrix;
    const row = matrix.rows[0]!;
    assertMintedAnchor(row.answers.q1!.sourceAnchors[0]!);
    expect(row.answers.q2!.sourceAnchors).toEqual([]);
    expect(matrix.outOfCoverage).toEqual([]);
    expect(event.citationStats).toEqual({
      claims: 1, firstPassResolved: 1, retryRounds: 0, resolvedAfterRetry: 1, outOfCoverage: 0,
    });
  });

  it('行内任一格不收敛即整行移入 outOfCoverage（覆盖单元＝行）', async () => {
    const { runner } = scriptedRunner(() => matrixDraft('这句话不在合同里'));
    const deps = buildDeps('s2-drift', runner);
    const result = await runScenario(scenario('legal.S2'), S1_INPUT, deps);
    expect(result.status).toBe('paused');

    const matrix = producedArtifact(deps, 'legal.ReviewMatrix').artifact as ReviewMatrix;
    expect(matrix.rows).toEqual([]);
    expect(matrix.outOfCoverage).toHaveLength(1);
    expect(matrix.outOfCoverage[0]!.summary).toBe(FILE_ID);
  });
});
