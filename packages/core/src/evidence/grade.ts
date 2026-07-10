export type EvidenceGrade = 'A' | 'B' | 'C';

export interface EvidenceRecord {
  grade: EvidenceGrade;
  sourceId: string;
  confirmed: boolean;
}

export interface EvidenceGradeAnnotation extends EvidenceRecord {
  key: string;
}

export interface EvidenceLedger {
  record(key: string, evidence: EvidenceRecord): void;
  get(key: string): EvidenceRecord | undefined;
  confirm(key: string): void;
  snapshot(): EvidenceGradeAnnotation[];
  /**
   * 签发稳定的 evidenceKey：candidateKey 命中台账记录时原样返回，未命中返回
   * undefined。调用方据此判断是否需要门禁校验——找不到台账记录视为非工具
   * 来源，不适用信源分级（历史行为不变，只是判断权从门禁函数移到了这里）。
   */
  issueKey(candidateKey: string): string | undefined;
}

/**
 * 通用证据台账：orchestration 过程中把"这条证据背后是哪次工具调用、什么等级"
 * 记进本次运行的台账。不塞进 schemas 定义的 artifact 本体（docs/20"嵌入形状归
 * schemas、映射归 core"——现在不嵌，将来要嵌走 schemas 提案）。
 */
export function createEvidenceLedger(): EvidenceLedger {
  const entries = new Map<string, EvidenceRecord>();
  return {
    record(key, evidence) {
      entries.set(key, evidence);
    },
    get(key) {
      return entries.get(key);
    },
    confirm(key) {
      const existing = entries.get(key);
      if (existing === undefined) return;
      entries.set(key, { ...existing, confirmed: true });
    },
    snapshot() {
      return [...entries.entries()].map(([key, evidence]) => ({ key, ...evidence }));
    },
    issueKey(candidateKey) {
      return entries.has(candidateKey) ? candidateKey : undefined;
    },
  };
}

export class InadmissibleCitationError extends Error {
  constructor(
    public readonly key: string | undefined,
    public readonly grade: EvidenceGrade,
  ) {
    super(
      key === undefined
        ? '引用未附带 evidenceKey，按 C 级未确认证据处理，不满足准入门禁'
        : `证据 "${key}" 等级为 ${grade} 且未经确认，不满足准入门禁`,
    );
    this.name = 'InadmissibleCitationError';
  }
}

/**
 * 通用门禁：只认 evidenceKey，不解析任何展示文本——调用方若持有由本台账正确
 * 签发的 key，无论上层如何编辑该引用对应的展示文本，门禁结论都不受影响
 * （W6.2 整改：修复"展示文本被当成台账外键查表"的绕过手法）。key 缺失、或
 * 无法在台账中解析到记录，一律按 C 级未确认处理（fail closed）；找到记录后
 * 按等级/确认状态放行——C 级且未确认拒绝，A/B 级或已确认的 C 级放行。
 */
export function assertCitationAdmissible(ledger: EvidenceLedger, evidenceKey: string | undefined): void {
  if (evidenceKey === undefined) throw new InadmissibleCitationError(undefined, 'C');
  const evidence = ledger.get(evidenceKey);
  if (evidence === undefined) throw new InadmissibleCitationError(evidenceKey, 'C');
  if (evidence.grade === 'C' && !evidence.confirmed) {
    throw new InadmissibleCitationError(evidenceKey, evidence.grade);
  }
}
