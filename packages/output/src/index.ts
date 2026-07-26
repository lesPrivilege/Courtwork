export * from './apply-revision-instruction-set.js';
export * from './compile-draft-to-docx.js';
export type { InstructionOutcome, ApplyStatus } from './apply-instructions.js';
export type { LocateResult } from './locate.js';
// CONTRACT-OUTPUT-TRUTH-1：ZIP 时间越界由 desktop coordinator 精确映为 blocked/invalid_session，
// 故 typed error 必须出包；packed 编码本身只作同包测试与诊断用，不进 desktop 生产路径。
export { InvalidZipTimestampError, packedDosDateTime } from './docx-zip.js';
