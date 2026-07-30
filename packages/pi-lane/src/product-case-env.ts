/**
 * 产品 `/case` 只读虚拟容器（PI-HOST-LOOP-1 §二.1 / ADR-022 六-A）。
 *
 * 与 dev 的 {@link import('./scoped-env.js').createReadOnlyScopedEnv} 的本质差别只有一条：
 * **物理案件根不出闭包**。dev 那份把 `authorized.root` 直接当 `cwd`，`FileInfo.path` 与
 * `FileError` 也都投影物理绝对路径；产品面一律只出现 `/case` 或 `/case/...`。
 * 物理根由 Rust 在首枚 bootstrap 的 `caseRoot` 内存例外交来，此后只活在本文件的闭包里，
 * 不进对象属性、不进序列化、不进 error message/cause，也不进 tool update。
 *
 * 三条实现选择，都是为了少一个可漂移的真源：
 * 1. **grammar 与 fs 分离**。{@link normalizeCasePath} 是纯函数，逐条拒面可单测；
 *    fs 只在 grammar 通过之后被碰一次。
 * 2. **不跟随 symlink，也不 realpath**。`authorized-root.ts` 用 `realpath` 归一后判包含，
 *    那会把物理真相带回来；这里改为逐段 `lstat`，观察到 symlink/reparse point 即拒。
 *    代价与 dev 的 `walkFiles` 一致：界内软链子树不可见（已知边界）。
 * 3. **字节上限复用 wire 常量**。segment 255 / 总长 1024 与 `product-protocol.ts` 同源，
 *    不另抄一份字面量。
 *
 * 明确不承诺：本层只保证**每次调用观察到的** symlink/reparse point 均拒。案件目录与本进程
 * 同属一个用户，Node 直读消除不了并发路径替换的 TOCTOU；这一点不得被引申成 OS confinement。
 */

import { lstat, readdir, readFile } from 'node:fs/promises';
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

import { MAX_LOGICAL_PATH_BYTES, MAX_SEGMENT_BYTES, utf8ByteLength } from './product-protocol.js';

/** 模型能看见的唯一根。`/workspace` 是后票 `PI-WRITE-HOST-1` 的事，本票不认。 */
export const CASE_LOGICAL_ROOT = '/case';

const WRITE_DENIED = '写面未授权：本会话只开 /case 只读面（ADR-022 六-A；write 工具在本票根本不存在）';
const SHELL_DENIED = 'bash 面未授权：本会话只开 /case 只读面（ADR-022 六-A；无命令执行能力）';

/** Windows 保留名（含带扩展名的形态）。跨平台一律拒，免得同一份材料在两个宿主上语义不同。 */
const RESERVED_BASENAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
/** drive 形状。反斜杠另有独立一条，故这里只需管 `C:/x` 这种正斜杠写法。 */
const DRIVE_PREFIX = /^[A-Za-z]:/;

export type CasePathRejection = { readonly ok: false; readonly reason: string };
export type CasePathResolution = {
  readonly ok: true;
  /** 逻辑绝对路径：`/case` 或 `/case/<segments>`。这是唯一可出模型面的形态。 */
  readonly logical: string;
  /** 归一后的相对段。空数组表示 `/case` 本身。 */
  readonly segments: readonly string[];
};
export type CasePathResult = CasePathResolution | CasePathRejection;

const reject = (reason: string): CasePathRejection => ({ ok: false, reason });

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * 模型给的路径 → 逻辑绝对路径。**纯函数**：不碰 fs，不认识物理根。
 *
 * 收：相对路径、`/case`、`/case/<relative>`。
 * 拒：其他绝对根（含 `/casex` 这类同前缀兄弟）、`..`、空段、backslash、drive/UNC、
 * 控制字符、保留名、超长 segment 与超长总长。
 */
