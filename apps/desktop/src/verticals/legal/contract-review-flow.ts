import { useCallback, useMemo, useState } from 'react';
import type { SessionEvent } from '@courtwork/core';
import type { RiskList } from '@courtwork/legal';
import { LEGAL_PACKAGE } from '@courtwork/legal/package';
import type {
  ReviewDispositionState,
  ReviewGateItemProjection,
  ReviewItemResolution,
  ReviewResolution,
  WorkCommandOutcome,
} from '../../protocol/client';
import type { LegalWorkCommand } from './work-command';
import { S3_RISK_LIST_TYPE, S3_SCENARIO_ID } from './legal-s3-binding';

function legalS3GateLabel(): string {
  const scenario = LEGAL_PACKAGE.scenarios.find((candidate) => candidate.id === S3_SCENARIO_ID);
  const gate = scenario?.confirmationPolicy.mode === 'gates'
    ? scenario.confirmationPolicy.gates.find((candidate) => candidate.artifact === S3_RISK_LIST_TYPE)
    : undefined;
  if (!gate) throw new Error('legal.S3 缺少 RiskList 最终确认门');
  return gate.label;
}

/** 最终动作逐字消费 Legal package descriptor，不在 desktop 另立第二份文案真源。 */
export const S3_REVIEW_GATE_LABEL = legalS3GateLabel();

export interface ContractReviewState {
  decisions: Readonly<Record<string, ReviewItemResolution>>;
  editing?: {
    itemRef: string;
    originalDescription: string;
    draft: string;
  };
}

export const EMPTY_CONTRACT_REVIEW_STATE: ContractReviewState = { decisions: {} };

function withoutDecision(
  decisions: ContractReviewState['decisions'],
  itemRef: string,
): Record<string, ReviewItemResolution> {
  return Object.fromEntries(Object.entries(decisions).filter(([key]) => key !== itemRef));
}

export function setReviewDecision(
  state: ContractReviewState,
  itemRef: string,
  disposition: 'confirm' | 'reject',
): ContractReviewState {
  return {
    decisions: {
      ...state.decisions,
      [itemRef]: { itemRef, disposition },
    },
    ...(state.editing?.itemRef === itemRef ? {} : state.editing ? { editing: state.editing } : {}),
  };
}

export function beginReviewCorrection(
  state: ContractReviewState,
  itemRef: string,
  originalDescription: string,
): ContractReviewState {
  return {
    decisions: withoutDecision(state.decisions, itemRef),
    editing: { itemRef, originalDescription, draft: originalDescription },
  };
}

export function updateReviewCorrection(
  state: ContractReviewState,
  draft: string,
): ContractReviewState {
  if (!state.editing) throw new Error('当前没有正在编辑的风险结论');
  return { ...state, editing: { ...state.editing, draft } };
}

export function cancelReviewCorrection(state: ContractReviewState): ContractReviewState {
  if (!state.editing) return state;
  return { decisions: withoutDecision(state.decisions, state.editing.itemRef) };
}

export function submitReviewCorrection(state: ContractReviewState): ContractReviewState {
  if (!state.editing) throw new Error('当前没有正在编辑的风险结论');
  const correctedDescription = state.editing.draft.trim();
  if (!correctedDescription) throw new Error('修正结论不能为空');
  if (correctedDescription === state.editing.originalDescription.trim()) {
    throw new Error('修正结论必须不同于原结论');
  }
  const { itemRef } = state.editing;
  return {
    decisions: {
      ...state.decisions,
      [itemRef]: { itemRef, disposition: 'revise', correctedDescription },
    },
  };
}

export function isReviewSubmissionReady(
  items: readonly ReviewGateItemProjection[],
  state: ContractReviewState,
): boolean {
  return items.every((item) => state.decisions[item.itemRef] !== undefined);
}

/** UI 投影：`revision` 只表示正在编辑；已提交修正与普通确认同为 confirmed 终态。 */
export function projectReviewDispositionStates(
  state: ContractReviewState,
): Record<string, ReviewDispositionState> {
  const projected: Record<string, ReviewDispositionState> = {};
  for (const [itemRef, decision] of Object.entries(state.decisions)) {
    projected[itemRef] = decision.disposition === 'reject' ? 'rejected' : 'confirmed';
  }
  if (state.editing) projected[state.editing.itemRef] = 'revision';
  return projected;
}

