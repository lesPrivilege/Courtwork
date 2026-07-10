import type { ContainerKind } from '../case/container-copy';
import type { CaseSummary } from '../case/types';

/** 左栏混排行类型（docs/25 修正 + docs/49 五章） */
export type RailRowKind = 'case' | 'workspace' | 'unfiled';

export interface UnfiledSession {
  id: string;
  title: string;
  /** 最近活跃时间戳，混排排序用 */
  updatedAt: number;
}

export interface RailRow {
  id: string;
  kind: RailRowKind;
  title: string;
  pinned: boolean;
  /** 案件/工作区容器；未归档对话无 */
  caseSummary?: CaseSummary;
  unfiled?: UnfiledSession;
}

export function containerRowKind(summary: CaseSummary): RailRowKind {
  return summary.kind === 'workspace' ? 'workspace' : 'case';
}

/** Pinned 在上，其余按 updatedAt/顺序时序；不分区（docs/25） */
export function buildMixedRailRows(
  cases: CaseSummary[],
  unfiled: UnfiledSession[],
  pinnedIds: ReadonlySet<string>,
): RailRow[] {
  const caseRows: RailRow[] = cases.map((item) => ({
    id: item.id,
    kind: containerRowKind(item),
    title: item.title,
    pinned: pinnedIds.has(item.id),
    caseSummary: item,
  }));
  const unfiledRows: RailRow[] = unfiled.map((item) => ({
    id: item.id,
    kind: 'unfiled' as const,
    title: item.title,
    pinned: pinnedIds.has(item.id),
    unfiled: item,
  }));
  const all = [...caseRows, ...unfiledRows];
  const pinned = all.filter((row) => row.pinned);
  const rest = all.filter((row) => !row.pinned);
  return [...pinned, ...rest];
}

export function railIconName(kind: RailRowKind): 'briefcase-business' | 'folder-open' | 'message-square-text' {
  if (kind === 'case') return 'briefcase-business';
  if (kind === 'workspace') return 'folder-open';
  return 'message-square-text';
}

export function railKindLabel(kind: RailRowKind): string {
  if (kind === 'case') return '案件';
  if (kind === 'workspace') return '工作区';
  return '未归档对话';
}

export function canExpandRailRow(kind: RailRowKind): boolean {
  return kind === 'case';
}

export function showLeadAttorney(isDemoCase: boolean): boolean {
  return isDemoCase;
}

export type { ContainerKind };
