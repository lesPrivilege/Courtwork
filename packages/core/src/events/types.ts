import type { ArtifactType } from '@courtwork/schemas';
import type { EvidenceGradeAnnotation } from '../evidence/grade.js';
import type { TodoStep } from '../scenario-executor/todo-snapshot.js';

/**
 * 渠道无关身份标识：不隐含确认方与 core 同进程/同机/同客户端（SPEC TODO 异步确认预留）。
 * channelId 对应未来的 IM/工作流通道网关（企微/飞书/钉钉/律所内部 OA），actorId 对应
 * RevisionEvent.actor.userId。
 */
export interface ConfirmationActor {
  channelId: string;
  actorId: string;
  role?: string;
}

/**
 * 确认质量埋点透传字段（docs/09 防呆调研 + docs/30 拍板"防呆三原则"之三，2026-07-09
 * 追加）：core 只记录，不解读、不告警——告警/重新设计判定是 MVP 后 eval/运营面板的职责。
 */
export interface ConfirmationInstrumentation {
  dwellMs?: number;
  expandedEvidenceKeys?: string[];
}

interface BaseEvent {
  sessionId: string;
  seq: number;
  emittedAt: string;
}

export type SessionEvent =
  | (BaseEvent & { type: 'progress'; message: string })
  | (BaseEvent & {
      type: 'artifact_produced';
      artifactType: ArtifactType;
      artifact: unknown;
      /** D4 台账的投影：W9 渲染信源等级角标的数据源，不需要改 schemas（判断点 3 追加要求）。 */
      evidenceGrades: EvidenceGradeAnnotation[];
    })
  | (BaseEvent & {
      type: 'confirmation_requested';
      requestId: string;
      gateLabel: string;
      artifactType?: ArtifactType;
    })
  | (BaseEvent & {
      type: 'confirmation_resolved';
      requestId: string;
      actor: ConfirmationActor;
      decision: 'confirm' | 'reject';
      instrumentation?: ConfirmationInstrumentation;
    })
  | (BaseEvent & { type: 'revision_recorded'; revisionEventId: string })
  | (BaseEvent & {
      /**
       * 进度快照（docs/12 长任务协议①）：steps 由 deriveTodoSnapshot 纯函数从场景声明
       * 派生，LLM 不参与撰写/增删这份清单。
       */
      type: 'todo_snapshot';
      steps: TodoStep[];
    })
  | (BaseEvent & {
      /**
       * 步骤级失败（docs/12 长任务协议②），区别于笼统的 error 事件：目前只覆盖工具调用
       * 粒度的失败——工具契约本身已经把失败降级为结构化的 verified:false（不抛异常，
       * 见 @courtwork/tools），这里只是把"发生过一次工具级降级"这件事显式发布到会话
       * 事件流，使调用方不需要另外轮询/推断。生成节点级失败（provider 返回内容不合规）
       * 仍然显式抛出中断——不预先构建未经验证的部分成功恢复语义。
       */
      type: 'step_failed';
      scope: 'tool';
      toolId: string;
      reason: string;
      message: string;
    })
  | (BaseEvent & { type: 'scenario_completed' })
  | (BaseEvent & { type: 'error'; message: string });

/**
 * 普通 Omit 在判别联合上不分发（keyof (A|B) 只保留两者共有的键），会把
 * SessionEvent 塌缩成只剩 BaseEvent 公共字段——用 T extends any ? ... : never
 * 触发分发式条件类型，逐个联合成员分别做 Omit 再重新联合。
 */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

export type SessionEventInput = DistributiveOmit<SessionEvent, 'seq' | 'emittedAt' | 'sessionId'>;
