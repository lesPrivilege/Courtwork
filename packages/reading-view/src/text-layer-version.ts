import { createHash } from 'node:crypto';

/**
 * SourceAnchor.textLayerVersion = 转换器语义版本 + 该文本层内容的短哈希。docx/PDF 的
 * textRange 相对的是本包派生出的线性化文本层，转换器版本一变或库升级一次，偏移量就
 * 可能整体漂移——这个字段就是用来标记"这段偏移量是相对哪一版文本层算的"。
 * 短哈希（sha256 前 16 位十六进制）只用于漂移检测，不是安全用途，碰撞风险可接受。
 */
export function computeTextLayerVersion(namespace: string, text: string): string {
  const hash = createHash('sha256').update(text, 'utf-8').digest('hex').slice(0, 16);
  return `${namespace}+${hash}`;
}
