import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strToU8 } from 'fflate';
import { DOMParser } from '@xmldom/xmldom';
import type { Element } from '@xmldom/xmldom';
import { applyRevisionInstructionSet } from './apply-revision-instruction-set.js';
import { loadDocx, getText, saveDocx, type DocxFiles } from './docx-zip.js';
import { SAMPLE_INSTRUCTION_SET } from './test-fixtures/instruction-set.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', 'test', 'fixtures');
const FIXED_NOW = new Date('2026-07-09T00:00:00.000Z');

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CT_NS = 'http://schemas.openxmlformats.org/package/2006/content-types';
const COMMENTS_REL_TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments';

function parse(xml: string) {
  return new DOMParser().parseFromString(xml, 'text/xml');
}
function partNames(files: DocxFiles): string[] {
  return Object.keys(files).sort();
}
function tagCount(xml: string, local: string): number {
  return parse(xml).getElementsByTagNameNS(W, local).length;
}
function overridePartNames(files: DocxFiles): string[] {
  return Array.from(parse(getText(files, '[Content_Types].xml')).getElementsByTagNameNS(CT_NS, 'Override'))
    .map((o) => (o as Element).getAttribute('PartName') ?? '')
    .sort();
}
function relationships(files: DocxFiles): { id: string; type: string; target: string }[] {
  return Array.from(
    parse(getText(files, 'word/_rels/document.xml.rels')).getElementsByTagNameNS(REL_NS, 'Relationship'),
  ).map((r) => ({
    id: (r as Element).getAttribute('Id') ?? '',
    type: ((r as Element).getAttribute('Type') ?? '').split('/').pop() ?? '',
    target: (r as Element).getAttribute('Target') ?? '',
  }));
}
function commentsRelCount(files: DocxFiles): number {
  return relationships(files).filter(
    (r) => `${'http://schemas.openxmlformats.org/officeDocument/2006/relationships/'}${r.type}` === COMMENTS_REL_TYPE,
  ).length;
}
function commentIds(files: DocxFiles): number[] {
  if (!files['word/comments.xml']) return [];
  return Array.from(parse(getText(files, 'word/comments.xml')).getElementsByTagNameNS(W, 'comment')).map((c) =>
    Number((c as Element).getAttributeNS(W, 'id')),
  );
}

function documentStructure(files: DocxFiles): Record<string, number> {
  const xml = getText(files, 'word/document.xml');
  return {
    'w:r': tagCount(xml, 'r'),
    'w:ins': tagCount(xml, 'ins'),
    'w:del': tagCount(xml, 'del'),
    'w:commentRangeStart': tagCount(xml, 'commentRangeStart'),
    'w:commentReference': tagCount(xml, 'commentReference'),
  };
}

interface Scenario {
  title: string;
  note: string;
  before: DocxFiles;
  after: DocxFiles;
}

function renderScenario(s: Scenario): string {
  const pb = partNames(s.before);
  const pa = partNames(s.after);
  const added = pa.filter((p) => !pb.includes(p));
  const removed = pb.filter((p) => !pa.includes(p));

  const ovBefore = overridePartNames(s.before);
  const ovAfter = overridePartNames(s.after);
  const ovAdded = ovAfter.filter((o) => !ovBefore.includes(o));

  const relBefore = relationships(s.before);
  const relAfter = relationships(s.after);
  const relAdded = relAfter.filter((r) => !relBefore.some((b) => b.id === r.id && b.target === r.target));

  const structBefore = documentStructure(s.before);
  const structAfter = documentStructure(s.after);

  const lines: string[] = [];
  lines.push(`## ${s.title}`);
  lines.push('');
  lines.push(s.note);
  lines.push('');
  lines.push('### ZIP 部件差异');
  lines.push(`- 新增：${added.length ? added.join('、') : '（无）'}`);
  lines.push(`- 移除：${removed.length ? removed.join('、') : '（无）'}`);
  lines.push(`- 部件总数：${pb.length} → ${pa.length}`);
  lines.push('');
  lines.push('### [Content_Types].xml Override 差异');
  lines.push(`- 新增 Override：${ovAdded.length ? ovAdded.join('、') : '（无）'}`);
  lines.push(`- comments Override 出现次数（幂等应为 ≤1）：${ovAfter.filter((o) => o === '/word/comments.xml').length}`);
  lines.push('');
  lines.push('### word/_rels/document.xml.rels 差异');
  lines.push(`- 新增 Relationship：${relAdded.length ? relAdded.map((r) => `${r.id}→${r.target}(${r.type})`).join('、') : '（无）'}`);
  lines.push(`- comments 关系出现次数（幂等应为 ≤1）：${commentsRelCount(s.after)}`);
  lines.push('');
  lines.push('### word/document.xml 结构计数（前 → 后）');
  for (const key of Object.keys(structAfter)) {
    lines.push(`- ${key}：${structBefore[key]} → ${structAfter[key]}`);
  }
  lines.push('');
  lines.push('### word/comments.xml');
  lines.push(`- 既有批注 id：${JSON.stringify(commentIds(s.before))}`);
  lines.push(`- 输出批注 id：${JSON.stringify(commentIds(s.after))}`);
  lines.push('');
  return lines.join('\n');
}

