import { describe, expect, it } from 'vitest';
import type { StoredMaterial } from '../material/material-ref';
import { DEMO_CASE_ID } from './case-scope';
import {
  UNRESOLVED_MATERIAL_COUNT,
  materialCountBadge,
  materialCountLabel,
  materialCountOf,
  selectMaterialCount,
} from './material-count';

function material(id: string): StoredMaterial {
  return {
    materialId: id,
    caseId: 'case-1',
    fileName: `${id}.md`,
    mediaType: 'text/markdown',
    byteLength: 4,
    contentSha256: 'sha',
    readingViewVersion: 'reading-view-material@1',
    readingViewSha256: 'rsha',
    readingMarkdown: '正文',
    blocks: [],
    status: 'ready',
  };
}

describe('DEBT-DOSSIER-1 件二 · 计数三态（未读取 ≠ 0 件）', () => {
  it('尚未派生 → 未读取；绝不伪造 0', () => {
    expect(materialCountOf(undefined)).toEqual(UNRESOLVED_MATERIAL_COUNT);
    expect(materialCountOf(undefined)).not.toEqual({ status: 'resolved', count: 0 });
  });

  it('已派生的空列表 → 确凿的 0 件（与「未读取」是两回事）', () => {
    expect(materialCountOf([])).toEqual({ status: 'resolved', count: 0 });
  });

  it('已派生 → 件数即列表长度（不另计、不自增）', () => {
    expect(materialCountOf([material('a'), material('b')])).toEqual({ status: 'resolved', count: 2 });
  });
});

describe('DEBT-DOSSIER-1 件二 · demo 固定计数与 production 派生物理分流', () => {
  it('样板案取内置内容包常量——production 派生表里放什么都不看', () => {
    const poisoned = { [DEMO_CASE_ID]: [material('a'), material('b'), material('c')] };
    expect(selectMaterialCount({ id: DEMO_CASE_ID, isDemo: true }, poisoned)).toEqual({ status: 'resolved', count: 20 });
    expect(selectMaterialCount({ id: DEMO_CASE_ID, isDemo: true }, {})).toEqual({ status: 'resolved', count: 20 });
  });

  it('真实案只认 listForCase 派生的那一份；未派生即未读取', () => {
    expect(selectMaterialCount({ id: 'case-1' }, { 'case-1': [material('a')] })).toEqual({ status: 'resolved', count: 1 });
    expect(selectMaterialCount({ id: 'case-1' }, {})).toEqual(UNRESOLVED_MATERIAL_COUNT);
  });

  it('切案竞态：派生表按 caseId 取用，甲案的清单不会算到乙案头上', () => {
    const derived = { 'case-a': [material('a'), material('b')], 'case-b': [] };
    expect(selectMaterialCount({ id: 'case-a' }, derived)).toEqual({ status: 'resolved', count: 2 });
    expect(selectMaterialCount({ id: 'case-b' }, derived)).toEqual({ status: 'resolved', count: 0 });
    expect(selectMaterialCount({ id: 'case-c' }, derived)).toEqual(UNRESOLVED_MATERIAL_COUNT);
  });
});

describe('DEBT-DOSSIER-1 件二 · 三态文案（容器双词表照旧）', () => {
  it('已读取沿用既有件数句式，案件说卷宗、工作区说资料', () => {
    expect(materialCountLabel('case', { status: 'resolved', count: 20 })).toBe('卷宗 20 件');
    expect(materialCountLabel('workspace', { status: 'resolved', count: 3 })).toBe('资料 3 件');
  });

  it('未读取如实说未读取，不显示 0 件', () => {
    expect(materialCountLabel('case', UNRESOLVED_MATERIAL_COUNT)).toBe('卷宗 件数未读取');
    expect(materialCountLabel('workspace', UNRESOLVED_MATERIAL_COUNT)).toBe('资料 件数未读取');
  });

  it('模块头计数徽标：未读取给破折号，不给 0', () => {
    expect(materialCountBadge({ status: 'resolved', count: 7 })).toBe('7');
    expect(materialCountBadge({ status: 'resolved', count: 0 })).toBe('0');
    expect(materialCountBadge(UNRESOLVED_MATERIAL_COUNT)).toBe('—');
  });
});
