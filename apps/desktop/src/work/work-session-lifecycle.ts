import { useEffect, useState } from 'react';
import type { SessionEvent } from '@courtwork/core';
import { readStreamEvidence } from '@courtwork/provider/evidence';

import { LEGACY_CASE_SCENARIO_COPY, isWorkSafeCaseId } from '../case/case-id';
import type { CaseBinding } from '../case/case-scope';
import type { StoredMaterial } from '../material/material-ref';
import {
  coordinateContractReviewOutput,
  type ContractReviewOutputDeps,
  type ContractReviewOutputResult,
} from '../output/contract-review-delivery';
import {
  WorkReplayError,
  workReplayFailureCopy,
  type WorkCommandOutcome,
  type WorkModelRoute,
  type WorkProjectionPhase,
  type WorkReplayResult,
  type WorkSessionRef,
} from '../protocol/client';
import { workFailureDisplayCopy } from './work-failure-copy';
import { orderS3MaterialRefs } from './primary-contract';
import type { LegalS3WorkCommand } from './work-command';
import {
  clearWorkSession,
  persistWorkSession,
  readWorkSession,
  type WorkSessionRecord,
} from './work-session-store';

/**
 * CONTRACT-TRACE-1：Work 会话指针的生命周期编排（纯函数 + 一枚显式状态的 tracker，零 React、零 IO）。
 *
 * **本票新增的唯一概念，为何非加不可**：`start()` 同步返回的 sessionId 只是 **candidate**——
 * 「取得 candidate」与「session 已建立」是两件事，而它们之间隔着一次 whole-envelope CAS。
 * 不显式记录「是否已观察到首枚 post-CAS event」，就无法区分「该写指针」与「该原样保留旧指针」，
 * 于是只剩两种写法：抢先写（rejected 时污染他人记录）或事后猜（把瞬时 outcome 当持久事实）。
 * tracker 的全部状态就是这一个布尔量。
 *
 * **不是新持久格式**：本模块只编排既有 `work-session-store` 的 read/persist/clear、candidate/ref
 * 与上游 `WorkProjectionPort.replay` 结果，不新增持久字段、storage version 或第二 store。
 *
 * **本票吸收 `work/work-recovery.ts`**（CONTRACT-OUTPUT-TRUTH-1 · O3 外提件，其模块注释已写明
 * 「pointer compare-and-clear 矩阵属 CONTRACT-TRACE-1」）：恢复判定与指针判定读的是同一份 replay
 * 结果、同一张相位表，分成两个模块就要把 phase switch 写两遍——而这次的矩阵恰恰要求两轴各自
 * 分流（completed 保留指针但只读、running 依 owner 决定去留）。故只保留一份声明。
 */

/** 一次 replay 读取的结果或 typed 失败——两路走同一张分支表。 */
export type WorkReplayOutcome =
  | { status: 'replayed'; replay: WorkReplayResult }
  | { status: 'failed'; error: unknown };

/**
 * 指针动作闭集。**没有 blanket clear 这一项**——清除只有 compare-and-clear 一种形态，
 * 「清掉一个不同 session 的记录」在类型层就写不出来。
 */
export type WorkPointerAction =
  | { kind: 'keep' }
  | { kind: 'persist'; record: WorkSessionRecord }
  | { kind: 'clear_if_matches'; sessionId: string };

/** 恢复动作闭集。与指针动作**正交**：completed 既是「只读水合」也是「保留指针」。 */
export type WorkRecoveryPlan =
  | { kind: 'retryable'; message: string }
  | { kind: 'unrecoverable'; message: string }
  | { kind: 'hydrate'; phase: 'paused' | 'failed' | 'completed'; events: SessionEvent[] };

export interface WorkRecoveryDecision {
  plan: WorkRecoveryPlan;
  pointer: WorkPointerAction;
}

/** 指针存储的最小注入面（生产实现是 `work-session-store` 的三个函数）。 */
export interface WorkPointerStore {
  read(caseId: string): WorkSessionRecord | null;
  persist(caseId: string, record: WorkSessionRecord): void;
  clear(caseId: string): void;
}