/** 合成一份带既有批注设施的 docx，用于演示 item 3/4 的保存前后保全/幂等。 */
function docWithExistingComment(): Buffer {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body><w:p><w:commentRangeStart w:id="4"/><w:r><w:t>既有批注锚点</w:t></w:r><w:commentRangeEnd w:id="4"/><w:r><w:commentReference w:id="4"/></w:r></w:p><w:p><w:r><w:t>质保期为壹年。</w:t></w:r></w:p></w:body></w:document>`;
  const files: DocxFiles = {
    '[Content_Types].xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${CT_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/></Types>`,
    ),
    '_rels/.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL_NS}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    ),
    'word/document.xml': strToU8(documentXml),
    'word/_rels/document.xml.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL_NS}"><Relationship Id="rId2" Type="${COMMENTS_REL_TYPE}" Target="comments.xml"/></Relationships>`,
    ),
    'word/comments.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments xmlns:w="${W}"><w:comment w:id="4" w:author="原承办律师" w:date="2026-01-01T00:00:00Z"><w:p><w:r><w:t>既有批注正文</w:t></w:r></w:p></w:comment></w:comments>`,
    ),
  };
  return saveDocx(files);
}

describe('OOXML 保存前后 part/rel diff 留证（OUTPUT-CORRECTNESS-1 #7）', () => {
  it('generates and pins the golden-scenario part/rel diff evidence', async () => {
    const cleanBefore = loadDocx(readFileSync(join(FIXTURES_DIR, 'original.docx')));
    const cleanAfter = loadDocx(
      applyRevisionInstructionSet(readFileSync(join(FIXTURES_DIR, 'original.docx')), SAMPLE_INSTRUCTION_SET, {
        now: FIXED_NOW,
      }).docx,
    );

    const withCommentsBefore = loadDocx(docWithExistingComment());
    const withCommentsAfter = loadDocx(
      applyRevisionInstructionSet(docWithExistingComment(), {
        id: 'ris-diff-2',
        caseId: 'case-diff-2',
        targetDocument: { fileId: 'f-diff-2' },
        instructions: [
          {
            id: 'i1',
            kind: 'replace',
            locator: { strategy: 'text', quote: '壹年' },
            text: '贰年',
            annotation: { text: '质保期建议延长至两年。', citations: [] },
          },
        ],
      }, { now: FIXED_NOW }).docx,
    );

    const report =
      '# OUTPUT-CORRECTNESS-1 · OOXML 保存前后 part/rel 结构差异\n' +
      '\n' +
      '本文件由 `src/ooxml-diff.test.ts` 自动生成（`vitest -u` 刷新），是 verification-checklist.md\n' +
      '「结构差异」行里程序化可得的部分：保存前（输入 docx）与保存后（Courtwork 著录输出）的\n' +
      'ZIP 部件、[Content_Types].xml、document.xml.rels、document/comments 结构差异。docx zip 字节\n' +
      '（时间戳/压缩细节）非本层契约，故此处只比对部件内容级差异，不记 zip 级 SHA。Word/WPS 真机\n' +
      '打开—轻改—保存—回读的字节/SHA 记录仍按 verification-checklist.md 由人工另行留档。\n' +
      '\n' +
      renderScenario({
        title: '场景一：干净合同 + SAMPLE_INSTRUCTION_SET（十条指令，全部应用）',
        note: '演示 #2（未触碰 run 不被改写）、#3/#4（首次新增 comments part/关系/override）。',
        before: cleanBefore,
        after: cleanAfter,
      }) +
      '\n' +
      renderScenario({
        title: '场景二：已含一条既有批注（id=4）+ 一条带批注的 replace',
        note: '演示 #3/#4（既有批注/id/range 保全，关系与 override 幂等不重复，新批注 id 避让既有）。',
        before: withCommentsBefore,
        after: withCommentsAfter,
      });

    await expect(report).toMatchFileSnapshot('../test/manual-verification/ooxml-part-rel-diff.md');

    // 结构不变量（即使快照被误刷也守住）：
    // 场景一：新增 comments 部件、单一关系、单一 override，document 获得修订/批注节点。
    expect(partNames(cleanAfter)).toContain('word/comments.xml');
    expect(commentsRelCount(cleanAfter)).toBe(1);
    expect(overridePartNames(cleanAfter).filter((o) => o === '/word/comments.xml')).toHaveLength(1);
    expect(documentStructure(cleanAfter)['w:commentReference']).toBeGreaterThan(0);

    // 场景二：既有 id=4 保全、关系/override 仍唯一、新批注 id 避让既有。
    expect(commentIds(withCommentsAfter)).toContain(4);
    expect(commentsRelCount(withCommentsAfter)).toBe(1);
    expect(overridePartNames(withCommentsAfter).filter((o) => o === '/word/comments.xml')).toHaveLength(1);
    expect(commentIds(withCommentsAfter).filter((id) => id !== 4).every((id) => id > 4)).toBe(true);
  });
});
