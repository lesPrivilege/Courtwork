import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { SessionEvent } from '@courtwork/core';
import type { RiskList } from '@courtwork/legal';
import type { CaseBinding } from '../case/case-scope';
import type { MaterialStore } from '../material/material-store';
import { caseOutputClient } from '../output/case-output-client';
import {
  compileDemoConfirmedReviewToDocx,
  type PendingRevisionConfirmation,
} from '../output/compile-review-output';
import {
  coordinateContractReviewOutput,
  type ContractReviewOutputResult,
} from '../output/contract-review-delivery';
import type { ReviewGateProjection, ScenarioFlow, WorkReplayResult } from '../protocol/client';
import {
  buildSubmittedReviewResolution,
  createContractReviewSubmitter,
  isReviewSubmissionReady,
  projectDemoReviewRiskList,
  projectReviewDispositionStates,
  useContractReviewState,
} from './contract-review-flow';
import type { LegalS3WorkCommand } from './work-command';
import { workFailureDisplayCopy } from './work-failure-copy';

function readableError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}

/** demo 卷宗合同原件的固定 fileId：demo 锚全部挂在它上面（与 `demo/legal-interaction.ts` 同源）。 */
const DEMO_CONTRACT_FILE_ID = '04-设备采购合同.md';

/** 三种**正常**零文书终态的产品语；措辞不得暗示出错，也不得概括成「未发现风险」。 */
const NOT_APPLICABLE_COPY = {
  no_risks: '本次审查未形成可提交的风险项',
  all_rejected: '本次审查的风险均已驳回，未生成批注稿',
  out_of_coverage: '仍有待索证项，补充材料后可重新开始一次审查',
} as const;

/** demo fixture 的确认适配面；production 走 `LegalS3WorkCommand`，两条路径物理分流。 */
export interface ContractReviewFixturePort {
  sessionRefFor(caseId: string, flow: ScenarioFlow): { caseId: string; sessionId: string };
  review: { resolve(input: { caseId: string; sessionId: string; requestId: string; resolution: unknown }): Promise<unknown> };
}

export interface ContractReviewSubmissionDeps {
  caseBinding: CaseBinding;
  selectedCaseId: string | null;
  isDemoCase: boolean;
  flow: ScenarioFlow | null | undefined;
  riskList: RiskList | undefined;
  gate: ReviewGateProjection | undefined;
  confirmationRequestId: string | undefined;
  evidenceGrades: Parameters<typeof compileDemoConfirmedReviewToDocx>[0]['evidenceGrades'];
  workSessionId: string | null;
  workContractMaterialId: string | null;
  materialStore: MaterialStore;
  workCommand: Pick<LegalS3WorkCommand, 'resolveReview' | 'replay'>;
  workFixture: ContractReviewFixturePort;
  dispatch: (event: SessionEvent) => void;
  /** 逐条依据展开时刻，用于 dwellMs 采样；提交同步帧内一次读取，不在 await 后重采样。 */
  openedAt: MutableRefObject<Record<string, number>>;
  demoSourceMarkdown: string;
  outputFileName: string;
  showSystemFeedback: (message: string, ok: boolean, tone?: 'info') => void;
  onOutputExists: (exists: boolean) => void;
  onCompleted: () => void;
}

export interface ContractReviewSubmission {
  /** 逐条处置/修正的编辑态；与提交态同住一处，锁定判据（已提交/提交中）无需绕经 App。 */
  review: ReturnType<typeof useContractReviewState>;
  submitted: boolean;
  submitting: boolean;
  resultMessage: string | undefined;
  nonAppliedPending: PendingRevisionConfirmation[];
  confirmedNonAppliedIds: string[];
  /** production 唯一 coordinator 的最近一次结果；未发起过交付时为 undefined。 */
  deliveryOutcome: ContractReviewOutputResult | undefined;
  /** 结果卡该显示的产物名——版本化命名由 coordinator 铸出，App 不再自己拼固定名。 */
  outputDisplayName: string | undefined;
  canSubmit: boolean;
  submit(): void;
  confirmNonApplied(instructionId: string): void;
  cancelNonApplied(): void;
  reset(): void;
}

