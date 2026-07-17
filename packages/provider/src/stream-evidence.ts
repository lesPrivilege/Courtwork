/**
 * PROVIDER-STREAM-1：协议外/闭合前异常的本地留证（内存环形，容量 5）。
 *
 * 用途：真机复现时把「什么形状的异常打穿过闭合协议」以错误信封级元数据留存，供下轮回填
 * `packages/provider` fixture（清偿「DeepSeek 原始响应 fixture 待带 key 补做」债）。
 * 脱敏纪律（结构性保证）：只记错误类名/失败分类/HTTP 状态/尝试计数/长度统计等信封字段，
 * **不记任何自由文本**（错误 message、响应正文、请求内容一律不入证）——案件内容与密钥
 * 由此构造上不可达。desktop 显示边界在失败时读取并持久（versioned 单键），本模块零持久。
 */

export interface StreamEvidenceEntry {
  phase: 'structured' | 'chat';
  providerId: string;
  modelId: string;
  errorName: string;
  kind: string;
  retryable: boolean;
  status?: number;
  attempts?: number;
  contentChars?: number;
}

const CAPACITY = 5;
let entries: StreamEvidenceEntry[] = [];

export function recordStreamEvidence(entry: StreamEvidenceEntry): void {
  entries = [...entries.slice(-(CAPACITY - 1)), entry];
}

export function readStreamEvidence(): readonly StreamEvidenceEntry[] {
  return entries;
}

export function clearStreamEvidence(): void {
  entries = [];
}
