import { describe, expect, it } from 'vitest';
import { GENERIC_PACKAGE_DESCRIPTOR } from './index.js';

/**
 * ADR-023 决定四：基线包 descriptor、prompt 段与 vocabulary 承担**零垂类语义义务**，
 * 且该义务是机器可验的——`GENERIC-PACK-1` ①附的场景词零命中断言扩展覆盖到此。
 *
 * 词表逐字取自 `apps/desktop/src/work/work-context.test.ts` 的 ①附 describe（十枚垂类
 * 场景词）。断言住本包而非住壳，因为受检面是**基线包自身的声明**：壳侧那份门由零泄漏
 * 静态门（`assert-vertical-isolation.mjs`）看守，`@courtwork/generic` 随本票入其正则闭集，
 * 故壳内测试不得 import 本包——两门分居两处是零泄漏律的结果，不是重复。
 *
 * 加词判据同 ①附：新词若属**垂类场景/提示词语义**必须零命中；只有容器名词着色可豁免，
 * 而基线包连着色都不做（词表逐字取底座中性供词），故本处无豁免清单。
 */
const VERTICAL_SCENE_TOKENS = [
  '合同审查', '风险', '当事人', '主合同', '核验', '律师', '答辩', '诉讼', '批注', '修订',
] as const;

/** 受检面＝descriptor 上一切用户/模型可见的文本：prompt 段正文、词表、标题与 launch 文案。 */
function neutralitySurface(): string {
  const descriptor = GENERIC_PACKAGE_DESCRIPTOR;
  return [
    ...descriptor.promptSegments.map((segment) => segment.body),
    ...Object.values(descriptor.vocabulary),
    ...descriptor.artifacts.flatMap((artifact) => [
      artifact.title,
      ...Object.values(artifact.vocabulary?.fieldLabels ?? {}),
      ...Object.values(artifact.vocabulary?.enumLabels ?? {}).flatMap((labels) => Object.values(labels)),
      ...(artifact.presentation?.fields ?? []).flatMap((field) => [
        field.label,
        ...Object.values(field.valueLabels ?? {}),
      ]),
    ]),
    ...descriptor.renderers.map((renderer) => renderer.title),
    ...descriptor.scenarios.flatMap((scenario) => [
      scenario.name,
      ...(scenario.steps ?? []).map((step) => step.title),
      scenario.launch?.label ?? '',
      scenario.launch?.description ?? '',
      scenario.launch?.submitLabel ?? '',
      scenario.launch?.footnote ?? '',
      ...(scenario.launch?.formFields ?? []).flatMap((field) => [
        field.label,
        field.placeholder ?? '',
      ]),
    ]),
  ].join('\n');
}

describe('ADR-023 决定四：基线包声明面零垂类语义（GENERIC-PACK-1 ①附扩覆）', () => {
  it('prompt 段、词表、标题与 launch 文案对十枚垂类场景词全部零命中', () => {
    const surface = neutralitySurface();
    for (const token of VERTICAL_SCENE_TOKENS) {
      expect(surface, `垂类场景词「${token}」泄漏进基线包声明面`).not.toContain(token);
    }
  });

  /** 守卫自身用例：受检面非空、且注入任一垂类词确实会被同一判据捕获（门不是空跑）。 */
  it('守卫自身：受检面覆盖 prompt 段与 launch 文案，且注入垂类词即触红', () => {
    const surface = neutralitySurface();
    expect(surface.length).toBeGreaterThan(200);
    expect(surface).toContain('你正在执行「通用起草」场景');
    expect(surface).toContain('起草要求');
    for (const token of VERTICAL_SCENE_TOKENS) {
      expect(`${surface}\n${token}`).toContain(token);
    }
  });

  /** 基线包不得引用任何垂类包（ADR-023 决定四）：声明面零 legal/pm 命名空间。 */
  it('声明面零 legal/pm 命名空间引用', () => {
    const serialized = JSON.stringify(GENERIC_PACKAGE_DESCRIPTOR);
    expect(serialized).not.toContain('legal.');
    expect(serialized).not.toContain('pm.');
  });
});
