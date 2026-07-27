/**
 * 授权文件夹边界（ADR-022 决定二读面：授权文件夹外零读，fail-closed）。
 *
 * pi 范式把安全性整体外包给容器；本文件是我方供给的那份容器在路径面的落点。
 * 判定一律以**规范化后**的路径为准——字面路径在界内、symlink 指向界外的，按界外处理。
 * 只用 `realpath` 这一个只读原语；本包生产码不含任何写入或执行原语（由 ADR-018 门 R3 静态锁死）。
 */

import { realpath } from 'node:fs/promises';
import path from 'node:path';

export type AuthorizedPath =
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false; readonly code: 'outside_root'; readonly reason: string };

export interface AuthorizedRoot {
  /** 授权文件夹的规范绝对路径（构造时已解析 symlink）。 */
  readonly root: string;
  /** 把模型给出的路径归一化到授权文件夹内；越界返回显式拒绝，不抛、不静默降级。 */
  resolve(input: string): Promise<AuthorizedPath>;
}

/**
 * 规范化一个**可能尚不存在**的路径：向上找到最深的已存在祖先，对其解析 symlink，
 * 再把不存在的尾段原样接回。尾段不存在，故不可能是 symlink，无需再解析。
 */
async function canonicalize(target: string): Promise<string> {
  const tail: string[] = [];
  let current = target;
  for (;;) {
    try {
      const existing = await realpath(current);
      return tail.length === 0 ? existing : path.join(existing, ...tail.reverse());
    } catch {
      const parent = path.dirname(current);
      // 走到文件系统根仍不存在：交给包含判定，由它按界外拒绝。
      if (parent === current) return target;
      tail.push(path.basename(current));
      current = parent;
    }
  }
}

/** 包含判定必须带分隔符，否则 `/案卷-外` 会被 `/案卷` 当作界内（同前缀兄弟目录）。 */
function contains(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(root + path.sep);
}

export async function createAuthorizedRoot(rootPath: string): Promise<AuthorizedRoot> {
  let root: string;
  try {
    root = await realpath(rootPath);
  } catch (cause) {
    throw new Error(`授权文件夹不可用，pi lane 不开线：${rootPath}`, { cause });
  }

  return {
    root,
    async resolve(input: string): Promise<AuthorizedPath> {
      const canonical = await canonicalize(path.resolve(root, input));
      if (!contains(root, canonical)) {
        return {
          ok: false,
          code: 'outside_root',
          reason: `拒绝读取 \`${input}\`：归一化后落在授权文件夹外（授权范围 ${root}）`,
        };
      }
      return { ok: true, path: canonical };
    },
  };
}
