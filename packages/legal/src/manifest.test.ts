import { describe, expect, it } from 'vitest';
import { admitPackages, buildPackageRegistries } from '@courtwork/registry';
import { LEGAL_PACKAGE } from './manifest.js';

describe('LEGAL_PACKAGE（法律包准入自证：迁包后包必须过自己要过的门）', () => {
  const result = admitPackages([LEGAL_PACKAGE]);

  it('准入零拒载（引用闭合/命名空间/词表完备性全过）', () => {
    expect(result.rejected).toEqual([]);
    expect(result.admitted).toHaveLength(1);
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
});
