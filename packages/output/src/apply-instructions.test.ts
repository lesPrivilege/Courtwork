import { readFileSync } from 'node:fs';
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

describe('applyInstructionsToDocumentXml keeps w:pPr first when commenting a whole paragraph (OUTPUT-APPLY-FIDELITY-1 #1)', () => {
  it('inserts the whole-paragraph comment range after w:pPr, never before it', () => {
    const xml = minimalDocumentXml(
      `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr></w:pPr><w:r><w:t>甲方应于三十日内支付全部价款。</w:t></w:r></w:p>`,
    );
    const instructionSet: RevisionInstructionSet = {
      id: 'ris-cmt-ppr',
      caseId: 'case-cmt-ppr',
      targetDocument: { fileId: 'f-cmt-ppr' },
      instructions: [
        {
          id: 'i1',
          kind: 'commentOnly',
          locator: { strategy: 'text', quote: '甲方应于三十日内支付全部价款。' },
          annotation: {
            text: '付款期限与主合同附件三不一致，建议复核。',
            citations: [{ citation: '合同审查要点', sourceAnchors: [{ fileId: 'f-cmt-ppr', quote: '甲方应于三十日内支付全部价款。' }] }],
          },
        },
      ],
    };
    const { documentXml, outcomes } = applyInstructionsToDocumentXml(xml, instructionSet, FIXED_NOW);
    expect(outcomes[0]!.status).toBe('applied');
    const p = firstParagraph(documentXml);
    // OOXML 要求 w:pPr 是 w:p 首子节点；批注 range 只能插在它之后。
    expect((p.firstChild as Element)?.localName).toBe('pPr');
    const childLocals = Array.from(p.childNodes)
      .filter((c) => c.nodeType === 1)
      .map((c) => (c as Element).localName);
    expect(childLocals[0]).toBe('pPr');
    expect(childLocals[1]).toBe('commentRangeStart');
  });
});

describe('applyInstructionsToDocumentXml refuses to rebuild paragraphs carrying foreign markup (OUTPUT-APPLY-FIDELITY-1 #2)', () => {
  function replaceSet(quote: string, text: string): RevisionInstructionSet {
    return {
      id: 'ris-foreign',
      caseId: 'case-foreign',
      targetDocument: { fileId: 'f-foreign' },
      instructions: [{ id: 'i1', kind: 'replace', locator: { strategy: 'text', quote }, text }],
    };
  }

  it('refuses replace when the paragraph holds another author\'s tracked deletion (and must not resurrect its w:delText)', () => {
    const xml = minimalDocumentXml(
      `<w:p><w:r><w:t>本合同自双方签字之日起生效。</w:t></w:r><w:del w:id="9" w:author="对方律师" w:date="2026-01-01T00:00:00Z"><w:r><w:delText>原付款条款已删除。</w:delText></w:r></w:del></w:p>`,
    );
    const { documentXml, outcomes } = applyInstructionsToDocumentXml(xml, replaceSet('签字之日起生效', '盖章之日起生效'), FIXED_NOW);
    expect(outcomes[0]!.status).toBe('unsupported_existing_markup');
    // 原段落不得被改写：既有 w:del 原样在场，delText 不得复活为可见文本。
    const doc = new DOMParser().parseFromString(documentXml, 'text/xml');
    expect(doc.getElementsByTagNameNS(W_NS, 'del').length).toBe(1);
    expect(doc.getElementsByTagNameNS(W_NS, 'delText')[0]?.textContent).toBe('原付款条款已删除。');
    const visible = Array.from(doc.getElementsByTagNameNS(W_NS, 't')).map((t) => t.textContent ?? '').join('');
    expect(visible).toBe('本合同自双方签字之日起生效。');
    expect(visible).not.toContain('原付款条款已删除。');
  });

  it('refuses replace when the paragraph holds an existing comment range', () => {
    const xml = minimalDocumentXml(
      `<w:p><w:commentRangeStart w:id="4"/><w:r><w:t>违约金为合同总价的百分之十。</w:t></w:r><w:commentRangeEnd w:id="4"/><w:r><w:rPr/><w:commentReference w:id="4"/></w:r></w:p>`,
    );
    const { documentXml, outcomes } = applyInstructionsToDocumentXml(xml, replaceSet('百分之十', '百分之十五'), FIXED_NOW);
    expect(outcomes[0]!.status).toBe('unsupported_existing_markup');
    const doc = new DOMParser().parseFromString(documentXml, 'text/xml');
    expect(doc.getElementsByTagNameNS(W_NS, 'commentRangeStart').length).toBe(1);
    expect(doc.getElementsByTagNameNS(W_NS, 'commentRangeEnd').length).toBe(1);
  });

  it('refuses replace when a run carries a line break the rebuild would silently drop', () => {
    const xml = minimalDocumentXml(
      `<w:p><w:r><w:t>第一行</w:t><w:br/><w:t>第二行内容待改。</w:t></w:r></w:p>`,
    );
    const { outcomes } = applyInstructionsToDocumentXml(xml, replaceSet('内容待改', '内容已改'), FIXED_NOW);
    expect(outcomes[0]!.status).toBe('unsupported_existing_markup');
  });

  it('refuses delete when paragraph content lives inside a hyperlink wrapper (would otherwise survive a paragraph-level delete)', () => {
    const xml = minimalDocumentXml(
      `<w:p><w:hyperlink r:id="rId9" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:r><w:t>详见附件二链接条款。</w:t></w:r></w:hyperlink></w:p>`,
    );
    const set: RevisionInstructionSet = {
      id: 'ris-del-link',
      caseId: 'case-del-link',
      targetDocument: { fileId: 'f-del-link' },
      instructions: [{ id: 'i1', kind: 'delete', locator: { strategy: 'text', quote: '详见附件二链接条款。' } }],
    };
    const { outcomes } = applyInstructionsToDocumentXml(xml, set, FIXED_NOW);
    expect(outcomes[0]!.status).toBe('unsupported_existing_markup');
  });

  it('still applies replace on a clean paragraph with proofErr noise present', () => {
    const xml = minimalDocumentXml(
      `<w:p><w:proofErr w:type="spellStart"/><w:r><w:t>违约金为合同总价的百分之十。</w:t></w:r><w:proofErr w:type="spellEnd"/></w:p>`,
    );
    const { outcomes } = applyInstructionsToDocumentXml(xml, replaceSet('百分之十', '百分之十五'), FIXED_NOW);
    expect(outcomes[0]!.status).toBe('applied');
  });
});

