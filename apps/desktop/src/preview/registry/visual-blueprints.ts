/**
 * 已实现的版本化 blueprint 登记面（ADR-012 决定四）。
 *
 * 边界如实登记：本常量当前**零运行时消费者**——真正的准入是 `courtwork-host-renderers.ts` 的
 * 宿主注册表，`assert-visual-kit-contracts` 只核本文件不含样板期形态的字样。它是声明面，
 * 不是门；读者不要把它读成「在此登记即生效」。
 */
export const IMPLEMENTED_VISUAL_BLUEPRINT_IDS = Object.freeze([
  'courtwork.artifact-table.v1',
  'courtwork.review-matrix.v1',
  'courtwork.timeline.v1',
  'courtwork.party-graph.v1',
  'courtwork.risk-review.v1',
] as const);
