import type { CaseBinding } from '../case/case-scope';
import type { HostAuthReason } from '../host/host-auth-port';
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

// ─── CONTRACT-OUTPUT-TRUTH-1：窄判别契约（browser / Tauri 同形）─────────────────

/**
 * 失败原因闭集。`unbound` 与 `invalid_input` 是 renderer 侧就能判定的两类，
 * 其余沿用既有 `HostAuthReason`——不新造平行词表。
 */
export type CaseOutputFailureReason = HostAuthReason | 'unbound' | 'invalid_input';

/** `missing` 是**明确确认不存在**，不是失败——把二者压成一个 boolean 正是本票要退役的说谎面。 */
export type CaseOutputStatResult =
  | { status: 'missing' }
  | { status: 'found'; byteLength: number; sha256: string }
  | { status: 'failed'; reason: CaseOutputFailureReason };

/** `exists` 是发布时目标已在（EEXIST），零覆盖；`failed` 后 effect 未知，调用方必须重新 stat。 */
export type CaseOutputWriteResult =
  | { status: 'written'; byteLength: number }
  | { status: 'exists' }
  | { status: 'failed'; reason: CaseOutputFailureReason };

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

/** 与 Rust `validate_single_docx_name` 同形，但不抛：判别契约里非法输入是一个 typed 结果。 */
function isValidOutputName(fileName: string): boolean {
  if (!fileName || fileName === '.' || fileName === '..') return false;
  if (fileName.includes('/') || fileName.includes('\\') || fileName.includes('\0')) return false;
  return fileName.toLowerCase().endsWith('.docx');
}

/** 与 Rust `validate_docx_bytes` 同形：ZIP 容器魔数。 */
function isDocxBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // 浏览器壳打包坑：走 crypto.subtle，不 import node:crypto。
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes.slice().buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
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

/**
 * browser 侧的注入面：让 E2E/单测能构造 EEXIST、卷不支持 hard link、目录被换成 symlink 等
 * 宿主级故障。**只在内存宿主生效**，Tauri 路径结构上到不了这里。
 */
export type BrowserOutputFault =
  | { kind: 'stat_failed'; reason: CaseOutputFailureReason }
  | { kind: 'write_failed'; reason: CaseOutputFailureReason }
  /** 发布竞态：write 前目标被别人抢先建出来。 */
  | { kind: 'write_exists' }
  /** effect unknown：link 成功但随后 unlink/fsync 失败——目标可能已在。 */
  | { kind: 'write_effect_unknown'; reason: CaseOutputFailureReason };

let browserFault: BrowserOutputFault | null = null;

async function statViaTauri(grantId: string, fileName: string): Promise<CaseOutputStatResult> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<CaseOutputStatResult>('case_output_stat_docx', { input: { grantId, fileName } });
}

async function writeNoReplaceViaTauri(
  grantId: string,
  fileName: string,
  bytes: Uint8Array,
): Promise<CaseOutputWriteResult> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<CaseOutputWriteResult>('case_output_write_no_replace', {
    input: { grantId, fileName, bytes: Array.from(bytes) },
  });
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
  /**
   * 起草画布的通用写入（`答辩意见.docx` 等）。**保留 `overwrite:true`**——本票只窄改合同审查
   * 批注稿，不借机把所有 draft 写入改成 no-overwrite（那是另一件事，需另行拍板）。
   */
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

  /**
   * 合同审查批注稿的只读询问。missing / found(length+sha256) / failed(reason) 三态，
   * 绝不折成 boolean——「读不到」与「不存在」是两件事。
   */
  async statDocx(binding: CaseBinding, fileName: string): Promise<CaseOutputStatResult> {
    if (!isValidOutputName(fileName)) return { status: 'failed', reason: 'invalid_input' };
    if (binding.kind === 'unbound') return { status: 'failed', reason: 'unbound' };
    if (binding.kind === 'grant' && isTauriRuntime()) {
      try {
        return await statViaTauri(binding.grantId, fileName);
      } catch {
        // unexpected bridge failure 也只能收敛为 unavailable，不得当成 missing。
        return { status: 'failed', reason: 'unavailable' };
      }
    }
    if (browserFault?.kind === 'stat_failed') return { status: 'failed', reason: browserFault.reason };
    const stored = browserFiles.get(browserKey(binding, fileName));
    if (!stored) return { status: 'missing' };
    return { status: 'found', byteLength: stored.byteLength, sha256: await sha256Hex(stored) };
  },

  /**
   * 合同审查批注稿的原子 no-replace 写入。目标已存在即 `exists`，绝不覆盖；
   * `failed` 之后 effect 未知，调用方必须重新 stat 才能判定。
   */
  async writeDocxNoReplace(
    binding: CaseBinding,
    fileName: string,
    bytes: Uint8Array,
  ): Promise<CaseOutputWriteResult> {
    if (!isValidOutputName(fileName) || !isDocxBytes(bytes)) {
      return { status: 'failed', reason: 'invalid_input' };
    }
    if (binding.kind === 'unbound') return { status: 'failed', reason: 'unbound' };
    if (binding.kind === 'grant' && isTauriRuntime()) {
      try {
        return await writeNoReplaceViaTauri(binding.grantId, fileName, bytes);
      } catch {
        return { status: 'failed', reason: 'unavailable' };
      }
    }
    if (browserFault?.kind === 'write_failed') return { status: 'failed', reason: browserFault.reason };
    const key = browserKey(binding, fileName);
    if (browserFault?.kind === 'write_exists') return { status: 'exists' };
    if (browserFiles.has(key)) return { status: 'exists' };
    if (browserFault?.kind === 'write_effect_unknown') {
      // 镜像 Rust：linkat 成功但随后 unlink/fsync 失败——目标**已经**建立，回执却是失败。
      browserFiles.set(key, bytes.slice());
      return { status: 'failed', reason: browserFault.reason };
    }
    browserFiles.set(key, bytes.slice());
    return { status: 'written', byteLength: bytes.byteLength };
  },

  /** 测试专用：清空浏览器宿主，不触及 Tauri 文件系统。 */
  resetBrowserFiles(): void {
    browserFiles.clear();
    browserFault = null;
  },

  /** 测试专用：注入一次宿主级故障（只影响内存宿主）。 */
  setBrowserFault(fault: BrowserOutputFault | null): void {
    browserFault = fault;
  },

  /** 测试专用：直接预放一份产物（构造「同名异内容」冲突场景）。 */
  seedBrowserFile(binding: CaseBinding, fileName: string, bytes: Uint8Array): void {
    browserFiles.set(browserKey(binding, fileName), bytes.slice());
  },
};
