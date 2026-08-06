import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RiskList } from '@courtwork/legal';
import type { SourceAnchor } from '@courtwork/schemas';
import type { ReviewGateProjection } from '../protocol/client';
import type {
  VerticalWorkSurface,
  VerticalWorkSurfaceHost,
  VerticalWorkSurfaceState,
} from '../preview/vertical-work-surface';
import { projectRiskListGate } from './legal-s3-binding';
import { useContractReviewSubmission, type ContractReviewSubmission } from './use-contract-review-submission';
import { useWorkRunLifecycle, type WorkRunLifecycle } from './work-session-lifecycle';
import type { LegalS3WorkCommand } from './work-command';

/**
 * Legal 合同审查工作面驱动（GENERIC-PACK-1 ⑤）。
 *
 * 本模块是 `App.tsx` 里那套 S3 审阅编排的**新居所**——风险清单取数、门禁投影、逐条处置与
 * 修正、提交与交付、run/cancel/recover 生命周期，逐字搬来，**语义零改**（ADR-015 修订记录
 * 2026-08-06 裁定一）。壳自此零 `RiskList` 持有；它只把领域无关的宿主输入交给
 * {@link VerticalWorkSurfaceHost}，并按 {@link VerticalWorkSurfaceState} 读出三处渲染链外的量。
 *
 * 装配点在受信组合根（`main.tsx`）：`createLegalWorkSurface({ workCommand })`——`LegalS3WorkCommand`
 * 是垂类端口，只能在组合根注入，不进壳的通用接缝（循 S6 装配点先例）。
 */
export interface LegalWorkSurfaceValue {
  readonly riskList: RiskList | undefined;
  readonly gate: ReviewGateProjection | undefined;
  readonly submission: ContractReviewSubmission;
  readonly workRun: WorkRunLifecycle;
  readonly reviewReadOnly: boolean;
  readonly selectedRiskId: string;
  readonly setSelectedRiskId: (id: string) => void;
  readonly expandedEvidence: Record<string, boolean>;
  readonly expandBasis: (riskId: string, index: number, evidenceRef: string) => void;
  readonly selectedGrades: readonly ('A' | 'B' | 'C')[];
  readonly unverifiedRiskIds: readonly string[];
  readonly dispose: (itemRef: string, disposition: 'confirmed' | 'rejected') => void;
  readonly beginCorrection: (itemRef: string, originalDescription: string) => void;
  readonly commitCorrection: () => void;
  readonly host: VerticalWorkSurfaceHost;
}

const LegalWorkSurfaceContext = createContext<LegalWorkSurfaceValue | undefined>(undefined);

export function useLegalWorkSurface(): LegalWorkSurfaceValue {
  const value = useContext(LegalWorkSurfaceContext);
  if (value === undefined) {
    throw new Error('legal work surface is not mounted: the risk-review renderer rendered outside its provider');
  }
  return value;
}

function readableError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}

/** production S3 只服务「修订」与通用「结构化产出」两面；其余在册工作面显式说明不适用。 */
const PRODUCTION_APPLICABLE_VIEWS = ['revision', 'artifact'] as const;
const NOT_APPLICABLE_COPY = '该工作面暂不适用于合同审查';

