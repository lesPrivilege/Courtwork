import { describe, expect, it } from 'vitest';
import type { CitationBinding } from '@courtwork/schemas';
import {
  resolveClaim,
  resolveDraftArtifact,
  resolveDraftArtifactWithPruning,
  type MaterialTextLayer,
} from './resolver.js';

const PDF_LAYER: MaterialTextLayer = {
  fileId: 'contract.pdf',
  blocks: [
    { blockId: '0', page: 1, text: '第一条 甲方应支付违约金。第二条 违约金上限另行约定。', rangeBase: 0, textLayerVersion: 'pdf@1+p1' },
    { blockId: '1', page: 2, text: '第九条 管辖法院为甲方所在地法院。', rangeBase: 0, textLayerVersion: 'pdf@1+p2' },
  ],
};

const DOCX_LAYER: MaterialTextLayer = {
  fileId: 'contract.docx',
  blocks: [
    { blockId: '0', text: '买卖合同', rangeBase: 0, textLayerVersion: 'docx@1+doc' },
    { blockId: '1', text: '甲方（买受人）：星辰科技有限公司', rangeBase: 5, textLayerVersion: 'docx@1+doc' },
  ],
};

describe('resolveClaim（模型出引语，系统出坐标）', () => {
  it('唯一命中即铸锚：start/end/textLayerVersion/quote 四件齐备，终验等式成立', () => {
    const { anchor, failure } = resolveClaim(
      { fileId: 'contract.pdf', page: 2, exactQuote: '管辖法院为甲方所在地法院' },
      [PDF_LAYER],
    );
    expect(failure).toBeUndefined();
    expect(anchor).toEqual({
      fileId: 'contract.pdf',
      page: 2,
      textRange: { start: 4, end: 16 },
      textLayerVersion: 'pdf@1+p2',
      quote: '管辖法院为甲方所在地法院',
    });
    // 终验等式：pageText.slice(start,end) === quote
    expect(PDF_LAYER.blocks[1].text.slice(4, 16)).toBe('管辖法院为甲方所在地法院');
  });

  it('docx 文档级坐标：rangeBase 参与铸造', () => {
    const { anchor } = resolveClaim({ fileId: 'contract.docx', exactQuote: '星辰科技有限公司' }, [DOCX_LAYER]);
    expect(anchor?.textRange).toEqual({ start: 13, end: 21 });
    expect(anchor?.textLayerVersion).toBe('docx@1+doc');
  });

  it('多义拒收并附命中次数（模型据此补上下文唯一化）', () => {
    const { failure } = resolveClaim({ fileId: 'contract.pdf', page: 1, exactQuote: '违约金' }, [PDF_LAYER]);
    expect(failure).toMatchObject({ reason: 'ambiguous', occurrences: 2 });
  });

  it('未命中拒收；文件不可达拒收；页声明收窄候选域', () => {
    expect(resolveClaim({ fileId: 'contract.pdf', page: 1, exactQuote: '不存在的话' }, [PDF_LAYER]).failure?.reason).toBe('not_found');
    expect(resolveClaim({ fileId: 'ghost.pdf', exactQuote: 'x' }, [PDF_LAYER]).failure?.reason).toBe('file_unavailable');
    // 引语在第 2 页，声明第 1 页 → 页内未命中（候选域收窄是声明的一部分）
    expect(resolveClaim({ fileId: 'contract.pdf', page: 1, exactQuote: '管辖法院为甲方所在地法院' }, [PDF_LAYER]).failure?.reason).toBe('not_found');
  });

  it('伪造坐标无通道：claim 形状不含 offset，铸出的坐标只来自匹配', () => {
    const { anchor } = resolveClaim({ fileId: 'contract.pdf', page: 1, exactQuote: '第一条 甲方应支付违约金。' }, [PDF_LAYER]);
    expect(anchor?.textRange).toEqual({ start: 0, end: 13 });
  });
});

const BINDING: CitationBinding = {
  draftField: 'quoteClaims',
  anchorField: 'sourceAnchors',
  itemScope: '/risks',
  itemSummaryField: 'description',
  outOfCoverageField: 'outOfCoverage',
};

function draft(risks: unknown[]): unknown {
  return { caseId: 'c1', risks };
}

const GOOD_RISK = {
  id: 'r1',
  description: '管辖不利',
  basis: [{ citation: '合同第九条', quoteClaims: [{ fileId: 'contract.pdf', page: 2, exactQuote: '管辖法院为甲方所在地法院' }] }],
};
const BAD_RISK = {
  id: 'r2',
  description: '凭空编造的风险',
  basis: [{ citation: '无中生有', quoteClaims: [{ fileId: 'contract.pdf', page: 1, exactQuote: '合同里根本没有这句话' }] }],
};

describe('resolveDraftArtifact（首过：不剪枝，拒收即返修）', () => {
  it('全部收敛：草稿字段被公证锚点替换，draftField 不外泄', () => {
    const result = resolveDraftArtifact({ draft: draft([GOOD_RISK]), binding: BINDING, layers: [PDF_LAYER] });
    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    const artifact = result.artifact as { risks: { basis: { sourceAnchors: unknown[]; quoteClaims?: unknown }[] }[]; outOfCoverage: unknown[] };
    expect(artifact.risks[0].basis[0].sourceAnchors).toHaveLength(1);
    expect(artifact.risks[0].basis[0].quoteClaims).toBeUndefined();
    expect(artifact.outOfCoverage).toEqual([]);
    expect(result.stats).toEqual({ claims: 1, resolved: 1, failed: 0 });
  });

  it('任一拒收：整体 needs_repair 并携全部原判（受限修复重试的输入）', () => {
    const result = resolveDraftArtifact({ draft: draft([GOOD_RISK, BAD_RISK]), binding: BINDING, layers: [PDF_LAYER] });
    expect(result.status).toBe('needs_repair');
    if (result.status !== 'needs_repair') return;
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatchObject({ reason: 'not_found', claim: { exactQuote: '合同里根本没有这句话' } });
  });
});

describe('resolveDraftArtifactWithPruning（重试后终局：不收敛单元移入 out_of_coverage）', () => {
  it('收敛单元落格，不收敛单元整体移入缺口表并携原判', () => {
    const { artifact, outOfCoverage, stats } = resolveDraftArtifactWithPruning({
      draft: draft([GOOD_RISK, BAD_RISK]),
      binding: BINDING,
      layers: [PDF_LAYER],
    });
    const resolved = artifact as { risks: unknown[]; outOfCoverage: unknown[] };
    expect(resolved.risks).toHaveLength(1);
    expect(outOfCoverage).toHaveLength(1);
    expect(outOfCoverage[0]).toMatchObject({
      summary: '凭空编造的风险',
      reason: 'citation_unresolved',
    });
    expect(outOfCoverage[0].failures[0].claim.exactQuote).toBe('合同里根本没有这句话');
    expect(resolved.outOfCoverage).toEqual(outOfCoverage);
    expect(stats.failed).toBe(1);
  });

  it('全军覆没时 risks 空表 + 缺口表满员——诚实的 partial，不假装完成', () => {
    const { artifact, outOfCoverage } = resolveDraftArtifactWithPruning({
      draft: draft([BAD_RISK]),
      binding: BINDING,
      layers: [PDF_LAYER],
    });
    expect((artifact as { risks: unknown[] }).risks).toEqual([]);
    expect(outOfCoverage).toHaveLength(1);
  });
});
