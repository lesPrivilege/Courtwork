import { PI_COPY } from './pi-copy';
import type { PiToolCallView } from './pi-projection';

/**
 * `PI-LANE-UI-1` · 一枚工具调用的卡。
 *
 * 四件工具共用一张卡，写面多出「提案 → 决定 → 结果」三段。三条硬判据落在这里：
 *
 * 1. **按钮只发 command**。点「允许写入」只调 `onDecide`；这张卡的状态由传进来的
 *    `call.decision` 决定，而那一枚只可能来自账本（ADR-009 2026-08-05 窄修订）。
 * 2. **uncertain 不冒充成功**。它既不进索引，也不显示「已写入」；只给一条核验动作，
 *    核验结果照实显示，永不补写成成功（ADR-022 六-D）。
 * 3. **朱砂稀缺**（设计凡例 §12）：只有拒绝／失败／无法确认三态带红记号；
 *    运行中与已写入都是冷中性，无风险即整屏无红。
 */
export function PiToolCard({
  call,
  pending,
  busy,
  onDecide,
  onOpen,
}: {
  call: PiToolCallView;
  /** 这一枚正是当前悬置提案——只有它显示两枚决定按钮。 */
  pending: boolean;
  /** 已投出回执、等账本落定：按钮收起，不给第二次点击的机会。 */
  busy: boolean;
  onDecide(operationId: string, verdict: 'approve' | 'deny'): void;
  onOpen(logicalPath: string, options: { verify: boolean }): void;
}) {
  const state = toolState(call);
  const completedWrite = call.effect?.state === 'succeeded';
  const writeRequest = call.proposal?.action === 'overwritten' ? '覆盖工作稿' : '新建工作稿';
  return (
    <section
      className="pi-tool-card"
      data-testid="pi-tool-card"
      data-tool={call.toolName}
      data-state={state}
      data-tool-call-id={call.toolCallId}
    >
      {call.proposal && (
        <p className="pi-tool-request" data-testid="pi-tool-request">
          {completedWrite
            ? call.proposal.action === 'overwritten'
              ? PI_COPY.wroteOverwritten
              : PI_COPY.wroteCreated
            : writeRequest}
          <span aria-hidden="true"> · </span>
          <b>{call.proposal.logicalPath}</b>
        </p>
      )}

      <header className="pi-tool-head">
        <span className="pi-tool-name">{call.toolName}</span>
        {call.proposal && <span className="pi-tool-path">{call.proposal.logicalPath}</span>}
        <span className="pi-tool-state">{stateLabel(call, state)}</span>
      </header>

      {call.proposal && (
        <details className="pi-tool-details" data-testid="pi-tool-details">
          <summary>{PI_COPY.runDetails}</summary>
          <dl className="pi-tool-facts">
            <div>
              <dt>动作</dt>
              <dd>{call.proposal.action === 'overwritten' ? '覆盖既有' : '新建'}</dd>
            </div>
            <div>
              <dt>字节</dt>
              <dd className="pi-mono">{call.proposal.byteLength}</dd>
            </div>
            <div>
              <dt>内容校验</dt>
              <dd className="pi-mono">{call.proposal.contentSha256.slice(0, 12)}</dd>
            </div>
          </dl>
        </details>
      )}

      {pending && (
        <div className="pi-tool-decision" data-testid="pi-proposal">
          <p className="pi-tool-ask">{PI_COPY.proposalTitle}</p>
          <p className="pi-tool-hint">{PI_COPY.proposalHint}</p>
          {busy ? (
            <p className="pi-tool-hint" data-testid="pi-decision-waiting">
              {PI_COPY.waitingDecision}
            </p>
          ) : (
            <div className="pi-tool-actions">
              <button
                type="button"
                className="pi-button pi-button-primary"
                data-testid="pi-approve"
                onClick={() => call.proposal && onDecide(call.proposal.operationId, 'approve')}
              >
                {PI_COPY.approveAction}
              </button>
              <button
                type="button"
                className="pi-button pi-button-deny"
                data-testid="pi-deny"
                onClick={() => call.proposal && onDecide(call.proposal.operationId, 'deny')}
              >
                {PI_COPY.denyAction}
              </button>
            </div>
          )}
        </div>
      )}

      {state === 'uncertain' && (
        <p className="pi-tool-hint pi-tool-alert" data-testid="pi-uncertain-hint">
          {PI_COPY.uncertainHint}
        </p>
      )}

      {call.effect?.state === 'succeeded' && call.effect.logicalPath && (
        <button
          type="button"
          className="pi-button pi-button-quiet"
          data-testid="pi-open-from-card"
          onClick={() =>
            onOpen(call.effect?.logicalPath ?? '', { verify: false })
          }
        >
          {PI_COPY.openDraft}
        </button>
      )}

      {state === 'uncertain' && call.proposal && (
        <button
          type="button"
          className="pi-button pi-button-quiet"
          data-testid="pi-verify-uncertain"
          onClick={() => call.proposal && onOpen(call.proposal.logicalPath, { verify: true })}
        >
          {PI_COPY.verifyDraft}
        </button>
      )}
    </section>
  );
}

/** 卡的单一状态字。次序即优先级：结果压过决定，决定压过运行。 */
export function toolState(call: PiToolCallView): string {
  if (call.effect?.state === 'succeeded') return 'succeeded';
  if (call.effect?.state === 'uncertain') return 'uncertain';
  if (call.effect?.state === 'failed') return 'failed';
  if (call.decision?.decision === 'denied') return 'denied';
  if (call.decision?.decision === 'approved') return 'approved';
  if (call.proposal) return 'proposed';
  return call.running ? 'running' : 'finished';
}

function stateLabel(call: PiToolCallView, state: string): string {
  switch (state) {
    case 'succeeded':
      return call.effect?.state === 'succeeded' && call.proposal?.action === 'overwritten'
        ? PI_COPY.wroteOverwritten
        : PI_COPY.wroteCreated;
    case 'uncertain':
      return PI_COPY.uncertain;
    case 'failed':
      return PI_COPY.failed;
    case 'denied':
      return call.decision?.code === 'user_denied' ? PI_COPY.denied : PI_COPY.deniedByStop;
    case 'proposed':
      // 头上留白：这一态的全部信息在卡体的决定区，头再说一遍只是噪声。
      return '';
    case 'running':
      return PI_COPY.running;
    default:
      return call.outcome === 'error' ? PI_COPY.failed : '已完成';
  }
}
