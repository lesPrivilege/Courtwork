import { resolveWithinCase } from './case-path.js';

/**
 * 文件操作宿主：由装配点注入（Node 真 FS / 内存 mock / 未来 Tauri）。
 * 工具层永不暴露 delete 动词——host 虽可能有 removeFile（仅用于撤销 copy 的逆向），
 * 但不作为用户/agent 可调用能力。
 */
export interface FileOpsHost {
  exists(path: string): Promise<boolean>;
  isDirectory(path: string): Promise<boolean>;
  readFile(path: string): Promise<Uint8Array>;
  /** 仅当目标不存在时写入；覆盖语义由调用方禁止。 */
  writeFile(path: string, data: Uint8Array): Promise<void>;
  mkdir(path: string, opts?: { recursive?: boolean }): Promise<void>;
  /** 原子 rename（同卷 move/rename）。目标必须不存在。 */
  rename(from: string, to: string): Promise<void>;
  /** 仅供撤销 copy 时删除我们创建的副本；不进入工具契约。 */
  removeFile(path: string): Promise<void>;
  /** 仅供撤销 mkdir 时删除空目录。 */
  removeEmptyDir(path: string): Promise<void>;
  hash(path: string): Promise<string>;
}

/** 纯 JS FNV-1a 64-bit 十六进制（漂移/比对用途，非安全哈希）。 */
export function hashBytes(data: Uint8Array): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < data.length; i++) {
    h ^= BigInt(data[i]!);
    h = BigInt.asUintN(64, h * prime);
  }
  return h.toString(16).padStart(16, '0');
}

type MemNode = { kind: 'file'; content: Uint8Array } | { kind: 'dir' };

/**
 * 内存文件系统：契约/撤销测试零依赖真实磁盘。
 * 路径用 case-path 的 normalize 语义。
 */
export function createMemoryFileOpsHost(seed?: Record<string, Uint8Array | 'dir'>): FileOpsHost & {
  /** 测试用：导出路径→内容快照（dir 标为 null） */
  snapshot(): Map<string, Uint8Array | null>;
} {
  const store = new Map<string, MemNode>();

  const norm = (p: string) => {
    const resolved = resolveWithinCase('/', p);
    if (!resolved.ok) return p.replace(/\/+$/, '') || '/';
    return resolved.absolute;
  };

  const ensureParent = (path: string) => {
    const parts = path.split('/').filter(Boolean);
    let cur = '';
    for (let i = 0; i < parts.length - 1; i++) {
      cur += `/${parts[i]}`;
      const node = store.get(cur);
      if (!node) store.set(cur, { kind: 'dir' });
      else if (node.kind !== 'dir') throw new Error(`路径前缀不是目录：${cur}`);
    }
  };

  if (seed) {
    for (const [path, value] of Object.entries(seed)) {
      const n = norm(path);
      if (value === 'dir') {
        ensureParent(n);
        store.set(n, { kind: 'dir' });
      } else {
        ensureParent(n);
        store.set(n, { kind: 'file', content: value });
      }
    }
  }

  return {
    async exists(path) {
      return store.has(norm(path));
    },
    async isDirectory(path) {
      const node = store.get(norm(path));
      return node?.kind === 'dir';
    },
    async readFile(path) {
      const node = store.get(norm(path));
      if (!node || node.kind !== 'file') throw new Error(`不是文件：${path}`);
      return new Uint8Array(node.content);
    },
    async writeFile(path, data) {
      const n = norm(path);
      if (store.has(n)) throw new Error(`目标已存在，拒绝覆盖：${path}`);
      ensureParent(n);
      store.set(n, { kind: 'file', content: new Uint8Array(data) });
    },
    async mkdir(path) {
      const n = norm(path);
      if (store.has(n)) throw new Error(`目标已存在，拒绝覆盖：${path}`);
      ensureParent(n);
      store.set(n, { kind: 'dir' });
    },
    async rename(from, to) {
      const a = norm(from);
      const b = norm(to);
      const node = store.get(a);
      if (!node) throw new Error(`源不存在：${from}`);
      if (store.has(b)) throw new Error(`目标已存在，拒绝覆盖：${to}`);
      ensureParent(b);
      store.set(b, node);
      store.delete(a);
      // 移动目录时同步子路径前缀
      if (node.kind === 'dir') {
        const prefix = `${a}/`;
        const moves: Array<[string, string, MemNode]> = [];
        for (const [key, val] of store) {
          if (key.startsWith(prefix)) {
            moves.push([key, b + key.slice(a.length), val]);
          }
        }
        for (const [oldKey, newKey, val] of moves) {
          store.set(newKey, val);
          store.delete(oldKey);
        }
      }
    },
    async removeFile(path) {
      const n = norm(path);
      const node = store.get(n);
      if (!node || node.kind !== 'file') throw new Error(`不是文件：${path}`);
      store.delete(n);
    },
    async removeEmptyDir(path) {
      const n = norm(path);
      const node = store.get(n);
      if (!node || node.kind !== 'dir') throw new Error(`不是目录：${path}`);
      const prefix = `${n}/`;
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) throw new Error(`目录非空：${path}`);
      }
      store.delete(n);
    },
    async hash(path) {
      const data = await this.readFile(path);
      return hashBytes(data);
    },
    snapshot() {
      const out = new Map<string, Uint8Array | null>();
      for (const [key, node] of [...store.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        out.set(key, node.kind === 'file' ? new Uint8Array(node.content) : null);
      }
      return out;
    },
  };
}