export function normalizeCasePath(input: unknown): CasePathResult {
  if (typeof input !== 'string') return reject('路径必须是字符串');
  if (input.length === 0) return reject('路径不得为空');
  if (hasControlCharacter(input)) return reject('路径含控制字符');
  if (input.includes('\\')) return reject('路径含反斜杠：逻辑路径只用 `/` 分隔（drive/UNC 一并拒）');
  if (DRIVE_PREFIX.test(input)) return reject('路径含盘符前缀');

  let relative: string;
  if (input.startsWith('/')) {
    if (input === CASE_LOGICAL_ROOT) {
      relative = '';
    } else if (input.startsWith(`${CASE_LOGICAL_ROOT}/`)) {
      relative = input.slice(CASE_LOGICAL_ROOT.length + 1);
    } else {
      // `/casex`、`/case-2`、`/workspace`、`/etc/passwd`、`//a` 全落这里。
      return reject(`绝对路径只接受 ${CASE_LOGICAL_ROOT} 或 ${CASE_LOGICAL_ROOT}/<相对路径>`);
    }
  } else {
    relative = input;
  }

  const segments: string[] = [];
  if (relative.length > 0) {
    for (const raw of relative.split('/')) {
      if (raw.length === 0) return reject('路径含空段');
      if (raw === '.') continue;
      if (raw === '..') return reject('路径含 `..`');
      if (utf8ByteLength(raw) > MAX_SEGMENT_BYTES) {
        return reject(`路径单段超过 ${MAX_SEGMENT_BYTES} 字节上限`);
      }
      const base = raw.split('.')[0] ?? raw;
      if (RESERVED_BASENAME.test(base)) return reject('路径含保留名');
      segments.push(raw);
    }
  }

  const logical = segments.length === 0 ? CASE_LOGICAL_ROOT : `${CASE_LOGICAL_ROOT}/${segments.join('/')}`;
  if (utf8ByteLength(logical) > MAX_LOGICAL_PATH_BYTES) {
    return reject(`逻辑路径超过 ${MAX_LOGICAL_PATH_BYTES} 字节上限`);
  }
  return { ok: true, logical, segments };
}

/** node 的 errno 归一到 pi 的 backend-independent 码。`target` 永远是逻辑路径。 */
function toFileError(cause: unknown, logicalTarget: string): FileError {
  const code = (cause as NodeJS.ErrnoException | undefined)?.code;
  switch (code) {
    case 'ENOENT':
      return new FileError('not_found', `${logicalTarget} 不存在`, logicalTarget);
    case 'EACCES':
    case 'EPERM':
      return new FileError('permission_denied', `${logicalTarget} 不可读`, logicalTarget);
    case 'ENOTDIR':
      return new FileError('not_directory', `${logicalTarget} 不是文件夹`, logicalTarget);
    case 'EISDIR':
      return new FileError('is_directory', `${logicalTarget} 是文件夹`, logicalTarget);
    default:
      // 原始 message 一律不转发：它带物理路径。
      return new FileError('unknown', `${logicalTarget} 读取失败`, logicalTarget);
  }
}

function fileKind(stats: { isDirectory(): boolean; isSymbolicLink(): boolean }): FileKind {
  if (stats.isSymbolicLink()) return 'symlink';
  return stats.isDirectory() ? 'directory' : 'file';
}

export interface ProductCaseEnvOptions {
  /**
   * 物理案件根绝对路径。**只**来自本 leg 首枚 bootstrap 的 `caseRoot` 内存例外，
   * 进入闭包后不再出现在任何可观察面上。
   */
  readonly caseRoot: string;
}

/**
 * 只读 `/case` 容器。全部方法「逻辑进、逻辑出」；物理根只在本函数闭包内被 `path.join`。
 */
