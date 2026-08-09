import { MissingPrimaryMaterialAnchorError, type RiskList } from '@courtwork/legal';
import { InvalidZipTimestampError, SignedDocumentUnsupportedError } from '@courtwork/output';
import type { SessionEvent } from '@courtwork/core';
import type { CaseBinding } from '../../case/case-scope';
import type { OutputMaterialReadResult } from '../../material/material-store';
import type { WorkReplayResult } from '../../protocol/client';
import { S3_REVIEW_GATE_LABEL } from './contract-review-flow';
import { S3_RISK_LIST_TYPE } from './legal-s3-binding';
import {
  compileConfirmedReviewToDocx,
  type NonAppliedReason,
  type PendingRevisionConfirmation,
} from './compile-review-output';
import { contractReviewOutputFileName } from '../../output/contract-review-file-name';
import type { CaseOutputStatResult, CaseOutputWriteResult } from '../../output/case-output-client';

/**
 * CONTRACT-OUTPUT-TRUTH-1 · O7：合同审查批注稿的**唯一** production 编排。
 *
 * 本单新增的唯一概念，非加不可的理由是 **scope 冻结**：inspect/deliver 必须在一次同步的
 * active-case snapshot 内捕获 caseId / binding / pointer。现行编排散在 React 回调里，`await`
 * 之后可以重读 selection——那正是「A 案 replay 写进 B 案 grant」的结构性口子。本模块是纯函数式
 * 的判别联合返回值，不是抽象层：它不持有状态、不碰 React、不发事件。
 */

/** 一条阻断用的未落点项。不承载 waiver id——production 没有「确认知悉后跳过」。 */
export interface NonAppliedBlocker {
  riskId: string;
  summary: string;
  reason: NonAppliedReason;
  quote: string;
}

export type ContractReviewOutputResult =
  | { status: 'ready_to_deliver'; fileName: string }
  | { status: 'delivered' | 'already_present'; fileName: string; byteLength: number; sha256: string }
  | { status: 'not_applicable'; reason: 'no_risks' | 'all_rejected' | 'out_of_coverage' }
  | {
      status: 'blocked';
      reason: 'non_applied';
      message: string;
      items: readonly [NonAppliedBlocker, ...NonAppliedBlocker[]];
    }
  | {
      status: 'blocked';
      reason:
        | 'invalid_session'
        | 'ledger_unavailable'
        | 'authorization_invalid'
        | 'material_blocked'
        | 'signed_docx'
        | 'output_conflict'
        | 'output_unavailable';
      message: string;
      items?: never;
    };

export type OutputMaterialReader = (
  caseId: string,
  materialId: string,
) => Promise<OutputMaterialReadResult>;

export interface ContractReviewOutputDeps {
  readMaterial: OutputMaterialReader;
  statDocx: (binding: CaseBinding, fileName: string) => Promise<CaseOutputStatResult>;
  writeDocxNoReplace: (
    binding: CaseBinding,
    fileName: string,
    bytes: Uint8Array,
  ) => Promise<CaseOutputWriteResult>;
}

export interface ContractReviewOutputScope {
  caseId: string;
  binding: CaseBinding;
  pointer: { sessionId: string; contractMaterialId: string };
}

export interface ContractReviewOutputInput {
  mode: 'inspect' | 'deliver';
  /** 必须是完整的 found=true `WorkReplayResult`；found:false 结构上进不来。 */
  replay: Extract<WorkReplayResult, { found: true }>;
  scope: ContractReviewOutputScope;
}

const BLOCK_COPY = {
  invalid_session: '本次审查的记录不完整，暂时无法生成批注稿',
  ledger_unavailable: '未能从本案账本读出可用的审查结论，暂时无法生成批注稿',
  authorization_invalid: '本次生成所依据的确认记录与账本不一致，未生成批注稿',
  material_blocked: '主合同原件复验未通过，未生成批注稿',
  signed_docx: '主合同带有数字签名，生成批注稿会使签名失效；请先另存为未签名副本后再审查',
  output_conflict: '本案「产出」目录已有同名批注稿且内容不同，未覆盖',
  output_unavailable: '暂时无法写入本案「产出」目录，未生成批注稿',
  non_applied: '已确认风险中有条目未能唯一落到主合同；整份批注稿未生成',
} as const;

