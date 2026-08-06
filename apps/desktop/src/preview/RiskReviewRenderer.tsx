import type { RiskList } from '@courtwork/legal';
import { S3_REVIEW_GATE_LABEL } from '../work/contract-review-flow';
import { useLegalWorkSurface } from '../work/legal-work-surface';
import { selectPrimaryContractCandidates } from '../work/primary-contract';
import { projectReviewItemStates, RevisionPanel, S3LauncherPanel } from '../workbench/Panels';
import { UnsupportedArtifactView } from './ArtifactTableRenderer.js';
import type { HostRendererComponentProps } from './HostRendererRegistry.js';

/**
 * `courtwork.risk-review.v1` 的宿主 renderer（GENERIC-PACK-1 ⑤ · 余三 panel 第三枚）。
 *
 * 与前三枚的分野只在**空态归谁画**：产出到来之前，这一格是场景起跑面（选主合同、填标的、
 * 恢复上次），不是「尚未生成」。故本 blueprint 声明 `handlesEmpty`，`payload === undefined`
 * 时仍进本件。payload 在场时次序照旧：先整面 `safeParse`，漂移即 fail closed。
 *
 * 编排不住这里也不住壳，住 `work/legal-work-surface.tsx`——本件只读它的驱动值，
 * 逐字沿用原 App 分支的判据与文案（语义零改，ADR-015 修订记录 2026-08-06 裁定一）。
 */
export function RiskReviewRenderer({ descriptor, payload }: HostRendererComponentProps) {
  const surface = useLegalWorkSurface();
  const { host } = surface;

  if (payload === undefined) {
    // demo 案的空态仍归宿主的「尚未生成」（回放尚未产出风险清单）；起跑面只属真实 grant 案。
    if (host.isDemoCase || host.caseBinding.kind !== 'grant') {
      return <div className="empty-state" role="status" data-testid="case-empty-state">{descriptor.title}尚未生成</div>;
    }
    const readyMaterials = host.caseMaterials.filter((material) => material.status === 'ready');
    if (readyMaterials.length === 0) {
      return <div className="empty-state" role="status" data-testid="case-empty-state">{host.caseTitle} · 入库合同材料后即可开始合同审查</div>;
    }
    if (host.workRunning) {
      return <div className="empty-state" role="status" data-testid="case-empty-state">合同审查进行中…</div>;
    }
    return (
      <S3LauncherPanel
        candidates={selectPrimaryContractCandidates(host.caseMaterials)}
        primaryContractId={host.primaryContractId}
        onSelectPrimaryContract={host.setPrimaryContractId}
        subject={host.workSubject}
        onChangeSubject={host.setWorkSubject}
        recoverable={surface.workRun.recoverableSession !== null}
        onRecover={() => void surface.workRun.recover()}
        onStart={surface.workRun.start}
      />
    );
  }

  const parsed = descriptor.schema.safeParse(payload);
  if (!parsed.success) return <UnsupportedArtifactView title={descriptor.title} />;
  const riskList = parsed.data as RiskList;
  const { submission, gate, reviewReadOnly, workRun } = surface;
  const selectedRisk = riskList.risks.find((risk) => risk.id === surface.selectedRiskId) ?? riskList.risks[0];

  if (!selectedRisk) {
    return <section className="empty-review-result" data-testid="revision-panel">
      <h3>合同审查处置</h3>
      <p>{submission.resultMessage ?? '本次风险清单没有待逐条处置的风险项。请显式提交，完成本次审查。'}</p>
      {riskList.outOfCoverage.length > 0 && (
        <ul data-testid="review-out-of-coverage">
          {riskList.outOfCoverage.map((entry) => <li key={entry.summary}>{entry.summary}</li>)}
        </ul>
      )}
      <button
        type="button"
        className="primary-button"
        data-testid="submit-contract-review"
        disabled={submission.submitting || submission.submitted || !submission.canSubmit}
        onClick={submission.submit}
      >{submission.submitting ? '正在提交处置…' : S3_REVIEW_GATE_LABEL}</button>
    </section>;
  }

  const reviewCommon = {
    riskList,
    // 真实主合同名：production 取本次会话冻结的材料，demo 取样板案原件名。固定标题已退役。
    primaryFileName: host.isDemoCase
      ? host.demoPrimaryFileName
      : host.caseMaterials.find((item) => item.materialId === host.workContractMaterialId)?.fileName ?? '未选定主合同',
    selectedRiskId: surface.selectedRiskId,
    onSelectRisk: surface.setSelectedRiskId,
    selectedGrades: [...surface.selectedGrades],
    expandedEvidence: surface.expandedEvidence,
    onToggleEvidence: surface.expandBasis,
    onOpenSource: host.openSourceAnchor,
  };
  // CONTRACT-TRACE-1：completed 只读重开 —— 写权限由判别联合隔离，read_only 面在类型上就没有
  // controls；处置只从 replay 后的 RiskList 读，风险区零事件、零 CAS。
  // 门禁未到达时同样只读：此刻还没有任何条目可以处置，给出写入控件才是假接线。
  if (reviewReadOnly || !gate) {
    const outputResult = reviewReadOnly ? workRun.contractOutputResult : undefined;
    return outputResult?.status === 'ready_to_deliver'
      ? <RevisionPanel {...reviewCommon} mode="read_only" outputResult={outputResult} onRetryOutput={workRun.retryOutput} />
      : <RevisionPanel {...reviewCommon} mode="read_only" outputResult={outputResult} />;
  }
  return <RevisionPanel
    {...reviewCommon}
    mode="interactive"
    controls={{
      gate,
      itemStates: projectReviewItemStates(submission.review.state, riskList.risks.map((risk) => risk.id)),
      submitState: submission.submitting ? 'submitting' : submission.submitted ? 'submitted' : 'idle',
      onBeginRevision: (itemRef) => surface.beginCorrection(itemRef, riskList.risks.find((risk) => risk.id === itemRef)?.description ?? ''),
      onChangeRevision: (_itemRef, value) => submission.review.changeCorrection(value),
      onCancelRevision: submission.review.cancelCorrection,
      onCommitRevision: surface.commitCorrection,
      onConfirm: (itemRef) => surface.dispose(itemRef, 'confirmed'),
      onReject: (itemRef) => surface.dispose(itemRef, 'rejected'),
      onSubmit: submission.submit,
    }}
    unverifiedRiskIds={[...surface.unverifiedRiskIds]}
    submitEnabled={submission.canSubmit}
    nonApplied={{
      items: submission.nonAppliedPending,
      confirmedIds: submission.confirmedNonAppliedIds,
      // production 恒整份阻断（零 waiver）；逐条知悉只属显式 demo 消费者。
      allowWaiver: host.isDemoCase,
      onConfirm: submission.confirmNonApplied,
      onCancel: submission.cancelNonApplied,
    }}
    resultMessage={submission.resultMessage}
  />;
}
