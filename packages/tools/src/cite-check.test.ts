import { describe, expect, it } from 'vitest';
import { findStatuteCitation, type EffectiveStatuteCitation, type RepealedStatuteCitation } from '@courtwork/demo-data';
import { createToolExecutor, ToolInputValidationError } from './contract.js';
import {
  CiteCheckDataSchema,
  CiteCheckInputSchema,
  createCiteCheckTool,
  createDemoFixtureCiteCheckAdapter,
  createMockCiteCheckAdapter,
  createPublicLawDbCiteCheckAdapter,
  type CiteCheckData,
  type CiteCheckInput,
} from './cite-check.js';

describe('CiteCheckInputSchema', () => {
  it('accepts a statute citation', () => {
    expect(
      CiteCheckInputSchema.safeParse({ citationText: '《中华人民共和国民法典》第一百四十三条', citationType: 'statute' })
        .success,
    ).toBe(true);
  });

  it('accepts a case citation', () => {
    expect(
      CiteCheckInputSchema.safeParse({ citationText: '(2021)京01民终1234号', citationType: 'case' }).success,
    ).toBe(true);
  });

  it('rejects an empty citation text', () => {
    expect(CiteCheckInputSchema.safeParse({ citationText: '', citationType: 'statute' }).success).toBe(false);
  });

  it('accepts an open, domain-owned citationType instead of imposing a legal enum', () => {
    expect(
      CiteCheckInputSchema.safeParse({ citationText: '控制标准 CS-42', citationType: 'project_standard' }).success,
    ).toBe(true);
  });

  it('still rejects an empty citationType', () => {
    expect(CiteCheckInputSchema.safeParse({ citationText: '控制标准 CS-42', citationType: '' }).success).toBe(false);
  });
});

describe('CiteCheckDataSchema', () => {
  it('accepts a fully populated statute result', () => {
    expect(
      CiteCheckDataSchema.safeParse({
        citationType: 'statute',
        normalizedCitation: '《中华人民共和国民法典》第一百四十三条',
        exists: true,
        currentlyValid: true,
      }).success,
    ).toBe(true);
  });

  it('accepts currentlyValid: null for citations where validity is not a meaningful concept', () => {
    expect(
      CiteCheckDataSchema.safeParse({
        citationType: 'case',
        normalizedCitation: '(2021)京01民终1234号',
        exists: true,
        currentlyValid: null,
      }).success,
    ).toBe(true);
  });

  it('rejects a result missing exists', () => {
    expect(
      CiteCheckDataSchema.safeParse({
        citationType: 'statute',
        normalizedCitation: '某某条',
        currentlyValid: true,
      }).success,
    ).toBe(false);
  });
});

describe('createMockCiteCheckAdapter — self-identification', () => {
  it('takes no configuration at all (cannot be influenced by credential presence/absence)', () => {
    expect(createMockCiteCheckAdapter.length).toBe(0);
  });

  it('declares its identity as exactly "mock" (fixed at construction, not per call)', () => {
    const adapter = createMockCiteCheckAdapter();
    expect(adapter.sourceId).toBe('mock');
  });

  it('echoes citationType and normalizes the citation text', async () => {
    const adapter = createMockCiteCheckAdapter();
    const data = await adapter.run(
      { citationText: '(2021)京01民终1234号', citationType: 'case' },
      { signal: new AbortController().signal },
    );
    expect(data.citationType).toBe('case');
    expect(data.normalizedCitation).toBe('(2021)京01民终1234号');
  });
});

describe('mock service integration — full pipeline through the executor', () => {
  it('produces a verified envelope end to end', async () => {
    const tool = createCiteCheckTool(createMockCiteCheckAdapter());
    const executor = createToolExecutor();

    const result = await executor.execute(tool, {
      citationText: '《中华人民共和国民法典》第一百四十三条',
      citationType: 'statute',
    });

    expect(result.verified).toBe(true);
    if (!result.verified) throw new Error('unreachable');
    expect(result.source).toBe('mock');
    expect(result.data.exists).toBe(true);
  });

  it('rejects malformed input before ever reaching the adapter', async () => {
    const tool = createCiteCheckTool(createMockCiteCheckAdapter());
    const executor = createToolExecutor();

    await expect(executor.execute(tool, { citationText: '', citationType: 'statute' })).rejects.toThrow(
      ToolInputValidationError,
    );
  });
});

