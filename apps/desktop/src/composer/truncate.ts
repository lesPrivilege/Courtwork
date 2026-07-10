/**
 * 文件名中间省略：保留扩展名与末尾可读段，中间用 … 截断。
 * 例：XX合同_2026版补充协议很长很长.docx → XX合同_2026版…补充协议.docx
 */
export function truncateFileName(fileName: string, maxLength = 28): string {
  if (fileName.length <= maxLength) return fileName;
  const lastDot = fileName.lastIndexOf('.');
  const hasExt = lastDot > 0 && lastDot < fileName.length - 1 && fileName.length - lastDot <= 8;
  const ext = hasExt ? fileName.slice(lastDot) : '';
  const base = hasExt ? fileName.slice(0, lastDot) : fileName;
  const budget = maxLength - ext.length - 1; // 1 for …
  if (budget < 4) {
    return `${fileName.slice(0, Math.max(1, maxLength - 1))}…`;
  }
  const head = Math.ceil(budget * 0.55);
  const tail = budget - head;
  return `${base.slice(0, head)}…${base.slice(-tail)}${ext}`;
}
