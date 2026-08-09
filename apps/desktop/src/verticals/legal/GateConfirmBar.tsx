import { useLegalWorkSurface } from './legal-work-surface';

/**
 * LEGAL-FIVE-FACES-1 · 缺陷 D6：产物门禁的面内确认条。
 *
 * 阅卷（S1）与矩阵（S2）的场景在产出后停在 `confirmation_requested`，而**面内没有任何确认
 * 控件**——场景因此永远走不到终局，四张面上的全链在最后一步断掉。本件把门禁的两枚终态决定
 * （确认续行／驳回终止）显式摆在产出它的那张面上：
 *
 * - 文案取账本里的 `gateLabel`（包声明的确认语，宿主不另写一句）；
 * - 只在 `artifactType` 与本面一致时出现——别人的门不在这张面上确认；
 * - 决定经生产命令端口 `resume` 落账（留人确认，不变量三），零本地伪造。
 *
 * RiskList 有自己的逐条处置面，故驱动侧把它排除在 `pendingGate` 之外（本件不为它渲染）。
 * 样式复用既有 `work-recover` 族，零新增视觉规则。
 */
export function GateConfirmBar({ artifactType }: { artifactType: string }) {
  const { pendingGate, confirmGate } = useLegalWorkSurface();
  if (!pendingGate || pendingGate.artifactType !== artifactType) return null;
  return (
    <div className="work-recover" data-testid="gate-confirm">
      <p>{pendingGate.gateLabel}</p>
      <div className="gate-confirm-actions">
        <button
          type="button"
          className="primary-button"
          data-testid="gate-confirm-accept"
          onClick={() => confirmGate(pendingGate.requestId, 'confirm')}
        >
          确认并继续
        </button>
        <button
          type="button"
          data-testid="gate-confirm-reject"
          onClick={() => confirmGate(pendingGate.requestId, 'reject')}
        >
          驳回并结束
        </button>
      </div>
    </div>
  );
}
