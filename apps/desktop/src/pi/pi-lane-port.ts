/**
 * `PI-LANE-UI-1` · pi 线的宿主端口契约（React 侧）。
 *
 * 五枚命令与一枚只读查询，形状与 Rust 薄壳逐枚对应：
 * `start` 之外一律**投进通道即返**，结果只经账本流回来（ADR-009 2026-08-05 窄修订）。
 * 端口自身不解释语义、不缓存状态、不重排顺序——它只是过桥。
 */

/** ADR-022 六-A 的四项启动输入。案件根与凭证**不在**其中：宿主自己解析、自己取。 */
export interface PiLaneStartInput {
  readonly containerId: string;
  readonly sessionId: string;
  readonly grantId: string;
  readonly modelId: string;
  readonly limits: { readonly maxTurns: number; readonly maxUsd: number | null };
}

export interface PiLaneStartReply {
  readonly capabilities: readonly string[];
  readonly leg: number;
  /** 起步时账本上已有的全部记录（含恢复出的历史腿）。与后续流不重叠。 */
  readonly records: readonly string[];
}

export interface PiLaneSessionRef {
  readonly containerId: string;
  readonly sessionId: string;
}

export type PiLaneVerdict = 'approve' | 'deny';

/** 宿主给的结构化失败：闭集 code ＋ 可直接呈现的中文文案。 */
export interface PiLaneFailure {
  readonly code: string;
  readonly message: string;
}

/** `openWorkspaceMarkdown` 的成功三元组（ADR-022 六-D）。物理路径不在其中。 */
export interface PiWorkspaceMarkdown {
  readonly logicalPath: string;
  readonly content: string;
  readonly contentSha256: string;
  readonly byteLength: number;
}

export type PiWorkspaceResult =
  | { readonly ok: true; readonly view: PiWorkspaceMarkdown }
  | { readonly ok: false; readonly failure: PiLaneFailure };

export interface PiLanePort {
  /**
   * 起一条工作。`onRecord` 收的是宿主 durable 到盘上的**原字节**（一行一枚记录）。
   * 失败以 {@link PiLaneFailure} reject。
   */
  start(input: PiLaneStartInput, onRecord: (line: string) => void): Promise<PiLaneStartReply>;
  prompt(input: PiLaneSessionRef & { requestId: string; text: string }): Promise<void>;
  cancel(ref: PiLaneSessionRef): Promise<void>;
  /** 审批按钮的**全部**作用：投一枚回执。界面状态等 `authorization_decided` 落账才动。 */
  decision(
    input: PiLaneSessionRef & { operationId: string; verdict: PiLaneVerdict },
  ): Promise<void>;
  teardown(ref: PiLaneSessionRef): Promise<void>;
  /** 只读查看。宿主只交出当刻事实，比对由界面自己做。 */
  openWorkspaceMarkdown(
    input: PiLaneSessionRef & { logicalPath: string },
  ): Promise<PiWorkspaceResult>;
}

export function isPiLaneFailure(value: unknown): value is PiLaneFailure {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PiLaneFailure).code === 'string' &&
    typeof (value as PiLaneFailure).message === 'string'
  );
}

/**
 * 把任意 reject 值收成可呈现的失败。
 *
 * 宿主给的结构化失败原样用；其它（IPC 断开、序列化异常）统一落一句同族兜底——
 * **不**把英文异常原文丢给用户看（voice §6），也不静默成空。
 */
export function asPiLaneFailure(error: unknown): PiLaneFailure {
  if (isPiLaneFailure(error)) return error;
  return { code: 'unavailable', message: '与运行环境的连接中断 · 请重新开始这段工作' };
}
