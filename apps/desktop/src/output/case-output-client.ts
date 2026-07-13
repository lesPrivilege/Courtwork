import { caseOutputDocx } from '../case/case-scope';
import { preflightDocx } from '@courtwork/reading-view/docx-security';

export interface CaseOutputArtifact {
  absolutePath: string;
  byteLength: number;
}

interface WriteCaseOutputInput {
  caseRoot: string;
  fileName: string;
  bytes: number[];
}

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function assertOutputName(fileName: string): void {
  if (!fileName || fileName.includes('/') || fileName.includes('\\') || fileName === '.' || fileName === '..') {
    throw new Error('产出文件名必须是单一文件名');
  }
  if (!fileName.toLowerCase().endsWith('.docx')) {
    throw new Error('产出文件必须使用 .docx 扩展名');
  }
}

const browserFiles = new Map<string, Uint8Array>();

async function writeViaTauri(input: WriteCaseOutputInput): Promise<CaseOutputArtifact> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<CaseOutputArtifact>('write_case_output_docx', { input });
}

async function existsViaTauri(caseRoot: string, fileName: string): Promise<boolean> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<boolean>('case_output_docx_exists', { input: { caseRoot, fileName } });
}

/**
 * Word 产物唯一写入桥。Web 预览使用内存宿主保持 E2E 保真；Tauri 端由 Rust
 * 再做一次路径与符号链接校验，界面不得自行假定文件已写成。
 */
export const caseOutputClient = {
  async writeDocx(caseRoot: string, fileName: string, bytes: Uint8Array): Promise<CaseOutputArtifact> {
    assertOutputName(fileName);
    if (!caseRoot.trim()) throw new Error('案件目录不能为空');
    preflightDocx(bytes);
    if (isTauriRuntime()) {
      return writeViaTauri({ caseRoot, fileName, bytes: Array.from(bytes) });
    }
    const absolutePath = caseOutputDocx(caseRoot, fileName);
    browserFiles.set(absolutePath, bytes.slice());
    return { absolutePath, byteLength: bytes.byteLength };
  },

  async exists(caseRoot: string, fileName: string): Promise<boolean> {
    assertOutputName(fileName);
    if (!caseRoot.trim()) return false;
    if (isTauriRuntime()) return existsViaTauri(caseRoot, fileName);
    return browserFiles.has(caseOutputDocx(caseRoot, fileName));
  },

  /** 测试专用：清空浏览器宿主，不触及 Tauri 文件系统。 */
  resetBrowserFiles(): void {
    browserFiles.clear();
  },
};
