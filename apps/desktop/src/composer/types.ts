/** composer 附件与按钮族的领域无关状态（docs/45 + docs/52 修正案 + 工单裁决）。 */

import type { ContainerKind } from '../case/container-copy';

export type AttachmentScope = 'message_only' | 'dossier';

export type FileKind = 'docx' | 'pdf' | 'md' | 'txt' | 'image' | 'other';

export type AttachmentStatusKind = 'uploading' | 'ready' | 'failed';

export interface AttachmentUploading {
  kind: 'uploading';
  /** 进入 uploading 的时刻（ms），用于 2–5s 微光 vs >5s 进度文案分流。 */
  startedAt: number;
  /** 0–100；未知时省略。 */
  progress?: number;
  /** >5s 事件流进度文案（办案语言）。 */
  progressLabel?: string;
}

export interface AttachmentReady {
  kind: 'ready';
}

export interface AttachmentFailed {
  kind: 'failed';
  /** 办案语言失败说明，含替代路径。 */
  message: string;
  retryable: boolean;
}

export type AttachmentStatus = AttachmentUploading | AttachmentReady | AttachmentFailed;

export interface ComposerAttachment {
  id: string;
  fileName: string;
  fileKind: FileKind;
  scope: AttachmentScope;
  status: AttachmentStatus;
  /** 原始字节，供失败重试与存入卷宗后的本地保留。 */
  bytes: Uint8Array;
  /** reading-view 成功时的 md 母语文本（壳只展示状态，不解析业务）。 */
  readingMarkdown?: string;
}

export const DISABLED_TOOLTIPS = {
  camera: '扫描件识别即将支持 · 当前可直接上传拍摄照片或 PDF',
  voice: '语音输入即将支持 · 当前请直接打字',
} as const;

export const SCOPE_COPY = {
  message_only: '仅本条',
  dossier: '已存入卷宗',
  confirmTitle: '存入卷宗',
  confirmBody: (caseName: string) =>
    `存入卷宗后，本文件将出现在《${caseName}》的卷宗清单中，可被后续对话与场景引用。此操作不可从输入区撤销。`,
  confirmAction: '确认存入',
  cancelAction: '取消',
} as const;

export interface CaseOption {
  id: string;
  name: string;
  kind?: ContainerKind;
}

/** 演示期回落；真实接入时由案件列表投影注入，禁止在非 demo 容器粘滞。 */
export const DEMO_CASE_OPTIONS: CaseOption[] = [
  {
    id: 'case-linjiang-qiyun',
    name: '临江精铸 诉 起云智能 设备采购合同纠纷',
    kind: 'case',
  },
];

/** 容器化仪式文案（docs/52 #3：先聊后建，与「存入卷宗」同族 popover）。 */
export const CONTAINERIZE_COPY = {
  title: '创建承载容器',
  body: '将附件存入前，需先建立案件或项目容器以承接文件与后续对话。',
  createCase: '创建案件承载',
  createWorkspace: '创建项目承载',
  cancel: '取消',
} as const;
