import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Document, Element, Node } from '@xmldom/xmldom';
import type { RevisionInstruction, RevisionInstructionSet } from '@courtwork/schemas';
import { locateQuote } from './locate.js';
import { eastAsiaFontFor, LATIN_FONT } from './fonts.js';

export const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const AUTHOR = 'Courtwork';

let revIdCounter = 1000;
let commentIdCounter = 0;
let revisionDate = '';

/**
 * 每次跑管线前重置计数器与时间戳，保证同一进程内多次调用互不干扰。
 * now 缺省为真实当前时间（生产用途）；golden file 快照测试必须显式传入固定时间，
 * 否则每次跑测试修订元数据里的日期都不同，快照永远对不上。
 * commentIdBase 缺省 0；输入文档已有批注时由上层传入"既有最大 id + 1"，避免新批注 id 冲突。
 */
export function resetIdCounters(now: Date = new Date(), commentIdBase = 0): void {
  revIdCounter = 1000;
  commentIdCounter = commentIdBase;
  revisionDate = now.toISOString();
}

function el(doc: Document, tag: string): Element {
  return doc.createElementNS(W, tag);
}
function attr(node: Element, name: string, value: string | number): void {
  node.setAttributeNS(W, name, String(value));
}
function localName(node: Node | null | undefined): string | null {
  return node && node.nodeType === 1 ? (node as Element).localName : null;
}

function textOf(node: Node): string {
  let s = '';
  const walk = (n: Node) => {
    if (n.nodeType === 1) {
      const ln = (n as Element).localName;
      if (ln === 't' || ln === 'delText') s += n.textContent ?? '';
    }
    for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
  };
  walk(node);
  return s;
}

function childrenOf(node: Element, tag: string): Element[] {
  const out: Element[] = [];
  for (let c = node.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === 1 && (c as Element).localName === tag) out.push(c as Element);
  }
  return out;
}
function firstChildOf(node: Element, tag: string): Element | null {
  return childrenOf(node, tag)[0] ?? null;
}

function bodyParagraphs(body: Element): Element[] {
  return childrenOf(body, 'p');
}
function findTable(body: Element): Element | null {
  for (let c = body.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === 1 && (c as Element).localName === 'tbl') return c as Element;
  }
  return null;
}
function rowsOf(tbl: Element): Element[] {
  return childrenOf(tbl, 'tr');
}
function cellsOf(tr: Element): Element[] {
  return childrenOf(tr, 'tc');
}
function firstParaOf(tc: Element): Element | null {
  return firstChildOf(tc, 'p');
}
function findRowContaining(tbl: Element, needle: string): Element | null {
  for (const tr of rowsOf(tbl)) {
    for (const tc of cellsOf(tr)) {
      const p = firstParaOf(tc);
      if (p && textOf(p).includes(needle)) return tr;
    }
  }
  return null;
}
function columnIndex(tbl: Element, header: string): number {
  const headerRow = rowsOf(tbl)[0];
  if (!headerRow) throw new Error('表格没有表头行');
  const cells = cellsOf(headerRow);
  for (let i = 0; i < cells.length; i++) {
    const p = firstParaOf(cells[i]!);
    if (p && textOf(p).trim() === header) return i;
  }
  throw new Error(`未找到表头列：${header}`);
}

/** 是否加粗——用于粗略区分标题/正文角色（v1 简化：不解析 w:pStyle 样式表）。 */
function isBoldRPr(rPr: Element | null): boolean {
  return rPr !== null && firstChildOf(rPr, 'b') !== null;
}

function buildRPr(doc: Document, templateRPr: Element | null): Element {
  const rPr = el(doc, 'w:rPr');
  if (templateRPr) {
    for (let c = templateRPr.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 1 && (c as Element).localName !== 'rFonts') {
        rPr.appendChild(c.cloneNode(true));
      }
    }
  }
  const fonts = el(doc, 'w:rFonts');
  const eastAsia = eastAsiaFontFor(isBoldRPr(templateRPr) ? 'heading' : 'body');
  attr(fonts, 'w:ascii', LATIN_FONT);
  attr(fonts, 'w:eastAsia', eastAsia);
  attr(fonts, 'w:hAnsi', LATIN_FONT);
  attr(fonts, 'w:cs', LATIN_FONT);
  rPr.insertBefore(fonts, rPr.firstChild);
  return rPr;
}

