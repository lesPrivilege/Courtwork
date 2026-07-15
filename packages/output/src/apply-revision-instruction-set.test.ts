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

function childElement(node: Element, localName: string): Element | undefined {
  return Array.from(node.childNodes).find(
    (c) => c.nodeType === 1 && (c as Element).localName === localName,
  ) as Element | undefined;
}

function assertRunsHaveCompleteRFonts(runs: Element[], partName: string): void {
  expect(runs.length, `${partName} has no runs to check`).toBeGreaterThan(0);
  for (const [index, run] of runs.entries()) {
    const rPr = childElement(run, 'rPr');
    expect(rPr, `${partName} run #${index} missing rPr entirely: ${run.toString()}`).toBeDefined();
    const rFonts = childElement(rPr!, 'rFonts');
    expect(rFonts, `${partName} run #${index} missing w:rFonts: ${run.toString()}`).toBeDefined();
    expect(rFonts!.getAttributeNS(W, 'ascii'), `${partName} run #${index} missing w:ascii`).toBeTruthy();
    expect(rFonts!.getAttributeNS(W, 'eastAsia'), `${partName} run #${index} missing w:eastAsia`).toBeTruthy();
    expect(rFonts!.getAttributeNS(W, 'hAnsi'), `${partName} run #${index} missing w:hAnsi`).toBeTruthy();
    expect(rFonts!.getAttributeNS(W, 'cs'), `${partName} run #${index} missing w:cs`).toBeTruthy();
  }
}

/** 管线新写入/触碰的 run：w:ins 内层、w:del 内层、承载 w:commentReference 的 run。 */
function pipelineWrittenRuns(xml: string): Element[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  return Array.from(doc.getElementsByTagNameNS(W, 'r')).filter((r) => {
    const parentLocal = (r.parentNode as Element | null)?.localName;
    if (parentLocal === 'ins' || parentLocal === 'del') return true;
    return r.getElementsByTagNameNS(W, 'commentReference').length > 0;
  });
}

function runContaining(xml: string, needle: string): Element {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const hit = Array.from(doc.getElementsByTagNameNS(W, 'r')).find((r) =>
    Array.from(r.getElementsByTagNameNS(W, 't')).some((t) => (t.textContent ?? '').includes(needle)),
  );
  if (!hit) throw new Error(`no run containing ${needle}`);
  return hit;
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

  it('gives every pipeline-written run complete rFonts, but leaves untouched original runs byte-identical (OUTPUT-CORRECTNESS-1 #2)', () => {
    const original = readFileSync(join(FIXTURES_DIR, 'original.docx'));
    const { docx } = applyRevisionInstructionSet(original, SAMPLE_INSTRUCTION_SET, { now: FIXED_NOW });
    const files = loadDocx(docx);
    const documentXml = getText(files, 'word/document.xml');

    // 新写入的修订/批注引用 run，以及全部批注正文 run，必须写全 rFonts。
    assertRunsHaveCompleteRFonts(pipelineWrittenRuns(documentXml), 'document.xml written runs');
    const commentsDoc = new DOMParser().parseFromString(getText(files, 'word/comments.xml'), 'text/xml');
    assertRunsHaveCompleteRFonts(Array.from(commentsDoc.getElementsByTagNameNS(W, 'r')), 'comments.xml');

    // 未被任何指令触碰的原文 run 必须原样保留：标题 run 保留 <w:b/><w:sz val=32> 且不被注入 rFonts；
    // 无 rPr 的普通原文 run 不得被补写 rPr——管线不动它没编辑到的内容的字体。
    const title = runContaining(documentXml, '买卖合同');
    const titleRPr = childElement(title, 'rPr');
    expect(titleRPr, 'title run lost its rPr').toBeDefined();
    expect(childElement(titleRPr!, 'b'), 'title bold lost').toBeDefined();
    expect(childElement(titleRPr!, 'sz'), 'title size lost').toBeDefined();
    expect(childElement(titleRPr!, 'rFonts'), '未触碰的标题 run 被注入了 rFonts').toBeUndefined();

    const untouchedPlain = runContaining(documentXml, '恒源贸易有限公司');
    expect(childElement(untouchedPlain, 'rPr'), '未触碰的纯 run 被补写了 rPr').toBeUndefined();
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
