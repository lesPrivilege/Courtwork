import { DOMParser, XMLSerializer } from "@xmldom/xmldom";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const AUTHOR = "Courtwork Spike";
const DATE = "2026-07-09T00:00:00Z";

let nextRevId = 1000;
let nextCommentId = 0;

function el(doc, tag) {
  return doc.createElementNS(W, tag);
}
function attr(node, name, value) {
  node.setAttributeNS(W, name, String(value));
}

function textOf(node) {
  let s = "";
  const walk = (n) => {
    if (n.nodeType === 1 && (n.localName === "t" || n.localName === "delText")) {
      s += n.textContent;
    }
    for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
  };
  walk(node);
  return s;
}

function findParagraphByQuote(body, quote) {
  const paras = Array.from(body.childNodes).filter(
    (n) => n.nodeType === 1 && n.localName === "p",
  );
  for (const p of paras) {
    if (textOf(p).includes(quote)) return p;
  }
  return null;
}

function findTable(body) {
  for (const n of Array.from(body.childNodes)) {
    if (n.nodeType === 1 && n.localName === "tbl") return n;
  }
  return null;
}

function rowsOf(tbl) {
  return Array.from(tbl.childNodes).filter((n) => n.nodeType === 1 && n.localName === "tr");
}
function cellsOf(tr) {
  return Array.from(tr.childNodes).filter((n) => n.nodeType === 1 && n.localName === "tc");
}
function firstParaOf(tc) {
  return Array.from(tc.childNodes).find((n) => n.nodeType === 1 && n.localName === "p");
}

function findRowContaining(tbl, needle) {
  for (const tr of rowsOf(tbl)) {
    for (const tc of cellsOf(tr)) {
      const p = firstParaOf(tc);
      if (p && textOf(p).includes(needle)) return tr;
    }
  }
  return null;
}

function columnIndex(tbl, header) {
  const headerRow = rowsOf(tbl)[0];
  const cells = cellsOf(headerRow);
  for (let i = 0; i < cells.length; i++) {
    const p = firstParaOf(cells[i]);
    if (textOf(p).trim() === header) return i;
  }
  throw new Error("column not found: " + header);
}

function plainRun(doc, text) {
  const r = el(doc, "w:r");
  const t = el(doc, "w:t");
  t.setAttribute("xml:space", "preserve");
  t.appendChild(doc.createTextNode(text));
  r.appendChild(t);
  return r;
}

function delRun(doc, text) {
  const del = el(doc, "w:del");
  attr(del, "w:id", nextRevId++);
  attr(del, "w:author", AUTHOR);
  attr(del, "w:date", DATE);
  const r = el(doc, "w:r");
  const dt = el(doc, "w:delText");
  dt.setAttribute("xml:space", "preserve");
  dt.appendChild(doc.createTextNode(text));
  r.appendChild(dt);
  del.appendChild(r);
  return del;
}

function wrapAsIns(doc, r) {
  const ins = el(doc, "w:ins");
  attr(ins, "w:id", nextRevId++);
  attr(ins, "w:author", AUTHOR);
  attr(ins, "w:date", DATE);
  ins.appendChild(r);
  return ins;
}

// 公共前缀/后缀裁剪，逼近专业 diff 引擎的细粒度效果（与 Python/docx4j 两条 spike 路径同一算法）
function applyMinimalReplace(doc, p, quote, replacement, annotationText, comments) {
  const full = textOf(p);
  const newFull = full.split(quote).join(replacement);

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

  while (p.firstChild) p.removeChild(p.firstChild);

  let insertedRunWrapper = null;
  if (prefix) p.appendChild(plainRun(doc, prefix));
  if (deleted) p.appendChild(delRun(doc, deleted));
  if (inserted) {
    insertedRunWrapper = wrapAsIns(doc, plainRun(doc, inserted));
    p.appendChild(insertedRunWrapper);
  }
  if (suffix) p.appendChild(plainRun(doc, suffix));

  if (annotationText) {
    const anchor = insertedRunWrapper ?? (() => {
      const r = plainRun(doc, "");
      p.appendChild(r);
      return r;
    })();
    attachCommentAround(doc, p, anchor, annotationText, comments);
  }
}