describe('createPublicLawDbCiteCheckAdapter — no implicit fallback to mock', () => {
  it('degrades to not_configured (never a fabricated success) when no baseUrl is supplied', async () => {
    const tool = createCiteCheckTool(createPublicLawDbCiteCheckAdapter(undefined));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { citationText: '某某条', citationType: 'statute' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('not_configured');
  });

  it('still refuses to fabricate data when baseUrl is configured (skeleton has no real mapping yet)', async () => {
    const tool = createCiteCheckTool(createPublicLawDbCiteCheckAdapter({ baseUrl: 'https://example.invalid' }));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { citationText: '某某条', citationType: 'statute' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('not_implemented');
  });
});

/**
 * lookup 是内联的 fake 函数，故意不 import @courtwork/demo-data，理由同 party-verify.test.ts。
 */
describe('createDemoFixtureCiteCheckAdapter — injected lookup, no demo-data import', () => {
  const found: CiteCheckData = {
    citationType: 'statute',
    normalizedCitation: '《中华人民共和国民法典》第一百四十三条',
    exists: true,
    currentlyValid: true,
    notes: '演示：民事法律行为有效要件',
  };
  const lookup = (input: CiteCheckInput) =>
    input.citationText === found.normalizedCitation && input.citationType === found.citationType ? found : undefined;

  it('declares its identity as exactly "demo-fixture" and returns the looked-up record verbatim', async () => {
    const adapter = createDemoFixtureCiteCheckAdapter(lookup);
    const data = await adapter.run(
      { citationText: found.normalizedCitation, citationType: found.citationType },
      { signal: new AbortController().signal },
    );

    expect(adapter.sourceId).toBe('demo-fixture');
    expect(data).toEqual(found);
  });

  it('degrades to out_of_coverage on a library miss end to end (miss ≠ nonexistence)', async () => {
    const tool = createCiteCheckTool(createDemoFixtureCiteCheckAdapter(lookup));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { citationText: '《不存在的法典》第一条', citationType: 'statute' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('out_of_coverage');
  });

  it('produces a verified envelope end to end on a hit', async () => {
    const tool = createCiteCheckTool(createDemoFixtureCiteCheckAdapter(lookup));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, {
      citationText: found.normalizedCitation,
      citationType: found.citationType,
    });

    expect(result.verified).toBe(true);
    if (!result.verified) throw new Error('unreachable');
    expect(result.source).toBe('demo-fixture');
  });
});

describe('the three cite-check adapters never impersonate each other', () => {
  it('mock, demo-fixture, and real-skeleton sources are three distinct, non-overlapping strings, even sharing one cache', async () => {
    const executor = createToolExecutor();
    const input = { citationText: '某某条', citationType: 'statute' as const };

    const mockResult = await executor.execute(createCiteCheckTool(createMockCiteCheckAdapter()), input);
    const demoResult = await executor.execute(
      createCiteCheckTool(
        createDemoFixtureCiteCheckAdapter((i) =>
          i.citationText === input.citationText
            ? { citationType: 'statute', normalizedCitation: i.citationText, exists: true, currentlyValid: true }
            : undefined,
        ),
      ),
      input,
    );

    expect(mockResult.verified).toBe(true);
    expect(demoResult.verified).toBe(true);
    if (!mockResult.verified || !demoResult.verified) throw new Error('unreachable');

    const sources = [mockResult.source, demoResult.source];
    expect(new Set(sources).size).toBe(sources.length);
    expect(sources).toEqual(['mock', 'demo-fixture']);

    const realResult = await executor.execute(createCiteCheckTool(createPublicLawDbCiteCheckAdapter(undefined)), input);
    expect(realResult.verified).toBe(false);
  });
});

/**
 * 集成烟雾测试，不是单元测试——理由同 party-verify.test.ts 对应小节。
 * @courtwork/demo-data 只在这里以 devDependency 身份出现，cite-check.ts 本身不 import 它。
 */
describe('wired against the real demo-data corpus (integration smoke test)', () => {
  function projectStatuteRecord(record: EffectiveStatuteCitation | RepealedStatuteCitation): CiteCheckData {
    return {
      citationType: 'statute',
      normalizedCitation: `《${record.law}》${record.article}`,
      exists: true,
      currentlyValid: record.status === 'effective',
      notes: record.text,
    };
  }

  /** 期望引用文本形如"《法律名》第X条"，解析失败视为库未收录该写法。 */
  function corpusLookup(input: CiteCheckInput): CiteCheckData | undefined {
    if (input.citationType !== 'statute') return undefined;
    const match = /^《(.+)》(.+)$/.exec(input.citationText);
    if (!match) return undefined;
    const [, law, article] = match;
    const record = findStatuteCitation(law, article);
    return record ? projectStatuteRecord(record) : undefined;
  }

  it('a real effective statute flows through the demo-fixture adapter end to end', async () => {
    const tool = createCiteCheckTool(createDemoFixtureCiteCheckAdapter(corpusLookup));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, {
      citationText: '《中华人民共和国民法典》第一百四十三条',
      citationType: 'statute',
    });

    expect(result.verified).toBe(true);
    if (!result.verified) throw new Error('unreachable');
    expect(result.source).toBe('demo-fixture');
    expect(result.data.currentlyValid).toBe(true);
  });

  it('a real repealed statute is reported as currentlyValid: false, not silently treated as still good law', async () => {
    const tool = createCiteCheckTool(createDemoFixtureCiteCheckAdapter(corpusLookup));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, {
      citationText: '《中华人民共和国合同法（已失效）》第一百零七条',
      citationType: 'statute',
    });

    expect(result.verified).toBe(true);
    if (!result.verified) throw new Error('unreachable');
    expect(result.data.currentlyValid).toBe(false);
  });

  it('a citation absent from the real corpus degrades to out_of_coverage', async () => {
    const tool = createCiteCheckTool(createDemoFixtureCiteCheckAdapter(corpusLookup));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, {
      citationText: '《不存在的法典》第一条',
      citationType: 'statute',
    });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('out_of_coverage');
  });
});
