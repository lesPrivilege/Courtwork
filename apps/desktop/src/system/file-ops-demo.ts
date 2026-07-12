import type { FileOpsPlan } from '@courtwork/legal';
import {
  createFileOpsExecutor,
  type FileOpsExecuteReport,
  type FileOpsUndoReport,
} from '@courtwork/tools/file-ops-executor';
import { createMemoryFileOpsHost } from '@courtwork/tools/file-ops-host';
import { DEMO_CASE_ROOT } from './demo-case-layout';

const encoder = new TextEncoder();

/** 演示用内存 FS：inbox 乱文件 + 分区目录 */
function buildDemoHost() {
  return createMemoryFileOpsHost({
    [DEMO_CASE_ROOT]: 'dir',
    [`${DEMO_CASE_ROOT}/inbox`]: 'dir',
    [`${DEMO_CASE_ROOT}/inbox/合同v2(1).pdf`]: encoder.encode('demo-contract-bytes'),
    [`${DEMO_CASE_ROOT}/inbox/催告函扫描.jpg`]: encoder.encode('demo-image-bytes'),
    [`${DEMO_CASE_ROOT}/原件`]: 'dir',
    [`${DEMO_CASE_ROOT}/产出`]: 'dir',
    [`${DEMO_CASE_ROOT}/工作稿`]: 'dir',
  });
}

let host = buildDemoHost();
let executor = createFileOpsExecutor(host);

export function resetFileOpsDemo() {
  host = buildDemoHost();
  executor = createFileOpsExecutor(host);
}

/** 演示整理计划（S6 产出） */
export function createDemoFileOpsPlan(caseId: string): FileOpsPlan {
  return {
    id: `plan-${caseId}-demo`,
    caseId,
    caseRoot: DEMO_CASE_ROOT,
    createdAt: new Date().toISOString(),
    title: '入库整理计划',
    entries: [
      {
        id: 'e-mkdir-dup',
        verb: 'mkdir',
        targetPath: `${DEMO_CASE_ROOT}/重复项`,
        reason: '隔离重复件',
        selected: true,
      },
      {
        id: 'e-move-contract',
        verb: 'move',
        sourcePath: `${DEMO_CASE_ROOT}/inbox/合同v2(1).pdf`,
        targetPath: `${DEMO_CASE_ROOT}/原件/设备采购合同.pdf`,
        reason: '归入原件并规范命名',
        selected: true,
        originalFileName: '合同v2(1).pdf',
      },
      {
        id: 'e-move-notice',
        verb: 'rename',
        sourcePath: `${DEMO_CASE_ROOT}/inbox/催告函扫描.jpg`,
        targetPath: `${DEMO_CASE_ROOT}/原件/催告函扫描.jpg`,
        reason: '归入原件',
        selected: true,
        originalFileName: '催告函扫描.jpg',
      },
      {
        id: 'e-copy-optional',
        verb: 'copy',
        sourcePath: `${DEMO_CASE_ROOT}/原件/设备采购合同.pdf`,
        targetPath: `${DEMO_CASE_ROOT}/产出/设备采购合同-工作副本.pdf`,
        reason: '可选：复制到产出（演示默认不勾选）',
        selected: false,
        originalFileName: '设备采购合同.pdf',
      },
    ],
  };
}

export async function executeDemoPlan(plan: FileOpsPlan): Promise<FileOpsExecuteReport> {
  return executor.execute(plan);
}

export async function undoDemoPlan(planId: string): Promise<FileOpsUndoReport> {
  return executor.undo(planId);
}

export function getDemoHostSnapshot() {
  return host.snapshot();
}