describe('fuzzy replace consumes the matched span, not the literal quote (OUTPUT-APPLY-FIDELITY-1 #3)', () => {
  it('edits the actually-matched text and produces real revision marks', () => {
    // 文档被轻改（多了「均」字）：quote 不再精确命中，fuzzy 命中的是段内实际文本窗口。
    const xml = minimalDocumentXml(
      `<w:p><w:r><w:t>双方确认本协议项下全部争议均提交上海仲裁委员会仲裁解决处理。</w:t></w:r></w:p>`,
    );
    const set: RevisionInstructionSet = {
      id: 'ris-fuzzy',
      caseId: 'case-fuzzy',
      targetDocument: { fileId: 'f-fuzzy' },
      instructions: [
        {
          id: 'i1',
          kind: 'replace',
          locator: { strategy: 'text', quote: '双方确认本协议项下全部争议提交上海仲裁委员会仲裁解决处理。' },
          text: '双方确认本协议项下全部争议均提交北京仲裁委员会仲裁解决。',
        },
      ],
    };
    const { documentXml, outcomes } = applyInstructionsToDocumentXml(xml, set, FIXED_NOW);
    expect(outcomes[0]!.status).toBe('applied_fuzzy');
    const doc = new DOMParser().parseFromString(documentXml, 'text/xml');
    // 必须真的产生修订痕迹——零 del/ins 的「applied_fuzzy」是静默 no-op。
    expect(doc.getElementsByTagNameNS(W_NS, 'ins').length).toBeGreaterThan(0);
    expect(doc.getElementsByTagNameNS(W_NS, 'delText').length).toBeGreaterThan(0);
    const visible = Array.from(doc.getElementsByTagNameNS(W_NS, 't')).map((t) => t.textContent ?? '').join('');
    expect(visible).toContain('北京仲裁委员会');
  });

  it('reports a non-applied outcome when replace would produce zero revision marks', () => {
    const xml = minimalDocumentXml(
      `<w:p><w:r><w:t>本条款维持原状。</w:t></w:r></w:p>`,
    );
    const set: RevisionInstructionSet = {
      id: 'ris-noop',
      caseId: 'case-noop',
      targetDocument: { fileId: 'f-noop' },
      instructions: [
        { id: 'i1', kind: 'replace', locator: { strategy: 'text', quote: '本条款维持原状。' }, text: '本条款维持原状。' },
      ],
    };
    const { outcomes } = applyInstructionsToDocumentXml(xml, set, FIXED_NOW);
    expect(outcomes[0]!.status).toBe('locator_text_mismatch');
  });
});

describe('golden document structural invariant (OUTPUT-APPLY-FIDELITY-1 回归锁)', () => {
  it('keeps w:pPr as the first element child of every paragraph in the committed golden', () => {
    const xml = readFileSync(new URL('./__snapshots__/golden-document.xml', import.meta.url), 'utf8');
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const paragraphs = Array.from(doc.getElementsByTagNameNS(W_NS, 'p'));
    expect(paragraphs.length).toBeGreaterThan(0);
    for (const p of paragraphs) {
      const hasPPr = Array.from(p.childNodes).some((c) => c.nodeType === 1 && (c as Element).localName === 'pPr');
      if (!hasPPr) continue;
      const firstEl = Array.from(p.childNodes).find((c) => c.nodeType === 1) as Element;
      expect(firstEl.localName, 'w:pPr 必须是段落首个元素子节点').toBe('pPr');
    }
  });
});
