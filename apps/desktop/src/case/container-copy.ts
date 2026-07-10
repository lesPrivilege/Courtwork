/**
 * 容器语义双词表（docs/52 #2 + docs/49 context）。
 * 案件容器用「卷宗」；通用工作区用「资料」——法律词汇不出现在通用容器。
 */

export type ContainerKind = 'case' | 'workspace';

export function fileCountLabel(kind: ContainerKind, count: number): string {
  const noun = kind === 'workspace' ? '资料' : '卷宗';
  return `${noun} ${count} 件`;
}

export function originalsZoneTitle(kind: ContainerKind): string {
  return kind === 'workspace' ? '资料原件' : '卷宗原件';
}

export function scopeCommitTitle(kind: ContainerKind): string {
  return kind === 'workspace' ? '存入资料' : '存入卷宗';
}

export function scopeCommittedLabel(kind: ContainerKind): string {
  return kind === 'workspace' ? '已存入资料' : '已存入卷宗';
}

export function scopeConfirmBody(kind: ContainerKind, containerName: string): string {
  if (kind === 'workspace') {
    return `存入资料后，本文件将出现在《${containerName}》的资料清单中，可被后续对话引用。此操作不可从输入区撤销。`;
  }
  return `存入卷宗后，本文件将出现在《${containerName}》的卷宗清单中，可被后续对话与场景引用。此操作不可从输入区撤销。`;
}
