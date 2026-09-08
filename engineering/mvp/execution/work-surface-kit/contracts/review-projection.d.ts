// WO-WK3 · 前端投影类型（只供 app/web 与 fixture；不进 app/runtime）
export type QuestionStatus = 'pending' | 'resolved' | 'expired_restart' | 'cancelled';
export type PermissionStatus = 'pending' | 'allow' | 'deny' | 'expired_restart' | 'cancelled';
export type OutcomeStatus = 'completed' | 'cancelled' | 'failed' | 'unknown';
export type ReviewAction = 'answer' | 'allow' | 'deny';
export interface PermissionTarget { path: string; bytes: number; contentSha256: string; toolCallId: string }
export interface ReviewProjection {
  kind: 'permission' | 'question' | 'outcome';
  id: string;
  sessionId: string;
  summary: string;
  target?: PermissionTarget;
  status: QuestionStatus | PermissionStatus | OutcomeStatus;
  actions: ReviewAction[];
  decision?: string;
  createdAt?: string;
}
export type ReviewSet = 'pendingItems' | 'sessionCandidates' | 'inspectionCandidates';
// commit gate: 待 Core 契约（core-contracts §2）；此处不定义。
