import type { RevisionInstructionSet } from '@courtwork/schemas';
import { loadDocx, getText, setText, saveDocx } from './docx-zip.js';
import { applyInstructionsToDocumentXml, type InstructionOutcome } from './apply-instructions.js';
import { writeCommentsPart, nextCommentId } from './comments-part.js';

export interface ApplyRevisionInstructionSetOptions {
  /** 修订/批注元数据的时间戳；缺省为真实当前时间。golden file 测试必须显式传入固定时间。 */
  now?: Date;
}

export interface ApplyRevisionInstructionSetResult {
  docx: Buffer;
  /** 每条指令的处理结果，定位失败/歧义的指令会体现在这里而不是抛异常——SPEC 要求报错并跳过，不中断整批。 */
  outcomes: InstructionOutcome[];
}

/**
 * 管线的唯一对外入口：原始 docx + 修订指令集 → 带 tracked changes 与批注的 docx。
 * OOXML/zip 操作细节全部收在本函数背后，调用方不需要知道引擎内部实现。
 */
export function applyRevisionInstructionSet(
  originalDocx: Buffer | Uint8Array,
  instructionSet: RevisionInstructionSet,
  options: ApplyRevisionInstructionSetOptions = {},
): ApplyRevisionInstructionSetResult {
  const now = options.now ?? new Date();
  const files = loadDocx(originalDocx);

  // 输入文档既有批注决定新批注 id 起点，保证新写入的 comment/range id 不与既有冲突。
  const commentIdBase = nextCommentId(files);
  const documentXmlText = getText(files, 'word/document.xml');
  const { documentXml, comments, outcomes } = applyInstructionsToDocumentXml(documentXmlText, instructionSet, now, {
    commentIdBase,
  });
  setText(files, 'word/document.xml', documentXml);

  if (comments.length > 0) {
    writeCommentsPart(files, comments, now.toISOString());
  }

  return { docx: saveDocx(files), outcomes };
}
