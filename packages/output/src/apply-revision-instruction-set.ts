import { strFromU8 } from 'fflate';
import { RevisionInstructionSetSchema, type RevisionInstructionSet } from '@courtwork/schemas';
import { loadDocx, getText, setText, saveDocx, type DocxFiles } from './docx-zip.js';
import { applyInstructionsToDocumentXml, type ApplyStatus, type InstructionOutcome } from './apply-instructions.js';
import { writeCommentsPart, nextCommentId } from './comments-part.js';

/**
 * 原件带 OPC 数字签名。对副本新增批注也会使其密码学签名失效，故本包在解析/改写
 * `document.xml` 之前 typed 阻断：既不剥除签名继续，也不把签名失效说成结构保全。
 */
export class SignedDocumentUnsupportedError extends Error {
  readonly code = 'signed_document_unsupported' as const;
  /** 命中的规范信号（part / relationship / contentType），仅供诊断，不面向用户。 */
  readonly signal: 'part' | 'relationship' | 'contentType';
  constructor(signal: 'part' | 'relationship' | 'contentType', detail: string) {
    super(`原件含 OPC 数字签名（${signal}：${detail}），生成批注稿会使签名失效，已阻断`);
    this.name = 'SignedDocumentUnsupportedError';
    this.signal = signal;
  }
}

const SIGNATURE_PART_PREFIX = '_xmlsignatures/';

const SIGNATURE_RELATIONSHIP_TYPES = new Set(
  [
    'http://schemas.openxmlformats.org/package/2006/relationships/digital-signature/origin',
    'http://schemas.openxmlformats.org/package/2006/relationships/digital-signature/signature',
    'http://schemas.openxmlformats.org/package/2006/relationships/digital-signature/certificate',
  ].map((uri) => uri.toLowerCase()),
);

const SIGNATURE_CONTENT_TYPES = new Set(
  [
    'application/vnd.openxmlformats-package.digital-signature-origin',
    'application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml',
    'application/vnd.openxmlformats-package.digital-signature-certificate',
  ].map((mime) => mime.toLowerCase()),
);

/**
 * OPC part name 规范化：去掉前导 `/`、`./`，折叠重复分隔符，再作 ASCII 小写。
 * 只规范化，不解析 `..`——包内不存在合法的向上引用，出现即按原样比对（不会命中前缀）。
 */
function normalizePartName(name: string): string {
  return name.replace(/\\/g, '/').replace(/^(?:\.?\/)+/, '').replace(/\/{2,}/g, '/').toLowerCase();
}

/** 取 XML 属性值的闭集匹配：只认规范 URI/MIME，绝不用 `includes('signature')` 模糊搜。 */
function attributeValues(xml: string, attribute: string): string[] {
  const pattern = new RegExp(`\\b${attribute}\\s*=\\s*"([^"]*)"|\\b${attribute}\\s*=\\s*'([^']*)'`, 'gi');
  const values: string[] = [];
  for (const match of xml.matchAll(pattern)) {
    values.push((match[1] ?? match[2] ?? '').trim());
  }
  return values;
}

/**
 * 从唯一 DOCX 预检所得的 files 识别数字签名事实。三类信号任一成立即阻断：
 * 规范化后大小写无关的 `_xmlsignatures/` part、**任一** `.rels`（不止 root）中的三种标准
 * relationship type、`[Content_Types].xml` 中 Default/Override 的三种标准 MIME。
 */
function assertNotSignedDocx(files: DocxFiles): void {
  for (const path of Object.keys(files)) {
    if (normalizePartName(path).startsWith(SIGNATURE_PART_PREFIX)) {
      throw new SignedDocumentUnsupportedError('part', path);
    }
  }

  for (const [path, bytes] of Object.entries(files)) {
    if (!normalizePartName(path).endsWith('.rels')) continue;
    for (const type of attributeValues(strFromU8(bytes), 'Type')) {
      if (SIGNATURE_RELATIONSHIP_TYPES.has(type.toLowerCase())) {
        throw new SignedDocumentUnsupportedError('relationship', `${path} → ${type}`);
      }
    }
  }

  const contentTypes = files['[Content_Types].xml'];
  if (contentTypes) {
    for (const mime of attributeValues(strFromU8(contentTypes), 'ContentType')) {
      if (SIGNATURE_CONTENT_TYPES.has(mime.toLowerCase())) {
        throw new SignedDocumentUnsupportedError('contentType', mime);
      }
    }
  }
}

/**
 * 公共运行时边界的输入不合契约。TypeScript cast 与 JS consumer 都绕不过
 * `instructions.min(1)`——空集合曾被当作"安全 fixture"，那是契约旁路而不是安全性。
 */
export class InvalidRevisionInstructionSetError extends Error {
  readonly code = 'invalid_revision_instruction_set' as const;
  readonly issues: readonly string[];
  constructor(issues: readonly string[]) {
    super(`修订指令集不合契约，已在加载/改写/压缩前拒绝：${issues.join('；')}`);
    this.name = 'InvalidRevisionInstructionSetError';
    this.issues = issues;
  }
}

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

  // 输入闭口：运行时校验先于加载/改写/压缩，非法输入零解析、零 ZIP。
  const parsed = RevisionInstructionSetSchema.safeParse(instructionSet);
  if (!parsed.success) {
    throw new InvalidRevisionInstructionSetError(
      parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}：${issue.message}`),
    );
  }
  instructionSet = parsed.data;

  const files = loadDocx(originalDocx);
  // OPC 数字签名先于任何解析/改写判定：签名事实一旦成立，本包不产出任何 docx。
  assertNotSignedDocx(files);

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

  return { docx: saveDocx(files, now), outcomes };
}
