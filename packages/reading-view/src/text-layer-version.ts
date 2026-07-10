/**
 * SourceAnchor.textLayerVersion = 转换器语义版本 + 该文本层内容的短哈希。docx/PDF 的
 * textRange 相对的是本包派生出的线性化文本层，转换器版本一变或库升级一次，偏移量就
 * 可能整体漂移——这个字段就是用来标记"这段偏移量是相对哪一版文本层算的"。
 *
 * 短哈希只用于漂移检测，不是安全用途。实现刻意不用 node:crypto，保证浏览器壳
 * （apps/desktop）与 Node 测试同一算法，避免 desktop 打包时 externalize 失败。
 */
export function computeTextLayerVersion(namespace: string, text: string): string {
  const hash = fnv1aHex16(text);
  return `${namespace}+${hash}`;
}

/** FNV-1a 双 32-bit 级联，输出 16 位十六进制；确定性、同步、零依赖。 */
function fnv1aHex16(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ (c + ((i & 0xff) << 8)), 0x01000193);
  }
  return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0'));
}
