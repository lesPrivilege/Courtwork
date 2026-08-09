import { describe, expect, it } from 'vitest';
import { admitPackages, exportPackageJsonSchemas, type VerticalPackageDescriptorV1 } from '@courtwork/registry';
import { LEGAL_PACKAGE, LEGAL_PACKAGE_BINDINGS, LEGAL_PACKAGE_DESCRIPTOR } from './index.js';

/**
 * LEGAL-ANCHOR-BINDING-1（LEGAL-FIVE-FACES-1 D10 裁定的债票）+ LEGAL-ANCHOR-BINDING-2
 * （2026-08-09 裁定一立行）：「无锚不落格；模型出引语，系统出坐标」在
 * `legal.Timeline` / `legal.PartyGraph` / `legal.ReviewMatrix` / `legal.RiskList` /
 * `legal.RevisionInstructionSet` 全族上的机器判据。
 *
 * 本谱是**族门**而非点名单例：判据以「场景 outputArtifacts 中最终 schema 结构上含
 * SourceAnchor 的那一族」定义，成员随包声明增减，门不改一行。BINDING-2 起族内
 * **零未闭环者**——`OPEN_ANCHOR_DEBT` 销记，判据收窄为恒常式「未闭环集恒空」。
 */

const BOUND_TYPE_IDS = [
  'legal.Timeline',
  'legal.PartyGraph',
  'legal.ReviewMatrix',
  'legal.RevisionInstructionSet',
] as const;

const SCHEMA_DOCS = exportPackageJsonSchemas(LEGAL_PACKAGE_DESCRIPTOR, LEGAL_PACKAGE_BINDINGS);

function doc(schemaId: string): string {
  const value = SCHEMA_DOCS.get(schemaId);
  if (value === undefined) throw new Error(`schema doc missing: ${schemaId}`);
  return JSON.stringify(value);
}

/** 结构判据：导出的 Draft 2020-12 文档里出现 SourceAnchor 形状即「该 artifact 携系统坐标」。 */
function carriesAnchor(schemaId: string): boolean {
  return doc(schemaId).includes('"title":"SourceAnchor"');
}

function artifactOf(typeId: string) {
  const artifact = LEGAL_PACKAGE_DESCRIPTOR.artifacts.find((item) => item.typeId === typeId);
  if (artifact === undefined) throw new Error(`artifact missing: ${typeId}`);
  return artifact;
}

/** 模型输出族：场景 outputArtifacts 去重后的闭集（模型真正要出格的那些 artifact）。 */
function modelOutputTypeIds(): string[] {
  return [...new Set(LEGAL_PACKAGE_DESCRIPTOR.scenarios.flatMap((scenario) => scenario.outputArtifacts))].sort();
}

function withMutatedArtifact(
  typeId: string,
  mutate: (artifact: VerticalPackageDescriptorV1['artifacts'][number]) => void,
): VerticalPackageDescriptorV1 {
  const clone = structuredClone(LEGAL_PACKAGE_DESCRIPTOR);
  const artifact = clone.artifacts.find((item) => item.typeId === typeId);
  if (artifact === undefined) throw new Error(`artifact missing: ${typeId}`);
  mutate(artifact);
  return clone;
}

function rejectionIssues(descriptor: VerticalPackageDescriptorV1): string {
  const result = admitPackages([{ ...descriptor, bindings: LEGAL_PACKAGE_BINDINGS }]);
  expect(result.admitted).toHaveLength(0);
  return result.rejected.flatMap((entry) => entry.issues).join('\n');
}

describe('LEGAL-ANCHOR-BINDING-1 · 三枚产物的引用闭环声明', () => {
  it.each(BOUND_TYPE_IDS)('%s 声明 draftSchemaId + citationBinding 且两侧 schema 都闭合到 bindings', (typeId) => {
    const artifact = artifactOf(typeId);
    expect(artifact.draftSchemaId).toBe(`${typeId}Draft`);
    expect(artifact.citationBinding).toBeDefined();
    expect(artifact.citationBinding!.draftField).toBe('quoteClaims');
    expect(artifact.citationBinding!.anchorField).toBe('sourceAnchors');
    expect(artifact.citationBinding!.outOfCoverageField).toBe('outOfCoverage');
    expect(LEGAL_PACKAGE_BINDINGS.schemas.has(artifact.schemaId)).toBe(true);
    expect(LEGAL_PACKAGE_BINDINGS.schemas.has(artifact.draftSchemaId!)).toBe(true);
  });

  it.each(BOUND_TYPE_IDS)('%s 的模型侧草稿结构性无坐标：只出引语，坐标字段不存在', (typeId) => {
    const draftId = `${typeId}Draft`;
    const draft = doc(draftId);
    expect(draft).toContain('"title":"QuoteClaim"');
    // 坐标是裁决性事实：草稿面上连字段都不该有，模型因此机制性失去伪造 offset 的能力。
    expect(draft).not.toContain('"title":"SourceAnchor"');
    for (const coordinateKey of ['textRange', 'textLayerVersion', 'bbox', 'sourceAnchors']) {
      expect(draft, `${draftId} 不得出现坐标字段 ${coordinateKey}`).not.toContain(`"${coordinateKey}"`);
    }
    // 最终形反过来必须携系统坐标与缺口表（铸锚写回点与剪枝落点）。
    expect(carriesAnchor(typeId)).toBe(true);
    expect(doc(typeId)).toContain('"outOfCoverage"');
  });

  it('族门：凡携 SourceAnchor 的模型输出都须声明引用闭环，未闭环集恒空（BINDING-2 起零在册债）', () => {
    const anchored = modelOutputTypeIds().filter((typeId) => carriesAnchor(typeId));
    // 族非空是门有效的前提（空集合与全通过同形）。
    expect(anchored.length).toBeGreaterThanOrEqual(BOUND_TYPE_IDS.length);
    const unclosed = anchored.filter((typeId) => {
      const artifact = artifactOf(typeId);
      return artifact.draftSchemaId === undefined || artifact.citationBinding === undefined;
    });
    // 恒常判据：不再有「在册债」这条豁免缝——新增携锚模型输出不补闭环即红。
    expect(unclosed).toEqual([]);
    for (const typeId of BOUND_TYPE_IDS) expect(anchored).toContain(typeId);
  });

  it('自检：族门的检出谓词有区分力（把 anchor 形状从判据里拿掉即全族落空）', () => {
    const anchored = modelOutputTypeIds().filter((typeId) => doc(typeId).includes('"title":"NotAnAnchor"'));
    expect(anchored).toEqual([]);
  });
});

