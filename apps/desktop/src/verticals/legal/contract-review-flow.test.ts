import { describe, expect, it, vi } from 'vitest';
import type { RiskList } from '@courtwork/legal';
import type { SessionEvent } from '@courtwork/core';
import type { WorkCommandOutcome } from '../../protocol/client';
import type { LegalWorkCommand } from './work-command';
import {
  EMPTY_CONTRACT_REVIEW_STATE,
  ReviewOutputAuthorizationError,
  S3_REVIEW_GATE_LABEL,
  beginReviewCorrection,
  buildSubmittedReviewResolution,
  cancelReviewCorrection,
  classifyPersistedReview,
  createContractReviewSubmitter,
  isReviewSubmissionReady,
  setReviewDecision,
  submitReviewCorrection,
  updateReviewCorrection,
} from './contract-review-flow';

const REF = { caseId: 'case-x', sessionId: 'session-x' };
const REQUEST_ID = 'request-x';

function risk(
  id: string,
  dispositionStatus: RiskList['risks'][number]['dispositionStatus'] = 'pending',
  description = `${id} 原结论`,
): RiskList['risks'][number] {
  return {
    id,
    description,
    level: 'medium',
    dispositionStatus,
    basis: [{
      citation: '合同第一条',
      sourceAnchors: [{ fileId: 'contract.docx', quote: '原文', textRange: { start: 0, end: 2 } }],
    }],
  };
}

function list(
  risks: RiskList['risks'],
  outOfCoverage: RiskList['outOfCoverage'] = [],
): RiskList {
  return { caseId: REF.caseId, risks, outOfCoverage };
}

function authorizationEvents(riskList: RiskList): SessionEvent[] {
  return [
    {
      type: 'confirmation_requested',
      ...REF,
      seq: 1,
      emittedAt: '2026-07-24T00:00:00.000Z',
      requestId: REQUEST_ID,
      gateLabel: S3_REVIEW_GATE_LABEL,
      artifactType: 'legal.RiskList',
    },
    {
      type: 'confirmation_resolved',
      ...REF,
      seq: 2,
      emittedAt: '2026-07-24T00:00:01.000Z',
      requestId: REQUEST_ID,
      actor: { channelId: 'desktop', actorId: 'local-user' },
      decision: 'confirm',
    },
    {
      type: 'artifact_produced',
      ...REF,
      seq: 3,
      emittedAt: '2026-07-24T00:00:01.000Z',
      artifactType: 'legal.RiskList',
      artifact: riskList,
      evidenceGrades: [],
    },
    {
      type: 'scenario_completed',
      ...REF,
      seq: 4,
      emittedAt: '2026-07-24T00:00:01.000Z',
    },
  ];
}

async function expectAuthorizationBlocked(events: SessionEvent[]): Promise<void> {
  const compile = vi.fn();
  const submitter = createContractReviewSubmitter({
    command: {
      resolveReview: vi.fn(() => Promise.resolve({ status: 'completed' as const, ref: REF })),
      replay: vi.fn(async () => ({ found: true as const, ref: REF, phase: 'completed' as const, events, materialRefs: ['mat-1'], sessionCreatedAt: '2026-07-24T00:00:00.000Z' })),
    },
    mintCommandId: () => 'submission-auth-blocked',
    compile,
  });
  await expect(submitter.submit({
    ...REF,
    requestId: REQUEST_ID,
    resolution: { items: [] },
    publish: () => {},
  })).rejects.toBeInstanceOf(ReviewOutputAuthorizationError);
  expect(compile).not.toHaveBeenCalled();
}

describe('CONTRACT-REVIEW-SAFETY-1 · 受控修正状态', () => {
  it('编辑中、取消、空值与同值都不形成终态；合法提交才形成 revise resolution', () => {
    const items = [
      { itemRef: 'risk-01', mode: 'batch' as const, evidenceKeys: [] },
      { itemRef: 'risk-02', mode: 'batch' as const, evidenceKeys: [] },
    ];
    let state = setReviewDecision(EMPTY_CONTRACT_REVIEW_STATE, 'risk-01', 'confirm');
    state = beginReviewCorrection(state, 'risk-02', 'risk-02 原结论');
    expect(isReviewSubmissionReady(items, state)).toBe(false);
    expect(() => submitReviewCorrection(updateReviewCorrection(state, '   '))).toThrow('修正结论不能为空');
    expect(() => submitReviewCorrection(updateReviewCorrection(state, '  risk-02 原结论  '))).toThrow('修正结论必须不同于原结论');
    expect(isReviewSubmissionReady(items, cancelReviewCorrection(state))).toBe(false);

    state = submitReviewCorrection(updateReviewCorrection(state, '  risk-02 修正结论  '));
    expect(isReviewSubmissionReady(items, state)).toBe(true);
    expect(buildSubmittedReviewResolution(items, state)).toEqual({
      items: [
        { itemRef: 'risk-01', disposition: 'confirm' },
        { itemRef: 'risk-02', disposition: 'revise', correctedDescription: 'risk-02 修正结论' },
      ],
    });
  });
});

