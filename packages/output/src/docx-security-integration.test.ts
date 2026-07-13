import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import type { RevisionInstructionSet } from '@courtwork/schemas';
import { DocxSecurityError } from '@courtwork/reading-view/docx-security';
import { applyRevisionInstructionSet } from './apply-revision-instruction-set.js';

const EMPTY_SET: RevisionInstructionSet = {
  id: 'safe-preflight-test',
  caseId: 'case-test',
  targetDocument: { fileId: 'input.docx' },
  instructions: [],
};

const DOCUMENT_XML =
  '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>正文</w:t></w:r></w:p></w:body></w:document>';

function docx(entries: Record<string, Uint8Array> = {}) {
  return zipSync({
    '[Content_Types].xml': strToU8('<Types/>'),
    'word/document.xml': strToU8(DOCUMENT_XML),
    ...entries,
  });
}

function expectSecurityReason(bytes: Uint8Array, reason: DocxSecurityError['reason']) {
  try {
    applyRevisionInstructionSet(bytes, EMPTY_SET);
    throw new Error('预期安全预检拒绝输入');
  } catch (error) {
    expect(error).toBeInstanceOf(DocxSecurityError);
    expect((error as DocxSecurityError).reason).toBe(reason);
  }
}

describe('output consumes reading-view DOCX preflight', () => {
  it('宏工程在 output 解压/解析前被同源防线拒绝', () => {
    expectSecurityReason(docx({ 'word/vbaProject.bin': new Uint8Array([1, 2, 3]) }), 'malicious_content');
  });

  it('任一待解析 XML 部件含 DOCTYPE/ENTITY 都按 XXE 拒绝', () => {
    expectSecurityReason(
      docx({
        'word/_rels/document.xml.rels': strToU8(
          '<!DOCTYPE x [<!ENTITY leak SYSTEM "file:///etc/passwd">]><Relationships>&leak;</Relationships>',
        ),
      }),
      'malicious_content',
    );
  });

  it('高压缩比输入在实际 inflate 前按 zip bomb 拒绝', () => {
    const bomb = zipSync({
      '[Content_Types].xml': strToU8('<Types/>'),
      'word/document.xml': new Uint8Array(2 * 1024 * 1024),
    });
    expectSecurityReason(bomb, 'zip_bomb_suspected');
  });
});
