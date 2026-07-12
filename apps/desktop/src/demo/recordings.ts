import type { SessionEvent } from '@courtwork/core';
import caseFile from '../../../../packages/demo-data/data/artifacts/case-file.json';
import partyGraph from '../../../../packages/demo-data/data/artifacts/party-graph.json';
import reviewMatrix from '../../../../packages/demo-data/data/artifacts/review-matrix.json';
import riskList from '../../../../packages/demo-data/data/artifacts/risk-list.json';
import timeline from '../../../../packages/demo-data/data/artifacts/timeline.json';

const at = (second: number) => `2026-07-10T09:00:${String(second).padStart(2, '0')}.000Z`;

export const S3_RECORDING: SessionEvent[] = [
  { type: 'progress', sessionId: 'demo-s3', seq: 1, emittedAt: at(1), message: '正在核对合同条款与当事人信息…' },
  {
    type: 'todo_snapshot', sessionId: 'demo-s3', seq: 2, emittedAt: at(2),
    steps: [{ stepId: 'produce-legal.RiskList', artifactType: 'legal.RiskList', label: '审阅风险清单', status: 'pending' }],
  },
  {
    type: 'artifact_produced', sessionId: 'demo-s3', seq: 3, emittedAt: at(3), artifactType: 'legal.RiskList', artifact: riskList,
    evidenceGrades: [
      { key: 'contract-corpus', grade: 'B', sourceId: 'demo-fixture', confirmed: true },
      { key: 'open-reference', grade: 'C', sourceId: 'demo-fixture', confirmed: false },
    ],
  },
  {
    type: 'confirmation_requested', sessionId: 'demo-s3', seq: 4, emittedAt: at(4), requestId: 'demo-s3-risk-gate',
    gateLabel: '审阅风险清单', artifactType: 'legal.RiskList',
  },
];

export const S1_RECORDING: SessionEvent[] = [
  { type: 'progress', sessionId: 'demo-s1', seq: 1, emittedAt: at(1), message: '已识别 16 / 20 件卷宗，正在识别文书类型…' },
  { type: 'artifact_produced', sessionId: 'demo-s1', seq: 2, emittedAt: at(2), artifactType: 'legal.CaseFile', artifact: caseFile, evidenceGrades: [] },
  {
    type: 'todo_snapshot', sessionId: 'demo-s1', seq: 3, emittedAt: at(3),
    steps: [
      { stepId: 'produce-legal.Timeline', artifactType: 'legal.Timeline', label: '核对事件时间线', status: 'pending' },
      { stepId: 'produce-legal.PartyGraph', artifactType: 'legal.PartyGraph', label: '核对当事人关系', status: 'pending' },
    ],
  },
  {
    type: 'artifact_produced', sessionId: 'demo-s1', seq: 4, emittedAt: at(4), artifactType: 'legal.Timeline', artifact: timeline,
    evidenceGrades: [{ key: 'dossier-corpus', grade: 'B', sourceId: 'demo-fixture', confirmed: true }],
  },
  {
    type: 'confirmation_requested', sessionId: 'demo-s1', seq: 5, emittedAt: at(5), requestId: 'demo-s1-timeline-gate',
    gateLabel: '核对事件时间线', artifactType: 'legal.Timeline',
  },
  { type: 'progress', sessionId: 'demo-s1', seq: 6, emittedAt: at(6), message: '时间线已生成，正在对齐当事人关系…' },
  {
    type: 'artifact_produced', sessionId: 'demo-s1', seq: 7, emittedAt: at(7), artifactType: 'legal.PartyGraph', artifact: partyGraph,
    evidenceGrades: [{ key: 'dossier-corpus', grade: 'B', sourceId: 'demo-fixture', confirmed: true }],
  },
];

export const DEMO_ARTIFACTS = { caseFile, partyGraph, reviewMatrix, riskList, timeline } as const;
