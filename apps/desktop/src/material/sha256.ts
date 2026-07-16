/**
 * 浏览器/Node 同源 sha256（Web Crypto `crypto.subtle`）。
 *
 * 不用 `node:crypto`：desktop 浏览器壳 Vite 打包会 externalize `node:crypto` 而失败
 * （见 packages/reading-view SPEC 的 F-1 追认）。`crypto.subtle` 在 Vite 浏览器壳与 Node 22+
 * 同名可用，且是内容完整性级真 sha256（非 textLayerVersion 的漂移检测短哈希）。
 */

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** 原件字节 → sha256 十六进制。 */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource);
  return toHex(digest);
}

/** UTF-8 文本 → sha256 十六进制（ReadingView 派生内容哈希）。 */
export async function sha256HexOfText(text: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(text));
}
