import type { RevisionInstruction, RevisionInstructionSet, RiskItem, RiskList } from '../schemas/index.js';

export class MissingLocatorQuoteError extends Error {
  readonly code = 'missing_locator_quote' as const;
  constructor(riskId: string) {
    super(`风险 ${riskId} 的主合同锚缺少可用于定位的 sourceAnchor.quote，无法编译为修订指令`);
    this.name = 'MissingLocatorQuoteError';
  }
}

/**
 * 仍有 pending 处置。正常产品在调用本函数前已把该分支分流为「继续逐条处置」，
 * 走到这里说明调用方漏了判据——显式阻断，不按 pending 猜用户意思。
 */
export class IncompleteRiskDispositionError extends Error {
  readonly code = 'incomplete_risk_disposition' as const;
  readonly pendingRiskIds: readonly string[];
  constructor(pendingRiskIds: readonly string[]) {
    super(`风险 ${pendingRiskIds.join('、')} 仍为待处置，未生成批注稿`);
    this.name = 'IncompleteRiskDispositionError';
    this.pendingRiskIds = pendingRiskIds;
  }
}

/**
 * 零 confirmed（空清单或全部驳回）。这是**零文书的正常终态**，由调用方分流为 completed；
 * 本函数只保证绝不构造违反 `instructions.min(1)` 的空指令集。
 */
export class NoConfirmedRiskError extends Error {
  readonly code = 'no_confirmed_risk' as const;
  constructor() {
    super('没有已确认的风险项，未生成批注稿');
    this.name = 'NoConfirmedRiskError';
  }
}

/**
 * 存在未闭合的待索证项。`outOfCoverage` 是**整份**批注稿 blocker：即便同时有 confirmed 风险，
 * 也不得部分生成——部分批注稿会让用户误以为这是一次完整审查。
 */
export class UnresolvedCoverageError extends Error {
  readonly code = 'unresolved_coverage' as const;
  /** 逐条缺口的 `summary`，顺序与 `riskList.outOfCoverage` 一致。 */
  readonly summaries: readonly string[];
  constructor(summaries: readonly string[]) {
    super(`仍有待索证项（${summaries.join('、')}），未生成批注稿`);
    this.name = 'UnresolvedCoverageError';
    this.summaries = summaries;
  }
}

/** 一条缺主合同锚的已确认风险。`quote` 永远只作 blocker 展示，不能降格成主合同 locator。 */
export interface MissingPrimaryMaterialAnchorItem {
  readonly riskId: string;
  /** 逐字取 post-revision `risk.description`。 */
  readonly summary: string;
  /** 该风险全部 anchors 中首个 trim 后非空的原 quote（可来自支持材料），无则空串。 */
  readonly quote: string;
}

/**
 * 已确认风险里没有任何主合同锚。不能拿支持材料的 quote 去主合同全文碰运气——那是把
 * "定位不到" 伪装成 "定位到了"。编译任何 instruction 之前先把全部缺锚项一次收齐再抛，
 * 让用户一次看全，而不是修一条冒一条。
 */
export class MissingPrimaryMaterialAnchorError extends Error {
  readonly code = 'missing_primary_material_anchor' as const;
  readonly items: readonly [MissingPrimaryMaterialAnchorItem, ...MissingPrimaryMaterialAnchorItem[]];
  constructor(items: readonly [MissingPrimaryMaterialAnchorItem, ...MissingPrimaryMaterialAnchorItem[]]) {
    super(`已确认风险 ${items.map((item) => item.riskId).join('、')} 没有主合同锚点，未生成批注稿`);
    this.name = 'MissingPrimaryMaterialAnchorError';
    this.items = items;
  }
}

/**
 * 台账门禁的注入口（迁包解耦，2026-07-13）：legal 包零 core 依赖（包域律——包只出
 * 语义，机器住底座），信源门禁以函数注入。issueKey 命中即签发 evidenceKey；
 * assertAdmissible 对签发的 key 执行信源分级门禁（不合格即抛）。装配点绑定
 * core 的 EvidenceLedger 实现。
 */
export interface EvidenceGatekeeper {
  issueKey(citation: string): string | undefined;
  assertAdmissible(evidenceKey: string): void;
}

/** 按 basis/anchor 原顺序找首枚落在主合同上的锚；找不到返回 undefined（不退回支持材料锚）。 */
function findPrimaryAnchor(risk: RiskItem, primaryMaterialId: string) {
  for (const basis of risk.basis) {
    for (const anchor of basis.sourceAnchors) {
      if (anchor.fileId === primaryMaterialId) return anchor;
    }
  }
  return undefined;
}

