import type {
  AuthorizeResult,
  HostAuthPort,
  HostAuthReason,
  HostGrant,
  ReadResult,
  WriteResult,
} from './host-auth-port';

/**
 * Tauri 宿主授权适配器。命令层（Rust `host_auth`）已把绝对路径与授权关进宿主，此处只搬运
 * opaque grant、relativePath 与字节，并把 `Vec<u8>` 与 `number[]` 互转。
 * 命令对所有可达授权结果一律返回闭集 union（不 reject）；仅不可达内部错误才 reject，交由 UI 显式呈现。
 */

type WireAuthorize =
  | { status: 'granted'; grant: HostGrant }
  | { status: 'failed'; reason: HostAuthReason };
type WireRead = { status: 'read'; bytes: number[] } | { status: 'failed'; reason: HostAuthReason };
type WireWrite = { status: 'wrote'; byteLength: number } | { status: 'failed'; reason: HostAuthReason };

async function tauriCore() {
  return import('@tauri-apps/api/core');
}

export function createTauriHostAuth(): HostAuthPort {
  return {
    async listGrants(): Promise<HostGrant[]> {
      const { invoke } = await tauriCore();
      return invoke<HostGrant[]>('host_list_grants');
    },

    async authorizeFolder(): Promise<AuthorizeResult> {
      const { invoke } = await tauriCore();
      return invoke<WireAuthorize>('host_authorize_folder');
    },

    async readFile(input): Promise<ReadResult> {
      const { invoke } = await tauriCore();
      const outcome = await invoke<WireRead>('host_read_file', { input });
      if (outcome.status === 'read') {
        return { status: 'read', bytes: Uint8Array.from(outcome.bytes) };
      }
      return outcome;
    },

    async writeFile(input): Promise<WriteResult> {
      const { invoke } = await tauriCore();
      return invoke<WireWrite>('host_write_file', {
        input: {
          grantId: input.grantId,
          relativePath: input.relativePath,
          bytes: Array.from(input.bytes),
          overwrite: input.overwrite,
        },
      });
    },
  };
}
