import { describe, expect, it } from 'vitest';
import type { RiskList } from '../schemas/risk-list.js';
import {
  compileConfirmedRiskListToRevisionInstructions,
  IncompleteRiskDispositionError,
  MissingLocatorQuoteError,
  MissingPrimaryMaterialAnchorError,
  NoConfirmedRiskError,
  UnresolvedCoverageError,
  type EvidenceGatekeeper,
} from './compile-risk-list-to-revisions.js';

class StubInadmissibleError extends Error {}

/** 显式主合同 materialId：`targetFileId` 就是它，不是文件名。 */
const PRIMARY = 'material-primary-contract';
const SUPPORTING = 'material-supporting-minutes';

/**
 * 门禁 stub：模拟 core EvidenceLedger 的 D4 语义子集（精确匹配签发 + C 级未确认拒收）。
 * 规则本体的测试住 core/evidence；此处验证 compile 与门禁的交互契约——
 * 签发命中才问门禁、门禁抛错必须外传、未命中不签发不问。
 */
function stubGatekeeper(entries: Record<string, { admissible: boolean }> = {}): EvidenceGatekeeper {
  return {
    issueKey: (citation) => (entries[citation] !== undefined ? citation : undefined),
    assertAdmissible: (key) => {
      if (!entries[key]?.admissible) throw new StubInadmissibleError(`证据 ${key} 未过信源门禁`);
    },
  };
}

function riskList(overrides: Partial<RiskList['risks'][number]> = {}): RiskList {
  return {
    caseId: 'c1',
    outOfCoverage: [],
    risks: [
      {
        id: 'risk-01',
        description: '违约金过高',
        level: 'high',
        basis: [
          {
            citation: '《民法典》第585条',
            sourceAnchors: [{ fileId: PRIMARY, quote: '逾期违约金', textRange: { start: 0, end: 4 } }],
          },
        ],
        dispositionStatus: 'confirmed',
        ...overrides,
      },
    ],
  };
}

