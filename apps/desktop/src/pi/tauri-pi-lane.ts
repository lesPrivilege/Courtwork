import type {
  PiLanePort,
  PiLaneSessionRef,
  PiLaneStartInput,
  PiLaneStartReply,
  PiLaneVerdict,
  PiWorkspaceMarkdown,
  PiWorkspaceResult,
} from './pi-lane-port';
import { asPiLaneFailure } from './pi-lane-port';

/**
 * `PI-LANE-UI-1` · pi 线的 Tauri 适配器。
 *
 * 它只做三件事：把入参装成 Rust 薄壳认的形状、把 `Channel<string>` 的每一行原样交给调用方、
 * 把 reject 收成可呈现的失败。**零语义**——账本记录一个字节都不在这里被改写或过滤。
 */
async function tauriCore() {
  return import('@tauri-apps/api/core');
}

export function createTauriPiLane(): PiLanePort {
  return {
    async start(input: PiLaneStartInput, onRecord): Promise<PiLaneStartReply> {
      const { invoke, Channel } = await tauriCore();
      const channel = new Channel<string>();
      channel.onmessage = (line) => onRecord(line);
      return invoke<PiLaneStartReply>('pi_lane_start', { input, onRecord: channel });
    },

    async prompt(input): Promise<void> {
      const { invoke } = await tauriCore();
      await invoke('pi_lane_prompt', { input });
    },

    async cancel(ref: PiLaneSessionRef): Promise<void> {
      const { invoke } = await tauriCore();
      await invoke('pi_lane_cancel', { input: ref });
    },

    async decision(
      input: PiLaneSessionRef & { operationId: string; verdict: PiLaneVerdict },
    ): Promise<void> {
      const { invoke } = await tauriCore();
      await invoke('pi_lane_decision', {
        input: {
          containerId: input.containerId,
          sessionId: input.sessionId,
          operationId: input.operationId,
          // Rust 侧闭集恰两支；此处只做大小写形状转换，不新增第三种可能。
          verdict: input.verdict === 'approve' ? 'Approve' : 'Deny',
        },
      });
    },

    async teardown(ref: PiLaneSessionRef): Promise<void> {
      const { invoke } = await tauriCore();
      await invoke('pi_lane_teardown', { input: ref });
    },

    async openWorkspaceMarkdown(input): Promise<PiWorkspaceResult> {
      const { invoke } = await tauriCore();
      try {
        const view = await invoke<PiWorkspaceMarkdown>('open_workspace_markdown', {
          input: {
            containerId: input.containerId,
            sessionId: input.sessionId,
            logicalPath: input.logicalPath,
          },
        });
        return { ok: true, view };
      } catch (error) {
        return { ok: false, failure: asPiLaneFailure(error) };
      }
    },
  };
}
