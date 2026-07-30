/**
 * 只读工具面（ADR-022 决定一：loop 是 commodity，资产在容器与契约）。
 *
 * - `read` 直接用 pi 原版 `createReadTool()`，零 fork；它经 `ExecutionEnv` 取文件，
 *   因而自动继承 {@link createReadOnlyScopedEnv} 的授权边界。
 * - `grep` / `glob` pi 内核未提供（0.82.1 的 `harness/tools` 只有 read/edit/write/bash，
 *   grep/find 住在 `pi-coding-agent`，那一包会连带 TUI、图像处理等 18 项依赖）。
 *   本包自备这两件，但**同样只经 env 取文件系统**——工具里不写第二份边界逻辑，
 *   否则就有第二处可以漂移的真源。
 */

import path from 'node:path';

import { createReadTool, type AgentHarnessTool, type ExecutionToolContext } from '@earendil-works/pi-agent-core';
import { Type } from '@earendil-works/pi-ai';

import { CASE_LOGICAL_ROOT } from './product-case-env.js';

/** 单次调用的遍历与输出上限：dev 线不做无界扫描，超限如实告知模型。 */
const MAX_FILES_SCANNED = 2000;
const MAX_MATCHES = 200;
const MAX_LINE_LENGTH = 400;

type TextResult = { content: { type: 'text'; text: string }[]; details: Record<string, unknown> };

const textResult = (text: string, details: Record<string, unknown> = {}): TextResult => ({
  content: [{ type: 'text', text }],
  details,
});

/**
 * glob → RegExp。只支持 `**`、`*`、`?` 三个元字符——够 md 检索用，
 * 且省掉一个新依赖（minimatch/glob）。扩语法是契约变更，须回票面。
 */
export function globToRegExp(pattern: string): RegExp {
  let source = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === '*') {
      if (pattern[index + 1] === '*') {
        if (pattern[index + 2] === '/') {
          source += '(?:.*/)?';
          index += 2;
        } else {
          source += '.*';
          index += 1;
        }
      } else {
        source += '[^/]*';
      }
      continue;
    }
    if (character === '?') {
      source += '[^/]';
      continue;
    }
    source += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`);
}

const toPosix = (value: string) => value.split(path.sep).join('/');

/**
 * 广度优先遍历授权子树。symlink 一律不跟随——界内界外都不跟，
 * 少一条要判定的路径来源，也就少一个越界口子；代价是界内软链子树不可见（已知边界）。
 */
async function walkFiles(
  env: ExecutionToolContext['env'],
  start: string,
  visit: (absolute: string) => Promise<void>,
): Promise<{ scanned: number; truncated: boolean }> {
  const queue = [start];
  let scanned = 0;
  while (queue.length > 0) {
    const directory = queue.shift();
    if (directory === undefined) break;
    const listed = await env.listDir(directory);
    if (!listed.ok) continue;
    for (const entry of listed.value) {
      if (entry.kind === 'symlink') continue;
      if (entry.kind === 'directory') {
        queue.push(entry.path);
        continue;
      }
      if (scanned >= MAX_FILES_SCANNED) return { scanned, truncated: true };
      scanned += 1;
      await visit(entry.path);
    }
  }
  return { scanned, truncated: false };
}

const globSchema = Type.Object({
  pattern: Type.String({ description: '文件名匹配式，支持 `**`、`*`、`?`，如 `**/*.md`' }),
  path: Type.Optional(Type.String({ description: '相对授权文件夹的起始子目录，默认为授权文件夹根' })),
});

const grepSchema = Type.Object({
  pattern: Type.String({ description: '正则表达式（区分大小写关闭），逐行匹配' }),
  path: Type.Optional(Type.String({ description: '相对授权文件夹的起始子目录，默认为授权文件夹根' })),
});

/**
 * 命中投影。dev 无参形态是恒等函数——输出与逻辑根引入前逐字相同；
 * 产品形态只把既有相对命中前缀成 `/case/...`，扫描/截断上限、正则与遍历逻辑一概不动。
 */
type HitProjection = (relative: string) => string;

const identityProjection: HitProjection = (relative) => relative;

function createGlobTool(
  project: HitProjection,
): AgentHarnessTool<ExecutionToolContext, typeof globSchema, Record<string, unknown>> {
  return {
    name: 'glob',
    label: '按名检索',
    description: '在授权文件夹内按文件名模式列出文件。授权文件夹外的路径一律拒绝。',
    parameters: globSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, context) {
      const started = await context.env.absolutePath(params.path ?? '.');
      if (!started.ok) return textResult(started.error.message, { denied: true });

      const matcher = globToRegExp(params.pattern);
      const matches: string[] = [];
      const { scanned, truncated } = await walkFiles(context.env, started.value, async (absolute) => {
        const relative = toPosix(path.relative(context.env.cwd, absolute));
        // 匹配仍按相对路径判定——模式语义不因投影而改变；只有出面的那一份被投影。
        if (matcher.test(relative) && matches.length < MAX_MATCHES) matches.push(project(relative));
      });

      const header = matches.length === 0 ? '无命中' : `命中 ${matches.length} 份`;
      const note = truncated ? `\n（已达扫描上限 ${MAX_FILES_SCANNED} 份文件，结果可能不完整）` : '';
      return textResult(`${header}\n${matches.join('\n')}${note}`, {
        matched: matches.length,
        scanned,
        truncated,
      });
    },
  };
}

