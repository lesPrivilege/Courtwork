import { describe, expect, it } from 'vitest';
import { createDesktopPackageRuntime } from '../composition/package-runtime.js';
import {
  artifactTabId,
  artifactTypeOfTab,
  resolveArtifactSeat,
  resolveWorkbenchViews,
} from './workbench-views.js';

/**
 * PREVIEW-TAB-1（ADR-014 决定一/二）：通用产出席位由「单席位 + 席位内自持产出选择」改为
 * **按已产出 artifact 逐枚开页签**——tab 即一张 schema 表，多产出并列共存。
 *
 * 混包语料取真实两包（legal 具名面 + pm 四枚通用表），不另造 fixture 包：ADR-014 决定二
 * 「混包 tab 栏内不同垂类 artifact 共存靠 namespaced artifact type 天然隔离」，判据必须落在
 * 真的带命名空间的 type 上，否则测的是自造的隔离而不是产品里的那一套。
 */
const runtime = createDesktopPackageRuntime();
const mixed = runtime.registriesFor(['legal', 'pm']);
const unloaded = runtime.registriesFor([]);
const renderers = runtime.hostRenderers;

const seatOf = (artifacts: Record<string, unknown>, matterRegistries = mixed) => resolveArtifactSeat({
  artifacts,
  matterRegistries,
  globalRegistries: runtime.packageRegistries,
  hostRenderers: renderers,
});

/** 载荷内容与页签集判据无关（页签集只由 artifact type 决定），只需可分辨。 */
const payload = (marker: string) => ({ marker });

describe('resolveArtifactSeat：产出席位按 artifact type 逐枚开页签', () => {
  it('多产物并列：每枚产出各得一张页签，标题取自己的 descriptor', () => {
    expect(seatOf({
      'pm.PrdReview': payload('prd'),
      'pm.ActionItems': payload('actions'),
      'pm.PriorityScore': payload('priority'),
    })).toEqual([
      { id: 'artifact:pm.PrdReview', label: '需求文档评审', artifactType: 'pm.PrdReview', status: 'ready' },
      { id: 'artifact:pm.ActionItems', label: '纪要行动项', artifactType: 'pm.ActionItems', status: 'ready' },
      { id: 'artifact:pm.PriorityScore', label: '需求优先级', artifactType: 'pm.PriorityScore', status: 'ready' },
    ]);
  });

  it('单产物回退：只有一枚产出时恰一张页签，不留任何聚合席位', () => {
    const seat = seatOf({ 'pm.PrdReview': payload('prd') });

    expect(seat).toEqual([
      { id: 'artifact:pm.PrdReview', label: '需求文档评审', artifactType: 'pm.PrdReview', status: 'ready' },
    ]);
    expect(resolveWorkbenchViews(mixed, renderers, seat)).toEqual([
      { id: 'timeline', label: '时间线' },
      { id: 'graph', label: '关系图谱' },
      { id: 'matrix', label: '矩阵审阅' },
      { id: 'revision', label: '修订预览' },
      { id: 'draft', label: '起草画布' },
      { id: 'artifact:pm.PrdReview', label: '需求文档评审' },
    ]);
  });

  it('零产物：席位为空，页签条上无任何产出页签', () => {
    expect(seatOf({})).toEqual([]);
    expect(resolveWorkbenchViews(mixed, renderers, []).map((entry) => entry.id))
      .toEqual(['timeline', 'graph', 'matrix', 'revision', 'draft']);
  });

  it('落具名工作面或无面的产出不占产出席位（时间线归自己那张面，卷宗清单是 passive 面）', () => {
    expect(seatOf({
      'legal.Timeline': payload('timeline'),
      'legal.CaseFile': payload('casefile'),
      'pm.PrdReview': payload('prd'),
    }).map((tab) => tab.artifactType)).toEqual(['pm.PrdReview']);
  });

  it('混包命名空间隔离：页签身份是带命名空间的全 type，逐枚回指自己的载荷', () => {
    const artifacts = {
      'legal.Timeline': payload('timeline'),
      'pm.PrdReview': payload('prd'),
      'pm.ActionItems': payload('actions'),
    };
    const seat = seatOf(artifacts);

    // 反例靶心：把页签键换成局部名（`PrdReview`）或换成标题，本条即红——按页签取回的载荷
    // 会变 undefined，而两包同局部名时更会互相顶掉。
    for (const tab of seat) {
      expect(tab.id).toBe(`artifact:${tab.artifactType}`);
      expect(artifactTypeOfTab(tab.id)).toBe(tab.artifactType);
      expect(tab.artifactType).toMatch(/^[a-z]+\./);
      expect(artifacts[tab.artifactType as keyof typeof artifacts]).toBeDefined();
    }
    // 两枚 pm 产出共享同一 `uiTemplateId`（`courtwork.artifact-table.v1`）却各占一张页签：
    // 「多对一席位」退役后，共享模板不再等于共享页签。
    expect(new Set(seat.map((tab) => tab.id)).size).toBe(seat.length);
  });

  it('包未加载的产出仍逐枚在册，带回它的生成方（产物是宿主资产，不随包走）', () => {
    const seat = seatOf({
      'legal.Timeline': payload('timeline'),
      'legal.PartyGraph': payload('graph'),
    }, unloaded);

    expect(seat).toEqual([
      { id: 'artifact:legal.Timeline', label: '事件时间线', artifactType: 'legal.Timeline', status: 'unloaded', packageId: 'legal' },
      { id: 'artifact:legal.PartyGraph', label: '当事人图谱', artifactType: 'legal.PartyGraph', status: 'unloaded', packageId: 'legal' },
    ]);
    // 零泄漏运行时半边不因此松动：具名工作面仍旧一枚不出，页签条上只有通用面与这两枚产出。
    expect(resolveWorkbenchViews(unloaded, renderers, seat).map((entry) => entry.label))
      .toEqual(['起草画布', '事件时间线', '当事人图谱']);
  });

  it('全局也认不出的产出走中性标题，不透出 type id', () => {
    const seat = seatOf({ 'secret.UnknownArtifact': payload('secret') }, unloaded);

    expect(seat).toEqual([
      { id: 'artifact:secret.UnknownArtifact', label: '结构化产出', artifactType: 'secret.UnknownArtifact', status: 'unsupported' },
    ]);
  });

  it('页签 id 与 artifact type 双向可逆；非产出页签不认作产出页签', () => {
    expect(artifactTabId('pm.PrdReview')).toBe('artifact:pm.PrdReview');
    expect(artifactTypeOfTab('artifact:pm.PrdReview')).toBe('pm.PrdReview');
    expect(artifactTypeOfTab('artifact')).toBeUndefined();
    expect(artifactTypeOfTab('timeline')).toBeUndefined();
  });
});
