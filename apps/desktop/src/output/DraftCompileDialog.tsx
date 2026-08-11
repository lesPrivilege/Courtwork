/**
 * 定稿确认弹层（GENERIC-SCENARIOS-1 收尾段「过手即拆」外提自 `App.tsx`，JSX 逐字不变）。
 *
 * 留人确认（核心不变量三）：定稿是不可逆动作——画布随之转只读存档，故落盘前必须由用户在此
 * 显式确认，且在途期间两枚控件同时禁用（不给重入的第二次机会）。
 */
export function DraftCompileDialog({
  open,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation"><section className="compile-dialog" role="dialog" aria-modal="true" aria-labelledby="compile-title"><h2 id="compile-title">编译为 Word 文档</h2><p>定稿后，本画布将转为只读存档。后续修改将在文书修订中逐条处理，无法返回起草状态。</p><div><button className="quiet-button" disabled={pending} onClick={onCancel}>取消</button><button className="primary-button" data-testid="confirm-draft-compile" disabled={pending} onClick={onConfirm}>{pending ? '正在写入…' : '确认定稿并编译'}</button></div></section></div>;
}