/** blocker 展示用引语：全部 anchors 中首个 trim 后非空的原 quote，无则空串。 */
function firstNonEmptyQuote(risk: RiskItem): string {
  for (const basis of risk.basis) {
    for (const anchor of basis.sourceAnchors) {
      const quote = anchor.quote?.trim();
      if (quote) return quote;
    }
  }
  return '';
}

/**
 * 把已确认的风险清单编译成修订指令集。领域判断不属于通用层——
 * docs/decisions/ADR-004-documents-and-files.md（S5 设计）先例：即便产出也是
 * RevisionInstructionSet，编译逻辑仍归场景/演示自己，不进 core 通用库。
 *
 * `targetFileId` 是**显式主合同 materialId**（不是文件名）：它既作 targetDocument，
 * 也是选择 locator 锚的唯一判据。只产 `commentOnly`——本版没有经 schema 承载的替换文本，
 * 不得借 UI 的"修正"生成模型替换条款。
 */
export function compileConfirmedRiskListToRevisionInstructions(
  riskList: RiskList,
  targetFileId: string,
  ledger: EvidenceGatekeeper,
): RevisionInstructionSet {
  // 次序固定：整份阻断项先于逐项判定，逐项缺锚又先于任何 instruction 构造。
  if (riskList.outOfCoverage.length > 0) {
    throw new UnresolvedCoverageError(riskList.outOfCoverage.map((entry) => entry.summary));
  }
  const pending = riskList.risks.filter((risk) => risk.dispositionStatus === 'pending');
  if (pending.length > 0) {
    throw new IncompleteRiskDispositionError(pending.map((risk) => risk.id));
  }
  const confirmed = riskList.risks.filter((risk) => risk.dispositionStatus === 'confirmed');
  if (confirmed.length === 0) throw new NoConfirmedRiskError();

  const missingAnchor: MissingPrimaryMaterialAnchorItem[] = [];
  for (const risk of confirmed) {
    if (findPrimaryAnchor(risk, targetFileId) === undefined) {
      missingAnchor.push({ riskId: risk.id, summary: risk.description, quote: firstNonEmptyQuote(risk) });
    }
  }
  if (missingAnchor.length > 0) {
    throw new MissingPrimaryMaterialAnchorError(
      missingAnchor as [MissingPrimaryMaterialAnchorItem, ...MissingPrimaryMaterialAnchorItem[]],
    );
  }

  const instructions: RevisionInstruction[] = [];
  for (const risk of confirmed) {
    // 上一轮扫描已确保每项都有主合同锚；此处只可能缺 quote。
    const quote = findPrimaryAnchor(risk, targetFileId)!.quote;
    if (!quote) throw new MissingLocatorQuoteError(risk.id);

    const citations = risk.basis.map((basis) => {
      // 台账按 basis.citation 精确匹配签发 key：命中就是工具来源，交给门禁按
      // 等级判断；未命中视为非工具来源（如直接引用的法条原文，或本案 party-verify
      // 那样展示文本经过润色、不再与台账 key 字面相等的情形），不适用信源分级，
      // 历史行为不变——citation 是自由文本，这里不做模糊/包含匹配（那会产生
      // 误关联，见 W6 验收报告）。一旦签发成功，门禁此后只认这个 key，citation
      // 展示文本再怎么编辑都不能让门禁改判。
      const evidenceKey = ledger.issueKey(basis.citation);
      if (evidenceKey !== undefined) ledger.assertAdmissible(evidenceKey);
      return { citation: basis.citation, sourceAnchors: basis.sourceAnchors, evidenceKey };
    });

    instructions.push({
      id: `instr-${risk.id}`,
      kind: 'commentOnly',
      locator: { strategy: 'text', quote },
      annotation: { text: risk.description, citations },
    });
  }
  return {
    id: `revset-${riskList.caseId}`,
    caseId: riskList.caseId,
    targetDocument: { fileId: targetFileId },
    instructions,
    // 本编译路径不经模型、不经 citation resolver：锚点逐字取自已确认 RiskList 的既有
    // sourceAnchors，且 `riskList.outOfCoverage` 非空时上面已整份阻断。故缺口表恒空——
    // 不是「暂未填」，是这条路径结构性不产生引用闭环缺口（LEGAL-ANCHOR-BINDING-2）。
    outOfCoverage: [],
  };
}
