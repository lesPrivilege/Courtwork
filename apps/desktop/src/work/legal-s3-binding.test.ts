import { describe, expect, it } from 'vitest';
import {
  createArtifactEnvelopeCodec,
  createEvidenceLedger,
  createInMemoryWorkStateHost,
  loadWorkStateStore,
  readWorkStateEnvelope,
  runScenario,
  resumeScenario,
  type TurnRunnerPort,
  type WorkStateHeader,
} from '@courtwork/core';
import type { RiskList } from '@courtwork/legal';
import type { EvidenceGradeAnnotation } from '@courtwork/core';
import type { ResolveResult } from '../material/material-store';
import type { StoredMaterial } from '../material/material-ref';
import {
  IncompleteReviewError,
  LEGAL_S3_SCHEMA_VERSION,
  MaterialResolutionBlockedError,
  MissingContractPartyError,
  MissingToolInputError,
  PARTY_VERIFY_TOOL_ID,
  ReviseNotTerminalError,
  S3_RISK_LIST_TYPE,
  S3_SCENARIO_ID,
  UnknownReviewItemError,
  admitLegalS3Package,
  bindDocxSourceMarkdown,
  buildArtifactVersioningSource,
  buildS3RunInput,
  buildS3ToolInputs,
  createLegalS3ScenarioDeps,
  createProductionS3ToolRegistry,
  getS3Scenario,
  mapReviewResolutionToResume,
  projectRiskListGate,
  resolveSessionMaterials,
  toMaterialInputs,
} from './legal-s3-binding';

const ACTOR = { channelId: 'desktop', actorId: 'lawyer-1', role: '主办律师' };

function storedMaterial(overrides: Partial<StoredMaterial> = {}): StoredMaterial {
  return {
    materialId: 'mat-1',
    caseId: 'case-x',
    fileName: '合同.md',
    mediaType: 'text/markdown',
    byteLength: 12,
    contentSha256: 'sha-content',
    readingViewVersion: 'reading-view-material@1',
    readingViewSha256: 'sha-view',
    status: 'ready',
    readingMarkdown: '# 合同\n\n甲方应于三日内付款。',
    blocks: [{ blockId: '0', page: 1, text: '甲方应于三日内付款。', rangeBase: 0, textLayerVersion: 'v1' }],
    ...overrides,
  };
}

function riskList(risks: RiskList['risks']): RiskList {
  return { caseId: 'case-x', risks, outOfCoverage: [] };
}

function risk(id: string, level: 'high' | 'medium' | 'low', citation = '合同第一条'): RiskList['risks'][number] {
  return {
    id,
    description: `${id} 描述`,
    level,
    basis: [{ citation, sourceAnchors: [{ fileId: 'mat-1', textLayerVersion: 'v1', page: 1, textRange: { start: 0, end: 10 }, quote: '甲方应于三日内付款。' }] }],
    dispositionStatus: 'pending',
  };
}

function fakeTurnRunner(assistantMessage: string): TurnRunnerPort {
  return {
    async run(input) {
      return {
        status: 'completed',
        turnId: input.turnId,
        providerRequestId: input.providerRequestId,
        providerId: 'test-provider',
        modelId: 'test-model',
        reasoning: { status: 'absent' },
        assistantMessage,
        finishReason: 'stop',
        completedAt: '2026-07-16T00:00:00.000Z',
      };
    },
  };
}

function header(): WorkStateHeader {
  return {
    caseId: 'case-x',
    sessionId: 's1',
    chainId: 's1',
    scenarioId: S3_SCENARIO_ID,
    packageId: 'legal',
    packageVersion: '0.1.0',
    schemaVersion: LEGAL_S3_SCHEMA_VERSION,
    scenarioFingerprint: 'legal.S3@1+' + '0'.repeat(64),
    modelRoute: { providerId: 'test-provider', modelId: 'test-model', reasoning: 'standard' },
    materialRefs: ['mat-1'],
    createdAt: '2026-07-16T00:00:00.000Z',
    runtimeBudget: {
      limits: {},
      costBasis: { currency: 'USD', assumptions: [] },
      consumed: { steps: 0, toolCalls: 0, executionMs: 0, estimatedUsd: 0, costCoverage: 'partial' },
    },
  };
}

