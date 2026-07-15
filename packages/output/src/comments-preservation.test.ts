import { describe, expect, it } from 'vitest';
import { strToU8 } from 'fflate';
import { DOMParser } from '@xmldom/xmldom';
import type { Element } from '@xmldom/xmldom';
import type { RevisionInstructionSet } from '@courtwork/schemas';
import { applyRevisionInstructionSet } from './apply-revision-instruction-set.js';
import { saveDocx, loadDocx, getText, type DocxFiles } from './docx-zip.js';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CT_NS = 'http://schemas.openxmlformats.org/package/2006/content-types';
const COMMENTS_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments';
const FIXED_NOW = new Date('2026-07-15T00:00:00.000Z');

interface ExistingComment {
  id: number;
  text: string;
}

/**
 * 合成一份带（可选）既有批注设施的 docx：既有 comments.xml + document.xml 内的 range/reference +
 * document.xml.rels 的 comments 关系 + [Content_Types].xml 的 comments override。withInfra=false 时
 * 产出一份干净、无任何批注设施的 docx。
 */
function buildDocx(options: {
  existingComments?: ExistingComment[];
  editableParagraphs: string[];
  withInfra?: boolean;
}): Buffer {
  const existing = options.existingComments ?? [];
  const withInfra = options.withInfra ?? existing.length > 0;

  const rangeParagraphs = existing
    .map(
      (c) =>
        `<w:p><w:commentRangeStart w:id="${c.id}"/><w:r><w:t>既有批注锚点${c.id}</w:t></w:r><w:commentRangeEnd w:id="${c.id}"/><w:r><w:commentReference w:id="${c.id}"/></w:r></w:p>`,
    )
    .join('');
  const editable = options.editableParagraphs.map((t) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`).join('');
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>${rangeParagraphs}${editable}</w:body></w:document>`;

  const files: DocxFiles = {
    '[Content_Types].xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${CT_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>${
        withInfra
          ? '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>'
          : ''
      }</Types>`,
    ),
    '_rels/.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    ),
    'word/document.xml': strToU8(documentXml),
    'word/_rels/document.xml.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${
        withInfra
          ? `<Relationship Id="rId2" Type="${COMMENTS_REL_TYPE}" Target="comments.xml"/>`
          : ''
      }</Relationships>`,
    ),
  };
  if (withInfra) {
    files['word/comments.xml'] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments xmlns:w="${W}">${existing
        .map(
          (c) =>
            `<w:comment w:id="${c.id}" w:author="原承办律师" w:date="2026-01-01T00:00:00Z" w:initials="LS"><w:p><w:r><w:t>${c.text}</w:t></w:r></w:p></w:comment>`,
        )
        .join('')}</w:comments>`,
    );
  }
  return saveDocx(files);
}

function parse(xml: string) {
  return new DOMParser().parseFromString(xml, 'text/xml');
}
function commentIds(commentsXml: string): number[] {
  return Array.from(parse(commentsXml).getElementsByTagNameNS(W, 'comment')).map((c) =>
    Number((c as Element).getAttributeNS(W, 'id')),
  );
}
function commentTextsOf(commentsXml: string): string[] {
  return Array.from(parse(commentsXml).getElementsByTagNameNS(W, 'comment')).map((c) =>
    Array.from((c as Element).getElementsByTagNameNS(W, 't'))
      .map((t) => t.textContent ?? '')
      .join(''),
  );
}
function commentReferenceIds(documentXml: string): number[] {
  return Array.from(parse(documentXml).getElementsByTagNameNS(W, 'commentReference')).map((r) =>
    Number((r as Element).getAttributeNS(W, 'id')),
  );
}
function commentsRelCount(files: DocxFiles): number {
  return Array.from(parse(getText(files, 'word/_rels/document.xml.rels')).getElementsByTagNameNS(REL_NS, 'Relationship')).filter(
    (r) => (r as Element).getAttribute('Type') === COMMENTS_REL_TYPE,
  ).length;
}
function commentsOverrideCount(files: DocxFiles): number {
  return Array.from(parse(getText(files, '[Content_Types].xml')).getElementsByTagNameNS(CT_NS, 'Override')).filter(
    (o) => (o as Element).getAttribute('PartName') === '/word/comments.xml',
  ).length;
}

const commentOnly = (id: string, quote: string, text: string): RevisionInstructionSet['instructions'][number] => ({
  id,
  kind: 'commentOnly',
  locator: { strategy: 'text', quote },
  annotation: { text, citations: [] },
});

describe('comments/relationships/content-types preservation (OUTPUT-CORRECTNESS-1 #3)', () => {
  it('does not overwrite existing comments, comment ids, or their ranges', () => {
    const original = buildDocx({
      existingComments: [{ id: 5, text: '原承办律师的既有批注，不得丢失' }],
      editableParagraphs: ['本合同违约金为百分之十。'],
    });
    const set: RevisionInstructionSet = {
      id: 'ris-3a',
      caseId: 'case-3a',
      targetDocument: { fileId: 'f-3a' },
      instructions: [commentOnly('c1', '违约金为百分之十', '建议上调违约金比例。')],
    };
    const { docx } = applyRevisionInstructionSet(original, set, { now: FIXED_NOW });
    const files = loadDocx(docx);
    const commentsXml = getText(files, 'word/comments.xml');

    // 既有批注正文与 id 保全。
    expect(commentTextsOf(commentsXml)).toContain('原承办律师的既有批注，不得丢失');
    expect(commentIds(commentsXml)).toContain(5);
    // 既有 range（commentReference id=5）仍在 document.xml。
    expect(commentReferenceIds(getText(files, 'word/document.xml'))).toContain(5);
    // 新批注被追加，且 id 不与既有 5 冲突。
    expect(commentTextsOf(commentsXml)).toContain('建议上调违约金比例。');
    const newIds = commentIds(commentsXml).filter((id) => id !== 5);
    expect(newIds.length).toBeGreaterThan(0);
    for (const id of newIds) expect(id).toBeGreaterThan(5);
  });

  it('allocates new comment ids above the max existing id even for low/zero existing ids (no collision)', () => {
    const original = buildDocx({
      existingComments: [{ id: 0, text: '既有批注 id=0' }],
      editableParagraphs: ['交付期限三十日。'],
    });
    const set: RevisionInstructionSet = {
      id: 'ris-3b',
      caseId: 'case-3b',
      targetDocument: { fileId: 'f-3b' },
      instructions: [commentOnly('c1', '交付期限三十日', '交付期限建议延长。')],
    };
    const { docx } = applyRevisionInstructionSet(original, set, { now: FIXED_NOW });
    const ids = commentIds(getText(loadDocx(docx), 'word/comments.xml'));
    // 恰好每个 id 唯一（无重复），且既有 0 保留、新 id > 0。
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(0);
    expect(ids.filter((id) => id !== 0).every((id) => id > 0)).toBe(true);
  });
});

describe('comments/relationships/content-types idempotency (OUTPUT-CORRECTNESS-1 #4)', () => {
  it('re-applying the exact same instruction set keeps one rel/override and no dangling comment reference', () => {
    const clean = buildDocx({ editableParagraphs: ['重复应用锚点句。'], withInfra: false });
    const sameSet: RevisionInstructionSet = {
      id: 'ris-4-same',
      caseId: 'case-4-same',
      targetDocument: { fileId: 'f-4-same' },
      instructions: [commentOnly('c-same', '重复应用锚点句', '同一条批注。')],
    };
    const out1 = applyRevisionInstructionSet(clean, sameSet, { now: FIXED_NOW }).docx;
    const out2 = applyRevisionInstructionSet(out1, sameSet, { now: FIXED_NOW }).docx;
    const files = loadDocx(out2);

    expect(commentsRelCount(files)).toBe(1);
    expect(commentsOverrideCount(files)).toBe(1);
    const ids = commentIds(getText(files, 'word/comments.xml'));
    expect(new Set(ids).size).toBe(ids.length);
    const defined = new Set(ids);
    for (const ref of commentReferenceIds(getText(files, 'word/document.xml'))) {
      expect(defined.has(ref), `commentReference ${ref} 悬挂（无对应 comment）`).toBe(true);
    }
  });

  it('reuses the existing comments relationship and content-type override (no duplicates, no dangling refs)', () => {
    const original = buildDocx({
      existingComments: [{ id: 2, text: '既有批注二' }, { id: 7, text: '既有批注七' }],
      editableParagraphs: ['质保期壹年。'],
    });
    const set: RevisionInstructionSet = {
      id: 'ris-4a',
      caseId: 'case-4a',
      targetDocument: { fileId: 'f-4a' },
      instructions: [commentOnly('c1', '质保期壹年', '质保期建议延长至两年。')],
    };
    const { docx } = applyRevisionInstructionSet(original, set, { now: FIXED_NOW });
    const files = loadDocx(docx);

    expect(commentsRelCount(files)).toBe(1);
    expect(commentsOverrideCount(files)).toBe(1);

    // 非连续既有 id [2,7] → 新 id >= 8。
    const ids = commentIds(getText(files, 'word/comments.xml'));
    expect(ids).toEqual(expect.arrayContaining([2, 7]));
    expect(ids.filter((id) => id !== 2 && id !== 7).every((id) => id >= 8)).toBe(true);

    // 无悬挂：document.xml 里每个 commentReference id 都能在 comments.xml 找到对应 comment。
    const refIds = new Set(commentReferenceIds(getText(files, 'word/document.xml')));
    const defined = new Set(ids);
    for (const ref of refIds) expect(defined.has(ref), `commentReference ${ref} 悬挂（无对应 comment）`).toBe(true);
  });

  it('re-applying comments to a doc that already has comments infra stays idempotent (single rel/override)', () => {
    const clean = buildDocx({ editableParagraphs: ['第一处锚点句。', '第二处锚点句。'], withInfra: false });
    const first: RevisionInstructionSet = {
      id: 'ris-4b-1',
      caseId: 'case-4b',
      targetDocument: { fileId: 'f-4b' },
      instructions: [commentOnly('c1', '第一处锚点句', '第一条批注。')],
    };
    const out1 = applyRevisionInstructionSet(clean, first, { now: FIXED_NOW }).docx;

    const second: RevisionInstructionSet = {
      id: 'ris-4b-2',
      caseId: 'case-4b',
      targetDocument: { fileId: 'f-4b' },
      instructions: [commentOnly('c2', '第二处锚点句', '第二条批注。')],
    };
    const out2 = applyRevisionInstructionSet(out1, second, { now: FIXED_NOW }).docx;
    const files = loadDocx(out2);

    // 第一遍已建立 comments 设施，第二遍必须复用，不得再造一份关系/override。
    expect(commentsRelCount(files)).toBe(1);
    expect(commentsOverrideCount(files)).toBe(1);
    const texts = commentTextsOf(getText(files, 'word/comments.xml'));
    expect(texts).toContain('第一条批注。');
    expect(texts).toContain('第二条批注。');
    // 两遍的 comment id 不重复。
    const ids = commentIds(getText(files, 'word/comments.xml'));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
