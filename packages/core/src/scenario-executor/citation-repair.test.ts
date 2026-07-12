import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import type { ArtifactSchemaRegistry, ScenarioRuntime } from '@courtwork/registry';
import { OutOfCoverageEntrySchema, QuoteClaimSchema, SourceAnchorSchema, type ArtifactDescriptor } from '@courtwork/schemas';
import { createToolExecutor } from '@courtwork/tools';
import { createEventLog } from '../events/event-log.js';
import { createEvidenceLedger } from '../evidence/grade.js';
import { createInMemoryConfirmationStore } from '../session/confirmation-store.js';
import { createInMemoryRevisionEventStore } from '../revision/revision-store.js';
import { createToolRegistry } from '../tools/tool-registry.js';
import { runScenario, type ScenarioExecutorDeps } from './executor.js';

/** 引用闭环的执行器级行为：首过拒收 → 受限修复重试（携原判）→ 终局剪枝入缺口表。 */

const FINAL_SCHEMA = z.object({
  caseId: z.string(),
  items: z.array(
    z.object({
      note: z.string(),
      refs: z.array(z.object({ citation: z.string(), sourceAnchors: z.array(SourceAnchorSchema).min(1) })).min(1),
    }),
  ),
  outOfCoverage: z.array(OutOfCoverageEntrySchema).default([]),
});
const DRAFT_SCHEMA = z.object({
  caseId: z.string(),
  items: z.array(
    z.object({
      note: z.string(),
      refs: z.array(z.object({ citation: z.string(), quoteClaims: z.array(QuoteClaimSchema).min(1) })).min(1),
    }),
  ),
});

const DESCRIPTOR: ArtifactDescriptor = {
  typeId: 'test.Cited',
  title: '引证件',
  schema: FINAL_SCHEMA,
  draftSchema: DRAFT_SCHEMA,
  citationBinding: {
    draftField: 'quoteClaims',
    anchorField: 'sourceAnchors',
    itemScope: '/items',
    itemSummaryField: 'note',
    outOfCoverageField: 'outOfCoverage',
  },
  rehydrationProjection: { ops: [{ kind: 'count', path: '/items', label: '条目' }], rowBudget: 2 },
  uiTemplateId: 'test-panel',
};

const REGISTRY: ArtifactSchemaRegistry = {
  get: (typeId) => (typeId === 'test.Cited' ? { descriptor: DESCRIPTOR, packageId: 'test' } : undefined),
  normalizeTypeId: (v) => v,
  list: () => [],
};

const SCENARIO: ScenarioRuntime = {
  id: 'test.Cite',
  packageId: 'test',
  name: '引证测试场景',
  trigger: { fileTypes: [], userActions: ['x'], classifierTags: [] },
  inputArtifacts: [],
  toolIds: [],
  outputArtifacts: ['test.Cited'],
  uiTemplateId: 'test-panel',
  confirmationPolicy: { mode: 'gates', gates: [{ artifact: 'test.Cited', label: '确认引证件' }] },
  promptBody: '测试正文',
  steps: [{ id: 'produce-test.Cited', title: '产出引证件', artifact: 'test.Cited' }],
};

const MATERIAL = {
  fileId: 'doc.md',
  sha256: 'aa',
  readingMarkdown: '第一条 真实存在的原文句子。',
  blocks: [{ blockId: '0', text: '第一条 真实存在的原文句子。', rangeBase: 0, textLayerVersion: 'source-text@1+ff' }],
};

function draftContent(quote: string, note = '条目一'): string {
  return JSON.stringify({
    target: { stepId: 'produce-test.Cited', artifactType: 'test.Cited' },
    artifact: { caseId: 'c1', items: [{ note, refs: [{ citation: '引一', quoteClaims: [{ fileId: 'doc.md', exactQuote: quote }] }] }] },
  });
}

function buildDeps(responses: string[], capture?: string[]): ScenarioExecutorDeps {
  let call = 0;
  return {
    tools: createToolRegistry(),
    toolExecutor: createToolExecutor(),
    provider: {
      id: 'scripted',
      modelId: 'v1',
      async generate(request) {
        capture?.push(request.messages[request.messages.length - 1]!.content);
        const content = responses[Math.min(call, responses.length - 1)];
        call += 1;
        return { content };
      },
    },
    eventLog: createEventLog('s-cite', () => '2026-07-13T00:00:00.000Z'),
    confirmationStore: createInMemoryConfirmationStore(),
    revisionStore: createInMemoryRevisionEventStore(),
    ledger: createEvidenceLedger(),
    artifacts: REGISTRY,
    projections: { get: (typeId) => REGISTRY.get(typeId)?.descriptor.rehydrationProjection },
  };
}

