import { describe, expect, it } from 'vitest';
import type { StoredMaterial } from '../../material/material-ref';
import {
  DOCX_MEDIA_TYPE,
  deriveS3CaseFile,
  orderS3MaterialRefs,
  selectPrimaryContractCandidates,
} from './primary-contract';

/**
 * CONTRACT-OUTPUT-TRUTH-1 · O4：显式主合同选择与 CaseFile/materialRefs 同源。
 *
 * 「取 `ready[0]` 猜主合同」是本票要退役的第一处说谎点——这里立的是它的替代物。
 */
function material(overrides: Partial<StoredMaterial>): StoredMaterial {
  return {
    materialId: 'mat-x',
    caseId: 'case-x',
    fileName: '件.md',
    mediaType: 'text/markdown',
    byteLength: 12,
    contentSha256: 'sha-x',
    readingViewVersion: 'reading-view-material@1',
    readingViewSha256: 'sha-view-x',
    status: 'ready',
    readingMarkdown: '# 件',
    blocks: [],
    ...overrides,
  };
}

const PDF = material({ materialId: 'mat-pdf', fileName: '会议纪要.pdf', mediaType: 'application/pdf' });
const MD = material({ materialId: 'mat-md', fileName: '备忘.md' });
const DOCX_A = material({ materialId: 'mat-docx-a', fileName: '设备采购合同.docx', mediaType: DOCX_MEDIA_TYPE });
const DOCX_B = material({ materialId: 'mat-docx-b', fileName: '补充协议.docx', mediaType: DOCX_MEDIA_TYPE });
const DOCX_NEEDS_OCR = material({
  materialId: 'mat-docx-ocr',
  fileName: '扫描件.docx',
  mediaType: DOCX_MEDIA_TYPE,
  status: 'needs_ocr',
});

describe('selectPrimaryContractCandidates', () => {
  it('只列 ready 且 mediaType 精确为 DOCX 的材料，顺序保持清单顺序', () => {
    const candidates = selectPrimaryContractCandidates([PDF, DOCX_B, MD, DOCX_A, DOCX_NEEDS_OCR]);
    expect(candidates.map((item) => item.materialId)).toEqual(['mat-docx-b', 'mat-docx-a']);
  });

  it('按后缀猜不算数：mediaType 才是判据', () => {
    const fakeDocx = material({ materialId: 'mat-fake', fileName: '其实是markdown.docx', mediaType: 'text/markdown' });
    expect(selectPrimaryContractCandidates([fakeDocx])).toEqual([]);
  });

  it('没有可选 DOCX 时返回空——由调用方显式阻断，不退回 ready[0]', () => {
    expect(selectPrimaryContractCandidates([PDF, MD, DOCX_NEEDS_OCR])).toEqual([]);
  });
});

describe('orderS3MaterialRefs', () => {
  it('主合同稳定在 index 0，其余 ready 材料按清单顺序跟随', () => {
    expect(orderS3MaterialRefs('mat-docx-a', [PDF, MD, DOCX_A, DOCX_B])).toEqual([
      'mat-docx-a',
      'mat-pdf',
      'mat-md',
      'mat-docx-b',
    ]);
  });

  it('去重：同一 materialId 重复出现只留一次', () => {
    expect(orderS3MaterialRefs('mat-docx-a', [DOCX_A, PDF, PDF, DOCX_A])).toEqual(['mat-docx-a', 'mat-pdf']);
  });

  it('非 ready 材料不入 refs（provider 前已阻断，不该进请求）', () => {
    expect(orderS3MaterialRefs('mat-docx-a', [DOCX_A, DOCX_NEEDS_OCR])).toEqual(['mat-docx-a']);
  });

  it('所选主合同不在 ready 清单里即抛——不静默改选第一件', () => {
    expect(() => orderS3MaterialRefs('mat-not-here', [DOCX_A, PDF])).toThrow(/主合同/);
  });
});

describe('deriveS3CaseFile', () => {
  it('主合同 documentType=contract.primary，其余 supporting，全部 ingestStatus=done', () => {
    const caseFile = deriveS3CaseFile('case-x', 'mat-docx-a', [PDF, MD, DOCX_A]);
    expect(caseFile.caseId).toBe('case-x');
    expect(caseFile.files.map((file) => [file.fileId, file.documentType])).toEqual([
      ['mat-docx-a', 'contract.primary'],
      ['mat-pdf', 'supporting'],
      ['mat-md', 'supporting'],
    ]);
    for (const file of caseFile.files) expect(file.ingestStatus).toBe('done');
  });

  it('fileId 是 materialId（不是文件名），并携 fileName 与 contentHash', () => {
    const caseFile = deriveS3CaseFile('case-x', 'mat-docx-a', [DOCX_A, PDF]);
    expect(caseFile.files[0]).toMatchObject({
      fileId: 'mat-docx-a',
      fileName: '设备采购合同.docx',
      contentHash: 'sha-x',
    });
  });

  it('files 顺序与 materialRefs 同源：主合同在前，其余按清单顺序', () => {
    const refs = orderS3MaterialRefs('mat-docx-a', [PDF, MD, DOCX_A]);
    const caseFile = deriveS3CaseFile('case-x', 'mat-docx-a', [PDF, MD, DOCX_A]);
    expect(caseFile.files.map((file) => file.fileId)).toEqual(refs);
  });

  it('恰好一枚 contract.primary——不会因材料重名或重复而铸出两枚主合同', () => {
    const duplicate = material({ materialId: 'mat-docx-a', fileName: '设备采购合同.docx', mediaType: DOCX_MEDIA_TYPE });
    const caseFile = deriveS3CaseFile('case-x', 'mat-docx-a', [DOCX_A, duplicate, PDF]);
    expect(caseFile.files.filter((file) => file.documentType === 'contract.primary')).toHaveLength(1);
  });
});