function createGrepTool(
  project: HitProjection,
): AgentHarnessTool<ExecutionToolContext, typeof grepSchema, Record<string, unknown>> {
  return {
    name: 'grep',
    label: '按内容检索',
    description: '在授权文件夹内按正则逐行检索文本文件。授权文件夹外的路径一律拒绝。',
    parameters: grepSchema,
    async execute(_toolCallId, params, _signal, _onUpdate, context) {
      const started = await context.env.absolutePath(params.path ?? '.');
      if (!started.ok) return textResult(started.error.message, { denied: true });

      let matcher: RegExp;
      try {
        matcher = new RegExp(params.pattern, 'i');
      } catch (cause) {
        return textResult(`正则无效，未执行检索：${cause instanceof Error ? cause.message : String(cause)}`, {
          invalidPattern: true,
        });
      }

      const hits: string[] = [];
      const { scanned, truncated } = await walkFiles(context.env, started.value, async (absolute) => {
        if (hits.length >= MAX_MATCHES) return;
        const read = await context.env.readTextLines(absolute);
        if (!read.ok) return;
        const relative = project(toPosix(path.relative(context.env.cwd, absolute)));
        read.value.forEach((line, index) => {
          // 裸 NUL 是二进制的可靠信号：按二进制跳过，不把乱码喂给模型。
          if (line.includes('\u0000') || hits.length >= MAX_MATCHES) return;
          if (matcher.test(line)) hits.push(`${relative}:${index + 1}: ${line.slice(0, MAX_LINE_LENGTH)}`);
        });
      });

      const header = hits.length === 0 ? '无命中' : `命中 ${hits.length} 行`;
      const note = truncated ? `\n（已达扫描上限 ${MAX_FILES_SCANNED} 份文件，结果可能不完整）` : '';
      return textResult(`${header}\n${hits.join('\n')}${note}`, { matched: hits.length, scanned, truncated });
    },
  };
}

/**
 * read 的逻辑根 binder（PI-HOST-LOOP-1 §二.1）。
 *
 * 三条硬约束，撤掉任一条都须有红证：
 * 1. `name/label/description/parameters` 原样转出，`parameters` 必须是**同一对象**——
 *    模型看到的 schema 不因产品形态而变，也就没有第二份可漂移的工具契约；
 * 2. path 归一交给**本次 env**（产品形态即 `/case` 容器），tools 里不复制第二份 grammar；
 * 3. 归一后只调用一次原版 `execute`。上游截断提示里的 `${path}` 因此只能是逻辑绝对路径。
 *
 * 已知上游怪癖（0.82.1 `harness/tools/path-utils.js`，本票不改）：`normalizeToolPath` 会
 * 剥掉前导 `@` 并把 Unicode 空格改写成半角空格。归一后的路径以 `/` 起头，`@` 那一条因此
 * 失效；Unicode 空格改写仍在上游发生，但改写后的路径要再过一次同一个 env，出界仍拒。
 */
function bindReadToLogicalRoot(
  upstream: AgentHarnessTool<ExecutionToolContext>,
): AgentHarnessTool<ExecutionToolContext> {
  return {
    name: upstream.name,
    label: upstream.label,
    description: upstream.description,
    parameters: upstream.parameters,
    async execute(toolCallId, params, signal, onUpdate, context) {
      const requested = (params as { path?: unknown }).path;
      const normalized = await context.env.absolutePath(
        typeof requested === 'string' ? requested : '',
        signal,
      );
      if (!normalized.ok) return textResult(normalized.error.message, { denied: true });
      return upstream.execute(
        toolCallId,
        { ...(params as Record<string, unknown>), path: normalized.value } as never,
        signal,
        onUpdate,
        context,
      );
    },
  } as AgentHarnessTool<ExecutionToolContext>;
}

export interface ReadOnlyToolsOptions {
  /**
   * 唯一可选形态：把 read 的入参与 glob/grep 的命中投影到逻辑根。
   * 不传即 dev 形态，可观察输出与本选项引入前逐字相同。
   */
  readonly logicalRoot?: typeof CASE_LOGICAL_ROOT;
}

/** 只读三件。名字必须与 {@link READ_ONLY_TOOL_NAMES} 一致，由 tool-policy 的红证锁死。 */
export function createReadOnlyTools(options?: ReadOnlyToolsOptions): AgentHarnessTool<ExecutionToolContext>[] {
  const logicalRoot = options?.logicalRoot;
  if (logicalRoot === undefined) {
    return [createReadTool(), createGlobTool(identityProjection), createGrepTool(identityProjection)] as AgentHarnessTool<ExecutionToolContext>[];
  }
  const project: HitProjection = (relative) => `${logicalRoot}/${relative}`;
  return [
    bindReadToLogicalRoot(createReadTool() as AgentHarnessTool<ExecutionToolContext>),
    createGlobTool(project),
    createGrepTool(project),
  ] as AgentHarnessTool<ExecutionToolContext>[];
}
