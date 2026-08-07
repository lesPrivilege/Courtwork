import type { CaseFile } from '@courtwork/legal';
import type { StoredMaterial } from '../material/material-ref';

/**
 * CONTRACT-OUTPUT-TRUTH-1 · O4：显式主合同的选择、排序与 CaseFile 派生。
 *
 * 本单新增概念：零。三个都是纯函数，替代的是同一处**猜测**——旧实现取 `ready[0]` 当主合同，
 * 于是「哪份是主合同」由入库顺序决定，用户从未表达过。这里把它换成用户显式选定的 materialId，
 * 并让 `materialRefs`、`CaseFile` 与后续 output 全部从这一个 id 派生，四者结构性同源。
 */

/** DOCX 的精确 mediaType。按后缀猜不算数——`其实是markdown.docx` 不是 Word 文档。 */
export const DOCX_MEDIA_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** CaseFile 的文书类型：主合同是批注目标，其余只供核验背景。 */
export const PRIMARY_DOCUMENT_TYPE = 'contract.primary';
export const SUPPORTING_DOCUMENT_TYPE = 'supporting';

/** 会话没有主合同 ref。旧实现在此处取 `ready[0]`；现在显式阻断，绝不猜。 */
export class MissingPrimaryContractError extends Error {
  readonly code = 'missing_primary_contract' as const;
  constructor() {
    super('本次审查没有指定主合同');
    this.name = 'MissingPrimaryContractError';
  }
}

export class PrimaryContractNotInSessionError extends Error {
  readonly code = 'primary_contract_not_in_session' as const;
  constructor(materialId: string) {
    super(`所选主合同 ${materialId} 不在本次可用材料清单内`);
    this.name = 'PrimaryContractNotInSessionError';
  }
}

function readyOnly(materials: readonly StoredMaterial[]): StoredMaterial[] {
  return materials.filter((material) => material.status === 'ready');
}

/**
 * 可作主合同的候选：`status==='ready'` 且 mediaType **精确**等于 DOCX。
 * PDF/MD/TXT 仍是合法支持材料，继续送模型，但不能成为 Word 批注稿的目标。
 * 返回空即「没有可选主合同」，调用方须显式阻断并说明下一步，绝不退回 `ready[0]`。
 */
export function selectPrimaryContractCandidates(materials: readonly StoredMaterial[]): StoredMaterial[] {
  return readyOnly(materials).filter((material) => material.mediaType === DOCX_MEDIA_TYPE);
}

/**
 * S3 的 `materialRefs`：用户所选主合同稳定在 index 0，其余 ready 材料去重后保持清单顺序。
 * 该顺序语义只属于 `legal.S3` host binding，不扩成 core 对所有场景的领域解释。
 */
export function orderS3MaterialRefs(
  primaryMaterialId: string,
  materials: readonly StoredMaterial[],
): string[] {
  const ready = readyOnly(materials);
  if (!ready.some((material) => material.materialId === primaryMaterialId)) {
    throw new PrimaryContractNotInSessionError(primaryMaterialId);
  }
  const ordered = [primaryMaterialId];
  for (const material of ready) {
    if (!ordered.includes(material.materialId)) ordered.push(material.materialId);
  }
  return ordered;
}

/**
 * 无主合同语义的 `legal.CaseFile` 派生（LEGAL-FIVE-FACES-1）：阅卷/矩阵类场景没有「批注目标」
 * 这回事，全部 ready 材料一律 `supporting`。**不猜主合同**——`contract.primary` 只在用户显式
 * 选定时出现（S3 走 {@link deriveS3CaseFile}），本函数结构上写不出那个值。
 */
export function deriveCaseFileFromMaterials(
  caseId: string,
  materials: readonly StoredMaterial[],
): CaseFile {
  return {
    caseId,
    files: readyOnly(materials).map((material) => ({
      fileId: material.materialId,
      fileName: material.fileName,
      documentType: SUPPORTING_DOCUMENT_TYPE,
      ingestStatus: 'done' as const,
      contentHash: material.contentSha256,
    })),
  };
}

/**
 * 从同一输入机械派生 `legal.CaseFile`：`fileId` 就是 materialId（不是文件名——文件名会改，
 * materialId 不会），顺序与 `orderS3MaterialRefs` 同源，故 CaseFile / materialRefs /
 * session pointer / output 原始 bytes 四者永远指同一件。
 */
export function deriveS3CaseFile(
  caseId: string,
  primaryMaterialId: string,
  materials: readonly StoredMaterial[],
): CaseFile {
  const refs = orderS3MaterialRefs(primaryMaterialId, materials);
  const byId = new Map(readyOnly(materials).map((material) => [material.materialId, material]));
  return {
    caseId,
    files: refs.map((materialId) => {
      const material = byId.get(materialId)!;
      return {
        fileId: material.materialId,
        fileName: material.fileName,
        documentType: materialId === primaryMaterialId ? PRIMARY_DOCUMENT_TYPE : SUPPORTING_DOCUMENT_TYPE,
        // ready 材料的摄取已完成；needs_ocr/rejected 结构上进不了 refs。
        ingestStatus: 'done' as const,
        contentHash: material.contentSha256,
      };
    }),
  };
}
