import { describe, expect, it } from 'vitest';
import { findPartyRecord, listPartyOutOfCoverage, type PartyCorpusRecord } from '@courtwork/demo-data';
import { createToolExecutor, ToolInputValidationError } from './contract.js';
import {
  createDemoFixturePartyVerifyAdapter,
  createMockPartyVerifyAdapter,
  createPartyVerifyTool,
  createQccPartyVerifyAdapter,
  PartyVerifyDataSchema,
  PartyVerifyInputSchema,
  type PartyVerifyData,
  type PartyVerifyInput,
} from './party-verify.js';

describe('PartyVerifyInputSchema', () => {
  it('accepts a name-only subject', () => {
    expect(PartyVerifyInputSchema.safeParse({ name: '张三' }).success).toBe(true);
  });

  it('accepts a name with a unified social credit code', () => {
    expect(
      PartyVerifyInputSchema.safeParse({ name: '某某有限公司', unifiedSocialCreditCode: '91310000MA1FL0XXXX' })
        .success,
    ).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(PartyVerifyInputSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('rejects a missing name', () => {
    expect(PartyVerifyInputSchema.safeParse({}).success).toBe(false);
  });
});

describe('PartyVerifyDataSchema', () => {
  it('accepts a fully populated result', () => {
    expect(
      PartyVerifyDataSchema.safeParse({
        matchedName: '某某有限公司',
        unifiedSocialCreditCode: '91310000MA1FL0XXXX',
        businessStatus: '存续',
        litigationSummary: [{ caseNumber: '(2024)沪01民终1234号', summary: '合同纠纷，原告胜诉' }],
      }).success,
    ).toBe(true);
  });

  it('rejects a result missing businessStatus', () => {
    expect(
      PartyVerifyDataSchema.safeParse({
        matchedName: '某某有限公司',
        litigationSummary: [],
      }).success,
    ).toBe(false);
  });
});

describe('createMockPartyVerifyAdapter — self-identification', () => {
  it('takes no configuration at all (cannot be influenced by credential presence/absence)', () => {
    expect(createMockPartyVerifyAdapter.length).toBe(0);
  });

  it('declares its identity as exactly "mock" (fixed at construction, not per call)', () => {
    const adapter = createMockPartyVerifyAdapter();
    expect(adapter.sourceId).toBe('mock');
  });

  it('echoes the queried name and credit code into the result', async () => {
    const adapter = createMockPartyVerifyAdapter();
    const data = await adapter.run(
      { name: '某某有限公司', unifiedSocialCreditCode: '91310000MA1FL0XXXX' },
      { signal: new AbortController().signal },
    );
    expect(data.matchedName).toBe('某某有限公司');
    expect(data.unifiedSocialCreditCode).toBe('91310000MA1FL0XXXX');
    expect(data.litigationSummary).toEqual([]);
  });
});

describe('mock service integration — full pipeline through the executor', () => {
  it('produces a verified envelope end to end', async () => {
    const tool = createPartyVerifyTool(createMockPartyVerifyAdapter());
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { name: '张三' });

    expect(result).toEqual({
      verified: true,
      source: 'mock',
      data: {
        matchedName: '张三',
        unifiedSocialCreditCode: undefined,
        businessStatus: '存续',
        litigationSummary: [],
      },
      checkedAt: expect.any(String),
    });
  });

  it('rejects malformed input before ever reaching the adapter', async () => {
    const tool = createPartyVerifyTool(createMockPartyVerifyAdapter());
    const executor = createToolExecutor();

    await expect(executor.execute(tool, { name: '' })).rejects.toThrow(ToolInputValidationError);
  });
});

describe('createQccPartyVerifyAdapter — no implicit fallback to mock', () => {
  it('degrades to not_configured (never a fabricated success) when no credentials are supplied', async () => {
    const tool = createPartyVerifyTool(createQccPartyVerifyAdapter(undefined));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { name: '张三' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('not_configured');
  });

  it('still refuses to fabricate data when apiKey/baseUrl are both configured (skeleton has no real mapping yet)', async () => {
    const tool = createPartyVerifyTool(
      createQccPartyVerifyAdapter({ apiKey: 'test-key', baseUrl: 'https://example.invalid' }),
    );
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { name: '张三' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('not_implemented');
  });
});

/**
 * lookup 是内联的 fake 函数，故意不 import @courtwork/demo-data——本文件测的是
 * "适配器接到一个匹配 PartyFixtureLookup 形状的函数会怎么表现"这个契约本身，
 * 不测某个具体 fixture 库的内容（那是 demo-data 自己的测试范围）。
 */
describe('createDemoFixturePartyVerifyAdapter — injected lookup, no demo-data import', () => {
  const found: PartyVerifyData = {
    matchedName: '上海案示科技有限公司',
    businessStatus: '存续',
    litigationSummary: [],
  };
  const lookup = (input: { name: string }) => (input.name === found.matchedName ? found : undefined);

  it('declares its identity as exactly "demo-fixture" and returns the looked-up record verbatim', async () => {
    const adapter = createDemoFixturePartyVerifyAdapter(lookup);
    const data = await adapter.run({ name: found.matchedName }, { signal: new AbortController().signal });

    expect(adapter.sourceId).toBe('demo-fixture');
    expect(data).toEqual(found);
  });

  it('degrades to out_of_coverage on a library miss end to end (miss ≠ nonexistence)', async () => {
    const tool = createPartyVerifyTool(createDemoFixturePartyVerifyAdapter(lookup));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { name: '完全不存在的某某公司' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('out_of_coverage');
  });

  it('produces a verified envelope end to end on a hit', async () => {
    const tool = createPartyVerifyTool(createDemoFixturePartyVerifyAdapter(lookup));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { name: found.matchedName });

    expect(result.verified).toBe(true);
    if (!result.verified) throw new Error('unreachable');
    expect(result.source).toBe('demo-fixture');
  });
});

describe('the three party-verify adapters never impersonate each other', () => {
  it('mock, demo-fixture, and real-skeleton sources are three distinct, non-overlapping strings', async () => {
    const executor = createToolExecutor();

    const mockResult = await executor.execute(createPartyVerifyTool(createMockPartyVerifyAdapter()), {
      name: '张三',
    });
    const demoResult = await executor.execute(
      createPartyVerifyTool(createDemoFixturePartyVerifyAdapter((input) => (input.name === '张三' ? { matchedName: '张三', businessStatus: '存续', litigationSummary: [] } : undefined))),
      { name: '张三' },
    );

    expect(mockResult.verified).toBe(true);
    expect(demoResult.verified).toBe(true);
    if (!mockResult.verified || !demoResult.verified) throw new Error('unreachable');

    const sources = [mockResult.source, demoResult.source];
    expect(new Set(sources).size).toBe(sources.length);
    expect(sources).toEqual(['mock', 'demo-fixture']);

    // 真实骨架在本环境永远没有凭证/映射，只会走 not_configured/not_implemented，
    // 结构上不可能产出 verified:true，因此也不可能产出任何 source 字符串——
    // 三者之间不存在"谁伪装成谁"的路径。
    const realResult = await executor.execute(createPartyVerifyTool(createQccPartyVerifyAdapter(undefined)), {
      name: '张三',
    });
    expect(realResult.verified).toBe(false);
  });
});

/**
 * 集成烟雾测试，不是单元测试：证明"装配点接线只是一行 lambda"这句 SPEC 承诺成立。
 * @courtwork/demo-data 只在这里、只作为 devDependency 出现——party-verify.ts 本身
 * 从未、也不会 import 它。projectPartyRecord 是这段接线里的投影逻辑（富语料 → 核验
 * 字段子集），按裁决它属于装配点，不属于 tools 或 demo-data 任何一方；这里只是提前
 * 演示装配点将来会长什么样，真正的装配点落在 W6 core。
 */
describe('wired against the real demo-data corpus (integration smoke test)', () => {
  function projectPartyRecord(record: PartyCorpusRecord): PartyVerifyData {
    return {
      matchedName: record.entityName,
      unifiedSocialCreditCode: record.unifiedSocialCreditCode,
      businessStatus: record.registrationStatus,
      litigationSummary:
        record.litigationSummary === '无公开涉诉记录'
          ? []
          : [{ caseNumber: '(2025)云章03民初472号', summary: record.litigationSummary }],
    };
  }

  function corpusLookup(input: PartyVerifyInput): PartyVerifyData | undefined {
    const record = findPartyRecord(input.name);
    return record ? projectPartyRecord(record) : undefined;
  }

  it('a real corpus hit flows through the demo-fixture adapter end to end', async () => {
    const tool = createPartyVerifyTool(createDemoFixturePartyVerifyAdapter(corpusLookup));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { name: '临江精铸科技有限公司' });

    expect(result.verified).toBe(true);
    if (!result.verified) throw new Error('unreachable');
    expect(result.source).toBe('demo-fixture');
    expect(result.data.businessStatus).toBe('存续');
  });

  it('a real manifest-declared coverage gap degrades to out_of_coverage, read from the corpus itself (not a copy-pasted string)', async () => {
    const tool = createPartyVerifyTool(createDemoFixturePartyVerifyAdapter(corpusLookup));
    const executor = createToolExecutor();
    const [realGap] = listPartyOutOfCoverage();
    if (!realGap) throw new Error('corpus declares no out-of-coverage entries; test premise broken');

    const result = await executor.execute(tool, { name: realGap.name });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('out_of_coverage');
  });
});
