import { useEffect, useState } from 'react';
import type { PackageCatalogEntry } from '../composition/package-catalog';
import { describeMatterPackState } from './matter-pack-state';

/**
 * Matter 级包设置弹层（PACK-INTERACT-1 ①/③，ADR-015 决定三「加载动作落在 matter 设置处」）。
 *
 * 呈现：当前状态（已加载/未加载）＋全局可用集单选（不加载 / 逐枚包）＋保存/取消。
 * 加载粒度＝逐 matter 绑定零或一垂类包；全局 registry 只决定可用集（ADR-015 决定三）。
 *
 * 绑定失效态（绑定指向本制品未准入的包，如旧构建删包后旧档仍绑）显式标注「发生了什么＋
 * 下一步」（核心不变量四），保存清绑即恢复。未声明（旧档）matter 当前跟随全部可用包——
 * 显式说明，保存后按用户选择固定。本弹层只写绑定，持久整表替换由 App 落盘。
 */
export interface MatterPackDialogProps {
  open: boolean;
  caseTitle: string;
  /** 已声明的绑定（可缺席＝未声明；`[]`＝显式零；`['<id>']`＝单枚）。 */
  packBinding: readonly string[] | undefined;
  /** 全局可用集。 */
  availablePackageIds: readonly string[];
  /** 全局可用集的宿主目录（准入序）。 */
  packCatalog: readonly PackageCatalogEntry[];
  onClose: () => void;
  /** 保存新绑定（`[]`＝显式零绑定；`['<id>']`＝单枚）。 */
  onApply: (packageIds: readonly string[]) => void;
}

export function MatterPackDialog({
  open,
  caseTitle,
  packBinding,
  availablePackageIds,
  packCatalog,
  onClose,
  onApply,
}: MatterPackDialogProps) {
  const state = describeMatterPackState(packBinding, availablePackageIds, packCatalog);
  const [selected, setSelected] = useState<string>(defaultSelection(state));

  useEffect(() => {
    if (!open) return;
    setSelected(defaultSelection(state));
  }, [open, state.loadedIds.join('|'), state.invalidId]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="matter-pack-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="matter-pack-title"
        data-testid="matter-pack-dialog"
      >
        <h2 id="matter-pack-title">包设置</h2>
        <p className="settings-muted" data-testid="matter-pack-state">
          {state.loadedIds.length === 0
            ? `「${caseTitle}」未加载垂类包`
            : `「${caseTitle}」已加载：${state.loadedLabels.join('、')}`}
        </p>
        {state.invalidId !== undefined && (
          <div className="settings-recovery" data-testid="matter-pack-invalid" role="alert">
            当前绑定「{state.invalidId}」包在当前版本不可用 · 请选择其他包或取消加载
          </div>
        )}
        {state.undeclared && state.loadedIds.length > 1 && (
          <p className="settings-muted" data-testid="matter-pack-undeclared">
            此工作区此前未单独声明包，当前跟随全部可用包 · 保存后将按你的选择固定
          </p>
        )}
        <fieldset className="matter-pack-options" data-testid="matter-pack-options">
          <legend>垂类包</legend>
          <label className="settings-radio">
            <input
              type="radio"
              name="matter-pack"
              value="none"
              checked={selected === 'none'}
              onChange={() => setSelected('none')}
              data-testid="matter-pack-option-none"
            />
            不加载垂类包（通用工作区）
          </label>
          {packCatalog.map((entry) => (
            <label key={entry.packageId} className="settings-radio">
              <input
                type="radio"
                name="matter-pack"
                value={entry.packageId}
                checked={selected === entry.packageId}
                onChange={() => setSelected(entry.packageId)}
                data-testid={`matter-pack-option-${entry.packageId}`}
              />
              加载{entry.displayName}
            </label>
          ))}
        </fieldset>
        <p className="settings-muted">
          加载后，结构化工作面与对应场景随包出现；卸载不删除已有产出（产出属工作区资产，重新加载即恢复结构化视图）。
        </p>
        <footer className="new-case-dialog-actions">
          <button type="button" className="quiet-button" data-testid="matter-pack-cancel" onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            className="primary-button"
            data-testid="matter-pack-apply"
            onClick={() => onApply(selected === 'none' ? [] : [selected])}
          >
            保存
          </button>
        </footer>
      </section>
    </div>
  );
}

/** 单选默认：单一已知绑定即选中该包；未加载/未声明（多包）/失效一律落「不加载」。 */
function defaultSelection(state: ReturnType<typeof describeMatterPackState>): string {
  if (state.invalidId === undefined && state.loadedIds.length === 1) return state.loadedIds[0];
  return 'none';
}
