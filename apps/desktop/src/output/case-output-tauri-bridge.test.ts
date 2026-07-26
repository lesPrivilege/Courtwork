import { beforeEach, describe, expect, it, vi } from 'vitest';

// CONTRACT-OUTPUT-TRUTH-1 · O6：Tauri 分支的 wire 契约与**失败收敛**。
// 真实 dirfd/no-follow/no-replace 语义由 Rust `case_output_fs.rs` 的 cargo 测试覆盖；
// 此处只锁 renderer↔命令的搬运，以及「invoke rejection 绝不当 missing/成功」这条。
const invokeMock = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invokeMock(...args) }));

import type { CaseBinding } from '../case/case-scope';
import { caseOutputClient } from './case-output-client';

const GRANT: CaseBinding = { kind: 'grant', grantId: 'grant-a' };
const FILE = '合同审查批注稿-20260311-074123-456-abc.docx';
const DOCX = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);

/** 让 `isTauriRuntime()` 为真：production 判据就是这个 window 标记。 */
function withTauriRuntime(run: () => Promise<void>): Promise<void> {
  const globalWindow = globalThis as unknown as { window?: Record<string, unknown> };
  const had = globalWindow.window !== undefined;
  const previous = globalWindow.window;
  globalWindow.window = { ...(previous ?? {}), __TAURI_INTERNALS__: {} };
  return run().finally(() => {
    if (had) globalWindow.window = previous;
    else delete globalWindow.window;
  });
}

describe('Tauri 分支 wire 契约', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    caseOutputClient.resetBrowserFiles();
  });

  it('statDocx 走 case_output_stat_docx，input 形状固定，结果原样透传', async () => {
    await withTauriRuntime(async () => {
      invokeMock.mockResolvedValue({ status: 'found', byteLength: 7, sha256: 'a'.repeat(64) });
      const result = await caseOutputClient.statDocx(GRANT, FILE);
      expect(invokeMock).toHaveBeenCalledWith('case_output_stat_docx', {
        input: { grantId: 'grant-a', fileName: FILE },
      });
      expect(result).toEqual({ status: 'found', byteLength: 7, sha256: 'a'.repeat(64) });
    });
  });

  it('writeDocxNoReplace 走 case_output_write_no_replace，bytes 转 number[]，**不带 overwrite**', async () => {
    await withTauriRuntime(async () => {
      invokeMock.mockResolvedValue({ status: 'written', byteLength: 7 });
      const result = await caseOutputClient.writeDocxNoReplace(GRANT, FILE, DOCX);
      expect(invokeMock).toHaveBeenCalledWith('case_output_write_no_replace', {
        input: { grantId: 'grant-a', fileName: FILE, bytes: [0x50, 0x4b, 0x03, 0x04, 1, 2, 3] },
      });
      const [, payload] = invokeMock.mock.calls[0] as [string, { input: Record<string, unknown> }];
      // no-replace 命令结构上不接受 overwrite——它没有「允许覆盖」这个概念。
      expect(payload.input).not.toHaveProperty('overwrite');
      expect(result).toEqual({ status: 'written', byteLength: 7 });
    });
  });

  it('exists / written 之外的 typed 结果同样原样透传，不被改写', async () => {
    await withTauriRuntime(async () => {
      invokeMock.mockResolvedValue({ status: 'exists' });
      expect(await caseOutputClient.writeDocxNoReplace(GRANT, FILE, DOCX)).toEqual({ status: 'exists' });
      invokeMock.mockResolvedValue({ status: 'failed', reason: 'out_of_scope' });
      expect(await caseOutputClient.statDocx(GRANT, FILE)).toEqual({ status: 'failed', reason: 'out_of_scope' });
    });
  });
});

describe('invoke rejection 的收敛', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    caseOutputClient.resetBrowserFiles();
  });

  it('stat 的 invoke rejection → failed/unavailable，**绝不**当 missing', async () => {
    await withTauriRuntime(async () => {
      invokeMock.mockRejectedValue(new Error('bridge exploded'));
      const result = await caseOutputClient.statDocx(GRANT, FILE);
      expect(result).toEqual({ status: 'failed', reason: 'unavailable' });
      expect(result).not.toEqual({ status: 'missing' });
    });
  });

  it('write 的 invoke rejection → failed/unavailable，绝不当成功', async () => {
    await withTauriRuntime(async () => {
      invokeMock.mockRejectedValue('裸字符串 rejection');
      expect(await caseOutputClient.writeDocxNoReplace(GRANT, FILE, DOCX)).toEqual({
        status: 'failed',
        reason: 'unavailable',
      });
    });
  });

  it('renderer 侧闭口先于 invoke：非法名/非 docx 零调用宿主', async () => {
    await withTauriRuntime(async () => {
      expect(await caseOutputClient.statDocx(GRANT, '报告.pdf')).toEqual({
        status: 'failed',
        reason: 'invalid_input',
      });
      expect(
        await caseOutputClient.writeDocxNoReplace(GRANT, FILE, new TextEncoder().encode('not a zip')),
      ).toEqual({ status: 'failed', reason: 'invalid_input' });
      expect(invokeMock).not.toHaveBeenCalled();
    });
  });
});
