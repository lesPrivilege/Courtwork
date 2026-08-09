import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDesktopPackageRuntime } from '../composition/package-runtime.js';
import { ArtifactTabPanes } from './ArtifactTabPanes.js';
import { resolveArtifactSeat } from './workbench-views.js';

/**
 * PREVIEW-TAB-1（ADR-014 决定一）：「多 artifact 并列共存，tab 间切换不销毁彼此状态」。
 *
 * 判据落在**挂载面**而非事件：只渲染活动页签的实现里，切页签就是卸载——被切走那一格的
 * DOM 态（滚动位置、表格横向偏移）随之消失，且事后没有任何断言能把它区分出来。故这里测的是
 * 「两格都在 DOM 里，非活动格只是 `hidden`」；变异成「只渲染活动格」即整组红。
 */
const runtime = createDesktopPackageRuntime();
const mixed = runtime.registriesFor(['legal', 'pm']);

const anchor = (fileId: string, quote: string) => ({ fileId, textRange: { start: 0, end: quote.length }, quote });

const PRD = {
  projectId: 'p-1',
  documentId: 'prd.md',
  findings: [{
    id: 'finding-1',
    section: '3.2',
    clause: '及时送达消息',
    sourceAnchors: [anchor('prd.md', '及时送达消息')],
    defectType: 'vague-metric',
    severity: 'mid',
    issue: '及时没有量化口径',
    suggestion: '补充 P95 时延',
    status: 'pending',
  }],
};
const ACTIONS = {
  projectId: 'p-1',
  items: [{
    id: 'action-1',
    action: '补充推送时延口径',
    owner: '产品负责人',
    due: '2026-07-20',
    sourceAnchors: [anchor('minutes.md', '产品负责人补充口径')],
    markers: ['unclosed'],
    carryOvers: [],
    status: 'open',
  }],
};
const ARTIFACTS: Record<string, unknown> = { 'pm.PrdReview': PRD, 'pm.ActionItems': ACTIONS };

function markup(artifacts: Record<string, unknown>, activeTab: string, matterRegistries = mixed) {
  const seat = resolveArtifactSeat({
    artifacts,
    matterRegistries,
    globalRegistries: runtime.packageRegistries,
    hostRenderers: runtime.hostRenderers,
  });
  return renderToStaticMarkup(createElement(ArtifactTabPanes, {
    seat,
    activeTab,
    payloadFor: (artifactType: string) => artifacts[artifactType],
    matterRegistries,
    hostRenderers: runtime.hostRenderers,
    packageLabelFor: (packageId: string) => runtime.describePackage(packageId)?.displayName ?? packageId,
  }));
}

describe('ArtifactTabPanes：并列产出页签切换不销毁彼此', () => {
  it('两格恒在 DOM，非活动格只是 hidden', () => {
    const onPrd = markup(ARTIFACTS, 'artifact:pm.PrdReview');

    expect(onPrd).toContain('data-testid="artifact-pane-pm.PrdReview"');
    expect(onPrd).toContain('data-testid="artifact-pane-pm.ActionItems"');
    expect(onPrd).toMatch(/data-testid="artifact-pane-pm\.ActionItems"[^>]*hidden/);
    expect(onPrd).not.toMatch(/data-testid="artifact-pane-pm\.PrdReview"[^>]*hidden/);
  });

  it('切换只翻 hidden：两格的集合与各自内容逐字不变', () => {
    const onPrd = markup(ARTIFACTS, 'artifact:pm.PrdReview');
    const onActions = markup(ARTIFACTS, 'artifact:pm.ActionItems');

    expect(onActions).toMatch(/data-testid="artifact-pane-pm\.PrdReview"[^>]*hidden/);
    expect(onActions).not.toMatch(/data-testid="artifact-pane-pm\.ActionItems"[^>]*hidden/);
    // 切走的那一格没有被换成空态，也没有被另一格顶掉。
    for (const html of [onPrd, onActions]) {
      expect(html).toContain('及时没有量化口径');
      expect(html).toContain('补充推送时延口径');
    }
    // 唯一差异就是 hidden 落在哪一格——抹平 hidden 后两次渲染逐字相等。
    const flatten = (html: string) => html.replaceAll(' hidden=""', '');
    expect(flatten(onPrd)).toBe(flatten(onActions));
  });

  it('每格只渲染自己的载荷：邻格载荷不串场', () => {
    const single = markup({ 'pm.PrdReview': PRD }, 'artifact:pm.PrdReview');

    expect(single).toContain('及时没有量化口径');
    expect(single).not.toContain('补充推送时延口径');
  });

  it('包未加载的产出逐枚走显式退化格，标题是产物自己的身份', () => {
    const unloaded = runtime.registriesFor([]);
    const html = markup(
      { 'legal.Timeline': { caseId: 'c1', events: [] }, 'legal.PartyGraph': { caseId: 'c1', nodes: [], edges: [] } },
      'artifact:legal.PartyGraph',
      unloaded,
    );

    expect(html).toContain('data-testid="artifact-pane-legal.Timeline"');
    expect(html).toContain('data-testid="artifact-pane-legal.PartyGraph"');
    expect(html).toContain('事件时间线');
    expect(html).toContain('当事人图谱');
    expect(html).toContain('法律');
    expect(html).not.toContain('legal 包');
  });
});
