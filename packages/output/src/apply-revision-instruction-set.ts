import type { RevisionInstructionSet } from '@courtwork/schemas';
import { loadDocx, getText, setText, saveDocx } from './docx-zip.js';
import { applyInstructionsToDocumentXml, type ApplyStatus, type InstructionOutcome } from './apply-instructions.js';
import { writeCommentsPart, nextCommentId } from './comments-part.js';

/** 视为"已应用"的 outcome 状态：精确命中与可信模糊命中；其余一律是未应用。 */
function isApplied(status: ApplyStatus): boolean {
  return status === 'applied' || status === 'applied_fuzzy';
}

/**
 * 存在未获确认的未应用指令时抛出，阻断整份 docx 落盘。
 * 携带全部逐条 outcome（供落盘前显式展示）与触发阻断的未应用项。
 * 不是"报错并跳过后照常交付"——本错误意味着没有 docx 交付。
 */
export class NonAppliedInstructionsError extends Error {
  readonly outcomes: InstructionOutcome[];
  readonly nonApplied: InstructionOutcome[];
  constructor(outcomes: InstructionOutcome[], nonApplied: InstructionOutcome[]) {
    super(
      `修订指令集有 ${nonApplied.length} 条指令未应用且未获针对性确认，已阻断整份落盘：` +
        nonApplied.map((o) => `${o.id}(${o.status})`).join('、'),
    );
    this.name = 'NonAppliedInstructionsError';
    this.outcomes = outcomes;
    this.nonApplied = nonApplied;
  }
}

export interface ApplyRevisionInstructionSetOptions {
  /** 修订/批注元数据的时间戳；缺省为真实当前时间。golden file 测试必须显式传入固定时间。 */
  now?: Date;
  /**
   * 存在未应用指令时的落盘策略：
   * - 'block'（默认）：抛 NonAppliedInstructionsError（携带全部 outcomes 与未应用项），拒绝交付 docx；
   * - 'confirm'：仅当每条未应用指令 id 都出现在 confirmNonApplied 中才交付；
   *   任一未应用项未获确认仍然抛出（针对性确认，不是笼统 always-allow）。
   */
  onNonApplied?: 'block' | 'confirm';
  /** onNonApplied==='confirm' 时逐条确认继续交付的未应用指令 id。 */
  confirmNonApplied?: readonly string[];
}

export interface ApplyRevisionInstructionSetResult {
  docx: Buffer;
  /** 每条指令的处理结果；未应用项也逐条在此返回（并已通过落盘门禁），不是静默跳过。 */
  outcomes: InstructionOutcome[];
}

/**
 * 管线的唯一对外入口：原始 docx + 修订指令集 → 带 tracked changes 与批注的 docx。
 * OOXML/zip 操作细节全部收在本函数背后，调用方不需要知道引擎内部实现。
 *
 * 落盘门禁：任何未应用指令都必须在产出 docx 之前显式暴露，并由策略阻断整份落盘或取得
 * 针对性确认——绝不"报错并跳过后照常交付"。
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

  // 落盘前门禁：先判定未应用项，未获针对性确认则整份阻断（不构造 zip、不返回 docx）。
  const nonApplied = outcomes.filter((o) => !isApplied(o.status));
  if (nonApplied.length > 0) {
    const confirmed = new Set(options.confirmNonApplied ?? []);
    const blocking =
      options.onNonApplied === 'confirm' ? nonApplied.filter((o) => !confirmed.has(o.id)) : nonApplied;
    if (blocking.length > 0) {
      throw new NonAppliedInstructionsError(outcomes, blocking);
    }
  }

  setText(files, 'word/document.xml', documentXml);
  if (comments.length > 0) {
    writeCommentsPart(files, comments, now.toISOString());
  }

  return { docx: saveDocx(files), outcomes };
}
