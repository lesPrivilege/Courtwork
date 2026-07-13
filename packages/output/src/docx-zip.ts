import { preflightDocx } from '@courtwork/reading-view/docx-security';
import { Buffer } from 'buffer';
import { zipSync, strToU8, strFromU8, type Zippable } from 'fflate';

export type DocxFiles = Record<string, Uint8Array>;

export function loadDocx(buf: Uint8Array | Buffer): DocxFiles {
  return preflightDocx(new Uint8Array(buf)).files;
}

export function getText(files: DocxFiles, path: string): string {
  const entry = files[path];
  if (!entry) {
    throw new Error(`docx 内缺少必需部件：${path}`);
  }
  return strFromU8(entry);
}

export function setText(files: DocxFiles, path: string, text: string): void {
  files[path] = strToU8(text);
}

export function saveDocx(files: DocxFiles): Buffer {
  // level: 6 是标准 deflate 的常见平衡点。docx 里 word/styles.xml 之类的样板部件体积不小
  // 但高度可压缩——不压缩会把典型文档的产出体积从几十 KB 撑到近 1MB。
  return Buffer.from(zipSync(files as Zippable, { level: 6 }));
}
