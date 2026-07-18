import type { CaseBinding } from '../case/case-scope';
import { preflightDocx } from '@courtwork/reading-view/docx-security';

/** 写入回执：只报字节数，绝对路径永不出宿主（ADR-010 决定四 / CASE-ROOT-1）。 */
export interface CaseOutputArtifact {
  byteLength: number;
}

interface WriteInGrantInput {
  grantId: string;
  fileName: string;
  bytes: number[];
  overwrite: boolean;
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

/**
 * 浏览器/E2E 内存宿主：按 opaque 绑定寻址，绝不携带绝对路径，也绝不触真实文件系统。
 * 样板案与真实案（各自 grantId）互不串扰，据此保 E2E 保真与跨案隔离。
 */
const browserFiles = new Map<string, Uint8Array>();
function browserKey(binding: CaseBinding, fileName: string): string {
  const scope = binding.kind === 'grant' ? `grant:${binding.grantId}` : 'demo';
  return `${scope}/产出/${fileName}`;
}

async function writeInGrantViaTauri(input: WriteInGrantInput): Promise<CaseOutputArtifact> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<CaseOutputArtifact>('case_output_write_in_grant', { input });
}

async function existsInGrantViaTauri(grantId: string, fileName: string): Promise<boolean> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<boolean>('case_output_exists_in_grant', { input: { grantId, fileName } });
}

/**
 * Word 产物唯一写入桥。真实案在 Tauri 下经宿主 grant 命令写入（grantId→根解析只在 Rust 宿主侧）；
 * 样板案与浏览器/E2E 用内存宿主保真。未绑定文件夹的案件显式阻断，界面不得假定文件已写成。
 */
export const caseOutputClient = {
  async writeDocx(binding: CaseBinding, fileName: string, bytes: Uint8Array): Promise<CaseOutputArtifact> {
    assertOutputName(fileName);
    if (binding.kind === 'unbound') throw new Error('本案尚未绑定案件文件夹');
    preflightDocx(bytes);
    if (binding.kind === 'grant' && isTauriRuntime()) {
      return writeInGrantViaTauri({
        grantId: binding.grantId,
        fileName,
        bytes: Array.from(bytes),
        overwrite: true,
      });
    }
    browserFiles.set(browserKey(binding, fileName), bytes.slice());
    return { byteLength: bytes.byteLength };
  },

  async exists(binding: CaseBinding, fileName: string): Promise<boolean> {
    assertOutputName(fileName);
    if (binding.kind === 'unbound') return false;
    if (binding.kind === 'grant' && isTauriRuntime()) {
      return existsInGrantViaTauri(binding.grantId, fileName);
    }
    return browserFiles.has(browserKey(binding, fileName));
  },

  /** 测试专用：清空浏览器宿主，不触及 Tauri 文件系统。 */
  resetBrowserFiles(): void {
    browserFiles.clear();
  },
};
