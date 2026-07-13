import type { SessionEvent } from '@courtwork/core';
import caseFile from '../../../../packages/demo-data/data/artifacts/case-file.json';
import partyGraph from '../../../../packages/demo-data/data/artifacts/party-graph.json';
import reviewMatrix from '../../../../packages/demo-data/data/artifacts/review-matrix.json';
import riskList from '../../../../packages/demo-data/data/artifacts/risk-list.json';
import timeline from '../../../../packages/demo-data/data/artifacts/timeline.json';

const at = (second: number) => `2026-07-10T09:00:${String(second).padStart(2, '0')}.000Z`;

/**
 * S3 录制的两层分界（LEGAL-DEMO-RUN ③ 对齐，2026-07-13）：
 * - progress 是演示旁白（staging）：真 harness 的 S3 首跑不发 progress 事件，保留它
 *   只为回放节奏与思考流有内容可显，不冒充契约。
 * - 其余事件为契约层：顺序（artifact → todo → confirmation，executor pauseAt 语义）、
 *   todo 步 id/标签（deriveTodoSnapshot 对 legal.S3 声明步骤树的派生：verify-parties
 *   已完成 + produce-risk-list 停门禁）、gateLabel（包声明的门禁标签原文）、
 *   citationStats（引用闭环公证观测，与 artifact 内 6 条锚点一致）——逐字段对齐真
 *   harness 输出，protocol/session-event.contract.test.ts 以 LEGAL_PACKAGE 声明为准
 *   机器守护，防录制漂移。
 */
export const S3_RECORDING: SessionEvent[] = [
  { type: 'progress', sessionId: 'demo-s3', seq: 1, emittedAt: at(1), message: '正在核对合同条款与当事人信息…' },
  {
    type: 'artifact_produced', sessionId: 'demo-s3', seq: 2, emittedAt: at(2), artifactType: 'legal.RiskList', artifact: riskList,
    evidenceGrades: [
      { key: 'contract-corpus', grade: 'B', sourceId: 'demo-fixture', confirmed: true },
      { key: 'open-reference', grade: 'C', sourceId: 'demo-fixture', confirmed: false },
    ],
    citationStats: { claims: 8, firstPassResolved: 8, retryRounds: 0, resolvedAfterRetry: 8, outOfCoverage: 0 },
  },
  {
    type: 'todo_snapshot', sessionId: 'demo-s3', seq: 3, emittedAt: at(3),
    steps: [
      { stepId: 'verify-parties', label: '核验合同主体', status: 'done' },
      {
        stepId: 'produce-risk-list', artifactType: 'legal.RiskList',
        label: '确认风险清单后再生成修订与批注文书', status: 'awaiting_confirmation',
      },
    ],
  },
  {
    type: 'confirmation_requested', sessionId: 'demo-s3', seq: 4, emittedAt: at(4), requestId: 'demo-s3-risk-gate',
    gateLabel: '确认风险清单后再生成修订与批注文书', artifactType: 'legal.RiskList',
  },
];

/**
 * S1 录制：todo 步 id/标签与 gateLabel 已对齐 legal.S1 声明（三步骤树 + Timeline 门禁
 * 标签原文）；事件顺序仍是演示节奏（真跑在 Timeline 门禁续行确认后才产 PartyGraph，
 * 此处 staging 省略 confirmation_resolved）——顺序对齐挂 LEGAL-DEMO-RUN 台账，随
 * S1 流真接线一并处理。
 */
export const S1_RECORDING: SessionEvent[] = [
  { type: 'progress', sessionId: 'demo-s1', seq: 1, emittedAt: at(1), message: '已识别 16 / 20 件卷宗，正在识别文书类型…' },
  { type: 'artifact_produced', sessionId: 'demo-s1', seq: 2, emittedAt: at(2), artifactType: 'legal.CaseFile', artifact: caseFile, evidenceGrades: [] },
  {
    type: 'todo_snapshot', sessionId: 'demo-s1', seq: 3, emittedAt: at(3),
    steps: [
      { stepId: 'intake-files', artifactType: 'legal.CaseFile', label: '登记卷宗清单', status: 'done' },
      { stepId: 'build-timeline', artifactType: 'legal.Timeline', label: '确认事件时间线后再据此生成其他产物', status: 'pending' },
      { stepId: 'build-party-graph', artifactType: 'legal.PartyGraph', label: '确认当事人关系图谱', status: 'pending' },
    ],
  },
  {
    type: 'artifact_produced', sessionId: 'demo-s1', seq: 4, emittedAt: at(4), artifactType: 'legal.Timeline', artifact: timeline,
    evidenceGrades: [{ key: 'dossier-corpus', grade: 'B', sourceId: 'demo-fixture', confirmed: true }],
  },
  {
    type: 'confirmation_requested', sessionId: 'demo-s1', seq: 5, emittedAt: at(5), requestId: 'demo-s1-timeline-gate',
    gateLabel: '确认事件时间线后再据此生成其他产物', artifactType: 'legal.Timeline',
  },
  { type: 'progress', sessionId: 'demo-s1', seq: 6, emittedAt: at(6), message: '时间线已生成，正在对齐当事人关系…' },
  {
    type: 'artifact_produced', sessionId: 'demo-s1', seq: 7, emittedAt: at(7), artifactType: 'legal.PartyGraph', artifact: partyGraph,
    evidenceGrades: [{ key: 'dossier-corpus', grade: 'B', sourceId: 'demo-fixture', confirmed: true }],
  },
];

export const DEMO_ARTIFACTS = { caseFile, partyGraph, reviewMatrix, riskList, timeline } as const;