function blocked(
  reason: Exclude<
    Extract<ContractReviewOutputResult, { status: 'blocked' }>['reason'],
    'non_applied'
  >,
): ContractReviewOutputResult {
  return { status: 'blocked', reason, message: BLOCK_COPY[reason] };
}

/**
 * output 授权只认一对**相互匹配**的账本事件：S3 `confirmation_requested` 的 exact gateLabel
 * + 同 requestId、`decision='confirm'` 的 `confirmation_resolved`。缺失、重复矛盾、label/decision
 * 漂移一律不成立——不能拿 replay 中任意或最新一枚 resolved 代替。
 *
 * 判据的两个输入（gate label 与 artifact type）直接复用 SAFETY 与 Legal 的导出常量，
 * 不在此另抄一份字面量。
 */
function findMatchingConfirmation(
  events: readonly SessionEvent[],
): Extract<SessionEvent, { type: 'confirmation_resolved' }> | null {
  const requested = events.filter(
    (event): event is Extract<SessionEvent, { type: 'confirmation_requested' }> =>
      event.type === 'confirmation_requested'
      && event.gateLabel === S3_REVIEW_GATE_LABEL
      && event.artifactType === S3_RISK_LIST_TYPE,
  );
  if (requested.length !== 1) return null;
  const requestId = requested[0]!.requestId;
  const resolved = events.filter(
    (event): event is Extract<SessionEvent, { type: 'confirmation_resolved' }> =>
      event.type === 'confirmation_resolved' && event.requestId === requestId,
  );
  if (resolved.length !== 1 || resolved[0]!.decision !== 'confirm') return null;
  return resolved[0]!;
}

/** replay 中**最后一枚** post-revision RiskList；缺失即账本不可用（不猜、不用旧闭包）。 */
function latestPersistedRiskList(events: readonly SessionEvent[]): RiskList | null {
  let latest: RiskList | null = null;
  for (const event of events) {
    if (event.type === 'artifact_produced' && event.artifactType === S3_RISK_LIST_TYPE) {
      latest = event.artifact as RiskList;
    }
  }
  return latest;
}

/** UTC ISO 严格往返：`toISOString()` 逐字相等才算合法，否则产物时间与账本时间不是同一件事。 */
function strictUtcInstant(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString() === value ? parsed : null;
}

function toBlockers(items: readonly PendingRevisionConfirmation[]): NonAppliedBlocker[] {
  return items.map((item) => ({
    riskId: item.riskId,
    summary: item.summary,
    reason: item.reason,
    quote: item.quote,
  }));
}

/**
 * 唯一 inspect/deliver 编排。
 *
 * 优先级固定，且**三种正常不产文书结果必须在触材料/宿主之前返回**——否则 unbound、撤权或材料
 * 失败会把「本次没有可交付的风险」遮成一句技术故障，用户看到的是错的那件事。
 */
