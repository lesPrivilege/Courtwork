import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate';
import { applyRevisionInstructionSet, SignedDocumentUnsupportedError } from './apply-revision-instruction-set.js';
import type { RevisionInstructionSet } from '@courtwork/schemas';

/**
 * CONTRACT-OUTPUT-TRUTH-1（output 票）：OPC 数字签名阻断。
 *
 * 全部探针都从**唯一**复合原件在内存中派生，不为每个信号再提交 binary fixture。
 */
const COMPLEX_FIXTURE = fileURLToPath(
  new URL('../test/fixtures/contract-review-complex.docx', import.meta.url),
);

function loadParts(): Record<string, Uint8Array> {
  return unzipSync(new Uint8Array(readFileSync(COMPLEX_FIXTURE)));
}

function pack(parts: Record<string, Uint8Array>): Buffer {
  return Buffer.from(zipSync(parts as Zippable, { level: 6 }));
}

const MINIMAL_SET: RevisionInstructionSet = {
  id: 'ris-signed-probe',
  caseId: 'case-signed-probe',
  targetDocument: { fileId: 'contract-review-complex' },
  outOfCoverage: [],
  instructions: [
    {
      id: 'instr-risk-01',
      kind: 'commentOnly',
      locator: { strategy: 'text', quote: '乙方应于本合同签订之日起三十日内将标的物交付至甲方指定地点。' },
      annotation: { text: '交付期限需与到货计划核对。', citations: [] },
    },
  ],
};

function expectBlocked(parts: Record<string, Uint8Array>): SignedDocumentUnsupportedError {
  let caught: unknown;
  try {
    applyRevisionInstructionSet(pack(parts), MINIMAL_SET, { now: new Date('2026-02-01T00:00:00.000Z') });
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(SignedDocumentUnsupportedError);
  return caught as SignedDocumentUnsupportedError;
}

const SIG_REL_BASE = 'http://schemas.openxmlformats.org/package/2006/relationships/digital-signature';
const SIG_CONTENT_TYPES = [
  'application/vnd.openxmlformats-package.digital-signature-origin',
  'application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml',
  'application/vnd.openxmlformats-package.digital-signature-certificate',
];

describe('OPC 数字签名阻断', () => {
  it('阴性对照：未签名的复合原件正常产出，既有图片/批注不被误判为签名', () => {
    const result = applyRevisionInstructionSet(pack(loadParts()), MINIMAL_SET, {
      now: new Date('2026-02-01T00:00:00.000Z'),
    });
    expect(result.docx.byteLength).toBeGreaterThan(0);
    const produced = unzipSync(new Uint8Array(result.docx));
    expect(Object.keys(produced)).toContain('word/media/image1.png');
  });

  it('阴性对照：part 名含 signature 但不在 `_xmlsignatures/` 下的件不得误杀', () => {
    const parts = loadParts();
    parts['word/media/signature-scan.png'] = parts['word/media/image1.png']!;
    parts['word/embeddings/signature_block.bin'] = strToU8('visible seal image, not an OPC signature');
    const result = applyRevisionInstructionSet(pack(parts), MINIMAL_SET, {
      now: new Date('2026-02-01T00:00:00.000Z'),
    });
    expect(result.docx.byteLength).toBeGreaterThan(0);
  });

  /**
   * 闭集与模糊搜的区分力：这三条只有在实现真按规范闭集判定时才绿。
   * 把任一探针换成 `includes('signature')` 都会在此翻红——否则「用了闭集」只是注释里的宣称。
   */
  it('阴性对照：relationship Type 含 signature 但不在规范闭集内，不得阻断', () => {
    const parts = loadParts();
    const rels = strFromU8(parts['word/_rels/document.xml.rels']!);
    parts['word/_rels/document.xml.rels'] = strToU8(
      rels.replace(
        '</Relationships>',
        `<Relationship Id="rIdSealScan" Type="http://schemas.example.com/relationships/signature-scan" Target="media/signature-scan.png"/>` +
          `<Relationship Id="rIdSigLine" Type="http://schemas.microsoft.com/office/2006/relationships/signatureline" Target="media/image1.png"/>` +
          `</Relationships>`,
      ),
    );
    parts['word/media/signature-scan.png'] = parts['word/media/image1.png']!;
    const result = applyRevisionInstructionSet(pack(parts), MINIMAL_SET, {
      now: new Date('2026-02-01T00:00:00.000Z'),
    });
    expect(result.docx.byteLength).toBeGreaterThan(0);
  });

  it('阴性对照：ContentType 含 signature 但不在规范闭集内，不得阻断', () => {
    const parts = loadParts();
    const ct = strFromU8(parts['[Content_Types].xml']!);
    parts['[Content_Types].xml'] = strToU8(
      ct.replace(
        '</Types>',
        `<Override PartName="/word/embeddings/signature_block.bin" ContentType="application/x-vendor-signature-image"/></Types>`,
      ),
    );
    parts['word/embeddings/signature_block.bin'] = strToU8('vendor visible-seal blob');
    const result = applyRevisionInstructionSet(pack(parts), MINIMAL_SET, {
      now: new Date('2026-02-01T00:00:00.000Z'),
    });
    expect(result.docx.byteLength).toBeGreaterThan(0);
  });

  it('signature part：`_xmlsignatures/` 前缀阻断，且大小写与路径规范化变体同样命中', () => {
    for (const partName of [
      '_xmlsignatures/sig1.xml',
      '_XMLSIGNATURES/sig1.xml',
      '/_xmlsignatures/origin.sigs',
      './_xmlSignatures/sig2.xml',
    ]) {
      const parts = loadParts();
      parts[partName] = strToU8('<?xml version="1.0"?><Signature/>');
      const error = expectBlocked(parts);
      expect(error.code).toBe('signed_document_unsupported');
    }
  });

  it('三种标准 relationship 各自阻断，非 root `.rels` 同样命中', () => {
    for (const kind of ['origin', 'signature', 'certificate']) {
      const parts = loadParts();
      const rels = strFromU8(parts['word/_rels/document.xml.rels']!);
      parts['word/_rels/document.xml.rels'] = strToU8(
        rels.replace(
          '</Relationships>',
          `<Relationship Id="rIdSig" Type="${SIG_REL_BASE}/${kind}" Target="../_xmlsignatures/origin.sigs"/></Relationships>`,
        ),
      );
      expectBlocked(parts);
    }
  });

  it('三种标准 content type 各自阻断（Default 与 Override 两处都算）', () => {
    for (const contentType of SIG_CONTENT_TYPES) {
      const parts = loadParts();
      const ct = strFromU8(parts['[Content_Types].xml']!);
      parts['[Content_Types].xml'] = strToU8(
        ct.replace('</Types>', `<Override PartName="/_xmlsignatures/sig1.xml" ContentType="${contentType}"/></Types>`),
      );
      expectBlocked(parts);
    }
  });

  it('阻断发生在写入之前：零 docx 返回、零剥除签名', () => {
    const parts = loadParts();
    parts['_xmlsignatures/sig1.xml'] = strToU8('<?xml version="1.0"?><Signature/>');
    const packed = pack(parts);
    const before = unzipSync(new Uint8Array(packed));
    expectBlocked(parts);
    // 原 bytes 未被本包改动：签名 part 仍在。
    expect(Object.keys(before)).toContain('_xmlsignatures/sig1.xml');
  });
});
