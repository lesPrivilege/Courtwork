import { describe, expect, it } from 'vitest';
import { createDesktopPackageRuntime } from '../composition/package-runtime.js';
import { createCourtworkHostRendererRegistry } from './courtwork-host-renderers.js';
import { describeViewProducer } from './view-producer.js';

/**
 * LEGAL-FIVE-FACES-1 · 缺陷 D4 判据：空着的具名工作面必须说出「谁产出它、怎么开始」。
 * 产出者是 registry 派生事实（场景声明 outputArtifacts、artifact 声明 uiTemplateId、
 * 宿主 blueprint 声明 view），壳零垂类字面量。
 */

const runtime = createDesktopPackageRuntime();
const registries = runtime.packageRegistries;
const renderers = createCourtworkHostRendererRegistry();
const LAUNCHABLE = ['legal.S1', 'legal.S2', 'legal.S3'];

describe('describeViewProducer', () => {
  it('时间线面的产出者是「整理卷宗」场景（S1 的 launch 声明）', () => {
    expect(describeViewProducer('timeline', registries, renderers, LAUNCHABLE)).toEqual({
      scenarioId: 'legal.S1',
      launchLabel: '整理卷宗',
    });
  });

  it('关系图谱与时间线同出一枚场景（一场景多产物）', () => {
    expect(describeViewProducer('graph', registries, renderers, LAUNCHABLE)?.scenarioId).toBe('legal.S1');
  });

  it('矩阵审阅面的产出者是 S2', () => {
    expect(describeViewProducer('matrix', registries, renderers, LAUNCHABLE)?.launchLabel).toBe('矩阵审阅');
  });

  it('可启动闭集之外的场景不作为指引（说不出「怎么开始」就不许说）', () => {
    expect(describeViewProducer('matrix', registries, renderers, ['legal.S3'])).toBeUndefined();
  });

  it('未加载垂类时零指引（零 artifact 声明即零产出者）', () => {
    expect(describeViewProducer('timeline', runtime.registriesFor([]), renderers, LAUNCHABLE)).toBeUndefined();
  });
});
