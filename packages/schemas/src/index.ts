// 通用基座类型（拍板：SourceAnchor/RevisionEvent/信源分级仍中央）；
// 法律七 schema 已随 legal 迁包（2026-07-13），本包只剩协议与基座契约。
export * from './source-anchor.js';
export * from './artifact-type-id.js';
export * from './confirmation-policy.js';
export * from './citation.js';
export * from './artifact-descriptor.js';
export * from './package-identity.js';
export * from './revision-event.js';
export * from './ingest-status.js';
// 文书修订指令集 = output 管线的 wire 契约（基座），非法律专属；statuteRef 拆分候选见 SPEC 提案。
export * from './revision-instruction-set.js';
// 整理计划 = tools 文件执行器的 wire 契约（基座），同上注。
export * from './file-ops-plan.js';