function producedArtifact(deps: ScenarioExecutorDeps) {
  const event = deps.eventLog.list().find((e) => e.type === 'artifact_produced');
  if (event?.type !== 'artifact_produced') throw new Error('no artifact');
  return event;
}

describe('执行器引用闭环环（受限修复重试 + 终局剪枝）', () => {
  it('首过全收敛：零重试，铸锚落格，stats 全绿', async () => {
    const deps = buildDeps([draftContent('真实存在的原文句子')]);
    await runScenario(SCENARIO, { inputArtifacts: {}, toolInputs: {}, materials: [MATERIAL] }, deps);
    const event = producedArtifact(deps);
    const artifact = event.artifact as { items: { refs: { sourceAnchors: unknown[] }[] }[]; outOfCoverage: unknown[] };
    expect(artifact.items[0].refs[0].sourceAnchors).toHaveLength(1);
    expect(artifact.outOfCoverage).toEqual([]);
    expect(event.citationStats).toEqual({ claims: 1, firstPassResolved: 1, retryRounds: 0, resolvedAfterRetry: 1, outOfCoverage: 0 });
  });

  it('首过拒收 → 重试请求携原判与失败原因 → 修正后收敛', async () => {
    const prompts: string[] = [];
    const deps = buildDeps([draftContent('编造的句子'), draftContent('真实存在的原文句子')], prompts);
    await runScenario(SCENARIO, { inputArtifacts: {}, toolInputs: {}, materials: [MATERIAL] }, deps);
    expect(prompts).toHaveLength(2);
    // 受限修复重试的机器形态：第二次请求携 repair 块（原判 + 拒收理由 + 只修引语指令）。
    expect(prompts[1]).toContain('"repair"');
    expect(prompts[1]).toContain('编造的句子');
    expect(prompts[1]).toContain('not_found');
    expect(prompts[1]).toContain('一字不差');
    const event = producedArtifact(deps);
    expect(event.citationStats).toEqual({ claims: 1, firstPassResolved: 0, retryRounds: 1, resolvedAfterRetry: 1, outOfCoverage: 0 });
  });

  it('重试仍不收敛：条目移入 outOfCoverage，整 artifact 部分成功呈现（诚实 partial）', async () => {
    const deps = buildDeps([draftContent('编造的句子'), draftContent('还是编造的句子')]);
    await runScenario(SCENARIO, { inputArtifacts: {}, toolInputs: {}, materials: [MATERIAL] }, deps);
    const event = producedArtifact(deps);
    const artifact = event.artifact as { items: unknown[]; outOfCoverage: { summary: string; failures: { reason: string }[] }[] };
    expect(artifact.items).toEqual([]);
    expect(artifact.outOfCoverage).toHaveLength(1);
    expect(artifact.outOfCoverage[0].summary).toBe('条目一');
    expect(artifact.outOfCoverage[0].failures[0].reason).toBe('not_found');
    expect(event.citationStats).toMatchObject({ retryRounds: 1, outOfCoverage: 1 });
  });

  it('多义引语拒收携命中次数（块定位收窄的索证信号）', async () => {
    const ambiguousMaterial = {
      ...MATERIAL,
      blocks: [
        { blockId: '0', text: '重复句。', rangeBase: 0, textLayerVersion: 'v' },
        { blockId: '1', text: '重复句。', rangeBase: 10, textLayerVersion: 'v' },
      ],
    };
    const prompts: string[] = [];
    const deps = buildDeps([draftContent('重复句。'), draftContent('重复句。')], prompts);
    await runScenario(SCENARIO, { inputArtifacts: {}, toolInputs: {}, materials: [ambiguousMaterial] }, deps);
    expect(prompts[1]).toContain('ambiguous');
    expect(prompts[1]).toContain('"occurrences":2');
    const event = producedArtifact(deps);
    expect(event.citationStats).toMatchObject({ outOfCoverage: 1 });
  });
});