/** App 只保留场景生命周期；逐条处置、编辑态和派生投影收口在本 flow controller。 */
export function useContractReviewState(locked: boolean) {
  const [state, setState] = useState<ContractReviewState>(EMPTY_CONTRACT_REVIEW_STATE);
  const reset = useCallback(() => setState(EMPTY_CONTRACT_REVIEW_STATE), []);
  const decide = useCallback((itemRef: string, disposition: 'confirm' | 'reject') => {
    if (locked) return false;
    setState((current) => setReviewDecision(current, itemRef, disposition));
    return true;
  }, [locked]);
  const batchConfirm = useCallback((itemRefs: readonly string[]) => {
    if (locked) return;
    setState((current) => itemRefs.reduce(
      (next, itemRef) => setReviewDecision(next, itemRef, 'confirm'),
      current,
    ));
  }, [locked]);
  const beginCorrection = useCallback((itemRef: string, originalDescription: string) => {
    if (!locked) setState((current) => beginReviewCorrection(current, itemRef, originalDescription));
  }, [locked]);
  const changeCorrection = useCallback((draft: string) => {
    if (!locked) setState((current) => updateReviewCorrection(current, draft));
  }, [locked]);
  const cancelCorrection = useCallback(() => {
    if (!locked) setState((current) => cancelReviewCorrection(current));
  }, [locked]);
  const commitCorrection = useCallback(() => {
    if (locked || !state.editing) return undefined;
    const next = submitReviewCorrection(state);
    const decision = next.decisions[state.editing.itemRef];
    setState(next);
    return decision?.disposition === 'revise' ? decision : undefined;
  }, [locked, state]);
  const dispositions = useMemo(() => projectReviewDispositionStates(state), [state]);
  const correctedDescriptions = useMemo(
    () => Object.values(state.decisions).reduce<Record<string, string>>((projected, decision) => {
      if (decision.disposition === 'revise') projected[decision.itemRef] = decision.correctedDescription;
      return projected;
    }, {}),
    [state.decisions],
  );
  return {
    state,
    reset,
    decide,
    batchConfirm,
    beginCorrection,
    changeCorrection,
    cancelCorrection,
    commitCorrection,
    dispositions,
    correctedDescriptions,
    decisionCount: Object.keys(state.decisions).length,
  };
}

/** fixture-only：demo 没有持久 WorkState，显式提交后机械投影处置供旧 output policy 演示。 */
export function projectDemoReviewRiskList(
  riskList: RiskList,
  state: ContractReviewState,
): RiskList {
  return {
    ...riskList,
    risks: riskList.risks.map((risk) => {
      const decision = state.decisions[risk.id];
      if (!decision) return risk;
      if (decision.disposition === 'reject') return { ...risk, dispositionStatus: 'rejected' };
      if (decision.disposition === 'revise') {
        return {
          ...risk,
          description: decision.correctedDescription,
          dispositionStatus: 'confirmed',
        };
      }
      return { ...risk, dispositionStatus: 'confirmed' };
    }),
  };
}

export function buildSubmittedReviewResolution(
  items: readonly ReviewGateItemProjection[],
  state: ContractReviewState,
  instrumentation?: ReviewResolution['instrumentation'],
): ReviewResolution {
  return {
    items: items.map((item) => {
      const decision = state.decisions[item.itemRef];
      if (!decision) throw new Error(`风险条目 ${item.itemRef} 尚未处置`);
      return structuredClone(decision);
    }),
    ...(instrumentation ? { instrumentation: structuredClone(instrumentation) } : {}),
  };
}

export type PersistedReviewResult =
  | { kind: 'compile'; riskList: RiskList }
  | { kind: 'zero_risks'; message: string; riskList: RiskList }
  | { kind: 'out_of_coverage'; message: string; riskList: RiskList }
  | { kind: 'all_rejected'; message: string; riskList: RiskList }
  | { kind: 'incomplete'; message: string; riskList: RiskList };

