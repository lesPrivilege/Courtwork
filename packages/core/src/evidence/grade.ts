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
}

/**
 * 通用证据台账：orchestration 过程中把"这条引用背后是哪次工具调用、什么等级"
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
  };
}

export class InadmissibleCitationError extends Error {
  constructor(
    public readonly key: string,
    public readonly grade: EvidenceGrade,
  ) {
    super(
      `证据 "${key}" 等级为 C（网络参考）且未经确认，不得进入修订指令集的 citation（docs/20：C 级事实不得未经确认流入 docx 批注依据）`,
    );
    this.name = 'InadmissibleCitationError';
  }
}

/**
 * 通用门禁：C 级且未确认 → 拒绝；A/B 级或已确认的 C 级 → 放行；台账里没有记录
 * （非工具来源的证据，如直接引用卷宗原文）→ 放行，不适用信源分级。
 * 不认识任何具体工具 id 或场景 id——等级判定的具体绑定关系由调用方（装配点）决定。
 */
export function assertCitationAdmissible(ledger: EvidenceLedger, key: string): void {
  const evidence = ledger.get(key);
  if (evidence === undefined) return;
  if (evidence.grade === 'C' && !evidence.confirmed) {
    throw new InadmissibleCitationError(key, evidence.grade);
  }
}