const NO_PROGRESS_COPY = '未找到可继续的合同审查进度，请重新开始审查';

/** typed replay 失败里**确认目标不可用**的两种；其余（含未分类）一律保留指针。 */
function isConfirmedUnusable(error: unknown): boolean {
  return error instanceof WorkReplayError && (error.reason === 'corrupt' || error.reason === 'ref_mismatch');
}

/**
 * 施加一次指针动作。清除路径先读当前值再比对 sessionId——存储值已换成另一 session 时**不动它**。
 * 这是「永不 blanket clear」的唯一执行点。
 */
export function applyWorkPointer(caseId: string, action: WorkPointerAction, store: WorkPointerStore): void {
  if (action.kind === 'keep') return;
  if (action.kind === 'persist') {
    store.persist(caseId, action.record);
    return;
  }
  const current = store.read(caseId);
  if (current?.sessionId === action.sessionId) store.clear(caseId);
}

export type StartOutcomePlan =
  | { kind: 'pointer'; action: WorkPointerAction }
  /** 瞬时 outcome 不足以判定持久事实：必须 replay candidate 后再定。 */
  | { kind: 'verify_by_replay' };

export interface WorkStartPointerTracker {
  /** 是否已观察到首枚 post-CAS event（＝「session 已建立」的首个可观察时点）。 */
  readonly established: boolean;
  /** 收到一枚 durable event。首枚即建立时点，此时才持久 candidate。 */
  observeDurableEvent(): WorkPointerAction;
  /** start 的 done outcome 到达。 */
  planOutcome(outcome: WorkCommandOutcome): StartOutcomePlan;
}

/**
 * fresh start 的指针建立/回收跟踪器。
 *
 * `previous` 是 start **之前**捕获的旧指针：它不参与写入判定（写只写 candidate），
 * 但它的存在正是「rejected 时旧记录必须逐字不变」这条约束的对象——故显式收进构造入参，
 * 让调用方无法忘记先捕获。
 */
export function createStartPointerTracker(input: {
  candidateSessionId: string;
  contractMaterialId: string;
  previous: WorkSessionRecord | null;
}): WorkStartPointerTracker {
  const record: WorkSessionRecord = {
    sessionId: input.candidateSessionId,
    contractMaterialId: input.contractMaterialId,
  };
  let established = false;
  return {
    get established() { return established; },
    observeDurableEvent() {
      if (established) return { kind: 'keep' };
      established = true;
      return { kind: 'persist', record };
    },
    planOutcome(outcome) {
      // rejected 是「这次根本没起跑」：旧记录逐字不变，临时 candidate 零持久。
      if (outcome.status === 'rejected') return { kind: 'pointer', action: { kind: 'keep' } };
      // canceled 只回收自己：candidate 从未建立时，compare-and-clear 自然不动旧指针。
      if (outcome.status === 'canceled') {
        return { kind: 'pointer', action: { kind: 'clear_if_matches', sessionId: record.sessionId } };
      }
      // failed 无论是否观察过事件都以 replay 为准——事件可能已落账、也可能停在 CAS 之前。
      if (outcome.status === 'failed') return { kind: 'verify_by_replay' };
      // paused/completed：本进程观察到过 durable event 即已建立；否则须先 replay 验真再补持久。
      return established
        ? { kind: 'pointer', action: { kind: 'keep' } }
        : { kind: 'verify_by_replay' };
    },
  };
}

/** 对 candidate 的一次 replay 结果 → 指针动作。只有 found=true 的可续/终态账本才配持久。 */
export function planCandidateReplay(
  outcome: WorkReplayOutcome,
  candidate: WorkSessionRecord,
): WorkPointerAction {
  if (outcome.status === 'failed') {
    return isConfirmedUnusable(outcome.error)
      ? { kind: 'clear_if_matches', sessionId: candidate.sessionId }
      : { kind: 'keep' };
  }
  if (!outcome.replay.found) return { kind: 'clear_if_matches', sessionId: candidate.sessionId };
  switch (outcome.replay.phase) {
    case 'paused':
    case 'failed':
    case 'completed':
      return { kind: 'persist', record: candidate };
    // start 失败后仍显示 running 的账本没有 owner：按 interrupted 回收，不留一个动不了的入口。
    case 'running':
    case 'canceled':
    case 'interrupted':
    default:
      return { kind: 'clear_if_matches', sessionId: candidate.sessionId };
  }
}