describe('compileConfirmedRiskListToRevisionInstructions', () => {
  it('compiles each confirmed risk into a commentOnly instruction citing its basis', () => {
    const result = compileConfirmedRiskListToRevisionInstructions(riskList(), PRIMARY, stubGatekeeper());
    expect(result).toMatchObject({
      id: 'revset-c1',
      caseId: 'c1',
      // targetDocument 精确指向显式主合同 materialId，不是文件名。
      targetDocument: { fileId: PRIMARY },
    });
    expect(result.instructions).toHaveLength(1);
    const instruction = result.instructions[0];
    expect(instruction).toMatchObject({
      id: 'instr-risk-01',
      kind: 'commentOnly',
      locator: { strategy: 'text', quote: '逾期违约金' },
      annotation: { text: '违约金过高' },
    });
    if (instruction.kind !== 'commentOnly') throw new Error('unreachable');
    expect(instruction.annotation.citations[0].citation).toBe('《民法典》第585条');
    // 未在台账中登记的引用（非工具来源，如直接的法条原文）不签发 evidenceKey。
    expect(instruction.annotation.citations[0].evidenceKey).toBeUndefined();
  });

  it('只消费 confirmed：rejected 项零 instruction，且不因它缺主合同锚而阻断', () => {
    const mixed: RiskList = {
      caseId: 'c1',
      outOfCoverage: [],
      risks: [
        riskList().risks[0]!,
        {
          id: 'risk-02',
          description: '管辖不利',
          level: 'medium',
          basis: [
            {
              citation: '会议纪要',
              sourceAnchors: [{ fileId: SUPPORTING, quote: '只在支持材料', textRange: { start: 0, end: 5 } }],
            },
          ],
          dispositionStatus: 'rejected',
        },
      ],
    };
    const result = compileConfirmedRiskListToRevisionInstructions(mixed, PRIMARY, stubGatekeeper());
    expect(result.instructions.map((item) => item.id)).toEqual(['instr-risk-01']);
  });

  it('任一 pending 以 typed incomplete error 阻断整份', () => {
    expect(() =>
      compileConfirmedRiskListToRevisionInstructions(
        riskList({ dispositionStatus: 'pending' }),
        PRIMARY,
        stubGatekeeper(),
      ),
    ).toThrow(IncompleteRiskDispositionError);
  });

  it('零 confirmed（全部 rejected）以 typed no-confirmed error 阻断，绝不返回空 instruction 集合', () => {
    let caught: unknown;
    try {
      compileConfirmedRiskListToRevisionInstructions(
        riskList({ dispositionStatus: 'rejected' }),
        PRIMARY,
        stubGatekeeper(),
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(NoConfirmedRiskError);
  });

  it('风险清单为空同样以 no-confirmed error 阻断', () => {
    expect(() =>
      compileConfirmedRiskListToRevisionInstructions(
        { caseId: 'c1', risks: [], outOfCoverage: [] },
        PRIMARY,
        stubGatekeeper(),
      ),
    ).toThrow(NoConfirmedRiskError);
  });

  it('任一 outOfCoverage 整份阻断——即使同时有 confirmed 也不部分编译', () => {
    const withGap: RiskList = {
      ...riskList(),
      outOfCoverage: [
        {
          summary: '交付期限约定不明',
          reason: 'citation_unresolved',
          failures: [
            {
              claim: { fileId: PRIMARY, exactQuote: '交付期限以双方另行确认为准' },
              reason: 'not_found',
            },
          ],
        },
      ],
    };
    let caught: unknown;
    try {
      compileConfirmedRiskListToRevisionInstructions(withGap, PRIMARY, stubGatekeeper());
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(UnresolvedCoverageError);
  });
});

describe('主合同锚的选择', () => {
  it('支持材料锚排在前、主合同锚排在后时，locator 仍取主合同锚', () => {
    const supportingFirst = riskList({
      basis: [
        {
          citation: '会议纪要',
          sourceAnchors: [
            { fileId: SUPPORTING, quote: '支持材料引语', textRange: { start: 0, end: 6 } },
            { fileId: SUPPORTING, quote: '第二枚支持材料引语', textRange: { start: 6, end: 15 } },
          ],
        },
        {
          citation: '《民法典》第585条',
          sourceAnchors: [
            { fileId: SUPPORTING, quote: '又一枚支持材料引语', textRange: { start: 0, end: 9 } },
            { fileId: PRIMARY, quote: '主合同逾期违约金条款', textRange: { start: 20, end: 30 } },
          ],
        },
      ],
    });
    const result = compileConfirmedRiskListToRevisionInstructions(supportingFirst, PRIMARY, stubGatekeeper());
    const instruction = result.instructions[0];
    if (instruction?.kind !== 'commentOnly') throw new Error('unreachable');
    expect(instruction.locator).toMatchObject({ strategy: 'text', quote: '主合同逾期违约金条款' });
    // 支持材料锚仍保留在 citation，只是不能成为主合同定位。
    expect(instruction.annotation.citations[0]!.sourceAnchors[0]!.fileId).toBe(SUPPORTING);
  });

  it('多枚主合同锚时取原顺序上稳定的首枚', () => {
    const twoPrimary = riskList({
      basis: [
        {
          citation: 'c',
          sourceAnchors: [
            { fileId: PRIMARY, quote: '首枚主合同锚', textRange: { start: 0, end: 6 } },
            { fileId: PRIMARY, quote: '次枚主合同锚', textRange: { start: 10, end: 16 } },
          ],
        },
      ],
    });
    const instruction = compileConfirmedRiskListToRevisionInstructions(twoPrimary, PRIMARY, stubGatekeeper())
      .instructions[0];
    if (instruction?.kind !== 'commentOnly') throw new Error('unreachable');
    expect(instruction.locator).toMatchObject({ quote: '首枚主合同锚' });
  });

  it('主合同锚存在但 quote 缺失，仍是既有 MissingLocatorQuoteError，不与缺锚混并', () => {
    const noQuote = riskList({
      basis: [{ citation: 'x', sourceAnchors: [{ fileId: PRIMARY, textRange: { start: 0, end: 1 } }] }],
    });
    let caught: unknown;
    try {
      compileConfirmedRiskListToRevisionInstructions(noQuote, PRIMARY, stubGatekeeper());
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(MissingLocatorQuoteError);
    expect(caught).not.toBeInstanceOf(MissingPrimaryMaterialAnchorError);
  });
});

describe('MissingPrimaryMaterialAnchorError', () => {
  function onlySupporting(id: string, description: string, quotes: (string | undefined)[]): RiskList['risks'][number] {
    return {
      id,
      description,
      level: 'medium',
      basis: quotes.map((quote, index) => ({
        citation: `依据${index}`,
        sourceAnchors: [{ fileId: SUPPORTING, quote, textRange: { start: index, end: index + 1 } }],
      })),
      dispositionStatus: 'confirmed',
    };
  }

  it('一次收齐全部缺主合同锚的 confirmed 风险，并在编译任何 instruction 前抛出', () => {
    const list: RiskList = {
      caseId: 'c1',
      outOfCoverage: [],
      risks: [
        onlySupporting('risk-02', '管辖不利', ['  ', '会议纪要原句']),
        riskList().risks[0]!,
        onlySupporting('risk-03', '验收标准不明', []),
      ],
    };
    let caught: unknown;
    try {
      compileConfirmedRiskListToRevisionInstructions(list, PRIMARY, stubGatekeeper());
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(MissingPrimaryMaterialAnchorError);
    const error = caught as MissingPrimaryMaterialAnchorError;
    expect(error.code).toBe('missing_primary_material_anchor');
    // 一次收齐：两项都在，而不是抛第一项就停。
    expect(error.items.map((item) => item.riskId)).toEqual(['risk-02', 'risk-03']);
    // summary 逐字取 post-revision description。
    expect(error.items.map((item) => item.summary)).toEqual(['管辖不利', '验收标准不明']);
    // quote 只取全部 anchors 中首个 trim 后非空的原 quote（可来自支持材料），无则空串。
    expect(error.items.map((item) => item.quote)).toEqual(['会议纪要原句', '']);
  });

  it('缺锚风险为 pending / rejected 时不入 items（只扫 confirmed）', () => {
    const list: RiskList = {
      caseId: 'c1',
      outOfCoverage: [],
      risks: [
        { ...onlySupporting('risk-02', '管辖不利', ['纪要原句']), dispositionStatus: 'rejected' },
        riskList().risks[0]!,
      ],
    };
    expect(() => compileConfirmedRiskListToRevisionInstructions(list, PRIMARY, stubGatekeeper())).not.toThrow();
  });
});

describe('信源门禁交互（既有语义不变）', () => {
  it('propagates the gate rejection when an issued evidence key fails admissibility (D4 语义由 core 台账实现)', () => {
    const webSourced = riskList({
      basis: [
        { citation: 'web-search', sourceAnchors: [{ fileId: PRIMARY, quote: 'x', textRange: { start: 0, end: 1 } }] },
      ],
    });
    expect(() =>
      compileConfirmedRiskListToRevisionInstructions(
        webSourced,
        PRIMARY,
        stubGatekeeper({ 'web-search': { admissible: false } }),
      ),
    ).toThrow(StubInadmissibleError);
  });

  it('stamps the compiled citation with the issued evidenceKey when the gate admits it', () => {
    const webSourced = riskList({
      basis: [
        { citation: 'web-search', sourceAnchors: [{ fileId: PRIMARY, quote: 'x', textRange: { start: 0, end: 1 } }] },
      ],
    });
    const result = compileConfirmedRiskListToRevisionInstructions(
      webSourced,
      PRIMARY,
      stubGatekeeper({ 'web-search': { admissible: true } }),
    );
    const instruction = result.instructions[0];
    if (instruction?.kind !== 'commentOnly') throw new Error('unreachable');
    expect(instruction.annotation.citations[0]!.evidenceKey).toBe('web-search');
  });

  it('leaves evidenceKey unset (and never consults the gate) when the citation text does not exactly match any ledger key — risk-07/party-verify boundary preserved', () => {
    const decorated = riskList({
      basis: [
        {
          citation: '网络参考：web-search',
          sourceAnchors: [{ fileId: PRIMARY, quote: 'x', textRange: { start: 0, end: 1 } }],
        },
      ],
    });
    const result = compileConfirmedRiskListToRevisionInstructions(
      decorated,
      PRIMARY,
      stubGatekeeper({ 'web-search': { admissible: false } }),
    );
    const instruction = result.instructions[0];
    if (instruction?.kind !== 'commentOnly') throw new Error('unreachable');
    expect(instruction.annotation.citations[0]!.evidenceKey).toBeUndefined();
  });
});
