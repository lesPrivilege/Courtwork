import type { SessionEvent } from '@courtwork/core';
import { DEMO_CASE_ID } from '../case/case-scope.js';
import type { DemoWorkFixtureAdapter } from '../protocol/demo-fixture.js';
import type {
  ReviewGateProjection,
  ScenarioFlow,
  WorkProjectionPhase,
  WorkProjectionPort,
  WorkSessionRef,
} from '../protocol/client.js';
import { DEMO_ARTIFACTS, S1_RECORDING, S3_RECORDING } from './recordings.js';

export const DEMO_S1_SESSION_ID = 'demo-s1';
export const DEMO_S3_SESSION_ID = 'demo-s3';

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

const SESSION_RECORDINGS: Record<string, SessionEvent[]> = {
  [DEMO_S1_SESSION_ID]: S1_RECORDING,
  [DEMO_S3_SESSION_ID]: S3_RECORDING,
};

const SESSION_FOR_FLOW: Record<ScenarioFlow, string> = {
  S1: DEMO_S1_SESSION_ID,
  S3: DEMO_S3_SESSION_ID,
};

function assertDemoRef(ref: WorkSessionRef): SessionEvent[] {
  const recording = SESSION_RECORDINGS[ref.sessionId];
  if (ref.caseId !== DEMO_CASE_ID || !recording) {
    throw new Error('Demo fixture rejects non-demo case/session refs');
  }
  return recording;
}

export function phaseFor(events: SessionEvent[]): WorkProjectionPhase {
  if (events.some((event) => event.type === 'scenario_completed')) return 'completed';
  // 场景级终局失败（ADR-010 决定三）：与 completed 互斥的终态，必须先于弱得多的
  // 工具/模型步级 step_failed 信号收敛，否则真正失败的场景会被误判为仍在 running。
  if (events.some((event) => event.type === 'scenario_failed')) return 'failed';
  if (events.some((event) => event.type === 'step_failed')) return 'failed';
  if (events.some((event) => event.type === 'confirmation_requested')) return 'paused';
  return 'running';
}

function expectedRequestSession(requestId: string): string | undefined {
  if (requestId === 'demo-s3-risk-gate') return DEMO_S3_SESSION_ID;
  if (requestId === 'demo-s1-timeline-gate') return DEMO_S1_SESSION_ID;
  return undefined;
}

function assertDemoRequest(ref: WorkSessionRef, requestId: string): ReviewGateProjection {
  assertDemoRef(ref);
  const gate = GATES[requestId];
  if (!gate || expectedRequestSession(requestId) !== ref.sessionId) {
    throw new Error('Demo fixture rejects unknown or cross-session review requests');
  }
  return gate;
}

export interface DemoWorkFixture extends DemoWorkFixtureAdapter {
  projection: WorkProjectionPort;
}

/** Explicit demo-only composition. No production command implementation lives here. */
export function createDemoWorkFixture(options: { replayDelayMs?: number } = {}): DemoWorkFixture {
  const replayDelayMs = options.replayDelayMs ?? 180;
  const projection: WorkProjectionPort = {
    async replay(query) {
      const recording = assertDemoRef(query);
      const events = recording.filter((event) => event.seq > (query.afterSeq ?? 0));
      return {
        ref: { caseId: query.caseId, sessionId: query.sessionId },
        phase: phaseFor(recording),
        events,
      };
    },
  };

  const adapter: DemoWorkFixtureAdapter = {
    sessionRefFor(caseId, flow) {
      const ref = { caseId, sessionId: SESSION_FOR_FLOW[flow] };
      assertDemoRef(ref);
      return ref;
    },
    async presentReplay(events, publish) {
      for (const event of events) {
        publish(event);
        if (replayDelayMs > 0) {
          await new Promise<void>((resolve) => globalThis.setTimeout(resolve, replayDelayMs));
        }
      }
    },
    review: {
      async getGateProjection(query) {
        return assertDemoRequest(query, query.requestId);
      },
      async resolve(input) {
        assertDemoRequest(input, input.requestId);
      },
    },
    continuation: {
      async continueSession(ref) {
        assertDemoRef(ref);
      },
    },
    telemetry: {
      emit(ref, event) {
        assertDemoRef(ref);
        if (event.sessionId !== ref.sessionId) {
          throw new Error('Demo fixture rejects cross-session telemetry');
        }
        // W6.1 尚未落地：门后 sink 明确为空；事件不得越出 fixture composition。
        void event;
      },
    },
    artifactFor(ref, artifactType) {
      assertDemoRef(ref);
      const artifacts: Record<string, unknown> = {
        'legal.CaseFile': DEMO_ARTIFACTS.caseFile,
        'legal.PartyGraph': DEMO_ARTIFACTS.partyGraph,
        'legal.ReviewMatrix': DEMO_ARTIFACTS.reviewMatrix,
        'legal.RiskList': DEMO_ARTIFACTS.riskList,
        'legal.Timeline': DEMO_ARTIFACTS.timeline,
      };
      return artifacts[artifactType];
    },
  };

  return { projection, ...adapter };
}

export function recordingFor(flow: ScenarioFlow) {
  return flow === 'S1' ? S1_RECORDING : S3_RECORDING;
}