/**
 * 恢复入口的分支表：一次 replay（或 typed 失败）→ 该水合什么 + 指针该怎么动。
 *
 * `outcome` 用判别联合而不是 try/catch 参数，是为了让「抛错」这一路也被同一张表覆盖——
 * 调用方一旦漏掉某个分支，TypeScript 会在此报缺。**禁止** `.catch(() => null)` 与
 * 「非 paused 即清」总分支：前者把「读不到」谎报成「不存在」，后者会连 completed 账本一起抹掉。
 */
export function planWorkRecovery(
  outcome: WorkReplayOutcome,
  context: { sessionId: string; hasActiveOwner: boolean },
): WorkRecoveryDecision {
  const clearMatching: WorkPointerAction = { kind: 'clear_if_matches', sessionId: context.sessionId };
  if (outcome.status === 'failed') {
    const message = workReplayFailureCopy(outcome.error);
    // 确认不可用（corrupt / ref_mismatch）才回收；unavailable、unsupported_version 与任何
    // 未分类 rejection 都只是「暂时读不到」，保留指针并给可重试反馈。
    return isConfirmedUnusable(outcome.error)
      ? { plan: { kind: 'unrecoverable', message }, pointer: clearMatching }
      : { plan: { kind: 'retryable', message }, pointer: { kind: 'keep' } };
  }
  const { replay } = outcome;
  if (!replay.found) {
    return { plan: { kind: 'unrecoverable', message: NO_PROGRESS_COPY }, pointer: clearMatching };
  }
  switch (replay.phase) {
    case 'paused':
      // 零事件的 paused 水合不出任何账本，也就无处续行；指针随之回收。
      return replay.events.length > 0
        ? { plan: { kind: 'hydrate', phase: 'paused', events: replay.events }, pointer: { kind: 'keep' } }
        : { plan: { kind: 'unrecoverable', message: NO_PROGRESS_COPY }, pointer: clearMatching };
    case 'failed':
      return { plan: { kind: 'hydrate', phase: 'failed', events: replay.events }, pointer: { kind: 'keep' } };
    case 'completed':
      // completed 仍是审计账本：可只读重开，指针不因「已办结」而清除。
      return { plan: { kind: 'hydrate', phase: 'completed', events: replay.events }, pointer: { kind: 'keep' } };
    case 'running':
      return context.hasActiveOwner
        ? { plan: { kind: 'retryable', message: '本案的合同审查正在进行中' }, pointer: { kind: 'keep' } }
        : { plan: { kind: 'unrecoverable', message: NO_PROGRESS_COPY }, pointer: clearMatching };
    case 'canceled':
    case 'interrupted':
    default:
      return { plan: { kind: 'unrecoverable', message: NO_PROGRESS_COPY }, pointer: clearMatching };
  }
}