function markParagraphMarkIns(doc, p) {
  let pPr = Array.from(p.childNodes).find((n) => n.localName === "pPr");
  if (!pPr) {
    pPr = el(doc, "w:pPr");
    p.insertBefore(pPr, p.firstChild);
  }
  let rPr = Array.from(pPr.childNodes).find((n) => n.localName === "rPr");
  if (!rPr) {
    rPr = el(doc, "w:rPr");
    pPr.appendChild(rPr);
  }
  const ins = el(doc, "w:ins");
  attr(ins, "w:id", nextRevId++);
  attr(ins, "w:author", AUTHOR);
  attr(ins, "w:date", DATE);
  rPr.appendChild(ins);
}

function markParagraphDeleted(doc, p) {
  const runs = Array.from(p.childNodes).filter((n) => n.localName === "r");
  for (const r of runs) {
    const texts = Array.from(r.childNodes).filter((n) => n.localName === "t");
    const text = texts.map((t) => t.textContent).join("");
    const del = delRun(doc, text);
    p.insertBefore(del, r);
    p.removeChild(r);
  }
  let pPr = Array.from(p.childNodes).find((n) => n.localName === "pPr");
  if (!pPr) {
    pPr = el(doc, "w:pPr");
    p.insertBefore(pPr, p.firstChild);
  }
  let rPr = Array.from(pPr.childNodes).find((n) => n.localName === "rPr");
  if (!rPr) {
    rPr = el(doc, "w:rPr");
    pPr.appendChild(rPr);
  }
  const del = el(doc, "w:del");
  attr(del, "w:id", nextRevId++);
  attr(del, "w:author", AUTHOR);
  attr(del, "w:date", DATE);
  rPr.appendChild(del);
}

function markRowDeleted(doc, tr) {
  let trPr = Array.from(tr.childNodes).find((n) => n.localName === "trPr");
  if (!trPr) {
    trPr = el(doc, "w:trPr");
    tr.insertBefore(trPr, tr.firstChild);
  }
  const del = el(doc, "w:del");
  attr(del, "w:id", nextRevId++);
  attr(del, "w:author", AUTHOR);
  attr(del, "w:date", DATE);
  trPr.appendChild(del);

  for (const tc of cellsOf(tr)) {
    const p = firstParaOf(tc);
    if (p) markParagraphDeleted(doc, p);
  }
}

// commentRangeStart/End + commentReference 不能塞进 w:del/w:ins 内部，
// 命中点在修订包裹内时改成以包裹元素本身为锚点（与 Python/docx4j 两条 spike 路径同一原则）
function attachCommentAround(doc, p, anchorNode, text, comments) {
  const cid = nextCommentId++;
  let anchor = anchorNode;
  if (anchor.parentNode !== p && (anchor.localName === "ins" || anchor.localName === "del")) {
    // already the wrapper itself in most call sites; kept for defensive symmetry
  }
  if (anchor.localName !== "ins" && anchor.localName !== "del" && anchor.parentNode?.localName) {
    const parentTag = anchor.parentNode.localName;
    if (parentTag === "ins" || parentTag === "del") anchor = anchor.parentNode;
  }

  const start = el(doc, "w:commentRangeStart");
  attr(start, "w:id", cid);
  const end = el(doc, "w:commentRangeEnd");
  attr(end, "w:id", cid);
  const refRun = el(doc, "w:r");
  const ref = el(doc, "w:commentReference");
  attr(ref, "w:id", cid);
  refRun.appendChild(ref);

  p.insertBefore(start, anchor);
  if (anchor.nextSibling) p.insertBefore(end, anchor.nextSibling);
  else p.appendChild(end);
  if (end.nextSibling) p.insertBefore(refRun, end.nextSibling);
  else p.appendChild(refRun);

  comments.push({ id: cid, text });
}

