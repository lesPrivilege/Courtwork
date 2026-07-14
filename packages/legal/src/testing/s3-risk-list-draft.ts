import type { RiskListDraft } from '../schemas/risk-list.js';
import { S3_RISK_LIST_RESPONSE } from './s3-risk-list-response.js';

/**
 * S3 生成节点的草稿回放响应（引用闭环形态，2026-07-13）：「模型出引语，系统出坐标」——
 * 脚本响应与真模型一样只交 fileId +（页/块）+ 逐字引语，坐标由 resolver 对材料
 * 文本层唯一精确匹配后铸造。risk-01–06 引语出自 original.docx 文本层（全文唯一，
 * 免页/块声明）；risk-07 引语在信用查询单里出现于两个块（本公司条目 + 关联股东条目），
 * 草稿以 blockId 消歧——多义拒收→块定位收窄的机制在演示语料里有真实用例。
 */
export const S3_RISK_LIST_DRAFT: RiskListDraft = {
  caseId: S3_RISK_LIST_RESPONSE.caseId,
  risks: S3_RISK_LIST_RESPONSE.risks.map((risk) => ({
    id: risk.id,
    description: risk.description,
    level: risk.level,
    dispositionStatus: risk.dispositionStatus,
    basis: risk.basis.map((basis) => ({
      citation: basis.citation,
      quoteClaims: basis.sourceAnchors.map((anchor) => ({
        fileId: anchor.fileId,
        exactQuote: anchor.quote ?? '',
        // 信用查询单的公司名双块命中：块定位消歧（resolver 候选域收窄的声明形态）。
        ...(anchor.fileId === '20-企业信用信息查询单.md' ? { blockId: '3' } : {}),
      })),
    })),
  })),
};