export function createProductCaseEnv(options: ProductCaseEnvOptions): ExecutionEnv {
  const physicalRoot = options.caseRoot;

  /**
   * grammar 通过后逐段 `lstat`：根自身与每一枚已存在的中间段都必须不是 symlink。
   * 走到第一枚不存在的段即停——不存在的尾段不可能是 symlink，再往下也无从观察。
   */
  async function locate(input: unknown): Promise<Result<{ logical: string; physical: string }, FileError>> {
    const normalized = normalizeCasePath(input);
    if (!normalized.ok) {
      const target = typeof input === 'string' ? input : '';
      return err(new FileError('permission_denied', `拒绝访问：${normalized.reason}`, target));
    }

    let current = physicalRoot;
    try {
      const rootStats = await lstat(current);
      if (rootStats.isSymbolicLink()) {
        return err(new FileError('permission_denied', `拒绝访问：${CASE_LOGICAL_ROOT} 根是符号链接`, CASE_LOGICAL_ROOT));
      }
      if (!rootStats.isDirectory()) {
        return err(new FileError('not_directory', `${CASE_LOGICAL_ROOT} 不是文件夹`, CASE_LOGICAL_ROOT));
      }
    } catch (cause) {
      return err(toFileError(cause, CASE_LOGICAL_ROOT));
    }

    for (let index = 0; index < normalized.segments.length; index += 1) {
      current = path.join(current, normalized.segments[index]);
      const partial = `${CASE_LOGICAL_ROOT}/${normalized.segments.slice(0, index + 1).join('/')}`;
      try {
        const stats = await lstat(current);
        if (stats.isSymbolicLink()) {
          return err(new FileError('permission_denied', `拒绝访问：${partial} 是符号链接，本容器不跟随`, partial));
        }
      } catch (cause) {
        const code = (cause as NodeJS.ErrnoException | undefined)?.code;
        // 不存在只终止探测，不代表本次调用失败——存在性由各方法自己回答。
        if (code === 'ENOENT') break;
        return err(toFileError(cause, partial));
      }
    }

    return ok({ logical: normalized.logical, physical: path.join(physicalRoot, ...normalized.segments) });
  }

  async function within<T>(
    input: unknown,
    run: (located: { logical: string; physical: string }) => Promise<Result<T, FileError>>,
  ): Promise<Result<T, FileError>> {
    const located = await locate(input);
    if (!located.ok) return located;
    return run(located.value);
  }

  function denyWrite<T>(input?: unknown): Result<T, FileError> {
    const normalized = normalizeCasePath(input);
    return err(new FileError('not_supported', WRITE_DENIED, normalized.ok ? normalized.logical : undefined));
  }

  async function statOf(physical: string, logical: string): Promise<Result<FileInfo, FileError>> {
    try {
      const stats = await lstat(physical);
      return ok({
        // basename 取自**逻辑**路径：物理侧的任何一段都不该被读出来。
        name: logical === CASE_LOGICAL_ROOT ? CASE_LOGICAL_ROOT.slice(1) : logical.slice(logical.lastIndexOf('/') + 1),
        path: logical,
        kind: fileKind(stats),
        size: stats.size,
        mtimeMs: stats.mtimeMs,
      });
    } catch (cause) {
      return err(toFileError(cause, logical));
    }
  }

  return {
    cwd: CASE_LOGICAL_ROOT,

    async absolutePath(input) {
      return within(input, async ({ logical }) => ok(logical));
    },

    async joinPath(parts) {
      if (!Array.isArray(parts) || parts.some((part) => typeof part !== 'string')) {
        return err(new FileError('invalid', '拒绝访问：joinPath 只接受字符串数组', undefined));
      }
      return within(parts.join('/'), async ({ logical }) => ok(logical));
    },

    async readTextFile(input) {
      return within(input, async ({ physical, logical }) => {
        try {
          return ok(await readFile(physical, 'utf8'));
        } catch (cause) {
          return err(toFileError(cause, logical));
        }
      });
    },

    async readTextLines(input, options) {
      return within(input, async ({ physical, logical }) => {
        try {
          const text = await readFile(physical, 'utf8');
          const lines = text.split('\n');
          if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
          const maxLines = options?.maxLines;
          return ok(typeof maxLines === 'number' ? lines.slice(0, maxLines) : lines);
        } catch (cause) {
          return err(toFileError(cause, logical));
        }
      });
    },

    async readBinaryFile(input) {
      return within(input, async ({ physical, logical }) => {
        try {
          return ok(new Uint8Array(await readFile(physical)));
        } catch (cause) {
          return err(toFileError(cause, logical));
        }
      });
    },

    async fileInfo(input) {
      return within(input, async ({ physical, logical }) => statOf(physical, logical));
    },

    async listDir(input) {
      return within(input, async ({ physical, logical }) => {
        try {
          const names = await readdir(physical);
          const entries: FileInfo[] = [];
          for (const name of names) {
            const childLogical = logical === CASE_LOGICAL_ROOT ? `${CASE_LOGICAL_ROOT}/${name}` : `${logical}/${name}`;
            // 目录里真实存在的名字仍须过 grammar：保留名、控制字符与超长段不投影给模型。
            if (!normalizeCasePath(childLogical).ok) continue;
            const info = await statOf(path.join(physical, name), childLogical);
            if (info.ok) entries.push(info.value);
          }
          return ok(entries);
        } catch (cause) {
          return err(toFileError(cause, logical));
        }
      });
    },

    async canonicalPath(input) {
      // 本容器从不跟随 symlink，故「规范路径」就是它自己——`realpath` 会把物理真相带回来。
      return within(input, async ({ physical, logical }) => {
        try {
          await lstat(physical);
          return ok(logical);
        } catch (cause) {
          return err(toFileError(cause, logical));
        }
      });
    },

    async exists(input) {
      return within(input, async ({ physical, logical }) => {
        try {
          await lstat(physical);
          return ok(true);
        } catch (cause) {
          const error = toFileError(cause, logical);
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

    async exec() {
      return err(new ExecutionError('shell_unavailable', SHELL_DENIED));
    },

    async cleanup() {
      // 只读容器不持有需要释放的资源。
    },
  };
}
