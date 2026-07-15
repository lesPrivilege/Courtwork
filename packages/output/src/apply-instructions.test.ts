import { describe, expect, it } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import type { Element } from '@xmldom/xmldom';
import type { RevisionInstructionSet } from '@courtwork/schemas';
import { applyInstructionsToDocumentXml, W } from './apply-instructions.js';

const W_NS = W;

function minimalDocumentXml(bodyInnerXml: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W_NS}"><w:body>${bodyInnerXml}</w:body></w:document>`;
}

function eastAsiaFontsIn(xml: string): string[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const fonts = Array.from(doc.getElementsByTagNameNS(W_NS, 'rFonts'));
  return fonts.map((f) => f.getAttributeNS(W_NS, 'eastAsia') ?? '');
}

function firstParagraph(xml: string): Element {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const p = doc.getElementsByTagNameNS(W_NS, 'p')[0];
  if (!p) throw new Error('no paragraph in output');
  return p;
}

function childByLocalName(node: Element, localName: string): Element | undefined {
  return Array.from(node.childNodes).find(
    (c) => c.nodeType === 1 && (c as Element).localName === localName,
  ) as Element | undefined;
}

const FIXED_NOW = new Date('2026-07-09T00:00:00.000Z');

describe('applyInstructionsToDocumentXml preserves paragraph properties on replace (OUTPUT-CORRECTNESS-1 #1)', () => {
  it('keeps the original w:pPr (numbering/style/page-break) when a replace rewrites the paragraph runs', () => {
    // 列表 + 样式 + 段前分页 的段落，replace 只改正文，不得把段落级属性随文字一起丢掉。
    const xml = minimalDocumentXml(
      `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="7"/></w:numPr><w:pageBreakBefore/></w:pPr><w:r><w:t>违约金为合同总价的百分之十。</w:t></w:r></w:p>`,
    );
    const instructionSet: RevisionInstructionSet = {
      id: 'ris-ppr',
      caseId: 'case-ppr',
      targetDocument: { fileId: 'f-ppr' },
      instructions: [
        {
          id: 'i1',
          kind: 'replace',
          locator: { strategy: 'text', quote: '百分之十' },
          text: '百分之十五',
        },
      ],
    };
    const { documentXml, outcomes } = applyInstructionsToDocumentXml(xml, instructionSet, FIXED_NOW);
    expect(outcomes[0]!.status).toBe('applied');

    const p = firstParagraph(documentXml);
    const pPr = childByLocalName(p, 'pPr');
    expect(pPr, 'replaced paragraph lost its w:pPr entirely').toBeDefined();
    // w:pPr 必须仍是段落首个子节点（OOXML 要求），且三项属性逐一保留。
    expect((p.firstChild as Element)?.localName).toBe('pPr');
    expect(childByLocalName(pPr!, 'pStyle')?.getAttributeNS(W_NS, 'val')).toBe('ListParagraph');
    expect(childByLocalName(pPr!, 'numPr'), 'w:numPr (编号) 丢失').toBeDefined();
    expect(childByLocalName(pPr!, 'pageBreakBefore'), 'w:pageBreakBefore (段前分页) 丢失').toBeDefined();
    // 内容仍完成替换：最小化 diff 把「百分之十→百分之十五」识别为纯插入「五」，
    // 拼接可见 w:t 文本应为替换后的整句。
    const visibleText = Array.from(new DOMParser().parseFromString(documentXml, 'text/xml').getElementsByTagNameNS(W_NS, 't'))
      .map((t) => t.textContent ?? '')
      .join('');
    expect(visibleText).toBe('违约金为合同总价的百分之十五。');
  });
});

function runByText(xml: string, needle: string): Element {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const runs = Array.from(doc.getElementsByTagNameNS(W_NS, 'r'));
  const hit = runs.find((r) =>
    Array.from(r.getElementsByTagNameNS(W_NS, 't')).some((t) => (t.textContent ?? '').includes(needle)),
  );
  if (!hit) throw new Error(`no run containing ${needle}`);
  return hit;
}

/** 管线新写入/触碰的 run：w:ins 内层 run、w:del 内层 run、承载 w:commentReference 的 run。 */
function pipelineWrittenRuns(xml: string): Element[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const runs = Array.from(doc.getElementsByTagNameNS(W_NS, 'r'));
  return runs.filter((r) => {
    const parentLocal = (r.parentNode as Element | null)?.localName;
    if (parentLocal === 'ins' || parentLocal === 'del') return true;
    return r.getElementsByTagNameNS(W_NS, 'commentReference').length > 0;
  });
}

