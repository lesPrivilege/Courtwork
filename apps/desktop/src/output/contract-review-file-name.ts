/**
 * CONTRACT-OUTPUT-TRUTH-1：production 产物名的**纯函数**。
 *
 * 旧实现用固定名 `合同审查报告.docx` + `overwrite:true`：每次审查都把上一次的产物抹掉，
 * 而且名字里的「报告」与实际内容（原合同副本 + 已确认风险批注）不符。
 *
 * 新名由两件已持久的事实合成，不引入任何新持久状态、不进 `work-session-store`：
 * - envelope 的 `createdAt`（UTC，毫秒精度）——同一 session 跨重启稳定；
 * - 完整 `sha256(sessionId)`——同毫秒的两个 session 仍不同名。
 */
export const OUTPUT_FILE_PREFIX = '合同审查批注稿';

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/** UTC 字段格式化为 `YYYYMMDD-HHmmss-SSS`；只读 UTC 字段，宿主时区不参与。 */
export function formatUtcStamp(instant: Date): string {
  const date = `${instant.getUTCFullYear()}${pad(instant.getUTCMonth() + 1, 2)}${pad(instant.getUTCDate(), 2)}`;
  const time = `${pad(instant.getUTCHours(), 2)}${pad(instant.getUTCMinutes(), 2)}${pad(instant.getUTCSeconds(), 2)}`;
  return `${date}-${time}-${pad(instant.getUTCMilliseconds(), 3)}`;
}

/**
 * `合同审查批注稿-YYYYMMDD-HHmmss-SSS-<64 位小写 hex>.docx`。
 * 纯函数：同一 (createdAt, sessionId) 恒得同名；不同 session 恒不同名。
 */
export async function contractReviewOutputFileName(
  sessionCreatedAt: Date,
  sessionId: string,
): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(sessionId),
  );
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `${OUTPUT_FILE_PREFIX}-${formatUtcStamp(sessionCreatedAt)}-${hash}.docx`;
}
