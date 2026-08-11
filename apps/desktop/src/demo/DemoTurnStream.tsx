import type { SessionProjection } from '../protocol/client';
import type { ScenarioFlow } from '../protocol/client';
import { ToolCallRow, TurnCard } from '../chat/TurnCard';

/**
 * 样板案助手回合的事件流（TOOL-READ-1 「过手即拆」外提）。
 *
 * 原内联在 `App.tsx` 的 demo 分支里。本票要在同一处补两族条目——模型请求的只读工具结果
 * 与未识别账本条目——故按纪律把整段 JSX 连同既有事件卡列表一并外提，App.tsx 只留一次调用。
 * 组件本身不新造 UI 原语，只是既有 `ToolCallRow` / `TurnCard` 的编排；垂类文案随 demo 族。
 */
export function DemoTurnStream({ session, flow, workStopped }: {
  session: SessionProjection;
  /** demo 容器才有 flow（非 demo 为 null）；本组件只在 demo 分支挂载，null 走 S3 之外的中性分支。 */
  flow: ScenarioFlow | null;
  workStopped: boolean;
}) {
  return (
    <>
      {/* TOOL-READ-1 裁定六/十：模型请求的只读工具结果投影自 EventLog 账本条目，复用既有
          ToolCallRow 原语——界面事件面就是账本本身，不折成通用文本行、不丢结构与来源标记。 */}
      {session.modelToolResults.map((entry) => (
        <ToolCallRow
          key={`${entry.toolId}-${entry.round}-${entry.seq}`}
          label={entry.verified ? '模型请求的只读查询' : '模型请求的只读查询未取得结果'}
          tool={entry.toolId}
          args={`round=${entry.round} step=${entry.stepId}`}
          result={entry.content}
        />
      ))}
      {/* 裁定七运行期层：未识别账本条目须可在 trace 面看见，不静默跳过。 */}
      {session.unrecognizedEntries.length > 0 && (
        <p className="turn-recovery-error" role="status" data-testid="unrecognized-ledger-entries">
          账本中有 {session.unrecognizedEntries.length} 条未识别记录未参与呈现（{session.unrecognizedEntries.map((entry) => `#${entry.seq} ${entry.type}`).join('、')}）
        </p>
      )}
      <div className="turn-event-stream" data-testid="event-stream">
        <TurnCard kind="event" icon="chevron-right" eyebrow={flow === 'S1' ? 'D20' : 'D04'} title={flow === 'S1' ? '卷宗整理已启动' : '合同审查已启动'} status="success" testId="turn-event-start" />
        {session.progress.map((message, index) => (
          <TurnCard key={`${message}-${index}`} kind="event" icon="chevron-right" eyebrow={String(index + 1).padStart(2, '0')} title={message} status={workStopped ? 'idle' : session.confirmation ? 'success' : 'active'} testId={`turn-event-progress-${index}`} />
        ))}
        {!workStopped && (session.confirmation || session.completed) && (
          <TurnCard kind="event" icon="chevron-right" eyebrow="完成" title={flow === 'S3' ? '审阅提示已送达右侧工作面' : '事件与主体关系已完成交叉核对'} status="success" testId="turn-event-finish" />
        )}
      </div>
    </>
  );
}
