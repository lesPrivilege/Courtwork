/**
 * `PI-LANE-UI-1` · pi 面的内容面文案（中文）。
 *
 * 语言分层照 `docs/design/voice.md`：通用 chrome 走英文（`chrome/copy.ts` 的 segment 名），
 * **案件内容面**——提案、授权、失败、空态、工作稿——走中文办案词表。工具名
 * （`read`／`glob`／`grep`／`write`）是 voice §6 明许的英文 affordance，不翻译。
 *
 * 体例逐条对表：§1 动词+名词、§2 发生了什么 ＋ 下一步、§3 「已 + 动词」不喊成功、
 * §4 进行态用「……中」、§5 空态指向第一动作。
 */
export const PI_COPY = {
  /** 空态：指向此处的第一个动作（§5）。 */
  emptyTitle: '尚无工作稿',
  emptyBody: '说清要整理什么 · 先读案件材料，再写成一份 Markdown 工作稿',
  emptyUnbound: '这个案件还没有绑定文件夹 · 绑定后即可开始一段工作',
  unavailableBody: '模型或凭据不可用 · 请先打开模型设置恢复连接',
  bindFolderAction: '绑定文件夹',
  openModelSettingsAction: '打开模型设置',
  matterContextLabel: '当前工作区',
  runDetails: '运行详情',
  toolLabel: '工具',
  actionLabel: '动作',
  bytesLabel: '字节',
  hashLabel: '内容校验',
  readAction: '读取案件材料',
  globAction: '查找案件材料',
  grepAction: '检索案件材料',
  writeAction: '写入工作稿',
  sessionIdLabel: '会话 ID',
  startAction: '开始一段工作',
  restartAction: '另起一段工作',
  starting: '正在准备运行环境…',
  running: '工作中…',
  stopAction: '停止本次运行',
  sendAction: '发起工作',
  inputLabel: '要整理什么',
  inputPlaceholder: '例如：把案件材料里的合同编号与金额整理成一份纪要',

  /** 逐次授权（§1 动词+名词；不用裸「确认」）。 */
  proposalTitle: '待你决定：写入工作稿',
  proposalHint: '模型只提出写入，落盘与否由你决定',
  approveAction: '允许写入',
  denyAction: '拒绝写入',
  waitingDecision: '等待你的决定…',

  /** 结果（§3 「已 + 动词」）。 */
  wroteCreated: '已新建工作稿',
  wroteOverwritten: '已覆盖工作稿',
  denied: '已拒绝写入',
  deniedByStop: '已随停止一并拒绝',
  failed: '未能写入',
  uncertain: '无法确认是否已写入',
  uncertainHint: '这份工作稿可能已落盘、也可能没有 · 请打开核验当前内容',

  /** 工作稿索引与只读查看。 */
  draftsTitle: '本段工作稿',
  draftsEmpty: '本段尚无已确认的工作稿',
  priorDraftsTitle: '上一段工作稿（只读）',
  openDraft: '打开工作稿',
  verifyDraft: '核验当前文件',
  closeViewer: '关闭工作稿',
  viewerReadOnly: '只读查看 · 不可编辑，也不会写回',
  viewerDetails: '文件详情',
  viewerLoading: '正在打开工作稿…',
  unverified: '未确认',
  hashDiffers: '当前内容已不同于已确认版本',
  notFound: '这份工作稿已经不在了 · 可能已被清理',

  /** 运行与预算。 */
  turnsLabel: '回合',
  costLabel: '开销',
  costUnknown: '未知',
  budgetStopped: '已达本段上限 · 请另起一段继续',
  /**
   * `budget_unknown` 的具名成因（`PI-JOURNAL-TIGHTEN-1` 段④）。
   *
   * 与 {@link PI_COPY.budgetStopped} 分流：那一句说的是**真达上限**，这一句说的是「有一回合
   * 没拿到计费数据，费用因此不可核算」。金额限额是严格模式——不可核算即终止本段（该代价在
   * 设置面开启限额的时点讲明），但成因两样，文案不得同源。
   */
  budgetUnknown: '本段有一回合没拿到计费数据 · 费用已无法核算，请另起一段继续',
  canceled: '已停止',
  sessionClosed: '这一段工作已经结束 · 请另起一段',
  interrupted: '上一段被中断 · 已从账本恢复',

  /** fail-closed：认不出的记录。 */
  decodeFailed: '运行记录里出现了无法识别的内容 · 已停止显示，请重新开始这段工作',
} as const;

/**
 * 会话终态的**唯一**文案取法：成因住账本（`session_budget_stopped` 型，或 `session_failed`
 * 的 prompt 成因码），文案只按成因分档，不在渲染处二次判断。
 */
export function piSessionClosedCopy(terminal: { type: string; detail?: string }): string {
  if (terminal.type === 'session_budget_stopped') return PI_COPY.budgetStopped;
  if (terminal.detail === 'budget_unknown') return PI_COPY.budgetUnknown;
  return PI_COPY.sessionClosed;
}
