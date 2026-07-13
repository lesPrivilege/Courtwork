import type { ReviewTelemetryEvent } from '../protocol/client';
import { loadSettings } from '../settings/settings-store';

export type ReviewTelemetrySink = (event: ReviewTelemetryEvent) => void;

/**
 * 发射时门禁：不缓存设置快照，每一枚事件都在抵达 sink 前重读 telemetryEnabled。
 * 未来把 demo 空 sink 换成真实 adapter 时仍必须经过本函数；测试以真实 spy sink
 * 锁定“拔门即红”。
 */
export function createReviewTelemetryEmitter(
  sink: ReviewTelemetrySink,
  readEnabled: () => boolean = () => loadSettings().privacy.telemetryEnabled,
): ReviewTelemetrySink {
  return (event) => {
    if (!readEnabled()) return;
    sink(event);
  };
}
