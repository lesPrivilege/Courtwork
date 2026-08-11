// TOOL-READ-1 裁定二（白名单声明形制）与红证义务三（ADR-009 步骤闭集不扩）的准入侧机器门。
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PackageScenarioSchema, ScenarioStepSchema } from './package-manifest.js';
import { buildPackageRegistries } from './package-registries.js';
import type { VerticalPackageManifest } from './package-manifest.js';
import * as z from 'zod';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');

function scenarioInput(extra: Record<string, unknown> = {}) {
  return {
    id: 'demo.T1',
    name: '工具请求樁',
    trigger: { userActions: ['start'] },
    inputArtifacts: [],
    toolIds: [],
    outputArtifacts: ['demo.Note'],
    uiTemplateId: 'demo.panel',
    confirmationPolicy: { mode: 'none' },
    promptSegmentRef: 'demo.body',
    ...extra,
  };
}

describe('requestableToolIds 声明形制（TOOL-READ-1 裁定二）', () => {
  it('缺席＝零可请求工具——既有场景声明一个字都不改，模型看不到任何可请求工具', () => {
    const parsed = PackageScenarioSchema.parse(scenarioInput());
    expect(parsed.requestableToolIds).toBeUndefined();
  });

  it('接受显式声明并原样冻结进 ScenarioRuntime', () => {
    const parsed = PackageScenarioSchema.parse(scenarioInput({ requestableToolIds: ['material-read', 'dossier-list'] }));
    expect(parsed.requestableToolIds).toEqual(['material-read', 'dossier-list']);
  });

  it('清单内重复工具 id 被准入拒收（比照 toolIds 去重律）', () => {
    const result = PackageScenarioSchema.safeParse(scenarioInput({ requestableToolIds: ['material-read', 'material-read'] }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === 'requestableToolIds')).toBe(true);
    }
  });

  it('空串工具 id 被准入拒收', () => {
    expect(PackageScenarioSchema.safeParse(scenarioInput({ requestableToolIds: [''] })).success).toBe(false);
  });

  it('registry 装配把声明搬进 ScenarioRuntime（executor 只见运行时形状）', () => {
    const manifest = {
      abiVersion: 1,
      identity: { packageId: 'demo', version: '1.0.0', namespaces: ['demo'] },
      artifacts: [],
      scenarios: [PackageScenarioSchema.parse(scenarioInput({ requestableToolIds: ['dossier-list'] }))],
      promptSegments: [{ id: 'demo.body', body: '正文' }],
      renderers: [],
      vocabulary: {},
      bindings: { schemas: new Map<string, z.ZodType>() },
    } as unknown as VerticalPackageManifest;
    const registries = buildPackageRegistries([manifest]);
    expect(registries.scenarios.get('demo.T1')?.requestableToolIds).toEqual(['dossier-list']);
  });
});

describe('ADR-009 决定二 Work 步骤闭集不扩（TOOL-READ-1 红证义务三 · 声明面）', () => {
  const CLOSURE = 'model | deterministic_tool | interaction | projection | confirmation';

  it('ADR-009 的步骤闭集逐字未变——request_tool 不得偷渡成第六种步', () => {
    const adr = readFileSync(resolve(REPO_ROOT, 'docs/decisions/ADR-009-runtime-ports-and-harness.md'), 'utf8');
    expect(adr).toContain(`\`\`\`text\n${CLOSURE}\n\`\`\``);
  });

  it('场景步声明不接受任何步骤种类键——闭集只能改 ADR 与本门，不能靠 descriptor 悄悄开新种', () => {
    expect(ScenarioStepSchema.safeParse({ id: 's', title: 't', kind: 'request_tool' }).success).toBe(false);
    expect(ScenarioStepSchema.safeParse({ id: 's', title: 't', stepKind: 'deterministic_tool' }).success).toBe(false);
  });
});