/**
 * CONTRACT-REVIEW-SAFETY-1「过手即拆」外提：live review 的提交编排与产物落盘整体离开
 * `App.tsx`，连同它自有的五枚 state。App 只保留 `contractOutputExists`（另有三处与提交无关
 * 的渲染消费）与场景相位，经回调驱动。
 *
 * 本单新增概念：零。这是既有 App 内联编排的**平移**，不是新状态机——`createContractReviewSubmitter`
 * 的判别联合、`compile*ReviewToDocx` 的 demo/production 分流与 gate 判据都原样沿用。
 */
export function useContractReviewSubmission(deps: ContractReviewSubmissionDeps): ContractReviewSubmission {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string>();
  const [nonAppliedPending, setNonAppliedPending] = useState<PendingRevisionConfirmation[]>([]);
  const [confirmedNonAppliedIds, setConfirmedNonAppliedIds] = useState<string[]>([]);
  /** production 最近一次交付编排的结果；供结果卡与产物名展示，本身不驱动任何 effect。 */
  const [deliveryOutcome, setDeliveryOutcome] = useState<ContractReviewOutputResult>();
  const recompileGuard = useRef(false);
  const review = useContractReviewState(submitted || submitting);
  const reviewState = review.state;

  const {
    caseBinding, selectedCaseId, isDemoCase, flow, riskList, gate,
    confirmationRequestId, evidenceGrades, workSessionId, workContractMaterialId,
    materialStore, workCommand, workFixture, dispatch, openedAt,
    demoSourceMarkdown, outputFileName, showSystemFeedback, onOutputExists, onCompleted,
  } = deps;

  const reset = useCallback(() => {
    review.reset();
    setSubmitted(false);
    setSubmitting(false);
    setResultMessage(undefined);
    setNonAppliedPending([]);
    setConfirmedNonAppliedIds([]);
    setDeliveryOutcome(undefined);
    recompileGuard.current = false;
  }, []);

  /**
   * demo 分支：仍走 Markdown 合成 + 固定产物名 + 覆盖写。**production 已完全离开这条路**——
   * 见下方 `deliverProductionDocx`，它把 replay 交给唯一 coordinator。
   */
  const produceDemoDocx = useCallback(async (
    persistedRiskList: RiskList,
    confirmedNonApplied?: string[],
  ) => {
    if (caseBinding.kind !== 'demo') throw new Error('本案尚未绑定可写入的案件目录');
    const result = compileDemoConfirmedReviewToDocx({
      riskList: persistedRiskList,
      demoSourceMarkdown,
      primaryMaterialId: DEMO_CONTRACT_FILE_ID,
      evidenceGrades,
      dispositions: projectReviewDispositionStates(reviewState),
      confirmedNonApplied,
    });
    if (result.status === 'needs_confirmation') {
      recompileGuard.current = false;
      setNonAppliedPending(result.pending);
      return;
    }
    await caseOutputClient.writeDocx(caseBinding, outputFileName, result.docx);
    const exists = await caseOutputClient.exists(caseBinding, outputFileName);
    if (!exists) throw new Error('Word 产物写入后未能在案件产出目录确认');
    setNonAppliedPending([]);
    setConfirmedNonAppliedIds([]);
    onOutputExists(true);
    showSystemFeedback(`已写入本案「产出」目录：${outputFileName}`, true);
  }, [
    caseBinding, demoSourceMarkdown, evidenceGrades, onOutputExists,
    outputFileName, reviewState, showSystemFeedback,
  ]);

  /**
   * production 交付：scope 在**调用时刻**同步冻结，交给唯一 coordinator。
   * await 之后不再重读 selection/binding——那正是「A 案 replay 写进 B 案 grant」的口子。
   */
  const deliverProductionDocx = useCallback(async (replay: Extract<WorkReplayResult, { found: true }>) => {
    if (caseBinding.kind !== 'grant' || !selectedCaseId || !workSessionId || !workContractMaterialId) {
      setResultMessage('本次审查缺少可交付的主合同，未生成批注稿');
      return;
    }
    const scope = {
      caseId: selectedCaseId,
      binding: caseBinding,
      pointer: { sessionId: workSessionId, contractMaterialId: workContractMaterialId },
    };
    const outcome = await coordinateContractReviewOutput(
      { mode: 'deliver', replay, scope },
      {
        readMaterial: (caseId, materialId) => materialStore.readForOutput(caseId, materialId),
        statDocx: (binding, fileName) => caseOutputClient.statDocx(binding, fileName),
        writeDocxNoReplace: (binding, fileName, bytes) =>
          caseOutputClient.writeDocxNoReplace(binding, fileName, bytes),
      },
    );
    setDeliveryOutcome(outcome);
    if (outcome.status === 'delivered' || outcome.status === 'already_present') {
      setNonAppliedPending([]);
      onOutputExists(true);
      showSystemFeedback(`已写入本案「产出」目录：${outcome.fileName}`, true);
      return;
    }
    onOutputExists(false);
    if (outcome.status === 'blocked') {
      // production 不接受逐条 waiver：未落点即整份阻断，只呈现清单，不给「确认知悉后跳过」。
      setNonAppliedPending([]);
      setResultMessage(outcome.message);
      return;
    }
    if (outcome.status === 'not_applicable') {
      setResultMessage(NOT_APPLICABLE_COPY[outcome.reason]);
    }
  }, [
    caseBinding, materialStore, onOutputExists, selectedCaseId, showSystemFeedback,
    workContractMaterialId, workSessionId,
  ]);

  /**
   * `inFlight` 首胜闸门必须跨重渲染存活：submitter 若挂 `useMemo`，任一依赖（处置改动、
   * 证据台账随事件推进）变化即重建，SPEC 要求的「双击/重入复用同一 Promise」随之失守。
   * 故住 `useRef`，只在首次渲染铸一次；per-submit 的可变量全部由 `submit()` 现取。
   */
  const submitterRef = useRef<ReturnType<typeof createContractReviewSubmitter> | undefined>(undefined);
  const deliverRef = useRef(deliverProductionDocx);
  deliverRef.current = deliverProductionDocx;
  const commandRef = useRef(workCommand);
  commandRef.current = workCommand;
  if (!submitterRef.current) {
    submitterRef.current = createContractReviewSubmitter({
      command: {
        resolveReview: (input, publish) => commandRef.current.resolveReview(input, publish),
        replay: (ref) => commandRef.current.replay(ref),
      },
      mintCommandId: () => `resolve-${globalThis.crypto.randomUUID()}`,
      // CONTRACT-OUTPUT-TRUTH-1：production 的产物交付整体移交唯一 coordinator，
      // 由本 hook 在 completed 之后以冻结 scope 发起。SAFETY 的分流判据（review.kind）原样保留，
      // 只是不再由这个回调直接落盘——回调此处不做任何 effect。
      compile: () => {},
    });
  }

  // demo-only：逐条确认满即重编译落盘。production 的 waiver 已退役（整份阻断），故此闸门不触真实链。
  useEffect(() => {
    if (!isDemoCase || !riskList) return;
    if (nonAppliedPending.length === 0) {
      recompileGuard.current = false;
      return;
    }
    const allConfirmed = nonAppliedPending.every((item) => confirmedNonAppliedIds.includes(item.instructionId));
    if (!allConfirmed || recompileGuard.current) return;
    recompileGuard.current = true;
    void (async () => {
      try {
        await produceDemoDocx(projectDemoReviewRiskList(riskList, reviewState), confirmedNonAppliedIds);
      } catch (error) {
        recompileGuard.current = false;
        onOutputExists(false);
        showSystemFeedback(readableError(error, 'Word 产物生成失败'), false);
      }
    })();
  }, [
    confirmedNonAppliedIds, isDemoCase, nonAppliedPending, onOutputExists,
    produceDemoDocx, reviewState, riskList, showSystemFeedback,
  ]);

  const canSubmit = Boolean(gate && isReviewSubmissionReady(gate.items, reviewState));

  const submit = () => {
    if (!confirmationRequestId || !selectedCaseId || !gate || !riskList || submitting || !canSubmit) return;
    const dwellMs = gate.items.reduce(
      (total, item) => total + Math.max(0, Date.now() - (openedAt.current[item.itemRef] ?? Date.now())),
      0,
    );
    const expandedEvidenceKeys = gate.items
      .flatMap((item) => item.evidenceKeys)
      .filter((key, index, all) => all.indexOf(key) === index);
    const resolution = buildSubmittedReviewResolution(gate.items, reviewState, { dwellMs, expandedEvidenceKeys });
    setSubmitting(true);
    setResultMessage(undefined);
    if (isDemoCase && flow) {
      const ref = workFixture.sessionRefFor(selectedCaseId, flow);
      void workFixture.review.resolve({ ...ref, requestId: confirmationRequestId, resolution })
        .then(async () => {
          setSubmitted(true);
          await produceDemoDocx(projectDemoReviewRiskList(riskList, reviewState));
        })
        .catch((error: unknown) => {
          onOutputExists(false);
          showSystemFeedback(readableError(error, 'Word 产物生成失败'), false);
        })
        .finally(() => setSubmitting(false));
      return;
    }
    if (caseBinding.kind !== 'grant' || !workSessionId) {
      setSubmitting(false);
      return;
    }
    void submitterRef.current!.submit({
      caseId: selectedCaseId,
      sessionId: workSessionId,
      requestId: confirmationRequestId,
      resolution,
      publish: dispatch,
    }).then((result) => {
      if (result.status === 'not_completed') {
        const { outcome } = result;
        if (outcome.status === 'rejected') showSystemFeedback(outcome.message, false, 'info');
        else if (outcome.status === 'failed') showSystemFeedback(workFailureDisplayCopy(outcome.message), false);
        else if (outcome.status === 'canceled') showSystemFeedback('已停止合同审查', true);
        else showSystemFeedback('审阅仍在等待进一步处置，未生成批注稿', false, 'info');
        return;
      }
      setSubmitted(true);
      onCompleted();
      if (result.review.kind !== 'compile') {
        setResultMessage(result.review.message);
        showSystemFeedback(result.review.message, true);
        return;
      }
      // completed 且账本判定可编译：以**当前**冻结 scope 重读 replay 交 coordinator。
      // 重读的是持久账本（不是材料），coordinator 会把 ref/pointer/授权全部再验一遍。
      return commandRef.current.replay(result.outcome.ref).then((replay) => {
        if (!replay.found) {
          setResultMessage('未能从本案账本读出本次审查记录，未生成批注稿');
          return;
        }
        return deliverRef.current(replay);
      });
    }).catch((error: unknown) => {
      onOutputExists(false);
      showSystemFeedback(readableError(error, '合同审查提交失败，未生成批注稿'), false);
    }).finally(() => setSubmitting(false));
  };

  return {
    review,
    submitted,
    submitting,
    resultMessage,
    nonAppliedPending,
    confirmedNonAppliedIds,
    deliveryOutcome,
    outputDisplayName:
      deliveryOutcome && 'fileName' in deliveryOutcome ? deliveryOutcome.fileName : undefined,
    canSubmit,
    submit,
    confirmNonApplied: (instructionId: string) =>
      setConfirmedNonAppliedIds((prev) => (prev.includes(instructionId) ? prev : [...prev, instructionId])),
    cancelNonApplied: () => {
      recompileGuard.current = false;
      setNonAppliedPending([]);
      setConfirmedNonAppliedIds([]);
    },
    reset,
  };
}
