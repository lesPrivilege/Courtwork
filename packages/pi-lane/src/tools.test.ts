import { mkdtemp, mkdir, realpath, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { createAuthorizedRoot } from './authorized-root.js';
import { createReadOnlyScopedEnv } from './scoped-env.js';
import { createReadOnlyTools } from './tools.js';
import type { AgentHarnessTool, ExecutionToolContext } from '@earendil-works/pi-agent-core';

/**
 * 只读工具面。三件工具全部经容器取文件系统，故越界判定不在工具里重写一遍——
 * 工具里若出现第二份边界逻辑，就会有第二处可以漂移的真源。
 */

let root: string;
let outside: string;
let context: ExecutionToolContext;
let tools: AgentHarnessTool<ExecutionToolContext>[];

const toolNamed = (name: string) => {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`工具 ${name} 未装配`);
  return tool;
};

const run = (name: string, params: unknown) =>
  toolNamed(name).execute('call-1', params as never, undefined, undefined, context);

const textOf = (result: { content: { type: string }[] }) =>
  result.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

beforeAll(async () => {
  const sandbox = await realpath(await mkdtemp(path.join(tmpdir(), 'pi-lane-tools-')));
  root = path.join(sandbox, '案卷');
  outside = path.join(sandbox, '界外');
  await mkdir(root);
  await mkdir(outside);
  await mkdir(path.join(root, '证据'));
  await writeFile(path.join(root, '起诉状.md'), '# 起诉状\n合同编号 HT-2024-081\n');
  await writeFile(path.join(root, '笔记.txt'), '合同编号也出现在这里\n');
  await writeFile(path.join(root, '证据', '合同.md'), '# 合同\n合同编号 HT-2024-081\n签署地 临江\n');
  await writeFile(path.join(outside, '机密.md'), '合同编号 HT-9999-999\n');
  await symlink(outside, path.join(root, '外链'));
  context = { env: createReadOnlyScopedEnv(await createAuthorizedRoot(root)) };
  tools = createReadOnlyTools();
});

describe('工具装配', () => {
  it('绿证一：恰好装配只读三件，不多不少', () => {
    expect(tools.map((tool) => tool.name).sort()).toEqual(['glob', 'grep', 'read']);
  });

  it('绿证二：每件工具都有面向模型的描述与 schema', () => {
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(0);
      expect(tool.parameters).toBeTruthy();
    }
  });
});

describe('read（pi 原版工具跑在我方容器上）', () => {
  it('绿证三：界内文件可读', async () => {
    const result = await run('read', { path: '起诉状.md' });
    expect(textOf(result)).toContain('HT-2024-081');
  });

  it('红证一：界外文件读取失败（pi 工具契约是抛，不是返回错误内容）', async () => {
    await expect(run('read', { path: path.join(outside, '机密.md') })).rejects.toThrow();
  });

  it('红证二：经 symlink 出界同样失败', async () => {
    await expect(run('read', { path: '外链/机密.md' })).rejects.toThrow();
  });
});

describe('glob', () => {
  it('绿证四：`**/*.md` 递归命中界内 md，且不含非 md', async () => {
    const listed = textOf(await run('glob', { pattern: '**/*.md' }));
    expect(listed).toContain('起诉状.md');
    expect(listed).toContain(path.join('证据', '合同.md'));
    expect(listed).not.toContain('笔记.txt');
  });

  it('绿证五：`*.md` 只匹配顶层，不下钻', async () => {
    const listed = textOf(await run('glob', { pattern: '*.md' }));
    expect(listed).toContain('起诉状.md');
    expect(listed).not.toContain('合同.md');
  });

  it('红证三：界外的 path 参数被拒且理由可见', async () => {
    const result = await run('glob', { pattern: '*.md', path: outside });
    expect(textOf(result)).toContain('授权文件夹外');
  });

  it('红证四：symlink 出界的子树不被列入结果', async () => {
    const listed = textOf(await run('glob', { pattern: '**/*.md' }));
    expect(listed).not.toContain('机密.md');
  });
});

describe('grep', () => {
  it('绿证六：命中行带文件与行号', async () => {
    const hits = textOf(await run('grep', { pattern: 'HT-2024-081' }));
    expect(hits).toContain('起诉状.md:2');
    expect(hits).toContain(`${path.join('证据', '合同.md')}:2`);
  });

  it('绿证七：无命中时显式说明，不是空字符串', async () => {
    const hits = textOf(await run('grep', { pattern: '并不存在的词' }));
    expect(hits).toContain('无命中');
  });

  it('红证五：界外内容永不出现在命中里', async () => {
    const hits = textOf(await run('grep', { pattern: 'HT-9999-999' }));
    expect(hits).not.toContain('机密.md');
    expect(hits).toContain('无命中');
  });

  it('红证六：非法正则显式报错，不静默当作字面量', async () => {
    const hits = textOf(await run('grep', { pattern: '([' }));
    expect(hits).toContain('正则');
  });
});
