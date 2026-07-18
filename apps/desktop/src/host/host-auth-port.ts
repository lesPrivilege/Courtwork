/**
 * HOST-AUTH-LITE 宿主文件授权端口（browser-safe 声明）。
 *
 * 契约红线（ADR-010 决定四）：renderer 只见 opaque `grantId` 与展示 `label`；绝对路径与授权只住宿主。
 * 失败是闭集 [`HostAuthReason`]，每类结构化到达 UI，零静默降级、零回落 demo。
 * 端口本身不构造运行输入、不解析 schema、不接 MaterialStore——只做「授权 + 授权域内读写 + 失败可见」。
 */

/** 授权失败闭集，语义与 Rust `host_auth::HostAuthReason` 逐词对齐。 */
export type HostAuthReason = 'denied' | 'revoked' | 'unavailable' | 'out_of_scope';

/** 对外 grant：opaque id + 展示 label（文件夹 basename）。**无绝对路径字段。** */
export interface HostGrant {
  grantId: string;
  label: string;
}

export type AuthorizeResult =
  | { status: 'granted'; grant: HostGrant }
  | { status: 'failed'; reason: HostAuthReason };

export type ReadResult =
  | { status: 'read'; bytes: Uint8Array }
  | { status: 'failed'; reason: HostAuthReason };

export type WriteResult =
  | { status: 'wrote'; byteLength: number }
  | { status: 'failed'; reason: HostAuthReason };

/**
 * 宿主文件授权端口。实现（Tauri / browser-fake）由 composition root 注入；
 * UI 与消费者只依赖此接口，不得直连 `@tauri-apps/api` 或绝对路径。
 */
export interface HostAuthPort {
  /** 已持久授权（重启后仍可见）；只回 opaque grant，无路径。 */
  listGrants(): Promise<HostGrant[]>;
  /** 系统 picker 取得对某文件夹的授权。取消/TCC 拒绝 → `denied`。 */
  authorizeFolder(): Promise<AuthorizeResult>;
  /** 授权域内读；越权/撤权/卷卸载/路径失效各自结构化失败。 */
  readFile(input: { grantId: string; relativePath: string }): Promise<ReadResult>;
  /** 授权域内原子写；已存在目标缺省拒绝，只有显式 overwrite 才覆盖。 */
  writeFile(input: {
    grantId: string;
    relativePath: string;
    bytes: Uint8Array;
    overwrite: boolean;
  }): Promise<WriteResult>;
}

/** 失败闭集（顺序稳定，供门禁与 UI 遍历）。 */
export const HOST_AUTH_REASONS = ['denied', 'revoked', 'unavailable', 'out_of_scope'] as const;

/** 失败可见文案（chrome 中文；不泄漏绝对路径、grantId 或技术栈名词）。 */
export const HOST_AUTH_REASON_COPY: Record<HostAuthReason, string> = {
  denied: '未获得访问授权。请重新选择文件夹并允许访问。',
  revoked: '此前的访问授权已失效。请重新选择该文件夹并授权。',
  unavailable: '找不到该文件夹，可能已被移动、删除或所在磁盘未挂载。请重新选择。',
  out_of_scope: '该路径超出已授权文件夹范围，已阻止访问。',
};

export function hostAuthReasonCopy(reason: HostAuthReason): string {
  return HOST_AUTH_REASON_COPY[reason];
}
