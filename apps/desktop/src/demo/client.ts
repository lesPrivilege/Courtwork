import type { ReviewGateProjection, ReviewTelemetryEvent, ScenarioFlow, SessionEventClient } from '../protocol/client';
import { S1_RECORDING, S3_RECORDING } from './recordings';

const GATES: Record<string, ReviewGateProjection> = {
  'demo-s3-risk-gate': {
    requestId: 'demo-s3-risk-gate',
    items: [
      { itemRef: 'risk-01', mode: 'individual', evidenceKeys: ['contract-corpus'], reason: 'high_risk' },
      { itemRef: 'risk-02', mode: 'batch', evidenceKeys: ['contract-corpus'] },
      { itemRef: 'risk-03', mode: 'individual', evidenceKeys: ['open-reference'], reason: 'unverified' },
      { itemRef: 'risk-04', mode: 'batch', evidenceKeys: ['contract-corpus'] },
      { itemRef: 'risk-05', mode: 'batch', evidenceKeys: ['contract-corpus'] },
      { itemRef: 'risk-06', mode: 'batch', evidenceKeys: ['contract-corpus'] },
    ],
  },
  'demo-s1-timeline-gate': { requestId: 'demo-s1-timeline-gate', items: [] },
};

/**
 * 演示装配点：只回放已经录制的 core 事件并实现确认/续行接口的本地替身。
 * 生产接入时替换此对象，组件与事件投影无需改动。
 */
export function createDemoClient(): SessionEventClient {
  return {
    async replay(flow, publish, options) {
      const recording = flow === 'S1' ? S1_RECORDING : S3_RECORDING;
      for (const event of recording) {
        publish(event);
        if (options?.paced) await new Promise((resolve) => window.setTimeout(resolve, 180));
      }
    },
    confirmation: {
      async getGateProjection(requestId) {
        return GATES[requestId] ?? { requestId, items: [] };
      },
      async resolve() {
        return Promise.resolve();
      },
    },
    continuation: {
      async continueSession() {
        return Promise.resolve();
      },
    },
    emitReviewTelemetry(event: ReviewTelemetryEvent) {
      // W6.1 尚未落地：保留三个已拍板事件名的发射点，当前明确为空实现。
      void event;
    },
  };
}

export function recordingFor(flow: ScenarioFlow) {
  return flow === 'S1' ? S1_RECORDING : S3_RECORDING;
}
