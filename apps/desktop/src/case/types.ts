import type { ContainerKind } from './container-copy';

export interface CaseSummary {
  id: string;
  title: string;
  caseNumber?: string;
  fileCount: number;
  archived: boolean;
  /** 案件文件夹绝对路径；演示案使用虚拟路径，真实案来自文件夹选择 */
  folderPath?: string;
  /** 样板案·演示容器标记——demo 语料只属于 isDemo 案件（D-1） */
  isDemo?: boolean;
  /**
   * 容器语义（docs/49 + docs/52 #2）：
   * case = 法律事项容器（卷宗 N 件）；workspace = 通用工作区（资料 N 件）。
   * 缺省按案件处理，兼容既有 demo。
   */
  kind?: ContainerKind;
}
