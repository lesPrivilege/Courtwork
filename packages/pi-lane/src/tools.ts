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

function createGlobTool(): AgentHarnessTool<ExecutionToolContext, typeof globSchema, Record<string, unknown>> {
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
        if (matcher.test(relative) && matches.length < MAX_MATCHES) matches.push(relative);
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

function createGrepTool(): AgentHarnessTool<ExecutionToolContext, typeof grepSchema, Record<string, unknown>> {
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
        const relative = toPosix(path.relative(context.env.cwd, absolute));
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

/** 只读三件。名字必须与 {@link READ_ONLY_TOOL_NAMES} 一致，由 tool-policy 的红证锁死。 */
export function createReadOnlyTools(): AgentHarnessTool<ExecutionToolContext>[] {
  return [createReadTool(), createGlobTool(), createGrepTool()] as AgentHarnessTool<ExecutionToolContext>[];
}
