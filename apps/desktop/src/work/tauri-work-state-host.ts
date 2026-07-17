import type { WorkSessionRef, WorkStateHostPort } from '@courtwork/core/work-protocol';
import { LEGACY_CASE_SCENARIO_COPY } from '../case/case-id';

/**
 * Tauri WorkState opaque-blob 宿主适配器（WORK-HOST-1 / ADR-010 决定二）。
 *
 * src-tauri 的 `work_state_read`/`work_state_commit` 命令承载全部耐久与安全语义：原子替换
 * （临时文件 + F_FULLFSYNC + rename + 目录项落盘）、whole-envelope CAS、软 4 MiB 告警 / 硬 16 MiB
 * fail-closed、以及 caseId/sessionId 路径穿越隔离。此处只搬运 opaque 引用与字节，并把 Rust `Vec<u8>`
 * 与 JS `number[]` 互转——宿主不解析信封内容（信封校验/事件状态机/CAS 重试全在 TS runtime）。
 *
 * `version` 是宿主铸造的不透明 generation，只做等值比较原样透传，调用方不解析。
 */

type WireRead =
  | { found: false }
  | { found: true; version: string; bytes: number[] };

type WireCommit = { applied: boolean; version: string };

async function tauriCore() {
  return import('@tauri-apps/api/core');
}

/**
 * WORK-TURN-1 G 显示边界映射（belt）：src-tauri 本单零触碰，Rust `InvalidRef` 的技术报文
 * 「Work 状态引用非法」在 TS 边界改写为产品语言（发生了什么+下一步）。UI 主守卫在
 * `startWorkRun` 前置（存量非安全 id 显式引导），本映射兜非 UI 路径（如恢复读取）。
 */
function mapWorkStateHostError(error: unknown): never {
  if (error instanceof Error && error.message.includes('状态引用非法')) {
    throw new Error(LEGACY_CASE_SCENARIO_COPY);
  }
  if (typeof error === 'string' && error.includes('状态引用非法')) {
    throw new Error(LEGACY_CASE_SCENARIO_COPY);
  }
  throw error;
}

export function createTauriWorkStateHost(): WorkStateHostPort {
  return {
    async read(ref: WorkSessionRef) {
      const { invoke } = await tauriCore();
      const outcome = await invoke<WireRead>('work_state_read', {
        input: { caseId: ref.caseId, sessionId: ref.sessionId },
      }).catch(mapWorkStateHostError);
      if (!outcome.found) return { found: false };
      return { found: true, version: outcome.version, bytes: Uint8Array.from(outcome.bytes) };
    },

    async compareAndSwap({ ref, expectedVersion, bytes }) {
      const { invoke } = await tauriCore();
      return invoke<WireCommit>('work_state_commit', {
        input: {
          caseId: ref.caseId,
          sessionId: ref.sessionId,
          expectedVersion,
          bytes: Array.from(bytes),
        },
      }).catch(mapWorkStateHostError);
    },
  };
}
