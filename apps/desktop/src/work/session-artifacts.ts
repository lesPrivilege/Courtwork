import type { DemoWorkFixtureAdapter } from '../protocol/demo-fixture';
import type { WorkSessionRef } from '../protocol/client';

/**
 * 会话产出的取数口径：账本优先，仅显式 demo ref 才回落 fixture adapter。
 *
 * PANEL-BLUEPRINT-1 外提物——原先四个工作面各抄一遍同一表达式（RiskList/Timeline/PartyGraph/
 * ReviewMatrix），矩阵迁 blueprint 后取数须按 artifactType 动态发生，逐个硬编码已不可行。
 * 非 demo 案不询问 fixture adapter，`fixtureRef` 缺席即真实链——demo 与真实路径的双向隔离
 * 由此保持在唯一一处，不随消费点扩散。
 */
export function createArtifactReader(
  artifacts: Partial<Record<string, unknown>>,
  fixtureRef: WorkSessionRef | undefined,
  workFixture: DemoWorkFixtureAdapter,
) {
  return (artifactType: string): unknown => fixtureRef
    ? (artifacts[artifactType] ?? workFixture.artifactFor(fixtureRef, artifactType))
    : artifacts[artifactType];
}