function attachCommentToWholeParagraph(doc, p, text, comments) {
  const cid = nextCommentId++;
  const start = el(doc, "w:commentRangeStart");
  attr(start, "w:id", cid);
  const end = el(doc, "w:commentRangeEnd");
  attr(end, "w:id", cid);
  const refRun = el(doc, "w:r");
  const ref = el(doc, "w:commentReference");
  attr(ref, "w:id", cid);
  refRun.appendChild(ref);

  p.insertBefore(start, p.firstChild);
  p.appendChild(end);
  p.appendChild(refRun);

  comments.push({ id: cid, text });
}

export function applyInstruction(doc, body, ins) {
  const { kind, locator, annotation } = ins;
  const annotationText = annotation?.text ?? "";
  const comments = [];

  try {
    if (kind === "replace" && locator.tableCell) {
      const tbl = findTable(body);
      const row = findRowContaining(tbl, locator.tableCell.rowContains);
      if (!row) return { status: "locator_not_found", comments };
      const colIdx = columnIndex(tbl, locator.tableCell.columnHeader);
      const cell = cellsOf(row)[colIdx];
      const p = firstParaOf(cell);
      if (!textOf(p).includes(locator.quote)) return { status: "locator_text_mismatch", comments };
      applyMinimalReplace(doc, p, locator.quote, ins.replacementText, annotationText, comments);
      return { status: "applied", comments };
    }
    if (kind === "replace") {
      const p = findParagraphByQuote(body, locator.quote);
      if (!p) return { status: "locator_not_found", comments };
      applyMinimalReplace(doc, p, locator.quote, ins.replacementText, annotationText, comments);
      return { status: "applied", comments };
    }
    if (kind === "insert") {
      const anchor = findParagraphByQuote(body, locator.afterParagraphContaining);
      if (!anchor) return { status: "locator_not_found", comments };
      const lines = ins.insertText.split("\n");
      const newP = el(doc, "w:p");
      const run = plainRun(doc, lines.join(" "));
      const insWrapper = wrapAsIns(doc, run);
      newP.appendChild(insWrapper);
      markParagraphMarkIns(doc, newP);
      if (anchor.nextSibling) body.insertBefore(newP, anchor.nextSibling);
      else body.appendChild(newP);
      if (annotationText) attachCommentAround(doc, newP, insWrapper, annotationText, comments);
      return { status: "applied", comments };
    }
    if (kind === "delete" && locator.tableRowContains) {
      const tbl = findTable(body);
      const row = findRowContaining(tbl, locator.tableRowContains);
      if (!row) return { status: "locator_not_found", comments };
      markRowDeleted(doc, row);
      if (annotationText) {
        const firstCell = cellsOf(row)[0];
        attachCommentToWholeParagraph(doc, firstParaOf(firstCell), annotationText, comments);
      }
      return { status: "applied", comments };
    }
    if (kind === "delete") {
      const p = findParagraphByQuote(body, locator.quote);
      if (!p) return { status: "locator_not_found", comments };
      markParagraphDeleted(doc, p);
      if (annotationText) attachCommentToWholeParagraph(doc, p, annotationText, comments);
      return { status: "applied", comments };
    }
    if (kind === "comment-only") {
      const p = findParagraphByQuote(body, locator.quote);
      if (!p) return { status: "locator_not_found", comments };
      attachCommentToWholeParagraph(doc, p, annotationText, comments);
      return { status: "applied", comments };
    }
    return { status: "unknown_kind", comments };
  } catch (e) {
    return { status: `error: ${e}`, comments };
  }
}

export function parseDocument(xmlText) {
  return new DOMParser().parseFromString(xmlText, "text/xml");
}

export function serializeDocument(doc) {
  return new XMLSerializer().serializeToString(doc);
}

export function getBody(doc) {
  return doc.getElementsByTagNameNS(W, "body")[0];
}

export const NS = { W };
