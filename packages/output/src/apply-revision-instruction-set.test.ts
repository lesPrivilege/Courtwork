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

function assertEveryRunHasCompleteRFonts(xml: string, partName: string): void {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const runs = Array.from(doc.getElementsByTagNameNS(W, 'r'));
  expect(runs.length).toBeGreaterThan(0);

  for (const [index, run] of runs.entries()) {
    const rPr = Array.from(run.childNodes).find((c) => c.nodeType === 1 && (c as Element).localName === 'rPr') as
      | Element
      | undefined;
    expect(rPr, `${partName} run #${index} missing rPr entirely: ${run.toString()}`).toBeDefined();
    const rFonts = Array.from(rPr!.childNodes).find(
      (c) => c.nodeType === 1 && (c as Element).localName === 'rFonts',
    ) as Element | undefined;
    expect(rFonts, `${partName} run #${index} missing w:rFonts: ${run.toString()}`).toBeDefined();
    expect(rFonts!.getAttributeNS(W, 'ascii'), `${partName} run #${index} missing w:ascii`).toBeTruthy();
    expect(rFonts!.getAttributeNS(W, 'eastAsia'), `${partName} run #${index} missing w:eastAsia`).toBeTruthy();
    expect(rFonts!.getAttributeNS(W, 'hAnsi'), `${partName} run #${index} missing w:hAnsi`).toBeTruthy();
    expect(rFonts!.getAttributeNS(W, 'cs'), `${partName} run #${index} missing w:cs`).toBeTruthy();
  }
}

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

  it('marks every output <w:r> run with explicit rFonts (ascii/eastAsia/hAnsi/cs), never leaves font unspecified', () => {
    const original = readFileSync(join(FIXTURES_DIR, 'original.docx'));
    const { docx } = applyRevisionInstructionSet(original, SAMPLE_INSTRUCTION_SET, { now: FIXED_NOW });
    const files = loadDocx(docx);
    assertEveryRunHasCompleteRFonts(getText(files, 'word/document.xml'), 'document.xml');
    assertEveryRunHasCompleteRFonts(getText(files, 'word/comments.xml'), 'comments.xml');
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

  it('golden snapshot: document.xml matches the committed reference byte-for-byte', async () => {
    const original = readFileSync(join(FIXTURES_DIR, 'original.docx'));
    const { docx } = applyRevisionInstructionSet(original, SAMPLE_INSTRUCTION_SET, { now: FIXED_NOW });
    const files = loadDocx(docx);
    await expect(getText(files, 'word/document.xml')).toMatchFileSnapshot('./__snapshots__/golden-document.xml');
  });

  it('golden snapshot: comments.xml matches the committed reference byte-for-byte', async () => {
    const original = readFileSync(join(FIXTURES_DIR, 'original.docx'));
    const { docx } = applyRevisionInstructionSet(original, SAMPLE_INSTRUCTION_SET, { now: FIXED_NOW });
    const files = loadDocx(docx);
    await expect(getText(files, 'word/comments.xml')).toMatchFileSnapshot('./__snapshots__/golden-comments.xml');
  });
});
