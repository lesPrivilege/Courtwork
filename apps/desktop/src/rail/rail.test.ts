import { describe, expect, it } from 'vitest';
import type { CaseSummary } from '../case/types';
import {
  buildMixedRailRows,
  canExpandRailRow,
  railIconName,
  showLeadAttorney,
  type UnfiledSession,
} from './types';

const demo: CaseSummary = {
  id: 'demo-linjiang',
  title: '临江精铸',
  fileCount: 20,
  archived: false,
  isDemo: true,
  kind: 'case',
};

const workspace: CaseSummary = {
  id: 'ws-1',
  title: '尽调资料包',
  fileCount: 3,
  archived: false,
  kind: 'workspace',
};

const unfiled: UnfiledSession[] = [
  { id: 'unfiled-1', title: '先聊后建的对话', updatedAt: 1 },
];

describe('rail mixed list (docs/25)', () => {
  it('混排：案件/工作区/未归档同列，Pinned 在上，不分区', () => {
    const rows = buildMixedRailRows([demo, workspace], unfiled, new Set(['demo-linjiang']));
    expect(rows.map((r) => r.id)).toEqual(['demo-linjiang', 'ws-1', 'unfiled-1']);
    expect(rows[0]?.pinned).toBe(true);
    expect(rows.map((r) => r.kind)).toEqual(['case', 'workspace', 'unfiled']);
  });

  it('前置图标按类型：卷宗/文件夹/气泡', () => {
    expect(railIconName('case')).toBe('briefcase-business');
    expect(railIconName('workspace')).toBe('folder-open');
    expect(railIconName('unfiled')).toBe('message-square-text');
  });

  it('仅案件行可 chevron 展开', () => {
    expect(canExpandRailRow('case')).toBe(true);
    expect(canExpandRailRow('workspace')).toBe(false);
    expect(canExpandRailRow('unfiled')).toBe(false);
  });

  it('#17 主办律师仅 demo persona', () => {
    expect(showLeadAttorney(true)).toBe(true);
    expect(showLeadAttorney(false)).toBe(false);
  });
});