function assertCompleteRFonts(run: Element, label: string): void {
  const rPr = childByLocalName(run, 'rPr');
  expect(rPr, `${label} missing rPr`).toBeDefined();
  const rFonts = childByLocalName(rPr!, 'rFonts');
  expect(rFonts, `${label} missing w:rFonts`).toBeDefined();
  for (const attr of ['ascii', 'eastAsia', 'hAnsi', 'cs']) {
    expect(rFonts!.getAttributeNS(W_NS, attr), `${label} missing w:${attr}`).toBeTruthy();
  }
}

describe('applyInstructionsToDocumentXml scopes font writes to touched runs (OUTPUT-CORRECTNESS-1 #2)', () => {
  const instructionSet: RevisionInstructionSet = {
    id: 'ris-font-scope',
    caseId: 'case-font-scope',
    targetDocument: { fileId: 'f-font' },
    instructions: [
      {
        id: 'i1',
        kind: 'replace',
        locator: { strategy: 'text', quote: '交付期限三十日', paragraphHint: '第三条 交付期限' },
        text: '交付期限四十五日',
        annotation: { text: '交付期限延长。', citations: [] },
      },
    ],
  };

  // 一段带私有字体+斜体（未被指令触碰），一段纯 run 无 rPr（未被触碰），一段是替换目标。
  const xml = minimalDocumentXml(
    `<w:p><w:r><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="楷体" w:hAnsi="Arial" w:cs="Arial"/><w:i/></w:rPr><w:t>合同抬头保留私有字体与斜体</w:t></w:r></w:p>` +
      `<w:p><w:r><w:t>本段无任何 run 属性，属于文档默认字体</w:t></w:r></w:p>` +
      `<w:p><w:r><w:t>交付期限三十日整。</w:t></w:r></w:p>`,
  );

  it('does not rewrite w:rFonts/rPr on a run the pipeline never touched (keeps 楷体 + 斜体)', () => {
    const { documentXml, outcomes } = applyInstructionsToDocumentXml(xml, instructionSet, FIXED_NOW);
    expect(outcomes[0]!.status).toBe('applied');

    const untouched = runByText(documentXml, '合同抬头保留私有字体与斜体');
    const rFonts = childByLocalName(childByLocalName(untouched, 'rPr')!, 'rFonts')!;
    expect(rFonts.getAttributeNS(W_NS, 'eastAsia')).toBe('楷体');
    expect(rFonts.getAttributeNS(W_NS, 'ascii')).toBe('Arial');
    // 未触碰 run 的 rPr 原样：斜体保留，且没有被注入仿宋/Times New Roman。
    expect(childByLocalName(childByLocalName(untouched, 'rPr')!, 'i'), '斜体属性被抹掉').toBeDefined();
    expect(rFonts.getAttributeNS(W_NS, 'eastAsia')).not.toBe('仿宋_GB2312');
  });

  it('does not synthesize an rPr/rFonts on an untouched plain run (no rFonts before → no rFonts after)', () => {
    const { documentXml } = applyInstructionsToDocumentXml(xml, instructionSet, FIXED_NOW);
    const plain = runByText(documentXml, '本段无任何 run 属性');
    expect(childByLocalName(plain, 'rPr'), '给未触碰的纯 run 补写了 rPr').toBeUndefined();
  });

  it('still gives every pipeline-written run (ins/del/commentReference) complete rFonts', () => {
    const { documentXml } = applyInstructionsToDocumentXml(xml, instructionSet, FIXED_NOW);
    const written = pipelineWrittenRuns(documentXml);
    expect(written.length).toBeGreaterThan(0);
    for (const [i, run] of written.entries()) {
      assertCompleteRFonts(run, `pipeline-written run #${i}`);
    }
  });
});

