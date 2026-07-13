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

function walkBody(body: Element): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  for (let c = body.firstChild; c; c = c.nextSibling) {
    const tag = localName(c);
    if (tag === 'p') {
      const p = c as Element;
      const text = textOf(p);
      if (text.trim().length === 0) continue;
      blocks.push({ kind: 'paragraph', text, heading: isBoldParagraph(p) });
    } else if (tag === 'tbl') {
      const tbl = c as Element;
      const rows = children(tbl, 'tr').map((tr) => children(tr, 'tc').map((tc) => children(tc, 'p').map(textOf).join(' ')));
      blocks.push({ kind: 'table', rows, merged: tableHasMergedCells(tbl) });
    }
  }
  return blocks;
}