describe('LEGAL-S3-BINDING · 显式主体输入（ADR-010 决定五）', () => {
  it('显式主体 → party-verify 工具输入', () => {
    expect(buildS3ToolInputs({ partyName: '临江精铸科技有限公司' })).toEqual({
      [PARTY_VERIFY_TOOL_ID]: { name: '临江精铸科技有限公司' },
    });
  });

  it('缺主体（空/仅空白）→ 显式阻断 MissingContractPartyError，不默认补全', () => {
    expect(() => buildS3ToolInputs({ partyName: '' })).toThrow(MissingContractPartyError);
    expect(() => buildS3ToolInputs({ partyName: '   ' })).toThrow(MissingContractPartyError);
  });
});

describe('LEGAL-S3-BINDING · 缺工具输入显式阻断', () => {
  it('scenario 声明的 toolId 缺输入 → MissingToolInputError（不默认补全）', () => {
    const scenario = getS3Scenario(admitLegalS3Package());
    expect(() => buildS3RunInput({ scenario, subject: undefined, materials: [] })).toThrow(MissingToolInputError);
    // 显式给了主体则闭合
    expect(() => buildS3RunInput({ scenario, subject: { partyName: '临江精铸' }, materials: [] })).not.toThrow();
  });
});

describe('LEGAL-S3-BINDING · 材料经 resolveForProvider 核验（禁 demo/猜内容）', () => {
  const resolver = (result: ResolveResult) => ({ resolveForProvider: async () => result });

  it('ready → MaterialInput（source-neutral，喂 provider 的是复验后的当前原件视图）', async () => {
    const stored = storedMaterial();
    const materials = await resolveSessionMaterials(resolver({ status: 'ready', material: stored }), 'case-x', ['mat-1']);
    expect(materials).toEqual([stored]);
    expect(toMaterialInputs(materials)).toEqual([
      { fileId: 'mat-1', sha256: 'sha-content', readingMarkdown: stored.readingMarkdown, blocks: [{ blockId: '0', page: 1, text: '甲方应于三日内付款。', rangeBase: 0, textLayerVersion: 'v1' }] },
    ]);
  });

  it('原件漂移 → MaterialResolutionBlockedError（content_drift），绝不入 provider', async () => {
    await expect(
      resolveSessionMaterials(resolver({ status: 'blocked', reason: 'content_drift' }), 'case-x', ['mat-1']),
    ).rejects.toBeInstanceOf(MaterialResolutionBlockedError);
  });

  it('session 原文绑定：docx 源文只从复验后的会话材料取（漂移则整体阻断，不回落 demo）', async () => {
    const stored = storedMaterial({ readingMarkdown: '# 合同\n\n本案原文' });
    // 首次复验通过 → 绑定源文
    const [ok] = await resolveSessionMaterials(resolver({ status: 'ready', material: stored }), 'case-x', ['mat-1']);
    expect(bindDocxSourceMarkdown(ok)).toBe('# 合同\n\n本案原文');
    // 漂移后复验阻断 → 拿不到源文
    await expect(
      resolveSessionMaterials(resolver({ status: 'blocked', reason: 'reading_drift' }), 'case-x', ['mat-1']),
    ).rejects.toBeInstanceOf(MaterialResolutionBlockedError);
  });
});

describe('LEGAL-S3-BINDING · live gate projection（真实 RiskList，不复用 demo GATES）', () => {
  it('逐条从真实 RiskList 派生：high→high_risk+individual，C 级未确认→unverified，其余 batch', () => {
    const list = riskList([risk('risk-01', 'high'), risk('risk-02', 'low', 'open-ref'), risk('risk-03', 'medium')]);
    const grades: EvidenceGradeAnnotation[] = [{ key: 'open-ref', grade: 'C', sourceId: 's', confirmed: false }];
    const gate = projectRiskListGate(list, 'req-1', grades);
    expect(gate.requestId).toBe('req-1');
    expect(gate.items).toEqual([
      { itemRef: 'risk-01', mode: 'individual', evidenceKeys: ['合同第一条'], reason: 'high_risk' },
      { itemRef: 'risk-02', mode: 'individual', evidenceKeys: ['open-ref'], reason: 'unverified' },
      { itemRef: 'risk-03', mode: 'batch', evidenceKeys: ['合同第一条'] },
    ]);
  });
});

