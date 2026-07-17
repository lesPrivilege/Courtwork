/**
 * PROVIDER-STREAM-1：协议外/闭合前异常的本地留证（内存环形，容量 5）。
 *
 * 用途：真机复现时把「什么形状的异常打穿过闭合协议」以错误信封级元数据留存，供下轮回填
 * `packages/provider` fixture（清偿「DeepSeek 原始响应 fixture 待带 key 补做」债）。
 * 脱敏纪律（结构性保证）：只记错误类名/失败分类/HTTP 状态/尝试计数/长度统计等信封字段，
 * **不记任何自由文本**（错误 message、响应正文、请求内容一律不入证）——案件内容与密钥
 * 由此构造上不可达。desktop 显示边界在失败时读取并持久（versioned 单键），本模块零持久。
 */

import type { ProviderFailureKind } from './types.js';

export type StreamEvidenceErrorName =
  | 'AbortError'
  | 'ProviderAuthError'
  | 'ProviderHttpError'
  | 'ProviderInvalidResponseError'
  | 'ProviderResponseFormatUnsupportedError'
  | 'ProviderTimeoutError'
  | 'UnknownError';

export interface StreamEvidenceEntry {
  readonly phase: 'structured' | 'chat';
  readonly providerId: string;
  readonly modelId: string;
  readonly errorName: StreamEvidenceErrorName;
  readonly kind: ProviderFailureKind;
  readonly retryable: boolean;
  readonly status?: number;
  readonly attempts?: number;
  readonly contentChars?: number;
}

const CAPACITY = 5;
const EVIDENCE_KEYS = new Set<keyof StreamEvidenceEntry>([
  'phase',
  'providerId',
  'modelId',
  'errorName',
  'kind',
  'retryable',
  'status',
  'attempts',
  'contentChars',
]);
const ERROR_NAMES = new Set<StreamEvidenceErrorName>([
  'AbortError',
  'ProviderAuthError',
  'ProviderHttpError',
  'ProviderInvalidResponseError',
  'ProviderResponseFormatUnsupportedError',
  'ProviderTimeoutError',
  'UnknownError',
]);
const FAILURE_KINDS = new Set<ProviderFailureKind>([
  'auth',
  'rate_limit',
  'endpoint',
  'model',
  'timeout',
  'network',
  'protocol',
  'invalid_response',
  'canceled',
]);
let entries: StreamEvidenceEntry[] = [];

export function recordStreamEvidence(entry: StreamEvidenceEntry): void {
  const unknownKey = Object.keys(entry).find((key) => !EVIDENCE_KEYS.has(key as keyof StreamEvidenceEntry));
  if (unknownKey) throw new TypeError(`provider evidence contains unsupported field: ${unknownKey}`);
  if (!ERROR_NAMES.has(entry.errorName)) throw new TypeError('provider evidence contains unsupported errorName');
  if (!FAILURE_KINDS.has(entry.kind)) throw new TypeError('provider evidence contains unsupported failure kind');

  const snapshot: StreamEvidenceEntry = Object.freeze({
    phase: entry.phase,
    providerId: entry.providerId,
    modelId: entry.modelId,
    errorName: entry.errorName,
    kind: entry.kind,
    retryable: entry.retryable,
    ...(entry.status !== undefined ? { status: entry.status } : {}),
    ...(entry.attempts !== undefined ? { attempts: entry.attempts } : {}),
    ...(entry.contentChars !== undefined ? { contentChars: entry.contentChars } : {}),
  });
  entries = [...entries.slice(-(CAPACITY - 1)), snapshot];
}

export function readStreamEvidence(): readonly StreamEvidenceEntry[] {
  return entries;
}

export function clearStreamEvidence(): void {
  entries = [];
}
