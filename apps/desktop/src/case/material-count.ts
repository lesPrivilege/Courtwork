import type { StoredMaterial } from '../material/material-ref';
import { DEMO_MATERIAL_COUNT, isDemoCaseId } from './case-scope';
import { containerNoun, fileCountLabel, type ContainerKind } from './container-copy';

/**
 * 案件材料件数的派生与三态判定（DEBT-DOSSIER-1 件二新建的纯派生模组）。
 *
 * 件数**不持久**：它是 `MaterialStore.listForCase` 的列表长度，第二份写下来的件数迟早与 store 漂移。
 * 但「不持久」此前被实现成「水合时先写 0」——用户跨重启打开应用，看到的是一个**看起来已经数过**
 * 的 0 件，而真值还没读回来。0 是一句断言，不是一个占位符。
 *
 * 故件数只有三态：**未读取**（还没从 store 派生出来，或派生失败）、**已读取 N 件**。
 * 未读取如实说未读取；`0 件` 只在确凿数过之后才出现。
 *
 * CaseRail 件数、Working folders 徽标与卷宗原件列表全部读同一份派生结果（App 持有的
 * caseId → 材料清单表），故三处结构上不可能各说各话。
 */

export type MaterialCount = { status: 'unresolved' } | { status: 'resolved'; count: number };

export const UNRESOLVED_MATERIAL_COUNT: MaterialCount = { status: 'unresolved' };

/** caseId → 已从 store 派生的材料清单；键缺席即「尚未读取」（**不是 0 件**）。 */
export type DerivedCaseMaterials = Readonly<Record<string, StoredMaterial[] | undefined>>;

/** 件数只由清单长度得出——不自增、不缓存第二份数字。清单缺席即未读取。 */
export function materialCountOf(materials: readonly StoredMaterial[] | undefined): MaterialCount {
  if (materials === undefined) return UNRESOLVED_MATERIAL_COUNT;
  return { status: 'resolved', count: materials.length };
}

export interface MaterialCountSubject {
  id: string;
  isDemo?: boolean;
}

/**
 * demo 固定计数与 production 派生的**物理分流**（核心不变量七）：样板案件数取内置内容包常量，
 * 这条路径根本不碰派生表，故生产 store 里有什么都影响不到它；其余案件只认派生表里那一份，
 * 按 caseId 取用——切案途中回来的清单也只会落到它自己那一格，不会算到别的案头上。
 */
export function selectMaterialCount(subject: MaterialCountSubject, derived: DerivedCaseMaterials): MaterialCount {
  if (subject.isDemo || isDemoCaseId(subject.id)) return { status: 'resolved', count: DEMO_MATERIAL_COUNT };
  return materialCountOf(derived[subject.id]);
}

/** 件数句式沿用容器双词表（案件说卷宗、工作区说资料）；未读取态如实说未读取。 */
export function materialCountLabel(kind: ContainerKind, count: MaterialCount): string {
  if (count.status === 'resolved') return fileCountLabel(kind, count.count);
  return `${containerNoun(kind)} 件数未读取`;
}

/** 模块头计数徽标（只容得下一个短串）：未读取给破折号——写 `0` 就是替 store 答了它还没答的话。 */
export function materialCountBadge(count: MaterialCount): string {
  return count.status === 'resolved' ? String(count.count) : '—';
}