describe('LEGAL-S3-BINDING · 逐条 revision mapping（ADR-010 决定五）', () => {
  const list = riskList([risk('risk-01', 'high'), risk('risk-02', 'low'), risk('risk-03', 'medium')]);

  it('全部 confirm/reject → decision=confirm + 逐条 dispositionStatus revision', () => {
    const resume = mapReviewResolutionToResume(
      { items: [
        { itemRef: 'risk-01', disposition: 'confirm' },
        { itemRef: 'risk-02', disposition: 'reject' },
        { itemRef: 'risk-03', disposition: 'confirm' },
      ] },
      list,
      ACTOR,
    );
    expect(resume.decision).toBe('confirm');
    expect(resume.revisions).toEqual([
      { artifactType: S3_RISK_LIST_TYPE, artifactId: 'case-x', fieldPath: '/risks/0/dispositionStatus', previousValue: 'pending', newValue: 'confirmed', caseId: 'case-x' },
      { artifactType: S3_RISK_LIST_TYPE, artifactId: 'case-x', fieldPath: '/risks/1/dispositionStatus', previousValue: 'pending', newValue: 'rejected', caseId: 'case-x' },
      { artifactType: S3_RISK_LIST_TYPE, artifactId: 'case-x', fieldPath: '/risks/2/dispositionStatus', previousValue: 'pending', newValue: 'confirmed', caseId: 'case-x' },
    ]);
  });

  it('单项 reject → 该风险 /risks/<i>/dispositionStatus=rejected', () => {
    const resume = mapReviewResolutionToResume(
      { items: [
        { itemRef: 'risk-01', disposition: 'confirm' },
        { itemRef: 'risk-02', disposition: 'reject' },
        { itemRef: 'risk-03', disposition: 'confirm' },
      ] },
      list,
      ACTOR,
    );
    const rejected = resume.revisions?.find((r) => r.newValue === 'rejected');
    expect(rejected?.fieldPath).toBe('/risks/1/dispositionStatus');
  });

  it('任一 revise → ReviseNotTerminalError（保持 pending 进入编辑，不当终态 resume）', () => {
    expect(() =>
      mapReviewResolutionToResume(
        { items: [
          { itemRef: 'risk-01', disposition: 'confirm' },
          { itemRef: 'risk-02', disposition: 'revise' },
          { itemRef: 'risk-03', disposition: 'confirm' },
        ] },
        list,
        ACTOR,
      ),
    ).toThrow(ReviseNotTerminalError);
  });

  it('未覆盖全部条目 → IncompleteReviewError（不足以形成合法 revisions）', () => {
    expect(() =>
      mapReviewResolutionToResume({ items: [{ itemRef: 'risk-01', disposition: 'confirm' }] }, list, ACTOR),
    ).toThrow(IncompleteReviewError);
  });

  it('引用不存在的审阅项 → UnknownReviewItemError', () => {
    expect(() =>
      mapReviewResolutionToResume(
        { items: [
          { itemRef: 'risk-01', disposition: 'confirm' },
          { itemRef: 'risk-02', disposition: 'confirm' },
          { itemRef: 'risk-03', disposition: 'confirm' },
          { itemRef: 'ghost', disposition: 'confirm' },
        ] },
        list,
        ACTOR,
      ),
    ).toThrow(UnknownReviewItemError);
  });
});

describe('LEGAL-S3-BINDING · 生产工具装配（真实 party-verify，非 demo/mock）', () => {
  it('生产工具注册表用 qcc 适配器（未配置即 typed not_configured，绝不换 demo-fixture/mock）', () => {
    const tools = createProductionS3ToolRegistry();
    expect(tools.get(PARTY_VERIFY_TOOL_ID)?.tool.sourceId).toBe('qcc');
  });
});

