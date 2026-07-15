import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Element } from '@xmldom/xmldom';
import { getText, setText, type DocxFiles } from './docx-zip.js';
import type { CommentDraft } from './apply-instructions.js';
import { BODY_EAST_ASIA_FONT, LATIN_FONT } from './fonts.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CT_NS = 'http://schemas.openxmlformats.org/package/2006/content-types';
const COMMENTS_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments';
const COMMENTS_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml';
const COMMENTS_PART = 'word/comments.xml';
const COMMENTS_PART_NAME = '/word/comments.xml';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseXml(text: string) {
  return new DOMParser().parseFromString(text, 'text/xml');
}

/**
 * 输入文档既有批注的最大 id + 1（无既有 comments.xml 时为 0）。上层据此为新批注分配 id，
 * 避免覆盖或与既有 comment id / range 冲突。
 */
export function nextCommentId(files: DocxFiles): number {
  if (!files[COMMENTS_PART]) return 0;
  const ids = Array.from(parseXml(getText(files, COMMENTS_PART)).getElementsByTagNameNS(W, 'comment'))
    .map((c) => Number((c as Element).getAttributeNS(W, 'id')))
    .filter((n) => Number.isFinite(n));
  return ids.length > 0 ? Math.max(...ids) + 1 : 0;
}

function normalizeTarget(target: string | null): string {
  return (target ?? '').replace(/^\.*\//, '').replace(/^word\//, '');
}

/**
 * 把新批注写入 comments.xml，并保证 relationship / content-type override 幂等：
 * - 既有 comments.xml 的 <w:comment>（含 id、range 对应关系）逐一保留，新批注追加在后；
 * - 已存在 comments 关系时复用，不再新增（否则同一 Target 出现重复关系）；
 * - 已存在 comments override 时复用，不再新增（每个 PartName 只应有一个 Override）。
 * 新批注的序列化格式保持与历史 golden 一致（无既有批注时输出逐字不变）。
 */
export function writeCommentsPart(files: DocxFiles, comments: CommentDraft[], dateIso: string): void {
  const commentRunPr = `<w:rPr><w:rFonts w:ascii="${LATIN_FONT}" w:eastAsia="${BODY_EAST_ASIA_FONT}" w:hAnsi="${LATIN_FONT}" w:cs="${LATIN_FONT}"/></w:rPr>`;
  const newBody = comments
    .map(
      (c) =>
        `<w:comment w:id="${c.id}" w:author="Courtwork" w:date="${dateIso}" w:initials="CW"><w:p><w:r>${commentRunPr}<w:t>${escapeXml(c.text)}</w:t></w:r></w:p></w:comment>`,
    )
    .join('');

  // 既有批注逐一保留：解析既有 comments.xml，序列化其中每个 <w:comment> 再前置。
  let existingBody = '';
  if (files[COMMENTS_PART]) {
    const existingDoc = parseXml(getText(files, COMMENTS_PART));
    const serializer = new XMLSerializer();
    existingBody = Array.from(existingDoc.getElementsByTagNameNS(W, 'comment'))
      .map((c) => serializer.serializeToString(c))
      .join('');
  }

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments xmlns:w="${W}">${existingBody}${newBody}</w:comments>`;
  setText(files, COMMENTS_PART, xml);

  const relsPath = 'word/_rels/document.xml.rels';
  const relsDoc = parseXml(getText(files, relsPath));
  const relationships = Array.from(relsDoc.getElementsByTagNameNS(REL_NS, 'Relationship'));
  const hasCommentsRel = relationships.some(
    (r) =>
      (r as Element).getAttribute('Type') === COMMENTS_REL_TYPE ||
      normalizeTarget((r as Element).getAttribute('Target')) === 'comments.xml',
  );
  if (!hasCommentsRel) {
    const existingIds = relationships
      .map((r) => parseInt(((r as Element).getAttribute('Id') ?? '').replace(/\D/g, ''), 10))
      .filter((n) => !Number.isNaN(n));
    const newRid = `rId${existingIds.length ? Math.max(...existingIds) + 1 : 1000}`;
    const rel = relsDoc.createElementNS(REL_NS, 'Relationship');
    rel.setAttribute('Id', newRid);
    rel.setAttribute('Type', COMMENTS_REL_TYPE);
    rel.setAttribute('Target', 'comments.xml');
    relsDoc.documentElement!.appendChild(rel);
    setText(files, relsPath, new XMLSerializer().serializeToString(relsDoc));
  }

  const ctPath = '[Content_Types].xml';
  const ctDoc = parseXml(getText(files, ctPath));
  const hasOverride = Array.from(ctDoc.getElementsByTagNameNS(CT_NS, 'Override')).some(
    (o) => (o as Element).getAttribute('PartName') === COMMENTS_PART_NAME,
  );
  if (!hasOverride) {
    const override = ctDoc.createElementNS(CT_NS, 'Override');
    override.setAttribute('PartName', COMMENTS_PART_NAME);
    override.setAttribute('ContentType', COMMENTS_CONTENT_TYPE);
    ctDoc.documentElement!.appendChild(override);
    setText(files, ctPath, new XMLSerializer().serializeToString(ctDoc));
  }
}
