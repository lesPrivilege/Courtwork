/**
 * 双根路由容器（`PI-WORKSPACE-READ-1`）。
 *
 * pi 的每件工具只拿到**一枚** `ExecutionEnv`，而产品面有两个逻辑根：`/case`（Node 直读物理
 * 案件根）与 `/workspace`（host-mediated，物理根只在 Rust 侧）。两者材质不同、不能合并成一个
 * 容器，故须有一处按逻辑前缀分派。
 *
 * **为何非加不可**：分派若不落在 env 层，就得在 `read`／`glob`／`grep` 三件工具里各写一遍前缀
 * 判定——三处可漂移的真源，且 `read` 是上游原件，本就没有可插判定的地方。这一层因此是唯一
 * 能一次性收口三件工具的接缝，与 `scoped-env` 当初收口读/写/exec 三面是同一条理由。
 *
 * 它**只做分派**：不认识文件系统、不认识 host wire、不改写任何返回值。每一条边界仍由被分派到
 * 的那枚容器自己把守——路由器多一条判据就等于多一处可以放宽的地方。
 */

import { FileError, err, type ExecutionEnv, type Result } from '@earendil-works/pi-agent-core';

export interface LogicalRootBinding {
  /** 逻辑绝对根，形如 `/case`、`/workspace`；**不带**尾斜杠。 */
  readonly logicalRoot: string;
  readonly env: ExecutionEnv;
}

export interface DualRootEnvOptions {
  /**
   * 至少一枚。**首枚即默认根**：相对路径与认不出前缀的输入都归它，
   * 由它按自己的 grammar 决定收还是拒（路由器不代拒，也不代收）。
   */
  readonly roots: readonly LogicalRootBinding[];
}

/**
 * `/casex`、`/case-2` 这类同前缀兄弟不得命中 `/case`：只认「恰等于根」或「根 + `/`」两形。
 */
function matches(logicalRoot: string, input: string): boolean {
  return input === logicalRoot || input.startsWith(`${logicalRoot}/`);
}

export function createDualRootEnv(options: DualRootEnvOptions): ExecutionEnv {
  const roots = options.roots;
  if (roots.length === 0) throw new Error('双根路由至少需要一枚逻辑根');
  const fallback = roots[0];

  /** 认不出前缀一律回默认根——**不**在这里拒，拒绝是容器的职责，不是路由的。 */
  function route(input: unknown): ExecutionEnv {
    if (typeof input !== 'string') return fallback.env;
    for (const binding of roots) {
      if (matches(binding.logicalRoot, input)) return binding.env;
    }
    return fallback.env;
  }

  const invalid = <T>(message: string): Result<T, FileError> => err(new FileError('invalid', message));

  return {
    cwd: fallback.env.cwd,

    async absolutePath(input, signal) {
      return route(input).absolutePath(input, signal);
    },
    async canonicalPath(input, signal) {
      return route(input).canonicalPath(input, signal);
    },
    async joinPath(parts, signal) {
      if (!Array.isArray(parts) || parts.some((part) => typeof part !== 'string')) {
        return invalid('拒绝访问：joinPath 只接受字符串数组');
      }
      // 首段决定归属：`joinPath(['/workspace','notes'])` 与 `/workspace/notes` 必须同归一枚容器。
      return route(parts[0]).joinPath(parts, signal);
    },

    async readTextFile(input, signal) {
      return route(input).readTextFile(input, signal);
    },
    async readTextLines(input, readOptions) {
      return route(input).readTextLines(input, readOptions);
    },
    async readBinaryFile(input, signal) {
      return route(input).readBinaryFile(input, signal);
    },
    async fileInfo(input, signal) {
      return route(input).fileInfo(input, signal);
    },
    async listDir(input, signal) {
      return route(input).listDir(input, signal);
    },
    async exists(input, signal) {
      return route(input).exists(input, signal);
    },

    async writeFile(input, content, signal) {
      return route(input).writeFile(input, content, signal);
    },
    async appendFile(input, content, signal) {
      return route(input).appendFile(input, content, signal);
    },
    async createDir(input, createOptions) {
      return route(input).createDir(input, createOptions);
    },
    async remove(input, removeOptions) {
      return route(input).remove(input, removeOptions);
    },
    // 临时件与 shell 没有路径可分派，且两根都拒——恒交默认根，由它给出唯一那份拒绝语。
    async createTempDir(prefix, signal) {
      return fallback.env.createTempDir(prefix, signal);
    },
    async createTempFile(tempOptions) {
      return fallback.env.createTempFile(tempOptions);
    },

    async exec(command, execOptions) {
      return fallback.env.exec(command, execOptions);
    },

    async cleanup() {
      for (const binding of roots) await binding.env.cleanup();
    },
  };
}
