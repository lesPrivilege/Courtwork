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

/** 只认 WordprocessingML 命名空间下的同名元素——外部命名空间借 W 的名字（`zz:tcPr`）不是 W 节点。 */
function children(node: Element, tag: string): Element[] {
  const out: Element[] = [];
  for (let c = node.firstChild; c; c = c.nextSibling) {
    if (c.nodeType !== 1) continue;
    const el = c as Element;
    if (el.namespaceURI === W && el.localName === tag) out.push(el);
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

/**
 * READING-SDT-1（+1R）：块级读取 fail-closed 化。本包只认得下面四张白名单里的结构；
 * 名单外（含未来新增的未知标签、以及外部命名空间借用 W 同名的节点）一律整文件降级并具名
 * 标出——沿合并单元格先例，绝不静默丢内容（SPEC 硬禁区）。`w:sdt`（内容控件/自动目录）在
 * 真实合同中存在，递归收编属能力扩张，须以真实语料频次立据后另票由拒绝升为透明展开。
 *
 * 1R 补的是首轮漏掉的两级：`w:tbl→w:tr` 与 `w:tr→w:tc` 当时仍按名采集，不认识的包装层
 * （`w:sdt` 重复节、`w:customXml`）被跳过，整行/整格文本静默消失。
 */
interface LevelGate {
  /** 需要继续读取的内容节点。 */
  readonly content: ReadonlySet<string>;
  /** 已知不承载正文、可安全跳过的节点。 */
  readonly benign: ReadonlySet<string>;
}

const RANGE_MARKUP = ['bookmarkStart', 'bookmarkEnd', 'proofErr', 'commentRangeStart', 'commentRangeEnd'];
const BODY_GATE: LevelGate = {
  content: new Set(['p', 'tbl']),
  benign: new Set(['sectPr', ...RANGE_MARKUP]),
};
/**
 * tbl/tr 两级的良性名单同样带 range markup（1R 独立验收 fix-by-acceptance）：ECMA-376 里
 * `CT_Tbl` 的序列以 `EG_RangeMarkupElements*` 起头，`CT_Tbl`/`CT_Row` 的行内容组又都含
 * `EG_RunLevelElts`（其中即含 range markup），故这五枚在此两级合法且 Word 会发；漏收会让带
 * 书签/批注区间的真实表格合同被整文件拒读。`tblPrEx` 是 `CT_Row` 的明文直子，与 `trPr` 同类。
 * 放宽只及零正文承载的良性面——`w:sdt`/`w:customXml` 等内容承载包装形仍一律降级。
 */
const TBL_GATE: LevelGate = { content: new Set(['tr']), benign: new Set(['tblPr', 'tblGrid', ...RANGE_MARKUP]) };
const TR_GATE: LevelGate = { content: new Set(['tc']), benign: new Set(['trPr', 'tblPrEx', ...RANGE_MARKUP]) };
const CELL_GATE: LevelGate = {
  content: new Set(['p']),
  benign: new Set(['tcPr', ...RANGE_MARKUP]),
};

/** 报错里的块名：W 命名空间下用规范前缀 `w:`；外部命名空间原样带出文档里的限定名，不冒充 W 节点。 */
function blockDisplayName(el: Element): string {
  return el.namespaceURI === W ? `w:${el.localName ?? ''}` : el.nodeName || (el.localName ?? '');
}

function unsupportedBlock(name: string): DocxReadError {
  return new DocxReadError(
    'fidelity_insufficient',
    `文档含本包无法安全转出的块级结构（${name}），整文件降级（不静默丢内容）`,
  );
}

/**
 * 各级唯一门禁：非元素节点跳过；元素必须同时满足「在 W 命名空间下」与「名字在内容或良性
 * 名单里」，两条缺一即具名降级。命名空间必须比对——只比 localName 会把外部命名空间借来的
 * 同名节点（`zz:sectPr`/`zz:tr`）当成自己人，它携带的正文随之静默消失；这与
 * `packages/output` 的 `paragraphSupportsRebuild` 两级命名空间判据是同一道理。
 */
function gatedChildren(parent: Element, gate: LevelGate): Element[] {
  const out: Element[] = [];
  for (let c = parent.firstChild; c; c = c.nextSibling) {
    if (c.nodeType !== 1) continue;
    const el = c as Element;
    const name = el.namespaceURI === W ? (el.localName ?? '') : null;
    if (name === null || !(gate.content.has(name) || gate.benign.has(name))) {
      throw unsupportedBlock(blockDisplayName(el));
    }
    if (gate.content.has(name)) out.push(el);
  }
  return out;
}

function readCellText(tc: Element): string {
  // 嵌套表格、单元格内内容控件等：文本会从行拼接中静默消失，故一律经门禁降级。
  return gatedChildren(tc, CELL_GATE).map(textOf).join(' ');
}

function hasMergeMark(tc: Element): boolean {
  const tcPr = children(tc, 'tcPr')[0];
  if (!tcPr) return false;
  return children(tcPr, 'gridSpan').length > 0 || children(tcPr, 'vMerge').length > 0;
}

/**
 * 表格只走这一趟已过门的遍历：行、单元格与合并探测读同一份元素，不做第二遍按名扫描。
 * 首轮的 `tableHasMergedCells` 自己再 `children(tbl,'tr')` 扫一遍，包装形因此连合并探测
 * 都躲过去了——本包唯一的保真出口被一层 `w:sdt` 绕开（1R 的 P10/P11 成对反例）。
 */
function readTable(tbl: Element): DocxBlock {
  const rows: string[][] = [];
  let merged = false;
  for (const tr of gatedChildren(tbl, TBL_GATE)) {
    const row: string[] = [];
    for (const tc of gatedChildren(tr, TR_GATE)) {
      if (hasMergeMark(tc)) merged = true;
      row.push(readCellText(tc));
    }
    rows.push(row);
  }
  return { kind: 'table', rows, merged };
}

function walkBody(body: Element): DocxBlock[] {
  const blocks: DocxBlock[] = [];
  for (const el of gatedChildren(body, BODY_GATE)) {
    if (el.localName === 'p') {
      const text = textOf(el);
      if (text.trim().length === 0) continue;
      blocks.push({ kind: 'paragraph', text, heading: isBoldParagraph(el) });
    } else {
      blocks.push(readTable(el));
    }
  }
  return blocks;
}