function ensureCompleteRFonts(doc: Document, r: Element): void {
  let rPr = firstChildOf(r, 'rPr');
  if (!rPr) {
    rPr = el(doc, 'w:rPr');
    r.insertBefore(rPr, r.firstChild);
  }

  let fonts = firstChildOf(rPr, 'rFonts');
  if (!fonts) {
    fonts = el(doc, 'w:rFonts');
    rPr.insertBefore(fonts, rPr.firstChild);
  }

  const eastAsia = eastAsiaFontFor(isBoldRPr(rPr) ? 'heading' : 'body');
  attr(fonts, 'w:ascii', LATIN_FONT);
  attr(fonts, 'w:eastAsia', eastAsia);
  attr(fonts, 'w:hAnsi', LATIN_FONT);
  attr(fonts, 'w:cs', LATIN_FONT);
}

function plainRun(doc: Document, text: string, templateRPr: Element | null): Element {
  const r = el(doc, 'w:r');
  r.appendChild(buildRPr(doc, templateRPr));
  const t = el(doc, 'w:t');
  t.setAttribute('xml:space', 'preserve');
  t.appendChild(doc.createTextNode(text));
  r.appendChild(t);
  return r;
}

function delRun(doc: Document, text: string, templateRPr: Element | null): Element {
  const del = el(doc, 'w:del');
  attr(del, 'w:id', revIdCounter++);
  attr(del, 'w:author', AUTHOR);
  attr(del, 'w:date', revisionDate);
  const r = el(doc, 'w:r');
  r.appendChild(buildRPr(doc, templateRPr));
  const dt = el(doc, 'w:delText');
  dt.setAttribute('xml:space', 'preserve');
  dt.appendChild(doc.createTextNode(text));
  r.appendChild(dt);
  del.appendChild(r);
  return del;
}

function wrapAsIns(doc: Document, r: Element): Element {
  const ins = el(doc, 'w:ins');
  attr(ins, 'w:id', revIdCounter++);
  attr(ins, 'w:author', AUTHOR);
  attr(ins, 'w:date', revisionDate);
  ins.appendChild(r);
  return ins;
}

function firstRunTemplate(p: Element): Element | null {
  const runs = childrenOf(p, 'r');
  if (runs.length === 0) return null;
  return firstChildOf(runs[0]!, 'rPr');
}

export interface CommentDraft {
  id: number;
  text: string;
}

function attachCommentAround(doc: Document, p: Element, anchor: Element, text: string, comments: CommentDraft[]): void {
  let target = anchor;
  const parentTag = localName(target.parentNode);
  if (parentTag === 'ins' || parentTag === 'del') {
    target = target.parentNode as Element;
  }
  const cid = commentIdCounter++;
  const start = el(doc, 'w:commentRangeStart');
  attr(start, 'w:id', cid);
  const end = el(doc, 'w:commentRangeEnd');
  attr(end, 'w:id', cid);
  const refRun = el(doc, 'w:r');
  ensureCompleteRFonts(doc, refRun); // 批注引用 run 也是本次新写入，需显式完整 rFonts
  const ref = el(doc, 'w:commentReference');
  attr(ref, 'w:id', cid);
  refRun.appendChild(ref);

  p.insertBefore(start, target);
  if (target.nextSibling) p.insertBefore(end, target.nextSibling);
  else p.appendChild(end);
  if (end.nextSibling) p.insertBefore(refRun, end.nextSibling);
  else p.appendChild(refRun);

  comments.push({ id: cid, text });
}

