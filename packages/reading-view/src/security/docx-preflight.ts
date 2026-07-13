import { strFromU8, unzipSync } from 'fflate';
import type { DisabledReason } from '../types.js';
import { DEFAULT_LIMITS, type ResolvedLimits } from './limits.js';
import { assertNoDangerousMarkup, parseXmlStrict } from './xml-guard.js';
import { checkZipBomb, readZipCentralDirectory } from './zip-guard.js';

export type DocxSecurityReason = Extract<
  DisabledReason,
  'file_too_large' | 'zip_bomb_suspected' | 'malicious_content' | 'corrupt_file'
>;

export class DocxSecurityError extends Error {
  constructor(
    public readonly reason: DocxSecurityReason,
    message: string,
  ) {
    super(message);
    this.name = 'DocxSecurityError';
  }
}

export interface PreflightedDocx {
  files: Record<string, Uint8Array>;
  documentXmlText: string;
}

function isXmlPart(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith('.xml') || lower.endsWith('.rels');
}

/**
 * DOCX 唯一安全入口。中央目录检查发生在 unzipSync 之前；宏与 XML 防线由
 * reading-view/output 共用，任何消费方不得另造弱版预检。
 */
export function preflightDocx(
  data: Uint8Array,
  limits: ResolvedLimits = DEFAULT_LIMITS,
): PreflightedDocx {
  if (data.byteLength > limits.maxFileSizeBytes) {
    throw new DocxSecurityError(
      'file_too_large',
      `文件 ${data.byteLength} 字节超过上限 ${limits.maxFileSizeBytes} 字节`,
    );
  }

  let entries;
  try {
    entries = readZipCentralDirectory(data);
  } catch (error) {
    throw new DocxSecurityError('corrupt_file', error instanceof Error ? error.message : String(error));
  }

  const bombCheck = checkZipBomb(entries, limits);
  if (bombCheck.suspicious) {
    throw new DocxSecurityError('zip_bomb_suspected', bombCheck.detail ?? '解压比例超过配置上限');
  }

  if (entries.some((entry) => entry.name.toLowerCase() === 'word/vbaproject.bin')) {
    throw new DocxSecurityError('malicious_content', '检测到 word/vbaProject.bin（宏工程），拒绝解析');
  }

  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data);
  } catch (error) {
    throw new DocxSecurityError(
      'corrupt_file',
      `zip 解压失败：${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const contentTypes = files['[Content_Types].xml'];
  if (contentTypes && /macroEnabled/i.test(strFromU8(contentTypes))) {
    throw new DocxSecurityError('malicious_content', '[Content_Types].xml 声明宏使能内容类型，拒绝解析');
  }

  const documentXml = files['word/document.xml'];
  if (!documentXml) {
    throw new DocxSecurityError('corrupt_file', 'docx 缺少 word/document.xml');
  }

  for (const [path, bytes] of Object.entries(files)) {
    if (!isXmlPart(path)) continue;
    const xml = strFromU8(bytes);
    try {
      assertNoDangerousMarkup(xml);
    } catch (error) {
      throw new DocxSecurityError(
        'malicious_content',
        `${path}：${error instanceof Error ? error.message : String(error)}`,
      );
    }
    try {
      parseXmlStrict(xml);
    } catch (error) {
      throw new DocxSecurityError(
        'corrupt_file',
        `${path}：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { files, documentXmlText: strFromU8(documentXml) };
}
