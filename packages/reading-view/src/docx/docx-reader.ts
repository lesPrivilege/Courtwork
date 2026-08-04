import type { Element, Node } from '@xmldom/xmldom';
import { DocxSecurityError, preflightDocx } from '../security/docx-preflight.js';
import { parseXmlStrict } from '../security/xml-guard.js';
import type { ResolvedLimits } from '../security/limits.js';
import type { DisabledReason } from '../types.js';

export class DocxReadError extends Error {
  constructor(
    public readonly reason: DisabledReason,
    message: string,
  ) {
    super(message);
    this.name = 'DocxReadError';
  }
}

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

export type DocxBlock =
  | { kind: 'paragraph'; text: string; heading: boolean }
  | { kind: 'table'; rows: string[][]; merged: boolean };

export function readDocxBlocks(data: Uint8Array, limits: ResolvedLimits): DocxBlock[] {
  let documentXmlText: string;
  try {
    documentXmlText = preflightDocx(data, limits).documentXmlText;
  } catch (error) {
    if (error instanceof DocxSecurityError) {
      throw new DocxReadError(error.reason, error.message);
    }
    throw error;
  }

  let doc;
  try {
    doc = parseXmlStrict(documentXmlText);
  } catch (err) {
    throw new DocxReadError('corrupt_file', err instanceof Error ? err.message : String(err));
  }

  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  if (!body) {
    throw new DocxReadError('corrupt_file', 'document.xml 缺少 w:body');
  }

  return walkBody(body);
}

function localName(node: Node | null): string | null {
  return node && node.nodeType === 1 ? ((node as Element).localName ?? null) : null;
}

function children(node: Element, tag: string): Element[] {
  const out: Element[] = [];
  for (let c = node.firstChild; c; c = c.nextSibling) {
    if (localName(c) === tag) out.push(c as Element);
  }
  return out;
}

function textOf(node: Element): string {
  let text = '';
  const walk = (n: Node) => {
    if (n.nodeType === 1 && (n as Element).localName === 't') {
      text += n.textContent ?? '';
    }
    for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
  };
  walk(node);
  return text;
}

/** 是否加粗——与 packages/output 完全一致的启发式（不解析 w:pStyle），读写两侧判断口径统一。 */
function isBoldParagraph(p: Element): boolean {
  for (const r of children(p, 'r')) {
    const rPr = children(r, 'rPr')[0];
    if (rPr && children(rPr, 'b').length > 0) return true;
  }
  return false;
}

function tableHasMergedCells(tbl: Element): boolean {
  for (const tr of children(tbl, 'tr')) {
    for (const tc of children(tr, 'tc')) {
      const tcPr = children(tc, 'tcPr')[0];
      if (!tcPr) continue;
      if (children(tcPr, 'gridSpan').length > 0 || children(tcPr, 'vMerge').length > 0) return true;
    }
  }
  return false;
}

/**
 * READING-SDT-1：块级读取 fail-closed 化。本包只认得下面两张白名单里的结构；
 * 名单外（含未来新增的未知标签）一律整文件降级并具名标出——沿合并单元格先例，
 * 绝不静默丢内容（SPEC 硬禁区）。`w:sdt`（内容控件/自动目录）在真实合同中存在，
 * 递归收编属能力扩张，须以真实语料频次立据后另票把 `sdt` 由拒绝升为透明展开。
 */
const BODY_BENIGN_TAGS = new Set(['sectPr', 'bookmarkStart', 'bookmarkEnd', 'proofErr', 'commentRangeStart', 'commentRangeEnd']);
const CELL_BENIGN_TAGS = new Set(['tcPr', 'bookmarkStart', 'bookmarkEnd', 'proofErr', 'commentRangeStart', 'commentRangeEnd']);

function unsupportedBlock(tag: string): DocxReadError {
  return new DocxReadError(
    'fidelity_insufficient',
    `文档含本包无法安全转出的块级结构（w:${tag}），整文件降级（不静默丢内容）`,
  );
}

function readCellText(tc: Element): string {
  for (let c = tc.firstChild; c; c = c.nextSibling) {
    const tag = localName(c);
    if (tag === null || tag === 'p' || CELL_BENIGN_TAGS.has(tag)) continue;
    // 嵌套表格、单元格内内容控件等：文本会从行拼接中静默消失，整文件降级。
    throw unsupportedBlock(tag);
  }
  return children(tc, 'p').map(textOf).join(' ');
}

function walkBody(body: Element): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  for (let c = body.firstChild; c; c = c.nextSibling) {
    const tag = localName(c);
    if (tag === null) continue;
    if (tag === 'p') {
      const p = c as Element;
      const text = textOf(p);
      if (text.trim().length === 0) continue;
      blocks.push({ kind: 'paragraph', text, heading: isBoldParagraph(p) });
    } else if (tag === 'tbl') {
      const tbl = c as Element;
      const rows = children(tbl, 'tr').map((tr) => children(tr, 'tc').map(readCellText));
      blocks.push({ kind: 'table', rows, merged: tableHasMergedCells(tbl) });
    } else if (!BODY_BENIGN_TAGS.has(tag)) {
      throw unsupportedBlock(tag);
    }
  }
  return blocks;
}
