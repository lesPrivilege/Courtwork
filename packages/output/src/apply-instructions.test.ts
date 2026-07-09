import { describe, expect, it } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
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

const FIXED_NOW = new Date('2026-07-09T00:00:00.000Z');

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