export function createLegalWorkSurface(
  deps: { workCommand: LegalS3WorkCommand },
): VerticalWorkSurface {
  return {
    use(host: VerticalWorkSurfaceHost): VerticalWorkSurfaceState {
      const [gate, setGate] = useState<ReviewGateProjection>();
      const [selectedRiskId, setSelectedRiskId] = useState('risk-03');
      const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

      const riskList = host.artifactPayload('legal.RiskList') as RiskList | undefined;
      const selectedRisk = riskList?.risks.find((risk) => risk.id === selectedRiskId) ?? riskList?.risks[0];
      const gradeByKey = useMemo(
        () => new Map(host.session.evidenceGrades.map((item) => [item.key, item.grade] as const)),
        [host.session.evidenceGrades],
      );
      const selectedGate = selectedRisk ? gate?.items.find((item) => item.itemRef === selectedRisk.id) : undefined;
      const selectedGrades = selectedGate?.evidenceKeys
        .map((key) => gradeByKey.get(key))
        .filter((value): value is 'A' | 'B' | 'C' => Boolean(value)) ?? [];
      // 「含 C 级依据」不可从 gate 的 reason 派生：`high_risk` 对 `unverified` 优先，照派生会让
      // 高危且含 C 级依据的条目在核验列显示为「已核验」。故仍由证据台账现算并作为显式输入。
      const unverifiedRiskIds = gate?.items
        .filter((item) => item.evidenceKeys.some((key) => gradeByKey.get(key) === 'C'))
        .map((item) => item.itemRef) ?? [];
      /** completed 的 grant 案：审阅面转只读——写权限由判别联合隔离，不是运行时把控件藏起来。 */
      const reviewReadOnly = host.caseBinding.kind === 'grant' && host.workPhase === 'completed';

      const submission = useContractReviewSubmission({
        caseBinding: host.caseBinding,
        selectedCaseId: host.selectedCaseId,
        isDemoCase: host.isDemoCase,
        flow: host.flow,
        riskList,
        gate,
        confirmationRequestId: host.session.confirmation?.requestId,
        evidenceGrades: host.session.evidenceGrades,
        workSessionId: host.workSessionId,
        workContractMaterialId: host.workContractMaterialId,
        materialStore: host.materialStore,
        workCommand: deps.workCommand,
        workFixture: host.workFixture,
        dispatch: host.dispatch,
        openedAt: host.openedAt,
        demoSourceMarkdown: host.demoSourceMarkdown,
        outputFileName: host.demoOutputFileName,
        showSystemFeedback: host.showSystemFeedback,
        onOutputExists: host.onDemoOutputExists,
        onCompleted: host.onCompleted,
      });

      const workRun = useWorkRunLifecycle({
        caseBinding: host.caseBinding,
        selectedCaseId: host.selectedCaseId,
        workRunning: host.workRunning,
        workSessionId: host.workSessionId,
        workContractMaterialId: host.workContractMaterialId,
        workSubject: host.workSubject,
        primaryContractId: host.primaryContractId,
        caseMaterials: host.caseMaterials,
        modelRoute: host.modelRoute,
        workCommand: deps.workCommand,
        reviewReadOnly,
        outputDeps: host.outputDeps,
        dispatch: host.dispatch,
        // 裁定一：run 起跑时的审阅重置与门禁清空是**本驱动内部**的事，壳不再持有这两条回调。
        resetReview: submission.reset,
        clearGate: () => setGate(undefined),
        setWorkRunning: host.setWorkRunning,
        setWorkSessionId: host.setWorkSessionId,
        setWorkContractMaterialId: host.setWorkContractMaterialId,
        setWorkPhase: host.setWorkPhase,
        setPreviewOpen: host.setPreviewOpen,
        showSystemFeedback: host.showSystemFeedback,
      });

      // 样板案门禁投影：只对显式 demo ref 提问 fixture adapter（与 production 物理分流）。
      useEffect(() => {
        const requestId = host.session.confirmation?.requestId;
        if (!requestId || !host.selectedCaseId || !host.flow || !host.isDemoCase) return;
        const ref = host.workFixture.sessionRefFor(host.selectedCaseId, host.flow);
        void host.workFixture.review.getGateProjection({ ...ref, requestId }).then(setGate);
      }, [host.flow, host.selectedCaseId, host.isDemoCase, host.session.confirmation, host.workFixture]);

      // WORK-LIVE-1：grant 案的 live gate 由真实 RiskList + 证据台账派生（projectRiskListGate，
      // 绝不复用样板案门禁投影）。
      useEffect(() => {
        const requestId = host.session.confirmation?.requestId;
        if (!requestId || host.caseBinding.kind !== 'grant' || !riskList) return;
        setGate(projectRiskListGate(riskList, requestId, host.session.evidenceGrades));
      }, [host.caseBinding.kind, riskList, host.session.confirmation, host.session.evidenceGrades]);

      const fixtureRef = host.fixtureRef;
      const emitReviewTelemetry = host.emitReviewTelemetry;
      useEffect(() => {
        if (!fixtureRef) return;
        host.openedAt.current[selectedRiskId] = Date.now();
        emitReviewTelemetry({
          type: 'review_item_opened',
          sessionId: fixtureRef.sessionId,
          itemRef: selectedRiskId,
          emittedAt: new Date().toISOString(),
        });
      }, [fixtureRef, emitReviewTelemetry, selectedRiskId, host.openedAt]);

      const expandBasis = (riskId: string, index: number, evidenceRef: string) => {
        const key = `${riskId}:${index}`;
        setExpandedEvidence((current) => ({ ...current, [key]: !current[key] }));
        if (fixtureRef) {
          emitReviewTelemetry({ type: 'review_evidence_expanded', sessionId: fixtureRef.sessionId, itemRef: riskId, evidenceRef, emittedAt: new Date().toISOString() });
        }
      };

      const dispose = (itemRef: string, disposition: 'confirmed' | 'rejected') => {
        const protocolDisposition = disposition === 'confirmed' ? 'confirm' : 'reject';
        if (!submission.review.decide(itemRef, protocolDisposition)) return;
        if (fixtureRef) {
          emitReviewTelemetry({ type: 'review_disposition_submitted', sessionId: fixtureRef.sessionId, itemRef, disposition: protocolDisposition, emittedAt: new Date().toISOString() });
        }
      };

      const beginCorrection = (itemRef: string, originalDescription: string) => {
        submission.review.beginCorrection(itemRef, originalDescription);
      };

      const commitCorrection = () => {
        try {
          const decision = submission.review.commitCorrection();
          if (!decision) return;
          if (fixtureRef) {
            emitReviewTelemetry({ type: 'review_disposition_submitted', sessionId: fixtureRef.sessionId, itemRef: decision.itemRef, disposition: 'revise', emittedAt: new Date().toISOString() });
          }
        } catch (error) {
          host.showSystemFeedback(readableError(error, '修正结论未能提交'), false, 'info');
        }
      };

      const value: LegalWorkSurfaceValue = {
        riskList, gate, submission, workRun, reviewReadOnly,
        selectedRiskId, setSelectedRiskId, expandedEvidence, expandBasis,
        selectedGrades, unverifiedRiskIds, dispose, beginCorrection, commitCorrection,
        host,
      };

      return {
        value,
        decisionCount: submission.review.decisionCount,
        outputDisplayName: submission.outputDisplayName,
        // 适用性只在真实（grant）案上声明：样板案回放要走全部四面，未绑定文件夹的 matter
        // 还没有可运行的场景，两者都不属「垂类说它不适用」。
        applicability: host.caseBinding.kind === 'grant' && !host.isDemoCase
          ? { applicable: PRODUCTION_APPLICABLE_VIEWS, notApplicableCopy: NOT_APPLICABLE_COPY }
          : undefined,
        cancelRun: workRun.cancel,
        resetForContextSwitch: () => {
          setGate(undefined);
          setExpandedEvidence({});
          submission.reset();
        },
        hasRecoverableRun: workRun.recoverableSession !== null,
      };
    },
    // 壳把驱动值当不透明体原样递回；此处是它唯一被重新识型的地方，且带 fail-closed 校验
    // ——递错东西即显式抛，不静默渲染成「没有驱动」。
    Provider: ({ value, children }: { value: unknown; children: ReactNode }) => {
      if (typeof value !== 'object' || value === null || !('submission' in value)) {
        throw new Error('legal work surface provider received a foreign driver value');
      }
      return <LegalWorkSurfaceContext.Provider value={value as LegalWorkSurfaceValue}>{children}</LegalWorkSurfaceContext.Provider>;
    },
  };
}

export type { SourceAnchor };
