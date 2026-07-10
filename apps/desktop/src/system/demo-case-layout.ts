/**
 * 演示案件的文件夹分区布局（与 packages/tools case-path 分区名一致）。
 * 浏览器/Playwright 用虚拟绝对路径；真实 Tauri 下由案件绑定的 folderPath 覆盖。
 */
export const DEMO_CASE_ROOT = '/Users/demo/Courtwork/案件/临江精铸诉起云智能';

export const DEMO_OUTPUT_DIR = `${DEMO_CASE_ROOT}/产出`;
export const DEMO_OUTPUT_DOCX = `${DEMO_OUTPUT_DIR}/合同审查报告.docx`;

export const DEMO_ORIGINALS = [
  {
    fileName: '设备采购合同.pdf',
    path: `${DEMO_CASE_ROOT}/原件/设备采购合同.pdf`,
    /** docs/47：移形后永久保留原始文件名 */
    originalFileName: '合同v2(1).pdf',
    contentHash: 'c0ffee00deadbeef',
  },
  {
    fileName: '催告函.docx',
    path: `${DEMO_CASE_ROOT}/原件/催告函.docx`,
    originalFileName: '催告函.docx',
    contentHash: 'a11ce000cafebabe',
  },
  {
    fileName: '验收记录扫描件.pdf',
    path: `${DEMO_CASE_ROOT}/原件/验收记录扫描件.pdf`,
    originalFileName: '扫描件_验收.pdf',
    contentHash: 'beadfeedfeedfeed',
  },
] as const;

export const DEMO_WORK_DRAFT_DIR = `${DEMO_CASE_ROOT}/工作稿`;
