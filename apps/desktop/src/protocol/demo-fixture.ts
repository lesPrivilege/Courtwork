import type { SessionEvent } from '@courtwork/core';
import type {
  ReviewGateProjection,
  ReviewResolution,
  ReviewTelemetryEvent,
  ScenarioFlow,
  WorkSessionRef,
} from './client.js';

/**
 * Compatibility surface owned by the explicit demo composition. Production Work
 * commands must never implement or consume this fixture-only port.
 */
export interface DemoWorkFixtureAdapter {
  sessionRefFor(caseId: string, flow: ScenarioFlow): WorkSessionRef;
  presentReplay(events: SessionEvent[], publish: (event: SessionEvent) => void): Promise<void>;
  review: {
    getGateProjection(query: WorkSessionRef & { requestId: string }): Promise<ReviewGateProjection>;
    resolve(input: WorkSessionRef & { requestId: string; resolution: ReviewResolution }): Promise<void>;
  };
  continuation: {
    continueSession(ref: WorkSessionRef): Promise<void>;
  };
  telemetry: {
    emit(ref: WorkSessionRef, event: ReviewTelemetryEvent): void;
  };
  artifactFor(ref: WorkSessionRef, artifactType: string): unknown;
}
