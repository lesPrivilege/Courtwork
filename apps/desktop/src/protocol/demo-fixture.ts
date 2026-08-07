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
export type DemoScenarioLaunch =
  | { kind: 'flow'; flow: ScenarioFlow }
  | { kind: 'file-ops' };

export interface DemoWorkFixtureAdapter {
  sessionRefFor(caseId: string, flow: ScenarioFlow): WorkSessionRef;
  /**
   * 场景条 demo 路由（GENERIC-PACK-1 裁定二）：样板案可启动的场景 → 回放 flow 或文件整理面。
   * 未声明即 demo 不可启动（场景条据此不渲染死按钮）。demo 族持有垂类 id 映射。
   */
  scenarioLaunch(scenarioId: string): DemoScenarioLaunch | undefined;
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
