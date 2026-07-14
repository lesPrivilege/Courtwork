import { describe, expect, it } from 'vitest';
import { admitPackages, buildPackageRegistries } from '@courtwork/registry';
import {
  LEGAL_PACKAGE,
  LEGAL_PACKAGE_BINDINGS,
  LEGAL_PACKAGE_DESCRIPTOR,
} from './manifest.js';

describe('LEGAL_PACKAGE（法律包准入自证：迁包后包必须过自己要过的门）', () => {
  const result = admitPackages([LEGAL_PACKAGE]);

  it('准入零拒载（引用闭合/命名空间/词表完备性全过）', () => {
    expect(result.rejected).toEqual([]);
    expect(result.admitted).toHaveLength(1);
  });

  it('descriptor 是纯 JSON，runtime Zod 只存在 bindings plane', () => {
    const serialized = JSON.stringify(LEGAL_PACKAGE_DESCRIPTOR);
    const snapshot = JSON.parse(serialized) as Record<string, unknown>;

    expect(snapshot).toEqual(LEGAL_PACKAGE_DESCRIPTOR);
    expect(serialized).not.toContain('Zod');
    expect(serialized).not.toContain('"schema"');
    expect([...LEGAL_PACKAGE_BINDINGS.schemas.keys()]).toEqual([
      'legal.CaseFile',
      'legal.Timeline',
      'legal.PartyGraph',
      'legal.RiskList',
      'legal.RiskListDraft',
      'legal.ReviewMatrix',
      'legal.RevisionInstructionSet',
      'legal.FileOpsPlan',
    ]);
  });

  it('准入快照递归深冻结，源 descriptor 后改不能污染运行 registries', () => {
    const admitted = result.admitted[0]!;
    expect(Object.isFrozen(admitted)).toBe(true);
    expect(Object.isFrozen(admitted.artifacts)).toBe(true);
    expect(Object.isFrozen(admitted.artifacts[0]!.rehydrationProjection.ops)).toBe(true);
    expect(() => {
      (admitted.artifacts[0] as { title: string }).title = '篡改';
    }).toThrow(TypeError);
  });

  it('renderer 声明齐备：零渲染兜底警告', () => {
    expect(result.warnings).toEqual([]);
  });

  const registries = buildPackageRegistries(result.admitted);

  it('五场景全部注册且 promptBody 闭合非空', () => {
    const ids = registries.scenarios.list().map((s) => s.id).sort();
    expect(ids).toEqual(['legal.S1', 'legal.S2', 'legal.S3', 'legal.S4', 'legal.S6']);
    for (const scenario of registries.scenarios.list()) {
      expect(scenario.promptBody.length).toBeGreaterThan(10);
    }
  });

  it('S3 声明级正文携审查要求与引语纪律（LEGAL-REAL：声明级正文非 ref 裸串）', () => {
    const s3 = registries.scenarios.get('legal.S3');
    expect(s3?.promptBody).toContain('一字不差');
    expect(s3?.promptBody).toContain('pending');
    expect(s3?.steps.map((step) => step.id)).toEqual(['verify-parties', 'produce-risk-list']);
  });

  it('七 artifact descriptor 全部可查且投影就绪', () => {
    for (const typeId of [
      'legal.CaseFile',
      'legal.Timeline',
      'legal.PartyGraph',
      'legal.RiskList',
      'legal.ReviewMatrix',
      'legal.RevisionInstructionSet',
      'legal.FileOpsPlan',
    ]) {
      const entry = registries.artifactSchemas.get(typeId);
      expect(entry, typeId).toBeDefined();
      expect(registries.projections.get(typeId)?.rowBudget).toBeGreaterThan(0);
    }
  });

  it('副作用类 artifact 如实声明（修订指令集/整理计划 = file_write）', () => {
    expect(registries.artifactSchemas.get('legal.RevisionInstructionSet')?.descriptor.sideEffect).toBe('file_write');
    expect(registries.artifactSchemas.get('legal.FileOpsPlan')?.descriptor.sideEffect).toBe('file_write');
  });

  it('账本读侧别名：七个旧裸类型名全部归一', () => {
    for (const [legacy, target] of Object.entries({
      CaseFile: 'legal.CaseFile',
      RiskList: 'legal.RiskList',
      FileOpsPlan: 'legal.FileOpsPlan',
    })) {
      expect(registries.artifactSchemas.normalizeTypeId(legacy)).toBe(target);
    }
  });

  it('容器词表：卷宗语义住包', () => {
    expect(registries.vocabulary.lookup('legal', 'container.noun')).toBe('卷宗');
  });

  it('受控交互模板内容住 legal，至少覆盖无锚选择与 required 锚点确认', () => {
    expect(LEGAL_PACKAGE.interactionTemplates?.map((template) => template.id)).toEqual([
      'legal.contract-review-position',
      'legal.risk-evidence-confirmation',
    ]);

    const position = registries.interactionTemplates.get('legal', 'legal.contract-review-position');
    expect(position).toMatchObject({
      kind: 'single_choice',
      anchorPolicy: 'none',
      uiTemplateId: 'question-card',
      skippable: false,
    });
    expect(position?.question).toContain('哪一方立场');
    expect(position?.options.map((option) => option.id)).toEqual(['buyer', 'seller', 'balanced']);

    const evidence = registries.interactionTemplates.get('legal', 'legal.risk-evidence-confirmation');
    expect(evidence).toMatchObject({
      kind: 'confirmation',
      anchorPolicy: 'required',
      uiTemplateId: 'question-card',
      skippable: false,
    });
    expect(evidence?.question).toContain('回到原文');
    expect(evidence?.options.map((option) => option.id)).toEqual(['confirm', 'revise']);
  });
});
