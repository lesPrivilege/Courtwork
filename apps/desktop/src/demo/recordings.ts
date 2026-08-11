import type { SessionEvent } from '@courtwork/core';
import {
  CaseFileSchema,
  PartyGraphSchema,
  ReviewMatrixSchema,
  RiskListSchema,
  TimelineSchema,
} from '@courtwork/legal';
import rawCaseFile from '../../../../packages/demo-data/data/artifacts/case-file.json';
import rawPartyGraph from '../../../../packages/demo-data/data/artifacts/party-graph.json';
import rawReviewMatrix from '../../../../packages/demo-data/data/artifacts/review-matrix.json';
import rawRiskList from '../../../../packages/demo-data/data/artifacts/risk-list.json';
import rawTimeline from '../../../../packages/demo-data/data/artifacts/timeline.json';

/**
 * 判例「类型在场 ≠ 运行时在场」（CONTRACT-REVIEW-SAFETY-1）：夹具是直接 import 的裸 JSON，
 * 从不经 parse，故 schema 的 `.default()`（如 `RiskList.outOfCoverage`）不会生效——消费方
 * 按 zod 输出类型认定该字段在场，运行时却是 undefined，解引用即整棵 React 树卸载。
 *
 * 这里统一过一次 schema：`.default()` 得以履职，夹具本身不必迁移（`risk-list.ts` 的
 * 「存量最终形夹具零迁移」设计意图因此成立而非被绕过），且此后任何新增缺省字段自动生效。
 * 用具名 schema 而非 registry 查表，是为保住解析后的具体类型；「录制值必须等于其注册
 * schema 的 parse 结果」由 `protocol/session-event.contract.test.ts` 的族级断言机器守护，
 * 无须在此重复一次运行时查表。
 */
const caseFile = CaseFileSchema.parse(rawCaseFile);
const partyGraph = PartyGraphSchema.parse(rawPartyGraph);
const reviewMatrix = ReviewMatrixSchema.parse(rawReviewMatrix);
const riskList = RiskListSchema.parse(rawRiskList);
const timeline = TimelineSchema.parse(rawTimeline);

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
    // TOOL-READ-1 裁定六：模型请求的只读工具结果是 trace 区的一等条目——界面事件面就是账本本身。
    type: 'model_tool_result', sessionId: 'demo-s3', seq: 2, emittedAt: at(2),
    stepId: 'produce-risk-list', artifactType: 'legal.RiskList', round: 1, toolId: 'material-read',
    verified: true, truncated: false,
    content: '{"verified":true,"data":{"materialId":"04-设备采购合同.md","fileName":"04-设备采购合同.md","mediaType":"md"},"source":"demo-fixture"}',
  },
  {
    type: 'artifact_produced', sessionId: 'demo-s3', seq: 3, emittedAt: at(3), artifactType: 'legal.RiskList', artifact: riskList,
    evidenceGrades: [
      { key: 'contract-corpus', grade: 'B', sourceId: 'demo-fixture', confirmed: true },
      { key: 'open-reference', grade: 'C', sourceId: 'demo-fixture', confirmed: false },
    ],
    citationStats: { claims: 8, firstPassResolved: 6, retryRounds: 0, resolvedAfterRetry: 6, outOfCoverage: 2 },
  },
  {
    type: 'todo_snapshot', sessionId: 'demo-s3', seq: 4, emittedAt: at(4),
    steps: [
      { stepId: 'verify-parties', label: '核验合同主体', status: 'done' },
      {
        stepId: 'produce-risk-list', artifactType: 'legal.RiskList',
        label: '提交处置并完成合同审查；有已确认风险且无待索证项时生成批注稿', status: 'awaiting_confirmation',
      },
    ],
  },
  {
    type: 'confirmation_requested', sessionId: 'demo-s3', seq: 5, emittedAt: at(5), requestId: 'demo-s3-risk-gate',
    gateLabel: '提交处置并完成合同审查；有已确认风险且无待索证项时生成批注稿', artifactType: 'legal.RiskList',
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
