export interface CaseSummary {
  id: string;
  title: string;
  caseNumber?: string;
  fileCount: number;
  archived: boolean;
  /** 案件文件夹绝对路径；演示案使用虚拟路径，真实案来自文件夹选择 */
  folderPath?: string;
}