describe('LEGAL-ANCHOR-BINDING-1 · binding 写错一字即拒载（漂移/伪锚 fail-closed）', () => {
  /**
   * 如实登记（实测得来）：把 `anchorField` 改成**同节点另一枚数组键**（Timeline/PartyGraph 的
   * `markers`）不会被准入拒载——键形轴与同位轴都过。它不是静默洞：resolver 会把锚写进
   * `markers`，最终 `z.array(z.string())` 解析当场硬失败（`GenerationValidationError`），
   * 属显式失败而非无锚落格。准入层的判据到「同位数组键」为止，不核 anchor 元素类型。
   */
  it.each(BOUND_TYPE_IDS)('%s：anchorField 写错一字即拒载（写回点不存在，锚将被 strip 静默吞）', (typeId) => {
    const issues = rejectionIssues(withMutatedArtifact(typeId, (artifact) => {
      artifact.citationBinding!.anchorField = 'sourceAnchor';
    }));
    expect(issues).toContain(typeId);
    expect(issues).toMatch(/anchorField/);
  });

  it.each(BOUND_TYPE_IDS)('%s：draftField 误拼即拒载（resolver 深走只公证数组键，误拼将静默丢引语）', (typeId) => {
    const issues = rejectionIssues(withMutatedArtifact(typeId, (artifact) => {
      artifact.citationBinding!.draftField = 'quoteClaim';
    }));
    expect(issues).toContain('draftField');
  });

  it.each(BOUND_TYPE_IDS)('%s：itemScope 指向非数组即拒载', (typeId) => {
    const issues = rejectionIssues(withMutatedArtifact(typeId, (artifact) => {
      artifact.citationBinding!.itemScope = '/caseId';
    }));
    expect(issues).toContain('itemScope');
  });

  it.each(BOUND_TYPE_IDS)('%s：outOfCoverageField 不在最终根即拒载（缺口条目落根后将被 strip 静默吞）', (typeId) => {
    const issues = rejectionIssues(withMutatedArtifact(typeId, (artifact) => {
      artifact.citationBinding!.outOfCoverageField = 'outOfCoverages';
    }));
    expect(issues).toContain('outOfCoverageField');
  });

  it('自检：未变异的包照常准入（拒载不是恒真）', () => {
    const result = admitPackages([LEGAL_PACKAGE]);
    expect(result.rejected).toEqual([]);
    expect(result.admitted).toHaveLength(1);
  });
});

/**
 * LEGAL-ANCHOR-BINDING-2 · 准入层上收后的族级反例。BINDING-1 时本包全族走
 * `rehydrationProjection` 路径，registry 的引用闭环守卫**结构上照不到**，族门只能立在包内；
 * 上收后同一判据在准入层生效——本节证的正是「门换了住处」：撤掉闭环声明即拒载。
 */
describe('LEGAL-ANCHOR-BINDING-2 · 撤闭环声明即准入拒载（守卫上收的族级反例）', () => {
  it.each(BOUND_TYPE_IDS)('%s：删 draftSchemaId + citationBinding 后不得再作模型输出', (typeId) => {
    const issues = rejectionIssues(withMutatedArtifact(typeId, (artifact) => {
      delete artifact.draftSchemaId;
      delete artifact.citationBinding;
    }));
    expect(issues).toContain(typeId);
    expect(issues).toMatch(/draftSchemaId/);
    expect(issues).toMatch(/citationBinding/);
  });

  it('只删 citationBinding（留着 draftSchemaId）同样拒载——半个闭环不算闭环', () => {
    const issues = rejectionIssues(withMutatedArtifact('legal.RevisionInstructionSet', (artifact) => {
      delete artifact.citationBinding;
    }));
    expect(issues).toContain('legal.RevisionInstructionSet');
    expect(issues).toMatch(/citationBinding/);
  });
});
