import type { FileKind } from './types.js';

export function inferFileKind(fileName: string): FileKind {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.docx')) return 'docx';
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md';
  if (lower.endsWith('.txt')) return 'txt';
  if (/\.(png|jpe?g|gif|webp|bmp)$/i.test(lower)) return 'image';
  return 'other';
}