function attachCommentToWholeParagraph(doc: Document, p: Element, text: string, comments: CommentDraft[]): void {
  const cid = commentIdCounter++;
  const start = el(doc, 'w:commentRangeStart');
  attr(start, 'w:id', cid);
  const end = el(doc, 'w:commentRangeEnd');
  attr(end, 'w:id', cid);
  const refRun = el(doc, 'w:r');
  ensureCompleteRFonts(doc, refRun); // 批注引用 run 也是本次新写入，需显式完整 rFonts
  const ref = el(doc, 'w:commentReference');
  attr(ref, 'w:id', cid);
  refRun.appendChild(ref);

  p.insertBefore(start, p.firstChild);
  p.appendChild(end);
  p.appendChild(refRun);

  comments.push({ id: cid, text });
}

function ensureRPrIn(doc: Document, container: Element, tag: 'pPr' | 'rPr'): Element {
  let node = firstChildOf(container, tag);
  if (!node) {
    node = el(doc, `w:${tag}`);
    container.insertBefore(node, container.firstChild);
  }
  return node;
}

function markParagraphMarkIns(doc: Document, p: Element): void {
  const pPr = ensureRPrIn(doc, p, 'pPr');
  const rPr = ensureRPrIn(doc, pPr, 'rPr');
  const ins = el(doc, 'w:ins');
  attr(ins, 'w:id', revIdCounter++);
  attr(ins, 'w:author', AUTHOR);
  attr(ins, 'w:date', revisionDate);
  rPr.appendChild(ins);
}

function markParagraphDeleted(doc: Document, p: Element): void {
  const runs = childrenOf(p, 'r');
  for (const r of runs) {
    const rPr = firstChildOf(r, 'rPr');
    const text = childrenOf(r, 't')
      .map((t) => t.textContent ?? '')
      .join('');
    const del = delRun(doc, text, rPr);
    p.insertBefore(del, r);
    p.removeChild(r);
  }
  const pPr = ensureRPrIn(doc, p, 'pPr');
  const rPr = ensureRPrIn(doc, pPr, 'rPr');
  const del = el(doc, 'w:del');
  attr(del, 'w:id', revIdCounter++);
  attr(del, 'w:author', AUTHOR);
  attr(del, 'w:date', revisionDate);
  rPr.appendChild(del);
}

function markRowDeleted(doc: Document, tr: Element): void {
  let trPrEl = firstChildOf(tr, 'trPr');
  if (!trPrEl) {
    trPrEl = el(doc, 'w:trPr');
    tr.insertBefore(trPrEl, tr.firstChild);
  }
  const del = el(doc, 'w:del');
  attr(del, 'w:id', revIdCounter++);
  attr(del, 'w:author', AUTHOR);
  attr(del, 'w:date', revisionDate);
  trPrEl.appendChild(del);

  for (const tc of cellsOf(tr)) {
    const p = firstParaOf(tc);
    if (p) markParagraphDeleted(doc, p);
  }
}

