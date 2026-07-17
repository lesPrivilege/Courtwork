import { describe, it, expect, vi, beforeEach } from 'vitest';

// WORK-HOST-1：Tauri WorkState 适配器的 wire 契约单测——命令名、input 形状与 Vec<u8>↔number[] 互转。
// 真实耐久/CAS/原子性由 Rust `work_state.rs` cargo 测试覆盖；此处只锁 renderer↔命令的搬运正确性（无 Tauri 运行时）。

const invokeMock = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke: (...args: unknown[]) => invokeMock(...args) }));

import { createTauriWorkStateHost, mapWorkStateHostError } from './tauri-work-state-host';

const REF = { caseId: 'grant-abc-1', sessionId: '8a1f0c2e-0000-4000-8000-000000000001' };

describe('createTauriWorkStateHost', () => {
  beforeEach(() => invokeMock.mockReset());

  it('read 命中：number[] 字节回读为 Uint8Array，version 原样透传', async () => {
    invokeMock.mockResolvedValue({ found: true, version: '3', bytes: [0, 1, 254, 255] });
    const result = await createTauriWorkStateHost().read(REF);
    expect(invokeMock).toHaveBeenCalledWith('work_state_read', { input: REF });
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.version).toBe('3');
      expect(result.bytes).toBeInstanceOf(Uint8Array);
      expect(Array.from(result.bytes)).toEqual([0, 1, 254, 255]);
    }
  });

  it('read 缺失：{found:false} 原样返回（不带 version/bytes）', async () => {
    invokeMock.mockResolvedValue({ found: false });
    const result = await createTauriWorkStateHost().read(REF);
    expect(result).toEqual({ found: false });
  });

  it('compareAndSwap 起新：expectedVersion=null，字节以 number[] 出栈，返回原样透传', async () => {
    invokeMock.mockResolvedValue({ applied: true, version: '1' });
    const bytes = new Uint8Array([10, 20, 30]);
    const out = await createTauriWorkStateHost().compareAndSwap({ ref: REF, expectedVersion: null, bytes });
    expect(invokeMock).toHaveBeenCalledWith('work_state_commit', {
      input: { caseId: REF.caseId, sessionId: REF.sessionId, expectedVersion: null, bytes: [10, 20, 30] },
    });
    expect(out).toEqual({ applied: true, version: '1' });
  });

  it('compareAndSwap 败者：applied:false 与当前 generation 原样上浮', async () => {
    invokeMock.mockResolvedValue({ applied: false, version: '5' });
    const out = await createTauriWorkStateHost().compareAndSwap({
      ref: REF,
      expectedVersion: '4',
      bytes: new Uint8Array(),
    });
    expect(invokeMock).toHaveBeenCalledWith('work_state_commit', {
      input: { caseId: REF.caseId, sessionId: REF.sessionId, expectedVersion: '4', bytes: [] },
    });
    expect(out).toEqual({ applied: false, version: '5' });
  });

  it('WORK-TURN-1 G：未知 Rust 技术报文不在 TS 显示边界裸透', () => {
    const raw = 'WorkStateError::Io(/Users/alice/案件/work-state.env generation=7)';
    const caught = (() => {
      try {
        mapWorkStateHostError(new Error(raw));
      } catch (error) {
        return error;
      }
    })();
    expect(caught).toBeInstanceOf(Error);
    const message = (caught as Error).message;
    expect(message).not.toContain('WorkStateError');
    expect(message).not.toContain('/Users/alice');
    expect(message).not.toContain('generation');
    expect(message).toContain('重新');
  });
});
