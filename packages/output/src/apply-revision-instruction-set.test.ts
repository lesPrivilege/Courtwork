import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOMParser } from '@xmldom/xmldom';
import type { Element } from '@xmldom/xmldom';
import { RevisionInstructionSetSchema } from '@courtwork/schemas';
import { applyRevisionInstructionSet } from './apply-revision-instruction-set.js';
import { loadDocx, getText } from './docx-zip.js';
import { W } from './apply-instructions.js';
import { SAMPLE_INSTRUCTION_SET } from './test-fixtures/instruction-set.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, '..', 'test', 'fixtures');
const FIXED_NOW = new Date('2026-07-09T00:00:00.000Z');

describe('applyRevisionInstructionSet', () => {
  it('the fixture itself conforms to RevisionInstructionSetSchema', () => {
    const result = RevisionInstructionSetSchema.safeParse(SAMPLE_INSTRUCTION_SET);
    expect(result.success).toBe(true);
  });

  it('applies all 10 instructions successfully against a clean document', () => {
    const original = readFileSync(join(FIXTURES_DIR, 'original.docx'));
    const { outcomes } = applyRevisionInstructionSet(original, SAMPLE_INSTRUCTION_SET, { now: FIXED_NOW });
    expect(outcomes).toHaveLength(10);
    for (const outcome of outcomes) {
      expect(outcome.status, `instruction ${outcome.id}`).toBe('applied');
    }
  });

  it('produces a valid docx zip with comments.xml present and correctly linked', () => {
    const original = readFileSync(join(FIXTURES_DIR, 'original.docx'));
    const { docx } = applyRevisionInstructionSet(original, SAMPLE_INSTRUCTION_SET, { now: FIXED_NOW });
    const files = loadDocx(docx);

    expect(files['word/document.xml']).toBeDefined();
    expect(files['word/comments.xml']).toBeDefined();

    const rels = getText(files, 'word/_rels/document.xml.rels');
    expect(rels).toContain('comments.xml');

    const contentTypes = getText(files, '[Content_Types].xml');
    expect(contentTypes).toContain('wordprocessingml.comments+xml');
  });

  it('marks every authored <w:r> run with explicit rFonts (ascii/eastAsia/hAnsi), never leaves font unspecified', () => {
    const original = readFileSync(join(FIXTURES_DIR, 'original.docx'));
    const { docx } = applyRevisionInstructionSet(original, SAMPLE_INSTRUCTION_SET, { now: FIXED_NOW });
    const files = loadDocx(docx);
    const documentXml = getText(files, 'word/document.xml');
    const doc = new DOMParser().parseFromString(documentXml, 'text/xml');

    // 只检查管线新写入的 run（rPr 上带 w:ins/w:del 修订标记，或它就在一个 w:ins/w:del
    // 包裹内），不检查未改动的原始 run——SPEC 的字体硬性要求针对"管线写出的每个 run"。
    const runs = Array.from(doc.getElementsByTagNameNS(W, 'r'));
    const authoredRuns = runs.filter((r) => {
      const parentLn = r.parentNode && r.parentNode.nodeType === 1 ? (r.parentNode as Element).localName : null;
      return parentLn === 'ins' || parentLn === 'del';
    });
    expect(authoredRuns.length).toBeGreaterThan(0);

    for (const run of authoredRuns) {
      const rPr = Array.from(run.childNodes).find((c) => c.nodeType === 1 && (c as Element).localName === 'rPr') as
        | Element
        | undefined;
      expect(rPr, 'authored run missing rPr entirely').toBeDefined();
      const rFonts = Array.from(rPr!.childNodes).find(
        (c) => c.nodeType === 1 && (c as Element).localName === 'rFonts',
      ) as Element | undefined;
      expect(rFonts, 'authored run missing w:rFonts').toBeDefined();
      expect(rFonts!.getAttributeNS(W, 'ascii')).toBeTruthy();
      expect(rFonts!.getAttributeNS(W, 'eastAsia')).toBeTruthy();
      expect(rFonts!.getAttributeNS(W, 'hAnsi')).toBeTruthy();
    }
  });

  it('reports locator_not_found (and skips) rather than mis-inserting when the quote no longer exists', () => {
    const original = readFileSync(join(FIXTURES_DIR, 'original.docx'));
    const brokenInstructionSet = {
      ...SAMPLE_INSTRUCTION_SET,
      instructions: [
        {
          id: 'ins-broken',
          kind: 'replace' as const,
          locator: { strategy: 'text' as const, quote: '这段文字在样例合同里根本不存在，绝无可能命中任何段落内容啦啦啦' },
          text: '不会被用到',
        },
      ],
    };
    const { outcomes } = applyRevisionInstructionSet(original, brokenInstructionSet, { now: FIXED_NOW });
    expect(outcomes).toEqual([{ id: 'ins-broken', status: 'locator_not_found' }]);
  });

  it('golden snapshot: document.xml matches the committed reference byte-for-byte', () => {
    const original = readFileSync(join(FIXTURES_DIR, 'original.docx'));
    const { docx } = applyRevisionInstructionSet(original, SAMPLE_INSTRUCTION_SET, { now: FIXED_NOW });
    const files = loadDocx(docx);
    void expect(getText(files, 'word/document.xml')).toMatchFileSnapshot('./__snapshots__/golden-document.xml');
  });

  it('golden snapshot: comments.xml matches the committed reference byte-for-byte', () => {
    const original = readFileSync(join(FIXTURES_DIR, 'original.docx'));
    const { docx } = applyRevisionInstructionSet(original, SAMPLE_INSTRUCTION_SET, { now: FIXED_NOW });
    const files = loadDocx(docx);
    void expect(getText(files, 'word/comments.xml')).toMatchFileSnapshot('./__snapshots__/golden-comments.xml');
  });
});