function applyMinimalReplace(
  doc: Document,
  p: Element,
  quote: string,
  replacement: string,
  annotation: { text: string } | undefined,
  comments: CommentDraft[],
): void {
  const full = textOf(p);
  const newFull = full.split(quote).join(replacement);
  const template = firstRunTemplate(p);

  let prefixLen = 0;
  const maxPrefix = Math.min(full.length, newFull.length);
  while (prefixLen < maxPrefix && full[prefixLen] === newFull[prefixLen]) prefixLen++;

  let suffixLen = 0;
  const maxSuffix = Math.min(full.length, newFull.length) - prefixLen;
  while (
    suffixLen < maxSuffix &&
    full[full.length - 1 - suffixLen] === newFull[newFull.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const prefix = full.slice(0, prefixLen);
  const deleted = full.slice(prefixLen, full.length - suffixLen);
  const inserted = newFull.slice(prefixLen, newFull.length - suffixLen);
  const suffix = full.slice(full.length - suffixLen);

  // 段落级属性（编号 w:numPr、样式 w:pStyle、段前分页 w:pageBreakBefore 等）承载在 w:pPr 上，
  // 与被替换的正文 run 无关。清空重建 run 时必须原样保留 w:pPr，并保持它仍是段落首个子节点
  // （OOXML 要求 w:pPr 位于 w:p 之首）——否则替换一句话会连带丢掉整段的编号/样式/分页。
  const pPr = firstChildOf(p, 'pPr');
  while (p.firstChild) p.removeChild(p.firstChild);
  if (pPr) p.appendChild(pPr);

  let insertedWrapper: Element | null = null;
  if (prefix) p.appendChild(plainRun(doc, prefix, template));
  if (deleted) p.appendChild(delRun(doc, deleted, template));
  if (inserted) {
    insertedWrapper = wrapAsIns(doc, plainRun(doc, inserted, template));
    p.appendChild(insertedWrapper);
  }
  if (suffix) p.appendChild(plainRun(doc, suffix, template));

  if (annotation) {
    const anchor = insertedWrapper ?? (() => {
      const r = plainRun(doc, '', template);
      p.appendChild(r);
      return r;
    })();
    attachCommentAround(doc, p, anchor, annotation.text, comments);
  }
}

export type ApplyStatus =
  | 'applied'
  | 'applied_fuzzy'
  | 'locator_not_found'
  | 'locator_ambiguous'
  | 'locator_text_mismatch'
  | 'unsupported_locator';

export interface InstructionOutcome {
  id: string;
  status: ApplyStatus;
  detail?: string;
}

function resolveTextParagraph(
  body: Element,
  quote: string,
  paragraphHint: string | undefined,
): { paragraph: Element; status: ApplyStatus } | null {
  const paragraphs = bodyParagraphs(body);
  const texts = paragraphs.map((p) => textOf(p));
  const located = locateQuote(texts, quote, { paragraphHint });
  if (located.status === 'exact') {
    return { paragraph: paragraphs[located.paragraphIndex]!, status: 'applied' };
  }
  if (located.status === 'fuzzy') {
    return { paragraph: paragraphs[located.paragraphIndex]!, status: 'applied_fuzzy' };
  }
  return null;
}

function applyOne(doc: Document, body: Element, instruction: RevisionInstruction, comments: CommentDraft[]): InstructionOutcome {
  const { id, kind, locator } = instruction;
  const annotation = 'annotation' in instruction ? instruction.annotation : undefined;

  if (locator.strategy === 'tableCell') {
    const tbl = findTable(body);
    const row = tbl ? findRowContaining(tbl, locator.rowContains) : null;
    if (!tbl || !row) return { id, status: 'locator_not_found' };
    const cell = cellsOf(row)[columnIndex(tbl, locator.columnHeader)];
    const p = cell ? firstParaOf(cell) : null;
    if (!p) return { id, status: 'locator_not_found' };
    if (!textOf(p).includes(locator.quote)) return { id, status: 'locator_text_mismatch' };
    if (kind === 'replace') {
      applyMinimalReplace(doc, p, locator.quote, instruction.text, annotation, comments);
      return { id, status: 'applied' };
    }
    if (kind === 'commentOnly') {
      attachCommentToWholeParagraph(doc, p, annotation!.text, comments);
      return { id, status: 'applied' };
    }
    return { id, status: 'unsupported_locator', detail: `${kind} + tableCell 组合暂不支持` };
  }

  if (locator.strategy === 'tableRow') {
    const tbl = findTable(body);
    const row = tbl ? findRowContaining(tbl, locator.rowContains) : null;
    if (!tbl || !row) return { id, status: 'locator_not_found' };
    if (kind === 'delete') {
      markRowDeleted(doc, row);
      if (annotation) {
        const firstCell = cellsOf(row)[0];
        const p = firstCell ? firstParaOf(firstCell) : null;
        if (p) attachCommentToWholeParagraph(doc, p, annotation.text, comments);
      }
      return { id, status: 'applied' };
    }
    if (kind === 'commentOnly') {
      const firstCell = cellsOf(row)[0];
      const p = firstCell ? firstParaOf(firstCell) : null;
      if (!p) return { id, status: 'locator_not_found' };
      attachCommentToWholeParagraph(doc, p, annotation!.text, comments);
      return { id, status: 'applied' };
    }
    return { id, status: 'unsupported_locator', detail: `${kind} + tableRow 组合暂不支持` };
  }

  // strategy === 'text'
  if (kind === 'insert') {
    const resolved = resolveTextParagraph(body, locator.quote, locator.paragraphHint);
    if (!resolved) {
      const paragraphs = bodyParagraphs(body);
      const texts = paragraphs.map((p) => textOf(p));
      const located = locateQuote(texts, locator.quote, { paragraphHint: locator.paragraphHint });
      return { id, status: located.status === 'ambiguous' ? 'locator_ambiguous' : 'locator_not_found' };
    }
    const anchor = resolved.paragraph;
    const newP = el(doc, 'w:p');
    const run = plainRun(doc, instruction.text.replace(/\n/g, ' '), firstRunTemplate(anchor));
    const insWrapper = wrapAsIns(doc, run);
    newP.appendChild(insWrapper);
    markParagraphMarkIns(doc, newP);
    if (anchor.nextSibling) body.insertBefore(newP, anchor.nextSibling);
    else body.appendChild(newP);
    if (annotation) attachCommentAround(doc, newP, insWrapper, annotation.text, comments);
    return { id, status: resolved.status };
  }

  const paragraphs = bodyParagraphs(body);
  const texts = paragraphs.map((p) => textOf(p));
  const located = locateQuote(texts, locator.quote, { paragraphHint: locator.paragraphHint });
  if (located.status === 'not_found') return { id, status: 'locator_not_found' };
  if (located.status === 'ambiguous') return { id, status: 'locator_ambiguous' };
  const p = paragraphs[located.paragraphIndex]!;
  const outStatus: ApplyStatus = located.status === 'fuzzy' ? 'applied_fuzzy' : 'applied';

  if (kind === 'replace') {
    applyMinimalReplace(doc, p, locator.quote, instruction.text, annotation, comments);
    return { id, status: outStatus };
  }
  if (kind === 'delete') {
    markParagraphDeleted(doc, p);
    if (annotation) attachCommentToWholeParagraph(doc, p, annotation.text, comments);
    return { id, status: outStatus };
  }
  // commentOnly
  attachCommentToWholeParagraph(doc, p, annotation!.text, comments);
  return { id, status: outStatus };
}

export interface ApplyResult {
  documentXml: string;
  comments: CommentDraft[];
  outcomes: InstructionOutcome[];
}

export interface ApplyDocumentXmlOptions {
  /** 既有批注最大 id + 1；新批注/批注 range 的 id 从此起，避免与输入文档既有 comment id 冲突。 */
  commentIdBase?: number;
}

export function applyInstructionsToDocumentXml(
  documentXmlText: string,
  instructionSet: RevisionInstructionSet,
  now: Date = new Date(),
  options: ApplyDocumentXmlOptions = {},
): ApplyResult {
  resetIdCounters(now, options.commentIdBase ?? 0);
  const doc = new DOMParser().parseFromString(documentXmlText, 'text/xml');
  const bodyList = doc.getElementsByTagNameNS(W, 'body');
  const body = bodyList[0];
  if (!body) throw new Error('document.xml 缺少 w:body');

  const comments: CommentDraft[] = [];
  const outcomes: InstructionOutcome[] = [];
  for (const instruction of instructionSet.instructions) {
    outcomes.push(applyOne(doc, body, instruction, comments));
  }
  // 字体只作用于本次新写入或实际触碰的 run（plainRun/delRun 经 buildRPr、批注引用 run 经
  // ensureCompleteRFonts 均已就地写全 rFonts）；未触碰的原文 run 一律逐节点原样保留，
  // 即使它本来没有 w:rFonts 也不补写——旧的"全局改写所有 run"会污染未编辑内容的字体。

  return {
    documentXml: new XMLSerializer().serializeToString(doc),
    comments,
    outcomes,
  };
}
