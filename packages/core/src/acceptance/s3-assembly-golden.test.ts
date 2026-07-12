import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDemoS3Runtime } from '../composition/demo-assembly.js';
import { assembleScenarioRequest } from '../assembly/assemble.js';
import { deriveTodoSnapshot } from '../scenario-executor/todo-snapshot.js';

/**
 * legal.S3 六段组装 golden（HARNESS-1 放行标准之 byte-stable golden）：
 * 真 legal manifest + 固定材料夹具 → 全六段 + wire 逐字节对照。
 * 变异必红由 assemble.test.ts 的正交断言与本 golden 共同承担——
 * 任何段的来源改动（契约常量/包正文/投影声明/词表标题）都会在此现形。
 */

const GOLDEN_PATH = join(import.meta.dirname, '__golden__', 's3-assembly.golden.txt');

const FIXTURE_MATERIAL = {
  fileId: '设备采购合同.pdf',
  sha256: 'fixture-sha256-0001',
  readingMarkdown: ['第 1 / 2 页', '设备采购合同（虚构样板案测试素材）', '第九条 乙方逾期支付任何一期款项的，每逾期一日应按未付金额的1%向甲方支付违约金。'].join('\n'),
};

function renderS3Wire(): string {
  const runtime = buildDemoS3Runtime();
  const scenario = runtime.registries.scenarios.get('legal.S3');
  if (!scenario) throw new Error('legal.S3 缺席');
  const entry = runtime.registries.artifactSchemas.get('legal.RiskList');
  if (!entry) throw new Error('legal.RiskList 缺席');

  const { segments, request } = assembleScenarioRequest({
    scenario,
    stepId: 'produce-risk-list',
    artifactType: 'legal.RiskList',
    modelSchema: entry.descriptor.draftSchema ?? entry.descriptor.schema,
    projection: { ledgerSeq: 0, artifacts: {}, pendingGateLabels: [] },
    materials: [FIXTURE_MATERIAL],
    taskInstruction: JSON.stringify({ artifactType: 'legal.RiskList', inputArtifacts: {}, toolResults: {} }),
    todo: deriveTodoSnapshot(scenario, {}),
    registries: { projections: runtime.registries.projections, artifacts: runtime.registries.artifactSchemas },
  });

  return [
    '=== SEGMENTS ===',
    ...segments.map((s) => `--- ${s.id} ---\n${s.body}`),
    '=== WIRE systemPrompt ===',
    request.systemPrompt ?? '(none)',
    '=== WIRE messages ===',
    ...request.messages.map((m) => `[${m.role}]\n${m.content}`),
    '',
  ].join('\n');
}

describe('legal.S3 六段组装 golden', () => {
  it('byte-stable：两次组装逐字节相同', () => {
    expect(renderS3Wire()).toBe(renderS3Wire());
  });

  it('golden 对照（COURTWORK_UPDATE_GOLDEN=1 重铸；DIFF 即红）', () => {
    const rendered = renderS3Wire();
    if (process.env.COURTWORK_UPDATE_GOLDEN === '1') {
      writeFileSync(GOLDEN_PATH, rendered, 'utf-8');
    }
    expect(rendered).toBe(readFileSync(GOLDEN_PATH, 'utf-8'));
  });

  it('声明级正文在 wire（非 ref 裸串）；材料在边界内；步骤树对齐声明', () => {
    const wire = renderS3Wire();
    expect(wire).toContain('一字不差');
    expect(wire).not.toContain('contract-review-v0');
    expect(wire).toContain('<<<材料:开始 fileId=设备采购合同.pdf sha256=fixture-sha256-0001>>>');
    expect(wire).toContain('[verify-parties] 核验合同主体');
    expect(wire).toContain('[produce-risk-list] 产出风险清单');
    expect(wire).toContain('{"stepId":"produce-risk-list","artifactType":"legal.RiskList"}');
  });
});
