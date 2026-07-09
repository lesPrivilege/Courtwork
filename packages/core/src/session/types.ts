/**
 * 会话续行/会话链预留（SPEC TODO）：session 需要 lineage（链 ID + 前驱 session 引用），
 * 使确认记录与 RevisionEvent 能跨"用户点按钮开新 session 续行"之后的多个 session
 * 追溯。W6 不实现续行本身（结构化再水化按钮是 W9 之后的事），只保证协议里存在
 * 这个概念，不隐含"一个 session 是一条连续对话的全部生命周期"的假设——
 * EventLog/ConfirmationStore/RevisionEventStore 均以任意字符串 sessionId/文件路径
 * 寻址，续行只需要沿用同一个 chainId、把 predecessorSessionId 指向上一个 session，
 * 不需要改动这三者的接口形状。
 */
export interface Session {
  id: string;
  chainId: string;
  predecessorSessionId?: string;
  createdAt: string;
}

/** 开启一条新链的第一个 session：chainId 缺省等于自己的 id。 */
export function createSession(id: string, now: () => string = () => new Date().toISOString()): Session {
  return { id, chainId: id, createdAt: now() };
}

/** 续行：新 session 沿用前驱的 chainId（不是前驱的 predecessorSessionId），predecessorSessionId 指向前驱本身。 */
export function continueSession(newId: string, predecessor: Session, now: () => string = () => new Date().toISOString()): Session {
  return { id: newId, chainId: predecessor.chainId, predecessorSessionId: predecessor.id, createdAt: now() };
}