export async function coordinateContractReviewOutput(
  input: ContractReviewOutputInput,
  deps: ContractReviewOutputDeps,
): Promise<ContractReviewOutputResult> {
  const { replay, scope } = input;

  // ① scope / replay / ref / pointer 同源——await 之后不再重读，冻结在调用时刻。
  if (scope.caseId !== replay.ref.caseId) return blocked('invalid_session');
  if (scope.pointer.sessionId !== replay.ref.sessionId) return blocked('invalid_session');
  if (scope.pointer.contractMaterialId !== replay.materialRefs[0]) return blocked('invalid_session');
  const sessionCreatedAt = strictUtcInstant(replay.sessionCreatedAt);
  if (!sessionCreatedAt) return blocked('invalid_session');

  // ② 授权账本：exact gateLabel + 同 requestId + decision='confirm' 的一对相互匹配事件。
  const authorization = findMatchingConfirmation(replay.events as SessionEvent[]);
  if (!authorization) return blocked('authorization_invalid');
  const confirmedAt = strictUtcInstant(authorization.emittedAt);
  if (!confirmedAt) return blocked('invalid_session');

  // ③ 最后一枚 post-revision RiskList。
  const riskList = latestPersistedRiskList(replay.events as SessionEvent[]);
  if (!riskList) return blocked('ledger_unavailable');
  if (riskList.risks.some((risk) => risk.dispositionStatus === 'pending')) {
    return blocked('ledger_unavailable');
  }

  // ④ 三种**正常**不产文书终态，先于任何材料/文件系统接触。
  if (riskList.outOfCoverage.length > 0) {
    return { status: 'not_applicable', reason: 'out_of_coverage' };
  }
  if (riskList.risks.length === 0) return { status: 'not_applicable', reason: 'no_risks' };
  const confirmed = riskList.risks.filter((risk) => risk.dispositionStatus === 'confirmed');
  if (confirmed.length === 0) return { status: 'not_applicable', reason: 'all_rejected' };

  // ⑤ 只有到这里才要求 grant binding——放在前面会遮蔽上面三种正常终态。
  if (scope.binding.kind !== 'grant') return blocked('output_unavailable');

  const fileName = await contractReviewOutputFileName(sessionCreatedAt, replay.ref.sessionId);

  // ⑥ 材料：exactly-one snapshot 读取与复验。
  const material = await deps.readMaterial(scope.caseId, scope.pointer.contractMaterialId);
  if (material.status !== 'ready') return blocked('material_blocked');

  // ⑦ 编译。产品语与 typed 阻断的映射逐条固定，零裸 throw 外泄。
  let compiled;
  try {
    compiled = compileConfirmedReviewToDocx({
      riskList,
      originalDocx: material.bytes,
      primaryMaterialId: scope.pointer.contractMaterialId,
      evidenceGrades: [],
      // 批注时间取已持久的确认时刻——不是 new Date()。同 session 重编译必须 byte-identical。
      now: confirmedAt,
    });
  } catch (error) {
    if (error instanceof SignedDocumentUnsupportedError) return blocked('signed_docx');
    if (error instanceof InvalidZipTimestampError) return blocked('invalid_session');
    if (error instanceof MissingPrimaryMaterialAnchorError) {
      // Legal 的缺主合同锚机械映为 non_applied + 既有 not_located：零 instruction、零 waiver、
      // 零 output 调用。不扩 NonAppliedReason，也不与「有锚但缺 quote」混并。
      const items = error.items.map((item) => ({
        riskId: item.riskId,
        summary: item.summary,
        reason: 'not_located' as const,
        quote: item.quote,
      }));
      return {
        status: 'blocked',
        reason: 'non_applied',
        message: BLOCK_COPY.non_applied,
        items: items as [NonAppliedBlocker, ...NonAppliedBlocker[]],
      };
    }
    return blocked('ledger_unavailable');
  }

  if (compiled.status === 'needs_confirmation') {
    const items = toBlockers(compiled.pending);
    if (items.length === 0) return blocked('ledger_unavailable');
    return {
      status: 'blocked',
      reason: 'non_applied',
      message: BLOCK_COPY.non_applied,
      items: items as [NonAppliedBlocker, ...NonAppliedBlocker[]],
    };
  }

  const bytes = new Uint8Array(compiled.docx);
  const expected = { byteLength: bytes.byteLength, sha256: await sha256Hex(bytes) };

  // ⑧ 写前 stat：同值即幂等已交付、零二写；异值即冲突、零覆盖。
  const preStat = await deps.statDocx(scope.binding, fileName);
  if (preStat.status === 'failed') return blocked('output_unavailable');
  if (preStat.status === 'found') {
    return sameArtifact(preStat, expected)
      ? { status: 'already_present', fileName, ...expected }
      : blocked('output_conflict');
  }

  // ⑨ inspect 到此为止：材料/编译/stat 全走过，file write = 0。
  if (input.mode === 'inspect') return { status: 'ready_to_deliver', fileName };

  const write = await deps.writeDocxNoReplace(scope.binding, fileName, bytes);
  if (write.status === 'failed' && write.reason === 'invalid_input') {
    return blocked('output_unavailable');
  }

  // ⑩ **任何** write outcome 之后都重新 stat：written 也可能没落稳，failed 也可能已经落成。
  //    只有 post-stat 与预期 byteLength/SHA-256 同时一致才敢说成功。
  const postStat = await deps.statDocx(scope.binding, fileName);
  if (postStat.status === 'failed' || postStat.status === 'missing') {
    return blocked('output_unavailable');
  }
  if (!sameArtifact(postStat, expected)) return blocked('output_conflict');
  return write.status === 'written'
    ? { status: 'delivered', fileName, ...expected }
    : { status: 'already_present', fileName, ...expected };
}

function sameArtifact(
  stat: Extract<CaseOutputStatResult, { status: 'found' }>,
  expected: { byteLength: number; sha256: string },
): boolean {
  return stat.byteLength === expected.byteLength && stat.sha256 === expected.sha256;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes.slice().buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