export function classifyPersistedReview(riskList: RiskList): PersistedReviewResult {
  if (riskList.outOfCoverage.length > 0) {
    const details = riskList.outOfCoverage.map((entry) => entry.summary).join('；');
    return {
      kind: 'out_of_coverage',
      message: `仍有待索证项：${details}。需补充材料后重新审查；未生成批注稿`,
      riskList,
    };
  }
  if (riskList.risks.length === 0) {
    return {
      kind: 'zero_risks',
      message: '本次审查未形成可提交的风险项；未生成批注稿',
      riskList,
    };
  }
  if (riskList.risks.every((risk) => risk.dispositionStatus === 'rejected')) {
    return {
      kind: 'all_rejected',
      message: '风险均已驳回；未生成批注稿',
      riskList,
    };
  }
  if (riskList.risks.some((risk) => risk.dispositionStatus === 'pending')) {
    return {
      kind: 'incomplete',
      message: '审阅账本仍有待处置风险；未生成批注稿',
      riskList,
    };
  }
  return { kind: 'compile', riskList };
}

export class ReviewOutputAuthorizationError extends Error {
  constructor() {
    super('合同审查授权账本不匹配，未生成批注稿');
    this.name = 'ReviewOutputAuthorizationError';
  }
}

function assertOutputAuthorization(events: readonly SessionEvent[], requestId: string): void {
  const requested = events.filter(
    (event): event is Extract<SessionEvent, { type: 'confirmation_requested' }> =>
      event.type === 'confirmation_requested' && event.requestId === requestId,
  );
  const resolved = events.filter(
    (event): event is Extract<SessionEvent, { type: 'confirmation_resolved' }> =>
      event.type === 'confirmation_resolved' && event.requestId === requestId,
  );
  if (
    requested.length !== 1
    || requested[0].gateLabel !== S3_REVIEW_GATE_LABEL
    || requested[0].artifactType !== S3_RISK_LIST_TYPE
    || resolved.length !== 1
    || resolved[0].decision !== 'confirm'
  ) {
    throw new ReviewOutputAuthorizationError();
  }
}

function latestPersistedRiskList(events: readonly SessionEvent[]): RiskList {
  let latest: RiskList | undefined;
  for (const event of events) {
    if (event.type === 'artifact_produced' && event.artifactType === S3_RISK_LIST_TYPE) {
      latest = event.artifact as RiskList;
    }
  }
  if (!latest) throw new Error('完成账本缺少持久风险清单，未生成批注稿');
  return latest;
}

export interface ContractReviewSubmissionInput {
  caseId: string;
  sessionId: string;
  requestId: string;
  resolution: ReviewResolution;
  publish: (event: SessionEvent) => void;
}

export type ContractReviewSubmissionResult =
  | { status: 'not_completed'; outcome: Exclude<WorkCommandOutcome, { status: 'completed' }> }
  | {
      status: 'completed';
      outcome: Extract<WorkCommandOutcome, { status: 'completed' }>;
      review: PersistedReviewResult;
    };

export function createContractReviewSubmitter(deps: {
  command: Pick<LegalWorkCommand, 'resolveReview' | 'replay'>;
  mintCommandId: () => string;
  compile: (riskList: RiskList) => void | Promise<void>;
}): { submit(input: ContractReviewSubmissionInput): Promise<ContractReviewSubmissionResult> } {
  let inFlight: Promise<ContractReviewSubmissionResult> | undefined;
  return {
    submit(input) {
      if (inFlight) return inFlight;
      const commandId = deps.mintCommandId();
      const frozen = structuredClone({
        caseId: input.caseId,
        sessionId: input.sessionId,
        requestId: input.requestId,
        resolution: input.resolution,
      });
      const resolved = deps.command.resolveReview({ ...frozen, commandId }, input.publish);
      const pending = resolved.then(async (outcome): Promise<ContractReviewSubmissionResult> => {
        if (outcome.status !== 'completed') return { status: 'not_completed', outcome };
        const replay = await deps.command.replay(outcome.ref);
        if (
          replay.phase !== 'completed'
          || replay.ref.caseId !== outcome.ref.caseId
          || replay.ref.sessionId !== outcome.ref.sessionId
        ) {
          throw new Error('合同审查完成态未能从持久账本复验，未生成批注稿');
        }
        assertOutputAuthorization(replay.events, frozen.requestId);
        const review = classifyPersistedReview(latestPersistedRiskList(replay.events));
        if (review.kind === 'compile') await deps.compile(review.riskList);
        return { status: 'completed', outcome, review };
      });
      inFlight = pending;
      const clear = () => {
        if (inFlight === pending) inFlight = undefined;
      };
      void pending.then(clear, clear);
      return pending;
    },
  };
}