describe('applyInstructionsToDocumentXml threads paragraphHint into the locator (OUTPUT-CORRECTNESS-1 #5)', () => {
  const xml = minimalDocumentXml(
    `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>第六条 违约责任</w:t></w:r></w:p>` +
      `<w:p><w:r><w:t>应向守约方支付合同总价款百分之十的违约金。</w:t></w:r></w:p>` +
      `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>第九条 补充违约条款</w:t></w:r></w:p>` +
      `<w:p><w:r><w:t>迟延履行的，还应支付合同总价款百分之十的违约金。</w:t></w:r></w:p>`,
  );

  it('edits the paragraph named by paragraphHint, not the other verbatim occurrence', () => {
    const instructionSet: RevisionInstructionSet = {
      id: 'ris-hint',
      caseId: 'case-hint',
      targetDocument: { fileId: 'f-hint' },
      instructions: [
        {
          id: 'i1',
          kind: 'replace',
          locator: { strategy: 'text', quote: '百分之十的违约金', paragraphHint: '第九条 补充违约条款' },
          text: '百分之二十的违约金',
        },
      ],
    };
    const { documentXml, outcomes } = applyInstructionsToDocumentXml(xml, instructionSet, FIXED_NOW);
    expect(outcomes[0]!.status).toBe('applied');
    const doc = new DOMParser().parseFromString(documentXml, 'text/xml');
    const paras = Array.from(doc.getElementsByTagNameNS(W_NS, 'p'));
    const textOfPara = (p: Element) =>
      Array.from(p.getElementsByTagNameNS(W_NS, 't'))
        .map((t) => t.textContent ?? '')
        .join('');
    // 第六条那段（index 1）保持原样，第九条那段（index 3）被改写。
    expect(textOfPara(paras[1]!)).toBe('应向守约方支付合同总价款百分之十的违约金。');
    expect(textOfPara(paras[3]!)).toContain('百分之二十');
  });

  it('without a hint the same ambiguous quote is not applied (skips, does not mis-edit)', () => {
    const instructionSet: RevisionInstructionSet = {
      id: 'ris-hint-none',
      caseId: 'case-hint-none',
      targetDocument: { fileId: 'f-hint-none' },
      instructions: [
        {
          id: 'i1',
          kind: 'replace',
          locator: { strategy: 'text', quote: '百分之十的违约金' },
          text: '百分之二十的违约金',
        },
      ],
    };
    const { outcomes } = applyInstructionsToDocumentXml(xml, instructionSet, FIXED_NOW);
    expect(outcomes[0]!.status).toBe('locator_ambiguous');
  });
});

describe('applyInstructionsToDocumentXml font role detection', () => {
  it('uses the body font (仿宋_GB2312) for edits inside a plain (non-bold) paragraph', () => {
    const xml = minimalDocumentXml(
      `<w:p><w:r><w:t>违约方应支付违约金一万元整。</w:t></w:r></w:p>`,
    );
    const instructionSet: RevisionInstructionSet = {
      id: 'ris-1',
      caseId: 'case-1',
      targetDocument: { fileId: 'f1' },
      instructions: [
        {
          id: 'i1',
          kind: 'replace',
          locator: { strategy: 'text', quote: '一万元' },
          text: '两万元',
        },
      ],
    };
    const { documentXml, outcomes } = applyInstructionsToDocumentXml(xml, instructionSet, FIXED_NOW);
    expect(outcomes[0]!.status).toBe('applied');
    const fonts = eastAsiaFontsIn(documentXml);
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.every((f) => f === '仿宋_GB2312')).toBe(true);
  });

  it('uses the heading font (黑体) for edits inside a bold paragraph (v1 heading heuristic)', () => {
    const xml = minimalDocumentXml(
      `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>第六条 违约责任标题</w:t></w:r></w:p>`,
    );
    const instructionSet: RevisionInstructionSet = {
      id: 'ris-2',
      caseId: 'case-2',
      targetDocument: { fileId: 'f2' },
      instructions: [
        {
          id: 'i1',
          kind: 'replace',
          locator: { strategy: 'text', quote: '违约责任标题' },
          text: '违约与赔偿责任标题',
        },
      ],
    };
    const { documentXml, outcomes } = applyInstructionsToDocumentXml(xml, instructionSet, FIXED_NOW);
    expect(outcomes[0]!.status).toBe('applied');
    const fonts = eastAsiaFontsIn(documentXml);
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.every((f) => f === '黑体')).toBe(true);
  });

  it('preserves bold formatting on reconstructed runs when the template run was bold', () => {
    const xml = minimalDocumentXml(
      `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>第六条 违约责任标题</w:t></w:r></w:p>`,
    );
    const instructionSet: RevisionInstructionSet = {
      id: 'ris-3',
      caseId: 'case-3',
      targetDocument: { fileId: 'f3' },
      instructions: [
        {
          id: 'i1',
          kind: 'replace',
          locator: { strategy: 'text', quote: '违约责任标题' },
          text: '违约与赔偿责任标题',
        },
      ],
    };
    const { documentXml } = applyInstructionsToDocumentXml(xml, instructionSet, FIXED_NOW);
    const doc = new DOMParser().parseFromString(documentXml, 'text/xml');
    const boldTags = Array.from(doc.getElementsByTagNameNS(W_NS, 'b'));
    expect(boldTags.length).toBeGreaterThan(0);
  });
});
