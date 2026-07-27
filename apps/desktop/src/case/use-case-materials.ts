import { useCallback, useEffect, useState } from 'react';
import type { StoredMaterial } from '../material/material-ref';
import {
  UNRESOLVED_MATERIAL_COUNT,
  casesNeedingMaterialCount,
  selectMaterialCount,
  type MaterialCount,
} from './material-count';
import type { CaseSummary } from './types';

/**
 * 已入库材料清单的持有与派生（DEBT-DOSSIER-1 件二从 `App.tsx` 外提，「过手即拆」）。
 *
 * 一份状态供三处消费——CaseRail 行内件数、Working folders 徽标与树体、卷宗原件列表——
 * 故它们结构上读的就是同一份 `listForCase` 结果，谈不上「同步」也就无从失步。
 *
 * 逐案派生而非只派生选中案：件数要在侧栏所有行上成立，跨重启后尤其如此。
 * demo 案永不进这条路径（件数取内置常量，D-1 双向隔离）；未绑定文件夹的真实案照查——
 * 材料按 caseId 持久，查得的 0 是确凿的 0，不是猜的。
 */

/** 只取本 hook 需要的最小面（沿 `material-actions.ts` 的 `MaterialResolver` 先例）。 */
export interface CaseMaterialLister {
  listForCase(caseId: string): Promise<StoredMaterial[]>;
}

export interface CaseMaterialsView {
  /** caseId → 已派生清单。**键缺席即尚未读取，不是 0 件。** */
  byCase: Record<string, StoredMaterial[]>;
  /** 入库后的单一回灌口（`case-ingest` 的 `listed` 接此）——一律整列交回，不自增。 */
  list: (caseId: string, materials: StoredMaterial[]) => void;
  /** 选中案清单；未读取回落空数组——消费侧（场景绑定、主合同候选）对二者本就同一处置。 */
  selected: StoredMaterial[];
  /** 选中案的三态件数（未读取 / N 件）。 */
  selectedCount: MaterialCount;
}

export function useCaseMaterials(
  cases: CaseSummary[],
  selectedCase: CaseSummary | undefined,
  store: CaseMaterialLister,
): CaseMaterialsView {
  const [byCase, setByCase] = useState<Record<string, StoredMaterial[]>>({});
  const list = useCallback((caseId: string, materials: StoredMaterial[]) => {
    setByCase((current) => ({ ...current, [caseId]: materials }));
  }, []);

  const productionCaseIds = casesNeedingMaterialCount(cases).join('|');
  useEffect(() => {
    let cancelled = false;
    // 按 caseId 逐案派生：迟到的清单只落回它自己那一格，切案途中不会串案。
    for (const caseId of productionCaseIds ? productionCaseIds.split('|') : []) {
      void store.listForCase(caseId).then((materials) => {
        if (!cancelled) list(caseId, materials);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [productionCaseIds, store, list]);

  return {
    byCase,
    list,
    selected: (selectedCase ? byCase[selectedCase.id] : undefined) ?? [],
    selectedCount: selectedCase ? selectMaterialCount(selectedCase, byCase) : UNRESOLVED_MATERIAL_COUNT,
  };
}