/** 调 replay 并把抛出的 typed 失败收进同一判别联合，供上面两张表统一分流。 */
export async function readWorkReplay(
  replay: (query: WorkSessionRef) => Promise<WorkReplayResult>,
  query: WorkSessionRef,
): Promise<WorkReplayOutcome> {
  try {
    return { status: 'replayed', replay: await replay(query) };
  } catch (error) {
    // 非 typed 的意外异常同样不吞：交给分支表走可重试兜底，绝不当作「不存在」。
    return { status: 'failed', error };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §2 React 装配：production Work run 的生命周期
//
// CONTRACT-TRACE-1「过手即拆」外提。本票触碰的 run/cancel/recover/pointer/completed-output
// 五处状态面原本全内联在 `App.tsx`，且彼此只经 pointer 与 sessionId 耦合——留在装配代码里，
// 「candidate 不是建立成功」「compare-and-clear」这两条就只能靠人读 JSX 之间的间隙来确认。
// 本节只做编排：不新增持久字段/版本、不造第二 store，判定全部复用上面 §1 的纯函数。
// ─────────────────────────────────────────────────────────────────────────────

/** 起跑所需的最小上下文；全部由 App 现取，hook 不自己读 selection。 */
export interface WorkRunLifecycleDeps {
  caseBinding: CaseBinding;
  selectedCaseId: string | null;
  workRunning: boolean;
  workSessionId: string | null;
  workContractMaterialId: string | null;
  workSubject: string;
  primaryContractId: string;
  caseMaterials: readonly StoredMaterial[];
  modelRoute: WorkModelRoute;
  workCommand: LegalS3WorkCommand;
  /** completed 的 grant 案：审阅面转只读，同时触发一次 inspect 复算。 */
  reviewReadOnly: boolean;
  outputDeps: ContractReviewOutputDeps;
  dispatch: (event: SessionEvent) => void;
  resetReview: () => void;
  clearGate: () => void;
  setWorkRunning: (running: boolean) => void;
  setWorkSessionId: (sessionId: string | null) => void;
  setWorkContractMaterialId: (materialId: string | null) => void;
  setWorkPhase: (phase: WorkProjectionPhase | undefined) => void;
  setPreviewOpen: (open: boolean) => void;
  showSystemFeedback: (message: string, ok: boolean, tone?: 'info') => void;
}

export interface WorkRunLifecycle {
  /** 本案是否有持久的可恢复会话指针（切案/重启后据此重现恢复入口）。 */
  recoverableSession: WorkSessionRecord | null;
  /** completed 只读重开时 coordinator 的 inspect/deliver 结果；唯一决定是否显示重试入口。 */
  contractOutputResult: ContractReviewOutputResult | undefined;
  start: () => void;
  cancel: () => void;
  recover: () => Promise<void>;
  retryOutput: () => void;
}

export function useWorkRunLifecycle(deps: WorkRunLifecycleDeps): WorkRunLifecycle {
  const [recoverableSession, setRecoverableSession] = useState<WorkSessionRecord | null>(null);
  /** 指针写/清后的重读信号：只推进计数，读哪一案由 effect 现取——回调闭包里的 caseId 可能已不是当前选中案。 */
  const [pointerEpoch, setPointerEpoch] = useState(0);
  const [contractOutputResult, setContractOutputResult] = useState<ContractReviewOutputResult>();
  const {
    caseBinding, selectedCaseId, workRunning, workSessionId, workContractMaterialId,
    workSubject, primaryContractId, caseMaterials, modelRoute, workCommand, reviewReadOnly,
    outputDeps, dispatch, resetReview, clearGate, setWorkRunning, setWorkSessionId,
    setWorkContractMaterialId, setWorkPhase, setPreviewOpen, showSystemFeedback,
  } = deps;

  /** 指针动作的唯一施加点。compare-and-clear 判定住 §1，此处只提供既有 store 的三个函数。 */
  const applyPointer = (caseId: string, action: WorkPointerAction) => {
    applyWorkPointer(caseId, action, {
      read: readWorkSession,
      persist: persistWorkSession,
      clear: clearWorkSession,
    });
    setPointerEpoch((epoch) => epoch + 1);
  };

  // WORK-LIVE-REPLAY-1：切案/重载后从持久层复读本案指针（fail-closed：不可读即当作无）。
  useEffect(() => {
    if (caseBinding.kind !== 'grant' || !selectedCaseId) {
      setRecoverableSession(null);
      return;
    }
    setRecoverableSession(readWorkSession(selectedCaseId));
  }, [caseBinding.kind, selectedCaseId, pointerEpoch]);

  /**
   * completed 只读重开时，「能否重试生成批注稿」**只认 coordinator 的 inspect 结果**——
   * 它把材料复验、编译与 stat 全走一遍而 file write = 0。不凭产物是否存在反推会话是否可交付：
   * 产物被访达删掉不等于账本没办结，产物在也不等于就是本次会话写的。
   */
  const runContractOutput = async (mode: 'inspect' | 'deliver') => {
    if (caseBinding.kind !== 'grant' || !selectedCaseId || !workSessionId || !workContractMaterialId) return undefined;
    const scope = {
      caseId: selectedCaseId,
      binding: caseBinding,
      pointer: { sessionId: workSessionId, contractMaterialId: workContractMaterialId },
    };
    const outcome = await readWorkReplay(workCommand.replay, { caseId: scope.caseId, sessionId: workSessionId });
    // 账本读不到不等于「未生成」：保持无重试入口的诚实空态，指针另由恢复入口处置。
    if (outcome.status !== 'replayed' || !outcome.replay.found) return undefined;
    return coordinateContractReviewOutput({ mode, replay: outcome.replay, scope }, outputDeps);
  };

  // 进入 completed 只读面即以 inspect 复算一次。
  useEffect(() => {
    if (!reviewReadOnly) {
      setContractOutputResult(undefined);
      return;
    }
    let cancelled = false;
    void runContractOutput('inspect').then((result) => {
      if (!cancelled) setContractOutputResult(result);
    });
    return () => { cancelled = true; };
  }, [reviewReadOnly, selectedCaseId, workSessionId, workContractMaterialId]);

  /** ready 重试：全落点则一写，任一未落点则 blocker 可见且零写；两者均零新增账本事件。 */
  const retryOutput = () => {
    void runContractOutput('deliver').then((result) => {
      if (!result) return;
      setContractOutputResult(result);
      if (result.status === 'delivered' || result.status === 'already_present') {
        showSystemFeedback(`已写入本案「产出」目录：${result.fileName}`, true);
      }
    });
  };

  // WORK-LIVE-1：grant（真实）案的 production S3 运行触发。显式主体来自受控 preflight（不从案名/
  // 文件名/正文/模型猜测）；材料经 resolveForProvider 复验才入 provider；事件机械发布进同一 session
  // 投影（零 recording）。
  const start = () => {
    if (caseBinding.kind !== 'grant' || !selectedCaseId || workRunning) return;
    // WORK-TURN-1 G 存量守卫：旧版铸号（标题拼入 id）在 work_state 安全 token 外——原位容忍，
    // 场景运行前显式引导（发生了什么+下一步），不让 Rust 侧技术红条兜底。
    if (!isWorkSafeCaseId(selectedCaseId)) {
      showSystemFeedback(LEGACY_CASE_SCENARIO_COPY, false, 'info');
      return;
    }
    const partyName = workSubject.trim();
    if (!partyName) return;
    // CONTRACT-OUTPUT-TRUTH-1：主合同由用户**显式选定**，不再按入库顺序猜。
    if (!primaryContractId) return;
    let materialRefs: string[];
    try {
      materialRefs = orderS3MaterialRefs(primaryContractId, caseMaterials);
    } catch {
      showSystemFeedback('所选主合同已不在本案可用材料中，请重新选择', false, 'info');
      return;
    }
    dispatch({ type: '__clear__' } as unknown as SessionEvent);
    clearGate();
    resetReview();
    setWorkContractMaterialId(primaryContractId);
    setWorkRunning(true);
    const caseId = selectedCaseId;
    // CONTRACT-TRACE-1：调 fresh start **之前**捕获旧 pointer——rejected 时它必须逐字不变。
    const previous = readWorkSession(caseId);
    let tracker: WorkStartPointerTracker | null = null;
    const { sessionId, done } = workCommand.startWithPreflight(
      {
        commandId: `s3-${caseId}-${Date.now()}`,
        caseId,
        materialRefs,
        modelRoute,
        subject: { partyName },
      },
      // 首枚 post-CAS event 才是「session 已建立」的首个可观察时点；`start()` 同步返回的
      // sessionId 只是 candidate，取得它本身不是建立成功，故此前**零持久**。
      // （`runStart` 在首次 publish 之前必先 await 材料重验，故 tracker 赋值先于任何事件到达。）
      (event) => {
        dispatch(event);
        if (tracker) applyPointer(caseId, tracker.observeDurableEvent());
      },
    );
    setWorkSessionId(sessionId);
    const candidate = { sessionId, contractMaterialId: primaryContractId };
    tracker = createStartPointerTracker({
      candidateSessionId: sessionId,
      contractMaterialId: primaryContractId,
      previous,
    });
    const startTracker = tracker;
    void done.then((outcome) => {
      setWorkRunning(false);
      // WORK-LIVE-1-FIX：rejected（未就绪/冲突，ADR-010 决定一闭集）是明确的产品语言中性反馈，
      // 不是错误红条；failed（provider/内部）才是错误。二者视觉与语义分离。
      if (outcome.status === 'rejected') {
        showSystemFeedback(outcome.message, false, 'info');
      } else if (outcome.status === 'failed') {
        // PROVIDER-STREAM-1 ③：失败报文过产品语守门；同时把 provider 侧脱敏留证持久到本地
        // （versioned 单键），供真机复现回填 fixture。
        showSystemFeedback(workFailureDisplayCopy(outcome.message), false);
        try {
          const evidence = readStreamEvidence();
          if (evidence.length > 0) {
            window.localStorage.setItem('courtwork.provider-evidence.v1', JSON.stringify({ version: 1, entries: evidence }));
          }
        } catch {
          /* 留证是尽力而为的诊断缓存：失败不影响主反馈 */
        }
      } else if (outcome.status === 'canceled') {
        showSystemFeedback('已停止合同审查', true);
      }
      // 持久事实只由 pointer 矩阵判：rejected 保留旧记录、canceled 只回收自己、
      // failed 与「未观察到事件的 paused/completed」一律 replay candidate 后再定。
      const plan = startTracker.planOutcome(outcome);
      if (plan.kind === 'pointer') {
        applyPointer(caseId, plan.action);
        return;
      }
      void readWorkReplay(workCommand.replay, { caseId, sessionId })
        .then((replayed) => applyPointer(caseId, planCandidateReplay(replayed, candidate)));
    });
  };

  const cancel = () => {
    if (caseBinding.kind !== 'grant' || !selectedCaseId || !workSessionId || !workRunning) return;
    void workCommand.cancel({ caseId: selectedCaseId, sessionId: workSessionId, commandId: `cancel-${Date.now()}` });
  };

  // WORK-LIVE-REPLAY-1：恢复入口——从持久指针调 workCommand.replay 水合投影续行。
  const recover = async () => {
    if (caseBinding.kind !== 'grant' || !selectedCaseId || workRunning) return;
    const record = readWorkSession(selectedCaseId);
    if (!record) {
      setRecoverableSession(null);
      return;
    }
    const caseId = selectedCaseId;
    // `hasActiveOwner: false` 不是猜测：本函数在 `workRunning` 为真时已提前 return，
    // 故走到这里的 running 相位账本在本进程内确定没有 owner，按 interrupted 回收。
    const outcome = await readWorkReplay(workCommand.replay, { caseId, sessionId: record.sessionId });
    const { plan, pointer } = planWorkRecovery(outcome, { sessionId: record.sessionId, hasActiveOwner: false });
    applyPointer(caseId, pointer);
    if (plan.kind !== 'hydrate') {
      showSystemFeedback(plan.message, false, 'info');
      return;
    }
    dispatch({ type: '__clear__' } as unknown as SessionEvent);
    for (const event of plan.events) dispatch(event);
    setWorkSessionId(record.sessionId);
    setWorkContractMaterialId(record.contractMaterialId);
    setWorkRunning(false);
    setWorkPhase(plan.phase);
    // 持久 failed 只读回放进度，不开工作面；paused/completed 由既有工作面承载（completed 只读）。
    if (plan.phase === 'failed') setPreviewOpen(false);
  };

  return { recoverableSession, contractOutputResult, start, cancel, recover, retryOutput };
}