describe('CONTRACT-REVIEW-SAFETY-1 · 显式提交与 outcome/replay 真源', () => {
  it('同帧重入复用同一 Promise 与冻结 resolution；完成后只把 replay 最新 RiskList 交给编译', async () => {
    let release: ((outcome: WorkCommandOutcome) => void) | undefined;
    const resolved = new Promise<WorkCommandOutcome>((resolve) => { release = resolve; });
    const latest = list([risk('risk-01', 'confirmed', '持久修正后的结论')]);
    const compile = vi.fn(async () => {});
    // 泛型形态保住 mock 的参数类型（下方断言 `.mock.calls[0][0]` 依赖它），且不留未使用绑定。
    const resolveReview = vi.fn<LegalWorkCommand['resolveReview']>(() => resolved);
    const replay = vi.fn(async () => ({
      found: true as const,
      ref: REF,
      phase: 'completed' as const,
      events: authorizationEvents(latest),
      materialRefs: ['mat-1'],
      sessionCreatedAt: '2026-07-24T00:00:00.000Z',
    }));
    const mintCommandId = vi.fn(() => 'submission-1');
    const submitter = createContractReviewSubmitter({
      command: { resolveReview, replay },
      mintCommandId,
      compile,
    });
    const input = {
      ...REF,
      requestId: REQUEST_ID,
      resolution: {
        items: [{
          itemRef: 'risk-01',
          disposition: 'revise' as const,
          correctedDescription: '持久修正后的结论',
        }],
      },
      publish: () => {},
    };
    const a = submitter.submit(input);
    input.resolution.items[0].correctedDescription = '提交后被外部篡改';
    const b = submitter.submit(input);
    expect(b).toBe(a);
    expect(mintCommandId).toHaveBeenCalledTimes(1);
    expect(resolveReview).toHaveBeenCalledTimes(1);
    expect(resolveReview.mock.calls[0][0]).toMatchObject({
      commandId: 'submission-1',
      resolution: {
        items: [{
          itemRef: 'risk-01',
          disposition: 'revise',
          correctedDescription: '持久修正后的结论',
        }],
      },
    });
    release?.({ status: 'completed', ref: REF });
    await expect(a).resolves.toMatchObject({ status: 'completed', review: { kind: 'compile' } });
    expect(compile).toHaveBeenCalledWith(latest);
  });

  it.each([
    { status: 'rejected', reason: 'invalid_scope', message: 'no' } as const,
    { status: 'failed', ref: REF, reason: 'internal', message: 'no', retryable: false } as const,
    { status: 'canceled', ref: REF } as const,
    { status: 'paused', ref: REF, requestId: 'next' } as const,
  ])('$status outcome：零 replay、零编译', async (outcome) => {
    const replay = vi.fn();
    const compile = vi.fn();
    const submitter = createContractReviewSubmitter({
      command: { resolveReview: vi.fn(() => Promise.resolve(outcome)), replay },
      mintCommandId: () => 'submission-noncomplete',
      compile,
    });
    await expect(submitter.submit({
      ...REF,
      requestId: REQUEST_ID,
      resolution: { items: [] },
      publish: () => {},
    })).resolves.toEqual({ status: 'not_completed', outcome });
    expect(replay).not.toHaveBeenCalled();
    expect(compile).not.toHaveBeenCalled();
  });

  it('缺 matching confirmation_requested 时 typed 阻断，零编译', async () => {
    const events = authorizationEvents(list([risk('risk-01', 'confirmed')]))
      .filter((event) => event.type !== 'confirmation_requested');
    await expectAuthorizationBlocked(events);
  });

  it('confirmation_resolved requestId 错配时 typed 阻断，零编译', async () => {
    const events = authorizationEvents(list([risk('risk-01', 'confirmed')]));
    const resolved = events.find((event) => event.type === 'confirmation_resolved');
    if (resolved?.type !== 'confirmation_resolved') throw new Error('unreachable');
    resolved.requestId = 'request-other';
    await expectAuthorizationBlocked(events);
  });

  it('confirmation_resolved decision=reject 时 typed 阻断，零编译', async () => {
    const events = authorizationEvents(list([risk('risk-01', 'confirmed')]));
    const resolved = events.find((event) => event.type === 'confirmation_resolved');
    if (resolved?.type !== 'confirmation_resolved') throw new Error('unreachable');
    resolved.decision = 'reject';
    await expectAuthorizationBlocked(events);
  });

  it('matching gate label 漂移时 typed 阻断，零编译', async () => {
    const events = authorizationEvents(list([risk('risk-01', 'confirmed')]));
    const requested = events.find((event) => event.type === 'confirmation_requested');
    if (requested?.type !== 'confirmation_requested') throw new Error('unreachable');
    requested.gateLabel = `${S3_REVIEW_GATE_LABEL}（漂移）`;
    await expectAuthorizationBlocked(events);
  });

  it('同 requestId 出现两枚矛盾 confirmation_resolved 时 typed 阻断，零编译', async () => {
    const events = authorizationEvents(list([risk('risk-01', 'confirmed')]));
    events.push({
      type: 'confirmation_resolved',
      ...REF,
      seq: 5,
      emittedAt: '2026-07-24T00:00:02.000Z',
      requestId: REQUEST_ID,
      actor: { channelId: 'desktop', actorId: 'local-user' },
      decision: 'reject',
    });
    await expectAuthorizationBlocked(events);
  });

  it('replay phase 不是 completed 时阻断，零编译', async () => {
    const compile = vi.fn();
    const submitter = createContractReviewSubmitter({
      command: {
        resolveReview: vi.fn(() => Promise.resolve({ status: 'completed' as const, ref: REF })),
        replay: vi.fn(async () => ({
          found: true as const,
          ref: REF,
          phase: 'paused' as const,
          events: authorizationEvents(list([risk('risk-01', 'confirmed')])),
          materialRefs: ['mat-1'],
          sessionCreatedAt: '2026-07-24T00:00:00.000Z',
        })),
      },
      mintCommandId: () => 'submission-phase-drift',
      compile,
    });
    await expect(submitter.submit({
      ...REF,
      requestId: REQUEST_ID,
      resolution: { items: [] },
      publish: () => {},
    })).rejects.toThrow('合同审查完成态未能从持久账本复验');
    expect(compile).not.toHaveBeenCalled();
  });

  it('replay ref 与 completed outcome 错配时阻断，零编译', async () => {
    const compile = vi.fn();
    const submitter = createContractReviewSubmitter({
      command: {
        resolveReview: vi.fn(() => Promise.resolve({ status: 'completed' as const, ref: REF })),
        replay: vi.fn(async () => ({
          found: true as const,
          ref: { ...REF, sessionId: 'session-other' },
          phase: 'completed' as const,
          events: authorizationEvents(list([risk('risk-01', 'confirmed')])),
          materialRefs: ['mat-1'],
          sessionCreatedAt: '2026-07-24T00:00:00.000Z',
        })),
      },
      mintCommandId: () => 'submission-ref-drift',
      compile,
    });
    await expect(submitter.submit({
      ...REF,
      requestId: REQUEST_ID,
      resolution: { items: [] },
      publish: () => {},
    })).rejects.toThrow('合同审查完成态未能从持久账本复验');
    expect(compile).not.toHaveBeenCalled();
  });
});

describe('CONTRACT-REVIEW-SAFETY-1 · 正常完成的零文书分流', () => {
  const ooc: RiskList['outOfCoverage'] = [{
    summary: '缺少验收附件',
    reason: 'citation_unresolved',
    failures: [{
      claim: { fileId: 'contract.docx', exactQuote: '缺失引语' },
      reason: 'not_found',
    }],
  }];

  it.each([
    ['zero_risks', list([]), '本次审查未形成可提交的风险项；未生成批注稿'],
    ['out_of_coverage', list([], ooc), '需补充材料后重新审查'],
    ['out_of_coverage', list([risk('risk-01', 'confirmed')], ooc), '需补充材料后重新审查'],
    ['all_rejected', list([risk('risk-01', 'rejected')]), '风险均已驳回；未生成批注稿'],
  ] as const)('%s：completed 但零文书且结果诚实', (kind, riskList, message) => {
    const result = classifyPersistedReview(riskList);
    expect(result).toMatchObject({ kind, message: expect.stringContaining(message) });
  });
});