describe('LEGAL-S3-BINDING · ArtifactEnvelope 版本源（首个真实生产者）', () => {
  it('从已准入 legal 包构造版本源，RiskList round-trip；未知版本 fail-closed 隔离', () => {
    const registries = admitLegalS3Package();
    const source = buildArtifactVersioningSource(registries, { legal: LEGAL_S3_SCHEMA_VERSION });
    const codec = createArtifactEnvelopeCodec(source);
    const list = riskList([]);
    const env = codec.encode(S3_RISK_LIST_TYPE, list);
    expect(env).toMatchObject({ packageId: 'legal', typeId: S3_RISK_LIST_TYPE, schemaVersion: LEGAL_S3_SCHEMA_VERSION });
    expect(codec.decode(env)).toMatchObject({ status: 'ready', typeId: S3_RISK_LIST_TYPE });
    const drifted = { ...env, schemaVersion: env.schemaVersion + 1 };
    expect(codec.decode(drifted)).toMatchObject({ status: 'isolated', reason: 'unknown_version' });
  });
});

describe('LEGAL-S3-BINDING · 生产装配闭合（start→gate→resume→complete，零 demo）', () => {
  it('真实 registries + qcc 工具 + WorkStateStore(codec) 跑通门禁往返；artifact 持久为版本信封', async () => {
    const registries = admitLegalS3Package();
    const scenario = getS3Scenario(registries);
    const source = buildArtifactVersioningSource(registries, { legal: LEGAL_S3_SCHEMA_VERSION });
    const codec = createArtifactEnvelopeCodec(source);
    const host = createInMemoryWorkStateHost();
    const ref = { caseId: 'case-x', sessionId: 's1' };
    const store = await loadWorkStateStore({ host, ref, header: header(), artifactCodec: codec });
    const tools = createProductionS3ToolRegistry();
    const ledger = createEvidenceLedger();
    const stored = storedMaterial();
    const materials = toMaterialInputs([stored]);
    const runInput = buildS3RunInput({ scenario, subject: { partyName: '临江精铸' }, materials });
    const turnRunner = fakeTurnRunner(
      JSON.stringify({ target: { stepId: 'produce-risk-list', artifactType: 'legal.RiskList' }, artifact: { caseId: 'case-x', risks: [] } }),
    );
    const deps = createLegalS3ScenarioDeps({ store, tools, turnRunner, ledger, registries });

    const first = await runScenario(scenario, runInput, deps);
    expect(first.status).toBe('paused');
    if (first.status !== 'paused') return;

    // party-verify（qcc 未配置）诚实降级 not_configured，绝未换 demo/mock。
    const failures = store.eventLog.list().filter((e) => e.type === 'step_failed');
    expect(failures.some((e) => e.type === 'step_failed' && e.scope === 'tool' && e.toolId === PARTY_VERIFY_TOOL_ID && e.reason === 'not_configured')).toBe(true);

    // 持久 artifact 是版本信封（ADR-010 决定三）。
    const read = await host.read(ref);
    if (!read.found) throw new Error('unreachable');
    const persisted = readWorkStateEnvelope(read.bytes);
    const produced = persisted.events.find((e) => e.type === 'artifact_produced');
    if (produced?.type !== 'artifact_produced') throw new Error('unreachable');
    expect(produced.artifact).toMatchObject({ packageId: 'legal', typeId: 'legal.RiskList', schemaVersion: LEGAL_S3_SCHEMA_VERSION });

    // gate projection + 逐条处置 → resume → 完成。
    const list = store.eventLog.list().find((e) => e.type === 'artifact_produced');
    if (list?.type !== 'artifact_produced') throw new Error('unreachable');
    const producedList = list.artifact as RiskList;
    const gate = projectRiskListGate(producedList, first.requestId);
    expect(gate.items).toEqual([]);
    const resume = mapReviewResolutionToResume({ items: [] }, producedList, ACTOR);
    const second = await resumeScenario(first.requestId, resume, scenario, deps);
    expect(second.status).toBe('completed');

    // session 原文绑定：docx 源文取复验后的会话材料。
    expect(bindDocxSourceMarkdown(stored)).toBe(stored.readingMarkdown);
  });
});
