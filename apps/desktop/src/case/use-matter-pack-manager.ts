import { useState } from 'react';
import type { PackageCatalogEntry } from '../composition/package-catalog';
import { projectPersistableCases, writeCaseList } from './case-store';
import type { CaseSummary } from './types';

/**
 * matter 包设置管理（PACK-INTERACT-1 ①/④）：弹层开关 + 改绑保存。
 *
 * 保存＝更新内存案件列表（经 setCases）＋整表替换落持久（与创建/归档同一条
 * `projectPersistableCases` 路径）。只写绑定，持久判据/读侧零改（票面禁区）。
 */
export function useMatterPackManager(input: {
  cases: readonly CaseSummary[];
  packCatalog: readonly PackageCatalogEntry[];
  setCases: (next: CaseSummary[]) => void;
  onFeedback: (message: string, ok: boolean) => void;
}) {
  const [packDialogCaseId, setPackDialogCaseId] = useState<string | null>(null);
  const packDialogCase = packDialogCaseId !== null
    ? input.cases.find((item) => item.id === packDialogCaseId)
    : undefined;
  const openMatterPackDialog = (caseId: string) => setPackDialogCaseId(caseId);
  const closeMatterPackDialog = () => setPackDialogCaseId(null);
  const applyPackBinding = (caseId: string, packageIds: readonly string[]) => {
    const nextCases = input.cases.map(
      (item) => (item.id === caseId ? { ...item, packBinding: [...packageIds] } : item),
    );
    input.setCases(nextCases);
    writeCaseList(projectPersistableCases(nextCases));
    setPackDialogCaseId(null);
    const label = packageIds.length === 0
      ? ''
      : input.packCatalog.find((entry) => entry.packageId === packageIds[0])?.displayName ?? packageIds[0];
    input.onFeedback(packageIds.length === 0 ? '已卸载垂类包' : `已加载：${label}`, true);
  };
  return { packDialogCase, openMatterPackDialog, closeMatterPackDialog, applyPackBinding };
}
