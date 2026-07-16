import type { HostAuthReason } from '../host/host-auth-port';
import type {
  HostListResult,
  HostReadResult,
  MaterialHostPort,
  MaterialPersistRecord,
} from './material-store';
import type { StoredMaterial } from './material-ref';

/**
 * Tauri 材料宿主适配器。src-tauri 命令已把来源 provenance 与授权关进宿主，此处只搬运
 * opaque 引用、relativePath 与字节，并把 `Vec<u8>` 与 `number[]` 互转。
 * 命令对所有可达结果返回闭集 union（不 reject）；仅不可达内部错误才 reject，交由 UI 显式呈现。
 */

type WireRead = { status: 'read'; bytes: number[] } | { status: 'failed'; reason: HostAuthReason };
type WireList =
  | { status: 'listed'; entries: { relativePath: string; fileName: string }[] }
  | { status: 'failed'; reason: HostAuthReason };

async function tauriCore() {
  return import('@tauri-apps/api/core');
}

export function createTauriMaterialHost(): MaterialHostPort {
  return {
    async listDir(grantId, relativeDir): Promise<HostListResult> {
      const { invoke } = await tauriCore();
      return invoke<WireList>('host_list_dir', { input: { grantId, relativeDir } });
    },

    async readSource(grantId, relativePath): Promise<HostReadResult> {
      const { invoke } = await tauriCore();
      const outcome = await invoke<WireRead>('host_read_file', { input: { grantId, relativePath } });
      if (outcome.status === 'read') return { status: 'read', bytes: Uint8Array.from(outcome.bytes) };
      return outcome;
    },

    async put(record: MaterialPersistRecord): Promise<void> {
      const { invoke } = await tauriCore();
      await invoke('material_put', { record });
    },

    async get(caseId, materialId): Promise<StoredMaterial | null> {
      const { invoke } = await tauriCore();
      return invoke<StoredMaterial | null>('material_get', { input: { caseId, materialId } });
    },

    async readOriginal(caseId, materialId): Promise<HostReadResult> {
      const { invoke } = await tauriCore();
      const outcome = await invoke<WireRead>('material_read_original', { input: { caseId, materialId } });
      if (outcome.status === 'read') return { status: 'read', bytes: Uint8Array.from(outcome.bytes) };
      return outcome;
    },

    async list(caseId): Promise<StoredMaterial[]> {
      const { invoke } = await tauriCore();
      return invoke<StoredMaterial[]>('material_list', { caseId });
    },
  };
}
