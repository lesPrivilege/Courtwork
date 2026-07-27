/**
 * 只读容器（ADR-022 决定二「取形必须带容器」——容器由我方供给，不是省略）。
 *
 * pi 的工具一律经 `ExecutionEnv` 触碰文件系统与 shell，故这一层就是能力面的闸门：
 * - 读面：每次调用都经 {@link AuthorizedRoot} 归一化，界外一律 `permission_denied`；
 * - 写面：`not_supported`，且**本文件根本不引入任何 fs 写原语**——不是「先能写再拒绝」；
 * - shell：`shell_unavailable`，bash 面锁 `SANDBOX-PROBE-1`，且放行不等于升档（ADR-022 决定二补句）。
 *
 * 本包生产码零 `child_process`、零 fs 写调用，由 ADR-018 门 R3 的 pi-lane 扫描面静态锁死。
 */

import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

import {
  ExecutionError,
  FileError,
  err,
  ok,
  type ExecutionEnv,
  type FileInfo,
  type FileKind,
  type Result,
} from '@earendil-works/pi-agent-core';

import type { AuthorizedRoot } from './authorized-root.js';

const WRITE_DENIED =
  '写面未授权：pi lane 当期只开读面（ADR-022 决定二；写与 bash 面锁 SANDBOX-PROBE-1，且放行不等于升档）';
const SHELL_DENIED =
  'bash 面未授权：pi lane 当期只开读面（ADR-022 决定二；升档前 bash 不可授，与探测是否放行无关）';

/** node 的 errno 归一到 pi 的 backend-independent 码；认不出的一律 `unknown`，不猜。 */
function toFileError(cause: unknown, target: string): FileError {
  const code = (cause as NodeJS.ErrnoException | undefined)?.code;
  const message = cause instanceof Error ? cause.message : String(cause);
  switch (code) {
    case 'ENOENT':
      return new FileError('not_found', message, target);
    case 'EACCES':
    case 'EPERM':
      return new FileError('permission_denied', message, target);
    case 'ENOTDIR':
      return new FileError('not_directory', message, target);
    case 'EISDIR':
      return new FileError('is_directory', message, target);
    default:
      return new FileError('unknown', message, target);
  }
}

function fileKind(stats: { isDirectory(): boolean; isSymbolicLink(): boolean }): FileKind {
  if (stats.isSymbolicLink()) return 'symlink';
  return stats.isDirectory() ? 'directory' : 'file';
}

export function createReadOnlyScopedEnv(authorized: AuthorizedRoot): ExecutionEnv {
  /** 读面统一入口：先过授权边界，再碰文件系统。界外的调用永远到不了 fs。 */
  async function within<T>(
    input: string,
    run: (absolute: string) => Promise<Result<T, FileError>>,
  ): Promise<Result<T, FileError>> {
    const resolved = await authorized.resolve(input);
    if (!resolved.ok) return err(new FileError('permission_denied', resolved.reason, input));
    return run(resolved.path);
  }

  function denyWrite<T>(target?: string): Result<T, FileError> {
    return err(new FileError('not_supported', WRITE_DENIED, target));
  }

  async function statOf(absolute: string): Promise<Result<FileInfo, FileError>> {
    try {
      const stats = await lstat(absolute);
      return ok({
        name: path.basename(absolute),
        path: absolute,
        kind: fileKind(stats),
        size: stats.size,
        mtimeMs: stats.mtimeMs,
      });
    } catch (cause) {
      return err(toFileError(cause, absolute));
    }
  }

  return {
    cwd: authorized.root,

    async absolutePath(input) {
      return within(input, async (absolute) => ok(absolute));
    },

    async joinPath(parts) {
      return within(path.join(...parts), async (absolute) => ok(absolute));
    },

    async readTextFile(input) {
      return within(input, async (absolute) => {
        try {
          return ok(await readFile(absolute, 'utf8'));
        } catch (cause) {
          return err(toFileError(cause, absolute));
        }
      });
    },

    async readTextLines(input, options) {
      return within(input, async (absolute) => {
        try {
          const text = await readFile(absolute, 'utf8');
          const lines = text.split('\n');
          // 末尾换行不算一行，否则每份文件都会多出一条空行。
          if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
          const maxLines = options?.maxLines;
          return ok(typeof maxLines === 'number' ? lines.slice(0, maxLines) : lines);
        } catch (cause) {
          return err(toFileError(cause, absolute));
        }
      });
    },

    async readBinaryFile(input) {
      return within(input, async (absolute) => {
        try {
          return ok(new Uint8Array(await readFile(absolute)));
        } catch (cause) {
          return err(toFileError(cause, absolute));
        }
      });
    },

    async fileInfo(input) {
      return within(input, statOf);
    },

    async listDir(input) {
      return within(input, async (absolute) => {
        try {
          const names = await readdir(absolute);
          const entries: FileInfo[] = [];
          for (const name of names) {
            const info = await statOf(path.join(absolute, name));
            if (info.ok) entries.push(info.value);
          }
          return ok(entries);
        } catch (cause) {
          return err(toFileError(cause, absolute));
        }
      });
    },

    async canonicalPath(input) {
      return within(input, async (absolute) => {
        try {
          return ok(await realpath(absolute));
        } catch (cause) {
          return err(toFileError(cause, absolute));
        }
      });
    },

    async exists(input) {
      return within(input, async (absolute) => {
        try {
          await lstat(absolute);
          return ok(true);
        } catch (cause) {
          const error = toFileError(cause, absolute);
          // 缺失不是失败；其余（含权限）如实上报，不折叠成 false。
          return error.code === 'not_found' ? ok(false) : err(error);
        }
      });
    },

    async writeFile(input) {
      return denyWrite(input);
    },

    async appendFile(input) {
      return denyWrite(input);
    },

    async createDir(input) {
      return denyWrite(input);
    },

    async remove(input) {
      return denyWrite(input);
    },

    async createTempDir() {
      return denyWrite();
    },

    async createTempFile() {
      return denyWrite();
    },

    // 形参一概不取：命令与选项都不参与判定，任何 exec 都拒。
    async exec() {
      return err(new ExecutionError('shell_unavailable', SHELL_DENIED));
    },

    async cleanup() {
      // 只读容器不持有需要释放的资源。
    },
  };
}
